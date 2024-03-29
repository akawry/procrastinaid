// npm modules 
var express = require('express'),
	jade = require('jade'),
	graph = require('fbgraph');

// user defined files
var	Models = require('./models.js'),
	Cron = require('./cron.js'),
	Config = require('./config.js');

// init user exports
var	User = Models.User,
	Task = Models.Task,
	ObjectId = Models.ObjectId,
	scheduleCronJob = Cron.scheduleCronJob,
	jobs = {};
	
// set up app 
var app = express.createServer();
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: Config.express.session_secret }));
app.set('view engine', 'jade');
app.set('view options', {
  pretty: true
});

var loadUser = function(req, res, next){
	if (req.session.username === undefined){
		res.redirect("/login");
	} else {
		User.findOne({username: req.session.username}, function(error, user){
			if (!user || error){
				res.redirect("/login");
			} else {
				req.user = user;
				next();
			}
		});
	}
};

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



/*
 * SET UP ROUTES 
 */
app.get('/', loadUser, function(req, res){
	res.render(__dirname + "/views/index", {
		username: req.session.username,
		fb: Config.fb,
		site_url: Config.site_url,
		user: req.user
	});
});

app.get(/.*\.js|css|png/, function(req, res){
	res.sendfile(__dirname + req.url);
});

app.get('/task/:name?', loadUser, function(req, res){
	var params = {
		user: req.user._id
	};
	if (req.params.name)
		params.name = req.params.name;

	Task.find(params, function(error, data){
		res.json(data);
	});
});

app.get('/fb/task/:id', function(req, res){
	Task.findById(req.params.id, function(error, task){
		if (task){
			if (task.config.facebook === true){
				User.findById(task.user, function(error, user){
					if (user){
						var params = {
							layout: false,
							user: user,
							task: task
						};
						res.render(__dirname + '/views/fbtask', params);
					}	
				});

			// this task is not available for public viewing 
			} else {
				res.json("401"); 
			}
		} else {
			res.json("404");
		}
	});
});

app.get('/fb/auth', function(req, res){
	graph.authorize({
		client_id : Config.fb.app_id,
		client_secret: Config.fb.app_secret,
		redirect_uri: Config.site_url + "/fb/auth",
		code: req.query.code
	}, function(err, fbres){
		graph.setAccessToken(fbres.access_token);
		graph.get("me", function(err, meres){
			var user = req.user;
			user.fb.authenticated = true;
			user.fb.access_token = fbres.access_token;
			user.fb.username = meres.username;
			user.fb.first_name = meres.first_name;
			user.fb.last_name = meres.last_name;
			user.save(function(error){
				res.redirect("/");
			});
		});
	});
});

var verifyTask = function(req, res){
	if (req.param("vouching_enabled") === "true" && req.param("voucher").length === 0){
		res.json({
			error: ["Must provide an e-mail address if vouching is enabled."]
		});
		return;
	} else if (req.param("voucher") === req.user.email){
		res.json({
			error: ["Voucher's email address is the same as the user's."]
		});
		return;
	}

	var config = req.param('config');
	var allFalse = true;
	for (var prop in config){
		config[prop] = config[prop] === "true" ? true : false;
		if (config[prop] === true){
			allFalse = false;
		}
	}

	if (allFalse){
		res.json({
			error: ["Must select at least one way to bother you."]
		});
		return;
	} else if (config.facebook === true){
		if (req.user.fb.authenticated !== true){
			res.json({
				error: ["You have not yet been authenticated for facebook reminders."]
			});
		}
	}
};

app.put('/task/:name', loadUser, function(req, res){

	verifyTask(req, res);

	Task.findOne({user: req.user._id, name: req.params.name}, function(error, task){
		if (!task){
			res.json({
				error: ["No task with the provided name exists for the provided user"]
			});
			return;
		}

		task.description = req.param('description');
		task.interval = req.param('interval');
		task.config = req.param('config');
		task.vouching_enabled = req.param("vouching_enabled") === "true";
		task.voucher.email = req.param("voucher");
		task.save(function(error){
			res.json("OK");
		});
	});
});

app.post('/task', loadUser, function(req, res){	

	verifyTask(req, res);

	Task.findOne({user: req.user._id, name: req.param('name')}, function(error, task){
		if (task){
			res.json({
				error: ["A task with that name already exists."]
			});
			return;
		}

		new Task({
			user: req.user._id,
			name: req.param('name'),
			description: req.param('description'),
			start: new Date(req.param('start')),
			interval: req.param('interval'),
			config : req.param('config'),
			vouching_enabled : req.param('vouching_enabled') === "true",
			voucher : {
				email: req.param('voucher'),
				verified: false 
			}
		}).save(function(error, task){
			if (task){
				res.json(task);
				jobs[task._id] = Cron.scheduleCronJob(req.user, task);
			}
		});
	});
});

app.delete('/task/:id', loadUser, function(req, res){
	Task.findById(req.params.id, function(err, task){
		if (task){
			if (String(task.user) === String(req.user._id)){
				task.remove();
				res.json("OK");
			} else {
				res.json(401);
			}
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
			req.session.regenerate(function(err){});
			req.session.username = username;
			res.json("OK");
		}
	});
});

app.post("/logout", loadUser, function(req, res){
	req.session.destroy();
	res.json("OK");
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

					res.json("OK");
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
	req.user.remove();
});

// finally, start up
app.listen(8124, function(){
	console.log("Listening on 8124...");
});
