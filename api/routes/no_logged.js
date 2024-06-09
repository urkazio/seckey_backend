// Importaciones necesarias
const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const config = require('../../config'); // Importa el fichero que contiene la clave secreta para el token
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

router.post('/login', (req, res) => {
  const { email, pass } = req.body;

  dbQuery.login(email, pass, (err, userData) => {
    if (!err) {
      const secretKey = config.secretKey;
      const token = jwt.sign(userData, secretKey);
      res.json(token);
    } else {
      res.json(err);
    }
  });
});

router.post('/register', (req, res) => {
  const { email, pass } = req.body;

  dbQuery.register(email, pass, (err, userData) => {
    if (!err) {
      res.json(userData);
    } else {
      res.json(err);
    }
  });
});

router.post('/recuperar/comprobar', (req, res) => {
  const { email } = req.body;

  dbQuery.comprobarMail(email, (err, userData) => {

    if (!err) {

      // Generar un código de recuperación de 6 dígitos
      const recoveryCode = Math.floor(100000 + Math.random() * 900000); // Código de 6 dígitos

      // Configurar el servicio de correo
      const transporter = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'urkogarcia12@gmail.com', // Dirección de correo electrónico remitente
          pass: config.pass_email // Utiliza la contraseña desde config.js
        }
      });

      // Configurar el correo a enviar
      const mailOptions = {
        from: 'urkogarcia12@gmail.com',
        to: email,
        subject: 'Recuperación contraseña SecKey',
        text: `Tu código de recuperación es: ${recoveryCode}`
      };

      // Enviar el correo electrónico
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.status(500).json({ status: 500, message: 'ERROR: No se pudo enviar el email', error: error });
        } else {
          console.log('Correo enviado: ' + info.response);
          res.json({ status: 200, message: 'Código de recuperación enviado', code: recoveryCode });
        }
      });
    } else {

      res.json(err);
    }
  });
});


router.post('/recuperar/reestablecer', (req, res) => {
  const { email, pass } = req.body;

  dbQuery.reestablecer(email, pass, (err, userData) => {
    if (!err) {
      res.json({ status: 200, message: 'Contraseña actualizada exitosamente' });
    } else {
      res.status(500).json(err);
    }
  });
});



// Se exporta el router del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;
