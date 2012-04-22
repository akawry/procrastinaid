var UNAUTHORIZED = 401;


var express = require('express');
var app = express.createServer();
app.use(express.bodyParser());

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
	username: String,
	email: String,
	phone: String,
	password: String
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

Task.find({}, function(err, data){
	for (var i = 0; i < data.length; i++)
		data[i].remove();
});

app.get('/', function(req, res){
	res.sendfile(__dirname + "/index.html");
});

app.get(/.*\.js|css|png/, function(req, res){
	res.sendfile(__dirname + req.url);
});

app.get('/user/:username/task', function(req, res){
	User.findOne({username: req.params.username}, function(error, data){
		if (data){
			Task.find({user: data["_id"]}, function(error, data){
				res.json(data);
			});
		}
	});
});

app.post('/user/:username/task', function(req, res){	
	User.findOne({username: req.params.username}, function(error, data){
		if (data){
			var password = req.param('password');
			if (password === data.password){

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
			} else {
				res.send(UNAUTHORIZED);
			}
		}
	});
});

app.delete('/user/:username/task/:id', function(req, res){
	Task.findById(req.params.id, function(err, data){
		if (data){
			var password = req.param('password');
			if (password === data.password)
				data.remove();
			else
				res.send(UNAUTHORIZED);
		}
	});
});
		

app.post('/user', function(req, res){
	new User({
		username: req.param('username'),
		email: req.param('email'),
		phone: req.param('phone'),
		password: req.param('password')
	}).save(function(error, data){
		res.json(data);
	});
});

app.delete('/user/:username', function(req, res){
	User.findOne({
		username: req.params.username
	}, function(error, data){
		if (data){
			if (req.param('password') === data.password)
				data.remove();
			else
				res.send(UNAUTHORIZED);
		}
	});
});

app.listen(8124, function(){
	console.log("Listening on 8124...");
});
