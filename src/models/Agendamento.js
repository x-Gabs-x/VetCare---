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
    observacoes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Agendamento', agendamentoSchema);
module.exports.STATUS_VALIDOS = STATUS_VALIDOS;