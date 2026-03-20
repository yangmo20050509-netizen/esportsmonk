import { execFile } from "node:child_process";
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

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const NAV_LABELS = {
  overview: "首页",
  teams: "战队",
  players: "选手",
  predictions: "预测",
};

const REGION_MAP = {
  AL: "LPL",
  BLG: "LPL",
  EDG: "LPL",
  IG: "LPL",
  JDG: "LPL",
  LGD: "LPL",
  LNG: "LPL",
  NIP: "LPL",
  OMG: "LPL",
  TES: "LPL",
  TT: "LPL",
  UP: "LPL",
  WBG: "LPL",
  WE: "LPL",
  G2: "LEC",
  BFX: "LCP",
  GEN: "LCK",
  LYON: "LLA",
  LOUD: "CBLOL",
  TSW: "PCS",
};

const FOCUS_TEAM_IDS = ["BLG", "JDG", "AL", "WBG", "LNG", "TES"];

const FOCUS_PLAYERS = [
  {
    id: "bin",
    name: "Bin",
    role: "上路",
    teamCode: "BLG",
    watch: "重点观察边线处理与推进深度。",
  },
  {
    id: "xun",
    name: "XUN",
    role: "打野",
    teamCode: "BLG",
    watch: "重点观察前十五分钟资源控制与节奏落点。",
  },
  {
    id: "knight",
    name: "Knight",
    role: "中路",
    teamCode: "BLG",
    watch: "重点观察中期接团与法核收束能力。",
  },
  {
    id: "viper",
    name: "Viper",
    role: "下路",
    teamCode: "BLG",
    watch: "重点观察线权处理与中后段输出稳定性。",
  },
  {
    id: "on",
    name: "ON",
    role: "辅助",
    teamCode: "BLG",
    watch: "重点观察开团时机与保护质量。",
  },
];

const FALLBACK_COPY = {
  title: "电竞高僧 | 英雄联盟观赛站",
  description: "聚合英雄联盟重点赛事的官方赛程、比分、战队信息与比赛预测。",
  brandEyebrow: "ESPORTS MONK",
  brandName: "电竞高僧",
  scopePill: "LPL / First Stand",
  signalText: "更新于",
  hero: {
    eyebrow: "英雄联盟观赛站",
    title: "",
    body: "赛程、比分、战队页和比赛预测集中展示，打开就能看。",
    tags: ["官方赛程", "实时比分", "战队资料", "比赛预测"],
  },
  sections: {
    overview: {
      liveEyebrow: "实时赛况",
      liveTitle: "进行中的比赛",
      liveTag: "官方更新",
      upcomingEyebrow: "未来赛程",
      upcomingTitle: "接下来",
      upcomingTag: "未来 72 小时",
      rankingEyebrow: "战绩概览",
      rankingTitle: "第一赛段排名",
      rankingTag: "LPL 已完赛",
      spotlightEyebrow: "重点选手",
      spotlightTitle: "今日关注",
    },
    teams: {
      eyebrow: "战队",
      title: "战队信息",
      note: "展示已接入战队的赛程、战绩和近期结果。",
      docketTitle: "赛程与结果",
      historyTitle: "最近四场",
      heatTitle: "关键指标",
    },
    players: {
      eyebrow: "选手",
      title: "重点选手",
      trackTitle: "角色与赛程",
      notesTitle: "比赛观察",
      historyTitle: "战队近况",
      intro: "展示主队重点选手的角色、所在战队赛程与近期赛果。",
    },
    predictions: {
      eyebrow: "预测",
      title: "比赛预测",
      note: "预测基于已接入赛程、赛果与战队状态生成，结论与依据分开展示。",
      blueprintTitle: "方法说明",
      blueprintTag: "预测框架",
    },
    dataBrief: {
      eyebrow: "数据说明",
      title: "当前数据范围",
      body: "当前接入 LPL 第一赛段与 First Stand 的官方公开赛程、比分、赛段与战队信息。",
      tag: "已接入范围",
    },
  },
};

function parseMatchDate(value) {
  return new Date(String(value).replace(/-/g, "/"));
}

function sortMatches(matches, direction = 1) {
  return [...matches].sort((left, right) => {
    const delta = parseMatchDate(left.matchDate) - parseMatchDate(right.matchDate);
    return delta * direction;
  });
}

function signed(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isKnownTeam(teamCode) {
  return teamCode && teamCode !== "TBD" && teamCode !== "待定";
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parseMatchDate(value));
}

function formatLongDateTime(value) {
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

function resultLabel(result) {
  if (result === "win") return "胜";
  if (result === "loss") return "负";
  return "平";
}

function renderRecentForm(results) {
  return results.length ? results.map(resultLabel).join(" ") : "暂无";
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
  const lplCompleted = sortMatches(
    data.matches.filter((match) => match.tournamentSlug === "lpl" && match.status === "completed"),
    -1,
  );
  const lplFinal = lplCompleted.find(
    (match) => match.roundName === "决赛" || String(match.stageName).includes("决赛"),
  );

  if (lplFinal) {
    const champion =
      Number(lplFinal.scoreA) > Number(lplFinal.scoreB)
        ? lplFinal.teamA.shortName
        : lplFinal.teamB.shortName;
    const runnerUp = champion === lplFinal.teamA.shortName ? lplFinal.teamB.shortName : lplFinal.teamA.shortName;
    awards[champion] = "LPL 第一赛段冠军";
    awards[runnerUp] = "LPL 第一赛段亚军";
  }

  for (const teamCode of ["AL", "WBG"]) {
    awards[teamCode] ||= "LPL 第一赛段四强";
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
  const completed = sortMatches(
    allMatches.filter((match) => match.status === "completed"),
    -1,
  );
  const liveMatch = allMatches.find((match) => match.status === "in_progress") || null;
  const upcomingMatches = sortMatches(
    allMatches.filter((match) => match.status !== "completed"),
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
  const gameWins = completed.reduce(
    (sum, match) => sum + getPerspective(match, teamCode).scoreFor,
    0,
  );
  const gameLosses = completed.reduce(
    (sum, match) => sum + getPerspective(match, teamCode).scoreAgainst,
    0,
  );
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
    allMatches,
    completed,
    liveMatch,
    nextMatch,
    nextKnownMatch,
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
  const uniqueCodes = new Set();
  for (const match of data.matches) {
    uniqueCodes.add(match.teamA.shortName);
    uniqueCodes.add(match.teamB.shortName);
  }

  return Object.fromEntries(
    [...uniqueCodes].map((teamCode) => [teamCode, buildTeamRecord(data, teamCode)]),
  );
}

function buildMetricBars(record) {
  const stability = clamp(record.winRate, 35, 96);
  const tension = clamp(50 + record.gameDiff * 4, 18, 98);
  const recent = clamp(record.recentWins * 20, 20, 100);
  const continuity = clamp(
    48 + (record.streakType === "win" ? record.streakCount * 10 : -record.streakCount * 8),
    18,
    92,
  );

  return [
    { label: "胜率", value: stability, text: `${record.winRate}%` },
    { label: "局差", value: tension, text: signed(record.gameDiff) },
    { label: "近五", value: recent, text: `${record.recentWins}/5` },
    { label: "走势", value: continuity, text: record.streakLabel },
  ];
}

function fallbackTeamStatement(teamCode, record, stageAward, nextMatch) {
  const opponent = nextMatch ? getPerspective(nextMatch, teamCode).opponent.shortName : "待定";
  const firstSentence = stageAward
    ? `${stageAward}已确认，当前状态以官方赛果为准。`
    : record.winRate >= 70
      ? "近期胜率和局差处在前列，整体状态稳定。"
      : record.winRate >= 55
        ? "近期表现平稳，关键局处理仍需继续观察。"
        : "近期波动较大，前中期节奏仍需观察。";

  const secondSentence = nextMatch
    ? `下一场将对阵 ${opponent}。`
    : "下一场对阵尚未确认。";

  return `${firstSentence}${secondSentence}`;
}

function buildTeamCards(data, teamMap, records, stageAwards, rankingRows) {
  const rankingMap = new Map(rankingRows.map((row) => [row.teamCode, row]));

  return FOCUS_TEAM_IDS.map((teamCode) => {
    const baseTeam = teamMap.get(teamCode) || { shortName: teamCode, name: teamCode, logo: "" };
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
            : `${formatLongDateTime(nextMatch.matchDate)} / ${nextMatch.tournamentLabel} ${nextMatch.bo}`,
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
      name: baseTeam.name,
      shortName: teamCode,
      logo: baseTeam.logo,
      region: REGION_MAP[teamCode] || "LPL",
      stageAward: stageAwards[teamCode] || "",
      rankingLabel: ranking ? `第一赛段第 ${ranking.rank}` : "当前未进榜",
      summary: `${teamCode} 当前系列赛 ${record.wins}-${record.losses}，局差 ${signed(record.gameDiff)}，近五场 ${record.recentText}。`,
      statement: fallbackTeamStatement(teamCode, record, stageAwards[teamCode], nextMatch),
      metrics: buildMetricBars(record),
      docket,
      history: record.completed.slice(0, 4).map((match) => {
        const perspective = getPerspective(match, teamCode);
        const result = getSeriesResult(match, teamCode);
        return {
          opponent: perspective.opponent.shortName,
          result: `${perspective.scoreFor}:${perspective.scoreAgainst}`,
          outcome: result,
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
    const focusMatch = record.liveMatch || record.nextKnownMatch || record.nextMatch || record.latestMatch;
    const latest = record.latestMatch ? getPerspective(record.latestMatch, player.teamCode) : null;
    const trackLabel =
      focusMatch?.status === "in_progress"
        ? "此刻对局"
        : focusMatch?.status === "upcoming"
          ? "下一场"
          : "最近一场";
    const track = [
      {
        label: "当前角色",
        value: `${player.teamCode} / ${player.role}`,
        note: "当前展示角色信息，不展示未接入的个人排位数据。",
      },
      {
        label: trackLabel,
        value: focusMatch
          ? `${player.teamCode} vs ${getPerspective(focusMatch, player.teamCode).opponent.shortName}`
          : "等待官源排表",
        note: focusMatch
          ? `${formatLongDateTime(focusMatch.matchDate)} / ${focusMatch.tournamentLabel} ${focusMatch.bo}`
          : "官方暂未给出已确认对阵。",
      },
      {
        label: "战队账面",
        value: `${record.wins}-${record.losses}`,
        note: `近五场 ${record.recentText} / 局差 ${signed(record.gameDiff)}`,
      },
    ];

    return {
      id: player.id,
      name: player.name,
      role: player.role,
      teamCode: player.teamCode,
      summary: `${player.name} 当前效力于 ${player.teamCode}，页面展示角色信息、所在战队赛程与近期赛果。`,
      note: player.watch,
      tags: ["角色归属", "战队赛程", "近期赛果"],
      track,
      observation: [
        player.watch,
        latest
          ? `最近一场 ${player.teamCode} ${latest.scoreFor}:${latest.scoreAgainst} ${latest.opponent.shortName}。`
          : "最近一场尚未写入。",
        record.nextKnownMatch
          ? `下一场已确认对阵 ${getPerspective(record.nextKnownMatch, player.teamCode).opponent.shortName}。`
          : "下一场对阵尚未确认。",
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

function buildHeroMatch(records, teamMap, stageAwards) {
  const blg = records.BLG;
  const focusMatch = blg.liveMatch || blg.nextKnownMatch || blg.latestMatch || blg.nextMatch;
  const perspective = focusMatch ? getPerspective(focusMatch, "BLG") : null;
  const opponent = perspective ? perspective.opponent.shortName : "待定";
  const opponentRecord = opponent !== "待定" ? records[opponent] : null;

  return {
    league: focusMatch ? `${focusMatch.tournamentLabel} / ${focusMatch.stageName}` : "主队注目",
      headline: focusMatch ? `BLG 对 ${opponent}` : "BLG 等待下一场已确认对阵",
      summary:
        blg.liveMatch
          ? `BLG 当前正在对阵 ${opponent}，页面会随最新赛况更新。`
          : blg.nextKnownMatch
            ? `BLG 下一场将对阵 ${opponent}，开赛时间与赛段信息已确认。`
            : blg.latestMatch
              ? `BLG 与 ${opponent} 的上一场系列赛已经结束，当前展示已确认赛果。`
              : "BLG 下一场对阵暂未确认，当前先展示最近一场正式赛果。",
    left: {
      code: "BLG",
      sub: stageAwards.BLG || `系列赛 ${blg.wins}-${blg.losses}`,
      logo: teamMap.get("BLG")?.logo || "",
    },
    right: {
      code: opponent,
      sub: opponentRecord ? `系列赛 ${opponentRecord.wins}-${opponentRecord.losses}` : "等待官源排表",
      logo: perspective?.opponent.logo || "",
    },
    metrics: [
      {
        label: "主队账面",
        value: `${blg.wins}-${blg.losses}`,
      },
      {
        label: blg.liveMatch ? "当前比分" : "最近结果",
        value: perspective ? `${perspective.scoreFor}:${perspective.scoreAgainst}` : "--",
      },
      {
        label: blg.nextKnownMatch ? "下一场倒计时" : "当前状态",
        value: blg.nextKnownMatch
          ? formatCountdown(blg.nextKnownMatch.matchDate)
          : blg.liveMatch
            ? "进行中"
            : "等待排表",
      },
    ],
    detail: focusMatch
      ? `${formatLongDateTime(focusMatch.matchDate)} / ${focusMatch.bo} / ${focusMatch.roundName || focusMatch.stageName}`
      : "等待下一场已确认对阵",
  };
}

function buildOverview(data, teamMap, records, rankingRows, players) {
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
  );

  return {
    liveMatches,
    upcomingMatches: upcomingMatches.slice(0, 5),
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

function computeConfidence(recordA, recordB, status, scoreDelta = 0) {
  const winRateEdge = recordA.winRate - recordB.winRate;
  const diffEdge = recordA.gameDiff - recordB.gameDiff;
  const recentEdge = recordA.recentWins - recordB.recentWins;
  const liveEdge = status === "in_progress" ? scoreDelta * 9 : 0;
  const raw = 56 + winRateEdge * 0.32 + diffEdge * 0.85 + recentEdge * 4 + liveEdge;
  return clamp(Math.round(raw), 42, 84);
}

function buildPredictionCandidates(data, records) {
  const liveKnown = sortMatches(
    data.matches.filter(
      (match) =>
        match.status === "in_progress" &&
        isKnownTeam(match.teamA.shortName) &&
        isKnownTeam(match.teamB.shortName),
    ),
    1,
  )[0];

  const nextKnown = sortMatches(
    data.matches.filter(
      (match) =>
        match.status === "upcoming" &&
        isKnownTeam(match.teamA.shortName) &&
        isKnownTeam(match.teamB.shortName),
    ),
    1,
  ).slice(0, 2);

  const recentResolved = sortMatches(
    data.matches.filter(
      (match) =>
        match.status === "completed" &&
        (match.teamA.shortName === "BLG" || match.teamB.shortName === "BLG"),
    ),
    -1,
  )[0];

  const ordered = [liveKnown, ...nextKnown, recentResolved].filter(Boolean);
  const seen = new Set();
  return ordered.filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

function fallbackPredictionCopy(item) {
  if (item.status === "resolved") {
    return {
      headline: `${item.winner} 已兑现赛果`,
      line: `${item.winner} 赢下了这场系列赛，当前展示复盘结果。`,
      risk: "已结束比赛只展示结果，不再给出赛前判断。",
    };
  }

  if (item.status === "live") {
    return {
      headline: `${item.winner} 当前更占优`,
      line: `当前比分和既有战绩都更偏向 ${item.winner}。`,
      risk: "比赛仍在进行，结论会随实时比分变化。",
    };
  }

  return {
    headline: `${item.winner} 赛前占优`,
    line: `${item.winner} 的近期战绩和局差更好，赛前判断略占上风。`,
    risk: "赛前结论只基于已确认对阵与已接入数据。",
  };
}

function buildPredictions(data, records) {
  return buildPredictionCandidates(data, records).map((match) => {
    const recordA = records[match.teamA.shortName] || buildTeamRecord(data, match.teamA.shortName);
    const recordB = records[match.teamB.shortName] || buildTeamRecord(data, match.teamB.shortName);
    const liveDelta = Number(match.scoreA) - Number(match.scoreB);
    const confidenceA = computeConfidence(recordA, recordB, match.status, liveDelta);
    const favoredTeam =
      match.status === "completed"
        ? Number(match.scoreA) > Number(match.scoreB)
          ? match.teamA.shortName
          : match.teamB.shortName
        : confidenceA >= 56
          ? match.teamA.shortName
          : match.teamB.shortName;
    const confidence =
      favoredTeam === match.teamA.shortName
        ? confidenceA
        : clamp(100 - confidenceA, 42, 84);
    const upset = clamp(100 - confidence + 12, 16, 48);
    const winnerRecord = favoredTeam === match.teamA.shortName ? recordA : recordB;
    const loserRecord = favoredTeam === match.teamA.shortName ? recordB : recordA;
    const fallback = fallbackPredictionCopy({
      status:
        match.status === "completed"
          ? "resolved"
          : match.status === "in_progress"
            ? "live"
            : "upcoming",
      winner: favoredTeam,
    });

    return {
      id: match.id,
      matchLabel: `${match.teamA.shortName} vs ${match.teamB.shortName}`,
      stageLabel: `${match.tournamentLabel} / ${match.stageName}`,
      timeLabel: formatLongDateTime(match.matchDate),
      status:
        match.status === "completed"
          ? "resolved"
          : match.status === "in_progress"
            ? "live"
            : "upcoming",
      statusText:
        match.status === "completed"
          ? "已兑现"
          : match.status === "in_progress"
            ? "盘中"
            : "赛前",
      winner: favoredTeam,
      confidence,
      upset,
      factors: [
        `${favoredTeam} 系列赛 ${winnerRecord.wins}-${winnerRecord.losses}`,
        `近五场 ${winnerRecord.recentText}`,
        `局差 ${signed(winnerRecord.gameDiff)} 对 ${signed(loserRecord.gameDiff)}`,
      ],
      fallback,
      teamA: {
        code: match.teamA.shortName,
        logo: match.teamA.logo,
        score: Number(match.scoreA),
      },
      teamB: {
        code: match.teamB.shortName,
        logo: match.teamB.logo,
        score: Number(match.scoreB),
      },
      actualScore: `${match.scoreA}:${match.scoreB}`,
    };
  });
}

function buildDataBrief(data, rankingRows) {
  return {
    items: [
      {
        label: "数据来源",
        value: "腾讯英雄联盟赛事公开赛程",
      },
      {
        label: "赛事覆盖",
        value: "LPL 第一赛段 + First Stand",
      },
      {
        label: "最近更新",
        value: data.generatedAtLocal,
      },
      {
        label: "当前榜首",
        value: rankingRows[0] ? `${rankingRows[0].teamCode} ${rankingRows[0].seriesWins}-${rankingRows[0].seriesLosses}` : "等待刷新",
      },
      {
        label: "当前未展示",
        value: "LCK 与选手个人排位数据",
      },
    ],
  };
}

function buildBlueprint() {
  return {
    steps: [
      "统一接入已确认的赛程、赛果与阶段信息。",
      "战队页聚合近期赛果、下一场与核心战绩指标。",
      "比赛预测基于规则层结论生成，展示依据、结论与风险。",
    ],
    schema: {
      winner: "BLG",
      confidence: 64,
      factors: ["系列赛 10-4", "近五场 胜 胜 胜 负 胜", "局差 +14"],
      risk: "结论会随最新赛程与状态变化。",
      line: "结论与依据同步展示。",
    },
  };
}

function buildAiContext(heroMatch, teamCards, playerCards, predictions, data) {
  return {
    heroMatch: {
      headline: heroMatch.headline,
      summary: heroMatch.summary,
      detail: heroMatch.detail,
    },
    teams: teamCards.map((team) => ({
      id: team.id,
      name: team.shortName,
      stageAward: team.stageAward,
      record: team.overview.seriesRecord,
      gameRecord: team.overview.gameRecord,
      streak: team.overview.streakLabel,
      next: team.docket[0]?.value || "暂无已确认下一场",
    })),
    players: playerCards.map((player) => ({
      id: player.id,
      name: player.name,
      role: player.role,
      track: player.track[1]?.value || "暂无已确认下一场",
      watch: player.note,
    })),
    predictions: predictions.map((item) => ({
      id: item.id,
      match: item.matchLabel,
      status: item.statusText,
      favored: item.winner,
      confidence: item.confidence,
      factors: item.factors,
    })),
    generatedAt: data.generatedAtLocal,
  };
}

function sanitizeJsonText(raw) {
  return String(raw || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function callGeminiJson(prompt) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.75,
    },
  });

  const curlBinary = process.platform === "win32" ? "curl.exe" : "curl";
  const { stdout } = await execFileAsync(
    curlBinary,
    [
      "-sS",
      "--connect-timeout",
      "25",
      "--max-time",
      "120",
      "-H",
      `x-goog-api-key: ${GEMINI_API_KEY}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      body,
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    ],
    {
      maxBuffer: 1024 * 1024 * 8,
    },
  );

  const payload = JSON.parse(stdout);
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return JSON.parse(sanitizeJsonText(text));
}

async function buildAiCopy(heroMatch, teamCards, playerCards, predictions, data) {
  const context = buildAiContext(heroMatch, teamCards, playerCards, predictions, data);
  const prompt = [
    "你在给一个英雄联盟观赛产品官网写中文正式版文案。",
    "风格要求：克制、清醒、利落，允许轻微禅意，但不能玄，不能像体育媒体标题党。",
    "语气要求：像正式上线产品，不像 demo，不像广告腔，不像解说稿。",
    "注意：板块名已经固定，不需要你改导航名。",
    "禁止词：奇招、反弹、写死、嘴硬、气势、翻盘、压制、悬念、神仙、天命、梭哈。",
    "句子必须直接陈述，不要比喻，不要反问，不要夸张。",
    "只返回 JSON，不要代码块，不要解释。",
    "JSON schema:",
    JSON.stringify(
      {
        hero: { title: "", body: "" },
        teams: { BLG: { statement: "" } },
        players: { bin: { summary: "", note: "" } },
        predictions: { "match-id": { headline: "", line: "", risk: "" } },
        dataBrief: { body: "" },
      },
      null,
      2,
    ),
    "上下文：",
    JSON.stringify(context, null, 2),
    "要求补充：",
    "1. hero.title 控制在 26 个汉字以内。",
    "2. hero.body 控制在 70 个汉字以内。",
    "3. teams 每队只写一句 statement。",
    "4. players 每人写一条 summary 和一条 note，必须贴合角色与当前已接通的数据边界。",
    "5. predictions 每场写 headline、line、risk，各自控制在 28 个汉字以内，必须直接写判断和依据。",
    "6. dataBrief.body 控制在 80 个汉字以内。",
  ].join("\n");

  try {
    return await callGeminiJson(prompt);
  } catch (error) {
    return {
      error: error.message,
    };
  }
}

const AI_COPY_BLOCKLIST = [
  /奇招/u,
  /触底反弹/u,
  /写死/u,
  /嘴硬/u,
  /气势/u,
  /翻盘/u,
  /压制/u,
  /悬念/u,
  /神仙/u,
  /天命/u,
  /梭哈/u,
  /豪赌/u,
  /剧本/u,
  /血脉/u,
];

function sanitizeAiPredictionText(value, fallback) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return fallback;
  }

  if (AI_COPY_BLOCKLIST.some((pattern) => pattern.test(text))) {
    return fallback;
  }

  return text;
}

function applyAiCopy(siteData, aiCopy) {
  if (!aiCopy || aiCopy.error) {
    siteData.copy.aiSource = aiCopy?.error ? `fallback:${aiCopy.error}` : "fallback:no-key";
    return siteData;
  }

  for (const item of siteData.predictions.items) {
    const aiPrediction = aiCopy.predictions?.[item.id];
    item.headline = sanitizeAiPredictionText(aiPrediction?.headline, item.headline);
    item.line = sanitizeAiPredictionText(aiPrediction?.line, item.line);
    item.risk = sanitizeAiPredictionText(aiPrediction?.risk, item.risk);
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
  const heroMatch = buildHeroMatch(records, teamMap, stageAwards);
  const predictions = buildPredictions(data, records);
  const overview = buildOverview(data, teamMap, records, rankingRows, playerCards);
  const dataBrief = buildDataBrief(data, rankingRows);
  const blueprint = buildBlueprint();

  let siteData = {
    generatedAt: data.generatedAt,
    generatedAtLocal: data.generatedAtLocal,
    copy: {
      ...FALLBACK_COPY,
      nav: NAV_LABELS,
      sections: {
        ...FALLBACK_COPY.sections,
      },
      hero: {
        ...FALLBACK_COPY.hero,
      },
      aiSource: "fallback",
    },
    heroMatch,
    overview,
    teams: {
      defaultTeam: "BLG",
      items: teamCards,
    },
    players: {
      defaultPlayer: "bin",
      items: playerCards,
    },
    predictions: {
      items: predictions.map((item) => ({
        ...item,
        headline: item.fallback.headline,
        line: item.fallback.line,
        risk: item.fallback.risk,
      })),
      blueprint,
    },
    dataBrief,
  };

  const aiCopy = await buildAiCopy(heroMatch, teamCards, playerCards, predictions, data);
  siteData = applyAiCopy(siteData, aiCopy);

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
