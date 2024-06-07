const mysqlConnection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token


// ++++++++++++++++++++++++++++++++++++ USUARIOS NO_LOGGED ++++++++++++++++++++++++++++++++++++

function getUser(user, pass, callback) {
    const iterations = 1000;
    const hash = CryptoJS.PBKDF2(pass, config.saltHash, { keySize: 256/32, iterations });
  
    mysqlConnection.query(
      'SELECT email, rol FROM any_logged WHERE email  = ? AND pass = ?',
      [user, hash.toString()],
      (err, rows, fields) => {
        if (!err) {
          if (rows.length > 0) {
            const userData = {
              usuario: rows[0].email,
              rol: rows[0].rol
            };
            callback(null, userData);
          } else {
            callback('Usuario o clave incorrectos');
          }
        } else {
          callback(err);
        }
      }
    );
  }

// exportar las funciones definidas en este fichero
module.exports = {
    getUser
  };