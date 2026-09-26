const express = require('express');
const {
  cadastrarPet,
  listarPets,
  buscarPetPorId,
  atualizarPet,
  removerPet,
} = require('../controllers/petController');
const { verificarToken, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

router.post('/', autorizar('administrador', 'veterinario', 'recepcionista'), cadastrarPet);
router.get('/', autorizar('administrador', 'veterinario', 'recepcionista', 'tutor'), listarPets);
router.get('/:id', autorizar('administrador', 'veterinario', 'recepcionista', 'tutor'), buscarPetPorId);
router.put('/:id', autorizar('administrador', 'veterinario'), atualizarPet);
router.delete('/:id', autorizar('administrador'), removerPet);

module.exports = router;