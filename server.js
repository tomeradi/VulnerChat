var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// message queue
var msg_queue = [];
var msg_queue_limit = 15;

// user info & db
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('leakychat.db'); // :memory: also an option
var users = {};

// set an exit handler as per http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
process.stdin.resume(); // so the program will not close instantly
function exitHandler(options, err) {
	console.log('');
    if (options.cleanup) {
    	console.log('Cleaning before exit...');
    	try {
    		db.close();
    	} catch (err) {}
    }
    if (err) {
    	console.log('Uncaught exception or error');
    	console.log(err.stack);
    }
    if (options.exit) { process.exit(); }
}
//process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('SIGINT', exitHandler.bind(null, {exit: true, cleanup: true })); // catch CTRL+C



// setup the db table if it isn't already
db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS messages (user_name TEXT, timestamp TEXT, body TEXT)");
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/html/index.html');
});

app.get('/chat', function(req, res){
  res.sendFile(__dirname + '/html/chat.html');
});

function send_message(msg_obj) {
	timestamp = (new Date).toISOString().replace(/z|t/gi,' ').trim();
	msg_obj['timestamp'] = timestamp;
	io.emit('chat_message', msg_obj);
	/*
	try {
		var cmd = db.prepare("INSERT INTO messages VALUES ('" + msg_obj.user + "','" + timestamp + "','" + msg_obj.message + "');");
		cmd.run();
		cmd.finalize();
	} catch(err) {
		console.log('Could not save message to database');
		console.log(err);
	}
	*/
}

io.on('connection', function(socket){

  socket.on('user_login', function(user_name) {
  	console.log('new user: ' + user_name);
  	// announce the user 
  	//io.emit('chat_message', { 'user': 'Leakybot', 'message': user_name + ' joined the chat' });
  	send_message({ 'user': 'Leakybot', 'message': user_name + ' joined the chat' });

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

    // make sure we keep the queue a reasonable length
    if (msg_queue.length == msg_queue_limit) {
    	msg_queue.shift();
    }
    send_message(msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});