const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const tokenVerifier = require('./tokenVerifier'); // Importar el middleware verifyToken
const cors = require('cors');

// MIDDLEWARES
app.use(bodyParser.json()); // Para manejar datos JSON
app.use(bodyParser.urlencoded({ extended: true })); // Para manejar datos URL-encoded
app.use(cors()); // Habilitar CORS para todas las rutas

// RUTAS
const loginRoute = require('./api/routes/no_logged');
const adminRoute = require('./api/routes/admin');
const userRoute = require('./api/routes/user');

app.use('/guest', loginRoute);
app.use('/admin', tokenVerifier.verifyAdmin, adminRoute);
app.use('/user', tokenVerifier.verifyUser, userRoute);

module.exports = app;
