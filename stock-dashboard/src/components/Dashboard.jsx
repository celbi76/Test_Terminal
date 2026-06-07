import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import usePortfolioStore from '../store/portfolioStore'
import { useMultiQuotes } from '../hooks/useMarketData'
import PortfolioTable from './PortfolioTable'
import PerformanceView from './PerformanceView'
import MarketView from './MarketView'
import StockDetail from './StockDetail'
import AddStockModal from './AddStockModal'
import { formatCurrency, formatPct, getSectorColor } from '../utils/calculations'

// ── Watchlist item ────────────────────────────────────────────────────────────

function WatchlistItem({ ticker, onSelect }) {
  const { quotes } = useMultiQuotes([{ ticker, assetType: 'stock' }])
  const q = quotes[ticker]?.quote
  return (
    <div
      onClick={() => onSelect(ticker)}
      className="flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors group"
    >
      <span className="text-slate-800 font-semibold text-sm group-hover:text-indigo-700 transition-colors">{ticker}</span>
      <div className="text-right">
        {q ? (
          <>
            <div className="text-slate-900 text-sm font-mono font-medium">{formatCurrency(q.c)}</div>
            <div className={`text-xs font-mono font-medium ${(q.dp ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatPct(q.dp ?? 0)}
            </div>
          </>
        ) : (
          <div className="text-slate-300 text-xs">—</div>
        )}
      </div>
    </div>
  )
}

// ── Market index item ─────────────────────────────────────────────────────────

function MarketIndexItem({ ticker, label, onSelect, onRemove }) {
  const { quotes } = useMultiQuotes([{ ticker, assetType: 'stock' }])
  const q = quotes[ticker]?.quote
  const dp = q?.dp ?? 0

  return (
    <div className="group flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div
        onClick={() => onSelect(ticker)}
        className="flex-1 flex items-center justify-between cursor-pointer hover:opacity-75 transition-opacity"
      >
        <div>
          <div className="text-slate-800 text-xs font-semibold">{label}</div>
          <div className="text-slate-400 text-xs">{ticker}</div>
        </div>
        <div className="text-right mr-3">
          {q ? (
            <>
              <div className="text-slate-900 text-xs font-mono font-semibold">{formatCurrency(q.c)}</div>
              <div className={`text-xs font-mono font-medium ${dp >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {dp >= 0 ? '+' : ''}{dp.toFixed(2)}%
              </div>
            </>
          ) : (
            <div className="text-slate-300 text-xs">—</div>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(ticker)}
        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all text-xs shrink-0"
      >
        ✕
      </button>
    </div>
  )
}

// ── Add index form ────────────────────────────────────────────────────────────

function AddIndexForm({ onAdd }) {
  const [val, setVal] = useState('')
  const [label, setLabel] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!val.trim()) return
    onAdd(val.trim().toUpperCase(), label.trim())
    setVal('')
    setLabel('')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Ticker (z.B. BTC-USD)"
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name (optional)"
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      <button
        type="submit"
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-colors font-semibold"
      >
        Hinzufügen
      </button>
    </form>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const positions         = usePortfolioStore((s) => s.positions)
  const watchlist         = usePortfolioStore((s) => s.watchlist)
  const marketIndices     = usePortfolioStore((s) => s.marketIndices)
  const removeFromWatchlist = usePortfolioStore((s) => s.removeFromWatchlist)
  const addMarketIndex    = usePortfolioStore((s) => s.addMarketIndex)
  const removeMarketIndex = usePortfolioStore((s) => s.removeMarketIndex)

  const [selectedTicker,    setSelectedTicker]    = useState(null)
  const [showWatchlistModal, setShowWatchlistModal] = useState(false)
  const [activeTab,          setActiveTab]          = useState('portfolio')
  const [showAddIndex,       setShowAddIndex]       = useState(false)

  const positionRefs = positions.map((p) => ({ ticker: p.ticker, assetType: p.assetType ?? 'stock' }))
  const { quotes } = useMultiQuotes(positionRefs)

  const sectorData = positions.reduce((acc, pos) => {
    const sector = pos.assetType === 'crypto' ? 'Krypto' : pos.sector ?? 'Aktien'
    const price  = quotes[pos.ticker]?.quote?.c ?? pos.purchasePrice
    const value  = price * pos.shares
    const existing = acc.find((a) => a.name === sector)
    if (existing) existing.value += value
    else acc.push({ name: sector, value })
    return acc
  }, [])

  const TABS = [
    { id: 'portfolio',   label: 'Portfolio' },
    { id: 'performance', label: 'Performance' },
    { id: 'markt',       label: 'Markt' },
    { id: 'allokation',  label: 'Allokation' },
  ]

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">S</div>
            <span className="text-white font-bold text-lg tracking-tight">StockAnalyzer</span>
          </div>
          <div className="flex gap-1 bg-white/10 rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 text-sm rounded-lg transition-all font-medium ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-1 space-y-4">

            {/* Watchlist */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-900 font-semibold text-sm">Watchlist</h3>
                <button onClick={() => setShowWatchlistModal(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                  + Hinzufügen
                </button>
              </div>
              {watchlist.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-4">Leer</div>
              ) : (
                <div className="space-y-1">
                  {watchlist.map((t) => (
                    <div key={t} className="relative group">
                      <WatchlistItem ticker={t} onSelect={setSelectedTicker} />
                      <button
                        onClick={() => removeFromWatchlist(t)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Market Overview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-900 font-semibold text-sm">Marktübersicht</h3>
                <button
                  onClick={() => setShowAddIndex((v) => !v)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  {showAddIndex ? '− Schliessen' : '+ Anpassen'}
                </button>
              </div>
              <div>
                {marketIndices.map(({ ticker, label }) => (
                  <MarketIndexItem
                    key={ticker}
                    ticker={ticker}
                    label={label}
                    onSelect={setSelectedTicker}
                    onRemove={removeMarketIndex}
                  />
                ))}
              </div>
              {showAddIndex && (
                <AddIndexForm onAdd={(t, l) => { addMarketIndex(t, l); setShowAddIndex(false) }} />
              )}
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="lg:col-span-3 space-y-6">

            {activeTab === 'portfolio' && (
              <PortfolioTable onSelectTicker={setSelectedTicker} />
            )}

            {activeTab === 'performance' && (
              <PerformanceView positions={positions} quotes={quotes} />
            )}

            {activeTab === 'markt' && (
              <MarketView positions={positions} quotes={quotes} />
            )}

            {activeTab === 'allokation' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-slate-900 font-bold text-lg mb-5">Portfolio-Allokation</h2>
                {sectorData.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">🍩</div>
                    <div>Portfolio-Positionen hinzufügen um Sektorverteilung zu sehen.</div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="h-80 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sectorData} cx="50%" cy="50%" innerRadius={70} outerRadius={120}
                            paddingAngle={4} dataKey="value"
                            label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                            labelLine={false}
                          >
                            {sectorData.map((entry, i) => (
                              <Cell key={i} fill={getSectorColor(entry.name)} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [formatCurrency(value, 0), name]}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                      {[...sectorData].sort((a, b) => b.value - a.value).map((entry) => {
                        const total = sectorData.reduce((s, e) => s + e.value, 0)
                        const pct   = ((entry.value / total) * 100).toFixed(1)
                        return (
                          <div key={entry.name} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getSectorColor(entry.name) }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-slate-700 text-sm font-medium truncate">{entry.name}</div>
                              <div className="text-slate-400 text-xs">{formatCurrency(entry.value, 0)} · {pct}%</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedTicker && <StockDetail ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />}
      {showWatchlistModal && <AddStockModal mode="watchlist" onClose={() => setShowWatchlistModal(false)} />}
    </div>
  )
}
