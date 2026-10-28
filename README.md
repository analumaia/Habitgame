# 🏡 Recanto dos Hábitos

Mini RPG cozy em pixel art para cuidar dos seus hábitos. Site estático (HTML, CSS e JavaScript puros), sem backend e sem cadastro. Os dados ficam salvos no seu navegador.

## Como publicar no GitHub Pages

1. Crie um repositório novo (ex.: `recanto-dos-habitos`), público.
2. Envie os arquivos `index.html`, `style.css`, `app.js` e `README.md` para a raiz do repositório.
3. Vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`. Salve.
5. Em 1 a 2 minutos o site aparece em `https://SEU-USUARIO.github.io/recanto-dos-habitos/`.

No celular, abra o link e use **Adicionar à tela inicial** para ter um atalho como se fosse um app.

## Como o jogo funciona

- **Hábitos**: vale 10 pontos cada conclusão. Filtros **Hoje**, **Diários**, **Semanais** e **Mensais**.
  - Semanal: você escolhe os dias da semana.
  - Mensal: ou um dia do mês (ex.: dia 5; dia 31 cai no último dia dos meses mais curtos), ou um dia da semana (ex.: 1ª segunda, última sexta).
- **Pontos**: viram **XP** (sobe de nível, nunca diminui ao gastar) e **moedas** (saldo da loja).
- **Quests**: objetivos master com etapas, prazo opcional e 50 pontos ao concluir. Uma pode ser a principal (aparece em destaque).
- **Loja**: crie suas recompensas e resgate com os pontos.
- **Avatar**: envie uma foto; ela é transformada em pixel art no próprio aparelho (nada é enviado a servidor algum).
- **Recanto**: a casinha muda com o horário (dia, entardecer, noite com janelas acesas e vaga-lumes) e cresce com o nível: 2 flores e jardineiras, 3 árvore, 4 cerca com portão, 5 horta, 6 poço, 7 lampião e caixa de correio, 8 girassóis, 10 gatinho e borboletas.
- **Níveis e acessórios**: vão até o nível 25. Em vários níveis sua personagem ganha um acessório em pixel art sobre a foto (laço, chapéu de fazendeiro, cesta de flores, cachecol, regador, borboleta, coroa de flores, passarinho, lanterna, chapéu de cogumelo, cesta de maçãs, brilhos e coroa dourada). Tudo aparece em Perfil → Guarda-roupa.
- **Conquistas** e gráfico dos últimos 7 dias no Perfil.

## Onde mexer para personalizar

No começo do `app.js`:

- `DEFAULT_PTS_HABIT` e `DEFAULT_PTS_QUEST`: pontos padrão (também dá para mudar em Perfil → Ajustes).
- `xpNeed`: curva de XP por nível.
- `TITLES` e `UNLOCKS`: títulos e o que o recanto ganha em cada nível.
- `DEFAULT_SHOP`: recompensas iniciais da loja.
- `WEEK_START`: `0` semana começa no domingo, `1` na segunda.

As cores ficam nas variáveis do topo do `style.css`.

## Seus dados e sincronização

Os dados ficam no `localStorage` do navegador e somem se você limpar os dados do site. Use **Perfil → Exportar backup** de vez em quando.

Para usar o mesmo recanto em vários aparelhos, ative a **sincronização com o Firebase** (gratuito, login com Google): siga o **[FIREBASE-SETUP.md](FIREBASE-SETUP.md)**. Sem configurar, o app funciona normalmente, só neste aparelho.

Arquivos: `index.html`, `style.css`, `app.js` (o jogo), `scene.js` (cenário), `acc.js` (acessórios do avatar), `merge.js` + `sync-core.js` + `sync.js` (sincronização), `firebase-config.js` (você preenche), `firestore.rules` (regras de segurança) e `tests/` (testes opcionais).

## Fontes

Usa Pixelify Sans e Nunito, carregadas do Google Fonts. Sem internet, o site continua funcionando com fontes do sistema.
