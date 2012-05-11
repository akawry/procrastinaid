var express = require('express'),
	jade = require('jade'),
	Models = require('./models.js'),
	User = Models.User,
	Task = Models.Task,
	ObjectId = Models.ObjectId,
	Cron = require('./cron.js'),
	scheduleCronJob = Cron.scheduleCronJob,
	jobs = {};

var app = express.createServer();
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));
app.set('view engine', 'jade');
app.set('view options', {
  pretty: true
});

var loadUser = function(req, res, next){
	if (req.session.username === undefined){
		res.redirect("/login");
	} else {
		next();
	}
};

app.get('/', loadUser, function(req, res){
	res.render(__dirname + "/views/index", {
		username: req.session.username
	});
});

app.get(/.*\.js|css|png/, function(req, res){
	res.sendfile(__dirname + req.url);
});

app.get('/task/:name?', loadUser, function(req, res){
	User.findOne({username: req.session.username}, function(error, data){
		if (data){
			var params = {
				user: data._id
			};
			if (req.params.name)
				params.name = req.params.name;

			Task.find(params, function(error, data){
				res.json(data);
			});
		}
	});
});

app.get('/fb/task/:id', function(req, res){
	Task.findById(req.params.id, function(error, data){
		if (data){
			res.render(__dirname + "/views/fbtask", data);
		} 
	});
});

app.post('/task/:name', loadUser, function(req, res){
	User.findOne({username: req.params.name}, function(error, user){
		Task.findOne({name: req.params.name}, function(error, task){
			var config = req.param('config');
			var allFalse = true;
			for (var prop in config){
				config[prop] = config[prop] === "true" ? true : false;
				if (config[prop] === true)
					allFalse = false;
			}

			if (allFalse){
				res.json({
					error: ["Must select at least one way to bother you."]
				});
			} else {
				task.description = req.param('description');
				task.interval = req.param('interval');
				task.config = config;
				task.save(function(error){
					console.log(error);
					res.json("OK");
				});
			}
		});
	});
});

app.post('/task', loadUser, function(req, res){	
	User.findOne({username: req.session.username}, function(error, user){
		
		Task.findOne({user: user._id, name: req.param('name')}, function(error, task){
			if (task){
				res.json({
					error: ["A task with that name already exists."]
				});
			} else {
				var config = req.param('config');
				var allFalse = true;
				for (var prop in config){
					config[prop] = config[prop] === "true" ? true : false;
					if (config[prop] === true)
						allFalse = false;
				}

				if (allFalse){
					res.json({
						error: ["Must select at least one way to bother you."]
					});
				} else {
					new Task({
						user: user._id,
						name: req.param('name'),
						description: req.param('description'),
						start: new Date(req.param('start')),
						interval: req.param('interval'),
						config : config
					}).save(function(error, task){
						if (task){
							res.json(task);
							jobs[task._id] = Cron.scheduleCronJob(user, task);
						}
					});
				}
			}
		})
	});
});

app.delete('/task/:id', loadUser, function(req, res){
	Task.findById(req.params.id, function(err, task){
		if (task){
			task.remove();
			res.json("OK");
		} else {
			res.json(404);
		}
	});
});

app.get("/login", function(req, res){
	res.render(__dirname + "/views/login");
});

app.post('/login', function(req, res){
	var username = req.param('username'),
		password = req.param('password');
	User.findOne({username : username}, function(err, user){
		if (!user || user.password !== password){
			res.json({
				error: "Incorrect username/password."
			});
		} else {
			req.session.regenerate(function(err){
			});
			req.session.username = username;
			res.send("OK");
		}
	});
});

app.post("/logout", loadUser, function(req, res){
	req.session.destroy();
	res.send("OK");
});		

app.post('/user', function(req, res){
	User.findOne({username: req.param('username')}, function(err, user){
		if (user){
			res.json({
				error: ["Username already exists."]
			});
		} else {
			new User({
				username: req.param('username'),
				email: req.param('email'),
				phone: req.param('phone'),
				password: req.param('password'),
				emailVerified: false
			}).save(function(error, data){
				if (!error && data){
					req.session.username = data.username;

					if (data.email)
						Cron.verifyForEmailing(data.email);

					res.send("OK");
				} else {
					var errors = [];
					for (var e in error.errors){
						errors.push("Missing required field " + e);
					}
					res.json({
						error: errors
					});
				}
			});
		}
	})
});

app.delete('/user', loadUser, function(req, res){
	User.findOne({
		username: req.session.username
	}, function(error, data){
		if (data){
			data.remove();
		}
	});
});

// start up all cron jobs 
User.find({}, function(error, users){
	users.map(function(user){
		
		Task.find({user: user._id}, function(error, tasks){
			tasks.map(function(task){
				var job = scheduleCronJob(user, task);
				jobs[task._id] = job;
			});
		});

	});
});

app.listen(8124, function(){
	console.log("Listening on 8124...");
});
