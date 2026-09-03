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

router.use(verificarToken, autorizar('administrador', 'veterinario'));

router.post('/', cadastrarPet);
router.get('/', listarPets);
router.get('/:id', buscarPetPorId);
router.put('/:id', atualizarPet);
router.delete('/:id', removerPet);

module.exports = router;
