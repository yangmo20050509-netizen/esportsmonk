import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultProjectRoot = path.resolve(__dirname, "..");

function resolveSchedulePaths(options = {}) {
  const projectRoot = options.projectRoot || defaultProjectRoot;
  const appRoot = options.appRoot || path.join(projectRoot, "app");
  return {
    projectRoot,
    appRoot,
    outputPath: options.outputPath || path.join(appRoot, "data", "tencent-schedule.json"),
  };
}

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

const TEAM_FOCUS_MAP = {
  Bin: "BLG",
  XUN: "BLG",
  Knight: "BLG",
  Yxl: "BLG",
  Viper: "BLG",
  ON: "BLG",
  Wenbo: "BLG",
};

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败 ${response.status} ${url}`);
  }

  return response.text();
}

function parseAssignedJson(raw, variableName) {
  const prefix = `var ${variableName}=`;
  if (!raw.startsWith(prefix)) {
    throw new Error(`未找到变量 ${variableName}`);
  }

  return JSON.parse(raw.slice(prefix.length).replace(/;$/, ""));
}

function parseLooseJson(raw) {
  return JSON.parse(raw.trim().replace(/;$/, ""));
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

function pickCurrentGame(sGameList, now) {
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - 30);

  return [...(sGameList || [])]
    .filter((item) => {
      const endDate = parseDate(item.eDate);
      return Number.isFinite(endDate.valueOf()) && endDate >= threshold;
    })
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
  const candidate = parts[parts.length - 1];
  return candidate.replace(/[^\w\u4e00-\u9fa5-]/g, "") || name;
}

function resolveTeam(match, side, teamList) {
  const sideKey = side === "A" ? "TeamA" : "TeamB";
  const shortKey = side === "A" ? "TeamShortNameA" : "TeamShortNameB";
  const [matchLeft, matchRight] = splitMatchName(match.bMatchName);
  const fallbackName = side === "A" ? matchLeft : matchRight;
  const teamId = String(match[sideKey] || "");
  const team = teamList[teamId] || {};
  const shortName =
    match[shortKey] ||
    team.TeamShortName ||
    fallbackShortName(fallbackName) ||
    fallbackShortName(team.TeamName);
  const fullName = team.TeamName || fallbackName || shortName || "待定";

  return {
    id: teamId,
    name: fullName,
    shortName,
    logo: ensureHttps(team.TeamLogo),
  };
}

function normalizeStatus(statusValue) {
  const status = Number(statusValue);
  if (status === 1) return { key: "upcoming", text: "未开始" };
  if (status === 3) return { key: "completed", text: "已结束" };
  return { key: "in_progress", text: "进行中/待确认" };
}

function normalizeMatch(match, teamList, tournamentMeta) {
  const teamA = resolveTeam(match, "A", teamList);
  const teamB = resolveTeam(match, "B", teamList);
  const status = normalizeStatus(match.MatchStatus);
  const scoreA = Number(match.ScoreA || 0);
  const scoreB = Number(match.ScoreB || 0);

  return {
    id: String(match.bMatchId),
    bigGameId: String(match.bGameId),
    gameId: String(match.GameId),
    tournamentSlug: tournamentMeta.slug,
    tournamentLabel: tournamentMeta.label,
    tournamentName: tournamentMeta.currentGame.GameName,
    stageName: match.GameTypeName || "阶段待确认",
    roundName: match.GameProcName || "",
    bo: match.GameModeName || `BO${match.GameMode || "?"}`,
    venue: match.GamePlaceName || "",
    matchDate: match.MatchDate,
    status: status.key,
    statusText: status.text,
    scoreA,
    scoreB,
    teamA,
    teamB,
    sourceUrl: URLS.matchFile(match.GameId),
  };
}

function collectTeams(matches) {
  const seen = new Map();
  for (const match of matches) {
    for (const team of [match.teamA, match.teamB]) {
      if (!team?.shortName || seen.has(team.shortName)) continue;
      seen.set(team.shortName, {
        shortName: team.shortName,
        name: team.name,
        logo: team.logo,
      });
    }
  }

  return [...seen.values()].sort((left, right) => left.shortName.localeCompare(right.shortName));
}

export async function buildScheduleData(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const persist = options.persist !== false;
  const paths = resolveSchedulePaths(options);
  const [teamListRaw, gameListRaw] = await Promise.all([
    fetchText(URLS.teamList),
    fetchText(URLS.gameList),
  ]);

  const teamList = parseAssignedJson(teamListRaw, "TeamList");
  const gameList = parseAssignedJson(gameListRaw, "GameList");

  const tournaments = TOURNAMENTS.map((item) => {
    const currentGame = pickCurrentGame(gameList.msg.sGameList[item.bigGameId], now);
    if (!currentGame) {
      throw new Error(`未找到 ${item.label} 的当前赛季`);
    }

    return {
      ...item,
      currentGame,
      sourceUrl: URLS.matchFile(currentGame.GameId),
    };
  });

  const matchPayloads = await Promise.all(
    tournaments.map(async (tournament) => ({
      tournament,
      payload: parseLooseJson(await fetchText(URLS.matchFile(tournament.currentGame.GameId))),
    })),
  );

  const matches = matchPayloads
    .flatMap(({ tournament, payload }) => {
      if (String(payload.status) !== "0" || !Array.isArray(payload.msg)) {
        return [];
      }

      return payload.msg.map((match) => normalizeMatch(match, teamList.msg, tournament));
    })
    .sort((left, right) => parseDate(left.matchDate) - parseDate(right.matchDate));

  const output = {
    generatedAt: now.toISOString(),
    generatedAtLocal: now.toLocaleString("zh-CN", { hour12: false }),
    focusDefaults: {
      team: "BLG",
      player: "Bin",
      playerTeamMap: TEAM_FOCUS_MAP,
    },
    sources: {
      teamList: URLS.teamList,
      gameList: URLS.gameList,
      tournaments: tournaments.map((item) => ({
        slug: item.slug,
        label: item.label,
        bigGameId: item.bigGameId,
        gameId: item.currentGame.GameId,
        gameName: item.currentGame.GameName,
        startDate: item.currentGame.sDate,
        endDate: item.currentGame.eDate,
        sourceUrl: item.sourceUrl,
      })),
    },
    tournaments: tournaments.map((item) => ({
      slug: item.slug,
      label: item.label,
      bigGameId: item.bigGameId,
      gameId: item.currentGame.GameId,
      gameName: item.currentGame.GameName,
      startDate: item.currentGame.sDate,
      endDate: item.currentGame.eDate,
    })),
    teams: collectTeams(matches),
    matches,
  };

  if (persist) {
    await mkdir(path.dirname(paths.outputPath), { recursive: true });
    await writeFile(paths.outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  }

  return output;
}

async function main() {
  const paths = resolveSchedulePaths();
  const output = await buildScheduleData(paths);
  console.log(
    JSON.stringify(
      {
        ok: true,
        output: paths.outputPath,
        tournamentCount: output.tournaments.length,
        matchCount: output.matches.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
