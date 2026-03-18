import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/primeiro-acesso") ||
    pathname === "/esqueci-senha" ||
    pathname === "/redefinir-senha";
  const isPublicRoute = pathname === "/" || isAuthRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Cliente com service role só para ler perfil (ignora RLS e evita "conta pendente")
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAdmin = serviceKey
    ? createClient(serviceUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  async function getProfile(authUserId: string) {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("role, must_change_password, office_id")
        .eq("auth_user_id", authUserId)
        .single();
      return data;
    }
    const { data } = await supabase
      .from("profiles")
      .select("role, must_change_password, office_id")
      .eq("auth_user_id", authUserId)
      .single();
    return data;
  }

  async function isLeaderOnboardingPending(officeId: string | null | undefined) {
    if (!officeId) return false;

    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("offices")
        .select("processes_initialized_at")
        .eq("id", officeId)
        .single();

      return !data?.processes_initialized_at;
    }

    const { data } = await supabase
      .from("offices")
      .select("processes_initialized_at")
      .eq("id", officeId)
      .single();

    return !data?.processes_initialized_at;
  }

  if (user && isAuthRoute) {
    const profile = await getProfile(user.id);

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/conta-pendente";
      return NextResponse.redirect(url);
    }

    if (profile?.must_change_password && !pathname.startsWith("/primeiro-acesso")) {
      const url = request.nextUrl.clone();
      url.pathname = "/primeiro-acesso";
      return NextResponse.redirect(url);
    }

    if (profile && !profile.must_change_password) {
      const url = request.nextUrl.clone();
      const onboardingPending =
        profile.role === "leader"
          ? await isLeaderOnboardingPending(profile.office_id)
          : false;

      if (onboardingPending) {
        url.pathname = "/escritorio/onboarding/processos";
        return NextResponse.redirect(url);
      }

      switch (profile.role) {
        case "admin_master":
          url.pathname = "/admin";
          break;
        case "leader":
          url.pathname = "/escritorio/processos";
          break;
        default:
          url.pathname = "/escritorio/trabalho";
      }
      return NextResponse.redirect(url);
    }
  }

  if (user && !isAuthRoute) {
    const profile = await getProfile(user.id);

    if (profile?.must_change_password && !pathname.startsWith("/primeiro-acesso")) {
      const url = request.nextUrl.clone();
      url.pathname = "/primeiro-acesso";
      return NextResponse.redirect(url);
    }

    if (profile) {
      const onboardingPending =
        profile.role === "leader"
          ? await isLeaderOnboardingPending(profile.office_id)
          : false;
      const isAdminRoute = pathname.startsWith("/admin");
      const isOfficeRoute = pathname.startsWith("/escritorio");
      const isOnboardingRoute = pathname.startsWith("/escritorio/onboarding/processos");

      if (profile.role !== "admin_master" && isAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/escritorio/processos";
        return NextResponse.redirect(url);
      }

      if (profile.role === "admin_master" && isOfficeRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }

      if (onboardingPending && !isOnboardingRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/escritorio/onboarding/processos";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
