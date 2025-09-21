-- Update user_role enum to include new roles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'koordynacja_przesylek';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pracownik_dzialu';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pracownik_budowy';

-- Create table for password management
CREATE TABLE IF NOT EXISTS public.system_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_name TEXT NOT NULL UNIQUE,
  password_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on system_passwords
ALTER TABLE public.system_passwords ENABLE ROW LEVEL SECURITY;

-- Create policies for system_passwords (only admins can manage)
CREATE POLICY "Only admins can manage system passwords"
ON public.system_passwords
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Insert default passwords
INSERT INTO public.system_passwords (password_name, password_value, description)
VALUES 
  ('haslo_3_stopnia', '333', 'Hasło 3 stopnia dla obsługi wysyłek')
ON CONFLICT (password_name) DO UPDATE SET
  password_value = EXCLUDED.password_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create function to check password
CREATE OR REPLACE FUNCTION public.check_password(password_name TEXT, provided_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.system_passwords
    WHERE password_name = $1
      AND password_value = $2
  )
$$;

-- Create function to get user role with enhanced permissions
CREATE OR REPLACE FUNCTION public.get_user_role_permissions(_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  role user_role,
  can_manage_all BOOLEAN,
  can_coordinate_without_password BOOLEAN,
  can_delete_equipment_without_password BOOLEAN,
  can_move_equipment_from_departments BOOLEAN,
  can_move_equipment_to_coordination BOOLEAN,
  can_move_equipment_from_coordination BOOLEAN,
  can_move_equipment_to_warehouses BOOLEAN,
  can_move_equipment_from_warehouses BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.role,
    -- Administrator - może wszystko
    ur.role = 'admin' as can_manage_all,
    -- Koordynacja przesyłek - może wszystko po podaniu hasła 3 stopnia
    ur.role = 'koordynacja_przesylek' as can_coordinate_without_password,
    -- Pracownik działu - może wszystko ale od kafelków działów do koordynacji
    ur.role = 'pracownik_dzialu' as can_delete_equipment_without_password,
    -- Pracownik budowy - może przenosić pomiędzy określonymi kafelkami
    ur.role = 'pracownik_budowy' as can_move_equipment_from_departments,
    -- Additional permissions based on role
    CASE 
      WHEN ur.role = 'admin' THEN true
      WHEN ur.role = 'koordynacja_przesylek' THEN true
      WHEN ur.role = 'pracownik_dzialu' THEN true
      ELSE false
    END as can_move_equipment_to_coordination,
    CASE 
      WHEN ur.role = 'admin' THEN true
      WHEN ur.role = 'koordynacja_przesylek' THEN true
      WHEN ur.role = 'pracownik_budowy' THEN true
      ELSE false
    END as can_move_equipment_from_coordination,
    CASE 
      WHEN ur.role = 'admin' THEN true
      WHEN ur.role = 'koordynacja_przesylek' THEN true
      WHEN ur.role = 'pracownik_budowy' THEN true
      ELSE false
    END as can_move_equipment_to_warehouses,
    CASE 
      WHEN ur.role = 'admin' THEN true
      WHEN ur.role = 'koordynacja_przesylek' THEN true
      WHEN ur.role = 'pracownik_budowy' THEN true
      ELSE false
    END as can_move_equipment_from_warehouses
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1
$$;

-- Add trigger for updated_at on system_passwords
CREATE TRIGGER update_system_passwords_updated_at
  BEFORE UPDATE ON public.system_passwords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
