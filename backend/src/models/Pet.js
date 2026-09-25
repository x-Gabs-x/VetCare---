const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'O nome do pet e obrigatorio'],
      trim: true,
    },
    especie: {
      type: String,
      required: [true, 'A especie do pet e obrigatoria'],
      trim: true,
    },
    raca: {
      type: String,
      trim: true,
    },
    idade: {
      type: Number,
      required: [true, 'A idade do pet e obrigatoria'],
      min: [0, 'A idade do pet nao pode ser negativa'],
    },
    peso: {
      type: Number,
      required: [true, 'O peso do pet e obrigatorio'],
      min: [0, 'O peso do pet nao pode ser negativo'],
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'O tutor do pet e obrigatorio'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Pet', petSchema);
