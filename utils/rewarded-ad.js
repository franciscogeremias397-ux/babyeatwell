const RECIPE_SAVE_AD_UNIT_ID = 'adunit-870b5bf9dd967b40';

let videoAd = null;
let hasBoundEvents = false;
let pendingResolve = null;
let isShowing = false;

function showToast(title) {
  if (!wx.showToast) return;
  wx.showToast({
    title,
    icon: 'none'
  });
}

function showConfirm(options = {}) {
  return new Promise((resolve) => {
    if (!wx.showModal) {
      resolve(true);
      return;
    }

    wx.showModal({
      title: options.title || '保存食谱',
      content: options.content || '看完视频后保存食谱到相册',
      confirmText: options.confirmText || '去观看',
      cancelText: options.cancelText || '取消',
      success(res) {
        resolve(!!res.confirm);
      },
      fail() {
        resolve(true);
      }
    });
  });
}

function canUseRewardedAd() {
  return typeof wx !== 'undefined' && !!wx.createRewardedVideoAd;
}

function finish(result) {
  const resolve = pendingResolve;
  pendingResolve = null;
  isShowing = false;
  if (resolve) resolve(result);
}

function bindEvents(ad) {
  if (!ad || hasBoundEvents) return;
  hasBoundEvents = true;

  ad.onClose((res) => {
    finish({
      completed: !res || res.isEnded
    });
  });

  ad.onError(() => {
    if (!pendingResolve) return;
    finish({
      completed: true,
      fallback: true
    });
  });
}

function getVideoAd() {
  if (!canUseRewardedAd()) return null;
  if (!videoAd) {
    videoAd = wx.createRewardedVideoAd({
      adUnitId: RECIPE_SAVE_AD_UNIT_ID
    });
    bindEvents(videoAd);
  }
  return videoAd;
}

function preloadRecipeSaveAd() {
  const ad = getVideoAd();
  if (!ad || !ad.load) return;
  ad.load().catch(() => {});
}

function playVideoAd() {
  const ad = getVideoAd();
  if (!ad) {
    return Promise.resolve({
      completed: true,
      fallback: true
    });
  }

  isShowing = true;
  const result = new Promise((resolve) => {
    pendingResolve = resolve;
  });

  ad.show().catch(() => {
    ad.load()
      .then(() => ad.show())
      .catch(() => {
        finish({
          completed: true,
          fallback: true
        });
      });
  });

  return result;
}

async function requestRecipeSaveReward() {
  const confirmed = await showConfirm();
  if (!confirmed) return false;

  if (isShowing) {
    showToast('广告正在准备，请稍等');
    return false;
  }

  const result = await playVideoAd();
  if (result.completed) {
    if (result.fallback) showToast('广告暂不可用，正在保存');
    return true;
  }

  showToast('看完视频后才能保存哦');
  return false;
}

module.exports = {
  preloadRecipeSaveAd,
  requestRecipeSaveReward
};
