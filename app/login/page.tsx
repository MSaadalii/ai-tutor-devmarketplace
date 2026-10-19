import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-stone-600">
          Email and password first, then your authenticator code.
        </p>
        <LoginForm />
        <p className="text-sm text-stone-500">
          New here?{" "}
          <Link href="/signup" className="text-teal-800 underline">
            Sign up
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
