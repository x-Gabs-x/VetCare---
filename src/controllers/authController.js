const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const asyncHandler = require('../utils/asyncHandler');

function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

const login = asyncHandler(async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  const usuario = await Usuario.findOne({ email }).select('+senha');

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: 'E-mail ou senha invalidos.' });
  }

  const senhaCorreta = await usuario.compararSenha(senha);

  if (!senhaCorreta) {
    return res.status(401).json({ erro: 'E-mail ou senha invalidos.' });
  }

  const token = gerarToken(usuario);

  return res.status(200).json({
    token,
    usuario: {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
  });
});

module.exports = { login };
