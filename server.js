require('dotenv').config({
	path: __dirname + "/.env"
});
const {
	v4: uuidv4
} = require('uuid');

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

app.set('view', __dirname + "/views");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(session({
	cookie: { maxAge: 86400000 },
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

// role levels: 0 = camper; 1 = staffer; 2 = admin
function isLoggedIn(role) {
	return (req, res, next) => {
		try {
			if (!req.session || !req.session.user)
				throw new Error("Not logged in.");
			else if (role && req.session.user.staffer < role)
				throw new Error("Insufficient permissions.");
			else {
				req.user = req.session.user;
				next();
			}
		} catch (err) {
			next(new Error(err));
		}
	};
}

/* TEST AUTHENTICATED ENDPOINTS */

app.get("/camper", isLoggedIn(0), (req, res) => {
	res.end("Camper level access!");
});

app.get("/staffer", isLoggedIn(1), (req, res) => {
	res.end("Staffer level access!");
});

app.get("/admin", isLoggedIn(2), (req, res) => {
	res.end("Admin level access!");
});

/* AUTHENTICATION ENDPOINTS */

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/initial.html");
});

app.post("/login", (req, res) => {
	// validate required info (TODO: validate formatting)
	if (!req.body.camper_id || !req.body.pin) {
		res.end("no fields");	// TODO: error handling
		return;
	}
	// check PIN against MySQL
	connection.query('SELECT * FROM spark_user JOIN registration.camper ON spark_user.camper_id = registration.camper.id WHERE camper_id = ? AND pin = ?;', [req.body.camper_id, req.body.pin], (err, camper) => {
		console.error(err);
		if (err || !camper || !camper[0]) {
			res.end("no db");	// TODO: error handling
			return;
		}
		req.session.user = camper[0];
		res.sendFile(__dirname + "/views/home.html");
	});
});

app.get("/logout", (req, res) => {
	req.session = null;	// unset: destroy takes care of it
	res.redirect("/");
});

/* LISTENERS */

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

io.on('connection', socket => {
	console.log("connected");
});

server.listen(9988, () => {
	console.log("server go vroom");
});