var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// message queue
var msg_queue = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/html/index.html');
});

app.get('/chat', function(req, res){
  res.sendFile(__dirname + '/html/chat.html');
});

io.on('connection', function(socket){

  socket.on('user_login', function(user_name) {
  	console.log('new user: ' + user_name);
  	// return the chat history to this user
  	io.emit(user_name + ' joined the chat');
  });

  socket.on('disconnect', function() {
    console.log('user disconnected');
  });

  socket.on('chat_message', function(msg){
    console.log(msg.user + ' says: ' + msg.message);
    io.emit('chat_message', msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});