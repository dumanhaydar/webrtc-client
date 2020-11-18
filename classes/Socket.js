const io = require('socket.io-client');
const { isBrowser, isNode } = require('browser-or-node');

class Socket {
  constructor(ring) {
    this.peerConnection = ring.peerConnection;
    this.ring = ring;
    console.log(ring.isCaller);
    this.connected = false;
    this.roomNumber = ring.roomNumber;
    this.socket = io("https://rtc.syner.io");
    this.onJoined = this.onJoined.bind(this);
    this.onCall = this.onCall.bind(this);
    this.onCandidate = this.onCandidate.bind(this);
    this.onReady = this.onReady.bind(this);
    this.onOffer = this.onOffer.bind(this);
    this.onAnswer = this.onAnswer.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.listener();
  }
  emit(event, data = null) {
    this.socket.emit(event, data);
  }
  onJoined(room) {
    this.connected = true;
  }
  onCall(room) {
    this.ring.isCaller = false;
    this.socket.emit('ready', this.roomNumber);
    // browserify-ignore-start
    if(isNode) this.ring.call();
    // browserify-ignore-end
  }
  onCandidate(event) {
    var candidate = event.candidate

    this.peerConnection.addIceCandidate(candidate);
  }
  onReady() {
    this.ring.connect();
    var offerOptions = {
      offerToReceiveAudio: 1,
    };
    this.peerConnection.createOffer(offerOptions)
  }
  onOffer(event) {
    this.peerConnection.setRemoteDescription(event)
    this.peerConnection.createAnswer()
  }
  onAnswer(event) {
    this.peerConnection.setRemoteDescription(event)
  }
  onLeave(event) {
    if(this.peerConnection) {
      this.peerConnection.rtcPeerConnection.close();
      this.peerConnection.rtcPeerConnection = null;
      this.peerConnection.init();
    }
    console.log("bye")
  }
  listener() {
    this.socket.on('joined', this.onJoined);
    this.socket.on('call', this.onCall);
    this.socket.on('candidate', this.onCandidate);
    this.socket.on('ready', this.onReady);
    this.socket.on('offer', this.onOffer);
    this.socket.on('answer', this.onAnswer);
    this.socket.on('leave', this.onLeave);
  }
  getInstance() {
    return this.socket;
  }
}

module.exports = Socket;
