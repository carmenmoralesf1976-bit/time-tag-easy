
CREATE TABLE public.security_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  start_latitude DOUBLE PRECISION NOT NULL,
  start_longitude DOUBLE PRECISION NOT NULL,
  end_latitude DOUBLE PRECISION,
  end_longitude DOUBLE PRECISION,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_rounds ENABLE ROW LEVEL SECURITY;

-- Guards can read their own rounds
CREATE POLICY "Users can read own rounds"
ON public.security_rounds
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Guards can insert their own rounds
CREATE POLICY "Users can insert own rounds"
ON public.security_rounds
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Guards can update their own rounds
CREATE POLICY "Users can update own rounds"
ON public.security_rounds
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
