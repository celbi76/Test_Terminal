import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_INDICES = [
  { ticker: 'SPY', label: 'S&P 500' },
  { ticker: 'QQQ', label: 'Nasdaq' },
  { ticker: 'GLD', label: 'Gold' },
  { ticker: 'BTC-USD', label: 'Bitcoin' },
]

const usePortfolioStore = create(
  persist(
    (set, get) => ({
      positions: [],
      watchlist: [],
      selectedTicker: null,
      marketIndices: DEFAULT_INDICES,

      addPosition: (position) =>
        set((state) => ({
          positions: [
            ...state.positions,
            { id: crypto.randomUUID(), assetType: 'stock', ...position, addedAt: new Date().toISOString() },
          ],
        })),

      updatePosition: (id, updates) =>
        set((state) => ({
          positions: state.positions.map((p) => p.id === id ? { ...p, ...updates } : p),
        })),

      removePosition: (id) =>
        set((state) => ({ positions: state.positions.filter((p) => p.id !== id) })),

      addToWatchlist: (ticker) =>
        set((state) => ({
          watchlist: state.watchlist.includes(ticker) ? state.watchlist : [...state.watchlist, ticker],
        })),

      removeFromWatchlist: (ticker) =>
        set((state) => ({ watchlist: state.watchlist.filter((t) => t !== ticker) })),

      setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
      getPosition: (id) => get().positions.find((p) => p.id === id),

      addMarketIndex: (ticker, label) =>
        set((state) => ({
          marketIndices: state.marketIndices.some((i) => i.ticker === ticker)
            ? state.marketIndices
            : [...state.marketIndices, { ticker, label: label || ticker }],
        })),

      removeMarketIndex: (ticker) =>
        set((state) => ({ marketIndices: state.marketIndices.filter((i) => i.ticker !== ticker) })),

      importPositions: (newPositions) =>
        set((state) => {
          const existing = new Set(state.positions.map((p) => p.ticker))
          const toAdd = newPositions
            .filter((p) => !existing.has(p.ticker))
            .map((p) => ({ id: crypto.randomUUID(), addedAt: new Date().toISOString(), assetType: 'stock', ...p }))
          return { positions: [...state.positions, ...toAdd] }
        }),

      analyses: {},

      setAnalysis: (ticker, text) =>
        set((state) => ({ analyses: { ...state.analyses, [ticker]: text } })),

      clearAnalysis: (ticker) =>
        set((state) => {
          if (ticker) {
            const next = { ...state.analyses }
            delete next[ticker]
            return { analyses: next }
          }
          return { analyses: {} }
        }),
    }),
    { name: 'portfolio-storage' }
  )
)

export default usePortfolioStore
