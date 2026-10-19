import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign up</h1>
        <p className="text-sm text-stone-600">
          Auth + TOTP 2FA — Uzair lane. Form stub only.
        </p>
        <form className="space-y-3">
          <input
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            placeholder="Email"
            type="email"
            disabled
          />
          <input
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            disabled
          />
          <Button type="button" disabled className="w-full">
            Create account (coming soon)
          </Button>
        </form>
        <p className="text-sm text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="text-teal-800 underline">
            Sign in
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
