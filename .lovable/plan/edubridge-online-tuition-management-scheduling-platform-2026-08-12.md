# EduBridge — Online Tuition Management & Scheduling Platform

Build the complete Phase 1 platform: three role-based portals (student, tutor, admin) on top of a Lovable Cloud backend, seeded with realistic Bangladeshi demo data, with Phase 2 AI features left as wired placeholders.

## Stack note

Your spec assumes React Router + a direct Supabase SDK setup. This project runs on TanStack Start with Lovable Cloud, which provides the same Postgres database, email/password auth, storage and server-side functions — no external account needed. Everything in the spec maps over one-to-one:

- React Router routes -> TanStack file routes at the same URLs
- Supabase Edge Functions -> server functions in the app
- Supabase Storage `avatars` bucket -> Cloud storage bucket, same paths
- `<ProtectedRoute>` -> `_authenticated` layout gate + role guards

## Data model

Tables per your schema: `profiles`, `tutor_profiles`, `schedule_slots`, `offers`, `offer_slots`, `reviews`, `complaints`, `notifications`.

One security change from the spec: roles go in a separate `user_roles` table with an `app_role` enum and a `has_role()` security-definer function, instead of a `role` column on `profiles`. A role stored on an editable profile row lets any user promote themselves to admin. The app still reads a single role per user, so UI and redirects behave exactly as specified.

RLS on every table, matching your visibility rules (public tutor/review reads, owner-scoped offers, admin-wide access via `has_role`). Explicit grants for each table. A trigger creates the `profiles` row on signup. `avatars` storage bucket with owner-scoped upload policies, 2MB, jpeg/png/webp.

## Auth flow

Register (name, email, password, confirm) -> role selection (Student / Tutor cards) -> role-based redirect. Login with forgot-password + a `/reset-password` page. Signup auto-confirm enabled so the demo flow signs in immediately. Tutors without a completed profile land on `/tutor/profile-setup`.

Seeded accounts: one admin plus demo students and tutors, credentials listed after the build so you can log in as any role.

## Pages

Public: `/` landing (hero + search, 3 feature cards, how-it-works, CTA), `/login`, `/register`, `/select-role`, `/reset-password`, `/unauthorized`.

Student: dashboard (stats + "Recommended for You" top-4 by rating), search with filters (subject, level, max rate slider 100–2000 BDT, min rating, sort) and skeleton/empty states, tutor detail with weekly slot grid and send-offer modal, offers list + detail, reviews, complaints, profile.

Tutor: dashboard (earnings, pending offers, today's schedule), profile setup, availability builder (Sun–Sat columns, add/delete slots, overlap validation), offer inbox with pending/accepted/rejected tabs, offer detail with accept/reject, reviews received, complaints, profile.

Admin: dashboard (4 stat cards, recent users, recent offers, complaint breakdown), users table with role filter, user detail, complaints list + detail with admin note and status actions, all-offers overview.

Shared: `/notifications` centre, navbar with role-aware links, notification bell with unread badge and dropdown, avatar menu.

## Business logic (server-side)

- Accepting an offer atomically sets `status = accepted`, marks all linked slots booked, and notifies the student — with a conflict check so a slot can't be double-booked.
- Rejecting notifies the student.
- Submitting a review recalculates `avg_rating` and `total_reviews` on the tutor.
- All writes go through authenticated server functions; role checks happen server-side, never from client state.

## Phase 2 placeholders

- Floating chat widget on all pages: message list, input, send button, posting to a `/api/chatbot` endpoint that returns the hardcoded "coming soon" reply — ready to swap for Gemini later.
- "Recommended for You" uses top-rated tutors with a `// TODO Phase 2` marker for the recommendation API.
- `latitude` / `longitude` columns exist on tutor profiles for the location-search work; no map view yet.
- No payments.

## Design

Green (`#16a34a`) primary, white/light-grey surfaces, blue accent for links, red for danger — defined as semantic design tokens so the palette stays consistent. Rounded-xl cards, soft shadows, mobile-first from 375px, light mode only. Reusable `TutorCard`, `StatusBadge`, `RatingStars`, `LoadingSkeleton`, `EmptyState`, `ConfirmModal`, `PageHeader`. Toasts on every success/error, inline field validation.

## Demo seed data

Around 10 tutors with bios, subjects, levels, rates, weekly slots and Dhaka coordinates; several students; a spread of offers across pending/accepted/rejected; reviews with computed averages; a few complaints in each status; sample notifications. Seeded in the migration so the pages look alive from first load.

## Build order

1. Enable Cloud, create schema + RLS + grants + storage + seed data
2. Design tokens, shared components, navbar/layout
3. Auth: register, role select, login, reset, guards, redirects
4. Tutor portal: profile setup, availability, offer inbox
5. Student portal: search, tutor detail, offer flow, reviews
6. Complaints + notifications
7. Admin portal
8. Chatbot widget + recommendation placeholder, end-to-end pass
