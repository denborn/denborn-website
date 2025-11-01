import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";

function getLocaleFromHeader(acceptLanguage) {
  if (!acceptLanguage) return defaultLocale;
  const parts = acceptLanguage
    .split(",")
    .map((p) => p.trim().split(";")[0].toLowerCase());
  for (const part of parts) {
    const base = part.split("-")[0];
    if (locales.includes(base)) return base;
  }
  return defaultLocale;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Skip internal and file paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    /\.[\w]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (!hasLocale) {
    const locale = getLocaleFromHeader(req.headers.get("accept-language"));
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set("NEXT_LOCALE", locale, { path: "/" });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};

