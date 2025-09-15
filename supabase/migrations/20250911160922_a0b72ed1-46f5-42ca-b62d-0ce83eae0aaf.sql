-- Make departments global by making project_id optional
ALTER TABLE public.departments ALTER COLUMN project_id DROP NOT NULL;

-- Add a new column to indicate if department is global template
ALTER TABLE public.departments ADD COLUMN is_global BOOLEAN DEFAULT false;

-- Update existing departments to be global
UPDATE public.departments SET is_global = true, project_id = NULL;