function getAppInstance() {
  return getApp();
}

function getSelectedTeam() {
  return getAppInstance().globalData.selectedTeam || "BLG";
}

function setSelectedTeam(teamId) {
  getAppInstance().globalData.selectedTeam = teamId;
  wx.setStorageSync("esportsmonk:selectedTeam", teamId);
}

function getSelectedPlayer() {
  return getAppInstance().globalData.selectedPlayer || "bin";
}

function setSelectedPlayer(playerId) {
  getAppInstance().globalData.selectedPlayer = playerId;
  wx.setStorageSync("esportsmonk:selectedPlayer", playerId);
}

function setSiteData(siteData) {
  const app = getAppInstance();
  app.globalData.siteData = siteData;
  app.globalData.siteDataUpdatedAt = siteData.generatedAtLocal || "";
}

module.exports = {
  getSelectedTeam,
  setSelectedTeam,
  getSelectedPlayer,
  setSelectedPlayer,
  setSiteData,
};
