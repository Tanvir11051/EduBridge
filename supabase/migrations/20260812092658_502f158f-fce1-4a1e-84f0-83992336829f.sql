-- 1. Profiles: remove public read, restrict to authenticated
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_read_authenticated ON public.profiles
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- Safe public tutor directory for the landing page (no phone/address)
CREATE OR REPLACE VIEW public.public_tutors AS
  SELECT t.id, t.user_id, t.bio, t.qualifications, t.subjects, t.levels,
         t.hourly_rate, t.experience_years, t.avg_rating, t.total_reviews,
         t.is_active, p.full_name, p.avatar_url
  FROM public.tutor_profiles t
  JOIN public.profiles p ON p.id = t.user_id
  WHERE t.is_active;
GRANT SELECT ON public.public_tutors TO anon, authenticated;

-- 2. Reviews: authenticated only
DROP POLICY IF EXISTS reviews_read_all ON public.reviews;
CREATE POLICY reviews_read_authenticated ON public.reviews
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.reviews FROM anon;

-- 3. Schedule slots: authenticated only
DROP POLICY IF EXISTS slots_read_all ON public.schedule_slots;
CREATE POLICY slots_read_authenticated ON public.schedule_slots
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.schedule_slots FROM anon;

-- tutor_profiles stays publicly readable but only via anon SELECT it already has

-- 4. Notifications: no more spoofing arbitrary recipients
DROP POLICY IF EXISTS notifications_insert_any ON public.notifications;
CREATE POLICY notifications_insert_related ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.tutor_profiles t ON t.id = o.tutor_id
      WHERE (o.student_id = auth.uid() AND t.user_id = notifications.user_id)
         OR (t.user_id = auth.uid() AND o.student_id = notifications.user_id)
    )
  );

-- 5. has_role: SECURITY DEFINER function may only answer about the caller
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;