-- Drop the problematic policies that reference the wrong role system
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;

-- Create new policies that work with our profiles-based role system
CREATE POLICY "Anyone can view projects" 
ON public.projects 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update projects" 
ON public.projects 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete projects" 
ON public.projects 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Also fix other tables that might have similar issues
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins can manage destinations" ON public.destinations;
DROP POLICY IF EXISTS "Admins can manage transports" ON public.transports;
DROP POLICY IF EXISTS "Admins can manage equipment_transport" ON public.equipment_transport;
DROP POLICY IF EXISTS "Admins can manage equipment_destination" ON public.equipment_destination;

-- Recreate with correct role checking
CREATE POLICY "Admins can manage departments" 
ON public.departments 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage equipment" 
ON public.equipment 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage destinations" 
ON public.destinations 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage transports" 
ON public.transports 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage equipment_transport" 
ON public.equipment_transport 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage equipment_destination" 
ON public.equipment_destination 
FOR ALL 
USING (public.is_admin(auth.uid()));