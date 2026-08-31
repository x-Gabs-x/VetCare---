const Vacina = require('../models/Vacina');
const Pet = require('../models/Pet');
const asyncHandler = require('../utils/asyncHandler');

const PERFIS_VISAO_GERAL = ['veterinario', 'recepcionista', 'administrador'];

function temVisaoGeral(usuario) {
  return usuario && PERFIS_VISAO_GERAL.includes(usuario.perfil);
}

async function buscarPetOuFalhar(petId) {
  const pet = await Pet.findById(petId);

  if (!pet) {
    const erro = new Error('Pet nao encontrado.');
    erro.status = 404;
    throw erro;
  }

  return pet;
}

function usuarioPodeAcessarPet(usuario, pet) {
  if (!usuario) return false;
  if (temVisaoGeral(usuario)) return true;
  if (usuario.perfil === 'tutor') {
    return String(pet.tutor) === String(usuario.id);
  }
  return false;
}

const registrarVacina = asyncHandler(async (req, res) => {
  const { pet, tipo, dataAplicacao, dataPrevistaReforco, observacoes } = req.body;

  if (!temVisaoGeral(req.usuario)) {
    return res.status(403).json({
      erro: 'Acesso negado. Apenas veterinario, recepcionista ou administrador podem registrar vacinas.',
    });
  }

  const petEncontrado = await buscarPetOuFalhar(pet);

  const vacina = await Vacina.create({
    tipo,
    dataAplicacao,
    dataPrevistaReforco,
    observacoes,
    pet: petEncontrado.id,
    veterinario: req.usuario.id,
  });

  await vacina.populate('pet', 'nome especie raca');
  await vacina.populate('veterinario', 'nome');

  return res.status(201).json(vacina);
});

const listarVacinasPorPet = asyncHandler(async (req, res) => {
  const pet = await buscarPetOuFalhar(req.params.petId);

  if (!usuarioPodeAcessarPet(req.usuario, pet)) {
    return res.status(403).json({
      erro: 'Voce nao tem permissao para visualizar as vacinas deste pet.',
    });
  }

  const vacinas = await Vacina.find({ pet: pet.id })
    .populate('veterinario', 'nome')
    .sort({ dataAplicacao: -1 });

  return res.status(200).json(vacinas);
});

const listarLembretes = asyncHandler(async (req, res) => {
  if (!temVisaoGeral(req.usuario)) {
    return res.status(403).json({
      erro: 'Acesso negado. Apenas veterinario, recepcionista ou administrador podem ver os lembretes.',
    });
  }

  const dias = Number(req.query.dias) || 30;
  const hoje = new Date();
  const dataLimite = new Date();
  dataLimite.setDate(hoje.getDate() + dias);

  const lembretes = await Vacina.find({
    dataPrevistaReforco: { $gte: hoje, $lte: dataLimite },
  })
    .populate('pet', 'nome especie raca tutor')
    .populate('veterinario', 'nome')
    .sort({ dataPrevistaReforco: 1 });

  return res.status(200).json(lembretes);
});

module.exports = {
  registrarVacina,
  listarVacinasPorPet,
  listarLembretes,
};

module.exports = {
  registrarVacina,
  listarVacinasPorPet,
  listarLembretes,
};