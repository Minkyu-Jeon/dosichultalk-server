const express = require('express')
const session = require('express-session')
const redis = require('redis')
const RedisStore = require('connect-redis')(session)
const store = redis.createClient()

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
  store: new RedisStore(Object.assign({}, app.get('secrets').redis, {
    client: store
  })),
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

let room = {}

io.on('connection', function(socket) {

  socket.on('disconnect', function(data) {
    console.log('disconnect')
    const userIdx = findUserIdx(socket.roomname, socket.username)

    if ( userIdx != -1 ) {
      room[socket.roomname][userIdx].is_connected = false;
      setTimeout(function() {
        if ( room[socket.roomname][userIdx] != undefined && !room[socket.roomname][userIdx].is_connected ) {
          console.log("room leave user: ")
          console.log(room[socket.roomname][userIdx])
          delete room[socket.roomname][userIdx];
          io.sockets.emit('updateuser', room[socket.roomname]);
          socket.broadcast.to(socket.roomname).emit('servernoti', 'red', socket.username + ' has disconnected');
          socket.leave(socket.roomname);
        }
      }, 3000)
    }
  });

  socket.on('send message', function(data) {
    let msg = "#"+socket.roomname+" "+socket.username+"님의 메세지: "+ data
    io.sockets.in(socket.roomname)
              .emit('recv message', msg)
  })

  socket.on('guest join', function(options) {
    const roomname = options.room
    const token = options.token

    let username = token

    socket.username = username;
    socket.roomname = roomname;

    socket.join(roomname);
    socket.emit('servernoti', "green", username + ' you has connected');
    let userIdx = findUserIdx(roomname, username)

    if ( userIdx == -1 ) {
      if ( room[roomname] === undefined ) room[roomname] = [];

      room[roomname].push({name: username, is_connected: true})
      socket.broadcast.to(roomname).emit('servernoti', "green", username + ' has connected to ' + roomname);
    }

    userIdx = findUserIdx(roomname, username);
    room[roomname][userIdx].is_connected = true
    io.sockets.in(socket.roomname).emit('updateuser', room[roomname]);
    console.log("join room: " + roomname + " / user_id: " + room[roomname][userIdx].name)
  })

  let findUserIdx = function(roomname, name) {
    if ( room[roomname] === undefined  ) return -1;
    return room[roomname].findIndex(user => { return name == user.name })
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
