require('dotenv').config({
	path: __dirname + "/.env"
});
const {
	v4: uuidv4
} = require('uuid');

const mustache = require('mustache-express');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);

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
app.use(session({
	cookie: {
		maxAge: 86400000
	},
	store: new memorystore({
		checkPeriod: 86400000
	}),
	resave: false,
	secure: false,
	unset: 'destroy',
	saveUninitialized: false,
	name: 'sparks.sid',
	sameSite: true,
	secret: uuidv4()
}));

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
		else if (role && req.session.user.staffer < role)
			next(new Error("You aren't allowed to do that!"));
		else {
			req.user = req.session.user;
			console.log(req.user);
			next();
		}
	};
}

/* SYSTEM ENDPOINTS */

app.get("/", isLoggedIn(0), (req, res) => {
	res.render("home", {
		BALANCE: req.user.staffer > 1 ? '∞' : req.user.balance
	});
});

app.get("/admin", isLoggedIn(2), (req, res) => {
	// TODO: render admin frontend
	res.end("Admin level access!");
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
	console.error(err);
	if (err.login)	// handle login errors
		res.render("initial", err.message ? { MESSAGE: err.message } : {} );
	else {			// handle all other errors
		res.render("error", { ERROR_MESSAGE: err.message });
	}
});

/* LISTENERS */

io.on('connection', socket => {
	console.log("connected");
});

server.listen(9988, () => {
	console.log("server go vroom");
});