#!/usr/bin/env python3
"""
TrueCap: Google Ads display assets.

Draws what is left of the May 2026 display set:

  - 02_60_second_speed_landscape_1200x628.png
  - logo_square_1200x1200.png
  - logo_landscape_1200x300.png

On 2026-10-02 four concepts and the square version of this one were removed,
with the images they drew, because each stated something that is not true
today: tax and exit features, property tax filled in automatically, a report
described as ready for a lender, and the refinance strategy model. Do not add
a concept back without checking its text against lib/entitlements-catalog.ts,
lib/product-facts.ts and lib/public-pricing.ts.

The colors and wordmark are the earlier brand (#5248D4 purple, Lato).

Do not upload 02_60_second_speed_landscape_1200x628.png, or
instagram-posts/30_try_free.png, until the founder rules on the speed claim
and the address-only promise (report rows P2-19 and P1-14): the image says
"60s from address" and the post says "4 minutes".

Run:  python3 generate_ads.py
Outputs into google-ads/creatives/.
"""

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ----- palette
LIGHT_BG     = (250, 250, 252)
DARK_BG      = (15, 23, 42)
BRAND        = (82, 72, 212)
BRAND_SOFT   = (236, 234, 255)
INK          = (15, 23, 42)
SUB          = (100, 116, 139)
MUTED        = (148, 163, 184)
BORDER       = (226, 232, 240)
BORDER_DARK  = (45, 55, 80)
GREEN        = (22, 163, 74)
GREEN_SOFT   = (220, 252, 231)
WHITE        = (255, 255, 255)

# ----- fonts
FONT_DIRS = [
    "/usr/share/fonts/truetype/lato",
    "/usr/share/fonts/truetype/dejavu",
]


def _find(*names):
    for d in FONT_DIRS:
        for name in names:
            p = os.path.join(d, name)
            if os.path.exists(p):
                return p
    raise FileNotFoundError(f"none of {names}")


LATO_BLACK = _find("Lato-Black.ttf", "DejaVuSans-Bold.ttf")
LATO_BOLD  = _find("Lato-Bold.ttf", "DejaVuSans-Bold.ttf")
LATO_REG   = _find("Lato-Regular.ttf", "DejaVuSans.ttf")
LATO_MED   = _find("Lato-Medium.ttf", "Lato-Regular.ttf", "DejaVuSans.ttf")


def F(path, size):
    return ImageFont.truetype(path, size)


def text(draw, xy, s, font, color, anchor="la"):
    draw.text(xy, s, font=font, fill=color, anchor=anchor)


def rounded_rect(draw, xy, r, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def measure(draw, s, font):
    if not s:
        return (0, 0)
    bb = draw.textbbox((0, 0), s, font=font)
    return (bb[2] - bb[0], bb[3] - bb[1])


def draw_truecap_wordmark(draw, x, y, font_size, dark=False):
    """Draws 'Truecap.' wordmark with brand-colored dot, returns total width."""
    f = F(LATO_BLACK, font_size)
    fg = WHITE if dark else INK
    text(draw, (x, y), "Truecap", f, fg)
    bb = draw.textbbox((x, y), "Truecap", font=f)
    text(draw, (bb[2] + 2, y), ".", f, BRAND)
    bb2 = draw.textbbox((bb[2] + 2, y), ".", font=f)
    return bb2[2] - x


def draw_brand_pill(draw, x, y, label, dark=False):
    """Small pill — brand color bar + uppercase label, used as eyebrow."""
    bar_color = BRAND
    draw.rectangle((x, y, x + 4, y + 26), fill=bar_color)
    f = F(LATO_BLACK, 20)
    text(draw, (x + 12, y + 1), label.upper(), f, bar_color)


def draw_button(draw, x, y, label, kind="primary", w=None, h=46, font_size=16):
    f = F(LATO_BOLD, font_size)
    pad = 22
    tw, th = measure(draw, label, f)
    if w is None:
        w = tw + pad * 2
    if kind == "primary":
        bg, fg, br = BRAND, WHITE, BRAND
    elif kind == "ghost":
        bg, fg, br = WHITE, INK, BORDER
    else:
        bg, fg, br = WHITE, INK, BORDER
    rounded_rect(draw, (x, y, x + w, y + h), 10, fill=bg, outline=br, width=1)
    text(draw, (x + w // 2, y + h // 2), label, f, fg, anchor="mm")
    return w


def metric_tile(draw, x, y, w, h, label, value, value_color=GREEN, dark=False):
    bg = (28, 38, 64) if dark else (250, 251, 254)
    border_col = BORDER_DARK if dark else BORDER
    rounded_rect(draw, (x, y, x + w, y + h), 12, fill=bg, outline=border_col, width=1)
    text(draw, (x + 14, y + 12), label.upper(), F(LATO_BOLD, 11), MUTED if dark else SUB)
    text(draw, (x + 14, y + 30), value, F(LATO_BLACK, 30), value_color)


def add_glow(canvas, dark=False):
    if not dark:
        return canvas
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    w, h = canvas.size
    gd.ellipse((w * 0.55, -h * 0.2, w * 1.25, h * 0.55), fill=(82, 72, 212, 56))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    canvas.alpha_composite(glow)
    return canvas


# ─────────────────────────────────────────── concept renderers


def concept_60_second(canvas, dark=False):
    """Concept 2: Speed headline. Dark mode. Landscape only: the square
    version carried a property-tax auto-fill row and was removed."""
    canvas = add_glow(canvas, dark=True)
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    is_landscape = w > h
    pad = 60 if is_landscape else 70

    draw_brand_pill(d, pad, pad, "Speed wins")

    # big number
    num_size = 220 if is_landscape else 280
    text(d, (pad, pad + 80), "60s", F(LATO_BLACK, num_size), BRAND)

    sub_y = pad + 80 + num_size * 0.85
    text(d, (pad, sub_y), "from address to defensible answer.",
         F(LATO_BOLD, 28 if is_landscape else 34), WHITE)
    text(d, (pad, sub_y + 40), "No spreadsheet. No setup. No signup.",
         F(LATO_REG, 22 if is_landscape else 26), MUTED)

    # CTA
    btn_y = sub_y + 110
    draw_button(d, pad, btn_y, "Try the free calculator →", kind="primary",
                h=56, font_size=18, w=360)

    # mini metrics on the right-hand side
    if is_landscape:
        tile_w = 160
        tile_y = pad + 60
        for i, (lbl, val, color) in enumerate([
            ("CASH FLOW", "+$640/mo", GREEN),
            ("CAP RATE",  "+8.2%",    GREEN),
            ("DSCR",      "1.34",     GREEN),
        ]):
            metric_tile(d, w - pad - tile_w, tile_y + i * 120, tile_w, 96,
                        lbl, val, value_color=color, dark=True)

    # footer
    draw_truecap_wordmark(d, pad, h - pad - 30, 32, dark=True)
    text(d, (w - pad, h - pad - 26), "usetruecap.com",
         F(LATO_MED, 18), MUTED, anchor="ra")


def make_logo_square():
    """1200x1200 brand logo asset for Performance Max."""
    canvas = Image.new("RGBA", (1200, 1200), (*WHITE, 255))
    d = ImageDraw.Draw(canvas)
    # huge wordmark centered
    f = F(LATO_BLACK, 180)
    text(d, (600, 600), "Truecap", f, INK, anchor="mm")
    bb = d.textbbox((600, 600), "Truecap", font=f, anchor="mm")
    text(d, (bb[2] + 6, 600), ".", f, BRAND, anchor="lm")
    # subtitle
    text(d, (600, 760), "Real estate investment analyzer",
         F(LATO_REG, 32), SUB, anchor="mm")
    return canvas.convert("RGB")


def make_logo_landscape():
    """1200x300 brand logo asset for Performance Max."""
    canvas = Image.new("RGBA", (1200, 300), (*WHITE, 255))
    d = ImageDraw.Draw(canvas)
    f = F(LATO_BLACK, 110)
    text(d, (600, 150), "Truecap", f, INK, anchor="mm")
    bb = d.textbbox((600, 150), "Truecap", font=f, anchor="mm")
    text(d, (bb[2] + 4, 150), ".", f, BRAND, anchor="lm")
    return canvas.convert("RGB")


# ──────────────────────────── main ────────────────────────────

CONCEPTS = [
    # (slug, renderer, dark, sizes)
    ("02_60_second_speed", concept_60_second, True, ("landscape_1200x628",)),
]

SIZES = {
    "landscape_1200x628": (1200, 628),
}


def make_canvas(size, dark):
    bg = (*DARK_BG, 255) if dark else (*LIGHT_BG, 255)
    return Image.new("RGBA", size, bg)


if __name__ == "__main__":
    out_dir = "/sessions/adoring-sweet-einstein/mnt/final_source_code/google-ads/creatives"
    os.makedirs(out_dir, exist_ok=True)

    count = 0
    for slug, renderer, dark, size_names in CONCEPTS:
        for size_name in size_names:
            canvas = make_canvas(SIZES[size_name], dark)
            renderer(canvas, dark=dark)
            out = canvas.convert("RGB")
            path = f"{out_dir}/{slug}_{size_name}.png"
            out.save(path, "PNG", optimize=True)
            print(f"  {os.path.basename(path)}")
            count += 1

    # logos
    make_logo_square().save(f"{out_dir}/logo_square_1200x1200.png", "PNG", optimize=True)
    print("  logo_square_1200x1200.png")
    make_logo_landscape().save(f"{out_dir}/logo_landscape_1200x300.png", "PNG", optimize=True)
    print("  logo_landscape_1200x300.png")

    print(f"\nGenerated {count + 2} assets.")
