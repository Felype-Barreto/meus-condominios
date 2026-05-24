export type CalendarArea = {
  id: string;
  name: string;
  capacity?: number | null;
  rules?: string | null;
  requires_approval?: boolean | null;
  available_days?: number[] | null;
  available_start_time?: string | null;
  available_end_time?: string | null;
  min_duration_minutes?: number | null;
  max_duration_minutes?: number | null;
  min_notice_hours?: number | null;
  max_notice_days?: number | null;
  max_bookings_per_apartment_month?: number | null;
};

export type CalendarApartment = {
  id: string;
  number: string;
  blocks?: { name: string | null } | null;
};

export type CalendarBooking = {
  id: string;
  condominium_id: string;
  common_area_id: string | null;
  apartment_id: string | null;
  user_id?: string | null;
  title: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes?: string | null;
  private_details?: boolean;
  common_areas?: { name: string | null } | null;
  apartments?: { number: string | null; blocks?: { name: string | null } | null } | null;
};
