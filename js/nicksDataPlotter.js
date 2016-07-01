
function DrawStreamGraph(experienceJson)
{

	var skillsHash = {};

	var currentDate = new Date();
	var spanMonths = currentDate.getMonth() + currentDate.getFullYear()*12 - (2001*12);

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
		var startMonth = Number(startDate[1])*12 + Number(startDate[0]) - (2001*12);
		var diffMonths = (Number(endDate[1]) - Number(startDate[1])) * 12 + (Number(endDate[0]) - Number(startDate[0]));
	
		console.log(iExperience);

		e.skills.forEach(function(skill,iSkill)
		{

			if (skillsHash[skill.skillKey] == undefined)
			{
				skillsHash[skill.skillKey] = {
					"name" : skill.skillKey,
					"values" : new Array(spanMonths),
					"startMonth" : startMonth,
					"order" : iSkill
				};
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
						"y0" : 0
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
						"y0" : 0
					};
				}
	
			}

		});

	});

	// Fill out our skills hash
	console.log(Object.keys(skillsHash));
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
	var color = d3.scale.linear().range(["#99ccff", "#2b547e"]);
	for (i=0;i<Object.keys(skillsHash).length;i++)
	{
		colors[i] = color(Math.random());
	}
	

	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });
	var height = 400;
	
	var svg = d3.select(".streamgraphContainer").append("svg")
		.attr("width", "100%")
		.attr("height", height);

	var width = $("svg").width();

	var xScale = d3.scale.linear() 
		.domain([0, spanMonths])
		.range([0, width]);
	
	var stack = d3.layout.stack()
		.offset("wiggle")
		.values(function(entry) { return entry.values; });

	var stackedData = stack(skillsData);

	var yMax = d3.max(stackedData, function(skill) { return d3.max(skill.values, function(month) { return month.y0 + month.y; }); });

	var yScale = d3.scale.linear()
		.domain([0, yMax])
		.range([height, 0]);
	
	
	var area = d3.svg.area()
		.interpolate("bundle")
		.x(function(d) { return xScale(d.x); })
		.y0(function(d) { return yScale(d.y0); })
		.y1(function(d) { return yScale(d.y0 + d.y); });
	
	svg.selectAll("path")
		.data(stackedData)
		.enter()
		.append("path")
		.attr("d", function(d) { return area(d.values); })
		.style("fill", function(d,i) { return colors[i]; });

	var labeling = svg.selectAll("text")
		.data(stackedData)
		.enter()
		.append("text");

	var xLabel = 120;
	var labels = labeling
		.attr("x", function(d) { return xScale(d.startMonth);})
		.attr("y", function(d,i) { 
			//return yScale(d.values[d.startMonth].y0 + (d.values[d.startMonth].y + d.values[d.startMonth].y0)/2); 
			return yMax+5 + d.order*20;
		})
		.text(function(d) { return d.name;})
		.attr("fill", function(d,i) { return colors[i]; });

}
