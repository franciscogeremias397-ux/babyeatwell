const recipeUtil = require('../../utils/recipe');
const media = require('../../utils/media');
const card = require('../../utils/card');
const share = require('../../utils/share');

Page({
  data: {
    recipe: null,
    ingredientChips: [],
    image: media.recipePlaceholder,
    cardCanvasHeight: 1600
  },

  onLoad(query) {
    share.enableShareMenu({
      timeline: true
    });
    const item = recipeUtil.findRecipe(query.id);
    if (!item) return;
    this.setData({
      recipe: Object.assign({}, item, {
        mealTypesText: (item.mealTypes || []).join(' / ')
      }),
      ingredientChips: (item.ingredients || []).map((ingredient) => `${ingredient.name} ${ingredient.amount}${ingredient.unit}`),
      image: media.recipeImage(item)
    });
  },

  onShareAppMessage() {
    const item = this.data.recipe;
    return share.recipeDetailAppMessage(item && item.id);
  },

  onShareTimeline() {
    const item = this.data.recipe;
    return share.recipeDetailTimeline(item && item.id);
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
    card.saveRecipeCard({
      page: this,
      canvasId: 'recipeCardCanvas',
      heightKey: 'cardCanvasHeight',
      recipe: item,
      cardImage: media.recipeCardImage(item),
      image: this.data.image,
      metaText: `${item.ageMinMonths}-${item.ageMaxMonths} 月龄 · ${item.mealTypesText}`
    });
  }
});
