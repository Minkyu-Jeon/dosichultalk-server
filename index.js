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
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", routes);
app.use("/chat", chat);


http.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
})


io.on('connection', function(socket){
     
    console.log('a user connected');
     
    socket.broadcast.emit('hi');
     
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
     
    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    }); 
 
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
 