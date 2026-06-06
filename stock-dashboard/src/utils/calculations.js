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

const SECTOR_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#eab308', // Yellow
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#e11d48', // Rose
  '#0ea5e9', // Sky
  '#d97706', // Dark Amber
]

const NAMED_COLORS = {
  'Technology': '#6366f1',
  'Electronic Technology': '#818cf8',
  'Health Technology': '#06b6d4',
  'Health Services': '#0891b2',
  'Finance': '#f59e0b',
  'Financial Services': '#d97706',
  'Consumer Cyclical': '#f97316',
  'Consumer Non-Durables': '#fb923c',
  'Retail Trade': '#ec4899',
  'Energy Minerals': '#84cc16',
  'Energy': '#65a30d',
  'Industrial Services': '#14b8a6',
  'Producer Manufacturing': '#0d9488',
  'Process Industries': '#a855f7',
  'Transportation': '#8b5cf6',
  'Utilities': '#0ea5e9',
  'Communications': '#10b981',
  'Real Estate': '#e11d48',
  'Krypto': '#f97316',
  'Unbekannt': '#64748b',
}

const sectorColorCache = new Map()

export function getSectorColor(sector) {
  if (NAMED_COLORS[sector]) return NAMED_COLORS[sector]
  if (sectorColorCache.has(sector)) return sectorColorCache.get(sector)
  const color = SECTOR_COLORS[sectorColorCache.size % SECTOR_COLORS.length]
  sectorColorCache.set(sector, color)
  return color
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
