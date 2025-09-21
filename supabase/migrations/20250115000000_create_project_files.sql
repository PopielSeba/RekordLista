-- Create project_files table for storing file uploads
CREATE TABLE public.project_files (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    project_equipment_id UUID NOT NULL REFERENCES public.project_equipment(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_data BYTEA NOT NULL, -- Binary data storage
    mime_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_files
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Create policies for project_files
CREATE POLICY "Admins can manage project files" 
ON public.project_files 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Department users can manage their project files" 
ON public.project_files 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.project_equipment pe 
        JOIN public.departments d ON pe.department_id = d.id 
        WHERE pe.id = project_equipment_id 
        AND (has_department_role(auth.uid(), d.id, 'manager') OR has_department_role(auth.uid(), d.id, 'worker'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_equipment pe 
        JOIN public.departments d ON pe.department_id = d.id 
        WHERE pe.id = project_equipment_id 
        AND (has_department_role(auth.uid(), d.id, 'manager') OR has_department_role(auth.uid(), d.id, 'worker'))
    )
);

CREATE POLICY "Anyone can view project files" 
ON public.project_files 
FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_project_files_updated_at
    BEFORE UPDATE ON public.project_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_project_files_project_equipment_id ON public.project_files(project_equipment_id);
CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);
