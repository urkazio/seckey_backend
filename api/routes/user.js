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


router.post('/crearCategoria', (req, res) => {
  const { email, nombreCat  } = req.body;

  dbQuery.crearCategoria(email, nombreCat, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});


router.post('/crearContrasena', (req, res) => {
  const { nombre, username, pass, fecha_exp, nombreCat, owner  } = req.body;

  dbQuery.crearContrasena(nombre, username, pass, fecha_exp, nombreCat, owner, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});


router.post('/borrarContrasena', (req, res) => {
  const { passId } = req.body;

  dbQuery.borrarContrasena(passId, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});

router.post('/borrarCategoria', (req, res) => {
  const { nombre } = req.body;

  dbQuery.borrarCategoria(nombre, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
})




// Se exporta el router del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;