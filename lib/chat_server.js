// var socketio = require('socket.io');
var io = require('socket.io');
var users = [];
var usersOffline = [];
var userBindEvent = [];
var dbHandler = require('../lib/dbHandler');

function messageHandler(io) {
	io.on('connection', function (socket) {
		var userId = getUserId(socket.request.headers.cookie, 'user');
		var offIndex = findInUserOffline(userId);
		if (offIndex !== -1) {
			usersOffline.splice(offIndex, 1);
		}

		if (userId && users.length > 0) {
			setUserSocket(userId, socket);
			// var eventIndex = findInUserEvent(userId);
			// if (eventIndex !== -1) {
			// 	return;
			// }
			// userBindEvent.push(userId);
			socket.on('private', function (data) {
				var fromUser = findUser(userId);
				if (fromUser) {
					var toUser = findUser(data.to_userId);
					// var time = Date.now();
					if (toUser) {
						toUser.socket.emit('private', {
							name: fromUser.name,
							photo:fromUser.photo,
							userId: fromUser.userId,
							msg: data.msg
						});
					}
					else {
						//handle offline message 
						// dbHandler.userMessageHandler(fromUser.userId, data.to_userId, data.msg);
					}
				}
			});
			
			// when the client emits 'typing', we broadcast it to others
			socket.on('typing', function () {

			});

			// when the client emits 'stop typing', we broadcast it to others
			socket.on('stop typing', function () {

			});

			// when the user disconnects.. perform this
			socket.on('disconnect', function () {
				var user = findUser(userId);
				if (user) {
					var offIndex = findInUserOffline(user.userId);
					if (offIndex === -1) {
						usersOffline.push(user);
					}
					setTimeout(function () {
						for (var i = 0; i < usersOffline.length; i++) {
							var index = findInUsers(usersOffline[i].userId);
							if (index !== -1) {
								users.splice(index, 1);
							}
						}
						// for (var i = 0; i < userBindEvent.length; i++) {
						// 	var index = findInUsers(userBindEvent[i]);
						// 	if (index !== -1) {
						// 		userBindEvent.splice(index, 1);
						// 	}
						// }
					}, 10000);
				}
			});
		}
	});
}

function getUserId(cookieString, cookieName) {
	var matches = new RegExp(cookieName + '=([^;]+);', 'gmi').exec(cookieString);
	if (matches && matches.length > 1) {
		return matches[1] ? matches[1] : null;
	}
	return null;
}

function setUserSocket(userId, socket) {
	var index = findInUsers(userId);
	if (index !== -1) {
		users[index].socket = socket;
	}
}
function findUser(userId) {
	var index = findInUsers(userId);
	return index > -1 ? users[index] : null;
}
function addUser(name, photo, userId) {
	var index = findInUsers(userId);
	if (index === -1) {
		users.push({ name: name, photo: photo, userId: userId, socket: null });
	}
	else {
		if (users[index].name !== name) {
			users[index].name = name;
		}
	}
}

function findInUsers(userId) {
	var index = -1;
	for (var j = 0; j < users.length; j++) {
		if (users[j].userId === userId) {
			index = j;
		}
	}
	return index;
}

function findInUserOffline(userId) {
	var index = -1;
	for (var j = 0; j < usersOffline.length; j++) {
		if (usersOffline[j].userId === userId) {
			index = j;
		}
	}
	return index;
}

// function findInUserEvent(userId) {
// 	var index = -1;
// 	for (var j = 0; j < userBindEvent.length; j++) {
// 		if (userBindEvent[j] === userId) {
// 			index = j;
// 		}
// 	}
// 	return index;
// }

function createServer(app) {
	var http = require('http').createServer(app);
	io = io(http);
	messageHandler(io);
	return http;
}

module.exports.addUser = addUser;
module.exports.createServer = createServer;