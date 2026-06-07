import { useState, useRef, useCallback } from 'react'
import usePortfolioStore from '../store/portfolioStore'
import { formatCurrency } from '../utils/calculations'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'text/csv', 'application/vnd.ms-excel']

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return null

  const raw = lines[0].split(/[,;]/).map((h) => h.trim().replace(/"/g, '').toLowerCase())
  const tickerIdx  = raw.findIndex((h) => ['ticker', 'symbol', 'isin', 'wkn', 'wertpapier', 'title'].includes(h))
  const nameIdx    = raw.findIndex((h) => ['name', 'bezeichnung', 'wertpapiername', 'description'].includes(h))
  const sharesIdx  = raw.findIndex((h) => ['shares', 'quantity', 'anzahl', 'stücke', 'stuecke', 'menge', 'bestand'].includes(h))
  const priceIdx   = raw.findIndex((h) => ['price', 'purchaseprice', 'purchase price', 'kaufkurs', 'einstandskurs', 'avg cost', 'average'].includes(h))
  const typeIdx    = raw.findIndex((h) => ['type', 'typ', 'assettype', 'kategorie'].includes(h))

  if (tickerIdx === -1) return null

  return lines.slice(1).map((line) => {
    const cols = line.split(/[,;]/).map((c) => c.trim().replace(/"/g, ''))
    const ticker = cols[tickerIdx]?.toUpperCase()?.trim()
    if (!ticker) return null
    const shares       = sharesIdx >= 0 ? parseFloat(cols[sharesIdx]?.replace(',', '.')) : null
    const purchasePrice = priceIdx >= 0  ? parseFloat(cols[priceIdx]?.replace(',', '.'))  : null
    const rawType      = typeIdx >= 0 ? cols[typeIdx]?.toLowerCase() : ''
    const assetType    = rawType.includes('crypto') ? 'crypto' : rawType.includes('etf') ? 'etf' : 'stock'
    return {
      ticker,
      name:  nameIdx >= 0 ? cols[nameIdx] : ticker,
      assetType,
      shares:        isNaN(shares) ? null : shares,
      purchasePrice: isNaN(purchasePrice) ? null : purchasePrice,
    }
  }).filter(Boolean)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function displayTicker(p) {
  if (p.assetType === 'crypto') return p.ticker.split(':')[1]?.replace('USDT', '') ?? p.ticker
  return p.ticker
}

function PositionEditor({ position, onChange, onRemove }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-bold text-slate-900 text-sm">{displayTicker(position)}</span>
          <select
            value={position.assetType}
            onChange={(e) => onChange({ ...position, assetType: e.target.value })}
            className="text-xs bg-white border border-slate-200 text-slate-600 rounded-md px-1.5 py-0.5 focus:outline-none"
          >
            <option value="stock">Aktie</option>
            <option value="etf">ETF</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>
        <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors text-sm shrink-0">✕</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-slate-400 text-xs block mb-0.5">Ticker</label>
          <input
            value={position.ticker}
            onChange={(e) => onChange({ ...position, ticker: e.target.value.toUpperCase() })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-0.5">Anzahl</label>
          <input
            type="number"
            step="0.000001"
            value={position.shares ?? ''}
            onChange={(e) => onChange({ ...position, shares: parseFloat(e.target.value) || null })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-0.5">Kaufkurs (USD)</label>
          <input
            type="number"
            step="0.01"
            value={position.purchasePrice ?? ''}
            onChange={(e) => onChange({ ...position, purchasePrice: parseFloat(e.target.value) || null })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
            placeholder="0.00"
          />
        </div>
      </div>
      {position.name && position.name !== position.ticker && (
        <div className="text-slate-400 text-xs truncate">{position.name}</div>
      )}
    </div>
  )
}

export default function ImportModal({ onClose }) {
  const importPositions   = usePortfolioStore((s) => s.importPositions)
  const existingPositions = usePortfolioStore((s) => s.positions)
  const existingTickers   = new Set(existingPositions.map((p) => p.ticker))

  const [step, setStep]           = useState('upload') // upload | processing | review
  const [error, setError]         = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [extracted, setExtracted] = useState([])
  const [selected, setSelected]   = useState(new Set())
  const fileRef = useRef(null)

  const processFile = useCallback(async (file) => {
    setError(null)
    setStep('processing')

    try {
      let positions

      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const text = await file.text()
        positions = parseCSV(text)
        if (!positions) {
          setError('CSV konnte nicht gelesen werden. Bitte prüfe ob Spalten Ticker, Anzahl und Kaufkurs vorhanden sind.')
          setStep('upload')
          return
        }
      } else {
        const base64 = await fileToBase64(file)
        const mimeType = file.type || 'image/jpeg'

        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fileData: base64, mimeType }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? `Fehler ${res.status}`)
        }

        const data = await res.json()
        positions = data.positions ?? []
      }

      if (positions.length === 0) {
        setError('Keine Positionen erkannt. Bitte ein Screenshot mit sichtbaren Depotpositionen hochladen.')
        setStep('upload')
        return
      }

      const withIds = positions.map((p, i) => ({ ...p, _id: i }))
      setExtracted(withIds)
      setSelected(new Set(withIds.filter((p) => !existingTickers.has(p.ticker)).map((p) => p._id)))
      setStep('review')
    } catch (e) {
      setError(e.message)
      setStep('upload')
    }
  }, [existingTickers])

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileInput(e) {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  function updatePosition(id, updated) {
    setExtracted((prev) => prev.map((p) => p._id === id ? { ...p, ...updated } : p))
  }

  function removePosition(id) {
    setExtracted((prev) => prev.filter((p) => p._id !== id))
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s })
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function handleImport() {
    const toImport = extracted
      .filter((p) => selected.has(p._id))
      .map(({ _id, ...rest }) => rest)
      .filter((p) => p.ticker && p.shares > 0 && p.purchasePrice > 0)

    importPositions(toImport)
    onClose()
  }

  const selectedCount = selected.size
  const importableCount = extracted.filter((p) => selected.has(p._id) && p.shares > 0 && p.purchasePrice > 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-slate-900 text-lg font-bold">Portfolio importieren</h2>
            <div className="text-slate-400 text-xs mt-0.5 font-medium">
              {step === 'upload' && 'Screenshot, Foto oder CSV-Datei hochladen'}
              {step === 'processing' && 'KI analysiert Depot…'}
              {step === 'review' && `${extracted.length} Positionen erkannt · ${selectedCount} ausgewählt`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 mb-4 shrink-0">
          {['upload', 'processing', 'review'].map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
              step === s ? 'bg-indigo-600' : i < ['upload', 'processing', 'review'].indexOf(step) ? 'bg-indigo-300' : 'bg-slate-100'
            }`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">

          {/* ── Upload step ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-4xl mb-3">📂</div>
                <div className="text-slate-700 font-semibold text-sm mb-1">
                  Screenshot oder CSV hierher ziehen
                </div>
                <div className="text-slate-400 text-xs">
                  PNG · JPG · WEBP · CSV — oder klicken zum Auswählen
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-1.5">
                <div className="text-slate-600 text-xs font-semibold mb-2">Hinweise</div>
                <div className="text-slate-400 text-xs flex gap-2">
                  <span className="text-indigo-500 shrink-0">•</span>
                  <span>Screenshot deines Depots bei deiner Bank oder deinem Broker</span>
                </div>
                <div className="text-slate-400 text-xs flex gap-2">
                  <span className="text-indigo-500 shrink-0">•</span>
                  <span>CSV mit Spalten: Ticker, Anzahl, Kaufkurs (komma- oder semikolongetrennt)</span>
                </div>
                <div className="text-slate-400 text-xs flex gap-2">
                  <span className="text-indigo-500 shrink-0">•</span>
                  <span>Die KI erkennt automatisch Ticker, Stücke und Kaufpreise</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Processing step ── */}
          {step === 'processing' && (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
              <div className="text-slate-700 font-semibold text-sm mb-1">Claude analysiert dein Depot</div>
              <div className="text-slate-400 text-xs">Ticker · Anzahl · Kaufkurse werden erkannt…</div>
            </div>
          )}

          {/* ── Review step ── */}
          {step === 'review' && (
            <div className="space-y-2">
              {extracted.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Keine Positionen erkannt
                </div>
              ) : (
                extracted.map((pos) => {
                  const exists = existingTickers.has(pos.ticker)
                  const isSelected = selected.has(pos._id)
                  return (
                    <div key={pos._id} className={`transition-all ${exists ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => !exists && toggleSelect(pos._id)}
                          disabled={exists}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            exists
                              ? 'border-slate-200 bg-slate-100 cursor-not-allowed'
                              : isSelected
                              ? 'border-indigo-500 bg-indigo-600'
                              : 'border-slate-300 bg-white cursor-pointer'
                          }`}
                        >
                          {(isSelected || exists) && <span className="text-white text-xs font-bold leading-none">✓</span>}
                        </button>
                        {exists && <span className="text-xs text-slate-400">bereits vorhanden</span>}
                      </div>
                      <PositionEditor
                        position={pos}
                        onChange={(updated) => updatePosition(pos._id, updated)}
                        onRemove={() => removePosition(pos._id)}
                      />
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          {step === 'review' && (
            <button
              onClick={() => { setStep('upload'); setExtracted([]); setSelected(new Set()) }}
              className="px-3 py-2.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors font-medium"
            >
              ← Neu
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium text-sm"
          >
            Abbrechen
          </button>
          {step === 'review' && (
            <button
              onClick={handleImport}
              disabled={importableCount === 0}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors font-semibold text-sm shadow-sm"
            >
              {importableCount} Position{importableCount !== 1 ? 'en' : ''} hinzufügen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
