import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildScheduleData } from "./build-self-use-data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultProjectRoot = path.resolve(__dirname, "..");
const PLAYER_PORTRAIT_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".avif"];

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const ANALYSIS_SOURCE_LIMIT = 10;
const ANALYSIS_SOURCE_ROOT = "https://lolesports.com";
const ANALYSIS_DISCOVERY_URL = "https://lolesports.com/en-US/news";

function resolveBuildPaths(options = {}) {
  const projectRoot = options.projectRoot || defaultProjectRoot;
  const appRoot = options.appRoot || path.join(projectRoot, "app");
  const dataRoot = options.dataRoot || path.join(appRoot, "data");
  return {
    projectRoot,
    appRoot,
    dataRoot,
    tencentPlayerProfilesPath:
      options.tencentPlayerProfilesPath || path.join(dataRoot, "tencent-player-profiles.json"),
    outputPath: options.outputPath || path.join(dataRoot, "site-data.json"),
    inlineOutputPath: options.inlineOutputPath || path.join(dataRoot, "site-data.inline.js"),
    analysisLibraryPath: options.analysisLibraryPath || path.join(dataRoot, "match-analysis-library.json"),
    sapphireKnowledgePath:
      options.sapphireKnowledgePath || path.join(projectRoot, "知识库", "蓝宝石结构化知识库.json"),
    playerAssetDir: options.playerAssetDir || path.join(appRoot, "assets", "players"),
  };
}

function resolveRuntimeEnv(runtimeEnv = {}) {
  return {
    GEMINI_API_KEY: runtimeEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: runtimeEnv.GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  };
}

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

const FOCUS_TEAM_IDS = ["BLG", "JDG", "AL", "WBG", "LNG", "TES", "NIP", "WE", "GEN", "G2", "BFX", "LOUD", "LYON", "TSW"];

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
    strengths: ["中段再布置能力强", "关键团敢找角度", "拖长局面后仍有翻盘可能"],
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
  NIP: {
    identity: "上野肯把局面先搅热，再看双 C 顺势跟刀，比赛常从第一波碰撞就见火气",
    strengths: ["上半区碰撞欲望强", "肯打第一手", "局面热起来时敢把团接到底"],
    flaw: "局势若被拖成细账，第二拍常会慢，补位和回线也容易露缝",
    risk: "若前两波出手没打出血量差，后面容易被迫用站位去还前账",
    monk: "老衲看 NIP，像刚换刃的新刀，锋气是有的，章法还在磨。它若先得手，会追着把局面点燃；可一旦先手失准，后面补漏便显得重。",
  },
  WE: {
    identity: "更肯先把线站稳，再靠中野把节奏往前挪，重心在秩序，不在乱战",
    strengths: ["线权处理整齐", "中野回身快", "劣势时不轻易乱脚步"],
    flaw: "真要收口时往往少半步狠劲，优势局偶尔会给对面拖回第二条命",
    risk: "若前中期资源换得太软，后面会被逼着打自己不爱的硬团",
    monk: "老衲看 WE，底子是正的，线与线之间也衔得住；可它最缺的不是耐心，是临门那一脚的狠。若局势久拖不决，收官处最容易添麻烦。",
  },
  GEN: {
    identity: "中野把局面捏得极稳，兵线、河道与团前站位是一整套章法，极少白送回合",
    strengths: ["中后段秩序极稳", "资源控制细", "优势局收口能力强"],
    flaw: "过于讲秩序时，若被人硬扯进连续乱战，前两拍也会先被打出火花",
    risk: "若前期两线同时失血，它也得先花时辰把中轴扶正",
    monk: "老衲看 GEN，像把磨透的冷刃，平时不喧哗，真到落刀时极少偏。想翻它的盘，光拼勇不够，得先把它那口稳气拆散。",
  },
  G2: {
    identity: "脑子活，转线快，常用非常规换位和节奏岔口把人带出熟路",
    strengths: ["中段转线多变", "敢做非常规落子", "临场找角度能力强"],
    flaw: "局势若被人逼成正面账本，它也会露出前排不够厚、硬解不够稳的问题",
    risk: "若前段换线和试探都没赚到时间，后面会被迫正面接算力题",
    monk: "老衲看 G2，像会走偏门的棋客，不怕路歪，只怕对手不跟。可若对面硬把桌子摆正，它那些奇手就得先过一遍真功夫。",
  },
  BFX: {
    identity: "起手敢碰，节拍偏快，喜欢把前期资源点打成高频换血和硬接触",
    strengths: ["前期敢争", "上野肯碰第一波", "局势热时正面不怯"],
    flaw: "中段布线和回收不够细，若前账没赚到，后面容易自己把门打开",
    risk: "若先锋和第一条龙都慢半拍，整队会被迫一边补线一边挨揍",
    monk: "老衲看 BFX，锐气不缺，敢把刀先伸出去；可锐气若不能换成实账，后头的布线与回收就会变得很重。",
  },
  LOUD: {
    identity: "更看中野先起势，再让双边往两翼铺开，团里靠冲击和包夹去拆站位",
    strengths: ["野辅愿意抢第一口气", "侧翼包夹速度快", "局势热时敢接第二手"],
    flaw: "正面若被人先卡住阵形，前后排衔接就会松，整波团容易一分为二",
    risk: "若中线守不住，双边再想绕也只是在替正面补洞",
    monk: "老衲看 LOUD，最怕它先把边翼点着，一旦从侧面撕开，正面的人就很难站稳。可它的病也明白，正面一旦先垮，侧翼再快也是救火。",
  },
  LYON: {
    identity: "更仰赖上野双点去开局，再看双 C 把团战伤害续满，能打能拖",
    strengths: ["上野带头能力强", "双 C 团战伤害厚", "逆风也敢找一手翻身角度"],
    flaw: "中轴若先掉拍，整队会先裂成两截，资源和站位也不再一口气",
    risk: "若前十五分钟被连续压掉河道与视野，后面只能靠个人手法补局",
    monk: "老衲看 LYON，牌面不薄，真能翻人的点在上野先挑破口；可一旦中线先被人压塌，后头多半要靠选手自己往回救。",
  },
  TSW: {
    identity: "下手直，节拍硬，肯把先锋、小龙和团前先手连成一串去打",
    strengths: ["资源点意图直接", "团前技能衔接清楚", "敢把第一波硬顶出来"],
    flaw: "若连续接不到前两口资源，后面会被对面借兵线和视野反卡节奏",
    risk: "中线一旦先亏，双边再想抬手就会先被迫看野区脸色",
    monk: "老衲看 TSW，像把直刀，出得快，去得直，砍中时很利索；可直刀也怕被人拨开，一偏就容易露全身。",
  },
};

const FOCUS_PLAYERS = [
  { id: "bin", name: "Bin", role: "上路", teamCode: "BLG", watch: "边线敢压，见口就追，最容易把上路打成单点破局；毛病也在这里，手热时站位会伸过河道，给反手留缝。" },
  { id: "xun", name: "XUN", role: "打野", teamCode: "BLG", watch: "管的是 BLG 第一口气。河道先踩住，先锋先碰到，整队的刀就会一齐往前走；若前两趟慢拍，锋口会先钝。" },
  { id: "knight", name: "Knight", role: "中路", teamCode: "BLG", watch: "强在把线权、转线和团前脚步拆得细。中段若由他把局心拢住，整队章法会很整；若被逼着长时间守线，BLG 的中轴会先沉。" },
  { id: "viper", name: "Viper", role: "下路", teamCode: "BLG", watch: "收束能力极强，残局给半步就能把伤害算满；可前排若先断，他再稳也得先替全队还站位的债。" },
  { id: "on", name: "ON", role: "辅助", teamCode: "BLG", watch: "价值全在先手准不准、回身稳不稳。开团若正，BLG 能一口压进；回身若慢，后排会先吃满苦头。" },

  { id: "xiaoxu", name: "Xiaoxu", role: "上路", teamCode: "JDG", watch: "偏稳，愿意先把兵线和身位守住，给队伍留第二拍；但若被硬扯进连续乱战，他的节奏会被迫提前交。" },
  { id: "junjia", name: "JunJia", role: "打野", teamCode: "JDG", watch: "看点在资源起手和河道顺序。若他先把第一层视野搭稳，JDG 才能把中后段秩序接上；若野区先失血，后头就得先补账。" },
  { id: "hongq", name: "HongQ", role: "中路", teamCode: "JDG", watch: "更像运转轴，不抢戏，重在转线衔接和团前站位；若被人压着守中线，JDG 的回合会少很多。" },
  { id: "gala", name: "GALA", role: "下路", teamCode: "JDG", watch: "打的是正面算力和清账能力。队伍给出正面站位时，他很会把伤害打成实账；可若前排散，输出位也会被迫后撤。" },
  { id: "vampire", name: "Vampire", role: "辅助", teamCode: "JDG", watch: "更重秩序和衔接，擅长把团前站位理顺；可一旦局面被人抬快，第一拍也会显得保守。" },

  { id: "flandre", name: "Flandre", role: "上路", teamCode: "AL", watch: "线和团都够老，擅长替全队把边线与团前位置垫好；但他真要往前顶时，需要队友一起给第二拍。" },
  { id: "tarzan", name: "Tarzan", role: "打野", teamCode: "AL", watch: "决定 AL 出刀角度的人。若他先把节拍抬起来，AL 的连续碰撞会很凶；若前两波换不到东西，后头反而容易急。" },
  { id: "shanks", name: "Shanks", role: "中路", teamCode: "AL", watch: "中段最敢接刀，线权一旦到手就愿意先把局抬快；可快气上头时，回身补线和补位也会一起松。" },
  { id: "hope", name: "Hope", role: "下路", teamCode: "AL", watch: "更像后手收账的人，前排给得住，他会把团里该吃的伤害全吃满；可队形一散，他也很难独自补窟窿。" },
  { id: "kael", name: "Kael", role: "辅助", teamCode: "AL", watch: "偏主动，敢开第一手，也敢把视野往前顶；真病在于第一拍若开歪，AL 会整队一起被带偏。" },

  { id: "zika", name: "zika", role: "上路", teamCode: "WBG", watch: "强在对线顶压力和团前抢位，能替 WBG 把上半区撑住；若线先亏，他后面那些侧翼空间也会一起缩。" },
  { id: "jiejie", name: "jiejie", role: "打野", teamCode: "WBG", watch: "看的是中段再布置。若他能把第二轮视野和资源顺好，WBG 很会在中段找回局面；若野区先漏，整队腾挪会变补漏。" },
  { id: "xiaohu", name: "Xiaohu", role: "中路", teamCode: "WBG", watch: "重在控线和第二拍转线，比赛越长越能看出他理局的功夫；可前盘若被人逼着还账，中段调度也会先耗掉。" },
  { id: "elk", name: "Elk", role: "下路", teamCode: "WBG", watch: "手上有冲劲，正面会找机会往前补刀口；可若队形不整，他也容易被迫把自己送进乱局。" },
  { id: "erha", name: "Erha", role: "辅助", teamCode: "WBG", watch: "偏敢动，愿意替队伍先开门；但第一拍若没开到点上，WBG 很容易从这里开始散节奏。" },

  { id: "sheer", name: "sheer", role: "上路", teamCode: "LNG", watch: "更像稳边点，擅长把线守成可用局；若要他长时间孤身扛高压，LNG 整个边线的伸展会先收。" },
  { id: "croco", name: "Croco", role: "打野", teamCode: "LNG", watch: "决定 LNG 能不能把稳字写出来。若他起手不乱，整队资源取舍很清楚；若前期被对面强扯节奏，他也会先忙着补洞。" },
  { id: "bulldog", name: "BullDoG", role: "中路", teamCode: "LNG", watch: "中轴型中单，强在团前脚步和中线控场；可比赛一旦被拉进高频乱战，他的舒展会先被打断。" },
  { id: "one_xn", name: "1xn", role: "下路", teamCode: "LNG", watch: "更像稳着吃经济、等中段接团的人。正面保护若够，他的输出不会乱；保护若断，LNG 的后手就会少一层。" },
  { id: "missing", name: "Missing", role: "辅助", teamCode: "LNG", watch: "强在团前秩序和转线搭桥。若他先把站位理好，LNG 会很稳；若被人逼着打第一拍，他也得先交保命作业。" },

  { id: "player369", name: "369", role: "上路", teamCode: "TES", watch: "正面敢顶，能把团前空间硬撑出来；但若队伍节拍乱，他也容易跟着一起把站位压过头。" },
  { id: "naiyou", name: "naiyou", role: "打野", teamCode: "TES", watch: "一旦起手敢，TES 整队就敢。河道和先锋若先被他碰到，正面火力会抬得很高；若节拍乱，他也容易被迫硬接坏团。" },
  { id: "creme", name: "Creme", role: "中路", teamCode: "TES", watch: "敢把中线和侧翼都抬快，局热起来时很会追刀；可若队形先散，他也容易为了补回合把自己送进乱战。" },
  { id: "jackeylove", name: "JackeyLove", role: "下路", teamCode: "TES", watch: "打的是气势和输出上限。队形一整，他能把团战抬到很高；队形一乱，他也会跟着把刀送到过深的位置。" },
  { id: "hang", name: "Hang", role: "辅助", teamCode: "TES", watch: "第一拍若开准，TES 很容易一口压进；可真病也在这，开歪一次，整队会一起露出前后排脱节的口子。" },

  { id: "hoya", name: "HOYA", role: "上路", teamCode: "NIP", watch: "会主动把边线往前压，帮 NIP 先点着上半区；但手一热，身位也容易给反手留门。" },
  { id: "guwon", name: "Guwon", role: "打野", teamCode: "NIP", watch: "决定 NIP 第一波能不能打出真血量差。若他先把第一层资源咬住，整队会很敢冲；若没咬住，后面会先忙着补课。" },
  { id: "care", name: "Care", role: "中路", teamCode: "NIP", watch: "擅长在中段把局势接上，跟上野一起把第二拍抬起来；可若前期先被压线，他的接刀空间会先变窄。" },
  { id: "assum", name: "Assum", role: "下路", teamCode: "NIP", watch: "更像跟着全队气势起落的收尾点。正面若给得住，他能把输出补满；若全队先乱，他很难独自兜底。" },
  { id: "zhuo", name: "Zhuo", role: "辅助", teamCode: "NIP", watch: "敢开门，也敢把视野往前顶，局热时很有存在感；可第一拍若交空，NIP 的队形会先歪。" },

  { id: "cube", name: "Cube", role: "上路", teamCode: "WE", watch: "重在稳线和团前落位，能替 WE 扛住上半区的第一层压力；但若被迫长时间单点顶高压，反手空间会很小。" },
  { id: "monki", name: "Monki", role: "打野", teamCode: "WE", watch: "更像补位型打野，擅长把第一波野区和线权顺起来；可若比赛被抬太快，他先要做的是替队伍补秩序。" },
  { id: "karis", name: "Karis", role: "中路", teamCode: "WE", watch: "强在中线秩序和中段衔接。若他把中线站稳，WE 的章法就完整；若中线先掉拍，后头收官会更软。" },
  { id: "about", name: "About", role: "下路", teamCode: "WE", watch: "偏稳着吃线和接团，队伍给出完整阵形时输出很规矩；可若比赛被拖成连续对冲，他很难靠个人去硬抬天花板。" },
  { id: "yaoyao", name: "yaoyao", role: "辅助", teamCode: "WE", watch: "更看回身和补位，不是乱开的类型。若 WE 能把节拍控住，他会把团前层次理得很顺；若被强提速，也会先忙。" },

  { id: "kiin", name: "Kiin", role: "上路", teamCode: "GEN", watch: "边线与团前都极稳，能把该吃的线和该顶的位置都做满；你很少看见他白送回合。" },
  { id: "canyon", name: "Canyon", role: "打野", teamCode: "GEN", watch: "比赛的中枢转轴。若他先把野区与河道顺住，GEN 的资源表会非常漂亮；若被抢了前两口，整队也得先改章法。" },
  { id: "chovy", name: "Chovy", role: "中路", teamCode: "GEN", watch: "中线一旦立住，GEN 的秩序就像钉死。对手若不能先拆他的线和脚步，后面多半都在跟他的局走。" },
  { id: "ruler", name: "Ruler", role: "下路", teamCode: "GEN", watch: "残局算得极细，阵形完整时最会把输出收成实账；可若前排先散，他也得先交身位去还秩序。" },
  { id: "duro", name: "Duro", role: "辅助", teamCode: "GEN", watch: "重在把团前站位和视野层次搭稳，不抢戏，但很关键。正是这口稳，才让 GEN 很少白掉回合。" },

  { id: "brokenblade", name: "BrokenBlade", role: "上路", teamCode: "G2", watch: "敢走边线高压，也敢接奇形怪状的对位。若他先把边线带出岔口，G2 的换位和奇手就更好落。" },
  { id: "skewmond", name: "SkewMond", role: "打野", teamCode: "G2", watch: "喜欢把比赛带出熟路，前两波路径很会做文章；可若被人看穿节拍，G2 的花活会先少一层。" },
  { id: "caps", name: "Caps", role: "中路", teamCode: "G2", watch: "中段最会拆局的人，转线、换位和团前拉扯都敢玩；可若比赛被逼成正面算力题，他也得先补稳字。" },
  { id: "hans_sama", name: "Hans Sama", role: "下路", teamCode: "G2", watch: "重在团里持续输出和跟队友连段。队友给出奇手时，他很会顺势补刀；可前排若先塌，站位也会先被掐。" },
  { id: "labrov", name: "Labrov", role: "辅助", teamCode: "G2", watch: "敢先动，也敢陪着做非常规转线。若第一拍做成，G2 的局很怪也很难防；可空一拍，后头会被逼回正面。" },

  { id: "clear", name: "Clear", role: "上路", teamCode: "BFX", watch: "会替队伍先把上半区顶出去，线一顺就敢继续往前压；可局势若不顺，边线很快会从优势点变成补漏点。" },
  { id: "raptor", name: "Raptor", role: "打野", teamCode: "BFX", watch: "敢碰第一波，比赛快不快看他先手。若他在河道先拿住脚步，BFX 会很凶；若没拿住，后头就得一边补线一边挨打。" },
  { id: "vicla", name: "VicLa", role: "中路", teamCode: "BFX", watch: "中路线一旦舒服，敢把局直接抬快；可如果中线先被按住，整队那些连续碰撞也会先失准。" },
  { id: "diable", name: "Diable", role: "下路", teamCode: "BFX", watch: "偏进攻，正面会找机会往前补伤害；可阵形一乱，自己也容易跟着被卷进坏团。" },
  { id: "kellin", name: "Kellin", role: "辅助", teamCode: "BFX", watch: "愿意替队伍先开门，前期视野也敢做深；若第一拍没开到点上，整队节奏会从这里掉半拍。" },

  { id: "xyno", name: "xyno", role: "上路", teamCode: "LOUD", watch: "能替队伍从边路找第二个进场角度，打得开时很烦；可正面若先塌，侧翼也很难再发力。" },
  { id: "youngjae", name: "YoungJae", role: "打野", teamCode: "LOUD", watch: "是 LOUD 第一口气的来源。若他把第一波节拍抬起来，边翼包夹会很快；若野区先亏，整队就只能补正面。" },
  { id: "envy", name: "Envy", role: "中路", teamCode: "LOUD", watch: "更像承上启下的中线。若中线站得住，LOUD 才能把包夹和反包夹做成；若中线先塌，双边就会像散兵。" },
  { id: "bull", name: "Bull", role: "下路", teamCode: "LOUD", watch: "团里敢跟第二拍，阵形一整时能把伤害灌满；但前排若先散，他很难再把残局拉回正轨。" },
  { id: "redbert", name: "RedBert", role: "辅助", teamCode: "LOUD", watch: "敢动，愿意陪打野把第一口气顶出去。若他先开对了门，LOUD 的夹击就会很快；若开空，正面会先掉秩序。" },

  { id: "dhokla", name: "Dhokla", role: "上路", teamCode: "LYON", watch: "能替队伍把上半区先扛起来，也敢从边线找主动；但若中线先掉拍，他这点主动也很难久留。" },
  { id: "inspired", name: "Inspired", role: "打野", teamCode: "LYON", watch: "是 LYON 第一层翻盘感的来源。若他先把资源点咬住，整队就敢继续往前找角度；若第一层没拿住，后头全靠个人硬撑。" },
  { id: "saint", name: "Saint", role: "中路", teamCode: "LYON", watch: "看的是中线站得住站不住。若他能稳住中枢，双边才有得打；若中线先漏，整队会先裂成两截。" },
  { id: "berserker", name: "Berserker", role: "下路", teamCode: "LYON", watch: "团战伤害够厚，阵形整时很会把输出铺满；可前排若先被拆，很多账都得他自己扛。" },
  { id: "isles", name: "Isles", role: "辅助", teamCode: "LYON", watch: "擅长跟打野一起找第一层开门位，若视野与站位先做稳，LYON 正面会硬很多；若被人先断节拍，回身会忙。" },

  { id: "pun", name: "Pun", role: "上路", teamCode: "TSW", watch: "边线处理直接，敢替队伍把上路线先抬出去；但若中线先出问题，他这层主动会先失效。" },
  { id: "hizto", name: "Hizto", role: "打野", teamCode: "TSW", watch: "比赛快不快就看他肯不肯先接第一口资源。若他先把先锋和河道踩住，TSW 很敢跟；若没踩住，后头会被人借线反卡。" },
  { id: "dire", name: "Dire", role: "中路", teamCode: "TSW", watch: "更偏稳中求进，中线若守得住，双边的直刀就能落下去；若守不住，整队会先失去抬节奏的轴。" },
  { id: "eddie", name: "Eddie", role: "下路", teamCode: "TSW", watch: "打的是正面连续输出，前排若能替他撑住半步，他会把团战伤害补得很满；若前排散，后头就难算。" },
  { id: "bie", name: "Bie", role: "辅助", teamCode: "TSW", watch: "偏直给，先手和团前视野都很直接。若第一拍开到了，TSW 会很像一把直刀；若开偏，自己也会先露全身。" },
];

function resolvePlayerPortrait(playerId, paths) {
  for (const ext of PLAYER_PORTRAIT_EXTENSIONS) {
    const assetPath = path.join(paths.playerAssetDir, `${playerId}${ext}`);
    if (existsSync(assetPath)) {
      return `./assets/players/${playerId}${ext}`;
    }
  }
  return "";
}

async function loadTencentPlayerProfiles(paths) {
  try {
    const raw = await readFile(paths.tencentPlayerProfilesPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.players || {};
  } catch {
    return {};
  }
}

async function loadSapphireKnowledge(playerProfiles, paths) {
  try {
    const raw = await readFile(paths.sapphireKnowledgePath, "utf8");
    const parsed = JSON.parse(raw);
    const players = Object.fromEntries(
      Object.entries(parsed.players || {}).map(([playerId, item]) => {
        const profile = playerProfiles[playerId];
        const profileHeroes = buildPlayerHeroPool(profile)
          .map((hero) => hero.heroCnName || hero.heroName)
          .filter(Boolean)
          .slice(0, 4);
        return [
          playerId,
          {
            ...item,
            id: playerId,
            name: profile?.displayName || item.name || playerId,
            teamCode: profile?.teamCode || item.teamCode || "",
            role: profile?.role || item.role || "",
            heroPool: [...new Set([...(item.heroSignals || []), ...profileHeroes])].slice(0, 5),
          },
        ];
      }),
    );

    const teams = Object.fromEntries(
      Object.entries(parsed.teams || {}).map(([teamCode, item]) => {
        const roster = Object.entries(playerProfiles)
          .filter(([, profile]) => profile?.teamCode === teamCode)
          .map(([playerId, profile]) => ({
            id: playerId,
            name: profile.displayName,
            role: profile.role,
            heroPool: buildPlayerHeroPool(profile)
              .map((hero) => hero.heroCnName || hero.heroName)
              .filter(Boolean)
              .slice(0, 3),
          }));

        return [
          teamCode,
          {
            ...item,
            featuredPlayers: (item.featuredPlayers || []).map((playerId) => players[playerId]).filter(Boolean),
            roster,
          },
        ];
      }),
    );

    return {
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      sourceLabel: parsed.sourceLabel || "manual",
      sources: parsed.sources || [],
      teams,
      players,
    };
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      sourceLabel: "missing",
      sources: [],
      teams: {},
      players: {},
    };
  }
}

function compactPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `${Math.round(num * 100)}%`;
}

function compactNumber(value, digits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return digits === 0 ? `${Math.round(num)}` : `${num.toFixed(digits)}`;
}

function buildPlayerDataStats(profile) {
  if (!profile?.stats) return [];
  const stats = [];
  if (Number.isFinite(Number(profile.stats.kda))) stats.push(`KDA ${compactNumber(profile.stats.kda, 2)}`);
  if (Number.isFinite(Number(profile.stats.damagePerMinute))) stats.push(`分均伤害 ${compactNumber(profile.stats.damagePerMinute, 0)}`);
  if (Number.isFinite(Number(profile.stats.killParticipantPercent))) {
    stats.push(`参团 ${compactPercent(profile.stats.killParticipantPercent)}`);
  }
  if (Number.isFinite(Number(profile.stats.creepScorePerGame)) && profile.role !== "辅助") {
    stats.push(`场均补刀 ${compactNumber(profile.stats.creepScorePerGame, 0)}`);
  }
  if (Number.isFinite(Number(profile.stats.wardPlacedPerGame)) && profile.role === "辅助") {
    stats.push(`场均插眼 ${compactNumber(profile.stats.wardPlacedPerGame, 0)}`);
  }
  return stats.slice(0, 3);
}

function buildPlayerHeroPool(profile) {
  const pool = [];
  const seen = new Set();

  function pushHero(hero) {
    if (!hero) return;
    const name = String(hero.heroCnName || hero.heroName || hero.name || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    pool.push(hero);
  }

  (profile?.favoriteHeroes || []).forEach(pushHero);
  (profile?.recentMatches || []).forEach((match) => {
    if (!match?.heroName) return;
    pushHero({
      heroCnName: match.heroName,
      heroName: match.heroName,
      games: match.games ?? 1,
      winRate: Number(match.win) === 1 ? 1 : Number(match.win) === 0 ? 0 : null,
    });
  });

  return pool.slice(0, 3);
}

function buildPlayerHeroPoolBefore(profile, cutoffDate) {
  const cutoff = parseMatchDate(cutoffDate);
  const heroMap = new Map();

  for (const match of profile?.recentMatches || []) {
    const startAt = parseMatchDate(match.startTime || match.matchDate || cutoffDate);
    if (!(startAt < cutoff)) continue;
    const name = String(match.heroName || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const row = heroMap.get(key) || {
      heroCnName: name,
      heroName: name,
      games: 0,
      wins: 0,
      losses: 0,
    };
    row.games += 1;
    if (String(match.winTeamId || "") && String(match.winTeamId) === String(profile.teamId || "")) {
      row.wins += 1;
    }
    heroMap.set(key, row);
  }

  return [...heroMap.values()]
    .map((hero) => ({
      ...hero,
      winRate: hero.games ? hero.wins / hero.games : null,
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 3);
}

function buildPlayerHeroLine(profile) {
  const heroes = buildPlayerHeroPool(profile)
    .map((hero) => {
      const rate = Number.isFinite(Number(hero.winRate)) ? `${Math.round(Number(hero.winRate) * 100)}%` : "";
      const games = Number.isFinite(Number(hero.games)) ? `${hero.games} 局` : "";
      return [hero.heroCnName || hero.heroName, games, rate].filter(Boolean).join(" / ");
    })
    .filter(Boolean);
  return heroes.join(" ｜ ");
}

function buildPlayerRecentFormLine(profile) {
  const recent = profile?.recentMatches?.[0];
  if (!recent) return "";
  return `${recent.teamName} 对 ${recent.fightTeamName} / ${recent.heroName} / ${recent.kill}-${recent.death}-${recent.assist}`;
}

function average(values) {
  const nums = values.map(Number).filter((value) => Number.isFinite(value));
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function getTeamPlayerProfiles(teamCode, playerProfiles) {
  return Object.values(playerProfiles).filter((profile) => profile?.teamCode === teamCode);
}

function buildPlayerHeroLineBefore(profile, cutoffDate) {
  const heroes = buildPlayerHeroPoolBefore(profile, cutoffDate)
    .map((hero) => {
      const rate = Number.isFinite(Number(hero.winRate)) ? `${Math.round(Number(hero.winRate) * 100)}%` : "";
      const games = Number.isFinite(Number(hero.games)) ? `${hero.games} 局` : "";
      return [hero.heroCnName || hero.heroName, games, rate].filter(Boolean).join(" / ");
    })
    .filter(Boolean);
  return heroes.join("；");
}

function buildTeamHeroProfile(teamCode, playerProfiles) {
  const profiles = getTeamPlayerProfiles(teamCode, playerProfiles);
  if (!profiles.length) {
    return {
      heroDepth: 0,
      recentFlex: 0,
      comfortWinRate: 0,
      avgKda: 0,
      avgParticipation: 0,
      summary: `${teamCode} 暂无可用选手池资料`,
    };
  }

  const heroDepth = average(
    profiles.map((profile) => buildPlayerHeroPool(profile).length),
  );
  const recentFlex = average(
    profiles.map((profile) => {
      const uniqueHeroes = new Set(
        (profile?.recentMatches || [])
          .map((match) => String(match?.heroName || "").trim())
          .filter(Boolean),
      );
      return uniqueHeroes.size;
    }),
  );
  const comfortWinRate = average(
    profiles.flatMap((profile) =>
      buildPlayerHeroPool(profile)
        .map((hero) => Number(hero.winRate))
        .filter((value) => Number.isFinite(value)),
    ),
  );
  const avgKda = average(profiles.map((profile) => Number(profile?.stats?.kda)));
  const avgParticipation = average(
    profiles.map((profile) => Number(profile?.stats?.killParticipantPercent)),
  );

  return {
    heroDepth,
    recentFlex,
    comfortWinRate,
    avgKda,
    avgParticipation,
    summary: `${teamCode} 池深 ${heroDepth.toFixed(1)}，近战术切牌 ${recentFlex.toFixed(1)}，舒适池胜率 ${Math.round(
      comfortWinRate * 100,
    )}%`,
  };
}

function buildTeamHeroProfileAt(teamCode, playerProfiles, cutoffDate) {
  const profiles = getTeamPlayerProfiles(teamCode, playerProfiles);
  if (!profiles.length) {
    return {
      heroDepth: 0,
      recentFlex: 0,
      comfortWinRate: 0,
      avgKda: 0,
      avgParticipation: 0,
      summary: `${teamCode} 赛前无可用英雄池资料`,
    };
  }

  const heroPools = profiles.map((profile) => buildPlayerHeroPoolBefore(profile, cutoffDate));
  const historicalMatches = profiles.flatMap((profile) =>
    (profile?.recentMatches || []).filter(
      (match) => parseMatchDate(match.startTime || match.matchDate || cutoffDate) < parseMatchDate(cutoffDate),
    ),
  );
  const heroDepth = average(heroPools.map((pool) => pool.length));
  const recentFlex = average(
    profiles.map((profile) => {
      const cutoff = parseMatchDate(cutoffDate);
      const uniqueHeroes = new Set(
        (profile?.recentMatches || [])
          .filter((match) => parseMatchDate(match.startTime || match.matchDate || cutoffDate) < cutoff)
          .map((match) => String(match?.heroName || "").trim())
          .filter(Boolean),
      );
      return uniqueHeroes.size;
    }),
  );
  const comfortWinRate = average(
    heroPools.flatMap((pool) =>
      pool.map((hero) => Number(hero.winRate)).filter((value) => Number.isFinite(value)),
    ),
  );
  const avgKda = average(
    historicalMatches.map((match) => {
      const kills = Number(match?.kill || 0);
      const assists = Number(match?.assist || 0);
      const deaths = Number(match?.death || 0);
      return (kills + assists) / Math.max(1, deaths);
    }),
  );
  const avgParticipation = 0;

  return {
    heroDepth,
    recentFlex,
    comfortWinRate,
    avgKda,
    avgParticipation,
    summary: `${teamCode} 赛前池深 ${heroDepth.toFixed(1)}，近战术切牌 ${recentFlex.toFixed(1)}，舒适池胜率 ${Math.round(
      comfortWinRate * 100,
    )}%`,
  };
}

function computeHeroProfileEdge(teamA, teamB, playerProfiles) {
  const profileA = buildTeamHeroProfile(teamA, playerProfiles);
  const profileB = buildTeamHeroProfile(teamB, playerProfiles);
  const edge =
    (profileA.heroDepth - profileB.heroDepth) * 2.4 +
    (profileA.recentFlex - profileB.recentFlex) * 1.8 +
    (profileA.comfortWinRate - profileB.comfortWinRate) * 12 +
    (profileA.avgKda - profileB.avgKda) * 1.1 +
    (profileA.avgParticipation - profileB.avgParticipation) * 2.4;

  return {
    edge,
    profileA,
    profileB,
  };
}

function computeHeroProfileEdgeAt(teamA, teamB, playerProfiles, cutoffDate) {
  const profileA = buildTeamHeroProfileAt(teamA, playerProfiles, cutoffDate);
  const profileB = buildTeamHeroProfileAt(teamB, playerProfiles, cutoffDate);
  const edge =
    (profileA.heroDepth - profileB.heroDepth) * 2.4 +
    (profileA.recentFlex - profileB.recentFlex) * 1.8 +
    (profileA.comfortWinRate - profileB.comfortWinRate) * 12 +
    (profileA.avgKda - profileB.avgKda) * 1.1 +
    (profileA.avgParticipation - profileB.avgParticipation) * 2.4;

  return {
    edge,
    profileA,
    profileB,
  };
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

function extractMetaContent(html, key) {
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i");
  return decodeHtmlEntities(html.match(pattern)?.[1] || "");
}

function resolveAnalysisUrl(href) {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `${ANALYSIS_SOURCE_ROOT}${href}`;
  return `${ANALYSIS_SOURCE_ROOT}/${href}`;
}

async function discoverAnalysisUrls() {
  const urls = new Set([
    "https://lolesports.com/news/fst-2026-primer",
    "https://lolesports.com/en-US/news/fst-2026-primer",
  ]);

  try {
    const response = await fetch(ANALYSIS_DISCOVERY_URL, { headers: { "User-Agent": "esports-monk/1.0" } });
    if (!response.ok) return [...urls];
    const html = await response.text();
    for (const match of html.matchAll(/href="([^"]*\/news\/[^"#?]+)"/g)) {
      const url = resolveAnalysisUrl(match[1]);
      if (url) urls.add(url);
      if (urls.size >= ANALYSIS_SOURCE_LIMIT + 4) break;
    }
  } catch {}

  return [...urls].slice(0, ANALYSIS_SOURCE_LIMIT + 2);
}

function buildEntityAliases(teamMap, playerProfiles) {
  const aliases = {};
  for (const [teamCode, team] of teamMap.entries()) {
    const rawTerms = [team?.name, team?.shortName].filter(Boolean).map((term) => String(term).trim());
    const terms = rawTerms.filter((term) => {
      if (/^[a-z]{1,2}$/i.test(term)) return false;
      if (/^[a-z]{1,2}$/i.test(teamCode) && term === team?.shortName) return false;
      return true;
    });
    if (!/^[a-z]{1,2}$/i.test(teamCode)) {
      terms.unshift(teamCode);
    }
    aliases[teamCode] = [...new Set(terms)];
  }
  for (const profile of Object.values(playerProfiles)) {
    if (!profile?.displayName || !profile?.teamCode) continue;
    const terms = [profile.displayName, profile.realName].filter(Boolean).filter((term) => term.length >= 3);
    if (terms.length) aliases[profile.displayName] = terms;
  }
  return aliases;
}

function countMentions(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms
    .filter(Boolean)
    .map((term) => String(term).trim().toLowerCase())
    .filter(Boolean)
    .reduce((sum, term) => {
      if (term.length <= 4 && /^[a-z0-9.+-]+$/i.test(term)) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
        return sum + (regex.test(haystack) ? 1 : 0);
      }
      return sum + (haystack.includes(term) ? 1 : 0);
      }, 0);
}

function dedupeAnalysisDocs(docs) {
  const seen = new Set();
  const unique = [];
  for (const doc of docs) {
    const mentionKeys = Object.keys(doc.mentions || {}).sort().join(",");
    const key = `${doc.title}|${mentionKeys}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(doc);
  }
  return unique;
}

async function fetchAnalysisLibrary(teamMap, playerProfiles, paths) {
  const aliases = buildEntityAliases(teamMap, playerProfiles);
  const urls = await discoverAnalysisUrls();
  const docs = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "esports-monk/1.0" } });
      if (!response.ok) continue;
      const html = await response.text();
      const title =
        extractMetaContent(html, "og:title") ||
        html.match(/<title>(.*?)<\/title>/i)?.[1]?.replace(/^LoL Esports\s*\|\s*/i, "").trim() ||
        url.split("/").pop() ||
        "";
      const description = extractMetaContent(html, "description") || extractMetaContent(html, "og:description");
      const bodyText = stripHtml(html);
      const excerpt = bodyText.slice(0, 2200);
      const mentionMap = Object.fromEntries(
        Object.entries(aliases)
          .map(([key, terms]) => [key, countMentions(`${title} ${description} ${excerpt}`, terms)])
          .filter(([, score]) => score > 0),
      );

      if (!Object.keys(mentionMap).length && !/first stand|lpl|jdg|blg|gen|g2/i.test(`${title} ${description} ${excerpt}`)) {
        continue;
      }

      docs.push({
        id: `analysis-${docs.length + 1}`,
        url,
        title,
        description,
        excerpt,
        mentions: mentionMap,
      });
    } catch {}
  }

  const cleanedDocs = dedupeAnalysisDocs(docs);

  const library = {
    generatedAt: Date.now(),
    source: "lolesports-news",
    count: cleanedDocs.length,
    items: cleanedDocs,
  };

  await writeFile(paths.analysisLibraryPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
  return library;
}

function pickRelevantAnalysis(match, playerProfiles, analysisLibrary) {
  if (!analysisLibrary?.items?.length) return [];
  const tournamentLabel = `${match.tournamentLabel} ${match.stageName}`.toLowerCase();
  const playerNames = Object.values(playerProfiles)
    .filter((profile) => profile?.teamCode === match.teamA.shortName || profile?.teamCode === match.teamB.shortName)
    .map((profile) => profile.displayName);

  const queryTerms = [
    match.teamA.shortName,
    match.teamB.shortName,
    match.tournamentLabel,
      match.stageName,
      ...playerNames,
    ];
  const tournamentTerms = /first stand|fst/i.test(tournamentLabel)
    ? ["first stand", "fst"]
    : /lpl/i.test(tournamentLabel)
      ? ["lpl", "split", "playoffs"]
      : [];

  return analysisLibrary.items
    .map((doc) => {
      const docText = `${doc.title} ${doc.description} ${doc.excerpt}`;
      const mentionScore =
        (doc.mentions?.[match.teamA.shortName] || 0) * 3 +
        (doc.mentions?.[match.teamB.shortName] || 0) * 3 +
        countMentions(docText, queryTerms) +
        countMentions(docText, tournamentTerms);
      return { ...doc, score: mentionScore };
    })
    .filter((doc) => doc.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...doc }) => doc);
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
  "这一路值钱",
  "真正贵在",
  "最值钱的一层",
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

function buildTeamRecordAt(data, teamCode, cutoffDate) {
  const cutoff = parseMatchDate(cutoffDate);
  const completed = sortMatches(
    getTeamMatches(data, teamCode).filter(
      (match) => match.status === "completed" && parseMatchDate(match.matchDate) < cutoff,
    ),
    -1,
  );
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
    liveMatch: null,
    nextKnownMatch: null,
    nextMatch: null,
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
    streakLabel: streakCount ? `${streakCount}连${streakType === "win" ? "胜" : "负"}` : "无连续走势",
  };
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

function playerKnifeFocus(player) {
  const roleMap = {
    上路: "边线压制、换血胆气与先手身位",
    打野: "河道起手、资源先后与第一口节拍",
    中路: "中线线权、转线衔接与团前落位",
    下路: "伤害收束、团战站位与残局清账",
    辅助: "开门时机、团前视野与回身补位",
  };
  return roleMap[player.role] || "对位细节与关键回合";
}

function buildPlayerSummary(player, record, nextMatch, profile) {
  const nextOpponent = nextMatch ? getPerspective(nextMatch, player.teamCode).opponent.shortName : "待定";
  const dataStats = buildPlayerDataStats(profile);
  const heroLine = buildPlayerHeroLine(profile);
  const recentLine = buildPlayerRecentFormLine(profile);
  const statsText = dataStats.length ? `账面上 ${dataStats.join("，")}。` : "";
  const heroText = heroLine ? `近用得最多的是 ${heroLine}。` : "";
  const recentText = recentLine ? `最近一局是 ${recentLine}。` : "";
  return `看 ${player.name}，先看他怎么把 ${playerKnifeFocus(player)} 落成实账。${statsText}${heroText}${recentText}${player.teamCode} 下一场对 ${nextOpponent}，这一路刀口若先咬住，整队气口往往会跟着偏过去。`;
}

function buildPlayerTags(player, profile) {
  const tagMap = {
    上路: ["边线刀口", "先手胆气", "团前站位"],
    打野: ["河道起手", "资源先后", "节拍源头"],
    中路: ["中线线权", "转线衔接", "局心轻重"],
    下路: ["输出收束", "残局清账", "团战身位"],
    辅助: ["开门时机", "回身补位", "视野层次"],
  };
  const base = tagMap[player.role] || ["主队关切", "关键回合", "细节落点"];
  const stats = buildPlayerDataStats(profile);
  return [...base, ...stats].slice(0, 4);
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

    const strengthLine = TEAM_STYLE_GUIDE[teamCode]?.strengths?.[0]
      ? `眼下最能撑住局面的，是 ${TEAM_STYLE_GUIDE[teamCode].strengths[0]}。`
      : "";

    return {
      id: teamCode,
      name: team.name,
      shortName: teamCode,
      logo: team.logo,
      region: REGION_MAP[teamCode] || "LPL",
      stageAward: stageAwards[teamCode] || "",
      rankingLabel: ranking ? `第一赛段第 ${ranking.rank}` : "当前未进榜",
      summary: `${teamCode} 当前系列赛 ${record.wins}-${record.losses}，单局 ${record.gameWins}-${record.gameLosses}，近五场 ${record.recentText}。${strengthLine}`,
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

function buildPlayerCards(records, playerProfiles, paths) {
  return FOCUS_PLAYERS.map((player) => {
    const record = records[player.teamCode];
    const profile = playerProfiles[player.id] || null;
    const favoriteHeroes = buildPlayerHeroPool(profile);
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
      portrait: resolvePlayerPortrait(player.id, paths),
      summary: buildPlayerSummary(player, record, nextMatch, profile),
      note: buildPlayerHeroLine(profile) ? `${player.watch} 常用英雄看 ${buildPlayerHeroLine(profile)}。` : player.watch,
      tags: buildPlayerTags(player, profile),
      profileStats: buildPlayerDataStats(profile),
      favoriteHeroes,
      track,
      observation: [
        player.watch,
        buildPlayerHeroLine(profile) ? `常用英雄：${buildPlayerHeroLine(profile)}。` : "",
        buildPlayerRecentFormLine(profile) ? `最近一局：${buildPlayerRecentFormLine(profile)}。` : "",
        latestMatch
          ? `最近一场 ${player.teamCode} ${latestMatch.scoreFor}:${latestMatch.scoreAgainst} ${latestMatch.opponent.shortName}。`
          : "最近一场还没有确认结果。",
        record.nextKnownMatch
          ? `下一场已确认对阵 ${getPerspective(record.nextKnownMatch, player.teamCode).opponent.shortName}。`
          : "下一场对阵还没确认。",
      ].filter(Boolean),
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

function computeConfidence(recordA, recordB, headToHead, restDiffHours, bo, profileEdge = 0) {
  const winRateEdge = recordA.winRate - recordB.winRate;
  const diffEdge = recordA.gameDiff - recordB.gameDiff;
  const recentEdge = recordA.recentWins - recordB.recentWins;
  const h2hEdge = headToHead.edge * 6;
  const restEdge = clamp(restDiffHours / 12, -2, 2) * 2.5;
  const boEdge = bo === "BO5" ? 2 : 0;
  const heroEdge = clamp(profileEdge, -6, 6);
  const raw = 55 + winRateEdge * 0.32 + diffEdge * 0.9 + recentEdge * 3.8 + h2hEdge + restEdge + boEdge + heroEdge;
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

function findHeadToHeadAt(data, teamA, teamB, cutoffDate) {
  const cutoff = parseMatchDate(cutoffDate);
  const matches = sortMatches(
    data.matches.filter(
      (match) =>
        match.status === "completed" &&
        parseMatchDate(match.matchDate) < cutoff &&
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
    text: matches.length ? `赛前旧账 ${teamA} ${teamAWins}-${teamBWins} ${teamB}` : "赛前无已完结交手",
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

function buildPredictionFactors(match, recordA, recordB, headToHead, restA, restB, playerProfiles, analysisDocs) {
  const styleA = TEAM_STYLE_GUIDE[match.teamA.shortName];
  const styleB = TEAM_STYLE_GUIDE[match.teamB.shortName];
  const heroEdge = computeHeroProfileEdge(match.teamA.shortName, match.teamB.shortName, playerProfiles);
  const focusNotes = FOCUS_PLAYERS.filter(
    (player) => player.teamCode === match.teamA.shortName || player.teamCode === match.teamB.shortName,
  )
    .slice(0, 2)
    .map((player) => {
      const profile = playerProfiles[player.id];
      const statLine = buildPlayerDataStats(profile).join("，");
      const heroLine = buildPlayerHeroLine(profile);
      return {
        label: `刀口 / ${player.name}`,
        value: [player.watch, statLine, heroLine ? `常用 ${heroLine}` : ""].filter(Boolean).join(" "),
      };
    });
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
    {
      label: "英雄池",
      value: `${heroEdge.profileA.summary}；${heroEdge.profileB.summary}`,
    },
    styleA && styleB
      ? {
          label: "门风",
          value: `${match.teamA.shortName} ${styleA.strengths[0]}，${match.teamB.shortName} ${styleB.strengths[0]}`,
        }
      : null,
    analysisDocs?.length
      ? {
          label: "近闻",
          value: analysisDocs.map((doc) => doc.title).join("；"),
        }
      : null,
    ...focusNotes,
    {
      label: "局制",
      value: `${match.bo} / ${match.tournamentLabel} / ${match.stageName}`,
    },
  ].filter(Boolean);
}

function buildPredictionFactorsAt(match, recordA, recordB, headToHead, restA, restB, playerProfiles, cutoffDate) {
  const styleA = TEAM_STYLE_GUIDE[match.teamA.shortName];
  const styleB = TEAM_STYLE_GUIDE[match.teamB.shortName];
  const heroEdge = computeHeroProfileEdgeAt(match.teamA.shortName, match.teamB.shortName, playerProfiles, cutoffDate);
  const focusNotes = FOCUS_PLAYERS.filter(
    (player) => player.teamCode === match.teamA.shortName || player.teamCode === match.teamB.shortName,
  )
    .slice(0, 2)
    .map((player) => {
      const profile = playerProfiles[player.id];
      const heroLine = buildPlayerHeroLineBefore(profile, cutoffDate);
      return {
        label: `刀口 / ${player.name}`,
        value: [player.watch, heroLine ? `赛前常用 ${heroLine}` : ""].filter(Boolean).join(" "),
      };
    });

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
    {
      label: "英雄池",
      value: `${heroEdge.profileA.summary}；${heroEdge.profileB.summary}`,
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

function buildPredictionKnowledge(match, playerProfiles, analysisDocs, teamDossiers = {}, sapphireKnowledge = {}) {
  const teamAGuide = TEAM_STYLE_GUIDE[match.teamA.shortName];
  const teamBGuide = TEAM_STYLE_GUIDE[match.teamB.shortName];
  const sapphireTeamA = sapphireKnowledge?.teams?.[match.teamA.shortName];
  const sapphireTeamB = sapphireKnowledge?.teams?.[match.teamB.shortName];
  const heroEdge = computeHeroProfileEdge(match.teamA.shortName, match.teamB.shortName, playerProfiles);
  const focusPlayers = FOCUS_PLAYERS.filter(
    (player) => player.teamCode === match.teamA.shortName || player.teamCode === match.teamB.shortName,
  ).map((player) => {
    const profile = playerProfiles[player.id];
    const sapphirePlayer = sapphireKnowledge?.players?.[player.id];
    const stats = buildPlayerDataStats(profile).join("，");
    const heroLine = [...new Set([...(sapphirePlayer?.heroPool || []), ...buildPlayerHeroPool(profile).map((hero) => hero.heroCnName || hero.heroName).filter(Boolean)])]
      .slice(0, 4)
      .join("、");
    const style = sapphirePlayer?.style || player.watch;
    const weakness = sapphirePlayer?.weakness ? `毛病在${sapphirePlayer.weakness}。` : "";
    return `${player.name}：${style}${weakness}${stats ? ` 账面 ${stats}。` : ""}${heroLine ? ` 英雄多见 ${heroLine}。` : ""}`;
  });
  return {
    teamA: `${teamDossiers[match.teamA.shortName] ||
      (teamAGuide
      ? `${match.teamA.shortName}：门风是${teamAGuide.identity}；长板是${teamAGuide.strengths.join("、")}；明病是${teamAGuide.flaw}；翻船点是${teamAGuide.risk}`
      : `${match.teamA.shortName}：当前没有补充风格注释。`)}${
      sapphireTeamA
        ? ` 另记一笔：赢法多落在${sapphireTeamA.winCondition}；塌法常见于${sapphireTeamA.failurePattern}`
        : ""
    }`,
    teamB: `${teamDossiers[match.teamB.shortName] ||
      (teamBGuide
      ? `${match.teamB.shortName}：门风是${teamBGuide.identity}；长板是${teamBGuide.strengths.join("、")}；明病是${teamBGuide.flaw}；翻船点是${teamBGuide.risk}`
      : `${match.teamB.shortName}：当前没有补充风格注释。`)}${
      sapphireTeamB
        ? ` 另记一笔：赢法多落在${sapphireTeamB.winCondition}；塌法常见于${sapphireTeamB.failurePattern}`
        : ""
    }`,
    focusPlayers: focusPlayers.length ? focusPlayers.join("；") : "当前没有接入该场重点选手的手法注释。",
    heroPool: `${match.teamA.shortName}：${heroEdge.profileA.summary}；${match.teamB.shortName}：${heroEdge.profileB.summary}`,
    recentAnalysis: analysisDocs?.length
      ? analysisDocs.map((doc) => `${doc.title}：${(doc.description || doc.excerpt).slice(0, 140)}`).join("；")
      : "当前没有抓到最近赛事解读。",
    sapphireSources:
      sapphireTeamA || sapphireTeamB
        ? [...new Set([...(sapphireTeamA?.featuredPlayers || []).map((player) => `${player.name}主看${player.style}`), ...(sapphireTeamB?.featuredPlayers || []).map((player) => `${player.name}主看${player.style}`)])]
            .slice(0, 6)
            .join("；")
        : "当前没有额外视频批注。",
  };
}

function buildTeamDossiers(records, playerProfiles, analysisLibrary, sapphireKnowledge = {}) {
  const dossiers = {};
  for (const teamCode of FOCUS_TEAM_IDS) {
    const guide = TEAM_STYLE_GUIDE[teamCode];
    const record = records[teamCode];
    const sapphireTeam = sapphireKnowledge?.teams?.[teamCode];
    const playerLines = FOCUS_PLAYERS.filter((player) => player.teamCode === teamCode)
      .slice(0, 2)
      .map((player) => {
        const sapphirePlayer = sapphireKnowledge?.players?.[player.id];
        const profile = playerProfiles[player.id];
        const heroLine = [...new Set([...(sapphirePlayer?.heroPool || []), ...buildPlayerHeroPool(profile).map((hero) => hero.heroCnName || hero.heroName).filter(Boolean)])]
          .slice(0, 4)
          .join("、");
        return `${player.name}主看${sapphirePlayer?.style || player.watch}${sapphirePlayer?.weakness ? `，病处在${sapphirePlayer.weakness}` : ""}${heroLine ? `，常用 ${heroLine}` : ""}`;
      });
    const docs = (analysisLibrary?.items || [])
      .filter((doc) => (doc.mentions?.[teamCode] || 0) > 0)
      .slice(0, 2)
      .map((doc) => doc.title);

    dossiers[teamCode] = [
      guide ? `${teamCode} 的门风是${guide.identity}。` : "",
      guide?.strengths?.length ? `长板落在${guide.strengths.join("、")}。` : "",
      guide?.flaw ? `明病在于${guide.flaw}。` : "",
      sapphireTeam?.style ? `按蓝宝石旧稿，这队常走${sapphireTeam.style}` : "",
      sapphireTeam?.winCondition ? `要赢多半靠${sapphireTeam.winCondition}。` : "",
      sapphireTeam?.failurePattern ? `真塌起来常见于${sapphireTeam.failurePattern}。` : "",
      record ? `当前账面 ${record.wins}-${record.losses}，近五 ${record.recentText}，局差 ${signed(record.gameDiff)}。` : "",
      playerLines.length ? `人头上主看${playerLines.join("；")}。` : "",
      docs.length ? `近闻可参 ${docs.join("；")}。` : "",
    ]
      .filter(Boolean)
      .join("");
  }
  return dossiers;
}

function fallbackPredictionCopy(item) {
  const favoredGuide = TEAM_STYLE_GUIDE[item.favoredTeam];
  const underdogGuide = TEAM_STYLE_GUIDE[item.underdogTeam];
  const favoredIdentity = favoredGuide?.identity || `${item.favoredTeam} 更能先把地图重心提起来`;
  const favoredStrength = favoredGuide?.strengths?.[0] || "前段更愿意争先";
  const favoredFlaw = favoredGuide?.flaw || `${item.favoredTeam} 一热起来，脚步就容易压过头`;
  const underdogIdentity = underdogGuide?.identity || `${item.underdogTeam} 更偏后手应对`;
  const underdogRisk = underdogGuide?.risk || `${item.underdogTeam} 若迟迟拿不到主动，后手会越来越重`;
  const playerLines = FOCUS_PLAYERS.filter(
    (player) => player.teamCode === item.favoredTeam || player.teamCode === item.underdogTeam,
  )
    .slice(0, 3)
    .map((player) => `${player.name} 这一点，看的不是热闹，是 ${player.watch}`)
    .join(" ");
  return {
    headline: `老衲先押 ${item.favoredTeam}`,
    line: `老衲看此局，先押 ${item.favoredTeam}，不为别的，只因它在赛前这张账面上更容易先把第一口气抢出来。${favoredStrength} 是它眼下最能压住局面的刀口，${favoredIdentity} 又正好对得上这场的起手路数。若前两波资源先归它手里，河道、边线与团前站位都会顺着它的气往下走，后面多半是它来写章法。\n\n可老衲也不替它遮丑，${favoredFlaw}。这种队最怕赢得太顺，手一热，脚步便会压过应有的分寸，原本该稳着收的回合，反倒会因为贪一口气把口子露给对面。真到转折处，比的不是谁喊得响，而是谁还能守住那一下分寸，不把本该赢的局打成对冲。\n\n再往深处看，${item.underdogTeam} 原是${underdogIdentity}，它若想翻案，路只有一条，先把前十五分钟拖慢，再把 ${item.favoredTeam} 逼进补线、回防和二次落位的苦差里，让这口快气自己泄掉。若做不到，比赛多半还没走到长局，就已经要顺着前手分出生死。${playerLines}`,
    risk: `但 ${item.underdogTeam} 若真把比赛拖进久持之局，${underdogRisk}，老衲这句也得改口。`,
  };
}

function buildHistoricalPredictionHistory(data, teamId, playerProfiles) {
  const completed = sortMatches(
    getTeamMatches(data, teamId).filter(
      (match) =>
        match.status === "completed" &&
        isKnownTeam(match.teamA.shortName) &&
        isKnownTeam(match.teamB.shortName),
    ),
    -1,
  ).slice(0, 4);

  return completed.map((match) => {
    const recordA = buildTeamRecordAt(data, match.teamA.shortName, match.matchDate);
    const recordB = buildTeamRecordAt(data, match.teamB.shortName, match.matchDate);
    const headToHead = findHeadToHeadAt(data, match.teamA.shortName, match.teamB.shortName, match.matchDate);
    const restA = getRestHours(recordA, match.matchDate);
    const restB = getRestHours(recordB, match.matchDate);
    const heroProfileEdge = computeHeroProfileEdgeAt(match.teamA.shortName, match.teamB.shortName, playerProfiles, match.matchDate);
    const confidenceA = computeConfidence(recordA, recordB, headToHead, restA - restB, match.bo, heroProfileEdge.edge);
    const favoredTeam = confidenceA >= 56 ? match.teamA.shortName : match.teamB.shortName;
    const confidence =
      favoredTeam === match.teamA.shortName
        ? confidenceA
        : clamp(100 - confidenceA, 42, 84);
    const predictedScore = buildPredictedScore(match, favoredTeam, confidence);
    const actualScore = `${match.scoreA}:${match.scoreB}`;
    const actualWinner = Number(match.scoreA) > Number(match.scoreB) ? match.teamA.shortName : match.teamB.shortName;
    const fallback = fallbackPredictionCopy({
      favoredTeam,
      underdogTeam: favoredTeam === match.teamA.shortName ? match.teamB.shortName : match.teamA.shortName,
    });

    return {
      id: `history-${teamId}-${match.matchId || match.matchDate}`,
      matchLabel: `${match.teamA.shortName} vs ${match.teamB.shortName}`,
      stageLabel: `${match.tournamentLabel} / ${match.stageName}`,
      timeLabel: `${formatDateLong(match.matchDate)} / ${match.bo}`,
      predictedScore,
      actualScore,
      favoredTeam,
      actualWinner,
      confidence,
      headline: fallback.headline,
      risk: fallback.risk,
      verdict: favoredTeam === actualWinner ? "胜负押中" : "断局失手",
      hitWinner: favoredTeam === actualWinner,
      hitExact: predictedScore === actualScore,
      factors: buildPredictionFactorsAt(match, recordA, recordB, headToHead, restA, restB, playerProfiles, match.matchDate).slice(0, 5),
    };
  });
}

function buildTeamPredictions(data, records, playerProfiles, analysisLibrary, teamDossiers, sapphireKnowledge = {}) {
  return FOCUS_TEAM_IDS.map((teamId) => {
    const record = records[teamId];
    const match = record?.nextKnownMatch || null;
    const history = record ? buildHistoricalPredictionHistory(data, teamId, playerProfiles) : [];
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
        history,
      };
    }

    const recordA = records[match.teamA.shortName];
    const recordB = records[match.teamB.shortName];
    const headToHead = findHeadToHead(data, match.teamA.shortName, match.teamB.shortName);
    const restA = getRestHours(recordA, match.matchDate);
    const restB = getRestHours(recordB, match.matchDate);
    const heroProfileEdge = computeHeroProfileEdge(match.teamA.shortName, match.teamB.shortName, playerProfiles);
    const confidenceA = computeConfidence(recordA, recordB, headToHead, restA - restB, match.bo, heroProfileEdge.edge);
    const favoredTeam = confidenceA >= 56 ? match.teamA.shortName : match.teamB.shortName;
    const confidence =
      favoredTeam === match.teamA.shortName
        ? confidenceA
        : clamp(100 - confidenceA, 42, 84);
    const predictedScore = buildPredictedScore(match, favoredTeam, confidence);
    const analysisDocs = pickRelevantAnalysis(match, playerProfiles, analysisLibrary);
    const fallback = fallbackPredictionCopy({
      favoredTeam,
      underdogTeam: favoredTeam === match.teamA.shortName ? match.teamB.shortName : match.teamA.shortName,
    });
    const knowledge = buildPredictionKnowledge(match, playerProfiles, analysisDocs, teamDossiers, sapphireKnowledge);

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
      factors: buildPredictionFactors(match, recordA, recordB, headToHead, restA, restB, playerProfiles, analysisDocs),
      headline: fallback.headline,
      line: fallback.line,
      risk: fallback.risk,
      knowledge,
      analysisDocs,
      history,
      resources: {
        seriesRecord: [recordA.wins, recordA.losses, recordB.wins, recordB.losses],
        gameDiff: [recordA.gameDiff, recordB.gameDiff],
        recentForm: [recordA.recentText, recordB.recentText],
        headToHead: headToHead.text,
        restHours: [restA, restB],
        heroProfiles: [heroProfileEdge.profileA, heroProfileEdge.profileB],
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

async function callGeminiJson(prompt, runtimeEnv = {}) {
  const { GEMINI_API_KEY, GEMINI_MODEL } = resolveRuntimeEnv(runtimeEnv);
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

async function buildAiPredictionCopy(predictions, runtimeEnv = {}) {
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
    "说话口吻要像看过万局的老僧在卷边批注，可以直接用“老衲看”“依老衲看”“此局贵在”“病也在此”“若要翻案”这类说法。文字要有古意、有锋芒，但必须让懂比赛的人一眼看懂。",
    "别用翻译腔，别说盘口黑话，别拿空词硬装，更别写成神棍。要像真正懂局的人在落狠话，不像写公告，更不像外国人学中文。",
    "每场输出三个字段：headline、line、risk。",
    "headline 控制在 8 到 16 个汉字，要像判词。",
    "line 控制在 360 到 560 个汉字，分成三个自然段。第一段写看好谁、凭什么；第二段必须写这边真正的毛病、最可能露缝的地方；第三段必须写另一边怎么翻盘，怎么把局拖回自己的路数。",
    "risk 控制在 24 到 48 个汉字，只点最可能打脸的一处变数。",
    "line 要落到节奏、资源、团战次序、边线、收束能力、纪律性、失误点这些真东西上。至少明确写出一处长板、一处毛病、一条翻案路径，还要点到 2 名关键选手，尽量把文字铺满左侧批注框，不要只写半框。",
    "行文可以拽，可以带一点文言批注气，但不能晦涩。允许你在这些边界里自由发挥句式和节奏，不要写成同一个模板反复套壳。",
    "禁止出现这些空话：‘先看他把前两局握在手里’、‘敢不敢把兵线推深’、‘盘面更顺’、‘稳稳收住’、‘看临场发挥’、‘一切皆有可能’、‘这一路值钱’、‘他真正贵在’。",
    "严禁出现这些词：装懂、写上墙、梭哈、嘴硬、当空气、玄学、神谕、天命、阵卷、观席、禅断、盘口、收米、赔率。",
    "不要出现用户、本站、官网、模型、AI、数据源这些词。",
    "把 knowledge 里的队伍门风、选手手法、短板和因子列表揉进断语里，不要原样复述列表。一定要写出队伍特点，像‘先手凶’、‘转线稳’、‘纪律松’、‘容易上头’这种能落地的话。",
    "把 knowledge.recentAnalysis 里的近闻当作外部赛后批注，只能拿来丰富理解，不能编造成确定事实。若近闻和账面冲突，以账面和因子为主。",
    "把 knowledge.sapphireSources 里的旧稿批注当作风格底稿，优先借它写出队伍脾气、选手刀口和老毛病，但别把原话机械复述。",
    "返回 JSON，格式为 { predictions: { [id]: { headline, line, risk } } }。",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  return callGeminiJson(prompt, runtimeEnv);
}

function applyAiPredictionCopy(siteData, aiCopy, runtimeEnv = {}) {
  const { GEMINI_MODEL } = resolveRuntimeEnv(runtimeEnv);
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

export async function generateSiteData(options = {}) {
  const persist = options.persist !== false;
  const runtimeEnv = options.runtimeEnv || process.env;
  const paths = resolveBuildPaths(options.paths || {});
  const data = await buildScheduleData({
    persist,
    projectRoot: paths.projectRoot,
    appRoot: paths.appRoot,
    outputPath: path.join(paths.dataRoot, "tencent-schedule.json"),
  });
  const playerProfiles = await loadTencentPlayerProfiles(paths);
  const sapphireKnowledge = await loadSapphireKnowledge(playerProfiles, paths);
  const teamMap = teamNameLookup(data);
  const analysisLibrary = await fetchAnalysisLibrary(teamMap, playerProfiles, paths);
  const rankingRows = buildRankingRows(data, teamMap);
  const stageAwards = buildStageAwards(data);
  const records = buildAllTeamRecords(data);
  const teamDossiers = buildTeamDossiers(records, playerProfiles, analysisLibrary, sapphireKnowledge);
  const teamCards = buildTeamCards(data, teamMap, records, stageAwards, rankingRows);
  const playerCards = buildPlayerCards(records, playerProfiles, paths);
  const overview = buildOverview(data, teamMap, rankingRows, playerCards);
  const predictions = buildTeamPredictions(
    data,
    records,
    playerProfiles,
    analysisLibrary,
    teamDossiers,
    sapphireKnowledge,
  );

  let siteData = {
    generatedAt: data.generatedAt,
    generatedAtLocal: data.generatedAtLocal,
    copy: {
      ...FALLBACK_COPY,
      nav: NAV_LABELS,
      aiSource: "fallback",
    },
    scrapedProfiles: {
      generatedAt: Number(data.generatedAt || 0),
      count: Object.keys(playerProfiles).length,
    },
    analysisLibrary: {
      generatedAt: Number(analysisLibrary?.generatedAt || Date.now()),
      count: Number(analysisLibrary?.count || 0),
      source: analysisLibrary?.source || "none",
    },
    sapphireKnowledge: {
      generatedAt: sapphireKnowledge.generatedAt,
      sourceLabel: sapphireKnowledge.sourceLabel,
      sourceCount: Number(sapphireKnowledge.sources?.length || 0),
      teamCount: Number(Object.keys(sapphireKnowledge.teams || {}).length),
      playerCount: Number(Object.keys(sapphireKnowledge.players || {}).length),
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

  const aiCopy = await buildAiPredictionCopy(predictions, runtimeEnv);
  siteData = applyAiPredictionCopy(siteData, aiCopy, runtimeEnv);

  if (persist) {
    await mkdir(path.dirname(paths.outputPath), { recursive: true });
    await writeFile(paths.outputPath, `${JSON.stringify(siteData, null, 2)}\n`, "utf8");
    await writeFile(
      paths.inlineOutputPath,
      `window.__SITE_DATA__ = ${JSON.stringify(siteData, null, 2)};\n`,
      "utf8",
    );
  }

  return siteData;
}

async function main() {
  const paths = resolveBuildPaths();
  const siteData = await generateSiteData({ persist: true, runtimeEnv: process.env, paths });

  console.log(
    JSON.stringify(
      {
        ok: true,
        output: paths.outputPath,
        inlineOutput: paths.inlineOutputPath,
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

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
