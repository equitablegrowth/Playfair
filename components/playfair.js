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

		for(var key in data){
			for(i=0;i<data[key].length;i++){
				if(data[key][i]===''){
					data[key][i]=undefined
				}
			}
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
		this.step=geom_dict.step
		this.stackedbar=geom_dict.stackedbar
		this.shade=geom_dict.shade
		this.segment=geom_dict.segment
		this.trend=geom_dict.trend
		this.shifty=0
		this.shiftx=0
		this.datedenom=[0,0]

		if(geom_dict.bar && geom_dict.bar.orientation!='on'){
			this.ybar=1
		}
		var xmaxes=[]
		var xmins=[]

		var ymaxes=[]
		var ymins=[]

		var xtypes=[]
		var ytypes=[]

		var xstrings=[]
		var ystrings=[]

		for(var key in geom_dict){
			console.log(key)
			try{
				xtypes.push(data[geom_dict[key]['xvar']].dtype)
				ytypes.push(data[geom_dict[key]['yvar']].dtype)

				try{
					xtypes.push(data[geom_dict[key]['xvar2']].dtype)
					ytypes.push(data[geom_dict[key]['yvar2']].dtype)
				} catch(err){}
			} catch(err){}
			console.log(data,key,data[geom_dict[key]],data[geom_dict[key]['yvar']],geom_dict[key])

			if(key=='area' | key=='stackedbar'){
				// this needs to eventually be changed. Right now the assumption is that stacked bars are
				// stacked on the y-axis so no transformation of x is necessary. Also it is currently going
				// to sum on both axes which is clearly wrong. (ok not really but it needs to distinguish
				// between which axis it should be summing on).

				if(Object.prototype.toString.call(data[geom_dict[key]['xvar']][0])==='[object Date]'){
					if(isNaN(data[geom_dict[key]['xvar']][0].getTime())==false){
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
					if(chartobject.flatdata[xvar].dtype=='date'){
						for(var i=0;i<datadict.length;i++){
							try{
								if(datadict[i][xvar].getTime()==value.getTime()){
									yvalues.push(datadict[i][yvar])
								}
							} catch(err){}
						}
					} else {
						for(var i=0;i<datadict.length;i++){
							if(datadict[i][xvar]==value){
								yvalues.push(datadict[i][yvar])
							}
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

				if(key=='stackedbar'){
					if(geom_dict[key].orientation=='on'){
						this.shiftx=1

						if(data[geom_dict[key]['xvar']].dtype!='text'){
							var temp=data[geom_dict[key]['xvar']].slice(0)
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
							this.mindiff=Math.min(...difs)
						}
					} else {
						this.shifty=1

						if(data[geom_dict[key]['yvar']].dtype!='text'){
							var temp=data[geom_dict[key]['yvar']].slice(0)
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

			} else {
				if(key=='bar'){
					if(geom_dict[key].orientation=='on'){
						ymins.push(0)
						this.shiftx=1

						if(data[geom_dict[key]['xvar']].dtype!='text'){
							var temp=data[geom_dict[key]['xvar']].slice(0)
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
							this.mindiff=Math.min(...difs)
						}
					} else {
						xmins.push(0)
						this.shifty=1

						if(data[geom_dict[key]['yvar']].dtype!='text'){
							var temp=data[geom_dict[key]['yvar']].slice(0)
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

				console.log(data)

				if(geom_dict[key].xvar!==undefined){
					if(data[geom_dict[key]['xvar']].dtype==='date'){
						for (var i=0;i<data[geom_dict[key]['xvar']].length;i++){
							if(Object.prototype.toString.call(data[geom_dict[key]['xvar']][i])==='[object Date]'){
								if(isNaN(data[geom_dict[key]['xvar']][i].getTime())==false){
									xmaxes.push(new Date(moment(Math.max(...remove_missing(data[geom_dict[key]['xvar']])))))
									xmins.push(new Date(moment(Math.min(...remove_missing(data[geom_dict[key]['xvar']])))))

									try{
										xmaxes.push(new Date(moment(Math.max(...remove_missing(data[geom_dict[key]['xvar2']])))))
										xmins.push(new Date(moment(Math.min(...remove_missing(data[geom_dict[key]['xvar2']])))))
									} catch(err){}
								}
							}
						}
					} else if (data[geom_dict[key]['xvar']].dtype=='text'){
						for (var i=0;i<data[geom_dict[key]['xvar']].length;i++){
							if (data[geom_dict[key]['xvar']][i]!==''){
								xstrings.push(...data[geom_dict[key]['xvar']])

								try{
									xstrings.push(...data[geom_dict[key]['xvar2']])
								} catch(err){}
							}
						}
						xmaxes.push('placeholder')
						xmins.push('placeholder')
					} else {
						xmaxes.push(Math.max(...remove_missing(data[geom_dict[key]['xvar']])))
						xmins.push(Math.min(...remove_missing(data[geom_dict[key]['xvar']])))

						try{
							xmaxes.push(Math.max(...remove_missing(data[geom_dict[key]['xvar2']])))
							xmins.push(Math.min(...remove_missing(data[geom_dict[key]['xvar2']])))
						} catch(err){}
					}
				}

				console.log(xmins,xmaxes)

				if(geom_dict[key].yvar!==undefined){
					if(data[geom_dict[key]['yvar']].dtype==='date'){
						if(Object.prototype.toString.call(data[geom_dict[key]['xvar']][i])==='[object Date]'){
							if(isNaN(data[geom_dict[key]['yvar']][i].getTime())==false){
								ymaxes.push(new Date(moment(Math.max(...remove_missing(data[geom_dict[key]['yvar']])))))
								ymins.push(new Date(moment(Math.min(...remove_missing(data[geom_dict[key]['yvar']])))))

								try{
									ymaxes.push(new Date(moment(Math.max(...remove_missing(data[geom_dict[key]['yvar2']])))))
									ymins.push(new Date(moment(Math.min(...remove_missing(data[geom_dict[key]['yvar2']])))))
								} catch(err){}
							}
						}
					} else if(data[geom_dict[key]['yvar']].dtype=='text') {
						for (var i=0;i<data[geom_dict[key]['yvar']].length;i++){
							if (data[geom_dict[key]['yvar']][i]!==''){
								ystrings.push(...data[geom_dict[key]['yvar']])

								try{
									ystrings.push(...data[geom_dict[key]['yvar2']])
								} catch(err){}
							}
						}					
						ymaxes.push('placeholder')
						ymins.push('placeholder')
					} else {
						ymaxes.push(Math.max(...remove_missing(data[geom_dict[key]['yvar']])))
						ymins.push(Math.min(...remove_missing(data[geom_dict[key]['yvar']])))

						try{
							ymaxes.push(Math.max(...remove_missing(data[geom_dict[key]['yvar2']])))
							ymins.push(Math.min(...remove_missing(data[geom_dict[key]['yvar2']])))
						} catch(err){}
					}
				}
			}
		}

		// this is the klugiest thing but... my strategy for handling missing values was bad(TM) so I am kinda
		// patching it here by taking them and turning them into undefined. I know. This is the worst.
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
			console.log('Exiting because of x types')
			alert('Exiting. X variables provided are of different types. Types detected are: '+(new Set(xtypes)))
			return
		} else {
			this.xaxis_dtype=xtypes[0]
		}

		if(new Set(xtypes).size>1){
			console.log('Exiting because of y types')
			alert('Exiting. Y variables provided are of different types. Types detected are: '+(new Set(ytypes)))
			return
		} else {
			this.yaxis_dtype=ytypes[0]
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
	Playfair.prototype.chart=function(options,legend) {
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
		if(typeof(legend)!=='undefined' & chartobject.legend_location=='top'){
			var key_height=draw_key_top(legend,graph_obj,snapobj)
			var axes=draw_axes(this,xaxis,yaxis,graph_obj.shiftx,graph_obj.shifty,key_height)
			console.log(key_height)
		} else {
			var axes=draw_axes(this,xaxis,yaxis,graph_obj.shiftx,graph_obj.shifty,0)
		}

		// draw geoms
		if(typeof(chartobject.shade)!=='undefined'){draw_shade(axes,graph_obj.shade,snapobj)}
		if(typeof(chartobject.bar)!=='undefined'){draw_bars(axes,graph_obj.bar,snapobj)}
		if(typeof(chartobject.area)!=='undefined'){draw_area(axes,graph_obj.area,snapobj)}
		if(typeof(chartobject.stackedbar)!=='undefined'){draw_stackedbars(axes,graph_obj.stackedbar,snapobj)}
		if(typeof(chartobject.step)!=='undefined'){draw_steps(axes,graph_obj.step,snapobj)}
		if(typeof(chartobject.line)!=='undefined'){draw_lines(axes,graph_obj.line,snapobj)}
		if(typeof(chartobject.segment)!=='undefined'){draw_segments(axes,graph_obj.segment,snapobj)}
		if(typeof(chartobject.point)!=='undefined'){draw_points(axes,graph_obj.point,snapobj)}
		if(typeof(chartobject.text)!=='undefined'){draw_text(axes,graph_obj.text,snapobj)}
		if(typeof(chartobject.trend)!=='undefined'){draw_trends(axes,graph_obj.trend,snapobj)}

		// draw key
		// check playobj.legend_location for 'float' or 'top' to draw correctly
		if(typeof(legend)!=='undefined' & chartobject.legend_location=='float'){draw_key(legend,graph_obj,snapobj)}
		// if(typeof(legend)!=='undefined' & chartobject.legend_location=='top'){draw_key_top(legend,graph_obj,snapobj)}

		// redraw the key/fix key elements
		snapobj.append(snapobj.selectAll('[ident2="keytop"]'))
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

		var notefill=this.notetextfill
		var sourcefill=this.sourcetextfill

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
					var source=snapobj.text(graphobj.x+graphobj.footer_leftpad,graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad,lines).attr({fill:notefill,ident:'foot','font-family':graphobj.sourceface,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
					source.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					source.selectAll("tspan:not(:first-child)").attr({x:source.attr('x'),dy:parseInt(graphobj.sourcesize)})
					source_coords=source.getBBox().y2
				} else {source_coords=graphobj.y+graphobj.height-logo_coords.height-graphobj.footer_bottompad}

				if(graphobj.note.length>0){
					note='Note: '+graphobj.note
					lines=multitext(note,{fill:this.notetextfill,'font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge'},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad-logo_coords.width-20)
					var note=snapobj.text(graphobj.x+graphobj.footer_leftpad,source_coords,lines).attr({fill:sourcefill,ident:'foot','font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
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
				var source=snapobj.text(graphobj.x+graphobj.footer_leftpad,graphobj.y+graphobj.height-graphobj.footer_bottompad,lines).attr({ident:'foot','font-family':graphobj.sourceface,fill:sourcefill,'font-size':graphobj.sourcesize,'font-weight':graphobj.sourceweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
				source.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				source.selectAll("tspan:not(:first-child)").attr({x:source.attr('x'),dy:parseInt(graphobj.sourcesize)})
				source_coords=source.getBBox().y2
			} else {source_coords=graphobj.y+graphobj.height-graphobj.footer_bottompad}

			if(graphobj.note.length>0){
				note='Note: '+graphobj.note
				lines=multitext(note,{fill:this.notetextfill,'font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge'},graphobj.width-graphobj.footer_leftpad-graphobj.footer_rightpad)
				var note=snapobj.text(graphobj.x+graphobj.footer_leftpad,source_coords,lines).attr({fill:notefill,ident:'foot','font-family':graphobj.noteface,'font-size':graphobj.notesize,'font-weight':graphobj.noteweight,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
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
			var dek=snapobj.text(this.x+this.header_leftpad,this.y+hed_coords.y2+i*parseInt(dekfontsize)*1.1,lines[i]).attr({'font-family':this.dekface,'font-size':dekfontsize,'font-weight':this.dekweight,'dominant-baseline':'text-before-edge',ident:'dek',fill:this.dektextfill,colorchange:'fill',context:'text_context_menu'})
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
			'bottom_margin':20,
			'left_margin':20,
			'right_margin':40,

			// head/foot heights
			'head_height':0,
			'footer_height':0,

			// hed
			'hedsize':'24px',
			'hedsizemin':'22px',
			'hedweight':700,
			'hedface':'Lato',
			'hedtextfill':'black',

			// dek
			'deksize':'18px',
			'deksizemin':'16px',
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
			'sourcesize':'12px',
			'sourceweight':400,
			'sourceface':'Lato',
			'sourcetextfill':'white',

			// note
			'notesize':'12px',
			'noteweight':400,
			'noteface':'Lato',
			'notetextfill':'white',

			// chart formatting
			'chartfill':'#eee',
			'chart_toppad':0,
			'chart_bottompad':0,
			'chart_leftpad':0,
			'chart_rightpad':0,

			// header formatting
			'headerfill':'#eee',
			'header_toppad':11,
			'header_bottompad':4,
			'header_leftpad':18,
			'header_rightpad':0,

			// footer formatting
			'footerfill':'#67c2a5',
			'footer_toppad':8,
			'footer_bottompad':5,
			'footer_leftpad':18,
			'footer_rightpad':14,

			// x grids
			'xgrid_fill':'#bbb',
			'xgrid_zerofill':'#bbb',
			'xgrid_minorfill':'#bbb',
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
			'ygrid_fill':'#bbb',
			'ygrid_zerofill':'#bbb',
			'ygrid_minorfill':'#bbb',
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
			'xtick_textsize':'16px',
			'xtick_textweight':400,
			'xtick_textface':'Lato',
			'xtick_textfill':'#444',
			'xtick_maxsize':.15,
			'xtick_length':4,
			'xtick_thickness':1,
			'xtick_fill':'#bbb',
			'xtick_to_xlabel':5,
			'xtick_to_xaxis':5,

			// y ticks
			'ytick_textsize':'16px',
			'ytick_textweight':400,
			'ytick_textface':'Lato',
			'ytick_textfill':'#444',
			'ytick_maxsize':.25,
			'ytick_length':16,
			'ytick_thickness':1,
			'ytick_fill':'#bbb',
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
			'legend_location':'float',
			'legend_maxwidth':.1,
			'legend_textsize':'12px',
			'legend_textweight':400,
			'legend_textface':'Lato',
			'legend_textfill':'black',
			'legend_titletextsize':'12px',
			'legend_titletextweight':600,
			'legend_titletextface':'Lato',
			'legend_titletextfill':'black',
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
			'grayscale_color':['#999999','#666666','#333333','#000000'],

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
			'line_types':[[0,0],[5,5],[8,4,2,4],[8,8],[2,5]],
			'line_minsize':2,
			'line_maxsize':20,
			'line_size':3,

			// text geom specific
			'text_minsize':8,
			'text_maxsize':24,

			// callout style
			'callout_color':'#ababab',
			'callout_thickness':1,
			'callout_dasharray':[],

			'arrow_color':'black',
			'arrow_thickness':2,
			'arrow_dasharray':[],

			// segment style
			'segment_width':1,
			'segment_maxsize':20,
			'segment_minsize':1,
			'segment_linetypes':[[0,0],[5,5],[8,4,2,4],[8,8],[2,5]],

			// logo
			'logo':"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAA7CAYAAAD8boGtAAAGe0lEQVR4nO2d7XXqOBCG3+zZBtgSvCWwJXBLICWQEkwJuSWQEkgJUEIoISkhlDD7Q57rYSzLY2NJBPSc45OESLY+Xo8seUY8AQARISM1gArAF4DfOQuSkQ2AZfNT8gbg1Py8S56A5AJcAljBNXYlPt/i8QRYAdjDtUmIM4BnAMfoJUrMX4mvtwLwAeAVl+J7RCq4tljCCWwLZxCeAPyCGxGYBYBD8/OuSC3Ar+EkD8MOTlBnAP/h0vofm890e8UU4BLuhiC0N0Z0cgiQ7/JHG24lq+YA3POd78Y8w1nC40C6uajRim4JN0pF5+8UF+lhC/cceHfDioG1+D30XPcFJ8IU6H5I0i+pLaDmnPn6uZACPGUrxSVbtGU5AXhJcdGcFvBRqXBpXW7lJjzBPXcmJbcFfEQeffZ/QRFgeooABUWAhawUARayUgRYyEoRYCErRYCFrBQBFrLSJ8C6OaSf1rr57Lv5nI/v5vMV0rPpKdNn8/kQZDh2gfx1IB8fFdr2PHjO15dviGvr3ofs56n5D+guN23gXM+4nIc//yGiujm+qcuaiD49n/s4EFFFRDAe8ry1Mc+CiF6N5fkYKI+FXSB/bchfkb39JLHrLs9ZE9HeWIZQW0j98LWXTVl8LKUAfeJjPps0C89F9cm/iWhlLPRYAS495Tyo6+kKHwznPHjqfPDUt+9Yq7wfzXl9aTcqrbWDY9Rd94FmKG9F/TdERd120fwRoDy0oCzC8BWirwOuEaC+S1970lV02VlDZVlQtyM2hvLI/Mw3hYU7VYCx6n6NAEN5h0aHVyLyPgO+D/ztY9sckr0h31ik69Kb55rMl0q77knHnNH1Txzzykye/x1xHAxi1f1f+L2wLYTSvzb/f0brAyqPLeCfhExtvN+4FGuFbpDNtbyhrcCQu5B0c7KISTt8DnWcRKaNFUAUs+6AE+3Ysv9qyvMPum5l7F0TNGBzL8O84FLAcwtwKtZOkB1QwSbCCu0KwBG349/HpHB+OKMrtC0MxmxuAZ5x2YlL3IbHs7UM2gJYBKiH31sjR/ufYYzgi7EQrS1AjvXBqegbaI3hDmQr77MCj4r5MS6FAG/BAo5Biyj0GLFCO8TFmnzcNTEEqDvhpwnwiMvJSEiAKSYfd40lJmTsXZ3TCvArqCXGzWI1b2jDEnmSoZ9pFmjFeUL+ycdcdU9KDAHOnT/ECnFiWKUAAdehWoDSMuawfrHqnpQYUXF6yI0RTM0v4vUSwztaS3TNOiRPRjj/Bt1lhVyTj9h1T0oMAeqGmXNoWsC9YZEz63c4sWgLdY1HCJ9XduIG7duSHJOPlHVPRoxJiGygI+btnIM6/wv6d426dvKjJyPyuSrH8Juy7smIIUDZOXMOTbyHHrNFf+fLCcI16EV1tnwsxlRvPnLUPQlzC1Du+Tfl3WIIvaAdWmnnnaeuxfdmJMfSS466J2FOAcoZ2Rnj9xYZemepG7VvaK/hRCK9RaZ2iJ5gsLcw4IbnKRZel8XyrjZH3YHp75HN17QI0FKIGm5POb7wM2yz30XP7z70UOfbv66GuwmOcBMG7qiFSr+D/RWhtHILUc6p1k9f17IPX666jxGgvMYCY9YilZOhdphk58G1Sseu3NIp8ZNsjqggv7dsKO9KpZUu5xW1Dpsf1DqESidOdq3fNX9PDR1grN7S8th5zmNpsxR1X1DXGdni1r8kvzs/kcHJ2CpAC30euj6P3ZC3bE39HTIUD7GnbuP4sIYM8KHLG4oTmVJuLnuow2LVfSgcg/GVzZKvL69ZgKGAJW40qzUYI+4+kaypG8OxH0jPZQ/FaoQO6XJPE84xJigpZHFi1N2KL77kmrwgIu8u+Rtchg4+jXgOuFcquHBHwD1jpdq19O4pgek2cr/3vVuKAG2wAKcuvRR6KAIcRm6kXqzfzBQBDsPrWdpdvzADRYBhZMTbG4rL/ewUAYYpk4/IFAH2I71K3lG+ZiwKRYD9lMlHAooA+2Hrd8Qdfk3qrVAE6Ee73BciUQToR/r8leE3IkWAXfTSSyEiFgH+GPfumWDrVxaeE1AEeMkS7eRDehUXIuEToBZckq9uT0CF9ivpP9F1Gee4W8C5wD/yN7onwydAHdL3Y4KcB+CtLAAnxj1av8cK7VcL8LayhQRIh1SOqPJZPN5D+RZ3ALXCFjD0SHGCPaCqMAMswE/YIqC+4Da1/qnw6zUZvwy0i81l2C0UHon/ARkzCDw40WUEAAAAAElFTkSuQmCC",
			'logoscale':2,
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
		if(typeof(temp[i])==='undefined' | temp[i]==='') {
			temp.splice(i,1)
		}
	}
	return temp
}

function draw_key_top(legend,playobj,snapobj){
	console.log(legend)
	if(legend.length>1){
		var maxwidth=legend[0][1]
		if(legend[0][1]===''){maxwidth=playobj.width-playobj.left_margin-playobj.right_margin-playobj.legend_leftpad-playobj.legend_rightpad}
		var rightmost=maxwidth+playobj.left_margin+playobj.legend_leftpad
		var starty=playobj.y+playobj.header_toppad+playobj.header_bottompad+playobj.head_height+playobj.legend_toppad
		var startx=playobj.left_margin+playobj.legend_leftpad

		var line=0
		var currentx=startx
		var keyitem_dict={}
		var keyitem_loc={}
		var current_group=legend[1].lgroup

		for(var i=1;i<legend.length;i++){
			var keyitem_name=legend[i].geom+legend[i].grouping+legend[i].group_value
			var keyitem_loc_name=legend[i].overall
			var numeric=legend[i].groupnumeric
			var x=currentx
			var y=starty+line*(parseFloat(playobj.legend_elementsize))
			var keyitem_name=legend[i].geom+legend[i].grouping+legend[i].group_value
			if(legend[i].lgroup!==current_group){
				x=x+3*(playobj.legend_elementpad)
			}
			var xtext=x+playobj.legend_elementsize+playobj.legend_elementpad
			var current_group=legend[i].lgroup

			if(keyitem_loc[keyitem_loc_name]==undefined){
				console.log('new overall')

				var t=snapobj.text(xtext,y,legend[i].group_value).attr({ident2:'floatkey',ident:'key',fill:this.legend_textfill,'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
				var box=t.getBBox()
				currentx=box.x2+playobj.legend_elementpad

				if(box.x2>rightmost){
					t.remove()
					line=line+1
					currentx=startx
					var t=snapobj.text(currentx+playobj.legend_elementsize+playobj.legend_elementpad,starty,legend[i].group_value).attr({ident2:'floatkey',ident:'key',fill:this.legend_textfill,'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
				}

				keyitem_loc[keyitem_loc_name]={}
				keyitem_loc[keyitem_loc_name]['x']=x
				keyitem_loc[keyitem_loc_name]['y']=y
			} else {
				console.log('old overall')
				x=keyitem_loc[keyitem_loc_name]['x']
				y=keyitem_loc[keyitem_loc_name]['y']
			}

			// points
			if(legend[i].geom=='point' && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.circle(x+playobj.legend_elementsize/2,y+playobj.legend_elementsize/2,playobj.point_size).attr({fill:chartobject.qualitative_color[numeric],stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.circle(x+playobj.legend_elementsize/2,y+playobj.legend_elementsize/2,playobj.point_size).attr({fill:chartobject.qualitative_color[numeric],stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'})
				} else {
					keyitem_dict[keyitem_name]=snapobj.circle(x+playobj.legend_elementsize/2,y+playobj.legend_elementsize/2,playobj.point_size).attr({fill:chartobject.qualitative_color[numeric],stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'})
				}
			} else if(legend[i].geom=='point' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({fill:chartobject.qualitative_color[numeric],'stroke':chartobject.qualitative_color[numeric]})
				}
				if(legend[i].grouping=='type'){
					// keyitem_dict[keyitem_name].attr({'stroke-width':chartobject.qualitative_color[legend[i].position],})
				}
			}

			// lines
			if((legend[i].geom=='line') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_types[numeric]})
				} else {
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if(legend[i].geom=='line' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					console.log('color')
					// keyitem_dict[keyitem_name].attr({'stroke':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					console.log('type')
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// segments
			if((legend[i].geom=='segment') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.grayscale_color[numeric],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.grayscale_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_types[numeric]})
				} else {
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.grayscale_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if(legend[i].geom=='segment' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					console.log('color')
					// keyitem_dict[keyitem_name].attr({'stroke':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					console.log('type')
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// steps
			if((legend[i].geom=='step') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.path('M'+x+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(1/3))+'L'+(x+chartobject.legend_elementsize)+','+(y+chartobject.legend_elementsize*(1/3))).attr({fill:'none',stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.path('M'+x+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(1/3))+'L'+(x+chartobject.legend_elementsize)+','+(y+chartobject.legend_elementsize*(1/3))).attr({fill:'none',stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_types[numeric]})
				} else {
					keyitem_dict[keyitem_name]=snapobj.path('M'+x+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(1/3))+'L'+(x+chartobject.legend_elementsize)+','+(y+chartobject.legend_elementsize*(1/3))).attr({fill:'none',stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if(legend[i].geom=='step' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({'stroke':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// bars or stacked bars or area 
			if((legend[i].geom=='bar' || legend[i].geom=='stackedbar' || legend[i].geom=='area') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.qualitative_color[numeric],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.qualitative_color[numeric],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else {
					keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.qualitative_color[numeric],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if((legend[i].geom=='bar' || legend[i].geom=='stackedbar' || legend[i].geom=='area') && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({'fill':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					// keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// shade
			if(legend[i].geom=='shade' && keyitem_dict[keyitem_name]===undefined){
				keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.chartfill,'shape-rendering':'crispEdges',ident2:'floatkey',ident:'key'})
				keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:'#fff','fill-opacity':.6,'shape-rendering':'crispEdges',ident2:'floatkey',ident:'key'})
			}
		}

		return (line+1)*parseFloat(playobj.legend_elementsize)+(line+1)*parseFloat(playobj.legend_elementpad)
	}
}

function draw_key(legend,playobj,snapobj,prelim){
	console.log(legend)
	// listener for drag events on a float ing key
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

	// use legend object to draw a key for the figure
	if(legend.length>1){
		var maxwidth=legend[0][1]
		var maxtextwidth=maxwidth-2*playobj.legend_floatpad-playobj.legend_elementsize
		if(legend[0][1]===''){maxwidth=Number.POSITIVE_INFINITY;maxtextwidth=Number.POSITIVE_INFINITY}
		var longest=0
		var ltitle=legend[0][0]
		var floatkey=snapobj.rect(0,0,0,0).attr({ident2:'floatkey',ident:'key',fill:playobj.legend_floatbackground,stroke:playobj.legend_floatstroke,'stroke-width':playobj.legend_floatthickness,'shape-rendering':'crispEdges',colorchange:'fill'})

		var maxitemwidth=0
		var maxycoord=0
		var starty=playobj.legend_floatpad

		if(ltitle!==''){
			var lines=multitext(ltitle,{'font-size':playobj.legend_titletextsize,'font-weight':playobj.legend_titletextweight,'font-family':playobj.legend_titletextface},maxwidth-2*playobj.legend_floatpad)
			var title=snapobj.text(playobj.legend_floatpad,playobj.legend_floatpad,lines).attr({unique:'keytitle',ident2:'floatkey',ident:'key',fill:this.legend_titletextfill,'font-size':playobj.legend_titletextsize,'font-weight':playobj.legend_titletextweight,'font-family':playobj.legend_titletextface,'dominant-baseline':'text-before-edge',colorchange:'fill',context:'text_context_menu'})
			title.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			title.selectAll("tspan:not(:first-child)").attr({x:title.attr('x'),dy:1*parseFloat(title.attr('font-size'))})
			if(maxitemwidth<title.getBBox().x2){maxitemwidth=title.getBBox().x2}
			if(maxycoord<title.getBBox().y2){maxycoord=title.getBBox().y2}
			starty=title.getBBox().y2+playobj.legend_elementpad
			longest=title.getBBox().x2
		}

		// sort according to i and g
		// edit: is there any actual reason to do this?
		// legend.sort(function(a,b){
		// 	return a.position-b.position
		// })

		// legend.sort(function(a,b){
		// 	return a.lgroup-b.lgroup
		// })

		// store each item in a dict so it can be modified as necessary
		// sample legend entry:
		// {geom:point,group_value:1,group_variable:g1,grouping:color,xvar:x,yvar:y,position:1,lgroup:0,overall:0,group_numeric:2}
		var keyitem_dict={}
		var lowery=0
		var extralines=0

		// draw items
		// starting at 1 skips the row that is maxwidth and title
		for(var i=1;i<legend.length;i++){
			var textoffset=parseFloat(playobj.legend_textsize)
			console.log(legend[i])
			var y=starty+(textoffset*extralines)+(legend[i].overall*parseFloat(playobj.legend_elementsize))+(legend[i].lgroup*playobj.legend_floatpad)+(legend[i].overall*parseFloat(playobj.legend_elementpad))
			var x=playobj.legend_floatpad
			var xtext=playobj.legend_floatpad+playobj.legend_elementsize+playobj.legend_elementpad
			var numeric=legend[i].groupnumeric

			// console.log(x,y,xtext)
			// console.log(starty,legend[i].overall,)

			var keyitem_name=legend[i].geom+legend[i].grouping+legend[i].group_value

			if(keyitem_dict[keyitem_name]==undefined){
				var lines=multitext(legend[i].group_value,{'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface},maxtextwidth)
				// the +.5 here is a kluge that only applies to the values of legend_elementsize and legend_textsize you're using feels like it should be (legend_elementsize-legend_textsize)/2 but that doesn't get me what I want
				var t=snapobj.text(xtext,y+.5,lines).attr({ident2:'floatkey',ident:'key',fill:this.legend_textfill,'font-size':playobj.legend_textsize,'font-weight':playobj.legend_textweight,'font-family':playobj.legend_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
				t.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				t.selectAll("tspan:not(:first-child)").attr({x:t.attr('x'),dy:1*parseFloat(t.attr('font-size'))})
				var xend=t.getBBox().x2
				if(xend>longest){longest=xend}
				extralines=extralines+(lines.length-1)
			}

			// points
			if(legend[i].geom=='point' && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.circle(x+playobj.legend_elementsize/2,y+playobj.legend_elementsize/2,playobj.point_size).attr({fill:chartobject.qualitative_color[numeric],stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.circle(x+playobj.legend_elementsize/2,y+playobj.legend_elementsize/2,playobj.point_size).attr({fill:chartobject.qualitative_color[numeric],stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'})
				} else {
					keyitem_dict[keyitem_name]=snapobj.circle(x+playobj.legend_elementsize/2,y+playobj.legend_elementsize/2,playobj.point_size).attr({fill:chartobject.qualitative_color[numeric],stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'})
				}
			} else if(legend[i].geom=='point' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({fill:chartobject.qualitative_color[numeric],'stroke':chartobject.qualitative_color[numeric]})
				}
				if(legend[i].grouping=='type'){
					// keyitem_dict[keyitem_name].attr({'stroke-width':chartobject.qualitative_color[legend[i].position],})
				}
			}

			// lines
			if((legend[i].geom=='line') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_types[numeric]})
				} else {
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if(legend[i].geom=='line' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					console.log('color')
					// keyitem_dict[keyitem_name].attr({'stroke':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					console.log('type')
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// segments
			if((legend[i].geom=='segment') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.grayscale_color[numeric],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.grayscale_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_types[numeric]})
				} else {
					keyitem_dict[keyitem_name]=snapobj.line(x,y+playobj.legend_elementsize/2,x+playobj.legend_elementsize,y+playobj.legend_elementsize/2).attr({stroke:chartobject.grayscale_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if(legend[i].geom=='segment' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					console.log('color')
					// keyitem_dict[keyitem_name].attr({'stroke':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					console.log('type')
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// steps
			if((legend[i].geom=='step') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.path('M'+x+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(1/3))+'L'+(x+chartobject.legend_elementsize)+','+(y+chartobject.legend_elementsize*(1/3))).attr({fill:'none',stroke:chartobject.qualitative_color[numeric],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.path('M'+x+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(1/3))+'L'+(x+chartobject.legend_elementsize)+','+(y+chartobject.legend_elementsize*(1/3))).attr({fill:'none',stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_types[numeric]})
				} else {
					keyitem_dict[keyitem_name]=snapobj.path('M'+x+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(2/3))+'L'+(x+chartobject.legend_elementsize/2)+','+(y+chartobject.legend_elementsize*(1/3))+'L'+(x+chartobject.legend_elementsize)+','+(y+chartobject.legend_elementsize*(1/3))).attr({fill:'none',stroke:chartobject.qualitative_color[0],'stroke-width':playobj.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if(legend[i].geom=='step' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({'stroke':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// bars or stacked bars or area 
			if((legend[i].geom=='bar' || legend[i].geom=='stackedbar' || legend[i].geom=='area') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.qualitative_color[numeric],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.qualitative_color[numeric],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				} else {
					keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.qualitative_color[numeric],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key','shape-rendering':'crispEdges'})
				}
			} else if((legend[i].geom=='bar' || legend[i].geom=='stackedbar' || legend[i].geom=='area') && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({'fill':chartobject.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					// keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_types[numeric]})
				}
			}

			// shade
			if(legend[i].geom=='shade' && keyitem_dict[keyitem_name]===undefined){
				keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:chartobject.chartfill,'shape-rendering':'crispEdges',ident2:'floatkey',ident:'key'})
				keyitem_dict[keyitem_name]=snapobj.rect(x,y,playobj.legend_elementsize,playobj.legend_elementsize).attr({fill:'#fff','fill-opacity':.6,'shape-rendering':'crispEdges',ident2:'floatkey',ident:'key'})
			}

			var lowbound=y+playobj.legend_elementsize+(lines.length-1)*textoffset
			if(lowbound>lowery){lowery=lowbound}
		}

		if(legend[0][1]!==''){longest=maxwidth}
		if(title){
			title.attr({x:(parseFloat(longest)+parseFloat(playobj.legend_floatpad))/2})
			title.selectAll("tspan:not(:first-child)").attr({x:title.attr('x'),dy:1*parseFloat(title.attr('font-size'))})
		}
		floatkey.attr({height:lowery+playobj.legend_floatpad,width:parseFloat(longest)+parseFloat(playobj.legend_floatpad)})
		floatkey.drag(moveFuncfloat,function(){x=this.attr('x');y=this.attr('y');prevx=0;prevy=0});
		// var item={'geom':'point','grouping':'color','group_value':'g1',group_variable:'groupvar',xvar:'xvar',yvar:'yvar',position:i,lgroup:g}
	}
}

function draw_trends(axes,trend,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// trend is {'trends':trends}
	// trends are: [[1,3],[4,2]]

	// loop through trend object, draw a line for each pair of points
	for(var i=0;i<trend.trends.length;i++){

		var current=trend.trends[i]

		if(chartobject.xaxis_dtype=='number'){
			var x_loc1=get_coord(parseFloat(current[0][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
			var x_loc2=get_coord(parseFloat(current[1][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
		} else {
			var x_loc1=get_coord(new Date(current[0][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
			var x_loc2=get_coord(new Date(current[1][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
		}

		if(chartobject.yaxis_dtype=='number'){
			var y_loc1=get_coord(parseFloat(current[0][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
			var y_loc2=get_coord(parseFloat(current[1][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
		} else {
			var y_loc1=get_coord(new Date(current[0][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
			var y_loc2=get_coord(new Date(current[1][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
		}

		var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
		var temp=snapobj.path(path).attr({stroke:chartobject.trend_fill,'stroke-width':chartobject.trend_width,'colorchange':'stroke',context:'path_context_menu'})
		var pathcoords=temp.getBBox()

		var tempwidth=pathcoords.width
		var tempheight=pathcoords.height
		var unitslope=tempheight/tempwidth

		// truncate trendlines that leave the graph
		// fake box that covers the plotting region
		var tempbox=snapobj.path('M'+axes[0]+','+axes[3]+'L'+axes[1]+','+axes[3]+'L'+axes[1]+','+axes[2]+'L'+axes[0]+','+axes[2]+'L'+axes[0]+','+axes[3]).attr({})
		var areabox=tempbox.getBBox()
		console.log(areabox)

		// check to see if start and endpoints are inside the box. If they aren't, set them to the intersection of the trendline and the bounding box
		// have to check 3 circumstances - where 1st point is off graph and 2nd is off, both off, etc.
		if(Snap.path.isPointInsideBBox(areabox,x_loc1,y_loc1)==false & Snap.path.isPointInsideBBox(areabox,x_loc2,y_loc2)==false){
			// both points are outside the box, path has to redrawn based on two intersection points
			var intersects=Snap.path.intersection(temp,tempbox)

			var x_loc1=intersects[0]['x']
			var x_loc2=intersects[1]['x']
			var y_loc1=intersects[0]['y']
			var y_loc2=intersects[1]['y']

			var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
			temp.remove()
			var temp=snapobj.path(path).attr({stroke:chartobject.trend_fill,'stroke-width':chartobject.trend_width,'colorchange':'stroke',context:'path_context_menu'})
		} else if(Snap.path.isPointInsideBBox(areabox,x_loc1,y_loc1)==false & Snap.path.isPointInsideBBox(areabox,x_loc2,y_loc2)==true){
			// both points are outside the box, path has to redrawn based on two intersection points
			var intersects=Snap.path.intersection(temp,tempbox)

			var x_loc1=intersects[0]['x']
			var y_loc1=intersects[0]['y']

			var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
			temp.remove()
			var temp=snapobj.path(path).attr({stroke:chartobject.trend_fill,'stroke-width':chartobject.trend_width,'colorchange':'stroke',context:'path_context_menu'})
		} else if(Snap.path.isPointInsideBBox(areabox,x_loc1,y_loc1)==true & Snap.path.isPointInsideBBox(areabox,x_loc2,y_loc2)==false){
			// both points are outside the box, path has to redrawn based on two intersection points
			var intersects=Snap.path.intersection(temp,tempbox)

			var x_loc2=intersects[1]['x']
			var y_loc2=intersects[1]['y']

			var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
			temp.remove()
			var temp=snapobj.path(path).attr({stroke:chartobject.trend_fill,'stroke-width':chartobject.trend_width,'colorchange':'stroke',context:'path_context_menu'})
		}

		tempbox.remove()
		var pathcoords=temp.getBBox()
		console.log(pathcoords)

		// finally add the text
		var trendtext=snapobj.text((x_loc1+x_loc2)/2,(y_loc1+y_loc2)/2,'Trendline').attr({fill:chartobject.trend_textcolor,'font-family':chartobject.trend_textface,'font-weight':chartobject.trend_textweight,'dominant-baseline':'text-before-edge','text-anchor':'middle','colorchange':'fill',context:'text_context_menu'})
		trendtext.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		var coords=trendtext.getBBox()
		trendtext.attr({y:coords.y-chartobject.trend_linetotext-coords.height})
		var inclincation=-(Math.atan(parseFloat(unitslope))*360)/(2*Math.PI)
		trendtext.transform('r'+inclincation+' '+coords.cx+' '+coords.cy)
	}
}


function draw_lines(axes,line,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// var is {'xvar':x_var,'yvar':y_var,'connect':connect,'grouping':{'color':color,'size':size,'type':type}}
	if(line.connect==='none'){
		var connect=line.xvar
	} else {
		var connect=line.connect
	}

	if(line.grouping.color!=='none'){
		var color_groups=get_color_groups(line)
	} 

	if(line.grouping.type!=='none'){
		var temp=chartobject.dataset.filter(function(row){
			return row[line.xvar]!==undefined & row[line.yvar]!==undefined
		})
		var type_groups=[]
		for(var i=0;i<temp.length;i++){
			type_groups.push(temp[i][line.grouping.type])
		}
		var type_groups=[...new Set(type_groups)]
	} 

	// check for sizing variable and get min and max for scaling
	if(line.size!=='none'){
		var minsize=Math.min(...remove_missing(chartobject.flatdata[line.size]))
		var maxsize=Math.max(...remove_missing(chartobject.flatdata[line.size]))
	}

	// create full group list
	if(line.grouping.color!=='none' || line.grouping.type!=='none'){
		var temp=[]
		var temp2=[]
		for(var i=0;i<chartobject.dataset.length;i++){
			if(chartobject.dataset[i][line.xvar]!==undefined & chartobject.dataset[i][line.yvar]!==undefined){
				if(chartobject.dataset[i][line.grouping.color]!==undefined || chartobject.dataset[i][line.grouping.type]!==undefined){
					temp.push([chartobject.dataset[i][line.grouping.color],chartobject.dataset[i][line.grouping.type]])
				}
			}
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

	console.log(groups)

	// loop through groups in the dataset to draw lines
	for(var i=0;i<groups.length;i++){
		var current=chartobject.dataset.filter(function(row){
			return row[line.grouping.color]===groups[i][0]
		}).filter(function(row){
			return row[line.grouping.type]===groups[i][1]
		})

		var current=chartobject.dataset.filter(function(row){
			return row[connect]!==undefined
		})

		// order according to the connect variable, connect on x by default
		if(chartobject.flatdata[connect].dtype=='blah ignore this'){
			current.sort(function(a,b){
			})
		} else if(chartobject.flatdata[connect].dtype=='text'){
		
		} else {
			current.sort(function(a,b){
				return a[connect]-b[connect]
			})
		}

		console.log(current)

		// check for sizing variable and set line width
		if(line.size!=='none'){
			if(current[0][line.size]!==undefined){
				var linewidth=((current[0][line.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.line_maxsize)-parseFloat(chartobject.line_minsize))+parseFloat(chartobject.line_minsize)
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
			if(sub_current[connect]!==undefined){
				if((sub_current[line.xvar]==undefined && connect==line.yvar) || (sub_current[line.yvar]==undefined && connect==line.xvar)){
					// set various values for points. locations
					var x_loc=get_coord(sub_next[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var y_loc=get_coord(sub_next[line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					// add to path or start path
					if(isNaN(y_loc)==false){
						if(j==0){
							path=path+'M'+x_loc+','+y_loc
						} else{
							path=path+'M'+x_loc+','+y_loc
						}
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
		}
		// draw line
		snapobj.path(path).attr({'data_label':label,class:'dataelement',stroke:color,'stroke-width':linewidth,fill:'none','group':current[0][line.grouping.color],'fill-opacity':0,'stroke-opacity':chartobject.linechart_strokeopacity,'colorchange':'stroke',context:'pathdata_context_menu','stroke-dasharray':linetype})
	}
}

function draw_area(axes,line,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// area is {'xvar':x_var,'yvar':y_var,'grouping':{'color':color}}

	if(line.grouping.color!=='none'){
		var color_groups=get_color_groups(line)
	} 

	// create full group list - this is not necessary when there's only one group but in case you add to it in the future, just edit line 5 under here
	if(line.grouping.color!=='none'){
		var temp=[]
		var temp2=[]
		for(var i=0;i<chartobject.dataset.length;i++){
			if(chartobject.dataset[i][line.xvar]!==undefined & chartobject.dataset[i][line.yvar]!==undefined & chartobject.dataset[i][line.grouping.color]!==undefined){
				temp.push([chartobject.dataset[i][line.grouping.color]])
			}
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
		var groups=[[undefined]]
	}

	// create initial base path
	var current=chartobject.dataset.filter(function(row){
		return row[line.grouping.color]===groups[0][0]
	})

	var zero=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
	var x_left=get_coord(current[0][line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
	var x_right=get_coord(current[current.length-1][line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)

	var base_path='L'+x_right+','+zero+'L'+x_left+','+zero
	var add_values=[]

	// loop through groups in the dataset to draw lines
	for(var i=0;i<groups.length;i++){
		var current=chartobject.dataset.filter(function(row){
			return row[line.grouping.color]===groups[i][0]
		})

		console.log(current)

		// order according to the x variable
		var connect=line.xvar
		current.sort(function(a,b){
			return a[line.xvar]-b[line.xvar]
		})

		// color
		if(line.grouping.color!=='none'){
			var color=chartobject.qualitative_color[color_groups.indexOf(current[0][line.grouping.color])]
		} else {
			var color=chartobject.qualitative_color[0]
		}

		// label
		var label=current[0][line.color]

		// create empty path
		var path=''
		var new_base=''

		// now loop through points in the line
		for(var j=0;j<current.length;j++){
			var sub_current=current[j]

			try{
				var sub_next=current[j+1]
			} catch(err){}

			try{
				var sub_prev=prev_current[j]
			} catch(err){}

			if(isNaN(sub_current[connect])==false){
				if((sub_current[line.xvar]==undefined && connect==line.yvar) || (sub_current[line.yvar]==undefined && connect==line.xvar)){
					alert("Can't graph areas when there are discontinuities in one or more lines - remove missing data and try again.")
				} else if(sub_current[line.xvar]!=undefined && sub_current[line.yvar]!=undefined){
					// if this isn't the first pass, check the previous group and add the y-values up so the areas stack appropriately
					if(i!==0){
						var y_add=sub_current[line.yvar]+add_values[j]
						add_values[j]=y_add
					} else {
						var y_add=sub_current[line.yvar]
						add_values.push(y_add)
					}

					if(j==0){
						var start_x_loc=get_coord(sub_current[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
						var start_y_loc=get_coord(y_add,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					}

					// set various values for points. locations
					var x_loc=get_coord(sub_current[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var y_loc=get_coord(y_add,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					// add to path or start path
					if(j==0){
						path=path+'M'+x_loc+','+y_loc
						new_base='L'+x_loc+','+y_loc+new_base
					} else {
						path=path+'L'+x_loc+','+y_loc
						new_base='L'+x_loc+','+y_loc+new_base
					}
				} else {}
			}
		}

		path=path+base_path+'L'+start_x_loc+','+start_y_loc
		base_path=new_base

		// draw line
		snapobj.path(path).attr({'data_label':label,class:'dataelement',stroke:color,'stroke-width':0,fill:color,'group':current[0][line.grouping.color],'colorchange':'fill',context:'pathdata_context_menu'})
	}

	// pull the y=0 line to the front
	snapobj.append(snapobj.selectAll('[zeroline="1"]'))
}

function draw_steps(axes,step,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// step is {'xvar':x_var,'yvar':y_var,'connect':connect,'size':size,'grouping':{'color':color,'type':type}}

	if(step.grouping.color!=='none'){
		var color_groups=get_color_groups(step)
	} 

	if(step.grouping.type!=='none'){
		var temp=chartobject.dataset.filter(function(row){
			return row[step.xvar]!==undefined & row[step.yvar]!==undefined
		})
		var type_groups=[]
		for(var i=0;i<temp.length;i++){
			type_groups.push(temp[i][step.grouping.type])
		}
		var type_groups=[...new Set(type_groups)]
	} 

	// check for sizing variable and get min and max for scaling
	if(step.size!=='none'){
		var minsize=Math.min(...remove_missing(chartobject.flatdata[step.size]))
		var maxsize=Math.max(...remove_missing(chartobject.flatdata[step.size]))
	}

	// create full group list
	if(step.grouping.color!=='none' || step.grouping.type!=='none'){
		var temp=[]
		var temp2=[]
		for(var i=0;i<chartobject.dataset.length;i++){
			if(chartobject.dataset[i][step.xvar]!==undefined & chartobject.dataset[i][step.yvar]!==undefined){
				temp.push([chartobject.dataset[i][step.grouping.color],chartobject.dataset[i][step.grouping.type]])
			}
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
			return row[step.grouping.color]===groups[i][0]
		}).filter(function(row){
			return row[step.grouping.type]===groups[i][1]
		})

		// order according to the connect variable, connect on x by default
		if(step.connect!=='none'){
			var connect=step.connect
			current.sort(function(a,b){
				return a[step.connect]-b[step.connect]
			})
		} else {
			var connect=step.xvar
			current.sort(function(a,b){
				return a[step.xvar]-b[step.xvar]
			})
		}

		// check for sizing variable and set line width
		if(step.size!=='none'){
			if(current[0][step.size]!=undefined){
				var linewidth=((current[0][step.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.line_maxsize)-parseFloat(chartobject.line_minsize))+parseFloat(chartobject.line_minsize)
			}
		} else {
			var linewidth=chartobject.line_size
		}

		// color
		if(step.grouping.color!=='none'){
			var color=chartobject.qualitative_color[color_groups.indexOf(current[0][step.grouping.color])]
		} else {
			var color=chartobject.qualitative_color[0]
		}

		// line type
		if(step.grouping.type!=='none'){
			console.log('typing: ',type_groups,current[0],step.grouping.type)
			var linetype=chartobject.line_types[type_groups.indexOf(current[0][step.grouping.type])]
		} else {
			var linetype=chartobject.line_types[0]
		}

		// label
		var label=current[0][step.color]+', '+current[0][step.type]

		var path=''
		// now loop through points in the line
		for(var j=0;j<current.length;j++){
			var sub_current=current[j]

			try{
				var sub_next=current[j+1]
			} catch(err){}

			if(isNaN(sub_current[connect])==false){
				if((sub_current[step.xvar]==undefined && connect==step.yvar) || (sub_current[step.yvar]==undefined && connect==step.xvar)){
					// set various values for points. locations
					var x_loc=get_coord(sub_next[step.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[step.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var y_loc=get_coord(sub_next[step.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[step.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					// add to path or start path
					if(j==0){
						path=path+'M'+x_loc+','+y_loc
					} else{
						path=path+'M'+x_loc+','+y_loc
					}
				} else if(sub_current[step.xvar]!=undefined && sub_current[step.yvar]!=undefined){
					// set various values for points. locations
					var x_loc=get_coord(sub_current[step.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[step.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var y_loc=get_coord(sub_current[step.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[step.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					// add to path or start path
					if(j==0){
						path=path+'M'+x_loc+','+y_loc
					} else{
						path=path+'L'+x_loc+','+prev_y_loc+'L'+x_loc+','+y_loc
					}
				} else {}

				var prev_x_loc=x_loc
				var prev_y_loc=y_loc
			}
		}
		console.log(path)
		// draw line
		snapobj.path(path).attr({'data_label':label,class:'dataelement',stroke:color,'stroke-width':linewidth,fill:'none','group':current[0][step.grouping.color],'fill-opacity':0,'stroke-opacity':chartobject.linechart_strokeopacity,'colorchange':'stroke',context:'pathdata_context_menu','stroke-dasharray':linetype})
	}
}


function draw_points(axes,point,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// point is {'xvar':x_var,'yvar':y_var,'labels':label,'labelall':pointlabel,'grouping':{'color':color,'size':size,'type':type}}

	// create sets of options for each grouping variable
	if(point.grouping.color!=='none'){
		var color_groups=get_color_groups(point)
	} 

	if(point.grouping.type!=='none'){
		var temp=chartobject.dataset.filter(function(row){
			return row[point.xvar]!==undefined & row[point.yvar]!==undefined
		})
		var type_groups=[]
		for(var i=0;i<temp.length;i++){
			type_groups.push(temp[i][point.grouping.type])
		}
		var type_groups=[...new Set(type_groups)]
	} 

	// check for sizing variable and get min and max for scaling
	if(point.size!=='none'){
		var minsize=Math.min(...chartobject.flatdata[point.size])
		var maxsize=Math.max(...chartobject.flatdata[point.size])
	}

	// loop through observations in the dataset to draw points
	for(var i=0;i<chartobject.dataset.length;i++){
		var current=chartobject.dataset[i]

		// check for sizing variable and set point size
		if(point.size!=='none'){
			var pointsize=((current[point.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.point_maxsize)-parseFloat(chartobject.point_minsize))+parseFloat(chartobject.point_minsize)
		} else {
			var pointsize=chartobject.point_size
		}

		// set various values for points. locations
		if(current[point.xvar]!=undefined && current[point.yvar]!=undefined  && ((point.grouping.color=='none') || (point.grouping.color!=='none' && current[point.grouping.color]!==undefined))){
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
				snapobj.circle(x_loc,y_loc,pointsize).attr({fill:color,stroke:color,'stroke-width':chartobject.point_strokewidth,'data_type':'point','data_label':label,'group':current[point.grouping.color],'class':'dataelement','fill-opacity':chartobject.point_fillopacity,colorchange:'both',context:'point_context_menu'})
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

function draw_segments(axes,segment,snapobj){
	console.log('segments')
	// axes are [xleft,xright,ybottom,ytop]
	// segment is {'xvar':x_start,'yvar':y_start,'xvar2':x_end,'yvar2':y_end,'size':size,'grouping':{'color':color,'type':type}}

	// create sets of options for each grouping variable
	if(segment.grouping.color!=='none'){
		color_groups=get_color_groups(segment)
	} 

	if(segment.grouping.type!=='none'){
		var temp=chartobject.dataset.filter(function(row){
			return row[segment.xvar]!==undefined & row[segment.yvar]!==undefined
		})
		var type_groups=[]
		for(var i=0;i<temp.length;i++){
			type_groups.push(temp[i][segment.grouping.type])
		}
		var type_groups=[...new Set(type_groups)]
	} 

	// check for sizing variable and get min and max for scaling
	if(segment.size!=='none'){
		var minsize=Math.min(...chartobject.flatdata[segment.size])
		var maxsize=Math.max(...chartobject.flatdata[segment.size])
	}

	// loop through observations in the dataset to draw segments
	for(var i=0;i<chartobject.dataset.length;i++){
		var current=chartobject.dataset[i]

		// check for sizing variable and set point size
		if(segment.size!=='none'){
			var size=((current[segment.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.segment_maxsize)-parseFloat(chartobject.segment_minsize))+parseFloat(chartobject.segment_minsize)
		} else {
			var size=chartobject.segment_width
		}

		// set various values for points. locations
		if(current[segment.xvar]!=undefined && current[segment.yvar]!=undefined && current[segment.xvar2]!=undefined && current[segment.yvar2]!=undefined  && ((segment.grouping.color=='none') || (segment.grouping.color!=='none' && current[segment.grouping.color]!==undefined))){
			var x_loc1=get_coord(current[segment.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[segment.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc1=get_coord(current[segment.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[segment.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
			var x_loc2=get_coord(current[segment.xvar2],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[segment.xvar2].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc2=get_coord(current[segment.yvar2],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[segment.yvar2].dtype,chartobject.yarray,1,chartobject.shifty)

			// color
			if(segment.grouping.color!=='none'){
				var color=chartobject.grayscale_color[color_groups.indexOf(current[segment.grouping.color])]
			} else {
				console.log('color')
				var color=chartobject.grayscale_color[0]
			}

			// type
			if(segment.grouping.type!=='none'){
				var type=chartobject.segment_linetypes[type_groups.indexOf(current[segment.grouping.type])]
			} else {
				var type=chartobject.segment_linetypes[0]
			}

			// draw segment
			snapobj.line(x_loc1,y_loc1,x_loc2,y_loc2).attr({class:'dataelement',stroke:color,'stroke-width':size,'group':current[segment.grouping.color],'stroke-opacity':chartobject.linechart_strokeopacity,'colorchange':'stroke',context:'pathdata_context_menu','stroke-dasharray':type})
		}
	}
}

function draw_text(axes,text,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// text is {'xvar':x_var,'yvar':y_var,'size':size,'text':text}

	// check for sizing variable and get min and max for scaling
	if(text.size!=='none'){
		var minsize=Math.min(...chartobject.flatdata[text.size])
		var maxsize=Math.max(...chartobject.flatdata[text.size])
	}

	// loop through observations in the dataset to draw text
	for(var i=0;i<chartobject.dataset.length;i++){
		var current=chartobject.dataset[i]

		// check for sizing variable and set text size
		if(text.size!=='none'){
			var size=((current[text.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.text_maxsize)-parseFloat(chartobject.text_minsize))+parseFloat(chartobject.text_minsize)
		} else {
			var size=chartobject.annotatesize
		}

		// set values for text locations
		if(current[text.xvar]!=undefined && current[text.yvar]!=undefined && current[text.text]!=undefined){
			var x_loc=get_coord(current[text.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[text.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc=get_coord(current[text.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[text.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

			// draw text
			var t=snapobj.text(x_loc,y_loc,current[text.text]).attr({fill:chartobject.annotatetextfill,'data_type':'text','class':'dataelement',colorchange:'fill',context:'text_context_menu','text-anchor':'middle','dominant-baseline':'text-before-edge','font-size':size,'font-family':chartobject.annotateface,'font-weight':chartobject.annotateweight})
			t.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			center_baseline(t)
		}
	}
}

function draw_shade(axes,shade,snapobj){
	console.log(axes)
	// axes are [xleft,xright,ybottom,ytop]
	// shade is {'xvar':x_var,'yvar':y_var}

	// loop through observations in the xvar and yvar
	if(shade.xarr.length>0){
		for(var i=0;i<shade.xarr.length;i++){
			var current=shade.xarr[i]
			var x_left=get_coord(current[0],chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
			var x_right=get_coord(current[1],chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
			var y_top=axes[2]
			var y_bottom=axes[3]

			if((x_left>=axes[0] & x_left<=axes[1]) | (x_right<=axes[1] & x_right>=axes[0])){
				if(x_left<axes[0]){x_left=axes[0]}
				if(x_right>axes[1]){x_right=axes[1]}
				snapobj.path('M'+x_left+','+y_top+'L'+x_right+','+y_top+'L'+x_right+','+y_bottom+'L'+x_left+','+y_bottom+'L'+x_left+','+y_top).attr({fill:'#fff','fill-opacity':.6,'shape-rendering':'crispEdges'})
			}
		}
	}

	if(shade.yarr.length>0){
		for(var i=0;i<shade.xarr.length;i++){
			var current=shade.yarr[i]
			var x_left=axes[0]
			var x_right=axes[1]
			var y_top=get_coord(current[0],chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
			var y_bottom=get_coord(current[1],chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)

			if(y_top<=axes[3] | y_bottom>=axes[2]){
				if(y_top<axes[3]){y_top=axes[3]}
				if(y_bottom>axes[2]){y_bottom=axes[2]}
				snapobj.path('M'+x_left+','+y_top+'L'+x_right+','+y_top+'L'+x_right+','+y_bottom+'L'+x_left+','+y_bottom+'L'+x_left+','+y_top).attr({fill:'#fff','fill-opacity':.6,'shape-rendering':'crispEdges'})
			}
		}
	}
}

function draw_bars(axes,bar,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// bar is {'xvar':x_var,'yvar':y_var,'grouping':{'color':color,'bargroup':bargroup}}
	// create sets of options for each grouping variable
	if(bar.grouping.color!=='none'){
		var color_groups=get_color_groups(bar)	
	} else { 
		var color_groups=['placeholder'] 
	}

	if(bar.grouping.bargroup!=='none'){
		// what is this even for? I honestly don't remember. But I had a frontend for it, so I must have had something in mind.
		// I think this is supposed to be for coloring non-grouped bars so ie you could have bars <some date be one color, >some date another or positive/negative revenues
		var bargroup_groups=[...new Set(chartobject.flatdata[bar.grouping.bargroup])]
	} else { var bargroup_groups=['placeholder'] }

	// to figure out the width of a bar, need to find the two values that are *closest* on the x-axis.
	// the bar width should be just large enough that those two bars have a little space between them
	// this is already stored in mindiff
	if(chartobject.bar.orientation=='on'){
		var x_values=[...new Set(chartobject.flatdata[bar.xvar])]
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
			console.log(get_coord(x_values[0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx),get_coord(x_values[1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx))
			var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(x_values[0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(x_values[1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
			var barwidth=totalwidth
		}
	} else {
		var y_values=[...new Set(chartobject.flatdata[bar.yvar])]
		if(chartobject.flatdata[bar.yvar].dtype!='text'){
			var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(chartobject.mindiff,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)))
			var barwidth=totalwidth
			console.log(barwidth)
			// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
			if(totalwidth/2>get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[0] || totalwidth/2>axes[1]-get_coord(chartobject.ymax,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)){
				console.log('clipping')
				var totalwidth=Math.abs(chartobject.barchart_width*2*(get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[2]))
				var barwidth=totalwidth
				console.log(barwidth)
			}
		} else {
			// if the axis is categorical, get width based on that instead.
			console.log(get_coord(chartobject.flatdata[bar.yvar][0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1))
			var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(y_values[0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(y_values[1],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)))
			var barwidth=totalwidth
		}
	}

	console.log(barwidth)

	// loop through observations in the dataset to draw bars
	for(var i=0;i<chartobject.dataset.length;i++){
		var current=chartobject.dataset[i]

		if(current[bar.xvar]!=undefined && current[bar.yvar]!=undefined && ((bar.grouping.color=='none') || (bar.grouping.color!=='none' && current[bar.grouping.color]!==undefined))){
			// color + grouping
			if(bar.grouping.color!=='none'){
				var color=chartobject.qualitative_color[color_groups.indexOf(current[bar.grouping.color])]
				console.log(barwidth,color_groups.length)
				var barwidth=totalwidth/color_groups.length
				// set various values for bar locations
				if(chartobject.bar.orientation=='on'){
					var orient='vertical'
					var x1=get_coord(current[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(totalwidth/2)+barwidth*(color_groups.indexOf(current[bar.grouping.color]))
					var x2=x1+barwidth
					var y1=get_coord(current[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					var y2=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
				} else {
					var orient='horizontal'
					var y1=get_coord(current[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shiftx,1)-(totalwidth/2)+barwidth*(color_groups.indexOf(current[bar.grouping.color]))
					var y2=y1+barwidth
					var x1=get_coord(current[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var x2=get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
				}
			} else {
				var color=chartobject.qualitative_color[0]

				// set various values for bar locations
				if(chartobject.bar.orientation=='on'){
					var orient='vertical'
					var x1=get_coord(current[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(barwidth/2)
					var x2=x1+barwidth
					var y1=get_coord(current[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					var y2=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
				} else {
					var orient='horizontal'
					var y1=get_coord(current[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-(barwidth/2)
					var y2=y1+barwidth
					var x1=get_coord(current[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var x2=get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
				}
			}

			// label in this case should be the y-value
			var label=current[bar.yvar]

			// draw bar

			snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,'data_type':'bar','data_label':label,'group':current[bar.grouping.color],'class':'dataelement','shape-rendering':'crispEdges',fill:color,colorchange:'fill',context:'data_context_menu'})
		}
	}

	// always gotta pull the y=0 line to the front after creating a barchart
	snapobj.append(snapobj.selectAll('[zeroline="1"]'))
}

function draw_stackedbars(axes,bar,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// bar is {'xvar':x_var,'yvar':y_var,'grouping':{'color':color,'bargroup':bargroup}}
	// create sets of options for each grouping variable
	if(bar.grouping.color!=='none'){
		var temp=chartobject.dataset.filter(function(row){
			return row[bar.xvar]!==undefined & row[bar.yvar]!==undefined
		})
		var color_groups=[]
		for(var i=0;i<temp.length;i++){
			color_groups.push(temp[i][bar.grouping.color])
		}
		var color_groups=[...new Set(color_groups)]	
	} else { 
		var color_groups=['placeholder'] 
	}

	// to figure out the width of a bar, need to find the two values that are *closest* on the x-axis.
	// the bar width should be just large enough that those two bars have a little space between them
	// this is already stored in mindiff
	if(bar.orientation=='on'){
		var x_values=[...new Set(chartobject.flatdata[bar.xvar])]
		var orient='vertical'
		if(chartobject.flatdata[bar.xvar].dtype!='text'){
			var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(chartobject.mindiff,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
			var barwidth=totalwidth
			// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
			if(totalwidth/2>get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0] || totalwidth/2>axes[1]-get_coord(chartobject.xmax,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)){
				console.log('clipping')
				var totalwidth=Math.abs(chartobject.barchart_width*2*(get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0]))
				var barwidth=totalwidth
			}
		} else {
			// if the axis is categorical, get width based on that instead.
			var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(x_values[0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(x_values[1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
			var barwidth=totalwidth
		}
	} else {
		var orient='horizontal'
		var y_values=[...new Set(chartobject.flatdata[bar.yvar])]
		if(chartobject.flatdata[bar.yvar].dtype!='text'){
			var totalwidth=Math.abs(chartobject.barchart_width*(get_coord(chartobject.mindiff,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)))
			var barwidth=totalwidth
			// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
			if(totalwidth/2>get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[0] || totalwidth/2>axes[1]-get_coord(chartobject.ymax,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)){
				var totalwidth=Math.abs(chartobject.barchart_width*2*(get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[2]))
				var barwidth=totalwidth
			}
		} else {
			// if the axis is categorical, get width based on that instead.
			console.log(get_coord(chartobject.flatdata[bar.yvar][0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1))
			var totalwidth=Math.abs(chartobject.barchart_width*(get_values[0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(get_values[1],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1))
			var barwidth=totalwidth
		}
	}

	if(bar.orientation=='on'){
		// draw vertical bars, get all necessary coords etc.
		var x_values=[...new Set(chartobject.flatdata[bar.xvar])]
		var y_ends_positive=new Array(x_values.length)
		var y_ends_negative=new Array(x_values.length)
		for(var i=0;i<y_ends_positive.length;i++){
			y_ends_positive[i]=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
			y_ends_negative[i]=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
		}
		var zero=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

		for(var i=0;i<color_groups.length;i++){
			var color=chartobject.qualitative_color[i]
			for(var j=0;j<chartobject.dataset.length;j++){
				var temp=chartobject.dataset[j]
				if(temp[bar.grouping.color]==color_groups[i]){
					if(temp[bar.yvar]>0){
						var i_loc=x_values.indexOf(temp[bar.xvar])
						var y1=y_ends_positive[i_loc]
						var y2=y1-(zero-get_coord(temp[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty))
						var x1=get_coord(temp[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(totalwidth/2)
						var x2=x1+barwidth
						var label=temp[bar.yvar]
						console.log('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2)
						snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,'data_type':'bar','data_label':label,'group':temp[bar.grouping.color],'class':'dataelement','shape-rendering':'crispEdges',fill:color,context:'data_context_menu'})

						console.log(y_ends_positive)
						y_ends_positive[i_loc]=y2
					} else {
						var i_loc=x_values.indexOf(temp[bar.xvar])
						var y1=y_ends_negative[i_loc]
						var y2=y1-(zero-get_coord(temp[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty))
						var x1=get_coord(temp[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(totalwidth/2)
						var x2=x1+barwidth
						var label=temp[bar.yvar]
						console.log('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2)
						snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,'data_type':'bar','data_label':label,'group':temp[bar.grouping.color],'class':'dataelement','shape-rendering':'crispEdges',fill:color,context:'data_context_menu'})

						console.log(y_ends_negative)
						y_ends_negative[i_loc]=y2
					}
				}
			}
		}
	} else {
		// draw horizontal bars
	}

	// always gotta pull the y=0 line to the front after creating a barchart
	snapobj.append(snapobj.selectAll('[zeroline="1"]'))
}

function get_color_groups(geom){
	var temp=chartobject.dataset.filter(function(row){
		return row[geom.xvar]!==undefined & row[geom.yvar]!==undefined & row[geom.grouping.color]!==undefined
	})
	var color_groups=[]
	for(var i=0;i<temp.length;i++){
		color_groups.push(temp[i][geom.grouping.color])
	}
	var color_groups=[...new Set(color_groups)]	
	return color_groups
}

function get_coord(value,[limit_start,limit_end],[pixel_start,pixel_end],type,array,y,shift,ybar){
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
			if(ybar==1){
				return pixel_start-(value-limit_start)/Math.abs(limit_end-limit_start)*Math.abs(pixel_end-pixel_start)
			} else {
				return pixel_start-(value-limit_start)/Math.abs(limit_end-limit_start)*Math.abs(pixel_end-pixel_start)
			}
		} else {
			return pixel_start+(value-limit_start)/Math.abs(limit_end-limit_start)*Math.abs(pixel_end-pixel_start)
		}
	} else if(type=='text'){
		if(y==1){
			var position=array.indexOf(value)+1
			// console.log('TEST',pixel_start,pixel_end,array,position)
			if(ybar==1){
				return pixel_start-((2*position-1)/(2*array.length))*Math.abs(pixel_end-pixel_start)
			} else {
				return pixel_start-((2*position-1)/(2*array.length-1))*Math.abs(pixel_end-pixel_start)
			}
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
		// somewhat arbitrary rule: if the month is >3, round up in years, otherwise round down
		if(datamax.getUTCMonth()>2){
			datamax=new Date(String(datamax.getUTCFullYear()+1))
		} else {
			datamax=new Date(String(datamax.getUTCFullYear()))
		}
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
		    if (step_array.length<15 && step_array.length>3){candidate_arrays.push(step_array)}
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
			penalty=1+.05*(candidate_arrays[i].length-6)
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


function draw_axes(playobj,xvar,yvar,shiftx,shifty,legend_height) {
	// console.log(xvar,yvar)
	// draws the axes for a graph
	// shiftx and shifty are optional parameters. If shiftx or shifty==1, that axis will
	// be shifted such that labels occur between ticks, appropriate for a bar graph. There
	// will also be one more tick to accomodate this change

	snapobj=playobj.svg

	// placeholder until I figure out top keys
	playobj.legend_toppad=0
	playobj.legend_bottompad=0

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
		var temp=snapobj.text(playobj.left_margin+ylab_width+playobj.ytick_to_ylabel,0,string).attr({fill:playobj.ytick_textfill,ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'start',colorchange:'fill',context:'text_context_menu'})
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
			var temp=snapobj.text(0,j*parseInt(playobj.xtick_textsize),lines[j]).attr({fill:playobj.xtick_textfill,ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xtick_textweight,'font-family':playobj.xtick_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
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
			var tempx=get_coord(xvar[i],playobj.xlimits,[xstart_xcoord,xfinal_xcoord],xvar.dtype,xvar,0,playobj.shiftx)
			var temp=snapobj.text(tempx,playobj.y+playobj.height-playobj.bottom_margin-playobj.footer_height-xlab_height-playobj.xtick_to_xlabel-total_yoffset+playobj.xtick_to_xaxis+j*parseInt(playobj.xtick_textsize),linesj).attr({fill:playobj.xtick_textfill,ident:'xaxis','font-size':playobj.xtick_textsize,'font-weight':playobj.xtick_textweight,'font-family':playobj.xtick_textface,'dominant-baseline':'text-before-edge','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
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
	maxwidth=(playobj.ytick_maxsize*playobj.width)-playobj.left_margin
	console.log(maxwidth)
	for(var i=0;i<yvar.length;i++){
		// y-axis labels

		if(Object.prototype.toString.call(yvar[i])==='[object Date]'){
			string=formatDate(yvar[i],Math.max(...yvar)-Math.min(...yvar))
		} else {
			string=String(yvar[i])
		}

		if (parseInt(string)>=1000 || parseInt(string)<=-1000){linesj=commas(string)}
		var tempy=get_coord(string,playobj.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,playobj.shifty,chartobject.ybar)
		lines=multitext(string,{ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'end'},maxwidth)
		var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,tempy,lines).attr({fill:playobj.ytick_textfill,ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'end',colorchange:'fill',context:'text_context_menu'})
		temp.selectAll("tspan:not(:first-child)").attr({x:temp.attr('x'),dy:parseInt(playobj.ytick_textsize)})
		temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		coords=temp.getBBox()
		temp.attr({y:coords.y-coords.height/2})


		// for(var j=0;j<lines.length;j++){
		// 	if (parseInt(lines[j])>=1000 || parseInt(lines[j])<=-1000){linesj=commas(lines[j])} else{linesj=lines[j]}
		// 	// var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,ystart_ycoord-(y_step/2)*shifty-y_step*i+j*parseInt(playobj.xtick_textsize),linesj).attr({fill:this.ytick_textfill,ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'end',colorchange:'fill',context:'text_context_menu'})
		// 	var tempy=get_coord(string,playobj.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,playobj.shifty,chartobject.ybar)
		// 	var temp=snapobj.text(playobj.x+total_xoffset-playobj.ytick_to_yaxis,tempy,linesj).attr({fill:this.ytick_textfill,ident:'yaxis','font-size':playobj.ytick_textsize,'font-weight':playobj.ytick_textweight,'font-family':playobj.ytick_textface,'dominant-baseline':'text-before-edge','text-anchor':'end',colorchange:'fill',context:'text_context_menu'})
		// 	temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")

		// }

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










































