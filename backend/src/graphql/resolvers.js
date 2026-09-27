const Agendamento = require('../models/Agendamento');
const Consulta = require('../models/Consulta');
const Vacina = require('../models/Vacina');
const Pet = require('../models/Pet');
const Usuario = require('../models/Usuario');

const PERFIS_VISAO_GERAL = ['veterinario', 'recepcionista', 'administrador'];

function temVisaoGeral(usuario) {
  return usuario && PERFIS_VISAO_GERAL.includes(usuario.perfil);
}

async function buscarPetOuFalhar(petId) {
  const pet = await Pet.findById(petId);

  if (!pet) {
    const erro = new Error('Pet nao encontrado.');
    erro.status = 404;
    throw erro;
  }

  return pet;
}

function usuarioPodeAcessarPet(usuario, pet) {
  if (!usuario) return false;
  if (temVisaoGeral(usuario)) return true;
  if (usuario.perfil === 'tutor') {
    return String(pet.tutor) === String(usuario.id);
  }
  return false;
}

function exigirVisaoGeral(usuario) {
  if (!temVisaoGeral(usuario)) {
    throw new Error('Acesso negado.');
  }
}

function exigirAcessoAoPet(usuario, pet) {
  if (!usuarioPodeAcessarPet(usuario, pet)) {
    throw new Error('Voce nao tem permissao para visualizar este pet.');
  }
}

function idDoDocumento(documento) {
  return documento?._id?.toString() || documento?.id?.toString();
}

const camposUsuario = 'nome email perfil telefone ativo createdAt updatedAt';
const camposPet = 'nome especie raca idade peso tutor createdAt updatedAt';
const camposVeterinario = 'nome email perfil telefone ativo';

async function buscarAgendamentos() {
  return Agendamento.find()
    .populate({
      path: 'pet',
      select: camposPet,
      populate: { path: 'tutor', select: camposUsuario },
    })
    .populate('veterinario', camposVeterinario)
    .sort({ data: 1, horario: 1 });
}

async function buscarConsultas() {
  return Consulta.find()
    .populate({
      path: 'pet',
      select: camposPet,
      populate: { path: 'tutor', select: camposUsuario },
    })
    .populate('veterinario', camposVeterinario)
    .sort({ createdAt: -1 });
}

async function buscarVacinas(filtro = {}) {
  return Vacina.find(filtro)
    .populate({
      path: 'pet',
      select: camposPet,
      populate: { path: 'tutor', select: camposUsuario },
    })
    .populate('veterinario', camposVeterinario)
    .sort({ dataAplicacao: -1 });
}

const resolvers = {
  Query: {
    me: async (_, __, context) => Usuario.findById(context.usuario.id).select(camposUsuario),

    usuarios: async (_, { perfil, nome }, context) => {
      exigirVisaoGeral(context.usuario);
      const filtro = {};

      if (perfil) filtro.perfil = perfil;
      if (nome) filtro.nome = { $regex: nome, $options: 'i' };

      return Usuario.find(filtro).select(camposUsuario).sort({ createdAt: -1 });
    },

    usuario: async (_, { id }, context) => {
      exigirVisaoGeral(context.usuario);
      return Usuario.findById(id).select(camposUsuario);
    },

    pets: async (_, __, context) => {
      const filtro = temVisaoGeral(context.usuario)
        ? {}
        : { tutor: context.usuario.id };

      return Pet.find(filtro)
        .populate('tutor', camposUsuario)
        .sort({ createdAt: -1 });
    },

    pet: async (_, { id }, context) => {
      const pet = await Pet.findById(id).populate('tutor', camposUsuario);
      if (pet) exigirAcessoAoPet(context.usuario, pet);
      return pet;
    },

    agendamentos: async (_, __, context) => {
      exigirVisaoGeral(context.usuario);
      return buscarAgendamentos();
    },

    agendamento: async (_, { id }, context) => {
      exigirVisaoGeral(context.usuario);
      return Agendamento.findById(id)
        .populate({
          path: 'pet',
          select: camposPet,
          populate: { path: 'tutor', select: camposUsuario },
        })
        .populate('veterinario', camposVeterinario);
    },

    consultas: async (_, __, context) => {
      exigirVisaoGeral(context.usuario);
      return buscarConsultas();
    },

    consultasPorPet: async (_, { petId }, context) => {
      const pet = await buscarPetOuFalhar(petId);
      exigirAcessoAoPet(context.usuario, pet);
      return Consulta.find({ pet: petId })
        .populate({
          path: 'pet',
          select: camposPet,
          populate: { path: 'tutor', select: camposUsuario },
        })
        .populate('veterinario', camposVeterinario)
        .sort({ createdAt: -1 });
    },

    vacinas: async (_, __, context) => {
      if (temVisaoGeral(context.usuario)) return buscarVacinas();
      const pets = await Pet.find({ tutor: context.usuario.id }).select('_id');
      return buscarVacinas({ pet: { $in: pets.map((pet) => pet._id) } });
    },

    vacinasPorPet: async (_, { petId }, context) => {
      const pet = await buscarPetOuFalhar(petId);
      exigirAcessoAoPet(context.usuario, pet);
      return buscarVacinas({ pet: pet.id });
    },

    lembretesVacinas: async (_, { dias = 30 }, context) => {
      exigirVisaoGeral(context.usuario);

      const hoje = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(hoje.getDate() + Number(dias));

      return buscarVacinas({
        dataPrevistaReforco: { $gte: hoje, $lte: dataLimite },
      });
    },
  },

  Usuario: {
    id: (usuario) => idDoDocumento(usuario),
  },

  Agendamento: {
    id: (agendamento) => idDoDocumento(agendamento),
    data: (agendamento) => agendamento.data?.toISOString(),
    createdAt: (agendamento) => agendamento.createdAt?.toISOString(),
    updatedAt: (agendamento) => agendamento.updatedAt?.toISOString(),
  },

  Consulta: {
    id: (consulta) => idDoDocumento(consulta),
    createdAt: (consulta) => consulta.createdAt?.toISOString(),
    updatedAt: (consulta) => consulta.updatedAt?.toISOString(),
  },

  Vacina: {
    id: (vacina) => idDoDocumento(vacina),
    dataAplicacao: (vacina) => vacina.dataAplicacao?.toISOString(),
    dataPrevistaReforco: (vacina) =>
      vacina.dataPrevistaReforco ? vacina.dataPrevistaReforco.toISOString() : null,
    createdAt: (vacina) => vacina.createdAt?.toISOString(),
    updatedAt: (vacina) => vacina.updatedAt?.toISOString(),
  },

  Pet: {
    id: (pet) => idDoDocumento(pet),
    createdAt: (pet) => pet.createdAt?.toISOString(),
    updatedAt: (pet) => pet.updatedAt?.toISOString(),
  },

};

module.exports = resolvers; 