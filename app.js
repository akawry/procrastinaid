$(function(){
	var tasks;
	var fetchTasks = function(){
		$.ajax({
			url: '/user/kawrykow/task',
			method: 'GET',
			success : function(res){
				$(res).each(function(idx, task){
					addTaskToView(task);
				});
			}
		});
	};

	var taskTemplate = Handlebars.compile($("#task-template").html());
	var addTaskToView = function(data){
		$("#task-list").append(taskTemplate(data));
	}

	fetchTasks();
});