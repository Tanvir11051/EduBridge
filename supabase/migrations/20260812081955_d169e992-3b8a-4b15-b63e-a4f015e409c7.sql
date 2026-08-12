-- ROLES
CREATE TYPE public.app_role AS ENUM ('student','tutor','admin');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_pick_once" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND role IN ('student','tutor')
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TUTOR PROFILES
CREATE TABLE public.tutor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio text,
  qualifications text,
  subjects text[] NOT NULL DEFAULT '{}',
  levels text[] NOT NULL DEFAULT '{}',
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  experience_years int NOT NULL DEFAULT 0,
  avg_rating numeric(3,2) NOT NULL DEFAULT 0,
  total_reviews int NOT NULL DEFAULT 0,
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tutor_profiles TO authenticated;
GRANT SELECT ON public.tutor_profiles TO anon;
GRANT ALL ON public.tutor_profiles TO service_role;
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutor_profiles_read_all" ON public.tutor_profiles FOR SELECT USING (true);
CREATE POLICY "tutor_profiles_insert_own" ON public.tutor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tutor_profiles_update_own" ON public.tutor_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tutor_profiles_updated_at BEFORE UPDATE ON public.tutor_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCHEDULE SLOTS
CREATE TABLE public.schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  booked_offer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX schedule_slots_tutor_idx ON public.schedule_slots(tutor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_slots TO authenticated;
GRANT SELECT ON public.schedule_slots TO anon;
GRANT ALL ON public.schedule_slots TO service_role;
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots_read_all" ON public.schedule_slots FOR SELECT USING (true);
CREATE POLICY "slots_owner_insert" ON public.schedule_slots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = tutor_id AND t.user_id = auth.uid()));
CREATE POLICY "slots_owner_update" ON public.schedule_slots FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = tutor_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = tutor_id AND t.user_id = auth.uid()));
CREATE POLICY "slots_owner_delete" ON public.schedule_slots FOR DELETE TO authenticated
  USING (is_booked = false AND EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = tutor_id AND t.user_id = auth.uid()));

-- OFFERS
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  proposed_location text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX offers_student_idx ON public.offers(student_id);
CREATE INDEX offers_tutor_idx ON public.offers(tutor_id);
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_read" ON public.offers FOR SELECT TO authenticated USING (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "offers_student_insert" ON public.offers FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "offers_update" ON public.offers FOR UPDATE TO authenticated USING (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
) WITH CHECK (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = tutor_id AND t.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.schedule_slots
  ADD CONSTRAINT schedule_slots_booked_offer_fkey
  FOREIGN KEY (booked_offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;

-- OFFER SLOTS
CREATE TABLE public.offer_slots (
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, slot_id)
);
GRANT SELECT, INSERT, DELETE ON public.offer_slots TO authenticated;
GRANT ALL ON public.offer_slots TO service_role;
ALTER TABLE public.offer_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_slots_read" ON public.offer_slots FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND (
    o.student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tutor_profiles t WHERE t.id = o.tutor_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "offer_slots_insert" ON public.offer_slots FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.student_id = auth.uid())
);

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, student_id)
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_student_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.student_id = auth.uid() AND o.status = 'accepted' AND o.tutor_id = reviews.tutor_id)
);

CREATE OR REPLACE FUNCTION public.refresh_tutor_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.tutor_profiles t SET
    avg_rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric,2) FROM public.reviews r WHERE r.tutor_id = t.id),0),
    total_reviews = (SELECT COUNT(*) FROM public.reviews r WHERE r.tutor_id = t.id)
  WHERE t.id = COALESCE(NEW.tutor_id, OLD.tutor_id);
  RETURN NULL;
END; $$;
CREATE TRIGGER reviews_refresh_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_tutor_rating();

-- COMPLAINTS
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raised_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  against uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "complaints_read" ON public.complaints FOR SELECT TO authenticated
  USING (auth.uid() = raised_by OR auth.uid() = against OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = raised_by);
CREATE POLICY "complaints_admin_update" ON public.complaints FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_any" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STORAGE POLICIES (avatars bucket created via storage tool)
CREATE POLICY "avatars_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);