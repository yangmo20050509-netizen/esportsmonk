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

const TEAM_STYLE_GUIDE = {
  BLG: {
    identity: "上中野肯先落子，盘面一旦抢到前手，常把河道、边线与团前站位一并压出来",
    strengths: ["前中期争先意愿强", "资源逼抢凶", "一旦拿到主动便很会把局面压窄"],
    flaw: "热起来时脚步会压得过深，纪律偶尔松一口，给人反咬的缝",
    risk: "若前中期连续失手，后段容易把本该稳住的局面再打成对冲",
    monk: "老衲看 BLG，像一柄先出鞘的快刀，见口就劈，见缝就进。它最可怕之处不在一波团有多响，而在前两手若叫它先写，后面半盘都得顺着它的气走。",
  },
  JDG: {
    identity: "节奏不急，转线和团战次序更讲章法，常在中后段把局面慢慢拧回来",
    strengths: ["中后段运营沉着", "正面团战层次清楚", "逆风时不轻易散架"],
    flaw: "前段若让出主动，整队会先替自己补课，刀就出得慢半拍",
    risk: "若前十五分钟连续掉资源，后段再稳也要先补窟窿",
    monk: "老衲看 JDG，像把老尺，不轻易失手，量出来的东西也整齐。可这把尺终究是后手器物，前账若欠得太厚，后面再稳也得先花时辰补漏。",
  },
  AL: {
    identity: "起手硬，碰撞多，肯把比赛拉进高频交锋的路数里",
    strengths: ["开局碰撞频繁", "先锋和转线欲望强", "状态上来时连段很猛"],
    flaw: "章法有时收不住，一旦前两脚踢空，队形会散得比别人快",
    risk: "一旦前几波出手失准，回身补线和资源时容易露空门",
    monk: "老衲看 AL，像寺里铜钟，撞得准时，满院都响；撞得偏时，回音先打在自己身上。它吃的是气势，赔的也是气势。",
  },
  WBG: {
    identity: "能拉长局面找第二落点，胜负常在中段之后才见分晓",
    strengths: ["中段再布置能力强", "关键团敢找角度", "拖长局面后仍有翻盘口"],
    flaw: "前盘若连着亏线，纪律会先塌一角，后面的腾挪就成了补漏",
    risk: "若线上连着失血，后续想腾挪就会被兵线和视野一起锁住",
    monk: "老衲看 WBG，不怕棋长，只怕欠账。账薄时，它后手能开花；账厚时，再巧的腾挪也只是补墙，不是真翻盘。",
  },
  LNG: {
    identity: "更重中枢控场，节拍不花，资源取舍偏稳",
    strengths: ["中野联动稳", "资源判断克制", "团前站位讲秩序"],
    flaw: "对面若连着强提节拍，它会先求稳，刀就容易晚一拍",
    risk: "若被对面强行提速，舒展不开时会显得有些慢",
    monk: "老衲看 LNG，像守经之人，规矩齐，脚步稳。可经文背得再熟，也怕人逼着翻页，一急便少了那口从容。",
  },
  TES: {
    identity: "一旦手热，正面冲阵极凶，能把比赛硬生生抬进高压区",
    strengths: ["正面火力高", "敢接高风险团", "气势上来时连推带打"],
    flaw: "一旦前后排脱节，纪律会先散，整波团常在同一口气里一起塌",
    risk: "若前排和后手脱节，整队会在一波团里同时露口子",
    monk: "老衲看 TES，赢时像急雷，响得人耳鸣；雷若劈偏，反震也是一整串。它的气势来得最猛，散得也最吓人。",
  },
};

const PLAYER_STYLE_GUIDE = {
  bin: "Bin 这一路值钱，不在补刀板，不在镜头声量，在他敢不敢把边线压成刀背，再逼人回头守塔。他若打得兴起，站位会伸得极前，这一下既能撕口，也最容易叫人抓住反手。",
  xun: "XUN 的贵处在第一口气。河道先踩住，先锋先碰到，整队的章法就会顺；若前两趟起手落空，他也会被逼着替全队补账，刀就慢半拍。",
  knight: "Knight 看似不吵，真值钱的是把线权、支援和团前脚步拆得极细。可他一旦被迫连续补线，整局中枢就会沉一层，队里那口快气也跟着矮下去。",
  viper: "Viper 真正见功夫的地方在收束。团里只要给他留出半步，他就能把伤害一笔一笔算清；可若前排先塌，他再稳也得先还身位的债。",
  on: "ON 要看的不是热闹，是先手那一下准不准，回身那一下稳不稳。先手若正，整队能一口压上去；回身若慢，后排便要替他吃整段苦头。",
};

const FOCUS_PLAYERS = [
  { id: "bin", name: "Bin", role: "上路", teamCode: "BLG", watch: PLAYER_STYLE_GUIDE.bin },
  { id: "xun", name: "XUN", role: "打野", teamCode: "BLG", watch: PLAYER_STYLE_GUIDE.xun },
  { id: "knight", name: "Knight", role: "中路", teamCode: "BLG", watch: PLAYER_STYLE_GUIDE.knight },
  { id: "viper", name: "Viper", role: "下路", teamCode: "BLG", watch: PLAYER_STYLE_GUIDE.viper },
  { id: "on", name: "ON", role: "辅助", teamCode: "BLG", watch: PLAYER_STYLE_GUIDE.on },
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
  "把领先盘稳稳收住",
  "敢不敢把兵线推深",
  "盘面更顺",
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
  const guide = TEAM_STYLE_GUIDE[teamCode];
  const opponent = nextMatch ? getPerspective(nextMatch, teamCode).opponent.shortName : "待定";
  const formSentence =
    record.winRate >= 70
      ? "这阵子账面厚，前十五分钟若叫它先得手，后面多半是它执笔。"
      : record.winRate >= 55
        ? "账面站得住，可第三波转折里常要再验一次心性，稍一松手便会露缝。"
        : "走势还浮，前十五分钟若拿不到主动，后段就容易被人牵着鼻子走。";
  const awardSentence = stageAward ? `${stageAward}在手。` : "";
  const identitySentence = guide?.monk || (guide ? `${guide.identity}。` : "");
  const flawSentence = guide?.flaw ? `可老衲也不替它遮丑，${guide.flaw}。` : "";
  const riskText = guide?.risk ? String(guide.risk).replace(/^若/, "") : "";
  const riskSentence = riskText ? `真要出岔子，多半也是${riskText}。` : "";
  const nextSentence = nextMatch ? `下一场已确认对阵 ${opponent}。` : "下一场对阵还没排定。";
  return `${awardSentence}${identitySentence}${formSentence}${flawSentence}${riskSentence}${nextSentence}`;
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
      summary: `${teamCode} 当前系列赛 ${record.wins}-${record.losses}，单局 ${record.gameWins}-${record.gameLosses}，近五场 ${record.recentText}。${TEAM_STYLE_GUIDE[teamCode]?.strengths?.[0] ? ` 这队眼下最值钱的一层，是 ${TEAM_STYLE_GUIDE[teamCode].strengths[0]}。` : ""}`,
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
      summary: `${player.name} 当前归属 ${player.teamCode}，这里看角色、赛程与战队近况，也看他这一路到底把力气使在什么地方。`,
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
  const styleA = TEAM_STYLE_GUIDE[match.teamA.shortName];
  const styleB = TEAM_STYLE_GUIDE[match.teamB.shortName];
  const focusNotes = FOCUS_PLAYERS.filter(
    (player) => player.teamCode === match.teamA.shortName || player.teamCode === match.teamB.shortName,
  )
    .slice(0, 2)
    .map((player) => ({
      label: `刀口 / ${player.name}`,
      value: player.watch,
    }));
  return [
    {
      label: "账面",
      value: `${match.teamA.shortName} ${recordA.wins}-${recordA.losses}，${match.teamB.shortName} ${recordB.wins}-${recordB.losses}`,
    },
    {
      label: "近势",
      value: `${match.teamA.shortName} ${recordA.recentText}，${match.teamB.shortName} ${recordB.recentText}`,
    },
    {
      label: "局口",
      value: `${match.teamA.shortName} ${signed(recordA.gameDiff)}，${match.teamB.shortName} ${signed(recordB.gameDiff)}`,
    },
    {
      label: "旧账",
      value: headToHead.text,
    },
    {
      label: "歇脚",
      value: `${match.teamA.shortName} ${restA}h，${match.teamB.shortName} ${restB}h`,
    },
    styleA && styleB
      ? {
          label: "门风",
          value: `${match.teamA.shortName} ${styleA.strengths[0]}，${match.teamB.shortName} ${styleB.strengths[0]}`,
        }
      : null,
    ...focusNotes,
    {
      label: "局制",
      value: `${match.bo} / ${match.tournamentLabel} / ${match.stageName}`,
    },
  ].filter(Boolean);
}

function buildPredictionKnowledge(match) {
  const teamAGuide = TEAM_STYLE_GUIDE[match.teamA.shortName];
  const teamBGuide = TEAM_STYLE_GUIDE[match.teamB.shortName];
  const focusPlayers = FOCUS_PLAYERS.filter(
    (player) => player.teamCode === match.teamA.shortName || player.teamCode === match.teamB.shortName,
  ).map((player) => `${player.name}：${player.watch}`);
  return {
    teamA: teamAGuide
      ? `${match.teamA.shortName}：${teamAGuide.identity}；长处是${teamAGuide.strengths.join("、")}；隐忧是${teamAGuide.risk}`
      : `${match.teamA.shortName}：当前没有补充风格注释。`,
    teamB: teamBGuide
      ? `${match.teamB.shortName}：${teamBGuide.identity}；长处是${teamBGuide.strengths.join("、")}；隐忧是${teamBGuide.risk}`
      : `${match.teamB.shortName}：当前没有补充风格注释。`,
    focusPlayers: focusPlayers.length ? focusPlayers.join("；") : "当前没有接入该场重点选手的手法注释。",
  };
}

function fallbackPredictionCopy(item) {
  const favoredGuide = TEAM_STYLE_GUIDE[item.favoredTeam];
  const underdogGuide = TEAM_STYLE_GUIDE[item.underdogTeam];
  const favoredIdentity = favoredGuide?.identity || `${item.favoredTeam} 更能先把地图重心提起来`;
  const favoredStrength = favoredGuide?.strengths?.[0] || "前段更愿意争先";
  const favoredFlaw = favoredGuide?.flaw || `${item.favoredTeam} 一热起来，脚步就容易压过头`;
  const underdogIdentity = underdogGuide?.identity || `${item.underdogTeam} 更偏后手应对`;
  const underdogRisk = underdogGuide?.risk || `${item.underdogTeam} 若迟迟拿不到主动，后手会越来越重`;
  return {
    headline: `老衲先押 ${item.favoredTeam}`,
    line: `老衲看此局，先不看热闹，只看谁先写棋盘。${item.favoredTeam} 胜在${favoredStrength}，且${favoredIdentity}；前两波资源若先归它手里，河道、边线与团前站位多半都要顺着它的气往下走，这口势一旦成形，后面的收束通常不难看。\n\n可它也不是无病之身，${favoredFlaw}。这种队最怕赢得太顺，手一热，脚步便会伸得过深，原本该稳住的地方反倒成了漏洞。真打到转折处，看的不是谁更响，而是谁先把自己那一下收住。\n\n${item.underdogTeam} 这一边原是${underdogIdentity}。它若想翻案，得先把前十五分钟拖成慢账，再把${item.favoredTeam}逼进补线、回防和二次落位的苦差里；若反被${item.favoredTeam}连着抢住前手，胜负多半不会拖到后段才分晓。`,
    risk: `但 ${item.underdogTeam} 若真把比赛拖进久持之局，${underdogRisk}，老衲这句也得改口。`,
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
    const fallback = fallbackPredictionCopy({
      favoredTeam,
      underdogTeam: favoredTeam === match.teamA.shortName ? match.teamB.shortName : match.teamA.shortName,
    });
    const knowledge = buildPredictionKnowledge(match);

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
      knowledge,
      resources: {
        seriesRecord: [recordA.wins, recordA.losses, recordB.wins, recordB.losses],
        gameDiff: [recordA.gameDiff, recordB.gameDiff],
        recentForm: [recordA.recentText, recordB.recentText],
        headToHead: headToHead.text,
        restHours: [restA, restB],
        bo: match.bo,
        style: knowledge,
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
  if (text.length < Math.min(60, fallback.length * 0.45)) return fallback;
  return hit ? fallback : text;
}

async function callGeminiJson(prompt) {
  if (!GEMINI_API_KEY) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.72,
          },
        }),
      },
    );

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
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
      knowledge: item.knowledge,
    }));

  if (!payload.length) return null;

  const prompt = [
    "你在写英雄联盟观赛站“高僧预测”的断局文案。",
    "说话口吻要像看过万局的老僧批注，可以直接用“老衲看”“依老衲看”“此局贵在”“病也在此”这类说法，文字要有古意、有锋芒，但必须让懂比赛的人一眼看懂。",
    "别用翻译腔，别说盘口黑话，别拿空词硬装，更别写成神棍。要像在卷边批一段狠注，不像写公告。",
    "每场输出三个字段：headline、line、risk。",
    "headline 控制在 8 到 16 个汉字，要像判词。",
    "line 控制在 260 到 420 个汉字，分成三个自然段。第一段写看好谁、凭什么；第二段写这边的毛病、最可能露缝的地方；第三段写另一边怎么翻盘，怎么把局拖回自己的路数。",
    "risk 控制在 24 到 48 个汉字，只点最可能打脸的一处变数。",
    "line 要落到节奏、资源、团战次序、边线、收束能力、纪律性、失误点这些真东西上。至少明确写出一处长板、一处毛病、一条翻案路径。",
    "行文可以拽，可以像文言批注，但不能晦涩。能写“老衲看”“此局贵在”“病也在此”“若要翻案”，不能写得像外国人硬学中文。",
    "禁止出现这些空话：‘先看他把前两局握在手里’、‘敢不敢把兵线推深’、‘盘面更顺’、‘稳稳收住’、‘看临场发挥’、‘一切皆有可能’。",
    "严禁出现这些词：装懂、写上墙、梭哈、嘴硬、当空气、玄学、神谕、天命、阵卷、观席、禅断、盘口、收米、赔率。",
    "不要出现用户、本站、官网、模型、AI、数据源这些词。",
    "把 knowledge 里的队伍门风、选手手法、短板和因子列表揉进断语里，不要原样复述列表。至少明确写出一处长板和一处毛病。",
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
