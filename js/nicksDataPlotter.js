
function DrawStreamGraph(experienceJson)
{

	var skillsHash = {};

	var currentDate = new Date();
	var spanMonths = currentDate.getMonth() + currentDate.getFullYear()*12 - (2001*12);

	experienceJson.forEach(function(e) 
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
	
		console.log(startMonth + " " + diffMonths);

		e.skills.forEach(function(skill)
		{

			if (skillsHash[skill.skillKey] == undefined)
			{
				skillsHash[skill.skillKey] = {
					"name" : skill.skillKey,
					"values" : new Array(spanMonths)
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

	console.log(skillsHash);

	var skillsData = Object.keys(skillsHash).map(function(skillKey) { return skillsHash[skillKey]; });
	var width = 960, height = 400;
	
	var xScale = d3.scale.linear() 
		// .domain([0, skillsData.length - 1])
		.domain([0, spanMonths])
		.range([0, width]);
	
	var stack = d3.layout.stack()
		.offset("wiggle")
		.values(function(entry) { return entry.values; });

	var yMax = d3.max(stack(skillsData), function(skill) { return d3.max(skill.values, function(month) { return month.y0 + month.y; }); });

	var yScale = d3.scale.linear()
		.domain([0, yMax])
		.range([height, 0]);
	
	var color = d3.scale.linear().range(["#99ccff", "#2b547e"]);
	
	var area = d3.svg.area()
		.interpolate("bundle")
		.x(function(d) { return xScale(d.x); })
		.y0(function(d) { return yScale(d.y0); })
		.y1(function(d) { return yScale(d.y0 + d.y); });
	
	var svg = d3.select("body").append("svg")
		.attr("width", width)
		.attr("height", height);

	svg.selectAll("path")
		.data(stack(skillsData))
		.enter()
		.append("path")
		.attr("d", function(d) { return area(d.values); })
		.style("fill", function() { return color(Math.random()); });

}
