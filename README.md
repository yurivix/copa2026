# Bolao Copa do Mundo 2026

Sistema online: classificacao automatica, grafico de movimentacao por rodada,
3 temas (claro/escuro/verde-amarelo) e resultados + artilheiro vindos da API (TheSportsDB).

## Pontuacao
- Resultado exato (placar cravado): 10 pts
- Resultado correto sem placar exato: 5 pts
- Acertar o campeao: 10 pts
- Acertar o artilheiro: 10 pts

## Desempate (nesta ordem)
1. Maior numero de resultados exatos
2. Acertou o campeao
3. Acertou o artilheiro

## Telas
- Classificacao: ranking ao vivo + grafico de movimentacao por rodada.
- Jogos & Palpites: os 72 jogos com o palpite de cada um (verde=cravou, amarelo=resultado certo).
- Regras: o regulamento e o painel do organizador (define campeao e artilheiro).

## Como os resultados entram
- Botao "Atualizar resultados": placares reais vem da API (nao se digita na mao).
- Campeao e artilheiro: o organizador define na aba Regras. O botao "Calcular artilheiro
  pela API" soma os gols de todos os jogos finalizados e sugere o lider (precisa do site
  publicado no Vercel, pois usa a funcao /api/scorers).

## Arquivos
- index.html      -> estrutura da pagina
- styles.css      -> estilos e os 3 temas
- app.js          -> logica (ranking, desempate, grafico, temas, API)
- data.js         -> 72 jogos + palpites + campeao/artilheiro de cada um
- api/results.js  -> resultados dos jogos (proxy da API)
- api/scorers.js  -> artilharia somando os gols de todos os jogos
- vercel.json     -> configuracao do Vercel

## Publicar no Vercel (gratis)
Suba esta pasta para um repositorio no GitHub e, no vercel.com:
Add New -> Project -> Import -> Deploy. Voce recebe um link publico.
Ou pelo terminal: npm i -g vercel ; cd Bolao-Copa-2026 ; vercel ; vercel --prod

## Observacao
Abrindo o index.html direto no navegador funciona o ranking, o grafico e os temas;
o auto-preenchimento usa a API publica, e o "calcular artilheiro" so funciona publicado no Vercel.
Para editar palpites, altere o data.js.
