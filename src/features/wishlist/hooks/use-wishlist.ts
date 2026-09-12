"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { queryKeys } from "@/lib/react-query";
import {
  fetchWishlistIds,
  toggleWishlistItem,
} from "@/features/wishlist/services/api/wishlist.client";

export function useWishlistIds(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.wishlist.ids(),
    queryFn: fetchWishlistIds,
    enabled,
    staleTime: 30_000,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ productId, wanted }: { productId: string; wanted: boolean }) =>
      toggleWishlistItem(productId, wanted),

    onMutate: async ({ productId, wanted }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wishlist.ids() });
      const previous = queryClient.getQueryData<string[]>(queryKeys.wishlist.ids());

      queryClient.setQueryData<string[]>(queryKeys.wishlist.ids(), (current = []) =>
        wanted
          ? [...new Set([...current, productId])]
          : current.filter((id) => id !== productId),
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKeys.wishlist.ids(), context?.previous);

      if (error instanceof Error && error.message === "not-authenticated") {
        toast("Sign in to save pieces", {
          description: "Your wishlist follows your account.",
          action: { label: "Sign in", onClick: () => router.push("/login?next=/wishlist") },
        });
        return;
      }

      toast.error("Could not update your wishlist. Try again.");
    },

    onSuccess: (_result, { wanted }) => {
      toast.success(wanted ? "Saved to wishlist" : "Removed from wishlist");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
    },
  });
}
