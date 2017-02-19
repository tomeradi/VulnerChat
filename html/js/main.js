$(document).ready(function(){
  var commands_history = [''];
  var history_limit = 25;
  var index = 0;
  var socket = io();

  // Listen on enter name form
  $('#enter_id form').submit(function(e){
    socket.emit('user_login', $('#user_name').val());

    // Gui change
    $('#enter_id').hide('slow');
    $('#chat').show('fast');
    e.preventDefault();

    return false;
  });

  // Listen on chat form
  $('#chat form').submit(function() {
    $("html, body").stop();
    index = 0;

    if (commands_history.length >= history_limit) {
      commands_history.pop();
    }
    commands_history.splice(1, 0, $('#msg').val());

    socket.emit('chat_message', { 'user': $('#user_name').val(), 'message': $('#msg').val() } );
    $('#msg').val('');

    // scroll down
    $("html, body").animate({ scrollTop: $(document).height() }, 1000);
    return false;
  });

  $('#msg').keydown(function (e) {
    switch (e.which) {
      case 38: //up

        if (commands_history.length > index + 1) {
          index++;
          $('#msg').val(commands_history[index]);

          var len = $('#msg').val().length * 2;
          $('#msg')[0].setSelectionRange(len, len);
        }
        break;
      case 40: //down

        if (index - 1 >= 0) {
          index--;
          $('#msg').val(commands_history[index]);

          var len = $('#msg').val().length * 2;
          $('#msg')[0].setSelectionRange(len, len);
        }
        break;
    }
  });

  // Socket listen
  socket.on('chat_message', function(msg_obj){
    if (msg.user == $('#user_name').val()) {
      // your own message
      $('#messages').append($('<li>').html(msg_obj.message));
    } else {
      // someone else sent this
      $('#messages').append($('<li>').html('<span class="user_name">' + msg_obj.user + ':</span> ' + msg_obj.message));
    }
  });

  // Socket listen
  socket.on('clean_chat', function(){
    $('#messages').empty();
  });
});
//   End­User License Agreement ("Agreement")
// Last updated: (add date)
// Please read this End­User License Agreement ("Agreement") carefully before clicking the "I Agree"
// button, downloading or using My Application (change this) ("Application").
// By clicking the "I Agree" button, downloading or using the Application, you are agreeing to be bound
// by the terms and conditions of this Agreement.
// If you do not agree to the terms of this Agreement, do not click on the "I Agree" button and do not
// download or use the Application.
// License
// My Company (change this) grants you a revocable, non­exclusive, non­transferable, limited license
// to download, install and use the Application solely for your personal, non­commercial purposes
// strictly in accordance with the terms of this Agreement.
// Restrictions
// You agree not to, and you will not permit others to:
// a) license, sell, rent, lease, assign, distribute, transmit, host, outsource, disclose or otherwise
// commercially exploit the Application or make the Application available to any third party.
// The Restrictions section is for applying certain restrictions on the app usage, e.g. user can't sell
// app, user can't distribute the app. For the full disclosure section, create your own EULA.
// Modifications to Application
// My Company (change this) reserves the right to modify, suspend or discontinue, temporarily or
// permanently, the Application or any service to which it connects, with or without notice and without
// liability to you.
// The Modifications to Application section is for apps that will be updated or regularly maintained.
// For the full disclosure section, create your own EULA.
// Term and Termination
// This Agreement shall remain in effect until terminated by you or My Company (change this).
// My Company (change this) may, in its sole discretion, at any time and for any or no reason,
// suspend or terminate this Agreement with or without prior notice.
// This Agreement will terminate immediately, without prior notice from My Company (change this), in
// the event that you fail to comply with any provision of this Agreement. You may also terminate this
// Agreement by deleting the Application and all copies thereof from your mobile device or from your
// desktop.
// Upon termination of this Agreement, you shall cease all use of the Application and delete all copies
// of the Application from your mobile device or from your desktop.
// Severability
// If any provision of this Agreement is held to be unenforceable or invalid, such provision will be
// changed and interpreted to accomplish the objectives of such provision to the greatest extent
// possible under applicable law and the remaining provisions will continue in full force and effect.
// Amendments to this Agreement
// My Company (change this) reserves the right, at its sole discretion, to modify or replace this
// Agreement at any time. If a revision is material we will provide at least 30 (changes this) days' notice
// prior to any new terms taking effect. What constitutes a material change will be determined at our
// sole discretion.
// Contact Information
// If you have any questions about this Agreement, please contact us


// Socket listen
// TODO: delete this
function listrooms_debug() {
  var socket = io();
  socket.emit('list_rooms');
}
