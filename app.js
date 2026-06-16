App({
  globalData: {
    appName: '宝贝乖乖吃饭'
  },

  onLaunch() {
    const savedProfile = wx.getStorageSync('babyProfile');
    if (!savedProfile) {
      const defaultBirthDate = this.getDefaultBirthDate();
      wx.setStorageSync('babyProfile', {
        babyId: 'baby_001',
        nickname: '小柚子',
        birthDate: defaultBirthDate,
        allergyTags: [],
        avoidTags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  },

  getDefaultBirthDate() {
    const now = new Date();
    const birth = new Date(now.getFullYear(), now.getMonth() - 14, now.getDate());
    const year = birth.getFullYear();
    const month = String(birth.getMonth() + 1).padStart(2, '0');
    const day = String(birth.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
