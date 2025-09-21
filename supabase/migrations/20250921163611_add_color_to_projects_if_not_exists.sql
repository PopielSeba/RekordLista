-- Add color column to projects table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'color'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects
        ADD COLUMN color TEXT NOT NULL DEFAULT '#3b82f6';
        
        COMMENT ON COLUMN public.projects.color IS 'Color associated with the project for visual identification';
    END IF;
END $$;
