const mongoose = require('mongoose');

const vacinaSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      required: [true, 'O tipo da vacina e obrigatorio'],
      trim: true,
    },
    dataAplicacao: {
      type: Date,
      required: [true, 'A data de aplicacao e obrigatoria'],
    },
    dataPrevistaReforco: {
      type: Date,
    },
    observacoes: {
      type: String,
      trim: true,
    },
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: [true, 'O pet vinculado a vacina e obrigatorio'],
      index: true,
    },
    veterinario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'O veterinario responsavel e obrigatorio'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vacina', vacinaSchema);