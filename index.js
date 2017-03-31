const express = require('express')
const session = require('express-session')

const path = require('path')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const debug = require('debug')

const app = express()
const secrets = require('./config/secrets')
const http = require('http').Server(app)

const io = require('socket.io')(http)

const uid = require('uid-safe')

const routes = require('./routes/index')
const port = 3000

app.set('secrets', secrets)

app.set('port', port)
app.set('view engine', 'jade');

app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  secret: app.get('secrets').secret_key_base,
  genid: function(req) {
    return uid.sync(18) // use UUIDs for session IDs
  },
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60
  }
}))

app.use("/", routes);

http.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
})

let userlist = []

io.on('connection', function(socket) {

  socket.on('disconnect', function(data){
    const idx = findUserIdx(socket.username)
    userlist[idx].is_connected = false;

    setTimeout(function() {
      if ( userlist[idx] != undefined && !userlist[idx].is_connected ) {
        delete userlist[socket.username];
        io.sockets.emit('updateuser', userlist);
        socket.broadcast.emit('servernoti', 'red', socket.username + ' has disconnected');
        socket.leave(socket.room);
      }
    }, 3000)
  });

  socket.on('send message', function(data) {
    console.log(data);
    let msg = "#"+socket.room+" "+socket.username+"님의 메세지: "+ data
    io.sockets.in(socket.room)
              .emit('recv message', msg)
  })

  socket.on('guest join', function(options) {
    const roomname = options.room
    const token = options.token
    
    let username = token

    socket.username = username;
    socket.room = roomname;
    
    socket.join(roomname);
    socket.emit('servernoti', "green", 'you has connected');

    if ( findUserIdx(username) == -1 ) {
      io.sockets.in(socket.room).emit('updateuser', userlist);
      socket.broadcast.to(roomname).emit('servernoti', "green", username + ' has connected to ' + roomname);
    }

    if ( findUserIdx(username) == -1 )
      userlist.push({name: username, is_connected: true})

    let idx = findUserIdx(username)
    userlist[idx].is_connected = true
    
  })

  let findUserIdx = function(name) {
    return userlist.findIndex(user => { return name == user.name })
  }

});


app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}
