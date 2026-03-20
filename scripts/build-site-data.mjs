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
  overview: "山门",
  teams: "阵卷",
  players: "观席",
  predictions: "禅断",
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
    watch: "看边线压迫和敢不敢把兵线推深。",
  },
  {
    id: "xun",
    name: "XUN",
    role: "打野",
    teamCode: "BLG",
    watch: "看前十五分钟河道控制和第一波节奏落点。",
  },
  {
    id: "knight",
    name: "Knight",
    role: "中路",
    teamCode: "BLG",
    watch: "看中期第一波接团和法核收束能力。",
  },
  {
    id: "viper",
    name: "Viper",
    role: "下路",
    teamCode: "BLG",
    watch: "看线权处理和中后段收口是不是够稳。",
  },
  {
    id: "on",
    name: "ON",
    role: "辅助",
    teamCode: "BLG",
    watch: "看开团时机和失误率，别只盯高光。",
  },
];

const FALLBACK_COPY = {
  title: "电竞高僧 | 官源观赛与禅断看板",
  description: "电竞高僧，只做英雄联盟。把官源赛程、战队卷宗、主队关注席和禅断预判压进同一块看板里。",
  brandEyebrow: "ESPORTS MONK",
  brandName: "电竞高僧",
  scopePill: "LPL / First Stand / LoL",
  signalText: "官源同步正常",
  hero: {
    eyebrow: "只做英雄联盟",
    title: "把官源赛程、阵卷、观席与禅断，压成一块够稳的看板。",
    body:
      "这站先把事实写干净。赛程、比分、赛段、队伍走势直接上墙；该等待补链的地方老老实实写清楚，不拿花活糊你。",
    tags: ["官源赛程", "战队卷宗", "主队关注席", "禅断预判"],
  },
  sections: {
    overview: {
      liveEyebrow: "此刻对局",
      liveTitle: "正在进行",
      liveTag: "官源实况",
      upcomingEyebrow: "将启赛程",
      upcomingTitle: "接下来",
      upcomingTag: "未来 72 小时",
      rankingEyebrow: "阵势次第",
      rankingTitle: "第一赛段战绩榜",
      rankingTag: "LPL 完赛记录",
      spotlightEyebrow: "主队注目",
      spotlightTitle: "今日看 Bin",
    },
    teams: {
      eyebrow: "阵卷",
      title: "战队卷宗",
      docketTitle: "行程提要",
      historyTitle: "近局摘录",
      heatTitle: "观测尺",
    },
    players: {
      eyebrow: "观席",
      title: "主队关注席",
      trackTitle: "归队与赛历",
      notesTitle: "观赛要点",
      historyTitle: "所在战队近局",
      intro: "当前只接主队关注名录、角色归属与赛历。个人 Rank 和单排对局，下一条链路再补。",
    },
    predictions: {
      eyebrow: "禅断",
      title: "禅断与证据",
      note: "概率、依据、风险拆开写。文案可以有气质，事实不能漂。",
      blueprintTitle: "断法",
      blueprintTag: "构建期生成",
    },
    dataBrief: {
      eyebrow: "数据口径",
      title: "只把能确认的写上墙",
      body:
        "官网当前只接腾讯英雄联盟赛事公开赛程文件，覆盖 LPL 第一赛段与 First Stand。选手个人 Rank、个人对局与 LCK 全链路，暂时没有混进来装懂。",
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
    ? `${stageAward}已经落地。`
    : record.winRate >= 70
      ? "这队近况够硬，账面也好看。"
      : record.winRate >= 55
        ? "走势偏稳，但还没稳到能闭眼。"
        : "起伏还在，前十五分钟尤其要盯。";

  const secondSentence = nextMatch
    ? `下一场对 ${opponent}，看点不会少。`
    : "当前还没有下一场已确认对阵。";

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
      summary: `${teamCode} 当前系列赛 ${record.wins}-${record.losses}，局差 ${signed(record.gameDiff)}。近五场 ${record.recentText}。`,
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
        label: "当前归队",
        value: `${player.teamCode} / ${player.role}`,
        note: "当前只接角色与归队，不假装有个人 Rank。",
      },
      {
        label: trackLabel,
        value: focusMatch
          ? `${player.teamCode} vs ${getPerspective(focusMatch, player.teamCode).opponent.shortName}`
          : "等待官源排表",
        note: focusMatch
          ? `${formatLongDateTime(focusMatch.matchDate)} / ${focusMatch.tournamentLabel} ${focusMatch.bo}`
          : "官方还没给出已确认时点。",
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
      summary: `${player.name} 当前挂在 ${player.teamCode} 关注席，先把归队、赛历和所在战队近况看清。`,
      note: player.watch,
      tags: ["主队关注", "真实赛历", "不装 Rank"],
      track,
      observation: [
        player.watch,
        latest
          ? `最近一场 ${player.teamCode} ${latest.scoreFor}:${latest.scoreAgainst} ${latest.opponent.shortName}。`
          : "最近一场尚未写入。",
        record.nextKnownMatch
          ? `下一场已确认对阵 ${getPerspective(record.nextKnownMatch, player.teamCode).opponent.shortName}。`
          : "下一场还没到已确认对阵。",
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
        ? `BLG 此刻正在打 ${opponent}，官方状态已经切到进行中。`
        : blg.nextKnownMatch
          ? `BLG 下一场已确认对阵 ${opponent}，时点和赛段都能直接上墙。`
          : blg.latestMatch
            ? `BLG 最近一场刚打完 ${opponent}，现在先拿落地赛果说话。`
            : "BLG 当前没有已确认下一场，主页先把最近落地结果摆出来。",
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
      headline: `${item.winner} 已经兑付`,
      line: `${item.winner} 这场把结果写死了，赛果摆在墙上，不用再靠嘴硬。`,
      risk: "已结束对局只做复盘，不再装成赛前判断。",
    };
  }

  if (item.status === "live") {
    return {
      headline: `${item.winner} 盘面更顺`,
      line: `局还在走，但账面和当前比分都偏向 ${item.winner}。`,
      risk: "盘中信息跳得快，这张卡只能提醒方向，不能替代直播。",
    };
  }

  return {
    headline: `${item.winner} 稍占先手`,
    line: `${item.winner} 的账面更厚，赛前可以先往这边看，但别把风险当空气。`,
    risk: "赛前卡只认已确认对阵与落地账面，不拿未落地首发乱编。",
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
        label: "官源",
        value: "腾讯英雄联盟赛事公开赛程文件",
      },
      {
        label: "覆盖",
        value: "LPL 第一赛段 + First Stand",
      },
      {
        label: "刷新",
        value: data.generatedAtLocal,
      },
      {
        label: "LPL 榜首",
        value: rankingRows[0] ? `${rankingRows[0].teamCode} ${rankingRows[0].seriesWins}-${rankingRows[0].seriesLosses}` : "等待刷新",
      },
      {
        label: "未接链路",
        value: "个人 Rank / 个人对局 / LCK 全量",
      },
    ],
  };
}

function buildBlueprint() {
  return {
    steps: [
      "先拉官源赛程与赛果，再整理成站内唯一口径。",
      "阵卷只写账面、近局和下一场，不拿假资料补洞。",
      "禅断先算规则层，再用模型把话说得像人，不让模型接管事实。",
    ],
    schema: {
      winner: "BLG",
      confidence: 64,
      factors: ["系列赛 10-4", "近五场 胜 胜 胜 负 胜", "局差 +14"],
      risk: "赛前卡只认已确认对阵与落地账面。",
      line: "结论能有态度，事实必须有出处。",
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
    "风格要求：克制、清醒、利落，允许轻微禅意，但别装神弄鬼，别写玄学，别写互联网烂梗。",
    "语气要求：像正式上线产品，不像 demo，不像广告腔。",
    "注意：板块名已经固定，不需要你改导航名。",
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
    "5. predictions 每场写 headline、line、risk，各自控制在 28 个汉字以内。",
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

function applyAiCopy(siteData, aiCopy) {
  if (!aiCopy || aiCopy.error) {
    siteData.copy.aiSource = aiCopy?.error ? `fallback:${aiCopy.error}` : "fallback:no-key";
    return siteData;
  }

  for (const team of siteData.teams.items) {
    const aiTeam = aiCopy.teams?.[team.id];
    if (aiTeam?.statement) {
      team.statement = aiTeam.statement;
    }
  }

  for (const player of siteData.players.items) {
    const aiPlayer = aiCopy.players?.[player.id];
    if (aiPlayer?.summary) {
      player.summary = aiPlayer.summary;
    }
    if (aiPlayer?.note) {
      player.note = aiPlayer.note;
      player.observation[0] = aiPlayer.note;
    }
  }

  for (const item of siteData.predictions.items) {
    const aiPrediction = aiCopy.predictions?.[item.id];
    if (aiPrediction?.headline) item.headline = aiPrediction.headline;
    if (aiPrediction?.line) item.line = aiPrediction.line;
    if (aiPrediction?.risk) item.risk = aiPrediction.risk;
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
