-- Add admin role for current user
-- This will add the current authenticated user to user_roles table with admin role

INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
    auth.uid(),
    'admin'::user_role,
    auth.uid(),
    NOW()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Alternative: If you know your user ID, you can use this instead:
-- INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
-- VALUES (
--     'YOUR_USER_ID_HERE'::uuid,
--     'admin'::user_role,
--     'YOUR_USER_ID_HERE'::uuid,
--     NOW()
-- )
-- ON CONFLICT (user_id, role) DO NOTHING;
