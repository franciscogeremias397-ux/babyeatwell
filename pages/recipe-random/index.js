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
    image: '/assets/recipes/default-meal.png'
  },

  onLoad() {
    this.draw();
  },

  draw() {
    const result = recipeUtil.pickRandomMeal();
    const ingredientChips = result.recipe ? (result.recipe.ingredients || []).slice(0, 5).map((item) => `${item.name} ${item.amount}${item.unit}`) : [];
    this.setData({
      ...result,
      ingredients: result.recipe ? recipeUtil.summarizeIngredients(result.recipe) : '',
      ingredientChips,
      mealTypesText: result.recipe ? (result.recipe.mealTypes || []).join(' / ') : '',
      image: '/assets/recipes/default-meal.png'
    });
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
