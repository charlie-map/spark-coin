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

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/initial.html");
});

io.on('connection', socket => {
	console.log("connected");
});

server.listen(9988, () => {
	console.log("server go vroom");
});