const state = {
  currentView: "overview",
  currentTeam: "T1",
  currentPlayer: "faker",
};

const liveMatches = [
  {
    league: "LCK Spring 2026",
    status: "LIVE 31:24",
    blue: { code: "T1", name: "T1", record: "8-2" },
    red: { code: "HLE", name: "Hanwha Life", record: "7-3" },
    score: "2 - 1",
    tag: "关键局",
  },
  {
    league: "LPL Spring 2026",
    status: "LIVE 18:02",
    blue: { code: "BLG", name: "Bilibili Gaming", record: "7-2" },
    red: { code: "TES", name: "Top Esports", record: "6-3" },
    score: "1 - 1",
    tag: "团战局",
  },
];

const upcomingMatches = [
  {
    league: "LPL Spring 2026",
    left: "JDG",
    right: "WBG",
    date: "03/14",
    time: "17:00",
    note: "季后赛卡位战",
  },
  {
    league: "LCK Spring 2026",
    left: "GEN",
    right: "DK",
    date: "03/14",
    time: "19:30",
    note: "版本理解对撞",
  },
  {
    league: "LPL Spring 2026",
    left: "BLG",
    right: "T1",
    date: "03/15",
    time: "20:00",
    note: "国际赛预演味道",
  },
];

const teams = [
  {
    id: "T1",
    name: "T1",
    region: "LCK",
    power: 97,
    record: "8-2",
    tempo: "中后期决策稳定，视野和边线处理最干净。",
    form: "近五场 4 胜 1 负",
    statement:
      "T1 的核心优势不是操作炫，而是容错高。中野能把乱战重新拧回他们的节奏。",
    roster: [
      { role: "Top", name: "Zeus", note: "单带牵制，杰斯/奎桑提稳定" },
      { role: "Jungle", name: "Oner", note: "前 15 分钟控图强，节奏点干净" },
      { role: "Mid", name: "Faker", note: "后期指挥轴，瑞兹/沙皇仍是信号" },
      { role: "ADC", name: "Gumayusi", note: "线权稳，团战收口能力高" },
      { role: "Support", name: "Keria", note: "游走联动极强，版本理解领先" },
    ],
    heat: [
      { label: "前期节奏", value: 82 },
      { label: "BP 容错", value: 90 },
      { label: "后期决策", value: 96 },
      { label: "资源控制", value: 88 },
    ],
    history: [
      { opponent: "HLE", result: "2:1", note: "先锋团翻盘，Faker 沙皇接管" },
      { opponent: "DK", result: "2:0", note: "下路线权压穿，Keria 漫游成功" },
      { opponent: "GEN", result: "1:2", note: "前中期领先，后两局 BP 吃亏" },
    ],
  },
  {
    id: "BLG",
    name: "Bilibili Gaming",
    region: "LPL",
    power: 94,
    record: "7-2",
    tempo: "先锋团和河道第一波最凶，打出手感会连续滚雪球。",
    form: "近五场 4 胜 1 负",
    statement:
      "BLG 的爆点在中野辅，只要第一波节奏成，比赛会被他们拖进高强度打架模式。",
    roster: [
      { role: "Top", name: "Bin", note: "压制力顶，单带威慑强" },
      { role: "Jungle", name: "Xun", note: "前期开团角度凶，节奏起伏也大" },
      { role: "Mid", name: "Knight", note: "法核和刺客双线稳定" },
      { role: "ADC", name: "Elk", note: "高伤害输出点，反打手感好" },
      { role: "Support", name: "ON", note: "开团意识好，偶尔会送一脚" },
    ],
    heat: [
      { label: "前期节奏", value: 95 },
      { label: "BP 容错", value: 80 },
      { label: "后期决策", value: 84 },
      { label: "资源控制", value: 86 },
    ],
    history: [
      { opponent: "TES", result: "2:1", note: "双 C 伤害拉满，三局都在打架" },
      { opponent: "JDG", result: "2:0", note: "Xun 早期控龙节奏很稳" },
      { opponent: "LNG", result: "0:2", note: "失误偏多，边线被连续抓穿" },
    ],
  },
  {
    id: "GEN",
    name: "Gen.G",
    region: "LCK",
    power: 92,
    record: "7-3",
    tempo: "偏运营，资源转化效率高，版本答案找得很快。",
    form: "近五场 3 胜 2 负",
    statement:
      "GEN 的优势是体系成熟，没那么炸，但很难被一波打死。",
    roster: [
      { role: "Top", name: "Kiin", note: "坦战双修，线权稳定" },
      { role: "Jungle", name: "Canyon", note: "资源控制顶级，视野压迫感强" },
      { role: "Mid", name: "Chovy", note: "发育怪物，伤害吃得最满" },
      { role: "ADC", name: "Peyz", note: "持续输出稳定" },
      { role: "Support", name: "Lehends", note: "奇招多，联动强" },
    ],
    heat: [
      { label: "前期节奏", value: 76 },
      { label: "BP 容错", value: 92 },
      { label: "后期决策", value: 94 },
      { label: "资源控制", value: 95 },
    ],
    history: [
      { opponent: "DK", result: "2:0", note: "野区节奏完全压制" },
      { opponent: "T1", result: "2:1", note: "后期运营更稳，决策赢了" },
      { opponent: "KT", result: "1:2", note: "红蓝方 BP 失血太多" },
    ],
  },
];

const players = [
  {
    id: "faker",
    name: "Faker",
    team: "T1",
    role: "Mid",
    avatar: "F",
    quote: "Focus. Clarity. Victory.",
    intro: "职业赛对线不一定最凶，但全局处理和决策权还在顶层。",
    rank: { server: "KR", tier: "Challenger #14", lp: 1120, winRate: 58, recent: "7W 3L" },
    tags: ["节奏枢纽", "后期指挥", "版本适应快"],
    pool: [
      { name: "Azir", value: 92, games: 8 },
      { name: "Ryze", value: 80, games: 5 },
      { name: "Orianna", value: 74, games: 4 },
      { name: "Sylas", value: 68, games: 3 },
    ],
    history: [
      { result: "Win", vs: "HLE", kda: "4 / 1 / 11", csd: "+13", note: "后期团战控制拉满" },
      { result: "Win", vs: "DK", kda: "6 / 2 / 7", csd: "+9", note: "前中期连动优秀" },
      { result: "Loss", vs: "GEN", kda: "2 / 3 / 5", csd: "-4", note: "第二局 BP 压力大" },
    ],
  },
  {
    id: "knight",
    name: "Knight",
    team: "BLG",
    role: "Mid",
    avatar: "K",
    quote: "打得赢就别拖，能开就狠狠干。",
    intro: "对线和爆发都在上限区间，比赛进入混战时威胁值很高。",
    rank: { server: "KR", tier: "Grandmaster #33", lp: 890, winRate: 55, recent: "6W 4L" },
    tags: ["法核主轴", "开团补刀", "上限爆发"],
    pool: [
      { name: "Ahri", value: 90, games: 7 },
      { name: "Syndra", value: 84, games: 6 },
      { name: "Corki", value: 66, games: 3 },
      { name: "Yone", value: 61, games: 2 },
    ],
    history: [
      { result: "Win", vs: "TES", kda: "8 / 2 / 9", csd: "+16", note: "河道团秒后排" },
      { result: "Win", vs: "JDG", kda: "5 / 1 / 8", csd: "+6", note: "对线期控线稳" },
      { result: "Loss", vs: "LNG", kda: "3 / 4 / 4", csd: "-2", note: "侧翼切入失败" },
    ],
  },
  {
    id: "chovy",
    name: "Chovy",
    team: "GEN",
    role: "Mid",
    avatar: "C",
    quote: "只要资源够干净，比赛会自己倾斜。",
    intro: "资源利用率和补刀领先仍然夸张，拖到中后期就越来越恶心。",
    rank: { server: "KR", tier: "Challenger #8", lp: 1240, winRate: 60, recent: "8W 2L" },
    tags: ["资源怪物", "中后期爆点", "发育压制"],
    pool: [
      { name: "Corki", value: 94, games: 9 },
      { name: "Azir", value: 81, games: 6 },
      { name: "Tristana", value: 72, games: 4 },
      { name: "Yone", value: 58, games: 2 },
    ],
    history: [
      { result: "Win", vs: "T1", kda: "7 / 1 / 6", csd: "+18", note: "中期资源全吃满" },
      { result: "Win", vs: "DK", kda: "4 / 0 / 10", csd: "+14", note: "团战站位太稳" },
      { result: "Loss", vs: "KT", kda: "2 / 2 / 5", csd: "+7", note: "边线协防慢了一拍" },
    ],
  },
];

const predictions = [
  {
    match: "BLG vs T1",
    time: "03/15 20:00",
    winner: "T1",
    confidence: 64,
    upset: 31,
    factors: ["后期决策更稳", "红蓝方 BP 容错高", "辅助游走更强"],
    risk: "BLG 只要前两波河道打穿，T1 会被强行拖进乱战。",
    line: "佛光偏向 T1，但这场真别全押。BLG 一旦滚起来，谁都得挨嘴巴子。",
  },
  {
    match: "GEN vs DK",
    time: "03/14 19:30",
    winner: "GEN",
    confidence: 71,
    upset: 18,
    factors: ["资源控制顶级", "中路线权更稳", "版本英雄掌控更全"],
    risk: "如果 DK 前期抓边成功，GEN 的标准运营会被打断。",
    line: "这场像铁算盘对冲动派。GEN 只要别犯病，胜率就在他们手里。",
  },
  {
    match: "JDG vs WBG",
    time: "03/14 17:00",
    winner: "JDG",
    confidence: 56,
    upset: 42,
    factors: ["野区路线更完整", "中期运营更紧", "大龙视野处理更稳"],
    risk: "WBG 的单点爆发高，比赛一乱就开始玄学。",
    line: "这是节目效果局。JDG 理性更强，WBG 失控起来也真敢狠狠干。",
  },
];

const heroMatch = {
  league: "LPL vs LCK Spotlight",
  headline: "BLG 对 T1",
  summary: "最适合做第一版高僧预测的示范局",
  detail: "赛前 12 小时给概率，赛前 30 分钟根据首发、版本、Rank 活跃度刷新。",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function teamBadge(code) {
  return `<div class="team-badge">${code}</div>`;
}

function playerHeadshot(player) {
  return `<div class="player-headshot">${player.avatar}</div>`;
}

function renderHero() {
  $("#hero-match").innerHTML = `
    <p class="eyebrow">${heroMatch.league}</p>
    <h3>${heroMatch.headline}</h3>
    <p class="prediction-copy">${heroMatch.summary}</p>
    <div class="scoreboard">
      <div class="team-side">
        ${teamBadge("BLG")}
        <div>
          <div class="team-name">BLG</div>
          <div class="team-sub">河道打架强度拉满</div>
        </div>
      </div>
      <div class="score">VS</div>
      <div class="team-side right">
        <div>
          <div class="team-name">T1</div>
          <div class="team-sub">后期处理更稳</div>
        </div>
        ${teamBadge("T1")}
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-strip">
        <span class="subdued">赛前刷新</span>
        <strong>12h / 30m</strong>
      </div>
      <div class="summary-strip">
        <span class="subdued">高僧置信</span>
        <strong>64%</strong>
      </div>
      <div class="summary-strip">
        <span class="subdued">爆冷指数</span>
        <strong>31</strong>
      </div>
    </div>
    <p class="list-note">${heroMatch.detail}</p>
  `;
}

function renderOverview() {
  $("#live-list").innerHTML = liveMatches
    .map(
      (match) => `
        <article class="match-card">
          <div class="match-meta">
            <span class="league-tag">${match.league}</span>
            <span class="status-live">${match.status}</span>
          </div>
          <div class="scoreboard">
            <div class="team-side">
              ${teamBadge(match.blue.code)}
              <div>
                <div class="team-name">${match.blue.name}</div>
                <div class="team-sub">${match.blue.record}</div>
              </div>
            </div>
            <div class="score">${match.score}</div>
            <div class="team-side right">
              <div>
                <div class="team-name">${match.red.name}</div>
                <div class="team-sub">${match.red.record}</div>
              </div>
              ${teamBadge(match.red.code)}
            </div>
          </div>
          <div class="match-meta">
            <span class="tag-live">${match.tag}</span>
            <span class="subdued">局间预测实时刷新</span>
          </div>
        </article>
      `
    )
    .join("");

  $("#upcoming-list").innerHTML = upcomingMatches
    .map(
      (match) => `
        <article class="schedule-card">
          <div class="schedule-meta">
            <span class="league-tag">${match.league}</span>
            <span class="subdued">${match.date} ${match.time}</span>
          </div>
          <div class="scoreboard">
            <div class="team-side">
              ${teamBadge(match.left)}
              <div>
                <div class="team-name">${match.left}</div>
                <div class="team-sub">赛前看点</div>
              </div>
            </div>
            <div class="score">VS</div>
            <div class="team-side right">
              <div>
                <div class="team-name">${match.right}</div>
                <div class="team-sub">等待首发</div>
              </div>
              ${teamBadge(match.right)}
            </div>
          </div>
          <div class="schedule-meta">
            <span class="subdued">${match.note}</span>
            <span class="panel-tag">提醒</span>
          </div>
        </article>
      `
    )
    .join("");

  $("#ranking-list").innerHTML = [...teams]
    .sort((a, b) => b.power - a.power)
    .map(
      (team, index) => `
        <article class="ranking-item">
          <div class="summary-strip">
            <span class="rank-index">${index + 1}</span>
            ${teamBadge(team.id)}
            <div>
              <div class="team-name">${team.name}</div>
              <div class="team-sub">${team.region} · ${team.record}</div>
            </div>
          </div>
          <div class="rank-score">${team.power}</div>
        </article>
      `
    )
    .join("");

  const featured = players[0];
  $("#spotlight-player").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">Featured Player</p>
        <h3>重点选手</h3>
      </div>
      <span class="panel-tag">今天看他</span>
    </div>
    <div class="spotlight-grid">
      ${playerHeadshot(featured)}
      <div>
        <h3>${featured.name}</h3>
        <p class="subdued">${featured.team} · ${featured.role}</p>
        <p class="prediction-copy">${featured.intro}</p>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-strip">
        <span class="subdued">Rank</span>
        <strong>${featured.rank.tier}</strong>
      </div>
      <div class="summary-strip">
        <span class="subdued">胜率</span>
        <strong>${featured.rank.winRate}%</strong>
      </div>
      <div class="summary-strip">
        <span class="subdued">近期</span>
        <strong>${featured.rank.recent}</strong>
      </div>
    </div>
    <p class="player-quote">“${featured.quote}”</p>
  `;
}

function renderTeamSwitcher() {
  $("#team-switcher").innerHTML = teams
    .map(
      (team) =>
        `<button class="chip-btn ${team.id === state.currentTeam ? "is-active" : ""}" data-team="${team.id}">${team.id}</button>`
    )
    .join("");
}

function renderTeamDetail() {
  const team = teams.find((item) => item.id === state.currentTeam);

  $("#team-summary").innerHTML = `
    <div class="team-title">
      <div class="team-logo">${team.id}</div>
      <div>
        <p class="eyebrow">${team.region}</p>
        <h3>${team.name}</h3>
        <div class="meta-row">
          <span class="stat-pill">Power ${team.power}</span>
          <span class="stat-pill">${team.record}</span>
          <span class="stat-pill">${team.form}</span>
        </div>
      </div>
    </div>
    <p class="prediction-copy">${team.tempo}</p>
    <p class="team-statement">${team.statement}</p>
    <div class="summary-grid">
      <div class="summary-strip">
        <span class="subdued">版本适配</span>
        <strong>${Math.min(99, team.power - 3)}</strong>
      </div>
      <div class="summary-strip">
        <span class="subdued">系列赛稳定性</span>
        <strong>${team.power}</strong>
      </div>
      <div class="summary-strip">
        <span class="subdued">节目效果</span>
        <strong>${team.id === "BLG" ? "高" : "中高"}</strong>
      </div>
    </div>
  `;

  $("#roster-list").innerHTML = team.roster
    .map(
      (member) => `
        <article class="roster-card">
          <div>
            <div class="team-name">${member.name}</div>
            <div class="team-sub">${member.note}</div>
          </div>
          <span class="role-pill">${member.role}</span>
        </article>
      `
    )
    .join("");

  $("#team-history").innerHTML = team.history
    .map(
      (series) => `
        <article class="history-row">
          <div>
            <div class="team-name">vs ${series.opponent}</div>
            <div class="team-sub">${series.note}</div>
          </div>
          <span class="result-pill ${series.result.startsWith("0") || series.result.startsWith("1:2") ? "loss" : ""}">${series.result}</span>
        </article>
      `
    )
    .join("");

  $("#team-heat").innerHTML = `
    <div class="heat-list">
      ${team.heat
        .map(
          (item) => `
            <div class="heat-item">
              <div class="stat-row">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
              </div>
              <div class="heat-bar">
                <div class="heat-fill" style="width: ${item.value}%"></div>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
    <p class="list-note">这块上线后别只给一个总分。用户真正爱看的是，为什么这队今天能赢，或者为什么会翻车。</p>
  `;

  $$("#team-switcher .chip-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentTeam = button.dataset.team;
      renderTeamSwitcher();
      renderTeamDetail();
    });
  });
}

function renderPlayerSwitcher() {
  $("#player-switcher").innerHTML = players
    .map(
      (player) =>
        `<button class="chip-btn ${player.id === state.currentPlayer ? "is-active" : ""}" data-player="${player.id}">${player.name}</button>`
    )
    .join("");
}

function renderPlayerDetail() {
  const player = players.find((item) => item.id === state.currentPlayer);

  $("#player-card").innerHTML = `
    <div class="player-card-head">
      ${playerHeadshot(player)}
      <div>
        <p class="eyebrow">${player.team} · ${player.role}</p>
        <h3>${player.name}</h3>
        <p class="prediction-copy">${player.intro}</p>
      </div>
    </div>
    <div class="player-tags">
      ${player.tags.map((tag) => `<span class="player-badge">${tag}</span>`).join("")}
    </div>
    <p class="player-quote">“${player.quote}”</p>
  `;

  $("#rank-card").innerHTML = `
    <div class="rank-grid">
      <article class="rank-card">
        <div class="rank-header">
          <strong>${player.rank.server}</strong>
          <span class="panel-tag">${player.rank.tier}</span>
        </div>
        <div class="summary-grid">
          <div class="summary-strip">
            <span class="subdued">LP</span>
            <strong>${player.rank.lp}</strong>
          </div>
          <div class="summary-strip">
            <span class="subdued">胜率</span>
            <strong>${player.rank.winRate}%</strong>
          </div>
          <div class="summary-strip">
            <span class="subdued">近期</span>
            <strong>${player.rank.recent}</strong>
          </div>
        </div>
      </article>
      <p class="list-note">Rank 数据只做辅助变量。别拿天梯状态直接替代职业赛表现，这个坑很蠢。</p>
    </div>
  `;

  $("#champion-pool").innerHTML = `
    <div class="pool-list">
      ${player.pool
        .map(
          (champion) => `
            <article class="champion-item">
              <div class="pool-meta">
                <span class="team-name">${champion.name}</span>
                <span class="subdued">${champion.games} 场</span>
              </div>
              <div class="champion-bar">
                <div class="champion-fill" style="width: ${champion.value}%"></div>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;

  $("#player-history").innerHTML = player.history
    .map(
      (item) => `
        <article class="history-row">
          <div>
            <div class="history-meta">
              <strong>vs ${item.vs}</strong>
              <span class="result-pill ${item.result === "Loss" ? "loss" : ""}">${item.result}</span>
            </div>
            <div class="team-sub">${item.note}</div>
          </div>
          <div>
            <div class="team-name">${item.kda}</div>
            <div class="team-sub">CSD ${item.csd}</div>
          </div>
        </article>
      `
    )
    .join("");

  $$("#player-switcher .chip-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentPlayer = button.dataset.player;
      renderPlayerSwitcher();
      renderPlayerDetail();
    });
  });
}

function renderPredictions() {
  $("#prediction-list").innerHTML = predictions
    .map(
      (prediction) => `
        <article class="prediction-card">
          <div class="prediction-head">
            <div>
              <p class="eyebrow">${prediction.time}</p>
              <h4>${prediction.match}</h4>
            </div>
            <div class="prediction-score">
              <span class="confidence-pill">看好 ${prediction.winner} ${prediction.confidence}%</span>
              <span class="upset-pill">爆冷指数 ${prediction.upset}</span>
            </div>
          </div>
          <div class="confidence-track">
            <div class="confidence-fill" style="width: ${prediction.confidence}%"></div>
          </div>
          <div class="factor-list">
            ${prediction.factors
              .map((factor) => `<div class="summary-strip"><span class="subdued">证据因子</span><strong>${factor}</strong></div>`)
              .join("")}
          </div>
          <div class="risk-line">
            <span class="risk-pill">风险提示</span>
            <span class="subdued">${prediction.risk}</span>
          </div>
          <p class="prediction-copy">${prediction.line}</p>
        </article>
      `
    )
    .join("");
}

function bindViewSwitching() {
  $$(".nav-btn[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.view;
      $$(".nav-btn[data-view]").forEach((item) =>
        item.classList.toggle("is-active", item.dataset.view === state.currentView)
      );
      $$(".view").forEach((view) =>
        view.classList.toggle("is-active", view.id === state.currentView)
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function init() {
  renderHero();
  renderOverview();
  renderTeamSwitcher();
  renderTeamDetail();
  renderPlayerSwitcher();
  renderPlayerDetail();
  renderPredictions();
  bindViewSwitching();
}

init();
