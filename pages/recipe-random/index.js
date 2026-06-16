const recipeUtil = require('../../utils/recipe');

Page({
  data: {
    profile: {},
    ageMonths: 0,
    stageName: '',
    warning: '',
    recipe: null,
    ingredients: '',
    ingredientChips: [],
    mealTypesText: '',
    image: '/assets/recipes/default-meal.png',
    isDrawing: false,
    rollingName: '宝宝餐'
  },

  onLoad() {
    this.draw();
  },

  onUnload() {
    this.clearDrawTimers();
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

  draw() {
    const result = recipeUtil.pickRandomMeal();
    this.clearDrawTimers();

    if (result.warning || !result.recipe) {
      this.setData({
        ...result,
        recipe: null,
        ingredientChips: [],
        mealTypesText: '',
        isDrawing: false,
        rollingName: '宝宝餐'
      });
      return;
    }

    const rollingNames = (result.recipes || [])
      .filter((item) => item.suitableForRandomMeal)
      .map((item) => item.name)
      .slice(0, 16);
    const names = rollingNames.length ? rollingNames : [result.recipe.name];
    let cursor = 0;

    this.pendingResult = result;
    this.setData({
      warning: '',
      profile: result.profile,
      ageMonths: result.ageMonths,
      stageName: result.stageName,
      isDrawing: true,
      recipe: null,
      ingredientChips: [],
      mealTypesText: '',
      rollingName: names[0]
    });

    this.drawInterval = setInterval(() => {
      cursor = (cursor + 1) % names.length;
      this.setData({
        rollingName: names[cursor]
      });
    }, 90);

    this.drawTimer = setTimeout(() => {
      const next = this.pendingResult;
      this.clearDrawTimers();
      this.applyResult(next);
    }, 1150);
  },

  applyResult(result) {
    const ingredientChips = result.recipe ? (result.recipe.ingredients || []).slice(0, 5).map((item) => `${item.name} ${item.amount}${item.unit}`) : [];
    this.setData({
      ...result,
      ingredients: result.recipe ? recipeUtil.summarizeIngredients(result.recipe) : '',
      ingredientChips,
      mealTypesText: result.recipe ? (result.recipe.mealTypes || []).join(' / ') : '',
      image: '/assets/recipes/default-meal.png',
      isDrawing: false,
      rollingName: result.recipe ? result.recipe.name : '宝宝餐'
    });
  },

  clearDrawTimers() {
    if (this.drawInterval) {
      clearInterval(this.drawInterval);
      this.drawInterval = null;
    }
    if (this.drawTimer) {
      clearTimeout(this.drawTimer);
      this.drawTimer = null;
    }
    this.pendingResult = null;
  },

  goDetail() {
    if (!this.data.recipe) return;
    wx.navigateTo({
      url: `/pages/recipe-detail/index?id=${this.data.recipe.id}`
    });
  },

  downloadRecipe() {
    if (!this.data.recipe) return;
    const item = this.data.recipe;
    const lines = [
      item.name,
      `${this.data.ageMonths} 月龄 · ${item.texture}`,
      '',
      `食材：${recipeUtil.summarizeIngredients(item)}`,
      '',
      '制作步骤：',
      ...(item.steps || []).map((step, index) => `${index + 1}. ${step}`),
      '',
      '营养亮点：',
      ...(item.nutritionHighlights || []),
      '',
      '本食谱为家庭饮食参考，不替代医生或营养师建议。'
    ];
    wx.setClipboardData({
      data: lines.join('\n'),
      success() {
        wx.showToast({
          title: '已复制食谱'
        });
      }
    });
  }
});
