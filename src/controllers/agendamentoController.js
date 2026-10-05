const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const Agendamento = require("../models/Agendamento");
const Consulta = require("../models/Consulta");
const Usuario = require("../models/Usuario");
const BlocoEmergencia = require("../models/BlocoEmergencia");
const RemanejamentoAgendamento = require("../models/RemanejamentoAgendamento");
const asyncHandler = require("../utils/asyncHandler");
const { STATUS_VALIDOS } = require("../models/Agendamento");
const {
  agendamentoDentroDaJanelaDeAlerta,
  agendamentoRespeitaAntecedencia,
  dataCalendarioValida,
  dataEmFusoHorario,
  dataEHojeNaClinica,
  dataHoraLocalParaInstante,
  horarioDentroDoExpediente,
  normalizarDataCalendario,
} = require("../utils/agendamentoRules");

function dataParaCalendario(data) {
  if (typeof data === "string") return data;
  if (data instanceof Date && !Number.isNaN(data.getTime())) {
    return data.toISOString().slice(0, 10);
  }
  return null;
}

async function existeConflito({ veterinario, data, horario, ignorarId, ignorarBlocoId }) {
  const dataCalendario = dataParaCalendario(data);
  const dataBanco = normalizarDataCalendario(dataCalendario);
  const filtro = {
    veterinario,
    data: dataBanco,
    horario,
    status: { $ne: "cancelado" },
  };

  if (ignorarId) {
    filtro._id = { $ne: ignorarId };
  }

  const conflito = await Agendamento.findOne(filtro);
  if (conflito) return true;

  const filtroBloco = {
    veterinario,
    data: dataBanco,
    horario,
    estado: "reservado",
  };

  if (ignorarBlocoId) filtroBloco._id = { $ne: ignorarBlocoId };

  return Boolean(await BlocoEmergencia.exists(filtroBloco));
}

async function veterinarioAtivo(id) {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  return Usuario.findOne({ _id: id, perfil: "veterinario", ativo: true });
}

async function petAtivo(id) {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  return Pet.exists({ _id: id });
}

async function reservarBlocoParaAgendamento(bloco, estadoEsperado, agendamentoId) {
  return BlocoEmergencia.findOneAndUpdate(
    { _id: bloco._id, estado: estadoEsperado },
    { $set: { estado: "utilizado", agendamento: agendamentoId } },
    { new: true }
  );
}

const criarAgendamento = asyncHandler(async (req, res) => {
  const {
    pet,
    veterinario,
    data,
    horario,
    observacoes,
    emergencia = false,
    justificativaEmergencia,
    encaixeRecepcao = false,
    blocoEmergenciaId,
  } = req.body;

  if (!horarioDentroDoExpediente(horario)) {
    return res.status(400).json({
      erro: "O horario deve estar entre 08:00 e 17:30, em intervalos de 30 minutos.",
    });
  }

  if (!dataCalendarioValida(data)) {
    return res.status(400).json({
      erro: "A data do agendamento deve estar no formato AAAA-MM-DD e ser valida.",
    });
  }

  if (!pet) {
    return res.status(400).json({ erro: "Informe o pet do agendamento." });
  }

  if (!mongoose.isObjectIdOrHexString(pet)) {
    return res.status(400).json({
      erro: "O ID do pet informado e invalido.",
    });
  }

  if (!(await petAtivo(pet))) {
    return res.status(404).json({
      erro: "Pet nao encontrado.",
    });
  }

  if (!(await veterinarioAtivo(veterinario))) {
    return res.status(404).json({ erro: "Veterinario ativo nao encontrado." });
  }

  const ehRecepcionista = req.usuario.perfil === "recepcionista";
  const ehEmergencia = emergencia === true;
  const ehEncaixe = encaixeRecepcao === true;

  if (ehEmergencia && ehEncaixe) {
    return res.status(400).json({ erro: "Escolha emergencia ou encaixe, nao ambos." });
  }

  const ehAdministracao = req.usuario.perfil === "administrador";

  if (ehEmergencia && !ehRecepcionista && !ehAdministracao) {
    return res.status(403).json({ erro: "Somente recepcao ou administracao pode marcar emergencias." });
  }

  if (ehEncaixe && !ehRecepcionista && !ehAdministracao) {
    return res.status(403).json({ erro: "Somente recepcao ou administracao pode usar encaixes do mesmo dia." });
  }

  if (ehEmergencia && (!justificativaEmergencia || !justificativaEmergencia.trim())) {
    return res.status(400).json({ erro: "Informe a justificativa da emergencia." });
  }

  if ((ehEmergencia || ehEncaixe) && !dataEHojeNaClinica(data)) {
    return res.status(400).json({ erro: "Emergencias e encaixes devem ser para hoje." });
  }

  if (!ehEmergencia && !ehEncaixe && !agendamentoRespeitaAntecedencia(data, horario)) {
    return res.status(400).json({
      erro: "Agendamentos comuns exigem pelo menos 48 horas completas de antecedencia.",
    });
  }

  let bloco = null;
  let estadoBlocoAnterior = null;
  let tipoAgendamento = "comum";

  if (ehEmergencia || ehEncaixe) {
    if (!mongoose.isObjectIdOrHexString(blocoEmergenciaId)) {
      return res.status(400).json({ erro: "Informe um bloco de emergencia valido." });
    }

    estadoBlocoAnterior = ehEmergencia ? "reservado" : "liberado";
    const dataBanco = normalizarDataCalendario(data);
    bloco = await BlocoEmergencia.findOne({
      _id: blocoEmergenciaId,
      data: dataBanco,
      veterinario,
      horario,
      estado: estadoBlocoAnterior,
    });

    if (!bloco) {
      return res.status(409).json({
        erro: "O bloco nao esta disponivel para este veterinario, data e horario.",
      });
    }

    tipoAgendamento = ehEmergencia ? "emergencia" : "encaixe";
  } else if (blocoEmergenciaId) {
    return res.status(400).json({
      erro: "Bloco de emergencia so pode ser informado para emergencia ou encaixe.",
    });
  }

  const conflito = await existeConflito({
    veterinario,
    data,
    horario,
    ignorarBlocoId: bloco?._id,
  });
  if (conflito) {
    return res.status(409).json({
      erro: "Ja existe um agendamento para esse veterinario nesse mesmo dia e horario.",
    });
  }

  const agendamentoId = new mongoose.Types.ObjectId();
  if (bloco) {
    const blocoReservado = await reservarBlocoParaAgendamento(
      bloco,
      estadoBlocoAnterior,
      agendamentoId
    );
    if (!blocoReservado) {
      return res.status(409).json({ erro: "O bloco acabou de ser utilizado ou liberado." });
    }
  }

  try {
    const agendamento = await Agendamento.create({
      _id: agendamentoId,
      pet,
      veterinario,
      criadoPor: req.usuario.id,
      data: normalizarDataCalendario(data),
      horario,
      observacoes,
      tipoAgendamento,
      justificativaEmergencia: ehEmergencia ? justificativaEmergencia.trim() : undefined,
      blocoEmergencia: bloco?._id,
      estadoAnteriorDoBloco: estadoBlocoAnterior || undefined,
    });

    return res.status(201).json(agendamento);
  } catch (erro) {
    if (bloco) {
      await BlocoEmergencia.updateOne(
        { _id: bloco._id, estado: "utilizado", agendamento: agendamentoId },
        { $set: { estado: estadoBlocoAnterior }, $unset: { agendamento: 1 } }
      );
    }
    throw erro;
  }

});

const listarAgendamentos = asyncHandler(async (req, res) => {
  const agendamentos = await Agendamento.find()
    .populate("pet", "nome especie raca idade peso tutor")
    .populate("veterinario", "nome email")
    .populate("veterinarioReserva", "nome email");

  return res.json(agendamentos);
});

const buscarAgendamentoPorId = asyncHandler(async (req, res) => {
  const agendamento = await Agendamento.findById(req.params.id)
    .populate("pet", "nome especie raca idade peso tutor")
    .populate("veterinario", "nome email")
    .populate("veterinarioReserva", "nome email");

  if (!agendamento) {
    return res.status(404).json({ erro: "Agendamento nao encontrado." });
  }

  return res.json(agendamento);
});

const atualizarAgendamento = asyncHandler(async (req, res) => {
  const { pet, data, horario, veterinario, status, observacoes } = req.body;

  const agendamento = await Agendamento.findById(req.params.id);
  if (!agendamento) {
    return res.status(404).json({ erro: "Agendamento nao encontrado." });
  }

  if (status === "concluido") {
    return res.status(403).json({
      erro: "Use a operacao de conclusao, exclusiva do veterinario responsavel.",
    });
  }

  if (veterinario && String(veterinario) !== String(agendamento.veterinario)) {
    return res.status(409).json({
      erro: "A troca de veterinario deve seguir o fluxo de remanejamento e aprovacao.",
    });
  }

  const petFinal = pet ?? agendamento.pet;

  if (!petFinal) {
    return res.status(400).json({
      erro: "Informe o pet do agendamento.",
    });
  }

  if (!mongoose.isObjectIdOrHexString(petFinal)) {
    return res.status(400).json({
      erro: "O ID do pet informado e invalido.",
    });
  }

  const petExiste = await petAtivo(petFinal);

  if (!petExiste) {
    return res.status(404).json({
      erro: "Pet nao encontrado.",
    });
  }

  if (status && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({
      erro: `Status invalido. Use um dos seguintes: ${STATUS_VALIDOS.join(", ")}`,
    });
  }

  const vaiMudarHorario = data || horario || veterinario;
  const horarioFinal = horario || agendamento.horario;
  const dataFinal = data || dataParaCalendario(agendamento.data);

  if (data && !dataCalendarioValida(data)) {
    return res.status(400).json({ erro: "A data do agendamento e invalida." });
  }

  if (vaiMudarHorario && agendamento.blocoEmergencia) {
    return res.status(409).json({
      erro: "Agendamento ligado a bloco de emergencia deve ser cancelado e recriado para mudar de horario.",
    });
  }

  if (vaiMudarHorario && !horarioDentroDoExpediente(horarioFinal)) {
    return res.status(400).json({
      erro: "O horario deve estar entre 08:00 e 17:30, em intervalos de 30 minutos.",
    });
  }

  if (
    vaiMudarHorario &&
    agendamento.tipoAgendamento === "comum" &&
    !agendamentoRespeitaAntecedencia(dataFinal, horarioFinal)
  ) {
    return res.status(400).json({
      erro: "Alteracoes de agendamentos comuns exigem pelo menos 48 horas completas de antecedencia.",
    });
  }

  if (veterinario && !(await veterinarioAtivo(veterinario))) {
    return res.status(404).json({ erro: "Veterinario ativo nao encontrado." });
  }

  if (vaiMudarHorario) {
    const conflito = await existeConflito({
      veterinario: veterinario || agendamento.veterinario,
      data: data || agendamento.data,
      horario: horario || agendamento.horario,
      ignorarId: agendamento._id,
    });

    if (conflito) {
      return res.status(409).json({
        erro: "Ja existe um agendamento para esse veterinario nesse mesmo dia e horario.",
      });
    }
  }

  agendamento.data = data || agendamento.data;
  if (data) agendamento.data = normalizarDataCalendario(data);
  agendamento.horario = horario || agendamento.horario;
  agendamento.status = status || agendamento.status;
  agendamento.observacoes = observacoes ?? agendamento.observacoes;
  agendamento.pet = petFinal;

  await agendamento.save();

  return res.json(agendamento);
});

const configurarBlocosEmergencia = asyncHandler(async (req, res) => {
  const { data, blocos } = req.body;

  if (!dataCalendarioValida(data) || !Array.isArray(blocos) || blocos.length < 2) {
    return res.status(400).json({
      erro: "Informe uma data valida e pelo menos dois blocos de emergencia.",
    });
  }

  if (data < dataEmFusoHorario(new Date())) {
    return res.status(400).json({ erro: "Nao e possivel reservar blocos em uma data passada." });
  }

  const veterinariosUnicos = new Set(blocos.map((bloco) => String(bloco.veterinario)));
  if (veterinariosUnicos.size < 2) {
    return res.status(400).json({
      erro: "Os blocos devem cobrir pelo menos dois veterinarios diferentes.",
    });
  }

  const combinacoes = new Set();
  for (const bloco of blocos) {
    if (!mongoose.isObjectIdOrHexString(bloco.veterinario)) {
      return res.status(400).json({ erro: "Um dos IDs de veterinario e invalido." });
    }
    if (!horarioDentroDoExpediente(bloco.horario)) {
      return res.status(400).json({ erro: "Todos os blocos devem estar entre 08:00 e 17:30." });
    }

    const chave = `${bloco.veterinario}:${bloco.horario}`;
    if (combinacoes.has(chave)) {
      return res.status(400).json({ erro: "Ha blocos duplicados para o mesmo veterinario e horario." });
    }
    combinacoes.add(chave);

    if (!(await veterinarioAtivo(bloco.veterinario))) {
      return res.status(404).json({ erro: "Veterinario ativo nao encontrado." });
    }

    if (await existeConflito({ veterinario: bloco.veterinario, data, horario: bloco.horario })) {
      return res.status(409).json({ erro: "Um dos blocos conflita com agendamento ou reserva existente." });
    }

    if (dataEHojeNaClinica(data)) {
      const inicio = dataHoraLocalParaInstante(data, bloco.horario);
      if (inicio <= new Date()) {
        return res.status(400).json({ erro: "Os blocos de hoje precisam estar no futuro." });
      }
    }
  }

  const ids = blocos.map(() => new mongoose.Types.ObjectId());
  try {
    const documentos = await BlocoEmergencia.insertMany(
      blocos.map((bloco, indice) => ({
        _id: ids[indice],
        data: normalizarDataCalendario(data),
        veterinario: bloco.veterinario,
        horario: bloco.horario,
        criadoPor: req.usuario.id,
      }))
    );
    return res.status(201).json(documentos);
  } catch (erro) {
    await BlocoEmergencia.deleteMany({ _id: { $in: ids } });
    if (erro.code === 11000) {
      return res.status(409).json({ erro: "Ja existe uma reserva para um dos blocos informados." });
    }
    throw erro;
  }
});

const listarBlocosEmergencia = asyncHandler(async (req, res) => {
  const { data } = req.query;
  if (!dataCalendarioValida(data)) {
    return res.status(400).json({ erro: "Informe data no formato AAAA-MM-DD." });
  }

  const blocos = await BlocoEmergencia.find({ data: normalizarDataCalendario(data) })
    .populate("veterinario", "nome email")
    .populate("criadoPor", "nome perfil")
    .populate("liberadoPor", "nome perfil")
    .sort({ horario: 1, veterinario: 1 });

  return res.json(blocos);
});

const listarOpcoesRemanejamento = asyncHandler(async (req, res) => {
  const { data } = req.query;
  if (!dataCalendarioValida(data)) {
    return res.status(400).json({ erro: "Informe data no formato AAAA-MM-DD." });
  }

  const [veterinarios, emergencias] = await Promise.all([
    Usuario.find({ perfil: "veterinario", ativo: true }).select("nome email").sort({ nome: 1 }),
    Agendamento.find({
      data: normalizarDataCalendario(data),
      tipoAgendamento: "emergencia",
      status: { $nin: ["cancelado", "concluido"] },
    })
      .populate("pet", "nome especie")
      .populate("veterinario", "nome email")
      .sort({ horario: 1 }),
  ]);

  return res.json({ veterinarios, emergencias });
});

const liberarBlocoEmergencia = asyncHandler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.blocoId)) {
    return res.status(400).json({ erro: "ID do bloco invalido." });
  }

  const bloco = await BlocoEmergencia.findById(req.params.blocoId);
  if (!bloco) return res.status(404).json({ erro: "Bloco de emergencia nao encontrado." });
  if (bloco.estado !== "reservado") {
    return res.status(409).json({ erro: "Somente blocos reservados podem ser liberados." });
  }
  if (!dataEHojeNaClinica(dataParaCalendario(bloco.data))) {
    return res.status(400).json({ erro: "A excecao de encaixe so pode liberar blocos do mesmo dia." });
  }
  if (dataHoraLocalParaInstante(dataParaCalendario(bloco.data), bloco.horario) <= new Date()) {
    return res.status(400).json({ erro: "Nao e possivel liberar um bloco cujo horario ja passou." });
  }

  const atualizado = await BlocoEmergencia.findOneAndUpdate(
    { _id: bloco._id, estado: "reservado" },
    { $set: { estado: "liberado", liberadoPor: req.usuario.id, liberadoEm: new Date() } },
    { new: true }
  );
  if (!atualizado) return res.status(409).json({ erro: "O bloco foi alterado por outra requisicao." });

  return res.json(atualizado);
});

const proporRemanejamento = asyncHandler(async (req, res) => {
  const { veterinarioProposto, agendamentoEmergencia, justificativaEmergencia } = req.body;

  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ erro: "ID do agendamento invalido." });
  }
  const agendamento = await Agendamento.findById(req.params.id);
  if (!agendamento || ["cancelado", "concluido"].includes(agendamento.status)) {
    return res.status(404).json({ erro: "Agendamento ativo nao encontrado." });
  }
  if (!mongoose.isObjectIdOrHexString(veterinarioProposto) ||
      String(veterinarioProposto) === String(agendamento.veterinario)) {
    return res.status(400).json({ erro: "Informe um veterinario alternativo valido." });
  }
  if (!justificativaEmergencia || justificativaEmergencia.trim().length < 10) {
    return res.status(400).json({ erro: "A justificativa da emergencia deve ter pelo menos 10 caracteres." });
  }
  if (!mongoose.isObjectIdOrHexString(agendamentoEmergencia)) {
    return res.status(400).json({ erro: "Informe o ID do agendamento de emergencia." });
  }

  const emergencia = await Agendamento.findById(agendamentoEmergencia);
  if (!emergencia || emergencia.tipoAgendamento !== "emergencia" || emergencia.status === "cancelado") {
    return res.status(400).json({ erro: "O ID informado nao corresponde a uma emergencia ativa." });
  }
  if (dataParaCalendario(emergencia.data) !== dataParaCalendario(agendamento.data)) {
    return res.status(400).json({ erro: "A emergencia e o agendamento remanejado devem ser da mesma data." });
  }
  if (!(await veterinarioAtivo(veterinarioProposto))) {
    return res.status(404).json({ erro: "Veterinario alternativo ativo nao encontrado." });
  }
  if (await existeConflito({
    veterinario: veterinarioProposto,
    data: agendamento.data,
    horario: agendamento.horario,
  })) {
    return res.status(409).json({ erro: "O veterinario alternativo nao esta disponivel nesse horario." });
  }

  try {
    const remanejamento = await RemanejamentoAgendamento.create({
      agendamento: agendamento._id,
      veterinarioOriginal: agendamento.veterinario,
      veterinarioProposto,
      agendamentoEmergencia: emergencia._id,
      justificativaEmergencia: justificativaEmergencia.trim(),
      propostoPor: req.usuario.id,
    });
    return res.status(201).json(remanejamento);
  } catch (erro) {
    if (erro.code === 11000) {
      return res.status(409).json({ erro: "Ja existe um remanejamento pendente para este agendamento." });
    }
    throw erro;
  }
});

const aprovarRemanejamento = asyncHandler(async (req, res) => {
  const remanejamento = await RemanejamentoAgendamento.findById(req.params.remanejamentoId)
    .populate("agendamento");
  if (!remanejamento) return res.status(404).json({ erro: "Remanejamento nao encontrado." });
  if (remanejamento.estado !== "aguardando_aprovacao") {
    return res.status(409).json({ erro: "O remanejamento nao esta aguardando aprovacao administrativa." });
  }

  const agendamento = remanejamento.agendamento;
  if (!agendamento || ["cancelado", "concluido"].includes(agendamento.status)) {
    return res.status(409).json({ erro: "O agendamento nao esta mais ativo." });
  }
  if (!(await veterinarioAtivo(remanejamento.veterinarioProposto))) {
    return res.status(404).json({ erro: "Veterinario alternativo ativo nao encontrado." });
  }
  if (await existeConflito({
    veterinario: remanejamento.veterinarioProposto,
    data: agendamento.data,
    horario: agendamento.horario,
  })) {
    return res.status(409).json({ erro: "O veterinario alternativo deixou de estar disponivel." });
  }

  remanejamento.estado = "aguardando_tutor";
  remanejamento.aprovadoPor = req.usuario.id;
  remanejamento.aprovadoEm = new Date();
  await remanejamento.save();
  return res.json(remanejamento);
});

const recusarRemanejamento = asyncHandler(async (req, res) => {
  const { motivo } = req.body;
  if (!motivo || !motivo.trim()) {
    return res.status(400).json({ erro: "Informe o motivo da recusa administrativa." });
  }

  const remanejamento = await RemanejamentoAgendamento.findById(req.params.remanejamentoId);
  if (!remanejamento) return res.status(404).json({ erro: "Remanejamento nao encontrado." });
  if (remanejamento.estado !== "aguardando_aprovacao") {
    return res.status(409).json({ erro: "O remanejamento nao esta aguardando aprovacao administrativa." });
  }

  remanejamento.estado = "recusado";
  remanejamento.aprovadoPor = req.usuario.id;
  remanejamento.aprovadoEm = new Date();
  remanejamento.motivoRecusa = motivo.trim();
  await remanejamento.save();
  return res.json(remanejamento);
});

const registrarConfirmacaoTutor = asyncHandler(async (req, res) => {
  const { confirmado, motivo } = req.body;
  if (typeof confirmado !== "boolean") {
    return res.status(400).json({ erro: "Informe confirmado como true ou false." });
  }

  const remanejamento = await RemanejamentoAgendamento.findById(req.params.remanejamentoId);
  if (!remanejamento) return res.status(404).json({ erro: "Remanejamento nao encontrado." });
  if (remanejamento.estado !== "aguardando_tutor") {
    return res.status(409).json({ erro: "O remanejamento ainda nao foi aprovado ou ja foi finalizado." });
  }

  const agendamento = await Agendamento.findById(remanejamento.agendamento);
  if (!agendamento || String(agendamento.veterinario) !== String(remanejamento.veterinarioOriginal)) {
    return res.status(409).json({ erro: "O agendamento mudou; revise a proposta antes de confirmar." });
  }

  remanejamento.tutorConfirmadoPor = req.usuario.id;
  remanejamento.tutorConfirmadoEm = new Date();

  if (!confirmado) {
    remanejamento.estado = "recusado";
    remanejamento.motivoRecusa = (motivo || "Tutor nao confirmou a substituicao.").trim();
    await remanejamento.save();
    return res.json(remanejamento);
  }

  if (!(await veterinarioAtivo(remanejamento.veterinarioProposto))) {
    return res.status(404).json({ erro: "Veterinario alternativo ativo nao encontrado." });
  }
  if (await existeConflito({
    veterinario: remanejamento.veterinarioProposto,
    data: agendamento.data,
    horario: agendamento.horario,
  })) {
    return res.status(409).json({ erro: "O veterinario alternativo deixou de estar disponivel." });
  }

  agendamento.veterinarioReserva = agendamento.veterinario;
  agendamento.veterinario = remanejamento.veterinarioProposto;
  await agendamento.save();

  remanejamento.estado = "confirmado";
  await remanejamento.save();
  return res.json({ remanejamento, agendamento });
});

const listarPendenciasEAlertas = asyncHandler(async (req, res) => {
  const remanejamentos = await RemanejamentoAgendamento.find({
    estado: { $in: ["aguardando_aprovacao", "aguardando_tutor"] },
  })
    .populate({
      path: "agendamento",
      populate: [
        { path: "pet", select: "nome especie" },
        { path: "veterinario", select: "nome email" },
      ],
    })
    .populate("veterinarioOriginal veterinarioProposto", "nome email")
    .populate("agendamentoEmergencia", "data horario justificativaEmergencia");

  const agora = new Date();
  const pendencias = remanejamentos
    .filter((item) => item.agendamento)
    .map((item) => {
      const data = dataParaCalendario(item.agendamento.data);
      const inicio = dataHoraLocalParaInstante(data, item.agendamento.horario);
      const minutosAteAgendamento = inicio
        ? Math.floor((inicio.getTime() - agora.getTime()) / 60000)
        : null;

      return {
        ...item.toObject(),
        minutosAteAgendamento,
        alertaUmaHora: agendamentoDentroDaJanelaDeAlerta(data, item.agendamento.horario, agora),
      };
    })
    .sort((a, b) => (a.minutosAteAgendamento ?? Infinity) - (b.minutosAteAgendamento ?? Infinity));

  return res.json({
    pendencias,
    alertas: pendencias.filter((item) => item.alertaUmaHora),
  });
});

async function criarConsultaAutomaticamenteParaAgendamento(agendamento, extras = {}) {
  const motivoPadrao = extras.motivoConsulta || agendamento.observacoes || "Consulta veterinaria agendada";
  const motivo = String(motivoPadrao).trim() || "Consulta veterinaria agendada";
  const camposConsulta = {
    pet: agendamento.pet,
    veterinario: agendamento.veterinario,
    motivoConsulta: motivo,
    procedimentos: Array.isArray(extras.procedimentos) ? extras.procedimentos : [],
    observacoes: extras.observacoes ?? agendamento.observacoes ?? "",
  };

  return Consulta.findOneAndUpdate(
    { agendamento: agendamento._id },
    { $setOnInsert: { ...camposConsulta, agendamento: agendamento._id, status: 'agendada' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

const aceitarAgendamento = asyncHandler(async (req, res) => {
  const agendamento = await Agendamento.findById(req.params.id);
  if (!agendamento) {
    return res.status(404).json({ erro: "Agendamento nao encontrado." });
  }

  if (["cancelado", "concluido"].includes(agendamento.status)) {
    return res.status(409).json({ erro: "Este agendamento nao pode ser aceito neste estado." });
  }

  const veterinarioPodeAceitar = String(agendamento.veterinario) === String(req.usuario.id) ||
    (agendamento.veterinarioReserva && String(agendamento.veterinarioReserva) === String(req.usuario.id));

  if (req.usuario.perfil !== "administrador" &&
      (req.usuario.perfil !== "veterinario" || !veterinarioPodeAceitar)) {
    return res.status(403).json({ erro: "Somente o administrador ou o veterinario responsavel pode aceitar este agendamento." });
  }

  const consulta = await criarConsultaAutomaticamenteParaAgendamento(agendamento, {
    motivoConsulta: req.body?.motivoConsulta || agendamento.observacoes || "Consulta veterinaria agendada",
    observacoes: req.body?.observacoes || agendamento.observacoes || "",
    procedimentos: Array.isArray(req.body?.procedimentos) ? req.body.procedimentos : [],
  });

  agendamento.status = "confirmado";
  await agendamento.save();

  return res.json({ agendamento, consulta, mensagem: "Agendamento aceito e convertido em consulta." });
});

const concluirAgendamento = asyncHandler(async (req, res) => {
  const agendamento = await Agendamento.findById(req.params.id);
  if (!agendamento) {
    return res.status(404).json({ erro: "Agendamento nao encontrado." });
  }
  if (["cancelado", "concluido"].includes(agendamento.status)) {
    return res.status(409).json({ erro: "Este agendamento nao pode ser concluido neste estado." });
  }
  if (agendamento.status !== "confirmado") {
    return res.status(409).json({ erro: "O veterinario precisa aceitar o agendamento antes de concluir o atendimento." });
  }

  const veterinarioPodeConcluir = [agendamento.veterinario, agendamento.veterinarioReserva]
    .filter(Boolean)
    .some((id) => String(id) === String(req.usuario.id));
  if (req.usuario.perfil !== "administrador" &&
      (req.usuario.perfil !== "veterinario" || !veterinarioPodeConcluir)) {
    return res.status(403).json({ erro: "Somente o administrador ou o veterinario responsavel pode concluir esta consulta." });
  }

  agendamento.status = "concluido";
  agendamento.concluidaEm = new Date();
  agendamento.concluidaPor = req.usuario.id;
  await agendamento.save();

  const consulta = await criarConsultaAutomaticamenteParaAgendamento(agendamento);
  consulta.status = 'concluida';
  await consulta.save();

  return res.json({ agendamento, consulta });
});

const cancelarAgendamento = asyncHandler(async (req, res) => {
  const agendamento = await Agendamento.findById(req.params.id);
  if (!agendamento) {
    return res.status(404).json({ erro: "Agendamento nao encontrado." });
  }

  if (agendamento.blocoEmergencia && agendamento.estadoAnteriorDoBloco) {
    const data = dataParaCalendario(agendamento.data);
    const inicio = dataHoraLocalParaInstante(data, agendamento.horario);
    if (inicio && inicio > new Date()) {
      await BlocoEmergencia.updateOne(
        { _id: agendamento.blocoEmergencia, estado: "utilizado", agendamento: agendamento._id },
        {
          $set: { estado: agendamento.estadoAnteriorDoBloco },
          $unset: { agendamento: 1, liberadoPor: 1, liberadoEm: 1 },
        }
      );
    }
  }

  agendamento.status = "cancelado";
  await agendamento.save();
  await RemanejamentoAgendamento.updateMany(
    { agendamento: agendamento._id, estado: { $in: ["aguardando_aprovacao", "aguardando_tutor"] } },
    { $set: { estado: "cancelado" } }
  );

  return res.json({
    mensagem: "Agendamento cancelado com sucesso.",
    agendamento,
  });
});

module.exports = {
  criarAgendamento,
  aceitarAgendamento,
  configurarBlocosEmergencia,
  listarBlocosEmergencia,
  listarOpcoesRemanejamento,
  liberarBlocoEmergencia,
  proporRemanejamento,
  aprovarRemanejamento,
  recusarRemanejamento,
  registrarConfirmacaoTutor,
  listarPendenciasEAlertas,
  concluirAgendamento,
  listarAgendamentos,
  buscarAgendamentoPorId,
  atualizarAgendamento,
  cancelarAgendamento,
};
