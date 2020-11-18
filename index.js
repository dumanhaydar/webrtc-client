const { isBrowser } = require('browser-or-node');
const Ring = require('./classes/Ring');
var remoteAudio;

if (isBrowser) {
    var btnGoBoth = document.getElementById('goBoth');
    var btnAsk = document.getElementById('ask');
    var remoteAudio = 'remoteAudio';
}

const ring = new Ring(remoteAudio);

if (isBrowser) {
    btnGoBoth.onclick = () => ring.call();
    btnAsk.onclick = () => ring.prepareMaterial();
}
