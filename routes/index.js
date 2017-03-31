var express = require('express');
var router = express.Router();
var crypto = require('crypto')

router.get('/', function(req, res, next) {
  res.render("index", {id: req.session.id});
});

module.exports = router;
