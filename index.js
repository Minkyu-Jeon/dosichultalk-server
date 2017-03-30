const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const debug = require('debug')

const app = express()
const http = require('http').Server(app)

const io = require('socket.io')(http)

const routes = require('./routes/index')
const chat = require('./routes/chat')
const port = 3000

app.set('port', port)
app.set('view engine', 'jade');

app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", routes);
app.use("/chat", chat);


http.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
})

let usernames = []

io.on('connection', function(socket) {

  socket.on('disconnect', function(){
    delete usernames[socket.username];
    io.sockets.emit('updateusers', usernames);
    socket.broadcast.emit('servernoti', 'red', socket.username + ' has disconnected');
    socket.leave(socket.room);
  });

  socket.on('send message', function(data) {
    let msg = "#"+socket.room+" "+socket.username+"님의 메세지: "+ data
    io.sockets.in(socket.room)
              .emit('recv message', msg)
  })

  socket.on('guest join', function(roomname) {
    let username = socket.id
    socket.username = username;
    socket.room = roomname;
    usernames[username] = username;
    socket.join(roomname);
    socket.emit('servernoti', "green", 'you has connected');  
    let userlist = [];   
    
    for (var name in usernames) {
      userlist.push(usernames[name]);
    }

    io.sockets.in(socket.room).emit('updateuser', userlist);
    socket.broadcast.to(roomname).emit('servernoti', "green", username + ' has connected to ' + roomname);  
  })

  let claim = function(name) {
    if ( !name || usernames[name] ) return false;
    else {
      usernames[name] = true;
      return true;
    }
  }

  let getGuestName = function() {
    let name, nextUserId = 1;
    do {
      name = 'Guest' + (nextUserId ++);

    } while ( !claim(name) );

    return name;
  }
  

});


app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
 
// error handlers
 
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}
 
// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
 