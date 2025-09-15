-- Drop all role-related functions
DROP FUNCTION IF EXISTS public.has_role(_user_id uuid, _role app_role);
DROP FUNCTION IF EXISTS public.is_department_manager(_user_id uuid, _department_id uuid);
DROP FUNCTION IF EXISTS public.has_department_role(_user_id uuid, _department_id uuid, _role_type department_role_type);
DROP FUNCTION IF EXISTS public.get_user_role(user_uuid uuid);
DROP FUNCTION IF EXISTS public.is_admin(user_uuid uuid);
DROP FUNCTION IF EXISTS public.create_department_roles();

-- Drop all role-related tables
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.department_roles CASCADE;

-- Drop role-related columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS department CASCADE;

-- Drop custom enum types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.department_role_type CASCADE;

-- Update profiles table to be simple
ALTER TABLE public.profiles 
ADD COLUMN display_name text,
ADD COLUMN email text;

-- Drop and recreate RLS policies for simplified access
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Simple RLS policies for profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop all admin-only policies from other tables and make them accessible to all authenticated users
-- Projects
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Department managers can insert projects" ON public.projects;

CREATE POLICY "Authenticated users can manage projects" ON public.projects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment
DROP POLICY IF EXISTS "Admins can manage equipment" ON public.equipment;
CREATE POLICY "Authenticated users can manage equipment" ON public.equipment FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Project Equipment  
DROP POLICY IF EXISTS "Admins can manage project equipment" ON public.project_equipment;
DROP POLICY IF EXISTS "Department users can manage their equipment" ON public.project_equipment;
CREATE POLICY "Authenticated users can manage project equipment" ON public.project_equipment FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Departments
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Authenticated users can manage departments" ON public.departments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment Logs
DROP POLICY IF EXISTS "Admins can manage equipment logs" ON public.equipment_logs;
DROP POLICY IF EXISTS "Department managers can view logs" ON public.equipment_logs;
CREATE POLICY "Authenticated users can manage equipment logs" ON public.equipment_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Intermediate Warehouses
DROP POLICY IF EXISTS "Admins can manage intermediate warehouses" ON public.intermediate_warehouses;
DROP POLICY IF EXISTS "Department managers can manage warehouses" ON public.intermediate_warehouses;
CREATE POLICY "Authenticated users can manage intermediate warehouses" ON public.intermediate_warehouses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Destinations
DROP POLICY IF EXISTS "Admins can manage destinations" ON public.destinations;
CREATE POLICY "Authenticated users can manage destinations" ON public.destinations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Transports
DROP POLICY IF EXISTS "Admins can manage transports" ON public.transports;
CREATE POLICY "Authenticated users can manage transports" ON public.transports FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Project Departments
DROP POLICY IF EXISTS "Admins can manage project departments" ON public.project_departments;
DROP POLICY IF EXISTS "Department managers can add their department" ON public.project_departments;
CREATE POLICY "Authenticated users can manage project departments" ON public.project_departments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment Transport
DROP POLICY IF EXISTS "Admins can manage equipment_transport" ON public.equipment_transport;
CREATE POLICY "Authenticated users can manage equipment_transport" ON public.equipment_transport FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Equipment Destination
DROP POLICY IF EXISTS "Admins can manage equipment_destination" ON public.equipment_destination;
CREATE POLICY "Authenticated users can manage equipment_destination" ON public.equipment_destination FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Update the handle_new_user function to be simpler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$;