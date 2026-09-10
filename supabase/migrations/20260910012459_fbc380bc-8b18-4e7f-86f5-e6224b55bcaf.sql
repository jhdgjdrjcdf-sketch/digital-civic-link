CREATE TABLE public.offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  candidate_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  phone text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  category text NOT NULL DEFAULT 'office',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offices_lat_range CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT offices_lng_range CHECK (longitude >= -180 AND longitude <= 180)
);

GRANT SELECT ON public.offices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offices TO authenticated;
GRANT ALL ON public.offices TO service_role;

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offices"
ON public.offices FOR SELECT
USING (is_active = true OR public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "Content admins can create offices"
ON public.offices FOR INSERT TO authenticated
WITH CHECK (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "Content admins can update offices"
ON public.offices FOR UPDATE TO authenticated
USING (public.can_manage(auth.uid(), 'content_admin'::app_role))
WITH CHECK (public.can_manage(auth.uid(), 'content_admin'::app_role));

CREATE TRIGGER offices_set_updated_at
BEFORE UPDATE ON public.offices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX offices_active_idx ON public.offices (is_active);

INSERT INTO public.offices (name, candidate_name, description, address, city, phone, latitude, longitude, category) VALUES
('المكتب الرئيسي - بغداد', 'تجمع الفاو زاخو', 'The main headquarters coordinating national activity.', 'شارع الكرادة داخل، قرب ساحة كهرمانة', 'بغداد', '+964 770 000 1001', 33.312805, 44.361488, 'headquarters'),
('مكتب البصرة', 'أحمد الفاو', 'Regional office for Basra governorate.', 'شارع الاستقلال، العشار', 'البصرة', '+964 770 000 1002', 30.508102, 47.783489, 'office'),
('مكتب زاخو', 'ريبوار زاخو', 'Northern coordination office.', 'شارع الجمهورية، مركز زاخو', 'زاخو', '+964 770 000 1003', 37.143611, 42.681944, 'office'),
('مكتب أربيل', 'شيرين عبدالله', 'Candidate campaign office for Erbil.', 'شارع 100 متر، قرب القلعة', 'أربيل', '+964 770 000 1004', 36.191113, 44.009167, 'candidate'),
('مكتب الموصل', 'عمر الحديدي', 'Campaign office serving Nineveh.', 'شارع الدواسة', 'الموصل', '+964 770 000 1005', 36.335, 43.118889, 'candidate'),
('مكتب النجف', 'حيدر الكوفي', 'Office serving Najaf and surrounding districts.', 'شارع الرسول', 'النجف', '+964 770 000 1006', 32.028, 44.341, 'office'),
('مكتب كركوك', 'ليلى كركوك', 'Local coordination and volunteer office.', 'شارع أطلس', 'كركوك', '+964 770 000 1007', 35.468, 44.392, 'candidate'),
('مكتب دهوك', 'آفان دهوك', 'Office covering Duhok governorate.', 'شارع نوروز', 'دهوك', '+964 770 000 1008', 36.867, 42.988, 'office');