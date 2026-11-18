/** Inquiry constants shared by the contact endpoint and the admin API. */
import { randomBytes } from './crypto';

export const STATUSES = ['new', 'contacted', 'in_progress', 'completed', 'archived'] as const;
export type InquiryStatus = (typeof STATUSES)[number];

export const ID_PATTERN = /^NX-[0-9A-HJKMNP-TV-Z]{8}$/;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

export function newInquiryId(): string {
  const bytes = randomBytes(8);
  let id = 'NX-';
  for (const b of bytes) id += ALPHABET[b & 31];
  return id;
}

export interface InquiryRow {
  id: string;
  name: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  message: string;
  consent: number;
  status: InquiryStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Columns returned to the admin UI (the duplicate-detection fingerprint stays server-side). */
export const INQUIRY_COLUMNS = 'id, name, email, company, service, budget, message, consent, status, notes, created_at, updated_at';
