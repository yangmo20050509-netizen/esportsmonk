const { fetchSiteData } = require("../../utils/api");
const { getSelectedTeam, setSelectedTeam, getSelectedPlayer, setSelectedPlayer, setSiteData } = require("../../utils/state");
const { findPrediction, playersForTeam, findTeam, themeForTeam } = require("../../utils/format");

Page({
  data: { teams: [], selectedTeam: "BLG", prediction: null, themeColor: "#3d78d7" },

  async onShow() {
    const siteData = await fetchSiteData();
    setSiteData(siteData);
    this.syncPage(siteData);
  },

  syncPage(siteData) {
    const selectedTeam = getSelectedTeam();
    const team = findTeam(siteData, selectedTeam) || siteData.teams.items[0] || null;
    const prediction = findPrediction(siteData, team?.id);
    this.setData({
      teams: siteData.teams.items.filter((item) => !!findPrediction(siteData, item.id)),
      selectedTeam: team?.id || "BLG",
      prediction,
      themeColor: themeForTeam(team?.id)
    });
  },

  handleTeamTap(event) {
    const teamId = event.currentTarget.dataset.teamId;
    setSelectedTeam(teamId);
    const siteData = getApp().globalData.siteData;
    const firstPlayer = playersForTeam(siteData, teamId)[0];
    if (firstPlayer?.id && firstPlayer.id !== getSelectedPlayer()) setSelectedPlayer(firstPlayer.id);
    this.syncPage(siteData);
  }
});
