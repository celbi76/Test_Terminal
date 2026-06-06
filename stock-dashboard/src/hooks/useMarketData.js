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

export function useStockData(ticker) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!ticker) return
    const cached = getCached(ticker)
    if (cached) { setData(cached); return }

    setLoading(true)
    setError(null)
    try {
      const result = await getFullStockData(ticker)
      cache.set(ticker, { data: result, ts: Date.now() })
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useMultiQuotes(tickers) {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const prevTickers = useRef([])

  useEffect(() => {
    if (!tickers.length) return
    const sorted = [...tickers].sort().join(',')
    const prevSorted = [...prevTickers.current].sort().join(',')
    if (sorted === prevSorted) return
    prevTickers.current = tickers

    setLoading(true)
    Promise.allSettled(tickers.map((t) => getFullStockData(t))).then((results) => {
      const newQuotes = {}
      tickers.forEach((t, i) => {
        if (results[i].status === 'fulfilled') {
          newQuotes[t] = results[i].value
        }
      })
      setQuotes(newQuotes)
      setLoading(false)
    })
  }, [tickers.join(',')])

  return { quotes, loading }
}

export function useCandles(ticker, period = '1J') {
  const [candles, setCandles] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const key = `${ticker}-${period}`

  useEffect(() => {
    if (!ticker) return
    const cached = getCached(key)
    if (cached) { setCandles(cached); return }

    setLoading(true)
    setError(null)
    getCandlesForPeriod(ticker, period)
      .then((data) => {
        cache.set(key, { data, ts: Date.now() })
        setCandles(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [key])

  return { candles, loading, error }
}
