function toYahooSymbol(ticker) {
  if (ticker.includes(':')) {
    // BINANCE:BTCUSDT → BTC-USD
    const base = ticker.split(':')[1]?.replace(/USDT?$/, '') ?? ticker
    return `${base}-USD`
  }
  return ticker
}

export default async function handler(req, res) {
  const { symbols } = req.query
  if (!symbols) return res.status(400).json({ s: 'error', error: 'symbols required' })

  const original = symbols.split(',').map((s) => s.trim()).filter(Boolean)
  if (!original.length) return res.status(400).json({ s: 'error', error: 'no symbols' })

  const yahooSymbols = original.map(toYahooSymbol)
  const url =
    `https://query1.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(yahooSymbols.join(','))}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketDayHigh,regularMarketDayLow,regularMarketOpen,regularMarketPreviousClose`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) throw new Error(`Yahoo Finance ${response.status}`)

    const data = await response.json()
    const list = data?.quoteResponse?.result ?? []

    const quotes = {}
    original.forEach((sym, i) => {
      const q = list.find((r) => r.symbol === yahooSymbols[i])
      if (q) {
        quotes[sym] = {
          c:  q.regularMarketPrice          ?? null,
          d:  q.regularMarketChange         ?? null,
          dp: q.regularMarketChangePercent  ?? null,
          h:  q.regularMarketDayHigh        ?? null,
          l:  q.regularMarketDayLow         ?? null,
          o:  q.regularMarketOpen           ?? null,
          pc: q.regularMarketPreviousClose  ?? null,
        }
      }
    })

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.json({ s: 'ok', quotes })
  } catch (e) {
    return res.status(500).json({ s: 'error', error: e.message })
  }
}
