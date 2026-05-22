# PKTracker API

API REST para jogadores de poker rastrearem resultados de torneios, gerenciarem seu bankroll e analisarem a performance ao longo do tempo.

Construída com **NestJS**, **Prisma** e **PostgreSQL**.

---

## Funcionalidades

- **Autenticação** — Signup/signin via JWT com hash de senha em bcrypt
- **Gerenciamento de bankroll** — Depósitos, saques e rake com transações atômicas
- **Registro de torneios** — Registre resultados individualmente, em lote ou aplicando uma agenda pré-criada
- **Agendas de torneios** — Crie templates semanais/dominicais com itens para criar torneios em massa
- **Estatísticas** — Resumo agregado de performance (lucro, ITM, mesas finais, etc.)
- **Swagger UI** — Documentação interativa da API em `/api`

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | NestJS 10 |
| ORM | Prisma 6 |
| Banco de dados | PostgreSQL |
| Autenticação | `@nestjs/jwt` + bcryptjs |
| Validação | `class-validator` + `class-transformer` |
| Documentação | `@nestjs/swagger` |

---

## Como Rodar

### Pré-requisitos

- Node.js 18+
- Yarn
- Instância PostgreSQL

### Instalação

```bash
git clone https://github.com/seu-usuario/pktracker-api.git
cd pktracker-api
yarn install
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/pktracker
JWT_SECRET=seu_jwt_secret_seguro
```

> Ambas as variáveis são validadas na inicialização — a aplicação lança um erro se alguma estiver ausente ou inválida. `JWT_SECRET` não pode ser a string `"unsecure_jwt_secret"`.

### Banco de dados

```bash
npx prisma migrate dev    # executa as migrations e gera o Prisma client
```

### Executando

```bash
yarn start:dev    # modo watch (recomendado para desenvolvimento)
yarn start        # desenvolvimento
yarn start:prod   # produção (requer um `yarn build` prévio)
```

O servidor sobe na **porta 3000**. O Swagger está disponível em `http://localhost:3000/api`.

---

## Endpoints

Todos os endpoints exceto `/auth/*` exigem o header `Authorization: Bearer <token>`.

### Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/signup` | Cadastra um novo usuário (cria o Bank automaticamente) |
| `POST` | `/auth/signin` | Login — retorna `{ accessToken }` |

### Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/users/me` | Retorna o perfil do usuário autenticado |

### Bank (Bankroll)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/banks/me` | Dados do bank do usuário autenticado |
| `POST` | `/banks/deposits` | Registra um depósito |
| `POST` | `/banks/withdrawals` | Registra um saque (validado contra o saldo) |
| `POST` | `/banks/rakes` | Registra rake recebido |
| `GET` | `/banks/rakes` | Histórico de rake |

### Torneios

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/tournaments` | Lista torneios (suporta filtros) |
| `POST` | `/tournaments` | Registra um torneio |
| `POST` | `/tournaments/bulk` | Registra múltiplos torneios de uma vez |
| `POST` | `/tournaments/apply-schedule` | Cria torneios a partir de uma agenda salva |
| `PATCH` | `/tournaments/:id` | Atualiza um torneio |
| `DELETE` | `/tournaments/:id` | Remove um torneio (reverte o efeito no bank) |

### Agendas de Torneios

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/tournaments/schedules` | Lista agendas |
| `POST` | `/tournaments/schedules` | Cria uma agenda (WEEKLY ou SUNDAY) |
| `PATCH` | `/tournaments/schedules/:id` | Atualiza uma agenda |
| `DELETE` | `/tournaments/schedules/:id` | Remove uma agenda |
| `GET` | `/tournaments/schedules/:id/items` | Lista itens de uma agenda |
| `POST` | `/tournaments/schedules/:id/items` | Adiciona um torneio à agenda |
| `PATCH` | `/tournaments/schedules/:id/items/:itemId` | Atualiza um item da agenda |
| `DELETE` | `/tournaments/schedules/:id/items/:itemId` | Remove um item da agenda |

### Estatísticas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/stats/summary` | Resumo agregado de performance |

---

## Regras de Negócio

- **Bank automático:** Um registro `Bank` é criado automaticamente no signup. Cada usuário tem exatamente um bank.
- **Cálculo de lucro:** `lucro = resultado - buy-in`. Sempre calculado no servidor; qualquer campo `profit` enviado no body é ignorado.
- **Atomicidade:** Criação/exclusão de torneios e depósitos/saques atualizam o saldo do bank dentro de transações Prisma.
- **Saldo insuficiente:** Tentar sacar mais do que o saldo disponível retorna `400 Bad Request`.
- **Aplicar agenda:** `POST /tournaments/apply-schedule` cria em lote todos os itens de uma agenda como entradas de torneio.

---

## Estrutura do Projeto

```
src/
├── app.module.ts
├── main.ts
├── shared/
│   ├── config/env.ts               # Validação de variáveis de ambiente
│   └── decorators/
│       ├── ActiveUserId.ts         # Extrai o userId do JWT
│       └── IsPublic.ts             # Marca rotas como públicas
├── database/
│   ├── prisma.service.ts
│   ├── database.module.ts
│   └── repositories/               # Toda a lógica de queries Prisma
└── modules/
    ├── auth/
    ├── users/
    ├── banks/
    ├── tournaments/
    └── stats/
```

**Arquitetura:** `Controller → Service → Repository → Prisma`. Services concentram a lógica de negócio; repositories concentram todo o acesso ao banco.

---

## Testes

```bash
yarn test          # testes unitários
yarn test:e2e      # testes end-to-end
yarn test:cov      # relatório de cobertura
```

---

## Licença

MIT
