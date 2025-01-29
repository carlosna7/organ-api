import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { connectDB } from './config/db.config.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// cnectar ao banco de dados
connectDB();

const app = express();

// configurar cors
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// criar o servidor Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

// usar o middleware Apollo com Express
app.use('/', bodyParser.json(), expressMiddleware(server, {
  context: async ({ req, res }) => ({ req, res }), 
}));

// iniciar o servidor wexpress
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at ${PORT}`);
});
