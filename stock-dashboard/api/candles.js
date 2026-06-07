const PERIOD_MAP = {
  '1M': { range: '1mo', interval: '1d'  },
  '3M': { range: '3mo', interval: '1d'  },
  '6M': { range: '6mo', interval: '1d'  },
  '1J': { range: '1y',  interval: '1wk' },
  '5J': { range: '5y',  interval: '1mo' },
}

const EU_SUFFIXES = ['.L', '.SW', '.DE', '.PA', '.MI', '.AS']

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
}

function toYahooBase(ticker, assetType) {
  if (assetType === 'crypto') {
    // BINANCE:BTCUSDT → BTC-USD
    const base = ticker.split(':')[1]?.replace(/USDT?$/, '') ?? ticker
    return `${base}-USD`
  }
  return ticker
}

async function fetchCandles(yahooSymbol, range, interval, requireExchange = false) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`

  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return null

  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result?.timestamp) return null

  // Reject OTC/Pink-Sheet results so the EU suffix loop can try real exchanges
  if (requireExchange) {
    const exchange = (result.meta?.exchange ?? result.meta?.exchangeName ?? '').toUpperCase()
    if (exchange === 'OTC' || exchange === 'PNK' || exchange === 'GREY') return null
  }

  const { timestamp: ts, indicators } = result
  const q = indicators?.quote?.[0] ?? {}

  const points = ts.reduce((acc, t, i) => {
    if (q.close?.[i] != null) {
      acc.push({
        t,
        o: q.open?.[i]   ?? q.close[i],
        h: q.high?.[i]   ?? q.close[i],
        l: q.low?.[i]    ?? q.close[i],
        c: q.close[i],
        v: q.volume?.[i] ?? 0,
      })
    }
    return acc
  }, [])

  return points.length ? points : null
}

export default async function handler(req, res) {
  const { symbol, period = '1J', assetType = 'stock' } = req.query
  if (!symbol) return res.status(400).json({ s: 'error', error: 'symbol required' })

  const base = toYahooBase(symbol, assetType)
  const { range, interval } = PERIOD_MAP[period] ?? PERIOD_MAP['1J']

  // For plain tickers (no suffix/dash), require a real exchange to avoid OTC shells
  const needsFallback = !base.includes('.') && !base.includes('-')

  try {
    let points = await fetchCandles(base, range, interval, needsFallback)

    if (!points && needsFallback) {
      for (const suffix of EU_SUFFIXES) {
        points = await fetchCandles(base + suffix, range, interval, false)
        if (points) break
      }
    }

    if (!points) return res.json({ s: 'no_data' })

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
