var fs      = require('fs')
var log     = require('blunt-log')
var Tru     = require('through')
var trumpet = require('trumpet')

var Weave = function(file) {
  if(!(this instanceof Weave)) return new Weave(file)
  file || (file ='index.html')
  this.outer = fs.createReadStream(this.root + file )
  this.partials = []
}

var wp = Weave.prototype

wp.render = function(file) {
  var file = file || 'index.html'
  this.outer = fs.createReadStream(this.root + file)
  return this
}

wp.head = function(file, map) {
  this.partials.push({
    selector: 'head',
    stream: fs.createReadStream(this.root + file),
    map: map
  })
  return this
}

wp.append = function(sel, file, map) {
  var o = {
    selector: sel,
    stream: fs.createReadStream(this.root + file),
    map: map
  }
  this.partials.push(o)
  return this
}

wp.map = function(map) {
  this._map = map
  return this
}

wp.pipe = function(res) {
  var self = this
  var tr = trumpet()
  var mtr = trumpet()
  var parts = this.partials

  parts.forEach(function(part) {
    var el = tr.select(part.selector)
    var es = el.createWriteStream()
    var _map = part.map

    if(_map) {
      Object.keys(_map).forEach(function(k) {
        var o = _map[k]
        if('object' == typeof o) {
          self.mapper(k, o, mtr)
        } else {
          var mel = mtr.select('.' + k)
          var ms = mel.createWriteStream()
          Str(_map[k]).pipe(ms)
        }
      })
    }

    part.stream.pipe(es)
  })

  this.outer.pipe(tr)
  var self = this
  tr.pipe(mtr).pipe(res)
  tr.on('end', function() {
    tr = null
    mtr = null
    parts = null
    self.outer = null
    res = null
  })
}

wp.mapper = function(k, o, tr) {
  if(Array.isArray(o)) return
  var el = tr.select(k)
  if(!el) return

  var v = o.inner || o.text || o.val

  if(v) {
    var es = el.createWriteStream()
    Str(v).pipe(es)
  }

  if(o.attrs) this.attrs(o.attrs, el)
}

wp.attrs = function(map, el) {
  Object.keys(map).forEach(function(k) {
    el.setAttribute(k, map[k])
  })
}


module.exports = function(root) {
  Weave.prototype.root = root
  return Weave
}

var Str = function(s) {
  if(!(this instanceof Str)) return new Str(s)
  this.str = s
}

Str.prototype.pipe = function(dest) {
  var tru = Tru()
  tru.pipe(dest)
  tru.write(this.str)
  tru.end()
  return dest
}
