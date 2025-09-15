-- Create equipment logs table
CREATE TABLE public.equipment_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    equipment_id UUID,
    project_equipment_id UUID,
    action_type TEXT NOT NULL, -- 'added', 'status_changed', 'position_changed'
    old_value TEXT,
    new_value TEXT,
    details JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage equipment logs" 
ON public.equipment_logs 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Department managers can view logs" 
ON public.equipment_logs 
FOR SELECT 
USING (is_department_manager(auth.uid()));

-- Add indexes for better performance
CREATE INDEX idx_equipment_logs_project_id ON public.equipment_logs(project_id);
CREATE INDEX idx_equipment_logs_created_at ON public.equipment_logs(created_at DESC);
CREATE INDEX idx_equipment_logs_action_type ON public.equipment_logs(action_type);

-- Create function to log equipment actions
CREATE OR REPLACE FUNCTION public.log_equipment_action(
    _project_id UUID,
    _action_type TEXT,
    _equipment_id UUID DEFAULT NULL,
    _project_equipment_id UUID DEFAULT NULL,
    _old_value TEXT DEFAULT NULL,
    _new_value TEXT DEFAULT NULL,
    _details JSONB DEFAULT NULL,
    _user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.equipment_logs (
        project_id,
        equipment_id,
        project_equipment_id,
        action_type,
        old_value,
        new_value,
        details,
        user_id
    ) VALUES (
        _project_id,
        _equipment_id,
        _project_equipment_id,
        _action_type,
        _old_value,
        _new_value,
        _details,
        _user_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;