-- Create table for system security settings
CREATE TABLE public.security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Only admin users can access security settings
CREATE POLICY "Only authenticated users can view security settings"
ON public.security_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only authenticated users can update security settings"
ON public.security_settings
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Only authenticated users can insert security settings"
ON public.security_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default password values
INSERT INTO public.security_settings (setting_key, setting_value, description)
VALUES 
  ('level1_password', '0500600525', 'Hasło dostępu 1 stopnia - Ustawienia'),
  ('level2_password', '3181175', 'Hasło dostępu 2 stopnia - Admin')
ON CONFLICT (setting_key) DO NOTHING;