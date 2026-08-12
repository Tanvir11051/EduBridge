export const SUBJECTS = [
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Bangla",
  "ICT",
  "Economics",
  "Accounting",
  "Arabic",
  "Others",
] as const;

export const LEVELS = ["Primary", "Junior Secondary", "Secondary", "Higher Secondary"] as const;

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatTime(value: string) {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function formatSlot(slot: { day_of_week: number; start_time: string; end_time: string }) {
  return `${DAYS_SHORT[slot.day_of_week]} ${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`;
}

export function formatTaka(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
