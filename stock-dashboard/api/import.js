export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' })
  }

  const { fileData, mimeType } = req.body

  if (!fileData || !mimeType) {
    return res.status(400).json({ error: 'fileData und mimeType erforderlich' })
  }

  const prompt = `Analysiere diesen Screenshot oder dieses Dokument eines Wertschriften-Depots oder Portfolios.
Extrahiere alle erkennbaren Positionen und gib sie ausschliesslich als JSON-Array zurück.

Antworte NUR mit dem JSON-Array, kein weiterer Text, keine Erklärungen:
[
  {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "assetType": "stock",
    "shares": 10,
    "purchasePrice": 150.00
  }
]

Regeln:
- assetType: "stock" für Aktien, "etf" für ETFs/Indexfonds, "crypto" für Kryptowährungen
- Für Kryptowährungen ticker im Format "BINANCE:BTCUSDT" (z.B. BTC → BINANCE:BTCUSDT, ETH → BINANCE:ETHUSDT)
- shares: Anzahl Stücke als Dezimalzahl (z.B. 0.5 für halbe Stücke)
- purchasePrice: Kaufpreis pro Stück in USD. Falls in CHF/EUR: ungefähr in USD umrechnen (CHF*1.12, EUR*1.08)
- Falls kein Kaufpreis sichtbar: verwende den aktuellen Marktpreis
- Ticker: US-Aktien ohne Exchange-Suffix, EU-Aktien mit Yahoo Finance Suffix (z.B. NESN.SW, AMS.AS)
- Nur tatsächliche Positionen, keine Summenzeilen, Überschriften oder Gesamtzeilen
- Falls keine Positionen erkennbar: leeres Array []`

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
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: fileData,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: err.error?.message ?? `API Fehler ${response.status}`,
      })
    }

    const data = await response.json()
    const text = data.content[0]?.text ?? '[]'

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const positions = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return res.status(200).json({ positions })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
