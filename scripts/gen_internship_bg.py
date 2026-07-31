"""
为 5 段答辩 PPT 生成 6 张深色科技风背景图（16:9, 1920x1080）。
- 主色调：深空蓝→近黑渐变
- 点阵网格（疏密分层）
- 流动曲线 / 节点连线（电路风）
- 顶部 + 底部光带
输出到 scripts/_ppt_bg/ 目录。
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

random.seed(42)

OUT_DIR = os.path.join(os.path.dirname(__file__), "_ppt_bg")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1920, 1080


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def linear_bg(top, bottom, w=W, h=H):
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        c = lerp_color(top, bottom, t)
        for x in range(w):
            px[x, y] = c
    return img


def radial_glow(base_img, cx, cy, radius, color, strength=0.55):
    w, h = base_img.size
    overlay = Image.new("RGB", (w, h), (0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for r in range(radius, 0, -10):
        t = 1 - r / radius
        a = int(255 * t * t * strength)
        od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=80))
    return Image.blend(base_img, Image.eval(overlay, lambda v: min(255, int(v * 0.6))).convert("RGB"), 0.85)


def dot_grid(img, density=42, color=(50, 90, 140), size=2, alpha=0.45):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(density // 2, h, density):
        for x in range(density // 2, w, density):
            od.ellipse([x - size, y - size, x + size, y + size],
                       fill=(color[0], color[1], color[2], int(255 * alpha)))
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    return base.convert("RGB")


def line_grid(img, step=80, color=(35, 60, 100), alpha=0.18):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(0, w, step):
        od.line([(x, 0), (x, h)], fill=(*color, int(255 * alpha)), width=1)
    for y in range(0, h, step):
        od.line([(0, y), (w, y)], fill=(*color, int(255 * alpha)), width=1)
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    return base.convert("RGB")


def flow_curves(img, color=(0, 180, 220), count=4, alpha=0.30):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(count):
        base_y = h * (0.20 + i * 0.20)
        pts = []
        for x in range(0, w + 20, 20):
            t = x / w
            y = base_y + math.sin(t * math.pi * (2 + i * 0.5) + i) * 60
            pts.append((x, y))
        for k in range(len(pts) - 1):
            od.line([pts[k], pts[k + 1]], fill=(*color, int(255 * alpha)), width=2)
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    return base.convert("RGB")


def node_network(img, color=(0, 200, 255), nodes=14, alpha=0.55):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    pts = [(random.randint(80, w - 80), random.randint(80, h - 80)) for _ in range(nodes)]
    for i in range(nodes):
        for j in range(i + 1, nodes):
            d = math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])
            if d < 380:
                a = int(255 * alpha * (1 - d / 380))
                od.line([pts[i], pts[j]], fill=(*color, a), width=1)
    for p in pts:
        od.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], fill=(*color, 220))
        od.ellipse([p[0] - 10, p[1] - 10, p[0] + 10, p[1] + 10],
                   outline=(*color, 120), width=1)
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    return base.convert("RGB")


def top_bottom_glow(img, color=(70, 130, 200)):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(0, 60):
        a = int(255 * (1 - y / 60) * 0.35)
        od.line([(0, y), (w, y)], fill=(*color, a), width=1)
    for y in range(h - 60, h):
        a = int(255 * ((y - (h - 60)) / 60) * 0.35)
        od.line([(0, y), (w, y)], fill=(*color, a), width=1)
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    return base.convert("RGB")


def make_cover():
    bg = linear_bg((8, 18, 38), (2, 6, 16))
    bg = radial_glow(bg, int(W * 0.72), int(H * 0.35), 700, (30, 80, 160), 0.7)
    bg = radial_glow(bg, int(W * 0.20), int(H * 0.75), 500, (20, 100, 180), 0.5)
    bg = flow_curves(bg, color=(0, 170, 220), count=5, alpha=0.32)
    bg = node_network(bg, color=(0, 200, 255), nodes=18, alpha=0.45)
    bg = dot_grid(bg, density=46, color=(70, 110, 170), size=1, alpha=0.40)
    bg = top_bottom_glow(bg, color=(60, 130, 220))
    return bg


def make_section(accent):
    bg = linear_bg((6, 14, 32), (2, 5, 14))
    bg = radial_glow(bg, int(W * 0.85), int(H * 0.20), 500, accent, 0.45)
    bg = radial_glow(bg, int(W * 0.10), int(H * 0.85), 420, accent, 0.30)
    bg = flow_curves(bg, color=accent, count=3, alpha=0.25)
    bg = node_network(bg, color=accent, nodes=10, alpha=0.40)
    bg = line_grid(bg, step=90, color=accent, alpha=0.10)
    bg = dot_grid(bg, density=50, color=accent, size=1, alpha=0.32)
    bg = top_bottom_glow(bg, color=accent)
    return bg


def make_divider(accent):
    bg = linear_bg((10, 22, 50), (1, 4, 12))
    bg = radial_glow(bg, int(W * 0.5), int(H * 0.5), 900, accent, 0.55)
    bg = flow_curves(bg, color=accent, count=6, alpha=0.30)
    bg = node_network(bg, color=accent, nodes=22, alpha=0.50)
    bg = line_grid(bg, step=80, color=accent, alpha=0.10)
    bg = dot_grid(bg, density=42, color=accent, size=1, alpha=0.40)
    bg = top_bottom_glow(bg, color=accent)
    return bg


def make_ending():
    bg = linear_bg((6, 18, 40), (2, 6, 16))
    bg = radial_glow(bg, int(W * 0.5), int(H * 0.5), 800, (60, 120, 220), 0.65)
    bg = flow_curves(bg, color=(0, 200, 240), count=5, alpha=0.28)
    bg = node_network(bg, color=(0, 220, 255), nodes=24, alpha=0.45)
    bg = dot_grid(bg, density=44, color=(80, 130, 200), size=1, alpha=0.40)
    bg = top_bottom_glow(bg, color=(80, 160, 240))
    return bg


if __name__ == "__main__":
    bg = make_cover()
    bg.save(os.path.join(OUT_DIR, "01_cover.png"), optimize=True)
    print("saved 01_cover.png")

    sections = [
        (1, (0, 170, 220)),
        (2, (120, 200, 80)),
        (3, (240, 160, 60)),
        (4, (180, 110, 220)),
        (5, (240, 100, 120)),
    ]
    for idx, accent in sections:
        bg = make_section(accent)
        bg.save(os.path.join(OUT_DIR, f"sec{idx}_content.png"), optimize=True)
        print(f"saved sec{idx}_content.png")
        bg = make_divider(accent)
        bg.save(os.path.join(OUT_DIR, f"sec{idx}_divider.png"), optimize=True)
        print(f"saved sec{idx}_divider.png")

    bg = make_ending()
    bg.save(os.path.join(OUT_DIR, "99_ending.png"), optimize=True)
    print("saved 99_ending.png")
