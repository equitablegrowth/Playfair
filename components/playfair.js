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

	// This sets up the geoms for the plot. You have to pass a type, which corresponds
	// to the geom you want. Currently type can be: 'line','bar','point','text','minmax',
	// 'stackedbar'
	// Pass everything at the same time. For example:
	// 'line': {
	//			xvar:var1,yvar:var2,connect:var3,grouping:{color:var4,line-width;var3},
	//			},
	// 'points': {
	//			xvar:var1,yvar:var2,grouping:{size:var3,color:var4},
	//			}
	// data comes in as the final_data object - this is an object where each
	// key is a row-heading that corresponds to a list of values
	Playfair.prototype.data = function(data,geom_dict) {
		var datadict=[]
		for(var key in data){
			var items=data[key].length
		}

		for(var i=0;i<items;i++){
			var row={}
			for(var key in data){
				row[key]=data[key][i]
			}

			datadict.push(row)
		}

		// data is now row by variable. That is, it is an object where the
		// primary keys are row numbers and then within each row there is
		// a value for each variable in the dataset.
		this.flatdata=data
		this.dataset=datadict
		this.line=geom_dict.line
		this.bar=geom_dict.bar
		this.point=geom_dict.point
		this.text=geom_dict.text
		this.area=geom_dict.area
		this.stackedbar=geom_dict.stackedbar
		this.shifty=0
		this.shiftx=0
		this.datedenom=[0,0]

		var xmaxes=[]
		var xmins=[]

		var ymaxes=[]
		var ymins=[]

		var xtypes=[]
		var ytypes=[]

		var xstrings=[]
		var ystrings=[]

		for(var key in geom_dict){
			xtypes.push(typeof(data[geom_dict[key]['xvar']][0]))
			ytypes.push(typeof(data[geom_dict[key]['yvar']][0]))
			console.log(data,key,data[geom_dict[key]],data[geom_dict[key]['yvar']],geom_dict[key])

			if(key=='area' | key=='stackedbar'){
				// this needs to eventually be changed. Right now the assumption is that stacked bars are
				// stacked on the y-axis so no transformation of x is necessary. Also it is currently going
				// to sum on both axes which is clearly wrong. (ok not really but it needs to distinguish
				// between which axis it should be summing on).

				if(Object.prototype.toString.call(data[geom_dict[key]['xvar']][0])==='[object Date]'){
					if(isNaN(data[geom_dict[key]['xvar']][i].getTime())==false){
						xmaxes.push(new Date(moment(Math.max(...data[geom_dict[key]['xvar']]))))
						xmins.push(new Date(moment(Math.min(...data[geom_dict[key]['xvar']]))))
					}
				} else if(data[geom_dict[key]['xvar']].dtype=='text'){
					xstrings.push(...data[geom_dict[key]['xvar']])
					xmaxes.push('placeholder')
					xmins.push('placeholder')
				} else {
					xmaxes.push(Math.max(...remove_missing(data[geom_dict[key]['xvar']])))
					xmins.push(Math.min(...remove_missing(data[geom_dict[key]['xvar']])))
				}

				// this on the other hand should work, summing on each possible value of x
				var yvar=geom_dict[key]['yvar']
				var xvar=geom_dict[key]['xvar']
				var xvals=new Set(data[xvar])

				xvals.forEach(function(value){
					var positives=0
					var negatives=0
					var yvalues=[]
					// get all rows where x=value
					for(var i=0;i<datadict.length;i++){
						if(datadict[i][xvar]==value){
							yvalues.push(datadict[i][yvar])
						}
					}

					// sum the yvalues of all such rows, separating positive from negative
					for(var i=0;i<yvalues.length;i++){
						if(yvalues[i]>0){
							positives=positives+yvalues[i]
						} else {
							negatives=negatives+yvalues[i]
						}
					}

					// this may seem odd but yes, it is supposed to push a bunch of 0s
					// to ymins if there are no negative values. This is a restriction
					// that ensures that bar graphs/area charts always include y=0.
					ymaxes.push(positives)
					ymins.push(negatives)
				})

			} else {
				if(key=='bar'){
					if(geom_dict[key].orientation=='vertical'){
						ymins.push(0)
						this.shiftx=1

						if(data[geom_dict[key]['xvar']].dtype!='text'){
							var temp=data[geom_dict[key]['xvar']]
							temp.sort(function(a,b){
								return a-b
							})

							if(data[geom_dict[key]['xvar']].dtype=='date'){
								temp.forEach(function(date,i){
									temp[i]=date.getTime()
								})
								var temp2=Array(...new Set(temp))
								temp2.forEach(function(date,i){
									temp2[i]=new Date(date)
								})
								temp.forEach(function(date,i){
									temp[i]=new Date(date)
								})
							} else{
								var temp2=Array(...new Set(temp))
							}

							var difs=[]
							for(var i=1;i<temp2.length;i++){
								difs.push(Math.abs(temp2[i]-temp2[i-1]))
							}
							console.log(difs)
							this.mindiff=Math.min(...difs)
						}
					} else {
						xmins.push(0)
						this.shifty=1

						if(data[geom_dict[key]['yvar']].dtype!='text'){
							var temp=data[geom_dict[key]['yvar']]
							temp.sort(function(a,b){
								return a>b
							})
							var difs=[]
							for(var i=1;i<data[geom_dict[key]['yvar']].length;i++){
								difs.push(Math.abs(data[geom_dict[key]['yvar']][i]-data[geom_dict[key]['yvar']][i-1]))
							}
							this.mindiff=Math.min(difs)
						}
					}
				}

				if(Object.prototype.toString.call(data[geom_dict[key]['xvar']][0])==='[object Date]'){
					for (var i=0;i<data[geom_dict[key]['xvar']].length;i++){
						if(isNaN(data[geom_dict[key]['xvar']][i].getTime())==false){
							xmaxes.push(new Date(moment(Math.max(...data[geom_dict[key]['xvar']]))))
							xmins.push(new Date(moment(Math.min(...data[geom_dict[key]['xvar']]))))
						}
					}
				} else if (data[geom_dict[key]['xvar']].dtype=='text'){
					for (var i=0;i<data[geom_dict[key]['xvar']].length;i++){
						if (data[geom_dict[key]['xvar']][i]!=''){
							xstrings.push(...data[geom_dict[key]['xvar']])
						}
					}
					xmaxes.push('placeholder')
					xmins.push('placeholder')
				} else {
					xmaxes.push(Math.max(...remove_missing(data[geom_dict[key]['xvar']])))
					xmins.push(Math.min(...remove_missing(data[geom_dict[key]['xvar']])))
				}

				if(Object.prototype.toString.call(data[geom_dict[key]['yvar']][0])==='[object Date]'){
					if(isNaN(data[geom_dict[key]['yvar']][i].getTime())==false){
						ymaxes.push(new Date(moment(Math.max(...data[geom_dict[key]['yvar']]))))
						ymins.push(new Date(moment(Math.min(...data[geom_dict[key]['yvar']]))))
					}
				} else if(data[geom_dict[key]['yvar']].dtype=='text') {
					for (var i=0;i<data[geom_dict[key]['yvar']].length;i++){
						if (data[geom_dict[key]['yvar']][i]!=''){
							ystrings.push(...data[geom_dict[key]['yvar']])
						}
					}					
					ymaxes.push('placeholder')
					ymins.push('placeholder')
				} else {
					ymaxes.push(Math.max(...remove_missing(data[geom_dict[key]['yvar']])))
					ymins.push(Math.min(...remove_missing(data[geom_dict[key]['yvar']])))
				}
			}
		}

		// this is the klugiest thing but... my strategy for handling missing values was bad(TM) so I am kinda
		// patching it here by taking them and turning them into NaNs. I know. This is the worst.
		for(var key in this.flat_data){
			for(var i=0;i<this.flat_data[key];i++){
				if(this.flat_data[key][i]=='' && typeof(this.flat_data[key][i])=='string'){
					this.flat_data[key][i]=undefined
				}
			}
		}

		for(var i=0;i<this.dataset.length;i++){
			for(var key in this.dataset[i]){
				if(this.dataset[i][key]=='' && typeof(this.dataset[i][key])=='string'){
					this.dataset[i][key]=undefined
				}
			}
		}
		
		// if the user has specified one geom with a text axis and one geom with a date axis, exit here.
		if(new Set(xtypes).size>1){
				alert('Exiting. X variables provided are of different types. Types detected are: '+(new Set(xtypes)))
				return
		}

		if(new Set(xtypes).size>1){
				alert('Exiting. Y variables provided are of different types. Types detected are: '+(new Set(ytypes)))
				return
		}

		// shiftx and shifty are flags that are used when drawing to shift points over so bars can be drawn
		if(xtypes[0]=='text'){
			this.shiftx=1
		}
		if(ytypes[0]=='text'){
			this.shifty=1
		}

		if(Object.prototype.toString.call(xmaxes[0])==='[object Date]'){
			this.xmax=new Date(moment(Math.max(...xmaxes)))
			this.xmin=new Date(moment(Math.min(...xmins)))
		} else {
			this.xmax=Math.max(...remove_missing(xmaxes))
			this.xmin=Math.min(...remove_missing(xmins))
		}

		if(Object.prototype.toString.call(ymaxes[0])==='[object Date]'){
			this.ymax=new Date(moment(Math.max(...ymaxes)))
			this.ymin=new Date(moment(Math.min(...ymins)))
		} else {
			this.ymax=Math.max(...remove_missing(ymaxes))
			this.ymin=Math.min(...remove_missing(ymins))
		}

		this.xstrings=[...new Set(xstrings)]
		this.ystrings=[...new Set(ystrings)]

		// console.log(this.xmax,this.xmin,this.ymax,this.ymin,xmaxes,xmins,ymaxes,ymins)
	}

	// chartobject=playfair.init_graph(grapharea,0,0,width,height)
	// chartobject.data(final_data,{'line':{'xvar':'x','yvar':'y'}})

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

	// general method for making charts that are not of a special type .data has already initialized the chart with geoms.
	// options:
	// xlimit_min - a limit that is not a tick (or at least, doesn't have to be a tick)
	// xlimit_max - upper limit for x
	// ylimit_min
	// ylimit_max
	Playfair.prototype.chart=function(options) {
		var snapobj=this.svg
		var graph_obj=this

		// get the appropriate axis for x variables
		// this first if is to check for a custom (user-defined) axis.
		if(typeof graph_obj.xarray=='undefined'){
			if(isNaN(graph_obj.xmax)==true){
				var xaxis=graph_obj.xstrings
				xaxis.dtype='text'
			} else if(typeof(graph_obj.xmax)=='number'){
				var xaxis=create_numerical_axis([graph_obj.xmin,graph_obj.xmax],[graph_obj.xmin,graph_obj.xmax])
				xaxis.dtype='numeric'
			} else if(Object.prototype.toString.call(graph_obj.xmax)==='[object Date]'){
				var xaxis=create_date_axis([graph_obj.xmin,graph_obj.xmax],[options['xlimit_min'],options['xlimit_max']],0)
				xaxis.dtype='date'
			}
			graph_obj.xarray=xaxis
		} else {
			if(Object.prototype.toString.call(graph_obj.xmax)==='[object Date]'){
				for (var i=0;i<graph_obj.xarray.length;i++){
					graph_obj.xarray[i]=new Date(moment(graph_obj.xarray[i]))
					graph_obj.xarray.dtype='date'
				}
			}
		}

		xaxis=graph_obj.xarray

		// get the appropriate axis for y variables
		if(typeof graph_obj.yarray=='undefined'){
			if(isNaN(graph_obj.ymax)==true){
				var yaxis=graph_obj.ystrings
				yaxis.dtype='text'
			} else if(typeof(graph_obj.ymax)=='number'){
				var yaxis=create_numerical_axis([graph_obj.ymin,graph_obj.ymax],[graph_obj.ymin,graph_obj.ymax])
				yaxis.dtype='numeric'
			} else if(Object.prototype.toString.call(graph_obj.ymax)==='[object Date]'){
				var yaxis=create_date_axis([graph_obj.ymin,graph_obj.ymax],[options['ylimit_min'],options['ylimit_max']],1)
				yaxis.dtype='date'
			}
			graph_obj.yarray=yaxis
		} else {
			if(Object.prototype.toString.call(graph_obj.ymax)==='[object Date]'){
				for (var i=0;i<graph_obj.yarray.length;i++){
					graph_obj.yarray[i]=new Date(moment(graph_obj.yarray[i]))
					graph_obj.yarray.dtype='date'
				}
			}
		}

		yaxis=graph_obj.yarray

		// as above but for limits to the graph instead of axes
		if(typeof graph_obj.xlimits=='undefined'){
			graph_obj.xlimits=[graph_obj.xarray[0],graph_obj.xarray[graph_obj.xarray.length-1]]
		} else {
			if (Object.prototype.toString.call(graph_obj.xmax)==='[object Date]'){
				graph_obj.xlimits=[new Date(moment(graph_obj.xlimits[0])),new Date(moment(graph_obj.xlimits[1]))]
			}
		}

		if(typeof graph_obj.ylimits=='undefined'){
			graph_obj.ylimits=[graph_obj.yarray[0],graph_obj.yarray[graph_obj.yarray.length-1]]
		} else {
			if (Object.prototype.toString.call(graph_obj.ymax)==='[object Date]'){
				graph_obj.ylimits=[new Date(moment(graph_obj.ylimits[0])),new Date(moment(graph_obj.ylimits[1]))]
			}
		}

		// start drawing stuff
		// set background fill
		var graph_background=snapobj.rect(graph_obj.x,graph_obj.y+graph_obj.head_height,graph_obj.width,graph_obj.height-(graph_obj.head_height+graph_obj.footer_height)).attr({class:'background',fill:this.chartfill})

		// draw axes
		var axes=draw_axes(this,xaxis,yaxis,graph_obj.shiftx,graph_obj.shifty)

		// draw geoms
		if(typeof(chartobject.line)!=='undefined'){draw_lines(axes,graph_obj.line,snapobj)}
		if(typeof(chartobject.point)!=='undefined'){draw_points(axes,graph_obj.point,snapobj)}
		if(typeof(chartobject.bar)!=='undefined'){draw_bars(axes,graph_obj.bar,snapobj)}

		// redraw the key/fix key elements
		snapobj.append(snapobj.selectAll('[ident2="keytop"]'))
	}

	// The linechart/scatter plot method
	Playfair.prototype.linechart = function(options) {
		// KEY STUFF HERE TEMPORARILY UNTIL IT IS MOVED INTO MAIN CHART FUNCTION
		// fix up the key - change rectangles to bubbles or lines as appropriate - float keys
		keyobjs=snapobj.selectAll('rect[ident="key"][ident2="keybox"]')
		for(var i=0;i<keyobjs.length;i++){
			coords=keyobjs[i].getBBox()
			keyobjs[i].remove()
			if ('connect' in options){
				if(i<this.qualitative_color.length){color=this.qualitative_color[i]}else{color=this.qualitative_color[this.qualitative_color.length-1]}
				var line=snapobj.line(coords.x,coords.cy,coords.x2,coords.cy).attr({group:group[i],stroke:color,'stroke-width':2,ident:'key',ident2:'keybox','shape-rendering':'crispEdges','colorchange':'stroke',context:'path_context_menu'})
				// try{floatgroup.append(line)}catch(err){console.log(err)}
			}
			if (options['points']==true){
				if (pointsize>coords.x2-coords.cx){pointsize=coords.x2-coords.cx-4}
				var center=snapobj.circle(coords.cx,coords.cy,pointsize).attr({group:group[i],fill:this.qualitative_color[i],stroke:this.qualitative_color[i],'stroke-width':this.point_strokewidth,ident:'key',ident2:'keybox','fill-opacity':this.point_fillopacity,colorchange:'both',context:'point_context_menu'})
				// try{floatgroup.append(center)}catch(err){console.log(err)}
			}
		}

		// fix up the key - change rectangles to bubbles or lines as appropriate - top keys
		keyobjs=snapobj.selectAll('rect[ident="key"][ident2="keytop"]')
		for(var i=0;i<keyobjs.length;i++){
			coords=keyobjs[i].getBBox()
			keyobjs[i].remove()
			if ('connect' in options){
				if(i<this.qualitative_color.length){color=this.qualitative_color[i]}else{color=this.qualitative_color[this.qualitative_color.length-1]}
				var line=snapobj.line(coords.x,coords.cy,coords.x2,coords.cy).attr({group:group[i],stroke:color,'stroke-width':2,ident:'key',ident2:'keytop','shape-rendering':'crispEdges','colorchange':'stroke',context:'path_context_menu'})
				// try{floatgroup.append(line)}catch(err){console.log(err)}
			}
			if (options['points']==true){
				if (pointsize>coords.x2-coords.cx){pointsize=coords.x2-coords.cx-4}
				var center=snapobj.circle(coords.cx,coords.cy,pointsize).attr({group:group[i],fill:this.qualitative_color[i],stroke:this.qualitative_color[i],'stroke-width':this.point_strokewidth,ident:'key',ident2:'keytop','fill-opacity':this.point_fillopacity,colorchange:'both',context:'point_context_menu'})
				// try{floatgroup.append(center)}catch(err){console.log(err)}
			}
		}
	}


	Playfair.prototype.footer = function(source,note,callback) {
		// draw the footer and return the height of the footer
		this.source=source
		this.note=note
		this.logo=this.logo
		logoscale=this.logoscale

		var snapobj=this.svg
		var width=this.width
		var height=this.height
		var graphobj=this

		if (this.logo!=0){
			var logo=snapobj.image(this.logo,0,0)
			logo.node.addEventListener('load',function(){
				logo.attr({width:logo.attr('width')/logoscale,height:logo.attr('height')/logoscale})
				logo_coords=logo.getBBox()
				logo.attr({x:graphobj.x+graphobj.width-logo_coords.width-graphobj.footer_rightpad,y:graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad})

				// draw footer and source.
				if(graphobj.source.length>0){
					source='Source: '+graphobj.source
					lines=multitext(source,{'font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge',fill:this.sourcetextfill},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad-logo_coords.width-20)
					var source=snapobj.text(graphobj.x+graphobj.footer_leftpad,graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad,lines).attr({fill:this.sourcetextfill,ident:'foot','font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
					source.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					source.selectAll("tspan:not(:first-child)").attr({x:source.attr('x'),dy:parseInt(graphobj.sourcesize)})
					source_coords=source.getBBox().y2
				} else {source_coords=graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad}

				if(graphobj.note.length>0){
					note='Note: '+graphobj.note
					lines=multitext(note,{fill:this.notetextfill,'font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge'},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad-logo_coords.width-20)
					var note=snapobj.text(graphobj.x+graphobj.footer_leftpad,source_coords,lines).attr({fill:this.notetextfill,ident:'foot','font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
					note.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					note.selectAll("tspan:not(:first-child)").attr({x:note.attr('x'),dy:parseInt(graphobj.notesize)})
					note_coords=note.getBBox().y2
				} else {note_coords=source_coords}

				graphobj.logo_height=logo_coords.height
				graphobj.logo_width=logo_coords.width
				graphobj.footer_height=logo_coords.height+graphobj.footer_toppad+graphobj.footer_bottompad

				var foot_fill=snapobj.rect(0,graphobj.height-graphobj.footer_height,graphobj.width,graphobj.footer_height).attr({id:'footerrect',fill:graphobj.footerfill})
				
				foot_text=snapobj.selectAll("text[ident='foot']")
				for (var i=0;i<foot_text.length;i++){
					snapobj.append(foot_text[i])
				}
				snapobj.append(logo)

				// If the note+source is taller than the logo height, make the footer bigger and shove all three elemnts up
				if(note_coords-(graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad-graphobj.footer_toppad)>graphobj.footer_height){
					var difference=note_coords-(graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad-graphobj.footer_toppad)-graphobj.footer_height
					graphobj.footer_height=note_coords-(graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad-graphobj.footer_toppad)
					snapobj.selectAll('rect[id="footerrect"').attr({height:graphobj.footer_height})
					snapobj.selectAll('rect[id="footerrect"').attr({y:graphobj.height-graphobj.footer_height})
					logo.attr({y:parseFloat(logo.attr('y'))-difference/2})
					try{source.attr({y:parseFloat(source.attr('y')-difference)})}catch(err){}
					try{note.attr({y:parseFloat(note.attr('y')-difference)})}catch(err){}
				}
				callback(logo_coords.height)
			})
		} else {
			if(graphobj.source.length>0){
				source='Source: '+graphobj.source
				lines=multitext(source,{'font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge',fill:this.sourcetextfill},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad)
				var source=snapobj.text(graphobj.x+graphobj.footer_leftpad,graphobj.y+graphobj.height-graphobj.footer_bottompad,lines).attr({ident:'foot','font-family':graphobj.sourceface,fill:this.sourcetextfill,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
				source.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				source.selectAll("tspan:not(:first-child)").attr({x:source.attr('x'),dy:parseInt(graphobj.sourcesize)})
				source_coords=source.getBBox().y2
			} else {source_coords=graphobj.y+graphobj.height-graphobj.footer_bottompad}

			if(graphobj.note.length>0){
				note='Note: '+graphobj.note
				lines=multitext(note,{fill:this.notetextfill,'font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge'},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad)
				var note=snapobj.text(graphobj.x+graphobj.footer_leftpad,source_coords,lines).attr({fill:this.notetextfill,ident:'foot','font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
				note.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				note.selectAll("tspan:not(:first-child)").attr({x:note.attr('x'),dy:parseInt(graphobj.notesize)})
				note_coords=note.getBBox().y2
			} else {note_coords=source_coords}

			graphobj.logo_height=0
			graphobj.logo_width=0
			graphobj.footer_height=0

			if(note_coords>graphobj.y+graphobj.height){
				graphobj.footer_height=note_coords-(graphobj.y+graphobj.height-graphobj.footer_bottompad-graphobj.footer_toppad)
				try{source.attr({y:graphobj.y+graphobj.height-graphobj.footer_height+graphobj.footer_toppad})}catch(err){}
				var source_coords=source.getBBox().y2
				try{note.attr({y:source_coords})}catch(err){}
			}

			callback(1)
		}
	}

	Playfair.prototype.header = function(hed,dek) {
		snapobj=this.svg

		this.hed=hed
		this.dek=dek

		headerwidth=this.width-this.header_leftpad-this.header_rightpad

		// draw main title
		var hedfontsize=parseInt(this.hedsize)
		while(multitext(hed,{'font-family':this.hedface,'font-size':hedfontsize+'px','font-weight':this.hedweight,'dominant-baseline':'text-before-edge',fill:this.hedtextfill},headerwidth).length>1){
			hedfontsize=hedfontsize-1
		}

		if (hedfontsize<parseInt(this.hedsizemin)){
			hedfontsize=this.hedsizemin
			alert('Your headline is too long.')
		}

		var hed=snapobj.text(this.x+this.header_leftpad,this.y+this.header_toppad,hed).attr({'font-family':this.hedface,'font-size':hedfontsize,'font-weight':this.hedweight,'dominant-baseline':'text-before-edge',fill:this.hedtextfill,colorchange:'fill',context:'text_context_menu'})
		hed.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		var hed_coords=hed.getBBox()

		// draw subtitle
		var dekfontsize=parseInt(this.deksize)
		while(multitext(dek,{'font-family':this.dekface,'font-size':dekfontsize,'font-weight':this.dekweight,'dominant-baseline':'text-before-edge',fill:this.dektextfill},headerwidth).length>2){
			dekfontsize=dekfontsize-1
		}

		if (dekfontsize<parseInt(this.deksizemin)){
			dekfontsize=this.deksizemin
			alert('Your subhead is too long.')
		}

		lines=multitext(dek,{'font-family':this.dekface,'font-size':dekfontsize,'font-weight':this.dekweight,'dominant-baseline':'text-before-edge',fill:this.dektextfill},headerwidth)
	
		if (lines.length>this.maxdeklines){
			var stop=this.maxdeklines
		} else {var stop=lines.length}

		for(var i=0;i<stop;i++){
			var dek=snapobj.text(this.x+this.header_leftpad,this.y+this.header_toppad+hed_coords.y2+i*parseInt(dekfontsize)*1.1,lines[i]).attr({'font-family':this.dekface,'font-size':dekfontsize,'font-weight':this.dekweight,'dominant-baseline':'text-before-edge',ident:'dek',fill:this.dektextfill,colorchange:'fill',context:'text_context_menu'})
			dek.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		}
		
		var lower_hed=hed.getBBox().y2
		var lower_dek=dek.getBBox().y2

		// set head_height to the y2 coord for dek or hed, whichever is lower.
		if(lower_hed>lower_dek){this.head_height=lower_hed+this.header_bottompad}
		else{this.head_height=lower_dek+this.header_bottompad}

		// and if there is no hed and no dek, set head_height to 0
		if(this.hed=='' && this.dek==''){this.head_height=0}

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
		// generally playfair.html will pass an entire theme to this function and so everything will have a default,
		// but just in case that doesn't happen, this standard default is written in too.
		if (typeof parameters=='undefined'){parameters={}}

		default_parameters={
			// margins
			'top_margin':25,
			'bottom_margin':8,
			'left_margin':20,
			'right_margin':40,

			// head/foot heights
			'head_height':0,
			'footer_height':0,

			// hed
			'hedsize':'20px',
			'hedsizemin':'18px',
			'hedweight':700,
			'hedface':'Lato',
			'hedtextfill':'black',

			// dek
			'deksize':'16px',
			'deksizemin':'15px',
			'dekweight':400,
			'dekface':'Lato',
			'dektextfill':'black',
			'maxdeklines':2,

			// data labels
			'datasize':'11px',
			'dataweight':400,
			'dataface':'Lato',
			'datatextfill':'black',

			// annotations
			'annotatesize':'14px',
			'annotateweight':400,
			'annotateface':'Lato',
			'annotatetextfill':'black',

			// source
			'sourcesize':'10px',
			'sourceweight':400,
			'sourceface':'Lato',
			'sourcetextfill':'black',

			// note
			'notesize':'10px',
			'noteweight':400,
			'noteface':'Lato',
			'notetextfill':'black',

			// chart formatting
			'chartfill':'#ece9e8',
			'chart_toppad':0,
			'chart_bottompad':0,
			'chart_leftpad':0,
			'chart_rightpad':0,

			// header formatting
			'headerfill':'#ffffff',
			'header_toppad':0,
			'header_bottompad':12,
			'header_leftpad':0,
			'header_rightpad':0,

			// footer formatting
			'footerfill':'#ffffff',
			'footer_toppad':4,
			'footer_bottompad':5,
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
			'xtick_textfill':'black',
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
			'ytick_textfill':'black',
			'ytick_maxsize':.25,
			'ytick_length':16,
			'ytick_thickness':1,
			'ytick_fill':'white',
			'ytick_to_ylabel':6,
			'ytick_to_yaxis':20,

			// x label
			'xlabel_textsize':'14px',
			'xlabel_textweight':400,
			'xlabel_textface':'Lato',
			'xlabel_textfill':'black',
			'xlabel_maxlength':300,

			// y label
			'ylabel_textsize':'14px',
			'ylabel_textweight':400,
			'ylabel_textface':'Lato',
			'ylabel_textfill':'black',
			'ylabel_maxlength':300,

			// legend
			'legend_location':'top',
			'legend_maxwidth':.1,
			'legend_textsize':'12px',
			'legend_textweight':400,
			'legend_textface':'Lato',
			'legend_textfill':'black',
			'legend_toppad':4,
			'legend_bottompad':0,
			'legend_rightpad':0,
			'legend_leftpad':0,
			'legend_elementsize':15,
			'legend_elementpad':5,
			'legend_floatbackground':'white',
			'legend_floatthickness':1,
			'legend_floatstroke':'#b5b5b5',
			'legend_floatpad':8,
			'legend_entrypadding':8,

			// color scales
			'diverging_color':["#523211","#8b5322","#dec17c","#80ccc0","#35968e"],
			'sequential_color':["#205946","#33836A","#67c2a5","#b7dfd1","#e2f2ed"],
			'qualitative_color':["#67c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f","#e5c494","#b3b3b3"],

			// barchart specific style
			'barchart_width':.8,

			// line/scatter specific style
			'trend_width':1.5,
			'trend_fill':'#c64027',
			'trend_textface':'Lato',
			'trend_textweight':600,
			'trend_textsize':'12px',
			'trend_textcolor':'#c64027',
			'trend_linetotext':3,
			'point_size':4,
			'point_strokewidth':1.7,
			'point_fillopacity':.2,
			'point_maxsize':25,
			'point_minsize':3,
			'linechart_strokeopacity':1,
			'line_types':[[0,0],[4,4],[0],[0],[0]],
			'line_minsize':2,
			'line_maxsize':20,
			'line_size':2,

			// logo
			'logo':0,
			'logoscale':1,

			// callout style
			'callout_color':'#ababab',
			'callout_thickness':1,
			'callout_dasharray':[],

			'arrow_color':'black',
			'arrow_thickness':2,
			'arrow_dasharray':[],
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

/////////////////////////////////////////////////
///////////////////// GEOMS /////////////////////
/////////////////////////////////////////////////

function remove_missing(array){
	var temp=array.slice(0)
	for(var i=temp.length-1;i>=0;i--){
		if(typeof(temp[i])=='undefined') {
			temp.splice(i,1)
		}
	}

	return temp
}

function draw_lines(axes,line,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// var is {'xvar':x_var,'yvar':y_var,'connect':connect,'grouping':{'color':color,'size':size,'type':type}}

	// create sets of options for each grouping variable
	if(line.grouping.color!=='none'){
		console.log((chartobject.flatdata[line.grouping.color]),remove_missing(chartobject.flatdata[line.grouping.color]))
		var color_groups=[...new Set(remove_missing(chartobject.flatdata[line.grouping.color]))]
	} 
	if(line.grouping.type!=='none'){
		var type_groups=[...new Set(remove_missing(chartobject.flatdata[line.grouping.color]))]
	}

	// check for sizing variable and get min and max for scaling
	if(line.grouping.size!=='none'){
		var minsize=Math.min(...remove_missing(chartobject.flatdata[line.grouping.size]))
		var maxsize=Math.max(...remove_missing(chartobject.flatdata[line.grouping.size]))
	}

	// create full group list
	if(line.grouping.color!=='none' || line.grouping.type!=='none'){
		var temp=[]
		var temp2=[]
		for(var i=0;i<chartobject.dataset.length;i++){
			temp.push([chartobject.dataset[i][line.grouping.color],chartobject.dataset[i][line.grouping.type]])
		}

		for(var i=0;i<temp.length;i++){
			var dupe=0
			for (var j=0;j<temp2.length;j++){
				if(temp[i][0]==temp2[j][0] && temp[i][1]==temp2[j][1]){
					var dupe=1
				}
			}
			if(dupe==0){
				temp2.push(temp[i])
			}
		}
		groups=temp2
	} else {
		var groups=[[undefined,undefined]]
	}

	// loop through groups in the dataset to draw lines
	for(var i=0;i<groups.length;i++){
		var current=chartobject.dataset.filter(function(row){
			return row[line.grouping.color]===groups[i][0]
		}).filter(function(row){
			return row[line.grouping.type]===groups[i][1]
		})

		// order according to the connect variable, connect on x by default
		if(line.connect!=='none'){
			var connect=line.connect
			current.sort(function(a,b){
				return a[line.connect]-b[line.connect]
			})
		} else {
			var connect=line.xvar
			current.sort(function(a,b){
				return a[line.xvar]-b[line.xvar]
			})
		}

		// check for sizing variable and set line width
		if(line.grouping.size!=='none'){
			if(current[0][line.grouping.size]!=undefined){
				var linewidth=((current[0][line.grouping.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.line_maxsize)-parseFloat(chartobject.line_minsize))+parseFloat(chartobject.line_minsize)
			}
		} else {
			var linewidth=chartobject.line_size
		}

		// color
		if(line.grouping.color!=='none'){
			var color=chartobject.qualitative_color[color_groups.indexOf(current[0][line.grouping.color])]
		} else {
			var color=chartobject.qualitative_color[0]
		}

		// line type
		if(line.grouping.type!=='none'){
			var linetype=chartobject.line_types[type_groups.indexOf(current[0][line.grouping.type])]
		} else {
			var linetype=chartobject.line_types[0]
		}

		// label
		var label=current[0][line.color]+', '+current[0][line.type]

		var path=''
		// now loop through points in the line
		for(var j=0;j<current.length;j++){
			var sub_current=current[j]

			try{
				var sub_next=current[j+1]
			} catch(err){}

			if(isNaN(sub_current[connect])==false){
				if((sub_current[line.xvar]==undefined && connect==line.yvar) || (sub_current[line.yvar]==undefined && connect==line.xvar)){
					// set various values for points. locations
					var x_loc=get_coord(sub_next[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var y_loc=get_coord(sub_next[line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					// add to path or start path
					if(j==0){
						path=path+'M'+x_loc+','+y_loc
					} else{
						path=path+'M'+x_loc+','+y_loc
					}
				} else if(sub_current[line.xvar]!=undefined && sub_current[line.yvar]!=undefined){
					// set various values for points. locations
					var x_loc=get_coord(sub_current[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var y_loc=get_coord(sub_current[line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					// add to path or start path
					if(j==0){
						path=path+'M'+x_loc+','+y_loc
					} else{
						path=path+'L'+x_loc+','+y_loc
					}
				} else {}
			}
			// draw line
			snapobj.path(path).attr({'data_label':label,class:'dataelement',stroke:color,'stroke-width':linewidth,fill:'none','group':groups[i],'fill-opacity':0,'stroke-opacity':chartobject.linechart_strokeopacity,'colorchange':'stroke',context:'pathdata_context_menu','stroke-dasharray':linetype})
		}
	}
}

function draw_points(axes,point,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// point is {'xvar':x_var,'yvar':y_var,'labels':label,'labelall':pointlabel,'grouping':{'color':color,'size':size,'type':type}}

	// create sets of options for each grouping variable
	if(point.grouping.color!=='none'){
		var color_groups=[...new Set(chartobject.flatdata[point.grouping.color])]
	} 
	if(point.grouping.type!=='none'){
		var type_groups=[...new Set(chartobject.flatdata[point.grouping.color])]
	}

	// check for sizing variable and get min and max for scaling
	if(point.grouping.size!=='none'){
		var minsize=Math.min(...chartobject.flatdata[point.grouping.size])
		var maxsize=Math.max(...chartobject.flatdata[point.grouping.size])
	}

	// loop through observations in the dataset to draw points
	for(var i=0;i<chartobject.dataset.length;i++){
		var current=chartobject.dataset[i]

		// check for sizing variable and set point size
		if(point.grouping.size!=='none'){
			var pointsize=((current[point.grouping.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.point_maxsize)-parseFloat(chartobject.point_minsize))+parseFloat(chartobject.point_minsize)
		} else {
			var pointsize=chartobject.point_size
		}

		// set various values for points. locations
		if(current[point.xvar]!=undefined && current[point.yvar]!=undefined){
			var x_loc=get_coord(current[point.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[point.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc=get_coord(current[point.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[point.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

			// color
			if(point.grouping.color!=='none'){
				var color=chartobject.qualitative_color[color_groups.indexOf(current[point.grouping.color])]
			} else {
				var color=chartobject.qualitative_color[0]
			}

			// point type
			var pointtype=1

			// label
			var label=current[point.labels]

			// draw point
			if(pointtype==1){
				snapobj.circle(x_loc,y_loc,pointsize).attr({fill:color,stroke:color,'stroke-width':chartobject.point_strokewidth,'data_type':'point','data_label':label,'group':'PLACEHOLDER FIX ME','class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu'})
			}

			// label point
			if (point.labelall==true) {
				var label=snapobj.text(x_loc,y_loc-pointsize-3,current[point.labels]).attr({'font-family':chartobject.dataface,'font-size':chartobject.datasize,'font-weight':chartobject.dataweight,'dominant-baseline':'text-before-edge','text-anchor':'middle',fill:chartobject.datatextfill,colorchange:'fill',context:'text_context_menu'})
				label.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				var coords=label.getBBox()
				label.attr({y:coords.y-coords.height})
			}
		}
	}
}

function draw_bars(axes,bar,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// bar is {'xvar':x_var,'yvar':y_var,'grouping':{'color':color,'bargroup':bargroup}}
	// create sets of options for each grouping variable
	if(bar.grouping.color!=='none'){
		var color_groups=[...new Set(chartobject.flatdata[bar.grouping.color])]
	} else { var color_groups=['placeholder'] }
	if(bar.grouping.bargroup!=='none'){
		// what is this even for? I honestly don't remember. But I had a frontend for it, so I must have had something in mind.
		var bargroup_groups=[...new Set(chartobject.flatdata[bar.grouping.bargroup])]
	} else { var bargroup_groups=['placeholder'] }

	// to figure out the width of a bar, need to find the two values that are *closest* on the x-axis.
	// the bar width should be just large enough that those two bars have a little space between them
	// this is already stored in mindiff
	if(chartobject.flatdata[bar.xvar].dtype!='text'){
		var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(chartobject.mindiff,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
		var barwidth=totalwidth
		console.log(barwidth)
		// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
		if(totalwidth/2>get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0] || totalwidth/2>axes[1]-get_coord(chartobject.xmax,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)){
			console.log('clipping')
			var totalwidth=Math.abs(chartobject.barchart_width*2*(get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0]))
			var barwidth=totalwidth
			console.log(barwidth)
		}
	} else {
		// if the axis is categorical, get width based on that instead.
		console.log(get_coord(chartobject.flatdata[bar.xvar][0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx))
		var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(chartobject.flatdata[bar.xvar][0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(chartobject.flatdata[bar.xvar][1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
		var barwidth=totalwidth
	}
	// loop through observations in the dataset to draw bars
	for(var i=0;i<chartobject.dataset.length;i++){
		var current=chartobject.dataset[i]

		if(current[point.xvar]!=undefined && current[point.yvar]!=undefined){
			// color + grouping
			if(bar.grouping.color!=='none'){
				var color=chartobject.qualitative_color[color_groups.indexOf(current[bar.grouping.color])]
				console.log(barwidth,color_groups.length)
				var barwidth=totalwidth/color_groups.length
				// set various values for bar locations
				var x1=get_coord(current[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(totalwidth/2)+barwidth*(color_groups.indexOf(current[bar.grouping.color]))
				var x2=x1+barwidth
				var y1=get_coord(current[bar.yvar],chartobject.ylimits[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
				var y2=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
			} else {
				var color=chartobject.qualitative_color[0]

				// set various values for bar locations
				var x1=get_coord(current[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(barwidth/2)
				var x2=x1+barwidth
				var y1=get_coord(current[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
				var y2=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
			}

			// label in this case should be the y-value
			var label=current[bar.yvar]

			// draw bar
			snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:'vertical','data_type':'bar','data_label':label,'group':current[bar.grouping.subgroup],'class':'dataelement','shape-rendering':'crispEdges',fill:color,colorchange:'fill',context:'data_context_menu'})
		}
	}

	// always gotta pull the y=0 line to the front after creating a barchart
	snapobj.append(snapobj.selectAll('[zeroline="1"]'))
}

function get_coord(value,[limit_start,limit_end],[pixel_start,pixel_end],type,array,y,shift){
	// universal function for converting a numerical or categorical value into a pixel value on the chart
	// shift is for bar charts etc where the element is going to be centered over the value instead of beginning
	// at the value. Shift doesn't affect categorical axes, where shifting is always performed.
	// if(shiftx==1){x_step=domain/(xvar.length)}
	var range=Math.abs(pixel_end-pixel_start)
	// console.log(value,[limit_start,limit_end],[pixel_start,pixel_end],type,array,y,shift)

	if(type!='text'){
		if(chartobject.datedenom[y]>0){
			var value=new Date(moment(value))
			var step=(range/((limit_end-limit_start+1)/chartobject.datedenom[y]*2))
			if(shift==1){
				pixel_end=pixel_end-step
				pixel_start=pixel_start+step
			}
		} else {
			var step=(range/((limit_end-limit_start+1)*2))
			if(shift==1){
				pixel_end=pixel_end-step
				pixel_start=pixel_start+step
			}
		}

		if(y==1){
			return pixel_start-(value-limit_start)/Math.abs(limit_end-limit_start)*Math.abs(pixel_end-pixel_start)
		} else {
			return pixel_start+(value-limit_start)/Math.abs(limit_end-limit_start)*Math.abs(pixel_end-pixel_start)
		}
	} else if(type=='text'){
		if(y==1){
			console.log('nothing here!')
		} else {
			var position=array.indexOf(value)+1
			return pixel_start+((2*position-1)/(2*array.length))*(pixel_end-pixel_start)
		}
	}
}

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

function create_numerical_axis(data,limit) {
	var datamin=data[0]
	var datamax=data[1]
	var limitmin=limit[0]
	var limitmax=limit[1]
	var range=datamax-datamin
	var nice_ticks=[.1,.2,.5,1,.15,.25,.75]

	if(datamin<=0 & datamax>=0){zero_flag=1}
	else{zero_flag=0}

	// This is sort of a brute force method for finding a good division of the graph.
	// First, generate a big list of candidate step values, make an axis for each one,
	// and evaluate that axis by the amount of 'wasted space' it has. Give preference
	// to nice numbers of ticks (I prefer about 5 but this can be set) - larger numbers
	// of ticks will generally have an advantage is reducing wasted space, so penalize
	// them by some arbitrary amount (another setting). Some of the candidate step
	// numbers are gonna be garbage but hey, computation is cheap.

	console.log('range: ',range,'maxdata: ',datamin,'mindata: ',datamax,'minlimit: ',limitmin,'maxlimit: ',limitmax)
	var steps=range/4

	if(steps>=1){
	    rounded=Math.round(steps)
	    digits=rounded.toString().length
    } else if(steps==0){
    	alert('No variation in either your x or y axis.')
    	return
    } else {
    	var places=steps.toString().split('.')[1]
    	var first_place=0
    	for(var i=0;i<places.length;i++){
    		if (places[i]!='0' && first_place==0){
    			first_place=i+1
    		}
    	}
    	var digits=-parseInt(first_place)
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
		    	min_steps=Math.ceil(Math.abs(datamin)/steps)
		    	step_array=[(-min_steps*steps).toFixed(key)]		
	    	} else {
	    		step_array=[(Math.floor(datamin/steps)*steps).toFixed(key)]
	    	}

	    	var stepnum=1
		    while (step_array[step_array.length-1]<datamax){
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

	return best_array
}


function create_date_axis(data,limit,y){
	var datamin=data[0]
	var datamax=data[1]
	var limitmin=limit[0]
	var limitmax=limit[1]
	var range=datamax-datamin

	console.log('range: ',range,'maxdata: ',datamin,'mindata: ',datamax,'minlimit: ',limitmin,'maxlimit: ',limitmax)

	// figure out what magnitude the range is - should we measure in years, months, or days?
	var daylength=86400000
	var monthlength=2628288000
	var yearlength=31536000000

	// if the range is more than 4 years, then the axis should be denominated in years
	if (range>=yearlength*4){
		chartobject.datedenom[y]=yearlength
		var drange=datamax.getUTCFullYear()-datamin.getUTCFullYear()
		var digits=drange.toString().length
		var candidate_arrays=[]
		var candidate_steps=[]
		var nice_ticks=[.1,.2,.3,.4,.5,.6,.7,.8,.9,1]

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
	    	var temp=new Date(String(datamin.getUTCFullYear()))
			step_array=[temp]

	    	var stepnum=1
		    while (step_array[step_array.length-1]<datamax){
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
		chartobject.datedenom[y]=monthlength
		drange=(datamax.getUTCMonth()+datamax.getUTCFullYear()*12)-(datamin.getUTCMonth()+datamin.getUTCFullYear()*12)
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
	    	temp.setFullYear(datamin.getUTCFullYear())
	    	temp.setMonth(datamin.getUTCMonth())
	    	temp.setDate(datamin.getUTCDate())
			step_array=[temp]

	    	var stepnum=1
		    while (step_array[step_array.length-1]<datamax){
		    	var temp=new Date
		    	temp.setFullYear(datamin.getUTCFullYear())
		    	temp.setMonth(datamin.getUTCMonth()+stepnum*steps)
		    	temp.setDate(datamin.getUTCDate())
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


function create_axis(dataseries,parameters) {

	ticks = parameters['ticks'] || 5
	decimal = parameters['decimal'] || undefined
	prepend = parameters['prepend'] || ''
	append = parameters['append'] || ''
	mustincludezero = parameters['must_include_zero'] || 0

	mindata=dataseries[0]
	maxdata=dataseries[0]
	zero_flag=0

	// for(var i=0;i<dataseries.length;i++){
	// 	if(dataseries[i]<mindata){mindata=dataseries[i]}
	// 	if(dataseries[i]>maxdata){maxdata=dataseries[i]}
	// }

	mindata=Math.min(...dataseries)
	maxdata=Math.max(...dataseries)

	if (Object.prototype.toString.call(dataseries[0])==='[object Date]'){
		// figure out what magnitude the range is - should we measure in years, months, or days?
		var daylength=86400000
		var monthlength=2628288000
		var yearlength=31536000000

		mindata=new Date(Math.min(...dataseries))
		maxdata=new Date(Math.max(...dataseries))

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

		var range=maxdata-mindata
		var nice_ticks=[.1,.2,.5,1,.15,.25,.75]

		// This is sort of a brute force method for finding a good division of the graph.
		// First, generate a big list of candidate step values, make an axis for each one,
		// and evaluate that axis by the amount of 'wasted space' it has. Give preference
		// to nice numbers of ticks (I prefer about 5 but this can be set) - larger numbers
		// of ticks will generally have an advantage is reducing wasted space, so penalize
		// them by some arbitrary amount (another setting). Some of the candidate step
		// numbers are gonna be garbage but hey, computation is cheap.

		console.log('range: ',range,'ticks: ',ticks,'maxdata: ',maxdata,'mindata: ',mindata)
	    var steps=range/(ticks-1)

	    if(steps>=1){
		    rounded=Math.round(steps)
		    digits=rounded.toString().length
	    } else {
	    	var places=steps.toString().split('.')[1]
	    	var first_place=0
	    	for(var i=0;i<places.length;i++){
	    		if (places[i]!='0' && first_place==0){
	    			first_place=i+1
	    		}
	    	}
	    	var digits=-parseInt(first_place)
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
function multitext(txt,attributes,max_width,svgname){

	if (svgname===undefined){
			var svgname=grapharea
	}

	var words = txt.split(" ");
	var width_so_far = 0, current_line=0, lines=[''];
	for (var i = 0; i < words.length; i++) {

		var temp = svgname.text(0, 0, words[i]+' ').attr(attributes);
		temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		var width=temp.getBBox().width
		temp.remove()

		if (width_so_far + (width) > max_width) {
			lines.push('');
			current_line++;
			width_so_far = 0;
		}
		width_so_far += width;
		lines[current_line] += words[i] + " ";
	}

	for (var i=0;i<lines.length;i++){
		if(lines[i][lines[i].length-1]==' '){
			lines[i]=lines[i].substring(0,lines[i].length-1)
		}
	}
	return lines
}


function draw_axes(playobj,xvar,yvar,shiftx,shifty) {
	// console.log(xvar,yvar)
	// draws the axes for a graph
	// shiftx and shifty are optional parameters. If shiftx or shifty==1, that axis will
	// be shifted such that labels occur between ticks, appropriate for a bar graph. There
	// will also be one more tick to accomodate this change

	snapobj=playobj.svg

	// If there is a groupvar, deal with it first - draw a dummy legend, get the dimensions,
	// and incorporate them into the graph's margins appropriately.
	legend_height=0

	if (typeof(playobj.group)!=='undefined' && playobj.legend_location!=='none'){

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
		avail_height=playobj.height-playobj.footer_height-playobj.header_toppad-playobj.header_bottompad-playobj.head_height-playobj.legend_toppad-playobj.legend_bottompad
		vertical_key_start_y=playobj.y+playobj.header_toppad+playobj.header_bottompad+playobj.head_height+playobj.legend_toppad
		// The key_start_x depends on how long the category values are. It can be up to
		// legend_maxwidth % wide but should be as short as possible.
		longest=0
		for(var i=0;i<group.length;i++){
			var temp=snapobj.text(0,0,group[i]).attr({fill:this.legend_textfill,'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
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
				var temp=snapobj.text(0,0,group[i]).attr({fill:this.legend_textfill,'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
				temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
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
					var temprect=snapobj.rect(current_linewidth,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,playobj.legend_elementsize,playobj.legend_elementsize).attr({ident:'key',ident2:'keytop',group:group[i],fill:playobj.qualitative_color[i],ident:'key','shape-rendering':'crispEdges',colorchange:'fill',context:'data_context_menu'})
					var temptext=snapobj.text(current_linewidth+playobj.legend_elementpad+playobj.legend_elementsize,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,text).attr({fill:this.legend_textfill,ident2:'keytop','font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
					temptext.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")

					coords2=temprect.getBBox()
					coords3=temptext.getBBox()
					totalwidth=coords2.width+coords3.width+playobj.legend_elementpad
					console.log(this.legend_entrypadding)
					current_linewidth=current_linewidth+totalwidth+playobj.legend_entrypadding
				}
				// if it doesn't, go to the next line, set current_linewidth to 0
				else {
					current_linewidth=0
					line=line+1

					var temprect=snapobj.rect(current_linewidth,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,playobj.legend_elementsize,playobj.legend_elementsize).attr({ident:'key',ident2:'keytop',group:group[i],fill:playobj.qualitative_color[i],ident:'key','shape-rendering':'crispEdges',colorchange:'fill',context:'data_context_menu'})
					var temptext=snapobj.text(current_linewidth+playobj.legend_elementpad+playobj.legend_elementsize,horizon_key_start_y+playobj.legend_elementpad*line+playobj.legend_toppad+line*lineheight,text).attr({fill:this.legend_textfill,ident2:'keytop','font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
					temptext.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")

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
				var temp=snapobj.text(0,0,group[i]).attr({fill:this.legend_textfill,'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
				temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				coords=temp.getBBox()
				if (length<coords.width){length=coords.width}
				temp.remove()
			}

			lineheight=playobj.legend_elementsize
			if(parseInt(playobj.legend_textsize)>lineheight){lineheight=parseInt(playobj.legend_textsize)}

			// floatgroup=snapobj.group()
			var floatkey=snapobj.rect(0,0,playobj.legend_floatpad*2+playobj.legend_elementsize+playobj.legend_elementpad+length,playobj.legend_floatpad*2+lineheight*group.length+(group.length-1)*playobj.legend_elementpad).attr({ident2:'floatkey',ident:'key',fill:playobj.legend_floatbackground,stroke:playobj.legend_floatstroke,'stroke-width':playobj.legend_floatthickness,'shape-rendering':'crispEdges',colorchange:'fill'})
			// floatgroup.append(floatkey)

			for (var i=0;i<group.length;i++){
				var temprect=snapobj.rect(playobj.legend_floatpad,playobj.legend_floatpad+lineheight*i+playobj.legend_elementpad*i,playobj.legend_elementsize,playobj.legend_elementsize).attr({group:group[i],fill:playobj.qualitative_color[i],ident:'key',ident2:'keybox','shape-rendering':'crispEdges',colorchange:'fill'})
				var temp=snapobj.text(playobj.legend_floatpad+playobj.legend_elementsize+playobj.legend_elementpad,playobj.legend_floatpad+lineheight*i+playobj.legend_elementpad*i,group[i]).attr({fill:this.legend_textfill,ident:'key','font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
				temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
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
		var lines=multitext(String(playobj.ylabel),{'font-size':playobj.ylabel_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface},playobj.ylabel_maxlength)

		if(lines.length>2){
			alert('Your y-axis label is too long.')
			lines=lines.splice(0,2)
		}

		var ylab=snapobj.text(playobj.x+playobj.left_margin,((playobj.y+playobj.height-playobj.logo_height-playobj.footer_toppad)+(playobj.y+playobj.head_height+playobj.top_margin+legend_height+playobj.legend_toppad+playobj.legend_bottompad))/2,lines).attr({fill:this.ylabel_textfill,ident:'yaxis','font-size':playobj.ylabel_textsize,'font-weight':playobj.ylabel_textweight,'font-family':playobj.ylabel_textface,'dominant-baseline':'central','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
		ylab.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		ylab_coords=ylab.getBBox()
		ylab.attr({y:ylab_coords.y-(ylab_coords.height/2),x:parseFloat(ylab.attr('x'))+(lines.length-1)*parseInt(playobj.ylabel_textsize)/2})
		ylab.selectAll("tspan:not(:first-child)").attr({x:ylab.attr('x'),dy:parseInt(playobj.ylabel_textsize)})
		// rotation does kinda weird things, so instead of rotating here it is done in the 2nd pass later
		// ylab.transform('r270')
		ylab_coords=ylab.getBBox()
		ylab_width=ylab_coords.height
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
		var temp=snapobj.text(playobj.left_margin+ylab_width+playobj.ytick_to_ylabel,0,string).attr({fill:this.ytick_textfill,ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
		temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		coords=temp.getBBox()
		if (coords.x2>total_xoffset){total_xoffset=coords.x2}
		temp.remove()
	}

	// Subtract graph start x from xoffset and add ytick_to_yaxis to get the actual width of the xoffset.
	// As a kind of safeguard, if the yoffset width comes back huge, adjust it to 15% of graphing space.
	// Long labels should wrap to be no larger than y_offset
	total_xoffset=total_xoffset-playobj.x+playobj.ytick_to_yaxis
	if(total_xoffset>playobj.ytick_maxsize*playobj.width){total_xoffset=playobj.ytick_maxsize*playobj.width}

	// now the full x-offset is known, can start drawing the x-axis. x label:
	if (typeof(playobj.xlabel)!=undefined){
		var lines=multitext(String(playobj.xlabel),{'font-size':playobj.xlabel_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface},playobj.xlabel_maxlength)

		if(lines.length>2){
			alert('Your x-axis label is too long.')
			lines=lines.splice(0,2)
		}

		var xlab=snapobj.text((total_xoffset+2*playobj.x+playobj.width-playobj.right_margin)/2,playobj.y+playobj.height-playobj.bottom_margin-playobj.footer_height,lines).attr({fill:this.xlabel_textfill,ident:'xaxis','font-size':playobj.xlabel_textsize,'font-weight':playobj.xlabel_textweight,'font-family':playobj.xlabel_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
		xlab.selectAll("tspan:not(:first-child)").attr({x:xlab.attr('x'),dy:parseInt(playobj.xlabel_textsize)})
		xlab.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
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
	if(shiftx==1){
		if(chartobject.xarray.dtype!='text'){
			if(chartobject.datedenom[0]>0){
				var xshift=domain/((chartobject.xlimits[1]-chartobject.xlimits[0])/chartobject.datedenom[0]*2)
				var x_step=(domain-2*xshift)/(xvar.length-1)
			} else{
				var xshift=domain/((chartobject.xlimits[1]-chartobject.xlimits[0])*2)
				var x_step=(domain-2*xshift)/(xvar.length-1)
			}
		} else {
			var x_step=domain/(xvar.length)
			var xshift=x_step/2
		}
	}
	else{
		var x_step=domain/(xvar.length-1)
		var xshift=x_step
	}

	// x ticks and x lines - again no location, just figure out what the total y offset is
	total_yoffset=0

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
			var temp=snapobj.text(0,j*parseInt(playobj.xtick_textsize),lines[j]).attr({fill:this.xtick_textfill,ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xtick_textweight,'font-family':playobj.xtick_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
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
			// var temp=snapobj.text(xstart_xcoord+xshift*shiftx+x_step*i,playobj.y+playobj.height-playobj.bottom_margin-playobj.footer_height-xlab_height-playobj.xtick_to_xlabel-total_yoffset+playobj.xtick_to_xaxis+j*parseInt(playobj.xtick_textsize),linesj).attr({fill:this.xtick_textfill,ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xtick_textweight,'font-family':playobj.xtick_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
			console.log(xvar)
			var tempx=get_coord(xvar[i],playobj.xlimits,[xstart_xcoord,xfinal_xcoord],xvar.dtype,xvar,0,playobj.shiftx)
			var temp=snapobj.text(tempx,playobj.y+playobj.height-playobj.bottom_margin-playobj.footer_height-xlab_height-playobj.xtick_to_xlabel-total_yoffset+playobj.xtick_to_xaxis+j*parseInt(playobj.xtick_textsize),linesj).attr({fill:this.xtick_textfill,ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xtick_textweight,'font-family':playobj.xtick_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			coords=temp.getBBox()
			temp.attr({y:coords.y-coords.height})
		}
		// x-axis ticks, grid lines, and minor grid lines
		y_start=playobj.y+playobj.height-total_yoffset-playobj.footer_height-playobj.bottom_margin-xlab_height-playobj.xtick_to_xlabel-coords.height
		var temp_line=snapobj.line(tempx,y_start,tempx,y_end).attr({stroke:playobj.xgrid_fill,'stroke-width':playobj.xgrid_thickness,'stroke-dasharray':playobj.xgrid_dasharray,opacity:playobj.xgrid_opacity,'shape-rendering':'crispEdges'})
		if (i!=xvar.length-1){var temp_minorline=snapobj.line(tempx,y_start,tempx,y_end).attr({stroke:playobj.xgrid_minorfill,'stroke-width':playobj.xgrid_minorthickness,opacity:playobj.xgrid_minoropacity,'stroke-dasharray':playobj.xgrid_minordasharray,'shape-rendering':'crispEdges'})}
		var temp_tick=snapobj.line(tempx,y_start,tempx,y_start+playobj.xtick_length).attr({stroke:playobj.xtick_fill,'stroke-width':playobj.xtick_thickness,'shape-rendering':'crispEdges'})
		
		// handle x=0 as appropriate
		if(Object.prototype.toString.call(xvar[i])!='[object Date]'){
			try{
				if(parseFloat(xvar[i].replace(/[^0-9\.\-]+/g,''))=='0'){
					temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.xgrid_zerothickness,'stroke-dasharray':playobj.xgrid_zerodasharray,zeroline:'1'})
					if(parseFloat(temp_tick.attr('stroke-width'))!=0){
						temp_tick.attr({'stroke-width':playobj.xgrid_zerothickness})
					}
				}
			} catch(err){}
		}
	}

	// now add all the other stuff into total_yoffset so it really does reflect the entire footer + x labels
	total_yoffset=total_yoffset+playobj.footer_height+playobj.bottom_margin+xlab_height+playobj.xtick_to_xlabel

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

		lines=multitext(string,{ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'},maxwidth)
		for(var j=0;j<lines.length;j++){
			if (parseInt(lines[j])>=1000 || parseInt(lines[j])<=-1000){linesj=commas(lines[j])} else{linesj=lines[j]}
			// var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,ystart_ycoord-(y_step/2)*shifty-y_step*i+j*parseInt(playobj.xtick_textsize),linesj).attr({fill:this.ytick_textfill,ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'end',colorchange:'fill',context:'text_context_menu'})
			var tempy=get_coord(string,playobj.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,playobj.shifty)
			var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,tempy,linesj).attr({fill:this.ytick_textfill,ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'end',colorchange:'fill',context:'text_context_menu'})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			coords=temp.getBBox()
			temp.attr({y:coords.y-lines.length*coords.height/2})
		}

		// y-axis ticks, grid lines, and minor grid lines
		var temp_line=snapobj.line(playobj.x+total_xoffset,tempy,playobj.x+playobj.width-playobj.right_margin,tempy).attr({stroke:playobj.ygrid_fill,'stroke-width':playobj.ygrid_thickness,'stroke-dasharray':playobj.ygrid_dasharray,opacity:playobj.ygrid_opacity,'shape-rendering':'crispEdges'})
		if(i!=yvar.length-1){var temp_minorline=snapobj.line(playobj.x+total_xoffset,tempy,playobj.x+playobj.width-playobj.right_margin,tempy).attr({stroke:playobj.ygrid_minorfill,'stroke-width':playobj.ygrid_minorthickness,opacity:playobj.ygrid_minoropacity,'stroke-dasharray':playobj.ygrid_minordasharray,'shape-rendering':'crispEdges'})}
		var temp_tick=snapobj.line(playobj.x+total_xoffset,tempy,playobj.x+total_xoffset-playobj.ytick_length,tempy).attr({stroke:playobj.ytick_fill,'stroke-width':playobj.ytick_thickness,'shape-rendering':'crispEdges'})

		// handle y=0 as appropriate
		if(Object.prototype.toString.call(yvar[i])!='[object Date]'){
			try{
				if(parseFloat(yvar[i].replace(/[^0-9\.\-]+/g,''))=='0'){
					temp_line.attr({stroke:playobj.ygrid_zerofill,'stroke-width':playobj.ygrid_zerothickness,'stroke-dasharray':playobj.ygrid_zerodasharray,zeroline:'1'})
					if(parseFloat(temp_tick.attr('stroke-width'))!=0){
						temp_tick.attr({'stroke-width':playobj.ygrid_zerothickness})
					}
				}
			} catch(err){}
		}

		// move the ylabel to the center of the y-axis and rotate
		ylab.attr({y:ystart_ycoord+(yfinal_ycoord-ystart_ycoord)/2})
		ylab.transform('r270')
	}

	// for top keys, shove the x-coord over so they are aligned with the start of the grid
	key_elements=grapharea.selectAll('[ident2="keytop"]')
	for(var i=0;i<key_elements.length;i++){
		item=key_elements[i]
		item.attr({x:parseFloat(item.attr('x'))+parseFloat(xstart_xcoord)})
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










































