// Modules
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var base64 = require('base-64');
var sleep = require('sleep');
var sanitizer = require('sanitizer');

// Variables
var users = {};
var useable_tokens = [];
var admin_pass = '123456';

// user info & db
var db = new sqlite3.Database('leakychat.db');

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
// process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('SIGINT', exitHandler.bind(null, {exit: true, cleanup: true })); // catch CTRL+C

/* Routing stuff */

// Get main page
app.get('/', function(req, res){
  res.sendFile(__dirname + '/html/chat.html');
});

// Get admin page
app.get('/admin', function(req, res){
  res.sendFile(__dirname + '/html/admin.html');
});

// Get CSS
app.get('/css/:stylesheet', function(req, res){
	var path = __dirname + '/html/css/' + req.params['stylesheet'];
	if (fs.existsSync(path)) {
  	res.sendFile(path);
	} else {
		res.status(404).send('Not found');
	}
});

// Get CSS
app.get('/js/:jspage', function(req, res){
	var path = __dirname + '/html/js/' + req.params['jspage'];
	if (fs.existsSync(path)) {
  	res.sendFile(path);
	} else {
		res.status(404).send('Not found');
	}
});

/* Chat functions */

/*
	This sends message to a roomToken
*/
function send_message(msg_obj, roomToken) {
	timestamp = (new Date).toISOString().replace(/z|t/gi,' ').trim();
	msg_obj['timestamp'] = timestamp;
	io.sockets.in(roomToken).emit('chat_message', msg_obj);
}

/* Generate string */
function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/*
	Log messages by IP
*/
function logMessage(ip, msg) {
	var fileName = './logs/' + ip + '.log';

	fs.open(fileName, 'a', (err, fd) => {
		if (!err)
			fs.write(fd, JSON.stringify(msg) + "\n");
	});
}

/*
	This function perform checks to see if user can enter the room.
	Checks are: password and invites.
	After the checks the user enter the room.
*/
function check_if_user_can_enter(room_name, user_name, password, socket) {
	// Check if room is in database
	db.get("SELECT password, allowed_users FROM rooms WHERE room_name = ?", room_name, function(err, row) {
		// If room exist, join the channel
		if (!err && row) {
			if(row.allowed_users) {
				if (!(row.allowed_users.split(";").indexOf(user_name) > -1)) {
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'You are not invited to the room.' };
					socket.emit('chat_message', msg);
					return;
				}
			}

			if (row.password) {
				if (!password) {
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Room has password.' };
					socket.emit('chat_message', msg);
					return;
				}
				if (password.split(";")[0] != room_name) {
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Token is incorrect.' };
					socket.emit('chat_message', msg);
					return;
				}
				var index = useable_tokens.indexOf(password);
				if (index == -1) {
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Token is used or incorrect.' };
					socket.emit('chat_message', msg);
					return;
				} else {
					useable_tokens.splice(index, 1);
				}
			}

			add_user_to_room(user_name, socket, room_name)
		} else {
			msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'No such room.' };
			socket.emit('chat_message', msg);
			return false;
		}
	});
}

/*
	This function will add the user the to room.
	Should be called after validated that the user can enter.
	This function also annouce the user entry and send him the last messages of the room.
*/
function add_user_to_room(user_name, socket, room_name) {
	if (socket.room) {
		socket.leave(socket.room);
	}
	socket.join(room_name);
	socket.room = room_name;

	socket.emit('clean_chat');
	send_message({ 'user': 'CHATBOT', 'message': user_name + ' joined the room (' + room_name + ')' }, room_name);
	users[user_name] = {"socket": socket, "room_token": room_name};

	// return the messages from the chat history to this user
	db.each("SELECT user_name, body, timestamp FROM messages WHERE room_name = ? ORDER BY timestamp", [room_name], function (err, row) {
		if (!err) {
			console.log(row.body);
			socket.emit('chat_message', { 'user': row.user_name, 'message': row.body });
		}
	});
}

/*
	This function return arg from array
*/
function fetch_arg(args, arg_name) {
	for (var i=0; i < args.length; i++) {
		var args_split = args[i].split(":")
		if (args_split[0] == arg_name) {
			return args_split.slice(1).join(":");
		}
	}
}

/*
	Execute the given command
*/
function execute_command(command, args, socket, user_name) {
	switch (command) {
		case 'enter':
			var room_name = fetch_arg(args, "name");
			var room_password = fetch_arg(args, "token");

			if (room_password) {
				try {
				  room_password = base64.decode(room_password);
				} catch (e) {
					console.log(room_password);
				}
			}

			if (!room_name) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'No room name given.' };
				socket.emit('chat_message', msg);
				return;
			}

			check_if_user_can_enter(room_name, user_name, room_password, socket);
			break;
		case 'current':
			msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'You are in ' + users[user_name]["room_token"] };
			socket.emit('chat_message', msg);
			break;
		case 'token':
			var room_name = fetch_arg(args, "name");
			var room_password = fetch_arg(args, "password");

			db.get("SELECT password FROM rooms WHERE room_name = ?", room_name, function(err, row) {
				if (!err && row) {
					if (!row.password) {
						msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Room does not require password.' };
						socket.emit('chat_message', msg);
						return;
					}

					if (!room_password) {
						msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'No password given.' };
						socket.emit('chat_message', msg);
						return;
					}

					if (room_password == row.password) {
						s = makeid(10);
						room_token = room_name + ';' + s;

						useable_tokens.push(room_token)
						msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Token: ' + base64.encode(room_token) };
						socket.emit('chat_message', msg);
					} else {
						msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Password is incorrect.' };
						socket.emit('chat_message', msg);
						return;
					}

				} else {
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'No such room.' };
					socket.emit('chat_message', msg);
					return;
				}
			});
			break;
		case 'info':
			var room_name = fetch_arg(args, "name");

			if (!room_name) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Must provide room.' };
				socket.emit('chat_message', msg);
				return;
			}

			db.get("SELECT room_desc FROM rooms WHERE room_name = ?", room_name, function(err, row) {
				if (err || !row) {
					console.log(err);
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'No such room.' };
					socket.emit('chat_message', msg);
					return;
				}

				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Room name: ' + room_name + ' <br />Room info: ' + row.room_desc};
				socket.emit('chat_message', msg);
				return;
			});
			break;
		case 'list':
			db.all("SELECT room_name FROM rooms WHERE unlisted = 0", room_name, function(err, row) {
				var rooms = '';
				for (var i=0; i < row.length; i++) {
					rooms += "<br />" + row[i].room_name;
				}

				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Rooms: ' + rooms};
				socket.emit('chat_message', msg);
				return;
			});
			break;
		case 'admin':
			if ("is_admin" in users[user_name] && users[user_name]["is_admin"]) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'You are already admin.'};
				socket.emit('chat_message', msg);
				return;
			}

			var password = fetch_arg(args, "password");

			if (!password) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Must enter password.'};
				socket.emit('chat_message', msg);
				return;
			}

			if (isNaN(password)) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Password is numbers only.'};
				socket.emit('chat_message', msg);
				return;
			}

			if (password.length > admin_pass.length) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Password is too long.'};
				socket.emit('chat_message', msg);
				return;
			}

			if (password.length < admin_pass.length) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Password is too short.'};
				socket.emit('chat_message', msg);
				return;
			}

			var start = process.hrtime();
			for (var i=0; i < password.length; i++) {
				if (password[i] != admin_pass[i]) {
					var end = process.hrtime(start);
					//var time = end[0] + Math.trunc(end[1]/1000000)/1000;
					time = end[1]/1000000;
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Wrong password. (' + time + ' miliseconds)'};
					socket.emit('chat_message', msg);
					return;
				} else {
					sleep.usleep(100);
				}
			}

			// Password is correct
			msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'You are now admin.'};
			socket.emit('chat_message', msg);
			users[user_name]["is_admin"] = true;
			break;
		default:
			msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'No such command.'};
			socket.emit('chat_message', msg);
			return;
			break;
		case 'hint':
			var stage = fetch_arg(args, "num");

			if (!stage) {
				msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Must provide stage number.'};
				socket.emit('chat_message', msg);
				return;
			}

			switch (stage) {
				case '1':
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': '<a href="https://www.youtube.com/watch?v=U0CGsw6h60k">https://www.youtube.com/watch?v=U0CGsw6h60k</a>'};
					socket.emit('chat_message', msg);
					return;
					break;
				case '2':
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': '<a href="http://bfy.tw/ABA2">http://bfy.tw/ABA2</a>'};
					socket.emit('chat_message', msg);
					return;
					break;
				case '1':
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Time is a valuable thing.'};
					socket.emit('chat_message', msg);
					return;
					break;
				case '1':
					msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': '????'};
					socket.emit('chat_message', msg);
					return;
					break;
			}
			break;
	}
}

// Client connected to server
io.on('connection', function(socket){

	// User login. Gets the user's name and the room name
	// No room name means public room.
  socket.on('user_login', function(user_name) {
		user_name = sanitizer.escape(user_name);
  	console.log('new user: ' + user_name);
		add_user_to_room(user_name, socket, "public", "0");
  });

  socket.on('disconnect', function() {
    console.log('disconnect');
  });

  socket.on('chat_message', function(msg){
		msg.user = sanitizer.escape(msg.user);
		msg.message = sanitizer.escape(msg.message);

		var addr = socket.request.connection.remoteAddress;
		logMessage(addr.split(":").pop(), msg);

    console.log(msg.user + ' says:' + msg.message);

		//check if command
		if (msg.message.indexOf("/") == 0) {
			console.log("has /");
			var command_wth_args = msg.message.substring(1);
			var command = command_wth_args.split(" ")[0];
			var args = command_wth_args.split(" ").slice(1);
			execute_command(command, args, socket, msg.user);
			return;
		}

		// Insert to DB unless public room
		if (false && users[msg.user]["room_token"] != "public") {
			timestamp = (new Date).toISOString().replace(/z|t/gi,' ').trim();
			db.run("INSERT INTO messages (user_name, timestamp, body, room_name) VALUES (?, ?, ?, ?)", msg.user, timestamp, msg.message, users[msg.user]["room_token"])
		}

		// Normal message
    send_message(msg, users[msg.user]["room_token"]);
  });

	socket.on('list_rooms', function () {
		db.all("SELECT room_name FROM rooms", function(err, row) {
			var rooms = '';
			for (var i=0; i < row.length; i++) {
				rooms += "<br />" + row[i].room_name;
			}

			msg = { 'user': 'CHATBOT(ONLY-YOU)', 'message': 'Rooms: ' + rooms};
			socket.emit('chat_message', msg);
			return;
		});
	});
});

http.listen(process.env.PORT, function(){
  console.log('listening');
});
