//////////////////////// CONTEXTUAL MENUS //////////////////////////////
// Handling right-clicks on various graph elements to allow the user to
// change text, label data, insert callouts and etc.

$(function() {
	var svgarea=document.getElementById('grapharea')
	var doubleClicked = false;
	$(svgarea).on("contextmenu", function (e) {
		height2=window.innerHeight
		width2=window.innerWidth

		if(doubleClicked == false && drawpath!=1) {
			disableScroll()
			if(e.target.attributes.context){
				menu='#'+e.target.attributes.context.value
			} else if(e.target.nodeName=='tspan'){
				menu='#text_context_menu'
			} else {
				menu='#other_context_menu'
			}
			console.log(e.target.attributes.context)
			console.log(menu)

			clickedevent=e
			e.preventDefault();
			$(menu).css("left", e.clientX-1);
			$(menu).css("top", e.clientY-2);
			$(menu).fadeIn(50, FocusContextOut());
			if(e.clientY+$(menu).height()>height2){
				$(menu).css("top", height2-$(menu).height()-5);
			}
			if(e.clientX+$(menu).width()>width2){
				$(menu).css("left", e.clientX-3-$(menu).width());
			}
			doubleClicked = true;

		} else {
			e.preventDefault();
			doubleClicked = false;
			$(".contextMenuContainer").fadeOut(100);
		}
	});
	function FocusContextOut() {
		$(document).on("click", function () {
			doubleClicked = false; 
			$(".contextMenuContainer").fadeOut(100);
			enableScroll()
		});
	}
});

$(function() {
	var context_menus=document.getElementsByClassName('contextMenuContainer')
	$(context_menus).on("contextmenu", function (e) {
		e.preventDefault();
	})
})

function boldtext(target) {
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	fontf=item.attr('font-weight')
	if(fontf==400 || fontf=='normal'){
		item.attr({'font-weight':600})
	}
	if(fontf==600 || fontf=='bold'){
		item.attr({'font-weight':400})
	}
}

function italictext(target) {
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	style=item.attr('font-style')
	if(style=='normal'){
		item.attr({'font-style':'italic'})
	}
	if(style!='normal'){
		item.attr({'font-style':'normal'})
	}
}

function sizeup(target) {
	try{high_coords=high_box.getBBox()}catch(err){console.log(err)}
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){console.log(err)}
	var size=item.attr('font-size')
	console.log(item,target,size)
	item.attr({'font-size':parseInt(size)+1});
	item.selectAll("tspan:not(:first-child)").attr({dy:1.1*parseFloat(item.attr('font-size'))})
	try{coords=selected_text.getBBox()
	high_box.attr({y:coords.y-3,x:coords.x-3,width:coords.width+6,height:coords.height+6})}catch(err){}
}

function sizedown(target) {
	try{high_coords=high_box.getBBox()}catch(err){}
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	size=item.attr('font-size')
	item.attr({'font-size':parseInt(size)-1});
	item.selectAll("tspan:not(:first-child)").attr({dy:1.1*parseFloat(item.attr('font-size'))})
	try{coords=selected_text.getBBox()
	high_box.attr({y:coords.y-3,x:coords.x-3,width:coords.width+6,height:coords.height+6})}catch(err){}
}

function leftalign(target) {
	try{high_coords=high_box.getBBox()}catch(err){}
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	item.attr({'text-anchor':'start'});
	try{coords=selected_text.getBBox()
	high_box.attr({y:coords.y-3,x:coords.x-3,width:coords.width+6,height:coords.height+6})}catch(err){}
	position_cursor(selected_text)
}

function rightalign(target) {
	try{high_coords=high_box.getBBox()}catch(err){}
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	item.attr({'text-anchor':'end'});
	try{coords=selected_text.getBBox()
	high_box.attr({y:coords.y-3,x:coords.x-3,width:coords.width+6,height:coords.height+6})}catch(err){}
	position_cursor(selected_text)
}

function center(target) {
	try{high_coords=high_box.getBBox()}catch(err){}
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	item.attr({'text-anchor':'middle'});
	try{coords=selected_text.getBBox()
	high_box.attr({y:coords.y-3,x:coords.x-3,width:coords.width+6,height:coords.height+6})}catch(err){}
	position_cursor(selected_text)
}

function fadein(target) {
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	opacity=parseFloat(item.attr('opacity'))

	if(item.attr('ident')=='key'){
		group=item.attr('group')
		snapobj.selectAll("[group='"+group+"']").attr({opacity:opacity+.1})
	} else {
		item.attr({opacity:opacity+.1})
	}
}

function fadeout(target) {
	var item=Snap(target)
	try{if(target.nodeName=='tspan'){
		item=item.parent()
	}}catch(err){}
	opacity=parseFloat(item.attr('opacity'))

	if(item.attr('ident')=='key'){
		group=item.attr('group')
		snapobj.selectAll("[group='"+group+"']").attr({opacity:opacity-.1})
	} else {
		item.attr({opacity:opacity-.1})
	}
}

function addtext(target) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	// Thanks for not telling me what to replace it with Chrome!
	// 'SVGElement.offsetLeft' is deprecated and will be removed in M50, around April 2016. See https://www.chromestatus.com/features/5724912467574784 for more details.
	// 'SVGElement.offsetTop' is deprecated and will be removed in M50, around April 2016. See https://www.chromestatus.com/features/5724912467574784 for more details.

	if(typeof chartobject!=='undefined'){
		var annosize=chartobject.annotations.annotatesize
		var annoweight=chartobject.annotations.annotateweight
		var annoface=chartobject.annotations.annotateface
		var annofill=chartobject.annotations.annotatetextfill
	} else {
		var annosize='14px'
		var annoweight=400
		var annoface='Lato'
		var annofill='black'
	}

	var text=grapharea.text(target.clientX-svgx,target.clientY-svgy,'Text Annotation').attr({'font-family':annoface,'font-size':annosize,'text-anchor':'start','fill':annofill,'font-weight':annoweight,dy:'0.7em',cursor:'pointer',colorchange:'fill',context:'text_context_menu',annotation:1})
	console.log(text,annosize)
	text.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
}

function change_color(target,color) {
	var item=Snap(target)

	if (target.nodeName=='tspan'){
		item=item.parent()
	}

	console.log(item.attr('colorchange'))
	if(item.attr('colorchange')=='fill'){
		item.attr({fill:color})
		if(item.attr('ident')=='key'){
			group=item.attr('group')
			snapobj.selectAll("[group='"+group+"']").attr({fill:color})
		}
	} else if(item.attr('colorchange')=='stroke'){
		if(item.attr('arrow')){
			item.attr({stroke:color})
			var temparrow = grapharea.path('M0,0 L0,4 L6,2 L0,0').attr({fill:color})
			var tempamarker = temparrow.marker(0,0,6,4,0,2).attr({fill:color});
			item.attr({'marker-end':tempamarker})
		} else{
			item.attr({stroke:color})
			if(item.attr('ident')=='key'){
				group=item.attr('group')
				snapobj.selectAll("[group='"+group+"']").attr({stroke:color})
			}
		}
	} else if(item.attr('colorchange')=='both'){
		item.attr({fill:color,stroke:color})
		if(item.attr('ident')=='key'){
			group=item.attr('group')
			snapobj.selectAll("[group='"+group+"']").attr({fill:color,stroke:color})
		}
	}

	if(item===active_element){
		text_element_fill=color
	}
}

function change_linetype(target,attribute){
	var item=Snap(target)
	item.attr({'stroke-dasharray':attribute})
	if(item.attr('ident')=='key'){
		group=item.attr('group')
		snapobj.selectAll("[group='"+group+"']").attr({'stroke-dasharray':attribute})
	}
}

function labeldata(target) {
	var item=Snap(target)
	if(item.attr('data_type')=='bar'){
		coords=item.getBBox()
		if(item.attr('orient')=='vertical'){
			if(item.attr('data_label')<0){
				var datalabel=grapharea.text(coords.x+coords.width/2,coords.y2,item.attr('data_label')).attr({ident:'foot','font-family':chartobject.data_labels.dataface,'font-size':chartobject.data_labels.datasize,'font-weight':chartobject.data_labels.dataweight,dy:'0.7em','text-anchor':'middle',colorchange:'fill',context:'text_context_menu',annotation:1})
				datalabel.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			} else {
				var datalabel=grapharea.text(coords.x+coords.width/2,coords.y-parseInt(chartobject.data_labels.datasize)*1.15,item.attr('data_label')).attr({ident:'foot','font-family':chartobject.data_labels.dataface,'font-size':chartobject.data_labels.datasize,'font-weight':chartobject.data_labels.dataweight,dy:'0.7em','text-anchor':'middle',colorchange:'fill',context:'text_context_menu',annotation:1})
				datalabel.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			}
		}
		if(item.attr('orient')=='horizontal'){
			if(item.attr('data_label')<0){
				var datalabel=grapharea.text(coords.x-5,coords.y+coords.height/2-parseInt(chartobject.data_labels.datasize),item.attr('data_label')).attr({ident:'foot','font-family':chartobject.data_labels.dataface,'font-size':chartobject.data_labels.datasize,'font-weight':chartobject.data_labels.dataweight,dy:'0.7em','text-anchor':'start',colorchange:'fill',context:'text_context_menu',annotation:1})
				datalabel.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			} else {
				var datalabel=grapharea.text(coords.x+coords.width+5,coords.y+coords.height/2-parseInt(chartobject.data_labels.datasize),item.attr('data_label')).attr({ident:'foot','font-family':chartobject.data_labels.dataface,'font-size':chartobject.data_labels.datasize,'font-weight':chartobject.data_labels.dataweight,dy:'0.7em','text-anchor':'start',colorchange:'fill',context:'text_context_menu',annotation:1})
				datalabel.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			}
		}
	} else if (item.node.nodeName=='path'){
		// for maps, need to transform this stuff because the map has been transformed.
		parents=item.parent()
		// console.log(parents.transform()['string'])
		// console.log(parents.parent().transform()['string'])
		coords=item.getBBox()
		console.log(coords)
		y=parseFloat(item.realPath.split(',')[item.realPath.split(',').length-1])
		var datalabel=grapharea.text(coords.x2+5,y-parseInt(chartobject.data_labels.datasize)+3,item.attr('data_label')).attr({ident:'foot','font-family':chartobject.data_labels.dataface,'font-size':chartobject.data_labels.datasize,'font-weight':chartobject.data_labels.dataweight,dy:'0.7em','text-anchor':'start',colorchange:'fill',context:'text_context_menu',annotation:1})
		datalabel.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
	}
	else {
		coords=item.getBBox()
		var datalabel=grapharea.text(coords.x+coords.width/2,coords.y-parseInt(chartobject.data_labels.datasize)-3,item.attr('data_label')).attr({ident:'foot','font-family':chartobject.data_labels.dataface,'font-size':chartobject.data_labels.datasize,'font-weight':chartobject.data_labels.dataweight,dy:'0.7em','text-anchor':'middle',colorchange:'fill',context:'text_context_menu',annotation:1})
		datalabel.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
	}
}

// courtesy of http://stackoverflow.com/a/4770179/3001940
function disableScroll() {
  if (window.addEventListener) // older FF
      window.addEventListener('DOMMouseScroll', preventDefault, false);
  window.onwheel = preventDefault; // modern standard
  window.onmousewheel = document.onmousewheel = preventDefault; // older browsers, IE
  window.ontouchmove  = preventDefault; // mobile
  document.onkeydown  = preventDefaultForScrollKeys;
}

function enableScroll() {
    if (window.removeEventListener)
        window.removeEventListener('DOMMouseScroll', preventDefault, false);
    window.onmousewheel = document.onmousewheel = null; 
    window.onwheel = null; 
    window.ontouchmove = null;  
    document.onkeydown = null;  
}

var keys = {37: 1, 38: 1, 39: 1, 40: 1};

function preventDefault(e) {
  e = e || window.event;
  if (e.preventDefault)
      e.preventDefault();
  e.returnValue = false;  
}

function preventDefaultForScrollKeys(e) {
    if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
    }
}

function startpath(e) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	if(typeof(chartobject)!=='undefined'){
		var callwidth=chartobject.callout_style.callout_thickness
		var callstroke=chartobject.callout_style.callout_color
		var calldash=chartobject.callout_style.callout_dasharray
	} else {
		var callwidth=1
		var callstroke='#ababab'
		var calldash=[]
	}

	drawpath=1
	pathstart=[e.clientX-svgx,e.clientY-svgy]
	circstart=grapharea.circle(pathstart[0],pathstart[1],1.5).attr({annotation:1,class:'callout',stroke:callstroke,'stroke-width':callwidth,'shape-rendering':'geometricPrecision',fill:'none',context:'callout_context_menu','stroke-dasharray':calldash})
	grapharea.click(endpath)
	grapharea.mousemove(tracker)
}

function startarrow(e) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	drawpath=1
	pathstart=[e.clientX-svgx,e.clientY-svgy]
	grapharea.click(endarrow)
	grapharea.mousemove(tracker)
}

function startline(e) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	drawpath=1
	pathstart=[e.clientX-svgx,e.clientY-svgy]
	grapharea.click(endline)
	grapharea.mousemove(tracker)
}

function tracker(e) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	try{trackline.remove()}catch(err){}
	trackline=grapharea.line(pathstart[0],pathstart[1],e.clientX-svgx,e.clientY-svgy).attr({'stroke-width':1,'stroke':'black'})
}

function endpath(e) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	drawpath=0
	grapharea.unmousemove(tracker)
	grapharea.unclick(endpath)
	try{trackline.remove()}catch(err){}

	if(e.clientY-svgy>pathstart[1]){
		yoffset=1
	} else{
		yoffset=-1
	}

	if(typeof(chartobject)!=='undefined'){
		var callwidth=chartobject.callout_style.callout_thickness
		var callstroke=chartobject.callout_style.callout_color
		var calldash=chartobject.callout_style.callout_dasharray
	} else {
		var callwidth=1
		var callstroke='#ababab'
		var calldash=[]
	}

	path_string='M'+(pathstart[0]-1.5)+' '+pathstart[1]+'a1.5,1.5 0 1,0 3,0a1.5,1.5 0 1,0 -3,0'+'M'+pathstart[0]+' '+(pathstart[1]+yoffset)+'L'+pathstart[0]+' '+(e.clientY-svgy)+'L'+(e.clientX-svgx)+' '+(e.clientY-svgy)
	finalline=grapharea.path(path_string).attr({annotation:1,class:'callout','stroke-width':callwidth,'stroke':callstroke,'shape-rendering':'crispEdges',fill:'none',colorchange:'stroke',context:'callout_context_menu','stroke-dasharray':calldash})
	circstart.remove()
	finalline.drag()
}

function endarrow(e) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	if(typeof(chartobject)!=='undefined'){
		var callwidth=chartobject.callout_style.arrow_thickness
		var callstroke=chartobject.callout_style.arrow_color
		var calldash=chartobject.callout_style.arrow_dasharray
	} else {
		var callwidth=2
		var callstroke='black'
		var calldash=[]
	}

	var arrow = grapharea.path('M0,0 L0,4 L6,2 L0,0').attr({})
	var amarker = arrow.marker(0,0,6,4,0,2).attr({});
	drawpath=0
	grapharea.unmousemove(tracker)
	grapharea.unclick(endarrow)
	try{trackline.remove()}catch(err){}
	finalline=grapharea.line(pathstart[0],pathstart[1],e.clientX-svgx,e.clientY-svgy).attr({annotation:1,arrow:1,ident:'none',class:'callout','stroke-width':callwidth,'stroke':callstroke,'shape-rendering':'auto','marker-end':amarker,colorchange:'stroke',context:'callout_context_menu','stroke-dasharray':calldash})
	finalline.drag()
}

function endline(e) {
	// coordinates of the SVG graphing area
	var svgx=document.getElementById("grapharea").getBoundingClientRect()['left']
	var svgy=document.getElementById("grapharea").getBoundingClientRect()['top']

	if(typeof(chartobject)!=='undefined'){
		var callwidth=chartobject.callout_style.arrow_thickness
		var callstroke=chartobject.callout_style.arrow_color
		var calldash=chartobject.callout_style.arrow_dasharray
	} else {
		var callwidth=2
		var callstroke='black'
		var calldash=[]
	}

	drawpath=0
	grapharea.unmousemove(tracker)
	grapharea.unclick(endline)
	try{trackline.remove()}catch(err){}
	finalline=grapharea.line(pathstart[0],pathstart[1],e.clientX-svgx,e.clientY-svgy).attr({annotation:1,ident:'none',class:'callout','stroke-width':callwidth,'stroke':callstroke,'shape-rendering':'auto',colorchange:'stroke',context:'callout_context_menu','stroke-dasharray':calldash})
	finalline.drag()
}

function deleteelement(e) {
	if (e.nodeName=='tspan'){
		item=Snap(e)
		item=item.parent()
		console.log(item)
		item.remove()
	} else if (e.parentNode.nodeName=='g'){
		e.parentNode.remove()
	} else {
		e.remove()
	}
}

function movetofront(e) {
	if (e.nodeName=='tspan'){
		item=Snap(e)
		item=item.parent()
		grapharea.append(item)
	} else if (e.parentNode.nodeName=='g'){
		item=Snap(e)
		item=item.parent()
		grapharea.append(item)
	} else {
		item=Snap(e)
		grapharea.append(item)
	}
}

function pointsizeup(e) {
	item=Snap(e)
	item.attr({r:parseInt(item.attr('r'))+1})
	if(item.attr('ident')=='key'){
		group=item.attr('group')
		snapobj.selectAll("circle[group='"+group+"']").attr({'r':parseInt(item.attr('r'))})
	}
}

function pointsizedown(e) {
	item=Snap(e)
	if(item.attr('r')>1){
		item.attr({r:item.attr('r')-1})
		if(item.attr('ident')=='key'){
			group=item.attr('group')
			snapobj.selectAll("circle[group='"+group+"']").attr({'r':parseInt(item.attr('r'))})
		}
	}
}

function pointtype(e,type) {
	item=Snap(e)

	r=parseInt(item.attr('r'))
	sw=parseInt(item.attr('stroke-width'))

	if (type=='pointpoint' && sw!=0){
		item.attr({'stroke-width':0,r:r-2,'fill-opacity':1})
		if(item.attr('ident')=='key'){
			group=item.attr('group')
			snapobj.selectAll("circle[group='"+group+"']").attr({'stroke-width':0,r:r-2,'fill-opacity':1})
		}
	} else if (type=='pointcircle'){
		if (sw==0){
			item.attr({'stroke-width':2,r:r+2,'fill-opacity':.2})
			if(item.attr('ident')=='key'){
				group=item.attr('group')
				snapobj.selectAll("circle[group='"+group+"']").attr({'stroke-width':2,r:r+2,'fill-opacity':.2})
			}
		} else {
			item.attr({'stroke-width':2,'fill-opacity':.2})
			if(item.attr('ident')=='key'){
				group=item.attr('group')
				snapobj.selectAll("circle[group='"+group+"']").attr({'stroke-width':2,'fill-opacity':.2})
			}
		}
	} else if (type=='pointcircleopen') {
		if (sw==0){
			item.attr({'stroke-width':1,r:r+2,'fill-opacity':0})
			if(item.attr('ident')=='key'){
				group=item.attr('group')
				snapobj.selectAll("circle[group='"+group+"']").attr({'stroke-width':1,r:r+2,'fill-opacity':0})
			}
		} else {
			item.attr({'stroke-width':1,'fill-opacity':0})
			if(item.attr('ident')=='key'){
				group=item.attr('group')
				snapobj.selectAll("circle[group='"+group+"']").attr({'stroke-width':2,'fill-opacity':0})
			}
		}
	}
}

function thinpath(e) {
	item=Snap(e)
	if (parseInt(item.attr('stroke-width'))>1){
		item.attr({'stroke-width':parseInt(item.attr('stroke-width'))-1})
		if(item.attr('ident')=='key'){
			group=item.attr('group')
			snapobj.selectAll("path[group='"+group+"']").attr({'stroke-width':parseInt(item.attr('stroke-width'))})
		}
	}
}

function thickpath(e) {
	item=Snap(e)
	item.attr({'stroke-width':parseInt(item.attr('stroke-width'))+1})
	if(item.attr('ident')=='key'){
		group=item.attr('group')
		snapobj.selectAll("path[group='"+group+"']").attr({'stroke-width':parseInt(item.attr('stroke-width'))})
	}
}

function thincircle(e) {
	item=Snap(e)
	if (item.attr('r')>1){
		item.attr({'r':parseFloat(item.attr('r'))-1})
		if(item.attr('ident')=='key'){
			group=item.attr('group')
			snapobj.selectAll("circle[group='"+group+"']").attr({'r':parseFloat(item.attr('r'))})
		}
	}
}

function thickcircle(e) {
	item=Snap(e)
	item.attr({'r':parseFloat(item.attr('r'))+1})
	if(item.attr('ident')=='key'){
		group=item.attr('group')
		snapobj.selectAll("circle[group='"+group+"']").attr({'r':parseFloat(item.attr('r'))})
	}
}


///////////////////// END CONTEXTUAL MENUS /////////////////////////////
////////////////////////////////////////////////////////////////////////