import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { listPacks } from "@/lib/packs/loadPack";

export default function AppHomePage() {
  const packs = listPacks();

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">My lessons</h1>
          <p className="text-sm text-stone-600">
            Protected shell stub — RLS + session list in Uzair lane.
          </p>
        </div>
        <ul className="space-y-3">
          {packs.map((pack) => (
            <li
              key={pack.id}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium">{pack.title}</p>
                <p className="text-xs text-stone-500">
                  {pack.id} · v{pack.version}
                </p>
              </div>
              <Link
                href="/lesson/demo"
                className="text-sm font-medium text-teal-800 underline"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-dashed border-stone-300 bg-white/60 p-4 text-sm text-stone-600">
          Topic brief paste (≤2,000 chars) — wire after auth.
        </div>
      </div>
    </PageShell>
  );
}
