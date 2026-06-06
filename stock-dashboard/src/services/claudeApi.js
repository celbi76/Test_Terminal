const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function analyzeStock({ ticker, quote, financials, profile, purchasePrice }) {
  const pe = financials?.peBasicExclExtraTTM?.toFixed(1) ?? 'N/A'
  const pb = financials?.pbQuarterly?.toFixed(2) ?? 'N/A'
  const revenueGrowth = financials?.revenueGrowthTTMYoy != null
    ? (financials.revenueGrowthTTMYoy * 100).toFixed(1) + '%'
    : 'N/A'
  const debtEquity = financials?.totalDebt_totalEquityQuarterly?.toFixed(2) ?? 'N/A'
  const roe = financials?.roeTTM != null
    ? (financials.roeTTM * 100).toFixed(1) + '%'
    : 'N/A'
  const dividendYield = financials?.dividendYieldIndicatedAnnual?.toFixed(2) ?? '0'
  const currentPrice = quote?.c?.toFixed(2) ?? 'N/A'
  const high52 = financials?.['52WeekHigh']?.toFixed(2) ?? quote?.h?.toFixed(2) ?? 'N/A'
  const low52 = financials?.['52WeekLow']?.toFixed(2) ?? quote?.l?.toFixed(2) ?? 'N/A'
  const sector = profile?.finnhubIndustry ?? 'N/A'
  const marketCap = profile?.marketCapitalization
    ? (profile.marketCapitalization / 1000).toFixed(1) + 'B'
    : 'N/A'

  const userContent = `Analysiere die Aktie ${ticker} (${profile?.name ?? ticker}).

Aktuelle Marktdaten:
- Kurs: $${currentPrice}
- 52W Hoch/Tief: $${high52} / $${low52}
- Marktkapitalisierung: $${marketCap}
- Sektor: ${sector}

Kennzahlen:
- KGV (P/E TTM): ${pe}
- KBV (P/B): ${pb}
- Umsatzwachstum YoY: ${revenueGrowth}
- Eigenkapitalrendite (ROE): ${roe}
- Verschuldungsgrad (D/E): ${debtEquity}
- Dividendenrendite: ${dividendYield}%

${purchasePrice ? `Mein Kaufkurs: $${purchasePrice} (aktuell: $${currentPrice}, ${((currentPrice / purchasePrice - 1) * 100).toFixed(1)}%)` : ''}

Liefere eine strukturierte Analyse mit:
1. **Fundamentale Bewertung** (Score 1-10, kurze Begründung)
2. **Drei Stärken** (konkret, datenbasiert)
3. **Drei Risiken** (konkret, nicht generisch)
4. **Empfehlung**: Kaufen / Halten / Reduzieren (mit klarer Begründung)
5. **Fair-Value-Schätzung** (Methode + Zahl)

Sei präzise und nüchtern. Kein Hype, keine Euphorie.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'Du bist ein nüchterner Value-Investor nach Graham/Buffett-Prinzipien. ' +
        'Keine Euphorie, kein Hype. Fakten, Kennzahlen, Risiken. ' +
        'Antworte auf Deutsch, strukturiert mit Markdown-Formatierung.',
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Anthropic API Fehler ${res.status}`)
  }

  const data = await res.json()
  return data.content[0]?.text ?? ''
}
