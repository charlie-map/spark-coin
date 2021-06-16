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

app.get("/camper/:camper_id", isLoggedIn(0), (req, res) => {
	connection.query("SELECT * FROM spark_user WHERE camper_id=?", req.params.camper_id, (err, camper_info) => {
		if (err) throw new Error("No camper under this information");

		res.render("home", {
			BALANCE: camper_info[0].balance
		});
	});
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
	// remove anything besides numbers?? -- frontend validation as well
	if (!req.body.camper_id || !req.body.pin) {
		res.end("no fields"); // TODO: error handling
		return;
	}
	// check PIN against MySQL
	connection.query('SELECT * FROM spark_user JOIN registration.camper ON spark_user.camper_id = registration.camper.id WHERE camper_id = ? AND pin = ?;', [req.body.camper_id, req.body.pin], (err, camper) => {
		console.error(err);
		if (err || !camper || !camper[0]) {
			res.end("no db"); // TODO: error handling
			return;
		}
		req.session.user = camper[0];
		if (camper[0].staffer == 0) res.redirect("/camper/" + camper[0].camper_id);
	});
});

app.get("/logout", (req, res) => {
	req.session = null; // unset: destroy takes care of it
	res.redirect("/");
});

/* LISTENERS */

app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.render("error", {
		ERROR_MESSAGE: err.message
	});
});

io.on('connection', socket => {
	console.log("connected");
});

server.listen(9988, () => {
	console.log("server go vroom");
});