import { useState } from 'react'
import usePortfolioStore from '../store/portfolioStore'
import { useMultiQuotes } from '../hooks/useMarketData'
import {
  calcGainLoss,
  calcReturn,
  calcPortfolioTotals,
  formatCurrency,
  formatPct,
} from '../utils/calculations'
import AddStockModal from './AddStockModal'
import BulkImportModal from './BulkImportModal'

function StatCard({ label, value, sub, positive }) {
  const color =
    positive === true
      ? 'text-emerald-400'
      : positive === false
      ? 'text-red-400'
      : 'text-white'
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  )
}

export default function PortfolioTable({ onSelectTicker }) {
  const positions = usePortfolioStore((s) => s.positions)
  const removePosition = usePortfolioStore((s) => s.removePosition)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [sortBy, setSortBy] = useState('value')

  const positionRefs = positions.map((p) => ({ ticker: p.ticker, assetType: p.assetType ?? 'stock' }))
  const { quotes, loading: quotesLoading } = useMultiQuotes(positionRefs)

  const totals = calcPortfolioTotals(
    positions,
    Object.fromEntries(Object.entries(quotes).map(([t, d]) => [t, d?.quote]))
  )

  const enriched = positions.map((pos) => {
    const q = quotes[pos.ticker]?.quote
    const price = q?.c ?? pos.purchasePrice
    const gainLoss = calcGainLoss(price, pos.purchasePrice, pos.shares)
    const ret = calcReturn(price, pos.purchasePrice)
    return { ...pos, currentPrice: price, value: price * pos.shares, gainLoss, ret, dayChange: q?.dp }
  })

  const sorted = [...enriched].sort((a, b) => {
    if (sortBy === 'value') return b.value - a.value
    if (sortBy === 'return') return b.ret - a.ret
    if (sortBy === 'gainLoss') return b.gainLoss - a.gainLoss
    return a.ticker.localeCompare(b.ticker)
  })

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Portfoliowert"
          value={formatCurrency(totals.totalValue, 0)}
          sub={`Invested: ${formatCurrency(totals.totalCost, 0)}`}
        />
        <StatCard
          label="Gesamtrendite"
          value={formatPct(totals.totalReturnPct)}
          positive={totals.totalReturnPct >= 0}
        />
        <StatCard
          label="Gewinn / Verlust"
          value={formatCurrency(totals.totalGainLoss, 0)}
          positive={totals.totalGainLoss >= 0}
        />
        <StatCard
          label="Positionen"
          value={positions.length}
          sub={`${positionRefs.length} Titel`}
        />
      </div>

      {/* Table Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-white font-semibold">Portfolio</h2>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm bg-slate-700 border border-slate-600 text-slate-300 rounded px-2 py-1 focus:outline-none"
            >
              <option value="value">Sortierung: Wert</option>
              <option value="return">Sortierung: Rendite</option>
              <option value="gainLoss">Sortierung: G/V</option>
              <option value="ticker">Sortierung: Ticker</option>
            </select>
            <button
              onClick={() => setShowImport(true)}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              title="Mehrere Positionen auf einmal importieren"
            >
              ↑ Import
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
            >
              + Position
            </button>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">📊</div>
            <div>Noch keine Positionen</div>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
            >
              Erste Position hinzufügen
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-left border-b border-slate-700">
                  <th className="px-4 py-2 font-medium">Ticker</th>
                  <th className="px-4 py-2 font-medium text-right">Kurs</th>
                  <th className="px-4 py-2 font-medium text-right">Tag</th>
                  <th className="px-4 py-2 font-medium text-right">Stück</th>
                  <th className="px-4 py-2 font-medium text-right">Kaufkurs</th>
                  <th className="px-4 py-2 font-medium text-right">Wert</th>
                  <th className="px-4 py-2 font-medium text-right">G/V</th>
                  <th className="px-4 py-2 font-medium text-right">%</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((pos) => (
                  <tr
                    key={pos.id}
                    onClick={() => onSelectTicker(pos.ticker)}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">
                          {pos.assetType === 'crypto' ? pos.ticker.split(':')[1]?.replace('USDT','') ?? pos.ticker : pos.ticker}
                        </span>
                        {pos.assetType === 'crypto' && (
                          <span className="text-xs bg-orange-900/50 text-orange-400 px-1 py-0.5 rounded font-medium">Crypto</span>
                        )}
                        {pos.assetType === 'stock' && pos.ticker.startsWith('ETF') && (
                          <span className="text-xs bg-amber-900/50 text-amber-400 px-1 py-0.5 rounded font-medium">ETF</span>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs truncate max-w-[120px]">{pos.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {quotesLoading ? '...' : formatCurrency(pos.currentPrice)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      pos.dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {pos.dayChange != null ? formatPct(pos.dayChange, 2) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{pos.shares}</td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">
                      {formatCurrency(pos.purchasePrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono font-medium">
                      {formatCurrency(pos.value, 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      pos.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(pos.gainLoss, 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${
                      pos.ret >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatPct(pos.ret)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); removePosition(pos.id) }}
                        className="text-slate-600 hover:text-red-400 transition-colors px-1"
                        title="Position löschen"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal  && <AddStockModal    onClose={() => setShowModal(false)} />}
      {showImport && <BulkImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
