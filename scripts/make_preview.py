# -*- coding: utf-8 -*-
"""Generate a README preview banner from the bundled whale-girl assets."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
DOCS = os.path.join(ROOT, "docs")
os.makedirs(DOCS, exist_ok=True)

W, H = 1600, 900
BG_TOP = (10, 24, 48)
BG_BOTTOM = (20, 58, 96)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_background():
    img = Image.new("RGB", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        draw.line([(0, y), (W, y)], fill=lerp(BG_TOP, BG_BOTTOM, t))
    # soft glow spots
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    for cx, cy, r in [(200, 150, 320), (1400, 700, 380), (800, 450, 260)]:
        gd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=28)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.composite(Image.new("RGB", (W, H), (30, 90, 150)), img, glow)
    return img


def font(size, bold=False):
    path = r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc"
    return ImageFont.truetype(path, size)


def rounded_pill(draw, box, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def main():
    img = make_background()
    draw = ImageDraw.Draw(img, "RGBA")

    # Title
    title_font = font(72, bold=True)
    sub_font = font(34)
    title = "DeepSeek 鲸鱼娘"
    subtitle = "Token 喂养 · 全息桌宠 · 每会话独立养成"
    tw = draw.textlength(title, font=title_font)
    draw.text(((W - tw) / 2, 46), title, font=title_font, fill=(235, 245, 255, 255))
    sw = draw.textlength(subtitle, font=sub_font)
    draw.text(((W - sw) / 2, 150), subtitle, font=sub_font, fill=(160, 200, 235, 255))

    # Stage images
    stages = [
        ("stage-0.png", "鲸鱼苗"),
        ("stage-1.png", "小腹微凸"),
        ("stage-2.png", "肚子圆滚滚"),
        ("stage-3.png", "大肚鲸娘"),
        ("stage-4.png", "巨鲸神"),
    ]
    thumb_h = 430
    gap = 24
    total_w = len(stages) * thumb_h + (len(stages) - 1) * gap
    x = (W - total_w) / 2
    y = 230
    label_font = font(26)
    for name, label in stages:
        stage = Image.open(os.path.join(ASSETS, name)).convert("RGBA")
        ratio = thumb_h / stage.height
        stage = stage.resize((int(stage.width * ratio), thumb_h), Image.LANCZOS)
        # soft shadow
        shadow = Image.new("RGBA", (stage.width + 40, stage.height + 40), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle((20, 24, stage.width + 20, stage.height + 24), radius=24, fill=(0, 0, 0, 90))
        shadow = shadow.filter(ImageFilter.GaussianBlur(12))
        img.paste(shadow, (int(x - 20), int(y - 20)), shadow)
        img.paste(stage, (int(x), int(y)), stage)
        lw = draw.textlength(label, font=label_font)
        draw.text((x + (stage.width - lw) / 2, y + thumb_h + 18), label, font=label_font, fill=(220, 235, 250, 255))
        x += stage.width + gap

    # Token badge pill (fake UI)
    pill_text = "累计 128.5M tokens"
    pill_font = font(30, bold=True)
    pt = draw.textlength(pill_text, font=pill_font)
    px0, py0, px1, py1 = W - pt - 90, 46, W - 50, 96
    rounded_pill(draw, (px0, py0, px1, py1), 23, (10, 30, 55, 200), outline=(120, 190, 255, 180), width=2)
    draw.text((px0 + 20, py0 + 12), pill_text, font=pill_font, fill=(200, 230, 255, 255))

    # Speech bubble
    bubble_text = "双击摸摸头，好感度+1 ~"
    bubble_font = font(28)
    bt = draw.textlength(bubble_text, font=bubble_font)
    bx0, by0, bx1, by1 = 70, 600, 70 + bt + 60, 660
    rounded_pill(draw, (bx0, by0, bx1, by1), 26, (10, 30, 55, 210), outline=(255, 160, 190, 180), width=2)
    draw.text((bx0 + 30, by0 + 14), bubble_text, font=bubble_font, fill=(255, 225, 235, 255))
    # tail
    draw.polygon([(bx0 + 80, by1), (bx0 + 100, by1 + 24), (bx0 + 120, by1)], fill=(10, 30, 55, 210))

    # Footer
    foot_font = font(24)
    foot = "自动按 token 进食 · 肚子可视化成长 · 好感度养成 · 非侵入健康提醒"
    fw = draw.textlength(foot, font=foot_font)
    draw.text(((W - fw) / 2, H - 60), foot, font=foot_font, fill=(140, 180, 215, 255))

    out = os.path.join(DOCS, "preview.png")
    img.save(out, "PNG")
    print("saved", out)


if __name__ == "__main__":
    main()
