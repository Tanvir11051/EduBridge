export const OFFER_SELECT = `
  id, student_id, tutor_id, proposed_location, message, status, total_amount, created_at,
  tutor_profiles!offers_tutor_id_fkey ( id, hourly_rate, user_id, profiles ( full_name, avatar_url ) ),
  profiles!offers_student_id_fkey ( full_name, avatar_url, phone, address ),
  offer_slots ( schedule_slots ( id, day_of_week, start_time, end_time ) )
`;

export type OfferRow = {
  id: string;
  student_id: string;
  tutor_id: string;
  proposed_location: string | null;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  total_amount: number | string;
  created_at: string;
  tutor_profiles: {
    id: string;
    hourly_rate: number | string;
    user_id: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
  } | null;
  profiles: { full_name: string; avatar_url: string | null; phone: string | null; address: string | null } | null;
  offer_slots: { schedule_slots: { id: string; day_of_week: number; start_time: string; end_time: string } | null }[];
};

export const TUTOR_SELECT = `
  id, user_id, bio, qualifications, subjects, levels, hourly_rate, experience_years,
  avg_rating, total_reviews, is_active,
  profiles ( full_name, avatar_url, phone, address )
`;
