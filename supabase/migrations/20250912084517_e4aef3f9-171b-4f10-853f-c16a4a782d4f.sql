-- Check project creation permissions - allow department managers to create projects
CREATE POLICY "Department managers can insert projects"
ON public.projects
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  is_department_manager(auth.uid())
);