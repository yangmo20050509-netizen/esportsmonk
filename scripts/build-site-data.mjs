import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const scheduleScript = path.join(projectRoot, "scripts", "build-self-use-data.mjs");
const schedulePath = path.join(projectRoot, "app", "data", "tencent-schedule.json");
const outputPath = path.join(projectRoot, "app", "data", "site-data.json");
const inlineOutputPath = path.join(projectRoot, "app", "data", "site-data.inline.js");
const playerAssetDir = path.join(projectRoot, "app", "assets", "players");
const PLAYER_PORTRAIT_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".avif"];

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const NAV_LABELS = {
  overview: "首页",
  teams: "战队档案",
  players: "选手观察",
  predictions: "高僧预测",
};

const REGION_MAP = {
  AL: "LPL",
  BLG: "LPL",
  BFX: "LCP",
  EDG: "LPL",
  G2: "LEC",
  GEN: "LCK",
  IG: "LPL",
  JDG: "LPL",
  LGD: "LPL",
  LNG: "LPL",
  LOUD: "CBLOL",
  LYON: "LLA",
  NIP: "LPL",
  OMG: "LPL",
  TES: "LPL",
  TSW: "PCS",
  TT: "LPL",
  UP: "LPL",
  WBG: "LPL",
  WE: "LPL",
};

const FOCUS_TEAM_IDS = ["BLG", "JDG", "AL", "WBG", "LNG", "TES"];

const FOCUS_PLAYERS = [
  { id: "bin", name: "Bin", role: "上路", teamCode: "BLG", watch: "看对线压力和敢不敢把兵线推深。" },
  { id: "xun", name: "XUN", role: "打野", teamCode: "BLG", watch: "看前十五分钟资源规划和抓边效率。" },
  { id: "knight", name: "Knight", role: "中路", teamCode: "BLG", watch: "看中期接团次序和技能落点。" },
  { id: "viper", name: "Viper", role: "下路", teamCode: "BLG", watch: "看线权转换和中后段输出稳定度。" },
  { id: "on", name: "ON", role: "辅助", teamCode: "BLG", watch: "看先手时机和保后排的判断。" },
];

function resolvePlayerPortrait(playerId) {
  for (const ext of PLAYER_PORTRAIT_EXTENSIONS) {
    const assetPath = path.join(playerAssetDir, `${playerId}${ext}`);
    if (existsSync(assetPath)) {
      return `./assets/players/${playerId}${ext}`;
    }
  }
  return "";
}

const FALLBACK_COPY = {
  title: "电竞高僧 | 英雄联盟观赛站",
  description: "聚合英雄联盟重点赛事的官方赛程、比分、战队信息与比赛预测。",
  brandEyebrow: "ESPORTS MONK",
  brandName: "电竞高僧",
  scopePill: "LPL / First Stand / 主队动态",
  signalText: "官源同步于",
  sections: {
    overview: {
      liveEyebrow: "此刻对局",
      liveTitle: "正在进行",
      liveTag: "官源实况",
      upcomingEyebrow: "将启赛程",
      upcomingTitle: "接下来",
      upcomingTag: "未来 72 小时",
      rankingEyebrow: "赛段席次",
      rankingTitle: "第一赛段榜单",
      rankingTag: "LPL 已完赛",
      spotlightEyebrow: "主队关注",
      spotlightTitle: "重点观察",
    },
    teams: {
      eyebrow: "战队档案",
      title: "战队档案",
      note: "保留赛程、赛果、走势与关键指标。",
      docketTitle: "赛程与赛果",
      historyTitle: "最近四场",
      heatTitle: "关键指标",
    },
    players: {
      eyebrow: "选手观察",
      title: "选手观察",
      trackTitle: "赛程与角色",
      notesTitle: "观赛要点",
      historyTitle: "战队近况",
      intro: "默认跟随主队重点选手，保留角色信息、战队赛程和近期赛果。",
    },
    predictions: {
      eyebrow: "高僧预测",
      title: "高僧预测",
      note: "只围绕下一场已确认对阵，给出比分判断和高僧见解。",
    },
  },
};

const AI_COPY_BLOCKLIST = [
  "装懂",
  "写上墙",
  "梭哈",
  "嘴硬",
  "当空气",
  "玄学",
  "神谕",
  "天命",
  "阵卷",
  "观席",
  "禅断",
];

function parseMatchDate(value) {
  return new Date(String(value).replace(/-/g, "/"));
}

function formatDateShort(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parseMatchDate(value));
}

function formatDateLong(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parseMatchDate(value));
}

function formatCountdown(value, now = new Date()) {
  const diff = parseMatchDate(value) - now;
  if (diff <= 0) return "已到时点";
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  return `${minutes}分钟`;
}

function sortMatches(matches, direction = 1) {
  return [...matches].sort((left, right) => {
    return (parseMatchDate(left.matchDate) - parseMatchDate(right.matchDate)) * direction;
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function signed(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function isKnownTeam(teamCode) {
  return Boolean(teamCode && teamCode !== "TBD" && teamCode !== "待定");
}

function renderRecentForm(results) {
  return results.length
    ? results
        .map((result) => {
          if (result === "win") return "胜";
          if (result === "loss") return "负";
          return "平";
        })
        .join(" ")
    : "暂无";
}

function teamNameLookup(data) {
  return new Map(data.teams.map((team) => [team.shortName, team]));
}

function getDisplayName(teamMap, teamCode) {
  return teamMap.get(teamCode)?.name || teamCode;
}

function getTeamMatches(data, teamCode) {
  return sortMatches(
    data.matches.filter(
      (match) => match.teamA.shortName === teamCode || match.teamB.shortName === teamCode,
    ),
    1,
  );
}

function getPerspective(match, teamCode) {
  const isTeamA = match.teamA.shortName === teamCode;
  return {
    team: isTeamA ? match.teamA : match.teamB,
    opponent: isTeamA ? match.teamB : match.teamA,
    scoreFor: isTeamA ? Number(match.scoreA) : Number(match.scoreB),
    scoreAgainst: isTeamA ? Number(match.scoreB) : Number(match.scoreA),
  };
}

function getSeriesResult(match, teamCode) {
  if (match.status !== "completed") return null;
  const perspective = getPerspective(match, teamCode);
  if (perspective.scoreFor > perspective.scoreAgainst) return "win";
  if (perspective.scoreFor < perspective.scoreAgainst) return "loss";
  return "draw";
}

function buildStageAwards(data) {
  const awards = {};
  const completedLpl = sortMatches(
    data.matches.filter((match) => match.tournamentSlug === "lpl" && match.status === "completed"),
    -1,
  );
  const finalMatch = completedLpl.find(
    (match) => match.roundName === "决赛" || String(match.stageName).includes("决赛"),
  );

  if (finalMatch) {
    const champion =
      Number(finalMatch.scoreA) > Number(finalMatch.scoreB)
        ? finalMatch.teamA.shortName
        : finalMatch.teamB.shortName;
    const runnerUp = champion === finalMatch.teamA.shortName ? finalMatch.teamB.shortName : finalMatch.teamA.shortName;
    awards[champion] = "第一赛段冠军";
    awards[runnerUp] = "第一赛段亚军";
  }

  return awards;
}

function buildRankingRows(data, teamMap) {
  const table = new Map();
  const completed = data.matches.filter(
    (match) => match.status === "completed" && match.tournamentSlug === "lpl",
  );

  for (const match of completed) {
    for (const teamCode of [match.teamA.shortName, match.teamB.shortName]) {
      const row =
        table.get(teamCode) || {
          teamCode,
          name: getDisplayName(teamMap, teamCode),
          region: REGION_MAP[teamCode] || "LPL",
          seriesWins: 0,
          seriesLosses: 0,
          gameWins: 0,
          gameLosses: 0,
          recent: [],
        };

      const result = getSeriesResult(match, teamCode);
      if (result === "win") row.seriesWins += 1;
      if (result === "loss") row.seriesLosses += 1;
      const perspective = getPerspective(match, teamCode);
      row.gameWins += perspective.scoreFor;
      row.gameLosses += perspective.scoreAgainst;
      row.recent.unshift(result);
      row.recent = row.recent.slice(0, 5);
      table.set(teamCode, row);
    }
  }

  return [...table.values()]
    .map((row) => ({
      ...row,
      gameDiff: row.gameWins - row.gameLosses,
      recentText: renderRecentForm(row.recent),
    }))
    .sort((left, right) => {
      const seriesDelta = right.seriesWins - left.seriesWins;
      if (seriesDelta !== 0) return seriesDelta;
      const diffDelta = right.gameDiff - left.gameDiff;
      if (diffDelta !== 0) return diffDelta;
      return right.gameWins - left.gameWins;
    })
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
}

function buildTeamRecord(data, teamCode) {
  const allMatches = getTeamMatches(data, teamCode);
  const completed = sortMatches(allMatches.filter((match) => match.status === "completed"), -1);
  const liveMatch = allMatches.find((match) => match.status === "in_progress") || null;
  const upcomingMatches = sortMatches(
    allMatches.filter((match) => match.status === "upcoming"),
    1,
  );
  const nextKnownMatch =
    upcomingMatches.find(
      (match) =>
        isKnownTeam(match.teamA.shortName) &&
        isKnownTeam(match.teamB.shortName) &&
        parseMatchDate(match.matchDate) >= new Date(),
    ) || null;
  const nextMatch =
    upcomingMatches.find((match) => parseMatchDate(match.matchDate) >= new Date()) ||
    upcomingMatches[0] ||
    null;
  const latestMatch = completed[0] || null;
  const wins = completed.filter((match) => getSeriesResult(match, teamCode) === "win").length;
  const losses = completed.filter((match) => getSeriesResult(match, teamCode) === "loss").length;
  const gameWins = completed.reduce((sum, match) => sum + getPerspective(match, teamCode).scoreFor, 0);
  const gameLosses = completed.reduce((sum, match) => sum + getPerspective(match, teamCode).scoreAgainst, 0);
  const recent = completed.slice(0, 5).map((match) => getSeriesResult(match, teamCode));
  const recentWins = recent.filter((result) => result === "win").length;

  let streakType = null;
  let streakCount = 0;
  for (const result of recent) {
    if (!result || result === "draw") break;
    if (!streakType) {
      streakType = result;
      streakCount += 1;
      continue;
    }
    if (streakType !== result) break;
    streakCount += 1;
  }

  const played = wins + losses;
  const winRate = played ? Math.round((wins / played) * 100) : 0;
  const gameDiff = gameWins - gameLosses;

  return {
    teamCode,
    completed,
    liveMatch,
    nextKnownMatch,
    nextMatch,
    latestMatch,
    wins,
    losses,
    played,
    winRate,
    gameWins,
    gameLosses,
    gameDiff,
    recent,
    recentWins,
    recentText: renderRecentForm(recent),
    streakType,
    streakCount,
    streakLabel: streakCount
      ? `${streakCount}连${streakType === "win" ? "胜" : "负"}`
      : "无连续走势",
  };
}

function buildAllTeamRecords(data) {
  const teamCodes = new Set();
  for (const match of data.matches) {
    teamCodes.add(match.teamA.shortName);
    teamCodes.add(match.teamB.shortName);
  }

  return Object.fromEntries(
    [...teamCodes].map((teamCode) => [teamCode, buildTeamRecord(data, teamCode)]),
  );
}

function buildMetricBars(record) {
  const stability = clamp(record.winRate, 30, 96);
  const pressure = clamp(50 + record.gameDiff * 4, 18, 98);
  const recent = clamp(record.recentWins * 20, 20, 100);
  const momentum = clamp(
    46 + (record.streakType === "win" ? record.streakCount * 10 : -record.streakCount * 8),
    18,
    92,
  );

  return [
    { label: "胜率", value: stability, text: `${record.winRate}%` },
    { label: "局差", value: pressure, text: signed(record.gameDiff) },
    { label: "近五", value: recent, text: `${record.recentWins}/5` },
    { label: "走势", value: momentum, text: record.streakLabel },
  ];
}

function buildTeamStatement(teamCode, record, stageAward, nextMatch) {
  const opponent = nextMatch ? getPerspective(nextMatch, teamCode).opponent.shortName : "待定";
  const formSentence =
    record.winRate >= 70
      ? "近况稳定，能把领先盘稳稳收住。"
      : record.winRate >= 55
        ? "账面不虚，关键局处理还得继续盯。"
        : "波动偏大，前中期的节奏控制还得多看一眼。";
  const awardSentence = stageAward ? `${stageAward}已经落袋。` : "";
  const nextSentence = nextMatch ? `下一场已确认对阵 ${opponent}。` : "下一场对阵还没排定。";
  return `${awardSentence}${formSentence}${nextSentence}`;
}

function buildTeamCards(data, teamMap, records, stageAwards, rankingRows) {
  const rankingMap = new Map(rankingRows.map((row) => [row.teamCode, row]));

  return FOCUS_TEAM_IDS.map((teamCode) => {
    const team = teamMap.get(teamCode) || { shortName: teamCode, name: teamCode, logo: "" };
    const record = records[teamCode];
    const nextMatch = record.liveMatch || record.nextKnownMatch || record.nextMatch;
    const latestMatch = record.latestMatch;
    const ranking = rankingMap.get(teamCode);

    const docket = [];
    if (nextMatch) {
      const perspective = getPerspective(nextMatch, teamCode);
      docket.push({
        label: nextMatch.status === "in_progress" ? "此刻对局" : "下一场",
        value: `${teamCode} vs ${perspective.opponent.shortName}`,
        note:
          nextMatch.status === "in_progress"
            ? `${nextMatch.tournamentLabel} ${nextMatch.bo} / 当前比分 ${perspective.scoreFor}:${perspective.scoreAgainst}`
            : `${formatDateLong(nextMatch.matchDate)} / ${nextMatch.tournamentLabel} ${nextMatch.bo}`,
      });
    }
    if (latestMatch) {
      const perspective = getPerspective(latestMatch, teamCode);
      docket.push({
        label: "最近一场",
        value: `${teamCode} ${perspective.scoreFor}:${perspective.scoreAgainst} ${perspective.opponent.shortName}`,
        note: `${latestMatch.tournamentLabel} / ${latestMatch.stageName}${latestMatch.roundName ? ` / ${latestMatch.roundName}` : ""}`,
      });
    }
    docket.push({
      label: "账面",
      value: `${record.wins}-${record.losses}`,
      note: `系列胜率 ${record.winRate}% / 局差 ${signed(record.gameDiff)}`,
    });

    return {
      id: teamCode,
      name: team.name,
      shortName: teamCode,
      logo: team.logo,
      region: REGION_MAP[teamCode] || "LPL",
      stageAward: stageAwards[teamCode] || "",
      rankingLabel: ranking ? `第一赛段第 ${ranking.rank}` : "当前未进榜",
      summary: `${teamCode} 当前系列赛 ${record.wins}-${record.losses}，单局 ${record.gameWins}-${record.gameLosses}，近五场 ${record.recentText}。`,
      statement: buildTeamStatement(teamCode, record, stageAwards[teamCode], nextMatch),
      metrics: buildMetricBars(record),
      docket,
      history: record.completed.slice(0, 4).map((match) => {
        const perspective = getPerspective(match, teamCode);
        return {
          opponent: perspective.opponent.shortName,
          result: `${perspective.scoreFor}:${perspective.scoreAgainst}`,
          outcome: getSeriesResult(match, teamCode),
          note: `${match.tournamentLabel} / ${match.stageName}${match.roundName ? ` / ${match.roundName}` : ""}`,
        };
      }),
      overview: {
        seriesRecord: `${record.wins}-${record.losses}`,
        gameRecord: `${record.gameWins}-${record.gameLosses}`,
        winRate: `${record.winRate}%`,
        streakLabel: record.streakLabel,
      },
    };
  });
}

function buildPlayerCards(records) {
  return FOCUS_PLAYERS.map((player) => {
    const record = records[player.teamCode];
    const nextMatch = record.liveMatch || record.nextKnownMatch || record.nextMatch;
    const latestMatch = record.latestMatch ? getPerspective(record.latestMatch, player.teamCode) : null;
    const track = [
      { label: "角色", value: player.role, note: `${player.teamCode} 当前关注位` },
      {
        label: nextMatch?.status === "in_progress" ? "此刻对局" : "下一场",
        value: nextMatch ? `${player.teamCode} vs ${getPerspective(nextMatch, player.teamCode).opponent.shortName}` : "等待排表",
        note: nextMatch ? `${formatDateLong(nextMatch.matchDate)} / ${nextMatch.tournamentLabel}` : "当前没有已确认对阵",
      },
      {
        label: "最近一场",
        value: latestMatch ? `${latestMatch.scoreFor}:${latestMatch.scoreAgainst}` : "--",
        note: latestMatch ? `对阵 ${latestMatch.opponent.shortName}` : "最近一场暂未写入",
      },
    ];

    return {
      id: player.id,
      name: player.name,
      role: player.role,
      teamCode: player.teamCode,
      portrait: resolvePlayerPortrait(player.id),
      summary: `${player.name} 当前归属 ${player.teamCode}，这里保留角色、赛程和战队近期赛果。`,
      note: player.watch,
      tags: ["角色归属", "战队赛程", "近期赛果"],
      track,
      observation: [
        player.watch,
        latestMatch
          ? `最近一场 ${player.teamCode} ${latestMatch.scoreFor}:${latestMatch.scoreAgainst} ${latestMatch.opponent.shortName}。`
          : "最近一场还没有确认结果。",
        record.nextKnownMatch
          ? `下一场已确认对阵 ${getPerspective(record.nextKnownMatch, player.teamCode).opponent.shortName}。`
          : "下一场对阵还没确认。",
      ],
      history: record.completed.slice(0, 4).map((match) => {
        const perspective = getPerspective(match, player.teamCode);
        return {
          opponent: perspective.opponent.shortName,
          result: `${perspective.scoreFor}:${perspective.scoreAgainst}`,
          note: `${match.tournamentLabel} / ${match.stageName}`,
          outcome: getSeriesResult(match, player.teamCode),
        };
      }),
    };
  });
}

function buildOverview(data, teamMap, rankingRows, players) {
  const liveMatches = sortMatches(
    data.matches.filter(
      (match) =>
        match.status === "in_progress" &&
        isKnownTeam(match.teamA.shortName) &&
        isKnownTeam(match.teamB.shortName),
    ),
    1,
  );

  const upcomingMatches = sortMatches(
    data.matches.filter(
      (match) =>
        match.status === "upcoming" &&
        isKnownTeam(match.teamA.shortName) &&
        isKnownTeam(match.teamB.shortName),
    ),
    1,
  ).slice(0, 5);

  return {
    liveMatches,
    upcomingMatches,
    ranking: rankingRows.slice(0, 8).map((row) => ({
      rank: row.rank,
      teamCode: row.teamCode,
      name: row.name,
      region: row.region,
      seriesRecord: `${row.seriesWins}-${row.seriesLosses}`,
      gameDiff: signed(row.gameDiff),
      recentText: row.recentText,
      logo: teamMap.get(row.teamCode)?.logo || "",
    })),
    spotlight: players[0],
  };
}

function computeConfidence(recordA, recordB, headToHead, restDiffHours, bo) {
  const winRateEdge = recordA.winRate - recordB.winRate;
  const diffEdge = recordA.gameDiff - recordB.gameDiff;
  const recentEdge = recordA.recentWins - recordB.recentWins;
  const h2hEdge = headToHead.edge * 6;
  const restEdge = clamp(restDiffHours / 12, -2, 2) * 2.5;
  const boEdge = bo === "BO5" ? 2 : 0;
  const raw = 55 + winRateEdge * 0.32 + diffEdge * 0.9 + recentEdge * 3.8 + h2hEdge + restEdge + boEdge;
  return clamp(Math.round(raw), 42, 84);
}

function findHeadToHead(data, teamA, teamB) {
  const matches = sortMatches(
    data.matches.filter(
      (match) =>
        match.status === "completed" &&
        ((match.teamA.shortName === teamA && match.teamB.shortName === teamB) ||
          (match.teamA.shortName === teamB && match.teamB.shortName === teamA)),
    ),
    -1,
  );

  const teamAWins = matches.filter((match) => getSeriesResult(match, teamA) === "win").length;
  const teamBWins = matches.filter((match) => getSeriesResult(match, teamB) === "win").length;

  return {
    teamAWins,
    teamBWins,
    edge: teamAWins - teamBWins,
    text: matches.length ? `交手 ${teamA} ${teamAWins}-${teamBWins} ${teamB}` : "当前赛程内无已确认交手",
  };
}

function getRestHours(record, nextMatchDate) {
  const latestMatch = record.latestMatch;
  if (!latestMatch) return 0;
  const diff = parseMatchDate(nextMatchDate) - parseMatchDate(latestMatch.matchDate);
  return Math.max(0, Math.round(diff / 3600000));
}

function buildPredictedScore(match, favoredTeam, confidence) {
  const targetA = match.teamA.shortName;
  const isFavoredA = favoredTeam === targetA;
  if (match.bo === "BO5") {
    if (confidence >= 70) return isFavoredA ? "3:1" : "1:3";
    return isFavoredA ? "3:2" : "2:3";
  }
  if (confidence >= 70) return isFavoredA ? "2:0" : "0:2";
  return isFavoredA ? "2:1" : "1:2";
}

function buildPredictionFactors(match, recordA, recordB, headToHead, restA, restB) {
  return [
    `赛段战绩 ${match.teamA.shortName} ${recordA.wins}-${recordA.losses}，${match.teamB.shortName} ${recordB.wins}-${recordB.losses}`,
    `近五场 ${match.teamA.shortName} ${recordA.recentText}，${match.teamB.shortName} ${recordB.recentText}`,
    `局差 ${match.teamA.shortName} ${signed(recordA.gameDiff)}，${match.teamB.shortName} ${signed(recordB.gameDiff)}`,
    headToHead.text,
    `休整 ${match.teamA.shortName} ${restA}h，${match.teamB.shortName} ${restB}h`,
    `${match.bo} / ${match.tournamentLabel} / ${match.stageName}`,
  ];
}

function fallbackPredictionCopy(item) {
  return {
    headline: `${item.favoredTeam} 略占上风`,
    line: `${item.favoredTeam} 这一侧盘面更顺，先看它把前两局握在手里。`,
    risk: "赛前只看已确认赛程与赛果，临场首发和状态一变，断语也得跟着变。",
  };
}

function buildTeamPredictions(data, records) {
  return FOCUS_TEAM_IDS.map((teamId) => {
    const record = records[teamId];
    const match = record?.nextKnownMatch || null;
    if (!record || !match) {
      return {
        id: `prediction-${teamId}`,
        teamId,
        matchLabel: `${teamId} 下一场待定`,
        stageLabel: "等待官源排表",
        timeLabel: "暂无已确认时间",
        statusText: "待开盘",
        confidence: 50,
        predictedScore: "--",
        verdict: "等待下一场已确认对阵",
        teamA: { code: teamId, logo: "", recordText: record ? `系列 ${record.wins}-${record.losses}` : "待接入" },
        teamB: { code: "待定", logo: "", recordText: "等待排表" },
        favoredTeam: teamId,
        factors: ["当前官源还没有给出下一场已确认对阵。"],
        headline: "等待官源排表",
        line: "赛程未落纸前，不妄开口。",
        risk: "对阵没定，先不写比分。",
      };
    }

    const recordA = records[match.teamA.shortName];
    const recordB = records[match.teamB.shortName];
    const headToHead = findHeadToHead(data, match.teamA.shortName, match.teamB.shortName);
    const restA = getRestHours(recordA, match.matchDate);
    const restB = getRestHours(recordB, match.matchDate);
    const confidenceA = computeConfidence(recordA, recordB, headToHead, restA - restB, match.bo);
    const favoredTeam = confidenceA >= 56 ? match.teamA.shortName : match.teamB.shortName;
    const confidence =
      favoredTeam === match.teamA.shortName
        ? confidenceA
        : clamp(100 - confidenceA, 42, 84);
    const predictedScore = buildPredictedScore(match, favoredTeam, confidence);
    const fallback = fallbackPredictionCopy({ favoredTeam });

    return {
      id: `prediction-${teamId}`,
      teamId,
      matchLabel: `${match.teamA.shortName} vs ${match.teamB.shortName}`,
      stageLabel: `${match.tournamentLabel} / ${match.stageName}`,
      timeLabel: `${formatDateLong(match.matchDate)} / ${match.bo}`,
      statusText: "赛前",
      confidence,
      predictedScore,
      verdict: `${favoredTeam} 稍占上风`,
      favoredTeam,
      teamA: {
        code: match.teamA.shortName,
        logo: match.teamA.logo,
        recordText: `系列 ${recordA.wins}-${recordA.losses} / 局差 ${signed(recordA.gameDiff)}`,
      },
      teamB: {
        code: match.teamB.shortName,
        logo: match.teamB.logo,
        recordText: `系列 ${recordB.wins}-${recordB.losses} / 局差 ${signed(recordB.gameDiff)}`,
      },
      factors: buildPredictionFactors(match, recordA, recordB, headToHead, restA, restB),
      headline: fallback.headline,
      line: fallback.line,
      risk: fallback.risk,
      resources: {
        seriesRecord: [recordA.wins, recordA.losses, recordB.wins, recordB.losses],
        gameDiff: [recordA.gameDiff, recordB.gameDiff],
        recentForm: [recordA.recentText, recordB.recentText],
        headToHead: headToHead.text,
        restHours: [restA, restB],
        bo: match.bo,
      },
    };
  });
}

function sanitizeJsonText(raw) {
  return String(raw || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function sanitizeAiPredictionText(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const hit = AI_COPY_BLOCKLIST.some((blocked) => text.includes(blocked));
  return hit ? fallback : text;
}

async function callGeminiJson(prompt) {
  if (!GEMINI_API_KEY) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.6,
        },
      }),
    },
  );

  if (!response.ok) return null;
  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  try {
    return JSON.parse(sanitizeJsonText(raw));
  } catch {
    return null;
  }
}

async function buildAiPredictionCopy(predictions) {
  const payload = predictions
    .filter((item) => item.predictedScore !== "--")
    .map((item) => ({
      id: item.id,
      match: item.matchLabel,
      stage: item.stageLabel,
      verdict: item.verdict,
      predictedScore: item.predictedScore,
      confidence: item.confidence,
      factors: item.factors,
    }));

  if (!payload.length) return null;

  const prompt = [
    "你在写英雄联盟观赛站的预测卡文案。",
    "风格要求：克制、利落、专业，在结论下方那一句可以稍微神神叨叨一点，让人觉得有气口，但不能像疯话。",
    "每场输出三个字段：headline、line、risk。",
    "headline 控制在 16 个汉字以内。",
    "line 控制在 38 个汉字以内，要像高僧留的一句断语。",
    "risk 控制在 28 个汉字以内。",
    "严禁出现这些词：装懂、写上墙、梭哈、嘴硬、当空气、玄学、神谕、天命、阵卷、观席、禅断。",
    "返回 JSON，格式为 { predictions: { [id]: { headline, line, risk } } }。",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  return callGeminiJson(prompt);
}

function applyAiPredictionCopy(siteData, aiCopy) {
  if (!aiCopy?.predictions) {
    siteData.copy.aiSource = "fallback";
    return siteData;
  }

  for (const item of siteData.predictions.items) {
    const aiPrediction = aiCopy.predictions[item.id];
    if (!aiPrediction) continue;
    item.headline = sanitizeAiPredictionText(aiPrediction.headline, item.headline);
    item.line = sanitizeAiPredictionText(aiPrediction.line, item.line);
    item.risk = sanitizeAiPredictionText(aiPrediction.risk, item.risk);
  }

  siteData.copy.aiSource = GEMINI_MODEL;
  return siteData;
}

async function main() {
  await execFileAsync(process.execPath, [scheduleScript], {
    cwd: projectRoot,
  });

  const data = JSON.parse(await readFile(schedulePath, "utf8"));
  const teamMap = teamNameLookup(data);
  const rankingRows = buildRankingRows(data, teamMap);
  const stageAwards = buildStageAwards(data);
  const records = buildAllTeamRecords(data);
  const teamCards = buildTeamCards(data, teamMap, records, stageAwards, rankingRows);
  const playerCards = buildPlayerCards(records);
  const overview = buildOverview(data, teamMap, rankingRows, playerCards);
  const predictions = buildTeamPredictions(data, records);

  let siteData = {
    generatedAt: data.generatedAt,
    generatedAtLocal: data.generatedAtLocal,
    copy: {
      ...FALLBACK_COPY,
      nav: NAV_LABELS,
      aiSource: "fallback",
    },
    overview,
    teams: {
      defaultTeam: data.focusDefaults?.team || "BLG",
      items: teamCards,
    },
    players: {
      defaultPlayer: String(data.focusDefaults?.player || "Bin").toLowerCase(),
      items: playerCards,
    },
    predictions: {
      items: predictions,
    },
  };

  const aiCopy = await buildAiPredictionCopy(predictions);
  siteData = applyAiPredictionCopy(siteData, aiCopy);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(siteData, null, 2)}\n`, "utf8");
  await writeFile(
    inlineOutputPath,
    `window.__SITE_DATA__ = ${JSON.stringify(siteData, null, 2)};\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        output: outputPath,
        inlineOutput: inlineOutputPath,
        aiSource: siteData.copy.aiSource,
        teamCount: siteData.teams.items.length,
        playerCount: siteData.players.items.length,
        predictionCount: siteData.predictions.items.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
