import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, locales } from "./utils/Constants";

export default function i18n(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale: string | undefined = locales.find((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);

  if (pathLocale) return NextResponse.next();

  const pathWithoutLocale = pathLocale ? pathname.replace(`/${pathLocale}`, "") : pathname;

  let language: string | undefined = undefined;

  const cookie = request.headers.get("cookie");
  if (cookie) {
    let cs = cookie.split(";");
    cs = cs.map((c) => (c.startsWith(" ") ? c.trim() : c));
    language = cs.find((c) => c.startsWith("NEXT_LOCALE")) || "";
  }

  if (!language) {
    const acceptLanguage = request.headers.get("accept-language");
    const languages = acceptLanguage
      ?.split(",")
      ?.map((lang) => lang.trim().split(";"))
      ?.filter(([langCode]) => langCode !== "")
      ?.map(([langCode, quality]) => ({
        code: langCode,
        quality: quality ? parseFloat(quality.split("=")[1]) : 1,
      }));

    languages?.sort((a, b) => b.quality - a.quality);
    language = languages?.[0]?.code;
  }

  language = locales.find((locale) => language === locale || language?.startsWith(`${locale}-`));

  if (!language) {
    request.nextUrl.pathname = `/${defaultLocale}${pathWithoutLocale}`;
    return NextResponse.rewrite(request.nextUrl);
  }

  request.nextUrl.pathname = `/${language}${pathWithoutLocale}`;
  return NextResponse.rewrite(request.nextUrl);
}
