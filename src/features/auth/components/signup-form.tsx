"use client";

import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
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
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  function onSubmit(values: SignupValues) {
    startTransition(async () => {
      const result = await signupAction(values, next);
      if (!result) return;
      if ("confirmEmail" in result) {
        setSentTo(result.confirmEmail);
        return;
      }
      form.setError("email", { message: result.error });
      toast.error(result.error);
    });
  }

  if (sentTo) {
    return (
      <div className="border border-line bg-concrete p-6 text-center">
        <MailCheck className="mx-auto size-8 text-ok" strokeWidth={1.4} />
        <p className="up-xs mt-4 text-grey-2">One more step</p>
        <h2 className="mt-2 text-lg font-bold tracking-tight">Check your inbox</h2>
        <p className="mx-auto mt-2 max-w-[36ch] text-sm leading-relaxed text-grey-2">
          We sent a link to <span className="font-semibold text-ink">{sentTo}</span>. Open
          it to confirm the address and you are signed in.
        </p>
        <p className="mt-4 text-xs text-grey">
          Nothing after a few minutes? Check spam, or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="underline underline-offset-4 hover:text-ink"
          >
            try a different address
          </button>
          .
        </p>
      </div>
    );
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
