import { useState } from 'react'
import usePortfolioStore from '../store/portfolioStore'
import { formatCurrency } from '../utils/calculations'

const PRESET_POSITIONS = [
  // ETFs
  { ticker: 'SEMD',   name: 'SEMD',                    assetType: 'etf',    shares: 5,        purchasePrice: 78.78 },
  { ticker: 'CANCDA', name: 'CANCDA',                  assetType: 'etf',    shares: 20,       purchasePrice: 65.30 },
  { ticker: 'VUSA',   name: 'Vanguard S&P 500 ETF',    assetType: 'etf',    shares: 47.3717,  purchasePrice: 99.107 },
  { ticker: 'VHYL',   name: 'Vanguard High Div Yield', assetType: 'etf',    shares: 4,        purchasePrice: 66.00 },
  { ticker: 'VEU',    name: 'Vanguard FTSE ex-US',     assetType: 'etf',    shares: 5,        purchasePrice: 78.0599 },
  { ticker: 'JEPQ',   name: 'JPMorgan Nasdaq Premium', assetType: 'etf',    shares: 15,       purchasePrice: 60.6299 },
  // Crypto
  { ticker: 'BINANCE:XRPUSDT',    name: 'XRP',      assetType: 'crypto', shares: 36,      purchasePrice: 1.871 },
  { ticker: 'BINANCE:BTCUSDT',    name: 'Bitcoin',  assetType: 'crypto', shares: 0.01375, purchasePrice: 92019.00 },
  { ticker: 'BINANCE:RENDERUSDT', name: 'Render',   assetType: 'crypto', shares: 80.09,   purchasePrice: 4.004 },
  { ticker: 'BINANCE:ETHUSDT',    name: 'Ethereum', assetType: 'crypto', shares: 0.67538, purchasePrice: 3836.81 },
]

export default function BulkImportModal({ onClose }) {
  const importPositions    = usePortfolioStore((s) => s.importPositions)
  const existingPositions  = usePortfolioStore((s) => s.positions)
  const existingTickers    = new Set(existingPositions.map((p) => p.ticker))

  const [selected, setSelected] = useState(() =>
    new Set(PRESET_POSITIONS.filter((p) => !existingTickers.has(p.ticker)).map((p) => p.ticker))
  )

  function toggle(ticker) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(ticker) ? next.delete(ticker) : next.add(ticker)
      return next
    })
  }

  function toggleAll() {
    const available = PRESET_POSITIONS.filter((p) => !existingTickers.has(p.ticker)).map((p) => p.ticker)
    if (selected.size === available.length) setSelected(new Set())
    else setSelected(new Set(available))
  }

  function handleImport() {
    importPositions(PRESET_POSITIONS.filter((p) => selected.has(p.ticker)))
    onClose()
  }

  const available = PRESET_POSITIONS.filter((p) => !existingTickers.has(p.ticker))
  const etfs      = PRESET_POSITIONS.filter((p) => p.assetType === 'etf')
  const cryptos   = PRESET_POSITIONS.filter((p) => p.assetType === 'crypto')

  function displayTicker(p) {
    if (p.assetType === 'crypto') return p.ticker.split(':')[1]?.replace('USDT', '') ?? p.ticker
    return p.ticker
  }

  function PositionRow({ p }) {
    const exists     = existingTickers.has(p.ticker)
    const isSelected = selected.has(p.ticker)
    const total      = p.purchasePrice * p.shares

    return (
      <div
        onClick={() => !exists && toggle(p.ticker)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
          exists
            ? 'opacity-40 cursor-not-allowed bg-slate-50 border border-slate-200'
            : isSelected
            ? 'bg-indigo-50 border border-indigo-200 cursor-pointer shadow-sm'
            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer'
        }`}
      >
        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
          exists
            ? 'border-slate-300 bg-slate-200'
            : isSelected
            ? 'border-indigo-500 bg-indigo-600'
            : 'border-slate-300 bg-white'
        }`}>
          {(isSelected || exists) && (
            <span className="text-white text-xs leading-none font-bold">✓</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-900 font-bold text-sm">{displayTicker(p)}</span>
            {p.assetType === 'crypto' && (
              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-semibold">Crypto</span>
            )}
            {p.assetType === 'etf' && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-semibold">ETF</span>
            )}
            {exists && <span className="text-xs text-slate-400 font-medium">bereits vorhanden</span>}
          </div>
          <div className="text-slate-400 text-xs truncate">{p.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-slate-700 text-xs font-mono font-medium">{p.shares} × {formatCurrency(p.purchasePrice)}</div>
          <div className="text-slate-400 text-xs font-mono">{formatCurrency(total, 0)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] flex flex-col mx-4">

        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 className="text-slate-900 text-lg font-bold">Portfolio importieren</h2>
            <div className="text-slate-400 text-xs mt-0.5 font-medium">
              {selected.size} von {available.length} Positionen ausgewählt
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* ETFs */}
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">ETFs</div>
            <div className="space-y-1.5">
              {etfs.map((p) => <PositionRow key={p.ticker} p={p} />)}
            </div>
          </div>
          {/* Crypto */}
          <div>
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Kryptowährungen</div>
            <div className="space-y-1.5">
              {cryptos.map((p) => <PositionRow key={p.ticker} p={p} />)}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4 shrink-0">
          <button type="button" onClick={toggleAll}
            className="px-4 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium">
            {selected.size === available.length ? 'Alle abwählen' : 'Alle wählen'}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium">
            Abbrechen
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors font-semibold shadow-sm"
          >
            {selected.size} Position{selected.size !== 1 ? 'en' : ''} hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
