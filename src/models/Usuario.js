const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PERFIS_VALIDOS = ['veterinario', 'recepcionista', 'tutor', 'administrador'];

const usuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'O nome e obrigatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'O e-mail e obrigatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    senha: {
      type: String,
      required: [true, 'A senha e obrigatoria'],
      minlength: [6, 'A senha deve ter no minimo 6 caracteres'],
      select: false,
    },
    perfil: {
      type: String,
      enum: {
        values: PERFIS_VALIDOS,
        message: `Perfil invalido. Use um dos seguintes: ${PERFIS_VALIDOS.join(', ')}`,
      },
      required: [true, 'O perfil e obrigatorio'],
    },
    telefone: {
      type: String,
      trim: true,
    },
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

usuarioSchema.pre('save', async function hashSenha(next) {
  if (!this.isModified('senha')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
  next();
});

usuarioSchema.methods.compararSenha = async function compararSenha(senhaInformada) {
  return bcrypt.compare(senhaInformada, this.senha);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
module.exports.PERFIS_VALIDOS = PERFIS_VALIDOS;
