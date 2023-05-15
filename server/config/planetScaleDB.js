require('dotenv').config();
const mysql = require('mysql2');
const connectionPlanetScale = mysql.createConnection(process.env.DATABASE_URL);
console.log('Connected to PlanetScale!');

module.exports = connectionPlanetScale;
