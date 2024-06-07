const mysql = require('mysql')

const mysqlConnection = mysql.createPool({
    host:'localhost',
    user: 'root',
    password: '',
    database: 'seckey',
    port: '3306'
});
 
// Ping database to check for common exception errors.
mysqlConnection.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.')
        }
    }
 
    if (connection) {
        connection.release()
        console.log('Database connected ');
    }
 
    return
})

module.exports = mysqlConnection

