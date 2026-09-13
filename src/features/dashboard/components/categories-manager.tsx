"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { slugify } from "@/lib/utils";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import {
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
} from "@/features/dashboard/services/api/category-actions";
import {
  categoryFormSchema,
  type ActionResult,
  type CategoryFormValues,
  type CategoryRow,
} from "@/features/dashboard/types";

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-10 text-xs font-semibold">
              <Plus />
              New category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New category</DialogTitle>
              <DialogDescription>
                The slug becomes the storefront address, so changing it later breaks
                any link already shared to that category.
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              nextPosition={categories.length}
              onDone={() => setCreating(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Order</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden sm:table-cell">Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category, index) => (
              <CategoryTableRow
                key={category.id}
                category={category}
                first={index === 0}
                last={index === categories.length - 1}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CategoryTableRow({
  category,
  first,
  last,
}: {
  category: CategoryRow;
  first: boolean;
  last: boolean;
}) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function run(action: () => Promise<ActionResult>, success?: string) {
    guard(() =>
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          if (success) toast.success(success);
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
        <div className="flex items-center gap-0.5">
          <MoveButton
            label={"Move " + category.name + " up"}
            disabled={first || pending}
            onClick={() => run(() => moveCategoryAction(category.id, "up"))}
          >
            <ChevronUp className="size-3.5" />
          </MoveButton>
          <MoveButton
            label={"Move " + category.name + " down"}
            disabled={last || pending}
            onClick={() => run(() => moveCategoryAction(category.id, "down"))}
          >
            <ChevronDown className="size-3.5" />
          </MoveButton>
        </div>
      </TableCell>

      <TableCell className="font-semibold">{category.name}</TableCell>

      <TableCell className="hidden sm:table-cell font-mono text-[11px] text-grey-2">
        {category.slug}
      </TableCell>

      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular-nums">{category.product_count}</span>
          {category.product_count === 0 ? (
            <StatusPill tone="warn">Empty</StatusPill>
          ) : (
            <StatusPill tone={category.active_count > 0 ? "ok" : "mut"}>
              {category.active_count} live
            </StatusPill>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-3">
          {pending ? <Loader2 className="size-3.5 animate-spin text-grey" /> : null}

          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={"Edit " + category.name}
                className="text-grey-2 transition-colors hover:text-ink"
              >
                <Pencil className="size-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit {category.name}</DialogTitle>
                <DialogDescription>
                  Renaming is safe. Changing the slug breaks links already shared to
                  this category.
                </DialogDescription>
              </DialogHeader>
              <CategoryForm
                category={category}
                nextPosition={category.position}
                onDone={() => setEditing(false)}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={"Delete " + category.name}
                className="text-grey-2 transition-colors hover:text-sale"
              >
                <Trash2 className="size-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {category.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {category.product_count > 0
                    ? "Products still sit in this category. Move them somewhere else first — deleting will be refused until they are out."
                    : "Nothing sits in this category, so nothing on the storefront changes."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    run(
                      () => deleteCategoryAction(category.id),
                      category.name + " deleted",
                    )
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-6 place-items-center rounded border border-line text-grey-2 transition-colors hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function CategoryForm({
  category,
  nextPosition,
  onDone,
}: {
  category?: CategoryRow;
  nextPosition: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      position: category?.position ?? nextPosition,
    },
  });

  function onSubmit(values: CategoryFormValues) {
    guard(() =>
      startTransition(async () => {
        const result = await saveCategoryAction(values, category?.id);
        if (result.ok) {
          toast.success(category ? "Category updated" : "Category added");
          onDone();
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Name</FormLabel>
              <FormControl>
                <Input
                  className="h-11"
                  placeholder="Outerwear"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    // The slug follows the name only while it is untouched, and
                    // never on an existing category: a live slug is a live URL.
                    if (!category && !form.getFieldState("slug").isDirty) {
                      form.setValue("slug", slugify(event.target.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Slug</FormLabel>
              <FormControl>
                <Input
                  className="h-11 font-mono"
                  placeholder="outerwear"
                  {...field}
                  onChange={(event) => field.onChange(slugify(event.target.value))}
                />
              </FormControl>
              <FormDescription className="font-mono text-[11px] text-grey">
                /products?category={field.value || "…"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  className="h-11 tabular-nums"
                  {...field}
                  onChange={(event) => field.onChange(event.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormDescription className="text-[11px] text-grey">
                Lower sorts first, in the filter rail and the product form.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="up-sm mt-2 h-12 font-semibold"
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {category ? "Save changes" : "Add category"}
        </Button>
      </form>
    </Form>
  );
}
