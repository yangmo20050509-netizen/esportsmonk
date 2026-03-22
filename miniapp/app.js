App({
  globalData: {
    selectedTeam: "BLG",
    selectedPlayer: "bin",
    siteData: null,
    siteDataUpdatedAt: "",
  },

  onLaunch() {
    const storedTeam = wx.getStorageSync("esportsmonk:selectedTeam");
    const storedPlayer = wx.getStorageSync("esportsmonk:selectedPlayer");

    if (storedTeam) this.globalData.selectedTeam = storedTeam;
    if (storedPlayer) this.globalData.selectedPlayer = storedPlayer;
  },
});
