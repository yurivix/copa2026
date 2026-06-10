# Bolao Copa do Mundo 2026

Sistema online do bolao com classificacao automatica, grafico de movimentacao
por rodada e resultados preenchidos automaticamente por API (TheSportsDB).

## Telas
- Classificacao: ranking ao vivo. Placar exato = 10 pts, acertar so o vencedor/empate = 5 pts.
  Abaixo do ranking, um grafico mostra a movimentacao de posicao de cada um rodada a rodada.
- Jogos & Palpites: os 72 jogos da fase de grupos com o palpite de cada participante
  (verde = cravou, amarelo = acertou o resultado).
- Botao "Atualizar resultados": busca os placares reais na API. Os placares NAO podem
  ser digitados manualmente - vem somente do banco de dados (DB).

## Arquivos
- index.html     -> a pagina (estrutura + estilo)
- app.js         -> toda a logica (ranking, grafico, busca de resultados)
- data.js        -> os 72 jogos e os palpites de todos
- api/results.js -> funcao que busca os resultados (proxy da API, usado no Vercel)
- vercel.json    -> configuracao do Vercel

## Publicar no Vercel (gratis)
Opcao A (mais facil): suba esta pasta para um repositorio no GitHub e, no vercel.com,
faca Add New -> Project -> Import -> Deploy. Voce recebe um link publico.

Opcao B (terminal):
  npm i -g vercel
  cd Bolao-Copa-2026
  vercel
  vercel --prod

## Observacoes
- Antes de cada jogo os placares vem vazios; aparecem conforme os jogos sao disputados.
- Funciona tambem abrindo o index.html direto no navegador (modo offline usa a API publica).
- Para editar palpites, altere o arquivo data.js.
