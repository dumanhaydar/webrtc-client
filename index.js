const io = require('socket.io-client');
const { isBrowser, isNode } = require('browser-or-node');

// browserify-ignore-start
var gpio = require('rpi-gpio');

gpio.setup(29, gpio.DIR_IN, gpio.EDGE_BOTH);
gpio.setup(33, gpio.DIR_IN, gpio.EDGE_BOTH);
gpio.setup(32, gpio.DIR_IN, gpio.EDGE_BOTH);
gpio.setup(36, gpio.DIR_IN, gpio.EDGE_BOTH);
gpio.setup(37, gpio.DIR_IN, gpio.EDGE_BOTH);

gpio.on('change', function(channel, value) {
    if(channel == 29 && value == true) {
        console.log("Appel")
    }
});
// browserify-ignore-end

// browserify-ignore-start
const { RTCPeerConnection, RTCSessionDescription, MediaStream, nonstandard } = require('wrtc');
const { RTCAudioSink } = nonstandard
const Speaker = require('speaker')
const NodeWebRtcAudioSource = require('./lib/NodeWebRtcAudioSource');
// browserify-ignore-end
const roomNumber = 'webrtc';
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
const socket = io("https://rtc.syner.io");

if (isBrowser) {
    var btnGoBoth = document.getElementById('goBoth');
    var remoteAudio = document.getElementById('remoteAudio');

    btnGoBoth.onclick = () => call();
}

var rtcAudioSource;
var speaker;
// browserify-ignore-start
if (isNode) {
    rtcAudioSource = new NodeWebRtcAudioSource()
    speaker = new Speaker({ channels: 1, bitDepth: 16, sampleRate: 48000, signed: true })

}
// browserify-ignore-end

var localStream;
var remoteStream;
var rtcPeerConnection;
var isCaller;
var connected;

createPeerConnection();
initiateCall();

function initiateCall() {
    socket.emit('join', roomNumber);
}

socket.on('joined', function(room) {
    connected = true;
});

socket.on('call', function(room) {
    isCaller = false;
    socket.emit('ready', roomNumber);
    // browserify-ignore-start
    if(isNode) call();
    // browserify-ignore-end
});

function prepareMaterial() {
    if(isBrowser) {
        const streamConstraints = {
            video: false,
            audio: true,
        };

        navigator.mediaDevices.getUserMedia(streamConstraints).then(function(stream) {
            addLocalStream(stream);
        }).catch(function(err) {
            console.log('An error ocurred when accessing media devices');
        });
    }
}

function call() {
    isCaller = true;
    prepareMaterial();
    socket.emit('call', roomNumber);
}

socket.on('candidate', function(event) {
    var candidate = event.candidate

    rtcPeerConnection.addIceCandidate(candidate)
    .catch((e) => console.error(e));
});


socket.on('ready', function() {
    initiateCall();
    // browserify-ignore-start
    if (isNode) {
        if(!localStream) {
            const mediaStream = new MediaStream()
            const track = rtcAudioSource.createTrack()
            mediaStream.addTrack(track);
            addLocalStream(mediaStream);
        }
    }
    // browserify-ignore-end
    var offerOptions = {
        offerToReceiveAudio: 1,
    };
    rtcPeerConnection.createOffer(offerOptions)
    .then(desc => setLocalAndOffer(desc))
    .catch(e => console.log(e));
});

socket.on('offer', function(event) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
    rtcPeerConnection.createAnswer()
    .then(desc => setLocalAndAnswer(desc))
    .catch(e => console.log(e));
});

socket.on('answer', function(event) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
});

socket.on('leave', function(event) {
    if(rtcPeerConnection) {
        rtcPeerConnection.close();
        rtcPeerConnection = null;
        createPeerConnection();
    }
    console.log("bye")
});

// handler functions
function onIceCandidate(event) {
    if (event.candidate) {
        socket.emit('candidate', {
            type: 'candidate',
            candidate: event.candidate,
            room: roomNumber,
        });
    }
}


function onTrack(event) {
    // browserify-ignore-start
    if(isNode) {
        remoteStream = new RTCAudioSink(event.track)
        remoteStream.ondata = data => {
            speaker.write(Buffer.from(data.samples.buffer))
        }
    }
    // browserify-ignore-end
    if(isBrowser) {
        remoteAudio.srcObject = event.streams[0];
        remoteStream = event.streams[0];
    }
}

function setLocalAndOffer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        room: roomNumber,
    });
}

function setLocalAndAnswer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer', {
        type: 'answer',
        sdp: sessionDescription,
        room: roomNumber,
    });
}

function addLocalStream(stream) {
    localStream = stream;
    if(rtcPeerConnection) localStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, localStream));
}

function onChange(event) {
    //console.log(event);
}

function onNegotiationNeeded(event) {

    console.log('onNegotiationNeeded: ', true)
}
function onIceConnectionStateChange(event) {
    if(rtcPeerConnection) console.log('onIceConnectionStateChange: ', rtcPeerConnection.iceConnectionState)

}
function onConnectionStateChange(event) {
    if(rtcPeerConnection) console.log('onConnectionStateChange: ', rtcPeerConnection.connectionState)

}
function onSignalingStateChange(event) {
    if(rtcPeerConnection) console.log('onSignalingStateChange: ', rtcPeerConnection.signalingState)

}

function createPeerConnection() {
    rtcPeerConnection = new RTCPeerConnection(configuration);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onTrack;
    if(localStream) localStream.getTracks()
    .forEach(track => rtcPeerConnection.addTrack(track, localStream));
    rtcPeerConnection.onsignalingstatechange = onSignalingStateChange;
    rtcPeerConnection.onnegotiationneeded = onNegotiationNeeded;
    rtcPeerConnection.onicegatheringstatechange = onChange;
    rtcPeerConnection.oniceconnectionstatechange = onIceConnectionStateChange;
    rtcPeerConnection.ondatachannel = onChange;
    rtcPeerConnection.onconnectionstatechange = onConnectionStateChange;
}
