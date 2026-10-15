export interface UserRef {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  suffix?: string | null;
  role: string;
  staff_id?: string | null;
  /** Included only in authorized detail responses, never in ticket-list enrichment. */
  phoneNumber?: string | null;

}
