// Importaciones necesarias
const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const config = require('../../config'); // Importa el fichero que contiene la clave secreta para el token
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

router.post('/prueba', (req, res) => {

  res.json("ESTO ES UNA PRUEBA");

});



// Se exporta el router del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;