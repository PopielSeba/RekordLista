-- Add simple RLS policies for all remaining tables that allow authenticated users full access

-- Simple RLS policies for profiles (if not already created)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects policies
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;
CREATE POLICY "Authenticated users can manage projects" ON public.projects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment policies
DROP POLICY IF EXISTS "Authenticated users can manage equipment" ON public.equipment;
CREATE POLICY "Authenticated users can manage equipment" ON public.equipment FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Project Equipment policies
DROP POLICY IF EXISTS "Authenticated users can manage project equipment" ON public.project_equipment;
CREATE POLICY "Authenticated users can manage project equipment" ON public.project_equipment FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Departments policies
DROP POLICY IF EXISTS "Authenticated users can manage departments" ON public.departments;
CREATE POLICY "Authenticated users can manage departments" ON public.departments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment Logs policies
DROP POLICY IF EXISTS "Authenticated users can manage equipment logs" ON public.equipment_logs;
CREATE POLICY "Authenticated users can manage equipment logs" ON public.equipment_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Intermediate Warehouses policies
DROP POLICY IF EXISTS "Authenticated users can manage intermediate warehouses" ON public.intermediate_warehouses;
CREATE POLICY "Authenticated users can manage intermediate warehouses" ON public.intermediate_warehouses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Destinations policies
DROP POLICY IF EXISTS "Authenticated users can manage destinations" ON public.destinations;
CREATE POLICY "Authenticated users can manage destinations" ON public.destinations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Transports policies
DROP POLICY IF EXISTS "Authenticated users can manage transports" ON public.transports;
CREATE POLICY "Authenticated users can manage transports" ON public.transports FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Project Departments policies
DROP POLICY IF EXISTS "Authenticated users can manage project departments" ON public.project_departments;
CREATE POLICY "Authenticated users can manage project departments" ON public.project_departments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment Transport policies
DROP POLICY IF EXISTS "Authenticated users can manage equipment_transport" ON public.equipment_transport;
CREATE POLICY "Authenticated users can manage equipment_transport" ON public.equipment_transport FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment Destination policies
DROP POLICY IF EXISTS "Authenticated users can manage equipment_destination" ON public.equipment_destination;
CREATE POLICY "Authenticated users can manage equipment_destination" ON public.equipment_destination FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');