-- Add color column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#3b82f6';

COMMENT ON COLUMN public.projects.color IS 'Color associated with the project for visual identification';
