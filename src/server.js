const jwt = require('jsonwebtoken');
require('dotenv').config();

const { app, registrarMiddlewaresFinais } = require('./app');
const conectarBanco = require('./config/db');
const Usuario = require('./models/Usuario');
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
        const [tipo, token] = (req.headers.authorization || '').split(' ');
        if (tipo !== 'Bearer' || !token) throw new Error('Token nao informado ou invalido.');

        let payload;
        try {
          payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (erro) {
          throw new Error('Token invalido ou expirado.');
        }

        const usuario = await Usuario.findById(payload.id).select('nome email perfil ativo').lean();
        if (!usuario || !usuario.ativo) throw new Error('Usuario inexistente ou inativo.');
        return { usuario: { id: usuario._id.toString(), nome: usuario.nome, email: usuario.email, perfil: usuario.perfil } };
      },
    })
  );

  registrarMiddlewaresFinais();

  app.listen(PORTA, () => {
    console.log(`[Servidor] Rodando em http://localhost:${PORTA}`);
  });
}

iniciar();
