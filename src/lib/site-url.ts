/**
 * Automatic production site URL resolver.
 * Priority:
 *  1) NEXT_PUBLIC_SITE_URL (explicit custom domain)
 *  2) VERCEL_PROJECT_PRODUCTION_URL (auto-injected by Vercel on production deploys)
 *  3) Fallback default ("https://vending-machine.vercel.app")
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const withProto = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return withProto.replace(/\/+$/, "");
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    const withProto = /^https?:\/\//i.test(vercelProd) ? vercelProd : `https://${vercelProd}`;
    return withProto.replace(/\/+$/, "");
  }

  return "https://vending-machine.vercel.app";
}
