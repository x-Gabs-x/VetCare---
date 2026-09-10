const express = require('express');
const {
  cadastrarPet,
  listarPets,
  buscarPetPorId,
  atualizarPet,
  removerPet,
} = require('../controllers/petController');
<<<<<<< HEAD
const router = express.Router();

=======
const { verificarToken, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken, autorizar('administrador', 'veterinario'));

>>>>>>> 8918f6ea3977896247738614cbeabf47df2070e8
router.post('/', cadastrarPet);
router.get('/', listarPets);
router.get('/:id', buscarPetPorId);
router.put('/:id', atualizarPet);
router.delete('/:id', removerPet);

module.exports = router;
