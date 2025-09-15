-- Create missing departments for the role system
INSERT INTO public.departments (name, is_global) 
VALUES 
    ('Koordynacja Przesyłek', true),
    ('Obsługa Budowy', true)
ON CONFLICT (name) DO NOTHING;