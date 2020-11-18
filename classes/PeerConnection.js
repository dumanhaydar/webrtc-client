// browserify-ignore-start
const { RTCPeerConnection, RTCSessionDescription, MediaStream, nonstandard } = require('wrtc');
const { RTCAudioSink } = nonstandard
// browserify-ignore-end
const { isBrowser, isNode } = require('browser-or-node');

class PeerConnection {

  constructor(ring) {
    this.configuration = {
      'iceServers': [
          {
            'urls': 'stun:stun.l.google.com:19302'
          }
      ]
    }
    this.ring = ring;
    this.remoteAudio = ring.remoteAudio ? document.getElementById(ring.remoteAudio): null;
    this.localStream = null;
    this.remoteStream = null;
    this.rtcPeerConnection = null;
    this.roomNumber = ring.roomNumber;
    this.mediaStream = new MediaStream();
    this.onIceCandidate = this.onIceCandidate.bind(this);
    this.onTrack = this.onTrack.bind(this);
    this.onConnectionStateChange = this.onConnectionStateChange.bind(this);
    this.onIceConnectionStateChange = this.onIceConnectionStateChange.bind(this);
    this.onSignalingStateChange = this.onSignalingStateChange.bind(this);
    this.onChange = this.onChange.bind(this);
    this.init();
  }

  init() {
    this.rtcPeerConnection = new RTCPeerConnection(this.configuration);
    this.rtcPeerConnection.onicecandidate = this.onIceCandidate;
    this.rtcPeerConnection.ontrack = this.onTrack;
    if(this.localStream) this.localStream.getTracks()
      .forEach(track => this.rtcPeerConnection.addTrack(track, this.localStream));
    this.rtcPeerConnection.onsignalingstatechange = this.onSignalingStateChange;
    this.rtcPeerConnection.onnegotiationneeded = this.onNegotiationNeeded;
    this.rtcPeerConnection.onicegatheringstatechange = this.onChange;
    this.rtcPeerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange;
    this.rtcPeerConnection.ondatachannel = this.onChange;
    this.rtcPeerConnection.onconnectionstatechange = this.onConnectionStateChange;
  }

  onIceCandidate(event) {
    if (event.candidate) {
      this.ring.socket.emit('candidate', {
        type: 'candidate',
        candidate: event.candidate,
        room: this.roomNumber,
      });
    }
  }

  setRemoteDescription(event) {
    this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
  }

  createOffer(offerOptions) {
    this.rtcPeerConnection.createOffer(offerOptions)
    .then(desc => this.setLocalAndOffer(desc))
    .catch(e => console.log(e));
  }

  createAnswer() {
    this.rtcPeerConnection.createAnswer()
    .then(desc => this.setLocalAndAnswer(desc))
    .catch(e => console.log(e));
  }
  addIceCandidate(candidate) {
    this.rtcPeerConnection.addIceCandidate(candidate)
    .catch((e) => console.error(e));
  }
  onTrack(event) {
    // browserify-ignore-start
    if(isNode) {
      this.remoteStream = new RTCAudioSink(event.track)
      this.remoteStream.ondata = data => {
        this.ring.speaker.write(Buffer.from(data.samples.buffer))
      }
    }
    // browserify-ignore-end
    if(isBrowser) {
      if(this.remoteAudio) this.remoteAudio.srcObject = event.streams[0];
      this.remoteStream = event.streams[0];
    }
  }

  setLocalAndOffer(sessionDescription) {
    this.rtcPeerConnection.setLocalDescription(sessionDescription);
    this.ring.socket.emit('offer', {
      type: 'offer',
      sdp: sessionDescription,
      room: this.roomNumber,
    });
  }

  setLocalAndAnswer(sessionDescription) {
    this.rtcPeerConnection.setLocalDescription(sessionDescription);
    this.ring.socket.emit('answer', {
      type: 'answer',
      sdp: sessionDescription,
      room: this.roomNumber,
    });
  }

  addLocalStream(stream) {
    this.localStream = stream;
    if(this.rtcPeerConnection)
      this.localStream.getTracks().forEach(track => this.rtcPeerConnection.addTrack(track, this.localStream));
  }

  onChange(event) {
    //console.log(event);
  }

  onNegotiationNeeded(event) {
    console.log('onNegotiationNeeded: ', true)
  }
  onIceConnectionStateChange(event) {
    if(this.rtcPeerConnection)
      console.log('onIceConnectionStateChange: ', this.rtcPeerConnection.iceConnectionState)

  }
  onConnectionStateChange(event) {
    if(this.rtcPeerConnection)
      console.log('onConnectionStateChange: ', this.rtcPeerConnection.connectionState)

  }
  onSignalingStateChange(event) {
    if(this.rtcPeerConnection)
      console.log('onSignalingStateChange: ', this.rtcPeerConnection.signalingState)

  }
  getInstance() {
    return this.rtcPeerConnection;
  }
}

module.exports = PeerConnection;
