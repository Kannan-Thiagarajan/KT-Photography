import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
export type UploadTicket = {
  path: string;
  albumId: string | null;
  filename: string;
  size: number;
  type: string;
  bucket: 'client-photos' | 'public-assets';
  expires: number;
  adminId: string;
};
export function signTicket(ticket: UploadTicket) {
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  const signature = createHmac('sha256', process.env.SUPABASE_SECRET_KEY!)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyTicket(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) throw new Error('Invalid upload authorization.');
  const mac = createHmac('sha256', process.env.SUPABASE_SECRET_KEY!).update(payload).digest();
  const given = Buffer.from(signature, 'base64url');
  if (mac.length !== given.length || !timingSafeEqual(mac, given))
    throw new Error('Invalid upload authorization.');
  const ticket = JSON.parse(Buffer.from(payload, 'base64url').toString()) as UploadTicket;
  if (ticket.expires < Date.now()) throw new Error('Upload expired. Please try again.');
  return ticket;
}
