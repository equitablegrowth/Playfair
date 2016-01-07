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
	Playfair.prototype.xaxis = function(parameters) {
		this.xticks= parameters['number_of_ticks'] || 5
		this.xdecimal= parameters['decimal']
		this.xformat= parameters['format']
		this.xpre= parameters['pre'] || ''
		this.xapp= parameters['app'] || ''
		this.xlabel= parameters['label']
	}

	Playfair.prototype.yaxis = function(parameters) {
		this.yticks= parameters['number_of_ticks'] || 5
		this.ydecimal= parameters['decimal']
		this.yformat= parameters['format']
		this.ypre= parameters['pre'] || ''
		this.yapp= parameters['app'] || ''
		this.ylabel= parameters['label']
	}

	// The linechart/scatter plot method
	Playfair.prototype.linechart = function(options) {
		// options is an object, with following possibilities:
		// abline: [slope,intercept] ex: {'abline':[2,1]} -> y=2x+1
		// connect: how should points be ordered for joining - ['varname']
		// label: what variable contains the point labels - ['varname']
		// size: what variable should be used to scale points - ['varname']
		// points: true or false - show points or not
		// labels: true or false - label all points automatically or not

		snapobj=this.svg
		graph_obj=this

		// set up axes
		if (typeof this.yarray=='undefined'){
			yaxis=create_axis(this.dataset[this.yvar],{'prepend':this.ypre,'append':this.yapp})
			this.yarray=yaxis
		} else {
			yaxis=this.yarray
		}

		if (typeof this.xarray=='undefined'){
			xaxis=create_axis(this.dataset[this.xvar],{'prepend':this.xpre,'append':this.xapp})
			this.xarray=xaxis
		} else {
			xaxis=this.xarray
		}

		// text free axes for using in actual calculations
		xmaxis=[]
		ymaxis=[]

		if(Object.prototype.toString.call(xaxis[0])==='[object Date]'){
			xmaxis=xaxis
		} else{
			for(var i=0;i<xaxis.length;i++){
				xmaxis.push(xaxis[i].replace(/[^0-9\.\-]+/g, ''))
			}
		}

		if(Object.prototype.toString.call(yaxis[0])==='[object Date]'){
			ymaxis=yaxis
		} else{
			for(var i=0;i<yaxis.length;i++){
				ymaxis.push(yaxis[i].replace(/[^0-9\.\-]+/g, ''))
			}
		}

		// set background fill for chart
		var graph_background=snapobj.rect(graph_obj.x,graph_obj.y+graph_obj.head_height,graph_obj.width,graph_obj.height-(graph_obj.head_height+logo_coords.height+graph_obj.footer_toppad)).attr({class:'background',fill:this.chartfill})

		// draw axes
		axes=draw_axes(this,xaxis,yaxis)

		// draw shading intervals if necessary
		if(options['shading'].length>0){
			shading=options['shading']
			for(var i=0;i<shading.length;i++){
				x_min=axes[0]+((shading[i][0]-xmaxis[0])/(xmaxis[xmaxis.length-1]-xmaxis[0]))*(axes[1]-axes[0])
				x_max=axes[0]+((shading[i][1]-xmaxis[0])/(xmaxis[xmaxis.length-1]-xmaxis[0]))*(axes[1]-axes[0])

				graphx_min=axes[0]+((xmaxis[0]-xmaxis[0])/(xmaxis[xmaxis.length-1]-xmaxis[0]))*(axes[1]-axes[0])
				graphx_max=axes[0]+((xmaxis[xmaxis.length-1]-xmaxis[0])/(xmaxis[xmaxis.length-1]-xmaxis[0]))*(axes[1]-axes[0])

				y_min=axes[2]-((ymaxis[0]-ymaxis[0])/(ymaxis[ymaxis.length-1]-ymaxis[0]))*(axes[2]-axes[3])
				y_max=axes[2]-((ymaxis[ymaxis.length-1]-ymaxis[0])/(ymaxis[ymaxis.length-1]-ymaxis[0]))*(axes[2]-axes[3])

				if(x_min<graphx_min){x_min=graphx_min}
				if(x_max>graphx_max){x_max=graphx_max}

				console.log(x_min,x_max)

				if(x_max-x_min>0){
					snapobj.rect(x_min,y_max,x_max-x_min,y_min-y_max).attr({fill:'white',opacity:.6})
				}
			}
		}

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

		// order data_array according to the connection variable
		if ('connect' in options){
			data_array.sort(function(a,b){
				return a[3]-b[3]
			})
		}

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

				x_data_range=xmaxis[xmaxis.length-1]-xmaxis[0]
				x_data_value=axes[0]+((x-xmaxis[0])/(xmaxis[xmaxis.length-1]-xmaxis[0]))*(axes[1]-axes[0])

				y_data_range=ymaxis[ymaxis.length-1]-ymaxis[0]
				y_data_value=axes[2]-((y-ymaxis[0])/(ymaxis[ymaxis.length-1]-ymaxis[0]))*(axes[2]-axes[3])

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
					snapobj.circle(x_data_value,y_data_value,pointsize).attr({fill:this.qualitative_color[i],stroke:this.qualitative_color[i],'stroke-width':this.point_strokewidth,'data_type':'point','data_label':group_array[k][4],'group':group[i],'class':'dataelement','fill-opacity':this.point_fillopacity})
				}

				// label point
				if (options['labels']==true) {
					var label=snapobj.text(x_data_value,y_data_value-pointsize-3,group_array[k][4]).attr({'font-family':this.dataface,'font-size':this.datasize,'font-weight':this.dataweight,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
					coords=label.getBBox()
					label.attr({y:coords.y-coords.height})
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

				snapobj.path(path_string).attr({stroke:this.qualitative_color[i],'stroke-width':2,fill:'none','group':group[i],'fill-opacity':0})
			}
		}

		// draw abline(s) if necessary
		for (var i=0;i<options['abline'].length;i++) {
			ab=options['abline'][i]

			if(ab[0]=='-'){
				vert_flag=1
				ab=[0,parseFloat(ab[1])]
			} else {
				vert_flag=0
				ab=[parseFloat(ab[0]),parseFloat(ab[1])]
			}

			if (isNumber(ab[0])==true && isNumber(ab[1])==true){
				slope=ab[0]
				x1=xmaxis[0]
				x2=xmaxis[xmaxis.length-1]
				y1=ab[1]+ab[0]*x1
				y2=ab[1]+ab[0]*x2

				if(vert_flag==1){
					x1=ab[1]
					x2=ab[1]
					y1=ymaxis[0]
					y2=ymaxis[yaxis.length-1]
				}

				if (y1<ymaxis[0]){
					if (ab[0]!=0){
						y1=ymaxis[0]
						x1=(y1-ab[1])/ab[0]
					} else {
						// this only happens when a horizontal line is below the chart. No action should be necessary.
					}

				}
				if (y2>ymaxis[yaxis.length-1]){
					if (ab[0]!=0){
						y2=ymaxis[yaxis.length-1]
						x2=(y2-ab[1])/ab[0]					
					}
				}

				y1_data_value=axes[2]-((y1-yaxis[0])/(ymaxis[ymaxis.length-1]-ymaxis[0]))*(axes[2]-axes[3])
				y2_data_value=axes[2]-((y2-yaxis[0])/(ymaxis[ymaxis.length-1]-ymaxis[0]))*(axes[2]-axes[3])

				x1_data_value=axes[0]+((x1-xmaxis[0])/(xmaxis[xmaxis.length-1]-xmaxis[0]))*(axes[1]-axes[0])
				x2_data_value=axes[0]+((x2-xmaxis[0])/(xmaxis[xmaxis.length-1]-xmaxis[0]))*(axes[1]-axes[0])

				tempwidth=x2_data_value-x1_data_value
				tempheight=y1_data_value-y2_data_value
				unitslope=tempheight/tempwidth

				trendstring='M'+x1_data_value+' '+y1_data_value+'L'+x2_data_value+' '+y2_data_value

				var trend=snapobj.path(trendstring).attr({stroke:this.trend_fill,'stroke-width':this.trend_width})
				var trendtext=snapobj.text((x1_data_value+x2_data_value)/2,(y1_data_value+y2_data_value)/2,'Trendline').attr({fill:this.trend_textcolor,'font-family':this.trend_textface,'font-size':this.trend_textsize,'font-weight':this.trend_textweight,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
				coords=trendtext.getBBox()
				trendtext.attr({y:coords.y-this.trend_linetotext-coords.height})
				inclination=-(Math.atan(parseFloat(unitslope))*360)/(2*Math.PI)
				trendtext.transform('r'+inclination+' '+coords.cx+' '+coords.cy)
			}
		}

		// fix up the key - change rectangles to bubbles or lines as appropriate
		keyobjs=snapobj.selectAll('rect[ident="key"][ident2="keybox"]')
		for(var i=0;i<keyobjs.length;i++){
			coords=keyobjs[i].getBBox()
			keyobjs[i].remove()
			if ('connect' in options){
				var line=snapobj.line(coords.x,coords.cy,coords.x2,coords.cy).attr({group:group[i],stroke:this.qualitative_color[i],'stroke-width':2,ident:'key',ident2:'keybox','shape-rendering':'crispEdges'})
				// try{floatgroup.append(line)}catch(err){console.log(err)}
			}
			if (options['points']==true){
				if (pointsize>coords.x2-coords.cx){pointsize=coords.x2-coords.cx-4}
				var center=snapobj.circle(coords.cx,coords.cy,pointsize).attr({group:group[i],fill:this.qualitative_color[i],stroke:this.qualitative_color[i],'stroke-width':2,ident:'key',ident2:'keybox','fill-opacity':.2})
				// try{floatgroup.append(center)}catch(err){console.log(err)}
			}
		}
	}


	// The barchart method
	Playfair.prototype.barchart = function(options) {
		snapobj=this.svg
		orientation=options['orientation']

		// category values
		if (typeof this.yarray=='undefined'){
			yaxis=create_axis(this.dataset[this.yvar],{'prepend':this.ypre,'append':this.yapp,'must_include_zero':1})
			this.yarray=yaxis
		} else {
			yaxis=this.yarray
		}

		// text free axes for using in actual calculations
		ymaxis=[]

		for(var i=0;i<yaxis.length;i++){
			ymaxis.push(yaxis[i].replace(/[^0-9\.\-]+/g, ''))
		}

		// bar categories
		if (typeof this.xarray=='undefined'){
			xaxis=[]
			xaxistemp=this.dataset[this.xvar]
			for(var i=0;i<xaxistemp.length;i++){
				if(xaxis.indexOf(xaxistemp[i]) == -1){
					xaxis.push(xaxistemp[i])
				}
			}
			this.xarray=xaxis
		} else {
			xaxis=this.xarray
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
			axes=draw_axes(this,yaxis,xaxis.reverse(),0,1)
		}

		console.log(axes)

		// axes returns: [xstart_xcoord,xfinal_xcoord,ystart_ycoord,yfinal_ycoord]
		// graph data
		if(orientation=='vertical'){
			data_range=ymaxis[ymaxis.length-1]-ymaxis[0]
			zero=axes[2]-(-ymaxis[0]/data_range)*(axes[2]-axes[3])
			margin=((1-this.barchart_width)/2)*((axes[1]-axes[0])/xaxis.length)


			// if there are NO GROUPS
			if(this.group=='none'){
				// loop through bar categories
				for (var i=0;i<xaxis.length;i++){
					data_value=(this.dataset[this.yvar][i])/(ymaxis[ymaxis.length-1]-ymaxis[0])*(axes[2]-axes[3])
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
						data_value=(temp_array2[j][1])/(ymaxis[ymaxis.length-1]-ymaxis[0])*(axes[2]-axes[3])
						var bar_rect=snapobj.rect(axes[0]+margin*(i+1)+margin*i+bar_width*i*group.length+bar_width*j,zero-data_value,bar_width,data_value).attr({'data_type':'bar','data_label':temp_array2[j][1],'group':temp_array2[j][2],'class':'dataelement','shape-rendering':'crispEdges',fill:this.qualitative_color[j]})
					}
				}
			}
		}
		if(orientation=='horizontal'){
			data_range=ymaxis[ymaxis.length-1]-ymaxis[0]
			zero=axes[0]-(-ymaxis[0]/data_range)*(axes[0]-axes[1])
			margin=((1-this.barchart_width)/2)*((axes[2]-axes[3])/xaxis.length)

			// if there are NO GROUPS
			if(this.group=='none'){
				// loop through bar categories
				for (var i=0;i<xaxis.length;i++){
					data_value=(this.dataset[this.yvar][i])/(ymaxis[ymaxis.length-1]-ymaxis[0])*(axes[1]-axes[0])
					bar_width=this.barchart_width*((axes[2]-axes[3])/xaxis.length)
					console.log(axes)
					if(data_value<0){
						var bar_rect=snapobj.rect(zero,axes[3]+margin*(i+1)+margin*i+bar_width*i,data_value,bar_width).attr({'data_type':'bar','data_label':this.dataset[this.yvar][i],'class':'dataelement','shape-rendering':'crispEdges',fill:this.qualitative_color[0]})
					}
					else{
						var bar_rect=snapobj.rect(zero,axes[3]+margin*(i+1)+margin*i+bar_width*i,data_value,bar_width).attr({'data_type':'bar','data_label':this.dataset[this.yvar][i],'class':'dataelement','shape-rendering':'crispEdges',fill:this.qualitative_color[0]})
					}
				}
			}

			// if there IS GROUPING
			if(this.group!=='none'){
				bar_width=this.barchart_width*((axes[2]-axes[3])/xaxis.length)/group.length
				margin=((1-this.barchart_width)/2)*((axes[2]-axes[3])/xaxis.length)

				// Create an array of arrays to hold the full dataset with all 3 vars
				data_array=[]
				for (var i=0;i<this.dataset[this.xvar].length;i++){
					data_array.push([this.dataset[this.xvar][i],this.dataset[this.yvar][i],this.dataset[this.group][i]])	
				}

				for (var i=0;i<xaxis.length;i++){
					// generate array of observations with category matching xaxis[i]
					temp_array=[]
					for (var j=0;j<data_array.length;j++){
						if (data_array[j][0]==xaxis[xaxis.length-(i+1)]){
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

					console.log(xaxis[i],temp_array2,margin)

					// draw bars based on temp_array2
					for (var j=0;j<temp_array2.length;j++){
						data_value=(temp_array2[j][1])/(ymaxis[ymaxis.length-1]-ymaxis[0])*(axes[1]-axes[0])
						console.log(temp_array2[j],data_value)
						var bar_rect=snapobj.rect(zero,axes[3]+margin*(i+1)+margin*i+bar_width*i*group.length+bar_width*j,data_value,bar_width).attr({'data_type':'bar','data_label':temp_array2[j][1],'group':temp_array2[j][2],'class':'dataelement','shape-rendering':'crispEdges',fill:this.qualitative_color[j]})
					}
				}
			}
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

		default_parameters={
			// margins
			'top_margin':25,
			'bottom_margin':8,
			'left_margin':10,
			'right_margin':40,

			// head/foot heights
			'head_height':0,
			'logo_height':0,

			// hed
			'hedsize':'20px',
			'hedweight':700,
			'hedface':'Lato',

			// dek
			'deksize':'16px',
			'dekweight':400,
			'dekface':'Lato',

			// data labels
			'datasize':'11px',
			'dataweight':400,
			'dataface':'Lato',

			// annotations
			'annotatesize':'12px',
			'annotateweight':600,
			'annotateface':'Lato',

			// source
			'sourcesize':'10px',
			'sourceweight':400,
			'sourceface':'Lato',

			// note
			'notesize':'10px',
			'noteweight':400,
			'noteface':'Lato',

			// chart formatting
			'chartfill':'#ece9e8',
			'chart_toppad':0,
			'chart_bottompad':0,
			'chart_leftpad':0,
			'chart_rightpad':0,

			// header formatting
			'headerfill':'#ffffff',
			'header_toppad':0,
			'header_bottompad':3,
			'header_leftpad':0,
			'header_rightpad':0,

			// footer formatting
			'footerfill':'#ffffff',
			'footer_toppad':4,
			'footer_bottompad':0,
			'footer_leftpad':0,
			'footer_rightpad':0,

			// x grids
			'xgrid_fill':'white',
			'xgrid_zerofill':'white',
			'xgrid_minorfill':'white',
			'xgrid_thickness':1,
			'xgrid_zerothickness':2,
			'xgrid_minorthickness':1,
			'xgrid_dasharray':[],
			'xgrid_zerodasharray':[],
			'xgrid_minordasharray':[3,3],
			'xgrid_opacity':0,
			'xgrid_zeroopacity':0,
			'xgrid_minoropacity':0,

			// y grids
			'ygrid_fill':'white',
			'ygrid_zerofill':'white',
			'ygrid_minorfill':'white',
			'ygrid_thickness':1,
			'ygrid_zerothickness':2,
			'ygrid_minorthickness':1,
			'ygrid_dasharray':[],
			'ygrid_zerodasharray':[],
			'ygrid_minordasharray':[3,3],
			'ygrid_opacity':1,
			'ygrid_zeroopacity':1,
			'ygrid_minoropacity':0,

			// x ticks
			'xtick_textsize':'14px',
			'xtick_textweight':400,
			'xtick_textface':'Lato',
			'xtick_maxsize':.15,
			'xtick_length':4,
			'xtick_thickness':1,
			'xtick_fill':'white',
			'xtick_to_xlabel':5,
			'xtick_to_xaxis':5,

			// y ticks
			'ytick_textsize':'14px',
			'ytick_textweight':400,
			'ytick_textface':'Lato',
			'ytick_maxsize':.15,
			'ytick_length':16,
			'ytick_thickness':1,
			'ytick_fill':'white',
			'ytick_to_ylabel':6,
			'ytick_to_yaxis':20,

			// x label
			'xlabel_textsize':'14px',
			'xlabel_textweight':400,
			'xlabel_textface':'Lato',

			// y label
			'ylabel_textsize':'14px',
			'ylabel_textweight':400,
			'ylabel_textface':'Lato',

			// legend
			'legend_location':'top',
			'legend_maxwidth':.1,
			'legend_textsize':'12px',
			'legend_textweight':400,
			'legend_textface':'Lato',
			'legend_toppad':8,
			'legend_bottompad':0,
			'legend_rightpad':0,
			'legend_leftpad':0,
			'legend_elementsize':15,
			'legend_elementpad':5,
			'legend_floatbackground':'white',
			'legend_floatthickness':1,
			'legend_floatstroke':'#b5b5b5',
			'legend_floatpad':8,

			// color scales
			'diverging_color':['#523211','#8b5322','#dec17c','#80ccc0','#35968e'],
			'sequential_color':['#205946','#33836A','#67c2a5','#b7dfd1','#e2f2ed'],
			'qualitative_color':['#67c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854','#ffd92f','#e5c494','#b3b3b3'],

			// barchart specific style
			'barchart_width':.8,

			// line/scatter specific style
			'trend_width':1.5,
			'trend_fill':'#c64027',
			'trend_textface':'Lato',
			'trend_textweight':600,
			'legend_textsize':'12px',
			'trend_textcolor':'#c64027',
			'trend_linetotext':3,
			'point_size':4,
			'point_strokewidth':1.7,
			'point_fillopacity':1,
			'point_maxsize':25,
		}

		for (var property in default_parameters){
			if (parameters[property]===undefined){
				this[property]=default_parameters[property]
			} else {
				this[property]=parameters[property]
			}
		}
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

function create_axis(dataseries,parameters) {

	ticks = parameters['ticks'] || 5
	decimal = parameters['decimal'] || undefined
	prepend = parameters['prepend'] || ''
	append = parameters['append'] || ''
	mustincludezero = parameters['must_include_zero'] || 0

	mindata=dataseries[0]
	maxdata=dataseries[0]
	zero_flag=0

	for(var i=0;i<dataseries.length;i++){
		if(dataseries[i]<mindata){mindata=dataseries[i]}
		if(dataseries[i]>maxdata){maxdata=dataseries[i]}
	}

	if (Object.prototype.toString.call(dataseries[0])==='[object Date]'){
		// figure out what magnitude the range is - should we measure in years, months, or days?
		var daylength=86400000
		var monthlength=2628288000
		var yearlength=31536000000

		range=maxdata-mindata

		if (mustincludezero==1){
			console.log("Date variable type doesn't make sense for this axis.")
			return []
		}

		// if the range is more than 4 years, then the axis should be denominated in years
		if (range>=yearlength*4){
			drange=maxdata.getUTCFullYear()-mindata.getUTCFullYear()
			digits=drange.toString().length
			candidate_arrays=[]
			candidate_steps=[]
			nice_ticks=[.1,.2,.3,.4,.5,.6,.7,.8,.9,1]

		    for (var i=0;i<nice_ticks.length;i++){
				if(nice_ticks[i]*Math.pow(10,digits)>=1){candidate_steps.push(nice_ticks[i]*Math.pow(10,digits))}
				if(nice_ticks[i]*Math.pow(10,digits-1)>=1){candidate_steps.push(nice_ticks[i]*Math.pow(10,digits-1))}
				if(nice_ticks[i]*Math.pow(10,digits+1)>=1){candidate_steps.push(nice_ticks[i]*Math.pow(10,digits+1))}
		    }

			console.log('drange: ',drange,'digits: ',digits,candidate_steps)

			// create step arrays. For dates, the lowest value should always be the first date so the line
			// starts right away.
			for (var i=0;i<candidate_steps.length;i++){
		    	steps=parseInt(candidate_steps[i])
		    	var temp=new Date(String(mindata.getUTCFullYear()))
				step_array=[temp]

		    	var stepnum=1
			    while (step_array[step_array.length-1]<maxdata){
			    	var temp=new Date(String(parseInt(step_array[0].getUTCFullYear())+steps*stepnum))
			        step_array.push(temp)
			        stepnum++
			    }

			    // this arbitrarily enforces step_arrays of length between 4 and 10
			    if (step_array.length<11 && step_array.length>3){candidate_arrays.push(step_array)}
		    }
		}

		// if the range is more than 4 months but <4 years, the axis should be denominated in months
		else if (range>=monthlength*4){
			drange=(maxdata.getUTCMonth()+maxdata.getUTCFullYear()*12)-(mindata.getUTCMonth()+mindata.getUTCFullYear()*12)
			digits=drange.toString().length
			candidate_arrays=[]
			candidate_steps=[]
			nice_ticks=[.1,.2,.3,.4,.5,.6,.7,.8,.9,1]

		    for (var i=0;i<nice_ticks.length;i++){
				if(nice_ticks[i]*Math.pow(10,digits)>=1){candidate_steps.push(nice_ticks[i]*Math.pow(10,digits))}
				if(nice_ticks[i]*Math.pow(10,digits-1)>=1){candidate_steps.push(nice_ticks[i]*Math.pow(10,digits-1))}
				if(nice_ticks[i]*Math.pow(10,digits+1)>=1){candidate_steps.push(nice_ticks[i]*Math.pow(10,digits+1))}
		    }

			console.log('drange: ',drange,'digits: ',digits,'candidates: ',candidate_steps)

			// create step arrays. For dates, the lowest value should always be the first date so the line
			// starts right away.
			for (var i=0;i<candidate_steps.length;i++){
		    	steps=parseInt(candidate_steps[i])
		    	var temp=new Date()
		    	temp.setFullYear(mindata.getUTCFullYear())
		    	temp.setMonth(mindata.getUTCMonth())
		    	temp.setDate(mindata.getUTCDate())
				step_array=[temp]

		    	var stepnum=1
			    while (step_array[step_array.length-1]<maxdata){
			    	var temp=new Date
			    	temp.setFullYear(mindata.getUTCFullYear())
			    	temp.setMonth(mindata.getUTCMonth()+stepnum*steps)
			    	temp.setDate(mindata.getUTCDate())
			        step_array.push(temp)
			        stepnum++
			    }

			    // this arbitrarily enforces step_arrays of length between 4 and 10
			    if (step_array.length<11 && step_array.length>3){candidate_arrays.push(step_array)}
		    }
		} 
		// Otherwise the axis should be denominated in days. If it's too small than this, then it
		// really shouldn't be a date at all - seconds or hours can just be counted. There is the edge
		// case of tracking hours over more than one day and this may be a worthwhile future feature.
		else {

		}

		// sort candidate_arrays by length (smallest first)
		candidate_arrays.sort(function(a,b) {
			return a.length-b.length
		})

		// now evaluate all possibilities in the candidate_array
		best_score=Number.POSITIVE_INFINITY
		for (var i=0;i<candidate_arrays.length;i++){
			candidate_range=candidate_arrays[i][candidate_arrays[i].length-1]-candidate_arrays[i][0]
			wasted=(candidate_range-range)/candidate_range

			penalty=1
			if(candidate_arrays[i].length>6){
				penalty=1+.1*(candidate_arrays[i].length-6)
			}

			score=Math.pow(10,wasted)*penalty

			if (score<best_score){
				best_score=score
				best_array=candidate_arrays[i]
			}

			console.log('array: ',candidate_arrays[i],'score: ',score,'penalty: ',penalty)
		}

		return best_array
	} 

	// if the dataseries is not type date
	else {

		if(mindata>0 && mustincludezero==1) {
			mindata=0
		}

		if(mindata<=0 && maxdata>=0){
			zero_flag=1
		}

		range=maxdata-mindata
		nice_ticks=[.1,.2,.5,1,.15,.25,.75]

		// This is sort of a brute force method for finding a good division of the graph.
		// First, generate a big list of candidate step values, make an axis for each one,
		// and evaluate that axis by the amount of 'wasted space' it has. Give preference
		// to nice numbers of ticks (I prefer about 5 but this can be set) - larger numbers
		// of ticks will generally have an advantage is reducing wasted space, so penalize
		// them by some arbitrary amount (another setting). Some of the candidate step
		// numbers are gonna be garbage but hey, computation is cheap.

		console.log('range: ',range,'ticks: ',ticks,'maxdata: ',maxdata,'mindata: ',mindata)
	    steps=range/(ticks-1)
	    
	    if(steps>=1){
		    rounded=Math.round(steps)
		    digits=rounded.toString().length
	    } else {
	    	places=steps.toString().split('.')[1]
	    	first_place=0
	    	for(var i=0;i<places.length;i++){
	    		if (places[i]!='0' && first_place==0){
	    			first_place=i
	    		}
	    	}

	    	digits=-parseInt(first_place)
	    }

	    candidate_steps={0:[],1:[],2:[],3:[],4:[],5:[],6:[],7:[],8:[],9:[],10:[]}
	    candidate_arrays=[]

	    // generate the candidate steps
	    // this whole candidate_steps[5] thing is all about knowing where to truncate
	    // numbers that have no exact binary representation. This seems like an incredibly
	    // stupid way to do it and there must be another way but I'm not sure what it is.

	    for (var i=0;i<nice_ticks.length;i++){
	    	if (i<4){digit_mod=digits+1}else{digit_mod=digits}
	    	if(digits>=3){
				candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits))
				candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits-1))
				candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits+1))
	    	}
	    	if(digits==2){
				candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits))
				try{candidate_steps[digit_mod-1].push(nice_ticks[i]*Math.pow(10,digits-1))}catch(err){candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits-1))}
				candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits+1))
	    	}
	    	if(digits<2){
				try{candidate_steps[2-digit_mod].push(nice_ticks[i]*Math.pow(10,digits))}catch(err){candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits))}
				try{candidate_steps[3-digit_mod].push(nice_ticks[i]*Math.pow(10,digits-1))}catch(err){candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits-1))}
				try{candidate_steps[1-digit_mod].push(nice_ticks[i]*Math.pow(10,digits+1))}catch(err){candidate_steps[0].push(nice_ticks[i]*Math.pow(10,digits+1))}
	    	}

	    }

	    // generate an axis for each of the candidate step numbers
	    for (var key in candidate_steps){
			for (var i=0;i<candidate_steps[key].length;i++){
		    	steps=parseFloat(candidate_steps[key][i])

		    	// starting value depends on whether or not 0 is in the array
		    	if(zero_flag==1){
			    	min_steps=Math.ceil(Math.abs(mindata)/steps)
			    	step_array=[(-min_steps*steps).toFixed(key)]		
		    	} else {
		    		step_array=[(Math.floor(mindata/steps)*steps).toFixed(key)]
		    	}

		    	var stepnum=1
			    while (step_array[step_array.length-1]<maxdata){
			        step_array.push((parseFloat(step_array[0])+steps*stepnum).toFixed(key))
			        stepnum++
			    }

			    // this arbitrarily enforces step_arrays of length between 4 and 10
			    if (step_array.length<11 && step_array.length>4){candidate_arrays.push(step_array)}
		    }
		}

		// sort candidate_arrays by length (smallest first)
		candidate_arrays.sort(function(a,b) {
			return a.length-b.length
		})

		// now evaluate all possibilities in the candidate_array
		best_score=Number.POSITIVE_INFINITY
		for (var i=0;i<candidate_arrays.length;i++){
			candidate_range=parseFloat(candidate_arrays[i][candidate_arrays[i].length-1])-parseFloat(candidate_arrays[i][0])
			wasted=(candidate_range-range)/candidate_range

			penalty=1
			if(candidate_arrays[i].length>6){
				penalty=1+.4*(candidate_arrays[i].length-6)
			}

			score=Math.pow(10,wasted)*penalty

			if (score<best_score){
				best_score=score
				best_array=candidate_arrays[i]
			}

			console.log('array: ',candidate_arrays[i],'score: ',score,'penalty: ',penalty)
		}

		// add any text tweaks demanded by the parameters passed
		for (var i=0;i<best_array.length;i++){
			best_array[i]=prepend+best_array[i]+append
		}

		return best_array
	}
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
				if(Object.prototype.toString.call(grouptemp[i])==='[object Date]'){
					group.push(formatDate(grouptemp[i],Math.max(...grouptemp)-Math.min(...grouptemp)))
				} else{
					group.push(grouptemp[i])
				}
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

		// listener for drag events on a floating key
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
				} else{
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

		// Draw the key - location float
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

			// floatgroup=snapobj.group()
			var floatkey=snapobj.rect(0,0,playobj.legend_floatpad*2+playobj.legend_elementsize+playobj.legend_elementpad+length,playobj.legend_floatpad*2+lineheight*group.length+(group.length-1)*playobj.legend_elementpad).attr({ident2:'floatkey',ident:'key',fill:playobj.legend_floatbackground,stroke:playobj.legend_floatstroke,'stroke-width':playobj.legend_floatthickness,'shape-rendering':'crispEdges'})
			// floatgroup.append(floatkey)

			for (var i=0;i<group.length;i++){
				var temprect=snapobj.rect(playobj.legend_floatpad,playobj.legend_floatpad+lineheight*i+playobj.legend_elementpad*i,playobj.legend_elementsize,playobj.legend_elementsize).attr({group:group[i],fill:playobj.qualitative_color[i],ident:'key',ident2:'keybox','shape-rendering':'crispEdges'})
				var temp=snapobj.text(playobj.legend_floatpad+playobj.legend_elementsize+playobj.legend_elementpad,playobj.legend_floatpad+lineheight*i+playobj.legend_elementpad*i,group[i]).attr({ident:'key','font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
			}
			// floatgroup.drag()
			floatkey.drag(moveFuncfloat,function(){x=this.attr('x');y=this.attr('y');prevx=0;prevy=0});
			// floatgroup.attr({transform:'t100 100'})
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
		var ylab=snapobj.text(playobj.x+playobj.left_margin,((playobj.y+playobj.height-playobj.logo_height-playobj.footer_toppad)+(playobj.y+playobj.head_height+playobj.top_margin+legend_height+playobj.legend_toppad+playobj.legend_bottompad))/2,String(playobj.ylabel)).attr({ident:'yaxis','font-size':playobj.ylabel_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'central','text-anchor':'middle'})
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

	for(var i=0;i<yvar.length;i++){
		if(Object.prototype.toString.call(yvar[i])==='[object Date]'){
			string=formatDate(yvar[i],Math.max(...yvar)-Math.min(...yvar))
		} else {
			string=String(yvar[i])
		}
		var temp=snapobj.text(playobj.left_margin+ylab_width+playobj.ytick_to_ylabel,0,string).attr({ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
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

	for(var i=0;i<xvar.length;i++){
		if(x_step<playobj.xtick_maxsize*playobj.width){maxwidth=x_step}
		else{maxwidth=playobj.xtick_maxsize*playobj.width}

		if(Object.prototype.toString.call(xvar[i])==='[object Date]'){
			string=formatDate(xvar[i],Math.max(...xvar)-Math.min(...xvar))
		} else {
			string=String(xvar[i])
		}

		lines=multitext(string,{ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'},maxwidth)
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

		if(Object.prototype.toString.call(xvar[i])==='[object Date]'){
			string=formatDate(xvar[i],Math.max(...xvar)-Math.min(...xvar))
		} else {
			string=String(xvar[i])
		}

		lines=multitext(string,{ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'},maxwidth)
		for(var j=0;j<lines.length;j++){
			if (Object.prototype.toString.call(xvar[i])!='[object Date]' && ((parseInt(lines[j])>=1000 || parseInt(lines[j])<=-1000))){linesj=commas(lines[j])} else{linesj=lines[j]}
			var temp=snapobj.text(xstart_xcoord+(x_step/2)*shiftx+x_step*i,playobj.y+playobj.height-playobj.bottom_margin-playobj.logo_height-playobj.footer_toppad-playobj.footer_bottompad-xlab_height-playobj.xtick_to_xlabel-total_yoffset+playobj.xtick_to_xaxis+j*parseInt(playobj.xtick_textsize),linesj).attr({ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xtick_textweight,'font-family':playobj.xtick_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
			coords=temp.getBBox()
			temp.attr({y:coords.y-coords.height})
		}
		// x-axis ticks, grid lines, and minor grid lines
		y_start=playobj.y+playobj.height-total_yoffset-playobj.footer_bottompad-playobj.logo_height-playobj.footer_toppad-playobj.bottom_margin-xlab_height-playobj.xtick_to_xlabel-coords.height
		var temp_line=snapobj.line(xstart_xcoord+x_step*i,y_start,xstart_xcoord+x_step*i,y_end).attr({stroke:playobj.xgrid_fill,'stroke-width':playobj.xgrid_thickness,'stroke-dasharray':playobj.xgrid_dasharray,opacity:playobj.xgrid_opacity,'shape-rendering':'crispEdges'})
		if (i!=xvar.length-1){var temp_minorline=snapobj.line(xstart_xcoord+(x_step/2)+x_step*i,y_start,xstart_xcoord+(x_step/2)+x_step*i,y_end).attr({stroke:playobj.xgrid_minorfill,'stroke-width':playobj.xgrid_minorthickness,opacity:playobj.xgrid_minoropacity,'stroke-dasharray':playobj.xgrid_minordasharray,'shape-rendering':'crispEdges'})}
		var temp_tick=snapobj.line(xstart_xcoord+x_step*i,y_start,xstart_xcoord+x_step*i,y_start+playobj.xtick_length).attr({stroke:playobj.xtick_fill,'stroke-width':playobj.xtick_thickness,'shape-rendering':'crispEdges'})
		
		// handle x=0 as appropriate
		if(Object.prototype.toString.call(xvar[i])!='[object Date]'){
			try{
				if(parseInt(xvar[i].replace(/[^0-9\.\-]+/g,''))=='0'){
					temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.xgrid_zerothickness,'stroke-dasharray':playobj.xgrid_zerodasharray,zeroline:'1'})
					if(parseFloat(temp_tick.attr('stroke-width'))!=0){
						temp_tick.attr({'stroke-width':playobj.xgrid_zerothickness})
					}
				}
			} catch(err){}
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
	for(var i=0;i<yvar.length;i++){
		// y-axis labels

		if(Object.prototype.toString.call(yvar[i])==='[object Date]'){
			string=formatDate(yvar[i],Math.max(...yvar)-Math.min(...yvar))
		} else {
			string=String(yvar[i])
		}

		lines=multitext(string,{ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'},maxwidth)
		for(var j=0;j<lines.length;j++){
			if (parseInt(lines[j])>=1000 || parseInt(lines[j])<=-1000){linesj=commas(lines[j])} else{linesj=lines[j]}
			var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,ystart_ycoord-(y_step/2)*shifty-y_step*i+j*parseInt(playobj.xtick_textsize),linesj).attr({ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'})
			coords=temp.getBBox()
			temp.attr({y:coords.y-lines.length*coords.height/2})
		}

		// y-axis ticks, grid lines, and minor grid lines
		var temp_line=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-y_step*i,playobj.x+playobj.width-playobj.right_margin,ystart_ycoord-y_step*i).attr({stroke:playobj.ygrid_fill,'stroke-width':playobj.ygrid_thickness,'stroke-dasharray':playobj.ygrid_dasharray,opacity:playobj.ygrid_opacity,'shape-rendering':'crispEdges'})
		if(i!=yvar.length-1){var temp_minorline=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-(y_step/2)-y_step*i,playobj.x+playobj.width-playobj.right_margin,ystart_ycoord-(y_step/2)-y_step*i).attr({stroke:playobj.ygrid_minorfill,'stroke-width':playobj.ygrid_minorthickness,opacity:playobj.ygrid_minoropacity,'stroke-dasharray':playobj.ygrid_minordasharray,'shape-rendering':'crispEdges'})}
		var temp_tick=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-y_step*i,playobj.x+total_xoffset-playobj.ytick_length,ystart_ycoord-y_step*i).attr({stroke:playobj.ytick_fill,'stroke-width':playobj.ytick_thickness,'shape-rendering':'crispEdges'})

		// handle y=0 as appropriate
		if(Object.prototype.toString.call(yvar[i])!='[object Date]'){
			try{
				if(parseInt(yvar[i].replace(/[^0-9\.\-]+/g,''))=='0'){
					temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.ygrid_zerothickness,'stroke-dasharray':playobj.ygrid_zerodasharray,zeroline:'1'})
					if(parseFloat(temp_tick.attr('stroke-width'))!=0){
						temp_tick.attr({'stroke-width':playobj.ygrid_zerothickness})
					}
				}
			} catch(err){}
		}
	}

	// try{snapobj.append(floatgroup)}catch(e){}
	key_elements=grapharea.selectAll('[ident="key"]')
	for(var i=0;i<key_elements.length;i++){
		snapobj.append(key_elements[i])
	}
	return [xstart_xcoord,xfinal_xcoord,ystart_ycoord,yfinal_ycoord]
}


function isNumber(n){
    return typeof n == 'number' && !isNaN(n - n);
}

// I use this function all the time, thanks Elias Zamaria!
//http://stackoverflow.com/a/2901298/3001940
function commas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// take a range of time between dates (use date.getTime()) and a specific date and 
// decide what date display option should be used
function formatDate(date,range){
	var daylength=86400000
	var monthlength=2628288000
	var yearlength=31536000000
	var monthlookup={0:'January',1:'February',2:'March',3:'April',4:'May',5:'June',6:'July',7:'August',8:'September',9:'October',10:'November',11:'December'}

	if (range>=4*yearlength){
		return(date.getUTCFullYear().toString())
	}
	if (range>=4*monthlength){
		return(monthlookup[date.getUTCMonth()]+' '+date.getUTCFullYear())
	}
	return(monthlookup[date.getUTCMonth()]+' '+date.getUTCDate()+', '+date.getUTCFullYear())
}







