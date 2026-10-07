ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS governorate text NOT NULL DEFAULT '';
UPDATE public.offices SET governorate = CASE
  WHEN city LIKE '%بغداد%' THEN 'Baghdad'
  WHEN city LIKE '%البصرة%' THEN 'Basra'
  WHEN city LIKE '%زاخو%' OR city LIKE '%دهوك%' THEN 'Duhok'
  WHEN city LIKE '%أربيل%' THEN 'Erbil'
  WHEN city LIKE '%الموصل%' THEN 'Nineveh'
  WHEN city LIKE '%النجف%' THEN 'Najaf'
  WHEN city LIKE '%كركوك%' THEN 'Kirkuk'
  ELSE governorate END
WHERE governorate = '';
CREATE INDEX IF NOT EXISTS offices_governorate_idx ON public.offices (governorate);