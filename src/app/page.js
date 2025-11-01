import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { locales, defaultLocale } from "@/i18n/config";

function detectLocale(acceptLanguage) {
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

export default function RootPage() {
  const h = headers();
  const locale = detectLocale(h.get("accept-language"));
  redirect(`/${locale}`);
}
