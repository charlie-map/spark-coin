const options = {
	host: 		process.env.HOST,
	user:		process.env.USER_NAME,
	password: 	process.env.PASSWORD,
	database: 	process.env.DATABASE,
	insecureAuth: false
};

// general connection
const mysql = require('mysql2');
const connection = mysql.createConnection(options);
connection.connect((err) => {
	if (err) throw err;
});

// exports connection and session/sessionStore instances
module.exports = {
	connection: connection,
	options: options
};
