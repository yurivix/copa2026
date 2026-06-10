const D = window.BOLAO;
const LS_KEY = 'bolao_copa_2026_results';
let results = loadResults();
let view = 'rank';
let chart = null;

function loadResults(){
  try{ const r = JSON.parse(localStorage.getItem(LS_KEY)); if(Array.isArray(r)&&r.length===D.games.length) return r; }catch(e){}
  return D.games.map(function(){return [null,null];});
}
function saveResults(){ localStorage.setItem(LS_KEY, JSON.stringify(results)); }

function scoreFor(real, pick){
  const ra=real[0], rb=real[1], pa=pick[0], pb=pick[1];
  if(ra==null||rb==null||pa==null||pb==null||pa===''||pb==='') return null;
  if(Number(pa)===Number(ra)&&Number(pb)===Number(rb)) return 10;
  const s=function(x,y){return Math.sign(Number(x)-Number(y));};
  if(s(ra,rb)===s(pa,pb)) return 5;
  return 0;
}

function standingsFiltered(filterFn){
  return D.participants.map(function(p){
    let total=0,exatos=0,acertos=0,jogados=0;
    D.games.forEach(function(g,i){
      if(filterFn && !filterFn(i)) return;
      const sc=scoreFor(results[i], p.picks[i]);
      if(sc!=null){jogados++; total+=sc; if(sc===10)exatos++; else if(sc===5)acertos++;}
    });
    return {nick:p.name,label:p.label,total:total,exatos:exatos,acertos:acertos,jogados:jogados};
  }).sort(function(a,b){ return b.total-a.total || b.exatos-a.exatos || a.nick.localeCompare(b.nick); });
}

function renderRank(){
  const st=standingsFiltered(null);
  document.getElementById('rankList').innerHTML = st.map(function(s,i){
    const pos=i+1;
    const champ = s.label.split('-').slice(1).join(' / ');
    return '<div class="rrow">'
      + '<div class="pos p'+pos+'">'+pos+'o</div>'
      + '<div><div class="pname">'+s.nick+'</div>'
      + '<div class="pmeta">'+s.exatos+' cravadas - '+s.acertos+' no resultado - '+s.jogados+' jogos - campeao: '+(champ||'-')+'</div></div>'
      + '<div class="pts">'+s.total+'<span>pontos</span></div>'
      + '</div>';
  }).join('');
}

const PALETTE=['#ffd54a','#3b82f6','#2fbf71','#e7607b','#a78bfa','#22d3ee','#f97316','#84cc16','#f43f5e','#94a3b8'];

function renderChart(){
  if(typeof Chart==='undefined') return;
  const playedRounds=[];
  for(let r=1;r<=3;r++){
    const any=D.games.some(function(g,i){ return g.rodada===r && results[i][0]!=null && results[i][1]!=null; });
    if(any) playedRounds.push(r);
  }
  const card=document.querySelector('.chartcard');
  if(playedRounds.length===0){
    card.querySelector('.sub').textContent='O grafico aparece assim que os primeiros resultados forem registrados.';
    if(chart){chart.destroy();chart=null;}
    return;
  }
  card.querySelector('.sub').textContent='Posicao de cada participante ao fim de cada rodada da fase de grupos (1o no topo).';
  const n=D.participants.length;
  const labels=['Inicio'].concat(playedRounds.map(function(r){return 'Rodada '+r;}));
  const series={};
  D.participants.forEach(function(p){ series[p.name]=[(n+1)/2]; });
  playedRounds.forEach(function(r){
    const st=standingsFiltered(function(i){ return D.games[i].rodada<=r && results[i][0]!=null && results[i][1]!=null; });
    st.forEach(function(s,idx){ series[s.nick].push(idx+1); });
  });
  const datasets=D.participants.map(function(p,idx){
    return {
      label:p.name,
      data:series[p.name],
      borderColor:PALETTE[idx%PALETTE.length],
      backgroundColor:PALETTE[idx%PALETTE.length],
      borderWidth:2.5, tension:.25, pointRadius:4, pointHoverRadius:6
    };
  });
  if(chart) chart.destroy();
  chart=new Chart(document.getElementById('moveChart'),{
    type:'line',
    data:{labels:labels,datasets:datasets},
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'nearest',intersect:false},
      scales:{
        y:{reverse:true, min:1, max:n, ticks:{stepSize:1,color:'#9aa6c8',callback:function(v){return v+'o';}},
           grid:{color:'#26315a'}, title:{display:true,text:'Posicao',color:'#9aa6c8'}},
        x:{ticks:{color:'#9aa6c8'}, grid:{color:'#1b2444'}}
      },
      plugins:{
        legend:{position:'bottom',labels:{color:'#eef2ff',boxWidth:14,padding:10,font:{size:12}}},
        tooltip:{callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.y+'o';}}}
      }
    }
  });
}

function gameState(i){ const r=results[i]; return (r[0]!=null&&r[1]!=null)?'played':'pending'; }

function renderGames(){
  const grp=document.getElementById('filterGroup').value;
  const stt=document.getElementById('filterState').value;
  let html='';
  D.games.forEach(function(g,i){
    if(grp && g.grupo!==grp) return;
    const state=gameState(i);
    if(stt==='played'&&state!=='played') return;
    if(stt==='pending'&&state!=='pending') return;
    const dt=new Date(g.data);
    const dstr=dt.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    const r=results[i];
    const sa = r[0]!=null?r[0]:'-', sb = r[1]!=null?r[1]:'-';
    const picksHtml = D.participants.map(function(p){
      const pk=p.picks[i];
      if(pk[0]==null||pk[1]==null) return '';
      const sc=scoreFor(r,pk);
      const cls = sc===10?'g10':sc===5?'g5':sc===0?'g0':'';
      const tag = sc!=null ? '<span class="badge" style="background:'+(sc===10?'#2fbf71':sc===5?'#e7b416':'#3a4366')+';color:'+(sc===5?'#10162e':'#fff')+'">+'+sc+'</span>' : '';
      return '<div class="pchip '+cls+'"><span class="nm">'+p.name+'</span><span class="sc">'+pk[0]+'-'+pk[1]+tag+'</span></div>';
    }).join('');
    html += '<div class="game">'
      + '<div class="ghead"><span class="gtag">Grupo '+g.grupo+' - '+g.rodada+'a rodada</span><span>'+dstr+'</span>'
      + '<span class="badge" style="background:'+(state==='played'?'#2c3a5e':'transparent')+';color:#9aa6c8">'+(state==='played'?'ENCERRADO':'A JOGAR')+'</span></div>'
      + '<div class="gmain">'
      + '<div class="team a">'+g.a+'</div>'
      + '<div class="score">'
      + '<div class="scorebox '+(r[0]==null?'empty':'')+'">'+sa+'</div>'
      + '<span class="vs">x</span>'
      + '<div class="scorebox '+(r[1]==null?'empty':'')+'">'+sb+'</div>'
      + '</div>'
      + '<div class="team b">'+g.b+'</div>'
      + '</div>'
      + '<div class="picks"><h4>Palpites da galera</h4>'
      + '<div class="pgrid">'+(picksHtml||'<div class="empty">Sem palpites.</div>')+'</div>'
      + '</div>'
      + '</div>';
  });
  const el=document.getElementById('gamesList');
  el.innerHTML = html || '<div class="empty" style="text-align:center;padding:30px">Nenhum jogo com esse filtro.</div>';
}

function render(){ renderRank(); renderChart(); if(view==='games') renderGames(); }

document.querySelectorAll('.tab').forEach(function(t){
  t.addEventListener('click',function(){
    document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active'); view=t.dataset.view;
    document.getElementById('viewRank').style.display = view==='rank'?'':'none';
    document.getElementById('viewGames').style.display = view==='games'?'':'none';
    render();
  });
});

Array.from(new Set(D.games.map(function(g){return g.grupo;}))).sort().forEach(function(gr){
  const o=document.createElement('option');o.value=gr;o.textContent='Grupo '+gr;
  document.getElementById('filterGroup').appendChild(o);
});
document.getElementById('filterGroup').addEventListener('change',renderGames);
document.getElementById('filterState').addEventListener('change',renderGames);

function setStatus(msg){ document.getElementById('status').textContent=msg; }
function norm(s){ if(!s) return ''; return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,''); }

const alias={ 'turkiye':'turkey','korearepublic':'southkorea','republicofkorea':'southkorea',
  'czechia':'czechrepublic','unitedstates':'usa','unitedstatesofamerica':'usa',
  'congodr':'drcongo','democraticrepublicofcongo':'drcongo','capeverdeislands':'capeverde',
  'cotedivoire':'ivorycoast' };
function canon(nm){ nm=norm(nm); return alias[nm]||nm; }

const enIndex={};
D.games.forEach(function(g,i){ enIndex[canon(g.enA)+'|'+canon(g.enB)]=i; enIndex[canon(g.enB)+'|'+canon(g.enA)]=i; });

async function fetchResults(){
  const btn=document.getElementById('fetchBtn'); btn.disabled=true;
  setStatus('Buscando resultados...');
  let events=null;
  const sources=['/api/results','https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026'];
  for(const url of sources){
    try{
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) continue;
      const j=await res.json();
      if(j&&j.events){ events=j.events; break; }
    }catch(e){}
  }
  if(!events){ setStatus('Nao consegui buscar agora. Tente novamente em instantes.'); btn.disabled=false; return; }
  const fresh=D.games.map(function(){return [null,null];});
  let cnt=0;
  events.forEach(function(ev){
    const ha=ev.intHomeScore, aw=ev.intAwayScore;
    if(ha==null||aw==null||ha===''||aw==='') return;
    const home=canon(ev.strHomeTeam), away=canon(ev.strAwayTeam);
    let i = enIndex[home+'|'+away]; if(i==null) i = enIndex[away+'|'+home];
    if(i==null) return;
    const g=D.games[i];
    if(canon(g.enA)===home){ fresh[i]=[+ha,+aw]; } else { fresh[i]=[+aw,+ha]; }
    cnt++;
  });
  results=fresh; saveResults(); render();
  setStatus(cnt+' jogo(s) com resultado - atualizado '+new Date().toLocaleTimeString('pt-BR'));
  btn.disabled=false;
}
document.getElementById('fetchBtn').addEventListener('click',fetchResults);

render();
