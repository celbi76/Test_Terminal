import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import { formatCurrency, formatPct } from '../utils/calculations'

function buildHistory(positions, quotes) {
  if (!positions.length) return []

  const now = Date.now()
  const datedPositions = positions.filter((p) => p.purchaseDate)
  if (!datedPositions.length) return []

  const earliest = Math.min(...datedPositions.map((p) => new Date(p.purchaseDate).getTime()))
  const totalMs = now - earliest
  if (totalMs <= 0) return []

  // Generate up to 60 evenly-spaced data points
  const steps = Math.min(60, Math.ceil(totalMs / (1000 * 60 * 60 * 24)))
  const stepMs = totalMs / steps

  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = earliest + stepMs * i
    const date = new Date(t)
    const label = date.toLocaleDateString('de-CH', {
      day: 'numeric', month: 'short',
      ...(date.getFullYear() !== new Date().getFullYear() ? { year: '2-digit' } : {}),
    })

    let wert = 0
    let investiert = 0

    for (const pos of datedPositions) {
      const bought = new Date(pos.purchaseDate).getTime()
      if (t < bought) continue

      const currentPrice = quotes[pos.ticker]?.quote?.c ?? pos.purchasePrice
      const elapsed = Math.min(1, (t - bought) / Math.max(1, now - bought))
      const price = pos.purchasePrice + (currentPrice - pos.purchasePrice) * elapsed

      wert += price * pos.shares
      investiert += pos.purchasePrice * pos.shares
    }

    return { label, wert: Math.round(wert), investiert: Math.round(investiert) }
  }).filter((d) => d.wert > 0)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const wert = payload.find((p) => p.dataKey === 'wert')?.value
  const inv = payload.find((p) => p.dataKey === 'investiert')?.value
  const gainLoss = wert != null && inv != null ? wert - inv : null

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1.5">{label}</div>
      {wert != null && <div className="flex justify-between gap-6"><span className="text-slate-400">Wert</span><span className="text-white font-bold">{formatCurrency(wert, 0)}</span></div>}
      {inv != null && <div className="flex justify-between gap-6"><span className="text-slate-400">Investiert</span><span className="text-slate-300">{formatCurrency(inv, 0)}</span></div>}
      {gainLoss != null && (
        <div className={`flex justify-between gap-6 mt-1 pt-1 border-t border-slate-700 font-medium ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <span>G/V</span>
          <span>{gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, 0)}</span>
        </div>
      )}
    </div>
  )
}

export default function PortfolioChart({ positions, quotes }) {
  const data = buildHistory(positions, quotes)
  if (data.length < 2) return null

  const firstInv = data[0]?.investiert ?? 0
  const lastWert = data[data.length - 1]?.wert ?? 0
  const lastInv = data[data.length - 1]?.investiert ?? 0
  const totalReturn = lastInv > 0 ? ((lastWert - lastInv) / lastInv) * 100 : 0
  const isPositive = totalReturn >= 0

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">Portfolio-Performance</h3>
          <div className="text-slate-500 text-xs mt-0.5">Modellbasiert · seit erstem Kauf</div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatPct(totalReturn)}
          </div>
          <div className={`text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{formatCurrency(lastWert - lastInv, 0)}
          </div>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradWert" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={firstInv} stroke="#334155" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="investiert" stroke="#334155" strokeWidth={1.5} fill="none" strokeDasharray="4 3" dot={false} name="Investiert" />
            <Area type="monotone" dataKey="wert" stroke={isPositive ? '#10b981' : '#ef4444'} strokeWidth={2} fill="url(#gradWert)" dot={false} name="Portfoliowert" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-position return bars */}
      {positions.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-slate-500 text-xs mb-2 uppercase tracking-wide">Einzelne Positionen</div>
          {positions.map((pos) => {
            const currentPrice = quotes[pos.ticker]?.quote?.c ?? pos.purchasePrice
            const ret = pos.purchasePrice > 0 ? ((currentPrice - pos.purchasePrice) / pos.purchasePrice) * 100 : 0
            const displayTicker = pos.assetType === 'crypto'
              ? pos.ticker.split(':')[1]?.replace('USDT', '') ?? pos.ticker
              : pos.ticker
            const barWidth = Math.min(100, Math.abs(ret) * 2)

            return (
              <div key={pos.id} className="flex items-center gap-3">
                <div className="text-white text-xs font-medium w-14 shrink-0">{displayTicker}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${ret >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${barWidth}%`, marginLeft: ret < 0 ? `${100 - barWidth}%` : '0' }}
                    />
                  </div>
                  <div className={`text-xs font-mono w-16 text-right shrink-0 ${ret >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
