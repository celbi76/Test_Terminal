import { useState, useCallback } from 'react'
import { analyzeStock } from '../services/claudeApi'

const analysisCache = new Map()

export function useAnalysis() {
  const [analyses, setAnalyses] = useState({})
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})

  const analyze = useCallback(async ({ ticker, quote, financials, profile, purchasePrice }) => {
    if (analysisCache.has(ticker)) {
      setAnalyses((prev) => ({ ...prev, [ticker]: analysisCache.get(ticker) }))
      return
    }

    setLoading((prev) => ({ ...prev, [ticker]: true }))
    setErrors((prev) => ({ ...prev, [ticker]: null }))

    try {
      const result = await analyzeStock({ ticker, quote, financials, profile, purchasePrice })
      analysisCache.set(ticker, result)
      setAnalyses((prev) => ({ ...prev, [ticker]: result }))
    } catch (e) {
      setErrors((prev) => ({ ...prev, [ticker]: e.message }))
    } finally {
      setLoading((prev) => ({ ...prev, [ticker]: false }))
    }
  }, [])

  const clearCache = useCallback((ticker) => {
    if (ticker) analysisCache.delete(ticker)
    else analysisCache.clear()
  }, [])

  return { analyses, loading, errors, analyze, clearCache }
}
