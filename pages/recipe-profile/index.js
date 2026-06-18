const recipe = require('../../utils/recipe');
const share = require('../../utils/share');

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

Page({
  data: {
    nickname: '',
    birthDate: '',
    birthDateText: '请选择出生年月日',
    today: formatDate(new Date()),
    allergyOptions: [],
    avoidOptions: [],
    selectedAllergies: [],
    selectedAvoids: [],
    customAllergy: '',
    customAllergyHint: '',
    customAvoid: '',
    customAvoidHint: ''
  },

  onLoad() {
    share.enableShareMenu();
    const profile = recipe.getProfile();
    this.setData({
      nickname: profile.nickname,
      birthDate: profile.birthDate,
      birthDateText: profile.birthDate || '请选择出生年月日',
      selectedAllergies: (profile.allergyTags || []).map((item) => item.standardTag),
      selectedAvoids: (profile.avoidTags || []).map((item) => item.standardTag),
      allergyOptions: this.markOptions(recipe.getCommonAllergyTags(), profile.allergyTags),
      avoidOptions: this.markOptions(recipe.getCommonAvoidTags(), profile.avoidTags)
    });
  },

  onShareAppMessage() {
    return share.recipeHomeAppMessage();
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

  markOptions(options, selectedTags) {
    const selected = new Set((selectedTags || []).map((item) => item.standardTag));
    return options.map((item) => Object.assign({}, item, {
      checked: selected.has(item.standardTag)
    }));
  },

  onNicknameInput(event) {
    this.setData({
      nickname: event.detail.value
    });
  },

  onBirthDateChange(event) {
    this.setData({
      birthDate: event.detail.value,
      birthDateText: event.detail.value
    });
  },

  onAllergyChange(event) {
    this.setData({
      selectedAllergies: event.detail.value
    });
  },

  onAvoidChange(event) {
    this.setData({
      selectedAvoids: event.detail.value
    });
  },

  onCustomAllergyInput(event) {
    const value = event.detail.value;
    this.setData({
      customAllergy: value,
      customAllergyHint: this.getResolveHint(value)
    });
  },

  onCustomAvoidInput(event) {
    const value = event.detail.value;
    this.setData({
      customAvoid: value,
      customAvoidHint: this.getResolveHint(value)
    });
  },

  getResolveHint(value) {
    const resolved = recipe.resolveTag(value);
    if (resolved.empty) return '';
    return resolved.ok ? (resolved.message || `已识别为：${resolved.label}`) : '暂未识别，请换个叫法或从选项中选择';
  },

  buildTags(values, options) {
    return values.map((standardTag) => {
      const option = options.find((item) => item.standardTag === standardTag);
      return {
        label: option ? option.label : standardTag,
        standardTag,
        sourceInput: option ? option.label : standardTag
      };
    });
  },

  addCustomTag(tags, input) {
    const text = input.trim();
    if (!text) return true;

    const resolved = recipe.resolveTag(text);
    if (!resolved.ok || resolved.empty) {
      wx.showToast({
        title: '请换个食材叫法',
        icon: 'none'
      });
      return false;
    }

    const exists = tags.some((item) => item.standardTag === resolved.standardTag);
    if (!exists) {
      tags.push({
        label: resolved.label,
        standardTag: resolved.standardTag,
        sourceInput: resolved.sourceInput
      });
    }
    return true;
  },

  save() {
    const nickname = this.data.nickname.trim();
    if (!nickname) {
      wx.showToast({
        title: '请填写昵称',
        icon: 'none'
      });
      return;
    }

    if (!this.data.birthDate) {
      wx.showToast({
        title: '请选择生日',
        icon: 'none'
      });
      return;
    }

    const allergyTags = this.buildTags(this.data.selectedAllergies, recipe.getCommonAllergyTags());
    if (!this.addCustomTag(allergyTags, this.data.customAllergy)) return;

    const avoidTags = this.buildTags(this.data.selectedAvoids, recipe.getCommonAvoidTags());
    if (!this.addCustomTag(avoidTags, this.data.customAvoid)) return;

    const result = recipe.saveProfile({
      nickname,
      birthDate: this.data.birthDate,
      allergyTags,
      avoidTags
    });

    if (!result.ok) {
      wx.showModal({
        title: '暂不支持建档',
        content: result.message,
        showCancel: false
      });
      return;
    }

    wx.showToast({
      title: '档案已保存'
    });
    setTimeout(() => {
      wx.navigateBack({
        fail() {
          wx.redirectTo({
            url: '/pages/recipe/index'
          });
        }
      });
    }, 500);
  }
});
