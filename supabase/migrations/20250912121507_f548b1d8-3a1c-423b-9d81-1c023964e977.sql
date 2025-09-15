-- Dodaj foreign key constraint między equipment_logs.user_id a profiles.user_id
ALTER TABLE public.equipment_logs 
ADD CONSTRAINT fk_equipment_logs_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;