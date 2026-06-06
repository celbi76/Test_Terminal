const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY
const BASE = 'https://finnhub.io/api/v1'

async function get(path, params = {}) {
  const url = new URL(BASE + path)
  url.searchParams.set('token', FINNHUB_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${path}`)
  return res.json()
}

export async function getQuote(ticker) {
  return get('/quote', { symbol: ticker })
}

export async function getCompanyProfile(ticker) {
  return get('/stock/profile2', { symbol: ticker })
}

export async function getBasicFinancials(ticker) {
  return get('/stock/metric', { symbol: ticker, metric: 'all' })
}

export async function getCandles(ticker, resolution = 'D', from, to) {
  const now = Math.floor(Date.now() / 1000)
  const fromTs = from ?? now - 365 * 24 * 3600
  return get('/stock/candle', { symbol: ticker, resolution, from: fromTs, to: to ?? now })
}

export async function searchSymbol(query) {
  return get('/search', { q: query })
}

export async function getMarketStatus() {
  return get('/stock/market-status', { exchange: 'US' })
}

const PERIODS = {
  '1M': { resolution: 'D', days: 30 },
  '3M': { resolution: 'D', days: 90 },
  '1J': { resolution: 'W', days: 365 },
  '5J': { resolution: 'M', days: 365 * 5 },
}

export async function getCandlesForPeriod(ticker, period) {
  const { resolution, days } = PERIODS[period] ?? PERIODS['1J']
  const now = Math.floor(Date.now() / 1000)
  const from = now - days * 24 * 3600
  return getCandles(ticker, resolution, from, now)
}

export async function getFullStockData(ticker) {
  const [quote, profile, financials] = await Promise.allSettled([
    getQuote(ticker),
    getCompanyProfile(ticker),
    getBasicFinancials(ticker),
  ])

  return {
    quote: quote.status === 'fulfilled' ? quote.value : null,
    profile: profile.status === 'fulfilled' ? profile.value : null,
    financials: financials.status === 'fulfilled' ? financials.value?.metric ?? null : null,
  }
}
