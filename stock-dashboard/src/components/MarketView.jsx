import { useMemo } from 'react'
import { useMultiQuotes } from '../hooks/useMarketData'
import { formatCurrency } from '../utils/calculations'

const EUROPA_INDICES = [
  { ticker: '^SSMI',     label: 'SMI',  name: 'Swiss Market Index' },
  { ticker: '^STOXX50E', label: 'SX5E', name: 'Euro Stoxx 50' },
  { ticker: '^GDAXI',    label: 'DAX',  name: 'DAX Performance Index' },
]

const USA_INDICES = [
  { ticker: '^GSPC', label: 'SPX',  name: 'S&P 500 Index' },
  { ticker: '^NDX',  label: 'NDX',  name: 'Nasdaq 100' },
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

function IndexCard({ data, label, name }) {
  const q    = data?.quote
  const dp   = q?.dp ?? null
  const isUp = (dp ?? 0) >= 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-slate-900 font-bold text-base">{label}</div>
          <div className="text-slate-400 text-xs truncate max-w-[140px]">{name}</div>
        </div>
        {dp != null && (
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
            isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
          }`}>
            {isUp ? '▲' : '▼'} {Math.abs(dp).toFixed(2)}%
          </span>
        )}
      </div>
      {q ? (
        <>
          <div className="text-slate-900 text-xl font-bold font-mono">
            {q.c.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {q.d != null && (
            <div className={`text-xs font-mono font-semibold mt-0.5 ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {isUp ? '+' : ''}{formatCurrency(q.d, 2)}
            </div>
          )}
        </>
      ) : (
        <div className="text-slate-300 text-xl">—</div>
      )}
    </div>
  )
}

function SectorRow({ name, data }) {
  const dp   = data?.quote?.dp ?? null
  const isUp = (dp ?? 0) >= 0
  const barWidth = dp != null ? Math.min(100, Math.abs(dp) * 10) : 0

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-slate-600 text-sm font-medium flex-1">{name}</span>
      <div className="flex items-center gap-3 shrink-0">
        {dp != null && (
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isUp ? 'bg-emerald-400' : 'bg-red-400'}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        )}
        <span className={`text-sm font-mono font-semibold min-w-[60px] text-right ${
          dp == null ? 'text-slate-300' : isUp ? 'text-emerald-600' : 'text-red-500'
        }`}>
          {dp == null ? '—' : `${isUp ? '+' : ''}${dp.toFixed(2)}%`}
        </span>
      </div>
    </div>
  )
}

export default function MarketView({ positions, quotes: portfolioQuotes }) {

  const marketItems = useMemo(() => [
    ...EUROPA_INDICES.map((i) => ({ ticker: i.ticker, assetType: 'stock' })),
    ...USA_INDICES.map((i)    => ({ ticker: i.ticker, assetType: 'stock' })),
    ...US_SECTORS.map((s)     => ({ ticker: s.ticker, assetType: 'etf'   })),
  ], [])

  const { quotes: marketQuotes, loading } = useMultiQuotes(marketItems)

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

      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-slate-900 text-xl font-bold">Globale Märkte</h2>
        <div className="text-slate-400 text-xs font-medium">
          {loading ? 'Kurse werden geladen…' : 'Kurse von Yahoo Finance · ca. 15 Min verzögert'}
        </div>
      </div>

      {/* Indices */}
      <div className="space-y-4">
        <div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2.5 px-1">Europa</div>
          <div className="grid grid-cols-3 gap-3">
            {EUROPA_INDICES.map((idx) => (
              <IndexCard key={idx.ticker} data={marketQuotes[idx.ticker]} label={idx.label} name={idx.name} />
            ))}
          </div>
        </div>
        <div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2.5 px-1">USA</div>
          <div className="grid grid-cols-3 gap-3">
            {USA_INDICES.map((idx) => (
              <IndexCard key={idx.ticker} data={marketQuotes[idx.ticker]} label={idx.label} name={idx.name} />
            ))}
          </div>
        </div>
      </div>

      {/* Sector + Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* US Sectors */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-slate-900 font-bold text-sm">US Sektoren</div>
            <div className="text-slate-400 text-xs font-medium">Tgl. %</div>
          </div>
          {US_SECTORS.map((s) => (
            <SectorRow key={s.ticker} name={s.name} data={marketQuotes[s.ticker]} />
          ))}
        </div>

        {/* Portfolio Movers */}
        <div className="lg:col-span-3 space-y-4">
          {gainers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 text-xs font-bold">↑</span>
                </div>
                <span className="text-slate-900 font-bold text-sm">Gewinner heute</span>
                <span className="text-slate-400 text-xs font-medium">(Portfolio)</span>
              </div>
              {gainers.map((m) => (
                <div key={m.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <span className="text-slate-900 font-mono font-bold text-sm">{m.label}</span>
                    {m.name && <span className="text-slate-400 text-xs ml-2 truncate hidden sm:inline">{m.name}</span>}
                  </div>
                  <span className="text-emerald-600 text-sm font-mono font-semibold ml-3 shrink-0">
                    +{m.dp.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {losers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-500 text-xs font-bold">↓</span>
                </div>
                <span className="text-slate-900 font-bold text-sm">Verlierer heute</span>
                <span className="text-slate-400 text-xs font-medium">(Portfolio)</span>
              </div>
              {losers.map((m) => (
                <div key={m.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <span className="text-slate-900 font-mono font-bold text-sm">{m.label}</span>
                    {m.name && <span className="text-slate-400 text-xs ml-2 truncate hidden sm:inline">{m.name}</span>}
                  </div>
                  <span className="text-red-500 text-sm font-mono font-semibold ml-3 shrink-0">
                    {m.dp.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {gainers.length === 0 && losers.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
              <div className="text-3xl mb-3">📈</div>
              <div className="text-slate-400 text-sm font-medium">
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
