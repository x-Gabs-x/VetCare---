const Pet = require('../models/Pet');
const Usuario = require('../models/Usuario');
const asyncHandler = require('../utils/asyncHandler');

const PERFIS_VISAO_GERAL = ['veterinario', 'recepcionista', 'administrador'];
const CAMPOS_EDITAVEIS = ['nome', 'especie', 'raca', 'idade', 'peso'];

function temVisaoGeral(usuario) {
  return usuario && PERFIS_VISAO_GERAL.includes(usuario.perfil);
}

function idDoTutor(pet) {
  if (!pet || !pet.tutor) return null;
  return String(pet.tutor._id || pet.tutor);
}

function usuarioPodeAcessarPet(usuario, pet) {
  if (!usuario) return false;
  if (temVisaoGeral(usuario)) return true;
  if (usuario.perfil === 'tutor') {
    return idDoTutor(pet) === String(usuario.id);
  }
  return false;
}

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

const cadastrarPet = asyncHandler(async (req, res) => {
  const { nome, especie, raca, idade, peso } = req.body;
  let tutorId;

  if (req.usuario.perfil === 'tutor') {
    tutorId = req.usuario.id;

    if (req.body.tutor && String(req.body.tutor) !== String(req.usuario.id)) {
      return res.status(403).json({
        erro: 'Tutor so pode cadastrar pets vinculados ao proprio usuario.',
      });
    }
  } else if (temVisaoGeral(req.usuario)) {
    tutorId = req.body.tutor;
  } else {
    return res.status(403).json({
      erro: 'Acesso negado. Perfil sem permissao para cadastrar pets.',
    });
  }

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
  let filtro;

  if (req.usuario.perfil === 'tutor') {
    filtro = { tutor: req.usuario.id };
  } else if (temVisaoGeral(req.usuario)) {
    filtro = {};
  } else {
    return res.status(403).json({
      erro: 'Acesso negado. Perfil sem permissao para visualizar pets.',
    });
  }

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
    return res.status(403).json({
      erro: 'Voce nao tem permissao para visualizar este pet.',
    });
  }

  return res.status(200).json(pet);
});


const atualizarPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findById(req.params.id);

  if (!pet) {
    return res.status(404).json({ erro: 'Pet nao encontrado.' });
  }

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({
      erro: 'Voce nao tem permissao para editar este pet.',
    });
  }

  if (req.usuario.perfil === 'tutor') {
    if (req.body.tutor && String(req.body.tutor) !== idDoTutor(pet)) {
      return res.status(403).json({
        erro: 'Tutor nao pode transferir o pet para outro usuario.',
      });
    }
  } else if (temVisaoGeral(req.usuario) && req.body.tutor) {
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

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({
      erro: 'Voce nao tem permissao para remover este pet.',
    });
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
