-- Add role column to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN role TEXT NOT NULL DEFAULT 'pracownik' CHECK (role IN ('admin', 'kierownik', 'pracownik'));

-- Add department column 
ALTER TABLE public.profiles 
ADD COLUMN department TEXT;

-- Update the handle_new_user function to set roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE 
      WHEN NEW.email = 's.popiel.doa@gmail.com' THEN 'admin'
      ELSE 'pracownik'
    END,
    CASE 
      WHEN NEW.email = 's.popiel.doa@gmail.com' THEN 'Zarząd'
      ELSE 'Dział Ogólny'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    department = EXCLUDED.department;
  RETURN NEW;
END;
$$;

-- Create a function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;