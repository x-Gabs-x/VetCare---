const express = require('express');
const {
  criarAgendamento,
  listarAgendamentos,
  buscarAgendamentoPorId,
  atualizarAgendamento,
  cancelarAgendamento,
  configurarBlocosEmergencia,
  listarBlocosEmergencia,
  listarOpcoesRemanejamento,
  liberarBlocoEmergencia,
  proporRemanejamento,
  aprovarRemanejamento,
  recusarRemanejamento,
  registrarConfirmacaoTutor,
  listarPendenciasEAlertas,
  aceitarAgendamento,
  concluirAgendamento,
} = require('../controllers/agendamentoController');
const { verificarToken, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

router.get(
  '/alertas',
  autorizar('administrador', 'recepcionista'),
  listarPendenciasEAlertas
);

router.post(
  '/blocos-emergencia',
  autorizar('administrador'),
  configurarBlocosEmergencia
);
router.get(
  '/blocos-emergencia',
  autorizar('administrador', 'recepcionista'),
  listarBlocosEmergencia
);
router.get(
  '/opcoes-remanejamento',
  autorizar('recepcionista', 'administrador', 'veterinario'),
  listarOpcoesRemanejamento
);
router.patch(
  '/blocos-emergencia/:blocoId/liberar',
  autorizar('recepcionista', 'administrador'),
  liberarBlocoEmergencia
);

router.post(
  '/:id/remanejamentos',
  autorizar('recepcionista', 'administrador'),
  proporRemanejamento
);
router.patch(
  '/remanejamentos/:remanejamentoId/aprovar',
  autorizar('administrador'),
  aprovarRemanejamento
);
router.patch(
  '/remanejamentos/:remanejamentoId/recusar',
  autorizar('administrador'),
  recusarRemanejamento
);
router.patch(
  '/remanejamentos/:remanejamentoId/confirmacao-tutor',
  autorizar('recepcionista', 'administrador'),
  registrarConfirmacaoTutor
);

router.post(
  '/',
  autorizar('administrador', 'veterinario', 'recepcionista'),
  criarAgendamento
);

router.patch(
  '/:id/aceitar',
  autorizar('administrador', 'veterinario'),
  aceitarAgendamento
);

router.get(
  '/',
  autorizar('administrador', 'veterinario', 'recepcionista'),
  listarAgendamentos
);

router.get(
  '/:id',
  autorizar('administrador', 'veterinario', 'recepcionista'),
  buscarAgendamentoPorId
);

router.patch('/:id/concluir', autorizar('administrador', 'veterinario'), concluirAgendamento);

router.put('/:id', autorizar('administrador', 'veterinario'), atualizarAgendamento);

router.delete(
  '/:id',
  autorizar('administrador', 'veterinario', 'recepcionista'),
  cancelarAgendamento
);

module.exports = router;
