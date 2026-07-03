"use client";

export function setSharedCookie(name: string, value: string, maxAge = 604800) {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000").split(
    ":"
  )[0];
  const onRoot =
    window.location.hostname === root ||
    window.location.hostname.endsWith("." + root);
  const domain = onRoot ? `; domain=.${root}` : "";
  document.cookie = `${name}=${value}${domain}; path=/; max-age=${maxAge}`;
}
