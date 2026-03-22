function findTeam(siteData, teamId) {
  return siteData?.teams?.items?.find((item) => item.id === teamId) || null;
}

function findPlayer(siteData, playerId) {
  return siteData?.players?.items?.find((item) => item.id === playerId) || null;
}

function findPrediction(siteData, teamId) {
  return siteData?.predictions?.items?.find((item) => item.teamId === teamId) || null;
}

function playersForTeam(siteData, teamId) {
  return (siteData?.players?.items || []).filter((item) => item.teamCode === teamId);
}

function nextOrLiveMatch(siteData, teamId) {
  const live = (siteData?.overview?.liveMatches || []).find((match) => match.teamA?.shortName === teamId || match.teamB?.shortName === teamId);
  if (live) return live;
  return (siteData?.overview?.upcomingMatches || []).find((match) => match.teamA?.shortName === teamId || match.teamB?.shortName === teamId) || null;
}

function themeForTeam(teamId) {
  const themes = {
    BLG: "#3d78d7", JDG: "#c73c2d", AL: "#16735f", WBG: "#b63830", LNG: "#2b5c73",
    TES: "#c86b24", NIP: "#6f4bb8", WE: "#a2272c", GEN: "#8b7550", G2: "#2c2c2c",
    BFX: "#2558c9", LOUD: "#1f7f53", LYON: "#8f6b2c", TSW: "#2a7f9f"
  };
  return themes[teamId] || "#8d7147";
}

module.exports = { findTeam, findPlayer, findPrediction, playersForTeam, nextOrLiveMatch, themeForTeam };
