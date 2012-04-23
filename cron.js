var CronJob = require('cron').CronJob;

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
	console.log("sending email to ", user, new Date());
};

var sendFacebook = function(user, task){
	console.log("sending facebook to", task, new Date());
};

var sendText = function(user, task){
	console.log("sending text to ", task, new Date());
};