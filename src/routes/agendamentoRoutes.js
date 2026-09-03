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

// Todas as rotas de agendamento exigem login (qualquer perfil autenticado)
router.use(verificarToken);

router.post('/', criarAgendamento);

router.get('/', listarAgendamentos);

router.get('/:id', buscarAgendamentoPorId);

router.put('/:id', autorizar('veterinario', 'recepcionista'), atualizarAgendamento);

router.delete('/:id', autorizar('veterinario', 'recepcionista'), cancelarAgendamento);

module.exports = router;