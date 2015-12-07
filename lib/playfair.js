// init_graph initializes the graphing area. Pass it the Snap svg element to draw in,
// the x- and y-coordinates of the graph's upper left corner, and a height and width for
// the graph. There's no set minimum for height and width but I'm sure things will get 
// weird for really low values. This is also the object that will house all methods
// for Playfair graphs.
window.playfair = (function () {
	function Playfair (svg,x,y,width,height) {
		this.svg=svg
		this.x=x
		this.y=y
		this.height=height
		this.width=width

		// Set .style so defaults are associated with the object.
		this.style()
	}
    
	var playfair = {
		init_graph: function (svg,x,y,width,height) {
			return new Playfair(svg,x,y,width,height);
		} 
	};  

	// The data method simply initializes the playfair object with data. It requires a
	// x-variable and a y-variable. 
	//
	// For graphs that don't have x-variables per se, like bar-graphs and choropleths, the 
	// x-variable is a category variable. In a bar chart, the x-variable is the bar 
	// categories. In a choropleth, it is the geographic identifiers (state names, FIPS 
	// codes, etc.) If you think of graphs in a traditional 'x causes y' frame, this makes
	// sense - your hypothesis in a choropleth is that geography causes y.
	//
	// You can also pass a grouping variable. The grouping variable is usually a text
	// value and is used to draw more than one graph on the same chart. A grouping variable
	// on a line chart, for example, will draw multiple lines. A grouping variable on
	// a bar chart will produce grouped bars.
	//
	// Finally, you can pass a facet variable. The facet variable allows you to create
	// multiple charts on the same canvas. So where a grouping variable will give you two
	// lines on the same chart, the facet variable will give you two entirely separate
	// line charts side by side (or some other orientation)
	Playfair.prototype.data = function(data,xvar,yvar,group,facet) {
		this.dataset=data
		this.xvar=xvar
		this.yvar=yvar
		this.group=group
		this.facet=facet
	}

	// Make specific modification to an axis. Takes the following:
	//     number_of_ticks: number of ticks on the x-axis (defaults to 6)
	//     decimal_places: precision of x-axis in decimal places. 0 makes everything an int.
	//     multiples: force axis ticks to be multiples of this number ie '20' means ticks at 
	//		   20,40, etc. If you specify format=date, you can instead pass this 'day', 'month',
	//		   or 'year'.
	//     format: for special data types. Possible values:
	//		   * date: formats the label as a date. Specify the appropriate multiples value
	//		     as well. Specifying this and 'year' is kinda pointless.
	//		   * percent: multiplies values by 100 and adds %
	//     prepend: a string to add before each tick label
	//     append: a string to add after each tick label
	//     transform: a number that all values will be divided by
	//     label: text label for the axis
	Playfair.prototype.xaxis = function(number_of_ticks,decimal_places,multiples,format,prepend,append,label) {
		this.xticks=number_of_ticks
		this.xdecimal=decimal_places
		this.xmult=multiples
		this.xformat=format
		this.xpre=prepend
		this.xapp=append
		this.xlabel=label
	}

	Playfair.prototype.yaxis = function(number_of_ticks,decimal_places,multiples,format,prepend,append,label) {
		this.yticks=number_of_ticks
		this.ydecimal=decimal_places
		this.ymult=multiples
		this.yformat=format
		this.ypre=prepend
		this.yapp=append
		this.ylabel=label
	}

	// Make specific modification to a grid. Takes the following:
	Playfair.prototype.xgrid = function() {

	}

	// The linechart/scatter plot method
	Playfair.prototype.linechart = function(options) {
		// options is an object, with following possibilities:
		// abline: [slope,intercept] ex: {'abline':[2,1]} -> y=2x+1
		// connect: how should points be ordered for joining - ['varname']
		// label: what variable contains the point labels - ['varname']
		// size: what variable should be used to scale points - ['varname']
		// points: true or false - show points or not

		snapobj=this.svg
		graph_obj=this

		// set up axes
		yaxis=create_axis(this.dataset[this.yvar],this.yticks,this.ydecimal,this.ymult,this.yformat,this.ypre,this.yapp)
		xaxis=create_axis(this.dataset[this.xvar],this.xticks,this.xdecimal,this.xmult,this.xformat,this.xpre,this.xapp)

		// set background fill for chart
		var graph_background=snapobj.rect(graph_obj.x,graph_obj.y+graph_obj.head_height,graph_obj.width,graph_obj.height-(graph_obj.head_height+logo_coords.height+graph_obj.footer_toppad)).attr({class:'background',fill:this.chartfill})

		// draw axes
		axes=draw_axes(this,xaxis,yaxis)

		// if no groups exist, create a fake group var, or create the real one
		if(this.group=='none'){
			grouptemp=[];
			for (var i=0;i<this.dataset[this.yvar].length;i++){
				grouptemp.push(1)
			};
			group=[1]
		}

		if(this.group!=='none'){
			grouptemp=this.dataset[this.group];
			group=[];
			for(var i=0;i<grouptemp.length;i++){
				if(group.indexOf(grouptemp[i]) ==-1){
					group.push(grouptemp[i])
				}
			}
		}

		// generate an array of the x and y variables and sort them on the x axis
		data_array=[]
		for(var i=0;i<this.dataset[this.yvar].length;i++){
			set=[this.dataset[this.yvar][i],this.dataset[this.xvar][i],grouptemp[i]]

			if ('connect' in options){
				set.push(this.dataset[options['connect']][i])
			} else {
				set.push(undefined)
			}

			if ('label' in options){
				set.push(this.dataset[options['label']][i])
			} else {
				set.push(undefined)
			}

			if ('size' in options){
				set.push(this.dataset[options['size']][i])
			} else {
				set.push(undefined)
			}

			data_array.push(set)
		}

		console.log(data_array)

		// order data_array according to the connection variable
		if ('connect' in options){
			data_array.sort(function(a,b){
				return a[3]-b[3]
			})
		}

		console.log(data_array)

		// draw points - loop through groups
		for (var i=0;i<group.length;i++) {
			// construct array of data points belonging to the group
			group_array=[]
			for (var k=0;k<data_array.length;k++){
				if(data_array[k][2]==group[i]){
					group_array.push(data_array[k])
				}
			}

			// find all points, draw if necessary, add to array for line if necessary
			line_array=[]
			for (var k=0;k<group_array.length;k++){
				x=group_array[k][1]
				y=group_array[k][0]

				x_data_range=xaxis[xaxis.length-1]-xaxis[0]
				x_data_value=axes[0]+((x-xaxis[0])/(xaxis[xaxis.length-1]-xaxis[0]))*(axes[1]-axes[0])

				y_data_range=yaxis[yaxis.length-1]-yaxis[0]
				y_data_value=axes[2]-((y-yaxis[0])/(yaxis[yaxis.length-1]-yaxis[0]))*(axes[2]-axes[3])

				// determine correct point size if a scaling variable has been specified
				if ('size' in options){
					minsize=this.dataset[options['size']][0]
					maxsize=this.dataset[options['size']][0]

					for(var l=0;l<this.dataset[options['size']].length;l++){
						if(this.dataset[options['size']][l]<minsize){
							minsize=this.dataset[options['size']][l]
						}
						if(this.dataset[options['size']][l]>maxsize){
							maxsize=this.dataset[options['size']][l]
						}
					}

					if(maxsize>10*minsize){
						try{
							maxsize=Math.log(maxsize)
							minsize=Math.log(minsize)
							pointsize=((Math.log(group_array[k][5])-minsize)/(maxsize-minsize))*(this.point_maxsize-this.point_minsize)+this.point_minsize	
						} catch(err){pointsize=0}

					} else{
						pointsize=((group_array[k][5]-minsize)/(maxsize-minsize))*(this.point_maxsize-this.point_minsize)+this.point_minsize
					}

				} else {
					pointsize=this.point_size
				}

				// draw point
				if (options['points']==true) {
					snapobj.circle(x_data_value,y_data_value,pointsize).attr({fill:this.qualitative_color[i],stroke:this.qualitative_color[i],'stroke-width':this.point_strokewidth,'data_type':'point','data_label':group_array[k][4],'group':group[i],'class':'dataelement','fill-opacity':.5})
				}

				// preparing line array for drawing line
				line_array.push([x_data_value,y_data_value])
			}

			// draw group line based on line_array if connect exists
			if ('connect' in options){
				for (var k=0;k<line_array.length;k++){
					if (k==0){
						path_string='M'+line_array[k][0]+' '+line_array[k][1]
					} else{
						path_string=path_string+'L'+line_array[k][0]+' '+line_array[k][1]
					}
				}

				snapobj.path(path_string).attr({stroke:this.qualitative_color[i],'stroke-width':2,fill:'none','group':group[i]})
			}
		}

		// draw abline if necessary
		if (isNumber(options['abline'][0])==true && isNumber(options['abline'][1])==true){
			slope=options['abline'][0]
			x1=xaxis[0]
			x2=xaxis[xaxis.length-1]
			y1=options['abline'][1]+options['abline'][0]*x1
			y2=options['abline'][1]+options['abline'][0]*x2

			if (y1<yaxis[0]){
				y1=yaxis[0]
				x1=(y1-options['abline'][1])/options['abline'][0]
			}
			if (y2>yaxis[yaxis.length-1]){
				y2=yaxis[yaxis.length-1]
				x2=(y2-options['abline'][1])/options['abline'][0]
			}

			y1_data_value=axes[2]-((y1-yaxis[0])/(yaxis[yaxis.length-1]-yaxis[0]))*(axes[2]-axes[3])
			y2_data_value=axes[2]-((y2-yaxis[0])/(yaxis[yaxis.length-1]-yaxis[0]))*(axes[2]-axes[3])

			x1_data_value=axes[0]+((x1-xaxis[0])/(xaxis[xaxis.length-1]-xaxis[0]))*(axes[1]-axes[0])
			x2_data_value=axes[0]+((x2-xaxis[0])/(xaxis[xaxis.length-1]-xaxis[0]))*(axes[1]-axes[0])

			tempwidth=x2_data_value-x1_data_value
			tempheight=y1_data_value-y2_data_value
			unitslope=tempheight/tempwidth

			var trend=snapobj.line(x1_data_value,y1_data_value,x2_data_value,y2_data_value).attr({stroke:this.trend_fill,'stroke-width':this.trend_width})
			var trendtext=snapobj.text((x1_data_value+x2_data_value)/2,(y1_data_value+y2_data_value)/2,'Trendline').attr({fill:this.trend_textcolor,'font-family':this.trend_textface,'font-size':this.trend_textsize,'font-weight':this.trend_textweight,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
			coords=trendtext.getBBox()
			trendtext.attr({y:coords.y-this.trend_linetotext-coords.height})
			inclination=-(Math.atan(parseFloat(unitslope))*360)/(2*Math.PI)
			trendtext.transform('r'+inclination+' '+coords.cx+' '+coords.cy)
		}
	}

	// The barchart method
	Playfair.prototype.barchart = function(orientation) {
		snapobj=this.svg

		// category values
		yaxis=create_axis(this.dataset[this.xvar],this.yticks,this.ydecimal,this.ymult,this.yformat,this.ypre,this.yapp)

		// bar categories
		xaxistemp=this.dataset[this.xvar]
		xaxis=[]
		for(var i=0;i<xaxistemp.length;i++){
			if(xaxis.indexOf(xaxistemp[i]) == -1){
				xaxis.push(xaxistemp[i])
			}
		}

		// group categories
		if(this.group!=='none'){
			grouptemp=this.dataset[this.group]
			group=[]
			for(var i=0;i<grouptemp.length;i++){
				if(group.indexOf(grouptemp[i]) == -1){
					group.push(grouptemp[i])
				}
			}
		}

		graph_obj=this

		// set background fill for chart
		var graph_background=snapobj.rect(graph_obj.x,graph_obj.y+graph_obj.head_height,graph_obj.width,graph_obj.height-(graph_obj.head_height+logo_coords.height+graph_obj.footer_toppad)).attr({class:'background',fill:this.chartfill})

		// draw axes
		if(orientation=='vertical'){
			// yaxis variable will in fact be on the y-axis, xaxis is categories on the x-axis. Shift x-axis for bars
			axes=draw_axes(this,xaxis,yaxis,1,0)
		}

		if(orientation=='horizontal'){
			// yaxis variable will actually be values on the x-axis, xaxis is categories on the y-axis. Shift y-axis for bars
			axes=draw_axes(this,yaxis,xaxis,0,1)
		}

		// axes returns: [xstart_xcoord,xfinal_xcoord,ystart_ycoord,yfinal_ycoord]
		// graph data
		if(orientation=='vertical'){
			data_range=yaxis[yaxis.length-1]-yaxis[0]
			zero=axes[2]-(-yaxis[0]/data_range)*(axes[2]-axes[3])
			margin=((1-this.barchart_width)/2)*((axes[1]-axes[0])/xaxis.length)


			// if there are NO GROUPS
			if(this.group=='none'){
				// loop through bar categories
				for (var i=0;i<xaxis.length;i++){
					data_value=(this.dataset[this.yvar][i])/(yaxis[yaxis.length-1]-yaxis[0])*(axes[2]-axes[3])
					bar_width=this.barchart_width*((axes[1]-axes[0])/xaxis.length)
					if(data_value<0){
						var bar_rect=snapobj.rect(axes[0]+margin*(i+1)+margin*i+bar_width*i,zero,bar_width,Math.abs(data_value)).attr({'data_type':'bar','data_label':this.dataset[this.yvar][i],'class':'dataelement','shape-rendering':'crispEdges',fill:this.qualitative_color[0]})
					}
					else{
						var bar_rect=snapobj.rect(axes[0]+margin*(i+1)+margin*i+bar_width*i,zero-data_value,bar_width,data_value).attr({'data_type':'bar','data_label':this.dataset[this.yvar][i],'class':'dataelement','shape-rendering':'crispEdges',fill:this.qualitative_color[0]})
					}
				}
			}

			// if there IS GROUPING
			if(this.group!=='none'){
				bar_width=this.barchart_width*((axes[1]-axes[0])/xaxis.length)/group.length
				margin=((1-this.barchart_width)/2)*((axes[1]-axes[0])/xaxis.length)

				// Create an array of arrays to hold the full dataset with all 3 vars
				data_array=[]
				for (var i=0;i<this.dataset[this.xvar].length;i++){
					data_array.push([this.dataset[this.xvar][i],this.dataset[this.yvar][i],this.dataset[this.group][i]])	
				}

				for (var i=0;i<xaxis.length;i++){
					// generate array of observations with category matching xaxis[i]
					temp_array=[]
					for (var j=0;j<data_array.length;j++){
						if (data_array[j][0]==xaxis[i]){
							temp_array.push(data_array[j])
						}
					}

					// order this array according to the group variable
					// This is such a dumb way to do this
					temp_array2=[]
					for (var j=0;j<group.length;j++){
						for (var k=0;k<temp_array.length;k++){
							if(temp_array[k][2]==group[j]){
								temp_array2.push(temp_array[k])
							}
						}
					}

					// draw bars based on temp_array2
					for (var j=0;j<temp_array2.length;j++){
						data_value=(temp_array2[j][1])/(yaxis[yaxis.length-1]-yaxis[0])*(axes[2]-axes[3])
						var bar_rect=snapobj.rect(axes[0]+margin*(i+1)+margin*i+bar_width*i*group.length+bar_width*j,zero-data_value,bar_width,data_value).attr({'data_type':'bar','data_label':temp_array2[j][1],'group':temp_array2[j][2],'class':'dataelement','shape-rendering':'crispEdges',fill:this.qualitative_color[j]})
					}
				}
			}
		}
		if(orientation=='horizontal'){

		}

		snapobj.append(snapobj.select("line[zeroline='1']"))
	}

	Playfair.prototype.footer = function(logo,source,note,callback) {
		// draw the footer and return the height of the footer
		this.source=source
		this.note=note
		this.logo=logo

		var snapobj=this.svg
		var width=this.width
		var height=this.height
		var graphobj=this

		var logo=snapobj.image(this.logo,0,0)
		logo.node.addEventListener('load',function(){
			logo_coords=logo.getBBox()
			logo.attr({x:graphobj.x+graphobj.width-logo_coords.width-graphobj.footer_rightpad,y:graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad})

			// draw footer and source. This is done in a while loop because they need to be resized until they fit into the given space //
			///////////////////// REVISIT THIS - WILL REQUIRE REWRITING SOME STUFF IN DRAW_AXES A LITTLE BIT /////////////////////////////
			if(graphobj.source.length>0){
				source='Source: '+graphobj.source
				lines=multitext(source,{'font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge'},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad-logo_coords.width)
				for (var i=0;i<lines.length;i++){
					var source=snapobj.text(graphobj.x+graphobj.footer_leftpad,graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad+i*parseInt(graphobj.sourcesize),lines[i]).attr({ident:'foot','font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge'})
				}
				source_coords=source.getBBox().y2
			}
			else {source_coords=graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad}

			if(graphobj.note.length>0){
				note='Note: '+graphobj.note
				lines=multitext(note,{'font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge'},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad-logo_coords.width)
				for (var i=0;i<lines.length;i++){
					var note=snapobj.text(graphobj.x+graphobj.footer_leftpad,source_coords+i*parseInt(graphobj.notesize),lines[i]).attr({ident:'foot','font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge'})
				}
			}
			
			var foot_fill=snapobj.rect(0,graphobj.height-logo_coords.height-graphobj.footer_toppad-graphobj.footer_bottompad,graphobj.width,logo_coords.height+graphobj.footer_bottompad+graphobj.footer_toppad).attr({fill:graphobj.footerfill})
			
			foot_text=snapobj.selectAll("text[ident='foot']")
			for (var i=0;i<foot_text.length;i++){
				snapobj.append(foot_text[i])
			}
			snapobj.append(logo)

			graphobj.logo_height=logo_coords.height
			graphobj.logo_width=logo_coords.width
			callback(logo_coords.height)
		})
	}

	Playfair.prototype.header = function(hed,dek) {
		snapobj=this.svg

		this.hed=hed
		this.dek=dek

		headerwidth=this.width-this.header_leftpad-this.header_rightpad

		// draw main title
		hedfontsize=parseInt(this.hedsize)
		while(multitext(hed,{'font-family':this.hedface,'font-size':hedfontsize+'px','font-weight':this.hedweight,'dominant-baseline':'text-before-edge'},headerwidth).length>1){
			hedfontsize=hedfontsize-1
		}
		var hed=snapobj.text(this.x+this.header_leftpad,this.y+this.header_toppad,hed).attr({'font-family':this.hedface,'font-size':hedfontsize,'font-weight':this.hedweight,'dominant-baseline':'text-before-edge'})
		var hed_coords=hed.getBBox()

		// draw subtitle
		dekfontsize=parseInt(this.deksize)
		while(multitext(dek,{'font-family':this.dekface,'font-size':dekfontsize,'font-weight':this.dekweight,'dominant-baseline':'text-before-edge'},headerwidth).length>2){
			dekfontsize=dekfontsize-1
		}
		lines=multitext(dek,{'font-family':this.dekface,'font-size':dekfontsize,'font-weight':this.dekweight,'dominant-baseline':'text-before-edge'},headerwidth)
		for(var i=0;i<lines.length;i++){
			var dek=snapobj.text(this.x+this.header_leftpad,this.y+this.header_toppad+hed_coords.y2+i*parseInt(dekfontsize),lines[i]).attr({'font-family':this.dekface,'font-size':dekfontsize,'font-weight':this.dekweight,'dominant-baseline':'text-before-edge',ident:'dek'})
		}
		
		var lower_hed=hed.getBBox().y2
		var lower_dek=dek.getBBox().y2

		// set head_height to the y2 coord for dek or hed, whichever is lower.
		if(lower_hed>lower_dek){this.head_height=lower_hed+this.header_bottompad}
		else{this.head_height=lower_dek+this.header_bottompad}

		// draw in background and move it to the back
		var head_fill=snapobj.rect(0,0,this.width,this.head_height).attr({fill:this.headerfill})
		snapobj.append(hed)
		deks=snapobj.selectAll("text[ident='dek']")
		for(var i=0;i<deks.length;i++){
			snapobj.append(deks[i])
		}
	}

	Playfair.prototype.style = function(parameters) {
		// Parameters should be an object with the parameters you want to change like:
		// obj.style({'top_margin':20,'deksize':'10px'}) etc.
		if (typeof parameters=='undefined'){parameters={}}

		// margins
		this.top_margin= parameters['top_margin'] || 25
		this.bottom_margin= parameters['bottom_margin'] || 8
		this.left_margin= parameters['left_margin'] || 10
		this.right_margin= parameters['right_margin'] || 40

		// default values
		this.head_height= parameters['head_height'] || 0
		this.logo_height= parameters['logo_height'] || 0

		// hed
		this.hedsize= parameters['hedsize'] || '20px'
		this.hedweight= parameters['hedweight'] || 700
		this.hedface= parameters['hedface'] || 'Lato, Arial, sans-serif'

		// dek
		this.deksize= parameters['deksize'] || '16px'
		this.dekweight= parameters['dekweight'] || 400
		this.dekface= parameters['dekface'] || 'Lato, Arial, sans-serif'

		// data labels
		this.datasize= parameters['datasize'] || '12px'
		this.dataweight= parameters['dataweight'] || 600
		this.dataface= parameters['dataface'] || 'Lato, Arial, sans-serif'

		// annotations
		this.annotatesize= parameters['annotatesize'] || '12px'
		this.annotateweight= parameters['annotateweight'] || 600
		this.annotateface= parameters['annotateface'] || 'Lato, Arial, sans-serif'

		// source
		this.sourcesize= parameters['sourcesize'] || '10px'
		this.sourceweight= parameters['sourceweight'] || 400
		this.sourceface= parameters['sourceface'] || 'Lato, Arial, sans-serif'

		// note
		this.notesize= parameters['notesize'] || '10px'
		this.noteweight= parameters['noteweight'] || 400
		this.noteface= parameters['noteface'] || 'Lato, Arial, sans-serif'

		// chart formatting
		this.chartfill= parameters['chartfill'] || '#ece9e8'
		this.chart_toppad= parameters['chart_toppad'] || 0
		this.chart_bottompad= parameters['chart_bottompad'] || 0
		this.chart_leftpad= parameters['chart_leftpad'] || 0
		this.chart_rightpad= parameters['chart_rightpad'] || 0

		// header formatting
		this.headerfill= parameters['headerfill'] || '#ffffff'
		this.header_toppad= parameters['header_toppad'] || 0
		this.header_bottompad= parameters['header_bottompad'] || 3
		this.header_leftpad= parameters['header_leftpad'] || 0
		this.header_rightpad= parameters['header_rightpad'] || 0

		// footer formatting
		this.footerfill= parameters['footerfill'] || '#ffffff'
		this.footer_toppad= parameters['footer_toppad'] || 4
		this.footer_bottompad= parameters['footer_bottompad'] || 0
		this.footer_leftpad= parameters['footer_leftpad'] || 0
		this.footer_rightpad= parameters['footer_rightpad'] || 0

		// x grids
		this.xgrid_fill= parameters['xgrid_fill'] || 'white'
		this.xgrid_zerofill= parameters['xgrid_zerofill'] || 'white'
		this.xgrid_minorfill= parameters['xgrid_minorfill'] || 'white'
		this.xgrid_thickness= parameters['xgrid_thickness'] || 1
		this.xgrid_zerothickness= parameters['xgrid_zerothickness'] || 1
		this.xgrid_minorthickness= parameters['xgrid_minorthickness'] || 1
		this.xgrid_dasharray= parameters['xgrid_dasharray'] || [1,0]
		this.xgrid_zerodasharray= parameters['xgrid_zerodasharray'] || [1,0]
		this.xgrid_minordasharray= parameters['xgrid_minordasharray'] || [3,3]
		this.xgrid_opacity= parameters['xgrid_opacity'] || 0
		this.xgrid_zeroopacity= parameters['xgrid_zeroopacity'] || 0
		this.xgrid_minoropacity= parameters['xgrid_minoropacity'] || 0

		// y grids
		this.ygrid_fill= parameters['ygrid_fill'] || 'white'
		this.ygrid_zerofill= parameters['ygrid_zerofill'] || 'white'
		this.ygrid_minorfill= parameters['ygrid_minorfill'] || 'white'
		this.ygrid_thickness= parameters['ygrid_thickness'] || 1
		this.ygrid_zerothickness= parameters['ygrid_zerothickness'] || 2
		this.ygrid_minorthickness= parameters['ygrid_minorthickness'] || 1
		this.ygrid_dasharray= parameters['ygrid_dasharray'] || [1,0]
		this.ygrid_zerodasharray= parameters['ygrid_zerodasharray'] || [1,0]
		this.ygrid_minordasharray= parameters['ygrid_minordasharray'] || [3,3]
		this.ygrid_opacity= parameters['ygrid_opacity'] || 1
		this.ygrid_zeroopacity= parameters['ygrid_zeroopacity'] || 1
		this.ygrid_minoropacity= parameters['ygrid_minoropacity'] || 0

		// x ticks
		this.xtick_textsize= parameters['xtick_textsize'] || '14px'
		this.xtick_textweight= parameters['xtick_textweight'] || 500
		this.xtick_textface= parameters['xtick_textface'] || 'lato'
		this.xtick_maxsize= parameters['xtick_maxsize'] || .15
		this.xtick_length= parameters['xtick_length'] || 4
		this.xtick_thickness= parameters['xtick_thickness'] || 1
		this.xtick_fill= parameters['xtick_fill'] || 'white'
		this.xtick_to_xlabel= parameters['xtick_to_xlabel'] || 5
		this.xtick_to_xaxis= parameters['xtick_to_xaxis'] || 5

		// y ticks
		this.ytick_textsize= parameters['ytick_textsize'] || '14px'
		this.ytick_textweight= parameters['ytick_textweight'] || 500
		this.ytick_textface= parameters['ytick_textface'] || 'Lato, Arial, sans-serif'
		this.ytick_maxsize= parameters['ytick_maxsize'] || .15
		this.ytick_length= parameters['ytick_length'] || 16
		this.ytick_thickness= parameters['ytick_thickness'] || 1
		this.ytick_fill= parameters['ytick_fill'] || 'white'
		this.ytick_to_ylabel= parameters['ytick_to_ylabel'] || 6
		this.ytick_to_yaxis= parameters['ytick_to_yaxis'] || 20

		// x label
		this.xlabel_textsize= parameters['xlabel_textsize'] || '14px'
		this.xlabel_textweight= parameters['xlabel_textweight'] || 500
		this.xlabel_textface= parameters['xlabel_textface'] || 'Lato, Arial, sans-serif'

		// y label
		this.ylabel_textsize= parameters['ylabel_textsize'] || '14px'
		this.ylabel_textweight= parameters['ylabel_textweight'] || 500
		this.ylabel_textface= parameters['ylabel_textface'] || 'Lato, Arial, sans-serif'

		// legend
		this.legend_location= parameters['legend_location'] || 'top'
		this.legend_maxwidth= parameters['legend_maxwidth'] || .1
		this.legend_textsize= parameters['legend_textsize'] || '12px'
		this.legend_textweight= parameters['legend_textweight'] || 500
		this.legend_textface= parameters['legend_textface'] || 'Lato, Arial, sans-serif'
		this.legend_toppad= parameters['legend_toppad'] || 8
		this.legend_bottompad= parameters['legend_bottompad'] || 0
		this.legend_rightpad= parameters['legend_rightpad'] || 0
		this.legend_leftpad= parameters['legend_leftpad'] || 0
		this.legend_elementsize= parameters['legend_elementsize'] || 15
		this.legend_elementpad= parameters['legend_elementpad'] || 5
		this.legend_floatbackground= parameters['legend_floatbackground'] || 'white'
		this.legend_floatthickness= parameters['legend_floatthickness'] || 1
		this.legend_floatstroke= parameters['legend_floatstroke'] || '#b5b5b5'
		this.legend_floatpad= parameters['legend_floatpad'] || 8

		// color scales
		this.diverging_color= parameters['diverging_color'] || ['#523211','#8b5322','#dec17c','#80ccc0','#35968e']
		this.sequential_color= parameters['sequential_color'] || ['#205946','#33836A','#67c2a5','#b7dfd1','#e2f2ed']
		this.qualitative_color= parameters['qualitative_color'] || ['#67c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854','#ffd92f','#e5c494','#b3b3b3']

		// barchart specific style
		this.barchart_width= parameters['barchart_width'] || .8

		// line/scatter specific style
		this.trend_width= parameters['trend_width'] || 1.5
		this.trend_fill= parameters['trend_fill'] || '#c64027'
		this.trend_textface= parameters['trend_textface'] || 'Lato, Arial, sans-serif'
		this.trend_textweight= parameters['trend_textweight'] || 600
		this.trend_textsize= parameters['legend_textsize'] || '12px'
		this.trend_textcolor= parameters['trend_textcolor'] || '#c64027'
		this.trend_linetotext= parameters['trend_linetotext'] || 3
		this.point_fill= parameters['point_fill'] || 'none'
		this.point_stroke= parameters['point_stroke'] || '#67c2a5'
		this.point_size= parameters['point_size'] || 4
		this.point_strokewidth= parameters['point_strokewidth'] || 1.7
		this.point_fillopacity= parameters['point_fillopacity'] || 1
		this.point_minsize= parameters['point_minsize'] || 3
		this.point_maxsize= parameters['point_maxsize'] || 15

	}

	return playfair;
}());


// Axis creation. I poked around and couldn't find an algorithm I like on stackoverflow etc.
// In particular, many do not treat 0 correctly in my opinion. I started from scratch with the 
// following rules in mind - roughly in order of importance:
//      1. If an axis crosses 0, 0 *must* be an axis tick value
//      2. x-axis ticks *must* be attached to a y-axis grid line
//      3. The data should be as tightly contained as possible (little wasted space)
//      4. There should be 4-6 ticks on each axis, but if rule 2 requires it, up to 10
//      5. Numbers should be 'nice' (round numbers etc.)
//
// Seperately, different types of graphs may need slightly different rules: 
//		1. The y-axis of a bar graph MUST contain 0.
//
// Things passed to this function (#=required):
//   # dataseries: array of numbers to be plotted (either x or y, not both)
//   # yflag: =1 if the dataseries is y-values for the plot, else 0
//     ticks: number of ticks if the user selects a specific number
//     decimal: number of decimal places to display on each tick value
//     multiple: specific multiple to use for axis values (ie 10 for 10,20...)
//     format: for special data types. Possible values:
//		   * date: formats the label as a date. Specify the appropriate multiples value
//		     as well. Specifying this and 'year' is kinda pointless.
//		   * percent: multiplies values by 100 and adds %
//     prepend: a string to add before each tick label
//     append: a string to add after each tick label
//     transform: a number that all values will be divided by
function create_axis(dataseries,yflag,ticks,decimal,multiple,format,prepend,append) {
	mindata=dataseries[0]
	maxdata=dataseries[0]
	zero_flag=0

	for(var i=0;i<dataseries.length;i++){
		if(dataseries[i]<mindata){mindata=dataseries[i]}
		if(dataseries[i]>maxdata){maxdata=dataseries[i]}
	}

	if(mindata<=0 && maxdata>=0){
		zero_flag=1
	}

	range=maxdata-mindata
	maxwaste=.15*range

	// PLACEHOLDER FOR NOW SO THAT I CAN WRITE OTHER STUFF
	return [-10,0,10,20,30,40]
	// return [25,20,15,10,5,0]
}

// Modified version of this very nice text wrapping function from stackoverflow @Thomas: 
// http://stackoverflow.com/questions/27517482/how-to-auto-text-wrap-text-in-snap-svg
function multitext(txt,attributes,max_width){
	var svg = Snap();
	var abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var temp = svg.text(0, 0, abc);
	temp.attr(attributes);
	var letter_width = temp.getBBox().width / abc.length;
	svg.remove();

	var words = txt.split(" ");
	var width_so_far = 0, current_line=0, lines=[''];
	for (var i = 0; i < words.length; i++) {

		 var l = words[i].length;
		 if (width_so_far + (l * letter_width) > max_width) {
				lines.push('');
				current_line++;
				width_so_far = 0;
		 }
		 width_so_far += l * letter_width;
		 lines[current_line] += words[i] + " ";
	}
	return lines
}


function draw_axes(playobj,xvar,yvar,shiftx,shifty) {
	// draws the axes for a graph
	// shiftx and shifty are optional parameters. If shiftx or shifty==1, that axis will
	// be shifted such that labels occur between ticks, appropriate for a bar graph. There
	// will also be one more tick to accomodate this change

	snapobj=playobj.svg

	// If there is a groupvar, deal with it first - draw a dummy legend, get the dimensions,
	// and incorporate them into the graph's margins appropriately.
	legend_height=0

	if (playobj.group!=='none' && playobj.legend_location!=='none'){

		// array with unique group values
		grouptemp=playobj.dataset[playobj.group]
		group=[]
		for(var i=0;i<grouptemp.length;i++){
			if(group.indexOf(grouptemp[i]) == -1){
				group.push(grouptemp[i])
			}
		}

		// available width for the key and starting point
		avail_width=playobj.width-playobj.left_margin-playobj.right_margin-playobj.legend_leftpad-playobj.legend_rightpad
		horizon_key_start_x=playobj.x+playobj.left_margin+playobj.legend_leftpad
		horizon_key_start_y=playobj.y+playobj.header_toppad+playobj.header_bottompad+playobj.head_height+playobj.legend_toppad

		// available height for the key
		avail_height=playobj.height-playobj.footer_bottompad-playobj.logo_height-playobj.footer_toppad-playobj.header_toppad-playobj.header_bottompad-playobj.head_height-playobj.legend_toppad-playobj.legend_bottompad
		vertical_key_start_y=playobj.y+playobj.header_toppad+playobj.header_bottompad+playobj.head_height+playobj.legend_toppad
		// The key_start_x depends on how long the category values are. It can be up to
		// legend_maxwidth % wide but should be as short as possible.
		longest=0
		for(var i=0;i<group.length;i++){
			var temp=snapobj.text(0,0,group[i]).attr({'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
			coords=temp.getBBox()
			if (coords.width>longest){
				longest=coords.width
			}
			temp.remove()
		}

		// Is width of longest category or legend maxwidth greater?
		if (longest>playobj.legend_maxwidth*avail_width){
			longest=playobj.legend_maxwidth*avail_width
		}

		// finally, vertical_key_start_x
		vertical_key_start_x=playobj.x+playobj.width-playobj.left_margin-longest-playobj.legend_rightpad

		legend_height=0
		legend_width=0

		// Draw the key - location top
		if (playobj.legend_location=='top'){
			line=0
			current_linewidth=0
			for (var i=0;i<group.length;i++){
				var temp=snapobj.text(0,0,group[i]).attr({'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
				coords=temp.getBBox()
				text=group[i]
				if (coords.width+temptext+snapobj.legend_elementpad+snapobj.legend_elementsize>avail_width) {
					text='your label is too long!'
				}

				temp.remove()

				if (playobj.elementsize>=parseInt(playobj.legend_textsize)){
					lineheight=playobj.elementsize
				} else{
					lineheight=parseInt(playobj.legend_textsize)
				}

				// Does the next key fit on the current line?
				if (current_linewidth+coords.width+playobj.legend_elementsize+playobj.legend_elementpad<avail_width){
					var temprect=snapobj.rect(horizon_key_start_x+current_linewidth,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,playobj.legend_elementsize,playobj.legend_elementsize).attr({group:group[i],fill:playobj.qualitative_color[i],ident:'key','shape-rendering':'crispEdges'})
					var temptext=snapobj.text(horizon_key_start_x+current_linewidth+playobj.legend_elementpad+playobj.legend_elementsize,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,text).attr({'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})

					coords2=temprect.getBBox()
					coords3=temptext.getBBox()
					totalwidth=coords2.width+coords3.width+playobj.legend_elementpad
					current_linewidth=current_linewidth+totalwidth+8
				}
				// if it doesn't, go to the next line, set current_linewidth to 0
				else {
					current_linewidth=0
					line=line+1

					var temprect=snapobj.rect(horizon_key_start_x+current_linewidth,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,playobj.legend_elementsize,playobj.legend_elementsize).attr({group:group[i],fill:playobj.qualitative_color[i],ident:'key','shape-rendering':'crispEdges'})
					var temptext=snapobj.text(horizon_key_start_x+current_linewidth+playobj.legend_elementpad+playobj.legend_elementsize,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,text).attr({'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
				
					coords2=temprect.getBBox()
					coords3=temptext.getBBox()
					totalwidth=coords2.width+coords3.width+playobj.legend_elementpad
					current_linewidth=current_linewidth+totalwidth
				}
			}

			if (coords2.y2>coords3.y2) {
				end_legend=coords2.y2
			} else {
				end_legend=coords3.y2
			}

			legend_height=end_legend-horizon_key_start_y
		}

		// Draw the key - location right
		if (playobj.legend_location=='float'){
			length=0
			for (var i=0;i<group.length;i++){
				var temp=snapobj.text(0,0,group[i]).attr({'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
				coords=temp.getBBox()
				if (length<coords.width){length=coords.width}
				temp.remove()
			}

			lineheight=playobj.legend_elementsize
			if(parseInt(playobj.legend_textsize)>lineheight){lineheight=parseInt(playobj.legend_textsize)}

			var floatgroup=snapobj.group()
			var floatkey=snapobj.rect(0,0,playobj.legend_floatpad*2+playobj.legend_elementsize+playobj.legend_elementpad+length,playobj.legend_floatpad*2+lineheight*group.length+(group.length-1)*playobj.legend_elementpad).attr({fill:playobj.legend_floatbackground,stroke:playobj.legend_floatstroke,'stroke-width':playobj.legend_floatthickness,'shape-rendering':'crispEdges'})
			floatgroup.append(floatkey)

			for (var i=0;i<group.length;i++){
				var temprect=snapobj.rect(playobj.legend_floatpad,playobj.legend_floatpad+lineheight*i+playobj.legend_elementpad*i,playobj.legend_elementsize,playobj.legend_elementsize).attr({group:group[i],fill:playobj.qualitative_color[i],ident:'key','shape-rendering':'crispEdges'})
				var temp=snapobj.text(playobj.legend_floatpad+playobj.legend_elementsize+playobj.legend_elementpad,playobj.legend_floatpad+lineheight*i+playobj.legend_elementpad*i,group[i]).attr({'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
				floatgroup.append(temprect)
				floatgroup.append(temp)
			}
			floatgroup.drag()
		}
	}

	else {
		playobj.legend_toppad=0
		playobj.legend_bottompad=0
	}

	// first draw the y-axis and add all elements to a group. Until the x-axis is drawn,
	// the correct y-location for all these elements is unknown. Draw as if it will be
	// sitting at the bottom of the graph, then move up the correct amount when x-axis is
	// drawn.

	// y label
	if (typeof(playobj.ylabel)!=undefined){
		var ylab=snapobj.text(playobj.x+playobj.left_margin,((playobj.y+playobj.height-playobj.logo_height-playobj.footer_toppad)+(playobj.y+playobj.head_height+playobj.top_margin+legend_height+playobj.legend_toppad+playobj.legend_bottompad))/2,String(playobj.ylabel)).attr({ident:'yaxis','font-size':playobj.ylabel_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
		ylab_coords=ylab.getBBox()
		ylab.attr({y:ylab_coords.y-(ylab_coords.height/2)})
		ylab.transform('r270')
		ylab_coords=ylab.getBBox()
		ylab_width=ylab_coords.width
	}
	else{ylab_width=0}

	// y ticks and lines - no location, just figure out what the x offset is
	total_xoffset=0
	if(shifty==1){shifty=1}
	else{shifty=0}

	for(var i=0;i<yvar.length+shifty;i++){
		var temp=snapobj.text(playobj.left_margin+ylab_width+playobj.ytick_to_ylabel,0,String(yvar[i])).attr({ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
		coords=temp.getBBox()
		if (coords.x2>total_xoffset){total_xoffset=coords.x2}
		temp.remove()
	}

	// Subtract graph start x from xoffset and add ytick_to_yaxis to get the actual width of the xoffset.
	// As a kind of safeguard, if the yoffset width comes back huge, adjust it to 15% of graphing space.
	// This is a hard-coded parameter for now. Long labels should wrap to be no larger than y_offset
	total_xoffset=total_xoffset-playobj.x+playobj.ytick_to_yaxis
	if(total_xoffset>playobj.ytick_maxsize*playobj.width){total_xoffset=playobj.ytick_maxsize*playobj.width}

	// now the full x-offset is known, can start drawing the x-axis. x label:
	if (typeof(playobj.xlabel)!=undefined){
		var xlab=snapobj.text((total_xoffset+2*playobj.x+playobj.width-playobj.right_margin)/2,playobj.y+playobj.height-playobj.bottom_margin-playobj.logo_height-playobj.footer_toppad-playobj.footer_bottompad,String(playobj.xlabel)).attr({ident:'xaxis','font-size':playobj.xlabel_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
		coords=xlab.getBBox()
		xlab.attr({y:coords.y-coords.height})
		coords=xlab.getBBox()
		xlab_height=coords.height
	}
	else{xlab_height=0}

	// important parameters - the start and end of the x axis, domain, and x step size
	xstart_xcoord=total_xoffset+playobj.x
	xfinal_xcoord=playobj.x+playobj.width-playobj.right_margin
	domain=xfinal_xcoord-xstart_xcoord
	if(shiftx==1){x_step=domain/(xvar.length)}
	else{x_step=domain/(xvar.length-1)}

	// x ticks and x lines - again no location, just figure out what the total y offset is
	total_yoffset=0
	if(shiftx==1){shiftx=1}
	else{shiftx=0}

	for(var i=0;i<xvar.length+shiftx;i++){
		if(x_step<playobj.xtick_maxsize*playobj.width){maxwidth=x_step}
		else{maxwidth=playobj.xtick_maxsize*playobj.width}

		lines=multitext(String(xvar[i]),{ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'},maxwidth)
		for(var j=0;j<lines.length;j++){
			var temp=snapobj.text(0,j*parseInt(playobj.xtick_textsize),lines[j]).attr({ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
			coords=temp.getBBox()
			temp.attr({y:coords.y-coords.height})
			temp.remove()
		}
		if(coords.y>total_yoffset){total_yoffset=coords.y}
	}

	// subtract graph start y from yoffset and add xtick_to_xaxis to get the actual width of the yoffset.
	total_yoffset=total_yoffset+playobj.xtick_to_xaxis

	// now make a second pass on both axes and draw the actual ticks/lines/tick labels using known yoffset and xoffset
	// x axis objects first, y_end is the top of the functional graphing area:
	y_end=playobj.y+playobj.head_height+playobj.header_bottompad+playobj.header_toppad+playobj.top_margin+legend_height+playobj.legend_toppad+playobj.legend_bottompad
	for(var i=0;i<xvar.length;i++){
		// x-axis labels
		lines=multitext(String(xvar[i]),{ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'},maxwidth)
		for(var j=0;j<lines.length;j++){
			var temp=snapobj.text(xstart_xcoord+(x_step/2)*shiftx+x_step*i,playobj.y+playobj.height-playobj.bottom_margin-playobj.logo_height-playobj.footer_toppad-playobj.footer_bottompad-xlab_height-playobj.xtick_to_xlabel-total_yoffset+playobj.xtick_to_xaxis+j*parseInt(playobj.xtick_textsize),lines[j]).attr({ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xtick_textweight,'font-family':playobj.xtick_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
			coords=temp.getBBox()
			temp.attr({y:coords.y-coords.height})
		}
		// x-axis ticks, grid lines, and minor grid lines
		y_start=playobj.y+playobj.height-total_yoffset-playobj.footer_bottompad-playobj.logo_height-playobj.footer_toppad-playobj.bottom_margin-xlab_height-playobj.xtick_to_xlabel-coords.height
		var temp_line=snapobj.line(xstart_xcoord+x_step*i,y_start,xstart_xcoord+x_step*i,y_end).attr({stroke:playobj.xgrid_fill,'stroke-width':playobj.xgrid_thickness,'stroke-dasharray':playobj.xgrid_dasharray,opacity:playobj.xgrid_opacity,'shape-rendering':'crispEdges'})
		var temp_minorline=snapobj.line(xstart_xcoord+(x_step/2)+x_step*i,y_start,xstart_xcoord+(x_step/2)+x_step*i,y_end).attr({stroke:playobj.xgrid_minorfill,'stroke-width':playobj.xgrid_minorthickness,opacity:playobj.xgrid_minoropacity,'stroke-dasharray':playobj.xgrid_minordasharray,'shape-rendering':'crispEdges'})
		var temp_tick=snapobj.line(xstart_xcoord+x_step*i,y_start,xstart_xcoord+x_step*i,y_start+playobj.xtick_length).attr({stroke:playobj.xtick_fill,'stroke-width':playobj.xtick_thickness,'shape-rendering':'crispEdges'})
		
		// handle y=0 as appropriate
		if(xvar[i]=='0'){
			temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.ygrid_zerothickness,'stroke-dasharray':playobj.ygrid_zerodasharray,zeroline:'1'})
			if(parseFloat(temp_tick.attr('stroke-width'))!=0){
				temp_tick.attr({'stroke-width':playobj.xgrid_zerothickness})
			}
		}
	}

	// now add all the other stuff into total_yoffset so it really does reflect the entire footer + x labels
	total_yoffset=total_yoffset+playobj.footer_bottompad+playobj.logo_height+playobj.footer_toppad+playobj.bottom_margin+xlab_height+playobj.xtick_to_xlabel

	// important parameters - the start and end of the y axis, range, and y step size
	ystart_ycoord=y_start
	yfinal_ycoord=playobj.y+playobj.head_height+playobj.header_bottompad+playobj.header_toppad+playobj.top_margin+legend_height+playobj.legend_toppad+playobj.legend_bottompad
	range=ystart_ycoord-yfinal_ycoord
	if(shifty==1){y_step=range/(yvar.length)}
	else{y_step=range/(yvar.length-1)}

	// Now go back to the y ticks and redraw with appropriate coords
	maxwidth=playobj.ytick_maxsize*playobj.width
	for(var i=0;i<yvar.length+shifty;i++){
		// y-axis labels
		lines=multitext(String(yvar[i]),{ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'},maxwidth)
		for(var j=0;j<lines.length;j++){
			var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,ystart_ycoord-(y_step/2)*shifty-y_step*i+j*parseInt(playobj.xtick_textsize),lines[j]).attr({ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'})
			coords=temp.getBBox()
			temp.attr({y:coords.y-lines.length*coords.height/2})
		}

		// y-axis ticks, grid lines, and minor grid lines
		var temp_line=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-y_step*i,playobj.x+playobj.width-playobj.right_margin,ystart_ycoord-y_step*i).attr({stroke:playobj.ygrid_fill,'stroke-width':playobj.ygrid_thickness,'stroke-dasharray':playobj.ygrid_dasharray,opacity:playobj.ygrid_opacity,'shape-rendering':'crispEdges'})
		var temp_minorline=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-(y_step/2)-y_step*i,playobj.x+playobj.width-playobj.right_margin,ystart_ycoord-(y_step/2)-y_step*i).attr({stroke:playobj.ygrid_minorfill,'stroke-width':playobj.ygrid_minorthickness,opacity:playobj.ygrid_minoropacity,'stroke-dasharray':playobj.ygrid_minordasharray,'shape-rendering':'crispEdges'})
		var temp_tick=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-y_step*i,playobj.x+total_xoffset-playobj.ytick_length,ystart_ycoord-y_step*i).attr({stroke:playobj.ytick_fill,'stroke-width':playobj.ytick_thickness,'shape-rendering':'crispEdges'})

		// handle y=0 as appropriate
		if(yvar[i]=='0'){
			temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.ygrid_zerothickness,'stroke-dasharray':playobj.ygrid_zerodasharray,zeroline:'1'})
			if(parseFloat(temp_tick.attr('stroke-width'))!=0){
				temp_tick.attr({'stroke-width':playobj.ygrid_zerothickness})
			}
		}
	}

	try{snapobj.append(floatgroup)}catch(e){}
	return [xstart_xcoord,xfinal_xcoord,ystart_ycoord,yfinal_ycoord]
}


function isNumber(n){
    return typeof n == 'number' && !isNaN(n - n);
}












