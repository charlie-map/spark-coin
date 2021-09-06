const {
	v4: uuidv4
} = require('uuid');
const signature 			= require('cookie-signature');
const session 				= require('express-session');
const mysqlStore			= require('express-mysql-session')(session);
const {connection, options} = require('./db');

// persistent db-backed session store
const sessionStore 			= new mysqlStore({
	...options,
	clearExpired: true,
	checkExpirationInterval: 10800000,
	expiration: 604800000,
	createDatabaseTable: true,
	schema: {
		tableName: 'user_session',
		columnNames: {
			session_id: 'id',
			expires: 'expires',
			data: 'data',
		}
	}});


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

/* EXPOSED FRAMEWORK */

module.exports = {
	initAuth: (app) => {
		/* SESSION CONFIG */
		let sess = session({
			cookie: {
				maxAge: 86400000 / 2,
				httpOnly: false
			},
			store: sessionStore,
			resave: false,
			secure: false,
			unset: 'destroy',
			saveUninitialized: false,
			name: process.env.COOKIE_NAME,
			sameSite: true,
			secret: process.env.SESSION_SECRET
		});
		app.use(sess);

		/* AUTHENTICATION ROUTES */

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
			res.clearCookie(process.env.COOKIE_NAME);
			res.redirect("/");
		});
	},
	authSocket: (socket) => {
		return new Promise((resolve, reject) => {
			// parse cookie to associate user with this session
			if (!(socket.client.conn.request.headers.cookie && socket.client.conn.request.headers.cookie.split('; ').find(row => row.startsWith(process.env.COOKIE_NAME + '='))))
				return reject();
			let sid = decodeURIComponent(socket.client.conn.request.headers.cookie.split('; ').find(row => row.startsWith(process.env.COOKIE_NAME + '=')).split('=')[1]);
			sid = signature.unsign(sid.substring(2), process.env.SESSION_SECRET);
			if (!sid)
				return reject();
			else
				sessionStore.get(sid, (err, data) => {
					return resolve(data);
				});
		});

	},
	LoginError: LoginError,
	isLoggedIn: isLoggedIn,
	updateLogin: updateLogin
}
