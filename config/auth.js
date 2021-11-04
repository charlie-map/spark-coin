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
		if (!req.session.camper_id || !req.session.market)
			next(new LoginError());
		else {
			deserializeUser(req.session).then((user) => {
				// after user data is gathered, verify that role is correct in current market
				req.user = user;
				if (role && req.user.staffer != role)
					next(new LoginError("You aren't allowed to do that!"));
				else
					next();
			}).catch((err) => {
				next(new LoginError(err));
			});
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

function deserializeUser(user_obj) {
	return new Promise((resolve, reject) => {
		let deserialized = {};
		connection.query("SELECT * FROM spark_user WHERE camper_id = ?;", [user_obj.camper_id], (err, user) => {
			if (err || !user || !user[0]) return reject("No user found!");
			deserialized = user[0];
			connection.query("SELECT market.id as market_id, market.name, icon, staffer, camp_name, city_id, city.name AS city_name, market.raffle_active as raffle_active_market, city.raffle_active as raffle_active_city FROM market_membership LEFT JOIN market ON market_membership.market_id = market.id LEFT JOIN city ON market.city_id = city.id WHERE camper_id = ? AND market.disabled = 0 ORDER BY staffer ASC;", [user_obj.camper_id], (err, markets) => {
				if (err || !markets) return reject(err ? err : "You are not a participant in any currently active Spark market.");
				deserialized.markets = markets.reduce((result, item) => { result[item.market_id] = item; return result; }, {});
				// if user is admin anywhere, user is admin everywhere:
				deserialized.staffer = markets.reduce((admin, item) => { return admin || item.staffer == 2; }, false) ? 2 : deserialized.markets[user_obj.market].staffer;
				deserialized.market = user_obj.market;
				return resolve(deserialized);
			});
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
			secure: process.env.PRODUCTION,
			unset: 'destroy',
			saveUninitialized: false,
			name: process.env.COOKIE_NAME,
			sameSite: true,
			secret: process.env.SESSION_SECRET
		});
		app.use(sess);

		/* AUTHENTICATION ROUTES */

		app.post("/login/external", (req, res, next) => {
			// TODO
			// -> Specify "System"
			// -> Loop cookies through System specs to find match
			// -> Match found user against known user base
			// -> Potentially trigger automatic registration
		});

		app.post("/login", (req, res, next) => {
			// validate required info present
			if (!req.body.camper_id || !req.body.pin)
				return next(new LoginError("You need to provide both an ID and a PIN to log in."));
			// check PIN against MySQL
			connection.query('SELECT spark_user.camper_id AS camper_id, market_id FROM spark_user LEFT JOIN market_membership ON market_membership.camper_id = spark_user.camper_id WHERE spark_user.camper_id = ? AND pin = ? ORDER BY staffer ASC LIMIT 1;', [req.body.camper_id, req.body.pin], (err, camper) => {
				if (err) return next(err);
				if (!camper || !camper[0]) return next(new LoginError("Incorrect ID or PIN."));
				if (!camper[0].market_id) return next(new LoginError("You are not a participant in any currently active Spark market."));
				req.session.camper_id = camper[0].camper_id;
				req.session.market = camper[0].market_id;
				return res.redirect("/");
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
					deserializeUser(data).then((deserialized) => {
						return resolve(deserialized);
					}).catch((err) => {
						return reject(err);
					});
				});
		});

	},
	LoginError: LoginError,
	isLoggedIn: isLoggedIn,
	updateLogin: updateLogin
}
