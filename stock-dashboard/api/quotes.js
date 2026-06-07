function toYahooSymbol(ticker) {
  if (ticker.includes(':')) {
    // BINANCE:BTCUSDT → BTC-USD
    const base = ticker.split(':')[1]?.replace(/USDT?$/, '') ?? ticker
    return `${base}-USD`
  }
  return ticker
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
}

async function fetchOne(originalTicker) {
  const yahoo = toYahooSymbol(originalTicker)
  // Same v8 chart endpoint used by candles.js — known to work
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}` +
    `?interval=1d&range=5d&includePrePost=false`

  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${yahoo}`)

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) return null

  const meta   = result.meta ?? {}
  const closes = result.indicators?.quote?.[0]?.close ?? []

  // Use meta.regularMarketPrice as primary, fall back to last valid candle close
  const c  = meta.regularMarketPrice ?? closes.filter(Boolean).at(-1) ?? null
  const pc = meta.previousClose ?? meta.chartPreviousClose ?? closes.filter(Boolean).at(-2) ?? null
  const d  = c != null && pc != null ? parseFloat((c - pc).toFixed(4)) : null
  const dp = c != null && pc != null && pc !== 0
    ? parseFloat(((c - pc) / pc * 100).toFixed(4))
    : null

  return {
    c,
    d,
    dp,
    h:  meta.regularMarketDayHigh ?? null,
    l:  meta.regularMarketDayLow  ?? null,
    o:  meta.regularMarketOpen    ?? null,
    pc,
  }
}

export default async function handler(req, res) {
  const { symbols } = req.query
  if (!symbols) return res.status(400).json({ s: 'error', error: 'symbols required' })

  const original = symbols.split(',').map((s) => s.trim()).filter(Boolean)
  if (!original.length) return res.status(400).json({ s: 'error', error: 'no symbols' })

  const settled = await Promise.allSettled(original.map(fetchOne))

  const quotes = {}
  original.forEach((sym, i) => {
    if (settled[i].status === 'fulfilled' && settled[i].value) {
      quotes[sym] = settled[i].value
    }
  })

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  return res.json({ s: 'ok', quotes })
}
