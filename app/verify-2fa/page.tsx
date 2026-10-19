import { PageShell } from "@/components/layout/PageShell";
import { TotpForm } from "@/components/auth/TotpForm";

export default function Verify2faPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Two-factor authentication</h1>
        <TotpForm />
      </div>
    </PageShell>
  );
}
