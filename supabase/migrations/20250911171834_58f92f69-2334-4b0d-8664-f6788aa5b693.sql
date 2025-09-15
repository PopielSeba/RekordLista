-- Create department roles enum
CREATE TYPE public.department_role_type AS ENUM ('manager', 'worker');

-- Create department_roles table to track available roles for each department
CREATE TABLE public.department_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL,
    role_type department_role_type NOT NULL,
    role_name TEXT NOT NULL, -- e.g., "kierownik_IT", "pracownik_IT"
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(department_id, role_type)
);

-- Enable RLS on department_roles
ALTER TABLE public.department_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for department_roles
CREATE POLICY "Admins can manage department roles" 
ON public.department_roles 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view department roles" 
ON public.department_roles 
FOR SELECT 
USING (true);

-- Update user_roles table to reference department_roles
ALTER TABLE public.user_roles ADD COLUMN department_role_id UUID REFERENCES public.department_roles(id) ON DELETE CASCADE;

-- Create function to automatically create department roles when a new department is added
CREATE OR REPLACE FUNCTION public.create_department_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Create manager role for the department
    INSERT INTO public.department_roles (department_id, role_type, role_name)
    VALUES (NEW.id, 'manager', 'kierownik_' || LOWER(REPLACE(NEW.name, ' ', '_')));
    
    -- Create worker role for the department
    INSERT INTO public.department_roles (department_id, role_type, role_name)
    VALUES (NEW.id, 'worker', 'pracownik_' || LOWER(REPLACE(NEW.name, ' ', '_')));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create roles when a department is created
CREATE TRIGGER create_department_roles_trigger
    AFTER INSERT ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_department_roles();

-- Create function to check if user has specific department role
CREATE OR REPLACE FUNCTION public.has_department_role(_user_id uuid, _department_id uuid, _role_type department_role_type)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.department_roles dr ON ur.department_role_id = dr.id
    WHERE ur.user_id = _user_id
      AND dr.department_id = _department_id
      AND dr.role_type = _role_type
  )
$$;

-- Create function to check if user is department manager
CREATE OR REPLACE FUNCTION public.is_department_manager(_user_id uuid, _department_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN _department_id IS NULL THEN
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.department_roles dr ON ur.department_role_id = dr.id
        WHERE ur.user_id = _user_id
          AND dr.role_type = 'manager'
      )
    ELSE
      has_department_role(_user_id, _department_id, 'manager')
  END
$$;

-- Insert roles for existing departments
INSERT INTO public.department_roles (department_id, role_type, role_name)
SELECT 
    d.id,
    'manager',
    'kierownik_' || LOWER(REPLACE(d.name, ' ', '_'))
FROM public.departments d
WHERE NOT EXISTS (
    SELECT 1 FROM public.department_roles dr 
    WHERE dr.department_id = d.id AND dr.role_type = 'manager'
);

INSERT INTO public.department_roles (department_id, role_type, role_name)
SELECT 
    d.id,
    'worker',
    'pracownik_' || LOWER(REPLACE(d.name, ' ', '_'))
FROM public.departments d
WHERE NOT EXISTS (
    SELECT 1 FROM public.department_roles dr 
    WHERE dr.department_id = d.id AND dr.role_type = 'worker'
);