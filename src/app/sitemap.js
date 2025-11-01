import { siteConfig } from "@/config/site";
import { locales } from "@/i18n/config";

export default function sitemap() {
  const now = new Date();
  const entries = locales.map((loc) => ({
    url: `${siteConfig.url}/${loc}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  return entries;
}

