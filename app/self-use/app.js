const STORAGE_KEY = "esports-monk-self-use";

const state = {
  data: null,
  filter: "focus",
  team: "BLG",
  player: "Bin",
  eventsBound: false,
};

const $ = (selector) => document.querySelector(selector);

function readUrlPreferences(defaults) {
  const params = new URLSearchParams(window.location.search);
  const team = params.get("team")?.trim();
  const player = params.get("player")?.trim();

  return {
    team: team || defaults.team,
    player: player || defaults.player,
  };
}

function loadPreferences(defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      team: saved.team || defaults.team,
      player: saved.player || defaults.player,
    };
  } catch {
    return defaults;
  }
}

function savePreferences() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      team: state.team,
      player: state.player,
    }),
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseMatchDate(value) {
  return new Date(String(value).replace(/-/g, "/"));
}

function sortMatches(matches, direction = 1) {
  return [...matches].sort((left, right) => {
    const delta = parseMatchDate(left.matchDate) - parseMatchDate(right.matchDate);
    return delta * direction;
  });
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parseMatchDate(value));
}

function formatDayTitle(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(parseMatchDate(value));
}

function formatCountdown(value) {
  const diff = parseMatchDate(value) - new Date();
  if (diff <= 0) return "已开打";

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  return `${minutes}分钟`;
}

function formatCountdownShort(value) {
  const diff = parseMatchDate(value) - new Date();
  if (diff <= 0) return "已开";

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}天`;
  if (hours > 0) return `${hours}小时`;
  return `${minutes}分`;
}

function statusLabel(match) {
  if (match.status === "in_progress") return "进行中";
  if (match.status === "completed") return "已结束";
  if (match.status === "upcoming") return "未开打";
  return match.statusText || "待确认";
}

function statusTone(match) {
  if (match.status === "in_progress") return "is-live";
  if (match.status === "completed") return "is-completed";
  return "is-upcoming";
}

function getTeamInfo(teamCode) {
  return state.data.teams.find((team) => team.shortName === teamCode) || { shortName: teamCode };
}

function getMatchesByTeam(teamCode) {
  return sortMatches(
    state.data.matches.filter(
      (match) => match.teamA.shortName === teamCode || match.teamB.shortName === teamCode,
    ),
    1,
  );
}

function teamMatches() {
  return getMatchesByTeam(state.team);
}

function getScorePerspective(match, teamCode = state.team) {
  const isTeamA = match.teamA.shortName === teamCode;
  const team = isTeamA ? match.teamA : match.teamB;
  const opponent = isTeamA ? match.teamB : match.teamA;

  return {
    isTeamA,
    team,
    opponent,
    scoreFor: isTeamA ? Number(match.scoreA) : Number(match.scoreB),
    scoreAgainst: isTeamA ? Number(match.scoreB) : Number(match.scoreA),
  };
}

function getSeriesResult(match, teamCode = state.team) {
  if (match.status !== "completed") return null;

  const { scoreFor, scoreAgainst } = getScorePerspective(match, teamCode);
  if (scoreFor > scoreAgainst) return "win";
  if (scoreFor < scoreAgainst) return "loss";
  return "draw";
}

function buildTeamRecord(teamCode = state.team) {
  const completedMatches = sortMatches(
    getMatchesByTeam(teamCode).filter((match) => match.status === "completed"),
    -1,
  );

  const wins = completedMatches.filter((match) => getSeriesResult(match, teamCode) === "win").length;
  const losses = completedMatches.filter((match) => getSeriesResult(match, teamCode) === "loss").length;
  const played = completedMatches.length;
  const winRate = played ? Math.round((wins / played) * 100) : 0;
  const recent = completedMatches.slice(0, 5).map((match) => getSeriesResult(match, teamCode));
  const recentText = recent.length
    ? recent
        .map((result) => (result === "win" ? "胜" : result === "loss" ? "负" : "平"))
        .join(" ")
    : "暂无";

  let streakType = null;
  let streakCount = 0;

  for (const result of recent) {
    if (!result || result === "draw") break;
    if (!streakType) {
      streakType = result;
      streakCount += 1;
      continue;
    }
    if (result !== streakType) break;
    streakCount += 1;
  }

  const streakLabel = streakCount
    ? `${streakCount}连${streakType === "win" ? "胜" : "败"}`
    : "无连续走势";

  return {
    teamCode,
    played,
    wins,
    losses,
    winRate,
    recent,
    recentText,
    streakCount,
    streakType,
    streakLabel,
  };
}

function getFocusState() {
  const matches = teamMatches();
  const liveMatch = matches.find((match) => match.status === "in_progress") || null;
  const pendingMatches = sortMatches(
    matches.filter((match) => match.status !== "completed"),
    1,
  );
  const upcomingMatch =
    pendingMatches.find((match) => parseMatchDate(match.matchDate) >= new Date()) || pendingMatches[0] || null;
  const lastCompleted =
    sortMatches(
      matches.filter((match) => match.status === "completed"),
      -1,
    )[0] || null;

  return {
    matches,
    liveMatch,
    upcomingMatch,
    lastCompleted,
    spotlightMatch: liveMatch || upcomingMatch || lastCompleted || null,
  };
}

function resolveTeamPreference(teamCode, fallback) {
  const available = new Set(state.data.teams.map((team) => team.shortName));
  return available.has(teamCode) ? teamCode : fallback;
}

function renderTeamBadge(team, className = "team-badge") {
  if (team.logo) {
    return `<img class="${className}" src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.shortName)}" loading="lazy" />`;
  }

  return `<div class="${className} team-fallback">${escapeHtml(team.shortName)}</div>`;
}

function buildMonkInsight(focusState, teamRecord) {
  const spotlight = focusState.liveMatch || focusState.upcomingMatch || focusState.lastCompleted;

  if (!spotlight) {
    return {
      favoredTeam: state.team,
      confidence: 56,
      headline: "还没排出下一场，先别装神",
      quote: "先把赛程看准，别在没有对阵的时候自嗨。",
      risk: "官方排表一更新，这张卡就得跟着变。",
      factors: [`${state.team} 当前累计 ${teamRecord.wins}-${teamRecord.losses}`],
    };
  }

  const { opponent, scoreFor, scoreAgainst } = getScorePerspective(spotlight);
  const opponentRecord = buildTeamRecord(opponent.shortName);
  const recordEdge = teamRecord.winRate - opponentRecord.winRate;
  const streakEdge =
    (teamRecord.streakType === "win" ? teamRecord.streakCount : -teamRecord.streakCount) -
    (opponentRecord.streakType === "win" ? opponentRecord.streakCount : -opponentRecord.streakCount);
  const liveEdge = spotlight.status === "in_progress" ? (scoreFor - scoreAgainst) * 8 : 0;
  const confidence = Math.max(42, Math.min(84, Math.round(56 + recordEdge * 0.28 + streakEdge * 4 + liveEdge)));
  const favoredTeam = confidence >= 56 ? state.team : opponent.shortName;

  if (spotlight.status === "in_progress") {
    return {
      favoredTeam,
      confidence,
      headline:
        favoredTeam === state.team
          ? `${state.team} 现在气口更顺`
          : `${state.team} 这会儿还没把局势掰回来`,
      quote:
        favoredTeam === state.team
          ? `比分 ${scoreFor}:${scoreAgainst} 已经压住了，对面要翻得先把节奏抢回来。`
          : `当前比分 ${scoreFor}:${scoreAgainst} 不舒服，先别提前开香槟。`,
      risk: "直播局势变得很快，这张卡只负责提醒你别犯傻。",
      factors: [
        `${state.team} 系列战绩 ${teamRecord.wins}-${teamRecord.losses}`,
        `${opponent.shortName} 系列战绩 ${opponentRecord.wins}-${opponentRecord.losses}`,
      ],
    };
  }

  if (spotlight.status === "upcoming") {
    return {
      favoredTeam,
      confidence,
      headline:
        favoredTeam === state.team
          ? `高僧偏 ${state.team}`
          : `这场别硬站 ${state.team}`,
      quote:
        favoredTeam === state.team
          ? `${state.team} 近期战绩和走势都更顺，这场可以先往正面看。`
          : `${opponent.shortName} 的战绩边更厚，${state.team} 这场没你想得稳。`,
      risk:
        spotlight.bo === "BO5"
          ? "长局最怕中后段发病，别只看开局热闹。"
          : "短局最怕前十五分钟送先锋，节奏崩了就没了。",
      factors: [
        `${state.team} 胜率 ${teamRecord.winRate}%`,
        `${opponent.shortName} 胜率 ${opponentRecord.winRate}%`,
        `${state.team} 近况 ${teamRecord.streakLabel}`,
      ],
    };
  }

  return {
    favoredTeam: scoreFor > scoreAgainst ? state.team : opponent.shortName,
    confidence: Math.max(52, Math.min(78, 58 + Math.abs(scoreFor - scoreAgainst) * 5)),
    headline:
      scoreFor > scoreAgainst
        ? `${state.team} 最近一场收得还行`
        : `${state.team} 最近一场打得有点烂`,
    quote:
      scoreFor > scoreAgainst
        ? `上一场 ${scoreFor}:${scoreAgainst} 收掉了，状态至少没往下掉。`
        : `上一场 ${scoreFor}:${scoreAgainst} 输了，后面真要起势还得看下一轮。`,
    risk: "当前没有直播或下一场，这张高僧卡只能拿最近结果说事。",
    factors: [
      `${state.team} 系列战绩 ${teamRecord.wins}-${teamRecord.losses}`,
      `${state.team} 近五场 ${teamRecord.recentText}`,
    ],
  };
}

function renderFocusCard() {
  const hero = $("#focus-card");
  if (!hero) return;

  const focusState = getFocusState();
  const spotlight = focusState.spotlightMatch;

  if (!spotlight) {
    hero.innerHTML = `
      <div class="hero-shell">
        <div class="hero-copy-group">
          <div class="hero-meta">
            <span class="hero-state is-upcoming">等待赛程</span>
            <span class="hero-tag">${escapeHtml(state.team)} / ${escapeHtml(state.player)}</span>
          </div>
          <h2 class="hero-title">当前还没有抓到可用赛程</h2>
          <p class="hero-subcopy">这说明官方快照没刷出来，或者你选了个还没进数据池的队。先别急着骂，点刷新。</p>
        </div>
      </div>
    `;
    return;
  }

  const { opponent, scoreFor, scoreAgainst } = getScorePerspective(spotlight);
  const isPastPending =
    spotlight.status !== "completed" && parseMatchDate(spotlight.matchDate) < new Date();

  const stateText =
    spotlight.status === "in_progress"
      ? "当前比赛"
      : spotlight.status === "upcoming"
        ? "下一场"
        : "最近一场";

  const caption =
    spotlight.status === "in_progress"
      ? `当前系列赛比分 ${scoreFor}:${scoreAgainst}`
      : spotlight.status === "upcoming"
        ? isPastPending
          ? `原定 ${formatDateTime(spotlight.matchDate)} 开打，官方还没刷出赛果`
          : `距离开打还有 ${formatCountdown(spotlight.matchDate)}`
        : `${state.team} 最近一次官方记录`;

  const subcopy =
    spotlight.status === "in_progress"
      ? `${spotlight.tournamentLabel} / ${spotlight.bo}，现在就该盯着比分，不用想太多。`
      : spotlight.status === "upcoming"
        ? isPastPending
          ? `${spotlight.tournamentLabel} / ${spotlight.bo}，这场时间已经过了，但官方快照还没结算。`
          : `${spotlight.tournamentLabel} / ${spotlight.bo}，别等开打了才想起来看。`
        : `后面如果没有更近赛程，就先拿这场顶着。`;

  hero.innerHTML = `
    <div class="hero-shell">
      <div class="hero-copy-group">
        <div class="hero-meta">
          <span class="hero-state ${statusTone(spotlight)}">${stateText}</span>
          <span class="hero-tag">${escapeHtml(state.team)} / ${escapeHtml(state.player)}</span>
          <span class="hero-tag">${escapeHtml(spotlight.tournamentLabel)}</span>
        </div>
        <h2 class="hero-title">${escapeHtml(state.team)} ${spotlight.status === "upcoming" ? "下一场对" : spotlight.status === "in_progress" ? "正在打" : "刚打完"} ${escapeHtml(opponent.shortName)}</h2>
        <p class="hero-caption">${escapeHtml(caption)}</p>
        <p class="hero-subcopy">${escapeHtml(subcopy)}</p>
      </div>

      <div class="hero-scoreboard">
        <div class="hero-teams">
          <article class="hero-team is-focus">
            ${renderTeamBadge(getTeamInfo(state.team))}
            <strong>${escapeHtml(state.team)}</strong>
            <span>主队 / 当前关注</span>
          </article>
          <div class="hero-big">
            <strong>${spotlight.status === "upcoming" ? "VS" : `${scoreFor}:${scoreAgainst}`}</strong>
            <span>${escapeHtml(statusLabel(spotlight))}</span>
          </div>
          <article class="hero-team">
            ${renderTeamBadge(opponent)}
            <strong>${escapeHtml(opponent.shortName)}</strong>
            <span>对手</span>
          </article>
        </div>

        <div class="hero-side">
          <div class="hero-side-card">
            <p class="eyebrow">时间点</p>
            <strong>${escapeHtml(formatDateTime(spotlight.matchDate))}</strong>
            <span>${escapeHtml(spotlight.stageName || "阶段待确认")}${spotlight.roundName ? ` / ${escapeHtml(spotlight.roundName)}` : ""}</span>
          </div>
          <div class="hero-side-card">
            <p class="eyebrow">关注选手</p>
            <strong>${escapeHtml(state.player)}</strong>
            <span>当前默认归属 ${escapeHtml(state.team)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWidgetCards() {
  const container = $("#widget-grid");
  if (!container) return;

  const focusState = getFocusState();
  const teamRecord = buildTeamRecord(state.team);
  const monk = buildMonkInsight(focusState, teamRecord);
  const spotlight = focusState.liveMatch || focusState.upcomingMatch || focusState.lastCompleted;

  let liveCardValue = "--";
  let liveCardTitle = "等待赛程";
  let liveCardMeta = "还没抓到主队焦点场";
  let liveCardFootLeft = "官方快照";
  let liveCardFootRight = "等刷新";

  if (spotlight) {
    const { opponent, scoreFor, scoreAgainst } = getScorePerspective(spotlight);
    const isPastPending =
      spotlight.status !== "completed" && parseMatchDate(spotlight.matchDate) < new Date();
    liveCardTitle =
      spotlight.status === "in_progress"
        ? `${state.team} vs ${opponent.shortName}`
        : spotlight.status === "upcoming"
          ? isPastPending
            ? `${state.team} 待结算`
            : `${state.team} 下一场`
          : `${state.team} 最近一场`;
    liveCardMeta = `${spotlight.tournamentLabel} / ${spotlight.bo}`;
    liveCardFootLeft = formatDateTime(spotlight.matchDate);
    liveCardFootRight = statusLabel(spotlight);
    liveCardValue =
      spotlight.status === "in_progress"
        ? `${scoreFor}:${scoreAgainst}`
        : spotlight.status === "upcoming"
          ? isPastPending
            ? "待刷"
            : formatCountdownShort(spotlight.matchDate)
          : `${scoreFor}:${scoreAgainst}`;
  }

  container.innerHTML = `
    <article class="widget-card record-card">
      <div class="widget-card__body">
        <div class="widget-card__head">
          <div>
            <p class="widget-card__eyebrow">BLG 战绩卡</p>
            <h3 class="widget-card__headline">${escapeHtml(state.team)} 已完结系列赛</h3>
          </div>
          <span class="widget-card__meta">近五场 ${escapeHtml(teamRecord.recentText)}</span>
        </div>
        <div class="widget-card__value">${teamRecord.wins}<span>-${teamRecord.losses}</span></div>
        <div class="widget-card__foot">
          <span class="widget-card__meta">胜率 ${teamRecord.winRate}%</span>
          <span class="widget-card__meta">${escapeHtml(teamRecord.streakLabel)}</span>
        </div>
      </div>
    </article>

    <article class="widget-card live-card">
      <div class="widget-card__body">
        <div class="widget-card__head">
          <div>
            <p class="widget-card__eyebrow">${focusState.liveMatch ? "当前比赛卡" : "下一场卡"}</p>
            <h3 class="widget-card__headline">${escapeHtml(liveCardTitle)}</h3>
          </div>
          <span class="widget-card__meta">${escapeHtml(liveCardMeta)}</span>
        </div>
        <div class="widget-card__value">${escapeHtml(liveCardValue)}</div>
        <div class="widget-card__foot">
          <span class="widget-card__meta">${escapeHtml(liveCardFootLeft)}</span>
          <span class="widget-card__meta">${escapeHtml(liveCardFootRight)}</span>
        </div>
      </div>
    </article>

    <article class="widget-card monk-card">
      <div class="widget-card__body">
        <div class="widget-card__head">
          <div>
            <p class="widget-card__eyebrow">高僧卡</p>
            <h3 class="widget-card__headline">${escapeHtml(monk.headline)}</h3>
          </div>
          <span class="widget-card__meta">偏向 ${escapeHtml(monk.favoredTeam)}</span>
        </div>
        <div class="widget-card__value">${monk.confidence}<span>%</span></div>
        <p class="widget-card__quote">${escapeHtml(monk.quote)}</p>
        <div class="widget-card__foot">
          <span class="widget-card__meta">${escapeHtml(monk.factors[0] || "等待更多数据")}</span>
          <span class="widget-card__meta">${escapeHtml(monk.risk)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderSummary() {
  const summary = $("#summary-grid");
  if (!summary) return;

  const focusState = getFocusState();
  const teamRecord = buildTeamRecord(state.team);
  const spotlight = focusState.liveMatch || focusState.upcomingMatch || focusState.lastCompleted;

  const statusValue = spotlight
    ? spotlight.status === "in_progress"
      ? "进行中"
      : spotlight.status === "upcoming"
        ? parseMatchDate(spotlight.matchDate) < new Date()
          ? "待刷分"
          : formatCountdown(spotlight.matchDate)
        : "已打完"
    : "待更新";

  const statusMeta = spotlight
    ? spotlight.status === "upcoming"
      ? formatDateTime(spotlight.matchDate)
      : `${spotlight.tournamentLabel} / ${spotlight.bo}`
    : "等官方快照";

  summary.innerHTML = `
    <article class="summary-card">
      <span class="summary-card__label">系列战绩</span>
      <strong class="summary-card__value">${teamRecord.wins}-${teamRecord.losses}</strong>
      <span class="summary-card__meta">当前主队 ${escapeHtml(state.team)}</span>
    </article>
    <article class="summary-card">
      <span class="summary-card__label">系列胜率</span>
      <strong class="summary-card__value">${teamRecord.winRate}%</strong>
      <span class="summary-card__meta">近五场 ${escapeHtml(teamRecord.recentText)}</span>
    </article>
    <article class="summary-card">
      <span class="summary-card__label">当前态</span>
      <strong class="summary-card__value">${escapeHtml(statusValue)}</strong>
      <span class="summary-card__meta">${escapeHtml(statusMeta)}</span>
    </article>
  `;
}

function renderTeamOptions() {
  const select = $("#team-select");
  if (!select) return;

  select.innerHTML = state.data.teams
    .map(
      (team) =>
        `<option value="${escapeHtml(team.shortName)}" ${team.shortName === state.team ? "selected" : ""}>${escapeHtml(team.shortName)}</option>`,
    )
    .join("");
}

function renderFilters() {
  const filterRow = $("#filter-row");
  if (!filterRow) return;

  const filters = [
    { id: "focus", label: `${state.team} 赛程` },
    { id: "all", label: "全部" },
    ...state.data.tournaments.map((item) => ({ id: item.slug, label: item.label })),
  ];

  filterRow.innerHTML = filters
    .map(
      (filter) =>
        `<button class="chip-btn ${state.filter === filter.id ? "is-active" : ""}" data-filter="${escapeHtml(filter.id)}" type="button">${escapeHtml(filter.label)}</button>`,
    )
    .join("");
}

function filteredMatches() {
  if (state.filter === "focus") {
    return teamMatches();
  }

  if (state.filter === "all") {
    return sortMatches(state.data.matches, 1);
  }

  return sortMatches(
    state.data.matches.filter((match) => match.tournamentSlug === state.filter),
    1,
  );
}

function groupByDate(matches) {
  return matches.reduce((accumulator, match) => {
    const key = match.matchDate.slice(0, 10);
    accumulator[key] ||= [];
    accumulator[key].push(match);
    return accumulator;
  }, {});
}

function renderSchedule() {
  const container = $("#schedule-groups");
  if (!container) return;

  const matches = filteredMatches();
  if (!matches.length) {
    container.innerHTML = `<p class="empty-state">当前筛选下没有赛程。</p>`;
    return;
  }

  const groups = groupByDate(matches);
  const days = Object.keys(groups).sort((left, right) => parseMatchDate(left) - parseMatchDate(right));

  container.innerHTML = days
    .map((day) => {
      const dayMatches = groups[day];

      return `
        <section class="day-group">
          <div class="day-title">${escapeHtml(formatDayTitle(day))}</div>
          ${dayMatches
            .map((match) => {
              const perspective = isFocusMatch(match) ? getScorePerspective(match) : null;
              const result = perspective ? getSeriesResult(match) : null;
              const classes = [
                "match-card",
                isFocusMatch(match) ? "is-focus" : "",
                match.status === "in_progress" ? "is-live" : "",
                result === "win" ? "is-win" : "",
                result === "loss" ? "is-loss" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return `
                <article class="${classes}">
                  <div class="match-main">
                    <div class="match-top">
                      <div class="team-stack">
                        ${renderTeamBadge(match.teamA)}
                        <div class="team-copy">
                          <strong class="match-title">${escapeHtml(match.teamA.shortName)} vs ${escapeHtml(match.teamB.shortName)}</strong>
                          <div class="match-meta">
                            <span class="match-meta-chip">${escapeHtml(match.tournamentLabel)}</span>
                            <span class="match-meta-chip">${escapeHtml(match.bo)}</span>
                            <span class="match-meta-chip">${escapeHtml(match.stageName || "阶段待确认")}</span>
                          </div>
                        </div>
                      </div>
                      <div class="match-scoreline">
                        <strong>${match.status === "upcoming" ? "VS" : `${match.scoreA}:${match.scoreB}`}</strong>
                        <span class="status ${statusTone(match)}">${escapeHtml(statusLabel(match))}</span>
                      </div>
                    </div>
                    <div class="match-meta">
                      <span class="match-meta-chip">${escapeHtml(formatDateTime(match.matchDate))}</span>
                      <span class="match-meta-chip">${escapeHtml(match.roundName || "轮次待确认")}</span>
                      <span class="match-meta-chip">${escapeHtml(match.venue || "场地待确认")}</span>
                      ${
                        perspective && result
                          ? `<span class="match-meta-chip">${escapeHtml(state.team)} ${result === "win" ? "拿下" : "输了"}</span>`
                          : ""
                      }
                    </div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </section>
      `;
    })
    .join("");
}

function isFocusMatch(match) {
  return match.teamA.shortName === state.team || match.teamB.shortName === state.team;
}

function renderSyncStatus() {
  const syncText = $("#sync-text");
  if (!syncText) return;
  syncText.textContent = `官方快照 ${state.data.generatedAtLocal}`;
}

function syncInputs() {
  const playerInput = $("#player-input");
  const teamSelect = $("#team-select");

  if (playerInput) playerInput.value = state.player;
  if (teamSelect) teamSelect.value = state.team;
}

function rerender() {
  renderTeamOptions();
  syncInputs();
  renderSyncStatus();
  renderFocusCard();
  renderWidgetCards();
  renderSummary();
  renderFilters();
  renderSchedule();
}

function bindEvents() {
  if (state.eventsBound) return;

  $("#save-preference")?.addEventListener("click", () => {
    state.team = $("#team-select")?.value || state.team;
    state.player = $("#player-input")?.value.trim() || state.player;
    savePreferences();
    rerender();
  });

  $("#refresh-button")?.addEventListener("click", async () => {
    await init(true);
  });

  $("#filter-row")?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-filter]");
    if (!target) return;
    state.filter = target.dataset.filter;
    renderFilters();
    renderSchedule();
  });

  state.eventsBound = true;
}

async function loadData() {
  const response = await fetch(`../data/tencent-schedule.json?ts=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`加载快照失败 ${response.status}`);
  }

  return response.json();
}

async function init(forceReload = false) {
  const hint = $("#preference-hint");

  try {
    if (hint) {
      hint.textContent = forceReload ? "重新拉官方快照中..." : "选手只做关注标记，赛程和比分仍然只认官方。";
    }

    state.data = await loadData();

    const savedPreferences = loadPreferences(state.data.focusDefaults);
    const resolvedPreferences = readUrlPreferences(savedPreferences);
    state.team = resolveTeamPreference(resolvedPreferences.team, state.data.focusDefaults.team);
    state.player = resolvedPreferences.player || state.data.focusDefaults.player;

    savePreferences();
    bindEvents();
    rerender();

    if (hint) {
      hint.textContent = "这版已经按官方快照渲染。你真正日用还是该走 Scriptable 小组件。";
    }
  } catch (error) {
    if (hint) {
      hint.textContent = `加载失败，${error.message}`;
    }
  }
}

init();
