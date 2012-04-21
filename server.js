var express = require('express');
var app = express.createServer();
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/procrastinaid');

app.get('/', function(req, res){
	res.end("Hello world!");
});

app.listen(8124, function(){
	console.log("Listening on 8124...");
});
