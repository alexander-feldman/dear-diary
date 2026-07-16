import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const redirectDestination = !error && data.user && pathname === "/"
    ? "/journal"
    : !error && !data.user && pathname === "/journal"
      ? "/"
      : null;

  console.info("Auth proxy", { pathname, hasUser: Boolean(data.user), redirectDestination });
  if (!redirectDestination) return response;

  const redirectResponse = NextResponse.redirect(new URL(redirectDestination, request.url));
  for (const setCookie of response.headers.getSetCookie()) {
    redirectResponse.headers.append("set-cookie", setCookie);
  }
  return redirectResponse;
}

export const config = {
  matcher: ["/", "/journal"],
};
