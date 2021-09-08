const socket = io();

$(document).on({
	ajaxStart: function() {
		$(".spin-container").addClass('open');
	},
	ajaxStop: function() {
		$(".spin-container").removeClass('open');
	}
});

$("#shake_balance").hide();
$(".inventory-popup").hide();

let update_balance_shakers = $(".container").find(".shake_balance");

for (let update = 0; update < update_balance_shakers.length; update++) {

	let new_number = (Math.random() * 1300).toString();
	new_number = new_number.substring(0, new_number.length - 10);

	$(update_balance_shakers[update]).text(new_number);
}

function cut_css_number() {
	$("#balance_display").removeClass("animate__shakeY");
	if (num > 0) $("#balance_display").removeClass("changing-up");
	else $("#balance_display").removeClass("changing-down");

	$(".shake_balance").removeClass("animate__shakeY");
	if (num > 0) $(".shake_balance").removeClass("changing-up");
	else $(".shake_balance").removeClass("changing-down");
}

function invis_number() {
	$("#balance_display").addClass("animate__shakeY");
	$(".shake_balance").addClass("animate__shakeY");

	setTimeout(cut_css_number, 250);
}

function show_number() { // and change actual number value
	$("#balance_display").text(balance);
	$("#balance_display").removeClass("animate__shakeY");
	$(".shake_balance").removeClass("animate__shakeY");

	setTimeout(invis_number, 250);
}

function change_number() {

	if (num > 0) $("#balance_display").addClass("changing-up");
	else $("#balance_display").addClass("changing-down");
	$("#balance_display").addClass("animate__shakeY");
	$(".shake_balance").addClass("animate__shakeY");

	if (num > 0) $(".shake_balance").addClass("changing-up");
	else $(".shake_balance").addClass("changing-down");

	setTimeout(show_number, 250);
}

let num;
let balance;

socket.on('balance', (_balance, up_down) => {
	num = up_down;
	balance = _balance;

	change_number()
});

$(window).on('resize', function() {
	$(".shake_balance").css("left", $(".lightning-bolt").offset().left + 70 + "px");
});

function pull_inventory(admin_or_all) {
	if (admin_or_all == "admin")
		$.ajax("/inventory", {

			success: function(all_inventory) {

				$(".inner-inventory.admin").empty();

				all_inventory.forEach(invent => {

					let inventory_item = "<div id='" + invent.id + "item" + (admin_or_all == "raffle" ? "raffle" : "") + "' class='" + (invent.active == 0 ? "non-active" : "") + "'>" +
						"<div class='display-styling-inventory'>" +
						"<div id='" + invent.id + "' style='background-image: " + (invent.image_url ? "url(" + invent.image_url + ");'" : "url(https://overfload.nyc3.cdn.digitaloceanspaces.com/ed485a58-4e11-4940-9b58-9dafd0113a9d);'") +
						"class='spark-logo-inventory remove-hover " + admin_or_all + "'></div>" +
						"<div class='item-info'>" +
						"<div style='display-inline;' class='item-name'>" + invent.item_name + "</div>" +
						"<ion-icon name='chevron-forward-outline'></ion-icon>" +
						"<div style='display: inline;' class='seller'>" + (invent.owner ? invent.owner : "❓❓❓") + "</div>" +
						"</div>" +
						"<button id='" + invent.id + "' class='purchase-item'>" +
						"<span class='lightning-bolt-button'>⚡</span>" +
						"<span class='price'>" + (invent.price == undefined || !invent.price ? 1 : invent.price) + "</span>" +
						"</button>" +
						"</div>" +
						"<div class='inventory-descript'>" + invent.description + "</div>" +
						"</div>";

					$(".inner-inventory.admin").append(inventory_item);
				});
			}
		});
	else
		socket.emit('inventory_get', (all_inventory) => {

			$(".inner-inventory.all").empty();

			all_inventory.forEach(invent => {

				let inventory_item = "<div id='" + invent.id + "item" + (admin_or_all == "raffle" ? "raffle" : "") + "' class='" + (invent.active == 0 ? "non-active" : "") + "'>" +
					"<div class='display-styling-inventory'>" +
					"<div id='" + invent.id + "' style='background-image: " + (invent.image_url ? "url(" + invent.image_url + ");'" : "url(https://overfload.nyc3.cdn.digitaloceanspaces.com/ed485a58-4e11-4940-9b58-9dafd0113a9d);'") +
					"class='spark-logo-inventory " + admin_or_all + "'></div>" +
					"<div class='item-info'>" +
					"<div style='display-inline;' class='item-name'>" + invent.item_name + "</div>" +
					"<ion-icon name='chevron-forward-outline'></ion-icon>" +
					"<div style='display: inline;' class='seller'>" + (invent.owner ? invent.owner : "❓❓❓") + "</div>" +
					"</div>" +
					"<button id='" + invent.id + "' class='purchase-item'>" +
					"<span class='lightning-bolt-button'>⚡</span>" +
					"<span class='price'>" + (invent.price == undefined || !invent.price ? 1 : invent.price) + "</span>" +
					"</button>" +
					"</div>" +
					"<div class='inventory-descript'>" + invent.description + "</div>" +
					"</div>";

				$(".inner-inventory.all").append(inventory_item);
			});
		});
}

$(".admin-inventory-select").click(function() {
	$(".inner-inventory.all").removeClass('selected');
	$(".inner-inventory.admin").addClass('selected');

	$(".all-inventory-select").removeClass('button-selected');
	$(".admin-inventory-select").addClass('button-selected');

	pull_inventory("admin");
});

$(".all-inventory-select").click(function() {
	$(".inner-inventory.admin").removeClass('selected');
	$(".inner-inventory.all").addClass('selected');

	$(".admin-inventory-select").removeClass('button-selected');
	$(".all-inventory-select").addClass('button-selected');

	pull_inventory("all");
});

$("#submit-sparks").click(function(event) {
	event.preventDefault();

	let receiving_id = $("#receiver_id_value").val();
	let amount = $("#number_send_item").val();
	let message = $("#message_send_item").val();
	socket.emit('transfer', receiving_id, amount, message, (err) => {
		if (err)
			popout_alert(JSON.stringify(err));
		else
			popout_alert("Success!");
	});
});

$(".icon-div").click(function() {
	if ($(this).hasClass('open-inventory')) {
		if ($(".inventory-popup").hasClass('open')) {
			$(".inventory-popup").removeClass('open');
			return;
		}

		$(".inventory-popup").show();

		pull_inventory("admin")

		$(".inventory-popup").addClass('open');
	} else if ($(this).hasClass('send-item')) {
		if ($(".send-item-popup").hasClass('open')) {
			$(".send-item-popup").removeClass('open');
			return;
		}
		$(".send-item-popup").addClass('open');

	} else if ($(this).hasClass('needs-slack-id')) {
		if ($(".input-slack-id-popup").hasClass('open')) {
			$(".input-slack-id-popup").removeClass('open');
			return;
		}

		$(".input-slack-id-popup").addClass('open');
	}
});

function popout_alert(message) {
	$(".message-alert").children("h1").text(message);

	$(".message-background").addClass('open');
	$(".message-alert").addClass('open');

	setTimeout(function() {
		$(".message-background").removeClass('open');
		$(".message-alert").removeClass('open');
	}, 3500);
}

$(".close-inventory").click(() => {
	$(".add-item-inventory").children("ion-icon").removeClass('open');
	$(".add-item-inventory-popup").removeClass('open');
	$(".inventory-adding").removeClass('open');
	$(".inventory-popup").removeClass('open');

	setTimeout(function() { // hide object fully
		$(".inventory-popup").hide();
	}, 1000);
});

$(".close-camper-information").click(() => {
	$(".camper-information-popup").removeClass('open');
});

$(".inner-inventory").on("click", ".purchase-item", function() {
	socket.emit('purchase', this.id, function(result) {

		popout_alert(result ? result : "Success!");
	});
});

$(".close-send-item").click(() => {
	$(".send-item-popup").removeClass('open');
});

/* DELETE ITEMS INVENTORY */

function switch_background_image(current_item, old_background) {
	$(current_item).css("background-image", old_background);
}

$(".inner-inventory").on("click", ".spark-logo-inventory.remove-hover", function() {
	if ($(this).css("background-image") == 'url("https://overfload.nyc3.cdn.digitaloceanspaces.com/b084ed39-4422-4d31-a1f6-7bf6a051d992")') {
		// actually delete the item

		$.ajax({
			type: "DELETE",
			url: "/inventory",
			data: {
				id: this.id
			},
			success: function(id) {
				let id_split = id.split("||");
				$("#" + id_split[0] + "item").css("background", "#bd4881");
			}
		});

	} else {
		let current_background = $(this).css("background-image");

		$(this).css("background-image", "url(https://overfload.nyc3.cdn.digitaloceanspaces.com/b084ed39-4422-4d31-a1f6-7bf6a051d992)");

		setTimeout(switch_background_image, 2500, this, current_background);
	}
});

function inventory_change() {
	$(".add-item-raffle-popup").removeClass('open');
	if ($(".add-item-inventory-popup").hasClass('open')) {
		$(".add-item-inventory").children("ion-icon").removeClass('open');
		$(".add-item-inventory-popup").removeClass('open');
		setTimeout(function() {
			$(".inventory-adding").removeClass('open');
		}, 600);
	} else {
		$(".inventory-adding").addClass('open');
		$(".add-item-inventory").children("ion-icon").addClass('open');
		$(".add-item-inventory-popup").addClass('open');
	}
}

$(".add-item-inventory").click(inventory_change);

$("#submit-add-inventory-item").click(function(event) {
	event.preventDefault();

	$.ajax({
		type: "PUT",
		url: "/inventory",
		dataType: "text",
		data: {
			item_name: $("#item_name_value1").val(),
			price: $("#price_value1").val(),
			quantity: $("#quantity_value1").val(),
			description: $("#item_description1").val(),
			image_url: $("#item_image1").val()
		},
		success: function() {
			popout_alert("Added to inventory!");
			if ($(".inner-inventory.selected").hasClass('all'))
				pull_inventory("all");
			else if ($(".inner-inventory.selected").hasClass('admin'))
				pull_inventory("admin");
			else
				pull_inventory("raffle");

			inventory_change();

			$("#item_name_value1").val("");
			$("#price_value1").val("");
			$("#quantity_value1").val("");
			$("#item_description1").val("");
			$("#item_image1").val("");
		},
		error: function(error) {
			popout_alert(error.responseText);
		}
	});
});

// logs

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

$(".watch-logs").click(function() {
	socket.emit('tx_get', (all_logs) => {
		$(".logs-inventory").empty();

		all_logs.forEach(log => { // time for another object :D

			let inventory_item;

			inventory_item = "<div>" +
				"<div style='background-image: url(" + (log.image_url ? log.image_url : "https://overfload.nyc3.cdn.digitaloceanspaces.com/ed485a58-4e11-4940-9b58-9dafd0113a9d") + ")'" + "class='purchase-item-url spark-logo-inventory'></div>" +
				"<div class='purchase-extra-info'>" + (log.purchase ? log.item_name + " - " + log.description : log.message) + "</div>" +
				"<div class='align-extra-log-info'>" +
				"<div class='display-log-time'>" + months[new Date(log.tx_time).getMonth()] + " " + new Date(log.tx_time).getDate() + "-" + new Date(log.tx_time).getHours() + ":" + (new Date(log.tx_time).getMinutes().toString().length <= 1 ? new Date(log.tx_time).getMinutes().toString().length == 1 ? "0" + new Date(log.tx_time).getMinutes() : "00" : new Date(log.tx_time).getMinutes()) + "</div>" +
				"<div class='log-item-owner-info'>" +
				(log.raffle ? "RAFFLE - " + (log.purchase ? log.price : log.amount) :
					"<div class='log-item-owner'>" +
					(log.purchase ? log.owner_name ? log.owner_name : "❓❓❓" : log.sender_name) + " - " + (log.purchase ? log.price : log.amount) + "</div>") +
				"</div>" +
				"</div>" +
				"<div class='purchaser-log-info'>" + (log.purchase ? log.purchaser_name : log.receiver_name) + "</div>" +
				"</div>";

			$(".logs-inventory").append(inventory_item);
		});
	});

	$(".log-popup").addClass("open");
});

$(".logs-inventory").scroll(function() {
	$(".purchase-extra-info").removeClass('open');
});

$(".logs-inventory").on("click", ".purchase-item-url", function() {

	if ($(this).siblings(".purchase-extra-info").hasClass('open')) {
		$(this).siblings(".purchase-extra-info").removeClass('open');
	} else {
		$(this).siblings(".purchase-extra-info").css("top", $(this).offset().top);
		$(this).siblings(".purchase-extra-info").addClass('open');
	}
});

$(".close-logs").click(function() {
	$(".log-popup").removeClass("open");
});

// slack id

$(".slack-closer").click(function() {
	$(".input-slack-id-popup").removeClass("open");
});

$("#submit-new-slack-id").click(function(event) {
	event.preventDefault();

	$.ajax({
		method: "POST",
		url: "/slack",
		data: {
			slack_id: $("#new-slack-id").val()
		},
		success: function() {
			popout_alert("Success!");

			$(".input-slack-id-popup").removeClass("open");
			$(".needs-slack-id").removeClass("open");
		}
	});
});

/*
                      _        _                        _    
 _ __ ___   __ _ _ __| | _____| |_  __      _____  _ __| | __
| '_ ` _ \ / _` | '__| |/ / _ \ __| \ \ /\ / / _ \| '__| |/ /
| | | | | | (_| | |  |   <  __/ |_   \ V  V / (_) | |  |   < 
|_| |_| |_|\__,_|_|  |_|\_\___|\__|   \_/\_/ \___/|_|  |_|\_\
*/

$(".market_select.active").click(function() {
	if ($(".market-option-select").hasClass('open')) {
		$(".market-option-select").removeClass('open');
		return;
	}

	$(".market-option-select").children("ol").empty();

	// grab any available markets to display:
	let available_markets = $(this).siblings("div");

	//animate__backInLeft
	// add each of them (including itself into a sub div display)
	let market_text = `
		<li id=${$(this).attr('attr-valueMarketID')}>
			<div class="market-option drop-down">
				<img src="${$(this).children("img").attr("src")}">
				<div class="fact-data">
					<p>${$(this).attr('attr-valueMarketName')}</p>
					<p>Role -- ${$(this).attr('attr-valueRole') == "2" ?
						"merchant" : $(this).attr('attr-valueRole') == "1" ?
						"trader" : "buyer"}</p>
				</div>
			</div>
		</li>`;

	$(".market-option-select").children("ol").append(market_text);

	$(".market-option-select").addClass('open');

	setTimeout(function() {
		for (let add_marks = 0; add_marks < $(available_markets).length; add_marks++) {
			market_text = `
			<li id=${$(available_markets[add_marks]).attr('attr-valueMarketID')}>
				<div class="market-option" id="market_grab${add_marks}">
					<img src="${$(available_markets[add_marks]).children("img").attr("src")}">
					<div class="fact-data">
						<p>${$(available_markets[add_marks]).attr('attr-valueMarketName')}</p>
						<p>Role -- ${$(available_markets[add_marks]).attr('attr-valueRole') == "2" ?
						"merchant" : $(available_markets[add_marks]).attr('attr-valueRole') == "1" ?
						"trader" : "buyer"}</p>
					</div>
				</div>
			</li>`;

			$(".market-option-select").children("ol").append(market_text);
			setTimeout(function() {
				$("#market_grab" + add_marks).addClass('drop-down');
			}, 150);
		}
	}, 700);
});

$(".market-option-select ol").on("click", "li", function() {
	$.ajax({
		type: "POST",
		url: "/changeMarket",
		data: {
			market_id: $(this).attr('id')
		},
		success: function() {
			location.reload();
		},
		error: function(error) {
			popout_alert(error);
		}
	});
});

/*
 _        _      
| |_ _ __(_) ___ 
| __| '__| |/ _ \
| |_| |  | |  __/
 \__|_|  |_|\___|
                 
*/
let trie_letters = {
	value: "null",
	load: 0,
	child: []
};
let trie_words = {
	load: 0,
	child: []
};

/*
	insert:
		input:
			- trie:
				the found try which will be used for insertion
			- letter_array:
				either words which will build off each other
				or letters which will do the same
		program:
			splices first item in letter_array and finds
			the location inside the trie then repeats
		output:
			- updated trie with new values and loads added
*/
function insert(trie, letter_array, ender) {
	if (!letter_array.length) {
		trie.names = ender;
		return trie;
	}

	let first_item = letter_array.splice(0, 1)[0];

	let find_item;
	for (find_item = 0; find_item < trie.child.length; find_item++)
		if (trie.child[find_item].value == first_item)
			break;

	if (find_item == trie.child.length)
		// need to add a new item to the trie
		trie.child.push({
			value: first_item,
			load: !letter_array.length ? 1 : 0,
			child: []
		});
	else
		trie.child[find_item].load += !letter_array.length ? 1 : 0;

	return insert(trie.child[find_item], letter_array, ender);
}

/*
	suggest:
		input:
			- trie:
				the tree to pull from when looking for suggestions
			- word:
				the current word from the user (array)
		program:
			finds the DIRECT path (no edit_distances) to users
			and then finds the best suggestions of that sub_path
		output:
			an array of suggestions
*/

function suggest(trie, word, accum) {
	if (!trie.child.length)
		return [{
			value: accum,
			load: trie.load,
			name_dir: trie.names
		}];

	let find_tr;
	// continue running normally until the word runs out:
	if (word.length) {
		let first_item = word.splice(0, 1)[0];

		for (find_tr = 0; find_tr < trie.child.length; find_tr++)
			if (trie.child[find_tr].value == first_item) break;

		return find_tr == trie.child.length ?
			"No suggestions" : suggest(trie.child[find_tr], word, (accum ? accum : "") + first_item);
	} else {
		let suggestion = [];

		for (find_tr = 0; find_tr < trie.child.length; find_tr++) {
			let suggests = suggest(trie.child[find_tr], word, accum + (trie.child[find_tr].value.length > 1 ? " " : "") + trie.child[find_tr].value);

			suggests.forEach(item => {
				suggestion.push(item);
			});
		}

		return suggestion;
	}
}

let send_current_marketID;

socket.emit('get_people', function(info) {
	send_current_marketID = info.market_id;

	// insert info into tries:
	let users = info.users;
	users.forEach((info, index) => {
		// need to decide on if there's a camp name and which one to use:
		let camp_name;
		info.markets.forEach(item => {
			if (item.market_id == send_current_marketID)
				camp_name = item.camp_name;
		});
		// first_name and last_name by letters:
		insert(trie_letters, camp_name ? camp_name.split("") : info.first_name.split(""));
		if (!camp_name) insert(trie_letters, info.last_name.split(""));

		// insert regular first_name, last_name:
		insert(trie_words, camp_name ? [camp_name] : [info.first_name, info.last_name]);

		// then add reverse last_name, first_name:
		if (!camp_name) insert(trie_words, [info.last_name, info.first_name], info.first_name + "||reverse");
	});
});

// now watch for receiver id typing receiver_id_value
$("#receiver_id_value").keyup(function() {
	let look_for = $(this).val();

	if (!look_for.length) return;

	if (!trie_words.child.length || !trie_letters.child.length) {
		$("#suggestor ol").empty();
		$("#suggestor ol").append("<li>No suggestions</li>");
		return;
	}

	let names = [],
		sub_words = look_for.split(" ");
	for (let grab_options = 0; grab_options < sub_words.length; grab_options++) {
		if (!sub_words[grab_options].length) continue;

		let _new = suggest(trie_letters, sub_words[grab_options].split(""));
		if (_new != "No suggestions")
			names = [...names, ..._new];
	}

	// using first names, then offer suggestions
	let full_suggests = [];
	for (let suggestions = 0; suggestions < names.length; suggestions++) {
		let __new = suggest(trie_words, [names[suggestions].value]);

		if (__new != "No suggestions") {
			for (let any_news = 0; any_news < __new.length; any_news++) {
				if (__new[any_news].name_dir.split("||")[1] == "reverse") {
					let split = __new[any_news].value.split(" ");
					__new[any_news].value = split[1] + " " + split[0];
				}
			}

			full_suggests = __new ? [...full_suggests, ...__new] : full_suggests;
		}
	}

	suggestor_setup();

	if (!full_suggests.length) {
		// show "no suggestions";
		$("#suggestor ol").empty();
		$("#suggestor ol").append("<li>No suggestions</li>");
		return;
	}

	partition(full_suggests, 0, full_suggests.length - 1);

	$("#suggestor ol").empty();

	for (let all_sugg = 0; all_sugg < full_suggests.length; all_sugg++) {
		$("#suggestor ol").append(`
			<li>${full_suggests[all_sugg].value}</li>
		`);
	}
});

function suggestor_setup() {
	let position_offset = $("#receiver_id_value").offset();
	$("#suggestor").css({
		top: position_offset.top + 43,
		left: position_offset.left - 25,
		width: $("#receiver_id_value").outerWidth() + 50
	});

	$("#suggestor").addClass('open');
}

$("#receiver_id_value").focus(function() {
	suggestor_setup();
});

$("#receiver_id_value").focusout(function() {
	$("#suggestor").removeClass('open');
});

/*
             _      _          
  __ _ _   _(_) ___| | ___   _ 
 / _` | | | | |/ __| |/ / | | |
| (_| | |_| | | (__|   <| |_| |
 \__, |\__,_|_|\___|_|\_\\__, |
    |_|                  |___/ 
*/
function partition(array, low, high) {
	if (low < high) {
		let pivot = quicksort(array, low, high);
		partition(array, pivot + 1, high); // top
		partition(array, low, pivot - 1); // bottom
	}
}

function quicksort(array, low, high) {
	let lowest = low - 1,
		buffer;
	for (let j = low; j < high; j++) {
		if (array[high].load < array[j].load) {
			lowest++;
			buffer = array[j];
			array[j] = array[lowest];
			array[lowest] = buffer;
		}
	}
	lowest++;
	buffer = array[lowest];
	array[lowest] = array[high];
	array[high] = buffer;
	return lowest;
}