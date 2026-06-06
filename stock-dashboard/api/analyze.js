export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' })
  }

  const { ticker, quote, financials, profile, purchasePrice, assetType } = req.body

  const isCrypto = assetType === 'crypto'
  const currentPrice = quote?.c?.toFixed(2) ?? 'N/A'
  const displayName = profile?.name ?? ticker

  let userContent

  if (isCrypto) {
    const cryptoName = ticker.split(':')[1]?.replace('USDT', '') ?? ticker
    userContent = `Analysiere die Kryptowährung ${cryptoName}.

Aktuelle Marktdaten:
- Kurs: $${currentPrice}
- Tageshoch: $${quote?.h?.toFixed(2) ?? 'N/A'}
- Tagestief: $${quote?.l?.toFixed(2) ?? 'N/A'}
- Tagesveränderung: ${quote?.dp?.toFixed(2) ?? 'N/A'}%

${purchasePrice ? `Mein Kaufkurs: $${purchasePrice} (aktuell: $${currentPrice})` : ''}

Liefere eine strukturierte Analyse mit:
1. **Technische Einschätzung** (Score 1-10, kurze Begründung)
2. **Drei Stärken** (konkret, ohne Hype)
3. **Drei Risiken** (regulatorisch, technisch, marktbezogen)
4. **Empfehlung**: Halten / Aufstocken / Reduzieren
5. **Einschätzung**: Wichtigste Preislevels (Support/Resistance)

Sei präzise. Kein Hype, keine Mondpreise. Risiken explizit nennen.`
  } else {
    const pe = financials?.peBasicExclExtraTTM?.toFixed(1) ?? 'N/A'
    const pb = financials?.pbQuarterly?.toFixed(2) ?? 'N/A'
    const revenueGrowth = financials?.revenueGrowthTTMYoy != null
      ? (financials.revenueGrowthTTMYoy * 100).toFixed(1) + '%' : 'N/A'
    const debtEquity = financials?.totalDebt_totalEquityQuarterly?.toFixed(2) ?? 'N/A'
    const roe = financials?.roeTTM != null
      ? (financials.roeTTM * 100).toFixed(1) + '%' : 'N/A'
    const dividendYield = financials?.dividendYieldIndicatedAnnual?.toFixed(2) ?? '0'
    const high52 = financials?.['52WeekHigh']?.toFixed(2) ?? quote?.h?.toFixed(2) ?? 'N/A'
    const low52 = financials?.['52WeekLow']?.toFixed(2) ?? quote?.l?.toFixed(2) ?? 'N/A'
    const sector = profile?.finnhubIndustry ?? 'N/A'
    const marketCap = profile?.marketCapitalization
      ? (profile.marketCapitalization / 1000).toFixed(1) + 'B' : 'N/A'

    userContent = `Analysiere ${ticker} (${displayName}).

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

Sei präzise und nüchtern. Kein Hype.`
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
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

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: err.error?.message ?? `API Fehler ${response.status}`,
      })
    }

    const data = await response.json()
    const text = data.content[0]?.text ?? ''
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
