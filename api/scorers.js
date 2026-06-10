// Vercel Serverless Function: /api/scorers
// Soma os gols de todos os jogos finalizados da Copa 2026 (via linha do tempo do TheSportsDB)
// e devolve a artilharia ordenada. Gols contra nao contam para o artilheiro.
const KEY = '3';
const BASE = 'https://www.thesportsdb.com/api/v1/json/' + KEY;

async function getJSON(url){
  const r = await fetch(url, { headers: { 'User-Agent': 'bolao-copa-2026' } });
  if(!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  try{
    const season = await getJSON(BASE + '/eventsseason.php?id=4429&s=2026');
    const events = (season.events || []).filter(function(e){
      return e.intHomeScore != null && e.intHomeScore !== '' && e.intAwayScore != null && e.intAwayScore !== '';
    });
    const tally = {};
    // busca as linhas do tempo em paralelo, em lotes
    const ids = events.map(function(e){ return e.idEvent; });
    const CHUNK = 8;
    for(let i=0;i<ids.length;i+=CHUNK){
      const slice = ids.slice(i, i+CHUNK);
      const parts = await Promise.all(slice.map(function(id){
        return getJSON(BASE + '/lookuptimeline.php?id=' + id).catch(function(){ return {timeline:null}; });
      }));
      parts.forEach(function(p){
        (p.timeline || []).forEach(function(ev){
          if(ev.strTimeline !== 'Goal') return;
          if((ev.strTimelineDetail||'').toLowerCase().indexOf('own') >= 0) return; // ignora gol contra
          const name = ev.strPlayer;
          if(!name) return;
          tally[name] = (tally[name] || 0) + 1;
        });
      });
    }
    const scorers = Object.keys(tally).map(function(k){ return {player:k, goals:tally[k]}; })
      .sort(function(a,b){ return b.goals - a.goals || a.player.localeCompare(b.player); });
    res.status(200).json({ scorers: scorers, gamesCounted: events.length });
  }catch(e){
    res.status(500).json({ error: 'failed', message: String(e) });
  }
}
