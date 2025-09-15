-- Create intermediate warehouses table
CREATE TABLE public.intermediate_warehouses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pre_coordination', 'post_coordination')),
    position_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on intermediate_warehouses
ALTER TABLE public.intermediate_warehouses ENABLE ROW LEVEL SECURITY;

-- Create policies for intermediate_warehouses
CREATE POLICY "Admins can manage intermediate warehouses" 
ON public.intermediate_warehouses 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Department managers can manage warehouses" 
ON public.intermediate_warehouses 
FOR ALL 
USING (is_department_manager(auth.uid()))
WITH CHECK (is_department_manager(auth.uid()));

CREATE POLICY "Anyone can view intermediate warehouses" 
ON public.intermediate_warehouses 
FOR SELECT 
USING (true);

-- Create project_departments table to track which departments are added to a project
CREATE TABLE public.project_departments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    position_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, department_id)
);

-- Enable RLS on project_departments
ALTER TABLE public.project_departments ENABLE ROW LEVEL SECURITY;

-- Create policies for project_departments
CREATE POLICY "Admins can manage project departments" 
ON public.project_departments 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Department managers can add their department" 
ON public.project_departments 
FOR INSERT 
WITH CHECK (has_department_role(auth.uid(), department_id, 'manager') OR has_department_role(auth.uid(), department_id, 'worker'));

CREATE POLICY "Anyone can view project departments" 
ON public.project_departments 
FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_intermediate_warehouses_updated_at
    BEFORE UPDATE ON public.intermediate_warehouses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraint for department_roles to departments
ALTER TABLE public.department_roles 
ADD CONSTRAINT fk_department_roles_department 
FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;