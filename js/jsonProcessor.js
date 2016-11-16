
function ProcessJson(experienceJson, graphStartYear, language)
{
	var skillsHash = {};

	var currentDate = new Date();

	experienceJson.forEach(function(e,iExperience) 
	{
		
		startDate = e.startDate.split(".");
		if (e.endDate == 'aktuell')
			endDate = [ currentDate.getMonth(), currentDate.getFullYear() ];
		else 
			endDate = e.endDate.split(".");

		var startMonth = Number(startDate[1])*12 + Number(startDate[0]) - (graphStartYear*12);
		var diffMonths = (Number(endDate[1]) - Number(startDate[1])) * 12 + (Number(endDate[0]) - Number(startDate[0]));
	
		e.skills.forEach( function(skill,iSkill)
		{

			//var contextText = e.title[language] + " at " + e.employer[language] + ": " + skill.context;
			var textEndDate = e.endDate;
			if (textEndDate == "aktuell" && language == "en")
				textEndDate = "current";

			var contextText = e.startDate + " - " + textEndDate + ";;"+ e.title[language] +";;" + skill.context[language];

			if (skillsHash[skill.skillKey] == undefined)
			{
				skillsHash[skill.skillKey] = 
				{
					"name" : skill.skillKey,
					"values" : new Array(spanMonths(graphStartYear)),
					"startMonth" : startMonth,
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
				// Perform linear interpolation of the skill weight over the time of this skill context
				var skillArrayLength = skill.weight.length - 1;
			
				var monthsPerNode = diffMonths / skillArrayLength;
	
				for (i = 0; i < diffMonths; i++)
				{
	
					var location = Math.floor(skillArrayLength * i/diffMonths);
					var skillStartWeight = skill.weight[location];
					var skillEndWeight = skill.weight[location+1];
					var distanceBetweenPoints = (i - location*monthsPerNode)/monthsPerNode;
					var val = skillStartWeight + distanceBetweenPoints * (skillEndWeight - skillStartWeight)
	
					// See if we've already used that skill in another context at this point in time!
					if (skillsHash[skill.skillKey].values[startMonth + i] != undefined)
						addToSkill(skillsHash[skill.skillKey].values[startMonth + i], skill.weight, contextText); 
					else 
						skillsHash[skill.skillKey].values[startMonth + i] = createNewSkill(startMonth + i, val, contextText);

				}

			} 
			else 
			{
				// Apply the same skill weight to the entire period at the job
				for (i = 0; i < diffMonths; i++)
				{
	
					if (skillsHash[skill.skillKey].values[startMonth + i] != undefined)
						addToSkill(skillsHash[skill.skillKey].values[startMonth + i], skill.weight, contextText); 
					else
						skillsHash[skill.skillKey].values[startMonth + i] = createNewSkill(startMonth + i, skill.weight, contextText);

				}
	
			}

		});

	});

	// Fill out our skills hash
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

	return skillsHash;
}


function spanMonths(graphStartYear)
{
	var currentDate = new Date();
	return currentDate.getMonth() + currentDate.getFullYear()*12 - (graphStartYear*12);
}

function addToSkill(skill, weight, contextText)
{

	skill.y += weight;

	if (!Array.isArray(skill.context))
		skill.context = new Array(skill.context);
		
	skill.context.push(contextText);

}

function createNewSkill(x, y, context)
{

	var skill = { 
		"x" : x,
		"y" : y,
		"y0" : 0,
		"context" : context
	};

	return skill;

}
