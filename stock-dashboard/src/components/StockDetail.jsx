import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useStockData, useCandles } from '../hooks/useMarketData'
import usePortfolioStore from '../store/portfolioStore'
import AnalysisPanel from './AnalysisPanel'
import { formatCurrency, formatPct, formatNumber, formatMarketCap, candlesToChartData } from '../utils/calculations'

const PERIODS = ['1M', '3M', '1J', '5J']

function KennzahlRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-700/50">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="text-white font-bold">{formatCurrency(payload[0]?.value)}</div>
    </div>
  )
}

export default function StockDetail({ ticker, onClose }) {
  const [period, setPeriod] = useState('1J')

  const positions = usePortfolioStore((s) => s.positions)
  const position = positions.find((p) => p.ticker === ticker)
  const assetType = position?.assetType ?? 'stock'

  const { data: stockData, loading: dataLoading } = useStockData(ticker, assetType)
  const { candles, loading: candlesLoading } = useCandles(ticker, period, assetType)

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

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-50 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-700 overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-5 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {p?.logo && (
                <img
                  src={p.logo}
                  alt={ticker}
                  className="w-7 h-7 rounded object-contain bg-white"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <h2 className="text-xl font-bold text-white">{displayTicker}</h2>
              {isCrypto && (
                <span className="text-xs bg-orange-900/50 text-orange-400 px-2 py-0.5 rounded font-medium">Crypto</span>
              )}
              <span className="text-slate-400 text-sm">{p?.exchange ?? ''}</span>
            </div>
            <div className="text-slate-400 text-sm mt-0.5">
              {isCrypto ? position?.name ?? displayTicker : p?.name ?? ''}
            </div>
            {p?.finnhubIndustry && (
              <div className="text-xs text-indigo-400 mt-0.5">{p.finnhubIndustry}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl mt-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Price */}
          {dataLoading ? (
            <div className="text-slate-400 animate-pulse">Lade Kursdaten...</div>
          ) : q ? (
            <div>
              <div className="text-4xl font-bold text-white font-mono">
                {formatCurrency(q.c)}
              </div>
              <div className={`flex items-center gap-2 mt-1 text-sm font-medium ${
                dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                <span>{dayChange >= 0 ? '▲' : '▼'}</span>
                <span>{formatCurrency(Math.abs(dayChangeAbs))}</span>
                <span>({formatPct(Math.abs(dayChange))})</span>
                <span className="text-slate-500 font-normal">heute</span>
              </div>
              {position && (
                <div className="mt-2 px-3 py-2 bg-slate-800 rounded-lg inline-flex gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Kaufkurs: </span>
                    <span className="text-white font-mono">{formatCurrency(position.purchasePrice)}</span>
                  </div>
                  <div className={q.c >= position.purchasePrice ? 'text-emerald-400' : 'text-red-400'}>
                    {formatPct(((q.c - position.purchasePrice) / position.purchasePrice) * 100)}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Kursverlauf</h3>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      period === p
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {candlesLoading ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                Lade Chart...
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={isPositive ? '#10b981' : '#ef4444'}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={isPositive ? '#10b981' : '#ef4444'}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {position && (
                      <ReferenceLine
                        y={position.purchasePrice}
                        stroke="#6366f1"
                        strokeDasharray="4 4"
                        label={{ value: 'Kauf', fill: '#6366f1', fontSize: 10 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#10b981' : '#ef4444'}
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                Keine Chart-Daten verfügbar
              </div>
            )}
          </div>

          {/* Key Metrics */}
          {isCrypto ? (
            <div>
              <h3 className="text-white font-medium mb-3">Marktdaten</h3>
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
            <div>
              <h3 className="text-white font-medium mb-3">Kennzahlen</h3>
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

          {/* Analysis */}
          <AnalysisPanel
            ticker={ticker}
            stockData={stockData}
            purchasePrice={position?.purchasePrice}
            assetType={assetType}
          />
        </div>
      </div>
    </div>
  )
}
