// Vercel Serverless Function: /api/results
// Varre os jogos da Copa 2026 dia a dia (eventsday) e junta tudo.
// Isso evita a incompletude do endpoint de temporada e resolve diferencas de fuso (datas em UTC).
const KEY = '3';
const BASE = 'https://www.thesportsdb.com/api/v1/json/' + KEY;

function dateRange(start, end){
  const out=[]; let d=new Date(start+'T00:00:00Z'); const e=new Date(end+'T00:00:00Z');
  while(d<=e){ out.push(d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); }
  return out;
}
async function getJSON(url){
  const r = await fetch(url, { headers: { 'User-Agent': 'bolao-copa-2026' } });
  if(!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  try{
    const dates = dateRange('2026-06-11','2026-07-20');
    const merged = {};
    const CHUNK = 10;
    for(let i=0;i<dates.length;i+=CHUNK){
      const slice = dates.slice(i, i+CHUNK);
      const parts = await Promise.all(slice.map(function(d){
        return getJSON(BASE + '/eventsday.php?d=' + d + '&l=4429').catch(function(){ return {events:null}; });
      }));
      parts.forEach(function(p){
        (p.events || []).forEach(function(ev){
          const hasScore = ev.intHomeScore != null && ev.intHomeScore !== '';
          const prev = merged[ev.idEvent];
          const prevScore = prev && prev.intHomeScore != null && prev.intHomeScore !== '';
          if(!prev || (hasScore && !prevScore)) merged[ev.idEvent] = ev;
        });
      });
    }
    res.status(200).json({ events: Object.keys(merged).map(function(k){ return merged[k]; }) });
  }catch(e){
    res.status(500).json({ error: 'failed', message: String(e) });
  }
}
