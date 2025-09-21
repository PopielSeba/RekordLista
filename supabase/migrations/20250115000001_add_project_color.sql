-- Add color field to projects table
ALTER TABLE public.projects 
ADD COLUMN color TEXT DEFAULT '#3b82f6' NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.projects.color IS 'Hex color code for project theme and blur effect';
