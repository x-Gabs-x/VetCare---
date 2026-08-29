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

router.post('/', cadastrarUsuario);

router.use(verificarToken);

router.get('/', autorizar('administrador'), listarUsuarios);

router.get('/:id', autorizar('administrador'), buscarUsuarioPorId);

router.put('/:id', atualizarUsuario);

router.delete('/:id', autorizar('administrador'), removerUsuario);

module.exports = router;
