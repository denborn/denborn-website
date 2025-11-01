import { locales } from "@/i18n/config";
import { siteConfig } from "@/config/site";
import HtmlLangSetter from "@/components/HtmlLangSetter";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    openGraph: {
      locale,
    },
    alternates: {
      canonical: `${siteConfig.url}/${locale}`,
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  return (
    <>
      {/* Ensure <html lang> reflects the active locale (client fallback) */}
      <HtmlLangSetter locale={locale} />
      {children}
    </>
  );
}
