"use client";

import { useState, useTransition } from "react";
import { requestMagicLink } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await requestMagicLink(formData);
      if (result.ok) {
        setMessage(result.message);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-700">E-Mail-Adresse</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Wird gesendet…" : "Magic Link senden"}
      </button>
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
