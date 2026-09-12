import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SessionProvider } from "@/features/auth/components/session-provider";
import { getSessionUser } from "@/features/auth/server";
import { CartDrawer, CartSync } from "@/features/cart";
import { ModelPeekPanel } from "@/features/products";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <SessionProvider user={user}>
      <SiteHeader user={user} />
      {/* Fill the screen below the header, not a whole extra screen. With
          min-h-screen the document was always taller than the viewport by the
          height of the header, so every page carried a scrollbar it had not
          earned. */}
      <main className="min-h-[calc(100dvh-var(--site-chrome-h))] flex-1">
        {children}
      </main>
      <SiteFooter />
      <CartDrawer />
      <CartSync signedIn={Boolean(user)} />
      {/* One WebGL canvas for the whole grid — a browser will not give eleven
          cards eleven contexts. */}
      <ModelPeekPanel />
    </SessionProvider>
  );
}
