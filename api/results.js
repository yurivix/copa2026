// Vercel Serverless Function: /api/results
// Duas fontes, mescladas: ESPN (dia a dia) + TheSportsDB (dia a dia) + TheSportsDB roster.
// O frontend casa por nome e o placar de quem tiver vence; hardcode/KO_RESULTS cobre o resto.
export const config = { maxDuration: 60 };

const TSDB = 'https://www.thesportsdb.com/api/v1/json/3';
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

async function getJSON(url){
  const r = await fetch(url, { headers: { 'User-Agent': 'bolao-copa-2026' } });
  if(!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
function dateRange(start, end){
  const out=[]; let d=new Date(start+'T00:00:00Z'); const e=new Date(end+'T00:00:00Z');
  while(d<=e){ out.push(d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); }
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
    advHome: !!home.winner,
    advAway: !!away.winner,
    strTimestamp: ev.date
  };
}
function tsdbToCommon(ev){
  return {
    strHomeTeam: ev.strHomeTeam, strAwayTeam: ev.strAwayTeam,
    intHomeScore: (ev.intHomeScore===''?null:ev.intHomeScore),
    intAwayScore: (ev.intAwayScore===''?null:ev.intAwayScore),
    strTimestamp: ev.strTimestamp
  };
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  const out = [];
  const dates = dateRange('2026-06-11','2026-07-20');
  const CHUNK = 10;
  // 1) ESPN dia a dia
  try{
    for(let i=0;i<dates.length;i+=CHUNK){
      const parts = await Promise.all(dates.slice(i,i+CHUNK).map(function(d){
        return getJSON(ESPN + '?dates=' + d.replace(/-/g,'')).catch(function(){ return {events:null}; });
      }));
      parts.forEach(function(p){ (p.events || []).forEach(function(ev){ const c=espnToCommon(ev); if(c) out.push(c); }); });
    }
  }catch(e){}
  // 2) TheSportsDB dia a dia (cobre quando a ESPN atrasa, ex.: mata-mata)
  try{
    const CH2 = 6;
    for(let i=0;i<dates.length;i+=CH2){
      const parts = await Promise.all(dates.slice(i,i+CH2).map(function(d){
        return getJSON(TSDB + '/eventsday.php?d=' + d + '&l=4429').catch(function(){ return {events:null}; });
      }));
      parts.forEach(function(p){ (p.events || []).forEach(function(ev){ out.push(tsdbToCommon(ev)); }); });
    }
  }catch(e){}
  // 3) TheSportsDB roster da fase de grupos (agenda/nomes)
  try{
    const roster = (await getJSON(TSDB + '/eventsround.php?id=4429&r=1&s=2026')).events || [];
    roster.forEach(function(ev){ out.push(tsdbToCommon(ev)); });
  }catch(e){}
  res.status(200).json({ events: out });
}
