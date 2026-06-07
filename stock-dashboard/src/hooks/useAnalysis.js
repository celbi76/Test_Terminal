import { useState, useCallback } from 'react'
import { analyzeStock } from '../services/claudeApi'
import usePortfolioStore from '../store/portfolioStore'

export function useAnalysis() {
  const analyses = usePortfolioStore((s) => s.analyses)
  const setAnalysis = usePortfolioStore((s) => s.setAnalysis)
  const clearAnalysis = usePortfolioStore((s) => s.clearAnalysis)

  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})

  const analyze = useCallback(async ({ ticker, quote, financials, profile, purchasePrice, assetType }) => {
    if (usePortfolioStore.getState().analyses[ticker]) return

    setLoading((prev) => ({ ...prev, [ticker]: true }))
    setErrors((prev) => ({ ...prev, [ticker]: null }))

    try {
      const result = await analyzeStock({ ticker, quote, financials, profile, purchasePrice, assetType })
      setAnalysis(ticker, result)
    } catch (e) {
      setErrors((prev) => ({ ...prev, [ticker]: e.message }))
    } finally {
      setLoading((prev) => ({ ...prev, [ticker]: false }))
    }
  }, [setAnalysis])

  const clearCache = useCallback((ticker) => {
    clearAnalysis(ticker)
  }, [clearAnalysis])

  return { analyses, loading, errors, analyze, clearCache }
}
