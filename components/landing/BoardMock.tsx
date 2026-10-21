export function BoardMock() {
  return (
    <div className="relative rounded-[2rem] bg-white p-4 shadow-[0_30px_80px_-30px_rgba(60,40,20,0.35)] sm:p-6">
      <div className="mb-3 flex items-center justify-between text-xs text-stone-500">
        <span className="font-semibold text-stone-700">Binomial Squares · (x + 3)²</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 font-semibold text-[var(--accent)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-teal-600" /> Live
        </span>
      </div>
      <svg viewBox="0 0 400 300" className="w-full rounded-2xl bg-[#fbf8f2]" role="img" aria-label="Area model of (x+3) squared">
        <rect x="40" y="30" width="190" height="190" rx="6" fill="#fde68a" stroke="#d97706" strokeWidth="4" />
        <rect x="230" y="30" width="100" height="190" rx="6" fill="#ccfbf1" stroke="#0f766e" strokeWidth="2" />
        <rect x="40" y="220" width="190" height="60" rx="6" fill="#ccfbf1" stroke="#0f766e" strokeWidth="2" />
        <rect x="230" y="220" width="100" height="60" rx="6" fill="#f5f5f4" stroke="#78716c" strokeWidth="2" />
        <g fontSize="22" fill="#1c1917" textAnchor="middle" fontWeight="600">
          <text x="135" y="132">x²</text>
          <text x="280" y="132">3x</text>
          <text x="135" y="259">3x</text>
          <text x="280" y="259">9</text>
        </g>
        <text x="350" y="130" fontSize="14" fill="#57534e">x</text>
      </svg>
      <p className="mt-3 rounded-xl bg-stone-900 px-4 py-2 text-sm text-white">
        “First, the big square: x times x gives x².”
      </p>
    </div>
  );
}
