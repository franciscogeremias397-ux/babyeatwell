const recipe = require('../../utils/recipe');
const share = require('../../utils/share');

Page({
  data: {
    profile: {},
    ageMonths: 0,
    stageName: '',
    warning: '',
    profileReady: false,
    canUseRecipes: false
  },

  onShow() {
    share.enableShareMenu({
      timeline: true
    });
    this.refresh();
  },

  onShareAppMessage() {
    return share.recipeHomeAppMessage();
  },

  onShareTimeline() {
    return share.recipeHomeTimeline();
  },

  refresh() {
    const profile = recipe.getProfile();
    const profileReady = recipe.isProfileCompleted(profile);
    const ageMonths = profileReady ? recipe.calculateAgeMonths(profile.birthDate) : 0;
    const stageId = profileReady ? recipe.getStageId(ageMonths) : 'profile_required';
    const warning = profileReady && stageId.indexOf('unsupported') === 0 ? '当前版本适合 12-36 月龄宝宝使用。' : '';
    this.setData({
      profile,
      ageMonths,
      stageName: recipe.getStageName(stageId),
      warning,
      profileReady,
      canUseRecipes: profileReady && !warning
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
    if (!this.data.canUseRecipes) {
      this.goProfile();
      return;
    }
    wx.navigateTo({
      url: '/pages/recipe-weekly/index'
    });
  },

  goRandom() {
    if (!this.data.canUseRecipes) {
      this.goProfile();
      return;
    }
    wx.navigateTo({
      url: '/pages/recipe-random/index'
    });
  }
});
