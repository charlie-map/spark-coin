require('dotenv').config({
	path: __dirname + "/.env"
});
const express = require('express');
const mustache = require('mustache-express');
const bodyParser = require('body-parser');
const {
	v4: uuidv4
} = require('uuid');
const morgan = require('morgan');

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

const app = express();

app.use(bodyParser.urlencoded({
	extended: false
}));

app.set('views', __dirname + "/views");
app.set('view engine', 'mustache');
app.engine('mustache', mustache());

