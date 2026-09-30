const express = require('express');
const { verificarToken, autorizar } = require('../middlewares/auth');
const {
  listarProntuarios,
  buscarProntuario,
  criarProntuario,
  atualizarProntuario,
  arquivarProntuario,
} = require('../controllers/prontuarioController');

const router = express.Router();

router.use(verificarToken);
router.get('/', listarProntuarios);
router.get('/:id', buscarProntuario);
router.post('/', autorizar('administrador', 'veterinario'), criarProntuario);
router.put('/:id', autorizar('administrador', 'veterinario'), atualizarProntuario);
router.delete('/:id', autorizar('administrador'), arquivarProntuario);

module.exports = router;
