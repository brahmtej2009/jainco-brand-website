import { currentAdmin, hasAnyAdmin } from '@/lib/auth';
import { json } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await currentAdmin();
  return json({ user: admin, setupNeeded: !hasAnyAdmin() });
}
