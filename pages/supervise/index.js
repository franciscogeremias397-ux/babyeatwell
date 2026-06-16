const assets = require('./assets');

function toList(candidates) {
  if (!Array.isArray(candidates)) return candidates ? [candidates] : [];
  return candidates.filter(Boolean);
}

Page({
  data: {
    stage: 'home',
    timerText: '00:00',
    callingTimerText: '00:00',
    currentVideo: '',
    isLooping: false,
    isSwitching: false,
    callStatusText: '通话中',
    videoMode: 'idle'
  },

  onUnload() {
    this.clearAllRuntime();
  },

  startCall() {
    this.clearAllRuntime();
    this.setData({
      stage: 'calling',
      timerText: '00:00',
      callingTimerText: '00:00',
      currentVideo: '',
      isLooping: false,
      isSwitching: false,
      callStatusText: '正在呼叫',
      videoMode: 'calling'
    });
    this.playRingtone();
    this.startCallingTimer();
    this.connectTimer = setTimeout(() => {
      this.stopRingtone();
      this.stopCallingTimer();
      this.startTimer();
      this.setData({
        stage: 'connected',
        callStatusText: '通话中',
        timerText: '00:00'
      }, () => {
        this.playVideo(assets.videos.opening, {
          mode: 'opening',
          loop: false
        });
      });
    }, 4200);
  },

  reset() {
    this.clearAllRuntime();
    this.setData({
      stage: 'home',
      timerText: '00:00',
      callingTimerText: '00:00',
      currentVideo: '',
      isLooping: false,
      isSwitching: false,
      callStatusText: '通话中',
      videoMode: 'idle'
    });
  },

  goBack() {
    wx.navigateBack({
      fail() {
        wx.redirectTo({
          url: '/pages/index/index'
        });
      }
    });
  },

  playWarning() {
    if (this.data.stage !== 'connected' || this.data.videoMode !== 'idle') return;
    const group = this.randomItem(assets.videos.warning);
    this.playVideo(group, {
      mode: 'action',
      loop: false
    });
  },

  playPraise() {
    if (this.data.stage !== 'connected' || this.data.videoMode !== 'idle') return;
    const group = this.randomItem(assets.videos.praise);
    this.playVideo(group, {
      mode: 'action',
      loop: false
    });
  },

  finishCall() {
    if (this.data.stage === 'ending') return;
    this.stopRingtone();
    this.setData({
      stage: 'ending',
      isLooping: false,
      callStatusText: '正在结束'
    });
    this.playVideo(assets.videos.finish, {
      mode: 'finish',
      loop: false
    });
  },

  randomItem(list) {
    if (!Array.isArray(list) || !list.length) return [];
    return list[Math.floor(Math.random() * list.length)];
  },

  playVideo(candidates, options = {}) {
    const list = toList(candidates);
    if (!list.length) return;

    this.videoCandidates = list;
    this.videoCandidateIndex = 0;
    this.clearVideoReadyGuard();
    this.setData({
      currentVideo: list[0],
      videoMode: options.mode || 'action',
      isLooping: !!options.loop,
      isSwitching: true
    }, () => {
      this.scheduleVideoReadyGuard();
      this.playCurrentVideo();
    });
  },

  playIdle() {
    this.playVideo(assets.videos.idle, {
      mode: 'idle',
      loop: true
    });
  },

  onVideoReady() {
    if (!this.data.isSwitching) return;
    this.clearVideoReadyGuard();
    this.setData({
      isSwitching: false
    }, () => {
      this.playCurrentVideo();
    });
  },

  onVideoError() {
    const list = this.videoCandidates || [];
    const nextIndex = (this.videoCandidateIndex || 0) + 1;
    if (nextIndex < list.length) {
      this.videoCandidateIndex = nextIndex;
      this.clearVideoReadyGuard();
      this.setData({
        currentVideo: list[nextIndex],
        isSwitching: true
      }, () => {
        this.scheduleVideoReadyGuard();
        this.playCurrentVideo();
      });
      return;
    }

    const mode = this.data.videoMode;
    this.clearVideoReadyGuard();
    this.setData({
      isSwitching: false
    });

    if (mode === 'finish') {
      this.finishToDone();
      return;
    }

    if (mode === 'opening' || mode === 'action') {
      this.playIdle();
      return;
    }

    if (mode === 'idle') {
      wx.showToast({
        title: '视频加载失败',
        icon: 'none'
      });
    }
  },

  onVideoEnded() {
    const mode = this.data.videoMode;
    if (mode === 'finish') {
      this.finishToDone();
      return;
    }
    if (mode === 'opening' || mode === 'action') {
      this.playIdle();
    }
  },

  playCurrentVideo() {
    if (!this.data.currentVideo) return;
    const context = wx.createVideoContext('callVideo', this);
    context.play();
  },

  stopCurrentVideo() {
    const context = wx.createVideoContext('callVideo', this);
    context.stop();
  },

  playRingtone() {
    this.stopRingtone();
    const list = toList(assets.audio.ringtone);
    if (!list.length) return;

    const playAt = (index) => {
      const audio = wx.createInnerAudioContext();
      audio.src = list[index];
      audio.loop = true;
      audio.onError(() => {
        audio.destroy();
        if (this.ringtone === audio) {
          this.ringtone = null;
        }
        if (index + 1 < list.length && this.data.stage === 'calling') {
          playAt(index + 1);
        }
      });
      audio.play();
      this.ringtone = audio;
    };

    playAt(0);
  },

  stopRingtone() {
    if (!this.ringtone) return;
    this.ringtone.stop();
    this.ringtone.destroy();
    this.ringtone = null;
  },

  startCallingTimer() {
    this.stopCallingTimer();
    this.callingStartedAt = Date.now();
    this.callingTimer = setInterval(() => {
      this.setData({
        callingTimerText: this.formatDuration(Date.now() - this.callingStartedAt)
      });
    }, 500);
  },

  stopCallingTimer() {
    if (!this.callingTimer) return;
    clearInterval(this.callingTimer);
    this.callingTimer = null;
  },

  startTimer() {
    this.stopTimer();
    this.startedAt = Date.now();
    this.timer = setInterval(() => {
      this.setData({
        timerText: this.formatDuration(Date.now() - this.startedAt)
      });
    }, 500);
  },

  formatDuration(duration) {
    const seconds = Math.floor(duration / 1000);
    const minuteText = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secondText = String(seconds % 60).padStart(2, '0');
    return `${minuteText}:${secondText}`;
  },

  stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  finishToDone() {
    this.stopTimer();
    this.clearVideoReadyGuard();
    this.setData({
      stage: 'done',
      currentVideo: '',
      isLooping: false,
      isSwitching: false,
      videoMode: 'idle'
    });
  },

  scheduleVideoReadyGuard() {
    this.clearVideoReadyGuard();
    this.videoReadyGuard = setTimeout(() => {
      this.onVideoReady();
    }, 1200);
  },

  clearVideoReadyGuard() {
    if (!this.videoReadyGuard) return;
    clearTimeout(this.videoReadyGuard);
    this.videoReadyGuard = null;
  },

  clearAllRuntime() {
    this.stopTimer();
    this.stopCallingTimer();
    this.stopRingtone();
    this.stopCurrentVideo();
    this.clearFinishTimer();
    this.clearVideoReadyGuard();
    this.videoCandidates = [];
    this.videoCandidateIndex = 0;
  },

  clearFinishTimer() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }
});
