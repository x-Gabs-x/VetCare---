const express = require('express');
const {
  registrarVacina,
  listarVacinasPorPet,
  listarLembretes,
  removerVacina,
} = require('../controllers/vacinaController');
const { verificarToken, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

router.post(
  '/',
  autorizar('veterinario', 'recepcionista', 'administrador'),
  registrarVacina
);
router.get('/lembretes/proximos', listarLembretes);
router.get('/:petId', listarVacinasPorPet);
router.delete(
  '/:id',
  autorizar('veterinario', 'recepcionista', 'administrador'),
  removerVacina
);

module.exports = router;