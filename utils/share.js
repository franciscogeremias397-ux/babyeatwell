const TITLES = {
  home: '宝贝乖乖吃饭｜宝宝食谱&专注吃饭',
  recipe: '这道宝宝餐看起来很棒，分享给你',
  supervise: '狗蛋叔叔陪宝宝乖乖吃饭'
};

const PATHS = {
  home: '/pages/index/index',
  recipe: '/pages/recipe/index',
  supervise: '/pages/supervise/index'
};

function enableShareMenu(options = {}) {
  if (!wx.showShareMenu) return;
  const menus = ['shareAppMessage'];
  if (options.timeline) menus.push('shareTimeline');
  wx.showShareMenu({
    withShareTicket: true,
    menus
  });
}

function appMessage(title, path) {
  return {
    title,
    path
  };
}

function timeline(title, query) {
  const result = {
    title
  };
  if (query) result.query = query;
  return result;
}

function homeAppMessage() {
  return appMessage(TITLES.home, PATHS.home);
}

function homeTimeline() {
  return timeline(TITLES.home);
}

function recipeHomeAppMessage() {
  return appMessage(TITLES.recipe, PATHS.recipe);
}

function recipeHomeTimeline() {
  return timeline(TITLES.recipe);
}

function recipeDetailAppMessage(recipeId) {
  if (!recipeId) return recipeHomeAppMessage();
  return appMessage(TITLES.recipe, `/pages/recipe-detail/index?id=${encodeURIComponent(recipeId)}`);
}

function recipeDetailTimeline(recipeId) {
  if (!recipeId) return recipeHomeTimeline();
  return timeline(TITLES.recipe, `id=${encodeURIComponent(recipeId)}`);
}

function superviseAppMessage() {
  return appMessage(TITLES.supervise, PATHS.supervise);
}

function superviseTimeline() {
  return timeline(TITLES.supervise);
}

module.exports = {
  enableShareMenu,
  homeAppMessage,
  homeTimeline,
  recipeDetailAppMessage,
  recipeDetailTimeline,
  recipeHomeAppMessage,
  recipeHomeTimeline,
  superviseAppMessage,
  superviseTimeline
};
