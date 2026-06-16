const recipe = require('../../utils/recipe');

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
    today: formatDate(new Date()),
    allergyOptions: [],
    avoidOptions: [],
    selectedAllergies: [],
    selectedAvoids: [],
    customAvoid: ''
  },

  onLoad() {
    const profile = recipe.getProfile();
    this.setData({
      nickname: profile.nickname,
      birthDate: profile.birthDate,
      selectedAllergies: (profile.allergyTags || []).map((item) => item.standardTag),
      selectedAvoids: (profile.avoidTags || []).map((item) => item.standardTag),
      allergyOptions: this.markOptions(recipe.getCommonAllergyTags(), profile.allergyTags),
      avoidOptions: this.markOptions(recipe.getCommonAvoidTags(), profile.avoidTags)
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

  markOptions(options, selectedTags) {
    const selected = new Set((selectedTags || []).map((item) => item.standardTag));
    return options.map((item) => ({
      ...item,
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
      birthDate: event.detail.value
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

  onCustomAvoidInput(event) {
    this.setData({
      customAvoid: event.detail.value
    });
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

  save() {
    const nickname = this.data.nickname.trim();
    if (!nickname) {
      wx.showToast({
        title: '请填写昵称',
        icon: 'none'
      });
      return;
    }

    const avoidTags = this.buildTags(this.data.selectedAvoids, recipe.getCommonAvoidTags());
    const custom = this.data.customAvoid.trim();
    if (custom) {
      avoidTags.push(recipe.makeTag(custom));
    }

    recipe.saveProfile({
      nickname,
      birthDate: this.data.birthDate,
      allergyTags: this.buildTags(this.data.selectedAllergies, recipe.getCommonAllergyTags()),
      avoidTags
    });

    wx.showToast({
      title: '已保存'
    });
    setTimeout(() => wx.navigateBack(), 500);
  }
});
