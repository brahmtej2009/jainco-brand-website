import type { NextRequest } from 'next/server';
import { countNewEnquiries, listEnquiries } from '@/lib/enquiries';
import { json, str, withAdmin } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (_admin, request: NextRequest) => {
  const status = str(request.nextUrl.searchParams.get('status'), 20);
  return json({ enquiries: listEnquiries(status), newCount: countNewEnquiries() });
});
