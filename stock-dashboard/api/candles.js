const PERIOD_MAP = {
  '1M': { range: '1mo',  interval: '1d' },
  '3M': { range: '3mo',  interval: '1d' },
  '1J': { range: '1y',   interval: '1wk' },
  '5J': { range: '5y',   interval: '1mo' },
}

function toYahooSymbol(ticker, assetType) {
  if (assetType === 'crypto') {
    // BINANCE:BTCUSDT  →  BTC-USD
    const base = ticker.split(':')[1]?.replace(/USDT?$/, '') ?? ticker
    return `${base}-USD`
  }
  return ticker
}

export default async function handler(req, res) {
  const { symbol, period = '1J', assetType = 'stock' } = req.query
  if (!symbol) return res.status(400).json({ s: 'error', error: 'symbol required' })

  const yahooSymbol = toYahooSymbol(symbol, assetType)
  const { range, interval } = PERIOD_MAP[period] ?? PERIOD_MAP['1J']

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) throw new Error(`Yahoo Finance ${response.status} for ${yahooSymbol}`)

    const data = await response.json()
    const result = data?.chart?.result?.[0]
    if (!result?.timestamp) return res.json({ s: 'no_data' })

    const { timestamp: ts, indicators } = result
    const q = indicators?.quote?.[0] ?? {}

    // Filter out nulls
    const points = ts.reduce((acc, t, i) => {
      if (q.close?.[i] != null) {
        acc.push({ t, o: q.open?.[i] ?? q.close[i], h: q.high?.[i] ?? q.close[i], l: q.low?.[i] ?? q.close[i], c: q.close[i], v: q.volume?.[i] ?? 0 })
      }
      return acc
    }, [])

    if (!points.length) return res.json({ s: 'no_data' })

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
