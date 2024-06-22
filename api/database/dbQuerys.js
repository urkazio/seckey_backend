const mysqlConnection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token

function encryptPassword(password) {
  return CryptoJS.AES.encrypt(password, config.secretKey).toString();
}

function decryptPassword(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, config.secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// ++++++++++++++++++++++++++++++++++++ USUARIOS NO_LOGGED ++++++++++++++++++++++++++++++++++++

function login(user, pass, callback) {
  mysqlConnection.query(
    'SELECT email, rol, pass FROM any_logged WHERE email = ?',
    [user],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const storedHash = rows[0].pass;
          const decryptedPass = decryptPassword(storedHash);
          if (decryptedPass === pass) {
            const userData = {
              usuario: rows[0].email,
              rol: rows[0].rol
            };
            callback(null, userData);
          } else {
            callback('Usuario o clave incorrectos');
          }
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
  const hash = encryptPassword(pass);

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
  const hash = encryptPassword(pass);

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


// ++++++++++++++++++++++++++++++++++++ USUARIO ++++++++++++++++++++++++++++++++++++++++

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
    WHERE categoria.nombre = ? AND contraseña.owner = ?
    ORDER BY contraseña.nombre ASC`; // Ordena los resultados por el nombre de la categoría en orden alfabético


  mysqlConnection.query(query, [nombreCategoria, email], (err, rows) => {
    if (err) {
      callback({
        status: 500,
        message: 'ERROR: Inténtelo más tarde',
        error: err
      });
    } else {
      // Desencriptar cada contraseña
      const result = rows.map(row => ({
        ...row,
        hash: this.decryptPassword(row.hash),
        fecha_exp: formatDate(row.fecha_exp) // Formatear la fecha
      }));
      callback(null, result);
    }
  });
}

// Función para formatear la fecha en dd/mm/aaaa hh:mm
function formatDate(date) {
  if (!date) return null; // Manejar caso de fecha nula

  const formattedDate = new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return formattedDate;
}


function crearCategoria(email, nombrecat, callback) {
  const query = `
    INSERT INTO categoria (nombre, email_user)
    VALUES (?, ?)
  `;

  mysqlConnection.query(query, [nombrecat, email], (err, result) => {
    if (err) {
      callback({ status: 500, message: 'ERROR: No se pudo insertar la categoría', error: err });
    } else {
      callback(null, { status: 200, message: 'Categoría insertada exitosamente' });
    }
  });
}


function crearContrasena(nombre, username, pass, fecha_exp, nombreCat, owner, callback) {
  const cripto = encryptPassword(pass);

  const query = `
    INSERT INTO contraseña (nombre, username, hash, fecha_exp, categoria, owner)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  mysqlConnection.query(query, [nombre, username, cripto, fecha_exp, nombreCat, owner], (err, result) => {
    if (err) {
      console.error('Error al ejecutar consulta SQL:', err); // Log de errores
      callback({ status: 500, message: 'ERROR: No se pudo insertar la contraseña', error: err });
    } else {
      callback(null, { status: 200, message: 'Contraseña insertada exitosamente' });
    }
  });
}


function borrarContrasena(id, callback) {
  const query = `
    DELETE FROM contraseña
    WHERE id = ?
  `;

  mysqlConnection.query(query, [id], (err, result) => {
    if (err) {
      callback({ status: 500, message: 'ERROR: No se pudo borrar la contraseña', error: err });
    } else {
      if (result.affectedRows === 0) {
        callback({ status: 404, message: 'No se encontró la contraseña con el id proporcionado' });
      } else {
        callback(null, { status: 200, message: 'Contraseña borrada exitosamente' });
      }
    }
  });
}


function borrarCategoria(nombreCategoria, callback) {
  // Primero borramos todas las contraseñas asociadas a la categoría
  const deletePasswordsQuery = `
    DELETE FROM contraseña
    WHERE categoria = ?
  `;

  mysqlConnection.query(deletePasswordsQuery, [nombreCategoria], (err, result) => {
    if (err) {
      callback({ status: 500, message: 'ERROR: No se pudieron borrar las contraseñas de la categoría', error: err });
    } else {
      // Luego borramos la categoría en sí
      const deleteCategoriaQuery = `
        DELETE FROM categoria
        WHERE nombre = ?
      `;

      mysqlConnection.query(deleteCategoriaQuery, [nombreCategoria], (err, result) => {
        if (err) {
          callback({ status: 500, message: 'ERROR: No se pudo borrar la categoría', error: err });
        } else {
          if (result.affectedRows === 0) {
            callback({ status: 404, message: 'No se encontró la categoría con el nombre proporcionado' });
          } else {
            callback(null, { status: 200, message: 'Categoría y contraseñas asociadas borradas exitosamente' });
          }
        }
      });
    }
  });
}




// Exportar las funciones definidas en este fichero
module.exports = {
  login,
  register,
  comprobarMail,
  reestablecer,
  getCategorias,
  getPassFromCategoria,
  encryptPassword,
  decryptPassword,
  crearCategoria,
  crearContrasena,
  borrarContrasena,
  borrarCategoria
};
