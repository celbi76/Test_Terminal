import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import { formatCurrency, formatPct } from '../utils/calculations'

// ── Parsing helpers (exported for StockDetail) ────────────────────────────────

export function parseRecommendation(text) {
  if (!text) return null

  // Search within 400 chars after the first "Empfehlung" occurrence
  const lower = text.toLowerCase()
  const idx = lower.indexOf('empfehlung')
  if (idx >= 0) {
    const scope = lower.slice(idx, idx + 400)
    const m = scope.match(/\b(kaufen|aufstocken|halten|reduzieren|verkaufen)\b/)
    if (m) {
      const r = m[1]
      if (r === 'kaufen' || r === 'aufstocken') return 'Kaufen'
      if (r === 'halten') return 'Halten'
      return 'Reduzieren'
    }
  }

  // Fallback: bold-formatted keyword anywhere in text
  const m2 = text.match(/\*\*(kaufen|aufstocken|halten|reduzieren)\*\*/i)
  if (!m2) return null
  const r2 = m2[1].toLowerCase()
  if (r2 === 'kaufen' || r2 === 'aufstocken') return 'Kaufen'
  if (r2 === 'halten') return 'Halten'
  return 'Reduzieren'
}

export function parseScore(text) {
  if (!text) return null
  const m = text.match(/(\d+)\s*\/\s*10/)
  return m ? Math.min(10, Math.max(1, parseInt(m[1]))) : null
}

export function parseFairValue(text) {
  if (!text) return null
  const m = text.match(/fair[- ]?value[^\d$]*\$?\s*([\d][0-9,\.]*)/i)
    || text.match(/fairer?\s+wert[^\d$]*\$?\s*([\d][0-9,\.]*)/i)
    || text.match(/innere[rn]?\s+wert[^\d$]*\$?\s*([\d][0-9,\.]*)/i)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

export function parseSections(text) {
  if (!text) return { strengths: [], risks: [], full: '' }
  const lines = text.split('\n')
  const strengths = []
  const risks = []
  let inStrengths = false
  let inRisks = false

  for (const line of lines) {
    const clean = line.replace(/\*\*/g, '').trim()
    if (/st[äa]rken|strengths/i.test(clean)) { inStrengths = true; inRisks = false; continue }
    if (/risiken|risks/i.test(clean)) { inRisks = true; inStrengths = false; continue }
    if (/empfehlung|fair.?value|bewertung/i.test(clean)) { inStrengths = false; inRisks = false }

    const isBullet = /^[-•*\d]\s/.test(clean) || /^\d+\.\s/.test(clean)
    if (inStrengths && isBullet && clean.length > 5)
      strengths.push(clean.replace(/^[-•\d\.]\s*/, ''))
    if (inRisks && isBullet && clean.length > 5)
      risks.push(clean.replace(/^[-•\d\.]\s*/, ''))
  }

  return { strengths: strengths.slice(0, 3), risks: risks.slice(0, 3), full: text }
}

export const REC_CONFIG = {
  Kaufen:    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '↑', label: 'KAUFEN' },
  Halten:    { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: '→', label: 'HALTEN' },
  Reduzieren:{ bg: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-600',     icon: '↓', label: 'REDUZIEREN' },
}

// ── Combined historical + forecast chart ──────────────────────────────────────

function generateProjection(currentPrice, fairValue, months = 13) {
  if (!currentPrice || currentPrice <= 0) return []
  const target = fairValue ?? currentPrice * 1.08
  const diff = target - currentPrice
  const vol = currentPrice * 0.025

  return Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() + i)
    const label = i === 0
      ? 'Jetzt'
      : d.toLocaleDateString('de-CH', { month: 'short', year: i >= 12 ? '2-digit' : undefined })
    const base = currentPrice + (diff / (months - 1)) * i
    const spread = vol * Math.sqrt(i)
    return {
      label,
      basis: parseFloat(base.toFixed(2)),
      optimistisch: parseFloat((base + spread * 1.6).toFixed(2)),
      konservativ: parseFloat(Math.max(0, base - spread * 1.4).toFixed(2)),
    }
  })
}

function buildCombinedData(chartData, currentPrice, fairValue) {
  const hist = (chartData ?? []).map((d) => ({ date: d.date, hist: d.price }))
  if (!currentPrice) return { data: hist, junctionDate: null }

  const projection = generateProjection(currentPrice, fairValue, 13)
  const forecasts = projection.slice(1).map((d) => ({
    date: d.label,
    basis: d.basis,
    optimistisch: d.optimistisch,
    konservativ: d.konservativ,
  }))

  const junction = {
    date: 'Jetzt',
    hist: currentPrice,
    basis: currentPrice,
    optimistisch: currentPrice,
    konservativ: currentPrice,
  }

  return { data: [...hist, junction, ...forecasts], junctionDate: 'Jetzt' }
}

function CombinedChart({ chartData, currentPrice, fairValue }) {
  const { data, junctionDate } = buildCombinedData(chartData, currentPrice, fairValue)
  if (!data.length) return (
    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
      Keine Chart-Daten
    </div>
  )

  const isUpside = (fairValue ?? currentPrice) >= currentPrice

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="apGradHist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="apGradOpt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="apGradCons" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={48}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          labelStyle={{ color: '#64748b' }}
          formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name]}
        />
        {junctionDate && (
          <ReferenceLine
            x={junctionDate}
            stroke="#cbd5e1"
            strokeDasharray="3 3"
            label={{ value: 'Prognose ›', fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        {fairValue && (
          <ReferenceLine
            y={fairValue}
            stroke="#6366f1"
            strokeDasharray="4 3"
            label={{ value: `Kursziel $${fairValue.toFixed(0)}`, fill: '#6366f1', fontSize: 9, position: 'insideTopRight' }}
          />
        )}
        <Area type="monotone" dataKey="hist" stroke="#6366f1" strokeWidth={2}
          fill="url(#apGradHist)" dot={false} connectNulls={false} name="Kurs" />
        <Area type="monotone" dataKey="optimistisch" stroke="#10b981" strokeWidth={1.5}
          fill="url(#apGradOpt)" dot={false} connectNulls={false} name="Optimistisch" />
        <Area type="monotone" dataKey="konservativ" stroke="#ef4444" strokeWidth={1.5}
          fill="url(#apGradCons)" dot={false} connectNulls={false} name="Konservativ" strokeDasharray="3 2" />
        <Area type="monotone" dataKey="basis" stroke={isUpside ? '#10b981' : '#ef4444'}
          strokeWidth={2} fill="none" dot={false} connectNulls={false} name="Basis" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Analyst-style rating bars ─────────────────────────────────────────────────

function getDistribution(rec, score) {
  const s = Math.min(10, Math.max(1, score ?? 5))
  if (rec === 'Kaufen') {
    const kaufen = Math.min(90, Math.round(50 + s * 4))
    const halten = Math.round((100 - kaufen) * 0.75)
    return { kaufen, halten, verkaufen: 100 - kaufen - halten }
  }
  if (rec === 'Reduzieren') {
    const verkaufen = Math.min(90, Math.round(50 + s * 4))
    const halten = Math.round((100 - verkaufen) * 0.75)
    return { kaufen: 100 - verkaufen - halten, halten, verkaufen }
  }
  const halten = Math.min(85, Math.round(40 + s * 4))
  const rest = 100 - halten
  return { kaufen: Math.round(rest * 0.55), halten, verkaufen: 100 - halten - Math.round(rest * 0.55) }
}

function RatingBars({ rec, score }) {
  const dist = getDistribution(rec, score)
  const bars = [
    { label: 'Kaufen',    value: dist.kaufen,    color: 'bg-emerald-500' },
    { label: 'Halten',    value: dist.halten,    color: 'bg-amber-400' },
    { label: 'Verkaufen', value: dist.verkaufen, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-2.5">
      {bars.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-2.5">
          <span className="text-slate-500 text-xs w-16 shrink-0">{label}</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
          </div>
          <span className="text-slate-500 text-xs w-8 text-right shrink-0 font-mono">{value}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Price target card ─────────────────────────────────────────────────────────

function PriceTargetCard({ ticker, currentPrice, fairValue, score }) {
  const deviation = fairValue && currentPrice
    ? ((fairValue - currentPrice) / currentPrice) * 100
    : null
  const isUp = deviation != null && deviation >= 0

  const rows = [
    { label: 'Kursziel', value: fairValue ? formatCurrency(fairValue) : '—', cls: 'text-slate-900 font-semibold' },
    { label: 'Kurs',     value: currentPrice ? formatCurrency(currentPrice) : '—', cls: 'text-slate-800' },
    {
      label: 'Abweichung',
      value: deviation != null
        ? `${isUp ? '↑' : '↓'} ${Math.abs(deviation).toFixed(2)}%`
        : '—',
      cls: deviation != null ? (isUp ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold') : 'text-slate-400',
    },
    { label: 'KI-Score', value: score != null ? `${score} / 10` : '—', cls: 'text-slate-800' },
  ]

  return (
    <div>
      <div className="text-slate-700 font-semibold text-sm mb-3">{ticker} Kursziel</div>
      <div className="space-y-0">
        {rows.map(({ label, value, cls }) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
            <span className="text-slate-500 text-xs">{label}</span>
            <span className={`text-xs ${cls}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Strengths / Risks ─────────────────────────────────────────────────────────

function StrengthsRisks({ strengths, risks }) {
  if (!strengths.length && !risks.length) return null
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <div className="text-emerald-700 text-xs font-semibold mb-2 uppercase tracking-wide">Stärken</div>
        <ul className="space-y-1.5">
          {strengths.map((s, i) => (
            <li key={i} className="text-slate-600 text-xs flex gap-1.5">
              <span className="text-emerald-600 shrink-0 mt-0.5">+</span><span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
        <div className="text-red-600 text-xs font-semibold mb-2 uppercase tracking-wide">Risiken</div>
        <ul className="space-y-1.5">
          {risks.map((r, i) => (
            <li key={i} className="text-slate-600 text-xs flex gap-1.5">
              <span className="text-red-500 shrink-0 mt-0.5">−</span><span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Full text renderer ────────────────────────────────────────────────────────

function MarkdownText({ text }) {
  return (
    <div className="space-y-1.5 text-sm text-slate-600 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        if (line.startsWith('## ') || line.startsWith('### '))
          return <div key={i} className="text-slate-800 font-semibold mt-3">{line.replace(/^#+\s/, '')}</div>
        return (
          <p key={i} dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>')
          }} />
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalysisPanel({
  ticker, stockData, purchasePrice, assetType = 'stock',
  analyses, loading, errors, onAnalyze, onRefresh,
  chartData,
}) {
  const [showFull, setShowFull] = useState(false)

  const rawText = analyses[ticker]
  const isLoading = loading[ticker]
  const error = errors[ticker]

  const rec = parseRecommendation(rawText)
  const score = parseScore(rawText)
  const fairValue = parseFairValue(rawText)
  const { strengths, risks } = parseSections(rawText)
  const currentPrice = stockData?.quote?.c
  const nextYear = new Date().getFullYear() + 1

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-slate-900 font-semibold">KI-Analyse</h3>
          <div className="text-slate-400 text-xs">Graham/Buffett · Value-Perspektive</div>
        </div>
        <div className="flex gap-2">
          {rawText && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
            >
              Aktualisieren
            </button>
          )}
          <button
            onClick={rawText ? onRefresh : onAnalyze}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Analysiert…
              </span>
            ) : rawText ? 'Neu analysieren' : 'Jetzt analysieren'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-10 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-slate-500">Claude analysiert {ticker}…</div>
          <div className="text-xs text-slate-400 mt-1">Fundamentaldaten werden ausgewertet</div>
        </div>
      )}

      {/* Empty state */}
      {!rawText && !isLoading && !error && (
        <div className="text-center py-8 text-slate-400">
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-sm text-slate-500">KI-Analyse auf Knopfdruck</div>
          <div className="text-xs text-slate-400 mt-1">Empfehlung · Prognose · Stärken & Risiken</div>
        </div>
      )}

      {/* ── Main dashboard (aktien.guide style) ─────────────────────────── */}
      {rawText && !isLoading && (
        <div className="space-y-4">

          {/* Title */}
          <div className="text-slate-700 font-semibold text-sm">
            {ticker} Kursziel {nextYear} · KI-Einstufung &amp; Empfehlung
          </div>

          {/* 2-column layout: chart left, stats right */}
          <div className="grid grid-cols-5 gap-4">

            {/* Chart — 3/5 */}
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="h-56">
                <CombinedChart chartData={chartData} currentPrice={currentPrice} fairValue={fairValue} />
              </div>
            </div>

            {/* Right column — 2/5 */}
            <div className="col-span-2 flex flex-col gap-3">

              {/* Rating bars */}
              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-slate-800 font-semibold text-sm mb-3">
                  {ticker} Einstufungen &amp; Empfehlung:
                </div>
                {rec ? (
                  <RatingBars rec={rec} score={score} />
                ) : (
                  <div className="text-slate-400 text-xs">Empfehlung nicht erkannt</div>
                )}
              </div>

              {/* Price target */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <PriceTargetCard
                  ticker={ticker}
                  currentPrice={currentPrice}
                  fairValue={fairValue}
                  score={score}
                />
              </div>
            </div>
          </div>

          {/* Strengths / Risks */}
          {(strengths.length > 0 || risks.length > 0) && (
            <StrengthsRisks strengths={strengths} risks={risks} />
          )}

          {/* Full analysis — collapsible with scroll */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setShowFull((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">Vollständige Analyse</span>
              <span className="text-slate-400">{showFull ? '▲' : '▼'}</span>
            </button>
            {showFull && (
              <div className="border-t border-slate-100">
                <div className="px-4 py-4">
                  <MarkdownText text={rawText} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
