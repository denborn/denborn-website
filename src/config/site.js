export const siteConfig = {
  name: "Website",
  description: "Modern website built with Next.js App Router.",
  // IMPORTANT: Set to your production URL (no trailing slash)
  url: "https://example.com",
  locales: ["en", "fr"],
  defaultLocale: "en",
  twitter: {
    site: "@yoursite",
    creator: "@you",
  },
};

export const languageAlternates = Object.fromEntries(
  siteConfig.locales.map((l) => [l, `${siteConfig.url}/${l}`])
);

