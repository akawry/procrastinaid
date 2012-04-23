var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1/procrastinaid');
var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;

exports.User = mongoose.model('User', new Schema({
	username: {type: String, required: true},
	email: {type: String, required: true},
	phone: String,
	password: {type: String, required: true}
}));

exports.Task = mongoose.model('Task', new Schema({
	user: ObjectId,
	name: {type: String, required: true},
	description: String,
	start: Date,
	interval: {type: String, match: /hourly|daily|weekly|monthly|yearly/},
	config: {
		phone: {type: Boolean, required: true},
		email: {type: Boolean, required: true},
		facebook: {type: Boolean, required: true}
	}
}));

exports.ObjectId = ObjectId;