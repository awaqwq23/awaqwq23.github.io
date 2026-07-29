import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = REPO_ROOT / "public" / "materials" / "netease-music.json"
DATABASE = Path(os.environ.get("LOCALAPPDATA", "")) / "NetEase" / "CloudMusic" / "Library" / "webdb.dat"


def load_json(raw, fallback=None):
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return fallback


def song_from_track(track):
    artists = track.get("artists") or track.get("ar") or []
    album = track.get("album") or track.get("al") or {}
    song_id = str(track.get("id", ""))
    cover = album.get("picUrl") or ""
    if cover.startswith("http://"):
        cover = "https://" + cover[7:]
    return {
        "id": song_id,
        "name": track.get("name") or "未命名歌曲",
        "artist": " / ".join(item.get("name", "") for item in artists if item.get("name")) or "未知歌手",
        "album": album.get("name") or album.get("albumName") or "未知专辑",
        "cover": cover,
        "url": f"https://music.163.com/#/song?id={song_id}",
    }


def playlist_url(playlist_id):
    return f"https://music.163.com/#/playlist?id={playlist_id}" if playlist_id else "https://music.163.com/"


if not DATABASE.exists():
    print(f"未找到网易云本地曲库：{DATABASE}", file=sys.stderr)
    sys.exit(1)

connection = sqlite3.connect(f"file:{DATABASE}?mode=ro", uri=True)

tracks = {}
for track_id, raw in connection.execute("select id, jsonStr from dbTrack"):
    data = load_json(raw)
    if data:
        tracks[str(track_id)] = song_from_track(data)

host_rows = connection.execute(
    "select time, jsonStr from persistentModel where uniKey='async:hostResource' order by time desc"
).fetchall()
host_data = load_json(host_rows[0][1], {}).get("data", {}) if host_rows else {}
playlists = {
    str(item.get("id")): item
    for group in ("createPlaylist", "subPlaylist")
    for item in host_data.get(group, [])
    if item.get("id")
}

playlist_tracks = {}
for playlist_id, raw in connection.execute("select id, jsonStr from playlistTrackIds"):
    data = load_json(raw, {})
    playlist_tracks[str(playlist_id)] = [str(item.get("id", item)) for item in data.get("trackIds", [])]

latest_cache = {}
for request_id, raw in connection.execute("select id, jsonStr from requestCache"):
    outer = load_json(raw, {})
    cached = load_json(outer.get("cache"), {})
    playlist = cached.get("playlist") or cached.get("result")
    if not isinstance(playlist, dict) or not playlist.get("id"):
        continue
    playlist_id = str(playlist["id"])
    timestamps = [int(value) for value in re.findall(r"-(\d{10,})", request_id)]
    timestamp = max(timestamps, default=0)
    if timestamp < latest_cache.get(playlist_id, (0, None))[0]:
        continue
    latest_cache[playlist_id] = (timestamp, playlist)

for playlist_id, (_, playlist) in latest_cache.items():
    ids = [str(item.get("id", item)) for item in playlist.get("trackIds") or []]
    if ids:
        playlist_tracks[playlist_id] = ids
    for item in playlist.get("tracks") or []:
        if item.get("id"):
            tracks[str(item["id"])] = song_from_track(item)

favorite_id = str(host_data.get("starPlaylistId") or "")


def ids_by_names(*names):
    wanted = set(names)
    return [playlist_id for playlist_id, item in playlists.items() if item.get("name") in wanted]


def build_category(category_id, name, icon, color, playlist_ids, empty_hint):
    ordered_ids = []
    seen = set()
    for playlist_id in playlist_ids:
        for track_id in playlist_tracks.get(playlist_id, []):
            if track_id not in seen:
                ordered_ids.append(track_id)
                seen.add(track_id)
    items = [tracks[track_id] for track_id in ordered_ids if track_id in tracks]
    declared_count = sum(int(playlists.get(playlist_id, {}).get("trackCount") or 0) for playlist_id in playlist_ids)
    return {
        "id": category_id,
        "name": name,
        "icon": icon,
        "color": color,
        "playlistIds": playlist_ids,
        "playlistUrl": playlist_url(playlist_ids[0] if playlist_ids else ""),
        "total": declared_count or len(ordered_ids),
        "cached": len(items),
        "emptyHint": empty_hint,
        "items": items,
    }


recommended_ids = ids_by_names("真正喜欢的歌", "好听", "我推荐的歌", "推荐的歌")
learning_ids = ids_by_names("想学的歌", "我想学的歌")
mastered_ids = ids_by_names("会的歌", "我会的歌")

categories = [
    build_category(
        "favorites", "收藏的歌", "fa-heart", "#ec4141",
        [favorite_id] if favorite_id else [],
        "先在网易云打开红心歌单，下一次同步会自动补齐本地缓存曲目。",
    ),
    build_category(
        "recommended", "我推荐的歌", "fa-thumbs-up", "#8b5cf6",
        recommended_ids,
        "已识别“真正喜欢的歌 / 好听”歌单；在网易云打开歌单后会同步曲目明细。",
    ),
    build_category(
        "learning", "我想学的歌", "fa-graduation-cap", "#f59e0b",
        learning_ids,
        "创建或打开名为“想学的歌”的网易云歌单后会自动同步。",
    ),
    build_category(
        "mastered", "我会的歌", "fa-microphone-lines", "#10b981",
        mastered_ids,
        "网易云中还没有“会的歌”歌单；创建同名歌单后会自动出现在这里。",
    ),
]

database_time = datetime.fromtimestamp(DATABASE.stat().st_mtime, timezone.utc).astimezone().isoformat(timespec="seconds")
profile_id = ""
for item in playlists.values():
    if item.get("userId"):
        profile_id = str(item["userId"])
        break

result = {
    "syncedAt": database_time,
    "source": "网易云音乐本地曲库",
    "profileUrl": f"https://music.163.com/#/user/home?id={profile_id}" if profile_id else "https://music.163.com/",
    "categories": categories,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(
    "网易云音乐同步完成："
    + "，".join(f"{category['name']} {category['cached']}/{category['total']}" for category in categories)
)
