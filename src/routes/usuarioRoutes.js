const express = require('express');
const {
  cadastrarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  removerUsuario,
} = require('../controllers/usuarioController');
const { verificarToken, autorizar } = require('../middlewares/auth');
const router = express.Router();

router.use(verificarToken, autorizar('administrador', 'veterinario'));

router.post('/', cadastrarUsuario);

router.get('/', listarUsuarios);

router.get('/:id', buscarUsuarioPorId);

router.put('/:id', atualizarUsuario);

router.delete('/:id', removerUsuario);

module.exports = router;
