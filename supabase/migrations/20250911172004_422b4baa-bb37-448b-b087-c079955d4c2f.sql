-- Add foreign key constraint for department_roles to departments
ALTER TABLE public.department_roles 
ADD CONSTRAINT fk_department_roles_department 
FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;

-- Update the app_role enum to include department_role
ALTER TYPE public.app_role ADD VALUE 'department_role';