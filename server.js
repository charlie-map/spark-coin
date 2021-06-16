require('dotenv').config({
	path: __dirname + "/.env"
});
const {
	v4: uuidv4
} = require('uuid');



const axios = require('axios');
const mustache = require('mustache-express');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const signature = require('cookie-signature');

const io = require('socket.io')(server);

const session = require('express-session');
const memorystore = require('memorystore')(session);

const bcrypt = require('bcrypt');
const saltRounds = 10;

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

app.use(express.static(__dirname + "/public"));

app.set('views', __dirname + "/views");
app.set('view engine', 'mustache');
app.engine('mustache', mustache());

app.use(bodyParser.urlencoded({
	extended: false
}));
let sess_store = new memorystore({
		checkPeriod: 86400000/2
});
let sess_secret = uuidv4()
let sess = session({
	cookie: {
		maxAge: 86400000/2,
		httpOnly: false
	},
	store: sess_store,
	resave: false,
	secure: false,
	unset: 'destroy',
	saveUninitialized: false,
	name: 'sparks.sid',
	sameSite: true,
	secret: sess_secret
});
app.use(sess);

let user_sockets = {};

let RAFFLE_MODE = 0;
const DEFAULT_START = 10;

/* BOTTOMWARE */

function roundTo(n, digits) {
	if (digits === undefined) {
		digits = 0;
	}

	var multiplicator = Math.pow(10, digits);
	n = parseFloat((n * multiplicator).toFixed(11));
	return Math.round(n) / multiplicator;
}

/* MIDDLEWARE */

class LoginError extends Error {
  constructor(message) {
    super(message);
    this.name = "LoginError";
    this.login = 1;
  }
}

function isLoggedIn(role) { // role levels: 0 = camper; 1 = staffer; 2 = admin
	return (req, res, next) => {
		if (!req.session || !req.session.user)
			next(new LoginError());
		else if (role && req.session.user.staffer != role)
			next(new Error("You aren't allowed to do that!"));
		else {
			req.user = req.session.user;
			next();
		}
	};
}

/* SYSTEM ENDPOINTS */

app.get("/", isLoggedIn(), (req, res, next) => {
	connection.query("SELECT balance FROM spark_user WHERE camper_id = ?;", [req.user.camper_id], (err, result) => {
		if (err || !result) return next(new Error('Database error.'));
		req.user.balance = result[0].balance;
		res.render("home", {
			BALANCE: req.user.staffer > 1 ? '∞' : req.user.balance
		});
	});
});

app.get("/raffle", isLoggedIn(), (req, res) => {
	res.end(RAFFLE_MODE);
});

app.post("/transfer", isLoggedIn(), (req, res) => {
	// TODO: Trigger UI Change (both)
});

/* CAMPER ENDPOINTS */

app.post("/purchase", isLoggedIn(0), (req, res) => {
	// TODO: Trigger Slack
	// TODO: Trigger UI Change (camper)
});

/* STAFFER ENDPOINTS */

app.get("/inventory", isLoggedIn(1), (req, res) => {
	connection.query("SELECT * FROM inventory LEFT JOIN tx ON inventory.id = tx.inventory_item WHERE camper_id = ?", [req.user.id], (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.put("/inventory", isLoggedIn(1), (req, res) => {
	if (!req.body.item_name || !req.body.price || !req.body.quantity) return next(new Error('Required field missing.'));
	connection.query("INSERT INTO inventory (camper_id, item_name, price, quantity, active) VALUES (?, ?, ?, ?, 1);", [req.user.id, req.body.item_name, req.body.price, req.body.quantity], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.delete("/inventory", isLoggedIn(1), (req, res) => {
	if (!req.body.id) return next(new Error('Required field missing.'));
	connection.query("UPDATE inventory SET active = 0 WHERE id = ? AND camper_id = ?;", [req.body.id, req.user.id], (err) => {
		if (err) return next(err);
		res.end();
	});
});

/* ADMIN ENDPOINTS */

app.get("/admin", isLoggedIn(2), (req, res) => {
	// TODO: render admin frontend
	res.end("Admin level access!");
});

app.get("/admin/inventory", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM inventory WHERE camper_id IS NULL;", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.get("/admin/inventory/all", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM inventory;", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.put("/admin/inventory", isLoggedIn(2), (req, res, next) => {
	if (!req.body.item_name || !req.body.price || !req.body.quantity) return next(new Error('Required field missing.'));
	connection.query("INSERT INTO inventory (camper_id, item_name, price, quantity, active) VALUES (NULL, ?, ?, ?, 1);", [req.body.item_name, req.body.price, req.body.quantity], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.delete("/admin/inventory", isLoggedIn(2), (req, res, next) => {
	if (!req.body.id) return next(new Error('Required field missing.'));
	connection.query("UPDATE inventory SET active = 0 WHERE id = ?;", [req.body.id], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.put("/admin/inventory/raffle", isLoggedIn(2), (req, res, next) => {
	if (!req.body.item_name || !req.body.description) return next(new Error('Required field missing.'));
	connection.query("INSERT INTO raffle_item (item_name, description, image_url) VALUES (?, ?, ?);", [req.body.item_name, req.body.description, req.body.image_url], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.delete("/admin/inventory/raffle", isLoggedIn(2), (req, res, next) => {
	if (!req.body.id) return next(new Error('Required field missing.'));
	connection.query("DELETE FROM raffle_item WHERE id = ?;", [req.body.id], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.post("/admin/load", isLoggedIn(2), async (req, res, next) => {
	if (!req.body.week_id) return next(new Error('Required field missing.'));
	connection.query("SELECT * FROM registration.week WHERE id = ?;", [req.body.week_id], async (err, result) => {
		if (err || !result) return next(new Error('Invalid week.'));
		connection.query("SELECT * FROM registration.enrollment JOIN registration.camper ON registration.enrollment.camper_id = registration.camper.id WHERE week_id = ? AND person_loc = 1;", [req.body.week_id], async (err, campers) => {
			let date = new Date();
			let camper_promise = campers.map((camper) => {
				return new Promise((resolve, reject) => {
					let new_pin = Math.floor(1000 + Math.random() * 9000);
					connection.query("INSERT INTO spark_user (camper_id, staffer, pin, balance, last_login, slack_id) VALUES (?, 0, ?, ?, ?, NULL);", [camper.camper_id, new_pin, DEFAULT_START, date], (err) => {
						if (err) reject(err);
						camper.pin = new_pin;
						resolve(camper);
					});
				});
			});
			await Promise.all(camper_promise);
			res.json(campers);
		});
	});
});

app.post("/admin/reset", isLoggedIn(2), (req, res, next) => {
	if (!req.body.camper_id) return next(new Error('Required field missing.'));
	let new_pin = Math.floor(1000 + Math.random() * 9000);
	connection.query("UPDATE spark_user SET pin = ? WHERE camper_id = ?;", [new_pin, req.body.camper_id], (err) => {
		res.end(new_pin);
	});
});

app.get("/admin/campers", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM spark_user;", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.post("/admin/raffle", isLoggedIn(2), (req, res) => {
	RAFFLE_MODE = !RAFFLE_MODE;
	res.end(""+RAFFLE_MODE);
});

app.get("/admin/raffle/drawing", isLoggedIn(2), async (req, res, next) => {
	try {
		// get all raffle items
		let raffle_items = await new Promise ((resolve, reject) => {
			connection.query("SELECT id, item_name, description FROM raffle_item WHERE active = 1;", (err, result) => {
				if (err) reject(err);
				resolve(result);
			});
		});

		// select raffle winner (-1 if nobody bought tickets)
		let winners = raffle_items.map((item) => {
			return new Promise((resolve, reject) => {
				connection.query("SELECT sender_id FROM tx WHERE raffle_item = ?;", [item.id], (err, result) => {
					if (err) reject(err);
					if (!result || !result.length) { item.winner = -1; return resolve(item); }
					item.winner = result[Math.floor(Math.random() * result.length)].sender_id;
					return resolve(item);
				});
			});
		});
		winners = await Promise.all(winners);

		// augment raffle items with winner data
		let augmented_winners = winners.map((item) => {
			return new Promise((resolve, reject) => {
				if (item.winner == -1) {
					item.winner_name = "Nobody Won";
					return resolve(item);
				}
				connection.query("SELECT first_name, last_name FROM registration.camper WHERE id = ?;", [item.winner], (err, result) => {
					if (err) reject(err);
					item.winner_name = result[0].first_name + ' ' + result[0].last_name;
					return resolve(item);
				});
			});
		});
		augmented_winners = await Promise.all(augmented_winners);
		res.json(augmented_winners);
	} catch (err) {
		next(err);
	}
});

app.get("/admin/log", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM tx ORDER BY time DESC", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

/* AUTHENTICATION ENDPOINTS */

app.post("/login", (req, res, next) => {
	// validate required info present
	if (!req.body.camper_id || !req.body.pin)
		return next(new LoginError("You need to provide both an ID and a PIN to log in."));
	// check PIN against MySQL
	connection.query('SELECT * FROM spark_user JOIN registration.camper ON spark_user.camper_id = registration.camper.id WHERE camper_id = ? AND pin = ?;', [req.body.camper_id, req.body.pin], (err, camper) => {
		if (err) return next(err);
		if (!camper || !camper[0]) return next(new LoginError("Incorrect ID or PIN."));
		req.session.user = camper[0];
		res.redirect("/");
	});
});

app.get("/logout", (req, res) => {
	req.session = null; // unset: destroy takes care of it
	res.redirect("/");
});

/* ERROR HANDLING CHAIN */

app.use(function(err, req, res, next) {	// handle all other thrown errors
	if (err.login)	// handle login errors
		res.render("initial", err.message ? { MESSAGE: err.message } : {} );
	else {			// handle all other errors
		console.error(err);
		res.render("error", { ERROR_MESSAGE: err.message });
	}
});

/* LISTENERS */

io.on('connection', (socket) => {
	// parse cookie to associate user with this session
	let sid = decodeURIComponent(socket.client.conn.request.headers.cookie.split('; ').find(row => row.startsWith('sparks.sid=')).split('=')[1]);
	sid = signature.unsign(sid.substring(2), sess_secret);
	if (!sid)
		socket.disconnect();
	else
		sess_store.get(sid, (err, data) => { socket.user = data.user; user_sockets[data.user.camper_id] = socket; });

	socket.on('inventory_get', (cb) => {
		// if raffle, send raffle items instead
		let query_string;
		if (RAFFLE_MODE)
			query_string = "SELECT id, item_name, description, image_url, 'RAFFLE' AS owner FROM raffle_item WHERE active = 1;";
		else
			query_string = "SELECT id, item_name, description, image_url, camp_name AS owner, price FROM inventory LEFT JOIN spark_user ON inventory.camper_id = spark_user.camper_id WHERE active = 1 AND quantity > 0;"
		// filter out no quantity items & only active items
		connection.query(query_string, (err, result) => {
			cb(result);
		});
	});

	socket.on('purchase', async (item_id, cb) => {
		if (!socket.user || socket.user.staffer != 0) return cb("Not logged in / not correct role.");
		try {
			// get data about inventory item & verify quantity / active
			let item = await new Promise((resolve, reject) => {
				if (RAFFLE_MODE) {
					connection.query("SELECT * FROM raffle_item WHERE id = ?;", [item_id], (err, result) => {
						if (err) reject(err);
						if (!result) reject("Invalid raffle item.");
						if (result[0].active != 1) reject("This raffle item is unavailable.");
						result[0].price = 1;
						resolve(result[0]);
					});
				} else {
					connection.query("SELECT * FROM inventory WHERE id = ?;", [item_id], (err, result) => {
						if (err) reject(err);
						if (!result) reject("Invalid item.");
						if (result[0].quantity < 1 || result[0].active != 1) reject("This item is unavailable.");
						resolve(result[0]);
					});
				}
			});

			// get/verify appropriate balance & quantity / active
			let bal = await new Promise((resolve, reject) => {
				connection.query("SELECT balance FROM spark_user WHERE camper_id = ?;", [socket.user.camper_id], (err, result) => {
					if (err || !result) reject("Purchasing camper does not exist.");
					if (result[0].balance < item.price) reject("Not enough Sparks.");
					resolve(result[0].balance);
				});
			});

			bal -= item.price;
			bal = roundTo(bal, 3);

			if (RAFFLE_MODE) {
				await new Promise((resolve, reject) => {
					connection.query("UPDATE spark_user SET balance = ? WHERE camper_id = ?;", [bal, socket.user.camper_id], (err) => {
						if (err) reject(err);
						connection.query("INSERT INTO tx (receiver_id, sender_id, inventory_item, raffle_item, amount, message, tx_time) VALUES (NULL, ?, NULL, ?, 1, NULL, ?);",
							[ socket.user.camper_id, item.id, new Date()], (err) => {
							if (err) reject(err);
							resolve();
						});
					});
				});
				socket.emit('balance', bal, -1);
				return cb(null);
			}

			// remove quantity / remove balance / log tx
			await new Promise((resolve, reject) => {
				connection.query("UPDATE inventory SET quantity = ? WHERE id = ?;", [item.quantity-1, item.id], (err) => {
					if (err) reject(err);
					connection.query("UPDATE spark_user SET balance = ? WHERE camper_id = ?;", [bal, socket.user.camper_id], (err) => {
						if (err) reject(err);
						connection.query("INSERT INTO tx (receiver_id, sender_id, inventory_item, raffle_item, amount, message, tx_time) VALUES (NULL, ?, ?, NULL, ?, NULL, ?);",
							[ socket.user.camper_id, item.id, item.price, new Date()], (err) => {
							if (err) reject(err);
							resolve();
						});
					});
				});
			});

			// notify all parties
			socket.emit('balance', bal, -1);
			let message = 'Item ' + item.item_name + ' was purchased by ' + socket.user.first_name + ' ' + socket.user.last_name + ' (#' + socket.user.camper_id + ')!' + ' There are ' + (item.quantity-1) + ' of these left.';
			if (!item.camper_id) {	// camp-wide alert for camp-wide item
				// loop through users and find all admins
				let admin_slack_ids = await new Promise((resolve, reject) => {
					connection.query("SELECT slack_id FROM spark_user WHERE staffer > 1;", (err, result) => {
						if (err || !result)
							resolve(null)
						resolve(result);
					});
				});
				await Promise.all(admin_slack_ids.map((slack_id) => {
					axios.post('https://slack.com/api/chat.postMessage',
					{
						token: process.env.SLACK_TOKEN,
						channel: slack_id.slack_id,
						text: message
					}, { headers: { authorization: 'Bearer ' + process.env.SLACK_TOKEN } });
				}));
				return cb(false);
			} else {				// specific alert for staffer
				if (user_sockets[item.camper_id]) user_sockets[item.camper_id].emit('alert', message);
				// look up staffer's slack ID & message them
				let slack_id = await new Promise((resolve, reject) => {
					connection.query("SELECT slack_id FROM spark_user WHERE camper_id = ?;", [item.camper_id], (err, result) => {
						if (err || !result)
							resolve(null);
						resolve(result[0].slack_id);
					});
				});
				if (slack_id) {
					await axios.post('https://slack.com/api/chat.postMessage',
					{
						token: process.env.SLACK_TOKEN,
						channel: slack_id,
						text: message
					}, { headers: { authorization: 'Bearer ' + process.env.SLACK_TOKEN } });
				}
				return cb(false);
			}
		} catch (err) {
			return cb(err);
		}
	});

	socket.on('transfer', async (receiving_id, amount, message, cb) => {
		if (!socket.user) return cb("Not logged in.");
		amount = parseFloat(amount);
		if (amount == "NaN") return cb("Not a valid amount.");
		amount = roundTo(amount, 3);
		if (!(amount > 0)) return cb("Not a valid amount.");
		try {
			// get/verify amounts
			let sending_bal = socket.user.staffer == 2 ? Infinity : await new Promise((resolve, reject) => {
				connection.query("SELECT balance FROM spark_user WHERE camper_id = ?;", [socket.user.camper_id], (err, result) => {
					if (err || !result) reject("Receiving camper does not exist.");
					if (result[0].balance < amount) reject("Not enough Sparks.");
					resolve(result[0].balance);
				});
			});
			let receiving_bal = await new Promise((resolve, reject) => {
				connection.query("SELECT balance FROM spark_user WHERE camper_id = ?;", [receiving_id], (err, result) => {
					if (err || !result) reject(err);
					resolve(result[0].balance);
				});
			});

			sending_bal -= amount;
			receiving_bal += amount;

			// complete transfer (change balances, log tx)
			await new Promise((resolve, reject) => {
				connection.query("UPDATE spark_user SET balance = ? WHERE camper_id = ?;", [sending_bal == Infinity ? 69 : sending_bal, socket.user.camper_id], (err) => {
					if (err) reject(err);
					connection.query("UPDATE spark_user SET balance = ? WHERE camper_id = ?;", [receiving_bal, receiving_id], (err) => {
						if (err) reject(err);
						connection.query("INSERT INTO tx (receiver_id, sender_id, inventory_item, raffle_item, amount, message, tx_time) VALUES (?, ?, NULL, NULL, ?, ?, ?);",
							[ receiving_id, socket.user.camper_id, amount, message, new Date()], (err) => {
							if (err) reject(err);
							resolve();
						});
					});
				});
			});

			// notify receiving and sending sockets of balance change
			socket.emit('balance', sending_bal == Infinity ? '∞' : sending_bal, -1);
			if (user_sockets[receiving_id]) user_sockets[receiving_id].emit('balance', receiving_bal, 1);
			return cb(null);
		} catch (err) {
			return cb(err);
		}
	});
});

server.listen(9988, () => {
	console.log("server go vroom");
});