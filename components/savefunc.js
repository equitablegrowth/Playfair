///////////////////////// SAVE FUNCTIONS ///////////////////////////////
// Functions to export finished graphs as PNGs, SVGs, or as pure text
// for future editing in playfair.

function savepng() {

	// saveSvgAsPng(document.getElementById('grapharea'),'playfair.png', {scale:2.0})

	var svg = document.getElementById('grapharea')
	var img = document.getElementById('png_save')

	svg.toDataURL("image/png", {
		callback: function(data) {
			img.href=data
			img.click()
		}
	})
	// var svg = document.getElementById('grapharea')
	// var img = document.getElementById('png_save')
	// svg.toDataURL("image/png", {
	// 	callback: function(data) {
	// 		img.href=data
	// 		img.click()
	// 		svg.height=height
	// 		svg.width=width
	// 	}
	// })
}

function savesvg() {
	// this is kinda dumb but... illustrator doesn't recognize dominant_baseline or something
	// so before saving it out as a svg, all text has to be converted to the auto baseline.
	var alltext=grapharea.selectAll('text')
	for (var i=0;i<alltext.length;i++){
		trans=alltext[i].attr('transform')
		alltext[i].attr({transform:''})
		coords=alltext[i].getBBox()
		alltext[i].attr({'dominant-baseline':'auto'})
		coords2=alltext[i].getBBox()
		alltext[i].attr({y:2*coords.y-coords2.y})
		if(trans==""){trans=trans.string}
		alltext[i].attr({transform:trans})
	}

	// export
	var svg = document.getElementById("grapharea").parentNode.innerHTML
	saveAs(new Blob([svg], {type:"application/svg+xml"}), 'Playfair_graph.svg')

	// change everything back to text-before-edge
	for (var i=0;i<alltext.length;i++){
		trans=alltext[i].attr('transform')
		alltext[i].attr({transform:''})
		coords=alltext[i].getBBox()
		alltext[i].attr({'dominant-baseline':'text-before-edge'})
		coords2=alltext[i].getBBox()
		alltext[i].attr({y:coords.y})
		if(trans==""){trans=trans.string}
		alltext[i].attr({transform:trans})
	}
}

function cloudsave() {
	// remove any selected text boxes
	try{
		select_box.remove()
		document.removeEventListener('keypress',press_listener)
		document.removeEventListener('keydown',down_listener)
		selected_text.undrag()
		selected_text.attr({transform:trans})
		active_element.attr({fill:text_element_fill})
		selected=0
	} catch(err){}

	$.ajax({
		url:'cgi-bin/listfiles.py',
		type: 'post',
		datatype: 'html',
		data: 1,
		success: function(response){
			$("#savedialog").fadeIn(50);
			$("#savebox").fadeIn(50);
			var response = JSON.parse(response);
			for (var i=0;i<response.length;i++){
				$('#save_filebox').append('<li class="filerow">'+response[i]+'</li>')
			}
		}
	})
}

function cloudload() {
	$.ajax({
		url:'cgi-bin/listfiles.py',
		type: 'post',
		datatype: 'html',
		data: 1,
		success: function(response){
			$("#savedialog").fadeIn(50);
			$("#loadbox").fadeIn(50);
			var response = JSON.parse(response);
			for (var i=0;i<response.length;i++){
				$('#load_filebox').append('<a href="#" class="list-group-item filerow">'+response[i]+'</a')
			}
		}
	})
}

function cancelsave() {
	$("#savebox").fadeOut(1);
	$("#savedialog").fadeOut(1);
	$('#save_filebox').empty()
}

function cancelload() {
	$("#loadbox").fadeOut(1);
	$("#savedialog").fadeOut(1);
	$('#load_filebox').empty()
}

function savetoserver() {
	try{
		// build the dictionary to pass to ajax
		var filename=$('#savename').val()
		var svg = document.getElementById("grapharea").innerHTML

		var dictionary={}
		dictionary['svg']=encodeURIComponent(svg)
		var temp=chartobject
		delete temp['svg']
		delete temp['logo']

		// store dtypes so they can be retrieved after load (stringify obliterates them)
		temp['dtypes']={}
		for (var key in temp.flatdata){
			temp.dtypes[key]=temp.flatdata[key].dtype
		}

		dictionary['chartobject']=JSON.stringify(temp)
		dictionary['filename']=filename

		input_dict={}

		var databox_value=$('#data_text').val();
		input_dict['data_text']=['textarea',databox_value]

		var segment_value=$('#trend_text').val();
		input_dict['trend_text']=['textarea',segment_value]

		// modified from StackOverflow, T.J. Crowder
		// http://stackoverflow.com/a/2214077/3001940
		// get value of all inputs onscreen so they can be restored by a load
		var inputs, index;

		inputs = document.getElementsByTagName('input');
		for (index = 0; index < inputs.length; ++index) {
		    if(inputs[index].type=='radio' || inputs[index].type=='checkbox'){
		    	input_dict[inputs[index].id]=[inputs[index].type,inputs[index].checked]
		    } else if (inputs[index].type=='text'){
		    	input_dict[inputs[index].id]=[inputs[index].type,inputs[index].value]
		    }
		}

		selects=document.getElementsByTagName('select');
		for (index=0; index < selects.length; ++index){
			input_dict[selects[index].id]=['dropdown',selects[index].value]
		}

		input_dict['graphtype']=['graphtype',graph_type]
		dictionary['inputs']=JSON.stringify(input_dict)

	// call the python script
		$.ajax({
			url:'cgi-bin/savetoserver.py',
			type: 'post',
			datatype: 'html',
			data: dictionary,
			success: function(response){
				cancelsave()
			}
		})
	} catch(err){
		alert('Failed to save: '+'\n'+err)
		cancelsave()
	}
}

function loadfromserver() {
	dictionary={'loadfile':loadfile}
	$.ajax({
		url:'cgi-bin/loadfromserver.py',
		type: 'post',
		datatype: 'html',
		data: dictionary,
		success: function(response){
			cancelload()
			load_populate(response)
		}
	})
}

function load_populate(response) {
	svg=response.split('\n')[1]
	svg=decodeURIComponent(svg)
	settings=response.split('\n')[2]
	inputs=response.split('\n')[3]

	console.log(settings)
	console.log(inputs)
	chartobject=JSON.parse(settings)
	inputs=JSON.parse(inputs)

	document.getElementById('data_text').value=inputs['data_text'][1]
	document.getElementById('trend_text').value=inputs['trend_text'][1]
	loadData()

	for(var input in inputs){
		if(inputs[input][0]=='text'){
			$('#'+input).val(inputs[input][1])
		}
		if(inputs[input][0]=='radio'){
			$('#'+input).prop('checked',inputs[input][1])
		}
		if(inputs[input][0]=='checkbox'){
			$('#'+input).prop('checked',inputs[input][1])
		}
		if(inputs[input][0]=='dropdown'){
			$('#'+input).val(inputs[input][1])
		}
		if(inputs[input][0]=='graphtype'){
			graph_type=inputs[input][1]
		}
	}

	if (inputs['gwidth'][1]!=''){
		width=parseFloat(inputs['gwidth'][1])
	} else {width=745}
	if (inputs['gheight'][1]!=''){
		height=parseFloat(inputs['gheight'][1])
	} else {height=520}

	$('#grapharea').attr('height',height)
	$('#grapharea').attr('width',width)

	// insert the returned svg into the svg slot
	document.getElementById("grapharea").innerHTML=svg

	var moveFuncfloat=function(dx,dy,posx,posy){
		key_elements=grapharea.selectAll('[ident="key"]')
		for(var i=0;i<key_elements.length;i++){
			coords=key_elements[i].getBBox()
			if(key_elements[i].type=='circle'){
				key_elements[i].attr({
					cx:coords.cx-prevx+dx,
					cy:coords.cy-prevy+dy
				}) 
			} else if (key_elements[i].type=='line'){
				key_elements[i].attr({
					x1:coords.x-prevx+dx,
					y1:coords.y-prevy+dy,
					x2:coords.x2-prevx+dx,
					y2:coords.y2-prevy+dy,
			})
			} else if (key_elements[i].type=='text'){
				key_elements[i].selectAll("tspan:not(:first-child)").attr({x:coords.x-prevx+dx})
				key_elements[i].attr({
					x:coords.x-prevx+dx,
					y:coords.y-prevy+dy
				})
			} else if (key_elements[i].type=='path'){
				var currentx=key_elements[i].matrix.e-prevx
				var currenty=key_elements[i].matrix.f-prevy
				var x=currentx+dx
				var y=currenty+dy
				key_elements[i].transform('t'+x+','+y)
			} else {
				key_elements[i].attr({
					x:coords.x-prevx+dx,
					y:coords.y-prevy+dy
				})
			}
			grapharea.append(key_elements[i])
		}
		prevx=dx
		prevy=dy
	}

	// stick drag method on the things that need it.
	drag_eles=grapharea.selectAll('rect[ident2="floatkey"]')
	for(var i=0;i<drag_eles.length;i++){
		drag_eles[i].drag(moveFuncfloat,function(){x=this.attr('x');y=this.attr('y');prevx=0;prevy=0})
	}

	drag_eles=grapharea.selectAll('line[class="callout"]')
	for(var i=0;i<drag_eles.length;i++){
		drag_eles[i].drag()
	}

	drag_eles=grapharea.selectAll('g')
	for(var i=0;i<drag_eles.length;i++){
		drag_eles[i].drag()
	}

	// recreate shadowfilter
	try{
		grapharea.select('filter').remove()
	} catch(err){}
	grapharea=Snap('#grapharea')
	shadowfilter=grapharea.filter(Snap.filter.shadow(0, 2, 3))
	grapharea.append(shadowfilter)

	// re-populate key - this won't get you the same key options as the saved graph
	// - just a totally new fresh key.
	$(".variable_select").change()

	// re-associate dtypes with appropriate variables
	for(var key in chartobject.flatdata){
		console.log(key,chartobject.flatdata[key],chartobject.dtypes[key])
		chartobject.flatdata[key].dtype=chartobject.dtypes[key]
	}
}

$(document).on('click', '.list-group a', function(e){
	loadfile=this.text
});


///////////////////// END SAVE FUNCTIONS ///////////////////////////////
////////////////////////////////////////////////////////////////////////