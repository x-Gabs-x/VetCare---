const Agendamento = require('../models/Agendamento');
const asyncHandler = require('../utils/asyncHandler');
const { STATUS_VALIDOS } = require('../models/Agendamento');


async function existeConflito({ veterinario, data, horario, ignorarId }) {
  const filtro = {
    veterinario,
    data,
    horario,
    status: { $ne: 'cancelado' }, // $ne = "not equal", ignora cancelados
  };

  if (ignorarId) {
    filtro._id = { $ne: ignorarId };
  }

  const conflito = await Agendamento.findOne(filtro);
  return !!conflito; // transforma em true/false
}

const criarAgendamento = asyncHandler(async (req, res) => {
  const { pet, veterinario, data, horario, observacoes } = req.body;

  const conflito = await existeConflito({ veterinario, data, horario });
  if (conflito) {
    return res.status(409).json({
      erro: 'Ja existe um agendamento para esse veterinario nesse mesmo dia e horario.',
    });
  }

  const agendamento = await Agendamento.create({
    pet,
    veterinario,
    data,
    horario,
    observacoes,
  });

  return res.status(201).json(agendamento);
});

const listarAgendamentos = asyncHandler(async (req, res) => {
  const agendamentos = await Agendamento.find()
  
    .populate('veterinario', 'nome email');

  return res.json(agendamentos);
});

const buscarAgendamentoPorId = asyncHandler(async (req, res) => {
  const agendamento = await Agendamento.findById(req.params.id)
    .populate('veterinario', 'nome email');

  if (!agendamento) {
    return res.status(404).json({ erro: 'Agendamento nao encontrado.' });
  }

  return res.json(agendamento);
});

const atualizarAgendamento = asyncHandler(async (req, res) => {
  const { data, horario, veterinario, status, observacoes } = req.body;

  const agendamento = await Agendamento.findById(req.params.id);
  if (!agendamento) {
    return res.status(404).json({ erro: 'Agendamento nao encontrado.' });
  }

  if (status && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({
      erro: `Status invalido. Use um dos seguintes: ${STATUS_VALIDOS.join(', ')}`,
    });
  }

  
  const vaiMudarHorario = data || horario || veterinario;
  if (vaiMudarHorario) {
    const conflito = await existeConflito({
      veterinario: veterinario || agendamento.veterinario,
      data: data || agendamento.data,
      horario: horario || agendamento.horario,
      ignorarId: agendamento._id,
    });

    if (conflito) {
      return res.status(409).json({
        erro: 'Ja existe um agendamento para esse veterinario nesse mesmo dia e horario.',
      });
    }
  }

  agendamento.data = data || agendamento.data;
  agendamento.horario = horario || agendamento.horario;
  agendamento.veterinario = veterinario || agendamento.veterinario;
  agendamento.status = status || agendamento.status;
  agendamento.observacoes = observacoes ?? agendamento.observacoes;

  await agendamento.save();

  return res.json(agendamento);
});

const cancelarAgendamento = asyncHandler(async (req, res) => {
  const agendamento = await Agendamento.findById(req.params.id);
  if (!agendamento) {
    return res.status(404).json({ erro: 'Agendamento nao encontrado.' });
  }

  agendamento.status = 'cancelado';
  await agendamento.save();

  return res.json({ mensagem: 'Agendamento cancelado com sucesso.', agendamento });
});

module.exports = {
  criarAgendamento,
  listarAgendamentos,
  buscarAgendamentoPorId,
  atualizarAgendamento,
  cancelarAgendamento,
};