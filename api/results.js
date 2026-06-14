// Vercel Serverless Function: /api/results
// Fonte principal de placares: ESPN (dia a dia, completo, com status pre/in/post).
// Reforco da agenda/nomes: TheSportsDB (eventsround r=1).
// O frontend casa por nome e o placar de quem tiver vence; hardcode manual cobre o resto.
export const config = { maxDuration: 30 };

const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

async function getJSON(url){
  const r = await fetch(url, { headers: { 'User-Agent': 'bolao-copa-2026' } });
  if(!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
function dateRange(start, end){
  const out=[]; let d=new Date(start+'T00:00:00Z'); const e=new Date(end+'T00:00:00Z');
  while(d<=e){ out.push(d.toISOString().slice(0,10).replace(/-/g,'')); d.setUTCDate(d.getUTCDate()+1); }
  return out;
}
function espnToCommon(ev){
  const c = ev.competitions && ev.competitions[0]; if(!c) return null;
  const comps = c.competitors || [];
  const home = comps.find(function(x){return x.homeAway==='home';});
  const away = comps.find(function(x){return x.homeAway==='away';});
  if(!home || !away) return null;
  const st = c.status && c.status.type && c.status.type.state;
  const started = (st==='in' || st==='post');
  return {
    strHomeTeam: home.team && (home.team.name || home.team.displayName),
    strAwayTeam: away.team && (away.team.name || away.team.displayName),
    intHomeScore: started ? home.score : null,
    intAwayScore: started ? away.score : null,
    strTimestamp: ev.date
  };
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  const out = [];
  // 1) ESPN dia a dia (placares)
  try{
    const dates = dateRange('2026-06-11','2026-07-20');
    const CHUNK = 10;
    for(let i=0;i<dates.length;i+=CHUNK){
      const parts = await Promise.all(dates.slice(i,i+CHUNK).map(function(d){
        return getJSON(ESPN + '?dates=' + d).catch(function(){ return {events:null}; });
      }));
      parts.forEach(function(p){
        (p.events || []).forEach(function(ev){ const c = espnToCommon(ev); if(c) out.push(c); });
      });
    }
  }catch(e){}
  // 2) TheSportsDB: agenda/nomes (reforco; placares nulos servem so para horario)
  try{
    const roster = (await getJSON(TSDB + '/eventsround.php?id=4429&r=1&s=2026')).events || [];
    roster.forEach(function(ev){
      out.push({ strHomeTeam: ev.strHomeTeam, strAwayTeam: ev.strAwayTeam,
        intHomeScore: ev.intHomeScore, intAwayScore: ev.intAwayScore, strTimestamp: ev.strTimestamp });
    });
  }catch(e){}
  res.status(200).json({ events: out });
}
