# ☁️ Sincronização com o Firebase — passo a passo

Tempo estimado: 10 a 15 minutos. Custo: **R$ 0** no plano gratuito (Spark), sem cartão de crédito.
Os nomes dos menus no console do Firebase mudam de vez em quando; se algo estiver com outro nome, procure o equivalente.

## 1. Criar o projeto

1. Acesse https://console.firebase.google.com e entre com a conta Google que você quer usar no Recanto.
2. **Criar um projeto** (ou *Add project*), dê um nome (ex.: `recanto-dos-habitos`) e continue.
3. O Google Analytics é opcional: pode desativar.

## 2. Ativar o login com Google

1. No menu lateral: **Build → Authentication → Get started** (ou *Começar*).
2. Aba **Sign-in method** → **Google** → ative, escolha um e-mail de suporte e salve.
3. Aba **Settings → Authorized domains** → **Add domain** e adicione o endereço do seu site no GitHub Pages, **só o domínio, sem `https://` e sem caminho**:
   `SEU-USUARIO.github.io`
   (`localhost` já vem autorizado, para você testar no computador.)

> Esquecer este passo é o erro mais comum: o login dá erro de "domínio não autorizado".

## 3. Criar o banco de dados (Firestore)

1. **Build → Firestore Database → Create database**.
2. Local: **southamerica-east1 (São Paulo)** é uma boa escolha. Essa escolha não pode ser trocada depois.
3. Modo: **Production mode** (produção).
4. Aba **Rules** (Regras): apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules` deste projeto e clique em **Publish**.
   Elas garantem que cada pessoa só lê e escreve o próprio documento.

## 4. Pegar a configuração do app web

1. Ícone de engrenagem → **Project settings** → aba **General**.
2. Em **Your apps**, clique no ícone **Web (`</>`)**, dê um apelido (ex.: `recanto`) e registre. Não precisa marcar *Firebase Hosting*.
3. Aparece um bloco `firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
4. Abra o arquivo **`firebase-config.js`** do projeto e copie cada valor para o campo correspondente (troque todos os `COLE_AQUI`).

Esses valores **não são segredo**: ficam visíveis em qualquer site que usa Firebase. Quem protege seus dados são as regras do passo 3 e o login.

## 5. Publicar

1. Envie para o repositório do GitHub os arquivos novos e alterados: `index.html`, `app.js`, `style.css`, `merge.js`, `sync-core.js`, `sync.js`, `firebase-config.js` (já preenchido), `firestore.rules`, `FIREBASE-SETUP.md` e `README.md`.
2. Espere 1 a 2 minutos o GitHub Pages atualizar e abra o site.
3. **Perfil → Sincronização → Entrar com Google**. Pronto: o status vira "✓ Sincronizado".

### Usando em outro aparelho
Abra o site no segundo aparelho. Na tela de boas-vindas, toque em **"Já uso em outro aparelho? Entrar com Google"**. Se você já tiver dados nos dois aparelhos, eles se juntam (ninguém sobrescreve ninguém).

### Testar no computador antes de publicar
Na pasta do projeto: `python3 -m http.server 8000` e abra `http://localhost:8000`.

## Como funciona (resumo)

- Cada coisa do jogo (uma conclusão de hábito, uma quest, um item da loja, seu nome…) tem a hora da última alteração.
- Ao sincronizar, o app junta os dois lados: **vale o registro alterado mais recentemente**. Conclusões de aparelhos diferentes se somam.
- Apagar ou desfazer também sincroniza (o app guarda um "túmulo" para o item apagado não voltar).
- Os dados são enviados alguns segundos depois de cada mudança e também quando você volta para o app. Se estiver offline, tudo fica salvo no aparelho e sobe quando a internet voltar.
- Tudo é guardado em **um documento por pessoa** (`users/<seu id>`).

## Limites e cuidados

- **Relógio dos aparelhos:** como vale "o mais recente", relógios muito errados (dias de diferença) podem fazer uma edição antiga vencer. Deixe a hora automática ligada.
- **Edição simultânea do mesmo item** (ex.: renomear o mesmo hábito nos dois aparelhos ao mesmo tempo): um dos dois vence.
- **Tamanho:** o Firestore aceita cerca de 1 MiB por documento. Anos de histórico cabem, mas se o app avisar que ficou grande demais, exporte um backup e peça para dividirmos os dados por ano.
- **Apagar tudo / importar backup** com a sincronização ligada vale para todos os aparelhos.
- **Plano gratuito:** o Spark dá 1 GiB de armazenamento e 20 mil escritas por dia no Firestore, muito acima do que o Recanto usa. Confira os números atuais na [página de preços do Firebase](https://firebase.google.com/pricing).
- **Privacidade:** seus dados ficam no *seu* projeto do Firebase, na sua conta Google, protegidos pelas regras acima. O avatar (pixel art pequeno) vai junto.
- Continue fazendo **Exportar backup** de vez em quando: é a rede de segurança caso algo dê errado.

## Se der problema

| Mensagem | O que fazer |
|---|---|
| "Este endereço ainda não foi autorizado no Firebase" | Passo 2.3: adicione `SEU-USUARIO.github.io` em Authorized domains. |
| "O navegador bloqueou a janela de login" | Permita pop-ups para o site e tente de novo. |
| "Sem permissão no Firestore" | Passo 3.4: confira se as regras foram colados e publicados. |
| "O login com Google não está ativado" | Passo 2.2. |
| "Não consegui carregar o Firebase" | Sem internet ou conteúdo bloqueado (extensões/rede). Recarregue a página. |
| Card diz "ainda não foi configurada" | `firebase-config.js` ainda tem `COLE_AQUI` ou não foi enviado ao GitHub. |

## Testes automáticos (opcional)

A lógica de junção tem testes que rodam sem internet: `node tests/sync.test.js`.
