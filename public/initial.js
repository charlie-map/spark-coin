const socket = io();

function change_number() {

	$("#balance_display").addClass("changing");
}

change_number();

$("#balance_display").click(() => {
	$("#balance_display").removeClass("changing");
});