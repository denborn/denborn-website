"use client";

import { createContext, useContext, useMemo } from "react";

const I18nContext = createContext({
  t: (key) => key,
  locale: "en",
});

function getByPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

export function TranslationsProvider({ locale, dictionary, children }) {
  const t = useMemo(() => {
    return (key, fallback) => {
      const val = getByPath(dictionary, key);
      return val ?? fallback ?? key;
    };
  }, [dictionary]);

  const value = useMemo(() => ({ t, locale }), [t, locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext).t;
}

export function useLocale() {
  return useContext(I18nContext).locale;
}

