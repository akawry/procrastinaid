var STATUS = {
	UNAUTHORIZED : 401,
	OK : 200
};


var express = require('express');
var app = express.createServer();
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));

var jade = require('jade');
app.set('view engine', 'jade');
app.set('view options', {
  pretty: true
});

var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/procrastinaid');
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;

var CronJob = require('cron').CronJob,
	jobs = {};

var scheduleCronJob = function(user, task){
	var cronStr = "*/5 * * * * *";

	var job = new CronJob(cronStr, function(){
		if (task.config.email)
			sendEmail(user, task);
		if (task.config.facebook)
			sendFacebook(user, task);
		if (task.config.phone)
			sendText(user, task);
	});
	job.start();

	return job;
};

var sendEmail = function(user, task){
	console.log("sending an email");
};

var sendFacebook = function(user, task){
	console.log("sending to facebook");
};

var sendText = function(user, task){
	console.log("sending a text");
};

var User = mongoose.model('User', new Schema({
	username: {type: String, required: true},
	email: {type: String, required: true},
	phone: String,
	password: {type: String, required: true}
}));

var Task = mongoose.model('Task', new Schema({
	user: ObjectId,
	name: {type: String, required: true},
	description: String,
	start: Date,
	interval: {type: String, match: /hourly|daily|weekly|monthly|yearly/},
	config: {
		phone: Boolean,
		email: Boolean,
		facebook: Boolean
	}
}));

var loadUser = function(req, res, next){
	if (req.session.username === undefined){
		res.redirect("/");
	} else {
		next();
	}
};

app.get('/', function(req, res){
	if (req.session.username === undefined){
		res.render("login");
	} else {
		res.render("index", {
			username: req.session.username
		});
	}
});

app.get(/.*\.js|css|png/, function(req, res){
	res.sendfile(__dirname + req.url);
});

app.get('/task', loadUser, function(req, res){
	User.findOne({username: req.session.username}, function(error, data){
		if (data){
			Task.find({user: data["_id"]}, function(error, data){
				res.json(data);
			});
		}
	});
});

app.post('/task', loadUser, function(req, res){	
	User.findOne({username: req.session.username}, function(error, data){
		if (data){
			var config = req.param('config') || {
				email: true,
				facebook: false,
				phone: false
			};

			var taskConfig = {
				user: data._id,
				name: req.param('name'),
				description: req.param('description'),
				start: new Date(req.param('start')),
				interval: req.param('interval'),
				config : {
					email: config.email,
					facebook: config.facebook,
					phone: config.phone
				}
			};

			var job = scheduleCronJob(data, taskConfig);

			new Task(taskConfig).save(function(error, data){
				if (data){
					res.json(data);
					jobs[data._id] = job;
				} else if (error){
					res.json(error);
				}
			});
		}
	});
});

app.delete('task/:id', loadUser, function(req, res){
	Task.findById(req.params.id, function(err, data){
		if (data){
			data.remove();
		}
	});
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
			res.send(STATUS.OK);
		}
	});
});

app.post("/logout", loadUser, function(req, res){
	req.session.destroy();
	res.send(STATUS.OK);
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
				password: req.param('password')
			}).save(function(error, data){
				if (!error && data){
					req.session.username = data.username;
					res.send(STATUS.OK);
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

app.listen(8124, function(){
	console.log("Listening on 8124...");
});
