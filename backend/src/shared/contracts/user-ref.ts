export interface UserRef {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  role: string;
  staff_id?: string | null;
}
