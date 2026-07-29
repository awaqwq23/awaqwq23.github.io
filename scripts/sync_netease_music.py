import json
import os
import re
import sqlite3
import sys
import urllib.parse
import urllib.request
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
        "url": f"https://music.163.com/song?id={song_id}",
    }


def playlist_url(playlist_id):
    return f"https://music.163.com/playlist?id={playlist_id}" if playlist_id else "https://music.163.com/"


def collect_track_objects(value, target):
    if isinstance(value, dict):
        if (
            value.get("id")
            and value.get("name")
            and (value.get("artists") or value.get("ar"))
            and (value.get("album") or value.get("al"))
        ):
            target[str(value["id"])] = song_from_track(value)
        for child in value.values():
            if isinstance(child, (dict, list)):
                collect_track_objects(child, target)
            elif isinstance(child, str) and len(child) > 20 and child[:1] in "[{":
                nested = load_json(child)
                if nested is not None:
                    collect_track_objects(nested, target)
    elif isinstance(value, list):
        for child in value:
            collect_track_objects(child, target)


def fetch_missing_tracks(track_ids, target):
    fetched = 0
    for start in range(0, len(track_ids), 150):
        batch = track_ids[start:start + 150]
        query = urllib.parse.urlencode({"ids": json.dumps(batch, separators=(",", ":"))})
        request = urllib.request.Request(
            f"https://interface.music.163.com/api/song/detail/?{query}",
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://music.163.com/",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
            for track in payload.get("songs") or []:
                if track.get("id"):
                    target[str(track["id"])] = song_from_track(track)
                    fetched += 1
        except Exception as error:
            print(f"歌曲详情网络补全失败（批次 {start // 150 + 1}）：{error}", file=sys.stderr)
    return fetched


if not DATABASE.exists():
    print(f"未找到网易云本地曲库：{DATABASE}", file=sys.stderr)
    sys.exit(1)

connection = sqlite3.connect(f"file:{DATABASE}?mode=ro", uri=True)

tracks = {}
for track_id, raw in connection.execute("select id, jsonStr from dbTrack"):
    data = load_json(raw)
    if data:
        tracks[str(track_id)] = song_from_track(data)

# 网易云会把完整歌曲对象分散缓存在多个表中；递归提取可避免只读到 dbTrack 的一小部分。
for table in ("requestCache", "persistentModel", "historyTracks", "historyPlaylists"):
    columns = [column[1] for column in connection.execute(f"pragma table_info({table})")]
    if "jsonStr" not in columns:
        continue
    for (raw,) in connection.execute(f"select jsonStr from {table}"):
        data = load_json(raw)
        if data is not None:
            collect_track_objects(data, tracks)

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

desired_track_ids = {
    track_id
    for ids in playlist_tracks.values()
    for track_id in ids
}
missing_track_ids = sorted(desired_track_ids - set(tracks))
network_fetched = fetch_missing_tracks(missing_track_ids, tracks) if missing_track_ids else 0


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

synced_time = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
profile_id = ""
for item in playlists.values():
    if item.get("userId"):
        profile_id = str(item["userId"])
        break

result = {
    "syncedAt": synced_time,
    "source": "网易云音乐本地曲库与公开歌曲详情",
    "profileUrl": f"https://music.163.com/user/home?id={profile_id}" if profile_id else "https://music.163.com/",
    "categories": categories,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(
    f"网易云音乐同步完成（网络补全 {network_fetched} 首）："
    + "，".join(f"{category['name']} {category['cached']}/{category['total']}" for category in categories)
)
