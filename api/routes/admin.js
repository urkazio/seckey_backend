// Importaciones necesarias
const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"


router.post('/getUsers', (req, res) => {
 
  dbQuery.getUsers( (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});


router.post('/borrarUsuario', (req, res) => {
  const { email } = req.body;
  
  dbQuery.borrarUsuario(email, (err, userData) => {
    if (!err) {
      console.log(userData)
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});


router.post('/editarUsuario', (req, res) => {
  const { nombre, email, emailAntiguo } = req.body;
  
  dbQuery.editarUsuario(nombre, email, emailAntiguo, (err, userData) => {
    if (!err) {
      console.log(userData)
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});


// Se exporta el router del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;