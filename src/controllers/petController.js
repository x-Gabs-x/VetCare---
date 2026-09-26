const Pet = require('../models/Pet');
const Usuario = require('../models/Usuario');
const asyncHandler = require('../utils/asyncHandler');

const CAMPOS_EDITAVEIS = ['nome', 'especie', 'raca', 'idade', 'peso'];

async function validarTutor(tutorId) {
  if (!tutorId) {
    const erro = new Error('Informe o tutor vinculado ao pet.');
    erro.status = 400;
    throw erro;
  }

  const tutor = await Usuario.findById(tutorId);

  if (!tutor) {
    const erro = new Error('Tutor nao encontrado.');
    erro.status = 404;
    throw erro;
  }

  if (tutor.perfil !== 'tutor') {
    const erro = new Error('O usuario informado como tutor precisa possuir o perfil tutor.');
    erro.status = 400;
    throw erro;
  }

  if (!tutor.ativo) {
    const erro = new Error('Nao e possivel vincular o pet a um tutor inativo.');
    erro.status = 400;
    throw erro;
  }

  return tutor;
}

function aplicarCamposEditaveis(pet, body) {
  CAMPOS_EDITAVEIS.forEach((campo) => {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      pet[campo] = body[campo];
    }
  });
}

function idDeReferencia(valor) {
  if (!valor) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'object') {
    if (valor._id) return valor._id.toString();
    if (valor.id) return valor.id.toString();
    return valor.toString();
  }
  return String(valor);
}

function temVisaoGeral(usuario) {
  return Boolean(usuario && ['administrador', 'veterinario', 'recepcionista'].includes(usuario.perfil));
}

function usuarioPodeAcessarPet(usuario, pet) {
  if (!usuario) return false;
  if (temVisaoGeral(usuario)) return true;
  if (usuario.perfil === 'tutor') {
    const tutorId = idDeReferencia(pet?.tutor);
    return Boolean(tutorId) && String(tutorId) === String(usuario.id);
  }
  return false;
}

const cadastrarPet = asyncHandler(async (req, res) => {
  const { nome, especie, raca, idade, peso, tutor: tutorId } = req.body;

  await validarTutor(tutorId);

  const pet = await Pet.create({
    nome,
    especie,
    raca,
    idade,
    peso,
    tutor: tutorId,
  });

  await pet.populate('tutor', 'nome email telefone perfil');

  return res.status(201).json(pet);
});

const listarPets = asyncHandler(async (req, res) => {
  const filtro = temVisaoGeral(req.usuario) ? {} : { tutor: req.usuario.id };

  const pets = await Pet.find(filtro)
    .populate('tutor', 'nome email telefone perfil')
    .sort({ createdAt: -1 });

  return res.status(200).json(pets);
});


const buscarPetPorId = asyncHandler(async (req, res) => {
  const pet = await Pet.findById(req.params.id).populate(
    'tutor',
    'nome email telefone perfil'
  );

  if (!pet) {
    return res.status(404).json({ erro: 'Pet nao encontrado.' });
  }

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para visualizar este pet.' });
  }

  return res.status(200).json(pet);
});


const atualizarPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findById(req.params.id);

  if (!pet) {
    return res.status(404).json({ erro: 'Pet nao encontrado.' });
  }

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({ erro: 'Voce nao tem permissao para alterar este pet.' });
  }

  if (req.body.tutor) {
    await validarTutor(req.body.tutor);
    pet.tutor = req.body.tutor;
  }

  aplicarCamposEditaveis(pet, req.body);
  await pet.save();
  await pet.populate('tutor', 'nome email telefone perfil');

  return res.status(200).json(pet);
});


const removerPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findById(req.params.id);

  if (!pet) {
    return res.status(404).json({ erro: 'Pet nao encontrado.' });
  }

  await pet.deleteOne();

  return res.status(200).json({ mensagem: 'Pet removido com sucesso.' });
});

module.exports = {
  cadastrarPet,
  listarPets,
  buscarPetPorId,
  atualizarPet,
  removerPet,
};
