const mongoose = require("mongoose");
const Usuario = require("../models/Usuario");
const asyncHandler = require("../utils/asyncHandler");

const criarConsulta = asyncHandler(async (req, res) => {
    const {
        pet,
        veterinario,
        diagnostico,
        procedimentos,
        observacoes
    } = req.body;

    if (!pet || !veterinario || !diagnostico) {
        return res.status(400).json({
            erro: "Pet, veterinário e diagnóstico são obrigatórios."
        });
    }

    if (!mongoose.Types.ObjectId.isValid(pet)) {
        return res.status(400).json({
            erro: "ID do pet inválido."
        });
    }

    if (!mongoose.Types.ObjectId.isValid(veterinario)) {
        return res.status(400).json({
            erro: "ID do veterinário inválido."
        });
    }

    const veterinarioEncontrado = await Usuario.findById(veterinario);

    if (!veterinarioEncontrado) {
        return res.status(404).json({
            erro: "Veterinário não encontrado."
        });
    }

    if (veterinarioEncontrado.perfil !== "veterinario") {
        return res.status(400).json({
            erro: "O usuário informado não possui perfil de veterinário."
        });
    }

    // A validação do Pet será adicionada após o merge de feature/pets
});

module.exports = {
    criarConsulta
};