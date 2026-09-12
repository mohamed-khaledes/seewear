"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sendContactMessage } from "@/features/content/services/api/contact-actions";
import {
  CONTACT_TOPICS,
  contactSchema,
  type ContactValues,
} from "@/features/content/types";

export function ContactForm({ defaultEmail = "", defaultName = "" }) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      orderNumber: "",
      topic: "An order I have placed",
      message: "",
    },
  });

  async function onSubmit(values: ContactValues) {
    setSubmitting(true);
    try {
      const result = await sendContactMessage(values);
      if (result.ok) {
        setSent(true);
        form.reset();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("That did not send. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-line bg-concrete p-8 text-center">
        <CheckCircle2 className="mx-auto size-9 text-ok" strokeWidth={1.4} />
        <p className="up-xs mt-4 text-grey-2">Message sent</p>
        <h3 className="mt-2 text-lg font-bold tracking-tight">We have it</h3>
        <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-grey-2">
          A person reads every one of these. Expect an answer within one working
          day, to the address you gave us.
        </p>
        <Button
          type="button"
          variant="outline"
          className="up-sm mt-6 font-semibold"
          onClick={() => setSent(false)}
        >
          Send another
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">Name</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="name" className="h-11" />
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
                    {...field}
                    type="email"
                    autoComplete="email"
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">What is it about</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONTACT_TOPICS.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
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
            name="orderNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">
                  Order number{" "}
                  <span className="normal-case tracking-normal text-grey">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="SW-1024" className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Message</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={6}
                  placeholder="Tell us what happened, and what would put it right."
                  className="resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="up-sm h-12 justify-center font-semibold"
        >
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitting ? "Sending" : "Send message"}
        </Button>
      </form>
    </Form>
  );
}
