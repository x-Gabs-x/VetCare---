const mongoose = require('mongoose');

const blocoEmergenciaSchema = new mongoose.Schema(
  {
    data: {
      type: Date,
      required: true,
    },
    veterinario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    horario: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    estado: {
      type: String,
      enum: ['reservado', 'liberado', 'utilizado'],
      default: 'reservado',
    },
    agendamento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agendamento',
    },
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    liberadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    liberadoEm: Date,
  },
  { timestamps: true }
);

blocoEmergenciaSchema.index(
  { data: 1, veterinario: 1, horario: 1 },
  { unique: true }
);

module.exports = mongoose.model('BlocoEmergencia', blocoEmergenciaSchema);