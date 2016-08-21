var app = require('./app');
var chatServer = require('./lib/chat_server');
var http = chatServer.createServer(app);
// io.emit('some event', {for: 'everyone' });

http.listen(3000,function(){
	console.log('listening on *:3000');
});