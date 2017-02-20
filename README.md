# Vulner Chat

A vulnerable and leaky chat application used for security demos.
Based on Leaky Chat by marknca (https://github.com/marknca/leaky-chat).

## Attacks

All attacks are logical. There is no need to know OWASP attacks or anything. Just think a little.

Goals are (Order doesn't matter):
* Enter the invites only room.
* Enter the password protected room.
* Become an admin.
* Find the unlisted (secret) room.

## Usage and help

 Everything is case sensitive.
 Command syntax: /[cmd_name] [argument_name]:data (without space after or before the colon)

* /info - (argument: name) Print room info.
* /list - Print all of the rooms.
* /current - Print the room you are in currently.
* /enter - (arguments: name, token) Enter a room. If room needs token, just give it to him. If you dont have a token, just get one.
* /token - (arguments: name, password) Gets a one time token for a room. Must provide password.
* /admin - (argument: password) Get admin with a password.
* /forgot - In case you forgot the admin's password.
* /hint - (argument: num) num is the goal's number. Use only if you really need it. Using hints is logged to the system.
