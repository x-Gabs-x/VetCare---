const jwt = require('jsonwebtoken');
require('dotenv').config();

const { app, registrarMiddlewaresFinais } = require('./app');
const conectarBanco = require('./config/db');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

const PORTA = process.env.PORT || 3000;

async function iniciar() {
  await conectarBanco();

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

app.use(
  '/graphql',
  expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new Error('Token nao informado.');
      }

      const [tipo, token] = authHeader.split(' ');

      if (tipo !== 'Bearer' || !token) {
        throw new Error('Formato de token invalido.');
      }

      try {
        const usuario = jwt.verify(token, process.env.JWT_SECRET);

        return { usuario };
      } catch (erro) {
        throw new Error('Token invalido ou expirado.');
      }
    },
  })
);

  registrarMiddlewaresFinais();

  app.listen(PORTA, () => {
    console.log(`[Servidor] Rodando em http://localhost:${PORTA}`);
  });
}

iniciar();
