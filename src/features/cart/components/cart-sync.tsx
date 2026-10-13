"use client";

import { useEffect, useRef } from "react";

import { LEGACY_OWNER, useCartStore } from "@/features/cart/store/cart-store";
import {
  fetchServerCart,
  mergeGuestCart,
  replaceServerCart,
} from "@/features/cart/services/api/cart.client";

/**
 * Keeps the bag in this browser and the bag on the account in step.
 *
 * The rule that makes this safe: **a merge happens only at the moment a guest
 * cart becomes an account cart**, never on an ordinary page load. The bag
 * records whose it is, so a returning customer's cart is recognised as the one
 * already in the database and is left alone — merging it would add it to
 * itself and double every quantity on every visit.
 *
 * What happens on the one exchange per sign-in, by whose bag is in the browser:
 *
 *  - **A guest's** — merged into the account cart (union by variant, quantities
 *    summed, capped at stock) and the merged result becomes the bag. This is
 *    the only merge in the system.
 *  - **Another account's** — dropped. One customer's bag is never folded into
 *    another's, whatever is left behind in the browser.
 *  - **This account's, holding something** — pushed up. This browser is the one
 *    the customer is looking at, so what they can see wins.
 *  - **This account's, empty** — left alone, both ways. Pulling would put back
 *    the very things they just removed; pushing would wipe a bag they may have
 *    filled on another device. An empty bag they emptied stays empty.
 *  - **A browser with no bag of its own** — the account cart arrives from the
 *    database, so the bag follows the customer onto a new device.
 *
 * After that exchange, local changes are mirrored up, debounced.
 *
 * Renders nothing.
 */
export function CartSync({ userId }: { userId: string | null }) {
  const hydrated = useCartStore((state) => state.hydrated);
  const items = useCartStore((state) => state.items);

  /** The account whose exchange has been started, so it runs once per sign-in. */
  const startedFor = useRef<string | null>(null);
  /** Only true once that exchange has settled — the mirror must not race it. */
  const ready = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (!userId) {
      startedFor.current = null;
      ready.current = false;

      // A bag stamped with an account, with nobody signed in, belongs to the
      // customer who left — it is safe in their account, and leaving it on a
      // shared computer would hand it to the next person. A guest's own bag,
      // and one from before owners were recorded, are left exactly as they are.
      const { ownerId, items: left, resetToGuest } = useCartStore.getState();
      if (ownerId !== null && ownerId !== LEGACY_OWNER && left.length > 0) {
        resetToGuest();
      }
      return;
    }

    if (startedFor.current === userId) return;
    startedFor.current = userId;

    /**
     * Whether this exchange still speaks for the bag. Deliberately not a
     * per-run flag cancelled on cleanup: in development React mounts effects
     * twice, and a flag would throw away the first run's answer while the ref
     * above makes the second run stand down — leaving the bag unclaimed. The
     * store lives outside React, so finishing after unmount is harmless; the
     * only result worth dropping is one for an account that has since changed.
     */
    const stillOurs = () => startedFor.current === userId;

    (async () => {
      try {
        const { items: local, ownerId, adopt } = useCartStore.getState();

        if (ownerId === userId) {
          // Already this account's bag on this device. Never merge, never pull.
          if (local.length > 0) await replaceServerCart(local);
          return;
        }

        if (ownerId === LEGACY_OWNER && local.length > 0) {
          // Persisted before owners were recorded. The old code mirrored every
          // signed-in bag up, so this is almost certainly already the account's
          // cart: push it rather than summing it into itself.
          await replaceServerCart(local);
          if (stillOurs()) adopt(local, userId);
          return;
        }

        // A bag left behind by another account is not ours to merge.
        const guestCart = ownerId === null ? local : [];
        if (guestCart.length > 0) await mergeGuestCart(guestCart);

        const server = await fetchServerCart();
        if (stillOurs()) adopt(server, userId);
      } catch {
        // A failed exchange must never block shopping — the local bag stands
        // and checkout re-prices everything server-side anyway. The bag is
        // left unstamped so the next page load tries the exchange again.
        if (stillOurs()) startedFor.current = null;
      } finally {
        // Later changes still mirror up, even if this exchange came to nothing.
        ready.current = true;
      }
    })();
  }, [userId, hydrated]);

  // Mirror later changes up, so the bag follows the customer to their next
  // device. Debounced, because holding the quantity stepper is one intention.
  useEffect(() => {
    if (!userId || !hydrated || !ready.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      replaceServerCart(useCartStore.getState().items).catch(() => {
        // Same reasoning: the local cart is the one the customer sees.
      });
    }, 800);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [items, userId, hydrated]);

  return null;
}
