module.exports = {
  generatedAtLocal: "2026/03/22 15:11:00",
  copy: {
    brandName: "电竞高僧",
    signalText: "官源同步于",
    sections: {
      predictions: {
        title: "高僧预测",
        note: "只围绕下一场已确认对阵，给出比分判断和高僧见解。"
      }
    }
  },
  overview: {
    liveMatches: [],
    upcomingMatches: [
      {
        id: "13207",
        tournamentLabel: "First Stand",
        stageName: "淘汰赛",
        bo: "BO5",
        matchDate: "2026-03-22 21:00:00",
        status: "upcoming",
        scoreA: 0,
        scoreB: 0,
        teamA: { name: "G2", shortName: "G2", logo: "https://img.crawler.qq.com/lolwebvideo/20250618120148/0654f8b663a3973eb8debcf929cb919e/0" },
        teamB: { name: "BLG", shortName: "BLG", logo: "https://img.crawler.qq.com/lolwebvideo/20250618144525/49342dadcecf162e8ac94fad6eb91540/0" }
      }
    ]
  },
  teams: {
    items: [
      {
        id: "BLG",
        name: "BLG",
        shortName: "BLG",
        logo: "https://img.crawler.qq.com/lolwebvideo/20250618144525/49342dadcecf162e8ac94fad6eb91540/0",
        region: "LPL",
        stageAward: "第一赛段冠军",
        rankingLabel: "第一赛段第 1",
        summary: "BLG 当前系列赛 13-4，单局 36-15，近五场 胜 胜 胜 胜 胜。",
        statement: "第一赛段冠军在手。老衲看 BLG，像一柄先出鞘的快刀，见口就劈，见缝就进。",
        metrics: [
          { "label": "胜率", "text": "76%" },
          { "label": "局差", "text": "+21" },
          { "label": "近五", "text": "5/5" },
          { "label": "走势", "text": "5连胜" }
        ],
        docket: [{ "label": "下一场", "value": "BLG vs G2", "note": "3月22日 21:00 / First Stand BO5" }],
        history: [{ "opponent": "JDG", "result": "3:0", "note": "First Stand / 半决赛", "outcome": "win" }],
        overview: { "seriesRecord": "13-4", "gameRecord": "36-15", "winRate": "76%", "streakLabel": "5连胜" }
      }
    ]
  },
  players: {
    items: [
      {
        id: "bin",
        name: "Bin",
        role: "上路",
        teamCode: "BLG",
        portrait: "https://img.crawler.qq.com/lolwebvideo/20260112121119/0b288e418ee7c01d10b8818d8bdd0454/0",
        summary: "看 Bin，先看他怎么把边线压制、换血胆气与先手身位落成实账。",
        note: "边线敢压，见口就追，最容易把上路打成单点破局。",
        tags: ["边线刀口", "先手胆气", "团前站位"],
        profileStats: ["KDA 4.24", "分均伤害 735", "参团 48%"],
        favoriteHeroes: [
          { "heroCnName": "赛恩", "heroLogo": "http://game.gtimg.cn/images/lol/act/img/champion/Sion.png", "games": 1, "winRate": 1 },
          { "heroCnName": "纳尔", "heroLogo": "http://game.gtimg.cn/images/lol/act/img/champion/Gnar.png", "games": 1, "winRate": 1 }
        ],
        track: [{ "label": "下一场", "value": "BLG vs G2", "note": "3月22日 21:00 / First Stand" }],
        observation: ["边线敢压，见口就追，最容易把上路打成单点破局；毛病也在这里，手热时站位会伸过河道，给反手留缝。"],
        history: [{ "opponent": "JDG", "result": "3:0", "note": "First Stand / 淘汰赛", "outcome": "win" }]
      }
    ]
  },
  predictions: {
    items: [
      {
        id: "prediction-BLG",
        teamId: "BLG",
        matchLabel: "G2 vs BLG",
        stageLabel: "First Stand / 淘汰赛",
        timeLabel: "3月22日周日 21:00 / BO5",
        statusText: "赛前",
        confidence: 58,
        predictedScore: "2:3",
        verdict: "BLG 稍占上风",
        headline: "老衲先押 BLG",
        line: "老衲看此局，先押 BLG。它眼下最能压住局面的，是前中期争先意愿强，上中野肯先落子。若前两波资源先归它手里，比赛大半要顺着它的刀口走。\n\n病也在此，热起来时脚步会压得过深，纪律偶尔松一口。若该收的回合不收，口子就会露给对面。\n\nG2 若想翻案，得把前十五分钟拖慢，再把 BLG 逼进补线、回防和二次落位的苦差里。",
        risk: "若前段换线和试探都没赚到时间，G2 后段多半还得硬接正面算力题。",
        factors: [
          { "label": "账面", "value": "G2 3-1，BLG 13-4" },
          { "label": "近势", "value": "G2 胜 胜 负 胜，BLG 胜 胜 胜 胜 胜" },
          { "label": "英雄池", "value": "G2 池深 3.0；BLG 池深 2.0，舒适池胜率 100%" }
        ],
        history: [
          { "id": "history-1", "matchLabel": "BLG vs JDG", "stageLabel": "First Stand / 淘汰赛", "timeLabel": "3月22日周日 02:00 / BO5", "predictedScore": "3:1", "actualScore": "3:0", "verdict": "胜负押中", "headline": "老衲先押 BLG" }
        ]
      }
    ]
  }
};
