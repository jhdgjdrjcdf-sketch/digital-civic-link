ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS whatsapp text;

CREATE TABLE public.office_officials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  responsibility text NOT NULL,
  phone text,
  email text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.office_officials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_officials TO authenticated;
GRANT ALL ON public.office_officials TO service_role;

ALTER TABLE public.office_officials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible office officials"
ON public.office_officials FOR SELECT
USING (
  (is_visible = true AND EXISTS (
    SELECT 1 FROM public.offices o WHERE o.id = office_id AND o.is_active = true
  ))
  OR public.can_manage(auth.uid(), 'content_admin'::app_role)
);

CREATE POLICY "Content admins can create office officials"
ON public.office_officials FOR INSERT TO authenticated
WITH CHECK (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "Content admins can update office officials"
ON public.office_officials FOR UPDATE TO authenticated
USING (public.can_manage(auth.uid(), 'content_admin'::app_role))
WITH CHECK (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "Content admins can delete office officials"
ON public.office_officials FOR DELETE TO authenticated
USING (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE TRIGGER office_officials_set_updated_at
BEFORE UPDATE ON public.office_officials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX office_officials_office_order_idx
ON public.office_officials (office_id, display_order, full_name);
CREATE INDEX office_officials_responsibility_idx
ON public.office_officials (responsibility);

CREATE TABLE public.office_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  political_role text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  portrait_url text,
  summary text NOT NULL DEFAULT '',
  cv_summary text NOT NULL DEFAULT '',
  education text[] NOT NULL DEFAULT '{}'::text[],
  experience text[] NOT NULL DEFAULT '{}'::text[],
  previous_positions text[] NOT NULL DEFAULT '{}'::text[],
  achievements text[] NOT NULL DEFAULT '{}'::text[],
  responsibilities text[] NOT NULL DEFAULT '{}'::text[],
  phone text,
  email text,
  website_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT office_candidates_website_url_check CHECK (
    website_url IS NULL OR website_url = '' OR website_url ~ '^https?://'
  )
);

GRANT SELECT ON public.office_candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_candidates TO authenticated;
GRANT ALL ON public.office_candidates TO service_role;

ALTER TABLE public.office_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible office candidates"
ON public.office_candidates FOR SELECT
USING (
  (is_visible = true AND EXISTS (
    SELECT 1 FROM public.offices o WHERE o.id = office_id AND o.is_active = true
  ))
  OR public.can_manage(auth.uid(), 'content_admin'::app_role)
);

CREATE POLICY "Content admins can create office candidates"
ON public.office_candidates FOR INSERT TO authenticated
WITH CHECK (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "Content admins can update office candidates"
ON public.office_candidates FOR UPDATE TO authenticated
USING (public.can_manage(auth.uid(), 'content_admin'::app_role))
WITH CHECK (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "Content admins can delete office candidates"
ON public.office_candidates FOR DELETE TO authenticated
USING (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE TRIGGER office_candidates_set_updated_at
BEFORE UPDATE ON public.office_candidates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX office_candidates_office_order_idx
ON public.office_candidates (office_id, display_order, full_name);
CREATE INDEX office_candidates_city_idx
ON public.office_candidates (city);
CREATE INDEX office_candidates_role_idx
ON public.office_candidates (political_role);

INSERT INTO public.office_candidates (
  office_id,
  full_name,
  political_role,
  city,
  summary,
  display_order
)
SELECT
  o.id,
  o.candidate_name,
  CASE WHEN o.category = 'candidate' THEN 'Candidate' ELSE '' END,
  o.city,
  o.description,
  0
FROM public.offices o
WHERE btrim(o.candidate_name) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.office_candidates c
    WHERE c.office_id = o.id AND lower(c.full_name) = lower(o.candidate_name)
  );