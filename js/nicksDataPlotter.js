function CreateStreamGraph(experienceJson, language)
{

	var graphStartYear = 2003;

	var skillsHash = ProcessJson(experienceJson, graphStartYear, language); 

	DrawStreamGraph(skillsHash, graphStartYear); 

}

