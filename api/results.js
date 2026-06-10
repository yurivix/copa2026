// Vercel Serverless Function: /api/results
// Busca os jogos da Copa do Mundo 2026 no TheSportsDB e devolve em JSON.
// Funciona como "proxy" para evitar qualquer problema de CORS no navegador.
export default async function handler(req, res) {
  const url = 'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'bolao-copa-2026' } });
    if (!r.ok) {
      res.status(502).json({ error: 'upstream', status: r.status });
      return;
    }
    const data = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'fetch_failed', message: String(e) });
  }
}
