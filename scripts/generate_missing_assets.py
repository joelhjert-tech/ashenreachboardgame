from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path.cwd()
PUBLIC_ROOT = ROOT / "public"


def stable_seed(value: str) -> int:
    total = 0
    for index, char in enumerate(value):
        total += (index + 1) * ord(char)
    return total


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def lerp_color(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def create_vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size)
    pixels = image.load()
    for y in range(height):
      t = y / max(height - 1, 1)
      color = lerp_color(top, bottom, t)
      for x in range(width):
          pixels[x, y] = (*color, 255)
    return image


def overlay_noise(image: Image.Image, seed: int, strength: int = 18) -> Image.Image:
    rand = random.Random(seed)
    noise = Image.new("L", image.size)
    pixels = noise.load()
    for y in range(image.height):
        for x in range(image.width):
            pixels[x, y] = 128 + rand.randint(-strength, strength)
    noise = noise.filter(ImageFilter.GaussianBlur(0.35))
    tinted = Image.merge("RGBA", (noise, noise, noise, Image.new("L", image.size, 40)))
    return ImageChops.overlay(image, tinted)


def add_glow(image: Image.Image, center: tuple[float, float], radius: float, color: tuple[int, int, int, int]) -> None:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    x, y = center
    for ring in range(8, 0, -1):
        scale = ring / 8
        alpha = int(color[3] * (scale ** 2) * 0.18)
        bbox = [
            x - radius * scale,
            y - radius * scale,
            x + radius * scale,
            y + radius * scale,
        ]
        draw.ellipse(bbox, fill=(color[0], color[1], color[2], alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius * 0.04))
    image.alpha_composite(overlay)


def add_vignette(image: Image.Image, amount: int = 170) -> None:
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    inset = min(image.size) * 0.05
    draw.ellipse([inset, inset, image.width - inset, image.height - inset], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(min(image.size) * 0.08))
    vignette = Image.new("RGBA", image.size, (0, 0, 0, amount))
    image.alpha_composite(vignette, (0, 0), ImageChops.invert(mask))


def keyword_palette(prompt_id: str, prompt: str) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    combined = f"{prompt_id} {prompt}".lower()
    if "red_" in combined or "raider" in combined or "blast" in combined or "ridge" in combined or "halberd" in combined:
        return (44, 17, 20), (144, 58, 41), (239, 146, 76)
    if "blue_" in combined or "choir" in combined or "chapel" in combined or "rift" in combined or "vigil" in combined:
        return (12, 24, 38), (39, 87, 122), (155, 225, 240)
    if "yellow_" in combined or "vault" in combined or "market" in combined or "splice" in combined or "key" in combined:
        return (31, 24, 18), (117, 84, 26), (229, 194, 88)
    if "corruption" in combined or "mirror" in combined or "scar" in combined:
        return (18, 12, 30), (74, 32, 96), (170, 102, 204)
    if "relic" in combined or "saint" in combined:
        return (33, 27, 17), (134, 99, 44), (244, 220, 145)
    if "wargear" in combined or "drone" in combined or "plate" in combined:
        return (21, 24, 29), (74, 90, 104), (173, 209, 232)
    return (19, 20, 27), (70, 74, 89), (197, 199, 183)


def draw_star(draw: ImageDraw.ImageDraw, center: tuple[float, float], radius: float, fill: tuple[int, int, int, int]) -> None:
    points = []
    for index in range(10):
        angle = -math.pi / 2 + index * math.pi / 5
        use_radius = radius if index % 2 == 0 else radius * 0.44
        points.append((center[0] + math.cos(angle) * use_radius, center[1] + math.sin(angle) * use_radius))
    draw.polygon(points, fill=fill)


def draw_symbol(draw: ImageDraw.ImageDraw, prompt_id: str, size: tuple[int, int], accent: tuple[int, int, int, int]) -> None:
    width, height = size
    cx = width / 2
    cy = height / 2
    tag = prompt_id.lower()
    if "halberd" in tag or "blade" in tag:
        draw.polygon([(cx - 30, cy + 140), (cx + 8, cy - 110), (cx + 34, cy - 78), (cx + 18, cy + 140)], fill=accent)
        draw.polygon([(cx + 10, cy - 115), (cx + 130, cy - 48), (cx + 12, cy + 2)], fill=accent)
    elif "relay" in tag or "signal" in tag:
        draw.rectangle([cx - 16, cy - 150, cx + 16, cy + 110], fill=accent)
        draw.line([cx, cy - 130, cx - 120, cy - 40], fill=accent, width=10)
        draw.line([cx, cy - 130, cx + 120, cy - 40], fill=accent, width=10)
        draw.arc([cx - 170, cy - 170, cx + 170, cy + 170], 220, 320, fill=accent, width=10)
    elif "claw" in tag or "riftspawn" in tag or "scar" in tag:
        for offset in (-90, -25, 40):
            draw.line([cx + offset, cy + 150, cx + offset + 52, cy - 140], fill=accent, width=18)
    elif "gate" in tag or "span" in tag:
        draw.rectangle([cx - 110, cy - 80, cx + 110, cy + 160], outline=accent, width=22)
        draw.arc([cx - 84, cy - 60, cx + 84, cy + 110], 180, 360, fill=accent, width=16)
    elif "lattice" in tag or "map" in tag or "path" in tag or "splice" in tag:
        spacing = 70
        for offset in range(-2, 3):
            draw.line([cx - 170, cy + offset * spacing, cx + 170, cy - offset * spacing], fill=accent, width=10)
            draw.line([cx - 170, cy - offset * spacing, cx + 170, cy + offset * spacing], fill=accent, width=10)
    elif "chapel" in tag or "sanctum" in tag or "lantern" in tag:
        draw.rectangle([cx - 110, cy - 20, cx + 110, cy + 170], outline=accent, width=20)
        draw.polygon([(cx - 140, cy - 18), (cx, cy - 160), (cx + 140, cy - 18)], outline=accent, fill=None, width=20)
        draw.line([cx, cy - 145, cx, cy + 160], fill=accent, width=12)
    elif "vault" in tag or "coin" in tag or "influence" in tag:
        draw.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], outline=accent, width=24)
        draw.ellipse([cx - 65, cy - 65, cx + 65, cy + 65], outline=accent, width=16)
    elif "drone" in tag:
        draw.ellipse([cx - 120, cy - 70, cx + 120, cy + 70], fill=accent)
        for x_offset, y_offset in [(-150, -120), (150, -120), (-150, 120), (150, 120)]:
            draw.line([cx, cy, cx + x_offset, cy + y_offset], fill=accent, width=16)
            draw.ellipse([cx + x_offset - 20, cy + y_offset - 20, cx + x_offset + 20, cy + y_offset + 20], fill=accent)
    elif "mirror" in tag or "eye" in tag:
        draw.ellipse([cx - 170, cy - 90, cx + 170, cy + 90], outline=accent, width=20)
        draw.ellipse([cx - 55, cy - 55, cx + 55, cy + 55], fill=accent)
    elif "beads" in tag:
        for index in range(8):
            angle = -math.pi / 2 + index * math.pi / 4
            px = cx + math.cos(angle) * 120
            py = cy + math.sin(angle) * 120
            draw.ellipse([px - 28, py - 28, px + 28, py + 28], fill=accent)
        draw.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=accent)
    elif "key" in tag:
        draw.rectangle([cx - 25, cy - 150, cx + 25, cy + 80], fill=accent)
        draw.ellipse([cx - 90, cy - 210, cx + 90, cy - 30], outline=accent, width=24)
        draw.rectangle([cx - 24, cy + 78, cx + 88, cy + 118], fill=accent)
        draw.rectangle([cx + 55, cy + 78, cx + 88, cy + 158], fill=accent)
    else:
        draw_star(draw, (cx, cy), min(width, height) * 0.22, accent)


def render_card_art(path: Path, prompt_id: str, prompt: str) -> None:
    size = (1024, 1536)
    dark, mid, accent = keyword_palette(prompt_id, prompt)
    image = create_vertical_gradient(size, dark, mid)
    image = overlay_noise(image, stable_seed(prompt_id))
    add_glow(image, (size[0] * 0.5, size[1] * 0.34), size[0] * 0.34, (*accent, 160))

    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    horizon = int(size[1] * 0.7)
    rand = random.Random(stable_seed(prompt_id))
    terrain = []
    for step in range(-1, 8):
        x = step * size[0] / 7
        y = horizon - rand.randint(0, 220)
        terrain.append((x, y))
    terrain.extend([(size[0] + 100, size[1] + 100), (-100, size[1] + 100)])
    draw.polygon(terrain, fill=(dark[0] // 2, dark[1] // 2, dark[2] // 2, 255))

    for _ in range(18):
        px = rand.randint(0, size[0])
        py = rand.randint(40, int(size[1] * 0.62))
        radius = rand.randint(2, 6)
        draw.ellipse([px - radius, py - radius, px + radius, py + radius], fill=(255, 255, 255, rand.randint(20, 80)))

    accent_rgba = (*accent, 235)
    draw_symbol(draw, prompt_id, size, accent_rgba)

    for _ in range(12):
        px = rand.randint(0, size[0])
        py = rand.randint(int(size[1] * 0.12), int(size[1] * 0.88))
        length = rand.randint(80, 200)
        draw.line([px, py, px + rand.randint(-60, 60), py - length], fill=(*accent, rand.randint(26, 60)), width=rand.randint(2, 4))

    overlay = overlay.filter(ImageFilter.GaussianBlur(1.1))
    image.alpha_composite(overlay)
    add_vignette(image)
    ensure_parent(path)
    image.save(path)


def render_phone_background(path: Path) -> None:
    size = (1080, 1920)
    image = create_vertical_gradient(size, (11, 17, 26), (29, 18, 18))
    image = overlay_noise(image, stable_seed(path.name), 14)
    draw = ImageDraw.Draw(image)

    panel = (120, 170, 210, 36)
    draw.rounded_rectangle([70, 90, size[0] - 70, 430], radius=42, outline=(142, 182, 208, 110), width=4, fill=panel)
    draw.rounded_rectangle([70, 520, size[0] - 70, 1140], radius=44, outline=(173, 145, 109, 110), width=4, fill=(64, 44, 32, 48))
    draw.rounded_rectangle([70, 1190, size[0] - 70, size[1] - 90], radius=44, outline=(142, 182, 208, 88), width=4, fill=(24, 28, 34, 64))

    add_glow(image, (size[0] * 0.5, 180), 340, (108, 184, 237, 160))
    add_glow(image, (size[0] * 0.5, size[1] * 0.82), 260, (207, 158, 86, 90))
    ensure_parent(path)
    image.save(path)


def render_frame(path: Path, accent_hex: str, layout: str) -> None:
    size = (1024, 1536) if "card" in path.stem else (1536, 1024)
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    accent = rgba(accent_hex)
    bronze = rgba("#b38c54", 255)
    steel = rgba("#1b232d", 255)

    draw.rounded_rectangle([18, 18, size[0] - 18, size[1] - 18], radius=44, outline=steel, width=28)
    draw.rounded_rectangle([48, 48, size[0] - 48, size[1] - 48], radius=36, outline=bronze, width=8)
    draw.rounded_rectangle([68, 68, size[0] - 68, size[1] - 68], radius=30, outline=accent, width=6)

    if layout == "card":
        draw.rounded_rectangle([120, 160, size[0] - 120, 860], radius=30, outline=accent, width=10)
        draw.rounded_rectangle([120, 930, size[0] - 120, size[1] - 170], radius=26, outline=bronze, width=6)
        draw.rectangle([140, 112, size[0] - 140, 140], fill=accent)
    elif layout == "character":
        draw.rounded_rectangle([90, 150, 660, 840], radius=34, outline=accent, width=10)
        draw.rounded_rectangle([730, 150, size[0] - 90, 740], radius=34, outline=bronze, width=8)
        draw.rounded_rectangle([90, 52, size[0] - 90, 120], radius=22, outline=accent, width=6)
        draw.rounded_rectangle([90, 880, size[0] - 90, 960], radius=18, outline=bronze, width=6)
    else:
        draw.rounded_rectangle([96, 126, size[0] - 96, 660], radius=36, outline=accent, width=10)
        draw.rounded_rectangle([96, 710, size[0] - 96, size[1] - 116], radius=30, outline=bronze, width=8)
        draw.rectangle([126, 90, size[0] - 126, 118], fill=accent)

    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    add_glow(glow, (size[0] * 0.5, size[1] * 0.12), size[0] * 0.3, (*accent[:3], 150))
    add_glow(glow, (size[0] * 0.5, size[1] * 0.88), size[0] * 0.28, (179, 140, 84, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    image.alpha_composite(glow)
    ensure_parent(path)
    image.save(path)


def render_svg_icon(path: Path, symbol: str, primary: str) -> None:
    ensure_parent(path)
    content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="{primary}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0b0f14" stop-opacity="0.82"/>
    </radialGradient>
  </defs>
  <circle cx="64" cy="64" r="54" fill="url(#glow)" stroke="#d7c6a2" stroke-width="4"/>
  <path d="{symbol}" fill="{primary}" stroke="#f6f0dd" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
"""
    path.write_text(content, encoding="utf-8")


def render_token(path: Path, prompt_id: str, accent_hex: str, symbol: str) -> None:
    size = (512, 512)
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    accent = rgba(accent_hex)
    bronze = rgba("#d0a970")
    steel = rgba("#25303a")

    draw.ellipse([18, 18, 494, 494], fill=steel, outline=bronze, width=16)
    draw.ellipse([46, 46, 466, 466], outline=accent, width=10)
    add_glow(image, (256, 210), 170, (*accent[:3], 150))

    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    o_draw = ImageDraw.Draw(overlay)
    if symbol == "shield":
        o_draw.polygon([(256, 120), (356, 170), (330, 320), (256, 392), (182, 320), (156, 170)], fill=accent)
    elif symbol == "path":
        o_draw.line([144, 362, 226, 272, 184, 182, 290, 116, 360, 190], fill=accent, width=34)
        o_draw.ellipse([128, 344, 170, 386], fill=accent)
    elif symbol == "coin":
        o_draw.ellipse([156, 156, 356, 356], outline=accent, width=28)
        draw_star(o_draw, (256, 256), 72, accent)
    else:
        draw_star(o_draw, (256, 256), 118, accent)
        o_draw.line([194, 318, 320, 196], fill=(248, 234, 196, 255), width=14)

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
    image.alpha_composite(overlay)
    ensure_parent(path)
    image.save(path)


def icon_specs() -> dict[str, tuple[str, str]]:
    return {
        "icon_strength": ("M36 92 L64 24 L84 42 L58 92 Z M62 66 L96 34 L104 44 L74 76 Z", "#d86156"),
        "icon_willpower": ("M20 64 C34 34 94 34 108 64 C94 94 34 94 20 64 Z M64 46 C76 46 86 54 86 64 C86 74 76 82 64 82 C52 82 42 74 42 64 C42 54 52 46 64 46 Z", "#6db6e2"),
        "icon_cunning": ("M54 24 C34 24 26 44 26 60 C26 80 44 94 64 94 L64 78 C52 78 42 70 42 58 C42 48 48 40 58 40 C68 40 74 46 74 56 L74 98 L88 98 L88 84 L104 84 L104 66 L88 66 L88 56 C88 36 76 24 54 24 Z", "#ddb34f"),
        "icon_life": ("M64 20 L78 48 L110 54 L86 78 L92 110 L64 94 L36 110 L42 78 L18 54 L50 48 Z", "#65c47d"),
        "icon_influence": ("M32 64 A32 32 0 1 0 96 64 A32 32 0 1 0 32 64 Z M64 36 L74 56 L96 58 L80 74 L84 96 L64 86 L44 96 L48 74 L32 58 L54 56 Z", "#c79b58"),
        "icon_corruption": ("M28 30 C48 16 82 18 96 38 C110 56 102 80 84 94 C68 108 42 106 28 88 C18 74 18 44 28 30 Z M34 80 C52 60 64 56 92 32", "#8f62c7"),
        "icon_relic": ("M64 18 L74 48 L106 48 L80 66 L90 98 L64 78 L38 98 L48 66 L22 48 L54 48 Z", "#e1bf68"),
        "icon_power": ("M64 18 L74 48 L106 48 L80 66 L90 98 L64 78 L38 98 L48 66 L22 48 L54 48 Z M28 72 L46 62 M82 42 L102 32 M34 98 L50 82", "#cbe7ff"),
    }


def render_asset(entry: dict[str, str]) -> None:
    output_path = PUBLIC_ROOT / entry["outputPath"].lstrip("/")
    if output_path.exists():
        return

    prompt_id = entry["id"]
    asset_type = entry["assetType"]
    prompt = entry["prompt"]

    if asset_type in {"missionCardArt", "threatCardArt", "powerCardArt", "corruptionCardArt", "relicCardArt", "wargearCardArt"}:
        render_card_art(output_path, prompt_id, prompt)
        return

    if asset_type == "background":
        render_phone_background(output_path)
        return

    if asset_type == "uiFrame":
        if "character" in prompt_id:
            render_frame(output_path, "#75b9e7", "character")
        elif "scenario" in prompt_id:
            render_frame(output_path, "#d2a25a", "scenario")
        elif "red" in prompt_id:
            render_frame(output_path, "#de6c58", "card")
        elif "blue" in prompt_id:
            render_frame(output_path, "#68b0df", "card")
        else:
            render_frame(output_path, "#d9b24e", "card")
        return

    if asset_type == "icon":
        symbol, color = icon_specs()[prompt_id]
        render_svg_icon(output_path, symbol, color)
        return

    if asset_type == "token":
        if "shield" in prompt_id:
            render_token(output_path, prompt_id, "#6fb6df", "shield")
        elif "path" in prompt_id:
            render_token(output_path, prompt_id, "#d8b56b", "path")
        elif "influence" in prompt_id:
            render_token(output_path, prompt_id, "#cca05d", "coin")
        else:
            render_token(output_path, prompt_id, "#e6d1a2", "mission")
        return

    raise ValueError(f"Unsupported asset type: {asset_type}")


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: generate_missing_assets.py <prompt_manifest.json>", file=sys.stderr)
        return 1

    manifest_path = Path(sys.argv[1])
    entries: Iterable[dict[str, str]] = json.loads(manifest_path.read_text(encoding="utf-8"))
    for entry in entries:
        render_asset(entry)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
