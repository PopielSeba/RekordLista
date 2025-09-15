-- Create project equipment table to track equipment assigned to departments in projects
CREATE TABLE public.project_equipment (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
    custom_name TEXT, -- for project-specific equipment
    custom_description TEXT, -- for project-specific equipment
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'assigned',
    position_order INTEGER NOT NULL DEFAULT 0,
    is_custom BOOLEAN NOT NULL DEFAULT false, -- true if created specifically for this project
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_equipment
ALTER TABLE public.project_equipment ENABLE ROW LEVEL SECURITY;

-- Create policies for project_equipment
CREATE POLICY "Admins can manage project equipment" 
ON public.project_equipment 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Department users can manage their equipment" 
ON public.project_equipment 
FOR ALL 
USING (has_department_role(auth.uid(), department_id, 'manager') OR has_department_role(auth.uid(), department_id, 'worker'))
WITH CHECK (has_department_role(auth.uid(), department_id, 'manager') OR has_department_role(auth.uid(), department_id, 'worker'));

CREATE POLICY "Anyone can view project equipment" 
ON public.project_equipment 
FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_project_equipment_updated_at
    BEFORE UPDATE ON public.project_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();