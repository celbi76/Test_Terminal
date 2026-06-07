import { useState } from 'react'
import usePortfolioStore from '../store/portfolioStore'
import { formatCurrency } from '../utils/calculations'

const ASSET_TYPES = [
  { value: 'stock',  label: 'Aktie' },
  { value: 'etf',    label: 'ETF' },
  { value: 'crypto', label: 'Krypto' },
]

const inputCls = 'w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400'

export default function EditPositionModal({ position, onClose }) {
  const updatePosition = usePortfolioStore((s) => s.updatePosition)
  const removePosition = usePortfolioStore((s) => s.removePosition)

  const [tab, setTab]   = useState('edit')
  const [form, setForm] = useState({
    ticker:        position.ticker,
    name:          position.name ?? '',
    assetType:     position.assetType ?? 'stock',
    shares:        String(position.shares),
    purchasePrice: String(position.purchasePrice),
    purchaseDate:  position.purchaseDate ?? '',
  })
  const [txn, setTxn]             = useState({ type: 'buy', shares: '', price: '' })
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
      const newAvg    = (curShares * curPrice + txnShares * txnPrice) / newShares
      updatePosition(position.id, {
        shares:        parseFloat(newShares.toFixed(8)),
        purchasePrice: parseFloat(newAvg.toFixed(6)),
      })
    } else {
      const newShares = curShares - txnShares
      if (newShares <= 0) removePosition(position.id)
      else updatePosition(position.id, { shares: parseFloat(newShares.toFixed(8)) })
    }
    onClose()
  }

  const displayTicker = position.assetType === 'crypto'
    ? position.ticker.split(':')[1]?.replace('USDT', '') ?? position.ticker
    : position.ticker

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-slate-900 text-lg font-bold">Position bearbeiten</h2>
            <div className="text-slate-400 text-xs mt-0.5">{displayTicker} · {position.name}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
          {[['edit', 'Bearbeiten'], ['transaction', 'Transaktion']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 text-sm rounded-lg transition-all font-medium ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
                <label className="block text-xs text-slate-600 font-medium mb-1.5">Ticker</label>
                <input
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                  className={inputCls + ' font-mono uppercase'}
                  placeholder="z.B. VUSA.L"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1.5">Typ</label>
                <select
                  value={form.assetType}
                  onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}
                  className={inputCls}
                >
                  {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-600 font-medium mb-1.5">Name / Bezeichnung</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                placeholder="Vanguard S&P 500 UCITS ETF"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1.5">Anzahl / Stück</label>
                <input type="number" step="0.000001" value={form.shares}
                  onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1.5">Ø Kaufkurs</label>
                <input type="number" step="0.0001" value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-600 font-medium mb-1.5">Kaufdatum</label>
              <input type="date" value={form.purchaseDate}
                onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                className={inputCls} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-sm font-medium">
                Abbrechen
              </button>
              <button type="submit"
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm">
                Speichern
              </button>
            </div>
          </form>
        )}

        {/* ── Transaction tab ── */}
        {tab === 'transaction' && (
          <form onSubmit={handleTransaction} className="space-y-3">
            {/* Current position summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
              <div className="text-slate-500 mb-2 font-semibold uppercase tracking-wide">Aktuelle Position</div>
              <div className="flex justify-between"><span className="text-slate-500">Bestand</span><span className="text-slate-900 font-mono font-semibold">{position.shares} Stück</span></div>
              <div className="flex justify-between mt-1"><span className="text-slate-500">Ø Kaufkurs</span><span className="text-slate-900 font-mono font-semibold">{formatCurrency(position.purchasePrice)}</span></div>
              <div className="flex justify-between mt-1"><span className="text-slate-500">Investiert</span><span className="text-slate-900 font-mono font-semibold">{formatCurrency(position.shares * position.purchasePrice, 0)}</span></div>
            </div>

            {/* Transaction type */}
            <div className="flex gap-2">
              {[['buy', 'Zukauf'], ['sell', 'Teilverkauf']].map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTxn((t) => ({ ...t, type }))}
                  className={`flex-1 py-2.5 text-sm rounded-xl font-semibold transition-all ${
                    txn.type === type
                      ? type === 'buy' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-red-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1.5">
                  {txn.type === 'buy' ? 'Zukauf Stück' : 'Verkauf Stück'}
                </label>
                <input type="number" step="0.000001" min="0.000001" required value={txn.shares}
                  onChange={(e) => setTxn((t) => ({ ...t, shares: e.target.value }))}
                  className={inputCls} placeholder="Anzahl" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1.5">
                  {txn.type === 'buy' ? 'Kaufkurs' : 'Verkaufskurs'}
                </label>
                <input type="number" step="0.0001" min="0.0001" required={txn.type === 'buy'} value={txn.price}
                  onChange={(e) => setTxn((t) => ({ ...t, price: e.target.value }))}
                  className={inputCls} placeholder="Preis" />
              </div>
            </div>

            {/* Preview */}
            {txn.shares && txn.type === 'buy' && txn.price && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs">
                <div className="text-emerald-700 font-semibold mb-1.5">Neuer Bestand nach Zukauf</div>
                <div className="flex justify-between"><span className="text-emerald-600">Stück</span><span className="text-emerald-800 font-mono font-semibold">{(position.shares + parseFloat(txn.shares || 0)).toFixed(6).replace(/\.?0+$/, '')}</span></div>
                <div className="flex justify-between mt-0.5"><span className="text-emerald-600">Ø Kurs</span><span className="text-emerald-800 font-mono font-semibold">{formatCurrency((position.shares * position.purchasePrice + parseFloat(txn.shares || 0) * parseFloat(txn.price || 0)) / (position.shares + parseFloat(txn.shares || 0)))}</span></div>
              </div>
            )}
            {txn.shares && txn.type === 'sell' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs">
                <div className="text-red-600 font-semibold mb-1.5">Neuer Bestand nach Verkauf</div>
                <div className="flex justify-between items-center">
                  <span className="text-red-500">Stück</span>
                  <span className="text-red-700 font-mono font-semibold">
                    {Math.max(0, position.shares - parseFloat(txn.shares || 0)).toFixed(6).replace(/\.?0+$/, '')}
                    {position.shares - parseFloat(txn.shares || 0) <= 0 && (
                      <span className="text-red-500 ml-1">→ Position wird geschlossen</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-sm font-medium">
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!txn.shares || (txn.type === 'buy' && !txn.price)}
                className={`flex-1 px-4 py-2.5 disabled:opacity-40 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm ${
                  txn.type === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {txn.type === 'buy' ? 'Zukauf buchen' : 'Verkauf buchen'}
              </button>
            </div>
          </form>
        )}

        {/* Delete zone */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full py-1.5 text-xs text-slate-300 hover:text-red-400 transition-colors font-medium">
              Position löschen
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 text-xs bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium transition-colors">
                Abbrechen
              </button>
              <button
                onClick={() => { removePosition(position.id); onClose() }}
                className="flex-1 py-2 text-xs bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
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
