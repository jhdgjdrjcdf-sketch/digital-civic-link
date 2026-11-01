GRANT EXECUTE ON FUNCTION public.can_manage(uuid, public.app_role) TO anon, authenticated;
ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS working_hours text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.office_candidates
  ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '';