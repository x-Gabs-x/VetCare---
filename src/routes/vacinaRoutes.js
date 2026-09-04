const express = require('express');
const {
  registrarVacina,
  listarVacinasPorPet,
  listarLembretes,
} = require('../controllers/vacinaController');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

router.post('/', registrarVacina);
router.get('/lembretes/proximos', listarLembretes);
router.get('/:petId', listarVacinasPorPet);

module.exports = router;