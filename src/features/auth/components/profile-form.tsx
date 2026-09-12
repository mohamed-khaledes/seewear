"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/features/auth/services/api/profile-actions";
import { profileSchema, type ProfileValues } from "@/features/auth/types";

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: ProfileValues;
  email: string;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  function onSubmit(values: ProfileValues) {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.ok) {
        toast.success("Profile saved");
        form.reset(values);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-md gap-4">
        {/* Not a form field — the email is read-only and has no validation
            state, so it uses a plain Label. FormLabel would look for a
            FormField context that does not exist here. */}
        <div className="grid gap-2">
          <Label htmlFor="account-email" className="up-xs text-grey-2">
            Email
          </Label>
          <Input
            id="account-email"
            value={email}
            readOnly
            className="h-11 bg-concrete text-grey-2"
          />
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Phone</FormLabel>
              <FormControl>
                <Input
                  autoComplete="tel"
                  placeholder="+20 100 000 0000"
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
          disabled={pending || !form.formState.isDirty}
          className="up-sm mt-2 h-12 justify-self-start px-8 font-semibold"
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
