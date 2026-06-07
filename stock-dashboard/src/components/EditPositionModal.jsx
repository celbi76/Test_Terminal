import { useState } from 'react'
import usePortfolioStore from '../store/portfolioStore'
import { formatCurrency } from '../utils/calculations'

const ASSET_TYPES = [
  { value: 'stock',  label: 'Aktie' },
  { value: 'etf',    label: 'ETF' },
  { value: 'crypto', label: 'Krypto' },
]

export default function EditPositionModal({ position, onClose }) {
  const updatePosition = usePortfolioStore((s) => s.updatePosition)
  const removePosition = usePortfolioStore((s) => s.removePosition)

  const [tab, setTab] = useState('edit') // 'edit' | 'transaction'
  const [form, setForm] = useState({
    ticker:        position.ticker,
    name:          position.name ?? '',
    assetType:     position.assetType ?? 'stock',
    shares:        String(position.shares),
    purchasePrice: String(position.purchasePrice),
    purchaseDate:  position.purchaseDate ?? '',
  })
  const [txn, setTxn] = useState({ type: 'buy', shares: '', price: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    updatePosition(position.id, {
      ticker:        form.ticker.trim().toUpperCase(),
      name:          form.name.trim(),
      assetType:     form.assetType,
      shares:        parseFloat(form.shares),
      purchasePrice: parseFloat(form.purchasePrice),
      purchaseDate:  form.purchaseDate || undefined,
    })
    onClose()
  }

  function handleTransaction(e) {
    e.preventDefault()
    const txnShares = parseFloat(txn.shares)
    const txnPrice  = parseFloat(txn.price)
    if (!txnShares || !txnPrice) return

    const curShares = position.shares
    const curPrice  = position.purchasePrice

    if (txn.type === 'buy') {
      const newShares = curShares + txnShares
      const newAvgPrice = (curShares * curPrice + txnShares * txnPrice) / newShares
      updatePosition(position.id, {
        shares: parseFloat(newShares.toFixed(8)),
        purchasePrice: parseFloat(newAvgPrice.toFixed(6)),
      })
    } else {
      const newShares = curShares - txnShares
      if (newShares <= 0) {
        removePosition(position.id)
      } else {
        updatePosition(position.id, { shares: parseFloat(newShares.toFixed(8)) })
      }
    }
    onClose()
  }

  const displayTicker = position.assetType === 'crypto'
    ? position.ticker.split(':')[1]?.replace('USDT', '') ?? position.ticker
    : position.ticker

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Position bearbeiten</h2>
            <div className="text-slate-500 text-xs mt-0.5">{displayTicker} · {position.name}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 rounded-lg p-1 mb-4">
          {[['edit', 'Bearbeiten'], ['transaction', 'Transaktion']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors font-medium ${
                tab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Edit tab ── */}
        {tab === 'edit' && (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Ticker</label>
                <input
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono uppercase"
                  placeholder="z.B. VUSA.L"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Typ</label>
                <select
                  value={form.assetType}
                  onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name / Bezeichnung</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Vanguard S&P 500 UCITS ETF"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Anzahl / Stück</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.shares}
                  onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Ø Kaufkurs</label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kaufdatum</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm">
                Abbrechen
              </button>
              <button type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-sm">
                Speichern
              </button>
            </div>
          </form>
        )}

        {/* ── Transaction tab ── */}
        {tab === 'transaction' && (
          <form onSubmit={handleTransaction} className="space-y-3">
            {/* Current position summary */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3 text-xs">
              <div className="text-slate-400 mb-2 font-semibold uppercase tracking-wide">Aktuelle Position</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bestand</span>
                <span className="text-white font-mono">{position.shares} Stück</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">Ø Kaufkurs</span>
                <span className="text-white font-mono">{formatCurrency(position.purchasePrice)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">Investiert</span>
                <span className="text-white font-mono">{formatCurrency(position.shares * position.purchasePrice, 0)}</span>
              </div>
            </div>

            {/* Transaction type */}
            <div className="flex gap-2">
              {[['buy', 'Zukauf'], ['sell', 'Teilverkauf']].map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTxn((t) => ({ ...t, type }))}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                    txn.type === type
                      ? type === 'buy' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {txn.type === 'buy' ? 'Zukauf Stück' : 'Verkauf Stück'}
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  required
                  value={txn.shares}
                  onChange={(e) => setTxn((t) => ({ ...t, shares: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Anzahl"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {txn.type === 'buy' ? 'Kaufkurs' : 'Verkaufskurs'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required={txn.type === 'buy'}
                  value={txn.price}
                  onChange={(e) => setTxn((t) => ({ ...t, price: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Preis"
                />
              </div>
            </div>

            {/* Preview of result */}
            {txn.shares && txn.type === 'buy' && txn.price && (
              <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg px-3 py-2 text-xs">
                <div className="text-emerald-400 font-semibold mb-1">Neuer Bestand</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stück</span>
                  <span className="text-white font-mono">{(position.shares + parseFloat(txn.shares || 0)).toFixed(6).replace(/\.?0+$/, '')}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-slate-400">Ø Kurs</span>
                  <span className="text-white font-mono">
                    {formatCurrency((position.shares * position.purchasePrice + parseFloat(txn.shares || 0) * parseFloat(txn.price || 0)) / (position.shares + parseFloat(txn.shares || 0)))}
                  </span>
                </div>
              </div>
            )}
            {txn.shares && txn.type === 'sell' && (
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 text-xs">
                <div className="text-red-400 font-semibold mb-1">Neuer Bestand</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stück</span>
                  <span className="text-white font-mono">
                    {Math.max(0, position.shares - parseFloat(txn.shares || 0)).toFixed(6).replace(/\.?0+$/, '')}
                    {position.shares - parseFloat(txn.shares || 0) <= 0 && (
                      <span className="text-red-400 ml-1">→ Position wird geschlossen</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm">
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!txn.shares || (txn.type === 'buy' && !txn.price)}
                className={`flex-1 px-4 py-2 disabled:opacity-40 text-white rounded-lg transition-colors font-medium text-sm ${
                  txn.type === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {txn.type === 'buy' ? 'Zukauf buchen' : 'Verkauf buchen'}
              </button>
            </div>
          </form>
        )}

        {/* Delete zone */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-1.5 text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              Position löschen
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600">
                Abbrechen
              </button>
              <button
                onClick={() => { removePosition(position.id); onClose() }}
                className="flex-1 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded font-medium"
              >
                Ja, löschen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
