const state = {
  currentView: "overview",
  currentTeam: "BLG",
  currentPlayer: "bin",
  siteData: null,
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
  $("#signal-text").textContent = `${copy.signalText} · ${generatedAtLocal}`;

  renderNav("#desktop-nav");
  renderNav("#mobile-nav");
}

function renderHero() {
  const { hero } = state.siteData.copy;
  const { heroMatch } = state.siteData;

  $("#hero-copy").innerHTML = `
    <p class="eyebrow">${escapeHtml(hero.eyebrow)}</p>
    <h2>${escapeHtml(hero.title)}</h2>
    <p class="hero-text">${escapeHtml(hero.body)}</p>
    <div class="hero-tags">
      ${hero.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;

  $("#hero-match").innerHTML = `
    <p class="eyebrow">${escapeHtml(heroMatch.league)}</p>
    <h3>${escapeHtml(heroMatch.headline)}</h3>
    <p class="prediction-copy">${escapeHtml(heroMatch.summary)}</p>
    <div class="scoreboard">
      <div class="team-side">
        ${renderBadge(heroMatch.left)}
        <div>
          <div class="team-name">${escapeHtml(heroMatch.left.code)}</div>
          <div class="team-sub">${escapeHtml(heroMatch.left.sub)}</div>
        </div>
      </div>
      <div class="score">VS</div>
      <div class="team-side right">
        <div>
          <div class="team-name">${escapeHtml(heroMatch.right.code)}</div>
          <div class="team-sub">${escapeHtml(heroMatch.right.sub)}</div>
        </div>
        ${renderBadge(heroMatch.right)}
      </div>
    </div>
    <div class="summary-grid">
      ${heroMatch.metrics
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
    <p class="list-note">${escapeHtml(heroMatch.detail)}</p>
  `;
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
      <div class="player-headshot">${escapeHtml(spotlight.name.slice(0, 1))}</div>
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
  const team = state.siteData.teams.items.find((item) => item.id === state.currentTeam);

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
      <span class="panel-tag">站内观测</span>
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
  $("#players-header").innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(state.siteData.copy.sections.players.eyebrow)}</p>
      <h3>${escapeHtml(state.siteData.copy.sections.players.title)}</h3>
    </div>
    <span class="signal-pill is-ghost">${escapeHtml(state.siteData.copy.sections.players.intro)}</span>
  `;

  $("#player-switcher").innerHTML = state.siteData.players.items
    .map(
      (player) =>
        `<button class="chip-btn ${player.id === state.currentPlayer ? "is-active" : ""}" data-player="${escapeHtml(player.id)}">${escapeHtml(player.name)}</button>`,
    )
    .join("");
}

function renderPlayerDetail() {
  const copy = state.siteData.copy.sections.players;
  const player = state.siteData.players.items.find((item) => item.id === state.currentPlayer);

  $("#player-card").innerHTML = `
    <div class="player-card-head">
      <div class="player-headshot">${escapeHtml(player.name.slice(0, 1))}</div>
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
      <span class="panel-tag">观赛重点</span>
    </div>
    <div class="detail-list">
      ${player.observation
        .map(
          (item) => `
            <article class="summary-strip">
              <span class="subdued">记一笔</span>
              <strong>${escapeHtml(item)}</strong>
            </article>
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
  const blueprint = state.siteData.predictions.blueprint;

  $("#predictions-header").innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h3>${escapeHtml(copy.title)}</h3>
    </div>
    <span class="signal-pill is-ghost">${escapeHtml(copy.note)}</span>
  `;

  $("#prediction-blueprint").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.blueprintTitle)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(copy.blueprintTag)}</span>
    </div>
    <ol class="blueprint-list">
      ${blueprint.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
    </ol>
    <div class="schema-card">
      <span class="schema-label">结构化输出</span>
      <pre>${escapeHtml(JSON.stringify(blueprint.schema, null, 2))}</pre>
    </div>
  `;

  $("#prediction-list").innerHTML = state.siteData.predictions.items
    .map(
      (item) => `
        <article class="prediction-card">
          <div class="prediction-head">
            <div>
              <p class="eyebrow">${escapeHtml(item.stageLabel)}</p>
              <h4>${escapeHtml(item.matchLabel)}</h4>
            </div>
            <div class="prediction-score">
              <span class="confidence-pill">${escapeHtml(item.statusText)} / ${escapeHtml(item.winner)} ${escapeHtml(item.confidence)}%</span>
              <span class="upset-pill">冷门指数 ${escapeHtml(item.upset)}</span>
            </div>
          </div>
          <div class="scoreboard">
            <div class="team-side">
              ${renderBadge({ code: item.teamA.code, logo: item.teamA.logo })}
              <div>
                <div class="team-name">${escapeHtml(item.teamA.code)}</div>
                <div class="team-sub">${escapeHtml(item.timeLabel)}</div>
              </div>
            </div>
            <div class="score">${escapeHtml(item.status === "upcoming" ? "VS" : item.actualScore)}</div>
            <div class="team-side right">
              <div>
                <div class="team-name">${escapeHtml(item.teamB.code)}</div>
                <div class="team-sub">禅断偏向 ${escapeHtml(item.winner)}</div>
              </div>
              ${renderBadge({ code: item.teamB.code, logo: item.teamB.logo })}
            </div>
          </div>
          <div class="confidence-track">
            <div class="confidence-fill" style="width: ${item.confidence}%"></div>
          </div>
          <div class="factor-list">
            ${item.factors
              .map(
                (factor) => `
                  <div class="summary-strip">
                    <span class="subdued">证据</span>
                    <strong>${escapeHtml(factor)}</strong>
                  </div>
                `,
              )
              .join("")}
          </div>
          <div class="risk-line">
            <span class="risk-pill">${escapeHtml(item.headline)}</span>
            <span class="subdued">${escapeHtml(item.risk)}</span>
          </div>
          <p class="prediction-copy">${escapeHtml(item.line)}</p>
        </article>
      `,
    )
    .join("");
}

function renderDataBrief() {
  const copy = state.siteData.copy.sections.dataBrief;

  $("#data-brief").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h3>${escapeHtml(copy.title)}</h3>
      </div>
      <span class="panel-tag">${escapeHtml(copy.tag || "数据说明")}</span>
    </div>
    <p class="prediction-copy">${escapeHtml(copy.body)}</p>
    <div class="roadmap-grid">
      ${state.siteData.dataBrief.items
        .map(
          (item) => `
            <div>
              <h4>${escapeHtml(item.label)}</h4>
              <p>${escapeHtml(item.value)}</p>
            </div>
          `,
        )
        .join("")}
    </div>
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
  renderDataBrief();
  renderViewVisibility();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.currentView = viewButton.dataset.view;
      renderViewVisibility();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const teamButton = event.target.closest("[data-team]");
    if (teamButton) {
      state.currentTeam = teamButton.dataset.team;
      renderTeamSwitcher();
      renderTeamDetail();
      return;
    }

    const playerButton = event.target.closest("[data-player]");
    if (playerButton) {
      state.currentPlayer = playerButton.dataset.player;
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
    $("#hero-copy").innerHTML = `
      <p class="eyebrow">加载失败</p>
      <h2>官网数据还没准备好。</h2>
      <p class="hero-text">${escapeHtml(error.message || "站点数据文件未发布或路径配错。")}</p>
    `;
  }
}

init();
