import type { NextRequest } from 'next/server';
import { deleteEnquiry, setEnquiryStatus } from '@/lib/enquiries';
import { json, str, withAdmin, type RouteContext } from '@/lib/api';
import { readJson, routeId } from '@/lib/security';

export const runtime = 'nodejs';

type Params = { id: string };

export const PATCH = withAdmin<Params>(async (_admin, request: NextRequest, ctx: RouteContext<Params>) => {
  const id = routeId((await ctx.params).id);
  const body = await readJson(request);

  setEnquiryStatus(id, str(body.status, 20));
  return json({ ok: true });
});

export const DELETE = withAdmin<Params>(async (_admin, _request: NextRequest, ctx: RouteContext<Params>) => {
  deleteEnquiry(routeId((await ctx.params).id));
  return json({ ok: true });
});
