const state = {
  currentView: "overview",
  currentTeam: "BLG",
  currentPlayer: "bin",
  siteData: null,
};

const TEAM_THEMES = {
  BLG: { accent: "#3d78d7", soft: "rgba(61, 120, 215, 0.16)", glow: "rgba(61, 120, 215, 0.2)" },
  JDG: { accent: "#c73c2d", soft: "rgba(199, 60, 45, 0.14)", glow: "rgba(199, 60, 45, 0.18)" },
  AL: { accent: "#16735f", soft: "rgba(22, 115, 95, 0.14)", glow: "rgba(22, 115, 95, 0.18)" },
  WBG: { accent: "#b63830", soft: "rgba(182, 56, 48, 0.14)", glow: "rgba(182, 56, 48, 0.18)" },
  LNG: { accent: "#2b5c73", soft: "rgba(43, 92, 115, 0.14)", glow: "rgba(43, 92, 115, 0.18)" },
  TES: { accent: "#c86b24", soft: "rgba(200, 107, 36, 0.14)", glow: "rgba(200, 107, 36, 0.18)" },
  G2: { accent: "#2c2c2c", soft: "rgba(44, 44, 44, 0.12)", glow: "rgba(44, 44, 44, 0.16)" },
};

const $ = (selector) => document.querySelector(selector);

function readQueryState() {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get("view")?.trim(),
    team: params.get("team")?.trim().toUpperCase(),
    player: params.get("player")?.trim().toLowerCase(),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderBadge(team, className = "team-badge") {
  if (team?.logo) {
    return `<img class="${className} team-badge--image" src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.code || team.shortName || team.name || "team")}" loading="lazy" />`;
  }

  const label = team?.code || team?.shortName || team?.name || "TBD";
  return `<div class="${className}">${escapeHtml(label)}</div>`;
}

function renderPortrait(person, className = "player-headshot", options = {}) {
  const label = options.label || person?.name || "选手";
  const loading = options.loading || "lazy";
  const fallbackMode = options.fallbackMode || "initial";
  if (person?.portrait) {
    return `
      <div class="${className} is-image">
        <img src="${escapeHtml(person.portrait)}" alt="${escapeHtml(label)}" loading="${escapeHtml(loading)}" />
      </div>
    `;
  }

  if (fallbackMode === "none") {
    return "";
  }

  const fallback = person?.name?.slice(0, 1) || "•";
  return `<div class="${className}">${escapeHtml(fallback)}</div>`;
}

function getCurrentTeamItem() {
  return state.siteData?.teams?.items.find((item) => item.id === state.currentTeam) || null;
}

function getCurrentPlayerItem() {
  return state.siteData?.players?.items.find((item) => item.id === state.currentPlayer) || null;
}

function getTeamTheme(teamId) {
  return (
    TEAM_THEMES[teamId] || {
      accent: "#8d7147",
      soft: "rgba(181, 144, 75, 0.14)",
      glow: "rgba(181, 144, 75, 0.18)",
    }
  );
}

function renderNav(targetId) {
  const navHtml = Object.entries(state.siteData.copy.nav)
    .map(
      ([view, label]) =>
        `<button class="nav-btn ${view === state.currentView ? "is-active" : ""}" data-view="${escapeHtml(view)}">${escapeHtml(label)}</button>`,
    )
    .join("");

  $(targetId).innerHTML = navHtml;
}

function renderTopbar() {
  const { copy, generatedAtLocal } = state.siteData;
  document.title = copy.title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", copy.description);

  $("#brand-eyebrow").textContent = copy.brandEyebrow;
  $("#brand-name").textContent = copy.brandName;
  $("#scope-pill").textContent = copy.scopePill;
  $("#signal-text").textContent = generatedAtLocal
    ? `${copy.signalText} ${generatedAtLocal}`
    : copy.signalText;

  renderNav("#desktop-nav");
  renderNav("#mobile-nav");
}

function renderEmptyCard(message) {
  return `<article class="empty-card">${escapeHtml(message)}</article>`;
}

function renderMatchCard(match) {
  const scoreText = match.status === "upcoming" ? "VS" : `${match.scoreA}:${match.scoreB}`;
  const statusLabel =
    match.status === "in_progress"
      ? "进行中"
      : match.status === "completed"
        ? "已结束"
        : "未开打";
  const toneClass =
    match.status === "in_progress"
      ? "status-live"
      : match.status === "completed"
        ? "result-pill"
        : "league-tag";

  return `
    <article class="match-card">
      <div class="match-meta">
        <span class="league-tag">${escapeHtml(match.tournamentLabel)} / ${escapeHtml(match.stageName)}</span>
        <span class="${toneClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="scoreboard">
        <div class="team-side">
          ${renderBadge({ code: match.teamA.shortName, logo: match.teamA.logo })}
          <div>
            <div class="team-name">${escapeHtml(match.teamA.shortName)}</div>
            <div class="team-sub">${escapeHtml(match.teamA.name)}</div>
          </div>
        </div>
        <div class="score">${escapeHtml(scoreText)}</div>
        <div class="team-side right">
          <div>
            <div class="team-name">${escapeHtml(match.teamB.shortName)}</div>
            <div class="team-sub">${escapeHtml(match.teamB.name)}</div>
          </div>
          ${renderBadge({ code: match.teamB.shortName, logo: match.teamB.logo })}
        </div>
      </div>
      <div class="match-meta">
        <span class="subdued">${escapeHtml(match.bo)} / ${escapeHtml(match.roundName || "轮次待确认")}</span>
        <span class="subdued">${escapeHtml(match.matchDate.slice(5, 16))}</span>
      </div>
    </article>
  `;
}

function renderHero() {
  const team = getCurrentTeamItem();
  const player = getCurrentPlayerItem();

  if (!team) {
    $("#hero-match").innerHTML = renderEmptyCard("当前主队数据尚未接入。");
    return;
  }

  const theme = getTeamTheme(team.id);
  const heroPlayer =
    player && player.teamCode === team.id
      ? player
      : state.siteData.players.items.find((item) => item.teamCode === team.id) || null;
  const selectablePlayers = state.siteData.players.items.filter((item) => item.teamCode === team.id);
  const nextLine = team.docket.find((item) => item.label === "下一场" || item.label === "此刻对局") || null;
  const metrics = [
    { label: "赛段战绩", value: team.overview.seriesRecord },
    { label: "单局局差", value: team.metrics?.[1]?.text || "--" },
    { label: "近五走势", value: team.metrics?.[2]?.text || "--" },
    { label: "下一场", value: nextLine?.value || "等待排表" },
  ];

  $("#hero-match").setAttribute(
    "style",
    `--team-accent:${theme.accent};--team-soft:${theme.soft};--team-glow:${theme.glow};`,
  );

  $("#hero-match").innerHTML = `
    <div class="dynamic-topline">
      <div>
        <p class="eyebrow">主队动态</p>
        <h2>${escapeHtml(team.shortName)}</h2>
      </div>
      <span class="team-tone-pill">${escapeHtml(team.stageAward || team.rankingLabel)}</span>
    </div>
    <div class="dynamic-selector-block">
      <div class="dynamic-selector-label">主队</div>
      <div class="dynamic-selector-row">
        ${state.siteData.teams.items
          .map(
            (item) => `
              <button class="chip-btn ${item.id === state.currentTeam ? "is-active" : ""}" data-team="${escapeHtml(item.id)}">
                ${escapeHtml(item.id)}
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
    <div class="dynamic-selector-block">
      <div class="dynamic-selector-label">选手</div>
      <div class="dynamic-selector-row">
        ${
          selectablePlayers.length
            ? selectablePlayers
                .map(
                  (item) => `
                    <button class="chip-btn ${item.id === state.currentPlayer ? "is-active" : ""}" data-player="${escapeHtml(item.id)}">
                      ${escapeHtml(item.name)}
                    </button>
                  `,
                )
                .join("")
            : `<span class="subdued">当前只接入 BLG 重点选手。</span>`
        }
      </div>
    </div>
    <div class="dynamic-grid">
      <div class="dynamic-main">
        <div class="dynamic-brand">
          ${renderBadge({ code: team.id, logo: team.logo }, "team-badge dynamic-badge")}
          <div>
            <div class="team-name">${escapeHtml(team.shortName)}</div>
            <div class="team-sub">${escapeHtml(team.region)} / ${escapeHtml(team.rankingLabel)}</div>
          </div>
        </div>
        <p class="dynamic-copy">${escapeHtml(team.summary)}</p>
        <div class="dynamic-metrics">
          ${metrics
            .map(
              (item) => `
                <div class="summary-strip">
                  <span class="subdued">${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(item.value)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="dynamic-note">
          <span class="dynamic-note-label">主队近况</span>
          <p>${escapeHtml(team.statement)}</p>
        </div>
      </div>
      <div class="dynamic-sidecard ${heroPlayer?.portrait ? "has-portrait" : ""}">
        <div class="dynamic-player-intro">
          ${heroPlayer ? renderPortrait(heroPlayer, "dynamic-player-portrait", { label: `${heroPlayer.name} 定妆照`, loading: "eager", fallbackMode: "none" }) : ""}
          <div class="dynamic-player-copy">
            <p class="eyebrow">观战关切</p>
            <h3>${escapeHtml(heroPlayer ? `${heroPlayer.name} / ${heroPlayer.role}` : "当前未接入该队重点选手")}</h3>
            <p class="prediction-copy">${escapeHtml(heroPlayer?.note || team.statement)}</p>
          </div>
        </div>
        <div class="dynamic-side-list">
          ${team.docket
            .slice(0, 3)
            .map(
              (item) => `
                <div class="summary-strip">
                  <span class="subdued">${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(item.value)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
        <p class="list-note">${escapeHtml(nextLine?.note || "等待下一场已确认对阵。")}</p>
      </div>
    </div>
  `;
}

function renderOverview() {
  const { copy, overview } = state.siteData;

  $("#live-panel").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.sections.overview.liveEyebrow)}</p>
        <h3>${escapeHtml(copy.sections.overview.liveTitle)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(copy.sections.overview.liveTag)}</span>
    </div>
    <div class="card-stack">
      ${
        overview.liveMatches.length
          ? overview.liveMatches.map(renderMatchCard).join("")
          : renderEmptyCard("此刻没有已确认的进行中对局。")
      }
    </div>
  `;

  $("#upcoming-panel").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.sections.overview.upcomingEyebrow)}</p>
        <h3>${escapeHtml(copy.sections.overview.upcomingTitle)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(copy.sections.overview.upcomingTag)}</span>
    </div>
    <div class="schedule-list">
      ${
        overview.upcomingMatches.length
          ? overview.upcomingMatches.map(renderMatchCard).join("")
          : renderEmptyCard("未来 72 小时没有已确认的新对阵。")
      }
    </div>
  `;

  $("#ranking-panel").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.sections.overview.rankingEyebrow)}</p>
        <h3>${escapeHtml(copy.sections.overview.rankingTitle)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(copy.sections.overview.rankingTag)}</span>
    </div>
    <div>
      ${overview.ranking
        .map(
          (row) => `
            <article class="ranking-item">
              <div class="summary-strip">
                <span class="rank-index">${row.rank}</span>
                ${renderBadge({ code: row.teamCode, logo: row.logo })}
                <div>
                  <div class="team-name">${escapeHtml(row.teamCode)}</div>
                  <div class="team-sub">系列 ${escapeHtml(row.seriesRecord)} / 局差 ${escapeHtml(row.gameDiff)}</div>
                </div>
              </div>
              <div class="rank-score">${escapeHtml(row.recentText)}</div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;

  const spotlight = overview.spotlight;
  $("#spotlight-panel").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.sections.overview.spotlightEyebrow)}</p>
        <h3>${escapeHtml(copy.sections.overview.spotlightTitle)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(spotlight.teamCode)}</span>
    </div>
    <div class="spotlight-grid">
      ${renderPortrait(spotlight, "player-headshot", { label: `${spotlight.name} 定妆照` })}
      <div>
        <h3>${escapeHtml(spotlight.name)}</h3>
        <p class="subdued">${escapeHtml(spotlight.teamCode)} / ${escapeHtml(spotlight.role)}</p>
        <p class="prediction-copy">${escapeHtml(spotlight.summary)}</p>
      </div>
    </div>
    <div class="summary-grid">
      ${spotlight.track
        .slice(0, 3)
        .map(
          (item) => `
            <div class="summary-strip">
              <span class="subdued">${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
    <p class="player-quote">${escapeHtml(spotlight.note)}</p>
  `;
}

function renderTeamSwitcher() {
  $("#teams-header").innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(state.siteData.copy.sections.teams.eyebrow)}</p>
      <h3>${escapeHtml(state.siteData.copy.sections.teams.title)}</h3>
    </div>
    <span class="signal-pill is-ghost">${escapeHtml(state.siteData.copy.sections.teams.note || state.siteData.copy.description)}</span>
  `;

  $("#team-switcher").innerHTML = state.siteData.teams.items
    .map(
      (team) =>
        `<button class="chip-btn ${team.id === state.currentTeam ? "is-active" : ""}" data-team="${escapeHtml(team.id)}">${escapeHtml(team.id)}</button>`,
    )
    .join("");
}

function renderTeamDetail() {
  const copy = state.siteData.copy.sections.teams;
  const team = getCurrentTeamItem();
  if (!team) return;

  $("#team-summary").innerHTML = `
    <div class="team-title">
      <div class="team-logo">${team.logo ? `<img class="team-logo-mark" src="${escapeHtml(team.logo)}" alt="${escapeHtml(team.id)}" loading="lazy" />` : escapeHtml(team.id)}</div>
      <div>
        <p class="eyebrow">${escapeHtml(team.region)}</p>
        <h3>${escapeHtml(team.shortName)}</h3>
        <div class="meta-row">
          <span class="stat-pill">${escapeHtml(team.stageAward || team.rankingLabel)}</span>
          <span class="stat-pill">系列 ${escapeHtml(team.overview.seriesRecord)}</span>
          <span class="stat-pill">局差 ${escapeHtml(team.metrics[1].text)}</span>
        </div>
      </div>
    </div>
    <p class="prediction-copy">${escapeHtml(team.summary)}</p>
    <p class="team-statement">${escapeHtml(team.statement)}</p>
    <div class="summary-grid">
      <div class="summary-strip"><span class="subdued">系列账面</span><strong>${escapeHtml(team.overview.seriesRecord)}</strong></div>
      <div class="summary-strip"><span class="subdued">单局账面</span><strong>${escapeHtml(team.overview.gameRecord)}</strong></div>
      <div class="summary-strip"><span class="subdued">胜率</span><strong>${escapeHtml(team.overview.winRate)}</strong></div>
      <div class="summary-strip"><span class="subdued">走势</span><strong>${escapeHtml(team.overview.streakLabel)}</strong></div>
    </div>
  `;

  $("#team-docket").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.docketTitle)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(team.id)}</span>
    </div>
    <div class="detail-list">
      ${team.docket
        .map(
          (item) => `
            <article class="history-row">
              <div>
                <div class="team-name">${escapeHtml(item.label)}</div>
                <div class="team-sub">${escapeHtml(item.note)}</div>
              </div>
              <div class="team-name">${escapeHtml(item.value)}</div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;

  $("#team-history").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.historyTitle)}</h3>
      </div>
      <span class="panel-tag">近 4 场</span>
    </div>
    <div class="match-history">
      ${team.history
        .map(
          (item) => `
            <article class="history-row">
              <div>
                <div class="team-name">vs ${escapeHtml(item.opponent)}</div>
                <div class="team-sub">${escapeHtml(item.note)}</div>
              </div>
              <span class="result-pill ${item.outcome === "loss" ? "loss" : ""}">${escapeHtml(item.result)}</span>
            </article>
          `,
        )
        .join("")}
    </div>
  `;

  $("#team-observatory").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.heatTitle)}</h3>
      </div>
      <span class="panel-tag">关键指标</span>
    </div>
    <div class="heat-list">
      ${team.metrics
        .map(
          (item) => `
            <div class="heat-item">
              <div class="stat-row">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.text)}</strong>
              </div>
              <div class="heat-bar">
                <div class="heat-fill" style="width: ${item.value}%"></div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderPlayerSwitcher() {
  const visiblePlayers = state.siteData.players.items.filter(
    (player) => player.teamCode === state.currentTeam,
  );

  $("#players-header").innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(state.siteData.copy.sections.players.eyebrow)}</p>
      <h3>${escapeHtml(state.siteData.copy.sections.players.title)}</h3>
    </div>
    <span class="signal-pill is-ghost">${escapeHtml(state.siteData.copy.sections.players.intro)}</span>
  `;

  $("#player-switcher").innerHTML = visiblePlayers.length
    ? visiblePlayers
        .map(
          (player) =>
            `<button class="chip-btn ${player.id === state.currentPlayer ? "is-active" : ""}" data-player="${escapeHtml(player.id)}">${escapeHtml(player.name)}</button>`,
        )
        .join("")
    : `<span class="subdued">当前主队还没有接入选手观察数据。</span>`;
}

function renderPlayerDetail() {
  const copy = state.siteData.copy.sections.players;
  const player = getCurrentPlayerItem();
  if (!player || player.teamCode !== state.currentTeam) {
    const empty = renderEmptyCard("当前主队还没有接入选手观察数据。");
    $("#player-card").innerHTML = empty;
    $("#player-track").innerHTML = empty;
    $("#player-notes").innerHTML = empty;
    $("#player-history").innerHTML = empty;
    return;
  }

  $("#player-card").innerHTML = `
    <div class="player-card-head">
      ${renderPortrait(player, "player-headshot", { label: `${player.name} 定妆照` })}
      <div>
        <p class="eyebrow">${escapeHtml(player.teamCode)} / ${escapeHtml(player.role)}</p>
        <h3>${escapeHtml(player.name)}</h3>
        <p class="prediction-copy">${escapeHtml(player.summary)}</p>
      </div>
    </div>
    <div class="player-tags">
      ${player.tags.map((tag) => `<span class="player-badge">${escapeHtml(tag)}</span>`).join("")}
    </div>
    <p class="player-quote">${escapeHtml(player.note)}</p>
  `;

  $("#player-track").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.trackTitle)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(player.teamCode)}</span>
    </div>
    <div class="detail-list">
      ${player.track
        .map(
          (item) => `
            <article class="history-row">
              <div>
                <div class="team-name">${escapeHtml(item.label)}</div>
                <div class="team-sub">${escapeHtml(item.note)}</div>
              </div>
              <div class="team-name">${escapeHtml(item.value)}</div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;

  $("#player-notes").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.notesTitle)}</h3>
      </div>
      <span class="panel-tag">重点观察</span>
    </div>
    <div class="detail-list">
      ${player.observation
        .map(
          (item) => `
            <div class="team-statement">
              ${escapeHtml(item)}
            </div>
          `,
        )
        .join("")}
    </div>
  `;

  $("#player-history").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.historyTitle)}</h3>
      </div>
      <span class="panel-tag">近 4 场</span>
    </div>
    <div class="player-history">
      ${player.history
        .map(
          (item) => `
            <article class="history-row">
              <div>
                <div class="team-name">vs ${escapeHtml(item.opponent)}</div>
                <div class="team-sub">${escapeHtml(item.note)}</div>
              </div>
              <span class="result-pill ${item.outcome === "loss" ? "loss" : ""}">${escapeHtml(item.result)}</span>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderPredictions() {
  const copy = state.siteData.copy.sections.predictions;
  const currentPrediction =
    state.siteData.predictions.items.find((item) => item.teamId === state.currentTeam) ||
    state.siteData.predictions.items[0] ||
    null;

  $("#predictions-header").innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h3>${escapeHtml(copy.title)}</h3>
    </div>
    <span class="signal-pill is-ghost">${escapeHtml(copy.note)}</span>
  `;

  if (!currentPrediction) {
    $("#prediction-list").innerHTML = renderEmptyCard("当前没有可用于高僧预测的已确认对阵。");
    return;
  }

  $("#prediction-list").innerHTML = `
    <article class="prediction-card prediction-card--single">
      <div class="prediction-head">
        <div>
          <p class="eyebrow">${escapeHtml(currentPrediction.stageLabel)}</p>
          <h4>${escapeHtml(currentPrediction.matchLabel)}</h4>
        </div>
        <div class="prediction-score">
          <span class="confidence-pill">${escapeHtml(currentPrediction.statusText)} / ${escapeHtml(currentPrediction.confidence)}%</span>
          <span class="upset-pill">${escapeHtml(currentPrediction.predictedScore)}</span>
        </div>
      </div>
      <div class="scoreboard">
        <div class="team-side">
          ${renderBadge({ code: currentPrediction.teamA.code, logo: currentPrediction.teamA.logo })}
          <div>
            <div class="team-name">${escapeHtml(currentPrediction.teamA.code)}</div>
            <div class="team-sub">${escapeHtml(currentPrediction.teamA.recordText || currentPrediction.timeLabel)}</div>
          </div>
        </div>
        <div class="score">${escapeHtml(currentPrediction.predictedScore)}</div>
        <div class="team-side right">
          <div>
            <div class="team-name">${escapeHtml(currentPrediction.teamB.code)}</div>
            <div class="team-sub">${escapeHtml(currentPrediction.teamB.recordText || currentPrediction.verdict)}</div>
          </div>
          ${renderBadge({ code: currentPrediction.teamB.code, logo: currentPrediction.teamB.logo })}
        </div>
      </div>
      <div class="prediction-meta">
        <span>${escapeHtml(currentPrediction.timeLabel)}</span>
        <span>${escapeHtml(currentPrediction.verdict)}</span>
      </div>
      <div class="confidence-track">
        <div class="confidence-fill" style="width: ${currentPrediction.confidence}%"></div>
      </div>
      <div class="prediction-insight">
        <div class="dynamic-note">
          <span class="dynamic-note-label">高僧见解</span>
          <p>${escapeHtml(currentPrediction.line)}</p>
        </div>
        <div class="factor-list">
          <div class="factor-title">入算因子</div>
          ${currentPrediction.factors
            .map(
              (factor) => `
                <div class="summary-strip">
                  <span class="subdued">因子</span>
                  <strong>${escapeHtml(factor)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="risk-line">
        <span class="risk-pill">${escapeHtml(currentPrediction.headline)}</span>
        <span class="subdued">${escapeHtml(currentPrediction.risk)}</span>
      </div>
    </article>
  `;
}

function renderViewVisibility() {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === state.currentView);
  });

  document.querySelectorAll(".nav-btn[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.currentView);
  });
}

function rerender() {
  renderTopbar();
  renderHero();
  renderOverview();
  renderTeamSwitcher();
  renderTeamDetail();
  renderPlayerSwitcher();
  renderPlayerDetail();
  renderPredictions();
  renderViewVisibility();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.currentView = viewButton.dataset.view;
      rerender();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const teamButton = event.target.closest("[data-team]");
    if (teamButton) {
      state.currentTeam = teamButton.dataset.team;
      const availablePlayers = state.siteData.players.items.filter(
        (item) => item.teamCode === state.currentTeam,
      );
      if (
        availablePlayers.length &&
        !availablePlayers.some((item) => item.id === state.currentPlayer)
      ) {
        state.currentPlayer = availablePlayers[0].id;
      }
      renderHero();
      renderOverview();
      renderTeamSwitcher();
      renderTeamDetail();
      renderPlayerSwitcher();
      renderPlayerDetail();
      renderPredictions();
      return;
    }

    const playerButton = event.target.closest("[data-player]");
    if (playerButton) {
      state.currentPlayer = playerButton.dataset.player;
      renderHero();
      renderPlayerSwitcher();
      renderPlayerDetail();
    }
  });
}

async function loadData() {
  if (window.__SITE_DATA__) {
    return window.__SITE_DATA__;
  }

  try {
    const response = await fetch(`./data/site-data.json?ts=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`加载站点数据失败 ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (window.__SITE_DATA__) {
      return window.__SITE_DATA__;
    }

    throw error;
  }
}

async function init() {
  try {
    state.siteData = await loadData();
    const queryState = readQueryState();
    const teamIds = new Set(state.siteData.teams.items.map((item) => item.id));
    const playerIds = new Set(state.siteData.players.items.map((item) => item.id));
    const views = new Set(Object.keys(state.siteData.copy.nav));

    state.currentView = views.has(queryState.view) ? queryState.view : state.currentView;
    state.currentTeam = teamIds.has(queryState.team) ? queryState.team : state.siteData.teams.defaultTeam;
    state.currentPlayer = playerIds.has(queryState.player)
      ? queryState.player
      : state.siteData.players.defaultPlayer;

    bindEvents();
    rerender();
  } catch (error) {
    $("#hero-match").innerHTML = `
      <p class="eyebrow">加载失败</p>
      <h2>官网数据暂时不可用。</h2>
      <p class="hero-text">${escapeHtml(error.message || "站点数据文件未发布或路径配置错误。")}</p>
    `;
  }
}

init();
