$(function(){

	app = {
		fetchTasks : function(){
			$("#task-list").html("");
			var me = this;
			$.ajax({
				url: '/task',
				method: 'GET',
				success : function(res){
					$(res).each(function(idx, task){
						task.start = new Date(task.start).toString();
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
			$("#" + data._id + " .edit-task").click(function(){
				$("#task-name").val(data.name);
				$("#task-description").val(data.description);
				$("#task-interval").val(data.interval);

				if (data.config.email)
					$("#task-email").attr("checked", "checked")
				else
					$("#task-email").removeAttr("checked");

				if (data.config.phone)
					$("#task-phone").attr("checked", "checked")
				else
					$("#task-phone").removeAttr("checked");

				if (data.config.facebook)
					$("#task-facebook").attr("checked", "checked")
				else
					$("#task-facebook").removeAttr("checked");	

				$("#task-popup").modal('show')
					.attr("edit", true)
					.attr("task-name", data.name);

				$("#task-name").attr("disabled", "disabled").addClass("disabled");

				$("#fb-auth").hide();
			});

			$("#" + data._id + " .complete-task").click(function(){
				$.ajax({
					url: '/task/' + data._id,
					type: 'DELETE',
					success : function(res){
						if (res.error){
							//TODO: handle the error 
						} else {
							app.fetchTasks();
						}
					}
				});
			});
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
	
	$("a#save-task").click(function(){
		var edit = $("#task-popup").attr("edit") == "true",
			url = "/task";
		if (edit)
			url += "/" + $("#task-popup").attr("task-name");


		$.ajax({
			url: url,
			type: 'POST',
			data : {
				name: $("#task-name").val(),
				description: $("#task-description").val(),
				interval: $("#task-interval").val(),
				start: (new Date()).toString(),
				config : {
					email: $("#task-email").is(":checked"),
					phone: $("#task-phone").is(":checked"),
					facebook: $("#task-facebook").is(":checked")
				}
			},
			success : function(res){
				if (res.error){
					$("#task-error").html("");
					$(res.error).each(function(i, error){
						$("#task-error").append("<div>" + error + "</div>");
					});
				} else {
					if (!edit){
						app.addTaskToView(res);
					} else {
						app.fetchTasks();
					}
					$("#task-popup").modal('hide');
				}
			}
		});
	});

	$("a#new-task").click(function(){
		$("#task-popup")
			.attr("edit", false)
			.removeAttr("task-name");
		$("#task-error").html("");
		$("#task-name").val("");
		$("#task-description").val("");
		$("#task-interval").val("hourly");
		$("#task-email").removeAttr("checked");
		$("#task-phone").removeAttr("checked");
		$("#task-facebook").removeAttr("checked");	
		$("#fb-auth").hide();
		$("#task-name").removeAttr("disabled").removeClass("disabled");
	});

	$("#task-facebook").click(function(){
		if ($(this).attr("checked")){
			$("#fb-auth").show();
		} else {
			$("#fb-auth").hide();
		}
	});
});