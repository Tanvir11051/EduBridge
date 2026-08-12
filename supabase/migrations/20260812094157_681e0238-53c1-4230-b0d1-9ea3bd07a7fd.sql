ALTER TABLE public.tutor_profiles ADD COLUMN IF NOT EXISTS demo_video_urls text[] NOT NULL DEFAULT '{}'::text[];

DROP VIEW IF EXISTS public.public_tutors;
CREATE VIEW public.public_tutors WITH (security_invoker = true) AS
SELECT t.id, t.user_id, t.bio, t.qualifications, t.subjects, t.levels, t.hourly_rate,
       t.experience_years, t.avg_rating, t.total_reviews, t.is_active, t.demo_video_urls,
       p.full_name, p.avatar_url
FROM public.tutor_profiles t
JOIN public.profiles p ON p.id = t.user_id
WHERE t.is_active;

GRANT SELECT ON public.public_tutors TO anon, authenticated;