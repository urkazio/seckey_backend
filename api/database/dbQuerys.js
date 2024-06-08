const mysqlConnection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token


// ++++++++++++++++++++++++++++++++++++ USUARIOS NO_LOGGED ++++++++++++++++++++++++++++++++++++

function login(user, pass, callback) {
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


function register(user, pass, callback) {
  const iterations = 1000;
  const hash = CryptoJS.PBKDF2(pass, config.saltHash, { keySize: 256/32, iterations }).toString();

  // Primero busca si el usuario ya existe
  mysqlConnection.query(
    'SELECT email, rol FROM any_logged WHERE email = ?',
    [user],
    (err, rows, fields) => {
      if (err) {
        callback({ status: 500, message: 'ERROR: Inténtelo más tarde', error: err });
      } else if (rows.length > 0) {
        // Si el usuario ya existe
        callback({ status: 400, message: 'ERROR: Email ya registrado' });
      } else {
        // Si el usuario no existe, lo insertamos
        mysqlConnection.query(
          'INSERT INTO any_logged (email, pass, rol) VALUES (?, ?, ?)',
          [user, hash, 'user'], // Asumimos que el rol por defecto es 'user'
          (err, results) => {
            if (err) {
              callback({ status: 500, message: 'ERROR: Usuario no insertado', error: err });
            } else {
              callback({ status: 200, message: 'OK' });
            }
          }
        );
      }
    }
  );
}

function comprobarMail(email, callback) {
  mysqlConnection.query(
    'SELECT email FROM any_logged WHERE email = ?',
    [email],
    (err, rows) => {
      if (err) {
        callback({ status: 500, message: 'ERROR: Inténtelo más tarde', error: err });
      } else if (rows.length > 0) {
        callback(null);
      } else {
        callback({ status: 500, message: 'ERROR: Email no registrado', error: err });
      }
    }
  );
}


  
// exportar las funciones definidas en este fichero
module.exports = {
  login,
  register,
  comprobarMail
  };