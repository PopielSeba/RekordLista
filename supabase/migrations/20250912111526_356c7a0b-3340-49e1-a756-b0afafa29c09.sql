-- First, drop all policies that depend on the functions
-- User roles policies
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Plots policies  
DROP POLICY IF EXISTS "Admins can view all plots" ON public.plots;
DROP POLICY IF EXISTS "Admins can update all plots" ON public.plots;
DROP POLICY IF EXISTS "Admins can delete all plots" ON public.plots;

-- Profiles policies
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Projects policies
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;

-- Now drop all role-related functions with CASCADE
DROP FUNCTION IF EXISTS public.has_role(_user_id uuid, _role app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_department_manager(_user_id uuid, _department_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_department_role(_user_id uuid, _department_id uuid, _role_type department_role_type) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(user_uuid uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(user_uuid uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_department_roles() CASCADE;

-- Drop all role-related tables
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.department_roles CASCADE;

-- Drop role-related columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS department CASCADE;

-- Drop custom enum types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.department_role_type CASCADE;