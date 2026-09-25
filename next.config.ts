import type { NextConfig } from "next";

/**
 * The Content-Security-Policy, as a list so each source can say why it is there.
 *
 * It ships as Report-Only: the browser logs every violation to the console but
 * blocks nothing. A CSP that is wrong by one host breaks checkout or the 3D
 * viewer silently, so watch the console on a real deployment first — shop,
 * sign in with Google, pay on Paymob, open a 3D view.
 *
 * Once nothing is reported, set `CSP_ENFORCE=1` in the environment and redeploy
 * to switch the header from reporting to blocking. It is an environment
 * variable rather than an edit here so that enforcement can be turned back off
 * from the Vercel dashboard in the minute after it breaks something, without a
 * commit and a rebuild.
 */
const csp = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts; Vercel Analytics loads from its CDN.
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  // Product photos from Supabase Storage; Google avatars after OAuth sign-in.
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  // Supabase API and realtime, Vercel's vitals beacon, and the Draco decoder
  // <model-viewer> fetches for compressed 3D meshes.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.gstatic.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // Two years, every subdomain: a payment site should never be reachable over
  // plain HTTP. Only honoured over HTTPS, so it is harmless on localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nobody frames the checkout. The CSP says the same for newer browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  {
    key:
      process.env.CSP_ENFORCE === "1"
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
    value: csp,
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — the `product-images` bucket is public read.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "*.supabase.in", pathname: "/storage/v1/object/public/**" },
    ],
    // The placeholder garment shots in /public/garments are SVG. They are our
    // own static files, and served sandboxed with scripting disabled.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
