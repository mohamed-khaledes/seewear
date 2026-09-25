"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProductShot } from "@/components/common/product-shot";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  setProductsStatusAction,
  setProductStatusAction,
} from "@/features/dashboard/services/api/product-actions";
import type { AdminProductRow } from "@/features/dashboard/types";

export function ProductTable({ products }: { products: AdminProductRow[] }) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Only ids still on this page count: paging or filtering must not carry a
  // hidden selection into the next bulk action.
  const visible = selected.size
    ? products.filter((product) => selected.has(product.id)).map((product) => product.id)
    : [];
  const allChecked = products.length > 0 && visible.length === products.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulk(status: "active" | "draft") {
    guard(() =>
      startTransition(async () => {
        const result = await setProductsStatusAction(visible, status);
        if (result.ok) {
          toast.success(
            `${result.data ?? visible.length} ${status === "active" ? "published" : "moved to draft"}`,
          );
          setSelected(new Set());
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <>
      {visible.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-concrete px-4 py-2.5">
          <span className="text-xs font-semibold tabular-nums">{visible.length} selected</span>
          <Button size="sm" disabled={pending} onClick={() => bulk("active")} className="text-xs">
            Publish
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => bulk("draft")}
            className="text-xs"
          >
            Move to draft
          </Button>
          {pending ? <Loader2 className="size-3.5 animate-spin text-grey" /> : null}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ms-auto text-xs text-grey-2 hover:text-ink"
          >
            Clear
          </button>
        </div>
      ) : null}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select every product on this page"
              checked={allChecked}
              onCheckedChange={(checked) =>
                setSelected(checked === true ? new Set(products.map((p) => p.id)) : new Set())
              }
            />
          </TableHead>
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
          <ProductRow
            key={product.id}
            product={product}
            selected={selected.has(product.id)}
            onToggle={() => toggle(product.id)}
          />
        ))}
      </TableBody>
    </Table>
    </>
  );
}

function ProductRow({
  product,
  selected,
  onToggle,
}: {
  product: AdminProductRow;
  selected: boolean;
  onToggle: () => void;
}) {
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
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          aria-label={`Select ${product.name}`}
          checked={selected}
          onCheckedChange={onToggle}
        />
      </TableCell>
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
          <span className="ms-1.5 text-[11px] text-grey line-through">
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
