var callback = function () {
	window_width = $(window).width();
	window_height = $(window).height();
	if (window_height > 550) {
		$('body').width(window_width).height(window_height).removeClass('auto');
		$('.content').addClass('site-content');
		$('footer').addClass('fixed');
	} else {
		$('body').addClass('auto');
		$('.content').removeClass('site-content');
		$('footer').removeClass('fixed');
	}
};

$(document).ready(callback);
$(window).resize(callback);

$(".sendgrid-subscription-widget").on("error", function (e) {
    var input = $(this).find("input[type=email]")
    input.addClass("shake animated");
    setTimeout( function() {
    	input.removeClass("shake animated");
    }, 1000);
});

$(".sendgrid-subscription-widget").on("success", function (e) {
    var input_div = $('.sendgrid-subscription-widget');
    input_div.hide()
    setTimeout( function() {
    	input_div.hide();
    	$('.success-message').show().addClass('fadeInUp animated');
    }, 0);
});