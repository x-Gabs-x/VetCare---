const express = require('express');
const {
  cadastrarPet,
  listarPets,
  buscarPetPorId,
  atualizarPet,
  removerPet,
} = require('../controllers/petController');
const router = express.Router();

router.post('/', cadastrarPet);
router.get('/', listarPets);
router.get('/:id', buscarPetPorId);
router.put('/:id', atualizarPet);
router.delete('/:id', removerPet);

module.exports = router;
