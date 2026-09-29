export type Role = "member" | "leader" | "admin";
export type Status = "pending" | "approved" | "rejected" | "suspended";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  group_id: string;
  role: Role;
  status: Status;
  verification_note: string | null;
  service_years: string | null;
  bio: string | null;
  city: string | null;
  phone: string | null;
  photo_path: string | null;
  name_visibility: "group" | "all";
  contact_visibility: "leaders" | "group" | "all";
  email_forum: boolean;
  email_announcements: boolean;
  unsubscribe_token: string;
  consented_at: string | null;
  approved_at: string | null;
  created_at: string;
};

// A row from member_directory(): contact fields are null when hidden.
export type DirectoryEntry = {
  id: string;
  full_name: string;
  group_id: string;
  role: Role;
  service_years: string | null;
  bio: string | null;
  city: string | null;
  photo_path: string | null;
  email: string | null;
  phone: string | null;
};
