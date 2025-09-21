-- Fix RLS policies for project_files table
-- Drop existing policies
DROP POLICY IF EXISTS "Department users can manage their project files" ON public.project_files;

-- Create new policy with correct permissions
CREATE POLICY "Project members can manage project files" 
ON public.project_files 
FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_departments pd JOIN public.departments d ON pd.department_id = d.id WHERE pd.project_id = project_id AND has_department_role(auth.uid(), d.id, 'manager')) OR
    EXISTS (SELECT 1 FROM public.project_departments pd JOIN public.departments d ON pd.department_id = d.id WHERE pd.project_id = project_id AND has_department_role(auth.uid(), d.id, 'worker'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.project_departments pd JOIN public.departments d ON pd.department_id = d.id WHERE pd.project_id = project_id AND has_department_role(auth.uid(), d.id, 'manager')) OR
    EXISTS (SELECT 1 FROM public.project_departments pd JOIN public.departments d ON pd.department_id = d.id WHERE pd.project_id = project_id AND has_department_role(auth.uid(), d.id, 'worker'))
);
