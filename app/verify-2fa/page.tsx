import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

export default function Verify2faPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Verify 2FA</h1>
        <p className="text-sm text-stone-600">
          TOTP enrollment / challenge UI — Uzair lane.
        </p>
        <input
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm tracking-widest"
          placeholder="000000"
          disabled
        />
        <Button type="button" disabled className="w-full">
          Verify (coming soon)
        </Button>
      </div>
    </PageShell>
  );
}
