import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { connectDB } from './config/db.config.js';
import 'dotenv/config';

// Conectar ao banco de dados
connectDB();

// Criar e iniciar o servidor Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  // Cors pode ser configurado aqui se necessário
});

console.log(`🚀 Server ready at: ${url}`);
