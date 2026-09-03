const express = require('express');

const {
    criarConsulta,
    listarTodasConsultas,
    listarConsultasPorPet,
} = require('../controllers/consultaController');
const { verificarToken, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken, autorizar('administrador', 'veterinario'));

router.post(
    '/',
    criarConsulta
);

router.get(
    '/',
    listarTodasConsultas
);

router.get(
    '/:petId',
    listarConsultasPorPet
);

module.exports = router;