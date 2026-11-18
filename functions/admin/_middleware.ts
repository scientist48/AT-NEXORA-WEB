/**
 * Server-side protection for the /admin/ pages.
 * Unauthenticated visitors are redirected to /admin/login/; signed-in admins
 * visiting the login page are sent to the dashboard. Admin pages are never cached or indexed.
 */
import type { Env } from '../../server/http';
import { getSession } from '../../server/session';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const isLogin = /^\/admin\/login\/?$/.test(url.pathname);

  const session = env.DB ? await getSession(env.DB, request).catch(() => null) : null;
  if (!session && !isLogin) return Response.redirect(new URL('/admin/login/', url).href, 302);
  if (session && isLogin) return Response.redirect(new URL('/admin/', url).href, 302);

  const response = await context.next();
  const out = new Response(response.body, response);
  out.headers.set('Cache-Control', 'no-store');
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
};
