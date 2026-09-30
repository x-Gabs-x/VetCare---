const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      erro: 'Token nao informado. Envie o header Authorization: Bearer <token>.',
    });
  }

  const [tipo, token] = authHeader.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Formato de token invalido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // O perfil no token pode estar desatualizado se um administrador alterou
    // a conta depois do login. Use o cadastro atual como fonte de permissões.
    const usuarioAtual = await Usuario.findById(payload.id)
      .select('nome email perfil ativo')
      .lean();

    if (!usuarioAtual || !usuarioAtual.ativo) {
      return res.status(401).json({ erro: 'Usuario inexistente ou inativo.' });
    }

    req.usuario = {
      ...payload,
      id: usuarioAtual._id.toString(),
      nome: usuarioAtual.nome,
      email: usuarioAtual.email,
      perfil: usuarioAtual.perfil,
    };
    next();
  } catch (erro) {
    if (erro.name !== 'JsonWebTokenError' && erro.name !== 'TokenExpiredError' && erro.name !== 'NotBeforeError') {
      return next(erro);
    }
    return res.status(401).json({ erro: 'Token invalido ou expirado.' });
  }
}

function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Usuario nao autenticado.' });
    }

    const perfilUsuario = String(req.usuario.perfil || '').trim().toLowerCase();
    const perfisNormalizados = perfisPermitidos.map((perfil) => String(perfil).trim().toLowerCase());

    if (!perfisNormalizados.includes(perfilUsuario)) {
      return res.status(403).json({
        erro: 'Acesso negado. Voce nao tem permissao para acessar este recurso.',
      });
    }

    next();
  };
}

function identificarUsuarioOpcional(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) return next(); // sem token: segue como visitante anonimo

  const [tipo, token] = authHeader.split(' ');

  if (tipo !== 'Bearer' || !token) return next();

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch (erro) {
  }
  next();
}



module.exports = { verificarToken, autorizar, identificarUsuarioOpcional };
