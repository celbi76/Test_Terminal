export async function analyzeStock({ ticker, quote, financials, profile, purchasePrice, assetType = 'stock' }) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticker, quote, financials, profile, purchasePrice, assetType }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error ?? `API Fehler ${res.status}`)
  }

  return data.text ?? ''
}
