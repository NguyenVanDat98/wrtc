import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBNVpFXu_vi8ZrWf23aZostv27IzMLP174",
  authDomain: "chat-app-89b8b.firebaseapp.com",
  projectId: "chat-app-89b8b",
  storageBucket: "chat-app-89b8b.appspot.com",
  messagingSenderId: "464088885012",
  appId: "1:464088885012:web:2d21ca066b4138259a4401",
  measurementId: "G-KS3KP0K9H9"
}
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const audioButton = document.getElementById('audioButton');
const getOffer = document.getElementById('getOffer');

// 1. Setup media sources
let oudio =true
webcamButton.onclick = async () => {
  localStream = await window.navigator.mediaDevices.getUserMedia({ video: true, audio: oudio });
  remoteStream = new MediaStream();
  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
};

audioButton.onclick=async(value)=>{
  oudio= !oudio
  localStream = await window.navigator.mediaDevices.getUserMedia({ video: true, audio: oudio })
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };
  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;
}
// 2. Create an offer
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  hangupButton.disabled = false;
};



// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;

  console.log('🚀 ----------------------------------------------------------------🚀');
  console.log('🚀 ~ file: main.js:138 ~ answerButton.onclick= ~ callId:', callId);
  console.log('🚀 ----------------------------------------------------------------🚀');

  const callDoc = firestore.collection('calls').doc(callId);


  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  console.log('🚀 --------------------------------------------------------------------🚀');
  console.log('🚀 ~ file: main.js:146 ~ answerButton.onclick= ~ callData:', callData);
  console.log('🚀 --------------------------------------------------------------------🚀');


  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        let data = change.doc.data();
        console.log(data.candidate);
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });
  });
};

getOffer.onclick =async()=>{
  const dataCalls = (await firestore.collection('calls').doc().get()).data();
 
  console.log(dataCalls)
}
