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

export async function searchSymbol(query) {
  return get('/search', { q: query })
}

// Candles go through the serverless proxy (FINNHUB_API_KEY server-side)
export async function getCandlesForPeriod(ticker, period = '1J', assetType = 'stock') {
  const params = new URLSearchParams({ symbol: ticker, period, assetType })
  const res = await fetch(`/api/candles?${params}`)
  if (!res.ok) throw new Error(`Candles API ${res.status}`)
  return res.json()
}

export async function getFullStockData(ticker, assetType = 'stock') {
  if (assetType === 'crypto') {
    const quote = await getQuote(ticker).catch(() => null)
    return { quote, profile: null, financials: null }
  }
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
