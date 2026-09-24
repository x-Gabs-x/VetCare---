const express = require('express');

const {
    criarConsulta,
    listarTodasConsultas,
    atualizarConsulta,
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

router.put(
    '/:id',
    atualizarConsulta
);

router.get(
    '/:petId',
    listarConsultasPorPet
);

module.exports = router;