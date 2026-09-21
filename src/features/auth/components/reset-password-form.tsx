"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { updatePasswordAction } from "@/features/auth/services/api/auth-actions";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/types";

export function ResetPasswordForm() {
  const [pending, startTransition] = useTransition();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  function onSubmit(values: ResetPasswordValues) {
    startTransition(async () => {
      const result = await updatePasswordAction(values);
      if (result?.error) form.setError("password", { message: result.error });
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Type it again</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" className="h-11" {...field} />
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
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </Form>
  );
}
