import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getBatchQuotes, getFullStockData, getCandlesForPeriod } from '../services/marketApi'

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

  const fetchData = useCallback(async () => {
    if (!ticker) return
    const cacheKey = `${ticker}-${assetType}`
    const cached = getCached(cacheKey)
    if (cached) { setData(cached); return }

    setLoading(true)
    setError(null)
    try {
      const result = await getFullStockData(ticker, assetType)
      cache.set(cacheKey, { data: result, ts: Date.now() })
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [ticker, assetType])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Accepts: array of ticker strings, OR array of { ticker, assetType } objects
export function useMultiQuotes(items) {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const prevKeyRef = useRef('')

  const normalized = useMemo(() =>
    (items ?? []).map((p) =>
      typeof p === 'string' ? { ticker: p, assetType: 'stock' } : p
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(items)]
  )

  const key = normalized.map((p) => `${p.ticker}:${p.assetType}`).sort().join(',')

  useEffect(() => {
    if (!normalized.length) return
    if (key === prevKeyRef.current) return
    prevKeyRef.current = key

    // Only fetch tickers not already in cache
    const toFetch = normalized.filter((p) => !getCached(`quote:${p.ticker}`))
    const cached = normalized.filter((p) => getCached(`quote:${p.ticker}`))

    // Hydrate from cache immediately
    if (cached.length) {
      setQuotes((prev) => {
        const next = { ...prev }
        cached.forEach((p) => { next[p.ticker] = getCached(`quote:${p.ticker}`) })
        return next
      })
    }

    if (!toFetch.length) return

    setLoading(true)
    // Single batch request for all tickers — pass assetType so the API can route EU ETFs correctly
    getBatchQuotes(toFetch).then((batchResult) => {
      const newQuotes = {}
      toFetch.forEach((p) => {
        const val = { quote: batchResult[p.ticker] ?? null }
        cache.set(`quote:${p.ticker}`, { data: val, ts: Date.now() })
        newQuotes[p.ticker] = val
      })
      setQuotes((prev) => ({ ...prev, ...newQuotes }))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [key])

  return { quotes, loading }
}

export function useCandles(ticker, period = '1J', assetType = 'stock') {
  const [candles, setCandles] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cacheKey = `${ticker}-${period}-${assetType}`

  useEffect(() => {
    if (!ticker) return
    const cached = getCached(cacheKey)
    if (cached) { setCandles(cached); return }

    setLoading(true)
    setError(null)
    getCandlesForPeriod(ticker, period, assetType)
      .then((data) => {
        cache.set(cacheKey, { data, ts: Date.now() })
        setCandles(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [cacheKey])

  return { candles, loading, error }
}
