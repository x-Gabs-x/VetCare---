const mongoose = require('mongoose');

const Consulta = require('../models/Consulta');
const Pet = require('../models/Pet');
const Usuario = require('../models/Usuario');

const asyncHandler = require('../utils/asyncHandler');

const PERFIS_VISAO_GERAL = [
  'veterinario',
  'recepcionista',
  'administrador',
];

function usuarioPodeAcessarPet(usuario, pet) {
  if (!usuario || !pet) {
    return false;
  }

  if (PERFIS_VISAO_GERAL.includes(usuario.perfil)) {
    return true;
  }

  if (usuario.perfil === 'tutor') {
    return String(pet.tutor) === String(usuario.id);
  }

  return false;
}

const criarConsulta = asyncHandler(async (req, res) => {
  const {
    pet,
    diagnostico,
    procedimentos,
    observacoes,
  } = req.body;

  const veterinario = req.usuario.id;

  if (!pet || !diagnostico || !diagnostico.trim()) {
    return res.status(400).json({
      erro: 'Pet e diagnostico sao obrigatorios.',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(pet)) {
    return res.status(400).json({
      erro: 'ID do pet invalido.',
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
      erro: 'O usuario autenticado nao possui perfil de veterinario.',
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
    diagnostico,
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

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({
      erro: 'Voce nao tem permissao para visualizar o prontuario deste pet.',
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
  listarConsultasPorPet,
};