const socket = io();

$("#shake_balance").hide();

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
	let get_request = admin_or_all == "admin" ? "" : "/all";
	$.ajax("/admin/inventory" + get_request, {

		success: function(all_inventory) {
			console.log(all_inventory);

			if (admin_or_all == "admin") $(".inner-inventory.admin").empty();
			else if (admin_or_all == "all") $(".inner-inventory.all").empty();

			all_inventory.forEach(invent => {

				let inventory_item = "<div id='" + invent.id + "'>" +
					"<div class='display-styling-inventory'>" +
					"<div style='background-image: url(https://overfload.nyc3.cdn.digitaloceanspaces.com/ed485a58-4e11-4940-9b58-9dafd0113a9d);'" +
					"class='spark-logo-inventory'></div>" +
					"<div class='item-info'>" +
					"<div style='display-inline;' class='item-name'>" + invent.item_name + "</div>" +
					"<ion-icon name='chevron-forward-outline'></ion-icon>" +
					"<div style='display: inline;' class='seller'>" + (invent.owner ? invent.owner : "❓❓❓") + "</div>" +
					"</div>" +
					"<button id='" + invent.id + "' class='purchase-item'>" +
					"<span class='lightning-bolt-button'>⚡</span>" +
					"<span class='price'>" + invent.price + "</span>" +
					"</button>" +
					"</div>" +
					"<div class='inventory-descript'>" + invent.description + "</div>" +
					"</div>";

				if (admin_or_all == "admin") $(".inner-inventory.admin").append(inventory_item);
				else if (admin_or_all == "all") $(".inner-inventory.all").append(inventory_item);
			});
		}
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
	$(".inventory-popup").removeClass('open');
});

$(".price").click(function() {
	console.log("clicked?");
});

$(".inner-inventory").on("click", ".purchase-item", function() {
	socket.emit('purchase', this.id, function(result) {

		popout_alert(result ? result : "Success!");
	});
});

$(".close-send-item").click(() => {
	$(".send-item-popup").removeClass('open');
});