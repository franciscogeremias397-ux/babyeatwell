const assets = require('./assets');

function first(candidates) {
  return Array.isArray(candidates) ? candidates[0] : candidates;
}

function getSlotState(slot) {
  return {
    activeSlot: slot,
    videoAClass: slot === 'A' ? 'active' : '',
    videoBClass: slot === 'B' ? 'active' : ''
  };
}

Page({
  data: {
    stage: 'home',
    timerText: '00:00',
    videoA: '',
    videoB: '',
    activeSlot: 'A',
    videoAClass: 'active',
    videoBClass: '',
    loopVideo: true,
    isSwitching: false,
    callStatusText: '正在呼叫...'
  },

  onUnload() {
    this.stopTimer();
    this.stopRingtone();
    this.clearFinishTimer();
    this.clearSwitchGuardTimer();
  },

  startCall() {
    this.clearSwitchGuardTimer();
    this.pendingVideo = null;
    this.setData({
      stage: 'calling',
      timerText: '00:00',
      loopVideo: true,
      callStatusText: '正在呼叫...'
    });
    this.playRingtone();
    this.connectTimer = setTimeout(() => {
      this.stopRingtone();
      this.startTimer();
      this.setData({
        stage: 'connected',
        callStatusText: '通话中'
      }, () => {
        this.switchVideo(assets.videos.idle, { immediate: true });
      });
    }, 1800);
  },

  reset() {
    this.stopTimer();
    this.clearFinishTimer();
    this.clearSwitchGuardTimer();
    this.pendingVideo = null;
    this.setData({
      stage: 'home',
      timerText: '00:00',
      videoA: '',
      videoB: '',
      activeSlot: 'A',
      videoAClass: 'active',
      videoBClass: '',
      loopVideo: true,
      isSwitching: false,
      callStatusText: '正在呼叫...'
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
    const group = this.randomItem(assets.videos.warning);
    this.switchVideo(group);
  },

  playPraise() {
    const group = this.randomItem(assets.videos.praise);
    this.switchVideo(group);
  },

  finishCall() {
    this.stopRingtone();
    this.stopTimer();
    this.setData({
      stage: 'ending',
      loopVideo: false,
      callStatusText: '正在结束...'
    });
    this.switchVideo(assets.videos.finish);
    this.finishTimer = setTimeout(() => {
      this.setData({
        stage: 'done'
      });
    }, 3200);
  },

  randomItem(list) {
    if (!Array.isArray(list) || !list.length) return [];
    return list[Math.floor(Math.random() * list.length)];
  },

  switchVideo(candidates, options = {}) {
    const list = Array.isArray(candidates) ? candidates : [candidates];
    if (!list.length) return;

    const nextSlot = this.data.activeSlot === 'A' ? 'B' : 'A';
    this.pendingVideo = {
      slot: options.immediate ? this.data.activeSlot : nextSlot,
      candidates: list,
      index: 0,
      immediate: !!options.immediate
    };

    const slot = this.pendingVideo.slot;
    this.setData({
      isSwitching: !options.immediate,
      [slot === 'A' ? 'videoA' : 'videoB']: first(list)
    });

    if (options.immediate) {
      this.setData({
        ...getSlotState(slot),
        isSwitching: false
      });
      this.playSlot(slot);
    } else {
      this.scheduleSwitchGuard(slot);
    }
  },

  onVideoReady(event) {
    const slot = event.currentTarget.dataset.slot;
    this.completeVideoSwitch(slot);
  },

  onVideoError(event) {
    const slot = event.currentTarget.dataset.slot;
    if (!this.pendingVideo || this.pendingVideo.slot !== slot) return;

    const nextIndex = this.pendingVideo.index + 1;
    if (nextIndex >= this.pendingVideo.candidates.length) {
      this.clearSwitchGuardTimer();
      this.pendingVideo = null;
      this.setData({
        isSwitching: false
      });
      wx.showToast({
        title: '视频加载失败',
        icon: 'none'
      });
      return;
    }

    this.pendingVideo.index = nextIndex;
    this.setData({
      [slot === 'A' ? 'videoA' : 'videoB']: this.pendingVideo.candidates[nextIndex]
    });
    this.scheduleSwitchGuard(slot);
  },

  completeVideoSwitch(slot) {
    if (!this.pendingVideo || this.pendingVideo.slot !== slot) return;

    this.clearSwitchGuardTimer();
    this.setData({
      ...getSlotState(slot),
      isSwitching: false
    });
    this.playSlot(slot);
    this.pendingVideo = null;
  },

  scheduleSwitchGuard(slot) {
    this.clearSwitchGuardTimer();
    this.switchGuardTimer = setTimeout(() => {
      this.completeVideoSwitch(slot);
    }, 1200);
  },

  onVideoEnded() {
    if (this.data.stage === 'ending') {
      this.clearFinishTimer();
      this.setData({
        stage: 'done'
      });
      return;
    }
    if (this.data.stage === 'connected') {
      this.switchVideo(assets.videos.idle);
    }
  },

  playSlot(slot) {
    const id = slot === 'A' ? 'videoA' : 'videoB';
    const context = wx.createVideoContext(id, this);
    context.play();
  },

  playRingtone() {
    this.stopRingtone();
    const audio = wx.createInnerAudioContext();
    audio.src = first(assets.audio.ringtone);
    audio.loop = true;
    audio.play();
    this.ringtone = audio;
  },

  stopRingtone() {
    if (!this.ringtone) return;
    this.ringtone.stop();
    this.ringtone.destroy();
    this.ringtone = null;
  },

  startTimer() {
    this.stopTimer();
    this.startedAt = Date.now();
    this.timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - this.startedAt) / 1000);
      const minuteText = String(Math.floor(seconds / 60)).padStart(2, '0');
      const secondText = String(seconds % 60).padStart(2, '0');
      this.setData({
        timerText: `${minuteText}:${secondText}`
      });
    }, 500);
  },

  stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  clearFinishTimer() {
    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  },

  clearSwitchGuardTimer() {
    if (!this.switchGuardTimer) return;
    clearTimeout(this.switchGuardTimer);
    this.switchGuardTimer = null;
  }
});
