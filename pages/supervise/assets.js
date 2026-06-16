const BASE = 'https://sg.gouqii.com/guai-guai-chi-fan/assets/miniprogram-hq-20260604';

function candidates(...paths) {
  return paths.map((path) => `${BASE}${path}`);
}

module.exports = {
  videos: {
    opening: candidates('/videos/opening/opening-001.mp4', '/videos/opening.mp4', '/开场高清mp4.mp4'),
    idle: candidates('/videos/idle/idle-001.mp4', '/videos/idle-001.mp4', '/idle-001.mp4'),
    praise: [
      candidates('/videos/praise/praise-001.mp4', '/videos/praise-001.mp4', '/praise-001.mp4'),
      candidates('/videos/praise/praise-002.mp4', '/videos/praise-002.mp4', '/praise-002.mp4')
    ],
    warning: [
      candidates('/videos/warning/warning-001.mp4', '/videos/warning-001.mp4', '/warning-001.mp4'),
      candidates('/videos/warning/warning-002.mp4', '/videos/warning-002.mp4', '/warning-002.mp4'),
      candidates('/videos/warning/warning-003.mp4', '/videos/warning-003.mp4', '/warning-003.mp4')
    ],
    finish: candidates('/videos/finish/finish-001.mp4', '/videos/finish-001.mp4', '/finish-001.mp4')
  },
  audio: {
    ringtone: '/assets/audio/ringtone.m4a'
  }
};
