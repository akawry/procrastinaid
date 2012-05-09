var CronJob = require('cron').CronJob;
var AmazonSES = require('amazon-ses'),
	ses = new AmazonSES('AKIAICGDJXAFYZ23LHTA', 'ncc1DG/hhgWbOxDdNrHWt6tfxJozrCGzM8YncVIa'),
	jade = require('jade'),
	fs = require('fs'),
	emailBody = jade.compile(fs.readFileSync(__dirname + '/views/email.jade').toString('utf8'));

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
				from: "alex@procrastinaid.in",
				to: [user.email],
				replyTo: ["no-reply@procrastinaid.in"],
				subject: "Action needed: " + task.name,
				body : {
					html: body
				}
			});

			task.reminders++;
			task.save();		
		} else {
			console.log("Exceeded email quota!");
		}
	});
};

var sendFacebook = function(user, task){
	console.log("sending facebook to", task, new Date());
};

var sendText = function(user, task){
	console.log("sending text to ", task, new Date());
};
