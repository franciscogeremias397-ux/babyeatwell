const share = require('../../utils/share');

Page({
  onLoad() {
    share.enableShareMenu({
      timeline: true
    });
  },

  onShareAppMessage() {
    return share.homeAppMessage();
  },

  onShareTimeline() {
    return share.homeTimeline();
  },

  goRecipe() {
    wx.navigateTo({
      url: '/pages/recipe/index'
    });
  },

  goSupervise() {
    wx.navigateTo({
      url: '/pages/supervise/index'
    });
  }
});
