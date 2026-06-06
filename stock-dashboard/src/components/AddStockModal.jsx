import { useState } from 'react'
import { searchSymbol } from '../services/marketApi'
import usePortfolioStore from '../store/portfolioStore'

export default function AddStockModal({ onClose, mode = 'position' }) {
  const addPosition = usePortfolioStore((s) => s.addPosition)
  const addToWatchlist = usePortfolioStore((s) => s.addToWatchlist)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState({ shares: '', purchasePrice: '', purchaseDate: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleSearch(e) {
    const q = e.target.value
    setQuery(q)
    setSelected(null)
    if (q.length < 2) { setResults([]); return }

    setSearching(true)
    try {
      const data = await searchSymbol(q)
      setResults((data.result ?? []).filter((r) => r.type === 'Common Stock').slice(0, 8))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(item) {
    setSelected(item)
    setQuery(item.displaySymbol)
    setResults([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)

    if (mode === 'watchlist') {
      addToWatchlist(selected.displaySymbol)
      onClose()
      return
    }

    addPosition({
      ticker: selected.displaySymbol,
      name: selected.description,
      shares: parseFloat(form.shares),
      purchasePrice: parseFloat(form.purchasePrice),
      purchaseDate: form.purchaseDate,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'watchlist' ? 'Zur Watchlist hinzufügen' : 'Position hinzufügen'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-1">Ticker / Suche</label>
            <input
              type="text"
              value={query}
              onChange={handleSearch}
              placeholder="z.B. AAPL, Microsoft..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-9 text-slate-400 text-xs">Suche...</div>
            )}
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-slate-900 border border-slate-600 rounded-lg overflow-hidden shadow-xl">
                {results.map((r) => (
                  <li
                    key={r.symbol}
                    onClick={() => handleSelect(r)}
                    className="px-3 py-2 hover:bg-slate-700 cursor-pointer flex justify-between gap-2"
                  >
                    <span className="text-white font-medium">{r.displaySymbol}</span>
                    <span className="text-slate-400 text-sm truncate">{r.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected && mode === 'position' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Anzahl Aktien</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={form.shares}
                  onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="z.B. 10"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kaufkurs (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="z.B. 185.00"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kaufdatum</label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!selected || submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {submitting ? 'Wird gespeichert...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
