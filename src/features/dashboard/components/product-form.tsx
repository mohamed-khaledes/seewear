"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ProductShot } from "@/components/common/product-shot";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import {
  createProductAction,
  updateProductAction,
} from "@/features/dashboard/services/api/product-actions";
import { uploadProductImage } from "@/features/dashboard/services/api/upload.client";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/features/dashboard/types";

type ProductFormProps = {
  productId?: string;
  defaultValues: ProductFormValues;
  categories: { id: string; slug: string; name: string }[];
};

export function ProductForm({
  productId,
  defaultValues,
  categories,
}: ProductFormProps) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const variants = useFieldArray({ control: form.control, name: "variants" });
  const imageUrls = useWatch({ control: form.control, name: "imageUrls" });

  function onSubmit(values: ProductFormValues) {
    guard(() =>
      startTransition(async () => {
        const result = productId
          ? await updateProductAction(productId, values)
          : await createProductAction(values);

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success(productId ? "Product saved" : "Product created");
        router.push("/dashboard/products");
        router.refresh();
      }),
    );
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadProductImage(file));
      }
      form.setValue("imageUrls", [...form.getValues("imageUrls"), ...uploaded], {
        shouldDirty: true,
      });
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeImage(index: number) {
    form.setValue(
      "imageUrls",
      imageUrls.filter((_, position) => position !== index),
      { shouldDirty: true },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-5 lg:grid-cols-[1fr_320px]"
      >
        <div className="grid gap-5">
          <section className="rounded-xl border border-line bg-paper p-5">
            <h2 className="up-sm mb-4 text-grey-2">Details</h2>

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="up-xs text-grey-2">Name</FormLabel>
                    <FormControl>
                      <Input
                        className="h-11"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (!productId && !form.getFieldState("slug").isDirty) {
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
                      <Input className="h-11 font-mono text-xs" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Lives at /product/{field.value || "your-slug"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="up-xs text-grey-2">Description</FormLabel>
                    <FormControl>
                      <Textarea rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="rounded-xl border border-line bg-paper p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="up-sm text-grey-2">Images</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => guard(() => fileInput.current?.click())}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                Upload
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => onFiles(event.target.files)}
              />
            </div>

            {imageUrls.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-grey-2">
                No images yet. The first one becomes the shot on the product card.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {imageUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="group relative overflow-hidden rounded-lg border border-line bg-[#f6f6f4]"
                  >
                    <ProductShot
                      src={url}
                      alt={`Image ${index + 1}`}
                      sizes="160px"
                      className="aspect-square"
                      imageClassName="p-3"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={`Remove image ${index + 1}`}
                      className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                    {index === 0 ? (
                      <span className="up-xs absolute bottom-1.5 start-1.5 rounded bg-ink px-1.5 py-0.5 text-[9px] text-white">
                        Main
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-line bg-paper p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="up-sm text-grey-2">Variants</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  variants.append({
                    color: "",
                    colorHex: "#141414",
                    size: "",
                    sku: "",
                    stock: 0,
                  })
                }
              >
                <Plus />
                Add variant
              </Button>
            </div>

            {variants.fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-grey-2">
                Add at least one variant — colour, size and how many you hold.
              </p>
            ) : (
              <div className="grid gap-3">
                {variants.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid items-end gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_64px_80px_1fr_88px_auto]"
                  >
                    <FormField
                      control={form.control}
                      name={`variants.${index}.color`}
                      render={({ field: colorField }) => (
                        <FormItem>
                          <FormLabel className="up-xs text-grey-2">Colour</FormLabel>
                          <FormControl>
                            <Input className="h-10" {...colorField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.colorHex`}
                      render={({ field: hexField }) => (
                        <FormItem>
                          <FormLabel className="up-xs text-grey-2">Hex</FormLabel>
                          <FormControl>
                            <input
                              type="color"
                              className="h-10 w-full cursor-pointer rounded-md border border-line bg-white p-1"
                              {...hexField}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.size`}
                      render={({ field: sizeField }) => (
                        <FormItem>
                          <FormLabel className="up-xs text-grey-2">Size</FormLabel>
                          <FormControl>
                            <Input className="h-10" {...sizeField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.sku`}
                      render={({ field: skuField }) => (
                        <FormItem>
                          <FormLabel className="up-xs text-grey-2">SKU</FormLabel>
                          <FormControl>
                            <Input className="h-10 font-mono text-xs" {...skuField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.stock`}
                      render={({ field: stockField }) => (
                        <FormItem>
                          <FormLabel className="up-xs text-grey-2">Stock</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              className="h-10 tabular-nums"
                              {...stockField}
                              onChange={(event) =>
                                stockField.onChange(event.target.valueAsNumber || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove variant"
                      onClick={() => variants.remove(index)}
                      className="h-10"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="grid h-fit gap-5">
          <section className="rounded-xl border border-line bg-paper p-5">
            <h2 className="up-sm mb-4 text-grey-2">Publishing</h2>

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="up-xs text-grey-2">Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="up-xs text-grey-2">Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Uncategorised" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3">
                    <div>
                      <FormLabel className="up-xs text-grey-2">Featured</FormLabel>
                      <FormDescription className="text-xs">
                        Shows first on the home grid.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="rounded-xl border border-line bg-paper p-5">
            <h2 className="up-sm mb-4 text-grey-2">Pricing (EGP)</h2>

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="up-xs text-grey-2">Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-11 tabular-nums"
                        {...field}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="compareAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="up-xs text-grey-2">Compare at</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-11 tabular-nums"
                        {...field}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Above the price, it shows struck through as a sale. Zero hides it.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="up-sm h-12 w-full font-semibold"
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving
              </>
            ) : productId ? (
              "Save changes"
            ) : (
              "Create product"
            )}
          </Button>
        </aside>
      </form>
    </Form>
  );
}
