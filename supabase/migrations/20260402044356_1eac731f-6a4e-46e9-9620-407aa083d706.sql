
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'guard');

-- Guard PINs table
CREATE TABLE public.guard_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL DEFAULT '1234',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guard_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guard_pins" ON public.guard_pins FOR SELECT TO anon, authenticated USING (true);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Insert default PINs for all 4 guards
INSERT INTO public.guard_pins (badge_id, pin) VALUES
  ('173857', '1234'),
  ('37132', '1234'),
  ('104615', '1234'),
  ('186136', '1234');
