const mongoose = require('mongoose');

const STATUS_VALIDOS = ['agendado', 'confirmado', 'concluido', 'cancelado'];

const agendamentoSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: [true, 'O pet e obrigatorio'],
    },
    veterinario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'O veterinario e obrigatorio'],
    },
    veterinarioReserva: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    data: {
      type: Date,
      required: [true, 'A data e obrigatoria'],
    },
    horario: {
      type: String, // formato "HH:mm", ex: "14:30"
      required: [true, 'O horario e obrigatorio'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: STATUS_VALIDOS,
        message: `Status invalido. Use um dos seguintes: ${STATUS_VALIDOS.join(', ')}`,
      },
      default: 'agendado',
    },
    concluidaEm: Date,
    concluidaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    observacoes: {
      type: String,
      trim: true,
    },
    tipoAgendamento: {
      type: String,
      enum: ['comum', 'emergencia', 'encaixe'],
      default: 'comum',
    },
    justificativaEmergencia: {
      type: String,
      trim: true,
      required: function justificativaObrigatoria() {
        return this.tipoAgendamento === 'emergencia';
      },
    },
    blocoEmergencia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlocoEmergencia',
    },
    estadoAnteriorDoBloco: {
      type: String,
      enum: ['reservado', 'liberado'],
    },
  },
  {
    timestamps: true,
  }
);

agendamentoSchema.index(
  { veterinario: 1, data: 1, horario: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['agendado', 'confirmado', 'concluido'] },
    },
  }
);

module.exports = mongoose.model('Agendamento', agendamentoSchema);
module.exports.STATUS_VALIDOS = STATUS_VALIDOS;