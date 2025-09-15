-- Update RLS for admin-managed tables to use profiles-based is_admin()
-- Departments
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
ON public.departments
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Equipment
DROP POLICY IF EXISTS "Admins can manage equipment" ON public.equipment;
CREATE POLICY "Admins can manage equipment"
ON public.equipment
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Destinations
DROP POLICY IF EXISTS "Admins can manage destinations" ON public.destinations;
CREATE POLICY "Admins can manage destinations"
ON public.destinations
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Transports
DROP POLICY IF EXISTS "Admins can manage transports" ON public.transports;
CREATE POLICY "Admins can manage transports"
ON public.transports
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Equipment Transport
DROP POLICY IF EXISTS "Admins can manage equipment_transport" ON public.equipment_transport;
CREATE POLICY "Admins can manage equipment_transport"
ON public.equipment_transport
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Equipment Destination
DROP POLICY IF EXISTS "Admins can manage equipment_destination" ON public.equipment_destination;
CREATE POLICY "Admins can manage equipment_destination"
ON public.equipment_destination
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));