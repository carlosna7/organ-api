# organ-api

API GraphQL do Organ (Express + Apollo Server 4 + Mongoose).

## Como rodar

1. Copie `.env.example` para `.env` e preencha `MONGO_DB` e `JWT_SECRET` (o mesmo segredo do frontend).
2. `npm install`
3. `npm run dev` (com nodemon) ou `npm start`

A API fica em `http://localhost:4000/` (porta definida por `PORT`).

## Autenticação

`login`, `register` e `createCompany` devolvem `{ token, employee }`. As demais operações exigem o header
`Authorization: Bearer <token>` e só acessam a empresa do token.
