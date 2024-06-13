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


  function register(user, pass, nombre, callback) {
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
                // Después de insertar en any_logged, inserta en user_logged
                mysqlConnection.query(
                  'INSERT INTO user_logged (nombre, email_user) VALUES (?, ?)',
                  [nombre, user],
                  (err, results) => {
                    if (err) {
                      callback({ status: 500, message: 'ERROR: Usuario no insertado en user_logged', error: err });
                    } else {
                      callback({ status: 200, message: 'OK' });
                    }
                  }
                );
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


function reestablecer(email, pass, callback) {
  const iterations = 1000;
  const hash = CryptoJS.PBKDF2(pass, config.saltHash, { keySize: 256/32, iterations }).toString();

  mysqlConnection.query(
    'UPDATE any_logged SET pass = ? WHERE email = ?',
    [hash, email],
    (err, result) => {
      if (err) {
        callback({ status: 500, message: 'ERROR: No se pudo actualizar la contraseña', error: err });
      } else if (result.affectedRows > 0) {
        callback(null, { status: 200, message: 'Contraseña actualizada exitosamente' });
      } else {
        callback({ status: 400, message: 'ERROR: Email no registrado' });
      }
    }
  );
}


function getCategorias(email, callback) {
  const query = `
    SELECT categoria.nombre
    FROM categoria
    INNER JOIN user_logged ON categoria.email_user = user_logged.email_user
    WHERE user_logged.email_user = ?`;

  mysqlConnection.query(query, [email], (err, rows) => {
    if (err) {
      callback({
        status: 500,
        message: 'ERROR: Inténtelo más tarde',
        error: err
      });
    } else {
      const categorias = rows.map(row => row.nombre);
      callback(null, categorias);
    }
  });
}

function getPassFromCategoria(nombreCategoria, email, callback) {
  const query = `
    SELECT contraseña.id, contraseña.nombre, contraseña.username, contraseña.hash, contraseña.fecha_exp, contraseña.categoria
    FROM contraseña
    INNER JOIN categoria ON contraseña.categoria = categoria.nombre
    WHERE categoria.nombre = ? AND contraseña.username=?`;

  mysqlConnection.query(query, [nombreCategoria, email], (err, rows) => {
    if (err) {
      callback({
        status: 500,
        message: 'ERROR: Inténtelo más tarde',
        error: err
      });
    } else {
      callback(null, rows);
    }
  });
}

  
// exportar las funciones definidas en este fichero
module.exports = {
  login,
  register,
  comprobarMail,
  reestablecer,
  getCategorias,
  getPassFromCategoria
  };