const { fetchSiteData } = require("../../utils/api");
const { getSelectedTeam, setSelectedTeam, setSelectedPlayer, setSiteData } = require("../../utils/state");
const { findTeam, playersForTeam, themeForTeam } = require("../../utils/format");

Page({
  data: { teams: [], selectedTeam: "BLG", activeTeam: null, players: [], themeColor: "#3d78d7" },

  async onShow() {
    const siteData = await fetchSiteData();
    setSiteData(siteData);
    this.syncPage(siteData);
  },

  syncPage(siteData) {
    const selectedTeam = getSelectedTeam();
    const activeTeam = findTeam(siteData, selectedTeam) || siteData.teams.items[0] || null;
    const players = playersForTeam(siteData, activeTeam?.id);
    this.setData({
      teams: siteData.teams.items,
      selectedTeam: activeTeam?.id || "BLG",
      activeTeam,
      players,
      themeColor: themeForTeam(activeTeam?.id)
    });
  },

  handleTeamTap(event) {
    const teamId = event.currentTarget.dataset.teamId;
    setSelectedTeam(teamId);
    const siteData = getApp().globalData.siteData;
    const firstPlayer = playersForTeam(siteData, teamId)[0];
    if (firstPlayer?.id) setSelectedPlayer(firstPlayer.id);
    this.syncPage(siteData);
  },

  handlePlayerTap(event) {
    const playerId = event.currentTarget.dataset.playerId;
    setSelectedPlayer(playerId);
    wx.switchTab({ url: "/pages/player/index" });
  }
});
