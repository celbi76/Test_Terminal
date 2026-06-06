import { useAnalysis } from '../hooks/useAnalysis'

function MarkdownText({ text }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-white font-semibold text-base mt-4 mb-1">{line.slice(3)}</h3>
        }
        if (line.startsWith('### ')) {
          return <h4 key={i} className="text-slate-200 font-medium mt-3 mb-1">{line.slice(4)}</h4>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={i} className="font-semibold text-white">{line.slice(2, -2)}</div>
        }
        if (line.match(/^\d+\.\s/)) {
          const content = line.replace(/\*\*(.*?)\*\*/g, (_, m) => m)
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-400 font-medium shrink-0">{line.match(/^\d+/)[0]}.</span>
              <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
            </div>
          )
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-indigo-400 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
        )
      })}
    </div>
  )
}

export default function AnalysisPanel({ ticker, stockData, purchasePrice }) {
  const { analyses, loading, errors, analyze, clearCache } = useAnalysis()

  const analysis = analyses[ticker]
  const isLoading = loading[ticker]
  const error = errors[ticker]

  function handleAnalyze() {
    analyze({
      ticker,
      quote: stockData?.quote,
      financials: stockData?.financials,
      profile: stockData?.profile,
      purchasePrice,
    })
  }

  function handleRefresh() {
    clearCache(ticker)
    handleAnalyze()
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">KI-Analyse</h3>
          <div className="text-slate-500 text-xs">Value-Investor-Perspektive (Graham/Buffett)</div>
        </div>
        <div className="flex gap-2">
          {analysis && (
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Aktualisieren
            </button>
          )}
          <button
            onClick={analysis ? handleRefresh : handleAnalyze}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analysiert...
              </span>
            ) : analysis ? 'Neu analysieren' : 'Jetzt analysieren'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
          <strong>Fehler:</strong> {error}
          {error.includes('API') && (
            <div className="mt-1 text-xs text-red-400">
              Stellen Sie sicher, dass VITE_ANTHROPIC_API_KEY korrekt gesetzt ist.
            </div>
          )}
        </div>
      )}

      {!analysis && !isLoading && !error && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-sm">Klicken Sie auf "Jetzt analysieren" für eine</div>
          <div className="text-sm">fundamentale Einschätzung von {ticker}.</div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8 text-slate-400">
          <div className="inline-block w-8 h-8 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin mb-3" />
          <div className="text-sm">Claude analysiert {ticker}...</div>
          <div className="text-xs text-slate-500 mt-1">Kennzahlen werden ausgewertet</div>
        </div>
      )}

      {analysis && !isLoading && (
        <div className="mt-2">
          <MarkdownText text={analysis} />
        </div>
      )}
    </div>
  )
}
