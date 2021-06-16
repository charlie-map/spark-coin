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

$(".icon-div").click(function() {
	console.log($(this).hasClass('open-inventory'));
	if ($(this).hasClass('open-inventory')) {
		if ($(".inventory-popup").hasClass('open')) {
			$(".inventory-popup").removeClass('open');
			return;
		}

		// socket.emit('inventory_get', (all_inventory) => {

		// 	all_inventory.forEach(invent => {

		// 		$(".inventory").append(
		// 			"<div id='" + invent.id + "'>" +
		// 				"<img src='" + invent.image_url + "'" +
		// 				""
		// 		);
		// 	});
		// });

		$(".inventory-popup").addClass('open');
	} else if ($(this).hasClass('send-item')) {
		console.log("open");
		if ($(".send-item-popup").hasClass('open')) {
			$(".send-item-popup").removeClass('open');
			return;
		}
		$(".send-item-popup").addClass('open');
		// let receiving_id = prompt("Receiving ID?");
		// let amount = prompt("Amount?");
		// let message = prompt("Message?");
		// socket.emit('transfer', receiving_id, amount, message, (err) => {
		// 	if (err)
		// 		alert(JSON.stringify(err));
		// 	else
		// 		alert("Success!");
		// });
	}
});

$(".close-inventory").click(() => {
	$(".inventory-popup").removeClass('open');
});

$(".close-send-item").click(() => {
	$(".send-item-popup").removeClass('open');
});