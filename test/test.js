var log   = require('blunt-log')
var Weave = require('../weave.js')
var http  = require('http')
var hmem  = require('./hmem.js')
var req   = require('request')
var fs    = require('fs')
var trumpet = require('trumpet')

function basic(res) {
  var f = fs.createReadStream(__dirname + '/index.html')
  var tr = trumpet()
  f.pipe(tr).pipe(res)

}

function weaver(res) {
  var weave = Weave(__dirname)
  weave().pipe(res)
}

http.createServer(function(req, res) {

  console.log('b4', hmem().str)
  weaver(res)

}).listen(8080, function() {
  log('listening on', 8080)
})
