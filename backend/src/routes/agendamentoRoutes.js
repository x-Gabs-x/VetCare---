const express = require('express');
const {
  criarAgendamento,
  listarAgendamentos,
  buscarAgendamentoPorId,
  atualizarAgendamento,
  cancelarAgendamento,
} = require('../controllers/agendamentoController');
const { verificarToken, autorizar } = require('../middlewares/auth');

const router = express.Router();

// Somente administradores e veterinarios podem acessar os agendamentos.
router.use(verificarToken, autorizar('administrador', 'veterinario'));

router.post('/', criarAgendamento);

router.get('/', listarAgendamentos);

router.get('/:id', buscarAgendamentoPorId);

router.put('/:id', atualizarAgendamento);

router.delete('/:id', cancelarAgendamento);

module.exports = router;