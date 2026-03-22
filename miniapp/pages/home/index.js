const { fetchSiteData } = require("../../utils/api");
const { getSelectedTeam, setSelectedTeam, getSelectedPlayer, setSelectedPlayer, setSiteData } = require("../../utils/state");
const { findTeam, findPlayer, findPrediction, playersForTeam, nextOrLiveMatch, themeForTeam } = require("../../utils/format");
const { requestMatchReminder } = require("../../utils/subscription");

Page({
  data: {
    loading: true,
    updatedAt: "",
    teams: [],
    players: [],
    selectedTeam: "BLG",
    selectedPlayer: "bin",
    activeTeam: null,
    activePlayer: null,
    focusMatch: null,
    focusPrediction: null,
    themeColor: "#3d78d7"
  },

  async onShow() {
    await this.loadPage();
  },

  async onPullDownRefresh() {
    await this.loadPage(true);
    wx.stopPullDownRefresh();
  },

  async loadPage(force = false) {
    this.setData({ loading: true });
    const siteData = await fetchSiteData(force);
    setSiteData(siteData);
    this.syncPage(siteData);
  },

  syncPage(siteData) {
    const selectedTeam = getSelectedTeam();
    const selectedPlayer = getSelectedPlayer();
    const team = findTeam(siteData, selectedTeam) || siteData.teams.items[0] || null;
    const teamPlayers = playersForTeam(siteData, team?.id);
    const player = findPlayer(siteData, selectedPlayer) || teamPlayers[0] || null;
    if (team?.id && team.id !== selectedTeam) setSelectedTeam(team.id);
    if (player?.id && player.id !== selectedPlayer) setSelectedPlayer(player.id);
    this.setData({
      loading: false,
      updatedAt: siteData.generatedAtLocal || "",
      teams: siteData.teams.items,
      players: teamPlayers,
      selectedTeam: team?.id || "BLG",
      selectedPlayer: player?.id || "",
      activeTeam: team,
      activePlayer: player,
      focusMatch: nextOrLiveMatch(siteData, team?.id),
      focusPrediction: findPrediction(siteData, team?.id),
      themeColor: themeForTeam(team?.id)
    });
  },

  handleTeamTap(event) {
    const teamId = event.currentTarget.dataset.teamId;
    setSelectedTeam(teamId);
    const siteData = getApp().globalData.siteData;
    const nextPlayers = playersForTeam(siteData, teamId);
    if (nextPlayers[0]?.id) setSelectedPlayer(nextPlayers[0].id);
    this.syncPage(siteData);
  },

  handlePlayerTap(event) {
    const playerId = event.currentTarget.dataset.playerId;
    setSelectedPlayer(playerId);
    this.syncPage(getApp().globalData.siteData);
  },

  async handleSubscribeTap() {
    if (!this.data.focusMatch) {
      wx.showToast({ title: "现在没可订的比赛", icon: "none" });
      return;
    }
    try {
      const result = await requestMatchReminder(this.data.focusMatch);
      wx.showToast({ title: result.message, icon: "none", duration: 2400 });
    } catch (error) {
      wx.showToast({ title: "订阅消息申请失败", icon: "none" });
    }
  },

  goPrediction() {
    wx.switchTab({ url: "/pages/prediction/index" });
  },

  goTeam() {
    wx.switchTab({ url: "/pages/team/index" });
  }
});
