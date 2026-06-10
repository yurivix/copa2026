# Bolão Copa do Mundo 2026 🏆

Sistema online do bolão com **classificação automática** e **resultados preenchidos por API** (TheSportsDB).

## Como funciona
- **Classificação**: ranking ao vivo. Placar exato = **10 pts**, acertar só o vencedor/empate = **5 pts**.
- **Jogos & Palpites**: todos os 72 jogos da fase de grupos com o palpite de cada participante. As células ficam verdes (cravou) ou amarelas (acertou o resultado).
- **🔄 Atualizar resultados**: busca os placares reais dos jogos automaticamente. Também dá pra digitar o placar manualmente em qualquer jogo.
- Os placares ficam salvos no próprio navegador.

## Publicar no Vercel (grátis)

**Opção A — pelo site (mais fácil, sem instalar nada):**
1. Crie uma conta em https://vercel.com (pode entrar com o GitHub/Google).
2. Suba esta pasta `bolao-online` para um repositório no GitHub.
3. No Vercel: **Add New → Project → Import** o repositório → **Deploy**.
4. Pronto: você recebe um link público (ex: `bolao-copa.vercel.app`) para mandar no grupo.

**Opção B — pelo terminal (Vercel CLI):**
```bash
npm i -g vercel
cd bolao-online
vercel        # siga as perguntas e confirme
vercel --prod # publica a versão final
```

## Estrutura
```
bolao-online/
├── index.html        # o sistema (interface + lógica)
├── data.js           # jogos e palpites de todos
├── api/results.js    # função que busca os resultados (proxy da API)
├── vercel.json       # configuração do Vercel
└── README.md
```

## Funciona offline também
Você pode simplesmente abrir o `index.html` no navegador (duplo clique). Nesse modo, o botão de atualizar tenta a API pública diretamente. Hospedando no Vercel, ele usa a função `api/results` (mais estável).

## Observações
- Antes de cada jogo, os placares vêm vazios na API — eles aparecem conforme os jogos são disputados.
- Se algum nome de seleção não bater com a API, é só digitar o placar manualmente naquele jogo.
- Para adicionar/editar palpites, atualize o arquivo `data.js`.
