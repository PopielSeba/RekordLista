-- Add intermediate warehouse relationship to persist item placement
ALTER TABLE public.project_equipment
ADD COLUMN IF NOT EXISTS intermediate_warehouse_id UUID NULL REFERENCES public.intermediate_warehouses(id) ON DELETE SET NULL;

-- Helpful index for lookups by warehouse
CREATE INDEX IF NOT EXISTS idx_project_equipment_intermediate_warehouse
  ON public.project_equipment (intermediate_warehouse_id);
