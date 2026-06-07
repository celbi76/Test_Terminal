import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatCurrency, formatPct } from '../utils/calculations'

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchPositionCandles(ticker, assetType, period) {
  const params = new URLSearchParams({ symbol: ticker, period, assetType: assetType ?? 'stock' })
  const res  = await fetch(`/api/candles?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.s !== 'ok') return null
  return data.t.map((t, i) => ({ t: t * 1000, c: data.c[i] }))
}

// ── MWR via Newton-Raphson IRR ────────────────────────────────────────────────

function calcMWR(positions, currentPrices) {
  if (!positions.length) return 0
  const today    = Date.now()
  const hasDates = positions.some((p) => p.purchaseDate)

  if (!hasDates) {
    const invested = positions.reduce((s, p) => s + p.shares * p.purchasePrice, 0)
    const current  = positions.reduce((s, p) => s + p.shares * (currentPrices[p.ticker] ?? p.purchasePrice), 0)
    return invested > 0 ? ((current - invested) / invested) * 100 : 0
  }

  const t0 = Math.min(...positions.map((p) => p.purchaseDate ? new Date(p.purchaseDate).getTime() : today))
  const tT = (today - t0) / (365.25 * 24 * 60 * 60 * 1000)
  if (tT < 0.01) return 0

  const flows   = positions.map((p) => {
    const t = p.purchaseDate ? new Date(p.purchaseDate).getTime() : t0
    return { years: (t - t0) / (365.25 * 24 * 60 * 60 * 1000), amount: -(p.shares * p.purchasePrice) }
  })
  const terminal = positions.reduce((s, p) => s + p.shares * (currentPrices[p.ticker] ?? p.purchasePrice), 0)

  const npv  = (r) => { let v = terminal / Math.pow(1 + r, tT); flows.forEach((f) => { v += f.amount / Math.pow(1 + r, Math.max(0, f.years)) }); return v }
  const dnpv = (r) => { let d = -(tT * terminal) / Math.pow(1 + r, tT + 1); flows.forEach((f) => { if (f.years > 0) d -= (f.years * f.amount) / Math.pow(1 + r, f.years + 1) }); return d }

  let r = 0.1
  for (let i = 0; i < 60; i++) {
    const n = npv(r), d = dnpv(r)
    if (Math.abs(n) < 0.01 || !d || !isFinite(d)) break
    const next = r - n / d
    if (!isFinite(next) || Math.abs(next - r) < 1e-9) break
    r = Math.max(-0.99, Math.min(50, next))
  }
  return isFinite(r) ? r * 100 : 0
}

// ── Build timeline ────────────────────────────────────────────────────────────

function buildTimeline(positions, candleMap, startMs) {
  const dateSet = new Set()
  positions.forEach((p) => {
    ;(candleMap[p.ticker] ?? []).forEach((c) => { if (!startMs || c.t >= startMs) dateSet.add(c.t) })
  })
  const dates = [...dateSet].sort((a, b) => a - b)
  if (dates.length < 2) return []

  const lastKnown = {}
  const raw = dates.map((ts) => {
    let value = 0
    positions.forEach((p) => {
      const candles = candleMap[p.ticker] ?? []
      let lo = 0, hi = candles.length - 1, idx = -1
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (candles[mid].t <= ts) { idx = mid; lo = mid + 1 } else hi = mid - 1 }
      if (idx >= 0) lastKnown[p.ticker] = candles[idx].c
      value += p.shares * (lastKnown[p.ticker] ?? p.purchasePrice)
    })
    return { ts, value }
  })

  const base = raw[0].value || 1
  return raw.map((d) => ({
    date:  new Date(d.ts).toLocaleDateString('de-CH', { month: 'short', day: 'numeric' }),
    ts:    d.ts,
    value: d.value,
    twr:   ((d.value / base) - 1) * 100,
  }))
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function PerfTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <div className="text-slate-400 font-medium mb-1">{d.date}</div>
      <div className={`font-bold text-base ${d.twr >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {d.twr >= 0 ? '+' : ''}{d.twr.toFixed(2)}%
      </div>
      <div className="text-slate-600 font-medium">{formatCurrency(d.value, 0)}</div>
    </div>
  )
}

// ── Sidebar card ──────────────────────────────────────────────────────────────

function PerfCard({ active, label, sub, value, onClick }) {
  const isUp = value >= 0
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
        active
          ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>{label}</div>
        <div className={`flex items-center gap-1 text-sm font-bold ${
          active ? 'text-white' : isUp ? 'text-emerald-600' : 'text-red-500'
        }`}>
          <span className="text-xs">{isUp ? '▲' : '▼'}</span>
          <span>{Math.abs(value).toFixed(2)}%</span>
        </div>
      </div>
      <div className={`text-xs ${active ? 'text-indigo-200' : 'text-slate-400'}`}>{sub}</div>
    </div>
  )
}

// ── Periods ───────────────────────────────────────────────────────────────────

const PERIODS = [
  { id: '1M', apiPeriod: '1M' },
  { id: '3M', apiPeriod: '3M' },
  { id: '6M', apiPeriod: '6M' },
  { id: '1J', apiPeriod: '1J' },
]
const PERIOD_DAYS = { '1M': 30, '3M': 90, '6M': 180, '1J': 365 }

// ── Main component ────────────────────────────────────────────────────────────

export default function PerformanceView({ positions, quotes }) {
  const [period,      setPeriod]      = useState('1J')
  const [currency,    setCurrency]    = useState('USD')
  const [activeChart, setActiveChart] = useState('twr')
  const [candleMap,   setCandleMap]   = useState({})
  const [loading,     setLoading]     = useState(false)

  const posKey = positions.map((p) => `${p.ticker}:${p.shares}`).join(',')

  useEffect(() => {
    if (!positions.length) return
    setLoading(true)
    const apiPeriod = PERIODS.find((p) => p.id === period)?.apiPeriod ?? '1J'
    Promise.allSettled(
      positions.map((p) => fetchPositionCandles(p.ticker, p.assetType, apiPeriod).then((d) => [p.ticker, d]))
    ).then((results) => {
      const map = {}
      results.forEach((r) => { if (r.status === 'fulfilled' && r.value[1]) map[r.value[0]] = r.value[1] })
      setCandleMap(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [posKey, period])

  const startMs = useMemo(() => {
    const days = PERIOD_DAYS[period] ?? 365
    return Date.now() - days * 24 * 60 * 60 * 1000
  }, [period])

  const timeline = useMemo(() => buildTimeline(positions, candleMap, startMs), [positions, candleMap, startMs])

  const currentPrices = useMemo(() => {
    const map = {}
    positions.forEach((p) => { map[p.ticker] = quotes[p.ticker]?.quote?.c ?? p.purchasePrice })
    return map
  }, [positions, quotes])

  const totalValue = positions.reduce((s, p) => s + p.shares * (currentPrices[p.ticker] ?? 0), 0)
  const totalCost  = positions.reduce((s, p) => s + p.shares * p.purchasePrice, 0)
  const twr = timeline.length > 1 ? (timeline[timeline.length - 1]?.twr ?? 0) : 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mwr = useMemo(() => calcMWR(positions, currentPrices), [posKey, JSON.stringify(currentPrices)])

  const dayChangeAbs = positions.reduce((s, p) => {
    const q = quotes[p.ticker]?.quote
    if (!q?.c || !q?.pc) return s
    return s + p.shares * (q.c - q.pc)
  }, 0)
  const dayChangePct = (totalValue - dayChangeAbs) > 0 ? (dayChangeAbs / (totalValue - dayChangeAbs)) * 100 : 0

  const displayValue = activeChart === 'twr' ? twr : mwr
  const isPositive   = displayValue >= 0
  const chartColor   = isPositive ? '#059669' : '#ef4444'

  return (
    <div className="flex gap-4 items-start">

      {/* ── Left sidebar ── */}
      <div className="w-60 shrink-0 space-y-3">
        <PerfCard active={activeChart === 'twr'} label="TWR" sub="Time-Weighted Return" value={twr} onClick={() => setActiveChart('twr')} />
        <PerfCard active={activeChart === 'mwr'} label="MWR" sub="Money-Weighted Return" value={mwr} onClick={() => setActiveChart('mwr')} />

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="text-slate-800 text-sm font-bold">Einstellungen</div>

          <div>
            <div className="text-slate-500 text-xs font-medium mb-2">Performance ab</div>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                    period === p.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.id}
                </button>
              ))}
            </div>
            <div className="text-slate-400 text-xs mt-1.5">ab {new Date(startMs).toLocaleDateString('de-CH')}</div>
          </div>

          <div>
            <div className="text-slate-500 text-xs font-medium mb-1.5">Währung</div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {['USD', 'EUR', 'CHF'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {currency !== 'USD' && (
              <div className="text-slate-400 text-xs mt-1">FX-Umrechnung bald verfügbar</div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            {[
              ['Portfoliowert', formatCurrency(totalValue, 0)],
              ['Investiert', formatCurrency(totalCost, 0)],
              ['G / V', formatCurrency(totalValue - totalCost, 0)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">{label}</span>
                <span className={`font-mono font-semibold ${
                  label === 'G / V'
                    ? (totalValue - totalCost >= 0 ? 'text-emerald-600' : 'text-red-500')
                    : 'text-slate-800'
                }`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main chart panel ── */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col min-h-[520px] shadow-sm">

        <div className="mb-5">
          <h2 className="text-slate-900 font-bold text-xl">
            Performance {activeChart.toUpperCase()}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium">Tagesveränderung</span>
              <span className={`font-mono font-semibold text-sm ${dayChangeAbs >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {dayChangeAbs >= 0 ? '+' : ''}{formatCurrency(dayChangeAbs, 0)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                dayChangePct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {dayChangePct >= 0 ? '+' : ''}{dayChangePct.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium">Performance {activeChart.toUpperCase()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                displayValue >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {displayValue >= 0 ? '+' : ''}{displayValue.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="text-slate-400 text-xs mt-1">
            ab {new Date(startMs).toLocaleDateString('de-CH')} · Konsolidiert in {currency}
          </div>
        </div>

        <div className="flex-1">
          {positions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Positionen hinzufügen um die Performance zu sehen
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="animate-spin w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-3" />
                <div className="text-sm font-medium">Historische Daten werden geladen…</div>
              </div>
            </div>
          ) : timeline.length < 2 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Keine historischen Daten verfügbar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 70, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#f1f5f9' }}
                  interval={Math.max(0, Math.floor(timeline.length / 7) - 1)}
                />
                <YAxis
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  orientation="right"
                />
                <Tooltip content={<PerfTooltip />} />
                <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1.5} />
                <Area
                  type="monotone"
                  dataKey="twr"
                  stroke={chartColor}
                  strokeWidth={2.5}
                  fill="url(#perfGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: chartColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-3 text-slate-300 text-xs text-right">
          Vereinfachte TWR-Berechnung · Basiert auf aktuellen Positionsbeständen
        </div>
      </div>
    </div>
  )
}
