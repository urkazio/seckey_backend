const mysqlConnection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token
const e = require('express');


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
  // Primero verificar si la categoría ya existe
  const checkQuery = `
    SELECT COUNT(*) AS count
    FROM categoria
    WHERE nombre = ? AND email_user = ?
  `;

  mysqlConnection.query(checkQuery, [nombrecat, email], (err, rows) => {
    if (err) {
      callback({ status: 500, message: 'ERROR al verificar la existencia de la categoría', error: err });
    } else {
      const count = rows[0].count;
      if (count > 0) {
        callback(null, { status: 409, message: 'La categoría ya existe' });
      } else {
        // Si la categoría no existe, proceder a insertarla
        const insertQuery = `
          INSERT INTO categoria (nombre, email_user)
          VALUES (?, ?)
        `;

        mysqlConnection.query(insertQuery, [nombrecat, email], (err, result) => {
          if (err) {
            callback({ status: 500, message: 'ERROR: No se pudo insertar la categoría', error: err });
          } else {
            callback(null, { status: 200, message: 'Categoría insertada exitosamente' });
          }
        });
      }
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


function verificarContraseñasPorExpirar(callback) {
  const query = `
    SELECT c.nombre AS nombreContrasena, u.email_user, u.nombre
    FROM contraseña c
    JOIN user_logged u ON c.owner = u.email_user
    WHERE c.fecha_exp BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY)
  `;

  mysqlConnection.query(query, (err, rows) => {
    if (err) {
      callback(err);
    } else {
      callback(null, rows);
    }
  });
}



function editarContrasena(nombre, username, nuevaContrasena, fecha_exp, id, callback) {
  console.log("Datos recibidos:", { nombre, username, nuevaContrasena, id });

  const nuevaHash = encryptPassword(nuevaContrasena);

  const verificarQuery = `
    SELECT hash_pass_antigua
    FROM cambios_contraseñas
    WHERE id_contraseña = ? AND fecha_hora_cambio >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
  `;

  mysqlConnection.query(verificarQuery, [id], (err, rows) => {
    if (err) {
      console.error("Error al verificar contraseñas anteriores:", err);
      return callback({ status: 500, message: 'Error al verificar contraseñas anteriores'});
    }

    // Desencriptar las contraseñas antiguas y comprobar si alguna coincide con la nueva
    const contrasenaUsada = rows.some(row => decryptPassword(row.hash_pass_antigua) === nuevaContrasena);
    console.log("contraseña usada en los últimos 3 meses:", contrasenaUsada);

    if (!contrasenaUsada) {
      // Actualizar la contraseña
      const actualizarQuery = `
        UPDATE contraseña
        SET nombre = ?, username = ?, hash = ?, fecha_exp = ?
        WHERE id = ?
      `;

      mysqlConnection.query(actualizarQuery, [nombre, username, nuevaHash, fecha_exp, id], (err, result) => {
        if (err) {
          console.error("Error al actualizar la contraseña:", err);
          callback({ status: 500, message: 'Error al actualizar la contraseña'});
        }

        // Registrar el cambio en la tabla cambios_contraseñas
        const registrarCambioQuery = `
          INSERT INTO cambios_contraseñas (id_contraseña, fecha_hora_cambio, hash_pass_antigua)
          VALUES (?, NOW(), ?)
        `;

        mysqlConnection.query(registrarCambioQuery, [id, nuevaHash], (err, result) => {
          if (err) {
            console.error("Error al registrar el cambio de contraseña:", err);
            callback({ status: 500, message: 'Error al registrar el cambio de contraseña'});
          }

          callback(null, { status: 200, message: 'Contraseña actualizada exitosamente' });
        });
      });

    } else {
      callback(null, { status: 409, message: 'Contraseña ya usada hace menos de 3 meses' });
    }
  });
}


// ++++++++++++++++++++++++++++++++++++ USUARIOS ADMIN_LOGGED ++++++++++++++++++++++++++++++++++++


function getUsers(callback) {
  const query = `
    SELECT 
      COALESCE(admin_logged.nombre, user_logged.nombre) AS nombre, 
      any_logged.email, 
      any_logged.rol
    FROM any_logged
    LEFT JOIN admin_logged ON any_logged.email = admin_logged.email_admin
    LEFT JOIN user_logged ON any_logged.email = user_logged.email_user;
  `;

  mysqlConnection.query(query, (err, rows) => {
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


function borrarUsuario(emailUsuario, callback) {
  // Primero borramos los registros de cambios_contraseñas asociados al usuario
  const deleteCambiosQuery = `
    DELETE FROM cambios_contraseñas
    WHERE id_contraseña IN (
      SELECT contraseña.id
      FROM contraseña
      WHERE contraseña.owner = ?
    )
  `;
  
  mysqlConnection.query(deleteCambiosQuery, [emailUsuario], (err, result) => {
    if (err) {
      callback({ status: 500, message: 'ERROR: No se pudieron borrar los cambios de contraseña del usuario', error: err });
    } else {
      // Luego borramos todas las contraseñas asociadas al usuario
      const deletePasswordsQuery = `
        DELETE FROM contraseña
        WHERE owner = ?
      `;
      
      mysqlConnection.query(deletePasswordsQuery, [emailUsuario], (err, result) => {
        if (err) {
          callback({ status: 500, message: 'ERROR: No se pudieron borrar las contraseñas del usuario', error: err });
        } else {
          // Después borramos todas las categorías del usuario
          const deleteCategoriasQuery = `
            DELETE FROM categoria
            WHERE email_user = ?
          `;
          
          mysqlConnection.query(deleteCategoriasQuery, [emailUsuario], (err, result) => {
            if (err) {
              callback({ status: 500, message: 'ERROR: No se pudieron borrar las categorías del usuario', error: err });
            } else {
              // Borramos al usuario de user_logged
              const deleteUserLoggedQuery = `
                DELETE FROM user_logged
                WHERE email_user = ?
              `;
              
              mysqlConnection.query(deleteUserLoggedQuery, [emailUsuario], (err, result) => {
                if (err) {
                  callback({ status: 500, message: 'ERROR: No se pudo borrar al usuario de user_logged', error: err });
                } else {
                  // Finalmente, borramos al usuario de any_logged
                  const deleteAnyLoggedQuery = `
                    DELETE FROM any_logged
                    WHERE email = ?
                  `;
                  
                  mysqlConnection.query(deleteAnyLoggedQuery, [emailUsuario], (err, result) => {
                    if (err) {
                      callback({ status: 500, message: 'ERROR: No se pudo borrar al usuario de any_logged', error: err });
                    } else {
                      if (result.affectedRows === 0) {
                        callback({ status: 404, message: 'No se encontró al usuario con el email proporcionado' });
                      } else {
                        callback(null, { status: 200, message: 'Usuario, categorías, contraseñas y entradas relacionadas borradas exitosamente' });
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
}



function editarUsuario(nuevoEmail, emailAntiguo, callback) {
  // Check if nuevoEmail exists in any_logged
  const checkEmailQuery = `
    SELECT email FROM any_logged WHERE email = ?
  `;
  
  mysqlConnection.query(checkEmailQuery, [emailAntiguo], (err, results) => {
    if (err) {
      callback({ status: 500, message: 'Error checking email existence', error: err });
    } else if (results.length === 0) {
      // Nuevo email does not exist, so insert it first
      const insertEmailQuery = `
        INSERT INTO any_logged (email, pass, rol) VALUES (?, 'hashed_password', 'user')
      `;
      
      mysqlConnection.query(insertEmailQuery, [nuevoEmail], (err, result) => {
        if (err) {
          callback({ status: 500, message: 'Error inserting new email into any_logged', error: err });
        } else {
          // Now update user_logged.email_user
          updateUsuarioLogged(nuevoEmail, emailAntiguo, callback);
        }
      });
    } else {
      // Nuevo email already exists, proceed with update
      updateUsuarioLogged(nuevoEmail, emailAntiguo, callback);
    }
  });
}

function updateUsuarioLogged(nuevoEmail, emailAntiguo, callback) {
  // Update user_logged.email_user
  const updateUserLoggedQuery = `
    UPDATE user_logged
    SET email_user = ?
    WHERE email_user = ?
  `;
  
  mysqlConnection.query(updateUserLoggedQuery, [nuevoEmail, emailAntiguo], (err, result) => {
    if (err) {
      callback({ status: 500, message: 'ERROR: No se pudo actualizar el email en user_logged', error: err });
    } else {
      // Handle successful update
      callback(null, { status: 200, message: 'Usuario y entradas relacionadas actualizadas exitosamente' });
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
  borrarCategoria,
  verificarContraseñasPorExpirar,
  editarContrasena,
  getUsers,
  borrarUsuario,
  editarUsuario
};
