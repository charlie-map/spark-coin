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
	checkPeriod: 86400000 / 2
});
let sess_secret = uuidv4()
let sess = session({
	cookie: {
		maxAge: 86400000 / 2,
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
let settings = {};

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
			next(new LoginError("You aren't allowed to do that!"));
		else {
			req.user = req.session.user;
			next();
		}
	};
}

function updateLogin(camper_id) {
	return new Promise((resolve, reject) => {
		connection.query("UPDATE spark_user SET last_login = ? WHERE camper_id = ?;", [new Date(), camper_id], (err) => {
			if (err) reject(err);
			resolve();
		});
	});
}

/* SYSTEM ENDPOINTS */

app.get("/", isLoggedIn(), (req, res, next) => {
	if (req.user.staffer == 2) {
		// render admin page
		return res.render("admin_home", {
			BALANCE: '∞'
		});
	}
	connection.query("SELECT balance FROM spark_user WHERE camper_id = ?;", [req.user.camper_id], (err, result) => {
		if (err || !result) return next(new Error('Database error.'));
		req.user.balance = result[0].balance;
		res.render("home", {
			BALANCE: req.user.balance
		});
	});
});

app.get("/raffle", isLoggedIn(), (req, res) => {
	res.end(""+settings.raffle);
});

/* STAFFER ENDPOINTS */

app.get("/inventory", isLoggedIn(1), (req, res) => {
	connection.query("SELECT * FROM inventory LEFT JOIN tx ON inventory.id = tx.inventory_item WHERE camper_id = ?;", [req.user.id], (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.put("/inventory", isLoggedIn(1), (req, res) => {
	if (!req.body.item_name || !req.body.description || !req.body.image_url || !req.body.price || !req.body.quantity) return next(new Error('Required field missing.'));
	connection.query("INSERT INTO inventory (camper_id, item_name, description, image_url, price, quantity, active) VALUES (?, ?, ?, ?, ?, ?, 1);", [req.user.id, req.body.item_name, req.body.description, req.body.image_url, req.body.price, req.body.quantity], (err) => {
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

app.get("/admin/setting", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM settings;", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
})

app.post("/admin/setting", isLoggedIn(2), (req, res, next) => {
	if (!req.body.name || !req.body.value) return next(new Error('Required field missing.'));
	connection.query("UPDATE settings SET value = ? WHERE name = ?;", [req.body.value, req.body.name], (err) => {
		if (err) return next(err);
		settings[req.body.name] = parseInt(req.body.value);
		res.end();
	});
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
	if (!req.body.item_name || !req.body.description || !req.body.image_url || !req.body.price || !req.body.quantity) return next(new Error('Required field missing.'));
	connection.query("INSERT INTO inventory (camper_id, item_name, description, image_url, price, quantity, active) VALUES (NULL, ?, ?, ?, ?, ?, 1);", [req.body.item_name, req.body.description, req.body.image_url, req.body.price, req.body.quantity], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.delete("/admin/inventory", isLoggedIn(2), (req, res, next) => {
	if (!req.body.id) return next(new Error('Required field missing.'));
	connection.query("UPDATE inventory SET active = 0 WHERE id = ?;", [req.body.id], (err) => {
		if (err) return next(err);
		res.end(req.body.id);
	});
});

app.get("/admin/inventory/raffle", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM raffle_item WHERE active = 1;", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.put("/admin/inventory/raffle", isLoggedIn(2), (req, res, next) => {
	if (!req.body.item_name || !req.body.description) return next(new Error('Required field missing.'));
	connection.query("INSERT INTO raffle_item (item_name, description, image_url, active) VALUES (?, ?, ?, 1);", [req.body.item_name, req.body.description, req.body.image_url], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.delete("/admin/inventory/raffle", isLoggedIn(2), (req, res, next) => {
	if (!req.body.id) return next(new Error('Required field missing.'));
	connection.query("UPDATE raffle_item SET active = 0 WHERE id = ?;", [req.body.id], (err) => {
		if (err) return next(err);
		res.end(req.body.id + "||" + req.body.class);
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
					connection.query("INSERT INTO spark_user (camper_id, staffer, pin, balance, last_login, slack_id) VALUES (?, 0, ?, ?, ?, NULL) ON DUPLICATE KEY UPDATE balance = balance + ?;", [camper.camper_id, new_pin, settings.starter_coins, date, settings.starter_coins], (err) => {
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
		res.end(""+new_pin);
	});
});

app.get("/admin/campers", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT spark_user.*, CONCAT(registration.camper.first_name, ' ', registration.camper.last_name) AS name FROM spark_user LEFT JOIN registration.camper ON spark_user.camper_id = registration.camper.id;", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.post("/admin/campers/upgrade", isLoggedIn(2), (req, res, next) => {
	if (!req.body.camper_id || !req.body.role || !(req.body.role > -1 && req.body.role < 3)) return next(new Error('Required field missing.'));
	connection.query("UDPATE spark_user SET staffer = ? WHERE camper_id = ?;", [req.body.role, req.body.camper_id], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.post("/admin/campers/upgrade/pump", isLoggedIn(2), (req, res, next) => {
	if (!req.body.camper_id || !req.body.role || !(req.body.role == 1 || req.body.role == -1)) return next(new Error('Required field missing.'));
	// check valid
	req.body.camper_id = parseInt(req.body.camper_id, 10);
	connection.query("SELECT staffer FROM spark_user WHERE camper_id = ?;", [req.body.camper_id], (err, result) => {
		if (err || !result) return next(err);
		let new_role = result[0].staffer + parseInt(req.body.role, 10);
		if (new_role < 0 || new_role > 2) return next(new Error('Cannot pump camper that way.'));
		connection.query("UPDATE spark_user SET staffer = ? WHERE camper_id = ?;", [new_role, req.body.camper_id], (err) => {
			if (err) return next(err);
			res.end();
		});
	});
});

app.post("/admin/campers/campname", isLoggedIn(2), (req, res, next) => {
	if (!req.body.camper_id || !req.body.camp_name) return next(new Error('Required field missing.'));
	connection.query("UPDATE spark_user SET camp_name = ? WHERE camper_id = ?;", [req.body.camp_name, req.body.camper_id], (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.get("admin/campers/campname", isLoggedIn(2), (req, res, next) => {
	if (!req.body.camper_id) return next(new Error('Required field missing.'));
	connection.query("SELECT camp_name FROM spark_user WHERE camper_id = ?;", [req.body.camper_id], (err, result) => {
		if (err || !result) return next(err);
		res.end(result[0].camp_name);
	});
})

app.get("/admin/raffle/value", isLoggedIn(2), (req, res, next) => {
	res.end("" + settings.raffle);
});

app.post("/admin/raffle", isLoggedIn(2), (req, res, next) => {
	settings.raffle = !settings.raffle;
	connection.query('UPDATE settings SET value = ? WHERE name = \'raffle\';', [settings.raffle], (err) => {
		if (err) return next(err);
		res.end("" + settings.raffle);
	});
});

app.delete("/admin/raffle", isLoggedIn(2), (req, res, next) => {
	connection.query('UPDATE raffle_item SET active = 0;', (err) => {
		if (err) return next(err);
		res.end();
	});
});

app.get("/admin/raffle", isLoggedIn(2), async (req, res, next) => {
	try {
		// get all raffle items
		let raffle_items = await new Promise((resolve, reject) => {
			connection.query("SELECT * FROM raffle_item WHERE active = 1;", (err, result) => {
				if (err) reject(err);
				resolve(result);
			});
		});

		// select raffle winner (-1 if nobody bought tickets)
		let winners = raffle_items.map((item) => {
			return new Promise((resolve, reject) => {
				connection.query("SELECT sender_id FROM tx WHERE raffle_item = ?;", [item.id], (err, result) => {
					if (err) reject(err);
					if (!result || !result.length) {
						item.winner = -1;
						return resolve(item);
					}
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

app.get("/admin/log/all", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM tx ORDER BY tx_time DESC;", (err, result) => {
		if (err) return next(err);
		res.json(result);
	});
});

app.get("/admin/log/purchase", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT * FROM tx INNER JOIN inventory ON tx.inventory_item = inventory.id WHERE inventory.active = 1 ORDER BY tx_time DESC;", (err, result) => {
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

app.get("/txTest", isLoggedIn(2), (req, res, next) => {
	connection.query("SELECT tx_time, raffle_item, COALESCE(inventory.item_name, raffle_item.item_name) AS item_name, COALESCE(inventory.description, raffle_item.description) AS description, COALESCE(inventory.image_url, raffle_item.image_url) AS image_url, inventory.camper_id AS owner_id, COALESCE(OWN_S.camp_name, CONCAT(OWN.first_name, ' ', OWN.last_name)) AS owner, price, COALESCE(inventory.active, raffle_item.active) AS active, receiver_id, sender_id, COALESCE(REC_S.camp_name, CONCAT(REC.first_name, ' ', REC.last_name)) AS receiver_name, COALESCE(SEN_S.camp_name, CONCAT(SEN.first_name, ' ', SEN.last_name)) AS sender_name, amount, message FROM tx LEFT JOIN inventory ON tx.inventory_item = inventory.id LEFT JOIN raffle_item ON tx.raffle_item = raffle_item.id LEFT JOIN registration.camper REC ON tx.receiver_id = REC.id LEFT JOIN registration.camper SEN ON tx.sender_id = SEN.id LEFT JOIN registration.camper OWN ON inventory.camper_id = OWN.id LEFT JOIN spark_user REC_S ON receiver_id = REC_S.camper_id LEFT JOIN spark_user SEN_S ON sender_id = SEN_S.camper_id LEFT JOIN spark_user OWN_S ON inventory.camper_id = OWN_S.camper_id" + (req.user.staffer != 2 ? " WHERE tx.sender_id = ? OR tx.receiver_id = ? OR inventory.camper_id = ?" : "") + " ORDER BY tx_time DESC;", [req.user.camper_id, req.user.camper_id, req.user.camper_id], (err, result) => {
		if (err || !result) next(err);
		// create filtered return object:
		// transaction: { purchase: 0/1, tx_time
		// <if purchase=0> received: 0/1, receiver_id, sender_id, receiver_name, sender_name, amount, message }
		// <if purchase=1> raffle: 0/1, item_name, description, image_url, price, active, purchaser_id, purchaser_name, owner_id, owner_name }
		// 		(if they're a staffer, show the purchaser name; if they're a camper, show the owner name)
		result = result.map((tx) => {
			let new_tx = {};
			new_tx.tx_time = tx.tx_time;
			if (!tx.receiver_id) {	// purchase/raffle
				new_tx.purchase = 1;
				new_tx.raffle = tx.raffle_item ? 1 : 0;
				new_tx.item_name = tx.item_name;
				new_tx.description = tx.description;
				new_tx.image_url = tx.image_url;
				new_tx.price = tx.raffle_item ? 1 : tx.price;
				new_tx.active = tx.active;
				new_tx.purchaser_id = tx.sender_id;
				new_tx.purchaser_name = tx.sender_name;
				new_tx.owner_id = tx.owner_id;
				new_tx.owner_name = tx.owner;
			} else {	// xfer
				new_tx.purchase = 0;
				new_tx.received = tx.receiver_id == req.user.camper_id;
				new_tx.receiver_id = tx.receiver_id;
				new_tx.sender_id = tx.sender_id;
				new_tx.receiver_name = tx.receiver_name;
				new_tx.sender_name = tx.sender_name;
				new_tx.amount = tx.amount;
				new_tx.message = tx.message;
			}
			return new_tx;	
		});
		res.json(result);
	});
});

app.use(function(err, req, res, next) { // handle all other thrown errors
	if (err.login) // handle login errors
		res.render("initial", err.message ? {
			MESSAGE: err.message
		} : {});
	else { // handle all other errors
		console.error(err);
		res.setHeader("Content-Type", "text/plain");
		res.status(500).end(" Error: " + err.message);
	}
});

/* LISTENERS */

function sendTxUpdates(camper_id, role) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT last_login FROM spark_user WHERE camper_id = ?;", [camper_id], (err, result) => {
			if (err) reject(err);
			// determine last login time affecting these alerts
			let last_login;
			if (!result || !result[0].last_login) last_login = new Date(0);
			else last_login = result[0].last_login;
			// determine transactions to report based on role
			let query_string;
			let query_params = [ last_login, camper_id, camper_id ];
			if (role > 0) { // if they are a staffer / admin it's all tx's that are for their INVENTORY ITEMS as well as direct transfers (sender or receiver)
				query_string = "SELECT * FROM tx LEFT JOIN inventory ON tx.inventory_item = inventory.id WHERE tx_time > ? AND ( sender_id = ? OR receiver_id = ? OR inventory.camper_id " + (role == 2 ? " IS NULL);" : " = ?);");
				if (role != 2) query_params.push(camper_id);
			} else // campers are just direct transfers (sender or receiver)
				query_string = "SELECT * FROM tx WHERE tx_time > ? AND ( sender_id = ? OR receiver_id = ? ) ORDER BY tx_time DESC;"
			connection.query(query_string, query_params, (err, result) => {
				if (err) reject(err);
				resolve(result);
			});
		});
	});
}

io.on('connection', (socket) => {
	// parse cookie to associate user with this session
	if (!socket.client.conn.request.headers.cookie || !socket.client.conn.request.headers.cookie.split('; ').find(row => row.startsWith('sparks.sid=')))
		socket.disconnect();
	let sid = decodeURIComponent(socket.client.conn.request.headers.cookie.split('; ').find(row => row.startsWith('sparks.sid=')).split('=')[1]);
	sid = signature.unsign(sid.substring(2), sess_secret);
	if (!sid)
		socket.disconnect();
	else
		sess_store.get(sid, (err, data) => {
			socket.user = data.user;
			user_sockets[data.user.camper_id] = socket;
			// upon initial socket connection, deliver tx updates from before last socket pulse
			sendTxUpdates(socket.user.camper_id, socket.user.staffer).then((result) => {
				socket.emit('tx_update', result);
				updateLogin(socket.user.camper_id).catch((err) => { console.error(err); return; });
			}).catch((err) => { console.error(err); return; });
		});

	socket.on('disconnect', () => {
		if (socket.user) delete user_sockets[socket.user.camper_id];
	});

	// tx_get returns array of transaction objects according to "filtered return object" spec within
	// if camper, this is all purchases and transfers involving the camper
	// if staffer, this is all purchases and transfers involving the staffer PLUS purchases from THEIR inventory
	// if admin, this is all transactions fully decorated with names as spec'd
	socket.on('tx_get', (cb) => {
		if (!socket.user) return cb("Not logged in.");
		updateLogin(socket.user.camper_id).catch(() => {return;});
		connection.query("SELECT tx_time, raffle_item, COALESCE(inventory.item_name, raffle_item.item_name) AS item_name, COALESCE(inventory.description, raffle_item.description) AS description, COALESCE(inventory.image_url, raffle_item.image_url) AS image_url, inventory.camper_id AS owner_id, COALESCE(OWN_S.camp_name, CONCAT(OWN.first_name, ' ', OWN.last_name)) AS owner, price, COALESCE(inventory.active, raffle_item.active) AS active, receiver_id, sender_id, COALESCE(REC_S.camp_name, CONCAT(REC.first_name, ' ', REC.last_name)) AS receiver_name, COALESCE(SEN_S.camp_name, CONCAT(SEN.first_name, ' ', SEN.last_name)) AS sender_name, amount, message FROM tx LEFT JOIN inventory ON tx.inventory_item = inventory.id LEFT JOIN raffle_item ON tx.raffle_item = raffle_item.id LEFT JOIN registration.camper REC ON tx.receiver_id = REC.id LEFT JOIN registration.camper SEN ON tx.sender_id = SEN.id LEFT JOIN registration.camper OWN ON inventory.camper_id = OWN.id LEFT JOIN spark_user REC_S ON receiver_id = REC_S.camper_id LEFT JOIN spark_user SEN_S ON sender_id = SEN_S.camper_id LEFT JOIN spark_user OWN_S ON inventory.camper_id = OWN_S.camper_id" + (socket.user.staffer != 2 ? " WHERE tx.sender_id = ? OR tx.receiver_id = ? OR inventory.camper_id = ?" : "") + " ORDER BY tx_time DESC;", [socket.user.camper_id, socket.user.camper_id, socket.user.camper_id], (err, result) => {
			if (err || !result) cb([]);
			// create filtered return object:
			// transaction: { purchase: 0/1, tx_time
			// <if purchase=0> received: 0/1, receiver_id, sender_id, receiver_name, sender_name, amount, message }
			// <if purchase=1> raffle: 0/1, item_name, description, image_url, price, active, purchaser_id, purchaser_name, owner_id, owner_name }
			// 		(if they're a staffer, show the purchaser name; if they're a camper, show the owner name)
			result = result.map((tx) => {
				let new_tx = {};
				new_tx.tx_time = tx.tx_time;
				if (!tx.receiver_id) {	// purchase/raffle
					new_tx.purchase = 1;
					new_tx.raffle = tx.raffle_item ? 1 : 0;
					new_tx.item_name = tx.item_name;
					new_tx.description = tx.description;
					new_tx.image_url = tx.image_url;
					new_tx.price = tx.raffle_item ? 1 : tx.price;
					new_tx.active = tx.active;
					new_tx.purchaser_id = tx.sender_id;
					new_tx.purchaser_name = tx.sender_name;
					new_tx.owner_id = tx.owner_id;
					new_tx.owner_name = tx.owner;
				} else {	// xfer
					new_tx.purchase = 0;
					new_tx.received = tx.receiver_id == socket.user.camper_id;
					new_tx.receiver_id = tx.receiver_id;
					new_tx.sender_id = tx.sender_id;
					new_tx.receiver_name = tx.receiver_name;
					new_tx.sender_name = tx.sender_name;
					new_tx.amount = tx.amount;
					new_tx.message = tx.message;
				}
				return new_tx;	
			});
			cb(result);
		});
	});

	socket.on('inventory_get', async (cb) => {
		if (!socket.user) return cb("Not logged in.");
		updateLogin(socket.user.camper_id).catch(() => {return;});
		// if raffle, send raffle items instead
		let query_string;
		if (settings.raffle)
			query_string = "SELECT id, item_name, description, image_url, 'RAFFLE' AS owner, 1 as price FROM raffle_item WHERE active = 1;";
		else
			query_string = "SELECT inventory.id, item_name, description, image_url, COALESCE(camp_name, CONCAT(registration.camper.first_name, ' ', registration.camper.last_name)) AS owner, price FROM inventory LEFT JOIN spark_user ON inventory.camper_id = spark_user.camper_id LEFT JOIN registration.camper ON inventory.camper_id = registration.camper.id WHERE active = 1 AND quantity > 0;"
		// filter out no quantity items & only active items
		connection.query(query_string, (err, result) => {
			if (err || !result) cb([]);
			cb(result);
		});
	});

	socket.on('purchase', async (item_id, cb) => {
		if (!socket.user || socket.user.staffer != 0) return cb("Not logged in / not correct role.");
		updateLogin(socket.user.camper_id).catch(() => {return;});
		try {
			// get data about inventory item & verify quantity / active
			let item = await new Promise((resolve, reject) => {
				if (settings.raffle) {
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

			if (settings.raffle) {
				await new Promise((resolve, reject) => {
					connection.query("UPDATE spark_user SET balance = ? WHERE camper_id = ?;", [bal, socket.user.camper_id], (err) => {
						if (err) reject(err);
						connection.query("INSERT INTO tx (receiver_id, sender_id, inventory_item, raffle_item, amount, message, tx_time) VALUES (NULL, ?, NULL, ?, 1, NULL, ?);", [socket.user.camper_id, item.id, new Date()], (err) => {
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
				connection.query("UPDATE inventory SET quantity = ? WHERE id = ?;", [item.quantity - 1, item.id], (err) => {
					if (err) reject(err);
					connection.query("UPDATE spark_user SET balance = ? WHERE camper_id = ?;", [bal, socket.user.camper_id], (err) => {
						if (err) reject(err);
						connection.query("INSERT INTO tx (receiver_id, sender_id, inventory_item, raffle_item, amount, message, tx_time) VALUES (NULL, ?, ?, NULL, ?, NULL, ?);", [socket.user.camper_id, item.id, item.price, new Date()], (err) => {
							if (err) reject(err);
							resolve();
						});
					});
				});
			});

			// notify all parties
			socket.emit('balance', bal, -1);
			let message = 'Item ' + item.item_name + ' was purchased by ' + socket.user.first_name + ' ' + socket.user.last_name + ' (#' + socket.user.camper_id + ')!' + ' There are ' + (item.quantity - 1) + ' of these left.';
			if (!item.camper_id) { // camp-wide alert for camp-wide item
				// loop through users and find all admins
				let admin_slack_ids = await new Promise((resolve, reject) => {
					connection.query("SELECT camper_id, slack_id FROM spark_user WHERE staffer > 1;", (err, result) => {
						if (err || !result)
							resolve(null)
						resolve(result);
					});
				});
				admin_slack_ids.forEach((admin) => {
					if (user_sockets[admin.camper_id]) {
						user_sockets[admin.camper_id].emit('alert', message);
						updateLogin(admin.camper_id).catch(() => {return;});
					}
				});
				await Promise.all(admin_slack_ids.map((slack_id) => {
					axios.post('https://slack.com/api/chat.postMessage', {
						token: process.env.SLACK_TOKEN,
						channel: slack_id.slack_id,
						text: message
					}, {
						headers: {
							authorization: 'Bearer ' + process.env.SLACK_TOKEN
						}
					});
				}));
				return cb(false);
			} else { // specific alert for staffer
				if (user_sockets[item.camper_id]) {
					user_sockets[item.camper_id].emit('alert', message);
					updateLogin(item.camper_id).catch(() => {return;});
				}
				// look up staffer's slack ID & message them
				let slack_id = await new Promise((resolve, reject) => {
					connection.query("SELECT slack_id FROM spark_user WHERE camper_id = ?;", [item.camper_id], (err, result) => {
						if (err || !result)
							resolve(null);
						resolve(result[0].slack_id);
					});
				});
				if (slack_id) {
					await axios.post('https://slack.com/api/chat.postMessage', {
						token: process.env.SLACK_TOKEN,
						channel: slack_id,
						text: message
					}, {
						headers: {
							authorization: 'Bearer ' + process.env.SLACK_TOKEN
						}
					});
				}
				return cb(false);
			}
		} catch (err) {
			return cb(err);
		}
	});

	socket.on('transfer', async (receiving_id, amount, message, cb) => {
		if (!socket.user) return cb("Not logged in.");
		updateLogin(socket.user.camper_id).catch(() => {return;});
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
						connection.query("INSERT INTO tx (receiver_id, sender_id, inventory_item, raffle_item, amount, message, tx_time) VALUES (?, ?, NULL, NULL, ?, ?, ?);", [receiving_id, socket.user.camper_id, amount, message, new Date()], (err) => {
							if (err) reject(err);
							resolve();
						});
					});
				});
			});

			// notify receiving and sending sockets of balance change
			socket.emit('balance', sending_bal == Infinity ? '∞' : sending_bal, -1);
			if (user_sockets[receiving_id]) {
				user_sockets[receiving_id].emit('balance', receiving_bal, 1);
				updateLogin(receiving_id).catch((err) => { return; });	// if they received it then they don't get a notif later
			}
			return cb(null);
		} catch (err) {
			return cb(err);
		}
	});
});

server.listen(9988, () => {
	connection.query("SELECT * FROM settings;", (err, result) => {
		if (err) console.error("ERROR RESTORING SYSTEM SETTINGS");
		result.forEach((setting) => {
			settings[setting.name] = setting.value;
		});
		console.log("server go vroom");
	});
});