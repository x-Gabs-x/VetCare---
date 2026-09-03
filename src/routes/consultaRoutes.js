const express = require('express');

const {
    criarConsulta,
    listarTodasConsultas,
    listarConsultasPorPet,
} = require('../controllers/consultaController');

const router = express.Router();

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