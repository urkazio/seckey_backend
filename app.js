const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

// MIDDLEWARES
app.use(bodyParser.json()); // Para manejar datos JSON
app.use(bodyParser.urlencoded({ extended: true })); // Para manejar datos URL-encoded
app.use(cors()); // Habilitar CORS para todas las rutas

// RUTAS
const loginRoute = require('./api/routes/no_logged');

app.use('/guest', loginRoute);

module.exports = app;
