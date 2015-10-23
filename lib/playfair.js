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
		this.top_margin=0
		this.bottom_margin=0
		this.left_margin=0
		this.right_margin=0

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
	Playfair.prototype.xaxis = function(number_of_ticks,decimal_places,multiples,format,prepend,append) {
		this.xticks=number_of_ticks
		this.xdecimal=decimal_places
		this.xmult=multiples
		this.xformat=format
		this.xpre=prepend
		this.xapp=append
	}

	Playfair.prototype.yaxis = function(number_of_ticks,decimal_places,multiples,format,prepend,append) {
		this.yticks=number_of_ticks
		this.ydecimal=decimal_places
		this.ymult=multiples
		this.yformat=format
		this.ypre=prepend
		this.yapp=append
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
		var graph_mask=snapobj.rect(graph_obj.x+graph_obj.left_margin,graph_obj.y+graph_obj.top_margin,graph_obj.width-(graph_obj.left_margin+graph_obj.right_margin),graph_obj.height-(graph_obj.top_margin+logo_coords.height)).attr({opacity: .1,fill: 'black'})

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

			var source=snapobj.text(graphobj.x+graphobj.footer_leftpad,graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad,'Source: '+graphobj.source).attr({'font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge'})
			source_coords=source.getBBox()
			var note=snapobj.text(graphobj.x+graphobj.footer_leftpad,source_coords.y2,'Note: '+graphobj.note).attr({'font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge'})

			var foot_fill=snapobj.rect(0,graphobj.height-logo_coords.height,graphobj.width,logo_coords.height).attr({fill:graphobj.footerfill})
			snapobj.append(source)
			snapobj.append(note)
			snapobj.append(logo)

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

		// set top_margin to the y2 coord for dek or hed, whichever is lower.
		if(lower_hed>lower_dek){this.top_margin=lower_hed+this.header_bottompad}
		else{this.top_margin=lower_dek+this.header_bottompad}

		// draw in background and move it to the back
		var head_fill=snapobj.rect(0,0,this.width,this.top_margin).attr({fill:this.headerfill})
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

		// y-axis

		// x-axis

		// annotations

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
		this.footer_toppad=8
		this.footer_bottompad=0
		this.footer_leftpad=0
		this.footer_rightpad=0

		// key

		// x grids

		// x ticks

		// y grids

		// y ticks

		// legend

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
	return [-10,0,10,20,30,40]
}

// Modified version of this very nice text wrapping function from stackoverflow @Thomas: http://stackoverflow.com/questions/27517482/how-to-auto-text-wrap-text-in-snap-svg
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






















