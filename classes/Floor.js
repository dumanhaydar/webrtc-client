// browserify-ignore-start
var rpio = require('rpio');
var MemoryFileSystem = require("memory-fs");
const http = require('http');
var fs = new MemoryFileSystem();
var { debounce } = require('throttle-debounce')

class Floor {
  constructor(ring) {
    this.debounceFunc = null;
    this.snapshot = "/snapshot.jpg";
    this.snapshotCamera = "http://192.168.42.70:8080/?action=snapshot";
    this.ring = ring;
    this.clients = [];
    this.init();
  }

  init() {
    this.ring.floors.forEach((floor) => {
      this.setup(floor.pin);
      this.listener(floor.pin);
    })
  }

  setup(pin) {
    rpio.open(pin, rpio.INPUT, rpio.PULL_UP);
  }

  listener(pin) {
    rpio.poll(32, this.poll, rpio.POLL_HIGH);
  }

  poll(pin)
  {
    rpio.msleep(20);
    this.debounceFunc = debounce(5000, true, this.push);
  }

  push(pin) {
    this.floor = this.ring.floors.filter(floor => parseInt(floor.pin) === parseInt(pin))
    this.floor = this.floor.length > 0 ? this.floor[0] : null;
    const file = fs.createWriteStream(this.snapshot);
    const request = http.get(this.snapshotCamera, function(response) {
      response.pipe(file);
      var stream = response.pipe(file);
      stream.on('finish', function () {
        let snapshot = fs.readFileSync(this.snapshot);
        this.ring.sendTelegramMessage(this.floor.clients, snapshot);
      });
    })
  }
}

module.exports = Floor;
// browserify-ignore-end
