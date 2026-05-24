#!/usr/bin/env python3
"""
TrueCap — Google Ads display creatives.

Produces a paste-ready set for Google Ads Responsive Display / Performance
Max campaigns. Each concept renders in two formats:

  - Landscape 1200x628  (primary asset — used most often)
  - Square    1200x1200 (secondary — feeds + mobile)

Plus brand logo assets:
  - Square  1200x1200
  - Landscape 1200x300

Brand colors match the Instagram post style (#5248D4 purple).
Fonts use Lato Black / Bold / Regular.

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


def pill(draw, x, y, label, bg=BRAND, fg=WHITE, font_size=13, pad_x=11, pad_y=5):
    f = F(LATO_BOLD, font_size)
    tw, th = measure(draw, label, f)
    rounded_rect(draw, (x, y, x + tw + pad_x * 2, y + th + pad_y * 2 + 4), 999, fill=bg)
    text(draw, (x + pad_x, y + pad_y), label, f, fg)
    return tw + pad_x * 2


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

def concept_stop_losing(canvas, dark=False):
    """Concept 1: Headline-first hero. 'Stop losing deals to bad math.'"""
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    is_landscape = w > h
    pad = 60 if is_landscape else 70

    draw_brand_pill(d, pad, pad, "Truecap")

    # headline
    head_size = 80 if is_landscape else 96
    head_y = pad + 60
    text(d, (pad, head_y), "Stop losing deals", F(LATO_BLACK, head_size), INK)
    text(d, (pad, head_y + head_size * 0.95), "to", F(LATO_BLACK, head_size), INK)
    # to "bad math" in brand color, on same line
    f = F(LATO_BLACK, head_size)
    bb = d.textbbox((pad, head_y + head_size * 0.95), "to", font=f)
    text(d, (bb[2] + 22, head_y + head_size * 0.95), "bad math.", f, BRAND)

    # sub
    sub_y = head_y + head_size * 2.05
    text(d, (pad, sub_y), "Underwrite a rental deal in 60 seconds.",
         F(LATO_BOLD, 26 if is_landscape else 30), SUB)
    text(d, (pad, sub_y + 38), "Cap rate · CoC · DSCR · projection · tax · exit.",
         F(LATO_REG, 22 if is_landscape else 26), MUTED)

    # CTA button
    btn_y = sub_y + 100 if is_landscape else sub_y + 130
    draw_button(d, pad, btn_y, "Try the free calculator →", kind="primary",
                h=56, font_size=18, w=360)

    # trust line
    text(d, (pad, btn_y + 80), "Free · No card · No signup",
         F(LATO_BOLD, 16), MUTED)

    # product mock — right-side on landscape, bottom-half on square
    if is_landscape:
        draw_mock_dashboard(canvas, w - pad - 440, pad + 30, 440, 540)
    else:
        # Bottom half fills with a wider dashboard mock — leave clear
        # space under the trust-line so they don't overlap
        draw_mock_dashboard(canvas, pad, h - pad - 540, w - pad * 2, 510)

    # footer wordmark
    draw_truecap_wordmark(d, pad, h - pad - 30, 32)
    text(d, (w - pad, h - pad - 26), "usetruecap.com",
         F(LATO_MED, 18), SUB, anchor="ra")


def concept_60_second(canvas, dark=False):
    """Concept 2: Speed headline. Dark mode."""
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

    # mini metrics — right-side on landscape, bottom row on square
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
    else:
        # 3 tiles + a feature row across the bottom
        tile_y = h - pad - 360
        tile_w = (w - pad * 2 - 24) // 3
        for i, (lbl, val, color) in enumerate([
            ("CASH FLOW", "+$640/mo", GREEN),
            ("CAP RATE",  "+8.2%",    GREEN),
            ("DSCR",      "1.34",     GREEN),
        ]):
            metric_tile(d, pad + i * (tile_w + 12), tile_y, tile_w, 110,
                        lbl, val, value_color=color, dark=True)
        # feature row below tiles
        ft_y = tile_y + 140
        for i, (icon_label, body) in enumerate([
            ("RENT", "HUD Fair Market Rent"),
            ("RATE", "FRED 30-yr fixed"),
            ("TAX", "State effective rate"),
        ]):
            col_x = pad + i * (tile_w + 12)
            text(d, (col_x, ft_y), icon_label, F(LATO_BLACK, 11), BRAND)
            text(d, (col_x, ft_y + 18), body, F(LATO_REG, 16), WHITE)

    # footer
    draw_truecap_wordmark(d, pad, h - pad - 30, 32, dark=True)
    text(d, (w - pad, h - pad - 26), "usetruecap.com",
         F(LATO_MED, 18), MUTED, anchor="ra")


def concept_auto_fill(canvas, dark=False):
    """Concept 3: 'Type the address. We do the rest.'"""
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    is_landscape = w > h
    pad = 60 if is_landscape else 70

    draw_brand_pill(d, pad, pad, "New")

    head_size = 64 if is_landscape else 80
    head_y = pad + 60
    text(d, (pad, head_y), "Type the address.", F(LATO_BLACK, head_size), INK)
    text(d, (pad, head_y + head_size * 0.95), "We do the rest.",
         F(LATO_BLACK, head_size), BRAND)

    sub_y = head_y + head_size * 2.1
    text(d, (pad, sub_y), "HUD rent · FRED rate · state tax — auto-filled.",
         F(LATO_BOLD, 22 if is_landscape else 26), SUB)
    text(d, (pad, sub_y + 34), "Zero lookup time. Every assumption editable.",
         F(LATO_REG, 19 if is_landscape else 22), MUTED)

    # input mock
    in_x = pad
    in_y = sub_y + 100
    in_w = (w // 2 - pad - 20) if is_landscape else (w - pad * 2)
    rounded_rect(d, (in_x, in_y, in_x + in_w, in_y + 52), 12, fill=WHITE,
                 outline=BRAND, width=2)
    text(d, (in_x + 16, in_y + 14), "1700 W Erie Ave",
         F(LATO_MED, 22), INK)
    # cursor
    d.rectangle((in_x + 226, in_y + 14, in_x + 228, in_y + 40), fill=BRAND)

    # auto-fill callout
    cb_y = in_y + 70
    rounded_rect(d, (in_x, cb_y, in_x + in_w, cb_y + 54), 10, fill=GREEN_SOFT,
                 outline=GREEN, width=1)
    text(d, (in_x + 14, cb_y + 8), "↻  AUTO-FILLED", F(LATO_BLACK, 12), GREEN)
    text(d, (in_x + 14, cb_y + 26),
         "Rent $1,425  ·  Tax 1.49%  ·  Rate 6.78%",
         F(LATO_BOLD, 15), INK)

    # right side preview (landscape only)
    if is_landscape:
        draw_mock_dashboard(canvas, w - pad - 420, pad + 40, 420, 480)

    # CTA
    btn_y = cb_y + 100 if is_landscape else cb_y + 110
    draw_button(d, pad, btn_y, "Try the free calculator →", kind="primary",
                h=52, font_size=17, w=340)

    # Square: fill bottom half with a wide dashboard mock
    if not is_landscape:
        draw_mock_dashboard(canvas, pad, h - pad - 480, w - pad * 2, 440)

    # footer
    draw_truecap_wordmark(d, pad, h - pad - 30, 32)
    text(d, (w - pad, h - pad - 26), "Free · No signup",
         F(LATO_MED, 18), SUB, anchor="ra")


def concept_pdf_export(canvas, dark=False):
    """Concept 4: 'Lender-ready PDF.'"""
    canvas = add_glow(canvas, dark=True)
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    is_landscape = w > h
    pad = 60 if is_landscape else 70

    draw_brand_pill(d, pad, pad, "Pro feature")

    head_size = 70 if is_landscape else 88
    head_y = pad + 60
    text(d, (pad, head_y), "Lender-ready", F(LATO_BLACK, head_size), WHITE)
    text(d, (pad, head_y + head_size * 0.95), "PDF.", F(LATO_BLACK, head_size), BRAND)

    sub_y = head_y + head_size * 2.1
    text(d, (pad, sub_y), "4-page report. Verdict + projections + tax + exit.",
         F(LATO_BOLD, 22 if is_landscape else 26), MUTED)
    text(d, (pad, sub_y + 36), "Send to your lender in one click.",
         F(LATO_REG, 20 if is_landscape else 24), MUTED)

    # CTA
    btn_y = sub_y + 90
    draw_button(d, pad, btn_y, "See Pro pricing →", kind="primary",
                h=52, font_size=17, w=270)

    # PDF paper mock on the right (landscape) or below (square)
    if is_landscape:
        draw_pdf_mock(canvas, w - pad - 320, pad + 80, 320, 420)
    else:
        # below for square
        draw_pdf_mock(canvas, w - pad - 360, btn_y + 100, 360, 400)

    # footer
    draw_truecap_wordmark(d, pad, h - pad - 30, 32, dark=True)
    text(d, (w - pad, h - pad - 26), "usetruecap.com",
         F(LATO_MED, 18), MUTED, anchor="ra")


def concept_brrrr(canvas, dark=False):
    """Concept 5: BRRRR — 'Did your money come back?'"""
    d = ImageDraw.Draw(canvas)
    w, h = canvas.size
    is_landscape = w > h
    pad = 60 if is_landscape else 70

    draw_brand_pill(d, pad, pad, "BRRRR")

    head_size = 62 if is_landscape else 76
    head_y = pad + 60
    text(d, (pad, head_y), "Did your money", F(LATO_BLACK, head_size), INK)
    text(d, (pad, head_y + head_size * 0.95), "come back?",
         F(LATO_BLACK, head_size), BRAND)

    sub_y = head_y + head_size * 2.1
    text(d, (pad, sub_y),
         "Model the cash-out refi before you commit.",
         F(LATO_BOLD, 22 if is_landscape else 26), SUB)
    text(d, (pad, sub_y + 34), "Cash left in deal · post-refi CF · infinite-return alerts.",
         F(LATO_REG, 17 if is_landscape else 21), MUTED)

    # tiles
    tile_y = sub_y + 100
    tile_w = 170 if is_landscape else 220
    for i, (lbl, val, color) in enumerate([
        ("CASH LEFT", "$0", GREEN),
        ("RETURNED", "$72,400", GREEN),
        ("POST-REFI CF", "$520/mo", GREEN),
    ]):
        metric_tile(d, pad + i * (tile_w + 12), tile_y, tile_w, 86,
                    lbl, val, value_color=color)

    # CTA
    btn_y = tile_y + 110
    draw_button(d, pad, btn_y, "Try the BRRRR calculator →", kind="primary",
                h=52, font_size=17, w=340)
    text(d, (pad, btn_y + 70), "Free · No signup · No card",
         F(LATO_BOLD, 16), MUTED)

    # Square: fill bottom half with a "before / after" refi breakdown
    if not is_landscape:
        box_y = h - pad - 400
        rounded_rect(d, (pad, box_y, w - pad, box_y + 360), 16,
                     fill=(248, 250, 255), outline=BORDER, width=1)
        # left column — cash going in
        col_w = (w - pad * 2 - 40) // 2
        text(d, (pad + 20, box_y + 18), "CASH GOING IN",
             F(LATO_BLACK, 14), SUB)
        for i, (lbl, val) in enumerate([
            ("Down payment",   "$25,000"),
            ("Rehab",          "$45,000"),
            ("Closing + carry", "$7,500"),
            ("Total invested", "$77,500"),
        ]):
            row_y = box_y + 50 + i * 36
            bold = i == 3
            text(d, (pad + 20, row_y), lbl,
                 F(LATO_REG, 16), MUTED if not bold else INK)
            text(d, (pad + 20 + col_w - 12, row_y), val,
                 F(LATO_BLACK if bold else LATO_BOLD, 17), INK, anchor="ra")
        # divider
        d.line([(pad + col_w + 20, box_y + 30),
                (pad + col_w + 20, box_y + 330)], fill=BORDER, width=1)
        # right column — refi
        text(d, (pad + col_w + 40, box_y + 18), "AFTER REFI",
             F(LATO_BLACK, 14), BRAND)
        for i, (lbl, val) in enumerate([
            ("New loan (75%)", "$262,500"),
            ("Cash returned",  "$72,400"),
            ("Cash left in deal","$0"),
            ("Equity created", "$58,000"),
        ]):
            row_y = box_y + 50 + i * 36
            bold = i == 2 or i == 3
            text(d, (pad + col_w + 40, row_y), lbl,
                 F(LATO_REG, 16), MUTED if not bold else INK)
            color = GREEN if i == 2 else (BRAND if i == 3 else INK)
            text(d, (w - pad - 20, row_y), val,
                 F(LATO_BLACK if bold else LATO_BOLD, 17), color, anchor="ra")

    # footer
    draw_truecap_wordmark(d, pad, h - pad - 30, 32)
    text(d, (w - pad, h - pad - 26), "usetruecap.com",
         F(LATO_MED, 18), SUB, anchor="ra")


# ───────────────────── shared mock components ─────────────────────

def draw_mock_dashboard(canvas, x, y, w, h):
    """A polished mini dashboard preview — used on the right side of landscape ads."""
    d = ImageDraw.Draw(canvas)
    # shadow
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x + 4, y + 10, x + w + 4, y + h + 10),
                         radius=14, fill=(15, 23, 42, 50))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(canvas)

    # card
    rounded_rect(d, (x, y, x + w, y + h), 14, fill=WHITE, outline=BORDER, width=1)

    # browser dots
    cx, cy = x + 16, y + 16
    for col in [(252, 99, 89), (251, 193, 67), (87, 202, 87)]:
        d.ellipse((cx, cy, cx + 10, cy + 10), fill=col)
        cx += 14

    # address
    text(d, (x + 18, y + 42), "1700 W Erie · Philadelphia",
         F(LATO_BLACK, 18), INK)
    text(d, (x + 18, y + 64), "Single Family · $295k",
         F(LATO_REG, 13), SUB)

    # pills
    px = x + 18
    py = y + 92
    pw = pill(d, px, py, "BUY", bg=GREEN, fg=WHITE, font_size=11)
    px += pw + 6
    pw = pill(d, px, py, "SCORE 84", bg=BRAND, fg=WHITE, font_size=11)

    # mini metric tiles 2x2
    mt_y = y + 132
    cell_w = (w - 36 - 8) // 2
    cell_h = 56
    items = [
        ("CASH FLOW", "+$640", GREEN),
        ("CAP RATE", "+8.2%", GREEN),
        ("CoC", "+13.1%", BRAND),
        ("DSCR", "1.34", GREEN),
    ]
    for i, (lbl, val, color) in enumerate(items):
        cx = x + 18 + (i % 2) * (cell_w + 8)
        cy = mt_y + (i // 2) * (cell_h + 6)
        rounded_rect(d, (cx, cy, cx + cell_w, cy + cell_h), 8,
                     fill=(250, 251, 254), outline=BORDER, width=1)
        text(d, (cx + 8, cy + 5), lbl, F(LATO_BOLD, 9), SUB)
        text(d, (cx + 8, cy + 18), val, F(LATO_BLACK, 22), color)

    # spark
    sp_y = mt_y + cell_h * 2 + 26
    rounded_rect(d, (x + 18, sp_y, x + w - 18, sp_y + 100), 8,
                 fill=(250, 251, 254), outline=BORDER, width=1)
    text(d, (x + 26, sp_y + 8), "10-YR CASH FLOW",
         F(LATO_BOLD, 9), SUB)
    text(d, (x + w - 26, sp_y + 8), "+$14,200",
         F(LATO_BLACK, 11), GREEN, anchor="ra")
    # sparkline
    pts = [7680, 8500, 9380, 10310, 11290, 12320, 13400, 14530, 15710, 16940]
    mn, mx = min(pts), max(pts)
    rng = mx - mn
    spx = x + 28
    spy = sp_y + 36
    spw = w - 56
    sph = 50
    step = spw / (len(pts) - 1)
    coords = []
    for i, v in enumerate(pts):
        px = spx + i * step
        py = spy + sph - (v - mn) / rng * sph
        coords.append((px, py))
    # filled area
    poly = coords + [(spx + spw, spy + sph), (spx, spy + sph)]
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.polygon(poly, fill=(82, 72, 212, 60))
    canvas.alpha_composite(overlay)
    d = ImageDraw.Draw(canvas)
    for i in range(len(coords) - 1):
        d.line([coords[i], coords[i + 1]], fill=BRAND, width=3)
    last = coords[-1]
    d.ellipse((last[0] - 5, last[1] - 5, last[0] + 5, last[1] + 5),
              fill=BRAND, outline=WHITE, width=2)


def draw_pdf_mock(canvas, x, y, w, h):
    """Polished PDF cover preview."""
    d = ImageDraw.Draw(canvas)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x + 4, y + 12, x + w + 4, y + h + 12),
                         radius=10, fill=(0, 0, 0, 60))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(canvas)
    rounded_rect(d, (x, y, x + w, y + h), 10, fill=WHITE, outline=BORDER, width=1)
    rounded_rect(d, (x, y, x + w, y + 8), 10, fill=BRAND)

    # logo
    draw_truecap_wordmark(d, x + 18, y + 22, 20)
    text(d, (x + 18, y + 52), "Investment analysis report",
         F(LATO_REG, 11), SUB)

    text(d, (x + 18, y + 92), "1700 W ERIE",
         F(LATO_BLACK, 26), INK)
    text(d, (x + 18, y + 124), "PHILADELPHIA, PA",
         F(LATO_BOLD, 12), SUB)

    # pills
    px = x + 18
    py = y + 156
    pw = pill(d, px, py, "BUY", bg=GREEN, fg=WHITE, font_size=10)
    px += pw + 6
    pw = pill(d, px, py, "SCORE 84", bg=BRAND, fg=WHITE, font_size=10)
    px += pw + 6
    pw = pill(d, px, py, "LOW RISK", bg=GREEN, fg=WHITE, font_size=10)

    # grid 3x2
    g_y = y + 196
    g_w = (w - 36 - 12) // 3
    grid = [
        ("CASH FLOW", "$640", GREEN),
        ("CoC", "+13.1%", BRAND),
        ("CAP", "+8.2%", GREEN),
        ("DSCR", "1.34", GREEN),
        ("TAX SAVE", "$320", GREEN),
        ("AFTER-TAX", "$960", BRAND),
    ]
    for i, (lbl, val, c) in enumerate(grid):
        gx = x + 18 + (i % 3) * (g_w + 6)
        gy = g_y + (i // 3) * 44
        rounded_rect(d, (gx, gy, gx + g_w, gy + 38), 6,
                     fill=(250, 251, 254), outline=BORDER, width=1)
        text(d, (gx + 6, gy + 4), lbl, F(LATO_BOLD, 8), SUB)
        text(d, (gx + 6, gy + 15), val, F(LATO_BLACK, 16), c)

    # verdict
    v_y = g_y + 100
    rounded_rect(d, (x + 18, v_y, x + w - 18, v_y + 60), 8,
                 fill=(248, 250, 255), outline=BORDER, width=1)
    text(d, (x + 26, v_y + 6), "AI RECOMMENDATION",
         F(LATO_BOLD, 9), BRAND)
    text(d, (x + 26, v_y + 20), "Solid fundamentals.", F(LATO_BOLD, 11), INK)
    text(d, (x + 26, v_y + 36), "Cap 8.2% · DSCR 1.34 — clears threshold.",
         F(LATO_REG, 9), SUB)


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
    ("01_stop_losing_deals", concept_stop_losing, False),
    ("02_60_second_speed",   concept_60_second,    True),  # dark
    ("03_auto_fill_address", concept_auto_fill,    False),
    ("04_lender_ready_pdf",  concept_pdf_export,   True),  # dark
    ("05_brrrr_money_back",  concept_brrrr,        False),
]

SIZES = {
    "landscape_1200x628": (1200, 628),
    "square_1200x1200":   (1200, 1200),
}


def make_canvas(size, dark):
    bg = (*DARK_BG, 255) if dark else (*LIGHT_BG, 255)
    return Image.new("RGBA", size, bg)


if __name__ == "__main__":
    out_dir = "/sessions/adoring-sweet-einstein/mnt/final_source_code/google-ads/creatives"
    os.makedirs(out_dir, exist_ok=True)

    for slug, renderer, dark in CONCEPTS:
        for size_name, size in SIZES.items():
            canvas = make_canvas(size, dark)
            renderer(canvas, dark=dark)
            out = canvas.convert("RGB")
            path = f"{out_dir}/{slug}_{size_name}.png"
            out.save(path, "PNG", optimize=True)
            print(f"  {os.path.basename(path)}")

    # logos
    make_logo_square().save(f"{out_dir}/logo_square_1200x1200.png", "PNG", optimize=True)
    print("  logo_square_1200x1200.png")
    make_logo_landscape().save(f"{out_dir}/logo_landscape_1200x300.png", "PNG", optimize=True)
    print("  logo_landscape_1200x300.png")

    print(f"\nGenerated {len(CONCEPTS) * len(SIZES) + 2} assets.")
