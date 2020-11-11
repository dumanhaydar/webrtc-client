const { nonstandard } = require('wrtc');
const { RTCAudioSource } = nonstandard
const mic = require('mic-stream')
const _child_process = require("child_process");

class NodeWebRtcAudioSource extends RTCAudioSource {
  constructor() {
    super();
    this.ps = null;
    this.cache = Buffer.alloc(0);
  }

  createTrack() {
    const track = super.createTrack();

    if (this.ps === null) {
      this.start();
    }

    return track;
  }

  async start() {

    if (this.ps !== null) {
      this.stop(); // stop existing process
    }

    this.ps = (0, _child_process.spawn)('arecord', [
      '-c', '1', // 2 channels
      '-r', '48000', // 44100Hz sample rate
      '-f', 'S16_LE', // little endian 16 bit
      '--buffer-size=1920'
    ]);


    this.ps.stdout.on('data', buffer => {
      this.cache = Buffer.concat([this.cache, buffer]);
    });

    const processData = () => {
      while (this.cache.length > 960) {
        const buffer = this.cache.slice(0, 960);
        this.cache = this.cache.slice(960);
        const samples = new Int16Array(new Uint8Array(buffer).buffer);
        this.onData({
          bitsPerSample: 16,
          sampleRate: 48000,
          channelCount: 1,
          numberOfFrames: samples.length,
          type: 'data',
          samples
        });
      }
      if (this.ps !== null) {
        setTimeout(() => processData(), 10);
      }
    };

    processData();
  }

  stop() {
    if (this.ps !== null) {
      this.ps.kill('SIGTERM');
      this.ps = null;
    }
  }
}

module.exports = NodeWebRtcAudioSource;
