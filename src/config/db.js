const mongoose = require('mongoose');

async function conectarBanco() {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI nao definida no arquivo .env');
    }

    await mongoose.connect(uri);

    console.log('[MongoDB] Conectado com sucesso.');
  } catch (erro) {
    console.error('[MongoDB] Falha ao conectar:', erro.message);
    process.exit(1);
  }
}

module.exports = conectarBanco;
