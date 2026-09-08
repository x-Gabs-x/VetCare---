const Agendamento = require('../models/Agendamento');
const Vacina = require('../models/Vacina');
const Pet = require('../models/Pet');

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

const resolvers = {
  Query: {
    agendamentos: async (_, __, context) => {
      const { usuario } = context;

      if (!['administrador', 'veterinario'].includes(usuario.perfil)) {
        throw new Error('Acesso negado.');
      }

      return Agendamento.find()
        .populate('pet', 'nome especie raca')
        .populate('veterinario', 'nome email');
    },

    vacinasPorPet: async (_, { petId }, context) => {
      const { usuario } = context;
      const pet = await buscarPetOuFalhar(petId);

      if (!usuarioPodeAcessarPet(usuario, pet)) {
        throw new Error('Voce nao tem permissao para visualizar as vacinas deste pet.');
      }

      return Vacina.find({ pet: pet.id })
        .populate('pet', 'nome especie raca tutor')
        .populate('veterinario', 'nome email')
        .sort({ dataAplicacao: -1 });
    },

    lembretesVacinas: async (_, { dias = 30 }, context) => {
      const { usuario } = context;

      if (!temVisaoGeral(usuario)) {
        throw new Error('Acesso negado. Apenas veterinario, recepcionista ou administrador podem ver os lembretes.');
      }

      const hoje = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(hoje.getDate() + Number(dias));

      return Vacina.find({
        dataPrevistaReforco: { $gte: hoje, $lte: dataLimite },
      })
        .populate('pet', 'nome especie raca tutor')
        .populate('veterinario', 'nome email')
        .sort({ dataPrevistaReforco: 1 });
    },
  },

  Agendamento: {
    id: (agendamento) => agendamento._id.toString(),
    data: (agendamento) => agendamento.data.toISOString(),
  },

  Vacina: {
    id: (vacina) => vacina._id.toString(),
    dataAplicacao: (vacina) => vacina.dataAplicacao.toISOString(),
    dataPrevistaReforco: (vacina) =>
      vacina.dataPrevistaReforco ? vacina.dataPrevistaReforco.toISOString() : null,
  },

  Pet: {
    id: (pet) => pet._id.toString(),
  },

  Veterinario: {
    id: (veterinario) => veterinario._id.toString(),
  },
};

module.exports = resolvers; 