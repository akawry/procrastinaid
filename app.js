$(function(){

	app = {
		fetchTasks : function(){
			var me = this;
			$.ajax({
				url: '/task',
				method: 'GET',
				success : function(res){
					$(res).each(function(idx, task){
						me.addTaskToView(task);
					});
				}
			});
		},

		init : function(){
			this.taskTemplate = Handlebars.compile($("#task-template").html());
			this.fetchTasks();
		},
		
		addTaskToView : function(data){
			$("#task-list").append(this.taskTemplate(data));
		}
	};

	$("a#login").click(function(){
		$.ajax({
			url: '/login',
			type: 'POST',
			data : {
				username: $("#login-username").val(),
				password: $("#login-password").val()
			},
			success : function(res){
				if (res.error){
					$("#login-error").html(res.error);
				} else {
					location.href = "/";
				}
			}
		});
	});

	$("a#create").click(function(){
		$.ajax({
			url: '/user',
			type: 'POST',
			data : {
				username: $("#create-username").val(),
				email: $("#create-email").val(),
				phone: $("#create-phone").val(),
				password: $("#create-password").val()
			},
			success : function(res){
				console.log(res);
				if (res.error){
					$("#create-error").html("");
					$(res.error).each(function(i, error){
						$("#create-error").append("<div>" + error + "</div>");
					});
				} else {
					location.href = "/";
				}
			}
		});
	});

	$("a#logout").click(function(){
		$.ajax({
			url: '/logout',
			type: 'POST',
			success : function(){
				location.href = "/";
			}
		});
	});
});