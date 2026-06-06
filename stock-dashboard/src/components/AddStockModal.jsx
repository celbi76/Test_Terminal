import { useState } from 'react'
import { searchSymbol } from '../services/marketApi'
import usePortfolioStore from '../store/portfolioStore'

const CRYPTO_PRESETS = [
  { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', short: 'BTC' },
  { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', short: 'ETH' },
  { symbol: 'BINANCE:SOLUSDT', name: 'Solana', short: 'SOL' },
  { symbol: 'BINANCE:BNBUSDT', name: 'BNB', short: 'BNB' },
  { symbol: 'BINANCE:XRPUSDT', name: 'XRP', short: 'XRP' },
  { symbol: 'BINANCE:ADAUSDT', name: 'Cardano', short: 'ADA' },
  { symbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin', short: 'DOGE' },
  { symbol: 'BINANCE:AVAXUSDT', name: 'Avalanche', short: 'AVAX' },
  { symbol: 'BINANCE:DOTUSDT', name: 'Polkadot', short: 'DOT' },
  { symbol: 'BINANCE:MATICUSDT', name: 'Polygon', short: 'MATIC' },
]

const ASSET_TABS = [
  { id: 'stock', label: 'Aktien & ETF' },
  { id: 'crypto', label: 'Krypto' },
]

export default function AddStockModal({ onClose, mode = 'position' }) {
  const addPosition = usePortfolioStore((s) => s.addPosition)
  const addToWatchlist = usePortfolioStore((s) => s.addToWatchlist)

  const [assetTab, setAssetTab] = useState('stock')
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
      const filtered = (data.result ?? [])
        .filter((r) => ['Common Stock', 'ETP'].includes(r.type))
        .slice(0, 8)
      setResults(filtered)
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

  function handleCryptoSelect(crypto) {
    setSelected({ displaySymbol: crypto.symbol, description: crypto.name, _cryptoShort: crypto.short })
    setQuery(crypto.name)
  }

  function switchTab(tab) {
    setAssetTab(tab)
    setSelected(null)
    setQuery('')
    setResults([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)

    if (mode === 'watchlist') {
      addToWatchlist(selected.displaySymbol, assetTab)
      onClose()
      return
    }

    addPosition({
      ticker: selected.displaySymbol,
      name: selected.description,
      assetType: assetTab,
      shares: parseFloat(form.shares),
      purchasePrice: parseFloat(form.purchasePrice),
      purchaseDate: form.purchaseDate,
    })
    onClose()
  }

  const typeLabel = selected?.type === 'ETP' ? 'ETF' : assetTab === 'crypto' ? 'Krypto' : 'Aktie'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'watchlist' ? 'Zur Watchlist hinzufügen' : 'Position hinzufügen'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Asset Type Tabs */}
        <div className="flex gap-1 bg-slate-900 rounded-lg p-1 mb-4">
          {ASSET_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors font-medium ${
                assetTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {assetTab === 'stock' ? (
            <div className="relative">
              <label className="block text-sm text-slate-400 mb-1">Ticker / Name suchen</label>
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="z.B. AAPL, VOO, iShares..."
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
                      className="px-3 py-2 hover:bg-slate-700 cursor-pointer flex justify-between gap-2 items-center"
                    >
                      <div className="flex items-center gap-2">
                        {r.type === 'ETP' && (
                          <span className="text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded font-medium">ETF</span>
                        )}
                        <span className="text-white font-medium">{r.displaySymbol}</span>
                      </div>
                      <span className="text-slate-400 text-sm truncate">{r.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Kryptowährung wählen</label>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {CRYPTO_PRESETS.map((c) => (
                  <button
                    key={c.symbol}
                    type="button"
                    onClick={() => handleCryptoSelect(c)}
                    className={`px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                      selected?.displaySymbol === c.symbol
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-bold">{c.short}</div>
                    <div className="text-xs opacity-70">{c.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selected && (
            <div className="text-xs text-indigo-400 bg-indigo-900/20 border border-indigo-800/50 rounded-lg px-3 py-2">
              Ausgewählt: <strong>{selected.description}</strong>
              {' '}· {typeLabel}
            </div>
          )}

          {selected && mode === 'position' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {assetTab === 'crypto' ? 'Anzahl (z.B. 0.5)' : 'Anzahl Aktien / Anteile'}
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  required
                  value={form.shares}
                  onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder={assetTab === 'crypto' ? 'z.B. 0.25' : 'z.B. 10'}
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
                  placeholder={assetTab === 'crypto' ? 'z.B. 45000.00' : 'z.B. 185.00'}
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
