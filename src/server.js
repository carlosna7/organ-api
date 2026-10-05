import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { unwrapResolverError } from '@apollo/server/errors';
import express from 'express';
import cors from 'cors';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { connectDB } from './config/db.config.js';
import { buildContext } from './auth/auth.js';

// Sem segredo não dá para assinar os tokens
if (!process.env.JWT_SECRET) {
  console.error('Variável JWT_SECRET não definida! Configure o arquivo .env');
  process.exit(1);
}

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// conectar ao banco de dados antes de subir o servidor
await connectDB();

const app = express();

// configurar cors
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// criar o servidor Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Esconde detalhes de erros inesperados do cliente
  formatError: (formattedError, error) => {
    if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      console.error(unwrapResolverError(error));
      return { ...formattedError, message: 'Erro interno do servidor!' };
    }
    return formattedError;
  },
});

await server.start();

// usar o middleware Apollo com Express
app.use('/', express.json(), expressMiddleware(server, {
  context: buildContext,
}));

// iniciar o servidor express
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
