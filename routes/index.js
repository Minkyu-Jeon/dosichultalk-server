var express = require('express');
var router = express.Router();
var crypto = require('crypto')

router.get('/', function(req, res, next) {
  res.render("index", {
    id: req.session.id,
    room: 'lobby',
    host: req.headers.host
  });
});

router.get('/:room', function(req, res, next) {
  res.render("index", {
    id: req.session.id,
    room: req.params.room,
    host: req.headers.host
  });
});

module.exports = router;
