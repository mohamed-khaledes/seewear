"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { signupAction } from "@/features/auth/services/api/auth-actions";
import { signupSchema, type SignupValues } from "@/features/auth/types";

export function SignupForm({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  function onSubmit(values: SignupValues) {
    startTransition(async () => {
      const result = await signupAction(values, next);
      if (result?.error) {
        form.setError("email", { message: result.error });
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Mohamed Khaled"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Eight characters or more. You can change it later from your account.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="up-sm mt-2 h-12 w-full justify-center font-semibold"
        >
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}
