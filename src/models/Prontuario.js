const mongoose = require('mongoose');

const prontuarioSchema = new mongoose.Schema(
  {
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: [true, 'O pet e obrigatorio.'],
      index: true,
      immutable: true,
    },
    veterinario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'O profissional responsavel e obrigatorio.'],
      immutable: true,
    },
    dataAtendimento: {
      type: Date,
      required: [true, 'A data do atendimento e obrigatoria.'],
    },
    motivo: {
      type: String,
      required: [true, 'O motivo do atendimento e obrigatorio.'],
      trim: true,
      maxlength: 200,
    },
    anamnese: { type: String, trim: true, maxlength: 5000 },
    diagnostico: { type: String, trim: true, maxlength: 5000 },
    tratamento: { type: String, trim: true, maxlength: 5000 },
    observacoes: { type: String, trim: true, maxlength: 5000 },
    retornoEm: { type: Date, default: null },
    arquivadoEm: { type: Date, default: null },
  },
  { timestamps: true }
);

prontuarioSchema.index({ pet: 1, dataAtendimento: -1 });

module.exports = mongoose.model('Prontuario', prontuarioSchema);
