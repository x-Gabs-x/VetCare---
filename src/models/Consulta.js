const mongoose = require("mongoose");

const consultaSchema = new mongoose.Schema(
    {
        pet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pet",
            required: [true, 'O pet e obrigatorio'],
            index: true,
        },

        veterinario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: [true, 'O veterinário responsável e obrigatorio']
        },

        motivoConsulta: {
            type: String,
            required: [true, 'O motivo da consulta e obrigatorio'],
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