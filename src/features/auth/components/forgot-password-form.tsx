"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/features/auth/services/api/auth-actions";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/types";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordValues) {
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (result?.error) {
        form.setError("email", { message: result.error });
        return;
      }
      setSentTo(values.email);
    });
  }

  if (sentTo) {
    return (
      <div className="border border-line bg-concrete p-6 text-center">
        <MailCheck className="mx-auto size-8 text-ok" strokeWidth={1.4} />
        <h2 className="mt-4 text-lg font-bold tracking-tight">Check your inbox</h2>
        {/* Worded the same whether or not the address has an account. */}
        <p className="mx-auto mt-2 max-w-[36ch] text-sm leading-relaxed text-grey-2">
          If <span className="font-semibold text-ink">{sentTo}</span> has an account, a
          link to choose a new password is on its way. It works once, for an hour.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="up-sm mt-2 h-12 w-full justify-center font-semibold"
        >
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </Form>
  );
}
