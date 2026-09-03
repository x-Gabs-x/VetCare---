const Usuario = require('../models/Usuario');
const asyncHandler = require('../utils/asyncHandler');

const cadastrarUsuario = asyncHandler(async (req, res) => {
  const { nome, email, senha, perfil, telefone } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({
      erro: 'Os campos nome, email, senha e perfil sao obrigatorios.',
    });
  }

  const usuarioExistente = await Usuario.findOne({ email });

  if (usuarioExistente) {
    return res.status(409).json({ erro: 'Ja existe um usuario cadastrado com este e-mail.' });
  }

  const usuario = await Usuario.create({ nome, email, senha, perfil, telefone });

  return res.status(201).json({
    id: usuario._id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    telefone: usuario.telefone,
    ativo: usuario.ativo,
    createdAt: usuario.createdAt,
  });
});

const listarUsuarios = asyncHandler(async (req, res) => {
  const { perfil } = req.query;
  const filtro = perfil ? { perfil } : {};

  const usuarios = await Usuario.find(filtro).sort({ createdAt: -1 });

  return res.status(200).json(usuarios);
});

const buscarUsuarioPorId = asyncHandler(async (req, res) => {
  const usuario = await Usuario.findById(req.params.id);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuario nao encontrado.' });
  }

  return res.status(200).json(usuario);
});

const atualizarUsuario = asyncHandler(async (req, res) => {
  const { nome, telefone, perfil, ativo, senha } = req.body;

  const usuario = await Usuario.findById(req.params.id).select('+senha');

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuario nao encontrado.' });
  }

  if (nome) usuario.nome = nome;
  if (telefone) usuario.telefone = telefone;
  if (perfil) usuario.perfil = perfil;
  if (typeof ativo === 'boolean') usuario.ativo = ativo;
  if (senha) usuario.senha = senha;

  await usuario.save();

  return res.status(200).json({
    id: usuario._id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    telefone: usuario.telefone,
    ativo: usuario.ativo,
  });
});

const removerUsuario = asyncHandler(async (req, res) => {
  const usuario = await Usuario.findById(req.params.id);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuario nao encontrado.' });
  }

  await usuario.deleteOne();

  return res.status(200).json({ mensagem: 'Usuario removido com sucesso.' });
});

module.exports = {
  cadastrarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  removerUsuario,
};
