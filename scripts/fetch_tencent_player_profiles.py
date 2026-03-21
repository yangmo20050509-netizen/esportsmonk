from __future__ import annotations

import json
import math
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SITE_DATA_PATH = ROOT / "app" / "data" / "site-data.json"
SCHEDULE_DATA_PATH = ROOT / "app" / "data" / "tencent-schedule.json"
OUTPUT_PATH = ROOT / "app" / "data" / "tencent-player-profiles.json"
PLAYER_ASSET_DIR = ROOT / "app" / "assets" / "players"

TARGET_TEAM_CODES = [
    "BLG",
    "JDG",
    "AL",
    "WBG",
    "LNG",
    "TES",
    "NIP",
    "WE",
    "GEN",
    "G2",
    "BFX",
    "LOUD",
    "LYON",
    "TSW",
]

TEAM_ID_OVERRIDES = {
    "BLG": "57",
    "JDG": "29",
    "AL": "422",
    "WBG": "41",
    "LNG": "9",
    "TES": "42",
    "NIP": "587",
    "WE": "12",
    "GEN": "137",
    "G2": "117",
    "BFX": "1130",
    "LOUD": "900",
    "LYON": "699",
    "TSW": "1018",
}


def normalize_name(value: str) -> str:
    lowered = value.lower()
    return re.sub(r"[^a-z0-9]", "", lowered)


def load_focus_players() -> tuple[dict[tuple[str, str], dict], dict[str, str]]:
    data = json.loads(SITE_DATA_PATH.read_text(encoding="utf-8"))
    focus_map: dict[tuple[str, str], dict] = {}
    team_lookup: dict[str, str] = {}
    for item in data["players"]["items"]:
        team_code = item["teamCode"]
        normalized = normalize_name(item["name"])
        focus_map[(team_code, normalized)] = {
            "id": item["id"],
            "name": item["name"],
            "teamCode": team_code,
            "role": item["role"],
        }
        team_lookup[team_code] = team_code
    return focus_map, team_lookup


def load_team_ids() -> dict[str, str]:
    data = json.loads(SCHEDULE_DATA_PATH.read_text(encoding="utf-8"))
    ids: dict[str, str] = {}
    for match in data["matches"]:
        for team in (match.get("teamA"), match.get("teamB")):
            if team and team.get("shortName") and team.get("id"):
                ids[team["shortName"]] = str(team["id"])
    ids.update(TEAM_ID_OVERRIDES)
    return ids


def safe_slug_from_url(url: str) -> str:
    path = urlparse(url).path
    ext = Path(path).suffix.lower() or ".jpg"
    if ext not in {".png", ".jpg", ".jpeg", ".webp", ".avif"}:
        ext = ".jpg"
    return ext


def normalize_url(url: str) -> str:
    if url.startswith("//"):
        return f"https:{url}"
    return url


def download_image(url: str, destination_base: Path) -> str:
    PLAYER_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    url = normalize_url(url)
    ext = safe_slug_from_url(url)
    destination = destination_base.with_suffix(ext)
    with urlopen(url) as response:
        destination.write_bytes(response.read())
    return destination.name


def extract_team_roster(page, team_id: str) -> list[dict]:
    page.goto(f"https://lpl.qq.com/web202301/team-detail.html?tid={team_id}", wait_until="networkidle")
    time.sleep(0.5)
    return page.evaluate(
        """() => {
          return Array.from(document.querySelectorAll('a[href*="player-detail.html?mbid="]')).map((link) => {
            const href = link.getAttribute('href') || '';
            const img = link.querySelector('img');
            const name = (link.textContent || '').trim().replace(/\\s+/g, ' ');
            const match = href.match(/mbid=(\\d+)/);
            return {
              href,
              mbid: match ? match[1] : '',
              name,
              thumb: img ? (img.currentSrc || img.src || '') : '',
            };
          }).filter((item) => item.mbid);
        }"""
    )


def extract_player_detail(page, mbid: str) -> dict:
    page.goto(f"https://lpl.qq.com/web202301/player-detail.html?mbid={mbid}", wait_until="networkidle")
    time.sleep(0.5)
    return page.evaluate(
        """() => {
          const pd = window.PLAYER_DETAIL;
          if (!pd) return {};
          const heroKey = pd.favoriteHeros ? Object.keys(pd.favoriteHeros)[0] : '';
          const matchKey = pd.matchListOfHero ? Object.keys(pd.matchListOfHero)[0] : '';
          const heroRows = heroKey ? (pd.favoriteHeros[heroKey] || []) : [];
          const matchRows = matchKey ? ((pd.matchListOfHero[matchKey] || {}).list || []) : [];
          const chartRows = [];
          try {
            const chartOption = pd.dataChart?.getOption?.();
            const seriesData = chartOption?.series?.[0]?.data || [];
            const labels = chartOption?.radar?.[0]?.indicator || [];
            for (let i = 0; i < labels.length; i += 1) {
              chartRows.push({
                label: labels[i]?.name || '',
                value: Number(seriesData[i] || 0),
              });
            }
          } catch (error) {}
          return {
            member: {
              memberId: String(pd.dMemberBaseInfo?.MemberId || ''),
              enName: pd.dMemberBaseInfo?.EnName || '',
              realName: pd.dMemberBaseInfo?.RealName || '',
              nickName: pd.dMemberBaseInfo?.NickName || '',
              gamePlace: pd.dMemberBaseInfo?.GamePlace || '',
              teamId: String(pd.dMemberBaseInfo?.TeamId || ''),
              teamName: pd.dMemberBaseInfo?.GameName || '',
              avatar: pd.dMemberBaseInfo?.UserPhoto550 || pd.dMemberBaseInfo?.UserIcon || '',
            },
            favoriteHeroes: heroRows.slice(0, 6).map((item) => ({
              heroId: item.heroId,
              heroName: item.heroName,
              heroCnName: item.heroCnName,
              heroLogo: item.heroLogo,
              games: item.boCount,
              wins: item.boWinCount,
              losses: item.boLossCount,
              winRate: item.boWinRate,
              kills: item.kills,
              deaths: item.deaths,
              assists: item.assists,
              damagePercent: item.damagePercent,
              creepScore: item.creepScore,
              golds: item.golds,
            })),
            recentMatches: matchRows.slice(0, 6).map((item) => ({
              matchId: item.matchID,
              bo: item.bo,
              startTime: item.startTime,
              teamName: item.teamName,
              fightTeamName: item.fightTeamName,
              winTeamId: String(item.winTeamID || ''),
              heroName: item.heroName,
              heroTitle: item.heroTitle,
              kill: item.kill,
              death: item.death,
              assist: item.assist,
              items: (item.items || []).map((entry) => entry.itemName).filter(Boolean),
              runes: (item.perkRunes || []).map((entry) => entry.runeName).filter(Boolean),
            })),
            chart: chartRows,
          };
        }"""
    )


def build_rank_lookup(page) -> dict[tuple[str, str], dict]:
    page.goto("https://lpl.qq.com/web202301/player-rank.html?seasonId=238&stageIds=18,19", wait_until="networkidle")
    time.sleep(0.5)
    rows = page.evaluate(
        """() => {
          const pr = window.PLAYER_RANK;
          const key = pr?.loadedRank ? Object.keys(pr.loadedRank)[0] : '';
          return key ? (pr.loadedRank[key]?.data || []) : [];
        }"""
    )
    rank_lookup: dict[tuple[str, str], dict] = {}
    for row in rows:
        team_name = str(row.get("teamName", "")).strip()
        player_name = str(row.get("playerName", "")).strip()
        if not team_name or not player_name:
            continue
        rank_lookup[(team_name, normalize_name(player_name))] = row
    return rank_lookup


def merge_profile(target: dict, detail: dict, rank_row: dict | None, portrait_file: str | None) -> dict:
    favorite = detail.get("favoriteHeroes") or []
    chart = detail.get("chart") or []
    recent = detail.get("recentMatches") or []
    member = detail.get("member") or {}
    profile = {
        "memberId": member.get("memberId") or str(rank_row.get("playerId")) if rank_row else "",
        "displayName": target["name"],
        "teamCode": target["teamCode"],
        "role": target["role"],
        "portraitFile": portrait_file or "",
        "portraitUrl": member.get("avatar") or (rank_row.get("playerAvatar") if rank_row else "") or "",
        "realName": member.get("realName") or "",
        "stats": {
            "kda": rank_row.get("kda") if rank_row else None,
            "boCount": rank_row.get("boCount") if rank_row else None,
            "mvpCount": rank_row.get("mvpCount") if rank_row else None,
            "killPerGame": rank_row.get("killPerGame") if rank_row else None,
            "assistPerGame": rank_row.get("assistPerGame") if rank_row else None,
            "deathPerGame": rank_row.get("deathPerGame") if rank_row else None,
            "damagePerMinute": rank_row.get("damagePerMinute") if rank_row else None,
            "damagePercent": rank_row.get("damagePercent") if rank_row else None,
            "goldPerMinute": rank_row.get("goldPerMinute") if rank_row else None,
            "creepScorePerGame": rank_row.get("creepScorePerGame") if rank_row else None,
            "killParticipantPercent": rank_row.get("killParticipantPercent") if rank_row else None,
            "wardPlacedPerGame": rank_row.get("wardPlacedPerGame") if rank_row else None,
            "wardKilledPerGame": rank_row.get("wardKilledPerGame") if rank_row else None,
        },
        "favoriteHeroes": favorite,
        "chart": chart,
        "recentMatches": recent,
    }
    return profile


def clean_json(value):
    if isinstance(value, dict):
        return {key: clean_json(item) for key, item in value.items()}
    if isinstance(value, list):
        return [clean_json(item) for item in value]
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def main() -> int:
    focus_map, _ = load_focus_players()
    team_ids = load_team_ids()
    PLAYER_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    results: dict[str, dict] = {}
    unmatched: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        rank_lookup = build_rank_lookup(page)

        for team_code in TARGET_TEAM_CODES:
            team_id = team_ids.get(team_code)
            if not team_id:
                unmatched.append({"teamCode": team_code, "reason": "missing-team-id"})
                continue

            roster = extract_team_roster(page, team_id)
            for member in roster:
                normalized = normalize_name(member["name"])
                key = (team_code, normalized)
                target = focus_map.get(key)
                if not target:
                    unmatched.append(
                        {
                            "teamCode": team_code,
                            "name": member["name"],
                            "mbid": member["mbid"],
                            "reason": "not-in-focus-map",
                        }
                    )
                    continue

                detail = extract_player_detail(page, member["mbid"])
                rank_row = rank_lookup.get((team_code, normalized))
                portrait_url = (detail.get("member") or {}).get("avatar") or (rank_row.get("playerAvatar") if rank_row else "") or member.get("thumb") or ""
                portrait_file = ""
                if portrait_url:
                    portrait_file = download_image(portrait_url, PLAYER_ASSET_DIR / target["id"])
                results[target["id"]] = merge_profile(target, detail, rank_row, portrait_file)

        browser.close()

    payload = clean_json({
        "generatedAt": int(time.time()),
        "source": {
            "rankPage": "https://lpl.qq.com/web202301/player-rank.html?seasonId=238&stageIds=18,19",
            "teamDetail": "https://lpl.qq.com/web202301/team-detail.html?tid={teamId}",
            "playerDetail": "https://lpl.qq.com/web202301/player-detail.html?mbid={mbid}",
        },
        "playerCount": len(results),
        "players": results,
        "unmatched": unmatched,
    })
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(OUTPUT_PATH), "playerCount": len(results), "unmatched": len(unmatched)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
