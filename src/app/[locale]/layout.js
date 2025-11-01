import { TranslationsProvider } from "@/i18n/TranslationsProvider";
import { getDictionary } from "@/i18n/get-dictionary";
import { locales } from "@/i18n/config";
import { siteConfig } from "@/config/site";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params: { locale } }) {
  return {
    openGraph: {
      locale,
    },
    alternates: {
      canonical: `${siteConfig.url}/${locale}`,
    },
  };
}

export default async function LocaleLayout({ children, params: { locale } }) {
  const dictionary = await getDictionary(locale);
  return (
    <TranslationsProvider locale={locale} dictionary={dictionary}>
      {children}
    </TranslationsProvider>
  );
}

