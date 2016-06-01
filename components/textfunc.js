///////////////////////// TEXT FUNCTIONS ///////////////////////////////
// Functions to edit text directly on the graph. These work on any
// text element.

// Prevent default arrow-key scrolling behavior
window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1 && document.activeElement.tagName!='TEXTAREA' && document.activeElement.tagName!='INPUT' && document.activeElement.tagName!='SELECT') {
        e.preventDefault();
    }
}, false);

// Prevent the backspace key from navigating back.
$(document).unbind('keydown').bind('keydown', function (event) {
    var doPrevent = false;
    if (event.keyCode === 8) {
        var d = event.srcElement || event.target;
        if ((d.tagName.toUpperCase() === 'INPUT' && 
             (
                 d.type.toUpperCase() === 'TEXT' ||
                 d.type.toUpperCase() === 'PASSWORD' || 
                 d.type.toUpperCase() === 'FILE' || 
                 d.type.toUpperCase() === 'SEARCH' || 
                 d.type.toUpperCase() === 'EMAIL' || 
                 d.type.toUpperCase() === 'NUMBER' || 
                 d.type.toUpperCase() === 'DATE' )
             ) || 
             d.tagName.toUpperCase() === 'TEXTAREA') {
            doPrevent = d.readOnly || d.disabled;
        }
        else {
            doPrevent = true;
        }
    }

    if (doPrevent) {
        event.preventDefault();
    }
});

function unselect_text(ev) {
	if (ev.target.nodeName!='text' & dragging==0){

		if(parseFloat(width)<=745){
			$('#help_general')[0].style.display='block'
			$('#help_text')[0].style.display='none'		
		}

		try{
			cursor.remove()
			select_box.remove()
			document.removeEventListener('keypress',press_listener)
			document.removeEventListener('keydown',down_listener)
			selected_text.undrag()
			selected_text.attr({filter:''})
			selected_text.attr({transform:trans})
			active_element.attr({fill:text_element_fill})
			console.log(text_element_fill)
			selected=0
			active_element=undefined
		} catch(err){}
	}
	dragging=0
	try{cursor.remove()}catch(err){}
}

function edit_text(ev) {
	// if a text element is clicked, select it and listen for keypresses.
	if(ev.target.nodeName=='text' || ev.target.nodeName=='tspan'){
		hovered=0

		if(parseFloat(width)<=745){
			$('#help_general')[0].style.display='none'
			$('#help_text')[0].style.display='block'
		}

		// Clean up previous selection if applicable
		try{
			select_box.remove()
			document.removeEventListener('keypress',press_listener)
			document.removeEventListener('keydown',down_listener)
			selected_text.undrag()
			selected_text.attr({filter:''})
			active_element.attr({fill:text_element_fill})
			console.log(text_element_fill)

			// re-rotate previous selection
			selected_text.attr({transform:trans})
		} catch(err){}

		// deal with tspans
		if(ev.target.nodeName=='tspan'){
			selected_text=Snap(ev.target)
			selected_tspan=selected_text
			selected_text=Snap(selected_text.parent())
		} else {
			selected_text=Snap(ev.target)
		}

		// if text is rotated, un-rotate it
		trans=selected_text.attr('transform')
		selected_text.attr({transform:''})
		coords=selected_text.getBBox()
		if(trans==""){trans=trans.string;}

		selected=1

		// place initial cursor
		if (typeof selected_text.attr('text')=='object'){
			tlocation=[selected_text.attr('text')[selected_text.attr('text').length-1].length,selected_text.attr('text').length-1]
		} else{
			tlocation=[selected_text.attr('text').length,0]
		}

		cursor=grapharea.rect(0,0,1,parseInt(selected_text.attr('font-size'))).attr({fill:'white',ident:'cursor'})
		blink()

		position_cursor(selected_text)

		// new selection
		select_box=grapharea.group()
		active_element=selected_text
		try{text_element_fill=selected_text.node.attributes.fill.value;console.log(text_element_fill)}
		catch(err){console.log('not sure what original text color was');text_element_fill='black'}

		// highlight text with a box to visually indicate selection, change text color to white
		coords=selected_text.getBBox()
		high_box=grapharea.rect(coords.x-3,coords.y-3,coords.width+6,coords.height+6).attr({fill:'black',opacity:.8})
		high_coords=high_box.getBBox()
		select_box.append(high_box)
		selected_text.attr({fill:'white'})
		grapharea.append(selected_text)
		grapharea.append(cursor)

		// listener for drag events
		var moveFunc=function(dx,dy){
			dragging=1

			this.attr({
				x:+x+dx,
				y:+y+dy
			})
			this.selectAll("tspan:not(:first-child)").attr({x:+x+dx})

			coords=cursor.getBBox()
			cursor.attr({
				x:coords.x-prevx+dx,
				y:coords.y-prevy+dy			
			})

			box=this.getBBox()
			high_box.attr({
				x:box.x-3,
				y:box.y-3
			})

			prevx=dx
			prevy=dy
		}

        selected_text.drag(moveFunc,function(){x=this.attr('x');y=this.attr('y');prevx=0;prevy=0});

		// set string equal to current text
		string=selected_text.attr('text')

		document.addEventListener('keypress',press_listener)
		document.addEventListener('keydown',down_listener)
	}
}

// *all text* needs to go through this algorithm if you want to center it on
// a y-line. By default, the text box's upper left corner will be the y coord.
// Text *MUST* have the attribute dominant-baseline:before-edge because an auto
// baseline does not have the y-coord you assign to it. Yes, it's weird.
function center_baseline(text) {
	coords=text.getBBox()
	text.attr({y:coords.y-(coords.height/2)})
}

function position_cursor(selected_text){
	cursor.attr({height:selected_text.attr('font-size')})
	console.log('tlocation: ',tlocation,'string: ',selected_text.attr('text'))
	master_coords=selected_text.getBBox()

	if (typeof selected_text.attr('text')=='object'){
		lt=selected_text.attr('text')[tlocation[1]]
		var temp=grapharea.text(0,0,lt).attr(selected_text.attr())
		temp.attr({y:parseFloat(selected_text.attr('y'))+(1.1*tlocation[1]*parseFloat(selected_text.attr('font-size')))})
		temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")

		// getting the correct x is a bit tricky because all possible text-anchors have to be accounted for
		// so place temp and get the x2 of the end of the full string. Then place temp2 and temp3, left-aligned
		// strings, one the full string, one the substring. The difference in x-coordinate between these is
		// the x-offset.
		var temp2=grapharea.text(0,0,lt).attr(selected_text.attr())
		temp2.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		temp2.attr({'text-anchor':'start',x:0})
		coords2=temp2.getBBox()
		
		try{
			var temp3=grapharea.text(0,0,lt.substring(0,tlocation[0])).attr(selected_text.attr())
			temp3.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			temp3.attr({'text-anchor':'start',x:0})
			coords3=temp3.getBBox()

			coords=temp.getBBox()
			cursor.attr({x:coords.x2-(coords2.x2-coords3.x2),y:coords.y})
		} catch(err){}

		if(tlocation[0]==0){
			cursor.attr({x:coords.x2-coords2.x2,y:coords.y})
		} else {
			cursor.attr({x:coords.x2-(coords2.x2-coords3.x2),y:coords.y})
		}

		if(typeof lt=='undefined'){
			selected_text.attr({text:'a'})
			master_coords=selected_text.getBBox()
			selected_text.attr({text:''})
			if(selected_text.attr('text-anchor')=='middle'){x=master_coords.cx}
			if(selected_text.attr('text-anchor')=='start'){x=master_coords.x}
			if(selected_text.attr('text-anchor')=='end'){x=master_coords.x2}
			cursor.attr({x:x,y:master_coords.y+tlocation[1]*1.1*parseFloat(selected_text.attr('font-size'))})
		}

		if(lt==''){
			if(selected_text.attr('text-anchor')=='middle'){x=master_coords.cx}
			if(selected_text.attr('text-anchor')=='start'){x=master_coords.x}
			if(selected_text.attr('text-anchor')=='end'){x=master_coords.x2}
			cursor.attr({x:x,y:master_coords.y+tlocation[1]*1.1*parseFloat(selected_text.attr('font-size'))})
		}

		temp.remove()
		temp2.remove()
		try{temp3.remove()}catch(err){}
	} else{
		lt=selected_text.attr('text')
		var temp=grapharea.text(0,0,lt).attr(selected_text.attr())
		temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		temp.attr({y:parseFloat(selected_text.attr('y'))+(1.1*tlocation[1]*parseFloat(selected_text.attr('font-size')))})

		var temp2=grapharea.text(0,0,lt).attr(selected_text.attr())
		temp2.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		temp2.attr({'text-anchor':'start'})
		coords2=temp2.getBBox()
		var temp3=grapharea.text(0,0,lt.substring(0,tlocation[0])).attr(selected_text.attr())
		temp3.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		temp3.attr({'text-anchor':'start'})
		coords3=temp3.getBBox()

		coords=temp.getBBox()
		cursor.attr({x:coords.x2-(coords2.x2-coords3.x2),y:coords.y})

		if(tlocation[0]==0){cursor.attr({x:master_coords.x})}

		temp.remove()
		temp2.remove()
		temp3.remove()
	}
}

// listener for arrow key presses, space, backspace, bold/italic, and control-sequences
var down_listener=function(ev) {
	coords=selected_text.getBBox()
	high_coords=high_box.getBBox()
	var keycode = (ev.keyCode)
	// console.log('down',keycode,ev.shiftKey)
	// up and down movement and font sizing
	if(keycode==40 && ev.shiftKey==true){selected_text.attr({y:parseFloat(selected_text.attr('y'))+1});high_box.attr({y:high_coords.y+1});}
	if(keycode==38 && ev.shiftKey==true){selected_text.attr({y:parseFloat(selected_text.attr('y'))-1});high_box.attr({y:high_coords.y-1});}
	if(keycode==40 && ev.shiftKey==false){
		size=selected_text.attr('font-size')
		selected_text.attr({'font-size':parseInt(size)-1});
		selected_text.selectAll("tspan:not(:first-child)").attr({dy:1.1*parseFloat(selected_text.attr('font-size'))})
		coords=selected_text.getBBox()
		high_box.attr({y:coords.y-3,x:coords.x-3,width:coords.width+6,height:coords.height+6})
		position_cursor(selected_text)
	}
	if(keycode==38 && ev.shiftKey==false){
		size=selected_text.attr('font-size')
		selected_text.attr({'font-size':parseInt(size)+1});
		selected_text.selectAll("tspan:not(:first-child)").attr({dy:1.1*parseFloat(selected_text.attr('font-size'))})
		coords=selected_text.getBBox()
		high_box.attr({y:coords.y-3,x:coords.x-3,width:coords.width+6,height:coords.height+6})
		position_cursor(selected_text)
	}

	// left and right movement - more complicated because you have to check the text-anchor for movement. shift+ control opacity
	if(keycode==39 || keycode==37){
		if(ev.shiftKey==true){
			if((selected_text.node.attributes.style.value).indexOf('middle')!=-1){x=coords.cx}
			else if((selected_text.node.attributes.style.value).indexOf('start')!=-1){x=coords.x}
			else if((selected_text.node.attributes.style.value).indexOf('end')!=-1){x=coords.x2}
			else{x=coords.x}
			
			if(keycode==39){
				selected_text.attr({x:x+1});
				selected_text.selectAll("tspan:not(:first-child)").attr({x:x+1})
				high_box.attr({x:high_coords.x+1})
			}
			if(keycode==37){
				selected_text.attr({x:x-1});
				selected_text.selectAll("tspan:not(:first-child)").attr({x:x-1})
				high_box.attr({x:high_coords.x-1})
			}
		}

		// move cursor
		if(ev.shiftKey==false){
			// opacity=parseFloat(selected_text.attr('opacity'))

			if(keycode==39){
				if (typeof string=='object'){
					cursor.attr({opacity:1})
					if(tlocation[0]==string[tlocation[1]].length){
						if (typeof string=='object'){
							if(tlocation[1]<string.length-1){
								tlocation[1]=tlocation[1]+1
								if(tlocation[1]>string.length-1){tlocation[1]=string.length-1}
								tlocation[0]=0
							}
						} else{
							// tlocation[0]=tlocation[0]+1
						}
					} else{
						tlocation[0]=tlocation[0]+1
					}
				} else{
					cursor.attr({opacity:1})
					tlocation[0]=tlocation[0]+1
				}
				// selected_text.attr({opacity:opacity+.1})
			}
			if(keycode==37){
				if (typeof string=='object'){
					cursor.attr({opacity:1})
					if(tlocation[0]==0){
						tlocation[1]=tlocation[1]-1
						try{tlocation[0]=string[tlocation[1]].length}catch(err){}
						if(tlocation[1]<0){
							tlocation[1]=0
							tlocation[0]=0
						}
					} else{
						tlocation[0]=tlocation[0]-1
					}
				} else {
					cursor.attr({opacity:1})
					tlocation[0]=tlocation[0]-1
				}
				// selected_text.attr({opacity:opacity-.1})
			}
			if(tlocation[0]<0){
				tlocation[0]=0
			}
			position_cursor(selected_text)
		}
	}

	// spacebar and backspace handling
	if(keycode==32 || keycode==8){
		if(keycode==32){
			// Handle spacebar
			if (typeof string=='object'){
				string[tlocation[1]]=string[tlocation[1]].slice(0,tlocation[0])+String.fromCharCode(keycode)+string[tlocation[1]].slice(tlocation[0],tlocation[1].length)
				selected_text.attr({text:string})
				selected_text.selectAll("tspan:not(:first-child)").attr({x:selected_text.attr('x'),dy:1.1*parseFloat(selected_text.attr('font-size'))})
			} else{
				string=string.slice(0,tlocation[0])+String.fromCharCode(keycode)+string.slice(tlocation[0],string.length)
				selected_text.attr({text:string})
			}
			tlocation[0]=tlocation[0]+1
		}
		if(keycode==8){
			// Handle backspace
			if (typeof string=='object'){
				if(tlocation[0]>0){
					t=string[tlocation[1]]
					string[tlocation[1]]=t.slice(0,tlocation[0]-1)+t.slice(tlocation[0],t.length)
					tlocation[0]=tlocation[0]-1
				} else if (tlocation[0]==0) {
					tlocation[0]=string[tlocation[1]-1].length
					string[tlocation[1]-1]=string[tlocation[1]-1]+string[tlocation[1]]
					string.splice(tlocation[1],1)
					tlocation[1]=tlocation[1]-1
				}

				selected_text.attr({text:string})
				selected_text.selectAll("tspan:not(:first-child)").attr({x:selected_text.attr('x'),dy:1.1*parseFloat(selected_text.attr('font-size'))})
				
			} else {
				string=string.slice(0,tlocation[0]-1)+string.slice(tlocation[0],string.length)
				selected_text.attr({text:string})
				tlocation[0]=tlocation[0]-1
			}
		}

		if(string.length>0){
			coords=selected_text.getBBox()
			yheight=string.length*parseFloat(selected_text.attr('font-size'))*1.1
			if (typeof string=='object'){
				high_box.attr({x:coords.x-3,y:coords.y-3,width:coords.width+6,height:yheight+6})
			} else {
				high_box.attr({x:coords.x-3,y:coords.y-3,width:coords.width+6,height:coords.height+6})
			}

			high_coords=high_box.getBBox()
		}

		if(tlocation[0]<0){tlocation[0]=0}
	}

	// Bold/italic handling (control+B, control+I)
	// there is something wrong with this. It disables the ability to save as a png. Right click works fine
	// with the exact same code. Text elements edited by right-click and by control-B have exactly the same
	// code if you look at them. Control+I does not cause problems. So yeah, I have no idea what the fuck.
	if(keycode==66 && ev.ctrlKey==true){
		try{if(selected_text.nodeName=='tspan'){
			selected_text=selected_text.parent()
		}}catch(err){}
		console.log(selected_text)
		fontf=selected_text.attr('font-weight')
		if(fontf==400 || fontf=='normal'){
			selected_text.attr({'font-weight':600})
		}
		if(fontf==600 || fontf=='bold'){
			selected_text.attr({'font-weight':400})
		}
	}

	if(keycode==73 && ev.ctrlKey==true){
		style=selected_text.attr('font-style')
		if(style=='normal'){
			selected_text.attr({'font-style':'italic'})
		}
		if(style!='normal'){
			selected_text.attr({'font-style':'normal'})
		}
	}

	high_coords=high_box.getBBox()
	coords=selected_text.getBBox()
	position_cursor(selected_text)
}

// listener for text
var press_listener=function(ev) {
	var keycode = (ev.charCode)
	var modcode = (ev.keyCode)
	// console.log(keycode)
	// handle carriage returns
	if(ev.ctrlKey!=true){
		if(keycode==13){
			if (typeof string=='object'){
				if(tlocation[0]==string[tlocation[1]].length){
					string.splice(tlocation[1]+1,0,'')
					selected_text.attr({text:string})
					selected_text.selectAll("tspan:not(:first-child)").attr({x:selected_text.attr('x'),dy:1.1*parseFloat(selected_text.attr('font-size'))})
					tlocation[1]=tlocation[1]+1
					tlocation[0]=0
				} else {
					string.splice(tlocation[1]+1,0,string[tlocation[1]].substring(tlocation[0],string[tlocation[1]].length))
					string[tlocation[1]]=string[tlocation[1]].substring(0,tlocation[0])
					selected_text.attr({text:string})
					selected_text.selectAll("tspan:not(:first-child)").attr({x:selected_text.attr('x'),dy:1.1*parseFloat(selected_text.attr('font-size'))})
					tlocation[1]=tlocation[1]+1
					tlocation[0]=0
				}
			} else {
				if(tlocation[0]==string.length){
					string=[string]
					string.push('')
					selected_text.attr({text:string})
					selected_text.selectAll("tspan:not(:first-child)").attr({x:selected_text.attr('x'),dy:1.1*parseFloat(selected_text.attr('font-size'))})
					tlocation[1]=tlocation[1]+1
					tlocation[0]=0
				} else {
					string=[string]
					string.push(string[0].substring(tlocation[0],string[0].length))
					string[0]=string[0].substring(0,tlocation[0])
					selected_text.attr({text:string})
					selected_text.selectAll("tspan:not(:first-child)").attr({x:selected_text.attr('x'),dy:1.1*parseFloat(selected_text.attr('font-size'))})
					tlocation[1]=tlocation[1]+1
					tlocation[0]=0
				}
			}

			coords=selected_text.getBBox()
			yheight=string.length*parseFloat(selected_text.attr('font-size'))*1.1
			high_box.attr({x:coords.x-3,y:coords.y-3,width:coords.width+6,height:yheight+6})
		} else{
			// everything else
			if(typeof string=='object'){
				// string[string.length-1]=string[string.length-1]+String.fromCharCode(keycode)
				string[tlocation[1]]=string[tlocation[1]].slice(0,tlocation[0])+String.fromCharCode(keycode)+string[tlocation[1]].slice(tlocation[0],tlocation[1].length)
				selected_text.attr({text:string})
				selected_text.selectAll("tspan:not(:first-child)").attr({x:selected_text.attr('x'),dy:1.1*parseFloat(selected_text.attr('font-size'))})

				coords=selected_text.getBBox()
				high_box.attr({x:coords.x-3,y:coords.y-3,width:coords.width+6,height:coords.height+6})
				high_coords=high_box.getBBox()
				tlocation[0]=tlocation[0]+1
			} else {
				string=string.slice(0,tlocation[0])+String.fromCharCode(keycode)+string.slice(tlocation[0],string.length)
				selected_text.attr({text:string})

				coords=selected_text.getBBox()
				high_box.attr({x:coords.x-3,y:coords.y-3,width:coords.width+6,height:coords.height+6})
				high_coords=high_box.getBBox()
				tlocation[0]=tlocation[0]+1
			}
		}
		position_cursor(selected_text)
	}
}

///////////////////// END TEXT FUNCTIONS ///////////////////////////////
////////////////////////////////////////////////////////////////////////