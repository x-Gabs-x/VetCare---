const express = require('express');
const {
  cadastrarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  removerUsuario,
} = require('../controllers/usuarioController');
const router = express.Router();

router.post('/', cadastrarUsuario);

router.get('/', listarUsuarios);

router.get('/:id', buscarUsuarioPorId);

router.put('/:id', atualizarUsuario);

router.delete('/:id', removerUsuario);

module.exports = router;
