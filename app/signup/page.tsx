import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign up</h1>
        <p className="text-sm text-stone-600">
          Create your account, then enroll two-factor authentication.
        </p>
        <SignupForm />
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
