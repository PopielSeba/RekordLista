-- Napraw problem z nieskończoną rekursją w RLS policies
-- Usuń istniejące problematyczne policies
DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view all user roles" ON public.user_roles;

-- Utwórz proste policies bez rekursji
CREATE POLICY "Allow authenticated users to view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (true);

-- Dodaj foreign key constraint między profiles a user_roles
ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;