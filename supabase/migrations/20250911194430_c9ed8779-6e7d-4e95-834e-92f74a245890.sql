-- Fix security issue: Set search_path for the logging function
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
SET search_path = public
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