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

// redraw is the main graphing setup function. Gets variable values and passes them to playfair.js
function redraw() {
	console.log(final_data)
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
		var geom_dict={}
		var ready=0

		if($("#point_select_x").val()!='none' & $("#point_select_y").val()!='none'){
			var x_var=$("#point_select_x").val()
			var y_var=$("#point_select_y").val()

			var color=$("#point_select_color").val()
			var size=$("#point_select_size").val()
			var label=$("#point_select_label").val()
			var type=$("#point_select_type").val()

			var pointlabel=document.getElementById('labels').checked
			// var point_type=$('input[name=linepoint]:checked').val()

			geom_dict['point']={'xvar':x_var,'yvar':y_var,'labels':label,'labelall':pointlabel,'grouping':{'color':color,'size':size,'type':type}}
			ready=1
		}

		if($("#line_select_x").val()!='none' & $("#line_select_y").val()!='none'){
			var x_var=$("#line_select_x").val()
			var y_var=$("#line_select_y").val()

			var connect=$("#line_select_connect").val()
			var color=$("#line_select_color").val()
			var size=$("#line_select_size").val()
			var type=$("#line_select_type").val()

			geom_dict['line']={'xvar':x_var,'yvar':y_var,'connect':connect,'grouping':{'color':color,'size':size,'type':type}}
			ready=1
		}

		if($("#bar_select_x").val()!='none' & $("#bar_select_y").val()!='none'){
			var x_var=$("#bar_select_x").val()
			var y_var=$("#bar_select_y").val()

			var color=$("#bar_select_color").val()
			var bargroup=$("#bar_select_group").val()
			var barspace=document.getElementById('spacing').checked

			geom_dict['bar']={'xvar':x_var,'yvar':y_var,spacing:barspace,'orientation':'vertical','grouping':{'color':color,'bargroup':bargroup}}
			ready=1
		}

		// grab all text elements from the design tab
		// replace the apostrophe character from word if applicable: Source’s
		var hed=$("#hed").val().replace("’","'")
		var dek=$("#dek").val().replace(/\uFFFD/g,"'")
		var source=$("#source").val().replace(/\uFFFD/g,"'")
		var note=$("#note").val().replace(/\uFFFD/g,"'")
		var xlabel=$("#xlabel").val().replace(/\uFFFD/g,"'")
		var ylabel=$("#ylabel").val().replace(/\uFFFD/g,"'")

		if (ready==1) {

			// initialize playfair.js. First use init_graph to set up workspace, then call the
			// data method to set up data and variables.

			// Why not just use.clear()? Because it will destroy all the embedded font declarations
			// this is apparently a known bug in Snap
			grapharea.selectAll('rect').remove()
			grapharea.selectAll('text').remove()
			grapharea.selectAll('line').remove()
			grapharea.selectAll('circle').remove()
			grapharea.selectAll('path').remove()
			grapharea.selectAll('image').remove()

			chartobject=playfair.init_graph(grapharea,0,0,width,height)
			console.log(geom_dict)
			chartobject.data(final_data,geom_dict)

			// initialize styling, the header, and the footer. The footer loads an image (the logo)
			// and so callouts after it need to be written as callbacks to the footer function.
			chartobject.style()

			// get state of all UI style toggles and apply to style of graph axes
			var xgrid=document.getElementById('xgrid').checked
			var ygrid=document.getElementById('ygrid').checked
			var xminorgrid=document.getElementById('xminorgrid').checked
			var yminorgrid=document.getElementById('yminorgrid').checked

			// legend
			var legendloc=$('input[name=key]:checked').val()

			// // barchart specific
			barspace=document.getElementById('spacing').checked

			//point type
			point_type=$('input[name=linepoint]:checked').val()

			// create the style object
			if(typeof theme !== 'undefined'){
				style=theme
			} else {
				style={}
			}

			// which grids should be drawn
			var grids=[xgrid,ygrid,xminorgrid,yminorgrid]
			var attributes=['xgrid_opacity','ygrid_opacity','xgrid_minoropacity','ygrid_minoropacity']
			for(var i=0;i<grids.length;i++){
				if(grids[i]==true){style[attributes[i]]=1}
				if(grids[i]==false){style[attributes[i]]=0}	
			}

			// point style
			if(barspace==false){style['barchart_width']=1}
			style['legend_location']=legendloc

			if (point_type=='pointpoint'){
				style['point_size']=2
				style['point_strokewidth']=0
				style['point_fillopacity']=1
			} else if (point_type=='pointcircle'){
				style['point_size']=4
				style['point_strokewidth']=2
				style['point_fillopacity']=.2
			} else if (point_type=='pointcircleopen'){
				style['point_size']=3
				style['point_strokewidth']=1
				style['point_fillopacity']=0
			}

			// get style settings from the settings tab. These will override settings elsewhere in the document if they have been filled in
			settings=['linechart_strokeopacity','top_margin','bottom_margin','left_margin','right_margin','head_height','footer_height','hedsize','hedweight','hedface','deksize','dekweight','dekface','datasize','dataweight','dataface','annotatesize','annotateweight','annotateface','sourcesize','sourceweight','sourceface','notesize','noteweight','noteface','chartfill','chart_toppad','chart_bottompad','chart_leftpad','chart_rightpad','headerfill','header_toppad','header_bottompad','header_leftpad','header_rightpad','footerfill','footer_toppad','footer_bottompad','footer_leftpad','footer_rightpad','xgrid_fill','xgrid_zerofill','xgrid_minorfill','xgrid_thickness','xgrid_zerothickness','xgrid_minorthickness','xgrid_dasharray','xgrid_zerodasharray','xgrid_minordasharray','xgrid_opacity','xgrid_zeroopacity','xgrid_minoropacity','ygrid_fill','ygrid_zerofill','ygrid_minorfill','ygrid_thickness','ygrid_zerothickness','ygrid_minorthickness','ygrid_dasharray','ygrid_zerodasharray','ygrid_minordasharray','ygrid_opacity','ygrid_zeroopacity','ygrid_minoropacity','xtick_textsize','xtick_textweight','xtick_textface','xtick_maxsize','xtick_length','xtick_thickness','xtick_fill','xtick_to_xlabel','xtick_to_xaxis','ytick_textsize','ytick_textweight','ytick_textface','ytick_maxsize','ytick_length','ytick_thickness','ytick_fill','ytick_to_ylabel','ytick_to_yaxis','xlabel_textsize','xlabel_textweight','xlabel_textface','ylabel_textsize','ylabel_textweight','ylabel_textface','legend_location','legend_maxwidth','legend_textsize','legend_textweight','legend_textface','legend_toppad','legend_bottompad','legend_rightpad','legend_leftpad','legend_elementsize','legend_elementpad','legend_floatbackground','legend_floatthickness','legend_floatstroke','legend_floatpad','diverging_color','sequential_color','qualitative_color','barchart_width','trend_width','trend_fill','trend_textface','trend_textweight','trend_textsize','trend_textcolor','trend_linetotext','point_size','point_strokewidth','point_fillopacity','point_maxsize','point_minsize']
			numerical=['linechart_strokeopacity','top_margin','bottom_margin','left_margin','right_margin','head_height','footer_height','chart_toppad','chart_bottompad','chart_leftpad','chart_rightpad','header_toppad','header_bottompad','header_leftpad','header_rightpad','footer_toppad','footer_bottompad','footer_leftpad','footer_rightpad','xgrid_thickness','xgrid_zerothickness','xgrid_minorthickness','xgrid_opacity','xgrid_zeroopacity','xgrid_minoropacity','ygrid_thickness','ygrid_zerothickness','ygrid_minorthickness','ygrid_opacity','ygrid_zeroopacity','ygrid_minoropacity','xtick_maxsize','xtick_length','xtick_thickness','xtick_to_xlabel','xtick_to_xaxis','ytick_maxsize','ytick_length','ytick_thickness','ytick_to_ylabel','ytick_to_yaxis','legend_maxwidth','legend_toppad','legend_bottompad','legend_rightpad','legend_leftpad','legend_elementsize','legend_elementpad','legend_floatthickness','legend_floatstroke','legend_floatpad','barchart_width','trend_width','trend_linetotext','point_size','point_strokewidth','point_fillopacity','point_maxsize','point_minsize']
			json=['xgrid_dasharray','xgrid_zerodasharray','xgrid_minordasharray','ygrid_dasharray','ygrid_zerodasharray','ygrid_minordasharray','diverging_clor','sequential_color','qualitative_color']
			for(var i=0;i<settings.length;i++){
				set=$("#"+settings[i]).val()
				if (set!=''){
					if ($.inArray(settings[i],numerical)>-1){
						style[settings[i]]=parseFloat(set)
					} else if ($.inArray(settings[i],json)>-1){
						set.replace("'",'"')
						style[settings[i]]=JSON.parse(set)
					} else {
						style[settings[i]]=set
					}
				}
			}

			// now apply the style object
			chartobject.style(style)
			console.log(style)

			// initialize axes
			chartobject.xaxis({'label':xlabel,'number_of_ticks':5,'decimal':undefined,'format':undefined})
			chartobject.yaxis({'label':ylabel,'number_of_ticks':5,'decimal':undefined,'format':undefined})

			chartobject.header(hed,dek)
			chartobject.footer(source,note,function(){
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

					var options={}

					// orientation - 'vertical' or 'horizontal'
					// options['orientation']=$('input[name=barorient]:checked').val()

					console.log(chartobject)
					chartobject.chart(options)

					// push the calculated yaxis and xaxis to the front-end interface boxes
					if(Object.prototype.toString.call(chartobject.xarray[0])==='[object Date]'){
						temp=[]
						for(var i=0;i<chartobject.xarray.length;i++){
							temp.push(moment(chartobject.xarray[i]).format('MMMM YYYY'))
						}
						$('#customx').val(temp)
					} else{
						$('#customx').val(chartobject.xarray)
					}

					if(Object.prototype.toString.call(chartobject.yarray[0])==='[object Date]'){
						temp=[]
						for(var i=0;i<chartobject.xarray.length;i++){
							temp.push(moment(chartobject.xarray[i]).format('MMMM YYYY'))
						}
						$('#customx').val(temp)
					} else{
						$('#customy').val(chartobject.yarray)
					}
				}
			})
		} 
		else {
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