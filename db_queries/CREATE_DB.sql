DROP DATABASE IF EXISTS sparkcoin;
CREATE DATABASE sparkcoin;

USE sparkcoin;

CREATE TABLE settings (
	name VARCHAR(255) NOT NULL,
	value INT NOT NULL,
	PRIMARY KEY (name)	
);

INSERT INTO settings (name, value) VALUES ('raffle', 0);
INSERT INTO settings (name, value) VALUES ('starter_coins', 10);
INSERT INTO settings (name, value) VALUES ('staff_coins', 250);
INSERT INTO settings (name, value) VALUES ('block_camper', 1);

CREATE TABLE spark_user (
	camper_id INT NOT NULL,
	staffer TINYINT,
	pin INT NOT NULL,
	balance DOUBLE NOT NULL,
	last_login DATETIME,
	slack_id VARCHAR(255),
	camp_name VARCHAR(255),
	PRIMARY KEY (camper_id),
	FOREIGN KEY (`camper_id`) REFERENCES registration.camper (`id`) ON DELETE CASCADE
);

CREATE TABLE inventory (
	id INT AUTO_INCREMENT NOT NULL,
	camper_id INT,
	item_name VARCHAR(255) NOT NULL,
	description TEXT,
	image_url TEXT,
	price DOUBLE NOT NULL,
	quantity INT,
	active TINYINT,
	PRIMARY KEY (id),
	FOREIGN KEY (`camper_id`) REFERENCES registration.camper(`id`)
);

CREATE TABLE raffle_item (
	id INT AUTO_INCREMENT NOT NULL,
	item_name VARCHAR(255) NOT NULL,
	description TEXT,
	image_url TEXT,
	active TINYINT,
	PRIMARY KEY (id)
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