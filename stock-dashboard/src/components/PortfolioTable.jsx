import { useState } from 'react'
import usePortfolioStore from '../store/portfolioStore'
import { useMultiQuotes } from '../hooks/useMarketData'
import {
  calcGainLoss, calcReturn, calcPortfolioTotals, formatCurrency, formatPct,
} from '../utils/calculations'
import AddStockModal from './AddStockModal'
import ImportModal from './ImportModal'
import EditPositionModal from './EditPositionModal'
import { parseRecommendation } from './AnalysisPanel'

const FILTER_TABS = [
  { id: 'all',    label: 'Alle' },
  { id: 'stock',  label: 'Aktien' },
  { id: 'etf',    label: 'ETFs' },
  { id: 'crypto', label: 'Krypto' },
]

function StatCard({ label, value, sub, positive }) {
  const valColor = positive === true ? 'text-emerald-600' : positive === false ? 'text-red-500' : 'text-slate-900'
  const accent   = positive === true ? 'bg-emerald-500' : positive === false ? 'bg-red-500' : 'bg-indigo-500'
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${accent} rounded-l-2xl`} />
      <div className="text-slate-500 text-xs font-medium mb-1 pl-1">{label}</div>
      <div className={`text-xl font-bold pl-1 ${valColor}`}>{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-1 pl-1">{sub}</div>}
    </div>
  )
}

function GroupStatCard({ label, value, sub, positive }) {
  const color = positive === true ? 'text-emerald-600' : positive === false ? 'text-red-500' : 'text-slate-800'
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="text-slate-500 text-xs mb-1">{label}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-0.5">{sub}</div>}
    </div>
  )
}

const REC_BADGE = {
  Kaufen:    { cls: 'bg-emerald-100 text-emerald-700', icon: '↑' },
  Halten:    { cls: 'bg-amber-100 text-amber-700',     icon: '→' },
  Reduzieren:{ cls: 'bg-red-100 text-red-600',         icon: '↓' },
}

export default function PortfolioTable({ onSelectTicker }) {
  const positions      = usePortfolioStore((s) => s.positions)
  const removePosition = usePortfolioStore((s) => s.removePosition)
  const analyses       = usePortfolioStore((s) => s.analyses)
  const [showModal,    setShowModal]    = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [editPosition, setEditPosition] = useState(null)
  const [sortBy,       setSortBy]       = useState('value')
  const [filterTab,    setFilterTab]    = useState('all')

  const positionRefs = positions.map((p) => ({ ticker: p.ticker, assetType: p.assetType ?? 'stock' }))
  const { quotes, loading: quotesLoading } = useMultiQuotes(positionRefs)

  const totals = calcPortfolioTotals(
    positions,
    Object.fromEntries(Object.entries(quotes).map(([t, d]) => [t, d?.quote]))
  )

  const enriched = positions.map((pos) => {
    const q       = quotes[pos.ticker]?.quote
    const price   = q?.c ?? pos.purchasePrice
    const gainLoss = calcGainLoss(price, pos.purchasePrice, pos.shares)
    const ret      = calcReturn(price, pos.purchasePrice)
    return { ...pos, currentPrice: price, value: price * pos.shares, gainLoss, ret, dayChange: q?.dp }
  })

  const filtered = filterTab === 'all'
    ? enriched
    : enriched.filter((pos) => (pos.assetType ?? 'stock') === filterTab)

  const groupTotals = filterTab !== 'all'
    ? calcPortfolioTotals(filtered, Object.fromEntries(Object.entries(quotes).map(([t, d]) => [t, d?.quote])))
    : null

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'value')    return b.value - a.value
    if (sortBy === 'return')   return b.ret - a.ret
    if (sortBy === 'gainLoss') return b.gainLoss - a.gainLoss
    return a.ticker.localeCompare(b.ticker)
  })

  const countByType = positions.reduce((acc, p) => {
    const t = p.assetType ?? 'stock'
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Portfoliowert"  value={formatCurrency(totals.totalValue, 0)} sub={`Invested: ${formatCurrency(totals.totalCost, 0)}`} />
        <StatCard label="Gesamtrendite"  value={formatPct(totals.totalReturnPct)}  positive={totals.totalReturnPct >= 0} />
        <StatCard label="Gewinn / Verlust" value={formatCurrency(totals.totalGainLoss, 0)} positive={totals.totalGainLoss >= 0} />
        <StatCard label="Positionen"     value={positions.length} sub={`${positionRefs.length} Titel`} />
      </div>

      {/* ── Table container ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Header row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-bold text-base">Portfolio</h2>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="value">Sortierung: Wert</option>
              <option value="return">Sortierung: Rendite</option>
              <option value="gainLoss">Sortierung: G/V</option>
              <option value="ticker">Sortierung: Ticker</option>
            </select>
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg transition-colors font-medium"
              title="Mehrere Positionen importieren"
            >
              ↑ Import
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors font-semibold shadow-sm"
            >
              + Position
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          {FILTER_TABS.map((tab) => {
            const count = tab.id === 'all' ? positions.length : (countByType[tab.id] ?? 0)
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    filterTab === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Group performance strip */}
        {groupTotals && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-slate-100 bg-indigo-50/30">
            <GroupStatCard label="Gruppenwert" value={formatCurrency(groupTotals.totalValue, 0)} sub={`Invested: ${formatCurrency(groupTotals.totalCost, 0)}`} />
            <GroupStatCard label="Rendite" value={formatPct(groupTotals.totalReturnPct)} positive={groupTotals.totalReturnPct >= 0} />
            <GroupStatCard label="G / V" value={formatCurrency(groupTotals.totalGainLoss, 0)} positive={groupTotals.totalGainLoss >= 0} />
          </div>
        )}

        {/* Empty states */}
        {positions.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-4">📊</div>
            <div className="text-slate-600 font-medium mb-1">Noch keine Positionen</div>
            <div className="text-sm mb-4">Füge deine erste Position hinzu um loszulegen</div>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-colors font-semibold shadow-sm"
            >
              Erste Position hinzufügen
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Keine {FILTER_TABS.find((t) => t.id === filterTab)?.label}-Positionen vorhanden
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-left border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 font-semibold">Ticker</th>
                  <th className="px-4 py-3 font-semibold text-right">Kurs</th>
                  <th className="px-4 py-3 font-semibold text-right">Tag</th>
                  <th className="px-4 py-3 font-semibold text-right">Stück</th>
                  <th className="px-4 py-3 font-semibold text-right">Kaufkurs</th>
                  <th className="px-4 py-3 font-semibold text-right">Wert</th>
                  <th className="px-4 py-3 font-semibold text-right">G/V</th>
                  <th className="px-4 py-3 font-semibold text-right">%</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((pos) => (
                  <tr
                    key={pos.id}
                    onClick={() => onSelectTicker(pos.ticker)}
                    className="border-b border-slate-50 hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {pos.assetType === 'crypto'
                            ? pos.ticker.split(':')[1]?.replace('USDT', '') ?? pos.ticker
                            : pos.ticker}
                        </span>
                        {pos.assetType === 'crypto' && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-semibold">Crypto</span>
                        )}
                        {pos.assetType === 'etf' && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-semibold">ETF</span>
                        )}
                        {(() => {
                          const rec = parseRecommendation(analyses[pos.ticker])
                          const badge = REC_BADGE[rec]
                          return badge ? (
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${badge.cls}`}>{badge.icon}</span>
                          ) : null
                        })()}
                      </div>
                      <div className="text-slate-400 text-xs truncate max-w-[120px]">{pos.name}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-800 font-mono font-medium">
                      {quotesLoading ? <span className="text-slate-300">...</span> : formatCurrency(pos.currentPrice)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-mono font-medium text-sm ${
                      pos.dayChange >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {pos.dayChange != null ? formatPct(pos.dayChange, 2) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-600 font-mono">{pos.shares}</td>
                    <td className="px-4 py-3.5 text-right text-slate-500 font-mono">{formatCurrency(pos.purchasePrice)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-900 font-mono font-semibold">{formatCurrency(pos.value, 0)}</td>
                    <td className={`px-4 py-3.5 text-right font-mono font-medium ${
                      pos.gainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {formatCurrency(pos.gainLoss, 0)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-mono font-semibold ${
                      pos.ret >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {formatPct(pos.ret)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditPosition(pos) }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs"
                          title="Position bearbeiten"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removePosition(pos.id) }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Position löschen"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal    && <AddStockModal onClose={() => setShowModal(false)} />}
      {showImport   && <ImportModal   onClose={() => setShowImport(false)} />}
      {editPosition && (
        <EditPositionModal position={editPosition} onClose={() => setEditPosition(null)} />
      )}
    </div>
  )
}
