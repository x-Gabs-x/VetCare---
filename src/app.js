const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const petRoutes = require('./routes/petRoutes');
const vacinaRoutes = require('./routes/vacinaRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
  res.json({ status: 'ok', mensagem: 'API VetCare no ar.' });
});

app.use('/auth', authRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/pets', petRoutes);
app.use('/vacinas', vacinaRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota nao encontrada.' });
});


app.use(errorHandler);

module.exports = app;