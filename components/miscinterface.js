//////////////////// MISCELLANEOUS INTERFACE ///////////////////////////
// This section contains playfair interface functions that do not merit
// their own section and are not part of the graphic package itself.

// detect width changes - if < 1200, then graphdiv needs to be align-right
var width = $(window).width();
$(window).resize(function(){
	if($(this).width() < 1200){
		$('#graphdiv').addClass('text-right')
		$('#graphdiv').removeClass('text-center')
		$('#help_general').css('width','calc(100% - 765px)')
		$('#help_text').css('width','calc(100% - 765px)')
	}
	if($(this).width() >= 1200){
		$('#graphdiv').addClass('text-center')
		$('#graphdiv').removeClass('text-right')
		$('#help_general').css('width','calc((100% - 785px)/2)')
		$('#help_text').css('width','calc((100% - 785px)/2)')
	}
});

$(document).ready(function(){
	if($(window).width()<1200){
		$('#graphdiv').addClass('text-right')
		$('#graphdiv').removeClass('text-center')
		$('#help_general').css('width','calc(100% - 765px)')
		$('#help_text').css('width','calc(100% - 765px)')
	}
})

function highlight_element(ev) {
	if(selected==0){
		// this should handle basically every case of mousing over a data element and getting a highlight effect
		item=Snap(ev.target)
		
		try{
			if(item.attr('context')){
				item.attr({filter:shadowfilter})
				hovered=1	
			}
		} catch(err){}
	}
}

function unhighlight_element(ev) {
	if(selected==0 & hovered==1){
		item=Snap(ev.target)

		try{
			if(item.attr('context')){
				item.attr({filter:''})
				hovered=0
			}
		} catch(err){}
	}
}

$('.panel-custom').on('show.bs.collapse', function () {
     $(this).addClass('fun');
});

$('.panel-custom').on('hide.bs.collapse', function () {
     $(this).removeClass('fun');
});

function newtrend(){
	$('#trends').prepend('<div class="row"><div class="col-md-12"><div class="col-md-4"><div class="input-group"><span class="input-group-addon" data-toggle="tooltip" data-placement="top" title="Slope of the trend line to add to the plot."">Slope:</span><input type="text" class="form-control slope" placeholder="" id="slope"></div></div><div class="col-md-4"><div class="input-group"><span class="input-group-addon" data-toggle="tooltip" data-placement="top" title="Intercept of the trend line to add to the plot."">Intercept:</span><input type="text" class="form-control intercept" placeholder="" id="intercept"></div></div><div class="col-md-4"></div></div></div>')
}

/////////////////////// END MISCELLANEOUS //////////////////////////////
////////////////////////////////////////////////////////////////////////


///////////////////////////// THEMES ///////////////////////////////////
// Initialize the theme dropdown and handle changes

$(document).ready(function(){
	$.ajax({
		url:'cgi-bin/listthemes.py',
		method: 'post',
		datatype: 'html',
		success: function(response){
			var response = JSON.parse(response);
			$.each(response,function(key,value){
				value=value[0].split('.')[0]
				$('#themes').append($('<option>',{value:value}).text(value))
			})

			$("#themes").val('Standard')
			change_theme()
		}
	})
})

function change_theme(){
	option=$('#themes').val()+'.txt'
	dictionary={'loadtheme':option}

	$.ajax({
		url:'cgi-bin/loadtheme.py',
		method: 'post',
		datatype: 'html',
		data: dictionary,
		success: function(response){
			var response = JSON.parse(response);
			theme=response
		}
	})
}

///////////////////////// VERTICAL TABS ////////////////////////////////
// Completely ripped these vertical tabs off from this jsfiddle:
// http://jsfiddle.net/frabiacca/7pm7h/5/
// Thanks frabiacca!

$(function() {
	var items=$('.v-nav>ul>li').each(function() {
		$(this).click(function(){
			items.removeClass('current');
			$(this).addClass('current');
			$('.v-nav>div.tab-content').hide().eq(items.index($(this))).show();
		})
	})

	$('#data_first').click()
})


