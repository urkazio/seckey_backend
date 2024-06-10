const config = require('./config');
const jwt = require('jsonwebtoken');

function verifyRole(role) {
    return function(req, res, next) {
        if (!req.headers.authorization) {
            return res.status(401).json('No autorizado');
        } else {
            const token = req.headers.authorization.substring(7);
            if (token == '') {
                return res.status(401).json('Token vacío');
            } else {
                try {
                    const secretKey = config.secretKey;
                    const content = jwt.verify(token, secretKey); // Decodifica el token devolviendo los datos originales
                    const tokenRole = content['rol'];
                    if (tokenRole === role) {
                        req.body = Object.assign({}, req.body, content); // Concatenar en el cuerpo del mensaje el token decodificado
                        next(); // Seguir con la ejecución del método llamador
                    } else {
                        return res.status(401).json('No autorizado');
                    }
                } catch (err) {
                    return res.status(401).json('Token inválido');
                }
            }
        }
    };
}

const verifyUser = verifyRole('user');
const verifyAdmin = verifyRole('admin');
  
module.exports = {
    verifyUser,
    verifyAdmin
};