function DrawStreamGraph(skillsHash, graphStartYear)
{

	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });
	var stack = d3.layout.stack()
		.offset("zero")
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
	
	// Define the div for the tooltip
 	var div = d3.select("body").append("div")	
     .attr("class", "tooltip")				
     .style("opacity", 0);

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
		.interpolate("basis-open")
		.x(function(d) { return xScale(d.x); })
		.y0(function(d) { return yScale(d.y0); })
		.y1(function(d) { return yScale(d.y0 + d.y); });

   svg.selectAll(".layer")
      .data(stackedData)
    	.enter().append("path")
      .attr("class", "layer")
      .attr("d", function(d) { return area(d.values); })
      .style("fill", function(d, i) { return colors[i]; })

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
         .style("top", $('#svg').offset().top + "px")
         .style("height", (30 + (divHtml.split('<br>').length + 1) * 12) + "px");

	 })

	.on("mousemove", function(d, i) {
      d3.select(this)
      .classed("hover", true)
      .attr("stroke", "black")
      .attr("stroke-width", "0.5px");
      
		var clientRect = svg[0][0].getBoundingClientRect();
		var mouseMonth = Math.floor(xScale.invert(d3.mouse(this)[0]));
		var areaColor = d3.rgb(d3.select(this).attr("style"));
		div.html(getTooltipText(d, mouseMonth, areaColor))	

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

//	svg.append('g')
//		.attr('class', 'x axis')
//		.attr('transform', 'translate(10, 0)')
//      .call(xAxis);
//          

}

function ReattachData(experienceJson, language)
{
	var svg = $('#svg');

	var skillsHash = ProcessJson(experienceJson, 2003, language);

	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });
	var stack = d3.layout.stack()
		.offset("zero")
		.values(function(entry) { return entry.values; });
	var stackedData = stack(skillsData);

   d3.selectAll(".layer")
      .data(stackedData)
 
}

function getTooltipText(d, mouseMonth, areaColor)
{
	var ttLineCount = 2;
	var divHtml = "<p class='tooltip-header' style='background:"+areaColor.toString()+"'>" + d.name + "</p>";
	d.contexts.forEach(function(context) {
		if (context == d.values[mouseMonth].context) 
		{
			divHtml += "&nbsp;<b>" +context + "</b><br>";	
		}
		else
		{			
			divHtml += "&nbsp;" + context + "<br>";	
		}
		ttLineCount++;
	});
   
	return divHtml;
}


