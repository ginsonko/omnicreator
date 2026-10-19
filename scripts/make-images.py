"""Regenerate the site's raster images (icons, social card, video posters, screenshots).

Usage:
    python scripts/make-images.py --icon PATH_TO_1024_ICON.png [--shots DIR_WITH_APP_SCREENSHOTS]

Requires Pillow with WebP support. Fonts come from Windows (Microsoft YaHei); on other
systems pass --font-regular / --font-bold.
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'assets', 'img')

NAVY = (27, 35, 64)
INK = (17, 22, 41)
LAV = (139, 140, 246)
LAV_LIGHT = (237, 236, 255)
YELLOW = (255, 216, 77)


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def gradient(size, top, bottom, diagonal=True):
    w, h = size
    base = Image.new('RGB', (w, h), top)
    mask = Image.linear_gradient('L').resize((w, h))
    if diagonal:
        mask = mask.rotate(-30, expand=False, fillcolor=255).resize((w, h))
    return Image.composite(Image.new('RGB', (w, h), bottom), base, mask)


def save_webp(img, name, quality=80):
    path = os.path.join(OUT, name)
    img.save(path, 'WEBP', quality=quality, method=6)
    return path


def soft_shadow(img, radius=18, offset=(0, 14), opacity=90):
    alpha = img.split()[-1]
    shadow = Image.new('RGBA', img.size, (10, 12, 30, 0))
    shadow.putalpha(alpha.point(lambda a: a * opacity // 255))
    pad = radius * 3
    canvas = Image.new('RGBA', (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(shadow, (pad + offset[0], pad + offset[1]))
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius))
    canvas.alpha_composite(img, (pad, pad))
    return canvas, pad


def icons(icon):
    full = icon.convert('RGBA')
    # Square, opaque variants for Apple touch icon; transparent for the rest.
    for size, name in ((512, 'icon-512.png'), (192, 'icon-192.png')):
        small = full.resize((size, size), Image.LANCZOS)
        small.quantize(256, method=Image.Quantize.FASTOCTREE).save(os.path.join(OUT, name), optimize=True)
    touch = Image.new('RGBA', full.size, (255, 255, 255, 255))
    touch.alpha_composite(full)
    touch = touch.convert('RGB').resize((180, 180), Image.LANCZOS)
    touch.quantize(256).save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)
    # The full sticker is unreadable at 32 px, so the favicon uses the face only.
    w = full.width
    face = full.crop((int(w * 0.17), int(w * 0.12), int(w * 0.82), int(w * 0.77)))
    face.resize((32, 32), Image.LANCZOS).save(os.path.join(OUT, 'favicon-32.png'), optimize=True)
    full.resize((96, 96), Image.LANCZOS).save(os.path.join(OUT, 'logo-96.webp'), 'WEBP', quality=88, method=6)
    full.resize((560, 560), Image.LANCZOS).save(os.path.join(OUT, 'mascot-560.webp'), 'WEBP', quality=86, method=6)


def og_image(icon, fr, fb):
    w, h = 1200, 630
    bg = gradient((w, h), (246, 245, 255), (221, 224, 255)).convert('RGBA')
    d = ImageDraw.Draw(bg)
    # decorative rings
    for r, a in ((520, 40), (400, 55), (290, 70)):
        d.ellipse((260 - r, 330 - r, 260 + r, 330 + r), outline=(139, 140, 246, a), width=2)
    sticker = icon.convert('RGBA').resize((470, 470), Image.LANCZOS)
    shadowed, pad = soft_shadow(sticker, radius=16, offset=(0, 12), opacity=70)
    bg.alpha_composite(shadowed, (40 - pad, 90 - pad))
    x = 560
    d.text((x, 150), 'OmniCreator', font=font(fb, 34), fill=LAV)
    d.text((x - 4, 196), '万能创作终端', font=font(fb, 92), fill=INK)
    d.text((x, 320), '想做什么，直接说。', font=font(fb, 40), fill=NAVY)
    d.text((x, 378), 'Codex / Claude Code 对话 + 万能媒体工作流创作台', font=font(fr, 26), fill=(70, 78, 110))
    chips = ['写文案', '生成图片', '生成视频', '做项目']
    cx = x
    f = font(fr, 26)
    for c in chips:
        tw = d.textlength(c, font=f)
        d.rounded_rectangle((cx, 440, cx + tw + 36, 486), radius=23, fill=(255, 255, 255, 230), outline=(200, 200, 245))
        d.text((cx + 18, 447), c, font=f, fill=NAVY)
        cx += tw + 52
    d.text((x, 530), 'Windows · macOS（Apple 芯片 / Intel）· 个人免费使用', font=font(fr, 24), fill=(95, 100, 135))
    bg.convert('RGB').save(os.path.join(OUT, 'og-image.jpg'), 'JPEG', quality=86, optimize=True, progressive=True)


def poster(icon, fr, fb, name, kicker, title, sub, colors):
    w, h = 1280, 720
    bg = gradient((w, h), colors[0], colors[1]).convert('RGBA')
    d = ImageDraw.Draw(bg)
    for i in range(0, w, 48):
        d.line((i, 0, i, h), fill=(255, 255, 255, 10))
    for j in range(0, h, 48):
        d.line((0, j, w, j), fill=(255, 255, 255, 10))
    sticker = icon.convert('RGBA').resize((400, 400), Image.LANCZOS)
    shadowed, pad = soft_shadow(sticker, radius=20, offset=(0, 16), opacity=110)
    bg.alpha_composite(shadowed, (840 - pad, 90 - pad))
    d.rounded_rectangle((80, 120, 80 + d.textlength(kicker, font=font(fb, 28)) + 44, 172), radius=26, fill=YELLOW)
    d.text((102, 126), kicker, font=font(fb, 28), fill=INK)
    y = 220
    for line in title.split('\n'):
        d.text((80, y), line, font=font(fb, 68), fill=(255, 255, 255))
        y += 90
    d.text((82, y + 20), sub, font=font(fr, 30), fill=(220, 224, 255))
    # The page draws its own play button in the bottom-right corner, so that area stays empty.
    save_webp(bg.convert('RGB'), name, quality=78)


def sample_poster(fr, fb):
    """Illustrative generated-image example used in the hero mockup."""
    w, h = 600, 800
    img = gradient((w, h), (255, 214, 165), (156, 84, 46)).convert('RGBA')
    d = ImageDraw.Draw(img)
    d.ellipse((130, 330, 470, 670), fill=(255, 241, 220, 255))
    d.ellipse((160, 360, 440, 640), fill=(122, 66, 34, 255))
    d.ellipse((205, 405, 395, 595), fill=(196, 128, 74, 255))
    d.arc((225, 425, 375, 575), 200, 340, fill=(255, 236, 210, 255), width=10)
    d.ellipse((440, 470, 520, 550), outline=(255, 241, 220, 255), width=18)
    d.text((60, 70), '新品上市', font=font(fb, 76), fill=(255, 255, 255))
    d.text((64, 176), 'CARAMEL LATTE', font=font(fr, 30), fill=(255, 245, 230))
    d.rounded_rectangle((60, 700, 330, 752), radius=26, fill=(255, 255, 255, 230))
    d.text((84, 706), '焦糖拿铁 · 暖心上新', font=font(fr, 26), fill=(122, 66, 34))
    save_webp(img.convert('RGB'), 'sample-poster.webp', quality=78)


def shots(shots_dir):
    # Screens come from the neutral build run with demo data only (a fake api.example-ai.com profile
    # and a local fake update feed), so no real Key, site or data path appears in them.
    office = os.path.join(shots_dir, '07-office.png')
    if os.path.exists(office):
        im = Image.open(office).convert('RGB')
        im = im.crop((round(im.width * 58 / 1024), 0, im.width, im.height))
        im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
        save_webp(im, 'shot-office.webp', quality=80)
    for src, name in (('02-manual-add', 'shot-manual-add.webp'), ('04-import', 'shot-import.webp'), ('06-update', 'shot-update.webp')):
        p = os.path.join(shots_dir, src + '.png')
        if os.path.exists(p):
            im = Image.open(p).convert('RGB')
            im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
            save_webp(im, name, quality=80)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--icon', required=True)
    ap.add_argument('--shots', default='')
    ap.add_argument('--font-regular', default=r'C:\Windows\Fonts\msyh.ttc')
    ap.add_argument('--font-bold', default=r'C:\Windows\Fonts\msyhbd.ttc')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    icon = Image.open(a.icon).convert('RGBA')
    icons(icon)
    og_image(icon, a.font_regular, a.font_bold)
    poster(icon, a.font_regular, a.font_bold, 'video-general.webp', '新手教程 · 分章节',
           '10 分钟上手\n万能创作终端', '下载安装 → 连接站点 → 做出第一件作品', ((38, 44, 98), (96, 84, 196)))
    poster(icon, a.font_regular, a.font_bold, 'video-promo.webp', '宣传片',
           '想做什么，\n直接说。', '文案、图片、视频、项目，一个窗口做完', ((70, 30, 90), (196, 84, 132)))
    sample_poster(a.font_regular, a.font_bold)
    if a.shots:
        shots(a.shots)
    for n in sorted(os.listdir(OUT)):
        print(f'{n:28s} {os.path.getsize(os.path.join(OUT, n)):>8,d} B')


if __name__ == '__main__':
    main()
