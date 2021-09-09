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
	let get_request = admin_or_all == "admin" ? "" : admin_or_all == "all" ? "/all" : "/raffle";
	$.ajax("/admin/inventory" + get_request, {

		success: function(all_inventory) {

			if (admin_or_all == "admin") $(".inner-inventory.admin").empty();
			else if (admin_or_all == "all") $(".inner-inventory.all").empty();
			else if (admin_or_all == "raffle") $(".inner-inventory.raffle").empty();

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

				if (admin_or_all == "admin") $(".inner-inventory.admin").append(inventory_item);
				else if (admin_or_all == "all") $(".inner-inventory.all").append(inventory_item);
				else if (admin_or_all == "raffle") $(".inner-inventory.raffle").append(inventory_item);
			});
		}
	});
}

$(".admin-inventory-select").click(function() {
	$(".inner-inventory.all").removeClass('selected');
	$(".inner-inventory.admin").addClass('selected');
	$(".inner-inventory.raffle").removeClass('selected');

	$(".all-inventory-select").removeClass('button-selected');
	$(".raffle-inventory-select").removeClass('button-selected');
	$(".admin-inventory-select").addClass('button-selected');

	pull_inventory("admin");
});

$(".all-inventory-select").click(function() {
	$(".inner-inventory.admin").removeClass('selected');
	$(".inner-inventory.all").addClass('selected');
	$(".inner-inventory.raffle").removeClass('selected');

	$(".admin-inventory-select").removeClass('button-selected');
	$(".raffle-inventory-select").removeClass('button-selected');
	$(".all-inventory-select").addClass('button-selected');

	pull_inventory("all");
});

$(".raffle-inventory-select").click(function() {
	$(".inner-inventory.admin").removeClass('selected');
	$(".inner-inventory.all").removeClass('selected');
	$(".inner-inventory.raffle").addClass('selected');

	$(".admin-inventory-select").removeClass('button-selected');
	$(".all-inventory-select").removeClass('button-selected');
	$(".raffle-inventory-select").addClass('button-selected');

	pull_inventory("raffle");
});

$("#submit-sparks").click(function(event) {
	event.preventDefault();

	let receiving_id = $("#receiver_id_value").val();
	let amount = $("#number_send_item").val();
	let message = $("#message_send_item").val();
	socket.emit('transfer', receiving_id, amount, message, (err) => {
		if (err)
			popout_alert(JSON.stringify(err).replace(/["]/g, ""));
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

	} else if ($(this).hasClass('camper-information')) {
		if ($(".camper-information-popup").hasClass('open')) {
			$(".camper-information-popup").removeClass('open');
			return;
		}

		$.ajax({
			type: "GET",
			url: "/admin/campers",
			success: function(campers) {

				$(".camper-information-body").empty();

				campers.forEach(camper => {

					let information_item = "<div id='" + camper.camper_id + "camper-information-page'>" +
						"<div class='upperware-camper-information'>" +
						"<div id='" + camper.camper_id + "' style='background-image: url(https://overfload.nyc3.cdn.digitaloceanspaces.com/125ddf1e-dcd9-44b3-acfa-96b83851d827)'" +
						"class='spark-logo-inventory camper-info-image'></div>" +
						"<div class='item-info'>#" + camper.camper_id + "&nbsp;&nbsp;&nbsp;" + camper.name + "</div>" +
						"<div class='open-more-camper-information'><ion-icon class='icon-objects open-more-camper-information' name='chevron-forward-outline'></ion-icon></div>" +
						"</div>" +
						"<div class='drop-down-camper-information'>" +
						"<div>Pin&nbsp;<ion-icon style='transform: rotate(-135deg)' name='pencil-outline'></ion-icon>&nbsp;<p class='camper-pin-number'>" + camper.pin + "</p>&nbsp;<ion-icon class='icon-objects reset-camper-pin' style='transform: scale(1);' name='sync-outline'></ion-icon></div>" + // pin
						"<div>Balance&nbsp;<ion-icon style='transform: rotate(-135deg)' name='pencil-outline'></ion-icon>&nbsp;" + camper.balance + "</div>" + // balance
						"<div>Camp Name&nbsp;<ion-icon style='transform: rotate(-135deg)' name='pencil-outline'></ion-icon>&nbsp;<p id='" + camper.camper_id + "camper-camp-name'>" + (camper.camp_name ? camper.camp_name : "❓❓❓") + "</p>&nbsp;<ion-icon class='icon-objects edit-camper-name' style='transform: scale(1);' name='terminal-outline'></ion-icon></div>" + // camp name
						"<div>Staffer Level&nbsp;<ion-icon style='transform: rotate(-135deg)' name='pencil-outline'></ion-icon>&nbsp;<p class='staffer-level-selector'>" + camper.staffer + "</p><div class='staffer-level-pump'><ion-icon style='transform: scale(0.8);' class='icon-objects pump pump-up' name='add-outline'></ion-icon><ion-icon style='transform: scale(0.8);' class='icon-objects pump pump-down' name='remove-outline'></ion-icon></div>" + // staff level
						"</div></div>";

					$(".camper-information-body").append(information_item);
				});
			}
		});

		$(".camper-information-popup").addClass('open');
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
	$(".add-item-raffle").children("ion-icon").removeClass('open');
	$(".add-item-inventory-popup").removeClass('open');
	$(".add-item-raffle-popup").removeClass('open');
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
			url: "/admin/inventory" + ($(this).hasClass("raffle") ? "/raffle" : ""),
			data: {
				id: this.id,
				class: $(this).hasClass("raffle") ? "raffle" : ""
			},
			success: function(id) {
				let id_split = id.split("||");
				if (id_split[1] == "raffle")
					$("#" + id_split[0] + "item" + id_split[1]).remove();
				else
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
	$(".add-item-raffle").children("ion-icon").removeClass('open');
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

function raffle_change() {
	$(".add-item-inventory-popup").removeClass('open');
	$(".add-item-inventory").children("ion-icon").removeClass('open');
	if ($(".add-item-raffle-popup").hasClass('open')) {
		$(".add-item-raffle").children("ion-icon").removeClass('open');
		$(".add-item-raffle-popup").removeClass('open');
		setTimeout(function() {
			$(".inventory-adding").removeClass('open');
		}, 600);
	} else {
		$(".inventory-adding").addClass('open');
		$(".add-item-raffle").children("ion-icon").addClass('open');
		$(".add-item-raffle-popup").addClass('open');
	}
}

$(".add-item-raffle").click(raffle_change);

$("#submit-add-inventory-item").click(function(event) {
	event.preventDefault();

	$.ajax({
		type: "PUT",
		url: "/admin/inventory",
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

$("#submit-add-raffle-item").click(function(event) {
	event.preventDefault();

	$.ajax({
		type: "PUT",
		url: "/admin/inventory/raffle",
		dataType: "text",
		data: {
			item_name: $("#item_name_value2").val(),
			price: $("#price_value2").val(),
			quantity: $("#quantity_value2").val(),
			description: $("#item_description2").val(),
			image_url: $("#item_image2").val()
		},
		success: function(error) {
			if (error) {
				popout_alert(error);
			} else {
				popout_alert("Added to raffle!");
				if ($(".inner-inventory.selected").hasClass('all'))
					pull_inventory("all");
				else if ($(".inner-inventory.selected").hasClass('admin'))
					pull_inventory("admin");
				else
					pull_inventory("raffle");

				raffle_change();

				$("#item_name_value2").val("");
				$("#price_value2").val("");
				$("#quantity_value2").val("");
				$("#item_description2").val("");
				$("#item_image2").val("");
			}
		}
	});
});

let real_click;
let current_raffle_value;

$(".raffle-settings").click(function() {
	$.ajax({
		type: "GET",
		url: "/admin/raffle/value",
		dataType: "text",
		success: function(raffle_value) {

			real_click = 0;

			if ((raffle_value == "true" || parseFloat(raffle_value, 10) == 1) && !$("#checking-box").is(":checked"))
				$("#clicking-raffle-toggle").trigger('click');
			else if ((raffle_value == "false" || parseFloat(raffle_value, 10) == 1) && $("#checking-box").is(":checked"))
				$("#clicking-raffle-toggle").trigger('click');

			real_click = 1;
			$(".raffle-settings-popup").addClass("open");
		}
	});
});

$("#clicking-raffle-toggle").click(function() {

	if (real_click) {

		$.ajax({
			type: "POST",
			url: "/admin/raffle",
			success: function(raffle_value) {

				popout_alert("Updated Raffle to " + (raffle_value == "true" ? "on" : "off"));
			}
		});
	}
});

$(".close-raffle-settings").click(function() {
	$(".raffle-settings-popup").removeClass("open");
});

function fill_winners(raffle_winners) {

	raffle_winners.forEach(invent => {

		let inventory_item = "<div style='background: #00a8a8'>" +
			"<div class='display-styling-inventory-raffle'>" +
			"<div style='background-image: " + (invent.image_url ? "url(" + invent.image_url + ");'" : "url(https://overfload.nyc3.cdn.digitaloceanspaces.com/ed485a58-4e11-4940-9b58-9dafd0113a9d);'") +
			"class='spark-logo-inventory remove-hover'></div>" +
			"<div class='item-info'>" +
			"<div style='display-inline;' class='item-name raffle-draw'>" + invent.item_name + "</div>" +
			"<ion-icon name='chevron-forward-outline'></ion-icon>" +
			"<div style='display: inline;' class='seller'>" + (invent.camper_id ? invent.camper_id : "❓❓❓") + "</div>" +
			"</div>" +
			"<div style='display: inline; padding: 10px' class='item-winner'>Winner<ion-icon name='chevron-forward-outline'></ion-icon>" + invent.winner_name + "(#" + invent.winner + ")" + "</div>" +
			"</div>" +
			"<div class='inventory-descript'>" + invent.description + "</div>" +
			"</div>";

		$(".raffle-drawing-winners").append(inventory_item);
	});
}

$(".raffle-drawing").click(function() {

	$.ajax({
		type: "GET",
		url: "/admin/raffle",
		success: function(raffle) {
			$(".raffle-drawing-winners").empty();

			fill_winners(raffle);
		}
	})
});

//                                            _          __  __ 
//   ___ __ _ _ __ ___  _ __   ___ _ __   ___| |_ _   _ / _|/ _|
//  / __/ _` | '_ ` _ \| '_ \ / _ \ '__| / __| __| | | | |_| |_ 
// | (_| (_| | | | | | | |_) |  __/ |    \__ \ |_| |_| |  _|  _|
//  \___\__,_|_| |_| |_| .__/ \___|_|    |___/\__|\__,_|_| |_|  
//                     |_|

$(".camper-information-popup").on("click", "ion-icon.open-more-camper-information", function() {

	if ($(this).parent().hasClass('open')) {
		$(this).parent().removeClass('open');
		$(this).parent().parent().siblings().removeClass('open');
	} else {
		$(this).parent().addClass('open');
		$(this).parent().parent().siblings().addClass('open');
	}
});

function stop_animation(unroller) {

	$(unroller).parent().find(".reset-camper-pin").removeClass('open');
}

$(".camper-information-popup").on("click", "ion-icon.reset-camper-pin", function() {
	let camper_id = $(this).parent().parent().parent().attr('id').replace(/[^0-9]/g, "");
	$(this).parent().find(".reset-camper-pin").addClass('open');

	setTimeout(stop_animation, 1000, this);

	$.ajax({
		type: "POST",
		url: "/admin/reset",

		data: {
			camper_id
		},
		success: function(new_pin) {

			$("#" + camper_id + "camper-information-page").find(".camper-pin-number").text(new_pin);
		}
	})
});

$(".camper-information-popup").on("click", "ion-icon.edit-camper-name", function() {

	let camper_id = $(this).parent().parent().parent().attr('id').replace(/[^0-9]/g, "");

	let camper_name = $(this).parent().parent().parent().children('.upperware-camper-information').children('.item-info').text().substring(3 + parseInt(camper_id, 10));

	$(".edit-camper-name-information-popup").children("h1").text("Edit Camp Name for #" + camper_id + " " + camper_name);
	$(".edit-camper-name-information-popup").addClass('open');
});

$("#submit-new-camp-name").click(function(event) {
	event.preventDefault();

	let full_text = $(".edit-camper-name-information-popup").children("h1").text();
	let camper_id = full_text.split("#")[1].split(" ")[0];

	$.ajax({
		method: "POST",
		url: "/admin/campers/campname",
		data: {
			camper_id: camper_id,
			camp_name: $("#camp-name-change").val()
		},

		success: function(error) {

			if (error)
				popout_alert(error);
			else {

				$("#" + camper_id + "camper-camp-name").text($("#camp-name-change").val());
				$("#camper-name-change").val("");

				popout_alert("Changed camp name!");

				$(".edit-camper-name-information-popup").removeClass('open');
			}
		}
	})
});

$("#close-edit-camp-name-popup").click(function() {
	$(".edit-camper-name-information-popup").removeClass('open');
});

$(".camper-information-body").on('click', '.icon-objects.pump', function() {
	let camper_id = $(this).parent().parent().parent().parent().attr('id').replace(/[^0-9]/g, "");
	if ($(this).hasClass('pump-up')) {
		$.ajax({
			method: "POST",
			url: "/admin/campers/upgrade/pump",
			data: {
				camper_id: camper_id,
				role: 1
			},
			success: function() {
				$("#" + camper_id + "camper-information-page").find(".staffer-level-selector").text(parseInt($("#" + camper_id + "camper-information-page").find(".staffer-level-selector").text(), 10) + 1);
				popout_alert("Successfully pumped camper!");
			},
			error: function(error) {
				popout_alert(error.responseText.trim());
			}
		});
	} else if ($(this).hasClass('pump-down')) {
		$.ajax({
			method: "POST",
			url: "/admin/campers/upgrade/pump",
			data: {
				camper_id: camper_id,
				role: -1
			},
			success: function() {
				$("#" + camper_id + "camper-information-page").find(".staffer-level-selector").text(parseInt($("#" + camper_id + "camper-information-page").find(".staffer-level-selector").text(), 10) - 1);
				popout_alert("Successfully pumped down camper!");
			},
			error: function(error) {
				popout_alert(error.responseText.trim());
			}
		});
	}
});

// logs

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

$(".watch-logs").click(function() {
	$.ajax({
		method: "GET",
		url: "/txTest",
		success: function(all_logs) {
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
		},
		error: function(error) {
			popout_alert(error.responseText.trim());
		}
	})

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

	$("#suggestor ol").empty();

	if (!trie_words.child.length || !trie_letters.child.length) {
		$("#suggestor ol").append("<li>No suggestions</li>");
		return;
	}

	let names = [],
		primary_suggests = [],
		secondary_suggests = [],
		sub_words = look_for.split(" ");
	let finish_word = sub_words[sub_words.length - 1];
	// looking at sub words:
	// look at our options for each one:
	if (sub_words.length > 1) {

		for (let sub_word_opts = 0; sub_word_opts < sub_words.length - 1; sub_word_opts++) {
			primary_suggests.push(...suggest(trie_words, [sub_words[sub_word_opts]]));
		}
	}

	// now find names for the other portion of the word:
	for (let grab_options = 0; grab_options < sub_words.length; grab_options++) {
		if (!sub_words[grab_options].length) continue;

		let _new = suggest(trie_letters, sub_words[grab_options].split(""));

		// get rid of repeats in _new:
		for (let new_check = 0; new_check < _new.length; new_check++)
			if (names.map(item => {
					return item.value == _new[new_check].value ? true : false
				}).includes(true))
				_new.splice(new_check, 1);

		if (_new != "No suggestions")
			names = [...names, ..._new];
	}

	for (let suggestions = 0; suggestions < names.length; suggestions++) {
		let __new = suggest(trie_words, [names[suggestions].value]);

		// for secondaries, we need an EXACT match
		if (__new != "No suggestions") {
			for (let any_news = 0; any_news < __new.length; any_news++) {
				let split = __new[any_news].value.split(" ");
				// only do this if the finish_word is the second word**
				if (sub_words.length > 1 && split[0] != finish_word && split[1] != finish_word) {
					__new.splice(any_news, 1);
					continue;
				}

				if (__new[any_news].name_dir.split("||")[1] == "reverse")
					__new[any_news].value = split[1] + " " + split[0];
			}

			secondary_suggests = __new ? [...secondary_suggests, ...__new] : secondary_suggests;
		}
	}

	// clean secondary_suggests to make sure there's no duplicates
	for (let checks = 0; checks < primary_suggests.length; checks++) {
		let indeces = secondary_suggests.map((item, index) => {return primary_suggests[checks].value == item.value ? index + 1 : -1});

		let index = indeces.find(element => element >= 0);

		if (index)
			secondary_suggests.splice(index - 1, 1);
	}

	// new reconcile any differences between primary_suggests
	// and secondary_suggests:
	// add any items from either into a final item
	let full_suggests = [...primary_suggests, ...secondary_suggests];

	suggestor_setup();

	if (!full_suggests.length) {
		// show "no suggestions";
		$("#suggestor ol").append("<li>No suggestions</li>");
		return;
	}

	partition(full_suggests, 0, full_suggests.length - 1);

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