
-- Allow admins to read all time_entries
CREATE POLICY "Admins can read all entries"
ON public.time_entries
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert entries (for edge cases)
CREATE POLICY "Admins can insert entries"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
