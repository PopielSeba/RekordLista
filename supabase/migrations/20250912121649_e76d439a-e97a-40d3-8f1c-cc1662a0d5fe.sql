-- Najpierw ustawmy NULL dla user_id, które nie istnieją w profiles
UPDATE public.equipment_logs 
SET user_id = NULL 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- Teraz dodajmy foreign key constraint
ALTER TABLE public.equipment_logs 
ADD CONSTRAINT fk_equipment_logs_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;