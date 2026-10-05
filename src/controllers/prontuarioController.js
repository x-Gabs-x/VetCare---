const mongoose = require('mongoose');
const Prontuario = require('../models/Prontuario');
const Pet = require('../models/Pet');
const asyncHandler = require('../utils/asyncHandler');

const CAMPOS_EDITAVEIS = ['dataAtendimento', 'motivo', 'anamnese', 'diagnostico', 'tratamento', 'observacoes', 'retornoEm'];

function erroHttp(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw erroHttp(400, 'Identificador invalido.');
  }
}

function podeVerPet(usuario, pet) {
  const tutorId = pet?.tutor?._id || pet?.tutor;
  return usuario.perfil !== 'tutor' || String(tutorId) === String(usuario.id);
}

async function buscarPetAcessivel(id, usuario) {
  validarId(id);
  const pet = await Pet.findById(id);
  if (!pet) throw erroHttp(404, 'Pet nao encontrado.');
  if (!podeVerPet(usuario, pet)) throw erroHttp(403, 'Acesso negado ao prontuario deste pet.');
  return pet;
}

function validarCampos(body, parcial = false) {
  if (!parcial || Object.prototype.hasOwnProperty.call(body, 'motivo')) {
    if (typeof body.motivo !== 'string' || !body.motivo.trim()) {
      throw erroHttp(400, 'Informe o motivo do atendimento.');
    }
  }

  for (const campo of ['anamnese', 'diagnostico', 'tratamento', 'observacoes']) {
    if (body[campo] !== undefined && typeof body[campo] !== 'string') {
      throw erroHttp(400, `${campo} deve ser um texto.`);
    }
  }

  if (!parcial || Object.prototype.hasOwnProperty.call(body, 'dataAtendimento')) {
    if (!body.dataAtendimento || Number.isNaN(new Date(body.dataAtendimento).getTime())) {
      throw erroHttp(400, 'Informe uma data de atendimento valida.');
    }
  }

  if (body.retornoEm && Number.isNaN(new Date(body.retornoEm).getTime())) {
    throw erroHttp(400, 'Informe uma data de retorno valida.');
  }
}

function preencherCampos(documento, body) {
  for (const campo of CAMPOS_EDITAVEIS) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      documento[campo] = campo === 'retornoEm' && !body[campo] ? null : body[campo];
    }
  }
}

function popular(query) {
  return query
    .populate({ path: 'pet', select: 'nome especie raca idade peso tutor', populate: { path: 'tutor', select: 'nome email telefone' } })
    .populate('veterinario', 'nome email perfil');
}

async function popularDocumento(documento) {
  await documento.populate([
    { path: 'pet', select: 'nome especie raca idade peso tutor', populate: { path: 'tutor', select: 'nome email telefone' } },
    { path: 'veterinario', select: 'nome email perfil' },
  ]);
}

const listarProntuarios = asyncHandler(async (req, res) => {
  const filtro = { arquivadoEm: null };
  if (req.query.petId) {
    const pet = await buscarPetAcessivel(req.query.petId, req.usuario);
    filtro.pet = pet._id;
  } else if (req.usuario.perfil === 'tutor') {
    const pets = await Pet.find({ tutor: req.usuario.id }).select('_id');
    filtro.pet = { $in: pets.map((pet) => pet._id) };
  }

  const prontuarios = await popular(Prontuario.find(filtro).sort({ dataAtendimento: -1, createdAt: -1 }));
  return res.json(prontuarios);
});

const buscarProntuario = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const prontuario = await popular(Prontuario.findOne({ _id: req.params.id, arquivadoEm: null }));
  if (!prontuario) throw erroHttp(404, 'Prontuario nao encontrado.');
  if (!podeVerPet(req.usuario, prontuario.pet)) throw erroHttp(403, 'Acesso negado a este prontuario.');
  return res.json(prontuario);
});

const criarProntuario = asyncHandler(async (req, res) => {
  const pet = await buscarPetAcessivel(req.body.pet, req.usuario);
  if (pet.ativo === false) throw erroHttp(400, 'Nao e possivel registrar atendimento para um pet arquivado.');
  validarCampos(req.body);
  const prontuario = new Prontuario({ pet: req.body.pet, veterinario: req.usuario.id });
  preencherCampos(prontuario, req.body);
  await prontuario.save();
  await popularDocumento(prontuario);
  return res.status(201).json(prontuario);
});

const atualizarProntuario = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  validarCampos(req.body, true);
  const prontuario = await Prontuario.findOne({ _id: req.params.id, arquivadoEm: null });
  if (!prontuario) throw erroHttp(404, 'Prontuario nao encontrado.');
  preencherCampos(prontuario, req.body);
  await prontuario.save();
  await popularDocumento(prontuario);
  return res.json(prontuario);
});

const arquivarProntuario = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const prontuario = await Prontuario.findOneAndUpdate(
    { _id: req.params.id, arquivadoEm: null },
    { $set: { arquivadoEm: new Date() } },
    { new: true }
  );
  if (!prontuario) throw erroHttp(404, 'Prontuario nao encontrado.');
  return res.json({ mensagem: 'Prontuario arquivado com sucesso.' });
});

module.exports = {
  listarProntuarios,
  buscarProntuario,
  criarProntuario,
  atualizarProntuario,
  arquivarProntuario,
};
