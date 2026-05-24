export type SystemRole =
  | "subscriber_admin"
  | "admin"
  | "syndic"
  | "doorman"
  | "resident"
  | "owner";

export type CondoFeature =
  | "apartments"
  | "residents"
  | "syndic"
  | "gatehouse"
  | "invites"
  | "announcements"
  | "bookings"
  | "common_areas"
  | "requests"
  | "packages"
  | "documents"
  | "incidents";

export type ApartmentStatus = "available" | "occupied" | "pending";

export type Apartment = {
  id: string;
  block: string;
  number: string;
  residents: number;
  ownerName?: string;
  status: ApartmentStatus;
};
