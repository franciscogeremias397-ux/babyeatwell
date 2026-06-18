const recipe = require('../../utils/recipe');
const media = require('../../utils/media');
const card = require('../../utils/card');

const DAY_COLORS = ['#64a8ff', '#81cf55', '#ff9a2e', '#ff7aa3', '#64a8ff', '#81cf55', '#ff9a2e'];

function formatMonthDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function getMonday(date) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function buildDisplayDays(days) {
  const monday = getMonday(new Date());
  return (days || []).map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return Object.assign({}, day, {
      dateText: formatMonthDay(date),
      accent: DAY_COLORS[index % DAY_COLORS.length],
      meals: (day.meals || []).map((meal) => Object.assign({}, meal, {
        id: meal.recipe ? meal.recipe.id : '',
        cardImage: media.recipeCardImage(meal.recipe),
        image: media.recipeImage(meal.recipe),
        name: meal.recipe ? meal.recipe.name : '暂无食谱',
        desc: meal.recipe ? `${meal.recipe.texture} · ${meal.recipe.mainStaple}` : ''
      }))
    });
  });
}

Page({
  data: {
    profile: {},
    ageMonths: 0,
    stageName: '',
    warning: '',
    needsProfileAction: false,
    heroImage: media.recipePlaceholder,
    weeklyCanvasHeight: 2200,
    days: [],
    displayDays: []
  },

  onLoad() {
    this.generate();
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

  generate() {
    const plan = recipe.generateWeeklyPlan();
    if (!plan.warning) {
      wx.setStorageSync('latestWeeklyPlan', plan);
    }
    this.setData(Object.assign({}, plan, {
      needsProfileAction: plan.stageId === 'profile_required' || (plan.stageId || '').indexOf('unsupported') === 0,
      heroImage: media.recipeImage(plan.days && plan.days[0] && plan.days[0].meals && plan.days[0].meals[0] && plan.days[0].meals[0].recipe),
      displayDays: buildDisplayDays(plan.days)
    }));
  },

  goProfile() {
    wx.navigateTo({
      url: '/pages/recipe-profile/index'
    });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/recipe-detail/index?id=${id}`
    });
  },

  downloadWeekly() {
    if (!this.data.displayDays.length) return;
    card.saveWeeklyCard({
      page: this,
      canvasId: 'weeklyCardCanvas',
      heightKey: 'weeklyCanvasHeight',
      nickname: this.data.profile.nickname,
      ageMonths: this.data.ageMonths,
      stageName: this.data.stageName,
      days: this.data.displayDays
    });
  }
});
