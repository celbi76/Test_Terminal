import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatCurrency, formatPct } from '../utils/calculations'

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchPositionCandles(ticker, assetType, period) {
  const params = new URLSearchParams({ symbol: ticker, period, assetType: assetType ?? 'stock' })
  const res = await fetch(`/api/candles?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.s !== 'ok') return null
  return data.t.map((t, i) => ({ t: t * 1000, c: data.c[i] }))
}

// ── MWR (IRR) ─────────────────────────────────────────────────────────────────

function calcMWR(positions, currentPrices) {
  if (!positions.length) return null
  const hasDates = positions.some((p) => p.purchaseDate)
  const invested = positions.reduce((s, p) => s + p.shares * p.purchasePrice, 0)
  const current  = positions.reduce((s, p) => s + p.shares * (currentPrices[p.ticker] ?? p.purchasePrice), 0)
  if (!invested) return null

  if (!hasDates) {
    return ((current - invested) / invested) * 100
  }

  const today = Date.now()
  const t0 = Math.min(...positions.map((p) => p.purchaseDate ? new Date(p.purchaseDate).getTime() : today))
  const tT = (today - t0) / (365.25 * 24 * 60 * 60 * 1000)
  if (tT < 0.01) return ((current - invested) / invested) * 100

  const flows = positions.map((p) => ({
    years:  (( p.purchaseDate ? new Date(p.purchaseDate).getTime() : t0) - t0) / (365.25 * 24 * 60 * 60 * 1000),
    amount: -(p.shares * p.purchasePrice),
  }))

  const npv  = (r) => { let v = current / Math.pow(1 + r, tT); flows.forEach((f) => { v += f.amount / Math.pow(1 + r, Math.max(0, f.years)) }); return v }
  const dnpv = (r) => { let d = -(tT * current) / Math.pow(1 + r, tT + 1); flows.forEach((f) => { if (f.years > 0) d -= (f.years * f.amount) / Math.pow(1 + r, f.years + 1) }); return d }

  let r = 0.1
  for (let i = 0; i < 60; i++) {
    const n = npv(r), d = dnpv(r)
    if (Math.abs(n) < 0.01 || !d || !isFinite(d)) break
    const next = r - n / d
    if (!isFinite(next) || Math.abs(next - r) < 1e-9) break
    r = Math.max(-0.99, Math.min(50, next))
  }
  return isFinite(r) ? r * 100 : null
}

// ── Timeline builder ──────────────────────────────────────────────────────────

function buildTimeline(positions, candleMap, startMs) {
  const dateSet = new Set()
  positions.forEach((p) => {
    ;(candleMap[p.ticker] ?? []).forEach((c) => {
      if (!startMs || c.t >= startMs) dateSet.add(c.t)
    })
  })
  const dates = [...dateSet].sort((a, b) => a - b)
  if (dates.length < 2) return []

  const lastKnown = {}
  const raw = dates.map((ts) => {
    let value = 0
    positions.forEach((p) => {
      const candles = candleMap[p.ticker] ?? []
      // Binary search for last candle <= ts
      let lo = 0, hi = candles.length - 1, idx = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (candles[mid].t <= ts) { idx = mid; lo = mid + 1 } else hi = mid - 1
      }
      if (idx >= 0) lastKnown[p.ticker] = candles[idx].c
      value += p.shares * (lastKnown[p.ticker] ?? p.purchasePrice)
    })
    return { ts, value }
  })

  const base = raw[0].value || 1
  return raw.map((d, i) => ({
    date:  i === 0
      ? new Date(d.ts).toLocaleDateString('de-CH', { month: 'short', day: 'numeric', year: '2-digit' })
      : new Date(d.ts).toLocaleDateString('de-CH', { month: 'short', day: 'numeric' }),
    ts:    d.ts,
    value: d.value,
    twr:   parseFloat(((d.value / base - 1) * 100).toFixed(3)),
  }))
}

// ── Periods ───────────────────────────────────────────────────────────────────

const PERIODS = [
  { id: '1M',  label: '1M',  apiPeriod: '1M'  },
  { id: '3M',  label: '3M',  apiPeriod: '3M'  },
  { id: 'YTD', label: 'YTD', apiPeriod: 'YTD' },
  { id: '1J',  label: '1J',  apiPeriod: '1J'  },
  { id: '5J',  label: '5J',  apiPeriod: '5J'  },
]

function getStartMs(period) {
  if (period === 'YTD') return new Date(new Date().getFullYear(), 0, 1).getTime()
  if (period === '5J')  return 0
  const days = { '1M': 30, '3M': 90, '6M': 180, '1J': 365 }
  return days[period] ? Date.now() - days[period] * 24 * 60 * 60 * 1000 : 0
}

function periodLabel(period, startMs) {
  if (period === 'YTD') return `ab 1. Jan ${new Date().getFullYear()}`
  if (period === '5J')  return 'letzte 5 Jahre'
  if (!startMs) return ''
  return `ab ${new Date(startMs).toLocaleDateString('de-CH')}`
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
      <div className="text-slate-600 font-medium mt-0.5">{formatCurrency(d.value, 0)}</div>
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, sub, value, loading }) {
  const isUp = (value ?? 0) >= 0
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-slate-500 text-xs font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${loading ? 'text-slate-200 animate-pulse' : isUp ? 'text-emerald-600' : 'text-red-500'}`}>
        {value == null ? '—' : `${isUp ? '+' : ''}${value.toFixed(2)}%`}
      </div>
      <div className="text-slate-400 text-xs mt-0.5">{sub}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PerformanceView({ positions, quotes }) {
  const [period,    setPeriod]    = useState('1J')
  const [currency,  setCurrency]  = useState('USD')
  const [candleMap, setCandleMap] = useState({})
  const [loading,   setLoading]   = useState(false)

  const posKey = positions.map((p) => `${p.ticker}:${p.shares}`).join(',')

  // Fetch candles for all positions when period or positions change
  useEffect(() => {
    if (!positions.length) return
    setLoading(true)
    const apiPeriod = PERIODS.find((p) => p.id === period)?.apiPeriod ?? '1J'
    Promise.allSettled(
      positions.map((p) =>
        fetchPositionCandles(p.ticker, p.assetType, apiPeriod).then((d) => [p.ticker, d])
      )
    ).then((results) => {
      const map = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value[1]) map[r.value[0]] = r.value[1]
      })
      setCandleMap(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [posKey, period]) // eslint-disable-line react-hooks/exhaustive-deps

  const startMs  = useMemo(() => getStartMs(period), [period])
  const timeline = useMemo(() => buildTimeline(positions, candleMap, startMs), [positions, candleMap, startMs])

  const currentPrices = useMemo(() => {
    const map = {}
    positions.forEach((p) => { map[p.ticker] = quotes[p.ticker]?.quote?.c ?? p.purchasePrice })
    return map
  }, [positions, quotes])

  const totalValue = positions.reduce((s, p) => s + p.shares * (currentPrices[p.ticker] ?? 0), 0)
  const totalCost  = positions.reduce((s, p) => s + p.shares * p.purchasePrice, 0)
  const totalGL    = totalValue - totalCost
  const totalGLPct = totalCost > 0 ? (totalGL / totalCost) * 100 : 0

  const twr = timeline.length > 1 ? (timeline[timeline.length - 1]?.twr ?? 0) : null
  const mwr = useMemo(
    () => calcMWR(positions, currentPrices),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posKey, JSON.stringify(currentPrices)]
  )

  const dayChangeAbs = positions.reduce((s, p) => {
    const q = quotes[p.ticker]?.quote
    return (q?.c && q?.pc) ? s + p.shares * (q.c - q.pc) : s
  }, 0)
  const prevValue  = totalValue - dayChangeAbs
  const dayChangePct = prevValue > 0 ? (dayChangeAbs / prevValue) * 100 : 0

  const chartColor = (twr ?? 0) >= 0 ? '#059669' : '#ef4444'
  const hasData    = timeline.length >= 2

  return (
    <div className="space-y-4">

      {/* ── Metric row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="TWR (Zeitraum)"
          sub={periodLabel(period, startMs)}
          value={twr}
          loading={loading}
        />
        <MetricCard
          label="MWR (Gesamt)"
          sub="Money-Weighted Return"
          value={mwr}
          loading={loading}
        />
        <MetricCard
          label="Tagesveränderung"
          sub={`${dayChangeAbs >= 0 ? '+' : ''}${formatCurrency(dayChangeAbs, 0)}`}
          value={dayChangePct}
        />
        <MetricCard
          label="Gesamtrendite"
          sub={`${totalGL >= 0 ? '+' : ''}${formatCurrency(totalGL, 0)}`}
          value={totalGLPct}
        />
      </div>

      {/* ── Chart panel ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Chart header + period controls */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 font-bold text-lg">Portfolio-Performance</h2>
            <div className="text-slate-400 text-xs mt-0.5">
              {periodLabel(period, startMs)} · Konsolidiert in {currency}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                    period === p.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-xs bg-white border border-slate-200 text-slate-600 rounded-lg px-2 py-1.5 focus:outline-none"
            >
              {['USD', 'EUR', 'CHF'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Chart area */}
        <div className="h-80 px-2 py-4">
          {positions.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <div className="text-4xl mb-3">📊</div>
                <div className="text-sm">Positionen hinzufügen um die Performance zu sehen</div>
              </div>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-100 border-t-indigo-600 rounded-full mx-auto mb-3" />
                <div className="text-slate-400 text-sm">Historische Daten werden geladen…</div>
              </div>
            </div>
          ) : !hasData ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <div className="text-3xl mb-2">📉</div>
                <div className="text-sm font-medium">Keine Kursdaten für diesen Zeitraum</div>
                <div className="text-xs mt-1">ETF-Kurse werden über Börsenplatz-Erkennung geladen</div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 8, right: 64, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
                  width={62}
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

        {/* Footer note */}
        <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-slate-400 text-xs">
            Vereinfachte TWR-Berechnung auf Basis aktueller Positionsbestände
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-slate-500">Wert: <span className="font-mono font-semibold text-slate-700">{formatCurrency(totalValue, 0)}</span></span>
            <span className="text-slate-500">Investiert: <span className="font-mono font-semibold text-slate-700">{formatCurrency(totalCost, 0)}</span></span>
          </div>
        </div>
      </div>

      {/* ── Per-position breakdown ── */}
      {positions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-800 font-semibold text-sm">Positionen im Zeitraum</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-2.5 font-semibold text-left">Titel</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Kaufkurs</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Aktuell</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Wert</th>
                  <th className="px-4 py-2.5 font-semibold text-right">G/V</th>
                  <th className="px-4 py-2.5 font-semibold text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {[...positions].sort((a, b) => {
                  const aVal = (currentPrices[a.ticker] ?? a.purchasePrice) * a.shares
                  const bVal = (currentPrices[b.ticker] ?? b.purchasePrice) * b.shares
                  return bVal - aVal
                }).map((pos) => {
                  const cur  = currentPrices[pos.ticker] ?? pos.purchasePrice
                  const val  = cur * pos.shares
                  const cost = pos.purchasePrice * pos.shares
                  const gl   = val - cost
                  const pct  = cost > 0 ? (gl / cost) * 100 : 0
                  const label = pos.assetType === 'crypto'
                    ? pos.ticker.split(':')[1]?.replace('USDT', '') ?? pos.ticker
                    : pos.ticker
                  return (
                    <tr key={pos.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{label}</span>
                          {pos.assetType === 'etf'    && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-semibold">ETF</span>}
                          {pos.assetType === 'crypto' && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-semibold">Crypto</span>}
                        </div>
                        <div className="text-slate-400 text-xs">{pos.shares} Stk.</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">{formatCurrency(pos.purchasePrice)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 font-medium text-xs">{formatCurrency(cur)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 text-xs">{formatCurrency(val, 0)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-medium text-xs ${gl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {gl >= 0 ? '+' : ''}{formatCurrency(gl, 0)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold text-xs ${pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
