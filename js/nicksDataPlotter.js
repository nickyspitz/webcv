
function DrawStreamGraph(experienceJson, language)
{

	var graphStartYear = 2003;
	var skillsHash = {};

	var currentDate = new Date();
	var spanMonths = currentDate.getMonth() + currentDate.getFullYear()*12 - (graphStartYear*12);

	experienceJson.forEach(function(e,iExperience) 
	{
		
		startDate = e.startDate.split(".");
		if (e.endDate == 'aktuell')
		{
			endDate = [ currentDate.getMonth(), currentDate.getFullYear() ];
		} 
		else 
		{
			endDate = e.endDate.split(".");
		}
		var startMonth = Number(startDate[1])*12 + Number(startDate[0]) - (graphStartYear*12);
		var diffMonths = (Number(endDate[1]) - Number(startDate[1])) * 12 + (Number(endDate[0]) - Number(startDate[0]));
	
		e.skills.forEach(function(skill,iSkill)
		{

			//var contextText = e.title[language] + " at " + e.employer[language] + ": " + skill.context;
			var contextText = e.startDate + " - " + e.endDate + ": " + skill.context;

			if (skillsHash[skill.skillKey] == undefined)
			{
				skillsHash[skill.skillKey] = {
					"name" : skill.skillKey,
					"values" : new Array(spanMonths),
					"startMonth" : startMonth,
					"order" : iSkill,
					"contexts" : [ contextText ] 
				};
			} 
			else 
			{
				if (!(skill.context in skillsHash[skill.skillKey].contexts))
				{
					skillsHash[skill.skillKey].contexts.push( contextText );
				}
			}

			if (Array.isArray(skill.weight))
			{

				var skillArrayLength = skill.weight.length - 1;
			
				var monthsPerNode = diffMonths / skillArrayLength;
	
				for (i = 0; i < diffMonths; i++)
				{
	
					// Linear interpolation fun
					var location = Math.floor(skillArrayLength * i/diffMonths);
					var skillStartWeight = skill.weight[location];
					var skillEndWeight = skill.weight[location+1];
					var distanceBetweenPoints = (i - location*monthsPerNode)/monthsPerNode;
					var val = skillStartWeight + distanceBetweenPoints * (skillEndWeight - skillStartWeight)
	
					skillsHash[skill.skillKey].values[startMonth + i] = 
					{ 
						"x" : startMonth + i,
						"y" : val,
						"y0" : 0,
						"context" : contextText
					};
				}
	

			} 
			else 
			{
				// Apply the same skill weight to the entire period at the job
				for (i = 0; i < diffMonths; i++)
				{
	
					skillsHash[skill.skillKey].values[startMonth + i] = 
					{ 
						"x" : startMonth + i,
						"y" : skill.weight,
						"y0" : 0,
						"context" : contextText
					};
				}
	
			}

		});

	});

	// Fill out our skills hash
	// console.log(Object.keys(skillsHash));
	Object.keys(skillsHash).forEach(function(skillKey)
	{

		for (i=0; i<skillsHash[skillKey].values.length; i++)
		{

			if (skillsHash[skillKey].values[i] == undefined)
			{
				skillsHash[skillKey].values[i] = {
					"x" : i,
					"y" : 0,
					"y0" : 0
				};
			}
		}
	});

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
	

	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });
	var height = 400;
	
	var svg = d3.select(".streamgraphContainer").append("svg")
		.attr("width", "100%")
		.attr("height", height);

	var width = $("svg").width();

// Define the div for the tooltip
 	var div = d3.select("body").append("div")	
     .attr("class", "tooltip")				
     .style("opacity", 0);

	var xScale = d3.scale.linear() 
		.domain([0, spanMonths])
		.range([0, width]);
	
	var stack = d3.layout.stack()
		.offset("zero")
		.values(function(entry) { return entry.values; });

	var stackedData = stack(skillsData);

	var yMax = d3.max(stackedData, function(skill) { return d3.max(skill.values, function(month) { return month.y0 + month.y; }); });

	var yScale = d3.scale.linear()
		.domain([0, yMax])
		.range([height, 0 ]);
	
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient('bottom')
		.tickSize(0.5)
		.ticks(6)
		.tickFormat(function(d) { return " " + (graphStartYear + Math.floor(d/12)); });
	
              //.tickFormat(d3.time.format("%Y"));

          var yAxis = d3.svg.axis()
              .scale(yScale)
              .orient('left')
              .tickSize(1)
              .ticks(1);
          
//          svg.append('g')
//              .attr('class', 'y axis')
//              .attr('transform', 'translate(50, 0)')
//              .call(yAxis);

	var area = d3.svg.area()
		.interpolate("basis-open")
		.x(function(d) { return xScale(d.x); })
		.y0(function(d) { return yScale(d.y0); })
		.y1(function(d) { return yScale(d.y0 + d.y); });
	
	svg.selectAll("path")
		.data(stackedData)
		.enter()
		.append("path")
		.attr("d", function(d) { return area(d.values); })
		.style("fill", function(d,i) { return colors[i]; });

//	var labeling = svg.selectAll("text")
//		.data(stackedData)
//		.enter()
//		.append("text");
//
//	var xLabel = 120;
//	var labels = labeling
//		.attr("x", function(d) { return xScale(d.startMonth);})
//		.attr("y", function(d,i) { 
//			//return yScale(d.values[d.startMonth].y0 + (d.values[d.startMonth].y + d.values[d.startMonth].y0)/2); 
//			return yMax+5 + d.order*20;
//		})
//		.text(function(d) { return d.name;})
//		.attr("fill", function(d,i) { return colors[i]; });
//
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
      	.attr("opacity", 0.6);
      	//.attr("opacity", function(d, j) { return j != i ? 0.6 : 1; });


		$('.streamgraph-text').html('Skill: <b>' + d.name + '</b>');

		div.transition()		
        	.duration(200)		
      	.style("opacity", .9);		

		var mouseMonth = Math.floor(xScale.invert(d3.mouse(this)[0]));
		var divHtml = getTooltipText(d, mouseMonth);
      
		div.html(divHtml)	
      	.style("left", (d3.event.pageX) + "px")		
         .style("top", (d3.event.pageY - 78) + "px")
         .style("height", (5 + (divHtml.split('<br>').length + 1) * 12) + "px");


	 })

	.on("mousemove", function(d, i) {
      d3.select(this)
      .classed("hover", true)
      .attr("stroke", "black")
      .attr("stroke-width", "0.5px");
      
		var mouseMonth = Math.floor(xScale.invert(d3.mouse(this)[0]));
		var divHtml = getTooltipText(d, mouseMonth);
   
		div.html(divHtml)	
      	.style("left", (d3.event.pageX) + "px")		
         .style("top", (d3.event.pageY - 78) + "px");

    })

	.on("mouseout", function(d, i) {
     svg.selectAll(".layer")
      .transition()
      .duration(250)
      .attr("opacity", "1");

      d3.select(this)
      .classed("hover", false)
      .attr("stroke-width", "0px");

		$('.streamgraph-text').html('Skills (to pay the bills)!');

		div.transition()		
        	.duration(200)		
      	.style("opacity", 0);		

  	});

	svg.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(10, 380)')
      .call(xAxis);
          
}

function getTooltipText(d, mouseMonth)
{
	var ttLineCount = 2;
	var divHtml = "<b>" + d.name + "</b><br/><br/>";
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
   
	return divHtml;
}
