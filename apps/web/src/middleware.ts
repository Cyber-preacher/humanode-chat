import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Gate contacts pages & APIs when NEXT_PUBLIC_REQUIRE_BIOMAPPED=true.
 * Requires two cookies:
 *  - hm_owner: 0x... (lowercased)
 *  - hm_biomapped: "true"
 */
export function middleware(req: NextRequest) {
  const requireGate = String(process.env.NEXT_PUBLIC_REQUIRE_BIOMAPPED).toLowerCase() === 'true';
  if (!requireGate) return NextResponse.next();

  const owner = req.cookies.get('hm_owner')?.value;
  const ok = req.cookies.get('hm_biomapped')?.value === 'true';

  if (!owner || !ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/gate';
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/** Run only on contacts UI & contacts APIs */
export const config = {
  matcher: ['/contacts', '/api/contacts/:path*'],
};
