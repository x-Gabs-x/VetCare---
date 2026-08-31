const mongoose = require("mongoose");

const consultaSchema = new mongoose.Schema(
    {
        pet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pet",
            required: true
        },

        veterinario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        diagnostico: {
            type: String,
            required: true,
            trim: true
        },

        procedimentos: [
            {
                type: String,
                trim: true
            }
        ],

        observacoes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Consulta", consultaSchema);