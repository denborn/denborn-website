"use client";

import { useEffect } from "react";

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

export default function HtmlLangSetter({ locale }) {
  useEffect(() => {
    if (!locale) return;
    const lang = locale.toLowerCase();
    const dir = RTL_LOCALES.has(lang) ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
      document.documentElement.setAttribute("dir", dir);
      document.body?.setAttribute("lang", lang);
      document.body?.setAttribute("dir", dir);
    }
  }, [locale]);
  return null;
}

