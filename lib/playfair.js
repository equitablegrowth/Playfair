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
		this.top_margin=25
		this.bottom_margin=8
		this.left_margin=10
		this.right_margin=20
		this.head_height=0
		this.logo_height=0

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

	// The barchart method
	Playfair.prototype.barchart = function(orientation) {
		snapobj=this.svg

		yaxis=create_axis(this.dataset[this.xvar],this.yticks,this.ydecimal,this.ymult,this.yformat,this.ypre,this.yapp)
		xaxis=this.dataset[this.xvar]

		graph_obj=this

		// set background fill for chart
		var graph_background=snapobj.rect(graph_obj.x,graph_obj.y+graph_obj.head_height,graph_obj.width,graph_obj.height-(graph_obj.head_height+logo_coords.height+graph_obj.footer_toppad)).attr({fill:this.chartfill})

		// draw axes
		console.log(yaxis,xaxis)

		if(orientation=='vertical'){
			// yaxis variable will in fact be on the y-axis, xaxis is categories on the x-axis. Shift x-axis for bars
			draw_axes(this,xaxis,yaxis,1,0)
		}

		if(orientation=='horizontal'){
			// yaxis variable will actually be values on the x-axis, xaxis is categories on the y-axis. Shift y-axis for bars
			draw_axes(this,yaxis,xaxis,0,1)
		}
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

			if(graphobj.source.length>0){
				var source=snapobj.text(graphobj.x+graphobj.footer_leftpad,graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad,'Source: '+graphobj.source).attr({'font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge'})
				source_coords=source.getBBox().y2
			}
			else {source_coords=graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad}

			if(graphobj.note.length>0){
				var note=snapobj.text(graphobj.x+graphobj.footer_leftpad,source_coords,'Note: '+graphobj.note).attr({'font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge'})
			}
			
			var foot_fill=snapobj.rect(0,graphobj.height-logo_coords.height-graphobj.footer_toppad,graphobj.width,logo_coords.height).attr({fill:graphobj.footerfill})
			snapobj.append(source)
			snapobj.append(note)
			snapobj.append(logo)

			graphobj.logo_height=logo_coords.height
			callback(logo_coords.height)
		})
	}

	Playfair.prototype.header = function(hed,dek) {
		snapobj=this.svg

		this.hed=hed
		this.dek=dek

		var hed=snapobj.text(this.x+this.header_leftpad,this.y+this.header_toppad,hed).attr({'font-family':this.hedface,'font-size':this.hedsize,'font-weight':this.hedweight,'dominant-baseline':'text-before-edge'})
		var hed_coords=hed.getBBox()
		var dek=snapobj.text(this.x+this.header_leftpad,this.y+this.header_toppad+hed_coords.y2,dek).attr({'font-family':'Lato','font-size':'16px','font-weight':400,'dominant-baseline':'text-before-edge'})
		
		var lower_hed=hed.getBBox().y2
		var lower_dek=dek.getBBox().y2

		// set head_height to the y2 coord for dek or hed, whichever is lower.
		if(lower_hed>lower_dek){this.head_height=lower_hed+this.header_bottompad}
		else{this.head_height=lower_dek+this.header_bottompad}

		// draw in background and move it to the back
		var head_fill=snapobj.rect(0,0,this.width,this.head_height).attr({fill:this.headerfill})
		snapobj.append(hed)
		snapobj.append(dek)
	}

	Playfair.prototype.style = function() {
		// hed
		this.hedsize='20px'
		this.hedweight=700
		this.hedface='Lato, Arial, sans-serif'

		// dek
		this.deksize='16px'
		this.dekweight=400
		this.dekface='Lato, Arial, sans-serif'

		// source
		this.sourcesize='10px'
		this.sourceweight=400
		this.sourceface='Lato, Arial, sans-serif'

		// note
		this.notesize='10px'
		this.noteweight=400
		this.noteface='Lato, Arial, sans-serif'

		// chart formatting
		this.chartfill='#ece9e8'
		this.chart_toppad=0
		this.chart_bottompad=0
		this.chart_leftpad=0
		this.chart_rightpad=0

		// header formatting
		this.headerfill='#ffffff'
		this.header_toppad=0
		this.header_bottompad=3
		this.header_leftpad=0
		this.header_rightpad=0

		// footer formatting
		this.footerfill='#ffffff'
		this.footer_toppad=4
		this.footer_bottompad=0
		this.footer_leftpad=0
		this.footer_rightpad=0

		// x grids
		this.xgrid_fill='white'
		this.xgrid_zerofill='white'
		this.xgrid_minorfill='white'
		this.xgrid_thickness=0
		this.xgrid_zerothickness=1
		this.xgrid_minorthickness=0
		this.xgrid_dasharray=[1,0]
		this.xgrid_zerodasharray=[1,0]
		this.xgrid_minordasharray=[1,0]

		// y grids
		this.ygrid_fill='white'
		this.ygrid_zerofill='white'
		this.ygrid_minorfill='white'
		this.ygrid_thickness=1
		this.ygrid_zerothickness=2
		this.ygrid_minorthickness=0
		this.ygrid_dasharray=[1,0]
		this.ygrid_zerodasharray=[1,0]
		this.ygrid_minordasharray=[1,0]

		// x ticks
		this.xtick_textsize='11px'
		this.xtick_textweight=500
		this.xtick_textface='Lato, Arial, sans-serif'
		this.xtick_maxsize=.15
		this.xtick_length=4
		this.xtick_thickness=1
		this.xtick_fill='white'
		this.xtick_to_xlabel=5
		this.xtick_to_xaxis=5

		// y ticks
		this.ytick_textsize='11px'
		this.ytick_textweight=500
		this.ytick_textface='Lato, Arial, sans-serif'
		this.ytick_maxsize=.15
		this.ytick_length=4
		this.ytick_thickness=0
		this.ytick_fill='white'
		this.ytick_to_ylabel=6
		this.ytick_to_yaxis=6

		// x label
		this.xlabel_textsize='11px'
		this.xlabel_textweight=500
		this.xlabel_textface='Lato, Arial, sans-serif'

		// y label
		this.ylabel_textsize='11px'
		this.ylabel_textweight=500
		this.ylabel_textface='Lato, Arial, sans-serif'

		// legend

		// annotations

	}

	return playfair;
}());


// Axis creation. I poked around and couldn't find an algorithm I like on stackoverflow etc.
// In particular, many do not treat 0 correctly in my opinion. I started from scratch with the 
// following rules in mind - early rules overrule late rules but the first two rules are 
// inviolable:
//      1a. If an axis crosses 0, 0 *must* be an axis tick value
//      1b. x-axis ticks *must* be attached to a y-axis grid line
//      2.  The data should be as tightly contained as possible (little wasted space)
//      3.  There should be 4-6 ticks on each axis, but if rule 2 requires it, up to 10
//      4.  Numbers should be 'nice' (round numbers etc.) 
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
	return [0,10,20,30,40]
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

	// first draw the y-axis and add all elements to a group. Until the x-axis is drawn,
	// the correct y-location for all these elements is unknown. Draw as if it will be
	// sitting at the bottom of the graph, then move up the correct amount when x-axis is
	// drawn.
	
	snapobj=playobj.svg

	// y label
	if (typeof(playobj.ylabel)!=undefined){
		var ylab=snapobj.text(playobj.x+playobj.left_margin,((playobj.y+playobj.height-playobj.logo_height-playobj.footer_toppad)+(playobj.y+playobj.head_height))/2,String(playobj.ylabel)).attr({ident:'yaxis','font-size':playobj.ylabel_textsize,'font-weight':playobj.ylabel_textweight,'font-face':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
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
		var temp=snapobj.text(playobj.left_margin+ylab_width+playobj.ytick_to_ylabel,0,String(yvar[i])).attr({ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-face':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'start'})
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
		var xlab=snapobj.text((total_xoffset+2*playobj.x+playobj.width-playobj.right_margin)/2,playobj.y+playobj.height-playobj.bottom_margin-playobj.logo_height-playobj.footer_toppad-playobj.footer_bottompad,String(playobj.xlabel)).attr({ident:'xaxis','font-size':playobj.xlabel_textsize,'font-weight':playobj.xlabel_textweight,'font-face':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
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

		lines=multitext(String(xvar[i]),{ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-face':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'},maxwidth)
		for(var j=0;j<lines.length;j++){
			var temp=snapobj.text(0,j*parseInt(playobj.xtick_textsize),lines[j]).attr({ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-face':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
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
	y_end=playobj.y+playobj.head_height+playobj.header_bottompad+playobj.header_toppad+playobj.top_margin
	for(var i=0;i<xvar.length+shiftx;i++){

		// x-axis labels
		lines=multitext(String(xvar[i]),{ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-face':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'},maxwidth)
		for(var j=0;j<lines.length;j++){
			var temp=snapobj.text(xstart_xcoord+(x_step/2)*shiftx+x_step*i,playobj.y+playobj.height-playobj.bottom_margin-playobj.logo_height-playobj.footer_toppad-playobj.footer_bottompad-xlab_height-playobj.xtick_to_xlabel-total_yoffset+playobj.xtick_to_xaxis+j*parseInt(playobj.xtick_textsize),lines[j]).attr({ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xlabel_textweight,'font-face':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle'})
			coords=temp.getBBox()
			temp.attr({y:coords.y-coords.height})
		}
		// x-axis ticks, grid lines, and minor grid lines
		y_start=playobj.y+playobj.height-total_yoffset-playobj.footer_bottompad-playobj.logo_height-playobj.footer_toppad-playobj.bottom_margin-xlab_height-playobj.xtick_to_xlabel-coords.height
		var temp_line=snapobj.line(xstart_xcoord+x_step*i,y_start,xstart_xcoord+x_step*i,y_end).attr({stroke:playobj.xgrid_fill,'stroke-width':playobj.xgrid_thickness,'stroke-dasharray':playobj.xgrid_dasharray,'shape-rendering':'crispEdges'})
		var temp_minorline=snapobj.line(xstart_xcoord+(x_step/2)+x_step*i,y_start,xstart_xcoord+(x_step/2)+x_step*i,y_end).attr({stroke:playobj.xgrid_minorfill,'stroke-width':playobj.xgrid_minorthickness,'stroke-dasharray':playobj.xgrid_minordasharray,'shape-rendering':'crispEdges'})
		var temp_tick=snapobj.line(xstart_xcoord+x_step*i,y_start,xstart_xcoord+x_step*i,y_start+playobj.xtick_length).attr({stroke:playobj.xtick_fill,'stroke-width':playobj.xtick_thickness,'shape-rendering':'crispEdges'})
		
		// handle y=0 as appropriate
		if(xvar[i]=='0'){
			temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.ygrid_zerothickness,'stroke-dasharray':playobj.ygrid_zerodasharray})
			temp_tick.attr({'stroke-width':playobj.xgrid_zerothickness})
		}
	}

	// now add all the other stuff into total_yoffset so it really does reflect the entire footer + x labels
	total_yoffset=total_yoffset+playobj.footer_bottompad+playobj.logo_height+playobj.footer_toppad+playobj.bottom_margin+xlab_height+playobj.xtick_to_xlabel

	// important parameters - the start and end of the y axis, range, and y step size
	ystart_ycoord=y_start
	yfinal_ycoord=playobj.y+playobj.head_height+playobj.header_bottompad+playobj.header_toppad+playobj.top_margin
	range=ystart_ycoord-yfinal_ycoord
	if(shifty==1){y_step=range/(yvar.length)}
	else{y_step=range/(yvar.length-1)}

	// Now go back to the y ticks and redraw with appropriate coords
	maxwidth=playobj.ytick_maxsize*playobj.width
	for(var i=0;i<yvar.length+shifty;i++){
		// y-axis labels
		lines=multitext(String(yvar[i]),{ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-face':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'},maxwidth)
		for(var j=0;j<lines.length;j++){
			var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,ystart_ycoord-(y_step/2)*shifty-y_step*i+j*parseInt(playobj.xtick_textsize),lines[j]).attr({ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ylabel_textweight,'font-face':playobj.ylabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'})
			coords=temp.getBBox()
			temp.attr({y:coords.y-lines.length*coords.height/2})
		}

		// y-axis ticks, grid lines, and minor grid lines
		var temp_line=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-y_step*i,playobj.x+playobj.width-playobj.right_margin,ystart_ycoord-y_step*i).attr({stroke:playobj.ygrid_fill,'stroke-width':playobj.ygrid_thickness,'stroke-dasharray':playobj.ygrid_dasharray,'shape-rendering':'crispEdges'})
		var temp_minorline=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-(y_step/2)-y_step*i,playobj.x+playobj.width-playobj.right_margin,ystart_ycoord-(y_step/2)-y_step*i).attr({stroke:playobj.ygrid_minorfill,'stroke-width':playobj.ygrid_minorthickness,'stroke-dasharray':playobj.ygrid_minordasharray,'shape-rendering':'crispEdges'})
		var temp_tick=snapobj.line(playobj.x+total_xoffset,ystart_ycoord-y_step*i,playobj.x+total_xoffset-playobj.ytick_length,ystart_ycoord-y_step*i).attr({stroke:playobj.ytick_fill,'stroke-width':playobj.ytick_thickness,'shape-rendering':'crispEdges'})

		// handle y=0 as appropriate
		if(yvar[i]=='0'){
			temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.ygrid_zerothickness,'stroke-dasharray':playobj.ygrid_zerodasharray})
			temp_tick.attr({'stroke-width':playobj.ygrid_zerothickness})
		}
	}
}













