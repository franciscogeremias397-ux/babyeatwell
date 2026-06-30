const CARD_WIDTH = 750;
const CARD_BG = '#fff8ef';
const INK = '#173051';
const MUTED = '#78928a';
const GREEN = '#58b784';
const BLUE = '#5d93d6';
const FALLBACK_RECIPE_IMAGE = '/assets/recipes/default-meal.png';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setCanvasHeight(page, key, height) {
  return new Promise((resolve) => {
    page.setData({
      [key]: height
    }, () => {
      wait(80).then(resolve);
    });
  });
}

function estimateCharWidth(char, fontSize) {
  if (!char) return 0;
  if (/\s/.test(char)) return fontSize * 0.35;
  if (/[0-9A-Za-z]/.test(char)) return fontSize * 0.58;
  if (/[.,:;!?()/-]/.test(char)) return fontSize * 0.42;
  return fontSize;
}

function estimateTextWidth(text, fontSize) {
  return String(text || '').split('').reduce((sum, char) => sum + estimateCharWidth(char, fontSize), 0);
}

function splitLines(text, maxWidth, fontSize, maxLines) {
  const source = String(text || '').replace(/\r/g, '');
  const result = [];
  source.split('\n').forEach((paragraph) => {
    let line = '';
    let width = 0;
    paragraph.split('').forEach((char) => {
      const nextWidth = width + estimateCharWidth(char, fontSize);
      if (line && nextWidth > maxWidth) {
        result.push(line);
        line = char;
        width = estimateCharWidth(char, fontSize);
      } else {
        line += char;
        width = nextWidth;
      }
    });
    if (line) result.push(line);
    if (!paragraph) result.push('');
  });

  if (maxLines && result.length > maxLines) {
    const trimmed = result.slice(0, maxLines);
    trimmed[maxLines - 1] = `${trimmed[maxLines - 1].replace(/。?$/, '')}…`;
    return trimmed;
  }
  return result.length ? result : [''];
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, color) {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.setFillStyle(color);
  ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius, color, lineWidth) {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.setStrokeStyle(color);
  ctx.setLineWidth(lineWidth || 2);
  ctx.stroke();
}

function drawText(ctx, text, x, y, options = {}) {
  const fontSize = options.fontSize || 28;
  const lineHeight = options.lineHeight || Math.round(fontSize * 1.45);
  const color = options.color || INK;
  const maxWidth = options.maxWidth || CARD_WIDTH - x * 2;
  const lines = Array.isArray(text) ? text : splitLines(text, maxWidth, fontSize, options.maxLines);

  ctx.setFillStyle(color);
  ctx.setFontSize(fontSize);
  ctx.setTextAlign(options.align || 'left');
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function drawSectionTitle(ctx, title, x, y, color) {
  fillRoundedRect(ctx, x, y - 24, 46, 46, 23, color || GREEN);
  ctx.setFillStyle('#ffffff');
  ctx.setFontSize(26);
  ctx.setTextAlign('center');
  ctx.fillText('✓', x + 23, y + 7);
  return drawText(ctx, title, x + 62, y + 4, {
    fontSize: 31,
    lineHeight: 42,
    color: INK,
    maxWidth: CARD_WIDTH - x * 2 - 62
  });
}

function drawChips(ctx, chips, x, y, maxWidth) {
  let cursorX = x;
  let cursorY = y;
  const rowHeight = 56;
  (chips || []).forEach((chip) => {
    const label = String(chip || '');
    const width = Math.min(maxWidth, Math.ceil(estimateTextWidth(label, 25) + 34));
    if (cursorX > x && cursorX + width > x + maxWidth) {
      cursorX = x;
      cursorY += rowHeight + 14;
    }
    fillRoundedRect(ctx, cursorX, cursorY, width, rowHeight, 28, '#f3f9ff');
    strokeRoundedRect(ctx, cursorX, cursorY, width, rowHeight, 28, '#c7e0ff', 2);
    drawText(ctx, label, cursorX + 17, cursorY + 36, {
      fontSize: 25,
      lineHeight: 28,
      color: '#267be8',
      maxWidth: width - 34,
      maxLines: 1
    });
    cursorX += width + 14;
  });
  return cursorY + rowHeight;
}

function drawParagraphList(ctx, items, x, y, options = {}) {
  let cursorY = y;
  (items || []).forEach((item, index) => {
    const prefix = options.numbered ? `${index + 1}. ` : '';
    cursorY = drawText(ctx, `${prefix}${item}`, x, cursorY, {
      fontSize: options.fontSize || 27,
      lineHeight: options.lineHeight || 40,
      color: options.color || '#5f7970',
      maxWidth: options.maxWidth || CARD_WIDTH - x * 2
    }) + (options.gap || 8);
  });
  return cursorY;
}

function isNetworkImage(src) {
  return /^https?:\/\//.test(String(src || ''));
}

function isCloudImage(src) {
  return /^cloud:\/\//.test(String(src || ''));
}

function downloadNetworkImage(src) {
  return new Promise((resolve) => {
    wx.downloadFile({
      url: src,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        resolve('');
      },
      fail() {
        resolve('');
      }
    });
  });
}

function downloadCloudImage(fileID) {
  return new Promise((resolve) => {
    if (!wx.cloud || !wx.cloud.downloadFile) {
      resolve('');
      return;
    }
    wx.cloud.downloadFile({
      fileID,
      success(res) {
        resolve(res.tempFilePath || '');
      },
      fail() {
        resolve('');
      }
    });
  });
}

function getLocalImageInfo(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    wx.getImageInfo({
      src,
      success(res) {
        resolve(Object.assign({}, res, {
          drawPath: src,
          path: res.path || src
        }));
      },
      fail() {
        resolve(null);
      }
    });
  });
}

async function getFirstImageInfo(paths) {
  const candidates = [];
  (paths || []).forEach((path) => {
    const source = String(path || '').trim();
    if (!source) return;
    candidates.push(source);
    if (source.indexOf('/') === 0) {
      candidates.push(source.replace(/^\/+/, ''));
    } else if (!isNetworkImage(source) && !isCloudImage(source)) {
      candidates.push(`/${source}`);
    }
  });

  for (let index = 0; index < candidates.length; index += 1) {
    const image = await getLocalImageInfo(candidates[index]);
    if (image && image.path) {
      return image;
    }
  }
  return null;
}

async function getImageInfo(src, fallbackSrc = FALLBACK_RECIPE_IMAGE) {
  const source = String(src || '').trim();
  let localPath = source;

  if (isNetworkImage(source)) {
    localPath = await downloadNetworkImage(source);
  } else if (isCloudImage(source)) {
    localPath = await downloadCloudImage(source);
  }

  let image = await getFirstImageInfo([localPath, source]);
  if (image && image.path) {
    return image;
  }

  if (fallbackSrc && fallbackSrc !== source) {
    image = await getFirstImageInfo([fallbackSrc]);
  }
  return image;
}

function drawImageContain(ctx, image, x, y, width, height, radius) {
  fillRoundedRect(ctx, x, y, width, height, radius || 24, '#ffffff');
  if (!image || !image.path) {
    fillRoundedRect(ctx, x + 54, y + 54, width - 108, height - 108, 36, '#fff8ef');
    ctx.setFillStyle('#ffbe4f');
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2 - 18, 52, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, '宝宝餐', x + width / 2, y + height / 2 + 82, {
      fontSize: 28,
      lineHeight: 34,
      color: '#8a9a93',
      align: 'center',
      maxWidth: width - 120,
      maxLines: 1
    });
    return;
  }

  const imageWidth = image.width || width;
  const imageHeight = image.height || height;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  const paths = [image.drawPath, image.path].filter(Boolean);
  const uniquePaths = paths.filter((path, index) => paths.indexOf(path) === index);
  uniquePaths.forEach((path) => {
    ctx.drawImage(path, drawX, drawY, drawWidth, drawHeight);
  });
}

function recipeIngredients(recipe) {
  return (recipe.ingredients || []).map((item) => `${item.name} ${item.amount}${item.unit}`);
}

function estimateChipsHeight(chips, maxWidth) {
  let cursorX = 0;
  let rows = 1;
  (chips || []).forEach((chip) => {
    const width = Math.min(maxWidth, Math.ceil(estimateTextWidth(chip, 25) + 34));
    if (cursorX > 0 && cursorX + width > maxWidth) {
      rows += 1;
      cursorX = 0;
    }
    cursorX += width + 14;
  });
  return rows * 56 + (rows - 1) * 14;
}

function estimateRecipeCardHeight(recipe) {
  const bodyWidth = 642;
  let height = 58;
  height += splitLines(recipe.name, bodyWidth, 44).length * 56 + 42;
  height += 382;
  height += 118;
  height += 78 + estimateChipsHeight(recipeIngredients(recipe), bodyWidth) + 34;
  height += 78 + (recipe.nutritionHighlights || []).reduce((sum, item) => sum + splitLines(item, bodyWidth, 27).length * 40 + 8, 0) + 22;
  height += 78 + (recipe.steps || []).reduce((sum, item) => sum + splitLines(item, bodyWidth - 32, 27).length * 40 + 10, 0) + 22;
  height += 78 + (recipe.cautions || []).reduce((sum, item) => sum + splitLines(item, bodyWidth, 27).length * 40 + 8, 0);
  height += 92;
  return Math.max(1280, Math.ceil(height));
}

function drawCardShell(ctx, height) {
  ctx.setFillStyle(CARD_BG);
  ctx.fillRect(0, 0, CARD_WIDTH, height);
  fillRoundedRect(ctx, 24, 24, CARD_WIDTH - 48, height - 48, 42, '#ffffff');
}

async function drawRecipeCard(ctx, recipe, imageSrc, metaText, height) {
  drawCardShell(ctx, height);
  const image = await getImageInfo(imageSrc);
  const x = 54;
  const bodyWidth = CARD_WIDTH - x * 2;
  let y = 78;

  y = drawText(ctx, recipe.name, x, y, {
    fontSize: 44,
    lineHeight: 56,
    color: INK,
    maxWidth: bodyWidth
  }) + 8;
  y = drawText(ctx, metaText, x, y, {
    fontSize: 27,
    lineHeight: 38,
    color: MUTED,
    maxWidth: bodyWidth
  }) + 24;

  drawImageContain(ctx, image, 178, y, 394, 394, 34);
  y += 424;

  fillRoundedRect(ctx, x, y, bodyWidth, 94, 28, '#f7fbff');
  const statWidth = bodyWidth / 3;
  [
    ['形态', recipe.texture],
    ['主食', recipe.mainStaple],
    ['蛋白', recipe.proteinType]
  ].forEach((item, index) => {
    const cx = x + statWidth * index + statWidth / 2;
    drawText(ctx, item[0], cx, y + 33, {
      fontSize: 22,
      lineHeight: 26,
      color: '#8ea39b',
      align: 'center',
      maxWidth: statWidth
    });
    drawText(ctx, item[1], cx, y + 70, {
      fontSize: 26,
      lineHeight: 30,
      color: INK,
      align: 'center',
      maxWidth: statWidth,
      maxLines: 1
    });
  });
  y += 132;

  y = drawSectionTitle(ctx, '食材用量', x, y, BLUE) + 24;
  y = drawChips(ctx, recipeIngredients(recipe), x, y, bodyWidth) + 42;

  y = drawSectionTitle(ctx, '营养亮点', x, y, GREEN) + 22;
  y = drawParagraphList(ctx, recipe.nutritionHighlights, x, y, {
    maxWidth: bodyWidth
  }) + 28;

  y = drawSectionTitle(ctx, '制作步骤', x, y, '#ffb548') + 22;
  y = drawParagraphList(ctx, recipe.steps, x, y, {
    numbered: true,
    maxWidth: bodyWidth,
    color: '#5f7970'
  }) + 28;

  y = drawSectionTitle(ctx, '注意事项', x, y, '#ff8b9b') + 22;
  y = drawParagraphList(ctx, recipe.cautions, x, y, {
    maxWidth: bodyWidth,
    color: '#6c8178'
  }) + 24;

  drawText(ctx, '本食谱为家庭饮食参考，不替代医生、营养师或儿保建议。', x, y, {
    fontSize: 23,
    lineHeight: 34,
    color: '#9aa8a2',
    maxWidth: bodyWidth
  });
}

function cardToTempFile(page, canvasId, height) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvasId,
      x: 0,
      y: 0,
      width: CARD_WIDTH,
      height,
      destWidth: CARD_WIDTH,
      destHeight: height,
      fileType: 'jpg',
      quality: 0.94,
      success: (res) => resolve(res.tempFilePath),
      fail: reject
    }, page);
  });
}

function drawCanvas(ctx) {
  return new Promise((resolve) => {
    ctx.draw(false, () => {
      wait(180).then(resolve);
    });
  });
}

function saveImage(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    });
  });
}

function getSetting() {
  return new Promise((resolve) => {
    if (!wx.getSetting) {
      resolve({});
      return;
    }
    wx.getSetting({
      success(res) {
        resolve(res.authSetting || {});
      },
      fail() {
        resolve({});
      }
    });
  });
}

function authorizeAlbum() {
  return new Promise((resolve, reject) => {
    if (!wx.authorize) {
      resolve();
      return;
    }
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: resolve,
      fail: reject
    });
  });
}

function openAlbumSetting() {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: '需要相册权限',
      content: '请允许保存到相册，才能下载食谱图片。',
      confirmText: '去设置',
      success(res) {
        if (!res.confirm) {
          reject(new Error('user_cancel_album_setting'));
          return;
        }
        wx.openSetting({
          success(setting) {
            if (setting.authSetting && setting.authSetting['scope.writePhotosAlbum']) {
              resolve();
              return;
            }
            reject(new Error('album_permission_denied'));
          },
          fail: reject
        });
      },
      fail: reject
    });
  });
}

async function ensureAlbumPermission() {
  const authSetting = await getSetting();
  if (authSetting['scope.writePhotosAlbum']) return;

  if (authSetting['scope.writePhotosAlbum'] === false) {
    await openAlbumSetting();
    return;
  }

  try {
    await authorizeAlbum();
  } catch (error) {
    await openAlbumSetting();
  }
}

function requirePrivacyAuthorize() {
  return new Promise((resolve, reject) => {
    if (!wx.getPrivacySetting || !wx.requirePrivacyAuthorize) {
      resolve();
      return;
    }

    wx.getPrivacySetting({
      success(res) {
        if (!res.needAuthorization) {
          resolve();
          return;
        }
        wx.requirePrivacyAuthorize({
          success: resolve,
          fail: reject
        });
      },
      fail() {
        resolve();
      }
    });
  });
}

function isPrivacyError(message) {
  return message.indexOf('privacy') >= 0 || message.indexOf('隐私') >= 0;
}

function isAlbumAuthError(message) {
  return message.indexOf('auth') >= 0 || message.indexOf('authorize') >= 0 || message.indexOf('permission') >= 0 || message.indexOf('deny') >= 0;
}

function handleSaveFail(error, retry) {
  const message = String(error && error.errMsg || '');
  if (isPrivacyError(message)) {
    requirePrivacyAuthorize().then(retry).catch(() => {
      wx.showToast({
        title: '请同意隐私授权后再保存',
        icon: 'none'
      });
    });
    return;
  }

  if (isAlbumAuthError(message)) {
    openAlbumSetting().then(retry).catch(() => {
      wx.showToast({
        title: '请允许保存到相册',
        icon: 'none'
      });
    });
    return;
  }

  wx.showToast({
    title: '保存失败，请重试',
    icon: 'none'
  });
}

async function prepareSaveToAlbum() {
  try {
    await requirePrivacyAuthorize();
    await ensureAlbumPermission();
    return true;
  } catch (error) {
    const message = String(error && error.errMsg || error && error.message || '');
    wx.showToast({
      title: isPrivacyError(message) ? '请同意隐私授权后再保存' : '请允许保存到相册',
      icon: 'none'
    });
    return false;
  }
}

async function saveFileToAlbum(filePath) {
  try {
    await requirePrivacyAuthorize();
    await ensureAlbumPermission();
    await saveImage(filePath);
    wx.showToast({
      title: '已保存到相册'
    });
  } catch (error) {
    handleSaveFail(error, () => {
      saveFileToAlbum(filePath);
    });
  }
}

async function saveRecipeCard(options) {
  const page = options.page;
  const recipe = options.recipe;
  if (!page || !recipe) return;

  const canvasId = options.canvasId || 'recipeCardCanvas';
  const heightKey = options.heightKey || 'cardCanvasHeight';
  const height = estimateRecipeCardHeight(recipe);

  wx.showLoading({
    title: '正在生成图片',
    mask: true
  });

  try {
    await setCanvasHeight(page, heightKey, height);
    const ctx = wx.createCanvasContext(canvasId, page);
    await drawRecipeCard(ctx, recipe, options.cardImage || options.image, options.metaText || '', height);
    await drawCanvas(ctx);
    const filePath = await cardToTempFile(page, canvasId, height);
    wx.hideLoading();
    await saveFileToAlbum(filePath);
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: '生成失败，请重试',
      icon: 'none'
    });
  }
}

function estimateWeeklyHeight(days) {
  return 238 + (days || []).length * 258 + 74;
}

async function drawWeeklyCard(ctx, options, height) {
  const days = options.days || [];
  drawCardShell(ctx, height);
  const x = 44;
  const bodyWidth = CARD_WIDTH - x * 2;
  let y = 76;

  y = drawText(ctx, `${options.nickname || '宝宝'}的一周食谱`, x, y, {
    fontSize: 44,
    lineHeight: 56,
    color: INK,
    maxWidth: bodyWidth
  }) + 6;
  y = drawText(ctx, `${options.ageMonths || '--'} 月龄 · ${options.stageName || ''}`, x, y, {
    fontSize: 27,
    lineHeight: 38,
    color: MUTED,
    maxWidth: bodyWidth
  }) + 22;

  fillRoundedRect(ctx, x, y, bodyWidth, 58, 29, '#eef8ff');
  drawText(ctx, '食材用量为家庭参考量，可根据宝宝食欲和咀嚼能力微调。', x + 24, y + 38, {
    fontSize: 22,
    lineHeight: 26,
    color: '#5d87c2',
    maxWidth: bodyWidth - 48,
    maxLines: 1
  });
  y += 90;

  const allMeals = [];
  days.forEach((day) => {
    (day.meals || []).forEach((meal) => {
      if (meal.cardImage || meal.image) allMeals.push(meal.cardImage || meal.image);
    });
  });
  const imageMap = {};
  await Promise.all(Array.from(new Set(allMeals)).map(async (src) => {
    imageMap[src] = await getImageInfo(src);
  }));

  days.forEach((day, dayIndex) => {
    const accent = day.accent || ['#64a8ff', '#81cf55', '#ff9a2e', '#ff7aa3'][dayIndex % 4];
    const cardY = y;
    fillRoundedRect(ctx, x, cardY, bodyWidth, 232, 28, '#ffffff');
    strokeRoundedRect(ctx, x, cardY, bodyWidth, 232, 28, '#e4efff', 2);
    fillRoundedRect(ctx, x, cardY, 12, 232, 6, accent);

    drawText(ctx, day.dayName || '', x + 30, cardY + 44, {
      fontSize: 31,
      lineHeight: 38,
      color: INK,
      maxWidth: 122,
      maxLines: 1
    });
    drawText(ctx, day.dateText || '', x + 30, cardY + 82, {
      fontSize: 22,
      lineHeight: 28,
      color: '#91a0b0',
      maxWidth: 122,
      maxLines: 1
    });

    const mealX = x + 142;
    const mealWidth = bodyWidth - 166;
    (day.meals || []).slice(0, 3).forEach((meal, mealIndex) => {
      const rowY = cardY + 22 + mealIndex * 66;
      const mealImage = meal.cardImage || meal.image;
      drawImageContain(ctx, imageMap[mealImage], mealX, rowY, 52, 52, 12);
      drawText(ctx, meal.mealType || '', mealX + 68, rowY + 24, {
        fontSize: 21,
        lineHeight: 25,
        color: accent,
        maxWidth: 72,
        maxLines: 1
      });
      drawText(ctx, meal.name || '暂无食谱', mealX + 146, rowY + 24, {
        fontSize: 24,
        lineHeight: 31,
        color: INK,
        maxWidth: mealWidth - 146,
        maxLines: 2
      });
    });

    y += 258;
  });

  drawText(ctx, '本食谱为家庭饮食参考，不替代医生、营养师或儿保建议。', x, y + 4, {
    fontSize: 22,
    lineHeight: 32,
    color: '#9aa8a2',
    maxWidth: bodyWidth
  });
}

async function saveWeeklyCard(options) {
  const page = options.page;
  const days = options.days || [];
  if (!page || !days.length) return;

  const canvasId = options.canvasId || 'weeklyCardCanvas';
  const heightKey = options.heightKey || 'weeklyCanvasHeight';
  const height = estimateWeeklyHeight(days);

  wx.showLoading({
    title: '正在生成食谱',
    mask: true
  });

  try {
    await setCanvasHeight(page, heightKey, height);
    const ctx = wx.createCanvasContext(canvasId, page);
    await drawWeeklyCard(ctx, options, height);
    await drawCanvas(ctx);
    const filePath = await cardToTempFile(page, canvasId, height);
    wx.hideLoading();
    await saveFileToAlbum(filePath);
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: '生成失败，请重试',
      icon: 'none'
    });
  }
}

module.exports = {
  prepareSaveToAlbum,
  saveRecipeCard,
  saveWeeklyCard
};
