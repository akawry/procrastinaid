var CronJob = require('cron').CronJob;

exports.scheduleCronJob = function(user, task){
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
	
};

var sendFacebook = function(user, task){
	
};

var sendText = function(user, task){
	
};