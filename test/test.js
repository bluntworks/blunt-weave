var log = require('blunt-log')
var weave = require('../weave.js')

var app = require('nym')()
var stak = require('blunt-stack')
var http = require('http')

app.static(__dirname)

http.createServer(stak(
  conn.cookieParser,
  conn.sessions

)).listen(3000, function() {
  log('app listen: ', 3000)
})

