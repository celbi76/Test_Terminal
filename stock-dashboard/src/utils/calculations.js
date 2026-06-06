export function calcReturn(currentPrice, purchasePrice) {
  if (!currentPrice || !purchasePrice) return null
  return ((currentPrice - purchasePrice) / purchasePrice) * 100
}

export function calcPositionValue(currentPrice, shares) {
  return currentPrice * shares
}

export function calcPositionCost(purchasePrice, shares) {
  return purchasePrice * shares
}

export function calcGainLoss(currentPrice, purchasePrice, shares) {
  return (currentPrice - purchasePrice) * shares
}

export function calcPortfolioTotals(positions, quotes) {
  let totalValue = 0
  let totalCost = 0

  for (const pos of positions) {
    const price = quotes[pos.ticker]?.c ?? pos.purchasePrice
    totalValue += price * pos.shares
    totalCost += pos.purchasePrice * pos.shares
  }

  return {
    totalValue,
    totalCost,
    totalGainLoss: totalValue - totalCost,
    totalReturnPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
  }
}

export function formatCurrency(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—'
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPct(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—'
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatMarketCap(value) {
  if (!value) return '—'
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`
  return `$${value.toFixed(0)}M`
}

export function getSectorColor(sector) {
  const colors = {
    'Technology': '#6366f1',
    'Health Technology': '#06b6d4',
    'Finance': '#f59e0b',
    'Consumer Cyclical': '#f97316',
    'Energy Minerals': '#84cc16',
    'Retail Trade': '#ec4899',
    'Consumer Non-Durables': '#8b5cf6',
    'Industrial Services': '#14b8a6',
    'Electronic Technology': '#3b82f6',
    'Process Industries': '#a78bfa',
  }
  return colors[sector] ?? '#64748b'
}

export function candlesToChartData(candles) {
  if (!candles || candles.s !== 'ok') return []
  return candles.t.map((ts, i) => ({
    date: new Date(ts * 1000).toLocaleDateString('de-CH', { month: 'short', day: 'numeric' }),
    price: candles.c[i],
    open: candles.o[i],
    high: candles.h[i],
    low: candles.l[i],
    volume: candles.v[i],
  }))
}
