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

async function fetchYahooChart(yahooSymbol) {
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

  const c  = meta.regularMarketPrice ?? closes.filter(Boolean).at(-1) ?? null
  if (c == null) return null   // no usable price → signal caller to try next suffix

  const pc = meta.previousClose ?? meta.chartPreviousClose ?? closes.filter(Boolean).at(-2) ?? null
  const d  = pc != null ? parseFloat((c - pc).toFixed(4)) : null
  const dp = pc != null && pc !== 0 ? parseFloat(((c - pc) / pc * 100).toFixed(4)) : null

  const rawExchange = (meta.exchange ?? meta.exchangeName ?? '').toUpperCase().replace(/\s+/g, '')

  return {
    c,
    d,
    dp,
    h:  meta.regularMarketDayHigh ?? null,
    l:  meta.regularMarketDayLow  ?? null,
    o:  meta.regularMarketOpen    ?? null,
    pc,
    _exchange: rawExchange || null,
  }
}

// Known US stock exchanges — only accept bare tickers that resolve to these
const US_EXCHANGES = new Set([
  'NMS', 'NGM', 'NCM', 'NYQ', 'PCX', 'BTS', 'CBOE',
  'NYSE', 'NYSEARCA', 'NYSEMKT', 'NASDAQ', 'NASDAQGS', 'NASDAQCM', 'NASDAQGM',
  'AMEX', 'BATS', 'EDGX',
])

async function fetchOne(originalTicker, assetType = 'stock') {
  const base = toYahooBase(originalTicker)

  // Indices (^ prefix) and already-suffixed/crypto tickers are fetched as-is
  const isPlain = !base.startsWith('^') && !base.includes('.') && !base.includes('-')

  if (!isPlain) {
    return fetchYahooChart(base)
  }

  // For ETFs, skip the bare US ticker entirely and go straight to EU exchange suffixes.
  // EU ETFs share ticker names with obscure US OTC shells so the bare fetch is unreliable.
  if (assetType === 'etf') {
    for (const suffix of EU_SUFFIXES) {
      const result = await fetchYahooChart(base + suffix, false)
      if (result) return result
    }
    return null
  }

  // For stocks: try bare ticker but only accept if it resolves to a known US exchange
  const direct = await fetchYahooChart(base, false)
  if (direct?._exchange && US_EXCHANGES.has(direct._exchange)) return direct
  if (direct && !direct?._exchange) return direct  // US tickers with no exchange field still accepted

  // Fall through to EU suffixes (catches European stocks stored without suffix)
  for (const suffix of EU_SUFFIXES) {
    const result = await fetchYahooChart(base + suffix, false)
    if (result) return result
  }

  return null
}

export default async function handler(req, res) {
  const { symbols } = req.query
  if (!symbols) return res.status(400).json({ s: 'error', error: 'symbols required' })

  // Each symbol may be encoded as "TICKER:assetType" (e.g. "VUSA:etf", "AAPL:stock")
  // Plain ticker strings default to 'stock'
  const parsed = symbols.split(',').map((s) => {
    const trimmed = s.trim()
    const colonIdx = trimmed.lastIndexOf(':')
    // ":" appears in BINANCE:BTCUSDT — only treat last segment as assetType if it's a known type
    const knownTypes = new Set(['stock', 'etf', 'crypto'])
    if (colonIdx > 0) {
      const maybeType = trimmed.slice(colonIdx + 1)
      if (knownTypes.has(maybeType)) {
        return { ticker: trimmed.slice(0, colonIdx), assetType: maybeType }
      }
    }
    return { ticker: trimmed, assetType: 'stock' }
  }).filter((p) => p.ticker)

  if (!parsed.length) return res.status(400).json({ s: 'error', error: 'no symbols' })

  const settled = await Promise.allSettled(parsed.map(({ ticker, assetType }) => fetchOne(ticker, assetType)))

  const quotes = {}
  parsed.forEach(({ ticker }, i) => {
    const val = settled[i].status === 'fulfilled' ? settled[i].value : null
    if (val) {
      const { _exchange: _, ...rest } = val
      quotes[ticker] = rest
    }
  })

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  return res.json({ s: 'ok', quotes })
}
