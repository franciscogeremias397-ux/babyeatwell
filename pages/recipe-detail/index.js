const recipeUtil = require('../../utils/recipe');

Page({
  data: {
    recipe: null,
    ingredientChips: [],
    image: '/assets/recipes/default-meal.png'
  },

  onLoad(query) {
    const item = recipeUtil.findRecipe(query.id);
    if (!item) return;
    this.setData({
      recipe: {
        ...item,
        mealTypesText: (item.mealTypes || []).join(' / ')
      },
      ingredientChips: (item.ingredients || []).map((ingredient) => `${ingredient.name} ${ingredient.amount}${ingredient.unit}`),
      image: '/assets/recipes/default-meal.png'
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

  downloadRecipe() {
    const item = this.data.recipe;
    if (!item) return;
    const lines = [
      item.name,
      `${item.ageMinMonths}-${item.ageMaxMonths} 月龄 · ${item.texture}`,
      '',
      `食材：${recipeUtil.summarizeIngredients(item)}`,
      '',
      '制作步骤：',
      ...(item.steps || []).map((step, index) => `${index + 1}. ${step}`),
      '',
      '营养亮点：',
      ...(item.nutritionHighlights || []),
      '',
      '注意事项：',
      ...(item.cautions || []),
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
