/** A single notification item returned by the API. */
export interface Notification {
  id: string;
  title: string;
  message: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  read: boolean;
  /** Optional deep-link within the app (e.g. "/item-bank?question=123") */
  href?: string;
}
