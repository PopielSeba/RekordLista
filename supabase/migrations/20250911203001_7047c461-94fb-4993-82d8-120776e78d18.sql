-- Add reverse_flow flag to projects for return shipment functionality
ALTER TABLE public.projects 
ADD COLUMN reverse_flow boolean DEFAULT false NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.projects.reverse_flow IS 'Indicates if this is a return shipment project with reverse workflow';