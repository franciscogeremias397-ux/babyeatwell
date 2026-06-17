const assets = require('./assets');

const VIDEO_FADE_MS = 220;

function toList(candidates) {
  if (!Array.isArray(candidates)) return candidates ? [candidates] : [];
  return candidates.filter(Boolean);
}

function otherLayer(layer) {
  return layer === 'front' ? 'back' : 'front';
}

function videoKey(layer) {
  return `${layer}Video`;
}

function loopKey(layer) {
  return `${layer}Loop`;
}

function mutedKey(layer) {
  return `${layer}Muted`;
}

function layerPatch(layer, values) {
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(values, 'video')) patch[videoKey(layer)] = values.video;
  if (Object.prototype.hasOwnProperty.call(values, 'loop')) patch[loopKey(layer)] = !!values.loop;
  if (Object.prototype.hasOwnProperty.call(values, 'muted')) patch[mutedKey(layer)] = !!values.muted;
  return patch;
}

Page({
  data: {
    stage: 'home',
    timerText: '00:00',
    callingTimerText: '00:00',
    currentVideo: '',
    frontVideo: '',
    backVideo: '',
    activeLayer: 'front',
    frontLoop: false,
    backLoop: false,
    frontMuted: false,
    backMuted: true,
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
      frontVideo: '',
      backVideo: '',
      activeLayer: 'front',
      frontLoop: false,
      backLoop: false,
      frontMuted: false,
      backMuted: true,
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
      frontVideo: '',
      backVideo: '',
      activeLayer: 'front',
      frontLoop: false,
      backLoop: false,
      frontMuted: false,
      backMuted: true,
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
    if (this.data.stage !== 'connected' || this.data.isSwitching || this.data.videoMode !== 'idle') return;
    const group = this.randomItem(assets.videos.warning);
    this.playVideo(group, {
      mode: 'action',
      loop: false
    });
  },

  playPraise() {
    if (this.data.stage !== 'connected' || this.data.isSwitching || this.data.videoMode !== 'idle') return;
    const group = this.randomItem(assets.videos.praise);
    this.playVideo(group, {
      mode: 'action',
      loop: false
    });
  },

  finishCall() {
    if (this.data.stage === 'ending' || this.data.isSwitching) return;
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

    const mode = options.mode || 'action';
    const loop = !!options.loop;
    const activeLayer = this.data.activeLayer || 'front';
    const hasActiveVideo = !!this.data[videoKey(activeLayer)];
    const targetLayer = hasActiveVideo ? otherLayer(activeLayer) : activeLayer;

    this.videoCandidates = list;
    this.videoCandidateIndex = 0;
    this.prepareVideoLayer(targetLayer, list[0], {
      mode,
      loop,
      direct: !hasActiveVideo
    });
  },

  prepareVideoLayer(layer, src, options = {}) {
    this.pendingLayer = layer;
    this.pendingVideoMode = options.mode || 'action';
    this.pendingVideoLoop = !!options.loop;
    this.clearVideoReadyGuard();

    const patch = Object.assign({
      currentVideo: src,
      isLooping: !!options.loop,
      isSwitching: true
    }, layerPatch(layer, {
      video: src,
      loop: !!options.loop,
      muted: !options.direct
    }));

    if (options.direct) {
      patch.activeLayer = layer;
      patch.videoMode = this.pendingVideoMode;
      patch[mutedKey(layer)] = false;
    }

    this.setData(patch, () => {
      this.scheduleVideoReadyGuard(layer);
      this.playLayer(layer);
    });
  },

  playIdle() {
    this.playVideo(assets.videos.idle, {
      mode: 'idle',
      loop: true
    });
  },

  onVideoReady(event) {
    const layer = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.layer
      : '';
    if (!layer || layer !== this.pendingLayer) return;
    this.activatePendingVideo(layer);
  },

  activatePendingVideo(layer) {
    if (!this.data.isSwitching || layer !== this.pendingLayer) return;

    const oldLayer = this.data.activeLayer && this.data.activeLayer !== layer ? this.data.activeLayer : '';
    const mode = this.pendingVideoMode || 'action';
    const loop = !!this.pendingVideoLoop;
    const patch = {
      activeLayer: layer,
      videoMode: mode,
      isLooping: loop,
      isSwitching: false
    };

    patch[mutedKey(layer)] = false;
    if (oldLayer) {
      patch[mutedKey(oldLayer)] = true;
    }

    this.clearVideoReadyGuard();
    this.pendingLayer = '';
    this.setData(patch, () => {
      this.playLayer(layer, true);
      if (oldLayer) {
        this.releaseLayerAfterFade(oldLayer);
      }
    });
  },

  onVideoError(event) {
    const layer = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.layer
      : this.pendingLayer;
    const list = this.videoCandidates || [];
    const nextIndex = (this.videoCandidateIndex || 0) + 1;

    if (layer === this.pendingLayer && nextIndex < list.length) {
      this.videoCandidateIndex = nextIndex;
      this.prepareVideoLayer(layer, list[nextIndex], {
        mode: this.pendingVideoMode,
        loop: this.pendingVideoLoop,
        direct: layer === this.data.activeLayer && !this.data[videoKey(otherLayer(layer))]
      });
      return;
    }

    const mode = this.pendingVideoMode || this.data.videoMode;
    const resetFailedLayer = layer && layer !== this.data.activeLayer
      ? layerPatch(layer, { video: '', loop: false, muted: true })
      : {};

    this.clearVideoReadyGuard();
    this.pendingLayer = '';
    this.setData(Object.assign({
      isSwitching: false
    }, resetFailedLayer));

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

  onVideoEnded(event) {
    const layer = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.layer
      : this.data.activeLayer;
    if (layer !== this.data.activeLayer) return;

    const mode = this.data.videoMode;
    if (mode === 'finish') {
      this.finishToDone();
      return;
    }
    if (mode === 'opening' || mode === 'action') {
      this.playIdle();
    }
  },

  playLayer(layer, restart = false) {
    if (!this.data[videoKey(layer)]) return;
    const context = wx.createVideoContext(`${layer}Video`, this);
    if (restart) {
      context.seek(0);
    }
    context.play();
  },

  stopLayer(layer) {
    const context = wx.createVideoContext(`${layer}Video`, this);
    context.stop();
  },

  releaseLayerAfterFade(layer) {
    this.clearLayerReleaseTimer();
    this.layerReleaseTimer = setTimeout(() => {
      if (this.data.activeLayer === layer) return;
      this.stopLayer(layer);
      this.setData(layerPatch(layer, {
        video: '',
        loop: false,
        muted: true
      }));
    }, VIDEO_FADE_MS);
  },

  stopCurrentVideo() {
    this.stopLayer('front');
    this.stopLayer('back');
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
    this.clearLayerReleaseTimer();
    this.stopCurrentVideo();
    this.pendingLayer = '';
    this.setData({
      stage: 'done',
      currentVideo: '',
      frontVideo: '',
      backVideo: '',
      activeLayer: 'front',
      frontLoop: false,
      backLoop: false,
      frontMuted: false,
      backMuted: true,
      isLooping: false,
      isSwitching: false,
      videoMode: 'idle'
    });
  },

  scheduleVideoReadyGuard(layer) {
    this.clearVideoReadyGuard();
    this.videoReadyGuard = setTimeout(() => {
      if (this.pendingLayer === layer) {
        this.activatePendingVideo(layer);
      }
    }, 900);
  },

  clearVideoReadyGuard() {
    if (!this.videoReadyGuard) return;
    clearTimeout(this.videoReadyGuard);
    this.videoReadyGuard = null;
  },

  clearLayerReleaseTimer() {
    if (!this.layerReleaseTimer) return;
    clearTimeout(this.layerReleaseTimer);
    this.layerReleaseTimer = null;
  },

  clearAllRuntime() {
    this.stopTimer();
    this.stopCallingTimer();
    this.stopRingtone();
    this.stopCurrentVideo();
    this.clearConnectTimer();
    this.clearVideoReadyGuard();
    this.clearLayerReleaseTimer();
    this.videoCandidates = [];
    this.videoCandidateIndex = 0;
    this.pendingLayer = '';
  },

  clearConnectTimer() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }
});
