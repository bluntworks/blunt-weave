module.exports = function(stats) {
  var mu = process.memoryUsage()

  if(stats) {
    mu.est_base = stats.estimated_base,
    mu.cur_base = stats.current_base
  }

  var hm = humanMem(mu)

  return {
    hm: hm,
    str: stringify(hm)
  }

}

function stringify(hm) {
  var s = ''
  Object.keys(hm).forEach(function(k) {
    s +=  '\n' + k + '\t[' + Math.floor(hm[k]).toFixed(2) + 'Mb]'
  })
  return s
}

function humanMem(mu) {
  var hm = {}
  Object.keys(mu).forEach(function(k) {
    hm[k] = mu[k] / 1024 / 1024
  })
  return hm
}
