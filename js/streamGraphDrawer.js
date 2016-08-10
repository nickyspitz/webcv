function DrawStreamGraph(skillsHash, graphStartYear, svgName, height, colorSchema)
{

	var stackOffset = "silhouette";
//	silhouette - center the stream, as in ThemeRiver.
//	wiggle - minimize weighted change in slope.
//	expand - normalize layers to fill the range [0,1].
//	zero - use a zero baseline, i.e., the y-axis.

	var areaInterpolation = "basis";

	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });
	var stack = d3.layout.stack()
		.offset(stackOffset)
		.values(function(entry) { return entry.values; });
	var stackedData = stack(skillsData);

	// Random color fun

	var colors = new Array(Object.keys(skillsHash).length);
	var colorBlue = d3.scale.linear().range(["#99ccff", "#2b547e"]);
	var colorYellow = d3.scale.linear().range(["#fff87a", "#c94d14"]);
	var colorGreen = d3.scale.linear().range(["#0A3430", "#1E5846", "#3E7E56", "#6BA55F", "#A4CA64", "#E8ED69"]);


	colors[0] = "#5481AE";
	colors[1] = "#E6A94B";
	colors[2] = "#6CBE6C";
	colors[3] = "#CE5C1D";
	colors[4] = "#8EC0F2";

	if (colorSchema == 'orange')
		colors = ["#E34A33", "#e26234","#FC8D59", "#FDBB84", "#FDD49E", "#FEF0D9"];
	else if (colorSchema == 'green')
		colors = ["#1E5846", "#2D7D12", "#3E7E56", "#6BA55F", "#A4CA64", "#E8ED69"];
	else if (colorSchema == 'blue')
		colors = ["#005EA3", "#0085E5", "#44A0DB", "#35A2FF", "#4FBBFF", "#44A0DB", "#A1DBFF"];
	
	// Initial setup of our svg
	var svg = d3.select(svgName)
		.attr("width", "100%")
		.attr("height", height);
	var width = $(svgName).width();

	var xScale = d3.scale.linear() 
		.domain([0, spanMonths(graphStartYear)-1])
		.range([0, width]);
	
	var yMax = d3.max(stackedData, function(skill) { return d3.max(skill.values, function(month) { return month.y0 + month.y; }); });
	var yScale = d3.scale.linear()
		.domain([0, yMax])
		.range([height, 0 ]);

	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient('bottom')
		.tickSize(400)
		.ticks(2)
		.tickFormat(function(d) { return " " + (graphStartYear + Math.floor(d/12)); });
	
   var yAxis = d3.svg.axis()
		.scale(yScale)
		.orient('left')
		.tickSize(1)
		.ticks(1);
       
	var area = d3.svg.area()
		.interpolate(areaInterpolation)
		.x(function(d) { return xScale(d.x); })
		.y0(function(d) { return yScale(d.y0); })
		.y1(function(d) { return yScale(d.y0 + d.y); });

   svg.selectAll(".layer")
      .data(stackedData)
    	.enter().append("path")
      .attr("class", "layer")
      .attr("d", function(d) { return area(d.values); })
      .style("fill", function(d, i) { return colors[i]; })

	var startYearDiv = d3.select('#startDateSvg');
	startYearDiv.html("01."+graphStartYear)
      	.style("left", ($(svgName).offset().left+2) + "px")		
         .style("top", "0px");

	var endDate = d3.select('#endDateSvg');
	endDate.html(new Date().getMonth() + "." + new Date().getFullYear())
      	.style("left", ($(svgName).offset().left+$(svgName).width()-27)  + "px")		
         .style("top", "0px")
			.style("opacity",0);

	var yFullTime = d3.max(stackedData, function(skill) 
	{ 
		var lastMonth = skill.values[spanMonths(graphStartYear)-1];
		var sum = skill.values[spanMonths(graphStartYear)-1].y + skill.values[spanMonths(graphStartYear)-1].y0; 
	
		if (skill.values[spanMonths(graphStartYear)-1].y != 0)
			return skill.values[spanMonths(graphStartYear)-1].y0 + skill.values[spanMonths(graphStartYear)-1].y; 
		else
			return 0;
	});
	var fullTimePosition = (yFullTime/yMax * height/2);
	var fullTimePosition = 155; // Haven't figured this one out yet!

	var fullTimeMarker = d3.select('#fullTimeMarker');
	fullTimeMarker.html('FULL-TIME WORK')
      	.style("left", ($(svgName).offset().left+$(svgName).width()-70)  + "px")		
         .style("top", (200 - fullTimePosition) + "px")
         .style("width", "80px");
	
 	attachListeners(xScale, graphStartYear, svgName);

}

function ReattachData(experienceJson, startYear, svgName, language)
{

	// Organize and assign data
	//
	var skillsHash = ProcessJson(experienceJson, startYear, language);
	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });

	var stack = d3.layout.stack()
		.offset("zero")
		.values(function(entry) { return entry.values; });
	var stackedData = stack(skillsData);

	d3.select(svgName).selectAll(".layer").data(stackedData);

	var svg = $(svgName);

	var xScale = d3.scale.linear() 
		.domain([0, spanMonths(startYear)])
		.range([0, svg.width()]);
	
	attachListeners(xScale, startYear, svgName);

}

function attachListeners(xScale, graphStartYear, svgName)
{

	var svg = d3.select(svgName);
	var tooltip = d3.select('#tooltip');
	var year = d3.select("#year");
	var startDate = d3.select("#startDateSvg");
	var endDate = d3.select("#endDateSvg");
	var vertical = d3.select("#vertical");

	var allSvgs = ["#svg","#svg-hobby"];

	svg.selectAll(".layer")
    .on("mouseenter", function(d, i) {

      svg.selectAll(".layer")
			.transition()
  	   	.duration(100)
      	.style("opacity", function(d,j) { return j != i ? 0.6 : 1; });

		tooltip.transition()		
        	.duration(200)		
      	.style("opacity", 0.95);		

		var mouseMonth = Math.floor(xScale.invert(d3.mouse(this)[0]));
		var areaColor = d3.rgb(d3.select(this).attr("style"));
		var divHtml = getTooltipText(svgName, d, mouseMonth, areaColor);
		tooltip.html(divHtml)
      	.style("border", "1px " + areaColor.toString() + " solid")		
      	.style("left", $(svgName).offset().left + "px")		
        .style("top", ($("#svg").offset().top+300) + "px")
        .style("height", (30 + (divHtml.split('<br>').length + 1) * 12) + "px");

		adjustDivToFit('.tooltip');

	 })

	.on("mousemove", function(d, i) {
		var areaColor = d3.rgb(d3.select(this).attr("style"));

      d3.select(this)
      .classed("hover", true)
      .attr("stroke", areaColor.darker(1).toString())
      .attr("stroke-width", "0.5px");
      
		var clientRect = svg[0][0].getBoundingClientRect();
		var mouseMonth = Math.floor(xScale.invert(d3.mouse(this)[0]));
		var areaColor = d3.rgb(d3.select(this).attr("style"));

		tooltip.html(getTooltipText(svgName, d, mouseMonth, areaColor))	
		adjustDivToFit('.tooltip');

		year.html(((mouseMonth % 12)+1) + "." + (graphStartYear + Math.floor(mouseMonth/12)));

	})

	.on("mouseleave", function(d, i) {

    d3.select(this)
      .classed("hover", false)
      .attr("stroke-width", "0px");

		d3.selectAll(".layer").transition()
      .duration(250)
      .style("opacity", "1");

		tooltip.transition()		
       	.duration(200)		
      	.style("opacity", 0);		

  	});
	 
	svg.on("mousemove", function(){  
         mousex = d3.event.pageX - 3;
         mousey = d3.mouse(this)[1]+ 20;

         vertical.style("left", mousex + "px" ); 
         vertical.style("opacity", 0.9); 

         year.style("left", mousex + "px" ); 
         year.style("top", "0px" ); 
			year.style("opacity",0.9);
			var mouseMonth = Math.floor(xScale.invert(d3.mouse(this)[0]));
			year.html(((mouseMonth % 12)+1) + "." + (graphStartYear + Math.floor(mouseMonth/12)));

		})
      .on("mouseenter", function(){  
         mousex = d3.event.pageX - 3;
         mousey = d3.mouse(this)[1]+ 20;

      vertical.style("left", mousex + "px"); 
      vertical.style("opacity", 0.9); 

      year.style("left", mousex + "px" ); 
      year.style("top", "0px" ); 
			year.style("opacity",0.9);

      startDate.style("opacity", 1); 
      endDate.style("opacity", 1); 

		  allSvgs.forEach(function(svgId)
			{
				var currentSvg = d3.select(svgId);
				currentSvg.style("border-left","0.5px #dddddd solid");
				currentSvg.style("border-right","0.5px #dddddd solid");
			});	

		})
      .on("mouseleave", function(){  

			year.style("opacity",0);
         vertical.style("opacity", 0); 
         startDate.style("opacity", 0); 
         endDate.style("opacity", 0); 

		  allSvgs.forEach(function(svgId)
			{
				var currentSvg = d3.select(svgId);
				currentSvg.style("border-left","0.5px #fff solid");
				currentSvg.style("border-right","0.5px #fff solid");
			});	

		});

}

function adjustDivToFit(selector)
{
	if ($(selector)[0].clientHeight < $(selector)[0].scrollHeight)
	{
		$(selector)[0].style.height = ($(selector)[0].scrollHeight) + "px";
	}

}


function getTooltipText(svgName, d, mouseMonth, areaColor)
{

	var nameString = d.name;

	if (svgName.indexOf("hobby") != -1)
		nameString = "Hobby: " + nameString;

	var divHtml = "<p class='tooltip-header' style='background:"+areaColor.toString()+"'>" + nameString + "</p>";
	divHtml += "<div style='padding:3px;padding-top:0px;'>";

	d.contexts.forEach(function(context) {
		

		var bold = false;
		if (Array.isArray(d.values[mouseMonth].context))
		{
			if ($.inArray(context, d.values[mouseMonth].context) > -1) 
				bold = true;
		} 
		else
		{
			if (context == d.values[mouseMonth].context) 
				bold = true;
		}

		if (bold) 
		{
			divHtml += "<span class='skill-spotlight'>* " +context.split(';')[2] + "</span> ";	
			divHtml += "<span class='skill-spotlight'>[" +context.split(';')[0] + "]</span> ";	
//			divHtml += "<span class='skill-spotlight'><u>" +context.split(';')[1] + "</u></span> ";	
			divHtml += "<br>";	
		}
		else
			divHtml += "- " + context.split(';')[2] + "<br>";	

	});

	divHtml += "</div>";
   
	return divHtml;

}


