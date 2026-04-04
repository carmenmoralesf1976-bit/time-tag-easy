
-- Create incident_reports table
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
  ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own or admin all"
  ON public.incident_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.incident_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-photos', 'incident-photos', true);

CREATE POLICY "Anyone can view incident photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'incident-photos');

CREATE POLICY "Authenticated can upload incident photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incident-photos');
