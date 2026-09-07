const express = require('express');
const {
  cadastrarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  removerUsuario,
} = require('../controllers/usuarioController');
const { verificarToken, autorizar, identificarUsuarioOpcional } = require('../middlewares/auth');

const router = express.Router();

router.post('/', identificarUsuarioOpcional, cadastrarUsuario);

router.use(verificarToken);

router.get('/', autorizar('administrador', 'veterinario'), listarUsuarios);
router.get('/:id', autorizar('administrador', 'veterinario'), buscarUsuarioPorId);
router.put('/:id', atualizarUsuario); // dono ou admin - verificado dentro do controller
router.delete('/:id', autorizar('administrador'), removerUsuario);

module.exports = router;