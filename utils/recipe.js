const recipes = require('../data/recipes');
const ingredientTags = require('../data/ingredient_tags');
const aliasMap = require('../data/tag_alias_map');

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const BREAKFAST = '早餐';
const LUNCH = '午餐';
const DINNER = '晚餐';

function calculateAgeMonths(birthDate, currentDate = new Date()) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;

  let months = (currentDate.getFullYear() - birth.getFullYear()) * 12 +
    (currentDate.getMonth() - birth.getMonth());
  if (currentDate.getDate() < birth.getDate()) {
    months -= 1;
  }
  return Math.max(months, 0);
}

function getStageId(ageMonths) {
  if (ageMonths < 12) return 'unsupported_under_12m';
  if (ageMonths <= 18) return '12_18m';
  if (ageMonths <= 36) return '19_36m';
  return 'unsupported_over_36m';
}

function getStageName(stageId) {
  const names = {
    '12_18m': '幼儿餐过渡期',
    '19_36m': '幼儿餐稳定期',
    unsupported_under_12m: '暂不覆盖辅食阶段',
    unsupported_over_36m: '暂不覆盖 3 岁以上'
  };
  return names[stageId] || '未知阶段';
}

function getSupportedMessage(stageId) {
  if (stageId === 'unsupported_under_12m') {
    return '当前版本先覆盖 12-36 月龄三餐，12 月龄以下辅食阶段建议咨询儿保医生。';
  }
  if (stageId === 'unsupported_over_36m') {
    return '当前版本先覆盖 12-36 月龄，3 岁以上宝宝饮食更接近家庭餐，可先作为参考。';
  }
  return '';
}

function getDefaultProfile() {
  const now = new Date();
  const birth = new Date(now.getFullYear(), now.getMonth() - 14, now.getDate());
  return {
    babyId: 'baby_001',
    nickname: '小柚子',
    birthDate: formatDate(birth),
    allergyTags: [],
    avoidTags: []
  };
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getProfile() {
  return wx.getStorageSync('babyProfile') || getDefaultProfile();
}

function saveProfile(profile) {
  const now = new Date().toISOString();
  const existing = wx.getStorageSync('babyProfile') || {};
  const next = {
    babyId: existing.babyId || 'baby_001',
    createdAt: existing.createdAt || now,
    ...profile,
    updatedAt: now
  };
  wx.setStorageSync('babyProfile', next);
  return next;
}

function normalizeTag(input) {
  const text = String(input || '').trim();
  if (!text) return '';
  if (aliasMap[text]) return aliasMap[text];

  const found = ingredientTags.find((item) => {
    if (item.standardTag === text || item.displayName === text) return true;
    return (item.relatedTags || []).includes(text);
  });
  return found ? found.standardTag : text;
}

function makeTag(label) {
  const standardTag = normalizeTag(label);
  return {
    label,
    standardTag,
    sourceInput: label
  };
}

function getCommonAllergyTags() {
  return ingredientTags
    .filter((item) => item.isCommonAllergen)
    .map((item) => ({
      label: item.displayName,
      standardTag: item.standardTag
    }));
}

function getCommonAvoidTags() {
  const wanted = [
    '胡萝卜', '南瓜', '番茄', '西兰花', '青菜', '香菇', '山药', '土豆',
    '鸡蛋', '牛肉', '猪肉', '鸡肉', '鱼类', '虾', '大豆', '小麦'
  ];
  return wanted.map((standardTag) => {
    const found = ingredientTags.find((item) => item.standardTag === standardTag);
    return {
      label: found ? found.displayName : standardTag,
      standardTag
    };
  });
}

function getBlockedTags(profile) {
  const tags = new Set();
  (profile.allergyTags || []).forEach((tag) => tags.add(tag.standardTag || normalizeTag(tag.label)));
  (profile.avoidTags || []).forEach((tag) => tags.add(tag.standardTag || normalizeTag(tag.label)));
  tags.delete('');
  tags.delete('无');
  return tags;
}

function recipeConflicts(recipe, blockedTags) {
  const fields = [
    recipe.allergens || [],
    recipe.avoidTags || [],
    recipe.vegetableTags || [],
    [recipe.proteinType, recipe.proteinCategory, recipe.mainStaple]
  ];

  return fields.flat().some((rawTag) => {
    const tag = normalizeTag(rawTag);
    if (blockedTags.has(tag)) return true;
    if (tag === '鱼类' && blockedTags.has('鱼类')) return true;
    if (tag === '虾' && blockedTags.has('虾')) return true;
    if (tag === '大豆' && blockedTags.has('大豆')) return true;
    if (tag === '小麦' && blockedTags.has('小麦')) return true;
    return false;
  });
}

function getAvailableRecipes(profile) {
  const ageMonths = calculateAgeMonths(profile.birthDate);
  const stageId = getStageId(ageMonths);
  if (stageId.indexOf('unsupported') === 0) {
    return {
      ageMonths,
      stageId,
      stageName: getStageName(stageId),
      warning: getSupportedMessage(stageId),
      recipes: []
    };
  }

  const blockedTags = getBlockedTags(profile);
  const available = recipes.filter((recipe) => {
    return recipe.stageId === stageId &&
      recipe.suitableForWeeklyPlan &&
      !recipeConflicts(recipe, blockedTags);
  });

  return {
    ageMonths,
    stageId,
    stageName: getStageName(stageId),
    warning: '',
    recipes: available
  };
}

function hasMeal(recipe, mealType) {
  return (recipe.mealTypes || []).includes(mealType);
}

function scoreRecipe(recipe, context) {
  let score = 100;
  const usedIds = context.usedIds;
  const proteinCount = context.proteinCount[recipe.proteinType] || 0;
  const stapleCount = context.stapleCount[recipe.mainStaple] || 0;
  const typeCount = context.typeCount[recipe.dishType] || 0;
  const previous = context.previous;
  const dayOther = context.dayOther;

  if (!proteinCount) score += 20;
  if (!stapleCount) score += 15;
  if (!typeCount) score += 10;
  if (previous && previous.dishType === recipe.dishType) score -= 30;
  if (previous && previous.proteinType === recipe.proteinType) score -= 35;
  if (dayOther && dayOther.mainStaple === recipe.mainStaple) score -= 25;
  if (recipe.proteinType && recipe.proteinType.indexOf('猪肝') >= 0 && context.hasOrgan) score -= 100;
  if (usedIds.has(recipe.id)) score -= 100;
  if (recipe.vegetableTags && recipe.vegetableTags.some((tag) => (context.vegetableCount[tag] || 0) >= 3)) score -= 20;

  return Math.max(1, score);
}

function weightedPick(pool, context) {
  if (!pool.length) return null;
  const scored = pool.map((recipe) => ({
    recipe,
    score: scoreRecipe(recipe, context)
  }));
  const total = scored.reduce((sum, item) => sum + item.score, 0);
  let cursor = Math.random() * total;

  for (let i = 0; i < scored.length; i += 1) {
    cursor -= scored[i].score;
    if (cursor <= 0) return scored[i].recipe;
  }
  return scored[scored.length - 1].recipe;
}

function remember(recipe, context) {
  if (!recipe) return;
  context.usedIds.add(recipe.id);
  context.proteinCount[recipe.proteinType] = (context.proteinCount[recipe.proteinType] || 0) + 1;
  context.stapleCount[recipe.mainStaple] = (context.stapleCount[recipe.mainStaple] || 0) + 1;
  context.typeCount[recipe.dishType] = (context.typeCount[recipe.dishType] || 0) + 1;
  (recipe.vegetableTags || []).forEach((tag) => {
    context.vegetableCount[tag] = (context.vegetableCount[tag] || 0) + 1;
  });
  if (recipe.proteinType && recipe.proteinType.indexOf('猪肝') >= 0) {
    context.hasOrgan = true;
  }
  context.previous = recipe;
}

function generateWeeklyPlan(profile = getProfile()) {
  const availability = getAvailableRecipes(profile);
  if (availability.warning) {
    return {
      ...availability,
      profile,
      days: []
    };
  }

  const breakfastPool = availability.recipes.filter((recipe) => hasMeal(recipe, BREAKFAST));
  const mealPool = availability.recipes.filter((recipe) => hasMeal(recipe, LUNCH) || hasMeal(recipe, DINNER));
  const context = {
    usedIds: new Set(),
    proteinCount: {},
    stapleCount: {},
    typeCount: {},
    vegetableCount: {},
    hasOrgan: false,
    previous: null,
    dayOther: null
  };

  const days = DAYS.map((dayName) => {
    context.dayOther = null;
    const breakfast = weightedPick(breakfastPool, context);
    remember(breakfast, context);

    context.dayOther = null;
    const lunch = weightedPick(mealPool, context);
    remember(lunch, context);

    context.dayOther = lunch;
    const dinner = weightedPick(mealPool.filter((recipe) => !lunch || recipe.id !== lunch.id), context);
    remember(dinner, context);

    return {
      dayName,
      meals: [
        { mealType: BREAKFAST, recipe: breakfast },
        { mealType: LUNCH, recipe: lunch },
        { mealType: DINNER, recipe: dinner }
      ]
    };
  });

  return {
    ...availability,
    profile,
    days
  };
}

function pickRandomMeal(profile = getProfile()) {
  const availability = getAvailableRecipes(profile);
  if (availability.warning) {
    return {
      ...availability,
      profile,
      recipe: null
    };
  }

  const mealPool = availability.recipes.filter((recipe) => {
    return recipe.suitableForRandomMeal && (hasMeal(recipe, LUNCH) || hasMeal(recipe, DINNER));
  });
  const recipe = mealPool[Math.floor(Math.random() * mealPool.length)] || null;
  return {
    ...availability,
    profile,
    recipe
  };
}

function findRecipe(recipeId) {
  return recipes.find((recipe) => recipe.id === recipeId);
}

function summarizeIngredients(recipe) {
  return (recipe.ingredients || [])
    .slice(0, 4)
    .map((item) => `${item.name}${item.amount}${item.unit}`)
    .join('、');
}

module.exports = {
  BREAKFAST,
  LUNCH,
  DINNER,
  calculateAgeMonths,
  findRecipe,
  generateWeeklyPlan,
  getCommonAllergyTags,
  getCommonAvoidTags,
  getDefaultProfile,
  getProfile,
  getStageId,
  getStageName,
  makeTag,
  pickRandomMeal,
  saveProfile,
  summarizeIngredients
};
