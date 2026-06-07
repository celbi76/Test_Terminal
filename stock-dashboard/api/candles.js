const PERIODS = {
  '1M': { resolution: 'D', days: 30 },
  '3M': { resolution: 'D', days: 90 },
  '1J': { resolution: 'D', days: 365 },
  '5J': { resolution: 'W', days: 365 * 5 },
}

async function fetchCandles(symbol, resolution, from, to, isCrypto, key) {
  const endpoint = isCrypto ? '/crypto/candle' : '/stock/candle'
  const url = `https://finnhub.io/api/v1${endpoint}?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub ${res.status}`)
  return res.json()
}

export default async function handler(req, res) {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return res.status(500).json({ s: 'error', error: 'FINNHUB_API_KEY not configured' })

  const { symbol, period = '1J', assetType = 'stock' } = req.query
  if (!symbol) return res.status(400).json({ s: 'error', error: 'symbol required' })

  const { resolution, days } = PERIODS[period] ?? PERIODS['1J']
  const now = Math.floor(Date.now() / 1000)
  const from = now - days * 24 * 3600
  const isCrypto = assetType === 'crypto'

  try {
    let data = await fetchCandles(symbol, resolution, from, now, isCrypto, key)

    // Fallback: try daily if weekly/monthly returns no data
    if (data.s === 'no_data' && resolution !== 'D') {
      data = await fetchCandles(symbol, 'D', from, now, isCrypto, key)
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.json(data)
  } catch (e) {
    return res.status(500).json({ s: 'error', error: e.message })
  }
}
