// ============================================================
// Pixel-grid skill visualization — replaces the d3 streamgraphs.
// Lifted from prototype-grid.html, then wired into the page's
// existing plumbing: language switching (EN/DE), graphCutoff /
// yearsBack limits, per-skill "render": false opt-outs, and the
// streamgraph tooltip's "% of my work in MM.YYYY" format.
// Layout styles live in css/cv.css under "PIXEL GRID".
// ============================================================

var GRID_CELL_H = 16;     // px per cell height (one skill row)
var GRID_GAP = 1;         // px gap between cells
var GRID_MIN_CELL_W = 3;  // px floor — below this the grid scrolls (mobile)
var GRID_STEP_Y = GRID_CELL_H + GRID_GAP;
var GRID_GLOW_RADIUS = 120; // px radius of the cursor proximity glow

document.documentElement.style.setProperty('--cell-h', GRID_CELL_H + 'px');

// Uniform mode: one color per section, weight carried by opacity alone
var gridMonoColor = false;
var GRID_MONO_COLORS = {
	orange: [192, 90, 60],   // burnt orange
	blue:   [23, 94, 78]     // deep green
};

var GRID_COLORS = {
	orange: [
		[224,122,95],  // coral
		[196,99,122],  // rose
		[155,69,52],   // clay
		[240,160,122],
		[184,74,106],
		[212,149,110],
		[160,56,40],
		[248,213,192]
	],
	blue: [
		[58,158,140],  // seafoam
		[91,191,173],
		[124,207,192],
		[42,126,110],
		[160,223,212],
		[200,240,235],
		[30,122,104],
		[137,197,187]
	]
};

function gridSpanMonths(graphStartYear)
{
	var now = new Date();
	return now.getMonth() + now.getFullYear() * 12 - graphStartYear * 12;
}

// ===== PROCESS JSON INTO GRID DATA =====
// Same weight semantics as the old jsonProcessor.js: scalar weights fill the
// whole period, array weights are linearly interpolated across it, and
// overlapping entries for the same skill sum up.
function ProcessJsonToGrid(json, graphStartYear, language, colorScheme)
{
	var totalMonths = gridSpanMonths(graphStartYear);
	var skillMap = {};
	var skillList = [];
	var colors = GRID_COLORS[colorScheme];
	var skillIndex = 0;
	var now = new Date();

	json.forEach(function(entry)
	{
		var startParts = entry.startDate.split('.');
		var endParts = (entry.endDate === 'aktuell')
			? [now.getMonth(), now.getFullYear()]
			: entry.endDate.split('.');

		var startMonth = Number(startParts[1]) * 12 + Number(startParts[0]) - graphStartYear * 12;
		var diffMonths = (Number(endParts[1]) - Number(startParts[1])) * 12 + (Number(endParts[0]) - Number(startParts[0]));

		entry.skills.forEach(function(skill)
		{
			if (skill.render === false) return;

			if (!skillMap[skill.skillKey])
			{
				skillMap[skill.skillKey] = {
					name: skill.skillKey,
					color: colors[skillIndex % colors.length],
					values: new Array(totalMonths).fill(0),
					contextMap: new Array(totalMonths).fill(null)
				};
				skillList.push(skillMap[skill.skillKey]);
				skillIndex++;
			}

			var s = skillMap[skill.skillKey];
			var ctx = {
				text: skill.context ? (skill.context[language] || '') : '',
				employer: entry.employer ? (entry.employer[language] || '') : ''
			};

			for (var i = 0; i < diffMonths; i++)
			{
				var idx = startMonth + i;
				if (idx < 0 || idx >= totalMonths) continue;

				var w;
				if (Array.isArray(skill.weight))
				{
					var arrLen = skill.weight.length - 1;
					if (arrLen <= 0)
					{
						w = skill.weight[0] || 0;
					}
					else
					{
						var loc = Math.floor(arrLen * i / diffMonths);
						var sw = skill.weight[loc];
						var ew = skill.weight[Math.min(loc + 1, arrLen)];
						var d = (i - loc * (diffMonths / arrLen)) / (diffMonths / arrLen);
						w = sw + d * (ew - sw);
					}
				}
				else
				{
					w = skill.weight;
				}

				s.values[idx] += w;
				if (!s.contextMap[idx]) s.contextMap[idx] = [];
				s.contextMap[idx].push(ctx);
			}
		});
	});

	// Drop skills that fall entirely outside the visible window — the
	// streamgraph flattened these to nothing, but a grid would show an
	// empty labeled row (e.g. "General IT" with a 15-year window).
	return skillList.filter(function(s)
	{
		return s.values.some(function(v) { return v > 0; });
	});
}

// ===== RENDER ONE GRID =====
// Safe to call repeatedly (language switch): clears its containers and
// replaces its wrapper listeners each time.
function DrawPixelGrid(skills, opts)
{
	var grid = document.getElementById(opts.gridId);
	var labels = document.getElementById(opts.labelsId);
	var yearsEl = opts.yearsId ? document.getElementById(opts.yearsId) : null;
	var tooltip = document.getElementById('tooltip');
	var container = grid.parentElement;
	var wrapper = container.parentElement;
	var totalMonths = gridSpanMonths(opts.graphStartYear);
	var numRows = skills.length;
	var isHobby = !!opts.isHobby;

	// Reset from any previous render
	grid.innerHTML = '';
	labels.innerHTML = '';
	if (yearsEl) yearsEl.innerHTML = '';
	var oldNow = container.querySelector('.now-line');
	if (oldNow) oldNow.remove();
	if (wrapper.__gridMove) wrapper.removeEventListener('mousemove', wrapper.__gridMove);
	if (wrapper.__gridLeave) wrapper.removeEventListener('mouseleave', wrapper.__gridLeave);

	// Global max weight for normalization
	var maxW = 0;
	skills.forEach(function(s) { s.values.forEach(function(v) { if (v > maxW) maxW = v; }); });
	if (maxW === 0) maxW = 1;

	// Stretch to the container's full width; on narrow screens clamp to a
	// minimum cell width and let the container scroll horizontally.
	var cellW = Math.max(GRID_MIN_CELL_W, Math.floor(
		(container.clientWidth - (totalMonths - 1) * GRID_GAP) / totalMonths * 100) / 100);
	var stepX = cellW + GRID_GAP;

	grid.style.gridTemplateColumns = 'repeat(' + totalMonths + ', ' + cellW + 'px)';
	grid.style.gridTemplateRows = 'repeat(' + numRows + ', ' + GRID_CELL_H + 'px)';

	var gridW = totalMonths * stepX - GRID_GAP;
	var gridH = numRows * GRID_STEP_Y;

	// Year ticks (experience grid only — the hobby grid shares its axis)
	if (yearsEl)
	{
		yearsEl.style.width = gridW + 'px';
		for (var y = opts.graphStartYear; y <= new Date().getFullYear(); y++)
		{
			var tick = document.createElement('div');
			tick.className = 'year-tick';
			tick.textContent = y;
			tick.style.left = ((y - opts.graphStartYear) * 12 * stepX) + 'px';
			yearsEl.appendChild(tick);
		}
	}

	// Row labels
	skills.forEach(function(s)
	{
		var label = document.createElement('div');
		label.className = 'grid-label';
		label.textContent = s.name;
		labels.appendChild(label);
	});

	// Cells
	var cellElements = [];
	skills.forEach(function(skill, row)
	{
		var rowCells = [];
		for (var col = 0; col < totalMonths; col++)
		{
			var cell = document.createElement('div');
			cell.className = 'grid-cell';
			var w = skill.values[col];

			if (w > 0)
			{
				var norm = Math.min(w / maxW, 1);
				if (gridMonoColor)
				{
					var mc = GRID_MONO_COLORS[opts.colorScheme];
					cell.style.background = 'rgba(' + mc[0] + ',' + mc[1] + ',' + mc[2] + ',' + (0.15 + norm * 0.85) + ')';
				}
				else if (opts.colorScheme === 'blue')
				{
					// Interpolate from light mint to deep seafoam
					var lo = [200, 230, 220];
					var hi = [20, 90, 75];
					var cr = Math.round(lo[0] + norm * (hi[0] - lo[0]));
					var cg = Math.round(lo[1] + norm * (hi[1] - lo[1]));
					var cb = Math.round(lo[2] + norm * (hi[2] - lo[2]));
					cell.style.background = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
				}
				else
				{
					var c = skill.color;
					var opacity = 0.15 + norm * 0.85;
					cell.style.background = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + opacity + ')';
				}
				cell.classList.add('filled');
			}

			grid.appendChild(cell);
			rowCells.push(cell);
		}
		cellElements.push(rowCells);
	});

	var baseColor = opts.colorScheme === 'orange' ? [224, 122, 95] : [58, 158, 140];
	var litCells = [];

	function clearLit()
	{
		litCells.forEach(function(c) { c.style.background = ''; });
		litCells = [];
	}

	function onMove(e)
	{
		var rect = grid.getBoundingClientRect();
		var mouseX = e.clientX - rect.left;
		var mouseY = e.clientY - rect.top;

		clearLit();

		// Proximity glow on empty cells
		var minCol = Math.max(0, Math.floor((mouseX - GRID_GLOW_RADIUS) / stepX));
		var maxCol = Math.min(totalMonths - 1, Math.ceil((mouseX + GRID_GLOW_RADIUS) / stepX));
		var minRow = Math.max(0, Math.floor((mouseY - GRID_GLOW_RADIUS) / GRID_STEP_Y));
		var maxRow = Math.min(numRows - 1, Math.ceil((mouseY + GRID_GLOW_RADIUS) / GRID_STEP_Y));

		for (var r = minRow; r <= maxRow; r++)
		{
			for (var c = minCol; c <= maxCol; c++)
			{
				var cell = cellElements[r][c];
				if (cell.classList.contains('filled')) continue;

				var cx = c * stepX + cellW / 2;
				var cy = r * GRID_STEP_Y + GRID_CELL_H / 2;
				var dist = Math.sqrt(Math.pow(mouseX - cx, 2) + Math.pow(mouseY - cy, 2));
				if (dist > GRID_GLOW_RADIUS) continue;

				var intensity = 1 - (dist / GRID_GLOW_RADIUS);
				var alpha = intensity * intensity * 0.35; // quadratic falloff, subtle
				cell.style.background = 'rgba(' + baseColor[0] + ',' + baseColor[1] + ',' + baseColor[2] + ',' + alpha.toFixed(3) + ')';
				litCells.push(cell);
			}
		}

		var col = Math.floor(mouseX / stepX);
		var row = Math.floor(mouseY / GRID_STEP_Y);

		// Highlight the hovered row's label
		var labelEls = labels.querySelectorAll('.grid-label');
		for (var li = 0; li < labelEls.length; li++)
			labelEls[li].classList.toggle('active', li === row);

		// Tooltip — same content structure as the old streamgraph
		if (row >= 0 && row < numRows && col >= 0 && col < totalMonths)
		{
			var skill = skills[row];
			var w = skill.values[col];
			if (w > 0)
			{
				var nameString = isHobby ? 'Hobby: ' + skill.name : skill.name;
				var dotColor = gridMonoColor ? GRID_MONO_COLORS[opts.colorScheme] : skill.color;
				var html = '<div class="tip-skill"><span class="tip-dot" style="background:rgb(' + dotColor.join(',') + ')"></span>' + nameString + '</div>';

				(skill.contextMap[col] || []).forEach(function(ctxData)
				{
					if (ctxData.employer && !isHobby) html += '<div class="tip-employer">' + ctxData.employer + '</div>';
					if (ctxData.text) html += '<div class="tip-context">' + ctxData.text + '</div>';
				});

				var monthNum = (col % 12) + 1;
				var yearNum = opts.graphStartYear + Math.floor(col / 12);
				var pct = Math.round(w * 10);
				var label = isHobby ? 'of my free time' : 'of my work';
				html += '<div class="tip-date">' + pct + '% ' + label + ' in ' + String(monthNum).padStart(2, '0') + '.' + yearNum + '</div>';

				tooltip.innerHTML = html;
				tooltip.classList.add('visible');
				tooltip.style.left = Math.min(e.clientX + 16, window.innerWidth - 400) + 'px';
				tooltip.style.top = (e.clientY - 10) + 'px';
			}
			else
			{
				tooltip.classList.remove('visible');
			}
		}
		else
		{
			tooltip.classList.remove('visible');
		}
	}

	function onLeave()
	{
		clearLit();
		tooltip.classList.remove('visible');
		var labelEls = labels.querySelectorAll('.grid-label');
		for (var li = 0; li < labelEls.length; li++)
			labelEls[li].classList.remove('active');
	}

	wrapper.__gridMove = onMove;
	wrapper.__gridLeave = onLeave;
	wrapper.addEventListener('mousemove', onMove);
	wrapper.addEventListener('mouseleave', onLeave);

	// "NOW" marker
	var nowIdx = new Date().getMonth() + (new Date().getFullYear() - opts.graphStartYear) * 12;
	var nowLine = document.createElement('div');
	nowLine.className = 'now-line';
	nowLine.style.left = (nowIdx * stepX) + 'px';
	nowLine.style.height = gridH + 'px';
	nowLine.style.top = yearsEl ? '20px' : '0px';
	container.appendChild(nowLine);
}

// ===== ENTRY POINT =====
var __gridRenderArgs = null;

function RenderPixelGrids(experienceJson, hobbyJson, graphStartYear, language)
{
	__gridRenderArgs = [experienceJson, hobbyJson, graphStartYear, language];
	if (!window.__gridResizeHooked)
	{
		window.__gridResizeHooked = true;
		var resizeTimer;
		window.addEventListener('resize', function()
		{
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function()
			{
				RenderPixelGrids.apply(null, __gridRenderArgs);
			}, 150);
		});
	}
	DrawPixelGrid(
		ProcessJsonToGrid(experienceJson, graphStartYear, language, 'orange'),
		{ gridId: 'exp-grid', labelsId: 'exp-labels', yearsId: 'exp-years',
		  colorScheme: 'orange', isHobby: false, graphStartYear: graphStartYear });

	DrawPixelGrid(
		ProcessJsonToGrid(hobbyJson, graphStartYear, language, 'blue'),
		{ gridId: 'hobby-grid', labelsId: 'hobby-labels', yearsId: null,
		  colorScheme: 'blue', isHobby: true, graphStartYear: graphStartYear });
}

// ===== COLOR MODE TOGGLE =====
function ToggleGridColorMode()
{
	gridMonoColor = !gridMonoColor;
	var btn = document.getElementById('color-mode-toggle');
	if (btn) btn.textContent = gridMonoColor ? 'color: uniform' : 'color: by skill';
	if (__gridRenderArgs) RenderPixelGrids.apply(null, __gridRenderArgs);
	return false;
}
