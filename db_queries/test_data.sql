USE sparkcoin;

INSERT INTO city (name) VALUES ('test city 1');
INSERT INTO city (name) VALUES ('test city 2');

INSERT INTO market (city_id, name, icon, starter_coins, staff_coins) VALUES (1, 'market 1 city 1', 'https://9tailedkitsune.com/wp-content/uploads/2020/07/Dbxp-HgX0AAioHQ-1.jpg', 100, 100);
INSERT INTO market (city_id, name, icon, starter_coins, staff_coins) VALUES (1, 'market 2 city 2', 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/96e38930-2029-4bca-a59a-c92b70e3719d/dc9swbu-b40f2b02-62c5-4b72-848d-21bfcc564525.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzk2ZTM4OTMwLTIwMjktNGJjYS1hNTlhLWM5MmI3MGUzNzE5ZFwvZGM5c3didS1iNDBmMmIwMi02MmM1LTRiNzItODQ4ZC0yMWJmY2M1NjQ1MjUuanBnIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.KikLyYFQMfrSNOYZoKph7UNGvr942dS0D2Iw38YWjpY', 100, 100);

INSERT INTO spark_user (email, first_name, last_name, pin, balance) VALUES ('email1@example.com', 'test1', 'test1', 5555, 500);
INSERT INTO spark_user (email, first_name, last_name, pin, balance) VALUES ('email2@example.com', 'test2', 'test2', 5555, 500);
INSERT INTO spark_user (email, first_name, last_name, pin, balance) VALUES ('email3@example.com', 'test3', 'test3', 5555, 500);
INSERT INTO spark_user (email, first_name, last_name, pin, balance) VALUES ('email4@example.com', 'test4', 'test4', 5555, 500);

INSERT INTO market_membership(camper_id, market_id, staffer) VALUES (1, 1, 1);
INSERT INTO market_membership(camper_id, market_id, staffer) VALUES (1, 2, 0);

INSERT INTO market_membership(camper_id, market_id, staffer, camp_name) VALUES (2, 1, 0, "Child1");
INSERT INTO market_membership(camper_id, market_id, staffer, camp_name) VALUES (2, 2, 0, "Child2");

INSERT INTO market_membership(camper_id, market_id, staffer, camp_name) VALUES (3, 1, 2, "Head1");
INSERT INTO market_membership(camper_id, market_id, staffer, camp_name) VALUES (3, 2, 2, "Head2");

INSERT INTO market_membership(camper_id, market_id, staffer, camp_name) VALUES (4, 1, 1, "Boy");
INSERT INTO market_membership(camper_id, market_id, staffer) VALUES (4, 2, 1);
