# organ-api

API GraphQL do Organ, um organizador de equipe e tarefas. Uma empresa tem um líder e membros convidados por email, equipes, projetos e tarefas. As tarefas têm responsáveis com níveis de liderança, um status e, opcionalmente, um projeto.

O frontend fica no projeto irmão `../organ` (Next.js). Veja o [README do front](../organ/README.md) para subir os dois juntos.

## Tecnologias

- Node.js (ESM, `"type": "module"`)
- Express 4 + Apollo Server 4 (`@apollo/server/express4`)
- MongoDB com Mongoose 8
- Autenticação com JWT (`jsonwebtoken`, HS256) e senhas com `bcrypt`
- `cors`, `dotenv`, `uuid`; `nodemon` em desenvolvimento

## Pré-requisitos

- Node.js 20 ou superior
- Um MongoDB acessível: local (por exemplo `mongodb://127.0.0.1:27017/organ`) ou no MongoDB Atlas. No Atlas, libere o IP da sua máquina em Network Access.

## Como rodar

Execute os comandos na raiz de `organ-api`: o `dotenv` lê o `.env` do diretório atual.

```bash
npm install
cp .env.example .env     # no PowerShell: Copy-Item .env.example .env
# edite o .env (veja a tabela abaixo)
npm run dev
```

A API sobe em `http://localhost:4000/` (porta definida por `PORT`). O endpoint GraphQL é a própria raiz `/`, não `/graphql`.

O servidor encerra o processo na inicialização se `JWT_SECRET` ou `MONGO_DB` não estiverem definidos, ou se não conseguir conectar ao banco.

### Scripts

| Script | Comando | O que faz |
| --- | --- | --- |
| `npm run dev` | `nodemon src/server.js` | Sobe a API e reinicia a cada alteração nos arquivos. |
| `npm start` | `node src/server.js` | Sobe a API sem reinício automático. |
| `npm test` | `echo ... && exit 1` | Placeholder. O projeto não tem testes automatizados. |

## Variáveis de ambiente

Copie `.env.example` para `.env`. O `.env` está no `.gitignore`; não o versione.

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `MONGO_DB` | sim | - | URL de conexão do MongoDB (local ou Atlas), incluindo o nome do banco. |
| `JWT_SECRET` | sim | - | Segredo usado para assinar os tokens. Deve ser **igual** ao `JWT_SECRET` do frontend, que usa o mesmo valor para verificar o token. |
| `JWT_EXPIRES_IN` | não | `8h` | Validade do token, em qualquer formato aceito pelo `jsonwebtoken` (`8h`, `30m`, ou segundos). Veja a nota abaixo sobre o cookie do front. |
| `PORT` | não | `4000` | Porta HTTP da API. |
| `CORS_ORIGIN` | não | `http://localhost:3000` | Origens permitidas no CORS, separadas por vírgula (por exemplo `http://localhost:3000,https://app.exemplo.com`). |

Notas:

- `APP_TIME_ZONE` não existe na API. Ela é uma variável do frontend, que a usa para exibir datas. A API sempre devolve datas em ISO 8601 (UTC).
- O frontend chama a API somente pelo servidor do Next.js (Server Actions e Server Components), então o CORS não é exercitado por ele. `CORS_ORIGIN` importa para clientes que chamam a API direto do navegador.
- O cookie de sessão do frontend tem validade fixa de 8 horas, independente de `JWT_EXPIRES_IN`. Um valor menor que `8h` faz a sessão expirar antes (o middleware do front rejeita o token vencido). Um valor maior não prolonga a sessão além das 8 horas do cookie.

## Fluxo de uso

1. **Criar a empresa.** `createCompany` cadastra a empresa e a conta de quem a criou, que vira `leader` (com `employeeId` 1). Devolve `{ token, employee }`.
2. **Entrar.** `login` devolve `{ token, employee }`. Envie o token no header `Authorization: Bearer <token>` nas demais operações.
3. **Convidar por email.** O líder chama `newEmployee(email)`. O convite é apenas um registro do email no sistema (um funcionário com `isRegistered: false`, sem nome nem cargo). **Nenhum email é enviado**: o líder precisa avisar a pessoa por outro meio.
4. **Cadastro do convidado.** A pessoa chama `register` com o mesmo email do convite (no front, a página `/register`). O registro completa nome, cargo e senha, marca `isRegistered: true` e devolve um token. O papel é `member`.
5. **Tarefas.** Qualquer membro cria tarefas com `createTask`, definindo os responsáveis e o nível de cada um:
   - `3`: responsável principal
   - `2`: apoio
   - `1`: acompanha

   Sem `responsibles`, o criador entra como responsável nível 3. As tarefas começam em `pendente` e passam por `em_andamento` até `concluida`.
6. **Status.** `updateTaskStatus` muda o status. `completedAt` é preenchido ao ir para `concluida` e volta a `null` ao sair dela.
7. **Membros.** O líder remove membros ou cancela convites com `removeEmployee`.
8. **Equipes.** O líder cria equipes com `createTeam`, escolhendo o nome, uma descrição opcional e os membros (`memberIds`, só funcionários registrados). `updateTeam` troca nome, descrição e membros; `deleteTeam` exclui a equipe.
9. **Projetos.** O líder cria projetos com `createProject` (nome, descrição opcional e uma equipe responsável opcional). Qualquer membro pode colocar uma tarefa num projeto ao criá-la (`TaskInput.projectId`); o líder muda ou tira o projeto com `updateTask`. O progresso de um projeto é calculado a partir do status das tarefas dele (`Project.tasks`).
10. **Logout.** Não há mutation de logout: o token é sem estado. O cliente apenas descarta o token (o front apaga o cookie). O token continua válido na API até expirar, a menos que o funcionário seja removido.

## Papéis e permissões

O papel vem do banco de dados a cada requisição, não do payload do token. Quem cria a empresa é `leader`; todos os convidados são `member`. Não existe operação para trocar de papel ou transferir a liderança.

| Ação | Líder | Membro |
| --- | --- | --- |
| Ver a própria conta e a empresa (`me`, `getCompany`) | sim | sim |
| Listar funcionários e convites pendentes | sim | sim |
| Listar todas as tarefas da empresa (`getTasks`) | sim | sim |
| Criar tarefa (`createTask`) | sim | sim |
| Mudar o status de uma tarefa (`updateTaskStatus`) | de qualquer tarefa | só das tarefas em que é responsável |
| Editar nome, descrição, projeto e responsáveis (`updateTask`) | sim | não |
| Excluir tarefa (`deleteTask`) | sim | não |
| Listar equipes e projetos (`getTeams`, `getProjects`) | sim | sim |
| Criar, editar e excluir equipes (`createTeam`, `updateTeam`, `deleteTeam`) | sim | não |
| Criar, editar e excluir projetos (`createProject`, `updateProject`, `deleteProject`) | sim | não |
| Convidar por email (`newEmployee`) | sim | não |
| Remover funcionário ou convite (`removeEmployee`) | sim, exceto a si mesmo | não |

Tudo é restrito à empresa do token: o `companyId` não é argumento de nenhuma operação. Um membro que cria uma tarefa e não se inclui entre os responsáveis não poderá mudar o status dela depois.

Ao remover um funcionário, ele sai da lista de responsáveis de todas as tarefas e dos membros de todas as equipes da empresa (uma tarefa pode ficar sem responsáveis nesse caso) e o token dele deixa de funcionar, porque a API confirma a cada requisição que o funcionário ainda existe.

## Autenticação

- `createCompany`, `register` e `login` são públicos e devolvem `AuthPayload { token, employee }`. Todas as outras operações exigem login.
- O token é um JWT HS256 assinado com `JWT_SECRET`, com o payload:

  ```json
  { "sub": "<Employee._id>", "company": "<Company._id>", "role": "leader", "employeeId": 1, "name": "...", "email": "..." }
  ```

  `role` é `"leader"` ou `"member"`, e `exp` segue `JWT_EXPIRES_IN`.
- O `context` do Apollo lê o header `Authorization: Bearer <token>`. Se o header faltar, o token for inválido ou vencido, ou o funcionário não existir mais, `ctx.user` fica `null` e as operações protegidas respondem `UNAUTHENTICATED`.
- Senhas são salvas com `bcrypt` (10 rounds) e o campo `password` não existe no schema GraphQL.

## Queries

| Query | Acesso | Descrição |
| --- | --- | --- |
| `me` | logado | O funcionário do token. |
| `getCompany` | logado | A empresa do token. `Company.employees` lista os funcionários. |
| `getEmployees` | logado | Funcionários registrados e convites pendentes, por `employeeId`. |
| `getEmployeeById(employeeId: Int!)` | logado | Um funcionário da empresa, ou `null` se não existir. |
| `getSomeEmployeeById(employeeIds: [Int!])` | logado | Os funcionários indicados. Lista vazia ou nula devolve todos. |
| `getTasks(status: TaskStatus)` | logado | Tarefas da empresa, mais recentes primeiro. `status` filtra. `Task.project` traz o projeto da tarefa. |
| `getTeams` | logado | Equipes da empresa, em ordem de criação. `Team.members` e `Team.projects` trazem os membros e os projetos da equipe. |
| `getProjects` | logado | Projetos da empresa, em ordem de criação. `Project.team` e `Project.tasks` trazem a equipe e as tarefas do projeto. |

## Mutations

| Mutation | Acesso | Descrição |
| --- | --- | --- |
| `createCompany(name, employee: EmployeeInput!)` | público | Cria a empresa e o líder. O nome da empresa é único ignorando maiúsculas. |
| `login(email, password)` | público | Autentica um funcionário registrado. |
| `register(name, position, email, password)` | público | Conclui o cadastro de um email convidado. |
| `newEmployee(email)` | líder | Registra um convite. O funcionário já recebe seu `employeeId`. |
| `removeEmployee(employeeId)` | líder | Remove um membro ou convite. Devolve `true`. |
| `createTask(task: TaskInput!)` | logado | Cria uma tarefa em `pendente`, com projeto opcional. |
| `updateTask(taskId, task: TaskUpdateInput!)` | líder | Atualiza só os campos enviados. |
| `updateTaskStatus(taskId, status)` | líder ou responsável | Muda o status. |
| `deleteTask(taskId)` | líder | Exclui a tarefa. Devolve `true`. |
| `createTeam(team: TeamInput!)` | líder | Cria uma equipe. O nome é único na empresa, ignorando maiúsculas. |
| `updateTeam(teamId, team: TeamUpdateInput!)` | líder | Atualiza só os campos enviados; `memberIds` substitui os membros. |
| `deleteTeam(teamId)` | líder | Exclui a equipe. Os projetos dela continuam, sem equipe. Devolve `true`. |
| `createProject(project: ProjectInput!)` | líder | Cria um projeto. O nome é único na empresa, ignorando maiúsculas. |
| `updateProject(projectId, project: ProjectUpdateInput!)` | líder | Atualiza só os campos enviados; `teamId: null` tira a equipe. |
| `deleteProject(projectId)` | líder | Exclui o projeto. As tarefas dele continuam, sem projeto. Devolve `true`. |

Tipos de entrada principais:

```graphql
input EmployeeInput    { name: String!, position: String!, email: String!, password: String! }
input ResponsibleInput { employeeId: Int!, leadershipLevel: Int! }          # nível de 1 a 3
input TaskInput        { taskName: String!, description: String, projectId: Int, responsibles: [ResponsibleInput!] }
input TaskUpdateInput  { taskName: String, description: String, projectId: Int, responsibles: [ResponsibleInput!] }
input TeamInput        { name: String!, description: String, memberIds: [Int!] }
input TeamUpdateInput  { name: String, description: String, memberIds: [Int!] }
input ProjectInput     { name: String!, description: String, teamId: Int }
input ProjectUpdateInput { name: String, description: String, teamId: Int }

enum Role       { leader member }
enum TaskStatus { pendente em_andamento concluida }
```

Regras de dados:

- `employeeId`, `taskId`, `teamId` e `projectId` são inteiros sequenciais por empresa, gerados por um contador atômico (`$inc` em `Company.counters`). O convite já ocupa um `employeeId`.
- Os emails são salvos em minúsculas e são únicos em todo o sistema, não só dentro de uma empresa.
- Os responsáveis precisam ser funcionários registrados da mesma empresa, sem repetição, com nível entre 1 e 3.
- Em `updateTask`, `responsibles` omitido ou `null` não altera a lista; uma lista com itens substitui a atual; `[]` é rejeitada. Só `removeEmployee` pode deixar uma tarefa sem responsáveis.
- Os membros de uma equipe precisam ser funcionários registrados da mesma empresa (repetidos são ignorados). `memberIds: []` deixa a equipe sem membros.
- `projectId` e `teamId` precisam existir na empresa (`NOT_FOUND` se não existirem). Em `updateTask` e `updateProject`, o campo omitido não altera nada e `null` desfaz o vínculo.
- Datas (`createdAt`, `completedAt`) são strings ISO 8601.

### Exemplos de chamada

Os exemplos usam `curl`. Qualquer cliente GraphQL serve (Insomnia, Postman etc.): `POST http://localhost:4000/` com JSON `{ "query", "variables" }`.

Login (público) para obter o token:

```bash
curl -s http://localhost:4000/ \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { token employee { employeeId name role } } }",
    "variables": { "email": "lider@exemplo.com", "password": "<SUA_SENHA>" }
  }'
```

Query autenticada, com o token no header `Authorization: Bearer`:

```bash
curl -s http://localhost:4000/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "query": "query { getTasks(status: pendente) { taskId taskName status createdAt responsibles { leadershipLevel employee { employeeId name } } } }"
  }'
```

Mutation autenticada com variáveis (criar uma tarefa com dois responsáveis):

```bash
curl -s http://localhost:4000/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "query": "mutation CreateTask($task: TaskInput!) { createTask(task: $task) { taskId taskName status } }",
    "variables": {
      "task": {
        "taskName": "Fechar o relatório mensal",
        "description": "Consolidar os números do mês",
        "responsibles": [
          { "employeeId": 1, "leadershipLevel": 3 },
          { "employeeId": 2, "leadershipLevel": 1 }
        ]
      }
    }
  }'
```

Convidar alguém (só líder):

```graphql
mutation { newEmployee(email: "nova.pessoa@exemplo.com") { employeeId email isRegistered } }
```

## Códigos de erro

Os erros seguem o formato padrão do GraphQL, com a mensagem em português e o código em `extensions.code`:

```json
{ "errors": [ { "message": "Você precisa estar logado!", "extensions": { "code": "UNAUTHENTICATED" } } ] }
```

| Código | Quando acontece |
| --- | --- |
| `UNAUTHENTICATED` | Sem token, token inválido ou vencido, ou funcionário removido. |
| `FORBIDDEN` | A operação exige líder, ou o usuário não é líder nem responsável pela tarefa (`updateTaskStatus`). |
| `BAD_USER_INPUT` | Validação: campo obrigatório vazio, email inválido, senha com menos de 6 caracteres, nível de liderança fora de 1 a 3, responsável ou membro de equipe repetido, inexistente ou ainda não registrado, `responsibles: []` em `updateTask`, status inválido, líder tentando se remover. No `login`, email inexistente e senha errada dão a mesma mensagem: "Email ou senha incorretos!". |
| `NOT_FOUND` | Tarefa, equipe, projeto, funcionário ou empresa não encontrados. No `register`, email que nenhuma empresa convidou. |
| `CONFLICT` | Email já cadastrado (inclui convite já usado), empresa já cadastrada, ou equipe e projeto com nome já usado na empresa. |
| `INTERNAL_SERVER_ERROR` | Erro inesperado. A mensagem é sempre "Erro interno do servidor!", sem detalhes nem stack trace. O erro real aparece só no log do servidor. |
| `BAD_REQUEST` | Requisição HTTP malformada, como JSON inválido ("Requisição inválida!"). |

Operações GraphQL inválidas também geram os códigos padrão do Apollo Server, como `GRAPHQL_PARSE_FAILED` e `GRAPHQL_VALIDATION_FAILED`.

## Estrutura de pastas

```
organ-api/
├── .env.example            # modelo das variáveis de ambiente
├── package.json
└── src/
    ├── server.js           # Express + Apollo: CORS, formatação de erros e inicialização
    ├── auth/
    │   └── auth.js         # assinatura/leitura do JWT, ctx.user, requireAuth e requireLeader
    ├── config/
    │   └── db.config.js    # conexão com o MongoDB e criação dos índices
    ├── graphql/
    │   ├── typeDefs.js     # schema GraphQL
    │   └── resolvers.js    # queries, mutations e regras de negócio
    └── models/
        ├── company.model.js   # empresas (nome único, contadores de employeeId, taskId, teamId e projectId)
        ├── employee.model.js  # funcionários e convites
        ├── task.model.js      # tarefas, responsáveis e projeto
        ├── team.model.js      # equipes e membros
        └── project.model.js   # projetos e equipe responsável
```

## Banco de dados

Cinco coleções: `companies`, `employees`, `tasks`, `teams` e `projects`. Os índices únicos são criados ao subir a API:

| Coleção | Índice único |
| --- | --- |
| `companies` | `companyId`; `name` com collation `pt` de força 2 (ignora maiúsculas) |
| `employees` | `email`; `company` + `employeeId` |
| `tasks` | `company` + `taskId` |
| `teams` | `company` + `teamId`; `company` + `name` com collation `pt` de força 2 |
| `projects` | `company` + `projectId`; `company` + `name` com collation `pt` de força 2 |

As coleções `teams` e `projects` são novas e não exigem migração: empresas e tarefas já existentes continuam funcionando (as tarefas antigas ficam sem projeto).

## Migração do schema antigo

Esta versão **não é compatível** com os dados do schema antigo, em que cada empresa guardava `employees` e `tasks` embutidos no próprio documento. Não há script de migração. Se o banco tiver dados desse formato, apague-os antes de subir a API nova (isso é destrutivo; faça backup se precisar dos dados):

```js
// mongosh, no banco usado em MONGO_DB
db.companies.drop()
db.employees.drop()
db.tasks.drop()
```

Antes de subir, confira também se há empresas com o mesmo nome, ignorando maiúsculas. Duplicatas impedem a criação do índice único de `companies.name`. Quando isso acontece, a API não derruba o processo: ela registra "Erro ao criar os índices do banco de dados" no log e continua rodando, sem a garantia de unicidade do nome no banco. Para listar as duplicatas:

```js
// mongosh
db.companies.aggregate(
  [
    { $group: { _id: "$name", total: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { total: { $gt: 1 } } }
  ],
  { collation: { locale: "pt", strength: 2 } }
)
```

Renomeie ou remova as empresas repetidas e reinicie a API.

## Limitações

- Convites não enviam email; o líder avisa a pessoa por conta própria.
- Não há recuperação de senha, edição de perfil, edição ou exclusão da empresa, nem mudança de papel.
- Não há mutation de logout; o token só deixa de valer ao expirar ou quando o funcionário é removido.
- Não há testes automatizados.
