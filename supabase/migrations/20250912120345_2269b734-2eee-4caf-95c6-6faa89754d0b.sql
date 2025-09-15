-- Dodaj rolę admin dla istniejącego użytkownika s.popiel.doa@gmail.com
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
    '57b73285-6d3d-44b1-a92f-942b3347f69d'::uuid,
    'admin'::user_role,
    '57b73285-6d3d-44b1-a92f-942b3347f69d'::uuid,
    NOW()
ON CONFLICT (user_id, role) DO NOTHING;

-- Sprawdź czy są inni użytkownicy bez ról i dodaj im domyślną rolę pracownik
INSERT INTO public.user_roles (user_id, role)
SELECT 
    p.user_id,
    'pracownik'::user_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;