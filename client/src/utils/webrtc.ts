// A simplified WebRTC implementation that doesn't rely on external libraries

export interface PeerConnection {
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>;
  onIceCandidate: (callback: (candidate: RTCIceCandidate) => void) => void;
  onTrack: (callback: (stream: MediaStream) => void) => void;
  onConnectionStateChange: (callback: (state: RTCPeerConnectionState) => void) => void;
  onIceConnectionStateChange: (callback: (state: RTCIceConnectionState) => void) => void;
  addTrack: (track: MediaStreamTrack, stream: MediaStream) => void;
  replaceTrack: (oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack) => void;
  removeTrack: (track: MediaStreamTrack) => void;
  addStream: (stream: MediaStream) => void;
  removeStream: (stream: MediaStream) => void;
  restartIce: () => Promise<void>;
  getStats: () => Promise<RTCStatsReport>;
  close: () => void;
  getRTCPeerConnection: () => RTCPeerConnection;
}

// Check if WebRTC is supported by the browser
export function isWebRTCSupported(): boolean {
  return (
    typeof RTCPeerConnection !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia !== 'undefined'
  );
}

export function createPeerConnection(_initiator: boolean): PeerConnection {
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Free TURN server from Twilio (limited but should work for testing)
      {
        urls: 'turn:global.turn.twilio.com:3478?transport=udp',
        username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be9c27212d',
        credential: 'w1uxM/+YdY6yvpwW+t+P/EIIP+c='
      }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    sdpSemantics: 'unified-plan'
  };

  const pc = new RTCPeerConnection(configuration);
  let iceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null;
  let trackCallback: ((stream: MediaStream) => void) | null = null;
  let connectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;
  let iceConnectionStateChangeCallback: ((state: RTCIceConnectionState) => void) | null = null;
  const remoteStream = new MediaStream();

  // Log connection state changes
  pc.onconnectionstatechange = () => {
    console.log(`WebRTC Connection State: ${pc.connectionState}`);
    if (connectionStateChangeCallback) {
      connectionStateChangeCallback(pc.connectionState);
    }
  };

  // Log ICE connection state changes
  pc.oniceconnectionstatechange = () => {
    console.log(`ICE Connection State: ${pc.iceConnectionState}`);

    if (iceConnectionStateChangeCallback) {
      iceConnectionStateChangeCallback(pc.iceConnectionState);
    }

    // Handle ICE connection failures
    if (pc.iceConnectionState === 'failed') {
      console.error('ICE connection failed, attempting to restart ICE');
      // Try to restart ICE
      pc.restartIce();
    }
  };

  // Handle ICE gathering state changes
  pc.onicegatheringstatechange = () => {
    console.log(`ICE Gathering State: ${pc.iceGatheringState}`);
  };

  // Log signaling state changes
  pc.onsignalingstatechange = () => {
    console.log(`Signaling State: ${pc.signalingState}`);
  };

  pc.onicecandidate = (event) => {
    console.log('ICE candidate generated:', event.candidate);
    if (event.candidate && iceCandidateCallback) {
      iceCandidateCallback(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    console.log('Track received:', event.track.kind);
    if (event.streams && event.streams[0]) {
      event.streams[0].getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to remote stream`);
        remoteStream.addTrack(track);
      });

      if (trackCallback) {
        trackCallback(remoteStream);
      }
    } else {
      console.warn('Received track without associated stream');
    }
  };

  return {
    async createOffer() {
      console.log('Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      console.log('Setting local description (offer):', offer);
      await pc.setLocalDescription(offer);
      return offer;
    },

    async createAnswer(offer) {
      console.log('Setting remote description (offer):', offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      console.log('Setting local description (answer):', answer);
      await pc.setLocalDescription(answer);
      return answer;
    },

    async addIceCandidate(candidate) {
      console.log('Adding ICE candidate:', candidate);
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    },

    async setRemoteDescription(description) {
      console.log('Setting remote description:', description);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(description));
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    },

    onIceCandidate(callback) {
      iceCandidateCallback = callback;
    },

    onTrack(callback) {
      trackCallback = callback;
      // If we already have tracks, call the callback immediately
      if (remoteStream.getTracks().length > 0) {
        console.log('Calling track callback immediately with existing tracks');
        callback(remoteStream);
      }
    },

    onConnectionStateChange(callback) {
      connectionStateChangeCallback = callback;
    },

    onIceConnectionStateChange(callback) {
      iceConnectionStateChangeCallback = callback;
    },

    addTrack(track, stream) {
      console.log(`Adding ${track.kind} track to peer connection`);
      try {
        pc.addTrack(track, stream);
      } catch (error) {
        console.error('Error adding track:', error);
      }
    },

    replaceTrack(oldTrack, newTrack) {
      console.log(`Replacing ${oldTrack.kind} track`);
      const senders = pc.getSenders();
      const sender = senders.find(s => s.track && s.track.kind === oldTrack.kind);
      if (sender) {
        sender.replaceTrack(newTrack);
      } else {
        console.warn('No sender found for track replacement');
      }
    },

    removeTrack(track) {
      console.log(`Removing ${track.kind} track`);
      const senders = pc.getSenders();
      const sender = senders.find(s => s.track && s.track.id === track.id);
      if (sender) {
        pc.removeTrack(sender);
      } else {
        console.warn('No sender found for track removal');
      }
    },

    addStream(stream) {
      console.log(`Adding stream with ${stream.getTracks().length} tracks`);
      stream.getTracks().forEach(track => {
        this.addTrack(track, stream);
      });
    },

    removeStream(stream) {
      console.log(`Removing stream with ${stream.getTracks().length} tracks`);
      stream.getTracks().forEach(track => {
        this.removeTrack(track);
      });
    },

    async getStats() {
      return await pc.getStats();
    },

    close() {
      console.log('Closing peer connection');
      pc.close();
    },

    getRTCPeerConnection() {
      return pc;
    }
  };
}
