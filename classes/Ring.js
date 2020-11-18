const {Telegraf} = require('telegraf');
const PeerConnection = require('./PeerConnection');
const Floor = require('./Floor');
const Socket = require('./Socket');
const { isBrowser, isNode } = require('browser-or-node');
const bot = new Telegraf('');

// browserify-ignore-start
const Speaker = require('speaker');
const NodeWebRtcAudioSource = require('../lib/NodeWebRtcAudioSource');
// browserify-ignore-end

class Ring {

  constructor(remoteAudio = null) {
    this.mediaStream = null;
    this.speaker = null;
    this.isCaller = false;
    this.roomNumber = 'webrtc';
    this.peerConnection = new PeerConnection(this);
    this.socket = new Socket(this);
    this.prepareMaterial();

    // browserify-ignore-start
    this.floors = [
        {
            'pin': 32,
            'clients': [
                '123123'
            ]
        }
    ]
    this.floor = new Floor(this);
    // browserify-ignore-end
    this.connect();
  }

  connect() {
    this.socket.getInstance().emit('join', this.roomNumber);
  }

  call() {
    this.isCaller = true;
    this.socket.getInstance().emit('call', this.roomNumber);
  }

  sendTelegramMessage(clients, snapshot) {
    clients.forEach((client) => {
      bot.telegram.sendPhoto(client,
          {'source': snapshot, 'filename': 'snapshot.jpg'},
          {'caption': 'Quelqu\'un sonne à la porte\n\rhttps://rtc.syner.io'});
    });
    bot.telegram.sendPhoto(-431066392,
        {'source': snapshot, 'filename': 'snapshot.jpg'},
        {'caption': 'Quelqu\'un sonne à la porte\n\rhttps://rtc.syner.io'});
  }

  prepareMaterial() {
    if (isBrowser) {
      const streamConstraints = {
        video: false,
        audio: true,
      };
      const peerConnection = this.peerConnection;
      navigator.mediaDevices.getUserMedia(streamConstraints).
          then(function(stream) {
            peerConnection.addLocalStream(stream);
          }).
          catch(function(err) {
            console.log('An error ocurred when accessing media devices');
          });
    }
    // browserify-ignore-start
    if (isNode) {
      let rtcAudioSource = new NodeWebRtcAudioSource();
      const track = rtcAudioSource.createTrack();
      const mediaStream = this.peerConnection.mediaStream;
      mediaStream.addTrack(track);
      this.peerConnection.addLocalStream(mediaStream);
      this.speaker = new Speaker(
          {channels: 1, bitDepth: 16, sampleRate: 48000, signed: true});

    }
    // browserify-ignore-end
  }
}

module.exports = Ring;
