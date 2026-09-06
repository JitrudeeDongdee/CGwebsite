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
# Appliances: a light body, a darker edge, glass and a control accent. Kept to
# one palette across every drawing so the catalogue grid reads as a set.
BODY, BODY_D, EDGE = (235, 236, 238), (208, 211, 215), (92, 96, 102)
GLASS, DARK, ACCENT = (96, 108, 118), (58, 62, 68), (193, 102, 63)


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


def _appliance_box(d, box, radius=18, fill=BODY):
    """The shared body every appliance is built on: a rounded slab with a foot
    shadow, so the drawings sit on the floor instead of floating on it."""
    x0, y0, x1, y1 = box
    d.ellipse([x0 - 10, y1 - 16, x1 + 10, y1 + 22], fill=(190, 178, 164))
    d.rounded_rectangle(box, radius, fill=fill, outline=EDGE, width=4)


def refrigerator():
    img, d = room()
    box = [400, 130, 800, 700]
    _appliance_box(d, box)
    d.line([(400, 320), (800, 320)], fill=EDGE, width=4)          # freezer/fridge split
    for y0, y1 in ((150, 300), (340, 680)):                        # door handles
        d.rounded_rectangle([770, y0 + 20, 782, y1 - 20], 6, fill=STEEL)
    d.rounded_rectangle([430, 360, 520, 420], 8, fill=GLASS)       # display panel
    d.line([(445, 390), (505, 390)], fill=(180, 200, 214), width=4)
    return img


def chest_freezer():
    img, d = room()
    _appliance_box(d, [230, 340, 970, 700], radius=14)
    d.rounded_rectangle([230, 300, 970, 400], 14, fill=BODY_D, outline=EDGE, width=4)   # lid
    d.rounded_rectangle([540, 300, 660, 316], 8, fill=STEEL)                            # lid handle
    d.rounded_rectangle([270, 430, 470, 560], 10, fill=(196, 210, 218), outline=EDGE, width=3)  # glass front
    d.line([(290, 450), (330, 540)], fill=(226, 236, 240), width=10)                    # glare
    d.rounded_rectangle([880, 430, 930, 470], 6, fill=ACCENT)                           # thermostat
    return img


def washing_machine():
    img, d = room()
    _appliance_box(d, [400, 200, 800, 700])
    d.rounded_rectangle([400, 200, 800, 300], 18, fill=BODY_D, outline=EDGE, width=4)   # control panel
    d.ellipse([540, 232, 580, 272], fill=DARK)                                          # dial
    for cx in (620, 660, 700):
        d.ellipse([cx, 244, cx + 16, 260], fill=ACCENT)                                 # buttons
    d.ellipse([490, 360, 710, 580], fill=BODY_D, outline=EDGE, width=4)                 # door ring
    d.ellipse([520, 390, 680, 550], fill=GLASS, outline=EDGE, width=3)                  # glass
    d.ellipse([556, 420, 620, 484], fill=(126, 138, 148))                               # highlight
    return img


def microwave():
    img, d = room()
    _appliance_box(d, [230, 300, 970, 640])
    d.rounded_rectangle([270, 340, 720, 600], 10, fill=GLASS, outline=EDGE, width=4)    # door window
    d.rounded_rectangle([300, 370, 690, 570], 6, fill=(120, 132, 142))
    d.rounded_rectangle([740, 340, 930, 600], 10, fill=BODY_D, outline=EDGE, width=3)   # control panel
    for row in range(4):
        for col in range(3):
            x, y = 762 + col * 56, 366 + row * 46
            d.rounded_rectangle([x, y, x + 40, y + 30], 5, fill=(180, 184, 190))
    d.rounded_rectangle([762, 552, 908, 584], 6, fill=ACCENT)                           # start bar
    return img


def rice_cooker():
    img, d = room()
    d.ellipse([320, 620, 880, 720], fill=(190, 178, 164))                               # shadow
    d.rounded_rectangle([340, 330, 860, 680], 60, fill=BODY, outline=EDGE, width=4)     # body
    d.rounded_rectangle([320, 270, 880, 360], 40, fill=BODY_D, outline=EDGE, width=4)   # lid
    d.rounded_rectangle([560, 236, 640, 280], 12, fill=STEEL, outline=EDGE, width=3)    # steam vent
    d.rounded_rectangle([420, 430, 700, 540], 12, fill=GLASS, outline=EDGE, width=3)    # panel
    d.rounded_rectangle([450, 460, 560, 510], 6, fill=(150, 200, 190))                  # display
    d.ellipse([740, 450, 800, 510], fill=ACCENT)                                        # cook button
    return img


def kettle():
    img, d = room()
    d.ellipse([360, 640, 840, 716], fill=(190, 178, 164))                               # shadow
    d.rounded_rectangle([420, 640, 780, 690], 14, fill=BODY_D, outline=EDGE, width=4)   # power base
    d.polygon([(450, 300), (750, 300), (782, 650), (418, 650)], fill=BODY, outline=EDGE)
    d.line([(450, 300), (750, 300)], fill=EDGE, width=4)
    d.rounded_rectangle([440, 250, 760, 306], 16, fill=BODY_D, outline=EDGE, width=4)   # lid
    d.rounded_rectangle([560, 214, 640, 258], 10, fill=STEEL, outline=EDGE, width=3)    # lid knob
    d.rounded_rectangle([700, 360, 736, 600], 14, fill=GLASS, outline=EDGE, width=3)    # water window
    d.arc([760, 330, 900, 620], -80, 80, fill=DARK, width=22)                           # handle
    d.polygon([(452, 306), (352, 250), (338, 292), (444, 372)], fill=BODY_D, outline=EDGE)  # spout
    return img


def bed():
    img, d = room()
    d.rounded_rectangle([250, 230, 460, 560], 12, fill=WOOD, outline=LINE, width=4)     # headboard
    d.rounded_rectangle([250, 540, 980, 620], 10, fill=WOOD_D, outline=LINE, width=4)   # base
    d.rounded_rectangle([300, 440, 980, 560], 16, fill=(246, 244, 240), outline=EDGE, width=4)  # mattress
    d.rounded_rectangle([320, 470, 960, 560], 14, fill=(226, 230, 236), outline=EDGE, width=3)  # duvet
    for x in (340, 480):                                                                # pillows
        d.rounded_rectangle([x, 400, x + 130, 470], 16, fill=(252, 251, 249), outline=EDGE, width=3)
    d.rounded_rectangle([600, 500, 960, 560], 12, fill=ACCENT)                          # throw
    for x in (270, 940):                                                                # legs
        d.rectangle([x, 620, x + 30, 690], fill=LINE)
    return img


def air_conditioner():
    """Wall unit plus the condenser it always ships with — the pair is what an
    install actually is, and one white box on a wall reads as nothing."""
    img, d = room()
    # Indoor wall unit, mounted high the way it would be fitted.
    d.rounded_rectangle([180, 180, 720, 330], 22, fill=BODY, outline=EDGE, width=4)
    d.rounded_rectangle([200, 300, 700, 330], 12, fill=BODY_D, outline=EDGE, width=3)   # louvre
    d.line([(220, 316), (680, 316)], fill=EDGE, width=3)
    d.rounded_rectangle([600, 210, 690, 246], 8, fill=GLASS)                            # display
    d.ellipse([620, 222, 636, 238], fill=ACCENT)                                        # power light
    # Airflow, angled down from the louvre.
    for i, y in enumerate((372, 420, 468)):
        d.arc([250 + i * 20, y, 690 - i * 20, y + 150], 200, 340, fill=(168, 196, 208), width=7)
    # Outdoor condenser on its bracket, to the right.
    d.rounded_rectangle([790, 380, 1030, 560], 14, fill=BODY_D, outline=EDGE, width=4)
    d.ellipse([830, 410, 990, 530], fill=(196, 200, 206), outline=EDGE, width=3)        # fan grille
    for a in range(0, 360, 45):
        import math
        r = math.radians(a)
        d.line([(910, 470), (910 + 72 * math.cos(r), 470 + 54 * math.sin(r))], fill=(160, 166, 172), width=4)
    d.rectangle([800, 560, 820, 610], fill=EDGE)                                        # bracket
    d.rectangle([1000, 560, 1020, 610], fill=EDGE)
    d.line([(720, 300), (790, 400)], fill=(200, 196, 190), width=10)                    # pipe run
    return img


def steel():
    """A stock pile seen end-on: square tube, rectangular tube and C-channel.
    Steel is sold by section, so the profiles ARE the product — a photo of a
    grey stack from the side says nothing a drawing of the ends does not."""
    img, d = room()
    STEEL_F, STEEL_S, HOLE = (188, 193, 198), (146, 152, 158), (86, 92, 98)

    def tube(x, y, w, h, depth=26):
        # End face plus a short side face, so the pile reads as lengths going back.
        d.polygon([(x, y), (x + depth, y - depth), (x + w + depth, y - depth), (x + w, y)], fill=STEEL_S, outline=EDGE)
        d.polygon([(x + w, y), (x + w + depth, y - depth), (x + w + depth, y + h - depth), (x + w, y + h)],
                  fill=(120, 126, 132), outline=EDGE)
        d.rectangle([x, y, x + w, y + h], fill=STEEL_F, outline=EDGE, width=3)
        d.rectangle([x + 9, y + 9, x + w - 9, y + h - 9], fill=HOLE)      # the bore

    # Everything rests ON the floor line (y = 640), not above it.
    # Square tube, stacked two rows deep.
    for row in range(2):
        for col in range(5):
            tube(150 + col * 84, 565 - row * 84, 70, 70)
    # Rectangular tube, a wider section beside it.
    for col in range(3):
        tube(620 + col * 104, 575, 90, 60)
    # C-channel / purlin, the open section, stacked on top of those.
    for col in range(2):
        x, y = 640 + col * 120, 465
        d.polygon([(x, y), (x + 24, y - 24), (x + 104, y - 24), (x + 80, y)], fill=STEEL_S, outline=EDGE)
        d.rectangle([x, y, x + 80, y + 96], fill=STEEL_F, outline=EDGE, width=3)
        d.rectangle([x + 22, y + 14, x + 80, y + 82], fill=HOLE)          # open on one side
    # Banding straps, the way a bundle actually arrives.
    for y in (516, 600):
        d.line([(140, y), (570, y)], fill=ACCENT, width=7)
    return img


DRAWINGS = {
    'steel-sections': steel,
    'air-conditioner': air_conditioner,
    'built-in-kitchen': kitchen,
    'built-in-wardrobe': wardrobe,
    'refrigerator': refrigerator,
    'chest-freezer': chest_freezer,
    'washing-machine': washing_machine,
    'microwave-oven': microwave,
    'rice-cooker': rice_cooker,
    'electric-kettle': kettle,
    'bed-frame': bed,
}


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
