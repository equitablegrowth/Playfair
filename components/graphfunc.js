///////////////////////// UPDATE GRAPH /////////////////////////////////
// These functions update the graph whenever some key characteristic is
// altered if there is enough information filled out to draw a graph in
// the first place. The only hard requirements are the x- and y- var
// selects. To figure out the kind of graph that should be drawn, get
// the currently active tab or, if design/settings is active, then 
// reference the global variable graph_type.
//
// Basically every form element on the page should call redraw() either
// directly or after some other function runs (like x_vars or y_vars).
// redraw will check to see if a graph can be drawn and what type of
// graph can be drawn, and then execute the appropriate functions.

function changedimensions() {
	if($('#gwidth').val()!=""){
		width=$('#gwidth').val()
	}
	if($('#gheight').val()!=""){
		height=$('#gheight').val()
	}
}

// preview creates the geom_dict that would be used by redraw if it was invoked
// this is primarily for creating key previews, which require some knowledge of
// what is being graphed.
function preview() {
	// set up geom_dict by looking at all the stuff in chart and gathering variables as appropriate
	var geom_dict={}
	var ready=0

	if($("#point_select_x").val()!='none' & $("#point_select_y").val()!='none'){
		var x_var=$("#point_select_x").val()
		var y_var=$("#point_select_y").val()

		var color=$("#point_select_color").val()
		var size=$("#point_select_size").val()
		var label=$("#point_select_label").val()
		var type=$("#point_select_types").val()

		var pointlabel=document.getElementById('labels').checked
		// var point_type=$('input[name=linepoint]:checked').val()

		geom_dict['point']={'xvar':x_var,'yvar':y_var,'labels':label,'size':size,'labelall':pointlabel,'grouping':{'color':color,'type':type}}
		ready=1
	}

	if($("#segment_select_xstart").val()!='none' & $("#segment_select_ystart").val()!='none' & $("#segment_select_xend").val()!='none' & $("#segment_select_yend").val()!='none'){
		var x_start=$("#segment_select_xstart").val()
		var y_start=$("#segment_select_ystart").val()
		var x_end=$("#segment_select_xend").val()
		var y_end=$("#segment_select_yend").val()

		var color=$("#segment_select_color").val()
		var size=$("#segment_select_size").val()
		var type=$("#segment_select_type").val()

		geom_dict['segment']={'xvar':x_start,'yvar':y_start,'xvar2':x_end,'yvar2':y_end,'size':size,'grouping':{'color':color,'type':type}}
		ready=1
	}

	if(document.getElementById('trend_text').value!==''){
		var trends=document.getElementById('trend_text').value
		var trends=trends.split(']],[[')

		for(var i=0;i<trends.length;i++){
			var temp=trends[i].split('],[')

			for(var j=0;j<temp.length;j++){
				temp[j]=temp[j].replace(/\[/g,'')
				temp[j]=temp[j].replace(/]/g,'')
				temp[j]=temp[j].split(',')
			}

			trends[i]=temp
		}

		geom_dict['trend']={'trends':trends}
		ready=1
	}

	if($("#line_select_x").val()!='none' & $("#line_select_y").val()!='none'){
		var x_var=$("#line_select_x").val()
		var y_var=$("#line_select_y").val()

		var connect=$("#line_select_connect").val()
		var color=$("#line_select_color").val()
		var size=$("#line_select_size").val()
		var type=$("#line_select_type").val()

		geom_dict['line']={'xvar':x_var,'yvar':y_var,'connect':connect,'size':size,'grouping':{'color':color,'type':type}}
		ready=1
	}

	if($("#step_select_x").val()!='none' & $("#step_select_y").val()!='none'){
		var x_var=$("#step_select_x").val()
		var y_var=$("#step_select_y").val()

		var connect=$("#step_select_connect").val()
		var color=$("#step_select_color").val()
		var size=$("#step_select_size").val()
		var type=$("#step_select_type").val()

		geom_dict['step']={'xvar':x_var,'yvar':y_var,'connect':connect,'size':size,'grouping':{'color':color,'type':type}}
		ready=1
	}

	if($("#bar_select_x").val()!='none' & $("#bar_select_y").val()!='none'){
		var x_var=$("#bar_select_x").val()
		var y_var=$("#bar_select_y").val()

		var color=$("#bar_select_color").val()
		var barspace=document.getElementById('spacing').checked
		var orientation=$('input[name=orientation]:checked').val()

		geom_dict['bar']={'xvar':x_var,'yvar':y_var,spacing:barspace,'orientation':orientation,'grouping':{'color':color}}
		ready=1
	}

	if($("#sbar_select_x").val()!='none' & $("#sbar_select_y").val()!='none' & $("#sbar_select_color").val()!='none'){
		var x_var=$("#sbar_select_x").val()
		var y_var=$("#sbar_select_y").val()

		var color=$("#sbar_select_color").val()
		var barspace=document.getElementById('sspacing').checked
		var orientation=$('input[name=sorientation]:checked').val()

		geom_dict['stackedbar']={'xvar':x_var,'yvar':y_var,spacing:barspace,'orientation':orientation,'grouping':{'color':color}}
		ready=1
	}

	if($("#area_select_x").val()!='none' & $("#area_select_y").val()!='none'){
		var x_var=$("#area_select_x").val()
		var y_var=$("#area_select_y").val()

		var color=$("#area_select_color").val()

		geom_dict['area']={'xvar':x_var,'yvar':y_var,'grouping':{'color':color}}
		ready=1
	}

	if($("#text_select_x").val()!='none' & $("#text_select_y").val()!='none'){
		var x_var=$("#text_select_x").val()
		var y_var=$("#text_select_y").val()

		var size=$("#text_select_size").val()
		var text=$("#text_select_text").val()

		geom_dict['text']={'xvar':x_var,'yvar':y_var,'size':size,'text':text}
		ready=1
	}

	if($("#shade_select_x").val()!=='' | $("#shade_select_y").val()!=='' | document.getElementById('recessions').checked==true){
		var x_var=$("#shade_select_x").val()
		var y_var=$("#shade_select_y").val()
		var label=$("#shade_label").val()

		if(x_var!==''){
			var temp=x_var.split('],[')
			x_var=[]
			for(var i=0;i<temp.length;i++){
				temp[i]=temp[i].replace('[','')
				temp[i]=temp[i].replace(']','')
				temp[i]=temp[i].split(',')
			}

			if(moment(temp[0][0],["MM-DD-YYYY","MM/DD/YYYY","YYYY-MM-DD","MM-DD-YY","MM/DD/YY","MMMM YYYY","MMMM DD YYYY","MMMM DD, YYYY","MMMM, YYYY","YYYYqQ"],true).isValid()==true){
				for(var i=0;i<temp.length;i++){
					x_var.push([new Date(temp[i][0]),new Date(temp[i][1])])
				}
			} else {
				for(var i=0;i<temp.length;i++){
					x_var.push([parseFloat(temp[i][0]),parseFloat(temp[i][1])])
				}
			}
		}

		if(y_var!==''){
			var temp=y_var.split('],[')
			y_var=[]
			for(var i=0;i<temp.length;i++){
				temp[i]=temp[i].replace('[','')
				temp[i]=temp[i].replace(']','')
				temp[i]=temp[i].split(',')
			}

			if(moment(temp[0][0],["MM-DD-YYYY","MM/DD/YYYY","YYYY-MM-DD","MM-DD-YY","MM/DD/YY","MMMM YYYY","MMMM DD YYYY","MMMM DD, YYYY","MMMM, YYYY","YYYYqQ"],true).isValid()==true){
				for(var i=0;i<temp.length;i++){
					y_var.push([new Date(temp[i][0]),new Date(temp[i][1])])
				}
			} else {
				for(var i=0;i<temp.length;i++){
					y_var.push([parseFloat(temp[i][0]),parseFloat(temp[i][1])])
				}
			}
		}

		if(document.getElementById('recessions').checked==true){
			var temp=[['June 1 1857','December 1 1858'],['October 1 1860','June 1 1861'],['April 1 1865','December 1 1867'],['June 1 1869','December 1 1870'],['October 1 1873','March 1 1879'],['March 1 1882','May 1 1885'],['March 1 1887','April 1 1888'],['July 1 1890','May 1 1891'],['January 1 1893','June 1 1894'],['December 1 1895','June 1 1897'],['June 1 1899','December 1 1900'],['September 1 1902','August 1 1904'],['May 1 1907','June 1 1908'],['January 1 1910','January 1 1912'],['January 1 1913','December 1 1914'],['August 1 1918','March 1 1919'],['January 1 1920','July 1 1921'],['May 1 1923','July 1 1924'],['October 1 1926','November 1 1927'],['August 1 1929','March 1 1933'],['May 1 1937','June 1 1938'],['February 1 1945','October 1 1945'],['November 1 1948','October 1 1949'],['July 1 1953','May 1 1954'],['August 1 1957','April 1 1958'],['April 1 1960','February 1 1961'],['December 1 1969','November 1 1970'],['November 1 1973','March 1 1975'],['January 1 1980','July 1 1980'],['July 1 1981','November 1 1982'],['July 1 1990','March 1 1991'],['March 1 2001','November 1 2001'],['December 1 2007','June 1 2009']]
			var x_var=[]
			for(var i=0;i<temp.length;i++){
				x_var.push([new Date(temp[i][0]),new Date(temp[i][1])])
			}
		}

		geom_dict['shade']={'xarr':x_var,'yarr':y_var,'legend_head':label}
		console.log(geom_dict)
		ready=1
	}

	if($("#rect_ystart").val()!=='none' & $("#rect_xstart").val()!=='none' & $("#rect_yend").val()!=='none' & $("#rect_xend").val()!=='none'){
		var x_start=$("#rect_xstart").val()
		var y_start=$("#rect_ystart").val()
		var x_end=$("#rect_xend").val()
		var y_end=$("#rect_yend").val()

		var color=$("#rect_color").val()

		geom_dict['rect']={'xvar':x_start,'yvar':y_start,'xvar2':x_end,'yvar2':y_end,'grouping':{'color':color}}
		ready=1
	}

	if($("#bounded_select_max").val()!=='none' & $("#bounded_select_min").val()!=='none' & $("#bounded_select_x").val()!=='none'){
		var y_max=$("#bounded_select_max").val()
		var y_min=$("#bounded_select_min").val()
		var x=$("#bounded_select_x").val()

		var color=$("#bounded_select_color").val()

		geom_dict['bounds']={'xvar':x,'yvar':y_max,'ymin':y_min,'grouping':{'color':color}}
		ready=1
	}

	return [geom_dict,ready]
}

// redraw is the main graphing setup function. Gets variable values and passes them to playfair.js
function redraw(keep) {
	// try{
		// set size
		$('#grapharea').attr('height',height)
		$('#grapharea').attr('width',width)

		if (parseFloat(width)>745){	
			$('#help_general')[0].style.display='none'
			$('#help_text')[0].style.display='none'
		} else {
			$('#help_general')[0].style.display='block'
			$('#help_text')[0].style.display='none'	
		}

		// set up geom_dict by looking at all the stuff in chart and gathering variables as appropriate
		var prev=preview()
		var ready=prev[1]
		var geom_dict=prev[0]

		// grab all text elements from the design tab
		// replace the apostrophe character from word if applicable: Source’s
		var hed=$("#hed").val()
		var dek=$("#dek").val()
		var source=$("#source").val()
		var note=$("#note").val()
		var xlabel=$("#xlabel").val()
		var ylabel=$("#ylabel").val()

		if (ready==1) {
			// check legends box and retrieve whatever is in there as an object to pass to playfair
			var legtitle=$("#legtitle").val()
			var legwidth=$("#legwidth").val()
			var legend=[[legtitle,legwidth]]
			var g=0
			var o=0
			$('#PREVIEW ul').each(function(){
				var i=0
				$(this).find('li').each(function(){
					var ligeoms=$(this).attr('data-geom').split(',')
					console.log(ligeoms)
					for(var i=0;i<ligeoms.length;i++){
						var item={'geom':ligeoms[i],'grouping':$(this).attr('data-grouping'),'group_value':$(this).attr('data-group_value'),group_variable:$(this).attr('data-group_variable'),xvar:$(this).attr('data-xvar'),yvar:$(this).attr('data-yvar'),groupnumeric:$(this).attr('data-groupnumeric'),position:i,lgroup:g,overall:o}
						legend.push(item)
					}
					i=i+1
					o=o+1
				})
				g=g+1
			})

			// initialize playfair.js. First use init_graph to set up workspace, then call the
			// data method to set up data and variables.

			// Why not just use.clear()? Because it will destroy all the embedded font declarations
			// this is apparently a known bug in Snap
			if(keep){
				grapharea.selectAll('rect:not([annotation])').remove()
				grapharea.selectAll('text:not([annotation])').remove()
				grapharea.selectAll('line:not([annotation])').remove()
				grapharea.selectAll('circle:not([annotation])').remove()
				grapharea.selectAll('path:not([annotation])').remove()
				grapharea.selectAll('image:not([annotation])').remove()
			} else {
				grapharea.selectAll('rect').remove()
				grapharea.selectAll('text').remove()
				grapharea.selectAll('line').remove()
				grapharea.selectAll('circle').remove()
				grapharea.selectAll('path').remove()
				grapharea.selectAll('image').remove()
			}

			chartobject=playfair.init_graph(grapharea,0,0,width,height)
			console.log(geom_dict)
			chartobject.data(final_data,geom_dict)

			// initialize styling, the header, and the footer. The footer loads an image (the logo)
			// and so callouts after it need to be written as callbacks to the footer function.
			// chartobject.style()

			// get state of all UI style toggles and apply to style of graph axes
			var xgrid=document.getElementById('xgrid').checked
			var ygrid=document.getElementById('ygrid').checked
			var xminorgrid=document.getElementById('xminorgrid').checked
			var yminorgrid=document.getElementById('yminorgrid').checked

			// legend
			var legendloc=$('input[name=key]:checked').val()

			// barchart specific
			barspace=document.getElementById('spacing').checked

			// point type
			point_type=$('input[name=linepoint]:checked').val()

			// create the style object
			if(typeof theme !== 'undefined'){
				style=default_style(theme)
			} else {
				style=default_style()
			}

			// logo
			var logoloc=$('input[name=logo]:checked').val()
			if(logoloc==='nologo'){
				style.logo.logo=0
			}

			// which grids should be drawn
			if (xgrid===false){
				style.x_grids.xgrid_opacity=0
			}
			if (ygrid===false){
				style.y_grids.ygrid_opacity=0
			}
			if (xminorgrid===false){
				style.x_grids.xgrid_minoropacity=0
			}
			if (yminorgrid===false){
				style.y_grids.ygrid_minoropacity=0
			}

			// point style
			if(barspace===false){style.bar_geom['barchart_width']=1}
			style.legends['legend_location']=legendloc

			if (point_type=='pointpoint'){
				style.point_geom['point_size']=2
				style.point_geom['point_strokewidth']=0
				style.point_geom['point_fillopacity']=1
			} else if (point_type=='pointcircle'){
				style.point_geom['point_size']=4
				style.point_geom['point_strokewidth']=2
				style.point_geom['point_fillopacity']=.2
			} else if (point_type=='pointcircleopen'){
				style.point_geom['point_size']=3
				style.point_geom['point_strokewidth']=1
				style.point_geom['point_fillopacity']=0
			}

			// get style settings from the settings tab. These will override settings elsewhere in the document if they have been filled in
			for(var group in style){
				for(var sub in style[group]){
					var set=$("#"+sub).val()
					if (set!='' & set!==undefined){
						if (isNaN(parseFloat(set))===false){
							style[group][sub]=parseFloat(set)
						} else {
							try {
								JSON.parse(set)
								set.replace("'",'"')
								style[group][sub]=JSON.parse(set)
							} catch(err){
								style[group][sub]=set
							}
						}
					}
				}
			}

			chartobject.style(style)
			change_colormenu(style)
			change_linetypemenu(style)

			// initialize axes
			chartobject.xaxis({'label':xlabel,'number_of_ticks':5,'decimal':undefined,'format':undefined})
			chartobject.yaxis({'label':ylabel,'number_of_ticks':5,'decimal':undefined,'format':undefined})

			chartobject.prepheader(hed,dek)
			chartobject.prepfooter(source,note,function(){
				// draw the initial graph, dependent on current value of graph_type
				if (graph_type=='Chart') {
					if ($('#customx').val()!='' && $("#customxcheck").prop('checked')==true){
						chartobject.xarray=$('#customx').val().split(',')
					}
					if ($('#customy').val()!='' && $("#customycheck").prop('checked')==true){
						chartobject.yarray=$('#customy').val().split(',')
					}

					if ($('#xlimits').val()!='' && $("#xlimitscheck").prop('checked')==true){
						chartobject.xlimits=$('#xlimits').val().split(',')
					} 
					if ($('#ylimits').val()!='' && $("#ylimitscheck").prop('checked')==true){
						chartobject.ylimits=$('#ylimits').val().split(',')
					} 

					console.log(chartobject)
					chartobject.chart(legend)

					// push the calculated yaxis and xaxis to the front-end interface boxes
					if(Object.prototype.toString.call(chartobject.xarray[0])==='[object Date]'){
						temp=[]
						for(var i=0;i<chartobject.xarray.length;i++){
							temp.push((chartobject.xarray[i].getUTCMonth()+1)+'/'+chartobject.xarray[i].getUTCDate()+'/'+chartobject.xarray[i].getUTCFullYear())
						}
						$('#customx').val(temp)
					} else{
						$('#customx').val(chartobject.xarray)
					}

					if(Object.prototype.toString.call(chartobject.yarray[0])==='[object Date]'){
						temp=[]
						for(var i=0;i<chartobject.yarray.length;i++){
							temp.push((chartobject.yarray[i].getUTCMonth()+1)+'/'+chartobject.yarray[i].getUTCDate()+'/'+chartobject.yarray[i].getUTCFullYear())
						}
						$('#customy').val(temp)
					} else{
						$('#customy').val(chartobject.yarray)
					}
				}

				if(keep){
					// bring annotations to front
					var ann=grapharea.selectAll('[annotation]')
					for(var i=0;i<ann.length;i++){
						if(ann[i].attr('arrow')){
							var color=ann[i].attr('stroke')
							var temparrow = grapharea.path('M0,0 L0,4 L6,2 L0,0').attr({fill:color})
							var tempamarker = temparrow.marker(0,0,6,4,0,2).attr({fill:color});
							ann[i].attr({'marker-end':tempamarker})
						}
						grapharea.append(ann[i])
					}
				}
			})
		} 
		else {
			alert("Nothing to graph. Check your chart tabs to make sure all necessary variables are specified.")
			throw 'Nothing to graph!'
		}
	// } catch(err){
	// 	alert(err)
	// 	console.log(new Error().stack)
	// 	console.trace()
	// }
}

/////////////////////// END UPDATE GRAPH ///////////////////////////////
////////////////////////////////////////////////////////////////////////