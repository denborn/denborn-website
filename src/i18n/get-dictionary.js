import "server-only";
import { defaultLocale } from "@/i18n/config";

const dictionaries = {
  en: () => import("@/locales/en/common.json").then((m) => m.default),
  fr: () => import("@/locales/fr/common.json").then((m) => m.default),
};

export async function getDictionary(locale) {
  const loader = dictionaries[locale] ?? dictionaries[defaultLocale];
  return loader();
}

