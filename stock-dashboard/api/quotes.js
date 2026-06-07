const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
}

// Exchange suffix fallback order for European ETFs
const EU_SUFFIXES = ['.L', '.SW', '.DE', '.PA', '.MI', '.AS']

function toYahooBase(ticker) {
  if (ticker.includes(':')) {
    // BINANCE:BTCUSDT → BTC-USD
    const base = ticker.split(':')[1]?.replace(/USDT?$/, '') ?? ticker
    return `${base}-USD`
  }
  return ticker
}

async function fetchYahooChart(yahooSymbol, requireExchange) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
    `?interval=1d&range=5d&includePrePost=false`

  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return null

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) return null

  const meta   = result.meta ?? {}
  const closes = result.indicators?.quote?.[0]?.close ?? []

  // If caller wants a real exchange (not OTC/Pink Sheets), reject OTC results
  // so the EU suffix loop can try exchange-suffixed symbols instead
  if (requireExchange) {
    const exchange = (meta.exchange ?? meta.exchangeName ?? '').toUpperCase()
    const isOTC = exchange === '' || exchange === 'OTC' || exchange === 'PNK' || exchange === 'GREY'
    if (isOTC) return null
  }

  const c  = meta.regularMarketPrice ?? closes.filter(Boolean).at(-1) ?? null
  if (c == null) return null   // no usable price → signal caller to try next suffix

  const pc = meta.previousClose ?? meta.chartPreviousClose ?? closes.filter(Boolean).at(-2) ?? null
  const d  = pc != null ? parseFloat((c - pc).toFixed(4)) : null
  const dp = pc != null && pc !== 0 ? parseFloat(((c - pc) / pc * 100).toFixed(4)) : null

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

async function fetchOne(originalTicker) {
  const base = toYahooBase(originalTicker)

  // For tickers with no suffix/dash, try with requireExchange=true first to avoid
  // OTC/Pink Sheet matches (e.g. bare "VUSA" might resolve to an OTC shell)
  const needsFallback = !base.includes('.') && !base.includes('-')

  // 1. Try as stored (handles US tickers, crypto, and already-suffixed tickers)
  const direct = await fetchYahooChart(base, needsFallback)
  if (direct) return direct

  // 2. If plain ticker (no suffix), try European exchange suffixes
  if (needsFallback) {
    for (const suffix of EU_SUFFIXES) {
      const result = await fetchYahooChart(base + suffix, false)
      if (result) return result
    }
  }

  return null
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
