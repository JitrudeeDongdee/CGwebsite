"""
Draws a flat vector-style illustration of a product, as a stand-in for a real
photo. Used by `seed-products.mjs --drawn-images`.

Why this exists: the stock-photo route (`--web-images`) returns other people's
photos and, for furniture keywords, kept returning subjects that had nothing to
do with the product (one was outright unsuitable for a company site). A drawing
we generate ourselves is always on-topic, carries no licence question, and still
reads as "not a real photo" thanks to the caption bar.

    python3 draw-product.py <slug> <thai name> <out.jpg>

Unknown slugs exit 2 so the caller can fall back to the flat colour card.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 900
WALL, FLOOR = (238, 232, 224), (206, 194, 180)
WOOD, WOOD_D, WOOD_L = (176, 122, 79), (150, 100, 62), (198, 150, 106)
COUNTER, STEEL, LINE = (238, 238, 236), (150, 155, 160), (110, 88, 70)


def room():
    img = Image.new('RGB', (W, H), WALL)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 640, W, H], fill=FLOOR)
    d.line([(0, 640), (W, 640)], fill=(188, 176, 162), width=3)
    return img, d


def panel(d, box, fill, handle='v'):
    d.rectangle(box, fill=fill, outline=LINE, width=3)
    x0, y0, x1, y1 = box
    if handle == 'v':
        d.rounded_rectangle([x1 - 21, (y0 + y1) / 2 - 34, x1 - 15, (y0 + y1) / 2 + 34], 4, fill=STEEL)
    else:
        d.rounded_rectangle([(x0 + x1) / 2 - 40, y0 + 11, (x0 + x1) / 2 + 40, y0 + 17], 3, fill=STEEL)


def kitchen():
    img, d = room()
    for i in range(4):                                  # upper cabinets
        x = 120 + i * 200
        panel(d, [x, 150, x + 180, 350], WOOD_L if i % 2 else WOOD)
    d.polygon([(520, 150), (700, 150), (660, 260), (560, 260)], fill=STEEL, outline=LINE)   # hood
    d.rectangle([575, 260, 645, 285], fill=(120, 126, 132), outline=LINE, width=2)
    for x in range(120, 1080, 60):                      # splashback tiles
        d.line([(x, 350), (x, 470)], fill=(228, 221, 212), width=2)
    d.rectangle([100, 470, 1100, 505], fill=COUNTER, outline=LINE, width=3)                 # worktop
    for i in range(4):                                  # base units
        x = 120 + i * 240
        panel(d, [x, 505, x + 220, 700], WOOD if i % 2 else WOOD_D, handle='h')
    d.rounded_rectangle([760, 476, 940, 500], 6, fill=(196, 200, 204), outline=LINE, width=2)  # sink
    d.line([(860, 476), (860, 400)], fill=STEEL, width=8)                                   # tap
    d.line([(860, 404), (915, 404)], fill=STEEL, width=8)
    d.line([(915, 404), (915, 440)], fill=STEEL, width=6)
    return img


def wardrobe():
    img, d = room()
    d.rectangle([210, 120, 990, 700], fill=WOOD_D, outline=LINE, width=4)                   # carcass
    panel(d, [225, 135, 590, 685], WOOD)                                                    # closed door
    d.rectangle([610, 135, 975, 685], fill=(226, 216, 203), outline=LINE, width=3)          # open side
    for y in (250, 360, 470):
        d.line([(620, y), (965, y)], fill=LINE, width=4)                                    # shelves
    d.line([(630, 190), (955, 190)], fill=STEEL, width=6)                                   # hanging rail
    for hx in (680, 740, 800, 860):
        d.line([(hx, 190), (hx, 215)], fill=STEEL, width=3)
        d.polygon([(hx - 26, 245), (hx + 26, 245), (hx, 213)], fill=(214, 205, 194), outline=LINE)
    for i, sx in enumerate((640, 720, 800)):                                                # folded stacks
        d.rectangle([sx, 300 + i * 4, sx + 60, 350], fill=(200, 190, 178), outline=LINE, width=2)
    d.rectangle([210, 700, 990, 726], fill=LINE)                                            # plinth
    return img


DRAWINGS = {'built-in-kitchen': kitchen, 'built-in-wardrobe': wardrobe}


def caption(img, name, slug):
    d = ImageDraw.Draw(img, 'RGBA')
    try:
        big = ImageFont.truetype('/System/Library/Fonts/Supplemental/Ayuthaya.ttf', 40)
        small = ImageFont.truetype('/System/Library/Fonts/Supplemental/Ayuthaya.ttf', 22)
    except OSError:
        big = small = ImageFont.load_default()
    d.rectangle([0, H - 96, W, H], fill=(30, 26, 22, 200))
    d.text((44, H - 82), name[:40], font=big, fill=(255, 255, 255, 240))
    d.text((44, H - 34), f'ภาพตัวอย่าง (วาดจำลอง) — {slug}', font=small, fill=(255, 255, 255, 170))
    return img


slug, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
draw = DRAWINGS.get(slug)
if draw is None:
    sys.exit(2)
caption(draw(), name, slug).save(out, quality=88)
