"use client";

import { useEffect, useRef } from "react";

import { useCartStore } from "@/features/cart/store/cart-store";
import {
  fetchServerCart,
  mergeGuestCart,
  replaceServerCart,
} from "@/features/cart/services/api/cart.client";

/**
 * Keeps the guest cart and the account cart in step.
 *
 *  - On the first render after sign-in, the localStorage cart is merged into the
 *    DB cart (union by variant, quantities summed, capped at stock) and the
 *    merged result replaces what is on the client.
 *  - After that, local changes are mirrored back to the DB, debounced, so the
 *    bag follows the customer to their next device.
 *
 * Renders nothing.
 */
export function CartSync({ signedIn }: { signedIn: boolean }) {
  const hydrated = useCartStore((state) => state.hydrated);
  const items = useCartStore((state) => state.items);
  const replaceItems = useCartStore((state) => state.replaceItems);

  const mergedRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge once per signed-in session.
  useEffect(() => {
    if (!signedIn || !hydrated || mergedRef.current) return;
    mergedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const local = useCartStore.getState().items;
        if (local.length > 0) await mergeGuestCart(local);

        const server = await fetchServerCart();
        if (!cancelled) replaceItems(server);
      } catch {
        // A failed merge must never block shopping — the local cart stands and
        // checkout re-prices everything server-side anyway.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, hydrated, replaceItems]);

  // Mirror later changes back to the DB.
  useEffect(() => {
    if (!signedIn || !hydrated || !mergedRef.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      replaceServerCart(useCartStore.getState().items).catch(() => {
        // Same reasoning: the local cart is the one the customer sees.
      });
    }, 800);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [items, signedIn, hydrated]);

  // Signing out leaves the local cart alone, but the next sign-in should merge.
  useEffect(() => {
    if (!signedIn) mergedRef.current = false;
  }, [signedIn]);

  return null;
}
