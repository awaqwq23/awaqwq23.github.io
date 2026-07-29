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


palette = ["#ec4141", "#8b5cf6", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#f97316", "#d946ef"]
playlist_order = sorted(
    playlists.items(),
    key=lambda pair: (0 if pair[0] == favorite_id else 1, -int(pair[1].get("updateTime") or 0)),
)
categories = [
    build_category(
        f"playlist-{playlist_id}",
        item.get("name") or "未命名歌单",
        "fa-heart" if playlist_id == favorite_id else "fa-list",
        palette[index % len(palette)],
        [playlist_id],
        "歌单已经同步；在网易云中打开一次后，下次同步会补齐本地缓存的曲目明细。",
    )
    for index, (playlist_id, item) in enumerate(playlist_order)
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
