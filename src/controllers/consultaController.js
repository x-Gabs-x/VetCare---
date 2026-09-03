const mongoose = require('mongoose');

const Consulta = require('../models/Consulta');
const Pet = require('../models/Pet');
const Usuario = require('../models/Usuario');

const asyncHandler = require('../utils/asyncHandler');

const criarConsulta = asyncHandler(async (req, res) => {
  const {
    pet,
    veterinario,
    motivoConsulta,
    procedimentos,
    observacoes,
  } = req.body;

  if (!pet || !veterinario || !motivoConsulta || !motivoConsulta.trim()) {
    return res.status(400).json({
      erro: 'Pet, veterinario e motivo da consulta sao obrigatorios.',
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(pet) ||
    !mongoose.Types.ObjectId.isValid(veterinario)
  ) {
    return res.status(400).json({
      erro: 'ID do pet ou do veterinario invalido.',
    });
  }

  if (
    procedimentos !== undefined &&
    !Array.isArray(procedimentos)
  ) {
    return res.status(400).json({
      erro: 'Procedimentos deve ser uma lista.',
    });
  }

  const petEncontrado = await Pet.findById(pet);

  if (!petEncontrado) {
    return res.status(404).json({
      erro: 'Pet nao encontrado.',
    });
  }

  const veterinarioEncontrado = await Usuario.findById(veterinario);

  if (!veterinarioEncontrado) {
    return res.status(404).json({
      erro: 'Veterinario nao encontrado.',
    });
  }

  if (veterinarioEncontrado.perfil !== 'veterinario') {
    return res.status(403).json({
      erro: 'O usuario informado nao possui perfil de veterinario.',
    });
  }

  if (!veterinarioEncontrado.ativo) {
    return res.status(403).json({
      erro: 'O veterinario informado esta inativo.',
    });
  }

  const consulta = await Consulta.create({
    pet,
    veterinario,
    motivoConsulta,
    procedimentos,
    observacoes,
  });

  await consulta.populate([
    {
      path: 'pet',
      select: 'nome especie raca tutor',
    },
    {
      path: 'veterinario',
      select: 'nome email perfil',
    },
  ]);

  return res.status(201).json({
    mensagem: 'Consulta registrada com sucesso.',
    consulta,
  });
});

const listarTodasConsultas = asyncHandler(async (req, res) => {
  const consultas = await Consulta.find({})
    .populate('pet', 'nome especie raca tutor')
    .populate('veterinario', 'nome email perfil')
    .sort({ createdAt: -1 });

  return res.status(200).json(consultas);
});

const listarConsultasPorPet = asyncHandler(async (req, res) => {
  const { petId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(petId)) {
    return res.status(400).json({
      erro: 'ID do pet invalido.',
    });
  }

  const pet = await Pet.findById(petId);

  if (!pet) {
    return res.status(404).json({
      erro: 'Pet nao encontrado.',
    });
  }

  const consultas = await Consulta.find({
    pet: petId,
  })
    .populate('veterinario', 'nome email perfil')
    .sort({ createdAt: -1 });

  return res.status(200).json(consultas);
});

module.exports = {
  criarConsulta,
  listarTodasConsultas,
  listarConsultasPorPet,
};