//------------------------------------------------------------------------------
// Game
//------------------------------------------------------------------------------

Game = {
	images: null,
	map: null,
	player: null,
	input: null,
	info: null
};

Game.initialize = function(imageData)
{
	Game.images = ascii.load(imageData);

	var transform = ["/(", "\\)"];
	var list = ["stand", "walk-1", "walk-2", "jump-1", "jump-2", "duck", "duckwalk-1", "duckwalk-2", "duckjump-1", "duckjump-2"];

	for (var i = 0; i < list.length; i++)
		Game.images["guy-" + list[i] + "-flipped"] = ascii.flip(Game.images["guy-" + list[i]], transform);

	Game.info = $("#info");
	Game.map = new Map(Game.images["map"]);
	Game.input = new Input();
	Game.player = new Player();
	Game.player.initialize(10, 10);

	$(document).on("keydown keyup", function(evt) { Game.input.update(evt.which, evt.type === "keydown"); });

	ascii.setup({
		"videoMode": {
			"width": 120,
			"height": 40,
			"color": false
		}
	});

	var dom = $(ascii.dom());

	dom.attr('unselectable', 'on');
	dom.css('user-select', 'none');
	dom.on('selectstart', false);
	dom.appendTo("body");

	ascii.start({
		"update": Game.update,
		"draw": Game.draw
	});
}

Game.update = function(dt)
{
	Game.player.update(dt, Game.input);
}

Game.draw = function(percent)
{
	Game.info.text("FPS: " + ascii.fps());
	ascii.clear();
	ascii.put(Game.map.image, 0, 0);
	Game.player.draw(percent);
}

//------------------------------------------------------------------------------
// Input
//------------------------------------------------------------------------------

function Input()
{
	this.left  = false;
	this.right = false;
	this.up    = false;
	this.down  = false;
}

Input.prototype.update = function(key, pressed)
{
	switch (key)
	{
		case 37: this.left  = pressed; break;
		case 39: this.right = pressed; break;
		case 38: this.up    = pressed; break;
		case 40: this.down  = pressed; break;
	}
}

//------------------------------------------------------------------------------
// Player
//------------------------------------------------------------------------------

function Player()
{
	this.prevpos  = { x: 0, y: 0 };
	this.position = { x: 0, y: 0 };
	this.velocity = { x: 0, y: 0 };
	this.bboxNormal = { x: -3, y: -7, width: 7, height: 8 };
	this.bboxDucking = { x: -3, y: -5, width: 7, height: 6 };
	this.bbox = this.bboxNormal;
	this.collision = new Collision();
	this.flip = true;
	this.image = "guy-stand-flipped";
	this.frame = 0;
	this.animation = null;
	this.time = 0;
	this.canjump = true;
	this.ducking = false;
}

Player.prototype.initialize = function(x, y)
{
	this.position.x = x;
	this.position.y = y;
	this.prevpos.x = x;
	this.prevpos.y = y;
}

Player.prototype.draw = function(percent)
{
	var x = lerp(this.prevpos.x, this.position.x, percent);
	var y = lerp(this.prevpos.y, this.position.y, percent);

	ascii.put(Game.images[this.image], Math.floor(x), Math.floor(y));
}

Player.prototype.update = function(dt, input)
{
	this.prevpos.x = this.position.x;
	this.prevpos.y = this.position.y;

	if (!input.up)
		this.canjump = true;

	if (this.ducking && !input.down)
	{
		var bounds = {
			x: this.bboxNormal.x + this.position.x,
			y: this.bboxNormal.y + this.position.y - 1,
			width: this.bboxNormal.width,
			height: this.bboxNormal.height
		};

		if (!Game.map.collision(bounds))
			this.ducking = false;
	}
	else
	{
		this.ducking = input.down;
	}

	this.bbox = this.ducking ? this.bboxDucking : this.bboxNormal;

	if (input.up && this.canjump && this.collision.bottom)
	{
		var bounds = {
			x: this.bbox.x + this.position.x,
			y: this.bbox.y + this.position.y - 1,
			width: this.bbox.width,
			height: this.bbox.height
		};

		if (!Game.map.collision(bounds))
		{
			this.canjump = false;
			this.velocity.y = -100;
		}
	}

	this.velocity.x = (input.left ? -1 : input.right ? 1 : 0) * 30;
	this.velocity.y += 9.8 * 40 * dt;
	this.position.x += this.velocity.x * dt;
	this.position.y += this.velocity.y * dt;

	if (this.velocity.x !== 0 || this.velocity.y !== 0)
		this.collision.update(Game.map, this.bbox, this.prevpos, this.position);

	if (this.collision.bottom || this.collision.top)
	{
		this.velocity.y = 0;
		this.prevpos.y = this.position.y;
	}

	if (this.collision.left || this.collision.right)
		this.velocity.x = 0;

	this.flip = input.left ? false : input.right ? true : this.flip;

	var flipped = this.flip ? "-flipped" : "";

	var standing = "stand";
	var jumping = "jump";
	var walking = "walk";

	if (this.ducking)
	{
		standing = "duck";
		jumping = "duckjump";
		walking = "duckwalk";
	}

	if (this.collision.bottom)
	{
		if (this.velocity.x !== 0 && this.animation !== walking)
		{
			this.animation = walking;
			this.frame = 1;
			this.time = 0;
		}
		else if (this.velocity.x === 0)
		{
			this.animation = null;
			this.image = "guy-" + standing + flipped;
		}
	}
	else
	{
		this.animation = null;

		if (this.velocity.y >= 0)
			this.image = "guy-" + jumping + "-2" + flipped;
		else
			this.image = "guy-" + jumping + "-1" + flipped;
	}

	if (this.animation !== null)
	{
		this.time += dt;

		if (this.time > 0.2)
		{
			this.time -= 0.2;
			this.frame = (this.frame + 1) % 2;
		}

		this.image = "guy-" + this.animation + "-" + (this.frame + 1) + flipped;
	}
};

//------------------------------------------------------------------------------
// Collision
//------------------------------------------------------------------------------

function Collision()
{
	this.bottom = false;
	this.top    = false;
	this.left   = false;
	this.right  = false;
}

Collision.prototype.update = function(map, bbox, a, b)
{
	this.bottom = false;
	this.top    = false;
	this.left   = false;
	this.right  = false;

	var bounds = {};

	bounds.x = Math.min(bbox.x + a.x, bbox.x + b.x);
	bounds.y = Math.min(bbox.y + a.y, bbox.y + b.y);
	bounds.width = Math.max(bbox.x + a.x + bbox.width, bbox.x + b.x + bbox.width) - bounds.x;
	bounds.height = Math.max(bbox.y + a.y + bbox.height, bbox.y + b.y + bbox.height) - bounds.y;

	if (!map.collision(bounds))
		return;

	var pos   = { x: 0, y: 0 };
	var prev  = { x: 0, y: 0 };
	var delta = { x: 0, y: 0 };

	pos.x = a.x;
	pos.y = a.y;

	delta.x = b.x - a.x;
	delta.y = b.y - a.y;

	bounds.width = bbox.width;
	bounds.height = bbox.height;

	var fast = "x";
	var slow = "y";

	if (Math.abs(delta.y) > Math.abs(delta.x))
	{
		fast = "y";
		slow = "x";
	}

	delta[slow] = delta[slow] / Math.abs(delta[fast]);
	delta[fast] = delta[fast] > 0 ? 1 : delta[fast] < 0 ? -1 : 0;

	while (pos.x !== b.x || pos.y !== b.y)
	{
		for (var i = 0; i < 2; i++)
		{
			var axis = i === 0 ? fast : slow;

			if (pos[axis] === b[axis])
				continue;

			prev.x = pos.x;
			prev.y = pos.y;

			if (Math.abs(b[axis] - pos[axis]) <= Math.abs(delta[axis]))
				pos[axis] = b[axis];
			else
				pos[axis] += delta[axis];

			bounds.x = bbox.x + pos.x;
			bounds.y = bbox.y + pos.y;

			if (!map.collision(bounds))
				continue;

			if (axis === "x")
			{
				if (b.x - a.x > 0)
					this.right = true;
				else
					this.left = true;
			}
			else
			{
				if (b.y - a.y > 0)
					this.bottom = true;
				else
					this.top = true;
			}

			if (pos[axis] === Math.floor(pos[axis]))
				pos[axis] = Math.floor(prev[axis]);
			else
				pos[axis] = delta[axis] > 0 ? Math.floor(pos[axis]) : Math.ceil(pos[axis]);

			b[axis] = pos[axis];
			delta[axis] = 0;

			if (axis === fast)
				delta[slow] = delta[slow] > 0 ? 1 : delta[slow] < 0 ? -1 : 0;
		}
	}
}

//------------------------------------------------------------------------------
// Map
//------------------------------------------------------------------------------

function Map(image)
{
	this.image = image;
}

Map.prototype.solid = function(x, y)
{
	if (x >= 0 && y >= 0 && x < this.image.width && y < this.image.height)
		return this.image.buffer[y * this.image.width + x] !== 0;

	return true;
}

Map.prototype.collision = function(rc)
{
	var x0 = Math.floor(rc.x);
	var y0 = Math.floor(rc.y);
	var x1 = Math.ceil(rc.x + rc.width);
	var y1 = Math.ceil(rc.y + rc.height);

	for (var x = x0; x < x1; x++)
	{
		for (var y = y0; y < y1; y++)
		{
			if (this.solid(x, y))
				return true;
		}
	}

	return false;
}

//------------------------------------------------------------------------------
// Helper functions
//------------------------------------------------------------------------------

function lerp(a, b, percent)
{
	return a + (b - a) * percent;
};

//------------------------------------------------------------------------------
// Entry point
//------------------------------------------------------------------------------

$(function() { $.get("data.txt", function(data) { Game.initialize(data); }, "text"); });
