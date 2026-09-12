"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProductShot } from "@/components/common/product-shot";
import { StatusPill } from "@/components/common/status-pill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatMoney } from "@/lib/utils";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import {
  deleteProductAction,
  setProductStatusAction,
} from "@/features/dashboard/services/api/product-actions";
import type { AdminProductRow } from "@/features/dashboard/types";

export function ProductTable({ products }: { products: AdminProductRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead className="hidden md:table-cell">Colours</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="hidden sm:table-cell">Inventory</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </TableBody>
    </Table>
  );
}

function ProductRow({ product }: { product: AdminProductRow }) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();

  const stock = product.variants.reduce((total, variant) => total + variant.stock, 0);
  const swatches = [
    ...new Map(
      product.variants
        .filter((variant) => variant.color_hex)
        .map((variant) => [variant.color, variant.color_hex]),
    ).values(),
  ].slice(0, 5);

  const stockLabel = stock === 0 ? "Out of stock" : stock < 20 ? "Low" : "In stock";
  const stockTone =
    stock === 0 ? "text-sale" : stock < 20 ? "text-warn" : "text-ink";

  function toggleStatus() {
    guard(() =>
      startTransition(async () => {
        const next = product.status === "active" ? "draft" : "active";
        const result = await setProductStatusAction(product.id, next);
        if (result.ok) {
          toast.success(next === "active" ? "Product is live" : "Moved to draft");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  function remove() {
    guard(() =>
      startTransition(async () => {
        const result = await deleteProductAction(product.id);
        if (result.ok) {
          toast.success(`${product.name} deleted`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0 overflow-hidden rounded-md border border-line bg-[#f4f4f2]">
            <ProductShot
              src={product.images[0]?.url}
              alt={product.name}
              sizes="40px"
              className="aspect-[1/1.1]"
              imageClassName="p-1"
            />
          </div>
          <div className="min-w-0">
            <Link
              href={`/dashboard/products/${product.id}`}
              className="block truncate text-[12.5px] font-semibold hover:underline"
            >
              {product.name}
            </Link>
            <span className="text-[11px] text-grey">
              {product.category?.name ?? "Uncategorised"} · {product.slug}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <div className="flex gap-1">
          {swatches.map((hex, index) => (
            <span
              key={`${hex}-${index}`}
              className="size-3.5 rounded-full border border-black/15"
              style={{ background: hex ?? "#ddd" }}
            />
          ))}
          {swatches.length === 0 ? (
            <span className="text-[11px] text-grey">—</span>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="tabular-nums">
        {formatMoney(product.price_cents)}
        {product.on_sale && product.compare_at_cents ? (
          <span className="ml-1.5 text-[11px] text-grey line-through">
            {formatMoney(product.compare_at_cents)}
          </span>
        ) : null}
      </TableCell>

      <TableCell className={cn("hidden text-xs font-semibold sm:table-cell", stockTone)}>
        {stock} · {stockLabel}
      </TableCell>

      <TableCell>
        <StatusPill tone={product.status === "active" ? "ok" : "mut"}>
          {product.status === "active" ? "Active" : "Draft"}
        </StatusPill>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-3.5">
          {pending ? <Loader2 className="size-3.5 animate-spin text-grey" /> : null}
          <Link
            href={`/dashboard/products/${product.id}`}
            className="text-xs font-semibold text-grey-2 transition-colors hover:text-ink"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={toggleStatus}
            disabled={pending}
            className="text-xs font-semibold text-grey-2 transition-colors hover:text-ink"
          >
            {product.status === "active" ? "Unpublish" : "Publish"}
          </button>

          <AlertDialog>
            <AlertDialogTrigger
              className="text-xs font-semibold text-grey-2 transition-colors hover:text-sale"
              disabled={pending}
            >
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {product.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the product, its images and its variants. Past orders keep
                  their own snapshot, so order history is unaffected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
