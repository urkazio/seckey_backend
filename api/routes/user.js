// Importaciones necesarias
const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const config = require('../../config'); // Importa el fichero que contiene la clave secreta para el token
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


router.post('/getCategorias', (req, res) => {
  const { email } = req.body;

  dbQuery.getCategorias(email, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});


router.post('/getPassFromCategoria', (req, res) => {
  const { email, categoria  } = req.body;

  dbQuery.getPassFromCategoria(categoria, email, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});




// Se exporta el router del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;