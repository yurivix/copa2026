// Vercel Serverless Function: /api/scorers
// Junta todos os jogos finalizados (varrendo dia a dia) e soma os gols de cada jogador
// pelas linhas do tempo. Gols contra nao contam para o artilheiro.
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
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  try{
    // 1) lista completa de jogos finalizados
    const dates = dateRange('2026-06-11','2026-07-20');
    const finished = {};
    const CHUNK = 10;
    for(let i=0;i<dates.length;i+=CHUNK){
      const parts = await Promise.all(dates.slice(i,i+CHUNK).map(function(d){
        return getJSON(BASE + '/eventsday.php?d=' + d + '&l=4429').catch(function(){ return {events:null}; });
      }));
      parts.forEach(function(p){
        (p.events || []).forEach(function(ev){
          if(ev.intHomeScore != null && ev.intHomeScore !== '' && ev.intAwayScore != null && ev.intAwayScore !== '')
            finished[ev.idEvent] = true;
        });
      });
    }
    // 2) soma gols pelas linhas do tempo
    const ids = Object.keys(finished);
    const tally = {};
    for(let i=0;i<ids.length;i+=CHUNK){
      const parts = await Promise.all(ids.slice(i,i+CHUNK).map(function(id){
        return getJSON(BASE + '/lookuptimeline.php?id=' + id).catch(function(){ return {timeline:null}; });
      }));
      parts.forEach(function(p){
        (p.timeline || []).forEach(function(ev){
          if(ev.strTimeline !== 'Goal') return;
          if((ev.strTimelineDetail||'').toLowerCase().indexOf('own') >= 0) return;
          if(!ev.strPlayer) return;
          tally[ev.strPlayer] = (tally[ev.strPlayer] || 0) + 1;
        });
      });
    }
    const scorers = Object.keys(tally).map(function(k){ return {player:k, goals:tally[k]}; })
      .sort(function(a,b){ return b.goals - a.goals || a.player.localeCompare(b.player); });
    res.status(200).json({ scorers: scorers, gamesCounted: ids.length });
  }catch(e){
    res.status(500).json({ error: 'failed', message: String(e) });
  }
}
