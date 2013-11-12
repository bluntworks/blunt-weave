var fs      = require('fs')
var log     = require('blunt-log')
var Tru     = require('through')
var Cat     = require('concat-stream')
var trumpet = require('trumpet')

var Weave = function(file) {
  if(!(this instanceof Weave)) return new Weave(file)
  file || (file ='/index.html')
  this.outer = fs.createReadStream(this.root + file )
  this.partials = []
}

var wp = Weave.prototype

wp.render = function(file) {
  var file = file || '/index.html'
  this.outer = fs.createReadStream(this.root + file)
  return this
}

wp.head = function(file, map) {
  this.partials.push({
    type: 'append',
    selector: 'head',
    stream: fs.createReadStream(this.root + file),
    map: map
  })
  return this
}

wp.append = function(sel, file, map) {
  var o = {
    type: 'append',
    selector: sel,
    stream: fs.createReadStream(this.root + file),
    map: map
  }
  this.partials.push(o)
  return this
}


wp.repeat = function(sel, snip, data) {
  //bail early if no data
  if(!data) return this
  this.partials.push({
    type: 'repeat',
    selector: sel,
    snippet: snip,
    data: data
  })
  return  this
}

wp.html = function(sel, text) {
  this.partials.push({
    type: 'html',
    selector: sel,
    text: text
  })
  return this
}

wp.attrs = function(sel, attrs) {
  this.partials.push({
    type: 'attrs',
    selector: sel,
    attrs: attrs
  })
  return this
}

wp.loop = function(sel, file, maps) {
  this.partials.push({
    type: 'loop',
    selector: sel,
    file: file,
    rs: fs.createReadStream(this.root + file),
    maps: maps
  })
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
    switch(part.type) {
      case 'append':
        part
          .stream
          .pipe(self._append(tr, mtr, part))
        break
      case 'html':
        self._html(tr, mtr, part)
        break
      case 'repeat':
        self._repeat(tr, mtr, part)
        break
      case 'attrs':
        self._attrs(tr, mtr, part)
        break
      case 'loop':
        part
          .rs
          .pipe(self._loop(tr, mtr, part))
        break
    }
  })

  this.outer.pipe(tr)
  tr.pipe(mtr).pipe(res)
  tr.on('end', function() {
    tr = null
    mtr = null
    parts = null
    self.outer = null
    res = null
  })
}

wp._loop = function(tr, mtr, part) {
  var self = this
  var maps = part.maps
  var mel  = mtr.select(part.selector)
  var ms   = mel.createWriteStream()

  var cat = Cat(function(all) { ms.end(all) })

  var tru = Tru()
  tru.autoDestroy = false
  tru.pipe(cat)

  var len = part.maps.length
  function loop(html) {
    maps.forEach(function(map) {
      var ftr = trumpet()

      Object.keys(map).forEach(function(k) {
        var it = map[k]
        if('object' == typeof it) self.mapper(k, it, ftr)
        else {
          var fel = ftr.select(k)
          var fs  = fel.createWriteStream()
          fs.end(map[k])
        }
      })

      ftr.on('end', function() {
        if(len-- === 1) tru.end()
      })

      ftr.on('data', function(data) { tru.write(data)  })

      ftr.end(html)
    })
  }

  return Cat(function(html) { loop(html) })
}

wp._setAttrs = function(el, attrs) {
  Object.keys(attrs).forEach(function(ak) {
    el.setAttribute(ak, attrs[ak])
  })
}


wp._attrs = function(tr, mtr, part) {
  var el = mtr.select(part.selector)
  this._setAttrs(el, part.attrs)
}

wp._html = function(tr, mtr, part) {
  var el = tr.select(part.selector)
  var ws = el.createWriteStream()
  ws.end(part.text)
}

wp._repeat = function(tr, mtr, part) {
  var self = this

  var sel  = part.selector
  var data = part.data
  var snip = part.snippet

  var el = mtr.select(sel)
  var es = el.createWriteStream()

  //collect all the inrs
  //and send them to the ws when finished
  var cat = Cat(function(d) { es.end(d) })

  var tru  = Tru()
  tru.autoDestroy = false
  tru.pipe(cat)

  data.forEach(function(d) {
    var inr  = trumpet()
    var iel = inr.select('*')
    var iws = iel.createWriteStream()

    //inr.pipe(tru)
    inr.on('data', function(_d) {
      tru.write(_d)
    })

    Object.keys(d.attrs).forEach(function(k) {
      iel.setAttribute(k, d.attrs[k])
    })

    iws.end(d.text)

    inr.write(snip)
  })

  tru.end()
}


wp._append = function(tr, mtr, part) {
  var self = this
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
        ms.end(_map[k])
      }
    })
  }

  return es
}

wp.mapper = function(k, o, tr) {
  if(Array.isArray(o)) return
  var el = tr.select(k)
  if(!el) return

  var v = o.inner || o.text || o.val

  if(v) {
    var es = el.createWriteStream()
    es.end(v)
  }

  if(o.attrs) this._setAttrs(el, o.attrs)
}

// wp.attrs = function(map, el) {
//   Object.keys(map).forEach(function(k) {
//     el.setAttribute(k, map[k])
//   })
// }


module.exports = function(root) {
  Weave.prototype.root = root
  return Weave
}
