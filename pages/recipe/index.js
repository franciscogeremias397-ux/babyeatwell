const recipe = require('../../utils/recipe');

Page({
  data: {
    profile: {},
    ageMonths: 0,
    stageName: '',
    warning: ''
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const profile = recipe.getProfile();
    const ageMonths = recipe.calculateAgeMonths(profile.birthDate);
    const stageId = recipe.getStageId(ageMonths);
    this.setData({
      profile,
      ageMonths,
      stageName: recipe.getStageName(stageId),
      warning: stageId.indexOf('unsupported') === 0 ? (stageId === 'unsupported_under_12m' ? '当前版本暂不覆盖 12 月龄以下辅食阶段。' : '当前版本暂不覆盖 36 月龄以上儿童。') : ''
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

  goProfile() {
    wx.navigateTo({
      url: '/pages/recipe-profile/index'
    });
  },

  goWeekly() {
    wx.navigateTo({
      url: '/pages/recipe-weekly/index'
    });
  },

  goRandom() {
    wx.navigateTo({
      url: '/pages/recipe-random/index'
    });
  }
});
