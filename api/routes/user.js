// Importaciones necesarias
const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token


// Configura el transportador de correo con nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'urkogarcia12@gmail.com',
    pass: config.pass_email
  }
});

router.post('/getCategorias', (req, res) => {
  const { email  } = req.body;

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

router.post('/editarContrasena', (req, res) => {
  const { nombre, username, contrasena, fecha_exp, id } = req.body;
 
  dbQuery.editarContrasena(nombre, username, contrasena, fecha_exp, id, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.status(500).json(err);
    }
  });
});






// +++++++++++++++++++++++++++++++++ CRON ++++++++++++++++++++++++++++++++++++

// Configurar el cron job para que corra todos los días a la medianoche
cron.schedule('0 0 * * *', () => {

  dbQuery.verificarContraseñasPorExpirar((err, usuarios) => {

    if (err) {
      console.error('Error al verificar contraseñas por expirar:', err);
    } else {
      usuarios.forEach(usuario => {

        const mailOptions = {
          from: 'urkogarcia12@gmail.com',
          to: usuario.email_user,
          subject: 'Aviso de expiración de contraseña',
          text: `Hola ${usuario.nombre},\n\nTu contraseña para ${usuario.nombreContrasena} expirará en 24 horas. Por favor, actualízala lo antes posible.\n\nSaludos,\nTu equipo de SecKey`
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error al enviar el correo:', error);
          } else {
            console.log('Correo enviado:', info.response);
          }
        });
      });
    }
  });
});


// Se exporta el router del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;