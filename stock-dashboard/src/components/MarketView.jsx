import { useMemo } from 'react'
import { useMultiQuotes } from '../hooks/useMarketData'
import { formatCurrency } from '../utils/calculations'

// ── Static config ─────────────────────────────────────────────────────────────

const EUROPA_INDICES = [
  { ticker: '^SSMI',     label: 'SMI',  name: 'Swiss Market Index' },
  { ticker: '^STOXX50E', label: 'SX5E', name: 'Euro Stoxx 50' },
  { ticker: '^GDAXI',    label: 'DAX',  name: 'DAX Performance Index' },
]

const USA_INDICES = [
  { ticker: '^GSPC', label: 'SPX',  name: 'S&P 500 Index' },
  { ticker: '^NDX',  label: 'NDX',  name: 'Nasdaq 100 Index' },
  { ticker: '^DJI',  label: 'DJIA', name: 'Dow Jones Industrial' },
]

const US_SECTORS = [
  { ticker: 'XLK',  name: 'Technologie' },
  { ticker: 'XLC',  name: 'Kommunikation' },
  { ticker: 'XLY',  name: 'Konsum diskr.' },
  { ticker: 'XLP',  name: 'Konsum Basis' },
  { ticker: 'XLV',  name: 'Gesundheit' },
  { ticker: 'XLF',  name: 'Finanzen' },
  { ticker: 'XLE',  name: 'Energie' },
  { ticker: 'XLI',  name: 'Industrie' },
  { ticker: 'XLB',  name: 'Materialien' },
  { ticker: 'XLRE', name: 'Immobilien' },
  { ticker: 'XLU',  name: 'Versorger' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function IndexCard({ data, label, name }) {
  const q = data?.quote
  const dp = q?.dp ?? null
  const isUp = (dp ?? 0) >= 0

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-white font-bold text-base">{label}</div>
          <div className="text-slate-500 text-xs truncate max-w-[140px]">{name}</div>
        </div>
        {dp != null && (
          <div className={`text-xs px-2 py-1 rounded font-medium ${
            isUp ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
          }`}>
            {isUp ? '▲' : '▼'} {Math.abs(dp).toFixed(2)}%
          </div>
        )}
      </div>
      {q ? (
        <div className="text-white text-lg font-mono font-bold">
          {q.c.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ) : (
        <div className="text-slate-600 text-lg">—</div>
      )}
      {q?.d != null && (
        <div className={`text-xs font-mono mt-0.5 ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
          {isUp ? '+' : ''}{formatCurrency(q.d, 2)}
        </div>
      )}
    </div>
  )
}

function SectorRow({ name, data }) {
  const dp = data?.quote?.dp ?? null
  const isUp = (dp ?? 0) >= 0

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-slate-300 text-sm">{name}</span>
      <span className={`text-sm font-mono font-medium min-w-[60px] text-right ${
        dp == null ? 'text-slate-600' : isUp ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {dp == null ? '—' : `${isUp ? '+' : ''}${dp.toFixed(2)}%`}
      </span>
    </div>
  )
}

function MoverRow({ label, name, dp, isPortfolio }) {
  const isUp = (dp ?? 0) >= 0
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <div className="min-w-0">
        <span className="text-white font-mono text-sm font-bold">{label}</span>
        {name && (
          <span className="text-slate-500 text-xs ml-2 truncate hidden sm:inline">{name}</span>
        )}
      </div>
      <span className={`text-sm font-mono font-medium ml-2 shrink-0 ${
        isUp ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {isUp ? '+' : ''}{dp.toFixed(2)}%
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MarketView({ positions, quotes: portfolioQuotes }) {

  // Collect ALL market tickers for a single batch quote call
  const marketItems = useMemo(() => [
    ...EUROPA_INDICES.map((i) => ({ ticker: i.ticker, assetType: 'stock' })),
    ...USA_INDICES.map((i)    => ({ ticker: i.ticker, assetType: 'stock' })),
    ...US_SECTORS.map((s)     => ({ ticker: s.ticker, assetType: 'etf'   })),
  ], [])

  const { quotes: marketQuotes, loading } = useMultiQuotes(marketItems)

  // Portfolio movers from existing portfolioQuotes (already fetched)
  const portfolioMovers = useMemo(() => {
    return positions
      .map((p) => {
        const q = portfolioQuotes[p.ticker]?.quote
        const label = p.assetType === 'crypto'
          ? (p.ticker.split(':')[1]?.replace('USDT', '') ?? p.ticker)
          : p.ticker
        return { label, name: p.name, dp: q?.dp ?? null }
      })
      .filter((m) => m.dp != null)
      .sort((a, b) => b.dp - a.dp)
  }, [positions, portfolioQuotes])

  const gainers = portfolioMovers.filter((m) => m.dp > 0).slice(0, 6)
  const losers  = portfolioMovers.filter((m) => m.dp < 0).slice(-6).reverse()

  return (
    <div className="space-y-6">

      {/* ── Title ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">Globale Märkte</h2>
        <div className="text-slate-600 text-xs">
          {loading ? 'Kurse werden geladen…' : 'Kurse von Yahoo Finance · Verzögert ~15 Min'}
        </div>
      </div>

      {/* ── Indices ── */}
      <div className="space-y-4">
        <div>
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Europa
          </div>
          <div className="grid grid-cols-3 gap-3">
            {EUROPA_INDICES.map((idx) => (
              <IndexCard key={idx.ticker} data={marketQuotes[idx.ticker]} label={idx.label} name={idx.name} />
            ))}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            USA
          </div>
          <div className="grid grid-cols-3 gap-3">
            {USA_INDICES.map((idx) => (
              <IndexCard key={idx.ticker} data={marketQuotes[idx.ticker]} label={idx.label} name={idx.name} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Sector + Movers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* US Sectors */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-semibold text-sm">US Sektoren</div>
            <div className="text-slate-600 text-xs">Tägl. %</div>
          </div>
          <div>
            {US_SECTORS.map((s) => (
              <SectorRow key={s.ticker} name={s.name} data={marketQuotes[s.ticker]} />
            ))}
          </div>
        </div>

        {/* Portfolio Movers */}
        <div className="lg:col-span-3 space-y-4">
          {gainers.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-emerald-500 font-medium">↑</span>
                <span className="text-white font-semibold text-sm">Gewinner heute</span>
                <span className="text-slate-600 text-xs">(Portfolio)</span>
              </div>
              {gainers.map((m) => (
                <MoverRow key={m.label} label={m.label} name={m.name} dp={m.dp} />
              ))}
            </div>
          )}

          {losers.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-500 font-medium">↓</span>
                <span className="text-white font-semibold text-sm">Verlierer heute</span>
                <span className="text-slate-600 text-xs">(Portfolio)</span>
              </div>
              {losers.map((m) => (
                <MoverRow key={m.label} label={m.label} name={m.name} dp={m.dp} />
              ))}
            </div>
          )}

          {gainers.length === 0 && losers.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <div className="text-slate-600 text-sm">
                {positions.length === 0
                  ? 'Portfolio-Positionen hinzufügen um Bewegungen zu sehen'
                  : 'Keine Tageskursdaten für Portfolio-Bewegungen verfügbar'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
