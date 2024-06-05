const http = require ('http');
const app = require('./app');

const port = process.env.POR || 3000;


const server = http.createServer(app);
server.listen(port, ()=> console.log('Servidor lanzado en 127.0.0.1:' + port))

