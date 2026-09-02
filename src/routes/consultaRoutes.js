const express = require('express');

const {
    criarConsulta,
    listarConsultasPorPet,
} = require('../controllers/consultaController');

const {
    verificarToken,
    autorizar,
} = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

router.post(
    '/',
    autorizar('veterinario'),
    criarConsulta
);

router.get(
    '/:petId',
    listarConsultasPorPet
);

module.exports = router;