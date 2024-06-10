const fs = require('fs');
const https = require('https');
const app = require('./app');

// Leer los archivos del certificado
const options = {
    key: fs.readFileSync('D:/UNIVERSIDAD/master/TFM/SERVIDOR/server.key'),
    cert: fs.readFileSync('D:/UNIVERSIDAD/master/TFM/SERVIDOR/server.cert')
  };

const httpsPort = process.env.HTTPS_PORT || 4430;

// Crear el servidor HTTPS
https.createServer(options, app).listen(httpsPort, () => {
  console.log('Servidor lanzado en 127.0.0.1:' + httpsPort + ' (HTTPS)');
});