const STORAGE_KEY = "esports-monk-self-use";

const state = {
  data: null,
  filter: "focus",
  team: "BLG",
  player: "Bin",
  eventsBound: false,
};

const $ = (selector) => document.querySelector(selector);

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

function parseMatchDate(value) {
  return new Date(String(value).replace(/-/g, "/"));
}

function formatDateTime(value) {
  const date = parseMatchDate(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDayTitle(value) {
  const date = parseMatchDate(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function teamMatches() {
  return state.data.matches.filter(
    (match) => match.teamA.shortName === state.team || match.teamB.shortName === state.team,
  );
}

function getFocusCards() {
  const matches = teamMatches();
  const now = new Date();
  const nextMatch = matches.find((match) => parseMatchDate(match.matchDate) >= now);
  const lastMatch = [...matches].reverse().find((match) => parseMatchDate(match.matchDate) <= now);

  return { nextMatch, lastMatch, total: matches.length };
}

function renderTeamBadge(team) {
  if (team.logo) {
    return `<img class="team-badge" src="${team.logo}" alt="${team.shortName}" loading="lazy" />`;
  }

  return `<div class="team-badge team-fallback">${team.shortName}</div>`;
}

function renderFocusCard() {
  const { nextMatch, lastMatch, total } = getFocusCards();
  const hero = $("#focus-card");
  if (!hero) return;

  const nextLine = nextMatch
    ? `${nextMatch.teamA.shortName} vs ${nextMatch.teamB.shortName}`
    : "当前没有后续赛程";
  const lastLine = lastMatch
    ? `${lastMatch.teamA.shortName} ${lastMatch.scoreA} : ${lastMatch.scoreB} ${lastMatch.teamB.shortName}`
    : "当前没有历史赛果";

  hero.innerHTML = `
    <div class="hero-kicker">当前关注 / ${state.team} / ${state.player}</div>
    <h3 class="hero-title">${state.player} 观赛助手</h3>
    <p class="hero-copy">只追官方赛程，当前盯 ${state.team} 和 ${state.player}。你现在打开就该知道下一场什么时候打，已经打完的比分是什么。</p>
    <div class="focus-metrics">
      <div class="metric-card">
        <span>下一场</span>
        <strong>${nextLine}</strong>
        <span>${nextMatch ? formatDateTime(nextMatch.matchDate) : "等待赛程更新"}</span>
      </div>
      <div class="metric-card">
        <span>上一场</span>
        <strong>${lastLine}</strong>
        <span>${lastMatch ? `${lastMatch.statusText} / ${formatDateTime(lastMatch.matchDate)}` : "暂无"}</span>
      </div>
      <div class="metric-card">
        <span>当前赛季覆盖</span>
        <strong>${total} 场</strong>
        <span>${state.data.tournaments.map((item) => item.label).join(" / ")}</span>
      </div>
    </div>
  `;
}

function renderSummary() {
  const summary = $("#summary-grid");
  if (!summary) return;

  const matches = state.data.matches;
  const ongoing = matches.filter((match) => match.status === "in_progress").length;
  const upcoming = matches.filter((match) => match.status === "upcoming").length;
  const completed = matches.filter((match) => match.status === "completed").length;

  summary.innerHTML = `
    <div class="summary-card">
      <span>进行中/待确认</span>
      <strong>${ongoing}</strong>
    </div>
    <div class="summary-card">
      <span>未开始</span>
      <strong>${upcoming}</strong>
    </div>
    <div class="summary-card">
      <span>已结束</span>
      <strong>${completed}</strong>
    </div>
  `;
}

function renderTeamOptions() {
  const select = $("#team-select");
  if (!select) return;

  select.innerHTML = state.data.teams
    .map(
      (team) =>
        `<option value="${team.shortName}" ${team.shortName === state.team ? "selected" : ""}>${team.shortName}</option>`,
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
        `<button class="chip-btn ${state.filter === filter.id ? "is-active" : ""}" data-filter="${filter.id}" type="button">${filter.label}</button>`,
    )
    .join("");
}

function filteredMatches() {
  if (state.filter === "focus") {
    return teamMatches();
  }

  if (state.filter === "all") {
    return state.data.matches;
  }

  return state.data.matches.filter((match) => match.tournamentSlug === state.filter);
}

function groupByDate(matches) {
  return matches.reduce((accumulator, match) => {
    const key = match.matchDate.slice(0, 10);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
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
  container.innerHTML = Object.entries(groups)
    .map(
      ([day, dayMatches]) => `
        <section class="day-group">
          <div class="day-title">${formatDayTitle(day)}</div>
          ${dayMatches
            .map(
              (match) => `
                <article class="match-card">
                  <div class="match-row">
                    <div class="team-stack">
                      ${renderTeamBadge(match.teamA)}
                      <div class="team-names">
                        <strong>${match.teamA.shortName} vs ${match.teamB.shortName}</strong>
                        <p class="match-meta">${match.tournamentLabel} / ${match.bo}</p>
                      </div>
                    </div>
                    <div class="score-pill ${
                      match.status === "in_progress"
                        ? "is-live"
                        : match.status === "completed"
                          ? "is-completed"
                          : ""
                    }">
                      ${
                        match.status === "upcoming"
                          ? "VS"
                          : `${match.scoreA} : ${match.scoreB}`
                      }
                    </div>
                  </div>
                  <div class="match-sub">
                    <span class="meta-chip">${formatDateTime(match.matchDate)}</span>
                    <span class="meta-chip">${match.statusText}</span>
                    <span class="meta-chip">${match.stageName}${match.roundName ? ` / ${match.roundName}` : ""}</span>
                    <span class="meta-chip">${match.venue || "场地待确认"}</span>
                  </div>
                </article>
              `,
            )
            .join("")}
        </section>
      `,
    )
    .join("");
}

function renderSyncStatus() {
  const syncText = $("#sync-text");
  if (!syncText) return;
  syncText.textContent = `快照更新时间 ${state.data.generatedAtLocal}`;
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
      hint.textContent = forceReload
        ? "重新加载快照中..."
        : "当前 MVP 只追官方赛程，选手位只做关注标记。";
    }
    state.data = await loadData();
    const defaults = loadPreferences(state.data.focusDefaults);
    state.team = defaults.team;
    state.player = defaults.player;
    bindEvents();
    rerender();
    if (hint) hint.textContent = "快照加载成功。网页版看快照，实机推荐 Scriptable。";
  } catch (error) {
    if (hint) hint.textContent = `加载失败：${error.message}`;
  }
}

init();
