var express = require('express');
var App = express();
var Router = express.Router();

App.use(express.static('public'));

var Server = App.listen(3100, function () {
  console.log('[i] Listening on port 3100');
});