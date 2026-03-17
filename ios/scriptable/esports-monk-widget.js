const DEFAULT_TEAM = "BLG";
const DEFAULT_PLAYER = "Bin";
const TEAM_FOCUS_MAP = {
  Bin: "BLG",
  knight: "BLG",
  Elk: "BLG",
  ON: "BLG",
  Xun: "BLG",
  Beichuan: "BLG",
};

const URLS = {
  teamList: "https://lpl.qq.com/web201612/data/LOL_MATCH2_TEAM_LIST.js",
  gameList: "https://lpl.qq.com/web201612/data/LOL_MATCH2_GAME_LIST_BRIEF.js",
  matchFile: (gameId) =>
    `https://lpl.qq.com/web201612/data/LOL_MATCH2_MATCH_HOMEPAGE_BMATCH_LIST_${gameId}.js`,
};

const TOURNAMENTS = [
  { bigGameId: "5", slug: "lpl", label: "LPL" },
  { bigGameId: "220", slug: "first-stand", label: "First Stand" },
];

function parseArgs() {
  const parts = String(args.widgetParameter || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const player = parts[1] || DEFAULT_PLAYER;
  const team = parts[0] || TEAM_FOCUS_MAP[player] || DEFAULT_TEAM;
  return { team, player };
}

function parseAssignedJson(raw, variableName) {
  const prefix = `var ${variableName}=`;
  return JSON.parse(raw.slice(prefix.length).replace(/;$/, ""));
}

function parseDate(value) {
  return new Date(String(value).replace(/-/g, "/"));
}

function ensureHttps(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function pickCurrentGame(list) {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - 30);

  return (list || [])
    .filter((item) => parseDate(item.eDate) >= threshold)
    .sort((left, right) => parseDate(right.sDate) - parseDate(left.sDate))[0];
}

function splitMatchName(matchName) {
  if (!matchName || !matchName.includes(" vs ")) {
    return ["待定", "待定"];
  }

  return matchName.split(" vs ");
}

function fallbackShortName(name) {
  if (!name) return "TBD";
  const parts = String(name).trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function resolveTeam(match, side, teamList) {
  const sideKey = side === "A" ? "TeamA" : "TeamB";
  const shortKey = side === "A" ? "TeamShortNameA" : "TeamShortNameB";
  const [leftName, rightName] = splitMatchName(match.bMatchName);
  const fallbackName = side === "A" ? leftName : rightName;
  const detail = teamList[String(match[sideKey])] || {};
  return {
    id: String(match[sideKey] || ""),
    name: detail.TeamName || fallbackName,
    shortName:
      match[shortKey] ||
      detail.TeamShortName ||
      fallbackShortName(fallbackName) ||
      fallbackShortName(detail.TeamName),
    logo: ensureHttps(detail.TeamLogo),
  };
}

function normalizeStatus(value) {
  const status = Number(value);
  if (status === 1) return "未开始";
  if (status === 3) return "已结束";
  return "进行中/待确认";
}

async function loadText(url) {
  const request = new Request(url);
  request.headers = {
    "user-agent": "Mozilla/5.0",
    accept: "application/json,text/plain,*/*",
  };
  return request.loadString();
}

async function loadJson(url) {
  const request = new Request(url);
  request.headers = {
    "user-agent": "Mozilla/5.0",
    accept: "application/json,text/plain,*/*",
  };
  return request.loadJSON();
}

async function buildDataset() {
  const [teamListRaw, gameListRaw] = await Promise.all([
    loadText(URLS.teamList),
    loadText(URLS.gameList),
  ]);

  const teamList = parseAssignedJson(teamListRaw, "TeamList");
  const gameList = parseAssignedJson(gameListRaw, "GameList");
  const tournaments = [];

  for (const tournament of TOURNAMENTS) {
    const currentGame = pickCurrentGame(gameList.msg.sGameList[tournament.bigGameId]);
    if (!currentGame) continue;
    tournaments.push({ ...tournament, currentGame });
  }

  const matches = [];
  for (const tournament of tournaments) {
    const payload = await loadJson(URLS.matchFile(tournament.currentGame.GameId));
    if (String(payload.status) !== "0" || !Array.isArray(payload.msg)) continue;

    for (const match of payload.msg) {
      const teamA = resolveTeam(match, "A", teamList.msg);
      const teamB = resolveTeam(match, "B", teamList.msg);
      matches.push({
        id: String(match.bMatchId),
        tournamentLabel: tournament.label,
        stage: match.GameTypeName || "",
        round: match.GameProcName || "",
        bo: match.GameModeName || `BO${match.GameMode || "?"}`,
        matchDate: match.MatchDate,
        statusText: normalizeStatus(match.MatchStatus),
        status: Number(match.MatchStatus),
        scoreA: Number(match.ScoreA || 0),
        scoreB: Number(match.ScoreB || 0),
        teamA,
        teamB,
      });
    }
  }

  matches.sort((left, right) => parseDate(left.matchDate) - parseDate(right.matchDate));
  return matches;
}

function selectFocus(matches, team) {
  const relevant = matches.filter(
    (match) => match.teamA.shortName === team || match.teamB.shortName === team,
  );
  const now = new Date();
  const nextMatch = relevant.find((match) => parseDate(match.matchDate) >= now);
  const lastMatch = [...relevant].reverse().find((match) => parseDate(match.matchDate) <= now);
  const board = matches.filter((match) => parseDate(match.matchDate) >= now).slice(0, 2);
  return { nextMatch, lastMatch, board };
}

function formatDateTime(value) {
  const formatter = new DateFormatter();
  formatter.locale = "zh_CN";
  formatter.dateFormat = "MM/dd HH:mm";
  return formatter.string(parseDate(value));
}

function addLineText(stack, text, options = {}) {
  const line = stack.addText(text);
  line.textColor = options.color || Color.white();
  line.font = options.font || Font.mediumSystemFont(12);
  line.lineLimit = options.lineLimit || 1;
  return line;
}

async function createWidget(matches, team, player) {
  const { nextMatch, lastMatch, board } = selectFocus(matches, team);
  const widget = new ListWidget();
  widget.backgroundGradient = new LinearGradient();
  widget.backgroundGradient.colors = [new Color("#101317"), new Color("#151b24")];
  widget.backgroundGradient.locations = [0, 1];
  widget.setPadding(16, 16, 16, 16);

  const top = widget.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  addLineText(top, "电竞高僧", { font: Font.semiboldSystemFont(13) });
  top.addSpacer();
  addLineText(top, `${team} / ${player}`, {
    font: Font.mediumSystemFont(11),
    color: new Color("#d4ae67"),
  });

  widget.addSpacer(10);
  addLineText(widget, "下一场", {
    font: Font.mediumSystemFont(11),
    color: new Color("#a2a8b3"),
  });
  addLineText(
    widget,
    nextMatch
      ? `${nextMatch.teamA.shortName} vs ${nextMatch.teamB.shortName}`
      : "当前没有后续赛程",
    { font: Font.boldSystemFont(18), lineLimit: 2 },
  );
  addLineText(
    widget,
    nextMatch
      ? `${formatDateTime(nextMatch.matchDate)}  ${nextMatch.tournamentLabel} ${nextMatch.bo}`
      : "等腾讯官方源更新",
    { font: Font.mediumSystemFont(12), color: new Color("#a2a8b3"), lineLimit: 2 },
  );

  widget.addSpacer(12);
  const scoreBox = widget.addStack();
  scoreBox.layoutHorizontally();
  scoreBox.centerAlignContent();
  scoreBox.backgroundColor = new Color("#1b212b");
  scoreBox.cornerRadius = 14;
  scoreBox.setPadding(10, 12, 10, 12);

  if (lastMatch) {
    addLineText(scoreBox, `${lastMatch.teamA.shortName} ${lastMatch.scoreA}`, {
      font: Font.semiboldSystemFont(13),
    });
    scoreBox.addSpacer();
    addLineText(scoreBox, `${lastMatch.scoreB} ${lastMatch.teamB.shortName}`, {
      font: Font.semiboldSystemFont(13),
    });
  } else {
    addLineText(scoreBox, "还没有历史赛果", {
      font: Font.mediumSystemFont(12),
      color: new Color("#a2a8b3"),
    });
  }

  widget.addSpacer(10);
  addLineText(widget, "官方赛程快看", {
    font: Font.mediumSystemFont(11),
    color: new Color("#a2a8b3"),
  });

  for (const match of board) {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.setPadding(2, 0, 2, 0);
    addLineText(row, formatDateTime(match.matchDate), {
      font: Font.mediumSystemFont(10),
      color: new Color("#a2a8b3"),
    });
    row.addSpacer(8);
    addLineText(row, `${match.teamA.shortName} vs ${match.teamB.shortName}`, {
      font: Font.mediumSystemFont(11),
      lineLimit: 1,
    });
    row.addSpacer();
    addLineText(row, match.status === 1 ? "VS" : `${match.scoreA}:${match.scoreB}`, {
      font: Font.semiboldSystemFont(11),
      color: match.status === 3 ? Color.white() : new Color("#d4ae67"),
    });
  }

  return widget;
}

async function main() {
  const { team, player } = parseArgs();
  const matches = await buildDataset();
  const widget = await createWidget(matches, team, player);

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium();
  }

  Script.complete();
}

await main();
