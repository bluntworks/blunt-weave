var log     = require('blunt-log')
var thru    = require('through')
var trumpet = require('trumpet')
var concat  = require('concat-stream')

var tr  = trumpet()

var data = [
  { text: 'yo 01', value: '001' },
  { text: 'yo 02', value: '002' },
  { text: 'yo 03', value: '003' },
  { text: 'yo 04', value: '004' },
  { text: 'yo 05', value: '005' },
]

var outr = trumpet()
var oel  =  outr.select('.sel')
var ows  = oel.createWriteStream()

var bucket = concat(function(data) {
  log.warn('buck', data.toString())
  ows.end(data)
})

var comp = thru(function(data) {
  log.info('comp', data.toString())
  this.queue(data)
})

comp.autoDestroy = false
comp.pipe(bucket)

data.forEach(function(it) {
  var inr  = trumpet()
  var el = inr.select('*')
  var ws = el.createWriteStream()

  inr.pipe(comp)
  el.setAttribute('value', it.value)
  ws.end(it.text)

  inr.write('<option></option>')

})


comp.end()

outr.pipe(thru(function(data) {
  log('final result', data.toString())
}))


outr.write('<div><select class="sel"></select>')

