// load npm modules
var amazonses = require('amazon-ses'),
	graph = require('fbgraph');
	cron = require('cron'),
	jade = require('jade'),
	fs = require('fs');

// load user defined files
var Config = require('./config');

// init export objects 
var CronJob = cron.CronJob,
	ses = new amazonses(Config.amazon.id, Config.amazon.secret),
	emailBody = jade.compile(fs.readFileSync(__dirname + '/views/email.jade').toString('utf8'));



/**
 * Set up exports 
 */
exports.verifyForEmailing = function(email){
	ses.verifyEmailAddress(email);
};

exports.scheduleCronJob = function(user, task){
	var start = task.start;
	var cronStr = "" + start.getSeconds() + " " + start.getMinutes() + " ";
	switch (task.interval){
		case "hourly":
			cronStr += "* * * *";
			break;
		case "daily":
			cronStr += start.getHours() + " * * *";
			break;
		case "weekly":
			cronStr += start.getHours() + " * * " + start.getDay();
			break;
		case "monthly":
			cronStr += start.getHours() + " " + start.getDate() + " * *";
			break;
		case "yearly":
			cronStr += start.getHours() + " */365 * *";
			break;
	}

	var job = new CronJob(cronStr, function(){

		task.reminders++;
		task.save();
			
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
	ses.getSendQuota(function(res){
		if (Number(res.SentLast24Hours) < Number(res.Max24HourSend)){
			console.log("sending email to ", user, new Date());
			var body = emailBody({
				name: user.username,
				task: task.name,
				description: task.description,
				reminders: task.reminders
			});
			ses.send({
				from: Config.email.from,
				to: [user.email],
				replyTo: Config.email.replyTo,
				subject: "Action needed: " + task.name,
				body : {
					html: body
				}
			});		
		} else {
			console.log("Exceeded email quota!");
		}
	});
};

var sendFacebook = function(user, task){
	console.log("sending facebook to", task, new Date());
	if (user.fb.authenticated === false){
		console.log("user not authenticated");
	} else {
		graph.setAccessToken(user.fb.access_token);
		graph.post(user.fb.username + "/procrastinaid:plan", {
			task: Config.site_url + "/fb/task/" + task._id
		}, function(err, res){
			if (err){
				console.log("error posting to timeline", err);
			}
		});
	}
};

var sendText = function(user, task){
	console.log("sending text to ", task, new Date());
};
