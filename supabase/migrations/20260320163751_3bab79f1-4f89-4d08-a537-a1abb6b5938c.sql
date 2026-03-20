
-- Table for time clock entries (4-year retention per Spanish labor law)
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'salida')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  notes TEXT,
  signature TEXT,
  gdpr_accepted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own entries
CREATE POLICY "Users can insert entries"
  ON public.time_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own entries
CREATE POLICY "Users can read own entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous inserts (no auth required for kiosk mode)
CREATE POLICY "Anonymous can insert entries"
  ON public.time_entries FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow anonymous reads for kiosk mode
CREATE POLICY "Anonymous can read entries"
  ON public.time_entries FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Index for fast queries by date
CREATE INDEX idx_time_entries_timestamp ON public.time_entries (timestamp DESC);
CREATE INDEX idx_time_entries_badge ON public.time_entries (badge_id);
