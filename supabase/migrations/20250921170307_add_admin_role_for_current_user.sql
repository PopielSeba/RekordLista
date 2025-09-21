-- Add admin role for current user
-- This will add the current authenticated user to user_roles table with admin role

-- First, let's add admin role for any existing users who don't have a role yet
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
    p.user_id,
    'admin'::user_role,
    p.user_id,
    NOW()
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure that the specific admin email has admin role
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
    p.user_id,
    'admin'::user_role,
    p.user_id,
    NOW()
FROM public.profiles p
WHERE p.email = 's.popiel.doa@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
