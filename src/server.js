require('dotenv').config();

const app = require('./app');
const conectarBanco = require('./config/db');

const PORTA = process.env.PORT || 3000;

async function iniciar() {
  await conectarBanco();

  app.listen(PORTA, () => {
    console.log(`[Servidor] Rodando em http://localhost:${PORTA}`);
  });
}

iniciar();
