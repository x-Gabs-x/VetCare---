const Agendamento = require('../models/Agendamento');

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
  },

  Agendamento: {
    id: (agendamento) => agendamento._id.toString(),
    data: (agendamento) => agendamento.data.toISOString(),
  },

  Pet: {
    id: (pet) => pet._id.toString(),
  },

  Veterinario: {
    id: (veterinario) => veterinario._id.toString(),
  },
};

module.exports = resolvers; 