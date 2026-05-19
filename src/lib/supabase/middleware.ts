import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  getFirstAllowedOfficePath,
  resolveAreaAccess,
  type AreaAccessMap,
  type SystemAreaKey,
} from "@/lib/system-areas";

type ProfileGate = {
  role: string;
  office_id: string | null;
  must_change_password?: boolean;
};

type OfficeAreaAccessRow = {
  area_overrides: Record<string, boolean> | null;
  plans: { features: Record<string, boolean> | null } | null;
};

function getAreaForOfficeRoute(pathname: string, searchParams: URLSearchParams): SystemAreaKey | null {
  if (pathname === "/escritorio/dashboard" || pathname.startsWith("/escritorio/dashboard/")) {
    return "dashboard";
  }
  if (pathname === "/escritorio/trabalho" || pathname.startsWith("/escritorio/trabalho/")) {
    return "dashboard";
  }
  if (pathname === "/escritorio/processos" || pathname.startsWith("/escritorio/processos/")) {
    return "processos";
  }
  if (
    pathname === "/escritorio/estrategia/cadeia-valor" &&
    searchParams.get("aba") === "gestao"
  ) {
    return "processos";
  }
  if (pathname === "/escritorio/estrategia" || pathname.startsWith("/escritorio/estrategia/")) {
    return "estrategia";
  }
  if (pathname === "/escritorio/demandas" || pathname.startsWith("/escritorio/demandas/")) {
    return "demandas";
  }
  if (pathname === "/escritorio/conhecimento" || pathname.startsWith("/escritorio/conhecimento/")) {
    return "conhecimento";
  }
  if (pathname === "/escritorio/capacitacao" || pathname.startsWith("/escritorio/capacitacao/")) {
    return "capacitacao";
  }
  return null;
}

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

  async function isOfficeActive(officeId: string): Promise<boolean | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from("offices").select("is_active").eq("id", officeId).single();
      return data?.is_active ?? null;
    }
    const { data } = await supabase.from("offices").select("is_active").eq("id", officeId).single();
    return data?.is_active ?? null;
  }

  async function getOfficeAreaAccess(officeId: string): Promise<AreaAccessMap> {
    const query = `
      area_overrides,
      plans (
        features
      )
    `;

    const { data } = supabaseAdmin
      ? await supabaseAdmin
          .from("offices")
          .select(query)
          .eq("id", officeId)
          .maybeSingle<OfficeAreaAccessRow>()
      : await supabase
          .from("offices")
          .select(query)
          .eq("id", officeId)
          .maybeSingle<OfficeAreaAccessRow>();

    return resolveAreaAccess(data?.plans?.features, data?.area_overrides);
  }

  async function resolveAreaAccessRequest(profile: ProfileGate, pathname: string): Promise<NextResponse | null> {
    if (profile.role === "admin_master" || !profile.office_id) {
      return null;
    }

    const routeArea = getAreaForOfficeRoute(pathname, request.nextUrl.searchParams);
    if (!routeArea) {
      return null;
    }

    const allowedAreas = await getOfficeAreaAccess(profile.office_id);
    if (allowedAreas[routeArea]) {
      return null;
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "O escritório não tem acesso a esta área do sistema." },
        { status: 403 }
      );
    }

    const url = request.nextUrl.clone();
    const fallbackPath = getFirstAllowedOfficePath(allowedAreas);
    const [fallbackPathname, fallbackSearch = ""] = fallbackPath.split("?");
    url.pathname = fallbackPathname;
    url.search = fallbackSearch ? `?${fallbackSearch}` : "";
    return NextResponse.redirect(url);
  }

  /**
   * Escritório inativo: bloqueia rotas do escritório (mantém dados no banco).
   * admin_master ignora. Sem office_id em /conta-inativa redireciona para conta-pendente.
   */
  async function resolveOfficeAccessRequest(profile: ProfileGate, pathname: string): Promise<NextResponse | null> {
    if (profile.role === "admin_master") {
      if (pathname === "/conta-inativa") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      return null;
    }

    if (!profile.office_id) {
      if (pathname === "/conta-inativa") {
        const url = request.nextUrl.clone();
        url.pathname = "/conta-pendente";
        return NextResponse.redirect(url);
      }
      return null;
    }

    const active = await isOfficeActive(profile.office_id);
    if (active === true) {
      if (pathname === "/conta-inativa") {
        const url = request.nextUrl.clone();
        const fallbackPath = await getOfficeAreaAccess(profile.office_id).then(getFirstAllowedOfficePath);
        const [fallbackPathname, fallbackSearch = ""] = fallbackPath.split("?");
        url.pathname = fallbackPathname;
        url.search = fallbackSearch ? `?${fallbackSearch}` : "";
        return NextResponse.redirect(url);
      }
      return null;
    }

    if (pathname === "/conta-inativa" || pathname.startsWith("/primeiro-acesso")) {
      return null;
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "O escritório está inativo. Entre em contato com o suporte." },
        { status: 403 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/conta-inativa";
    return NextResponse.redirect(url);
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

    const officeGate = await resolveOfficeAccessRequest(profile, pathname);
    if (officeGate) return officeGate;

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
          url.search = "";
          break;
        case "leader":
        default:
          if (profile.office_id) {
            const fallbackPath = await getOfficeAreaAccess(profile.office_id).then(getFirstAllowedOfficePath);
            const [fallbackPathname, fallbackSearch = ""] = fallbackPath.split("?");
            url.pathname = fallbackPathname;
            url.search = fallbackSearch ? `?${fallbackSearch}` : "";
          } else {
            url.pathname = profile.role === "leader" ? "/escritorio/dashboard" : "/escritorio/trabalho";
            url.search = "";
          }
          break;
      }
      return NextResponse.redirect(url);
    }
  }

  if (user && !isAuthRoute) {
    const profile = await getProfile(user.id);

    if (profile) {
      const officeGate = await resolveOfficeAccessRequest(profile, pathname);
      if (officeGate) return officeGate;
    }

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
        if (profile.office_id) {
          const fallbackPath = await getOfficeAreaAccess(profile.office_id).then(getFirstAllowedOfficePath);
          const [fallbackPathname, fallbackSearch = ""] = fallbackPath.split("?");
          url.pathname = fallbackPathname;
          url.search = fallbackSearch ? `?${fallbackSearch}` : "";
        } else {
          url.pathname = "/escritorio/dashboard";
          url.search = "";
        }
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

      const areaGate = await resolveAreaAccessRequest(profile, pathname);
      if (areaGate) return areaGate;
    }
  }

  return supabaseResponse;
}
