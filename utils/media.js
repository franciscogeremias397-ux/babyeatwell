const MEDIA_CONFIG = {
  mode: 'domain',
  domainBase: 'https://sg.gouqii.com/guai-guai-chi-fan/assets/miniprogram-hq-20260604',
  recipeImagesOnline: true,
  localRecipePlaceholder: '/assets/recipes/default-meal.png'
};

const CLOUD_FILE_MAP = {
  // Fill this map after resources are uploaded if we switch from public domain URLs
  // to WeChat Cloud file IDs, for example:
  // 'videos/idle/idle-001.mp4': 'cloud://env-id.xxx/videos/idle/idle-001.mp4'
};

function cleanDomainBase(base) {
  return String(base || '').replace(/\/+$/, '');
}

function normalizeKey(path) {
  return String(path || '').replace(/^\/+/, '');
}

function isRemotePath(path) {
  return /^(https?:)?\/\//.test(path) || /^cloud:\/\//.test(path);
}

function isLocalAsset(path) {
  return /^\/(assets|pages)\//.test(path);
}

function domainUrl(path) {
  return `${cleanDomainBase(MEDIA_CONFIG.domainBase)}/${normalizeKey(path)}`;
}

function resolveMedia(path, fallback) {
  const source = String(path || '').trim();
  if (!source) return fallback || '';
  if (isRemotePath(source) || isLocalAsset(source)) return source;

  const key = normalizeKey(source);
  if (MEDIA_CONFIG.mode === 'cloud' && CLOUD_FILE_MAP[key]) {
    return CLOUD_FILE_MAP[key];
  }
  return domainUrl(key);
}

function mediaCandidates() {
  const inputs = Array.prototype.slice.call(arguments);
  const result = [];

  inputs.forEach((input) => {
    const items = Array.isArray(input) ? input : [input];
    items.forEach((item) => {
      const url = resolveMedia(item);
      if (url && result.indexOf(url) === -1) {
        result.push(url);
      }
    });
  });

  return result;
}

function recipeImage(recipe) {
  const recipeId = recipe && recipe.id ? String(recipe.id) : '';
  if (!recipeId) return MEDIA_CONFIG.localRecipePlaceholder;

  const cloudKey = `recipes/${recipeId}.jpg`;
  if (!MEDIA_CONFIG.recipeImagesOnline && !CLOUD_FILE_MAP[cloudKey]) {
    return MEDIA_CONFIG.localRecipePlaceholder;
  }

  return resolveMedia(cloudKey, MEDIA_CONFIG.localRecipePlaceholder);
}

function recipeCardImage(recipe) {
  const recipeId = recipe && recipe.id ? String(recipe.id) : '';
  if (!recipeId) return MEDIA_CONFIG.localRecipePlaceholder;
  return `/assets/recipe-card-thumbs/${recipeId}.jpg`;
}

module.exports = {
  MEDIA_CONFIG,
  mediaCandidates,
  recipeCardImage,
  recipeImage,
  recipePlaceholder: MEDIA_CONFIG.localRecipePlaceholder,
  resolveMedia
};
