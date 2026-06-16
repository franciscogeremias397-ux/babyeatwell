const recipe = require('../../utils/recipe');

const DEFAULT_MEAL_IMAGE = '/assets/recipes/default-meal.png';
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
        image: DEFAULT_MEAL_IMAGE,
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
    wx.setStorageSync('latestWeeklyPlan', plan);
    this.setData(Object.assign({}, plan, {
      displayDays: buildDisplayDays(plan.days)
    }));
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/recipe-detail/index?id=${id}`
    });
  },

  downloadWeekly() {
    const lines = [`${this.data.profile.nickname}的一周食谱`, `${this.data.ageMonths} 月龄 · ${this.data.stageName}`, ''];
    this.data.days.forEach((day) => {
      lines.push(day.dayName);
      day.meals.forEach((meal) => {
        lines.push(`${meal.mealType}：${meal.recipe ? meal.recipe.name : '暂无食谱'}`);
      });
      lines.push('');
    });
    lines.push('本食谱为家庭饮食参考，不替代医生或营养师建议。');

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
