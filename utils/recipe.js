const recipes = require('../data/recipes');
const ingredientTags = require('../data/ingredient_tags');
const aliasMap = require('../data/tag_alias_map');

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const BREAKFAST = '早餐';
const LUNCH = '午餐';
const DINNER = '晚餐';
const PROFILE_REQUIRED_MESSAGE = '请先添加宝宝档案，才能生成更合适的食谱。';
const SUPPORTED_AGE_MESSAGE = '当前版本适合 12-36 月龄宝宝使用。';

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
    profile_required: '待添加宝宝档案',
    unsupported_under_12m: '暂不覆盖辅食阶段',
    unsupported_over_36m: '暂不覆盖 3 岁以上'
  };
  return names[stageId] || '未知阶段';
}

function getSupportedMessage(stageId) {
  if (stageId === 'unsupported_under_12m') {
    return SUPPORTED_AGE_MESSAGE;
  }
  if (stageId === 'unsupported_over_36m') {
    return SUPPORTED_AGE_MESSAGE;
  }
  return '';
}

function getDefaultProfile() {
  return {
    babyId: '',
    nickname: '',
    birthDate: '',
    allergyTags: [],
    avoidTags: [],
    profileCompleted: false
  };
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getProfile() {
  const profile = wx.getStorageSync('babyProfile');
  if (!profile || isSeedProfile(profile)) return getDefaultProfile();
  return profile;
}

function isSeedProfile(profile) {
  if (!profile || profile.profileCompleted) return false;
  const allergyTags = profile.allergyTags || [];
  const avoidTags = profile.avoidTags || [];
  return profile.babyId === 'baby_001' &&
    profile.nickname === '小柚子' &&
    allergyTags.length === 0 &&
    avoidTags.length === 0;
}

function isProfileCompleted(profile) {
  return !!profile &&
    profile.profileCompleted === true &&
    !!String(profile.nickname || '').trim() &&
    !!String(profile.birthDate || '').trim();
}

function validateProfile(profile) {
  const nickname = String(profile && profile.nickname || '').trim();
  const birthDate = String(profile && profile.birthDate || '').trim();
  if (!nickname) {
    return {
      ok: false,
      message: '请填写宝宝昵称。'
    };
  }
  if (!birthDate) {
    return {
      ok: false,
      message: '请选择宝宝生日。'
    };
  }

  const ageMonths = calculateAgeMonths(birthDate);
  const stageId = getStageId(ageMonths);
  if (stageId.indexOf('unsupported') === 0) {
    return {
      ok: false,
      ageMonths,
      stageId,
      message: SUPPORTED_AGE_MESSAGE
    };
  }

  return {
    ok: true,
    ageMonths,
    stageId,
    message: ''
  };
}

function saveProfile(profile) {
  const validation = validateProfile(profile);
  if (!validation.ok) {
    return validation;
  }

  const now = new Date().toISOString();
  const existing = wx.getStorageSync('babyProfile') || {};
  const next = Object.assign({}, profile, {
    babyId: existing.babyId || 'baby_001',
    createdAt: existing.createdAt || now,
    profileCompleted: true,
    updatedAt: now
  });
  wx.setStorageSync('babyProfile', next);
  return Object.assign({}, validation, {
    profile: next
  });
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

function getTagMeta(standardTag) {
  return ingredientTags.find((item) => item.standardTag === standardTag);
}

function getTagDisplayName(standardTag) {
  const meta = getTagMeta(standardTag);
  return meta ? meta.displayName : standardTag;
}

function resolveTag(input) {
  const text = String(input || '').trim();
  if (!text) {
    return {
      ok: true,
      empty: true,
      label: '',
      standardTag: '',
      sourceInput: ''
    };
  }

  const standardTag = normalizeTag(text);
  const meta = getTagMeta(standardTag);
  if (!meta) {
    return {
      ok: false,
      empty: false,
      label: text,
      standardTag: '',
      sourceInput: text,
      message: `暂未识别“${text}”，请换个叫法或从常用食材中选择。`
    };
  }

  return {
    ok: true,
    empty: false,
    label: meta.displayName,
    standardTag,
    sourceInput: text,
    message: text === meta.displayName || text === standardTag ? '' : `已识别为：${meta.displayName}`
  };
}

function makeTag(label) {
  const resolved = resolveTag(label);
  const standardTag = resolved.ok && !resolved.empty ? resolved.standardTag : normalizeTag(label);
  return {
    label: resolved.ok && !resolved.empty ? resolved.label : label,
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
    [recipe.proteinType, recipe.proteinCategory, recipe.mainStaple],
    (recipe.ingredients || []).map((item) => item.name)
  ];

  for (let i = 0; i < fields.length; i += 1) {
    const group = fields[i];
    for (let j = 0; j < group.length; j += 1) {
      const tag = normalizeTag(group[j]);
      if (blockedTags.has(tag)) return true;
      if (tag === '鱼类' && blockedTags.has('鱼类')) return true;
      if (tag === '虾' && blockedTags.has('虾')) return true;
      if (tag === '大豆' && blockedTags.has('大豆')) return true;
      if (tag === '小麦' && blockedTags.has('小麦')) return true;
    }
  }
  return false;
}

function getAvailableRecipes(profile) {
  if (!isProfileCompleted(profile)) {
    return {
      profile: profile || getDefaultProfile(),
      ageMonths: 0,
      stageId: 'profile_required',
      stageName: '待添加宝宝档案',
      warning: PROFILE_REQUIRED_MESSAGE,
      recipes: []
    };
  }

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
    return Object.assign({}, availability, {
      profile,
      days: []
    });
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

  return Object.assign({}, availability, {
    profile,
    days
  });
}

function pickRandomMeal(profile = getProfile()) {
  const availability = getAvailableRecipes(profile);
  if (availability.warning) {
    return Object.assign({}, availability, {
      profile,
      recipe: null
    });
  }

  const mealPool = availability.recipes.filter((recipe) => {
    return recipe.suitableForRandomMeal && (hasMeal(recipe, LUNCH) || hasMeal(recipe, DINNER));
  });
  const recipe = mealPool[Math.floor(Math.random() * mealPool.length)] || null;
  return Object.assign({}, availability, {
    profile,
    recipe
  });
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
  isProfileCompleted,
  makeTag,
  pickRandomMeal,
  resolveTag,
  saveProfile,
  summarizeIngredients
};
