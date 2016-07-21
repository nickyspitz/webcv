function DrawStreamGraph(skillsHash, graphStartYear)
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
	for (i=0;i<Object.keys(skillsHash).length;i++)
	{
		if (i % 2 == 0)
			colors[i] = colorBlue(Math.random());
		else
			colors[i] = colorYellow(Math.random());
	}

	colors[0] = "#5481AE";
	colors[1] = "#E6A94B";
	colors[2] = "#6CBE6C";
	colors[3] = "#CE5C1D";
	colors[4] = "#8EC0F2";

	colors = ["#E34A33", "#e26234","#FC8D59", "#FDBB84", "#FDD49E", "#FEF0D9"];

	// Initial setup of our svg
	var height = 400;
	var svg = d3.select("#svg")
		.attr("width", "100%")
		.attr("height", height);
	var width = $("svg").width();

	var xScale = d3.scale.linear() 
		.domain([0, spanMonths(graphStartYear)])
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

	attachListeners(xScale, graphStartYear);

}

function ReattachData(experienceJson, startYear, language)
{

	// Organize and assign data
	//
	var skillsHash = ProcessJson(experienceJson, startYear, language);
	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });

	var stack = d3.layout.stack()
		.offset("zero")
		.values(function(entry) { return entry.values; });
	var stackedData = stack(skillsData);

   d3.selectAll(".layer").data(stackedData);

	var svg = $('#svg');

	var xScale = d3.scale.linear() 
		.domain([0, spanMonths(startYear)])
		.range([0, svg.width()]);
	
	attachListeners(xScale, startYear);

}

function attachListeners(xScale, graphStartYear)
{

	var svg = d3.select('#svg');
	var div = d3.select('#tooltip');
	var year = d3.select("#year");

	svg.selectAll(".layer")
    .on("mouseover", function(d, i) {

      svg.selectAll(".layer").transition()
      	.duration(250)
      	.attr("opacity", function(d,j) { return j != i ? 0.6 : 1; });

		div.transition()		
        	.duration(200)		
      	.style("opacity", 0.95);		

		var mouseMonth = Math.floor(xScale.invert(d3.mouse(this)[0]));
		var areaColor = d3.rgb(d3.select(this).attr("style"));
		var divHtml = getTooltipText(d, mouseMonth, areaColor);
		div.html(divHtml)
      	.style("border", "1px " + areaColor.toString() + " solid")		
      	.style("left", $('#svg').offset().left + "px")		
         .style("top", ($('#svg').offset().top+300) + "px")
         .style("height", (30 + (divHtml.split('<br>').length + 1) * 12) + "px");

		if ($('.tooltip')[0].clientHeight < $('.tooltip')[0].scrollHeight)
		{
			$('.tooltip')[0].style.height = ($('.tooltip')[0].scrollHeight) + "px";
		}

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
		div.html(getTooltipText(d, mouseMonth, areaColor))	

		year.html(((mouseMonth % 12)+1) + "." + (graphStartYear + Math.floor(mouseMonth/12)));

	})

	.on("mouseout", function(d, i) {
     svg.selectAll(".layer")
      .transition()
      .duration(250)
      .attr("opacity", "1");

      d3.select(this)
      .classed("hover", false)
      .attr("stroke-width", "0px");

		div.transition()		
        	.duration(200)		
      	.style("opacity", 0);		

  	});
	 
	// Attach listeners
	var vertical = d3.select("#vertical");
	var year = d3.select("#year");

  	d3.select(".streamgraphContainer")
      .on("mousemove", function(){  
         mousex = d3.mouse(this)[0]+ 5;
         mousey = d3.mouse(this)[1]+ 5;

         vertical.style("left", mousex + "px" ); 

         year.style("left", mousex + "px" ); 
         year.style("top", mousey  + "px" ); 

		})
      .on("mouseover", function(){  
         mousex = d3.mouse(this)[0]+ 5;
         mousey = d3.mouse(this)[1]+ 5;

         vertical.style("left", mousex + "px"); 

         year.style("left", mousex + "px" ); 
         year.style("top", mousey  + "px" ); 
			year.style("opacity",0.9);
		})
      .on("mouseout", function(){  
			year.style("opacity",0);
		});


}



function getTooltipText(d, mouseMonth, areaColor)
{
	var ttLineCount = 2;
	var divHtml = "<p class='tooltip-header' style='background:"+areaColor.toString()+"'>" + d.name + "</p>";
	divHtml += "<div style='padding:3px;'>";
	d.contexts.forEach(function(context) {

		if (context == d.values[mouseMonth].context) 
		{
			divHtml += "<b>" +context + "</b><br>";	
		}
		else
		{			
			divHtml += context + "<br>";	
		}
		ttLineCount++;
	});
	divHtml += "</div>";
   
	return divHtml;
}


