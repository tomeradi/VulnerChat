var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// message queue
var msg_queue = [];
var msg_queue_limit = 15;
var users = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/html/index.html');
});

app.get('/chat', function(req, res){
  res.sendFile(__dirname + '/html/chat.html');
});

io.on('connection', function(socket){

  socket.on('user_login', function(user_name) {
  	console.log('new user: ' + user_name);
  	// announce the user 
  	io.emit('chat_message', user_name + ' joined the chat');

  	users[user_name] = socket.id; 	
  	// return the latest messages from the chat history to this user
  	for	(i = 0; i < msg_queue.length; i++) {
  		io.to(users[user_name]).emit('chat_message', msg_queue[i]);
  	}
  });

  socket.on('disconnect', function() {
    console.log('disconnect');
  });

  socket.on('chat_message', function(msg){
    console.log(msg.user + ' says: ' + msg.message);
    msg_queue.push(msg);
    if (msg_queue.length == msg_queue_limit) {
    	msg_queue.shift();
    }
    io.emit('chat_message', msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});