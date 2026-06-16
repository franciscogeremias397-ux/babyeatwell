Page({
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
