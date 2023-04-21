const mysql = require('mysql');
require('dotenv').config();

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'Jona1995!',
	database: 'bank_info',
});
connection.connect((err) => {
	if (err) {
		console.error('Error connecting to database:', err.stack);
		return;
	}
	console.log('Connected to database as ID', connection.threadId);
});
module.exports = connection;
