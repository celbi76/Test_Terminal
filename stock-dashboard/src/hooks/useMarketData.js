import { useState, useEffect, useCallback, useRef } from 'react'
import { getFullStockData, getCandlesForPeriod } from '../services/marketApi'

const cache = new Map()
const CACHE_TTL = 60_000

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function useStockData(ticker, assetType = 'stock') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!ticker) return
    const key = `${ticker}-${assetType}`
    const cached = getCached(key)
    if (cached) { setData(cached); return }

    setLoading(true)
    setError(null)
    try {
      const result = await getFullStockData(ticker, assetType)
      cache.set(key, { data: result, ts: Date.now() })
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [ticker, assetType])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useMultiQuotes(positions) {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const prevKey = useRef('')

  // Accept either array of tickers (legacy) or array of position objects
  const normalized = positions.map((p) =>
    typeof p === 'string' ? { ticker: p, assetType: 'stock' } : p
  )

  const key = normalized.map((p) => `${p.ticker}:${p.assetType}`).sort().join(',')

  useEffect(() => {
    if (!normalized.length) return
    if (key === prevKey.current) return
    prevKey.current = key

    setLoading(true)
    Promise.allSettled(normalized.map((p) => getFullStockData(p.ticker, p.assetType))).then((results) => {
      const newQuotes = {}
      normalized.forEach((p, i) => {
        if (results[i].status === 'fulfilled') {
          newQuotes[p.ticker] = results[i].value
        }
      })
      setQuotes(newQuotes)
      setLoading(false)
    })
  }, [key])

  return { quotes, loading }
}

export function useCandles(ticker, period = '1J', assetType = 'stock') {
  const [candles, setCandles] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const key = `${ticker}-${period}-${assetType}`

  useEffect(() => {
    if (!ticker) return
    const cached = getCached(key)
    if (cached) { setCandles(cached); return }

    setLoading(true)
    setError(null)
    getCandlesForPeriod(ticker, period, assetType)
      .then((data) => {
        cache.set(key, { data, ts: Date.now() })
        setCandles(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [key])

  return { candles, loading, error }
}
