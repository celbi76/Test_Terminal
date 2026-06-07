import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useAnalysis } from '../hooks/useAnalysis'
import { formatCurrency, formatPct } from '../utils/calculations'

// ── Parsing helpers ──────────────────────────────────────────────────────────

function parseRecommendation(text) {
  if (!text) return null
  const m = text.match(/empfehlung[:\*\s]+(kaufen|halten|reduzieren|verkaufen)/i)
  if (!m) return null
  const r = m[1].toLowerCase()
  if (r === 'kaufen') return 'Kaufen'
  if (r === 'halten') return 'Halten'
  return 'Reduzieren'
}

function parseScore(text) {
  if (!text) return null
  const m = text.match(/(\d+)\s*\/\s*10/)
  return m ? Math.min(10, Math.max(1, parseInt(m[1]))) : null
}

function parseFairValue(text) {
  if (!text) return null
  const m = text.match(/fair[- ]?value[^\d$]*\$?\s*([\d][0-9,\.]*)/i)
    || text.match(/fairer?\s+wert[^\d$]*\$?\s*([\d][0-9,\.]*)/i)
    || text.match(/innere[rn]?\s+wert[^\d$]*\$?\s*([\d][0-9,\.]*)/i)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

function parseSections(text) {
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

    const isBullet = /^[-•\d]\s/.test(clean) || /^\d+\.\s/.test(clean)
    if (inStrengths && isBullet && clean.length > 5) {
      strengths.push(clean.replace(/^[-•\d\.]\s*/, ''))
    }
    if (inRisks && isBullet && clean.length > 5) {
      risks.push(clean.replace(/^[-•\d\.]\s*/, ''))
    }
  }

  return { strengths: strengths.slice(0, 3), risks: risks.slice(0, 3), full: text }
}

// ── Projection chart ─────────────────────────────────────────────────────────

function generateProjection(currentPrice, fairValue, months = 13) {
  if (!currentPrice || currentPrice <= 0) return []
  const target = fairValue ?? currentPrice * 1.08
  const diff = target - currentPrice
  // monthly volatility ~2.5% of current price
  const vol = currentPrice * 0.025

  return Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() + i)
    const label = i === 0
      ? 'Heute'
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

function ProjectionChart({ currentPrice, fairValue }) {
  const data = generateProjection(currentPrice, fairValue)
  if (!data.length) return null

  const isPositive = (fairValue ?? currentPrice) >= currentPrice
  const color = isPositive ? '#10b981' : '#ef4444'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-medium text-sm">12-Monats-Prognose</h4>
        <div className="flex gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Optimistisch
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />Basis
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />Konservativ
          </span>
        </div>
      </div>
      <div className="h-44 text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradOpt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCons" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={46} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v, name) => [`$${v}`, name]}
            />
            {fairValue && (
              <ReferenceLine y={fairValue} stroke="#6366f1" strokeDasharray="4 3"
                label={{ value: `Fair Value $${fairValue.toFixed(0)}`, fill: '#818cf8', fontSize: 9, position: 'insideTopRight' }} />
            )}
            <Area type="monotone" dataKey="optimistisch" stroke="#10b981" strokeWidth={1.5} fill="url(#gradOpt)" dot={false} />
            <Area type="monotone" dataKey="basis" stroke={color} strokeWidth={2} fill="url(#gradBase)" dot={false} />
            <Area type="monotone" dataKey="konservativ" stroke="#64748b" strokeWidth={1.5} fill="url(#gradCons)" dot={false} strokeDasharray="3 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-slate-500 text-xs mt-1 text-right">
        Modellprognose · keine Anlageberatung
      </div>
    </div>
  )
}

// ── Recommendation card ───────────────────────────────────────────────────────

const REC_CONFIG = {
  Kaufen:    { bg: 'bg-emerald-900/40', border: 'border-emerald-700', text: 'text-emerald-400', icon: '↑', label: 'KAUFEN' },
  Halten:    { bg: 'bg-amber-900/30',   border: 'border-amber-700',   text: 'text-amber-400',   icon: '→', label: 'HALTEN' },
  Reduzieren:{ bg: 'bg-red-900/30',     border: 'border-red-700',     text: 'text-red-400',     icon: '↓', label: 'REDUZIEREN' },
}

function RecommendationCard({ rec, score, currentPrice, fairValue }) {
  const cfg = REC_CONFIG[rec] ?? REC_CONFIG['Halten']
  const upside = fairValue && currentPrice ? ((fairValue - currentPrice) / currentPrice) * 100 : null

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 flex items-center gap-4`}>
      <div className={`text-5xl font-black ${cfg.text} leading-none`}>{cfg.icon}</div>
      <div className="flex-1">
        <div className={`text-2xl font-black tracking-wide ${cfg.text}`}>{cfg.label}</div>
        {upside != null && (
          <div className="text-slate-400 text-sm mt-0.5">
            Fair Value: <span className="text-white font-medium">{formatCurrency(fairValue)}</span>
            <span className={`ml-2 font-medium ${upside >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPct(upside)}
            </span>
          </div>
        )}
      </div>
      {score != null && (
        <div className="text-right shrink-0">
          <div className={`text-3xl font-black ${cfg.text}`}>{score}<span className="text-slate-500 text-lg font-normal">/10</span></div>
          <div className="text-slate-500 text-xs">Score</div>
          <div className="mt-1 w-16 bg-slate-700 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${cfg.text.replace('text-', 'bg-')}`} style={{ width: `${score * 10}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Strengths / Risks ─────────────────────────────────────────────────────────

function StrengthsRisks({ strengths, risks }) {
  if (!strengths.length && !risks.length) return null
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg p-3">
        <div className="text-emerald-400 text-xs font-semibold mb-2 uppercase tracking-wide">Stärken</div>
        <ul className="space-y-1.5">
          {strengths.map((s, i) => (
            <li key={i} className="text-slate-300 text-xs flex gap-1.5">
              <span className="text-emerald-500 shrink-0 mt-0.5">+</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
        <div className="text-red-400 text-xs font-semibold mb-2 uppercase tracking-wide">Risiken</div>
        <ul className="space-y-1.5">
          {risks.map((r, i) => (
            <li key={i} className="text-slate-300 text-xs flex gap-1.5">
              <span className="text-red-500 shrink-0 mt-0.5">−</span>
              <span>{r}</span>
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
    <div className="space-y-1.5 text-sm text-slate-300 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        if (line.startsWith('## ') || line.startsWith('### '))
          return <div key={i} className="text-slate-200 font-semibold mt-3">{line.replace(/^#+\s/, '')}</div>
        return (
          <p key={i} dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
          }} />
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalysisPanel({ ticker, stockData, purchasePrice, assetType = 'stock' }) {
  const { analyses, loading, errors, analyze, clearCache } = useAnalysis()
  const [showFull, setShowFull] = useState(false)

  const rawText = analyses[ticker]
  const isLoading = loading[ticker]
  const error = errors[ticker]

  const rec = parseRecommendation(rawText)
  const score = parseScore(rawText)
  const fairValue = parseFairValue(rawText)
  const { strengths, risks } = parseSections(rawText)
  const currentPrice = stockData?.quote?.c

  function handleAnalyze() {
    analyze({
      ticker,
      quote: stockData?.quote,
      financials: stockData?.financials,
      profile: stockData?.profile,
      purchasePrice,
      assetType,
    })
  }

  function handleRefresh() {
    clearCache(ticker)
    setTimeout(handleAnalyze, 50)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">KI-Analyse</h3>
          <div className="text-slate-500 text-xs">Graham/Buffett · Value-Perspektive</div>
        </div>
        <div className="flex gap-2">
          {rawText && (
            <button onClick={handleRefresh} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
              Aktualisieren
            </button>
          )}
          <button
            onClick={rawText ? handleRefresh : handleAnalyze}
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
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-10 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm">Claude analysiert {ticker}…</div>
          <div className="text-xs text-slate-500 mt-1">Fundamentaldaten werden ausgewertet</div>
        </div>
      )}

      {/* Empty state */}
      {!rawText && !isLoading && !error && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-sm">KI-Analyse auf Knopfdruck</div>
          <div className="text-xs text-slate-600 mt-1">Empfehlung · Prognose · Stärken & Risiken</div>
        </div>
      )}

      {/* Results */}
      {rawText && !isLoading && (
        <div className="space-y-3">
          {/* 1. Decision card */}
          {rec && (
            <RecommendationCard
              rec={rec}
              score={score}
              currentPrice={currentPrice}
              fairValue={fairValue}
            />
          )}

          {/* 2. Projection chart */}
          {currentPrice > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <ProjectionChart currentPrice={currentPrice} fairValue={fairValue} />
            </div>
          )}

          {/* 3. Strengths / Risks */}
          {(strengths.length > 0 || risks.length > 0) && (
            <StrengthsRisks strengths={strengths} risks={risks} />
          )}

          {/* 4. Full analysis – collapsible */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFull((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/30 transition-colors"
            >
              <span className="font-medium">Vollständige Analyse</span>
              <span className="text-slate-500">{showFull ? '▲' : '▼'}</span>
            </button>
            {showFull && (
              <div className="px-4 pb-4 border-t border-slate-700/50">
                <div className="pt-3">
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
