require('dotenv').config({
	path: __dirname + "/.env"
});
const {
	v4: uuidv4
} = require('uuid');

const mysql = require('mysql2');

const connection = mysql.createConnection({
	host: process.env.HOST,
	database: process.env.DATABASE,
	user: process.env.USER_NAME,
	password: process.env.PASSWORD,
	insecureAuth: false
});

connection.connect((err) => {
	if (err) throw err;
});

function add_sparks() {
	return new Promise((resolve, reject) => {
		connection.query("SELECT camper_id, balance, settings.value FROM spark_user CROSS JOIN settings WHERE staffer=1 AND settings.name='staff_coins'", async (err, staffers) => {
			if (err) reject(err);

			let staffer_balance_up = staffers.map(staffer => {

				return new Promise((run_complete, run_reject) => {
					connection.query("UPDATE spark_user SET balance=? WHERE camper_id=?", [staffer.balance + staffer.value, staffer.camper_id], (err, complete) => {
						if (err) return run_reject(err);

						run_complete();
					});
				});
			});

			await Promise.all(staffer_balance_up).catch(error => {
				return reject(error);
			});
			resolve();
		});
	});
}

add_sparks().then(() => {
	connection.close();
	process.exit();
}).catch(error => {
	connection.close();
	console.error(error);
});