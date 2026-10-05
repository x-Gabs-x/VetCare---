const mongoose = require('mongoose');

const remanejamentoAgendamentoSchema = new mongoose.Schema(
  {
    agendamento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agendamento',
      required: true,
    },
    veterinarioOriginal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    veterinarioProposto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    justificativaEmergencia: {
      type: String,
      trim: true,
      required: true,
    },
    agendamentoEmergencia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agendamento',
      required: true,
    },
    estado: {
      type: String,
      enum: [
        'aguardando_aprovacao',
        'aguardando_tutor',
        'confirmado',
        'recusado',
        'cancelado',
      ],
      default: 'aguardando_aprovacao',
    },
    propostoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    aprovadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    aprovadoEm: Date,
    tutorConfirmadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    tutorConfirmadoEm: Date,
    motivoRecusa: String,
  },
  { timestamps: true }
);

remanejamentoAgendamentoSchema.index(
  { agendamento: 1 },
  {
    unique: true,
    partialFilterExpression: {
      estado: { $in: ['aguardando_aprovacao', 'aguardando_tutor'] },
    },
  }
);

module.exports = mongoose.model(
  'RemanejamentoAgendamento',
  remanejamentoAgendamentoSchema
);