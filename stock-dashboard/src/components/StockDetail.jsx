import { useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useStockData, useCandles } from '../hooks/useMarketData'
import { useAnalysis } from '../hooks/useAnalysis'
import usePortfolioStore from '../store/portfolioStore'
import AnalysisPanel, { parseRecommendation, parseFairValue, parseSections, REC_CONFIG } from './AnalysisPanel'
import { formatCurrency, formatPct, formatNumber, formatMarketCap, candlesToChartData } from '../utils/calculations'

const PERIODS = ['1M', '3M', '1J', '5J']

function KennzahlRow({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="text-slate-900 text-sm font-semibold">{value}</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 font-medium mb-1">{label}</div>
      <div className="text-slate-900 font-bold">{formatCurrency(payload[0]?.value)}</div>
    </div>
  )
}

// ── Top-of-panel recommendation widget ────────────────────────────────────────

function TopRecommendation({ rec, rawText, fairValue, currentPrice, onAnalyze, isLoading }) {
  const cfg = REC_CONFIG[rec]
  const upside = fairValue && currentPrice ? ((fairValue - currentPrice) / currentPrice) * 100 : null
  const { strengths, risks } = parseSections(rawText)

  // Pick the 3 most relevant key points: top strengths for buy, top risks for sell, mix for hold
  let keyPoints = []
  if (rec === 'Kaufen') keyPoints = strengths.slice(0, 3)
  else if (rec === 'Reduzieren') keyPoints = risks.slice(0, 3)
  else keyPoints = [...strengths.slice(0, 2), ...risks.slice(0, 1)]

  if (!cfg) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
        <div className="text-slate-500 text-xs">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin inline-block" />
              KI analysiert…
            </span>
          ) : (
            <span>
              Keine KI-Empfehlung ·{' '}
              <button onClick={onAnalyze} className="text-indigo-400 hover:text-indigo-300 underline">
                Jetzt analysieren
              </button>
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}>
      {/* Decision row */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`text-4xl font-black ${cfg.text} leading-none`}>{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-xl font-black tracking-wide ${cfg.text}`}>{cfg.label}</div>
          <div className="text-slate-500 text-xs mt-0.5">KI-Handlungsempfehlung</div>
        </div>
        {upside != null && (
          <div className="text-right shrink-0">
            <div className={`text-sm font-bold ${upside >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs">zum Fair Value</div>
            <div className="text-white text-xs font-medium">{formatCurrency(fairValue)}</div>
          </div>
        )}
      </div>

      {/* 3 key bullet points */}
      {keyPoints.length > 0 && (
        <ul className="space-y-1.5 border-t border-white/10 pt-3">
          {keyPoints.map((pt, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-300 leading-snug">
              <span className={`${cfg.text} font-bold shrink-0`}>{i + 1}.</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StockDetail({ ticker, onClose }) {
  const [period, setPeriod] = useState('1J')

  const positions = usePortfolioStore((s) => s.positions)
  const position = positions.find((p) => p.ticker === ticker)
  const assetType = position?.assetType ?? 'stock'

  const { data: stockData, loading: dataLoading } = useStockData(ticker, assetType)
  const { candles, loading: candlesLoading } = useCandles(ticker, period, assetType)
  const { analyses, loading: analysisLoading, errors, analyze, clearCache } = useAnalysis()

  const isCrypto = assetType === 'crypto'
  const displayTicker = isCrypto
    ? ticker.split(':')[1]?.replace('USDT', '') ?? ticker
    : ticker

  const q = stockData?.quote
  const p = stockData?.profile
  const f = stockData?.financials

  const chartData = candlesToChartData(candles)
  const firstPrice = chartData[0]?.price
  const isPositive = q?.c >= (firstPrice ?? q?.c)

  const dayChange = q?.dp
  const dayChangeAbs = q?.d

  const rawText = analyses[ticker]
  const rec = parseRecommendation(rawText)
  const fairValue = parseFairValue(rawText)
  const currentPrice = q?.c

  const handleAnalyze = useCallback(() => {
    analyze({
      ticker,
      quote: stockData?.quote,
      financials: stockData?.financials,
      profile: stockData?.profile,
      purchasePrice: position?.purchasePrice,
      assetType,
    })
  }, [ticker, stockData, position, assetType, analyze])

  const handleRefresh = useCallback(() => {
    clearCache(ticker)
    setTimeout(handleAnalyze, 50)
  }, [ticker, clearCache, handleAnalyze])

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 h-full w-full max-w-2xl bg-white border-l border-slate-200 overflow-y-auto scrollbar-thin shadow-2xl">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-5 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {p?.logo && (
                <img
                  src={p.logo}
                  alt={ticker}
                  className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <h2 className="text-xl font-bold text-slate-900">{displayTicker}</h2>
              {isCrypto && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md font-semibold">Crypto</span>
              )}
              <span className="text-slate-400 text-sm font-medium">{p?.exchange ?? ''}</span>
            </div>
            <div className="text-slate-500 text-sm mt-0.5">
              {isCrypto ? position?.name ?? displayTicker : p?.name ?? ''}
            </div>
            {p?.finnhubIndustry && (
              <div className="text-xs text-indigo-600 font-medium mt-0.5">{p.finnhubIndustry}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors mt-0.5"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* Price + Recommendation side-by-side */}
          {dataLoading ? (
            <div className="text-slate-400 animate-pulse text-sm">Lade Kursdaten…</div>
          ) : q ? (
            <div className="flex gap-4 items-start">
              {/* Price block */}
              <div className="flex-1 min-w-0">
                <div className="text-4xl font-bold text-slate-900 font-mono">
                  {formatCurrency(q.c)}
                </div>
                <div className={`flex items-center gap-2 mt-1.5 text-sm font-semibold ${
                  dayChange >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  <span>{dayChange >= 0 ? '▲' : '▼'}</span>
                  <span>{formatCurrency(Math.abs(dayChangeAbs))}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    dayChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                  }`}>({formatPct(Math.abs(dayChange))})</span>
                  <span className="text-slate-400 font-normal">heute</span>
                </div>
                {position && (
                  <div className="mt-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl inline-flex gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Kaufkurs: </span>
                      <span className="text-slate-800 font-mono font-semibold">{formatCurrency(position.purchasePrice)}</span>
                    </div>
                    <div className={`font-semibold ${q.c >= position.purchasePrice ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatPct(((q.c - position.purchasePrice) / position.purchasePrice) * 100)}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendation widget — prominent top-right */}
              <div className="shrink-0 w-56">
                <TopRecommendation
                  rec={rec}
                  rawText={rawText}
                  fairValue={fairValue}
                  currentPrice={currentPrice}
                  onAnalyze={handleAnalyze}
                  isLoading={analysisLoading[ticker]}
                />
              </div>
            </div>
          ) : null}

          {/* Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-900 font-semibold">Kursverlauf</h3>
              <div className="flex gap-1">
                {PERIODS.map((per) => (
                  <button
                    key={per}
                    onClick={() => setPeriod(per)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      period === per
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {per}
                  </button>
                ))}
              </div>
            </div>
            {candlesLoading ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Lade Chart…
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    {position && (
                      <ReferenceLine
                        y={position.purchasePrice}
                        stroke="#6366f1"
                        strokeDasharray="4 4"
                        label={{ value: 'Kauf', fill: '#6366f1', fontSize: 10 }}
                      />
                    )}
                    <Area type="monotone" dataKey="price" stroke={isPositive ? '#10b981' : '#ef4444'} strokeWidth={2} fill="url(#colorPrice)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Keine Chart-Daten verfügbar
              </div>
            )}
          </div>

          {/* Key Metrics */}
          {isCrypto ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h3 className="text-slate-900 font-semibold mb-3">Marktdaten</h3>
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <KennzahlRow label="Tageshoch" value={formatCurrency(q?.h)} />
                  <KennzahlRow label="Tagestief" value={formatCurrency(q?.l)} />
                </div>
                <div>
                  <KennzahlRow label="Eröffnung" value={formatCurrency(q?.o)} />
                  <KennzahlRow label="Vortagesschluss" value={formatCurrency(q?.pc)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h3 className="text-slate-900 font-semibold mb-3">Kennzahlen</h3>
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <KennzahlRow label="Marktkapitalisierung" value={formatMarketCap(p?.marketCapitalization)} />
                  <KennzahlRow label="KGV (P/E TTM)" value={formatNumber(f?.peBasicExclExtraTTM)} />
                  <KennzahlRow label="KBV (P/B)" value={formatNumber(f?.pbQuarterly)} />
                  <KennzahlRow label="KUV (P/S)" value={formatNumber(f?.psTTM)} />
                  <KennzahlRow label="Dividendenrendite" value={f?.dividendYieldIndicatedAnnual ? formatPct(f.dividendYieldIndicatedAnnual, 2) : '—'} />
                </div>
                <div>
                  <KennzahlRow label="52W Hoch" value={formatCurrency(f?.['52WeekHigh'] ?? q?.h)} />
                  <KennzahlRow label="52W Tief" value={formatCurrency(f?.['52WeekLow'] ?? q?.l)} />
                  <KennzahlRow label="ROE" value={f?.roeTTM != null ? formatPct(f.roeTTM * 100) : '—'} />
                  <KennzahlRow label="Verschuldung (D/E)" value={formatNumber(f?.totalDebt_totalEquityQuarterly)} />
                  <KennzahlRow label="Umsatzwachstum" value={f?.revenueGrowthTTMYoy != null ? formatPct(f.revenueGrowthTTMYoy * 100) : '—'} />
                </div>
              </div>
            </div>
          )}

          {/* Full analysis panel */}
          <AnalysisPanel
            ticker={ticker}
            stockData={stockData}
            purchasePrice={position?.purchasePrice}
            assetType={assetType}
            analyses={analyses}
            loading={analysisLoading}
            errors={errors}
            onAnalyze={handleAnalyze}
            onRefresh={handleRefresh}
            chartData={chartData}
          />
        </div>
      </div>
    </div>
  )
}
