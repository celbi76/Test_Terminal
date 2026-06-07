const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
}

const EU_SUFFIXES = ['.L', '.SW', '.DE', '.PA', '.MI', '.AS']

// Known US exchange codes from Yahoo Finance
const US_EXCHANGES = new Set([
  'NMS', 'NGM', 'NCM', 'NYQ', 'PCX', 'BTS', 'CBOE',
  'NYSE', 'NYSEARCA', 'NYSEMKT', 'NASDAQ', 'NASDAQGS', 'NASDAQCM', 'NASDAQGM',
  'AMEX', 'BATS', 'EDGX',
])

function toYahooBase(ticker) {
  if (ticker.includes(':')) {
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

  // GBX (pence) → GBP: Yahoo uses currency 'GBp' for pence-denominated instruments
  const scale = (meta.currency === 'GBp') ? 0.01 : 1

  const c  = (meta.regularMarketPrice ?? closes.filter(Boolean).at(-1) ?? null)
  if (c == null) return null

  const rawC  = c  * scale
  const pc    = (meta.previousClose ?? meta.chartPreviousClose ?? closes.filter(Boolean).at(-2) ?? null)
  const rawPc = pc != null ? pc * scale : null
  const d     = rawPc != null ? parseFloat((rawC - rawPc).toFixed(4)) : null
  const dp    = rawPc != null && rawPc !== 0 ? parseFloat(((rawC - rawPc) / rawPc * 100).toFixed(4)) : null

  const rawExchange = (meta.exchange ?? meta.exchangeName ?? '').toUpperCase().replace(/\s+/g, '')

  return {
    c:  rawC,
    d,
    dp,
    h:  meta.regularMarketDayHigh  != null ? meta.regularMarketDayHigh  * scale : null,
    l:  meta.regularMarketDayLow   != null ? meta.regularMarketDayLow   * scale : null,
    o:  meta.regularMarketOpen     != null ? meta.regularMarketOpen     * scale : null,
    pc: rawPc,
    _exchange: rawExchange || null,
  }
}

async function fetchOne(originalTicker, assetType = 'stock') {
  const base = toYahooBase(originalTicker)

  // Indices, crypto (has dash/colon), already-suffixed: fetch as-is
  const isPlain = !base.startsWith('^') && !base.includes('.') && !base.includes('-')

  if (!isPlain) {
    return fetchYahooChart(base)
  }

  if (assetType === 'etf') {
    // EU-listed ETFs (VUSA.L, SEMD.L, VHYL.L, CANCDA.SW …): try exchange suffixes first
    for (const suffix of EU_SUFFIXES) {
      const result = await fetchYahooChart(base + suffix)
      if (result) return result
    }
    // Fallback: US-listed ETFs (VEU, JEPQ on NYSE/Nasdaq) — only accept known US exchanges
    const direct = await fetchYahooChart(base)
    if (direct?._exchange && US_EXCHANGES.has(direct._exchange)) {
      const { _exchange: _, ...rest } = direct
      return rest
    }
    return null
  }

  // Stocks: try bare ticker, accept only known US exchanges; fall through to EU suffixes
  const direct = await fetchYahooChart(base)
  if (direct?._exchange && US_EXCHANGES.has(direct._exchange)) return direct
  if (direct && !direct._exchange) return direct  // some US tickers have empty exchange field

  for (const suffix of EU_SUFFIXES) {
    const result = await fetchYahooChart(base + suffix)
    if (result) return result
  }

  return null
}

export default async function handler(req, res) {
  const { symbols } = req.query
  if (!symbols) return res.status(400).json({ s: 'error', error: 'symbols required' })

  // Symbols encoded as "TICKER:assetType" — but BINANCE:BTCUSDT also contains ":"
  // so only treat the last segment as assetType if it's a known keyword
  const knownTypes = new Set(['stock', 'etf', 'crypto'])
  const parsed = symbols.split(',').map((s) => {
    const trimmed = s.trim()
    const colonIdx = trimmed.lastIndexOf(':')
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
