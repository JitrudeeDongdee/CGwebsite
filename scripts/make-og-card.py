"""
Regenerates the 1200x630 social share card at public/brand/og-card.png
(the image `vite.config.ts` points og:image / twitter:image at).

Run it only when the branding or the tagline changes:  pnpm run og
It is deliberately NOT part of the build — it needs Pillow and macOS system
fonts, and the output is committed, so a normal build has no such dependency.

    pip3 install pillow    # if the import below fails
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (11, 34, 49)          # brand.blueprint[900]
GRID = (26, 56, 76)
RED = (200, 16, 46)        # TDD red
WHITE = (255, 255, 255)
MUTED = (168, 190, 205)

img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)

# Blueprint grid, like the site's hero.
for x in range(0, W, 40):
    d.line([(x, 0), (x, H)], fill=GRID, width=1)
for y in range(0, H, 40):
    d.line([(0, y), (W, y)], fill=GRID, width=1)

# Red bar down the left edge.
d.rectangle([0, 0, 14, H], fill=RED)

logo = Image.open('public/brand/logo-shield.png').convert('RGBA')
lh = 200
logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
img.paste(logo, (86, 96), logo)

def font(path, size):
    return ImageFont.truetype(path, size)

# Ayuthaya renders Thai marks and Latin digits correctly under PIL; ThonburiUI
# draws Latin as tofu boxes and Thonburi mis-places the tone marks.
thai = '/System/Library/Fonts/Supplemental/Ayuthaya.ttf'
helv = '/System/Library/Fonts/Helvetica.ttc'
try:
    f_name = font('/System/Library/Fonts/Supplemental/Arial Black.ttf', 58)
except OSError:
    f_name = font(helv, 58)
f_sub = font(helv, 26)
f_thai = font(thai, 42)
f_small = font(thai, 25)

x = 86
d.text((x, 330), 'THAI DONGDEE ENGINEERING', font=f_name, fill=WHITE)
d.text((x, 402), 'KNOCK-DOWN HOUSES  ·  ELECTRONICS  ·  FURNITURE  ·  EQUIPMENT RENTAL',
       font=f_sub, fill=MUTED)
d.text((x, 456), 'บ้านน็อคดาวน์ ออกแบบเอง เห็นราคาทันที', font=f_thai, fill=WHITE)
d.text((x, 524), 'ออกแบบ · ผลิต · ขนส่ง · ติดตั้ง — ประสบการณ์กว่า 20 ปี', font=f_small, fill=MUTED)

img.save('public/brand/og-card.png', optimize=True)
print('wrote public/brand/og-card.png', img.size)
