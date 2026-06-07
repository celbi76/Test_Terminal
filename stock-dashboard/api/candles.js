const PERIOD_MAP = {
  '1M':  { range: '1mo', interval: '1d'  },
  '3M':  { range: '3mo', interval: '1d'  },
  '6M':  { range: '6mo', interval: '1d'  },
  'YTD': { range: 'ytd', interval: '1d'  },
  '1J':  { range: '1y',  interval: '1wk' },
  '5J':  { range: '5y',  interval: '1mo' },
  'ALL': { range: 'max', interval: '1mo' },
}

const EU_SUFFIXES = ['.L', '.SW', '.DE', '.PA', '.MI', '.AS']

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
}

const US_EXCHANGES = new Set([
  'NMS', 'NGM', 'NCM', 'NYQ', 'PCX', 'BTS', 'CBOE',
  'NYSE', 'NYSEARCA', 'NYSEMKT', 'NASDAQ', 'NASDAQGS', 'NASDAQCM', 'NASDAQGM',
  'AMEX', 'BATS', 'EDGX',
])

function toYahooBase(ticker, assetType) {
  if (assetType === 'crypto') {
    const base = ticker.split(':')[1]?.replace(/USDT?$/, '') ?? ticker
    return `${base}-USD`
  }
  return ticker
}

async function fetchCandles(yahooSymbol, range, interval) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`

  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return null

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result?.timestamp) return null

  // GBX (pence) → GBP
  const scale = result.meta?.currency === 'GBp' ? 0.01 : 1

  const { timestamp: ts, indicators } = result
  const q = indicators?.quote?.[0] ?? {}

  const points = ts.reduce((acc, t, i) => {
    if (q.close?.[i] != null) {
      acc.push({
        t,
        o: (q.open?.[i]   ?? q.close[i]) * scale,
        h: (q.high?.[i]   ?? q.close[i]) * scale,
        l: (q.low?.[i]    ?? q.close[i]) * scale,
        c: q.close[i] * scale,
        v: q.volume?.[i] ?? 0,
        _exchange: (result.meta?.exchange ?? '').toUpperCase().replace(/\s+/g, ''),
      })
    }
    return acc
  }, [])

  return points.length ? points : null
}

async function fetchCandlesForTicker(base, range, interval, assetType) {
  const isPlain = !base.startsWith('^') && !base.includes('.') && !base.includes('-')

  if (!isPlain) {
    return fetchCandles(base, range, interval)
  }

  if (assetType === 'etf') {
    // Try EU exchange suffixes first (VUSA.L, SEMD.L, CANCDA.SW, …)
    for (const suffix of EU_SUFFIXES) {
      const points = await fetchCandles(base + suffix, range, interval)
      if (points) return points
    }
    // Fallback for US-listed ETFs (VEU, JEPQ on NYSE/Nasdaq)
    const direct = await fetchCandles(base, range, interval)
    if (direct?.length && direct[0]._exchange && US_EXCHANGES.has(direct[0]._exchange)) return direct
    return null
  }

  // Stocks/indices: try direct, then EU suffixes
  const direct = await fetchCandles(base, range, interval)
  if (direct?.length) {
    const ex = direct[0]._exchange
    if (!ex || US_EXCHANGES.has(ex)) return direct
  }
  for (const suffix of EU_SUFFIXES) {
    const points = await fetchCandles(base + suffix, range, interval)
    if (points) return points
  }
  return null
}

export default async function handler(req, res) {
  const { symbol, period = '1J', assetType = 'stock' } = req.query
  if (!symbol) return res.status(400).json({ s: 'error', error: 'symbol required' })

  const base = toYahooBase(symbol, assetType)
  const { range, interval } = PERIOD_MAP[period] ?? PERIOD_MAP['1J']

  try {
    const points = await fetchCandlesForTicker(base, range, interval, assetType)

    if (!points?.length) return res.json({ s: 'no_data' })

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.json({
      s: 'ok',
      t: points.map((p) => p.t),
      o: points.map((p) => p.o),
      h: points.map((p) => p.h),
      l: points.map((p) => p.l),
      c: points.map((p) => p.c),
      v: points.map((p) => p.v),
    })
  } catch (e) {
    return res.status(500).json({ s: 'error', error: e.message })
  }
}
