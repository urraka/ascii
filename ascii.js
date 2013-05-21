(function(){

var fps = 0;
var screen = null;
var running = false;

ascii = {};

ascii.dom = function() { return screen.dom; }
ascii.fps = function() { return fps; }

ascii.setup = function(options)
{
	if (options.videoMode)
	{
		var videoMode = options.videoMode;

		screen = {
			width: 0,
			height: 0,
			buffer: [],
			dom: document.createElement("pre")
		};

		screen.dom.className = "ascii";
		screen.width  = videoMode.width;
		screen.height = videoMode.height;
		screen.buffer.length = screen.width * screen.height;

		if (videoMode.color)
		{
			screen.colors = [];
			screen.spans  = [];
			screen.colors.length = screen.width * screen.height;
			screen.spans.length  = screen.width * screen.height;
		}

		var str = "";

		for (var y = 0; y < screen.height; y++)
		{
			for (var x = 0; x < screen.width; x++)
			{
				var i = y * screen.width + x;

				screen.buffer[i] = " ";

				if (videoMode.color)
				{
					screen.colors[i] = "#000";
					screen.spans[i] = document.createElement("span");
					screen.spans[i].style.color = screen.colors[i];
					screen.spans[i].appendChild(document.createTextNode(screen.buffer[i]));
					screen.dom.appendChild(screen.spans[i]);
				}
				else
				{
					str += screen.buffer[i];
				}
			}

			if (videoMode.color)
				screen.dom.appendChild(document.createTextNode("\n"));
			else
				str += "\n";
		}

		if (!videoMode.color)
			screen.dom.appendChild(document.createTextNode(str));
	}
}

ascii.start = function(callbacks)
{
	running = true;

	var requestFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback) { setTimeout(callback, 1000 / 60); };

	var fpsCount = 0;
	var fpsTime = 0;

	var maxFrameTime = 250;

	var t = 0;
	var dt = 30;
	var accumulator = 0;
	var currentTime = Date.now();

	function frame()
	{
		var newTime = Date.now();
		var frameTime = newTime - currentTime;

		fpsTime += frameTime;

		if (fpsTime >= 1000)
		{
			fpsTime -= 1000;
			fps = fpsCount;
			fpsCount = 0;
		}

		if (frameTime > maxFrameTime)
			frameTime = maxFrameTime;

		currentTime = newTime;
		accumulator += frameTime;

		while (accumulator >= dt)
		{
			callbacks.update(dt / 1000);
			t += dt;
			accumulator -= dt;
		}

		callbacks.draw(accumulator / dt);

		ascii.show();
		fpsCount++;

		if (running)
			requestFrame(frame);
	}

	frame();
}

ascii.stop = function()
{
	running = false;
}

ascii.clear = function(ch, color)
{
	var hasColor = !!screen.colors;

	ch = ch || " ";
	color = color || "#000";

	var size = screen.width * screen.height;

	for (var i = 0; i < size; i++)
	{
		screen.buffer[i] = ch;

		if (hasColor)
			screen.colors[i] = color;
	}
}

ascii.put = function(image, x, y)
{
	var hasColor = !!screen.colors;

	var xPos = x - image.center.x;
	var yPos = y - image.center.y;

	var wScreen = screen.width;
	var hScreen = screen.height;
	var wImage  = image.width;
	var hImage  = image.height;

	var x0 = Math.max(xPos, 0);
	var y0 = Math.max(yPos, 0);
	var x1 = Math.min(xPos + wImage, wScreen);
	var y1 = Math.min(yPos + hImage, hScreen);

	for (var y = y0; y < y1; y++)
	{
		for (var x = x0; x < x1; x++)
		{
			var idxImage = (y - yPos) * wImage + (x - xPos);
			var idxScreen = y * wScreen + x;

			if (image.buffer[idxImage] !== 0)
			{
				screen.buffer[idxScreen] = image.buffer[idxImage];

				if (hasColor)
					screen.colors[idxScreen] = image.colors ? image.colors[idxImage] : "#000";
			}
		}
	}
}

ascii.show = function()
{
	var hasColor = !!screen.colors;

	var w = screen.width;
	var h = screen.height;

	var str = "";

	for (var y = 0; y < h; y++)
	{
		var row = "";

		for (var x = 0; x < w; x++)
		{
			var i = y * w + x;

			if (hasColor)
			{
				var span = screen.spans[i];
				span.style.color = screen.colors[i];
				span.childNodes[0].nodeValue = screen.buffer[i];
			}
			else
			{
				row += screen.buffer[i];
			}
		}

		if (!hasColor)
			str += row + "\n";
	}

	if (!hasColor)
		screen.dom.childNodes[0].nodeValue = str;
}

ascii.flip = function(image, transform, axis)
{
	axis = axis || "x";
	transform = transform || ["", ""];

	var result = {
		width: image.width,
		height: image.height,
		buffer: [],
		center: { x: 0, y: 0 }
	};

	result.buffer.length = image.buffer.length;

	if (image.colors)
	{
		result.colors = [];
		result.colors.length = result.buffer.length;
	}

	result.center.x = axis === "x" ? image.width  - image.center.x - 1 : image.center.x;
	result.center.y = axis === "y" ? image.height - image.center.y - 1 : image.center.y;

	if (transform.length < 2)
		transform = ["", ""];

	if (transform[0].length !== transform[1].length)
	{
		var length = Math.min(transform[0].length, transform[1].length);

		transform[0] = transform[0].substr(0, length);
		transform[1] = transform[1].substr(0, length);
	}

	for (var y = 0; y < image.height; y++)
	{
		for (var x = 0; x < image.width; x++)
		{
			var xDest = axis === "x" ? image.width  - x - 1 : x;
			var yDest = axis === "y" ? image.height - y - 1 : y;

			var dest = yDest * image.width + xDest;
			var source = y * image.width + x;

			var ch = image.buffer[source];
			var chDest = ch;

			var i = transform[0].indexOf(ch);

			if (i !== -1)
			{
				chDest = transform[1][i];
			}
			else
			{
				i = transform[1].indexOf(ch);

				if (i !== -1)
					chDest = transform[0][i];
			}

			result.buffer[dest] = chDest;

			if (image.colors)
				result.colors[dest] = image.colors[source];
		}
	}

	return result;
}

ascii.load = function(text)
{
	var result = {};

	var mode = "directive"; // directive|data|color
	var nextMode = null;
	var lines = text.replace(/\r/g, "").split("\n");
	var iLine = 0;
	var nLines = lines.length;

	var transparent = " ";
	var fill = "transparent";
	var center = { x: 0, y: 0 };

	var iImage = 0; // for generating id's

	var image = {
		id: "",
		lines: [],
		firstLine: 0,

		parse: function(type)
		{
			if (lines.length === 0)
				return;

			if (type === "data")
			{
				var buffer = [];
				var width = 0;
				var height = this.lines.length;

				for (var i = 0; i < this.lines.length; i++)
				{
					if (this.lines[i].length > width)
						width = this.lines[i].length;
				}

				buffer.length = width * height;

				for (var y = 0; y < height; y++)
				{
					var row = this.lines[y];

					for (var x = 0; x < row.length; x++)
						buffer[y * width + x] = (row[x] === transparent ? 0 : row[x]);

					for (var x = row.length; x < width; x++)
						buffer[y * width + x] = (fill === "transparent" ? 0 : fill);
				}

				result[this.id] = {
					"buffer": buffer,
					"width": width,
					"height": height,
					"center": { x: center.x, y: center.y }
				};
			}
			else if (type === "color" && result[this.id])
			{
				var img = result[this.id];
				img.colors = [];
				img.colors.length = img.width * img.height;

				var defaultColor = "#000";
				var re = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

				for (var y = 0; y < this.lines.length; y++)
				{
					var rowColors = this.lines[y].split(" ");
					var x = 0;

					for (var i = 0; i < rowColors.length && x < img.width; i++)
					{
						var valid = true;
						var repeat = 1;
						var color = rowColors[i].trim();
						var bracketPos = color.indexOf("{");

						if (bracketPos !== -1)
						{
							repeat = color.substr(bracketPos);
							color = color.substr(0, bracketPos);

							if (repeat[repeat.length - 1] === "}")
							{
								repeat = parseInt(repeat.substr(1, repeat.length - 2), 10);

								if (!isNaN(repeat))
									repeat = Math.max(1, repeat);
								else
									valid = false;
							}
							else
								valid = false;
						}

						if (!re.test(color))
							valid = false;

						if (valid)
						{
							for (var j = 0; j < repeat && x < img.width; j++, x++)
								img.colors[y * img.width + x] = color;

							defaultColor = color;
						}
						else
							console.log("warning: bad syntax on line " + (this.firstLine + y) + ", color #" + i);
					}

					while (x < img.width)
					{
						img.colors[y * img.width + x] = defaultColor;
						x++;
					}
				}

				for (var y = this.lines.length; y < img.height; y++)
				{
					for (var x = 0; x < img.width; x++)
						img.colors[y * img.width + x] = defaultColor;
				}
			}
		}
	}

	while (iLine < nLines)
	{
		var line = lines[iLine];

		if (mode === "directive")
		{
			if (line === "" && nextMode !== null)
			{
				mode = nextMode;
				nextMode = null;
			}
			else if (line.length > 0 && line[0] === "@")
			{
				if (line.indexOf("@image ") === 0)
				{
					var id = line.substr("@image ".length).trim().split(" ")[0];

					if (id === "")
						id = "image" + (iImage++);

					if (result[id])
						console.log("warning: non-unique id found on line " + iLine + ", image \"" + id + "\" will be replaced.");

					nextMode = "data";
					image.id = id;
					image.lines.length = 0;
				}
				else if (line.indexOf("@color ") === 0)
				{
					var id = line.substr("@color ".length).trim().split(" ")[0];

					nextMode = "color";
					image.id = id;
					image.lines.length = 0;

					if (id === "" || !result[id])
						console.log("warning: color directive for unknown image on line " + iLine);
				}
				else if (line.indexOf("@transparent ") === 0 && line.length === "@transparent ".length + 1)
				{
					transparent = line[line.length - 1];
				}
				else if (line.indexOf("@fill ") === 0)
				{
					var ch = line.substr("@fill ".length);

					if (ch.length === 1 || ch === "transparent")
						fill = ch;
					else
						console.log("warning: bad syntax on line " + iLine);
				}
				else if (line.indexOf("@center ") === 0)
				{
					var valid = false;
					var center = line.substr("@center ".length).split(",");

					if (center.length === 2)
					{
						var cx = parseInt(center[0], 10);
						var cy = parseInt(center[1], 10);

						if (!isNaN(cx) && !isNaN(cy))
						{
							valid = true;
							center.x = cx;
							center.y = cy;
						}
					}

					if (!valid)
						console.log("warning: bad syntax on line " + iLine);
				}
				else
				{
					console.log("warning: bad syntax on line " + iLine);
				}
			}
			else if (line.length > 0 && line[0] !== "#")
			{
				console.log("warning: bad syntax on line " + iLine);
			}
		}
		else if (mode === "data" || mode === "color")
		{
			if (line === "" && nextMode !== null)
			{
				image.parse(mode);
				mode = nextMode;
				nextMode = null;
			}
			else if (line !== "")
			{
				nextMode = "directive";

				if (image.lines.length === 0)
					image.firstLine = iLine;

				image.lines.push(line);
			}
		}

		iLine++;
	}

	if (mode === "data" || mode === "color")
		image.parse(mode);

	return result;
};

// https://developer.mozilla.org/en/docs/JavaScript/Reference/Global_Objects/String/trim
if(!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g,'');
	};
}

// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/now
if (!Date.now) {
	Date.now = function now() {
		return new Date().getTime();
	};
}

})();
