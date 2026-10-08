CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  creator_id uuid NOT NULL,
  room_name text NOT NULL UNIQUE DEFAULT ('meeting-' || replace(gen_random_uuid()::text,'-','')),
  max_speakers integer NOT NULL DEFAULT 5,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in members can see meetings" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meeting_participants (
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('creator','admin','speaker','viewer')),
  is_muted boolean NOT NULL DEFAULT false,
  is_removed boolean NOT NULL DEFAULT false,
  display_name text NOT NULL DEFAULT '',
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, user_id)
);
GRANT SELECT ON public.meeting_participants TO authenticated;
GRANT ALL ON public.meeting_participants TO service_role;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in members can see participants" ON public.meeting_participants FOR SELECT TO authenticated USING (true);
CREATE TRIGGER meeting_participants_updated_at BEFORE UPDATE ON public.meeting_participants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meeting_speak_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX meeting_speak_requests_one_pending ON public.meeting_speak_requests(meeting_id, user_id) WHERE status = 'pending';
GRANT SELECT ON public.meeting_speak_requests TO authenticated;
GRANT ALL ON public.meeting_speak_requests TO service_role;
ALTER TABLE public.meeting_speak_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in members can see requests" ON public.meeting_speak_requests FOR SELECT TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_speak_requests;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role <> 'member')
$$;

CREATE OR REPLACE FUNCTION public.meeting_role(_meeting_id uuid, _user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.meeting_participants
  WHERE meeting_id = _meeting_id AND user_id = _user_id AND NOT is_removed
$$;

CREATE OR REPLACE FUNCTION public._meeting_require_manager(_meeting_id uuid) RETURNS public.meetings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO m FROM public.meetings WHERE id = _meeting_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  IF COALESCE(public.meeting_role(_meeting_id, auth.uid()), '') NOT IN ('creator','admin') THEN
    RAISE EXCEPTION 'Not authorized: only the creator or a meeting admin can do this';
  END IF;
  RETURN m;
END $$;

CREATE OR REPLACE FUNCTION public._display_name(_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT display_name FROM public.profiles WHERE id = _user_id), 'Member')
$$;

CREATE OR REPLACE FUNCTION public.create_meeting(_title text, _description text, _scheduled_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized: only administrators can create meetings'; END IF;
  IF char_length(trim(_title)) < 3 THEN RAISE EXCEPTION 'Title must be at least 3 characters'; END IF;
  INSERT INTO public.meetings(title, description, creator_id, scheduled_at)
  VALUES (trim(_title), COALESCE(trim(_description),''), auth.uid(), _scheduled_at) RETURNING id INTO new_id;
  INSERT INTO public.meeting_participants(meeting_id, user_id, role, display_name)
  VALUES (new_id, auth.uid(), 'creator', public._display_name(auth.uid()));
  PERFORM public.write_audit('meeting.create', 'meetings', new_id::text);
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.start_meeting(_meeting_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings;
BEGIN
  m := public._meeting_require_manager(_meeting_id);
  IF m.status = 'ended' THEN RAISE EXCEPTION 'This meeting has already ended'; END IF;
  UPDATE public.meetings SET status = 'live', started_at = COALESCE(started_at, now()) WHERE id = _meeting_id;
  PERFORM public.write_audit('meeting.start', 'meetings', _meeting_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.end_meeting(_meeting_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings;
BEGIN
  m := public._meeting_require_manager(_meeting_id);
  UPDATE public.meetings SET status = 'ended', ended_at = now() WHERE id = _meeting_id;
  UPDATE public.meeting_speak_requests SET status = 'cancelled', decided_at = now()
    WHERE meeting_id = _meeting_id AND status = 'pending';
  PERFORM public.write_audit('meeting.end', 'meetings', _meeting_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.join_meeting(_meeting_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text; removed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.meetings WHERE id = _meeting_id) THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  SELECT role, is_removed INTO r, removed FROM public.meeting_participants WHERE meeting_id = _meeting_id AND user_id = auth.uid();
  IF removed THEN RAISE EXCEPTION 'You were removed from this meeting'; END IF;
  IF r IS NULL THEN
    INSERT INTO public.meeting_participants(meeting_id, user_id, role, display_name)
    VALUES (_meeting_id, auth.uid(), 'viewer', public._display_name(auth.uid()))
    ON CONFLICT DO NOTHING;
    r := 'viewer';
  END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.set_meeting_admin(_meeting_id uuid, _user_id uuid, _is_admin boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO m FROM public.meetings WHERE id = _meeting_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  IF m.creator_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized: only the meeting creator can assign admins'; END IF;
  IF _user_id = m.creator_id THEN RAISE EXCEPTION 'The creator already manages this meeting'; END IF;
  IF _is_admin THEN
    INSERT INTO public.meeting_participants(meeting_id, user_id, role, display_name)
    VALUES (_meeting_id, _user_id, 'admin', public._display_name(_user_id))
    ON CONFLICT (meeting_id, user_id) DO UPDATE SET role = 'admin', is_removed = false, is_muted = false;
  ELSE
    UPDATE public.meeting_participants SET role = 'viewer' WHERE meeting_id = _meeting_id AND user_id = _user_id AND role = 'admin';
  END IF;
  PERFORM public.write_audit(CASE WHEN _is_admin THEN 'meeting.admin_add' ELSE 'meeting.admin_remove' END, 'meetings', _meeting_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.request_to_speak(_meeting_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings; r text; speakers int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO m FROM public.meetings WHERE id = _meeting_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  IF m.status <> 'live' THEN RAISE EXCEPTION 'Requests open once the meeting is live'; END IF;
  r := public.meeting_role(_meeting_id, auth.uid());
  IF r IS NULL THEN RAISE EXCEPTION 'Join the meeting first'; END IF;
  IF r <> 'viewer' THEN RAISE EXCEPTION 'You can already speak in this meeting'; END IF;
  SELECT count(*) INTO speakers FROM public.meeting_participants WHERE meeting_id = _meeting_id AND role = 'speaker' AND NOT is_removed;
  IF speakers >= m.max_speakers THEN RAISE EXCEPTION 'Speaker requests are paused: the meeting has reached % speakers', m.max_speakers; END IF;
  INSERT INTO public.meeting_speak_requests(meeting_id, user_id, display_name)
  VALUES (_meeting_id, auth.uid(), public._display_name(auth.uid()));
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Your request is already waiting for a decision';
END $$;

CREATE OR REPLACE FUNCTION public.cancel_speak_request(_meeting_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.meeting_speak_requests SET status = 'cancelled', decided_at = now()
  WHERE meeting_id = _meeting_id AND user_id = auth.uid() AND status = 'pending';
END $$;

CREATE OR REPLACE FUNCTION public.respond_speak_request(_request_id uuid, _accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.meeting_speak_requests; m public.meetings; speakers int;
BEGIN
  SELECT * INTO req FROM public.meeting_speak_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  m := public._meeting_require_manager(req.meeting_id); -- locks meeting row: serialises speaker count
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'This request was already handled'; END IF;
  IF _accept THEN
    SELECT count(*) INTO speakers FROM public.meeting_participants WHERE meeting_id = req.meeting_id AND role = 'speaker' AND NOT is_removed;
    IF speakers >= m.max_speakers THEN RAISE EXCEPTION 'The meeting already has % speakers', m.max_speakers; END IF;
    UPDATE public.meeting_participants SET role = 'speaker', is_muted = false
      WHERE meeting_id = req.meeting_id AND user_id = req.user_id AND NOT is_removed AND role = 'viewer';
    IF NOT FOUND THEN RAISE EXCEPTION 'This member is no longer a viewer in the meeting'; END IF;
  END IF;
  UPDATE public.meeting_speak_requests SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END,
    decided_by = auth.uid(), decided_at = now() WHERE id = _request_id;
END $$;

CREATE OR REPLACE FUNCTION public.moderate_participant(_meeting_id uuid, _user_id uuid, _action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.meetings; target_role text;
BEGIN
  m := public._meeting_require_manager(_meeting_id);
  SELECT role INTO target_role FROM public.meeting_participants WHERE meeting_id = _meeting_id AND user_id = _user_id;
  IF target_role IS NULL THEN RAISE EXCEPTION 'Participant not found'; END IF;
  IF target_role = 'creator' THEN RAISE EXCEPTION 'The creator cannot be moderated'; END IF;
  IF target_role = 'admin' AND auth.uid() <> m.creator_id THEN RAISE EXCEPTION 'Only the creator can moderate a meeting admin'; END IF;
  IF _action = 'mute' THEN
    UPDATE public.meeting_participants SET is_muted = true WHERE meeting_id = _meeting_id AND user_id = _user_id;
  ELSIF _action = 'unmute' THEN
    UPDATE public.meeting_participants SET is_muted = false WHERE meeting_id = _meeting_id AND user_id = _user_id;
  ELSIF _action = 'to_viewer' THEN
    UPDATE public.meeting_participants SET role = 'viewer', is_muted = false WHERE meeting_id = _meeting_id AND user_id = _user_id AND role = 'speaker';
  ELSIF _action = 'remove' THEN
    UPDATE public.meeting_participants SET is_removed = true WHERE meeting_id = _meeting_id AND user_id = _user_id;
    UPDATE public.meeting_speak_requests SET status = 'cancelled', decided_at = now() WHERE meeting_id = _meeting_id AND user_id = _user_id AND status = 'pending';
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;
  PERFORM public.write_audit('meeting.' || _action, 'meetings', _meeting_id::text);
END $$;

REVOKE EXECUTE ON FUNCTION public._meeting_require_manager(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_meeting(text,text,timestamptz), public.start_meeting(uuid), public.end_meeting(uuid),
  public.join_meeting(uuid), public.set_meeting_admin(uuid,uuid,boolean), public.request_to_speak(uuid),
  public.cancel_speak_request(uuid), public.respond_speak_request(uuid,boolean), public.moderate_participant(uuid,uuid,text) FROM anon;