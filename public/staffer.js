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
			console.log(error.responseText);
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
				"<div class='purchase-extra-info'>" + log.item_name + " - " + log.description + "</div>" +
				"<div class='align-extra-log-info'>" +
				"<div class='display-log-time'>" + months[new Date(log.tx_time).getMonth()] + " " + new Date(log.tx_time).getDate() + "-" + new Date(log.tx_time).getHours() + ":" + new Date(log.tx_time).getMinutes() + "</div>" +
				"<div class='log-item-owner-info'>" +
				(log.raffle ? "RAFFLE - " + log.price :
					"<div class='log-item-owner'>" +
					(log.owner_name ? log.owner_name : "❓❓❓") + " - " + log.price + "</div>") +
				"</div>" +
				"</div>" +
				"<div class='purchaser-log-info'>" + log.purchaser_name + "</div>" +
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
		console.log($(this).offset().top);
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