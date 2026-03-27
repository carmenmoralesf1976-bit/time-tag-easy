
CREATE TABLE public.monthly_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL,
  badge_id text NOT NULL,
  work_post text NOT NULL,
  schedule_date date NOT NULL,
  shift_start time NOT NULL DEFAULT '08:00',
  shift_end time NOT NULL DEFAULT '20:00',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(badge_id, schedule_date)
);

ALTER TABLE public.monthly_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read schedule"
  ON public.monthly_schedule FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert schedule"
  ON public.monthly_schedule FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update schedule"
  ON public.monthly_schedule FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete schedule"
  ON public.monthly_schedule FOR DELETE
  TO anon, authenticated
  USING (true);
