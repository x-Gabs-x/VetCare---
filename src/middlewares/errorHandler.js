function errorHandler(erro, req, res, next) {
  console.error(erro);

  if (erro.name === 'ValidationError') {
    const mensagens = Object.values(erro.errors).map((e) => e.message);
    return res.status(400).json({ erro: mensagens.join(' ') });
  }

  if (erro.name === 'CastError') {
    return res.status(400).json({ erro: 'Identificador invalido.' });
  }

  if (erro.code === 11000) {
    return res.status(409).json({ erro: 'Registro duplicado.' });
  }

  return res.status(erro.status || 500).json({
    erro: erro.message || 'Erro interno no servidor.',
  });
}

module.exports = errorHandler;
