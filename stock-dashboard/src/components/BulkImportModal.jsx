import { useState } from 'react'
import usePortfolioStore from '../store/portfolioStore'
import { formatCurrency } from '../utils/calculations'

// Positions parsed from the screenshot
const PRESET_POSITIONS = [
  // ETFs
  { ticker: 'SEMD',   name: 'SEMD',                    assetType: 'etf',    shares: 5,        purchasePrice: 78.78 },
  { ticker: 'CANCDA', name: 'CANCDA',                  assetType: 'etf',    shares: 20,       purchasePrice: 65.30 },
  { ticker: 'VUSA',   name: 'Vanguard S&P 500 ETF',    assetType: 'etf',    shares: 47.3717,  purchasePrice: 99.107 },
  { ticker: 'VHYL',   name: 'Vanguard High Div Yield', assetType: 'etf',    shares: 4,        purchasePrice: 66.00 },
  { ticker: 'VEU',    name: 'Vanguard FTSE ex-US',     assetType: 'etf',    shares: 5,        purchasePrice: 78.0599 },
  { ticker: 'JEPQ',   name: 'JPMorgan Nasdaq Premium', assetType: 'etf',    shares: 15,       purchasePrice: 60.6299 },
  // Crypto
  { ticker: 'BINANCE:XRPUSDT',    name: 'XRP',      assetType: 'crypto', shares: 36,       purchasePrice: 1.871 },
  { ticker: 'BINANCE:BTCUSDT',    name: 'Bitcoin',  assetType: 'crypto', shares: 0.01375,  purchasePrice: 92019.00 },
  { ticker: 'BINANCE:RENDERUSDT', name: 'Render',   assetType: 'crypto', shares: 80.09,    purchasePrice: 4.004 },
  { ticker: 'BINANCE:ETHUSDT',    name: 'Ethereum', assetType: 'crypto', shares: 0.67538,  purchasePrice: 3836.81 },
]

export default function BulkImportModal({ onClose }) {
  const importPositions = usePortfolioStore((s) => s.importPositions)
  const existingPositions = usePortfolioStore((s) => s.positions)
  const existingTickers = new Set(existingPositions.map((p) => p.ticker))

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
    const toImport = PRESET_POSITIONS.filter((p) => selected.has(p.ticker))
    importPositions(toImport)
    onClose()
  }

  const available = PRESET_POSITIONS.filter((p) => !existingTickers.has(p.ticker))
  const etfs    = PRESET_POSITIONS.filter((p) => p.assetType === 'stock')
  const cryptos = PRESET_POSITIONS.filter((p) => p.assetType === 'crypto')

  function displayTicker(p) {
    if (p.assetType === 'crypto') return p.ticker.split(':')[1]?.replace('USDT', '') ?? p.ticker
    return p.ticker
  }

  function PositionRow({ p }) {
    const exists = existingTickers.has(p.ticker)
    const isSelected = selected.has(p.ticker)
    const total = (p.purchasePrice * p.shares)

    return (
      <div
        onClick={() => !exists && toggle(p.ticker)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          exists
            ? 'opacity-40 cursor-not-allowed'
            : isSelected
            ? 'bg-indigo-900/30 border border-indigo-700/50 cursor-pointer'
            : 'bg-slate-800/40 border border-slate-700/30 hover:bg-slate-700/40 cursor-pointer'
        }`}
      >
        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
          exists ? 'border-slate-600 bg-slate-700' :
          isSelected ? 'border-indigo-500 bg-indigo-600' : 'border-slate-500'
        }`}>
          {(isSelected || exists) && (
            <span className="text-white text-xs leading-none">{exists ? '✓' : '✓'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">{displayTicker(p)}</span>
            {p.assetType === 'crypto' && (
              <span className="text-xs bg-orange-900/50 text-orange-400 px-1 py-0.5 rounded">Crypto</span>
            )}
            {exists && <span className="text-xs text-slate-500">bereits vorhanden</span>}
          </div>
          <div className="text-slate-500 text-xs truncate">{p.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-white text-xs font-mono">{p.shares} × {formatCurrency(p.purchasePrice)}</div>
          <div className="text-slate-400 text-xs font-mono">{formatCurrency(total, 0)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Portfolio importieren</h2>
            <div className="text-slate-500 text-xs mt-0.5">
              {selected.size} von {available.length} Positionen ausgewählt
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* ETFs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide">ETFs</div>
            </div>
            <div className="space-y-1.5">
              {etfs.map((p) => <PositionRow key={p.ticker} p={p} />)}
            </div>
          </div>

          {/* Crypto */}
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Kryptowährungen</div>
            <div className="space-y-1.5">
              {cryptos.map((p) => <PositionRow key={p.ticker} p={p} />)}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-700 mt-4 shrink-0">
          <button
            type="button"
            onClick={toggleAll}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            {selected.size === available.length ? 'Alle abwählen' : 'Alle wählen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors font-medium"
          >
            {selected.size} Position{selected.size !== 1 ? 'en' : ''} hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}
