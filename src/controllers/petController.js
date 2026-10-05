const Pet = require('../models/Pet');
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const asyncHandler = require('../utils/asyncHandler');

const CAMPOS_EDITAVEIS = ['nome', 'especie', 'raca', 'idade', 'peso'];

async function validarTutor(tutorId) {
  if (!tutorId) {
    const erro = new Error('Informe o tutor vinculado ao pet.');
    erro.status = 400;
    throw erro;
  }

  if (!mongoose.Types.ObjectId.isValid(tutorId)) {
    const erro = new Error('Identificador do tutor invalido.');
    erro.status = 400;
    throw erro;
  }

  const tutor = await Usuario.findById(tutorId);

  if (!tutor) {
    const erro = new Error('Tutor nao encontrado.');
    erro.status = 404;
    throw erro;
  }

  if (!tutor.ativo) {
    const erro = new Error('Nao e possivel vincular o pet a um usuario inativo.');
    erro.status = 400;
    throw erro;
  }

  if (tutor.perfil !== 'tutor') {
    const erro = new Error('O responsavel pelo pet deve ter perfil de tutor.');
    erro.status = 400;
    throw erro;
  }

  return tutor;
}

function aplicarCamposEditaveis(pet, body) {
  CAMPOS_EDITAVEIS.forEach((campo) => {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      pet[campo] = body[campo];
    }
  });
}

function idDeReferencia(valor) {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'object') {
    if (valor._id) return valor._id.toString();
    if (valor.id) return valor.id.toString();
    return valor.toString();
  }
  return String(valor);
}

function temVisaoGeral(usuario) {
  return Boolean(usuario && ['administrador', 'veterinario', 'recepcionista'].includes(usuario.perfil));
}

function validarTutorDoUsuario(usuario, tutorIdInformado) {
  if (!usuario) {
    const erro = new Error('Usuario nao autenticado.');
    erro.status = 401;
    throw erro;
  }

  if (usuario.perfil === 'tutor') {
    const tutorId = tutorIdInformado || usuario.id;
    if (String(tutorId) !== String(usuario.id)) {
      const erro = new Error('O tutor so pode cadastrar um pet vinculado ao seu proprio id.');
      erro.status = 403;
      throw erro;
    }
  }

  return true;
}

function usuarioPodeAcessarPet(usuario, pet) {
  if (!usuario) return false;
  if (temVisaoGeral(usuario)) return true;
  if (usuario.perfil === 'tutor') {
    const tutorId = idDeReferencia(pet?.tutor);
    return Boolean(tutorId) && String(tutorId) === String(usuario.id);
  }
  return false;
}

const cadastrarPet = asyncHandler(async (req, res) => {
  if (!req.usuario) {
    const erro = new Error('Usuario nao autenticado.');
    erro.status = 401;
    throw erro;
  }
  const tutorIdInformado = req.body.tutor || req.body.tutorId;
  const tutorIdFinal = req.usuario?.perfil === 'tutor'
    ? req.usuario.id
    : tutorIdInformado;

  if (!req.body.nome || !req.body.especie || req.body.idade === undefined || req.body.peso === undefined) {
    const erro = new Error('Informe nome, especie, idade e peso do pet.');
    erro.status = 400;
    throw erro;
  }

  if (req.body.idade === '' || req.body.peso === '' || !Number.isInteger(Number(req.body.idade)) || Number(req.body.idade) < 0 || !Number.isFinite(Number(req.body.peso)) || Number(req.body.peso) < 0) {
    const erro = new Error('Idade deve ser um numero inteiro e peso deve ser um numero nao negativo.');
    erro.status = 400;
    throw erro;
  }

  validarTutorDoUsuario(req.usuario, tutorIdFinal);
  await validarTutor(tutorIdFinal);

  const pet = await Pet.create({
    nome: req.body.nome,
    especie: req.body.especie,
    raca: req.body.raca,
    idade: Number(req.body.idade),
    peso: Number(req.body.peso),
    tutor: tutorIdFinal,
  });

  await pet.populate('tutor', 'nome email telefone perfil');

  return res.status(201).json(pet);
});

const listarPets = asyncHandler(async (req, res) => {
  const filtro = temVisaoGeral(req.usuario)
    ? {}
    : { tutor: req.usuario.id, ativo: { $ne: false } };

  const pets = await Pet.find(filtro)
    .populate('tutor', 'nome email telefone perfil')
    .sort({ createdAt: -1 });

  return res.status(200).json(pets);
});


const buscarPetPorId = asyncHandler(async (req, res) => {
  const filtro = temVisaoGeral(req.usuario)
    ? { _id: req.params.id }
    : { _id: req.params.id, ativo: { $ne: false } };
  const pet = await Pet.findOne(filtro).populate(
    'tutor',
    'nome email telefone perfil'
  );

  if (!pet) {
    return res.status(404).json({ erro: 'Pet nao encontrado.' });
  }

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para visualizar este pet.' });
  }

  return res.status(200).json(pet);
});


const atualizarPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findOne({ _id: req.params.id, ativo: { $ne: false } });

  if (!pet) {
    return res.status(404).json({ erro: 'Pet nao encontrado.' });
  }

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para alterar este pet.' });
  }

  if (req.body.tutor && req.usuario.perfil === 'tutor') {
    return res.status(403).json({ erro: 'O tutor do pet nao pode ser alterado por esta conta.' });
  }

  if (req.body.tutor) {
    await validarTutor(req.body.tutor);
    pet.tutor = req.body.tutor;
  }

  aplicarCamposEditaveis(pet, req.body);
  if (req.body.idade === '' || req.body.peso === '' || !Number.isInteger(Number(pet.idade)) || Number(pet.idade) < 0 || !Number.isFinite(Number(pet.peso)) || Number(pet.peso) < 0) {
    return res.status(400).json({ erro: 'Idade deve ser um numero inteiro e peso deve ser um numero nao negativo.' });
  }
  await pet.save();
  await pet.populate('tutor', 'nome email telefone perfil');

  return res.status(200).json(pet);
});


const removerPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findOne({ _id: req.params.id, ativo: { $ne: false } });

  if (!pet) {
    return res.status(404).json({ erro: 'Pet nao encontrado.' });
  }

  pet.ativo = false;
  await pet.save();

  return res.status(200).json({ mensagem: 'Pet arquivado com sucesso.' });
});

module.exports = {
  cadastrarPet,
  listarPets,
  buscarPetPorId,
  atualizarPet,
  removerPet,
  validarTutorDoUsuario,
};
