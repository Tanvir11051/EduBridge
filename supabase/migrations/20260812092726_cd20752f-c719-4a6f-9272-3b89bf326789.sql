ALTER VIEW public.public_tutors SET (security_invoker = true);

-- Logged-out visitors may read only name/avatar, and only for active tutors
GRANT SELECT (id, full_name, avatar_url) ON public.profiles TO anon;
CREATE POLICY profiles_read_public_tutor_basics ON public.profiles
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.tutor_profiles t
    WHERE t.user_id = profiles.id AND t.is_active
  ));