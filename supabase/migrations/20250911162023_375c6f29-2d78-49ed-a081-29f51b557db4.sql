-- Add column to control visibility in checklist
ALTER TABLE equipment 
ADD COLUMN show_in_checklist boolean DEFAULT true;