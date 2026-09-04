import 'server-only';
import { db } from './db';
import { ValidationError } from './security';
import { str } from './api';

export type Enquiry = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  item_ref: string;
  status: 'new' | 'read' | 'archived';
  created_at: string;
};

const STATUSES = new Set(['new', 'read', 'archived']);

// Deliberately permissive: the goal is to catch typos, not to police valid addresses.
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export type EnquiryInput = {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  item_ref: string;
};

/** Validates one submission from the public contact form. */
export function validateEnquiry(body: Record<string, unknown>): EnquiryInput {
  const name = str(body.name, 120);
  const email = str(body.email, 160).toLowerCase();
  const phone = str(body.phone, 40);
  const company = str(body.company, 120);
  const message = str(body.message, 4000);
  const itemRef = str(body.item_ref, 60);

  if (name.length < 2) throw new ValidationError('Please enter your name.');
  if (!EMAIL.test(email)) throw new ValidationError('Please enter a valid email address.');
  if (phone && !/^[\d+\-()\s]{6,40}$/.test(phone)) throw new ValidationError('Please check the phone number.');
  if (message.length < 10) throw new ValidationError('Please tell us a little more in your message.');

  return { name, email, phone, company, message, item_ref: itemRef };
}

export function createEnquiry(input: EnquiryInput): number {
  const info = db()
    .prepare(
      `INSERT INTO enquiries (name, email, phone, company, message, item_ref)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.name, input.email, input.phone, input.company, input.message, input.item_ref);

  return Number(info.lastInsertRowid);
}

export function listEnquiries(status?: string): Enquiry[] {
  if (status && STATUSES.has(status)) {
    return db()
      .prepare('SELECT * FROM enquiries WHERE status = ? ORDER BY id DESC LIMIT 500')
      .all(status) as Enquiry[];
  }
  // "All" means everything still in play. Archived messages live under their own filter.
  return db()
    .prepare("SELECT * FROM enquiries WHERE status != 'archived' ORDER BY id DESC LIMIT 500")
    .all() as Enquiry[];
}

export function countNewEnquiries(): number {
  const row = db().prepare("SELECT COUNT(*) AS c FROM enquiries WHERE status = 'new'").get() as { c: number };
  return row.c;
}

export function setEnquiryStatus(id: number, status: string) {
  if (!STATUSES.has(status)) throw new ValidationError('Unknown status.');
  db().prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
}

export function deleteEnquiry(id: number) {
  db().prepare('DELETE FROM enquiries WHERE id = ?').run(id);
}
