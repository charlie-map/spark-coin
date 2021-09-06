DROP DATABASE IF EXISTS sparkcoin;
CREATE DATABASE sparkcoin;

USE sparkcoin;

CREATE TABLE settings (
	name VARCHAR(255) NOT NULL,
	value INT NOT NULL,
	PRIMARY KEY (name)	
);

CREATE TABLE city (
	id INT NOT NULL,
	name VARCHAR(255) NOT NULL,
	raffle_active TINYINT DEFAULT 0,
	PRIMARY KEY (id)
);

CREATE TABLE market (
	id INT NOT NULL,
	city_id INT NOT NULL,
	name VARCHAR(255) NOT NULL,
	icon TEXT,
	starter_coins INT NOT NULL,
	staff_coins INT NOT NULL,
	disabled TINYINT DEFAULT 0,
	tx_blocked TINYINT DEFAULT 0,
	raffle_active TINYINT DEFAULT 0,
	PRIMARY KEY (id),
	FOREIGN KEY (`city_id`) REFERENCES city (`id`) ON DELETE CASCADE
);

CREATE TABLE market_membership (
	camper_id INT NOT NULL,
	market_id INT NOT NULL,
	staffer TINYINT NOT NULL,
	camp_name VARCHAR(255),
	FOREIGN KEY (`camper_id`) REFERENCES spark_user (`camper_id`) ON DELETE CASCADE,
	FOREIGN KEY (`marker_id`) REFERENCES market (`id`) ON DELETE CASCADE
);

CREATE TABLE system (
	id INT NOT NULL,
	db_name VARCHAR(255),
	name VARCHAR(255) NOT NULL,
	system_type INT NOT NULL,
	authable TINYINT DEFAULT 0,
	market_id INT,
	PRIMARY KEY (id),
	FOREIGN KEY (`market_id`) REFERENCES market (`id`) ON DELETE CASCADE
);

CREATE TABLE spark_user (
	camper_id INT NOT NULL UNIQUE,
	email VARCHAR(255) NOT NULL UNIQUE,
	first_name VARCHAR(255) NOT NULL,
	last_name VARCHAR(255) NOT NULL,
	pin INT NOT NULL,
	balance DOUBLE NOT NULL,
	last_login DATETIME,
	slack_id VARCHAR(255),
	PRIMARY KEY (camper_id)
);

CREATE TABLE inventory (
	id INT AUTO_INCREMENT NOT NULL,
	market_id INT,
	city_id INT,
	camper_id INT,
	item_name VARCHAR(255) NOT NULL,
	description TEXT,
	image_url TEXT,
	price DOUBLE NOT NULL,
	quantity INT,
	active TINYINT,
	PRIMARY KEY (id),
	FOREIGN KEY (`market_id`) REFERENCES market (`id`),
	FOREIGN KEY (`city_id`) REFERENCES city (`id`),
	FOREIGN KEY (`camper_id`) REFERENCES spark_user (`camper_id`)
);

CREATE TABLE raffle_item (
	id INT AUTO_INCREMENT NOT NULL,
	market_id INT,
	city_id INT,
	item_name VARCHAR(255) NOT NULL,
	description TEXT,
	image_url TEXT,
	active TINYINT,
	PRIMARY KEY (id),
	FOREIGN KEY (`market_id`) REFERENCES market (`id`),
	FOREIGN KEY (`city_id`) REFERENCES city (`id`)
);

CREATE TABLE tx (
	receiver_id INT,
	sender_id INT,
	inventory_item INT,
	raffle_item INT,
	amount DOUBLE,
	message TEXT,
	tx_time DATETIME,
	staffer_completion TINYINT,
	FOREIGN KEY (`receiver_id`) REFERENCES spark_user (`camper_id`),
	FOREIGN KEY (`sender_id`) REFERENCES spark_user (`camper_id`),
	FOREIGN KEY (`inventory_item`) REFERENCES inventory (`id`),
	FOREIGN KEY (`raffle_item`) REFERENCES raffle_item (`id`)
);