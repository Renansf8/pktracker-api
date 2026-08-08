# Recuperação de senha

Este documento explica como o fluxo de "esqueci minha senha" funciona na `pktracker-api`, as decisões de segurança por trás dele e como configurar o envio de email via [Resend](https://resend.com).

## Visão geral

O fluxo tem duas etapas, cada uma com seu próprio endpoint:

1. **Solicitar o reset** — `POST /auth/forgot-password`
2. **Confirmar o reset** — `POST /auth/reset-password`

```
┌──────────┐   1. POST /auth/forgot-password { email }   ┌──────────┐
│  Cliente │ ───────────────────────────────────────────▶│   API    │
└──────────┘                                              └────┬─────┘
                                                                │ gera token aleatório
                                                                │ salva hash(token) + expiração
                                                                │ envia email (Resend)
                                                                ▼
                                                          ┌──────────┐
                                                          │  Email   │
                                                          └────┬─────┘
                                                                │ usuário clica no link
                                                                ▼
┌──────────┐   2. POST /auth/reset-password               ┌──────────┐
│  Cliente │   { token, newPassword }                      │   API    │
└──────────┘ ───────────────────────────────────────────▶ └────┬─────┘
                                                                │ hash(token) bate no banco?
                                                                │ ainda não expirou?
                                                                │ atualiza senha (bcrypt)
                                                                │ invalida o token
                                                                ▼
                                                           senha trocada
```

## Endpoints

### `POST /auth/forgot-password`

Público (não exige JWT).

**Request:**
```json
{ "email": "user@email.com" }
```

**Response (sempre 200, exista o email ou não):**
```json
{ "message": "Se esse email estiver cadastrado, um link de recuperação foi enviado." }
```

**Por que a resposta é sempre igual?** Se a API respondesse diferente para "email existe" vs "email não existe", qualquer pessoa poderia usar esse endpoint para descobrir quais emails estão cadastrados no sistema (*user enumeration*). Por isso o `AuthService.forgotPassword` retorna a mesma mensagem genérica em ambos os casos — internamente, se o usuário não existir, a função simplesmente não faz nada além de retornar essa mensagem.

### `POST /auth/reset-password`

Público (não exige JWT) — a autenticação aqui é o próprio token do link.

**Request:**
```json
{ "token": "a1b2c3...", "newPassword": "novaSenha123" }
```

**Response (200):**
```json
{ "message": "Senha redefinida com sucesso." }
```

**Response (400) — token inválido ou expirado:**
```json
{ "statusCode": 400, "message": "Token inválido ou expirado." }
```

## O que acontece por baixo dos panos

### 1. Geração do token (`AuthService.forgotPassword`)

```ts
const token = randomBytes(32).toString('hex');           // token que vai por email
const resetTokenHash = this.hashResetToken(token);        // sha256(token), salvo no banco
const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // expira em 30 min
```

- O token em si (`randomBytes(32)`) **nunca é salvo no banco** — só o hash SHA-256 dele.
- Isso é o mesmo raciocínio de nunca guardar senha em texto puro: se o banco vazar, ninguém consegue usar o valor salvo para "logar como reset" em qualquer conta.
- Usamos SHA-256 (`crypto.createHash`) em vez de bcrypt aqui porque o token já é aleatório (256 bits de entropia) e de vida curta — não precisa da lentidão proposital do bcrypt, que existe para dificultar força bruta sobre senhas *previsíveis* (curtas, escolhidas por humanos).

### 2. Persistência (`UsersRepository`)

Dois campos novos no model `User` (migration `20260808223550_add_password_reset_fields`):

```prisma
resetTokenHash      String?   @map("reset_token_hash")
resetTokenExpiresAt DateTime? @map("reset_token_expires_at")
```

Métodos adicionados ao `UsersRepository`:

- `setResetToken(userId, resetTokenHash, resetTokenExpiresAt)` — grava o hash e a expiração ao solicitar o reset.
- `findByValidResetTokenHash(resetTokenHash)` — busca um usuário cujo hash bata **e** cuja expiração ainda não tenha passado (`resetTokenExpiresAt: { gt: new Date() }`). Se o token expirou, essa query já não retorna nada.
- `resetPassword(userId, hashedPassword)` — atualiza a senha e **limpa os campos de token** (`null`), tornando o token de uso único: depois de usado, não serve mais.

### 3. Envio do email (`MailService`, via Resend)

`src/shared/mail/mail.service.ts` encapsula o SDK do Resend:

```ts
await this.resend.emails.send({
  from: env.resendFromEmail,
  to,
  subject: 'Recuperação de senha - PKTracker',
  html: `... link para ${resetLink} ...`,
});
```

O link enviado é montado como:

```
${FRONTEND_URL}/reset-password?token=${token}
```

O frontend é responsável por ter uma tela em `/reset-password` que lê o `token` da URL e chama `POST /auth/reset-password` com ele + a nova senha digitada pelo usuário.

### 4. Confirmação (`AuthService.resetPassword`)

```ts
const resetTokenHash = this.hashResetToken(token);
const user = await this.usersRepository.findByValidResetTokenHash(resetTokenHash);

if (!user) {
  throw new BadRequestException('Token inválido ou expirado.');
}

const hashedPassword = await hash(newPassword, 10);
await this.usersRepository.resetPassword(user.id, hashedPassword);
```

Mesmo `bcryptjs` já usado no signup/signin — consistência com o resto da autenticação.

## Variáveis de ambiente novas

Validadas em `src/shared/config/env.ts`, seguindo o mesmo padrão das existentes (o app não sobe se faltarem):

| Variável | Descrição |
|---|---|
| `RESEND_API_KEY` | API key da conta Resend (gerada em [resend.com/api-keys](https://resend.com/api-keys)). |
| `RESEND_FROM_EMAIL` | Endereço remetente. Em dev, pode usar `onboarding@resend.dev` (sandbox do Resend — só envia para o email da própria conta Resend). Em produção, precisa ser um endereço de um domínio verificado no Resend. |
| `FRONTEND_URL` | Base URL do frontend, usada para montar o link do email (`{FRONTEND_URL}/reset-password?token=...`). |

Essas três chaves já foram adicionadas ao `.env` local (com `RESEND_FROM_EMAIL` e `FRONTEND_URL` preenchidos com valores de dev) — falta só colar sua API key do Resend em `RESEND_API_KEY`.

## Decisões de segurança (resumo)

- **Resposta genérica em `/forgot-password`** — não revela se o email existe (evita enumeration).
- **Token nunca fica em texto puro no banco** — só o hash SHA-256.
- **Expiração curta (30 min)** — reduz a janela de ataque caso o email seja interceptado.
- **Token de uso único** — é apagado do banco assim que a senha é trocada com sucesso.
- **Token é criptograficamente aleatório** (`crypto.randomBytes(32)`, 256 bits) — não é o JWT de sessão, nem um valor previsível.

## Possíveis melhorias futuras (não implementadas)

- **Rate limiting** em `/auth/forgot-password` — hoje nada impede alguém de chamar o endpoint repetidamente para o mesmo email e disparar vários emails.
- **Log/auditoria** de quando um reset foi solicitado/concluído.
- Migrar `RESEND_FROM_EMAIL` de `onboarding@resend.dev` para um domínio verificado antes de ir para produção — o sandbox do Resend só entrega emails para o endereço dono da conta.

## Arquivos alterados/criados

```
prisma/schema.prisma                              # + resetTokenHash, resetTokenExpiresAt
prisma/migrations/20260808223550_add_password_reset_fields/

src/shared/config/env.ts                          # + resendApiKey, resendFromEmail, frontendUrl
src/shared/mail/mail.module.ts                     # novo
src/shared/mail/mail.service.ts                    # novo

src/database/repositories/users.repositories.ts    # + setResetToken, findByValidResetTokenHash, resetPassword

src/modules/auth/dto/forgot-password.dto.ts         # novo
src/modules/auth/dto/reset-password.dto.ts          # novo
src/modules/auth/auth.service.ts                    # + forgotPassword, resetPassword
src/modules/auth/auth.controller.ts                 # + POST /auth/forgot-password, POST /auth/reset-password
src/modules/auth/auth.module.ts                     # + import MailModule
```
