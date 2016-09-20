/////////////////////////// LOAD DATA //////////////////////////////////
// loadData executes when the data text field changes. It figures out
// the appropriate delimiter, guesses if each field is text or numeric,
// and puts the data into an array. If there is a problem with the data,
// the user is warned by the hidden alertbox element. When data is
// successfully loaded, loaded_data is set to 1 - this global be used as
// a check for graphing functions.

function gen_coerce_array() {
	var coerce_array=[]
	var temp=$('.dataselect select')
	for(var i=0;i<temp.length;i++){
		coerce_array.push($(temp[i]).val())
	}

	loadData(coerce_array)
}

function loadData(coerce_array) {
	if (coerce_array===undefined){
		coerce_array=[]
	}

	var alerted=1
	alertbox=document.getElementById('bad_data')
	alertbox.style.display='none'
	var delimit=null
	d=document.getElementById('data_text').value
	// d=d.trim()
	d=d.split('\n')

	for(var i=d.length-1;i>0;i--){
		if(d[i]===''){
			d.splice(i,1)
		}
	}

	// detect and set the delimiter. If you ever want to add more delimiters...
	if (d[0].indexOf('	')>-1) {delimit='	'} else if (d[0].indexOf(',')>-1) {delimit=','}
	console.log('delimiter: ',delimit)

	// Does every row have the same number of columns?
	var columns=d[0].split(delimit).length
	console.log('columns: ',columns)
	var flag=0
	for (var i=0;i<d.length;i++) {
		if (d[i].split(delimit).length!=columns){
			console.log(i+' has wrong number of columns: ',d[i].split(delimit))
			var flag=1
		}
	}

	// Either no delimiter was found or not all rows are the same size
	if (flag==1 || delimit==null) { 
		alertbox.className = "alert alert-danger";
		alertbox.innerHTML = "<b>There is something wrong with your data. I can't continue until you fix it. Check and make sure that:</b><ul><li>All rows have the same number of columns</li><li>Your data is either pasted directly from Excel OR is comma delimited OR is tab delimited</li><li>If your data is comma delimited, make sure that every comma is a delimiter (and ditto if your delimiter is tabs).</li></ul>"
		alertbox.style.display='block'
		return
	}

	// if we get this far, the delimiter must look ok, next step is to figure out if each column 
	// is text/date/numbers and remove formatting crap if they are numbers. For now, the only test
	// of whether something is text is does it contain an alpha character and not date.
	for (var i=0; i<d.length;i++) {
		d[i]=d[i].split(delimit)
	}

	var alpha=/[A-Za-z]/
	var column_types=[]

	// loop through columns and data points, check each one for dates. *ALL* datapoints must be
	// dates to qualify. If the column is not a date, check to see if it is numeric/text. A non-date
	// column is flagged as text if any alpha characters are found. 

	// As of Playfair 2.0, this is a little more flexible. Missing data is omitted for the purpose
	// of deciding what a column is.

	if(coerce_array.length==0){
		for (var i=0; i<columns;i++) {
			var date=true
			var type='numeric'
			for (var j=1;j<d.length;j++) {
				var missing=0
				if(isNaN(parseFloat(d[j][i]))==true && d[j][i]==''){var missing=1}
				if (missing!=1 && moment(d[j][i], ["MM-DD-YYYY","MM/DD/YYYY","YYYY-MM-DD","MM-DD-YY","MM/DD/YY","MMMM YYYY","MMMM DD YYYY","MMMM DD, YYYY","MMMM, YYYY","MM/YYYY","MM-YYYY","YYYYqQ"],true).isValid()==false){
					var date=false
				}
				if (d[j][i].search(alpha)>-1) {type='text'} else {
					// clean numeric junk
					if(date==false){
						d[j][i] = d[j][i].replace(/[^0-9\.-]+/g, "")
					}
				}
			}
			if (date==true){
				type='date'
			}
			column_types.push(type)
		}
	} else{
		for (var i=0; i<columns;i++) {
			if(coerce_array[i]=='date'){
				type='date'
			} else if (coerce_array[i]=='text'){
				type='text'
			} else if (coerce_array[i]=='numeric'){
				type='numeric'
				for(var j=1;j<d.length;j++){
					d[j][i] = d[j][i].replace(/[^0-9\.-]+/g, "")
				}
			}
			column_types.push(type)
		}
	}

	// Now loop through all numeric columns and if any have turned into NaN remove that row.
	// If all are NaN, send a red alert. If any are NaN but not all, send a yellow alert with 
	// number of observations found and type of each column. If none are NaN, send green alert
	// with number of observations and type of each column. For dates, remove blanks or things
	// that become blanks when you remove all text.
	var observations=d.length-1
	var column_observations=[]
	var red_flag=0
	var yellow_flag=0
	var numeric=/[0-9]/
	var missing_array=[]

	for (var i=0;i<column_types.length;i++) {
		if (column_types[i]=='numeric') {
			var column_obs=observations
			for (var j=1;j<d.length;j++) {
				if (d[j][i].search(numeric)==-1) {
					column_obs=column_obs-1
					// if(missing_array.indexOf(j)==-1){
					// 	missing_array.push(j)
					// }
				}
			}
			if (column_obs==0) {red_flag=1}
			if (column_obs!=observations) {yellow_flag=1}
			column_observations.push(column_obs)
		} else if (column_types[i]=='date') {
			var column_obs=observations
			for (var j=1;j<d.length;j++){
				if (d[j][i].search(numeric)==-1) {
					column_obs=column_obs-1
					// if(missing_array.indexOf(j)==-1){
					// 	missing_array.push(j)
					// }
				}
			}
			if (column_obs==0) {red_flag=1}
			if (column_obs!=observations) {yellow_flag=1}
			column_observations.push(column_obs)
		} else {
			column_observations.push(observations)
		}
	}

	// for (var i=missing_array.length-1;i>0;i--){
	// 	d.splice(missing_array[i],1)
	// }

	// Final alerts section
	if (red_flag==1) {
		alertbox.className = "alert alert-warning";
		alertbox.innerHTML = "<b>One or more of your columns has no observations. You can still use this dataset but I dropped that column. I might also have dropped some rows with missing data. Here's what I think about each of your columns:</b><ul>"
		for (i=0;i<column_types.length;i++) {
			if(column_types[i]=='text'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caraty"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric">numeric</option><option value="date">date</option><option value="text" selected>text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			} else if(column_types[i]=='numeric'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caraty"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric" selected>numeric</option><option value="date">date</option><option value="text">text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			} else if(column_types[i]=='date'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caraty"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric">numeric</option><option value="date" selected>date</option><option value="text">text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			}
		}
		alertbox.style.display='block'
	}

	if (yellow_flag==1 && red_flag==0) {
		alertbox.className = "alert alert-warning";
		alertbox.innerHTML = "<b>Some of your columns are missing data. These rows will be kept but could cause problems. Here's what I think about each of your columns:</b><ul>"
		for (i=0;i<column_types.length;i++) {
			if(column_types[i]=='text'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caraty"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric">numeric</option><option value="date">date</option><option value="text" selected>text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			} else if(column_types[i]=='numeric'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caraty"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric" selected>numeric</option><option value="date">date</option><option value="text">text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			} else if(column_types[i]=='date'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caraty"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric">numeric</option><option value="date" selected>date</option><option value="text">text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			}
		}
		alertbox.style.display='block'
	}

	if (red_flag==0 && yellow_flag==0) {
		alertbox.className = "alert alert-success";
		alertbox.innerHTML = "<b>Your data looks good. Just to make sure, here's what I think about each of your columns:</b>"
		for (i=0;i<column_types.length;i++) {
			if(column_types[i]=='text'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caratg"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric">numeric</option><option value="date">date</option><option value="text" selected>text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			} else if(column_types[i]=='numeric'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caratg"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric" selected>numeric</option><option value="date">date</option><option value="text">text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			} else if(column_types[i]=='date'){
				alertbox.innerHTML = alertbox.innerHTML + '<ul><li>The <b>'+d[0][i]+'</b> column is a <div class="dataselect"><span class="small_caratg"><select id="coerce'+i+'" onchange=gen_coerce_array()><option value="numeric">numeric</option><option value="date" selected>date</option><option value="text">text</option></select></span></div> column, and it has '+column_observations[i]+' observations in it.</li></ul>';
			}
		}
		alertbox.style.display='block'
	}

	// Some final cleaning to drop columns/rows if necessary and parse all numbers as floats
	// The final return should be a dictionary where every column is a key and values are in an array
	final_data={}
	for (i=0;i<column_observations.length;i++){
		if (column_observations[i]==0){
			for (j=0;j<d.length;j++){
				d[j].splice(i,1)
			}
		}
		// if (column_observations[i]>0 && column_observations[i]!=observations){
		// 	for (j=1;j<d.length;j++){
		// 		if (d[j][i].search(numeric)==-1){
		// 			d.splice(j,1)
		// 		}
		// 	}
		// }
	}

	for (i=0;i<d[0].length;i++){
		final_data[d[0][i]]=[]

		// attach data type property to each column
		final_data[d[0][i]].dtype=column_types[i]

		for (j=1;j<d.length;j++) {
			if (column_types[i]=='text'){
				final_data[d[0][i]].push(d[j][i])
			} else if (column_types[i]=='numeric') {
				if(d[j][i]==''){
					console.log('MISSING')
					final_data[d[0][i]].push(d[j][i])
				} else {
					final_data[d[0][i]].push(parseFloat(d[j][i]))
				}
			} else if (column_types[i]=='date' & coerce_array[i]=='date'){
				if(d[j][i]==''){
					final_data[d[0][i]].push(d[j][i])
				} else {
					final_data[d[0][i]].push(new Date(d[j][i]))
				}
			} else if (column_types[i]=='date') {
				if(d[j][i]==''){
					final_data[d[0][i]].push(d[j][i])
				} else {
					final_data[d[0][i]].push(new Date(d[j][i]))
				}
			}
		}
	}

	loaded_data=1

	// create row_data
	datadict=[]
	for(var key in final_data){
		var items=final_data[key].length
	}
	for(var i=0;i<items;i++){
		var row={}
		for(var key in final_data){
			row[key]=final_data[key][i]
		}
		datadict.push(row)
	}

	// Call populate_variables to update all variable dropdowns with the variables in the data
	$(".variable_select").trigger('change')
	populate_variables(final_data)
	console.log(final_data)
	return final_data
}

function populate_variables(final_data) {
	$(".variable_select").prop('disabled',false)
	$(".variable_select").each(function(index){
		var temp=$(this).val()
		$(this)
			.find('option')
			.remove()
			.end()
			.append('<option value="none">Nothing selected</option>')
			.val('none')

		for (var key in final_data) {
			$(this)
				.append($("<option></option>")
				.attr("value",key)
				.text(key));
		}

		try{
			if($(' option[value="'+temp+'"]',this).length>0){
				$(this).val(temp)
			} else {
				$(this).val('none')
			}
		} catch(err){
			$(this).val('none')
		}
	})
}

///////////////////////// END LOAD DATA ////////////////////////////////
////////////////////////////////////////////////////////////////////////