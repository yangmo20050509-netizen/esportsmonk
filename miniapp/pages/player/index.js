const { fetchSiteData } = require("../../utils/api");
const { getSelectedPlayer, getSelectedTeam, setSelectedPlayer, setSiteData } = require("../../utils/state");
const { findPlayer, playersForTeam, themeForTeam } = require("../../utils/format");

Page({
  data: { players: [], activePlayer: null, selectedPlayer: "bin", themeColor: "#3d78d7" },

  async onShow() {
    const siteData = await fetchSiteData();
    setSiteData(siteData);
    this.syncPage(siteData);
  },

  syncPage(siteData) {
    const teamId = getSelectedTeam();
    const selectedPlayer = getSelectedPlayer();
    const players = playersForTeam(siteData, teamId);
    const activePlayer = findPlayer(siteData, selectedPlayer) || players[0] || null;
    this.setData({
      players,
      activePlayer,
      selectedPlayer: activePlayer?.id || "",
      themeColor: themeForTeam(teamId)
    });
  },

  handlePlayerTap(event) {
    const playerId = event.currentTarget.dataset.playerId;
    setSelectedPlayer(playerId);
    this.syncPage(getApp().globalData.siteData);
  }
});
