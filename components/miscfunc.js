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


		try{
			if(ev.target.className.baseVal=='dataelement'){
				coords=item.getBBox()
				highlighttext=grapharea.text(coords.x2+10,coords.y+coords.height/2,item.attr('data_label')).attr({'font-family':'Lato, Arial, sans-serif','font-size':16,'text-anchor':'start','fill':'black','font-weight':400,cursor:'pointer'})
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
				item.node.removeAttribute('filter')
				hovered=0
			}

			try{
				if(ev.target.className.baseVal=='dataelement'){
					highlighttext.remove()
					hovered=0
				}
			}catch(err){}
			
		} catch(err){}
	}
}

$('.panel-custom').on('show.bs.collapse', function () {
     $(this).addClass('fun');
});

$('.panel-custom').on('hide.bs.collapse', function () {
     $(this).removeClass('fun');
});

/////////////////////// END MISCELLANEOUS //////////////////////////////
////////////////////////////////////////////////////////////////////////



///////////////////////////// THEMES ///////////////////////////////////
// Initialize the theme dropdown and handle changes


$(document).ready(function(){
	$.ajax({
		url:'cgi-bin/listthemes.py',
		method: 'post',
		datatype: 'html',
		data: 1,
		success: function(response){
			var response = JSON.parse(response);
			console.log(response)
			$.each(response,function(key,value){
				value=value.split('.')[0]
				$('#themes').append($('<option>',{value:value}).text(value))
			})

			$("#themes").val('Equitable Growth')
			$('#themes').prop('disabled', false);
			change_theme()
		}
	})
})

function change_theme(){
	if($('#themes').val()!='none'){
		var option=$('#themes').val()+'.txt'
		var dictionary={'loadtheme':option}

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
	} else {
		theme={}
	}
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


