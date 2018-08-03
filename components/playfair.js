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
	// is any of this documentation even accurate anymore? Who can say?
	Playfair.prototype.data = function(data,geom_dict,facets) {
		// facet={'facet_variable':facet_variable,'facet_rows':facet_rows,'facet_columns':facet_columns}

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
		// primary keys are row names and then within each row there is
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
		this.rect=geom_dict.rect
		this.map=geom_dict.map
		this.bounds=geom_dict.bounds
		this.shifty=0
		this.shiftx=0
		this.datedenom=[0,0]
		this.facets=facets

		var xmaxes=[]
		var xmins=[]

		var ymaxes=[]
		var ymins=[]

		var xtypes=[]
		var ytypes=[]

		var xstrings=[]
		var ystrings=[]

		for(var key in geom_dict){
			try{
				xtypes.push(data[geom_dict[key]['xvar']].dtype)
				ytypes.push(data[geom_dict[key]['yvar']].dtype)

				try{
					xtypes.push(data[geom_dict[key]['xvar2']].dtype)
					ytypes.push(data[geom_dict[key]['yvar2']].dtype)
				} catch(err){}
			} catch(err){}
			console.log(data,key,data[geom_dict[key]],data[geom_dict[key]['yvar']],geom_dict[key])

			if((geom_dict.bar && geom_dict.bar.orientation!='on') || (geom_dict.stackedbar && geom_dict.stackedbar.orientation!='on')){
				this.ybar=1
			}

			console.log(data[geom_dict[key]])

			if(key=='area' | key=='stackedbar'){
				// these two chart types are special cases because values have to be added across
				// groups to get the max of the graph. This depends on whether the orientation is
				// vertical ('on') or not ('undefined') for bars. For area always sum the y axis.
				var orient=geom_dict[key]['orientation']

				if(key=='stackedbar'){
					if(orient=='on'){
						if(data[geom_dict[key]['xvar']].dtype==='date'){
							if(isNaN(data[geom_dict[key]['xvar']][0].getTime())==false){
								xmaxes.push(new Date(moment(Math.max(...data[geom_dict[key]['xvar']]))))
								xmins.push(new Date(moment(Math.min(...data[geom_dict[key]['xvar']]))))
							}
						} else if(data[geom_dict[key]['xvar']].dtype=='text'){
							xstrings.push(...remove_missing(data,geom_dict,key))
							xmaxes.push('placeholder')
							xmins.push('placeholder')
						} else {
							xmaxes.push(Math.max(...remove_missing(data,geom_dict,key)))
							xmins.push(Math.min(...remove_missing(data,geom_dict,key)))
						}

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
					} else {
						if(data[geom_dict[key]['yvar']].dtype==='date'){
							if(isNaN(data[geom_dict[key]['yvar']][0].getTime())==false){
								ymaxes.push(new Date(moment(Math.max(...data[geom_dict[key]['yvar']]))))
								ymins.push(new Date(moment(Math.min(...data[geom_dict[key]['yvar']]))))
							}
						} else if(data[geom_dict[key]['yvar']].dtype=='text'){
							ystrings.push(...remove_missing(data,geom_dict,key,0))
							ymaxes.push('placeholder')
							ymins.push('placeholder')
						} else {
							ymaxes.push(Math.max(...remove_missing(data,geom_dict,key,0)))
							ymins.push(Math.min(...remove_missing(data,geom_dict,key,0)))
						}

						// this on the other hand should work, summing on each possible value of x
						var yvar=geom_dict[key]['yvar']
						var xvar=geom_dict[key]['xvar']
						var yvals=new Set(data[yvar])

						yvals.forEach(function(value){
							var positives=0
							var negatives=0
							var xvalues=[]
							// get all rows where x=value
							if(chartobject.flatdata[yvar].dtype=='date'){
								for(var i=0;i<datadict.length;i++){
									try{
										if(datadict[i][yvar].getTime()==value.getTime()){
											xvalues.push(datadict[i][xvar])
										}
									} catch(err){}
								}
							} else {
								for(var i=0;i<datadict.length;i++){
									if(datadict[i][yvar]==value){
										xvalues.push(datadict[i][xvar])
									}
								} 
							}

							// sum the yvalues of all such rows, separating positive from negative
							for(var i=0;i<xvalues.length;i++){
								if(xvalues[i]>0){
									positives=positives+xvalues[i]
								} else {
									negatives=negatives+xvalues[i]
								}
							}

							// this may seem odd but yes, it is supposed to push a bunch of 0s
							// to ymins if there are no negative values. This is a restriction
							// that ensures that bar graphs/area charts always include y=0.
							xmaxes.push(positives)
							xmins.push(negatives)
						})
					}
				} else {
					if(data[geom_dict[key]['xvar']].dtype==='date'){
						if(isNaN(data[geom_dict[key]['xvar']][0].getTime())==false){
							xmaxes.push(new Date(moment(Math.max(...data[geom_dict[key]['xvar']]))))
							xmins.push(new Date(moment(Math.min(...data[geom_dict[key]['xvar']]))))
						}
					} else if(data[geom_dict[key]['xvar']].dtype=='text'){
						xstrings.push(...remove_missing(data,geom_dict,key))
						xmaxes.push('placeholder')
						xmins.push('placeholder')
					} else {
						xmaxes.push(Math.max(...remove_missing(data,geom_dict,key)))
						xmins.push(Math.min(...remove_missing(data,geom_dict,key)))
					}

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
				}

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
								return a-b
							})

							if(data[geom_dict[key]['yvar']].dtype=='date'){
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
								return a-b
							})

							if(data[geom_dict[key]['yvar']].dtype=='date'){
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
					}
				}

				if (key=='bounds'){
					ymins.push(Math.min(...remove_missing(data,geom_dict,key,0)))
					ymaxes.push(Math.min(...remove_missing(data,geom_dict,key,0)))
				}

				console.log(data)

				if(geom_dict[key].xvar!==undefined){
					if(data[geom_dict[key]['xvar']].dtype==='date'){
						for (var i=0;i<data[geom_dict[key]['xvar']].length;i++){
							if(Object.prototype.toString.call(data[geom_dict[key]['xvar']][i])==='[object Date]'){
								if(isNaN(data[geom_dict[key]['xvar']][i].getTime())==false){
									xmaxes.push(new Date(moment(Math.max(...remove_missing(data,geom_dict,key)))))
									xmins.push(new Date(moment(Math.min(...remove_missing(data,geom_dict,key)))))

									try{
										xmaxes.push(new Date(moment(Math.max(...remove_missing(data,geom_dict,key)))))
										xmins.push(new Date(moment(Math.min(...remove_missing(data,geom_dict,key)))))
									} catch(err){}
								}
							}
						}
					} else if (data[geom_dict[key]['xvar']].dtype=='text'){
						for (var i=0;i<data[geom_dict[key]['xvar']].length;i++){
							if (data[geom_dict[key]['xvar']][i]!==''){
								xstrings.push(...remove_missing(data,geom_dict,key))

								try{
									xstrings.push(...remove_missing(data,geom_dict,key,2))
								} catch(err){}
							}
						}
						xmaxes.push('placeholder')
						xmins.push('placeholder')
					} else {
						xmaxes.push(Math.max(...remove_missing(data,geom_dict,key)))
						xmins.push(Math.min(...remove_missing(data,geom_dict,key)))

						try{
							xmaxes.push(Math.max(...remove_missing(data,geom_dict,key,2)))
							xmins.push(Math.min(...remove_missing(data,geom_dict,key,2)))
						} catch(err){}
					}
				}

				if(geom_dict[key].yvar!==undefined){
					if(data[geom_dict[key]['yvar']].dtype==='date'){
						for (var i=0;i<data[geom_dict[key]['xvar']].length;i++){
							if(Object.prototype.toString.call(data[geom_dict[key]['yvar']][i])==='[object Date]'){
								if(isNaN(data[geom_dict[key]['yvar']][i].getTime())==false){
									ymaxes.push(new Date(moment(Math.max(...remove_missing(data,geom_dict,key,0)))))
									ymins.push(new Date(moment(Math.min(...remove_missing(data,geom_dict,key,0)))))

									try{
										ymaxes.push(new Date(moment(Math.max(...remove_missing(data,geom_dict,key,3)))))
										ymins.push(new Date(moment(Math.min(...remove_missing(data,geom_dict,key,3)))))
									} catch(err){}
								}
							}
						}
					} else if(data[geom_dict[key]['yvar']].dtype=='text') {
						for (var i=0;i<data[geom_dict[key]['yvar']].length;i++){
							if (data[geom_dict[key]['yvar']][i]!==''){
								ystrings.push(...remove_missing(data,geom_dict,key,0))
								try{
									ystrings.push(...remove_missing(data,geom_dict,key,3))
								} catch(err){}
							}
						}					
						ymaxes.push('placeholder')
						ymins.push('placeholder')
					} else {
						ymaxes.push(Math.max(...remove_missing(data,geom_dict,key,0)))
						ymins.push(Math.min(...remove_missing(data,geom_dict,key,0)))

						try{
							ymaxes.push(Math.max(...remove_missing(data,geom_dict,key,3)))
							ymins.push(Math.min(...remove_missing(data,geom_dict,key,3)))
						} catch(err){}
					}
				} 
			}
		}

		// this is the klugiest thing but... my strategy for handling missing values was bad so I am kinda
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
		console.log(xtypes)
		if(new Set(xtypes).size>1){
			console.log('Exiting because of x types')
			alert('Exiting. X variables provided are of different types. Types detected are: '+(Array.from(new Set(xtypes))))
			return
		} else {
			this.xaxis_dtype=xtypes[0]
		}

		if(new Set(xtypes).size>1){
			console.log('Exiting because of y types')
			alert('Exiting. Y variables provided are of different types. Types detected are: '+(Array.from(new Set(ytypes))))
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
			this.xmax=Math.max(...remove_missing2(xmaxes))
			this.xmin=Math.min(...remove_missing2(xmins))
		}

		if(Object.prototype.toString.call(ymaxes[0])==='[object Date]'){
			this.ymax=new Date(moment(Math.max(...ymaxes)))
			this.ymin=new Date(moment(Math.min(...ymins)))
		} else {
			console.log(ymaxes)
			this.ymax=Math.max(...remove_missing2(ymaxes))
			this.ymin=Math.min(...remove_missing2(ymins))
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

	Playfair.prototype.chart=function() {
		snapobj=this.svg
		var graph_obj=this

		// if the map geom is all set, then the type is map and this will override all charts
		if(typeof(chartobject.map)!=='undefined'){
			chartobject.type='map'
		} else {
			chartobject.type='chart'
		}

		// get the appropriate axis for x variables
		// this first if is to check for a custom (user-defined) axis.
		if(chartobject.type=='chart'){
			if(typeof graph_obj.xarray=='undefined'){
				if(isNaN(graph_obj.xmax)==true){
					var xaxis=graph_obj.xstrings
					xaxis.dtype='text'
				} else if(typeof(graph_obj.xmax)=='number'){
					var xaxis=create_numerical_axis([graph_obj.xmin,graph_obj.xmax])
					xaxis.dtype='numeric'
				} else if(Object.prototype.toString.call(graph_obj.xmax)==='[object Date]'){
					var xaxis=create_date_axis([graph_obj.xmin,graph_obj.xmax],0)
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
					var yaxis=create_numerical_axis([graph_obj.ymin,graph_obj.ymax])
					yaxis.dtype='numeric'
				} else if(Object.prototype.toString.call(graph_obj.ymax)==='[object Date]'){
					var yaxis=create_date_axis([graph_obj.ymin,graph_obj.ymax],1)
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
		}

		// start drawing stuff
		// set background fill
		var graph_background=snapobj.rect(graph_obj.x,graph_obj.y+graph_obj.header.head_height,graph_obj.width,graph_obj.height-(graph_obj.header.head_height+graph_obj.footer_height)).attr({class:'background',fill:this.grapharea.chartfill})
		var graph_background=snapobj.rect(graph_obj.x+this.grapharea.chart_stroke_width/2,graph_obj.y+graph_obj.header.head_height+this.grapharea.chart_stroke_width/2,graph_obj.x+graph_obj.width-this.grapharea.chart_stroke_width,graph_obj.y+graph_obj.height-(graph_obj.header.head_height+graph_obj.footer_height)-this.grapharea.chart_stroke_width).attr({strokeWidth:this.grapharea.chart_stroke_width,stroke:this.grapharea.chart_stroke_color,fill:'none'})

		// save permanent data and assign to new location for use in small multiples
		var permflat=this.flatdata
		var permset=this.dataset
		this.permflat=permflat
		this.permset=permset

		// NO SMALL MULTIPLES
		if(Object.keys(graph_obj.facets).length==0){
			// get bounds of potential graphing region
			var bounds=get_bounds(this,1,1,1,1)

			// draw axes
			if(chartobject.type=='chart'){
				console.log('drawing axes with parameters: ',xaxis,yaxis,graph_obj.shiftx,graph_obj.shifty)
				var axes=draw_axes(xaxis,yaxis,graph_obj.shiftx,graph_obj.shifty,bounds,0,1,1)
			} else if(chartobject.type=='map'){
				// don't need to do anything here for now, because the chart background is already filled in,
				// but in case you do in the future for some reason
			}

			// draw geoms
			if(chartobject.type=='chart'){
				if(typeof(chartobject.shade)!=='undefined'){draw_shade(axes,graph_obj.shade,snapobj,0)}
				if(typeof(chartobject.rect)!=='undefined'){draw_rects(axes,graph_obj.rect,snapobj)}
				if(typeof(chartobject.bar)!=='undefined'){draw_bars(axes,graph_obj.bar,snapobj)}
				if(typeof(chartobject.area)!=='undefined'){draw_area(axes,graph_obj.area,snapobj)}
				if(typeof(chartobject.bounds)!=='undefined'){draw_bounds(axes,graph_obj.bounds,snapobj)}
				if(typeof(chartobject.stackedbar)!=='undefined'){draw_stackedbars(axes,graph_obj.stackedbar,snapobj)}
				if(typeof(chartobject.step)!=='undefined'){draw_steps(axes,graph_obj.step,snapobj)}
				if(typeof(chartobject.line)!=='undefined'){draw_lines(axes,graph_obj.line,snapobj)}
				if(typeof(chartobject.segment)!=='undefined'){draw_segments(axes,graph_obj.segment,snapobj)}
				if(typeof(chartobject.point)!=='undefined'){draw_points(axes,graph_obj.point,snapobj)}
				if(typeof(chartobject.text)!=='undefined'){draw_text(axes,graph_obj.text,snapobj)}
				if(typeof(chartobject.trend)!=='undefined'){draw_trends(axes,graph_obj.trend,snapobj)}
			} else if(chartobject.type=='map'){
				draw_map(graph_obj.map,snapobj,bounds)
			}

			// draw key
			legend=construct_legend()
			if(typeof(legend)!=='undefined'){draw_key(legend,graph_obj,snapobj,chartobject.legendoptions[2],0,bounds)}

		}

		// IF THERE ARE SMALL MULTIPLES
		// next draw axes and geoms. Cycle through the small multiple variable for this.
		if(graph_obj.facets.facet_variable!=undefined){
			// create set of facet var values
			var fvar=graph_obj.flatdata[graph_obj.facets.facet_variable]

			function onlyUnique(value, index, self) { 
    			return self.indexOf(value) === index;
			}

			var uniquefvar=fvar.filter(onlyUnique)
			var column=1
			var row=1
			var maxrows=Math.ceil(uniquefvar.length/graph_obj.facets.facet_columns)

			// check length of all facet titles because if any are 2+ lines adjusts graphing region for all small multiples
			var max_title_height=0
			for(var i=0;i<uniquefvar.length;i++){
				var bounds=get_bounds(this,column,row,graph_obj.facets.facet_columns,maxrows)

				var lines=multitext(uniquefvar[i],{ident:'fhead','font-size':graph_obj.small_multiples.header_textsize,'font-weight':graph_obj.small_multiples.header_textweight,'font-family':graph_obj.small_multiples.header_textface,dy:'0.75em','text-anchor':'middle'},bounds[1]-bounds[0])
				var temp=snapobj.text((bounds[0]+bounds[1])/2,bounds[2],lines).attr({ident:'fhead','font-size':graph_obj.small_multiples.header_textsize,'font-weight':graph_obj.small_multiples.header_textweight,'font-family':graph_obj.small_multiples.header_textface,dy:'0.75em','text-anchor':'middle',context:'text_context_menu',colorchange:'fill'})
				temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				temp.selectAll("tspan:not(:first-child)").attr({x:temp.attr('x'),dy:parseFloat(graph_obj.small_multiples.header_textsize)})
				var coords=temp.getBBox()
				if(coords.height>max_title_height){max_title_height=coords.height}
				temp.remove()
			}

			// if shared axis labels are on, get width of y-axis labels and height of x-axis labels to subtract from available
			// plotting space so that all plots are the same size. Basically just the code from draw_axes
			// y label
			var yvar=yaxis
			var xvar=xaxis
			var ytextwidth=0
			var xtextheight=0
			if(chartobject.shared_axis==1){
				for(var i=0;i<yvar.length;i++){
					if(Object.prototype.toString.call(yvar[i])==='[object Date]'){
						var string=formatDate(yvar[i],Math.max(...yvar)-Math.min(...yvar))
					} else {
						var string=String(yvar[i])
					}
					var temp=snapobj.text(0,0,string).attr({ident:'yaxis','font-size':chartobject.y_ticks.ytick_textsize,'font-weight':chartobject.y_ticks.ytick_textweight,'font-family':chartobject.y_ticks.ytick_textface,'text-anchor':'start'})
					temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					var coords=temp.getBBox()
					if(coords.width>ytextwidth){ytextwidth=coords.width}
					temp.remove()
				}

				for(var i=0;i<xvar.length;i++){
					maxwidth=chartobject.x_ticks.xtick_maxsize*chartobject.width
					if(Object.prototype.toString.call(xvar[i])==='[object Date]'){
						string=formatDate(xvar[i],Math.max(...xvar)-Math.min(...xvar))
					} else {
						string=String(xvar[i])
					}
					var lines=multitext(string,{ident:'xaxis','font-size':chartobject.x_ticks.xtick_textsize,'font-weight':chartobject.x_ticks.xtick_textweight,'font-family':chartobject.x_ticks.xtick_textface,dy:'0.3em','text-anchor':'middle'},maxwidth)
					var temp=snapobj.text(0,0,lines).attr({fill:chartobject.x_ticks.xtick_textfill,ident:'xaxis','font-size':chartobject.x_ticks.xtick_textsize,'font-weight':chartobject.x_ticks.xtick_textweight,'font-family':chartobject.x_ticks.xtick_textface,'text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
					temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					temp.selectAll("tspan:not(:first-child)").attr({x:temp.attr('x'),dy:parseFloat(chartobject.x_ticks.xtick_textsize)})
					var coords=temp.getBBox()
					if(coords.height*.8>xtextheight){xtextheight=coords.height*.8}
					temp.remove()
				}
			}

			// charting
			for(var i=0;i<uniquefvar.length;i++){
				// get bounds of potential graphing region
				var bounds=get_bounds(this,column,row,graph_obj.facets.facet_columns,maxrows)

				// check if shared_axis is on and decide based on row/column if this graph will have axis labels drawn
				// adjust bounds accordingly.
				if(chartobject.shared_axis==1){
					if(column==1){
						var drawy=1
						bounds[1]=bounds[1]+ytextwidth-(ytextwidth/graph_obj.facets.facet_columns)
					} else {
						var drawy=0
						bounds[0]=bounds[0]+(ytextwidth/graph_obj.facets.facet_columns)*(graph_obj.facets.facet_columns-(column-1))
						bounds[1]=bounds[1]+(ytextwidth/graph_obj.facets.facet_columns)*(graph_obj.facets.facet_columns-column)
					}
					if(row==maxrows){
						var drawx=1
						bounds[2]=bounds[2]-xtextheight*((maxrows-1)/maxrows)
					} else {
						var drawx=0
						bounds[2]=bounds[2]-(xtextheight/maxrows)*(row-1)
						bounds[3]=bounds[3]-(xtextheight/maxrows)*(row)
					}
				} else {
					var drawx=1
					var drawy=1
				}

				// draw the facet title and adjust the bounds appropriately
				console.log(uniquefvar[i])
				var lines=multitext(uniquefvar[i],{ident:'fhead','font-size':graph_obj.small_multiples.header_textsize,'font-weight':graph_obj.small_multiples.header_textweight,'font-family':graph_obj.small_multiples.header_textface,dy:'0.75em','text-anchor':'middle'},bounds[1]-bounds[0])
				var temp=snapobj.text((bounds[0]+bounds[1])/2,bounds[2],lines).attr({ident:'fhead','font-size':graph_obj.small_multiples.header_textsize,'font-weight':graph_obj.small_multiples.header_textweight,'font-family':graph_obj.small_multiples.header_textface,dy:'0.75em','text-anchor':'middle',context:'text_context_menu',colorchange:'fill'})
				temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				temp.selectAll("tspan:not(:first-child)").attr({x:temp.attr('x'),dy:parseFloat(graph_obj.small_multiples.header_textsize)})
				temp.attr({y:parseFloat(temp.attr('y'))+(max_title_height-temp.getBBox().height)})
				bounds[2]=bounds[2]+max_title_height+parseFloat(graph_obj.small_multiples.header_to_graph)

				// draw axes
				if(chartobject.type=='chart'){
					console.log('drawing axes with parameters: ',xaxis,yaxis,graph_obj.shiftx,graph_obj.shifty)
					var axes=draw_axes(xaxis,yaxis,graph_obj.shiftx,graph_obj.shifty,bounds,i,drawx,drawy)
				} else if(chartobject.type=='map'){
					// don't need to do anything here for now, because the chart background is already filled in,
					// but in case you do in the future for some reason
				}

				// prepare temp data for this particular facet
				tempset=[]
				for(var j=0;j<permset.length;j++){
					if(permset[j][graph_obj.facets.facet_variable]==uniquefvar[i]){
						tempset.push(permset[j])
					}
				}
				
				tempflat={}
				var varlist=Object.keys(tempset[0])
				for(var j=0;j<varlist.length;j++){
					tempflat[varlist[j]]=[]
				}
				for(var j=0;j<tempset.length;j++){
					for(var k=0;k<varlist.length;k++){
						tempflat[varlist[k]].push(tempset[j][varlist[k]])
					}
				}
				for(var variable in tempflat){
					tempflat[variable].dtype=typeof(tempflat[variable][0])
					if(typeof(tempflat[variable][0])=='string'){tempflat[variable].dtype='text'}
				}

				graph_obj.flatdata=tempflat
				graph_obj.dataset=tempset

				// draw geoms
				if(chartobject.type=='chart'){
					if(typeof(chartobject.shade)!=='undefined'){draw_shade(axes,graph_obj.shade,snapobj,i)}
					if(typeof(chartobject.rect)!=='undefined'){draw_rects(axes,graph_obj.rect,snapobj)}
					if(typeof(chartobject.bar)!=='undefined'){draw_bars(axes,graph_obj.bar,snapobj)}
					if(typeof(chartobject.area)!=='undefined'){draw_area(axes,graph_obj.area,snapobj)}
					if(typeof(chartobject.bounds)!=='undefined'){draw_bounds(axes,graph_obj.bounds,snapobj)}
					if(typeof(chartobject.stackedbar)!=='undefined'){draw_stackedbars(axes,graph_obj.stackedbar,snapobj)}
					if(typeof(chartobject.step)!=='undefined'){draw_steps(axes,graph_obj.step,snapobj)}
					if(typeof(chartobject.line)!=='undefined'){draw_lines(axes,graph_obj.line,snapobj)}
					if(typeof(chartobject.segment)!=='undefined'){draw_segments(axes,graph_obj.segment,snapobj)}
					if(typeof(chartobject.point)!=='undefined'){draw_points(axes,graph_obj.point,snapobj)}
					if(typeof(chartobject.text)!=='undefined'){draw_text(axes,graph_obj.text,snapobj)}
					if(typeof(chartobject.trend)!=='undefined'){draw_trends(axes,graph_obj.trend,snapobj)}
				} else if(chartobject.type=='map'){
					console.log(chartobject.dataset)
					console.log(graph_obj.dataset)
					draw_map(graph_obj.map,snapobj,bounds)
				}

				// prepare legend object
				if(chartobject.independent_key==1){
					// draw key
					legend=construct_legend()
					if(typeof(legend)!=='undefined'){draw_key(legend,graph_obj,snapobj,chartobject.legendoptions[2],i,bounds)}
				}

				// return data to permanent
				this.flatdata=permflat
				this.dataset=permset

				// increment row and column
				if(column==graph_obj.facets.facet_columns){
					column=1
					row=row+1
				} else {column=column+1}
			}

			// prepare legend object
			if(chartobject.independent_key==0){
				// draw key
				legend=construct_legend()
				var bounds=get_bounds(this,1,1,1,1)
				if(typeof(legend)!=='undefined'){draw_key(legend,graph_obj,snapobj,chartobject.legendoptions[2],0,bounds)}
			}

			// move all keys to front
			for(var i=0;i<5;i++){
				try{
					snapobj.append(grapharea.select('[id="legendgroup'+i+'"]'))
					key_elements=grapharea.selectAll('[ident="key'+i+'"]')
					for(var j=0;j<key_elements.length;j++){
						snapobj.append(key_elements[j])
					}
				} catch(err){}
			}
		}

		// graph stroke
		snapobj.rect(chartobject.x+chartobject.grapharea.graph_stroke_width/2,chartobject.y+chartobject.grapharea.graph_stroke_width/2,chartobject.width-chartobject.grapharea.graph_stroke_width,chartobject.height-chartobject.grapharea.graph_stroke_width).attr({strokeWidth:chartobject.grapharea.graph_stroke_width,stroke:chartobject.grapharea.graph_stroke_color,fill:'none'})
	}

	Playfair.prototype.prepfooter = function(source,note,callback) {
		// draw the footer and return the height of the footer
		chartobject.source=source
		chartobject.note=note
		// this.logo.logo=this.logo.logo
		logoscale=chartobject.logo.logoscale
		var logoopacity=chartobject.logo.logoopacity
		var logoposition=chartobject.logo.logo_position

		var snapobj=chartobject.svg
		var width=chartobject.width
		var height=chartobject.height
		var graphobj=chartobject

		var notefill=chartobject.note_text.notetextfill
		var sourcefill=chartobject.source_text.sourcetextfill

		// catch safari so you can... do something about this logo loading thing
		var is_safari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)

		var nts=0
		if(graphobj.source.length>0 && graphobj.note.length>0){
			nts=1
		}

		if (graphobj.logo.logo!=0){
			var logo=snapobj.image(graphobj.logo.logo,0,0)
			var html_logo=document.getElementById('logodummy')
			var image=new Image()
			image.addEventListener('load',finishload,false)
			image.src=graphobj.logo.logo
			html_logo.src=image.src
			// logo.node.addEventListener('load',finishload)
			// if(is_safari==true){myfunc()}

			function finishload(){
				var html_logo=document.getElementById('logodummy')
				var logoheight=html_logo.height
				var logowidth=html_logo.width
				logo.attr({logo:1,width:logowidth/logoscale,height:logoheight/logoscale,opacity:logoopacity})
				var logo_coords=logo.getBBox()
				var logo_height=logo.getBBox().height

				// position logo
				if(logoposition=='right'){
					logo.attr({x:graphobj.x+graphobj.width-logo_coords.width-graphobj.footer.footer_rightpad,y:graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad})
				}
				if(logoposition=='left'){
					logo.attr({x:graphobj.x+graphobj.footer.footer_leftpad,y:graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad})
				}
				if(logoposition=='center'){
					logo.attr({x:graphobj.x-logo_coords.width/2+graphobj.width/2,y:graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad})
				}

				// draw footer and source.
				var source_height=0
				if(graphobj.source.length>0){
					var source='Source: '+graphobj.source
					var lines=multitext(source,{'font-family':graphobj.source_text.sourceface,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',fill:graphobj.source_text.sourcetextfill},graphobj.width-graphobj.footer.footer_leftpad-graphobj.footer.footer_rightpad-logo_coords.width-20)
					if(logoposition=='right'){
						var source=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad,lines).attr({fill:graphobj.source_text.sourcetextfill,ident:'foot','font-family':graphobj.source_text.sourceface,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
					} else if(logoposition=='left') {
						var source=snapobj.text(graphobj.x+graphobj.width-graphobj.footer.footer_rightpad,graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad,lines).attr({fill:graphobj.source_text.sourcetextfill,ident:'foot','font-family':graphobj.source_text.sourceface,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu',textAnchor:'end'})
					} else if(logoposition=='center'){
						var lines=multitext(source,{'font-family':graphobj.source_text.sourceface,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',fill:graphobj.source_text.sourcetextfill},graphobj.width-graphobj.footer.footer_leftpad-graphobj.footer.footer_rightpad-20)
						var source=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,graphobj.y+graphobj.height-graphobj.footer.footer_bottompad-graphobj.logo.logo_toppad,lines).attr({fill:graphobj.source_text.sourcetextfill,ident:'foot','font-family':graphobj.source_text.sourceface,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
					}
					source.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					source.selectAll("tspan:not(:first-child)").attr({x:source.attr('x'),dy:parseInt(graphobj.source_text.sourcesize)})
					var source_coords=source.getBBox().y2
					var source_height=source.getBBox().height*.85
				} else {source_coords=graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad}

				var note_height=0
				if(graphobj.note.length>0){
					var note='Note: '+graphobj.note
					var lines=multitext(note,{fill:graphobj.note_text.notetextfill,'font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em'},graphobj.width-graphobj.footer.footer_leftpad-graphobj.footer.footer_rightpad-logo_coords.width-20)
					if(graphobj.source.length>0){
						if(logoposition=='right'){
							var note=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,source_coords+nts*graphobj.footer.note_to_source,lines).attr({fill:sourcefill,ident:'foot','font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
						} else if(logoposition=='left') {
							var note=snapobj.text(graphobj.x+graphobj.width-graphobj.footer.footer_rightpad,source_coords+nts*graphobj.footer.note_to_source,lines).attr({fill:sourcefill,ident:'foot','font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu',textAnchor:'end'})
						} else if(logoposition=='center') {
							var lines=multitext(note,{fill:graphobj.note_text.notetextfill,'font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em'},graphobj.width-graphobj.footer.footer_leftpad-graphobj.footer.footer_rightpad-20)
							var note=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,source_coords+nts*graphobj.footer.note_to_source,lines).attr({fill:sourcefill,ident:'foot','font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
						}
					} else {
						if(logoposition=='right'){
							var note=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,source_coords,lines).attr({fill:sourcefill,ident:'foot','font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
						} else if(logoposition=='left') {
							var note=snapobj.text(graphobj.x+graphobj.width-graphobj.footer.footer_rightpad,source_coords,lines).attr({fill:sourcefill,ident:'foot','font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu',textAnchor:'end'})
						} else if(logoposition=='center') {
							var lines=multitext(note,{fill:graphobj.note_text.notetextfill,'font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em'},graphobj.width-graphobj.footer.footer_leftpad-graphobj.footer.footer_rightpad-20)
							var note=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,graphobj.y+graphobj.height-graphobj.footer.footer_bottompad-graphobj.logo.logo_toppad,lines).attr({fill:notefill,ident:'foot','font-family':graphobj.source_text.sourceface,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
						}
					}
					note.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					note.selectAll("tspan:not(:first-child)").attr({x:note.attr('x'),dy:parseInt(graphobj.note_text.notesize)})
					var note_coords=note.getBBox().y2
					var note_height=note.getBBox().height*.85
				} else {note_coords=source_coords}

				graphobj.logo.logo_height=logo_coords.height
				graphobj.logo.logo_width=logo_coords.width
				graphobj.footer_height=logo_coords.height+graphobj.footer.footer_toppad+graphobj.footer.footer_bottompad

				if(logoposition=='center'){
					graphobj.footer_height=source_height+logo_height+note_height+graphobj.footer.footer_toppad+graphobj.footer.footer_bottompad+graphobj.logo.logo_toppad+nts*graphobj.footer.note_to_source

					// bump everything up to the top + toppad
					var foot_fill=snapobj.rect(0,graphobj.y+graphobj.height-graphobj.footer_height,graphobj.y+graphobj.width,graphobj.footer_height).attr({id:'footerrect',fill:graphobj.footer.footerfill})
					console.log(graphobj.y+graphobj.height-graphobj.footer.footer_bottompad-logo_height,graphobj.y,graphobj.height,graphobj.footer.footer_bottompad,logo_height)
					logo.attr({y:graphobj.y+graphobj.height-graphobj.footer.footer_bottompad-logo_height})
					try{source.attr({y:graphobj.y+graphobj.height-graphobj.footer.footer_bottompad-logo_height-note_height-source_height-nts*graphobj.footer.note_to_source-graphobj.logo.logo_toppad})}catch(err){}
					try{note.attr({y:graphobj.y+graphobj.height-graphobj.footer.footer_bottompad-logo_height-note_height-graphobj.logo.logo_toppad})}catch(err){}
				
					// move to front
					var foot_text=snapobj.selectAll("text[ident='foot']")
					for (var i=0;i<foot_text.length;i++){
						snapobj.append(foot_text[i])
					}
					snapobj.append(logo)
				}

				if(logoposition=='right' || logoposition=='left'){
					var foot_fill=snapobj.rect(0,graphobj.height-graphobj.footer_height,graphobj.width,graphobj.footer_height).attr({id:'footerrect',fill:graphobj.footer.footerfill})
					var foot_text=snapobj.selectAll("text[ident='foot']")
					for (var i=0;i<foot_text.length;i++){
						snapobj.append(foot_text[i])
					}
					snapobj.append(logo)

					// If the note+source is taller than the logo height, make the footer bigger and shove all three elements up
					if(note_coords+chartobject.footer.footer_bottompad-(graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad-graphobj.footer.footer_toppad)>graphobj.footer_height){
						var difference=note_coords+chartobject.footer.footer_bottompad-(graphobj.y+graphobj.height)
						graphobj.footer_height=graphobj.footer_height+difference
						console.log(graphobj.footer_height)
						snapobj.selectAll('rect[id="footerrect"]').attr({height:graphobj.footer_height})
						snapobj.selectAll('rect[id="footerrect"]').attr({y:graphobj.height-graphobj.footer_height})
						logo.attr({y:parseFloat(logo.attr('y'))-difference/2})
						try{source.attr({y:parseFloat(source.attr('y')-difference)})}catch(err){}
						try{note.attr({y:parseFloat(note.attr('y')-difference)})}catch(err){}
					}

					// if the logo is taller than the note+source, vertically center them around the logo's centerline - should there be a vertical-center flag for this in theme?
					if(note_coords+chartobject.footer.footer_bottompad-(graphobj.y+graphobj.height-logo_coords.height-graphobj.footer.footer_bottompad-graphobj.footer.footer_toppad)<graphobj.footer_height){
						var difference=note_coords+chartobject.footer.footer_bottompad-(graphobj.y+graphobj.height)
						console.log('centering note/source',difference)
						try{source.attr({y:parseFloat(source.attr('y')-difference/2)})}catch(err){}
						try{note.attr({y:parseFloat(note.attr('y')-difference/2)})}catch(err){}
					}
				}

				// draw stroke
				snapobj.line(chartobject.x,chartobject.y+chartobject.height-graphobj.footer_height+chartobject.footer.footer_stroke_width/2,chartobject.x+chartobject.width,chartobject.y+chartobject.height-graphobj.footer_height+chartobject.footer.footer_stroke_width/2).attr({strokeWidth:graphobj.footer.footer_stroke_width,stroke:graphobj.footer.footer_stroke_color})

				callback()
			}
		} else {
			if(graphobj.source.length>0){
				source='Source: '+graphobj.source
				lines=multitext(source,{'font-family':graphobj.source_text.sourceface,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',fill:graphobj.source_text.sourcetextfill},graphobj.width-graphobj.footer.footer_leftpad-graphobj.footer.footer_rightpad)
				var source=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,graphobj.y+graphobj.height+graphobj.footer.footer_toppad,lines).attr({ident:'foot','font-family':graphobj.source_text.sourceface,'fill':graphobj.source_text.sourcetextfill,'font-size':graphobj.source_text.sourcesize,'font-weight':graphobj.source_text.sourceweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
				source.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				source.selectAll("tspan:not(:first-child)").attr({x:source.attr('x'),dy:parseInt(graphobj.source_text.sourcesize)})
				source_coords=source.getBBox().y2
			} else {source_coords=graphobj.y+graphobj.height+graphobj.footer.footer_toppad}

			if(graphobj.note.length>0){
				note='Note: '+graphobj.note
				lines=multitext(note,{fill:graphobj.note_text.notetextfill,'font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em'},graphobj.width-graphobj.footer.footer_leftpad-graphobj.footer.footer_rightpad)
				var note=snapobj.text(graphobj.x+graphobj.footer.footer_leftpad,source_coords+nts*graphobj.footer.note_to_source,lines).attr({fill:notefill,ident:'foot','font-family':graphobj.note_text.noteface,'font-size':graphobj.note_text.notesize,'font-weight':graphobj.note_text.noteweight,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
				note.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
				note.selectAll("tspan:not(:first-child)").attr({x:note.attr('x'),dy:parseInt(graphobj.note_text.notesize)})
				note_coords=note.getBBox().y2
			} else {note_coords=source_coords}

			graphobj.logo.logo_height=0
			graphobj.logo.logo_width=0
			graphobj.footer_height=0

			if(graphobj.note.length>0 || graphobj.source.length>0){
				graphobj.footer_height=note_coords+graphobj.footer.footer_bottompad-(graphobj.y+graphobj.height)
				try{source.attr({y:graphobj.y+graphobj.height-graphobj.footer_height+graphobj.footer.footer_toppad})}catch(err){}
				try{var source_height=source.getBBox().height*.85}catch(err){source_height=0}
				try{note.attr({y:graphobj.y+graphobj.height-graphobj.footer_height+graphobj.footer.footer_toppad+nts*graphobj.footer.note_to_source+source_height})}catch(err){}
			}

			var foot_fill=snapobj.rect(0,graphobj.height-graphobj.footer_height,graphobj.width,graphobj.footer_height).attr({id:'footerrect',fill:graphobj.footer.footerfill})
			snapobj.append(note)
			snapobj.append(source)

			// draw stroke
			snapobj.line(chartobject.x,chartobject.y+chartobject.height-graphobj.footer_height+chartobject.footer.footer_stroke_width/2,chartobject.x+chartobject.width,chartobject.y+chartobject.height-graphobj.footer_height+chartobject.footer.footer_stroke_width/2).attr({strokeWidth:graphobj.footer.footer_stroke_width,stroke:graphobj.footer.footer_stroke_color})


			callback()
		}
	}

	Playfair.prototype.prepheader = function(hed,dek) {
		var snapobj=this.svg

		chartobject.hed=hed
		chartobject.dek=dek

		var headerwidth=chartobject.width-chartobject.header.header_leftpad-chartobject.header.header_rightpad

		// draw main title
		var hedfontsize=parseInt(chartobject.title_text.hedsize)
		while(multitext(hed,{'font-family':chartobject.title_text.hedface,'font-size':hedfontsize+'px','font-weight':chartobject.title_text.hedweight,dy:'0.3em',fill:chartobject.title_text.hedtextfill},headerwidth).length>1){
			var hedfontsize=hedfontsize-1
		}

		if (hedfontsize<parseInt(chartobject.title_text.hedsizemin)){
			var hedfontsize=chartobject.title_text.hedsizemin
			alert('Your headline is too long.')
		}

		var hed=snapobj.text(chartobject.x+chartobject.header.header_leftpad,chartobject.y+chartobject.header.header_toppad,hed).attr({'font-family':chartobject.title_text.hedface,'font-size':hedfontsize,'font-weight':chartobject.title_text.hedweight,dy:'0.75em',fill:chartobject.title_text.hedtextfill,colorchange:'fill',context:'text_context_menu'})
		hed.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		var hed_coords=hed.getBBox()

		// draw subtitle
		var dekfontsize=parseInt(chartobject.title_text.deksize)
		while(multitext(dek,{'font-family':chartobject.title_text.dekface,'font-size':dekfontsize,'font-weight':chartobject.title_text.dekweight,dy:'0.3em',fill:chartobject.title_text.dektextfill},headerwidth).length>chartobject.title_text.maxdeklines){
			dekfontsize=dekfontsize-1
		}

		if (dekfontsize<parseInt(chartobject.title_text.deksizemin)){
			dekfontsize=chartobject.title_text.deksizemin
			alert('Your subhead is too long.')
		}

		if(hed_coords.y2==0){var dek_start=chartobject.header.header_toppad}
		else{var dek_start=hed_coords.y2+chartobject.header.hed_to_dek}
		var lines=multitext(dek,{'font-family':chartobject.title_text.dekface,'font-size':dekfontsize,'font-weight':chartobject.title_text.dekweight,dy:'0.3em',fill:chartobject.title_text.dektextfill},headerwidth)
		var dek=snapobj.text(chartobject.x+chartobject.header.header_leftpad,dek_start,lines).attr({'font-family':chartobject.title_text.dekface,'font-size':dekfontsize,'font-weight':chartobject.title_text.dekweight,dy:'0.75em',ident:'dek',fill:chartobject.title_text.dektextfill,colorchange:'fill',context:'text_context_menu'})
		dek.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		dek.selectAll("tspan:not(:first-child)").attr({x:dek.attr('x'),dy:parseFloat(dekfontsize)})
		
		var lower_hed=hed.getBBox().y2
		var lower_dek=dek.getBBox().y2

		// set head_height to the y2 coord for dek or hed, whichever is lower.
		if(lower_hed>lower_dek){chartobject.header.head_height=lower_hed+chartobject.header.header_bottompad}
		else{chartobject.header.head_height=lower_dek+chartobject.header.header_bottompad}

		// and if there is no hed and no dek, set head_height to 0
		if(chartobject.hed=='' && chartobject.dek==''){chartobject.header.head_height=0}

		// draw in background and move it to the back
		var head_fill=snapobj.rect(0,0,chartobject.width,chartobject.header.head_height).attr({fill:chartobject.header.headerfill})
		snapobj.append(hed)
		deks=snapobj.selectAll("text[ident='dek']")
		for(var i=0;i<deks.length;i++){
			snapobj.append(deks[i])
		}

		// header stroke
		snapobj.line(chartobject.x,chartobject.y+chartobject.header.head_height-chartobject.header.header_stroke_width/2,chartobject.x+chartobject.width,chartobject.y+chartobject.header.head_height-chartobject.header.header_stroke_width/2).attr({stroke:chartobject.header.header_stroke_color,strokeWidth:chartobject.header.header_stroke_width})
	}

	Playfair.prototype.style = function(parameters) {
		// Parameters should be an object with the parameters you want to change like:
		// obj.style({'top_margin':20,'deksize':'10px'}) etc.
		// generally playfair.html will pass an entire theme to this function and so everything will have a default,
		// but just in case that doesn't happen, this standard default is written in too.

		var full_params=default_style(parameters)

		for (var property in full_params){
			this[property]=full_params[property]
		}
	}

	return playfair;
}());

//////////////////////// LEGEND INTERFACE //////////////////////////////
// when a variable_select is changed, run preview() and check to see if
// any geom types have been completed. If they have, create a preview of
// what the key will look like by creating each grouping.

// create the list of key objects to draw. Sample:
// 0:{geom: "line", grouping: "color", group_value: "group a", group_variable: "z", xvar: "x", …}
// 1:{geom: "line", grouping: "color", group_value: "group b", group_variable: "z", xvar: "x", …}
// 2:{geom: "line", grouping: "type", group_value: "group a", group_variable: "z", xvar: "x", …}
// 3:{geom: "line", grouping: "type", group_value: "group b", group_variable: "z", xvar: "x", …}
function construct_legend(){
	var geom=preview()[0]
	// console.log(geom)
	var legend=[chartobject.legendoptions]

	// geom: {point:{xvar:x,yvar:y,grouping:{color:g1,type:g2}},line:{xvar:x,yvar:y,grouping:{color:g1,type:g2}}}
	var group=0
	var overall=0
	var groupingvars_so_far=[]
	var groupvarvalues_so_far=[]
	for(var key in geom){
		var temp=geom[key]
		// {point:{xvar:x,yvar:y,grouping:{color:g1,type:g2}},line:{xvar:x,yvar:y,grouping:{color:g1,type:g2}}}
		var xvar=temp['xvar']
		var yvar=temp['yvar']
		for(var grouper in temp.grouping){
			if(temp.grouping[grouper]!=='none'){
				// [color,type]
				// the grouping var:
				var current_groupvar=temp.grouping[grouper]

				// get all possible values for this grouping variable
				var groupvalues=[]
				for(var i=0;i<chartobject.dataset.length;i++){
					if(chartobject.dataset[i][temp.grouping[grouper]]!==''){
						groupvalues.push(chartobject.dataset[i][temp.grouping[grouper]])
					}
				}
				groupvalues=[... new Set(groupvalues)]

				// if the groupingvariable already exists for some reason - for example if both points and lines are being
				// drawn on the same groupingvariable. These should be combined in the key so use the overall location
				// of the previous occurrence.
				for(var i=0;i<groupvalues.length;i++){
					if(groupingvars_so_far.indexOf(current_groupvar)!=-1 && current_groupvar!='none'){
						var tempgroupnumeric=i
						groupingvars_so_far.push(current_groupvar)
						groupvarvalues_so_far.push(groupvalues[i])
						var key_entry={}
						key_entry['geom']=key
						key_entry['grouping']=grouper
						key_entry['group_value']=String(groupvalues[i])
						key_entry['group_variable']=temp.grouping[grouper]
						key_entry['xvar']=xvar
						key_entry['yvar']=yvar
						key_entry['groupnumeric']=tempgroupnumeric
						legend.push(key_entry)
					} else {
						// if it doesn't exist, proceed as normal using the group/overall/groupnumeric vars
						groupvarvalues_so_far.push(current_groupvar+groupvalues[i])
						var key_entry={}
						key_entry['geom']=key
						key_entry['grouping']=grouper
						key_entry['group_value']=String(groupvalues[i])
						key_entry['group_variable']=temp.grouping[grouper]
						key_entry['xvar']=xvar
						key_entry['yvar']=yvar
						key_entry['groupnumeric']=i
						legend.push(key_entry)
						overall=overall+1
					}
				}
				groupingvars_so_far.push(current_groupvar)
				group=group+1
			} 
		}
		if(typeof(temp.grouping)=='undefined' && Object.keys(geom).length>1){
			var key_entry={}
			key_entry['geom']=key
			key_entry['grouping']='none'
			try{key_entry['group_value']=temp.legend_head} catch(err){key_entry['group_value']='na'}
			key_entry['group_variable']='groupvar'
			key_entry['xvar']=xvar
			key_entry['yvar']=yvar
			key_entry['groupnumeric']=tempgroupnumeric
			legend.push(key_entry)
			overall=overall+1
			group=group+1			
		}
	}

	function sortbyvalue(a,b){
		if(a.group_value<b.group_value){
			return -1
		}
		if(a.group_value>b.group_value){
			return 1
		}
		return 0
	}

	function sortbygrouper(a,b){
		if(a.group_variable<b.group_variable){
			return -1
		}
		if(a.group_variable>b.group_variable){
			return 1
		}
		return 0
	}

	var rows=legend.splice(1,)
	rows=rows.sort(sortbyvalue)
	rows=rows.sort(sortbygrouper)
	var legend=[chartobject.legendoptions]
	for(var i=0;i<rows.length;i++){
		legend.push(rows[i])
	}
	return legend
}


function draw_key(legend,playobj,snapobj,vertical,graphnum,bounds){
	vertical=(typeof vertical!=='undefined') ? vertical:1;

	//listener for drag events on a floating key
	// needs to listen only for its own group
	var moveFuncfloat=function(dx,dy,posx,posy){
		key_elements=grapharea.selectAll('[ident="key'+graphnum+'"]')
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
					x:key_elements[i].attr('x')-prevx+dx,
					y:key_elements[i].attr('y')-prevy+dy
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
			grapharea.select('[id="legendgroup'+graphnum+'"]').attr({
					x:coords.x-prevx+dx,
					y:coords.y-prevy+dy
			})
			grapharea.append(key_elements[i])
			grapharea.select('[id="legendgroup'+graphnum+'"]').append(key_elements[i])
		}
		prevx=dx
		prevy=dy
	}

	// create a group for all key elements
	var g=snapobj.group()
	g.attr({id:'legendgroup'+graphnum})

	// use legend object to draw a key for the figure
	if(legend.length>1){
		var maxwidth=parseFloat(legend[0][1])
		var maxtextwidth=maxwidth-playobj.legends.legend_leftpad-playobj.legends.legend_rightpad-playobj.legends.legend_elementsize-playobj.legends.legend_element_to_text
		if(legend[0][1]===''){
			maxwidth=bounds[1]-bounds[0]
			maxtextwidth=bounds[1]-bounds[0]-playobj.legends.legend_leftpad-playobj.legends.legend_rightpad-playobj.legends.legend_elementsize-playobj.legendslegend_element_to_text
		}
		var longest=0
		var ltitle=legend[0][0]
		var floatkey=snapobj.rect(bounds[0],bounds[2],0,0).attr({ident3:'keybounder',ident2:'floatkey',ident:'key'+graphnum,fill:playobj.legends.legend_floatbackground,stroke:playobj.legends.legend_floatstroke,'stroke-width':playobj.legends.legend_floatthickness,'shape-rendering':'crispEdges',colorchange:'fill'})
		g.append(floatkey)

		var maxitemwidth=0
		var starty=bounds[2]+playobj.legends.legend_toppad
		var notext=0

		if(ltitle!==''){
			var lines=multitext(ltitle,{'font-size':playobj.legends.legend_titletextsize,'font-weight':playobj.legends.legend_titletextweight,'font-family':playobj.legends.legend_titletextface},maxwidth-playobj.legends.legend_leftpad-playobj.legends.legend_rightpad)
			var title=snapobj.text(bounds[0]+playobj.legends.legend_leftpad,bounds[2]+playobj.legends.legend_toppad,lines).attr({unique:'keytitle',ident2:'floatkey',ident:'key'+graphnum,fill:playobj.legends.legend_titletextfill,'font-size':playobj.legends.legend_titletextsize,'font-weight':playobj.legends.legend_titletextweight,'font-family':playobj.legends.legend_titletextface,dy:'0.75em',colorchange:'fill',context:'text_context_menu'})
			title.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			title.selectAll("tspan:not(:first-child)").attr({x:title.attr('x'),dy:1*parseFloat(title.attr('font-size'))})
			if(maxitemwidth<title.getBBox().x2){maxitemwidth=title.getBBox().x2}
			starty=title.getBBox().y2+playobj.legends.legend_element_to_next
			longest=title.getBBox().x2-bounds[0]
			g.append(title)
		}

		// store each item in a dict so it can be modified as necessary
		// sample legend entry:
		// {geom:point,group_value:1,group_variable:g1,grouping:color,xvar:x,yvar:y,group_numeric:2}
		var keyitem_dict={}

		// draw items
		// starting at 1 skips the row that is maxwidth and title
		var y=starty
		var x=bounds[0]+playobj.legends.legend_leftpad
		var yoffset=0

		for(var i=1;i<legend.length;i++){
			var oldy=y
			var oldx=x
			var xtext=x+playobj.legends.legend_elementsize+playobj.legends.legend_element_to_text
			var numeric=legend[i].groupnumeric
			var keyitem_name=legend[i].geom+legend[i].grouping+legend[i].group_value

			// element for key deletion
			if(vertical==1){
				var delrect=snapobj.rect(bounds[0],y,1,1).attr({fill:'red',fillOpacity:0,ident:'key'+graphnum,ident2:'floatkey',keyrow:i,delrect:1,pointerEvents:'none',delrecttype:'vertical'})
			} else {
				var delrect=snapobj.rect(x,bounds[2]+yoffset+chartobject.legends.legend_bottompad,1,1).attr({fill:'red',fillOpacity:0,ident:'key'+graphnum,ident2:'floatkey',keyrow:i,delrect:1,pointerEvents:'none',delrecttype:'horizontal'})
			}
			g.append(delrect)

			// text
			if(keyitem_dict[keyitem_name]==undefined){
				if(notext==0){
					var lines=multitext(legend[i].group_value,{'font-size':playobj.legends.legend_textsize,'font-weight':playobj.legends.legend_textweight,'font-family':playobj.legends.legend_textface},maxtextwidth)
					var linetext=snapobj.text(xtext,y+playobj.legends.legend_elementsize,lines).attr({ident2:'floatkey',ident:'key'+graphnum,fill:playobj.legends.legend_textfill,'font-size':playobj.legends.legend_textsize,'font-weight':playobj.legends.legend_textweight,'font-family':playobj.legends.legend_textface,dy:'-0.25em','text-anchor':'start',colorchange:'fill',context:'text_context_menu',keyrow:i})
					linetext.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
					linetext.selectAll("tspan:not(:first-child)").attr({x:linetext.attr('x'),dy:parseFloat(linetext.attr('font-size'))})
					g.append(linetext)
				} else {
					notext=0
				}
			}

			// lines
			if((legend[i].geom=='line') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					var temp=snapobj.line(x,y+playobj.legends.legend_elementsize/2,x+playobj.legends.legend_elementsize,y+playobj.legends.legend_elementsize/2).attr({stroke:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				} else if(legend[i].grouping=='type'){
					var temp=snapobj.line(x,y+playobj.legends.legend_elementsize/2,x+playobj.legends.legend_elementsize,y+playobj.legends.legend_elementsize/2).attr({stroke:chartobject.color_scales.qualitative_color[0],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_geom.line_types[numeric],keyrow:i})
					g.append(temp)				
				} else {
					var temp=snapobj.line(x,y+playobj.legends.legend_elementsize/2,x+playobj.legends.legend_elementsize,y+playobj.legends.legend_elementsize/2).attr({stroke:chartobject.color_scales.qualitative_color[0],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				}
			} else if(legend[i].geom=='line' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					// keyitem_dict[keyitem_name].attr({'stroke':chartobject.color_scales.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_geom.line_types[numeric % chartobject.color_scales.qualitative_color.length]})
				}
			}

			// points
			if(legend[i].geom=='point' && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					var backer=snapobj.circle(x+playobj.legends.legend_elementsize/2,y+playobj.legends.legend_elementsize/2,playobj.point_geom.point_size).attr({fill:chartobject.legends.legend_floatbackground,ident:'key'+graphnum,ident2:'floatkey',keyrow:i})
					var temp=snapobj.circle(x+playobj.legends.legend_elementsize/2,y+playobj.legends.legend_elementsize/2,playobj.point_geom.point_size).attr({fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],stroke:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'stroke-width':playobj.point_geom.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_geom.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'+graphnum,keyrow:i})
					g.append(backer)
					g.append(temp)
				} else if(legend[i].grouping=='type'){
					var backer=snapobj.circle(x+playobj.legends.legend_elementsize/2,y+playobj.legends.legend_elementsize/2,playobj.point_geom.point_size).attr({fill:chartobject.legends.legend_floatbackground,ident:'key'+graphnum,ident2:'floatkey',keyrow:i})
					var temp=snapobj.circle(x+playobj.legends.legend_elementsize/2,y+playobj.legends.legend_elementsize/2,playobj.point_geom.point_size).attr({fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],stroke:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'stroke-width':playobj.point_geom.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_geom.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'+graphnum,keyrow:i})
					g.append(backer)
					g.append(temp)
				} else {
					var backer=snapobj.circle(x+playobj.legends.legend_elementsize/2,y+playobj.legends.legend_elementsize/2,playobj.point_geom.point_size).attr({fill:chartobject.legends.legend_floatbackground,ident:'key'+graphnum,ident2:'floatkey',keyrow:i})
					var temp=snapobj.circle(x+playobj.legends.legend_elementsize/2,y+playobj.legends.legend_elementsize/2,playobj.point_geom.point_size).attr({fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],stroke:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'stroke-width':playobj.point_geom.point_strokewidth,'data_type':'point','group':legend[i].group_value,'class':'dataelement','fill-opacity':chartobject.point_geom.point_fillopacity,colorchange:'both',context:'point_context_menu',ident2:'floatkey',ident:'key'+graphnum,keyrow:i})
					g.append(temp)
					g.append(backer)
				}
			} else if(legend[i].geom=='point' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'stroke':chartobject.color_scales.qualitative_color[numeric]})
				}
				if(legend[i].grouping=='type'){
					// keyitem_dict[keyitem_name].attr({'stroke-width':chartobject.color_scales.qualitative_color[legend[i].position],})
				}
			}

			// segments
			if((legend[i].geom=='segment') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					var temp=snapobj.line(x,y+playobj.legends.legend_elementsize/2,x+playobj.legends.legend_elementsize,y+playobj.legends.legend_elementsize/2).attr({stroke:chartobject.color_scales.grayscale_color[numeric % chartobject.color_scales.grayscale_color.length],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				} else if(legend[i].grouping=='type'){
					var temp=snapobj.line(x,y+playobj.legends.legend_elementsize/2,x+playobj.legends.legend_elementsize,y+playobj.legends.legend_elementsize/2).attr({stroke:chartobject.color_scales.grayscale_color[0],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_geom.line_types[numeric % chartobject.line_geom.line_types.length],keyrow:i})
					g.append(temp)				
				} else {
					var temp=snapobj.line(x,y+playobj.legends.legend_elementsize/2,x+playobj.legends.legend_elementsize,y+playobj.legends.legend_elementsize/2).attr({stroke:chartobject.color_scales.grayscale_color[0],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				}
			} else if(legend[i].geom=='segment' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					// keyitem_dict[keyitem_name].attr({'stroke':chartobject.color_scales.qualitative_color[numeric]})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_geom.line_types[numeric % chartobject.line_geom.line_types.length]})
				}
			}

			// steps
			if((legend[i].geom=='step') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					var temp=snapobj.path('M'+x+','+(y+chartobject.legends.legend_elementsize*(2/6))+'L'+(x+chartobject.legends.legend_elementsize/2)+','+(y+chartobject.legends.legend_elementsize*(2/6))+'L'+(x+chartobject.legends.legend_elementsize/2)+','+(y+chartobject.legends.legend_elementsize*(4/6))+'L'+(x+chartobject.legends.legend_elementsize)+','+(y+chartobject.legends.legend_elementsize*(4/6))).attr({fill:'none',stroke:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				} else if(legend[i].grouping=='type'){
					var temp=snapobj.path('M'+x+','+(y+chartobject.legends.legend_elementsize*(2/6))+'L'+(x+chartobject.legends.legend_elementsize/2)+','+(y+chartobject.legends.legend_elementsize*(2/6))+'L'+(x+chartobject.legends.legend_elementsize/2)+','+(y+chartobject.legends.legend_elementsize*(4/6))+'L'+(x+chartobject.legends.legend_elementsize)+','+(y+chartobject.legends.legend_elementsize*(4/6))).attr({fill:'none',stroke:chartobject.color_scales.qualitative_color[0],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges','stroke-dasharray':chartobject.line_geom.line_types[numeric % chartobject.line_geom.line_types.length],keyrow:i})
					g.append(temp)				
				} else {
					var temp=snapobj.path('M'+x+','+(y+chartobject.legends.legend_elementsize*(2/6))+'L'+(x+chartobject.legends.legend_elementsize/2)+','+(y+chartobject.legends.legend_elementsize*(2/6))+'L'+(x+chartobject.legends.legend_elementsize/2)+','+(y+chartobject.legends.legend_elementsize*(4/6))+'L'+(x+chartobject.legends.legend_elementsize)+','+(y+chartobject.legends.legend_elementsize*(4/6))).attr({fill:'none',stroke:chartobject.color_scales.qualitative_color[0],'stroke-width':playobj.line_geom.line_size,'group':legend[i].group_value,'class':'dataelement',colorchange:'stroke',context:'path_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				}
			} else if(legend[i].geom=='step' && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({'stroke':chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length]})
				} else if(legend[i].grouping=='type'){
					keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_geom.line_types[numeric % chartobject.line_geom.line_types.length]})
				}
			}

			// bars or stacked bars or area or map
			if((legend[i].geom=='bar' || legend[i].geom=='stackedbar' || legend[i].geom=='area' || legend[i].geom=='bounds' || legend[i].geom=='map') && keyitem_dict[keyitem_name]==undefined){
				if(legend[i].grouping=='color'){
					var temp=snapobj.rect(x,y,playobj.legends.legend_elementsize,playobj.legends.legend_elementsize).attr({fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)
				} else if(legend[i].grouping=='type'){
					var temp=snapobj.rect(x,y,playobj.legends.legend_elementsize,playobj.legends.legend_elementsize).attr({fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				} else if(legend[i].geom=='map'){
					var temp=snapobj.rect(x,y,playobj.legends.legend_elementsize,playobj.legends.legend_elementsize).attr({fill:chartobject.color_scales.sequential_color[numeric % chartobject.color_scales.sequential_color.length],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				} else {
					var temp=snapobj.rect(x,y,playobj.legends.legend_elementsize,playobj.legends.legend_elementsize).attr({fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'group':legend[i].group_value,'class':'dataelement',colorchange:'fill',context:'data_context_menu',ident2:'floatkey',ident:'key'+graphnum,'shape-rendering':'crispEdges',keyrow:i})
					g.append(temp)				
				}
			} else if((legend[i].geom=='bar' || legend[i].geom=='stackedbar' || legend[i].geom=='area' || legend[i].geom=='bounds' || legend[i].geom=='bounds') && keyitem_dict[keyitem_name]!==undefined){
				if(legend[i].grouping=='color'){
					keyitem_dict[keyitem_name].attr({'fill':chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],context:'data_context_menu'})
				} else if(legend[i].grouping=='type'){
					// keyitem_dict[keyitem_name].attr({'stroke-dasharray':chartobject.line_geom.line_types[numeric]})
				}
			}

			// rect
			if(legend[i].geom=='rect' && keyitem_dict[keyitem_name]===undefined){
				var temp=snapobj.rect(x,y,playobj.legends.legend_elementsize,playobj.legends.legend_elementsize).attr({'stroke':'#aaa','stroke-width':1,fill:chartobject.color_scales.qualitative_color[numeric % chartobject.color_scales.qualitative_color.length],'fill-opacity':chartobject.rect_geom.rect_opacity,'shape-rendering':'crispEdges',ident2:'floatkey',ident:'key'+graphnum,context:'data_context_menu',keyrow:i})
				g.append(temp)			
			}

			// shade
			if(legend[i].geom=='shade' && keyitem_dict[keyitem_name]===undefined){
				var temp=snapobj.rect(x,y,playobj.legends.legend_elementsize,playobj.legends.legend_elementsize).attr({fill:chartobject.grapharea.chartfill,'shape-rendering':'crispEdges',ident2:'floatkey',ident:'key'+graphnum,context:'color_context_menu',colorchange:'fill',keyrow:i})
				var temp2=snapobj.rect(x,y,playobj.legends.legend_elementsize,playobj.legends.legend_elementsize).attr({'stroke':'#aaa','stroke-width':1,fill:chartobject.shade_geom.shadefill,'fill-opacity':chartobject.shade_geom.shadeopacity,'shape-rendering':'crispEdges',ident2:'floatkey',ident:'key'+graphnum,keyrow:i})
				g.append(temp)
				g.append(temp2)
			}

			console.log('height',linetext.getBBox().height)
			// set current y and x - should always be current lower bound of last item drawn, need to check if text or elementsize is bigger and size accordingly.
			if(keyitem_dict[keyitem_name]==undefined){
				keyitem_dict[keyitem_name]=temp
				if(legend[i+1]){
					if(legend[i+1].grouping==legend[i].grouping && legend[i+1].group_value==legend[i].group_value && legend[i+1].group_variable==legend[i].group_variable){
						var notext=1
					} else {
						if(vertical==1){
							if(y+playobj.legends.legend_elementsize<y+linetext.getBBox().height){
								// y is bottom of the text
								y=y+linetext.getBBox().height
							} else {
								// y is bottom of the element
								y=y+playobj.legends.legend_elementsize
							}
						} else {
							x=xtext+linetext.getBBox().width
						}
						// increment y/x
						if(vertical==1){
							y=y+playobj.legends.legend_element_to_next
						} else {
							x=x+playobj.legends.legend_element_to_next
							if(x>maxtextwidth){
								longest=x
								x=bounds[0]+playobj.legends.legend_leftpad
								y=y+Math.max(linetext.getBBox().height,playobj.legends.legend_elementsize)+chartobject.legends.legend_element_to_next
								yoffset=yoffset+Math.max(linetext.getBBox().height,playobj.legends.legend_elementsize)+chartobject.legends.legend_element_to_next
							}
						}
					}
				} else {
					if(vertical==1){
						if(y+playobj.legends.legend_elementsize<y+linetext.getBBox().height){
							// y is bottom of the text
							y=y+linetext.getBBox().height
						} else {
							// y is bottom of the element
							y=y+playobj.legends.legend_elementsize
						}
					} else {
						x=xtext+linetext.getBBox().width
					}
				}
			}

			if(vertical==1){
				if(linetext.getBBox().x2-bounds[0]>longest){longest=linetext.getBBox().x2-bounds[0]}
				delrect.attr({height:y-oldy})
			} else {
				delrect.attr({height:Math.max(linetext.getBBox().height,playobj.legends.legend_elementsize),width:linetext.getBBox().width+chartobject.legends.legend_elementsize+chartobject.legends.legend_element_to_text})
			}
		}

		// center title and expand floatkey box
		// if(vertical==1){
		// 	if(legend[0][1]!==''){longest=maxwidth}
		// 	if(title){
		// 		if(title.getBBox().width>parseFloat(longest)){
		// 			longest=title.getBBox().width+playobj.legends.legend_leftpad
		// 		}
		// 	}
		// }

		if(vertical==1){
			snapobj.selectAll("[delrect='1'][ident='key"+graphnum+"']").attr({width:longest+playobj.legends.legend_rightpad})
			floatkey.attr({height:y-bounds[2]+playobj.legends.legend_bottompad,width:longest+playobj.legends.legend_rightpad})
		} else {
			floatkey.attr({height:y-bounds[2]+Math.max(linetext.getBBox().height,playobj.legends.legend_elementsize)+chartobject.legends.legend_bottompad,width:Math.max(longest,x-bounds[0])+chartobject.legends.legend_rightpad})		
		}

		g.append(g.selectAll('circle'))
		floatkey.drag(moveFuncfloat,function(){x=this.attr('x');y=this.attr('y');prevx=0;prevy=0});
	}
}


/////////////////////////////////////////////////
///////////////////// GEOMS /////////////////////
/////////////////////////////////////////////////

function remove_missing(data,geom_dict,key,x){
	if(x===undefined){x=1}
	if(x===1){var vari1='xvar';var vari2='yvar'}
	if(x===0){var vari1='yvar';var vari2='xvar'}
	if(x===2){var vari1='xvar2';var vari2='yvar2'}
	if(x===3){var vari1='yvar2';var vari2='xvar2'}
	// change to x=0 for yvar, by default uses xvar
	var array=[]
	for(var i=0;i<data[geom_dict[key][vari1]].length;i++){
		if(typeof(data[geom_dict[key][vari2]][i])!=='undefined'){
			array.push(data[geom_dict[key][vari1]][i])
		}
	}

	var temp=array.slice(0)
	for(var i=temp.length-1;i>=0;i--){
		if(typeof(temp[i])==='undefined' | temp[i]==='') {
			temp.splice(i,1)
		}
	}
	return temp
}

function remove_missing2(array){
	var temp=array.slice(0)
	for(var i=temp.length-1;i>=0;i--){
		if(typeof(temp[i])==='undefined' | temp[i]==='') {
			temp.splice(i,1)
		}
	}
	return temp
}

function draw_trends(axes,trend,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// trend is {'trends':trends}
	// trends are: [[1,3],[4,2]]

	// loop through trend object, draw a line for each pair of points
	for(var i=0;i<trend.trends.length;i++){

		var current=trend.trends[i]

		if(chartobject.xaxis_dtype=='numeric'){
			var x_loc1=get_coord(parseFloat(current[0][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
			var x_loc2=get_coord(parseFloat(current[1][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
		} else {
			var x_loc1=get_coord(new Date(current[0][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
			var x_loc2=get_coord(new Date(current[1][0]),chartobject.xlimits,[axes[0],axes[1]],'nottext',chartobject.xarray,0,chartobject.shiftx)
		}

		if(chartobject.yaxis_dtype=='numeric'){
			var y_loc1=get_coord(parseFloat(current[0][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
			var y_loc2=get_coord(parseFloat(current[1][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
		} else {
			var y_loc1=get_coord(new Date(current[0][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
			var y_loc2=get_coord(new Date(current[1][1]),chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
		}

		var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
		var temp=snapobj.path(path).attr({stroke:chartobject.trend_geom.trend_fill,opacity:chartobject.trend_geom.trend_opacity,'stroke-width':chartobject.trend_geom.trend_width,'colorchange':'stroke',context:'path_context_menu'})
		var pathcoords=temp.getBBox()

		var tempwidth=pathcoords.width
		var tempheight=pathcoords.height
		var unitslope=tempheight/tempwidth

		// this is dumb but because the unitslope method above gives the same answer for positively and negatively sloping lines, need a little
		// kluge here to see which one this is.
		if(x_loc1<x_loc2){
			if(y_loc1<y_loc2){unitslope=unitslope*-1}
		} 
		if(x_loc2<x_loc1){
			if(y_loc2<y_loc1){unitslope=unitslope*-1}
		}

		// truncate trendlines that leave the graph
		// fake box that covers the plotting region
		var tempbox=snapobj.path('M'+(axes[0]-1)+','+(axes[3]-1)+'L'+(axes[1]+1)+','+(axes[3]-1)+'L'+(axes[1]+1)+','+(axes[2]+1)+'L'+(axes[0]-1)+','+(axes[2]+1)+'L'+(axes[0]-1)+','+(axes[3]-1)).attr({})
		var areabox=tempbox.getBBox()
		console.log(areabox)

		// check to see if start and endpoints are inside the box. If they aren't, set them to the intersection of the trendline and the bounding box
		// have to check 3 circumstances - where 1st point is off graph and 2nd is off, both off, etc.
		if(Snap.path.isPointInsideBBox(areabox,x_loc1,y_loc1)==false & Snap.path.isPointInsideBBox(areabox,x_loc2,y_loc2)==false){
			// both points are outside the box, path has to redrawn based on two intersection points
			var intersects=Snap.path.intersection(temp,tempbox)

			if (intersects.length>0){
				var x_loc1=intersects[0]['x']
				var x_loc2=intersects[1]['x']
				var y_loc1=intersects[0]['y']
				var y_loc2=intersects[1]['y']

				var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
				temp.remove()
				var temp=snapobj.path(path).attr({stroke:chartobject.trend_geom.trend_fill,opacity:chartobject.trend_geom.trend_opacity,'stroke-width':chartobject.trend_geom.trend_width,'colorchange':'stroke',context:'path_context_menu'})
			}
		} else if(Snap.path.isPointInsideBBox(areabox,x_loc1,y_loc1)==false & Snap.path.isPointInsideBBox(areabox,x_loc2,y_loc2)==true){
			// 2nd point inside box, path has to redrawn based on two intersection points
			var intersects=Snap.path.intersection(temp,tempbox)

			var x_loc1=intersects[0]['x']
			var y_loc1=intersects[0]['y']

			var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
			temp.remove()
			var temp=snapobj.path(path).attr({stroke:chartobject.trend_geom.trend_fill,opacity:chartobject.trend_geom.trend_opacity,'stroke-width':chartobject.trend_geom.trend_width,'colorchange':'stroke',context:'path_context_menu'})
		} else if(Snap.path.isPointInsideBBox(areabox,x_loc1,y_loc1)==true & Snap.path.isPointInsideBBox(areabox,x_loc2,y_loc2)==false){
			// first point inside box, path has to redrawn based on two intersection points
			var intersects=Snap.path.intersection(temp,tempbox)

			var x_loc2=intersects[0]['x']
			var y_loc2=intersects[0]['y']

			var path='M'+x_loc1+','+y_loc1+'L'+x_loc2+','+y_loc2
			temp.remove()
			var temp=snapobj.path(path).attr({stroke:chartobject.trend_geom.trend_fill,opacity:chartobject.trend_geom.trend_opacity,'stroke-width':chartobject.trend_geom.trend_width,'colorchange':'stroke',context:'path_context_menu'})
		}

		tempbox.remove()
		var pathcoords=temp.getBBox()
		console.log(pathcoords)

		// finally add the text
		var trendtext=snapobj.text((x_loc1+x_loc2)/2,(y_loc1+y_loc2)/2+chartobject.trend_geom.trend_to_text,'Trendline').attr({fill:chartobject.trend_geom.trend_textcolor,'font-family':chartobject.trend_geom.trend_textface,'font-weight':chartobject.trend_geom.trend_textweight,dy:'0.75em','text-anchor':'middle','colorchange':'fill',context:'text_context_menu',fontSize:chartobject.trend_geom.trend_textsize})
		trendtext.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		var coords=trendtext.getBBox()
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
		var minsize=Math.min(...remove_missing2(chartobject.flatdata[line.size]))
		var maxsize=Math.max(...remove_missing2(chartobject.flatdata[line.size]))
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

	// loop through groups in the dataset to draw lines
	for(var i=0;i<groups.length;i++){
		var current=chartobject.dataset.filter(function(row){
			return row[line.grouping.color]===groups[i][0]
		}).filter(function(row){
			return row[line.grouping.type]===groups[i][1]
		})

		current=current.filter(function(row){
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

		// this is a little tricky and may have unintended consequences... so that
		// Playfair doesn't get caught up on no-data entries that are not intended to
		// be graphed as lines at all, get a set of the connect values and delete any
		// where the connect value occurs elsewhere but there is no data point (if
		// the other occurrence does have a data point)

		// this is a weird little data corner case and I wonder if there's a better
		// way to handle it. Technically you shouldn't structure data like this
		// anyways but it may seem to people like you should be able to.
		// var connect_set=new set([...current[connect]])
		// for(var j=0;j<connect_set.length;j++){
		// 	var dupes=current.filter(function(row){
		// 		return row[connect]==connect_set[j]
		// 	})
			
		// }
		

		// check for sizing variable and set line width
		if(line.size!=='none'){
			if(current[0][line.size]!==undefined){
				var linewidth=((current[0][line.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.line_geom.line_maxsize)-parseFloat(chartobject.line_geom.line_minsize))+parseFloat(chartobject.line_geom.line_minsize)
			}
		} else {
			var linewidth=chartobject.line_geom.line_size
		}

		// color
		if(line.grouping.color!=='none'){
			// console.log('ATTENTION',color_groups.indexOf(current[0][line.grouping.color]),color_groups.length)
			var color=chartobject.color_scales.qualitative_color[color_groups.indexOf(current[0][line.grouping.color]) % chartobject.color_scales.qualitative_color.length]
		} else {
			var color=chartobject.color_scales.qualitative_color[0]
		}

		// line type
		if(line.grouping.type!=='none'){
			var linetype=chartobject.line_geom.line_types[type_groups.indexOf(current[0][line.grouping.type])]
		} else {
			var linetype=chartobject.line_geom.line_types[0]
		}

		// label
		var label=''
		var s=0

		for(var key in line.grouping){
			if(line.grouping[key]!='none'){
				if(s==0){
					label=label+current[0][line.grouping[key]]
				} else {
					if(label.indexOf(current[0][line.grouping[key]])==-1){
						label=label+', '+current[0][line.grouping[key]]
					}
				}
				s=s+1
			}
		}

		var path=''
		var skipped=0
		// now loop through points in the line
		for(var j=0;j<current.length;j++){
			var sub_current=current[j]
			try{var sub_next=current[j+1]} catch(err){}

			if(sub_current[connect]!==undefined){
				if((sub_current[line.xvar]==undefined && connect==line.yvar) || (sub_current[line.yvar]==undefined && connect==line.xvar)){
					// check to see if this is the last point - if so there won't be a sub_next
					if(j!==current.length-1){
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
							if(chartobject.line_geom.line_smoothing==1){
								path=path+' R'
							}
							skipped=1
						}
					}
				} else if(sub_current[line.xvar]!=undefined && sub_current[line.yvar]!=undefined){
					// set various values for points. locations
					var x_loc=get_coord(sub_current[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var y_loc=get_coord(sub_current[line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
					// add to path or start path
					if(j==0){
						path=path+'M'+x_loc+','+y_loc
						if(chartobject.line_geom.line_smoothing==1){
							path=path+' R'
						}
					} else if(skipped==0){
						if(chartobject.line_geom.line_smoothing==1){
							path=path+' '+x_loc+','+y_loc
						} else {
							path=path+'L'+x_loc+','+y_loc
						}
					} else if(skipped==1){
						skipped=0
					}
				} else {}
			}
		}
		console.log(path)

		// draw line
		if(current[0][line.grouping.color]==undefined){
			var greplace=line.yvar
		} else {
			var greplace=current[0][line.grouping.color]
		}
		console.log(path)
		snapobj.path(path).attr({'data_label':label,class:'dataelement',opacity:chartobject.line_geom.line_opacity,stroke:color,'stroke-width':linewidth,fill:'none','group':greplace,'fill-opacity':0,'colorchange':'stroke',context:'pathdata_context_menu','stroke-dasharray':linetype})
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

	current.sort(function(a,b){
		return a[line.xvar]-b[line.xvar]
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
			var color=chartobject.color_scales.qualitative_color[color_groups.indexOf(current[0][line.grouping.color]) % chartobject.color_scales.qualitative_color.length]
		} else {
			var color=chartobject.color_scales.qualitative_color[0]
		}

		// label
		var label=current[0][line.color]

		// create empty path
		var path=''
		var new_base=''

		// now loop through points in the line
		for(var j=0;j<current.length;j++){
			var sub_current=current[j]
			try{var sub_next=current[j+1]} catch(err){}
			try{var sub_prev=prev_current[j]} catch(err){}

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
		if(current[0][line.grouping.color]==undefined){
			var greplace=line.yvar
		} else {
			var greplace=current[0][line.grouping.color]
		}
		snapobj.path(path).attr({'data_label':label,class:'dataelement',opacity:chartobject.area_geom.area_opacity,stroke:color,'stroke-width':0,fill:color,'group':greplace,'colorchange':'fill',context:'pathdata_context_menu'})
	}

	// pull the y=0 line to the front
	snapobj.append(snapobj.selectAll('[zeroline="1"]'))
}

function draw_bounds(axes,line,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// area is {'xvar':x,'yvar':y_max,'ymin':y_min,'grouping':{'color':color}}

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

	// loop through groups in the dataset to draw lines
	for(var i=0;i<groups.length;i++){
		var current=chartobject.dataset.filter(function(row){
			return row[line.grouping.color]===groups[i][0]
		})

		console.log(current)

		// order according to the x variable
		current.sort(function(a,b){
			return a[line.xvar]-b[line.xvar]
		})

		// determine start and end points
		var x_left=get_coord(current[0][line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
		var x_right=get_coord(current[current.length-1][line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)

		// color
		if(line.grouping.color!=='none'){
			var color=chartobject.color_scales.qualitative_color[color_groups.indexOf(current[0][line.grouping.color]) % chartobject.color_scales.qualitative_color.length]
		} else {
			var color=chartobject.color_scales.qualitative_color[0]
		}

		// label
		var label=current[0][line.color]

		// create empty path
		var path='M'+x_left+','+get_coord(current[0][line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

		// now loop through points in the line and build up the top/bottom
		for(var j=1;j<current.length;j++){
			var sub_current=current[j]
			var y=get_coord(sub_current[line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
			var x=get_coord(sub_current[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var path=path+'L'+x+','+y
		}

		path=path+'L'+x_right+','+get_coord(current[current.length-1][line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

		// go through on the reverse and build up the opposite side
		for(var j=current.length-1;j>-1;j--){
			var sub_current=current[j]
			var y=get_coord(sub_current[line.ymin],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.ymin].dtype,chartobject.yarray,1,chartobject.shifty)
			var x=get_coord(sub_current[line.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[line.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var path=path+'L'+x+','+y
		}

		path=path+'L'+x_left+','+get_coord(current[0][line.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[line.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

		// draw line
		if(current[0][line.grouping.color]==undefined){
			var greplace=line.yvar
		} else {
			var greplace=current[0][line.grouping.color]
		}
		snapobj.path(path).attr({'data_label':label,class:'dataelement',opacity:chartobject.area_geom.area_opacity,stroke:color,'stroke-width':0,fill:color,'group':greplace,'colorchange':'fill',context:'pathdata_context_menu'})
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
		var minsize=Math.min(...remove_missing2(chartobject.flatdata[step.size]))
		var maxsize=Math.max(...remove_missing2(chartobject.flatdata[step.size]))
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

		current=current.filter(function(row){
			return row[connect]!==undefined
		})

		// check for sizing variable and set line width
		if(step.size!=='none'){
			if(current[0][step.size]!=undefined){
				var linewidth=((current[0][step.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.line_geom.line_maxsize)-parseFloat(chartobject.line_geom.line_minsize))+parseFloat(chartobject.line_geom.line_minsize)
			}
		} else {
			var linewidth=chartobject.line_geom.line_size
		}

		// color
		if(step.grouping.color!=='none'){
			var color=chartobject.color_scales.qualitative_color[color_groups.indexOf(current[0][step.grouping.color]) % chartobject.color_scales.qualitative_color.length]
		} else {
			var color=chartobject.color_scales.qualitative_color[0]
		}

		// line type
		if(step.grouping.type!=='none'){
			console.log('typing: ',type_groups,current[0],step.grouping.type)
			var linetype=chartobject.line_geom.line_types[type_groups.indexOf(current[0][step.grouping.type])]
		} else {
			var linetype=chartobject.line_geom.line_types[0]
		}

		// label
		var label=''
		var s=0

		for(var key in step.grouping){
			if(step.grouping[key]!='none'){
				if(s==0){
					label=label+current[0][step.grouping[key]]
				} else {
					if(label.indexOf(current[0][step.grouping[key]])==-1){
						label=label+', '+current[0][step.grouping[key]]
					}
				}
				s=s+1
			}
		}

		var path=''
		// now loop through points in the line
		for(var j=0;j<current.length;j++){
			var sub_current=current[j]

			try{
				var sub_next=current[j+1]
			} catch(err){}

			if(isNaN(sub_current[connect])==false){
				if((sub_current[step.xvar]==undefined && connect==step.yvar) || (sub_current[step.yvar]==undefined && connect==step.xvar)){
					if(j!==current.length-1){
						// set various values for points. locations
						var x_loc=get_coord(sub_next[step.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[step.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
						var y_loc=get_coord(sub_next[step.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[step.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
						// add to path or start path
						if(j==0){
							path=path+'M'+x_loc+','+y_loc
						} else{
							path=path+'M'+x_loc+','+y_loc
						}
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
		if(current[0][step.grouping.color]==undefined){
			var greplace=step.yvar
		} else {
			var greplace=current[0][step.grouping.color]
		}
		snapobj.path(path).attr({'data_label':label,class:'dataelement',opacity:chartobject.line_geom.line_opacity,stroke:color,'stroke-width':linewidth,fill:'none','group':greplace,'fill-opacity':0,'colorchange':'stroke',context:'pathdata_context_menu','stroke-dasharray':linetype})
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
			var pointsize=((current[point.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.point_geom.point_maxsize)-parseFloat(chartobject.point_geom.point_minsize))+parseFloat(chartobject.point_geom.point_minsize)
		} else {
			var pointsize=chartobject.point_geom.point_size
		}

		// set various values for points. locations
		if(current[point.xvar]!=undefined && current[point.yvar]!=undefined  && ((point.grouping.color=='none') || (point.grouping.color!=='none' && current[point.grouping.color]!==undefined))){
			var x_loc=get_coord(current[point.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[point.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc=get_coord(current[point.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[point.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

			// color
			if(point.grouping.color!=='none'){
				var color=chartobject.color_scales.qualitative_color[color_groups.indexOf(current[point.grouping.color]) % chartobject.color_scales.qualitative_color.length]
			} else {
				var color=chartobject.color_scales.qualitative_color[0]
			}

			// point type
			var pointtype=1

			// label
			var label=current[point.labels]

			// draw point
			if(current[point.grouping.color]==undefined){
				var greplace=point.yvar
			} else {
				var greplace=current[point.grouping.color]
			}
			if(pointtype==1){
				snapobj.circle(x_loc,y_loc,pointsize).attr({fill:chartobject.grapharea.chartfill})
				snapobj.circle(x_loc,y_loc,pointsize).attr({fill:color,stroke:color,'stroke-width':chartobject.point_geom.point_strokewidth,'data_type':'point','data_label':label,'group':greplace,'class':'dataelement','fill-opacity':chartobject.point_geom.point_fillopacity,'stroke-opacity':chartobject.point_geom.point_strokeopacity,colorchange:'both',context:'point_context_menu'})
			}

			// label point
			if (point.labelall==true) {
				var label=snapobj.text(x_loc,y_loc-pointsize-3,current[point.labels]).attr({'font-family':chartobject.data_labels.dataface,'font-size':chartobject.data_labels.datasize,'font-weight':chartobject.data_labels.dataweight,dy:'0.75em','text-anchor':'middle',fill:chartobject.data_labels.datatextfill,colorchange:'fill',context:'text_context_menu'})
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
			var size=((current[segment.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.segment_geom.segment_maxsize)-parseFloat(chartobject.segment_geom.segment_minsize))+parseFloat(chartobject.segment_geom.segment_minsize)
		} else {
			var size=chartobject.segment_geom.segment_width
		}

		// set various values for points. locations
		if(current[segment.xvar]!=undefined && current[segment.yvar]!=undefined && current[segment.xvar2]!=undefined && current[segment.yvar2]!=undefined  && ((segment.grouping.color=='none') || (segment.grouping.color!=='none' && current[segment.grouping.color]!==undefined))){
			var x_loc1=get_coord(current[segment.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[segment.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc1=get_coord(current[segment.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[segment.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
			var x_loc2=get_coord(current[segment.xvar2],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[segment.xvar2].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc2=get_coord(current[segment.yvar2],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[segment.yvar2].dtype,chartobject.yarray,1,chartobject.shifty)

			// color
			if(segment.grouping.color!=='none'){
				var color=chartobject.color_scales.grayscale_color[color_groups.indexOf(current[segment.grouping.color])]
			} else {
				console.log('color')
				var color=chartobject.color_scales.grayscale_color[0]
			}

			// type
			if(segment.grouping.type!=='none'){
				var type=chartobject.segment_geom.segment_linetypes[type_groups.indexOf(current[segment.grouping.type])]
			} else {
				var type=chartobject.segment_geom.segment_linetypes[0]
			}

			// draw segment
			if(current[segment.grouping.color]==undefined){
				var greplace=segment.yvar
			} else {
				var greplace=current[segment.grouping.color]
			}
			snapobj.line(x_loc1,y_loc1,x_loc2,y_loc2).attr({class:'dataelement',opacity:chartobject.segment_geom.segment_opacity,stroke:color,'stroke-width':size,'group':greplace,'colorchange':'stroke',context:'pathdata_context_menu','stroke-dasharray':type,'shape-rendering':'crispEdges'})
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
			var size=((current[text.size]-minsize)/(maxsize-minsize))*(parseFloat(chartobject.text_geom.text_maxsize)-parseFloat(chartobject.text_geom.text_minsize))+parseFloat(chartobject.text_geom.text_minsize)
		} else {
			var size=chartobject.annotations.annotatesize
		}

		// set values for text locations
		if(current[text.xvar]!=undefined && current[text.yvar]!=undefined && current[text.text]!=undefined){
			var x_loc=get_coord(current[text.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[text.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			var y_loc=get_coord(current[text.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[text.yvar].dtype,chartobject.yarray,1,chartobject.shifty,chartobject.ybar)

			// draw text
			var t=snapobj.text(x_loc,y_loc,current[text.text]).attr({'text-anchor':chartobject.text_geom.text_align,fill:chartobject.text_geom.text_fill,opacity:chartobject.text_geom.text_opacity,'data_type':'text','class':'dataelement',colorchange:'fill',context:'text_context_menu',dy:'0.3em','font-size':size,'font-family':chartobject.text_geom.text_face,'font-weight':chartobject.text_geom.text_weight})
			t.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		}
	}
}

function draw_shade(axes,shade,snapobj,graphnum){
	// console.log(axes)
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
				snapobj.path('M'+x_left+','+y_top+'L'+x_right+','+y_top+'L'+x_right+','+y_bottom+'L'+x_left+','+y_bottom+'L'+x_left+','+y_top).attr({fill:chartobject.shade_geom.shadefill,'fill-opacity':chartobject.shade_geom.shadeopacity,'shape-rendering':'crispEdges',context:'color_context_menu',colorchange:'fill'})
			}
		}
	}

	if(shade.yarr.length>0){
		for(var i=0;i<shade.yarr.length;i++){
			var current=shade.yarr[i]
			var x_left=axes[0]
			var x_right=axes[1]
			var y_bottom=get_coord(current[0],chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)
			var y_top=get_coord(current[1],chartobject.ylimits,[axes[2],axes[3]],'nottext',chartobject.yarray,1,chartobject.shifty)

			if((y_top>=axes[3] & y_top<=axes[2]) | (y_bottom<=axes[2] & y_bottom>=axes[3])){
				if(y_top<axes[3]){y_top=axes[3]}
				if(y_bottom>axes[2]){y_bottom=axes[2]}
				snapobj.path('M'+x_left+','+y_top+'L'+x_right+','+y_top+'L'+x_right+','+y_bottom+'L'+x_left+','+y_bottom+'L'+x_left+','+y_top).attr({fill:chartobject.shade_geom.shadefill,'fill-opacity':chartobject.shade_geom.shadeopacity,'shape-rendering':'crispEdges',context:'color_context_menu',colorchange:'fill'})
			}
		}
	}

	snapobj.append(snapobj.selectAll('[obj_type="gridline"][graphnum="'+graphnum+'"]'))
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
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(chartobject.mindiff,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
			var barwidth=totalwidth
			console.log(barwidth)
			// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
			if(totalwidth/2>get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0] || totalwidth/2>axes[1]-get_coord(chartobject.xmax,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)){
				console.log('clipping')
				var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*2*(get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0]))
				var barwidth=totalwidth
				console.log(barwidth)
			}
		} else {
			// if the axis is categorical, get width based on that instead.
			console.log(get_coord(x_values[0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx),get_coord(x_values[1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx))
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(x_values[0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(x_values[1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
			var barwidth=totalwidth
		}
	} else {
		var y_values=[...new Set(chartobject.flatdata[bar.yvar])]
		if(chartobject.flatdata[bar.yvar].dtype!='text'){
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(chartobject.mindiff,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)))
			var barwidth=totalwidth
			console.log(barwidth)
			// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
			if(totalwidth/2>Math.abs(get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[2]) || totalwidth/2>Math.abs(axes[3]-get_coord(chartobject.ymax,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1))){
				console.log('clipping')
				var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*2*(get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[2]))
				var barwidth=totalwidth
				console.log(barwidth,get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1),axes)
			}
		} else {
			// if the axis is categorical, get width based on that instead.
			console.log(get_coord(chartobject.flatdata[bar.yvar][0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1))
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(y_values[0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(y_values[1],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)))
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
				var color=chartobject.color_scales.qualitative_color[color_groups.indexOf(current[bar.grouping.color]) % chartobject.color_scales.qualitative_color.length]
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
					console.log('grouped horizontal axes: ',axes[2],axes[3])
					var orient='horizontal'
					var y1=get_coord(current[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-(totalwidth/2)+barwidth*(color_groups.indexOf(current[bar.grouping.color]))
					var y2=y1+barwidth
					var x1=get_coord(current[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
					var x2=get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
				}
			} else {
				var color=chartobject.color_scales.qualitative_color[0]
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
			if(current[bar.grouping.color]==undefined){
				var greplace=bar.yvar
			} else {
				var greplace=current[bar.grouping.color]
			}
			console.log(x1,x2,y1,y2)
			snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,'data_type':'bar',opacity:chartobject.bar_geom.barchart_opacity,'data_label':label,'group':greplace,'class':'dataelement','shape-rendering':'crispEdges',fill:color,colorchange:'fill',context:'data_context_menu'})
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

	// create y_values and x_values, used later to figure out where everything stacks
	if(chartobject.flatdata[bar.xvar].dtype=='date'){
		var x_values=[...new Set(chartobject.flatdata[bar.xvar])]
		var temp=[]
		for(var i=0;i<x_values.length;i++){
			temp.push(x_values[i].getTime())
		}
		var x_values2=[...new Set(temp)]
	} else {
		var x_values=[...new Set(chartobject.flatdata[bar.xvar])]
		var x_values2=x_values
	}

	if(chartobject.flatdata[bar.yvar].dtype=='date'){
		var y_values=[...new Set(chartobject.flatdata[bar.yvar])]
		var temp=[]
		for(var i=0;i<y_values.length;i++){
			temp.push(y_values[i].getTime())
		}
		var y_values2=[...new Set(temp)]
	} else {
		var y_values=[...new Set(chartobject.flatdata[bar.yvar])]
		var y_values2=y_values
	}

	// to figure out the width of a bar, need to find the two values that are *closest* on the x-axis.
	// the bar width should be just large enough that those two bars have a little space between them
	// this is already stored in mindiff
	if(bar.orientation=='on'){
		var orient='vertical'
		if(chartobject.flatdata[bar.xvar].dtype!='text'){
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(chartobject.mindiff,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
			var barwidth=totalwidth
			// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
			if(totalwidth/2>get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0] || totalwidth/2>axes[1]-get_coord(chartobject.xmax,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)){
				console.log('clipping')
				var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*2*(get_coord(chartobject.xmin,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-axes[0]))
				var barwidth=totalwidth
			}
		} else {
			// if the axis is categorical, get width based on that instead.
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(x_values[0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(x_values[1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
			var barwidth=totalwidth
		}
	} else {
		var orient='horizontal'
		if(chartobject.flatdata[bar.yvar].dtype!='text'){
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(chartobject.mindiff,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)))
			var barwidth=totalwidth
			// cap barwidth based on overrunning the left or right side of the graph - ie bars should never break out of the axis box
			if(totalwidth/2>Math.abs(get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[2]) || totalwidth/2>Math.abs(axes[3]-get_coord(chartobject.ymax,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1))){
				var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*2*(get_coord(chartobject.ymin,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-axes[2]))
				var barwidth=totalwidth
			}
		} else {
			// if the axis is categorical, get width based on that instead.
			console.log(get_coord(chartobject.flatdata[bar.yvar][0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1))
			var totalwidth=Math.abs(chartobject.bar_geom.barchart_width*(get_coord(y_values[0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-get_coord(y_values[1],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)))
			var barwidth=totalwidth
		}
	}

	console.log('barwidth: ',barwidth)

	if(bar.orientation=='on'){
		// draw vertical bars, get all necessary coords etc.
		var y_ends_positive=new Array(x_values.length)
		var y_ends_negative=new Array(x_values.length)
		for(var i=0;i<y_ends_positive.length;i++){
			y_ends_positive[i]=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
			y_ends_negative[i]=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)
		}
		var zero=get_coord(0,chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty)

		for(var i=0;i<color_groups.length;i++){
			var color=chartobject.color_scales.qualitative_color[i % chartobject.color_scales.qualitative_color.length]
			for(var j=0;j<chartobject.dataset.length;j++){
				var temp=chartobject.dataset[j]
				if(temp[bar.grouping.color]==color_groups[i]){
					if(temp[bar.yvar]>0){
						if(chartobject.flatdata[bar.xvar].dtype=='date'){
							var i_loc=x_values2.indexOf(temp[bar.xvar].getTime())
						} else {
							var i_loc=x_values2.indexOf(temp[bar.xvar])
						}
						var y1=y_ends_positive[i_loc]
						var y2=y1-(zero-get_coord(temp[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty))
						var x1=get_coord(temp[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(totalwidth/2)
						var x2=x1+barwidth
						var label=temp[bar.yvar]
						var greplace=temp[bar.grouping.color]					
						snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,opacity:chartobject.bar_geom.barchart_opacity,'data_type':'bar','data_label':label,'group':greplace,'class':'dataelement','shape-rendering':'crispEdges',fill:color,context:'data_context_menu',colorchange:'fill'})
						y_ends_positive[i_loc]=y2
					} else {
						if(chartobject.flatdata[bar.xvar].dtype=='date'){
							var i_loc=x_values2.indexOf(temp[bar.xvar].getTime())
						} else {
							var i_loc=x_values2.indexOf(temp[bar.xvar])
						}
						var y1=y_ends_negative[i_loc]
						var y2=y1-(zero-get_coord(temp[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty))
						var x1=get_coord(temp[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-(totalwidth/2)
						var x2=x1+barwidth
						var label=temp[bar.yvar]
						var greplace=temp[bar.grouping.color]					
						snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,opacity:chartobject.bar_geom.barchart_opacity,'data_type':'bar','data_label':label,'group':greplace,'class':'dataelement','shape-rendering':'crispEdges',fill:color,context:'data_context_menu',colorchange:'fill'})
						y_ends_negative[i_loc]=y2
					}
				}
			}
		}
	} else {
		// draw horizontal bars, get all necessary coords etc.
		var x_ends_positive=new Array(y_values.length)
		var x_ends_negative=new Array(y_values.length)
		for(var i=0;i<x_ends_positive.length;i++){
			x_ends_positive[i]=get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			x_ends_negative[i]=get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
		}
		var zero=get_coord(0,chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)

		for(var i=0;i<color_groups.length;i++){
			var color=chartobject.color_scales.qualitative_color[i % chartobject.color_scales.qualitative_color.length]
			for(var j=0;j<chartobject.dataset.length;j++){
				var temp=chartobject.dataset[j]
				if(temp[bar.grouping.color]==color_groups[i]){
					if(temp[bar.xvar]>0){
						if(chartobject.flatdata[bar.yvar].dtype=='date'){
							var i_loc=y_values2.indexOf(temp[bar.yvar].getTime())
						} else {
							var i_loc=y_values2.indexOf(temp[bar.yvar])
						}
						var x1=x_ends_positive[i_loc]
						var x2=x1+(get_coord(temp[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-zero)
						var y1=get_coord(temp[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-(totalwidth/2)
						var y2=y1+barwidth
						var label=temp[bar.yvar]
						var greplace=temp[bar.grouping.color]					
						snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,opacity:chartobject.bar_geom.barchart_opacity,'data_type':'bar','data_label':label,'group':greplace,'class':'dataelement','shape-rendering':'crispEdges',fill:color,context:'data_context_menu',colorchange:'fill'})
						x_ends_positive[i_loc]=x2
					} else {
						if(chartobject.flatdata[bar.yvar].dtype=='date'){
							var i_loc=y_values2.indexOf(temp[bar.yvar].getTime())
						} else {
							var i_loc=y_values2.indexOf(temp[bar.yvar])
						}
						var x1=x_ends_negative[i_loc]
						var x2=x1+(get_coord(temp[bar.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[bar.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-zero)
						var y1=get_coord(temp[bar.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[bar.yvar].dtype,chartobject.yarray,1,chartobject.shifty,1)-(totalwidth/2)
						var y2=y1+barwidth
						var label=temp[bar.xvar]
						var greplace=temp[bar.grouping.color]					
						snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({orient:orient,opacity:chartobject.bar_geom.barchart_opacity,'data_type':'bar','data_label':label,'group':greplace,'class':'dataelement','shape-rendering':'crispEdges',fill:color,context:'data_context_menu',colorchange:'fill'})
						x_ends_negative[i_loc]=x2
					}
				}
			}
		}	
	}

	// always gotta pull the y=0 line to the front after creating a barchart
	snapobj.append(snapobj.selectAll('[zeroline="1"]'))
}

function draw_rects(axes,rect,snapobj){
	// axes are [xleft,xright,ybottom,ytop]
	// rect is geom_dict['rect']={'xvar':x_start,'yvar':y_start,'xvar2':x_end,'yvar2':y_end,'grouping':{'color':color}}
	// create sets of options for each grouping variable
	if(rect.grouping.color!=='none'){
		var color_groups=get_color_groups(rect)	
	} else { 
		var color_groups=['placeholder'] 
	}

	// create y_values and x_values, used later to figure out where everything stacks
	if(chartobject.flatdata[rect.xvar].dtype=='date'){
		var x_values=[...new Set(chartobject.flatdata[rect.xvar])]
		var temp=[]
		for(var i=0;i<x_values.length;i++){
			temp.push(x_values[i].getTime())
		}
		var x_values2=[...new Set(temp)]
	} else {
		var x_values=[...new Set(chartobject.flatdata[rect.xvar])]
		var x_values2=x_values
	}

	if(chartobject.flatdata[rect.yvar].dtype=='date'){
		var y_values=[...new Set(chartobject.flatdata[rect.yvar])]
		var temp=[]
		for(var i=0;i<y_values.length;i++){
			temp.push(y_values[i].getTime())
		}
		var y_values2=[...new Set(temp)]
	} else {
		var y_values=[...new Set(chartobject.flatdata[rect.yvar])]
		var y_values2=y_values
	}

	// The width of a rect will usually be based on the variables given but in some cases one or even both axes might
	// be categorical. If this is the case, the width should instead be some reasonable width similar to how bars work.
	// I've added a parameter for this.
	if(chartobject.flatdata[rect.xvar].dtype=='text'){
		var totalwidth=Math.abs(chartobject.rect_geom.categorical_rect_width*(get_coord(x_values[0],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[rect.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-get_coord(x_values[1],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[rect.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)))
		var xwidth=totalwidth
		console.log('rects width: ',xwidth)
	}
	if(chartobject.flatdata[rect.yvar].dtype=='text'){
		var totalwidth=Math.abs(chartobject.rect_geom.categorical_rect_width*(get_coord(y_values[0],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[rect.yvar].dtype,chartobject.yarray,1,chartobject.shifty)-get_coord(y_values[1],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[rect.yvar].dtype,chartobject.yarray,1,chartobject.shifty)))
		var ywidth=totalwidth
		console.log('rects width: ',ywidth)
	}

	// loop through observations in the dataset to draw rects
	for(var i=0;i<chartobject.dataset.length;i++){
		var current=chartobject.dataset[i]

		if(current[rect.xvar]!=undefined && current[rect.yvar]!=undefined && current[rect.xvar2]!=undefined && current[rect.yvar2]!=undefined && ((rect.grouping.color=='none') || (rect.grouping.color!=='none' && current[rect.grouping.color]!==undefined))){
			// color + grouping
			if(rect.grouping.color!=='none'){
				var color=chartobject.color_scales.qualitative_color[color_groups.indexOf(current[rect.grouping.color]) % chartobject.color_scales.qualitative_color.length]
			} else {
				var color=chartobject.color_scales.qualitative_color[0]
			}

			if(xwidth!=null & current[rect.xvar]===current[rect.xvar2]){
				x1=get_coord(current[rect.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[rect.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)-xwidth/2
				x2=get_coord(current[rect.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[rect.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)+xwidth/2
			} else {
				x1=get_coord(current[rect.xvar],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[rect.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
				x2=get_coord(current[rect.xvar2],chartobject.xlimits,[axes[0],axes[1]],chartobject.flatdata[rect.xvar].dtype,chartobject.xarray,0,chartobject.shiftx)
			}

			if(ywidth!=null & current[rect.yvar]===current[rect.yvar2]){
				y1=get_coord(current[rect.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[rect.yvar].dtype,chartobject.yarray,1,chartobject.shifty,chartobject.ybar)-ywidth/2
				y2=get_coord(current[rect.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[rect.yvar].dtype,chartobject.yarray,1,chartobject.shifty,chartobject.ybar)+ywidth/2
			} else {
				y1=get_coord(current[rect.yvar],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[rect.yvar].dtype,chartobject.yarray,1,chartobject.shifty,chartobject.ybar)
				y2=get_coord(current[rect.yvar2],chartobject.ylimits,[axes[2],axes[3]],chartobject.flatdata[rect.yvar].dtype,chartobject.yarray,1,chartobject.shifty,chartobject.ybar)
			}

			// draw bar
			if(current[rect.grouping.color]==undefined){
				var greplace=rect.yvar
			} else {
				var greplace=current[rect.grouping.color]
			}
			// console.log('Rect coords: ',x1,x2,y1,y2)
			snapobj.path('M'+x1+','+y2+'L'+x2+','+y2+'L'+x2+','+y1+'L'+x1+','+y1+'L'+x1+','+y2).attr({'data_type':'rect',opacity:chartobject.rect_geom.rect_opacity,'group':greplace,'class':'dataelement','shape-rendering':'crispEdges',fill:color,colorchange:'fill',context:'data_context_menu'})
		}
	}
	snapobj.append(snapobj.selectAll('[zeroline="1"]'))
}

function draw_map(geom,snapobj,bounds){
	// map is {'location':location,'geography':states|counties,'values':values,'grouping':{'category':category}}
	// loop through observations in the xvar and yvar
	// categories are always based on the 'category' variable if available - values are really for keys, if the var is continuous
	// however, if categories are not passed, separate the data into quintiles and pick colors accordingly.
	// bounds is from get_bounds and used for drawing maps in small multiples.
	// [xpixelmin,xpixelmax,ypixelmin,ypixelmax]

	var loc='maps/'+geom['geography']+'.svg'

	// get available space
	var avail_height=bounds[3]-bounds[2]
	var avail_width=bounds[1]-bounds[0]
	var start_x=bounds[0]
	var start_y=bounds[2]
	var facetdata=chartobject.dataset

	console.log(avail_height,avail_width,start_x,start_y,facetdata)

	// load map, get dimensions, create the appropriate viewbox, then size based on available height/width
	var g=snapobj.group()
	var map=Snap.load(loc, function(loadedFragment){
		// if no category is given, use the values to create quintiles
		if(geom.grouping.category==='none'){
			console.log("MAKING QUINTILES")
			var temp=facetdata.filter(function(row){
				return row[geom.values]!==undefined & row[geom.location]!==undefined
			})
			var all_values=[]
			for(var i=0;i<temp.length;i++){
				all_values.push(temp[i][geom.values])
			}
			all_values.sort(function(a,b){
				return a-b
			})
			var first_cut=(all_values[Math.floor(all_values.length/5)-1]+all_values[Math.ceil(all_values.length/5)])/2
			var second_cut=(all_values[Math.floor(2*all_values.length/5)]+all_values[Math.ceil(2*all_values.length/5)])/2
			var third_cut=(all_values[Math.floor(3*all_values.length/5)]+all_values[Math.ceil(3*all_values.length/5)])/2
			var fourth_cut=(all_values[Math.floor(4*all_values.length/5)]+all_values[Math.ceil(4*all_values.length/5)])/2
			geom.grouping.category='placeholder'
			for(var i=0;i<facetdata.length;i++){
				var a=facetdata[i][geom.values]

				function pick_cat(a){
					if(a<first_cut){return all_values[0]+' - '+all_values[Math.round(all_values.length/5)-1]}
					if(a<second_cut){return all_values[Math.round(all_values.length/5)-1]+' - '+all_values[Math.round(2*all_values.length/5)-1]}
					if(a<third_cut){return all_values[Math.round(2*all_values.length/5)-1]+' - '+all_values[Math.round(3*all_values.length/5)-1]}
					if(a<fourth_cut){return all_values[Math.round(3*all_values.length/5)-1]+' - '+all_values[Math.round(4*all_values.length/5)-1]}
					else{return all_values[Math.round(4*all_values.length/5)-1]+' - '+all_values[Math.round(5*all_values.length/5)-1]}
				}

				facetdata[i].placeholder=pick_cat(a)
			}
			console.log(facetdata)

			// sort the data so they render lowest to highest
			function object_sort(a,b){
				if(a[geom.values]<b[geom.values]){
					return -1
				}
				if(a[geom.values]>b[geom.values]){
					return 1
				}
				return 0
			}

			facetdata=facetdata.sort(object_sort)
		}

		// add the map to the chartarea and gather measurements to do scaling. Then scale the map
		// to fit the available area.
		g.append(loadedFragment)
		var map=g.select('svg')
		var mapd=map.getBBox()
		var boxaspect=avail_width/avail_height
		var mapaspect=mapd.width/mapd.height
		console.log(avail_width,avail_height,mapd.width,mapd.height,start_x,start_y)

		// add context to all paths in the map
		map.selectAll('path').attr({'context':'data_context_menu','colorchange':'fill'})

		if(boxaspect<mapaspect){
			console.log('width scaling')
			// scale width of map
			var scale=avail_width/mapd.width
			var xdiff=(mapd.width-mapd.width*scale)/2
			var ydiff=(mapd.height-mapd.height*scale)/2
			var ycenter=(avail_height-(mapd.height*scale))/2
			console.log(xdiff,ydiff,start_x,start_y,scale)
			g.transform('s'+scale+'t'+(start_x-xdiff)/scale+','+(ycenter+start_y-ydiff)/scale)
		} else {
			console.log('height scaling')
			// scale height of map
			var scale=avail_height/mapd.height
			var xdiff=(mapd.width-mapd.width*scale)/2
			var ydiff=(mapd.height-mapd.height*scale)/2
			var xcenter=(avail_width-(mapd.width*scale))/2
			console.log(xdiff,ydiff,start_x,start_y,scale)
			g.transform('s'+scale+'t'+(xcenter+start_x-xdiff)/scale+','+(start_y-ydiff)/scale)
		}

		// special version of this function for maps
		function get_color_groups_maps(geom){
			var temp=facetdata.filter(function(row){
				return row[geom.grouping.category]!==undefined & row[geom.location]!==undefined
			})
			var color_groups=[]
			for(var i=0;i<temp.length;i++){
				color_groups.push(temp[i][geom.grouping.category])
			}
			console.log(facetdata,color_groups)
			var color_groups=[...new Set(color_groups)]	
			console.log(color_groups)
			return color_groups
		}

		// add data and styling to map
		for(var i=0;i<facetdata.length;i++){
			var current=facetdata[i]

			// color map by category
			var color_groups=get_color_groups_maps(geom)
			for(var i=0;i<facetdata.length;i++){
				var current=facetdata[i]
				var location=current[geom.location].replace(/ /g,'')
				var category=current[geom.grouping.category]
				var color=chartobject.color_scales.sequential_color[color_groups.indexOf(category) % chartobject.color_scales.sequential_color.length]

				// check class and id
				try{g.select('.'+location).attr({fill:color,data_label:location,group:category})} catch(err){}
				try{g.select('#'+location).attr({fill:color,data_label:location,group:category})} catch(err){}
			}
		}
	})
}


/////////////////////////////////////////////////////////////
/////////////////////// END GEOMS ///////////////////////////
/////////////////////////////////////////////////////////////



function get_color_groups(geom){
	var temp=chartobject.permset.filter(function(row){
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
	// purely for log axes
	if(y==1 & chartobject.ylog==1 & value!=0 & type!='text' & chartobject.datedenom[y]==0){
		if(value<0){
			alert("Can't have a logged axis with negative values.")
			return NaN
		}
		value=Math.log(value)
		if(limit_start>0){limit_start=Math.log(limit_start)}
		if(limit_end>0){limit_end=Math.log(limit_end)}
	}
	if(y==0 & chartobject.xlog==1 & value!=0 & type!='text' & chartobject.datedenom[y]==0){
		if(value<0){
			alert("Can't have a logged axis with negative values.")
			return NaN
		}
		value=Math.log(value)
		if(limit_start>0){limit_start=Math.log(limit_start)}
		if(limit_end>0){limit_end=Math.log(limit_end)}
	}

	if(type!='text'){
		if(chartobject.datedenom[y]>0){
			var value=new Date(moment(value))
			var step=(range/((limit_end-limit_start+1)/chartobject.datedenom[y]*2))
			if(shift==1){
				if(y==1){
					pixel_end=pixel_end+step
					pixel_start=pixel_start-step
				} else {
					pixel_end=pixel_end-step
					pixel_start=pixel_start+step
				}
			}
		} else {
			var step=(range/((limit_end-limit_start+1)*2))
			if(shift==1){
				if(y==1){
					pixel_end=pixel_end+step
					pixel_start=pixel_start-step
				} else {
					pixel_end=pixel_end-step
					pixel_start=pixel_start+step
				}
			}
		}

		if(y==1){
			return pixel_start-(value-limit_start)/Math.abs(limit_end-limit_start)*Math.abs(pixel_end-pixel_start)
		} else {
			return pixel_start+(value-limit_start)/Math.abs(limit_end-limit_start)*Math.abs(pixel_end-pixel_start)
		}
	} else if(type=='text'){
		if(y==1){
			var position=array.length-array.indexOf(value)
			if(ybar==1){
				return pixel_start-((2*position-1)/(2*array.length))*Math.abs(pixel_end-pixel_start)
			} else {
				return pixel_start-((2*position-1)/(2*array.length-1))*Math.abs(pixel_end-pixel_start)
			}
		} else {
			var position=array.indexOf(value)+1
			var final=pixel_start+((2*position-1)/(2*array.length))*(pixel_end-pixel_start)
			console.log(final)
			return final
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
// Things passed to this function (#=required):
//   # dataseries: array of numbers to be plotted (either x or y, not both)

function create_numerical_axis(data) {
	var datamin=data[0]
	var datamax=data[1]
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

	console.log('range: ',range,'mindata: ',datamin,'maxdata: ',datamax)
	var steps=range/4

	if(steps>=1){
	    rounded=Math.round(steps)
	    digits=rounded.toString().length
    } else if(steps==0){
    	alert('No variation in either your x or y axis.')
    	return
    } else {
    	var places=steps.toString().split('.')[1]
    	console.log(steps,places)
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


function create_date_axis(data,y){
	var datamin=data[0]
	var datamax=data[1]
	var range=datamax-datamin

	console.log('range: ',range,'mindata: ',datamin,'maxdata: ',datamax)

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
	    	var temp=new Date('01/01/2016')
	    	temp.setFullYear(datamin.getUTCFullYear())
	    	temp.setMonth(datamin.getUTCMonth())
	    	temp.setDate(datamin.getUTCDate())
			step_array=[temp]

	    	var stepnum=1
		    while (step_array[step_array.length-1]<datamax){
		    	var temp=new Date('01/01/2016')
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
		chartobject.datedenom[y]=daylength
		drange=Math.round((datamax-datamin)/(1000*60*60*24))
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
	    	var temp=new Date('01/01/2016')
	    	temp.setFullYear(datamin.getUTCFullYear())
	    	temp.setMonth(datamin.getUTCMonth())
	    	temp.setDate(datamin.getUTCDate())
			step_array=[temp]

	    	var stepnum=1
		    while (step_array[step_array.length-1]<datamax){
		    	var temp=new Date('01/01/2016')
		    	temp.setFullYear(datamin.getUTCFullYear())
		    	temp.setMonth(datamin.getUTCMonth())
		    	temp.setDate(datamin.getUTCDate()+stepnum*steps)
		        step_array.push(temp)
		        stepnum++
		    }

		    // this arbitrarily enforces step_arrays of length between 4 and 10
		    if (step_array.length<15 && step_array.length>3){candidate_arrays.push(step_array)}
	    }
	}

	// sort candidate_arrays by length (smallest first)
	console.log(candidate_arrays)
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
	var txt=String(txt)
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

function get_bounds(playobj,column,row,totalcolumns,totalrows) {
	// this function is to get the area of the chart area that is available for graphing.
	// So take total drawable area, subtract off the header and footer, subtract left and
	// right margins, return min x, max x, min y and max y
	var availwidth=playobj.width-playobj.grapharea.left_margin-playobj.grapharea.right_margin-(totalcolumns-1)*playobj.small_multiples.horizontal_padding
	var availheight=playobj.height-playobj.header.head_height-playobj.grapharea.top_margin-playobj.footer_height-playobj.grapharea.bottom_margin-(totalrows-1)*playobj.small_multiples.vertical_padding

	var widthpergraph=availwidth/totalcolumns
	var heightpergraph=availheight/totalrows

	var xpixelmin=playobj.x+playobj.grapharea.left_margin+(column-1)*widthpergraph+(column-1)*playobj.small_multiples.horizontal_padding
	var xpixelmax=xpixelmin+widthpergraph
	var ypixelmin=playobj.y+playobj.header.head_height+playobj.grapharea.top_margin+(row-1)*heightpergraph+(row-1)*playobj.small_multiples.vertical_padding
	var ypixelmax=ypixelmin+heightpergraph

	return [xpixelmin,xpixelmax,ypixelmin,ypixelmax]
}

function draw_axes(xvar,yvar,shiftx,shifty,bounds,graphnum,drawx,drawy) {
	console.log(drawx,drawy)
	// console.log(xvar,yvar)
	// draws the axes for a graph
	// bounds is [xpixelmin,xpixelmax,ypixelmin,ypixelmax] from the get_bounds function
	// shiftx and shifty are optional parameters. If shiftx or shifty==1, that axis will
	// be shifted such that labels occur between ticks, appropriate for a bar graph. There
	// will also be one more tick to accomodate this change
	var snapobj=chartobject.svg
	var xpixelmin=bounds[0]
	var xpixelmax=bounds[1]
	var ypixelmin=bounds[2]
	var ypixelmax=bounds[3]

	console.log(xpixelmin,xpixelmax,ypixelmin,ypixelmax)

	// first draw the y-axis and add all elements to a group. Until the x-axis is drawn,
	// the correct y-location for all these elements is unknown. Draw as if it will be
	// sitting at the bottom of the graph, then move up the correct amount when x-axis is
	// drawn.

	if(drawy==1){
		// y label
		if (typeof(chartobject.ylabel)!=undefined){
			var lines=multitext(String(chartobject.ylabel),{'font-size':chartobject.y_label.ylabel_textsize,'font-weight':chartobject.y_label.ylabel_textweight,'font-family':chartobject.y_label.ylabel_textface},chartobject.y_label.ylabel_maxlength)
			var ylab=snapobj.text(xpixelmin+parseFloat(chartobject.y_label.ylabel_textsize)/2,(ypixelmax+ypixelmin)/2,lines).attr({fill:chartobject.y_label.ylabel_textfill,ident:'yaxis','font-size':chartobject.y_label.ylabel_textsize,'font-weight':chartobject.y_label.ylabel_textweight,'font-family':chartobject.y_label.ylabel_textface,dy:'0.3em','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
			ylab.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			ylab_coords=ylab.getBBox()
			ylab.attr({y:ylab_coords.y-(ylab_coords.height/2),x:parseFloat(ylab.attr('x'))+(lines.length-1)*parseInt(chartobject.y_label.ylabel_textsize)/2})
			ylab.selectAll("tspan:not(:first-child)").attr({x:ylab.attr('x'),dy:parseInt(chartobject.y_label.ylabel_textsize)})
			ylab_coords=ylab.getBBox()
			ylab_width=ylab_coords.height
			var ylabexist=1
			if(ylab_width==0){ylabexist=0}
		}
		else{var ylab_width=0;var ylabexist=0}

		// y ticks and lines - no location, just figure out what the x offset is
		var total_xoffset=xpixelmin+ylab_width
		// if(shifty==1){shifty=1}
		// else{shifty=0}

		for(var i=0;i<yvar.length;i++){
			if(Object.prototype.toString.call(yvar[i])==='[object Date]'){
				var string=formatDate(yvar[i],Math.max(...yvar)-Math.min(...yvar))
			} else {
				var string=String(yvar[i])
			}
			var temp=snapobj.text(xpixelmin+ylab_width+chartobject.y_ticks.ytick_to_ylabel*ylabexist,0,string).attr({ident:'yaxis','font-size':chartobject.y_ticks.ytick_textsize,'font-weight':chartobject.y_ticks.ytick_textweight,'font-family':chartobject.y_ticks.ytick_textface,'text-anchor':'start'})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			var coords=temp.getBBox()
			if(coords.x2>total_xoffset){total_xoffset=coords.x2}
			temp.remove()
		}
	} else {
		var total_xoffset=xpixelmin
	}

	// Subtract graph start x from xoffset and add ytick_to_yaxis to get the actual width of the xoffset.
	// As a safeguard, if the yoffset width comes back huge, adjust it to 15% of graphing space.
	// Long labels should wrap to be no larger than y_offset
	// total_xoffset is now the width of all y-axis machinery - labels, ticks, and space
	total_xoffset=total_xoffset-xpixelmin+chartobject.y_ticks.ytick_to_yaxis
	if(total_xoffset>chartobject.y_ticks.ytick_maxsize*chartobject.width){total_xoffset=chartobject.y_ticks.ytick_maxsize*chartobject.width}

	// now the full x-offset is known, can start drawing the x-axis. x label:
	if (typeof(chartobject.xlabel)!=undefined && drawx==1){
		var lines=multitext(String(chartobject.xlabel),{'font-size':chartobject.x_label.xlabel_textsize,'font-weight':chartobject.x_label.xlabel_textweight,'font-family':chartobject.x_label.xlabel_textface},chartobject.x_label.xlabel_maxlength)
		var xlab=snapobj.text((total_xoffset+xpixelmax+xpixelmin)/2,0,lines).attr({fill:chartobject.x_label.xlabel_textfill,ident:'xaxis','font-size':chartobject.x_label.xlabel_textsize,dy:'0.75em','font-weight':chartobject.x_label.xlabel_textweight,'font-family':chartobject.x_label.xlabel_textface,'text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
		xlab.selectAll("tspan:not(:first-child)").attr({x:xlab.attr('x'),dy:parseInt(chartobject.x_label.xlabel_textsize)})
		xlab.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
		var coords=xlab.getBBox()
		var xlab_height=coords.height*.8
		xlab.attr({y:ypixelmax-xlab_height})
		var xlabexist=1
		if(xlab_height==0){xlabexist=0}
	} else{xlab_height=0;xlabexist=0}

	// important parameters - the start and end of the x axis, domain, and x step size
	var xstart_xcoord=total_xoffset+xpixelmin
	var xfinal_xcoord=xpixelmax
	var domain=xfinal_xcoord-xstart_xcoord
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
	var xtickheight=0

	if(drawx==1){
		for(var i=0;i<xvar.length;i++){
			if(x_step<chartobject.x_ticks.xtick_maxsize*chartobject.width){maxwidth=x_step}
			else{maxwidth=chartobject.x_ticks.xtick_maxsize*chartobject.width}

			if(Object.prototype.toString.call(xvar[i])==='[object Date]'){
				string=formatDate(xvar[i],Math.max(...xvar)-Math.min(...xvar))
			} else {
				string=String(xvar[i])
			}

			var lines=multitext(string,{ident:'xaxis','font-size':chartobject.x_ticks.xtick_textsize,'font-weight':chartobject.x_ticks.xtick_textweight,'font-family':chartobject.x_ticks.xtick_textface,dy:'0.3em','text-anchor':'middle'},maxwidth)
			var temp=snapobj.text(0,parseInt(chartobject.x_ticks.xtick_textsize),lines).attr({fill:chartobject.x_ticks.xtick_textfill,ident:'xaxis','font-size':chartobject.x_ticks.xtick_textsize,'font-weight':chartobject.x_ticks.xtick_textweight,'font-family':chartobject.x_ticks.xtick_textface,'text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			temp.selectAll("tspan:not(:first-child)").attr({x:temp.attr('x'),dy:parseFloat(chartobject.x_ticks.xtick_textsize)})
			var coords=temp.getBBox()
			if(coords.height*.8>xtickheight){xtickheight=coords.height*.8}
			temp.remove()
		}
	}

	// now make a second pass on both axes and draw the actual ticks/lines/tick labels using known yoffset and xoffset
	// x axis objects first, y_end is the top of the functional graphing area:
	var y_end=ypixelmin

	for(var i=0;i<xvar.length;i++){
		// x-axis labels
		if(Object.prototype.toString.call(xvar[i])==='[object Date]'){
			string=formatDate(xvar[i],Math.max(...xvar)-Math.min(...xvar))
		} else {
			string=String(xvar[i])
		}

		var tempx=get_coord(xvar[i],chartobject.xlimits,[xstart_xcoord,xfinal_xcoord],xvar.dtype,xvar,0,chartobject.shiftx)
		var mid=Math.abs((get_coord(xvar[0],chartobject.xlimits,[xstart_xcoord,xfinal_xcoord],xvar.dtype,xvar,0,chartobject.shiftx)-get_coord(xvar[1],chartobject.xlimits,[xstart_xcoord,xfinal_xcoord],xvar.dtype,xvar,0,chartobject.shiftx))/2)
		var tempxmid=parseFloat(mid)+get_coord(xvar[i],chartobject.xlimits,[xstart_xcoord,xfinal_xcoord],xvar.dtype,xvar,0,chartobject.shiftx)
		
		if(drawx==1){
			var lines=multitext(string,{fill:chartobject.x_ticks.xtick_textfill,ident:'xaxis','font-size':chartobject.x_ticks.xtick_textsize,'font-weight':chartobject.x_ticks.xtick_textweight,'font-family':chartobject.x_ticks.xtick_textface,dy:'0.75em','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'},maxwidth)
			var temp=snapobj.text(tempx,ypixelmax-xlab_height-xlabexist*chartobject.x_ticks.xtick_to_xlabel-xtickheight,lines).attr({fill:chartobject.x_ticks.xtick_textfill,ident:'xaxis','font-size':chartobject.x_ticks.xtick_textsize,'font-weight':chartobject.x_ticks.xtick_textweight,'font-family':chartobject.x_ticks.xtick_textface,dy:'0.75em','text-anchor':'middle',colorchange:'fill',context:'text_context_menu'})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			temp.selectAll("tspan:not(:first-child)").attr({x:temp.attr('x'),dy:parseFloat(chartobject.x_ticks.xtick_textsize)})
			var coords=temp.getBBox()
		}

		// x-axis ticks, grid lines, and minor grid lines
		y_start=ypixelmax-xlab_height-xlabexist*chartobject.x_ticks.xtick_to_xlabel-xtickheight-chartobject.x_ticks.xtick_to_xaxis-chartobject.x_ticks.xtick_length
		var temp_line=snapobj.line(tempx,y_start,tempx,y_end).attr({stroke:chartobject.x_grids.xgrid_fill,'stroke-width':chartobject.x_grids.xgrid_thickness,'stroke-dasharray':chartobject.x_grids.xgrid_dasharray,opacity:chartobject.x_grids.xgrid_opacity,'shape-rendering':'crispEdges','obj_type':'gridline',graphnum:graphnum})
		if (i!=xvar.length-1){
			var temp_minorline=snapobj.line(tempxmid,y_start,tempxmid,y_end).attr({stroke:chartobject.x_grids.xgrid_minorfill,'stroke-width':chartobject.x_grids.xgrid_minorthickness,opacity:chartobject.x_grids.xgrid_minoropacity,'stroke-dasharray':chartobject.x_grids.xgrid_minordasharray,'shape-rendering':'crispEdges'})
		}
		var temp_tick=snapobj.line(tempx,y_start,tempx,y_start+chartobject.x_ticks.xtick_length).attr({stroke:chartobject.x_ticks.xtick_fill,'stroke-width':chartobject.x_ticks.xtick_thickness,'shape-rendering':'crispEdges'})
		
		// handle x=0 as appropriate
		if(Object.prototype.toString.call(xvar[i])!='[object Date]'){
			try{
				if(parseFloat(xvar[i].replace(/[^0-9\.\-]+/g,''))=='0'){
					temp_line.attr({stroke:chartobject.x_grids.xgrid_zerofill,'stroke-width':chartobject.x_grids.xgrid_zerothickness,'stroke-dasharray':chartobject.x_grids.xgrid_zerodasharray,zeroline:'1','opacity':chartobject.x_grids.xgrid_zeroopacity})
					if(parseFloat(temp_tick.attr('stroke-width'))!=0){
						temp_tick.attr({'stroke-width':chartobject.x_ticks.xtick_zerothickness,stroke:chartobject.x_ticks.xtick_zerofill})
					}
				}
			} catch(err){}
		}
	}

	// important parameters - the start and end of the y axis, range, and y step size
	var ystart_ycoord=y_start
	var yfinal_ycoord=ypixelmin
	var range=ystart_ycoord-yfinal_ycoord
	if(shifty==1){y_step=range/(yvar.length)}
	else{y_step=range/(yvar.length-1)}

	// Now go back to the y ticks and redraw with appropriate coords
	var maxwidth=(chartobject.y_ticks.ytick_maxsize*chartobject.width)-chartobject.grapharea.left_margin
	// console.log(maxwidth)
	for(var i=0;i<yvar.length;i++){

		if(Object.prototype.toString.call(yvar[i])==='[object Date]'){
			string=formatDate(yvar[i],Math.max(...yvar)-Math.min(...yvar))
		} else {
			string=String(yvar[i])
			console.log(string,yvar)
		}

		// y-axis labels	
		var mid2=Math.abs((get_coord(yvar[0],chartobject.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,chartobject.shifty)-get_coord(yvar[1],chartobject.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,chartobject.shifty))/2)
		var tempymid=get_coord(yvar[i],chartobject.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,chartobject.shifty,chartobject.ybar)-parseFloat(mid2)		
		var tempy=get_coord(string,chartobject.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,chartobject.shifty,chartobject.ybar)
		console.log(tempy,string,chartobject.ylimits,[ystart_ycoord,yfinal_ycoord],yvar.dtype,yvar,1,chartobject.shifty,chartobject.ybar)

		if(drawy==1){
			if (parseInt(string)>=1000 || parseInt(string)<=-1000){linesj=commas(string)}
			lines=multitext(string,{ident:'yaxis','font-size':chartobject.y_ticks.ytick_textsize,'font-weight':chartobject.y_ticks.ytick_textweight,'font-family':chartobject.y_ticks.ytick_textface,'text-anchor':'end'},maxwidth)
			var temp=snapobj.text(xpixelmin+total_xoffset-chartobject.y_ticks.ytick_to_yaxis,tempy,lines).attr({fill:chartobject.y_ticks.ytick_textfill,ident:'yaxis','font-size':chartobject.y_ticks.ytick_textsize,'font-weight':chartobject.y_ticks.ytick_textweight,'font-family':chartobject.y_ticks.ytick_textface,dy:'0.3em','text-anchor':'end',colorchange:'fill',context:'text_context_menu'})
			temp.selectAll("tspan:not(:first-child)").attr({x:temp.attr('x'),dy:parseInt(chartobject.y_ticks.ytick_textsize)})
			temp.node.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve")
			var coords=temp.getBBox()
		}

		// y-axis ticks, grid lines, and minor grid lines
		var temp_line=snapobj.line(xpixelmin+total_xoffset,tempy,xpixelmax,tempy).attr({stroke:chartobject.y_grids.ygrid_fill,'stroke-width':chartobject.y_grids.ygrid_thickness,'stroke-dasharray':chartobject.y_grids.ygrid_dasharray,opacity:chartobject.y_grids.ygrid_opacity,'shape-rendering':'crispEdges','obj_type':'gridline',graphnum:graphnum})
		if(i!=yvar.length-1){var temp_minorline=snapobj.line(xpixelmin+total_xoffset,tempymid,xpixelmax,tempymid).attr({stroke:chartobject.y_grids.ygrid_minorfill,'stroke-width':chartobject.y_grids.ygrid_minorthickness,opacity:chartobject.y_grids.ygrid_minoropacity,'stroke-dasharray':chartobject.y_grids.ygrid_minordasharray,'shape-rendering':'crispEdges'})}
		var temp_tick=snapobj.line(xpixelmin+total_xoffset,tempy,xpixelmin+total_xoffset-chartobject.y_ticks.ytick_length,tempy).attr({stroke:chartobject.y_ticks.ytick_fill,'stroke-width':chartobject.y_ticks.ytick_thickness,'shape-rendering':'crispEdges'})

		// handle y=0 as appropriate
		if(Object.prototype.toString.call(yvar[i])!='[object Date]'){
			try{
				if(parseFloat(yvar[i].replace(/[^0-9\.\-]+/g,''))=='0'){
					temp_line.attr({stroke:chartobject.y_grids.ygrid_zerofill,'stroke-width':chartobject.y_grids.ygrid_zerothickness,'stroke-dasharray':chartobject.y_grids.ygrid_zerodasharray,zeroline:'1',opacity:chartobject.y_grids.ygrid_zeroopacity})
					if(parseFloat(temp_tick.attr('stroke-width'))!=0){
						temp_tick.attr({'stroke-width':chartobject.y_ticks.ytick_zerothickness,stroke:chartobject.y_ticks.ytick_zerofill})
					}
				}
			} catch(err){}
		}

		if(drawy==1){
			// move the ylabel to the center of the y-axis and rotate
			ylab.attr({y:ystart_ycoord+(yfinal_ycoord-ystart_ycoord)/2})
			ylab.transform('r270')
		}
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
		console.log('year formatting')
		return(date.getUTCFullYear().toString())
	}
	if (range>=4*monthlength){
		console.log('month formatting')
		return(monthlookup[date.getUTCMonth()]+' '+date.getUTCFullYear())
	}
	console.log('day formatting')
	return(monthlookup[date.getUTCMonth()]+' '+date.getUTCDate())
}

function default_style(parameters) {
	// Parameters should be an object with the parameters you want to change like:
	// obj.style({'top_margin':20,'deksize':'10px'}) etc.
	if (parameters===undefined){
		new_s={}
	} else {
		new_s=jQuery.extend(true,{},parameters)
	}

	default_parameters=
	{
		'grapharea':{
			// margins
			'top_margin':25,
			'bottom_margin':20,
			'left_margin':20,
			'right_margin':40,

			// chart formatting
			'chartfill':'#eee',
			'chart_stroke_width':0,
			'chart_stroke_color':'#222',
			'graph_stroke_width':0,
			'graph_stroke_color':'#222',
		},
		'header':{		
			// header formatting
			'headerfill':'#eee',
			'header_toppad':11,
			'header_bottompad':4,
			'header_leftpad':18,
			'header_rightpad':0,
			'hed_to_dek':0,
			'header_stroke_width':0,
			'header_stroke_color':'#222',
		},
		'footer':{
			// footer formatting
			'footerfill':'#46b08e',
			'footer_toppad':5,
			'footer_bottompad':5,
			'footer_leftpad':18,
			'footer_rightpad':14,
			'note_to_source':0,
			'footer_stroke_width':0,
			'footer_stroke_color':'#222',
		},
		'title_text':{
			// hed
			'hedsize':'24px',
			'hedsizemin':'22px',
			'hedweight':600,
			'hedface':'PT Sans',
			'hedtextfill':'black',
			// dek
			'deksize':'18px',
			'deksizemin':'16px',
			'dekweight':400,
			'dekface':'PT Sans',
			'dektextfill':'black',
			'maxdeklines':2,	
		},
		'source_text':{
			// source
			'sourcesize':'12px',
			'sourceweight':400,
			'sourceface':'PT Sans',
			'sourcetextfill':'white',
		},
		'note_text':{
			// note
			'notesize':'12px',
			'noteweight':400,
			'noteface':'PT Sans',
			'notetextfill':'white',
		},
		'legends':{
			// legend
			'legend_maxwidth':.1,
			'legend_textsize':'12px',
			'legend_textweight':400,
			'legend_textface':'PT Sans',
			'legend_textfill':'black',
			'legend_titletextsize':'12px',
			'legend_titletextweight':600,
			'legend_titletextface':'PT Sans',
			'legend_titletextfill':'black',
			'legend_toppad':8,
			'legend_bottompad':6,
			'legend_rightpad':6,
			'legend_leftpad':6,
			'legend_elementsize':15,
			'legend_element_to_text':5,
			'legend_element_to_next':6,
			'legend_section_space':8,
			'legend_floatbackground':'white',
			'legend_floatthickness':1,
			'legend_floatstroke':'#b5b5b5',
		},
		'x_grids':{
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
			'xgrid_opacity':1,
			'xgrid_zeroopacity':1,
			'xgrid_minoropacity':0.5,	
		},
		'y_grids':{
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
			'ygrid_minoropacity':0.5,
		},
		'x_ticks':{
			// x ticks
			'xtick_textsize':'16px',
			'xtick_textweight':400,
			'xtick_textface':'PT Sans',
			'xtick_textfill':'#444',
			'xtick_maxsize':.15,
			'xtick_length':4,
			'xtick_thickness':1,
			'xtick_fill':'#bbb',
			'xtick_to_xlabel':5,
			'xtick_to_xaxis':5,
			'xtick_zerothickness':2,
			'xtick_zerofill':'#bbb',
		},
		'y_ticks':{
			// y ticks
			'ytick_textsize':'16px',
			'ytick_textweight':400,
			'ytick_textface':'PT Sans',
			'ytick_textfill':'#444',
			'ytick_maxsize':.25,
			'ytick_length':16,
			'ytick_thickness':1,
			'ytick_fill':'#bbb',
			'ytick_to_ylabel':6,
			'ytick_to_yaxis':20,
			'ytick_zerothickness':2,
			'ytick_zerofill':'#bbb',
		},
		'x_label':{
			// x label
			'xlabel_textsize':'14px',
			'xlabel_textweight':400,
			'xlabel_textface':'PT Sans',
			'xlabel_textfill':'black',
			'xlabel_maxlength':300,
		},
		'y_label':{
			// y label
			'ylabel_textsize':'14px',
			'ylabel_textweight':400,
			'ylabel_textface':'PT Sans',
			'ylabel_textfill':'black',
			'ylabel_maxlength':300,
		},
		'colormenu':{
			// contextual color menu options
			'colormenu':["#205946","#33836A","#67c2a5","#b7dfd1","#e2f2ed","#ffffff","#8e2a1d","#c63f26","#f58c63","#fbcdbb","#fef1eb","#000000","#24385B","#3F578C","#8c9fca","#ccdaf0","#f1f3f9","#a3a3a3","#e78ac3","#a6d854","#ffd92f","#e5c494","#ece9e8","#c3c3c3"],
		},
		'color_scales':{
			// color scales. Really only sequential and grayscale get used. Toss the others?
			'sequential_color':["#205946","#33836A","#67c2a5","#b7dfd1","#e2f2ed"],
			'qualitative_color':["#67c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f","#e5c494","#b3b3b3"],
			'grayscale_color':['#999999','#666666','#333333','#000000'],
		},
		'data_labels':{
			// data labels
			'datasize':'11px',
			'dataweight':400,
			'dataface':'PT Sans',
			'datatextfill':'black',
		},
		'annotations':{
			// annotations
			'annotatesize':'14px',
			'annotateweight':400,
			'annotateface':'PT Sans',
			'annotatetextfill':'black',
		},
		'callout_style':{
			// callout style
			'callout_color':'#ababab',
			'callout_thickness':1,
			'callout_dasharray':[],
			'arrow_color':'black',
			'arrow_thickness':2,
			'arrow_dasharray':[],
		},
		'logo':{
			// logo
			'logo':"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAA7CAYAAAD8boGtAAAGe0lEQVR4nO2d7XXqOBCG3+zZBtgSvCWwJXBLICWQEkwJuSWQEkgJUEIoISkhlDD7Q57rYSzLY2NJBPSc45OESLY+Xo8seUY8AQARISM1gArAF4DfOQuSkQ2AZfNT8gbg1Py8S56A5AJcAljBNXYlPt/i8QRYAdjDtUmIM4BnAMfoJUrMX4mvtwLwAeAVl+J7RCq4tljCCWwLZxCeAPyCGxGYBYBD8/OuSC3Ar+EkD8MOTlBnAP/h0vofm890e8UU4BLuhiC0N0Z0cgiQ7/JHG24lq+YA3POd78Y8w1nC40C6uajRim4JN0pF5+8UF+lhC/cceHfDioG1+D30XPcFJ8IU6H5I0i+pLaDmnPn6uZACPGUrxSVbtGU5AXhJcdGcFvBRqXBpXW7lJjzBPXcmJbcFfEQeffZ/QRFgeooABUWAhawUARayUgRYyEoRYCErRYCFrBQBFrLSJ8C6OaSf1rr57Lv5nI/v5vMV0rPpKdNn8/kQZDh2gfx1IB8fFdr2PHjO15dviGvr3ofs56n5D+guN23gXM+4nIc//yGiujm+qcuaiD49n/s4EFFFRDAe8ry1Mc+CiF6N5fkYKI+FXSB/bchfkb39JLHrLs9ZE9HeWIZQW0j98LWXTVl8LKUAfeJjPps0C89F9cm/iWhlLPRYAS495Tyo6+kKHwznPHjqfPDUt+9Yq7wfzXl9aTcqrbWDY9Rd94FmKG9F/TdERd120fwRoDy0oCzC8BWirwOuEaC+S1970lV02VlDZVlQtyM2hvLI/Mw3hYU7VYCx6n6NAEN5h0aHVyLyPgO+D/ztY9sckr0h31ik69Kb55rMl0q77knHnNH1Txzzykye/x1xHAxi1f1f+L2wLYTSvzb/f0brAyqPLeCfhExtvN+4FGuFbpDNtbyhrcCQu5B0c7KISTt8DnWcRKaNFUAUs+6AE+3Ysv9qyvMPum5l7F0TNGBzL8O84FLAcwtwKtZOkB1QwSbCCu0KwBG349/HpHB+OKMrtC0MxmxuAZ5x2YlL3IbHs7UM2gJYBKiH31sjR/ufYYzgi7EQrS1AjvXBqegbaI3hDmQr77MCj4r5MS6FAG/BAo5Biyj0GLFCO8TFmnzcNTEEqDvhpwnwiMvJSEiAKSYfd40lJmTsXZ3TCvArqCXGzWI1b2jDEnmSoZ9pFmjFeUL+ycdcdU9KDAHOnT/ECnFiWKUAAdehWoDSMuawfrHqnpQYUXF6yI0RTM0v4vUSwztaS3TNOiRPRjj/Bt1lhVyTj9h1T0oMAeqGmXNoWsC9YZEz63c4sWgLdY1HCJ9XduIG7duSHJOPlHVPRoxJiGygI+btnIM6/wv6d426dvKjJyPyuSrH8Juy7smIIUDZOXMOTbyHHrNFf+fLCcI16EV1tnwsxlRvPnLUPQlzC1Du+Tfl3WIIvaAdWmnnnaeuxfdmJMfSS466J2FOAcoZ2Rnj9xYZemepG7VvaK/hRCK9RaZ2iJ5gsLcw4IbnKRZel8XyrjZH3YHp75HN17QI0FKIGm5POb7wM2yz30XP7z70UOfbv66GuwmOcBMG7qiFSr+D/RWhtHILUc6p1k9f17IPX666jxGgvMYCY9YilZOhdphk58G1Sseu3NIp8ZNsjqggv7dsKO9KpZUu5xW1Dpsf1DqESidOdq3fNX9PDR1grN7S8th5zmNpsxR1X1DXGdni1r8kvzs/kcHJ2CpAC30euj6P3ZC3bE39HTIUD7GnbuP4sIYM8KHLG4oTmVJuLnuow2LVfSgcg/GVzZKvL69ZgKGAJW40qzUYI+4+kaypG8OxH0jPZQ/FaoQO6XJPE84xJigpZHFi1N2KL77kmrwgIu8u+Rtchg4+jXgOuFcquHBHwD1jpdq19O4pgek2cr/3vVuKAG2wAKcuvRR6KAIcRm6kXqzfzBQBDsPrWdpdvzADRYBhZMTbG4rL/ewUAYYpk4/IFAH2I71K3lG+ZiwKRYD9lMlHAooA+2Hrd8Qdfk3qrVAE6Ee73BciUQToR/r8leE3IkWAXfTSSyEiFgH+GPfumWDrVxaeE1AEeMkS7eRDehUXIuEToBZckq9uT0CF9ivpP9F1Gee4W8C5wD/yN7onwydAHdL3Y4KcB+CtLAAnxj1av8cK7VcL8LayhQRIh1SOqPJZPN5D+RZ3ALXCFjD0SHGCPaCqMAMswE/YIqC+4Da1/qnw6zUZvwy0i81l2C0UHon/ARkzCDw40WUEAAAAAElFTkSuQmCC",
			'logoscale':3,
			'logoopacity':1,
			'logo_position':'right',
			'logo_toppad':8,
		},
		'bar_geom':{
			// barchart specific style
			'barchart_width':.8,
			'barchart_opacity':1,
		},
		'line_geom':{
			// line specific style
			'line_types':[[0,0],[5,5],[8,4,2,4],[8,8],[2,5],[8,4,2,3,2,4]],
			'line_minsize':2,
			'line_maxsize':20,
			'line_size':3,
			'line_opacity':1,
			'line_smoothing':0,
		},
		'point_geom':{
			// scatter specific style
			'point_size':4,
			'point_strokewidth':1.7,
			'point_maxsize':25,
			'point_minsize':3,
			'point_fillopacity':.2,
			'point_strokeopacity':1,
		},
		'trend_geom':{
			// trend specific style
			'trend_width':1.5,
			'trend_fill':'#c64027',
			'trend_textface':'PT Sans',
			'trend_textweight':600,
			'trend_textsize':'16px',
			'trend_textcolor':'#c64027',
			'trend_linetotext':3,
			'trend_opacity':1,
			'trend_to_text':4,
		},
		'text_geom':{
			// text geom specific
			'text_minsize':8,
			'text_maxsize':24,
			'text_opacity':1,
			'text_fill':'black',
			'text_face':'Lato',
			'text_weight':400,
			'text_align':'middle',
		},
		'area_geom':{
			// area geom specific
			'area_opacity':1,
		},
		'segment_geom':{
			// segment style
			'segment_width':1,
			'segment_maxsize':20,
			'segment_minsize':1,
			'segment_linetypes':[[0,0],[5,5],[8,4,2,4],[8,8],[2,5]],
			'segment_opacity':1,
		},
		'shade_geom':{
			// shade geom
			'shadefill':'white',
			'shadeopacity':.6,
		},
		'rect_geom':{
			// rect geom
			'categorical_rect_width':.5,
			'rect_opacity':.8,
		},
		'small_multiples':{
			// small multiples
			'vertical_padding':35,
			'horizontal_padding':35,
			'header_textface':'PT Sans',
			'header_textweight':400,
			'header_textsize':'14px',
			'header_textcolor':'black',
			'header_to_graph':8,
		}
	}

	for (var property in default_parameters){
		if(new_s[property]===undefined){
			new_s[property]={}
		}
		for (var subprop in default_parameters[property]){
			if (new_s[property][subprop]===undefined){
				new_s[property][subprop]=default_parameters[property][subprop]
			} else {
				new_s[property][subprop]=new_s[property][subprop]
			}
		}
	}

	return new_s
}








































