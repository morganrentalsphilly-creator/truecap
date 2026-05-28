#!/usr/bin/env python3
"""
TrueCap — 3 ANCHOR posts. Pin these / drive all social traffic to them.

  anchor_01_stop_losing_deals.png   — Hook (pain: bad math kills deals)
  anchor_02_the_walkthrough.png     — Proof (real deal case study)
  anchor_03_60_seconds.png          — Promise (clean product demo)

Format: 1080x1080 (Instagram square — standard feed).
Polish: tight typography, generous whitespace, single focal point per piece.

Run:  python3 generate_anchors.py
"""

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─── palette ───
LIGHT_BG       = (250, 250, 252)
LIGHT_BG_SOFT  = (243, 243, 248)
DARK_BG        = (15, 23, 42)
DARK_BG_SOFT   = (32, 42, 68)
BRAND          = (82, 72, 212)
BRAND_SOFT     = (236, 234, 255)
BRAND_DEEP     = (60, 51, 180)
INK            = (15, 23, 42)
SUB            = (100, 116, 139)
MUTED          = (148, 163, 184)
MUTED_DIM      = (180, 195, 210)
BORDER         = (228, 232, 240)
BORDER_LIGHT   = (240, 243, 247)
BORDER_DARK    = (45, 55, 80)
BORDER_DARK_2  = (60, 70, 100)
CARD_DARK      = (24, 33, 56)
GREEN          = (22, 163, 74)
GREEN_SOFT     = (220, 252, 231)
GREEN_DEEP     = (15, 81, 50)
RED            = (220, 38, 38)
RED_SOFT       = (254, 226, 226)
RED_DEEP       = (153, 27, 27)
AMBER          = (217, 119, 6)
AMBER_SOFT     = (254, 243, 199)
AMBER_DEEP     = (146, 64, 14)
WHITE          = (255, 255, 255)

CANVAS = 1080  # Instagram square

# ─── fonts ───
FONT_DIRS = ["/usr/share/fonts/truetype/lato", "/usr/share/fonts/truetype/dejavu"]
def _find(*names):
    for d in FONT_DIRS:
        for name in names:
            p = os.path.join(d, name)
            if os.path.exists(p): return p
    raise FileNotFoundError(f"None of {names} found")

LATO_BLACK = _find("Lato-Black.ttf",   "DejaVuSans-Bold.ttf")
LATO_BOLD  = _find("Lato-Bold.ttf",    "DejaVuSans-Bold.ttf")
LATO_REG   = _find("Lato-Regular.ttf", "DejaVuSans.ttf")
LATO_MED   = _find("Lato-Medium.ttf",  "Lato-Regular.ttf")

def F(path, size): return ImageFont.truetype(path, size)

# ─── helpers ───
def text(draw, xy, t, font, color, anchor="la"):
    draw.text(xy, t, font=font, fill=color, anchor=anchor)

def measure(draw, t, font):
    if not t: return (0, 0)
    bb = draw.textbbox((0, 0), t, font=font)
    return (bb[2] - bb[0], bb[3] - bb[1])

def rounded_rect(draw, xy, r, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)

def shadow_card(canvas, x, y, w, h, r=20, color=(15,23,42), alpha=14, blur=16):
    shadow = Image.new("RGBA", canvas.size, (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x+2, y+8, x+w+2, y+h+8), radius=r, fill=(*color, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow)

def truecap_logo(draw, x, y, dark=False, size=34):
    color = WHITE if dark else INK
    text(draw, (x, y), "Truecap", F(LATO_BLACK, size), color, anchor="la")
    w, _ = measure(draw, "Truecap", F(LATO_BLACK, size))
    text(draw, (x + w + 2, y), ".", F(LATO_BLACK, size), BRAND, anchor="la")

def verdict_chip(draw, x, y, label, tone="strong"):
    palette = {
        "strong":   (GREEN_SOFT, GREEN_DEEP),
        "decent":   ((219, 234, 254), (30, 64, 175)),
        "marginal": (AMBER_SOFT, AMBER_DEEP),
        "skip":     (RED_SOFT, RED_DEEP),
    }
    bg, fg = palette.get(tone, palette["decent"])
    font = F(LATO_BLACK, 16)
    w, h_ = measure(draw, label, font)
    pad_x, pad_y = 12, 6
    rounded_rect(draw, (x, y, x + w + 2*pad_x, y + h_ + 2*pad_y), r=14, fill=bg)
    text(draw, (x + pad_x, y + pad_y - 2), label, font, fg, anchor="la")


# ═══════════════════════════════════════════════════════════════════════
# ANCHOR #1 — Hook: "Stop losing deals to bad math"
# Single focal element: side-by-side comparison card with bold delta.
# ═══════════════════════════════════════════════════════════════════════
def anchor_01_stop_losing_deals():
    canvas = Image.new("RGBA", (CANVAS, CANVAS), LIGHT_BG)
    draw = ImageDraw.Draw(canvas)

    # ── Top: kicker + headline ──
    text(draw, (CANVAS // 2, 70), "THE COST OF BAD UNDERWRITING",
         F(LATO_BLACK, 14), BRAND, anchor="ma")

    text(draw, (CANVAS // 2, 130), "Stop losing deals",
         F(LATO_BLACK, 64), INK, anchor="ma")
    text(draw, (CANVAS // 2, 198), "to bad math.",
         F(LATO_BLACK, 64), BRAND, anchor="ma")

    # ── Comparison cards (side by side, tight) ──
    card_y = 320
    card_h = 460
    card_w = 410
    gap = 28
    side_x = (CANVAS - card_w * 2 - gap) // 2

    def render_card(x, header_label, header_tone, line_items, big_metrics, footer_items):
        shadow_card(canvas, x, card_y, card_w, card_h)
        rounded_rect(draw, (x, card_y, x + card_w, card_y + card_h), r=18,
                     fill=WHITE, outline=BORDER, width=1)

        # Header strip
        band_fill = RED_SOFT if header_tone == "spreadsheet" else BRAND_SOFT
        band_fg = RED_DEEP if header_tone == "spreadsheet" else BRAND_DEEP
        rounded_rect(draw, (x, card_y, x + card_w, card_y + 40), r=18, fill=band_fill)
        rounded_rect(draw, (x, card_y + 22, x + card_w, card_y + 40), r=0, fill=band_fill)
        text(draw, (x + card_w // 2, card_y + 20), header_label,
             F(LATO_BLACK, 14), band_fg, anchor="mm")

        # Line items
        ly = card_y + 64
        for label, val in line_items:
            text(draw, (x + 24, ly), label, F(LATO_REG, 15), SUB, anchor="la")
            text(draw, (x + card_w - 24, ly), val, F(LATO_MED, 15), INK, anchor="ra")
            ly += 26

        # Divider
        ly += 6
        draw.line((x + 24, ly, x + card_w - 24, ly), fill=BORDER_LIGHT, width=1)
        ly += 16

        # BIG metrics
        for label, val, color in big_metrics:
            text(draw, (x + 24, ly + 6), label, F(LATO_BOLD, 13), SUB, anchor="la")
            text(draw, (x + card_w - 24, ly), val, F(LATO_BLACK, 32), color, anchor="ra")
            ly += 44

        # Divider 2
        ly += 4
        draw.line((x + 24, ly, x + card_w - 24, ly), fill=BORDER_LIGHT, width=1)
        ly += 12

        # Footer items
        for label, val, color in footer_items:
            text(draw, (x + 24, ly), label, F(LATO_REG, 13), SUB, anchor="la")
            text(draw, (x + card_w - 24, ly), val, F(LATO_BOLD, 13), color, anchor="ra")
            ly += 22

    render_card(
        x=side_x,
        header_label="YOUR SPREADSHEET",
        header_tone="spreadsheet",
        line_items=[
            ("Purchase price", "$420,000"),
            ("Annual rent",    "$46,800"),
            ("Operating exp",  "$8,400"),
            ("Mortgage P+I",   "$22,300"),
        ],
        big_metrics=[
            ("Cap rate",       "8.2%",   GREEN),
            ("Cash flow / mo", "$1,341", GREEN),
            ("DSCR",           "1.72",   GREEN),
        ],
        footer_items=[
            ("Insurance",     "not modeled", RED),
            ("Capex reserve", "not modeled", RED),
            ("Vacancy",       "not modeled", RED),
        ],
    )

    render_card(
        x=side_x + card_w + gap,
        header_label="TRUECAP",
        header_tone="truecap",
        line_items=[
            ("Purchase price", "$420,000"),
            ("Annual rent",    "$46,800"),
            ("Operating exp",  "$11,200"),
            ("Mortgage P+I",   "$22,300"),
        ],
        big_metrics=[
            ("Cap rate",       "5.1%",  AMBER),
            ("Cash flow / mo", "$430",  AMBER),
            ("DSCR",           "1.18",  AMBER),
        ],
        footer_items=[
            ("Insurance",     "$4,800", INK),
            ("Capex reserve", "$3,400", INK),
            ("Vacancy 6%",    "$2,808", INK),
        ],
    )

    # ── Bottom: dark punchline strip ──
    pl_y = card_y + card_h + 30
    rounded_rect(draw, (60, pl_y, CANVAS - 60, pl_y + 64), r=14, fill=INK)
    text(draw, (CANVAS // 2, pl_y + 22),
         "Same deal. $911/mo difference.",
         F(LATO_BOLD, 19), WHITE, anchor="mm")
    text(draw, (CANVAS // 2, pl_y + 46),
         "Found in 60 seconds at usetruecap.com",
         F(LATO_REG, 15), MUTED_DIM, anchor="mm")

    # ── Bottom: brand mark only ──
    truecap_logo(draw, CANVAS // 2 - 52, CANVAS - 60)

    canvas.convert("RGB").save("anchor_01_stop_losing_deals.png", "PNG", optimize=True)
    print("✓ anchor_01_stop_losing_deals.png")


# ═══════════════════════════════════════════════════════════════════════
# ANCHOR #2 — Proof: "Why I walked."
# Dark theme. Single big deal card. Tighter headline.
# ═══════════════════════════════════════════════════════════════════════
def anchor_02_the_walkthrough():
    canvas = Image.new("RGBA", (CANVAS, CANVAS), DARK_BG)
    draw = ImageDraw.Draw(canvas)

    # Brand glow background
    glow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-300, -300, 700, 600), fill=(82, 72, 212, 30))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    canvas.alpha_composite(glow)

    # ── Top: kicker + headline ──
    text(draw, (CANVAS // 2, 64), "REAL DEAL WALKTHROUGH · PHILADELPHIA",
         F(LATO_BLACK, 13), BRAND_SOFT, anchor="ma")

    text(draw, (CANVAS // 2, 116),
         "8.2% cap rate on paper.",
         F(LATO_BLACK, 44), MUTED, anchor="ma")
    text(draw, (CANVAS // 2, 168),
         "5.1% in reality.",
         F(LATO_BLACK, 56), WHITE, anchor="ma")
    text(draw, (CANVAS // 2, 230),
         "Here's why I walked.",
         F(LATO_BLACK, 56), (251, 113, 133), anchor="ma")

    # ── Deal card ──
    card_x, card_y = 60, 340
    card_w, card_h = CANVAS - 120, 580
    shadow_card(canvas, card_x, card_y, card_w, card_h, color=(0,0,0), alpha=80, blur=24)
    rounded_rect(draw, (card_x, card_y, card_x + card_w, card_y + card_h),
                 r=22, fill=CARD_DARK, outline=BORDER_DARK, width=1)

    # Property header
    text(draw, (card_x + 28, card_y + 26), "Fishtown duplex · Philadelphia, PA",
         F(LATO_BOLD, 19), WHITE, anchor="la")
    text(draw, (card_x + 28, card_y + 54), "$420k · 1925 build · both units rented",
         F(LATO_REG, 15), MUTED, anchor="la")
    verdict_chip(draw, card_x + card_w - 96, card_y + 26, "SKIP", tone="skip")

    # Big metrics row
    nums_y = card_y + 110
    nums = [
        ("Asking",   "$420k", WHITE),
        ("Cap rate", "5.1%",  AMBER),
        ("DSCR",     "1.18",  AMBER),
        ("NCF / mo", "$430",  AMBER),
    ]
    col_w = (card_w - 56) // 4
    for i, (label, val, color) in enumerate(nums):
        x = card_x + 28 + col_w * i
        text(draw, (x, nums_y), label, F(LATO_BOLD, 13), MUTED, anchor="la")
        text(draw, (x, nums_y + 22), val, F(LATO_BLACK, 36), color, anchor="la")

    # Divider
    div_y = card_y + 210
    draw.line((card_x + 28, div_y, card_x + card_w - 28, div_y),
              fill=BORDER_DARK_2, width=1)

    # Section header
    text(draw, (card_x + 28, div_y + 22), "WHAT THE LISTING DIDN'T TELL YOU",
         F(LATO_BLACK, 13), BRAND_SOFT, anchor="la")

    # 3 reasons
    reasons = [
        ("1", "Seller's insurance was $1,800/yr.",
              "Your quote: $4,800. Insurer-of-last-resort pricing."),
        ("2", "Year-1 capex on a 1925 build isn't optional.",
              "$3,400 reserve before you've collected first month's rent."),
        ("3", "Real Philly vacancy is 6%, not the 0% in the pro forma.",
              "Another $2,808/yr the headline cap rate quietly hid."),
    ]
    ry = div_y + 56
    for num, line1, line2 in reasons:
        # Number circle
        circle_r = 16
        cx, cy = card_x + 44, ry + 14
        draw.ellipse((cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r), fill=BRAND)
        text(draw, (cx, cy + 1), num, F(LATO_BLACK, 17), WHITE, anchor="mm")
        # Text
        text(draw, (cx + 28, ry), line1, F(LATO_BOLD, 16), WHITE, anchor="la")
        text(draw, (cx + 28, ry + 24), line2, F(LATO_REG, 14), MUTED_DIM, anchor="la")
        ry += 68

    # Bottom punchline inside card
    punch_y = card_y + card_h - 70
    draw.line((card_x + 28, punch_y - 16, card_x + card_w - 28, punch_y - 16),
              fill=BORDER_DARK_2, width=1)
    text(draw, (card_x + 28, punch_y), "+$767/mo of friction the listing hid.",
         F(LATO_BLACK, 18), WHITE, anchor="la")
    text(draw, (card_x + 28, punch_y + 28), "TrueCap surfaces all of it in 60 seconds.",
         F(LATO_REG, 14), MUTED, anchor="la")

    # ── Bottom: brand mark ──
    truecap_logo(draw, CANVAS // 2 - 52, CANVAS - 56, dark=True)

    canvas.convert("RGB").save("anchor_02_the_walkthrough.png", "PNG", optimize=True)
    print("✓ anchor_02_the_walkthrough.png")


# ═══════════════════════════════════════════════════════════════════════
# ANCHOR #3 — Promise: "60 seconds. Every number you need."
# Light theme. Big result card with clean projection chart below.
# ═══════════════════════════════════════════════════════════════════════
def anchor_03_60_seconds():
    canvas = Image.new("RGBA", (CANVAS, CANVAS), LIGHT_BG)
    draw = ImageDraw.Draw(canvas)

    # ── Top: kicker + headline (clean white, no banner) ──
    text(draw, (CANVAS // 2, 80), "PASTE AN ADDRESS · GET REAL NUMBERS",
         F(LATO_BLACK, 13), BRAND, anchor="ma")

    text(draw, (CANVAS // 2, 140), "60 seconds.",
         F(LATO_BLACK, 72), INK, anchor="ma")
    text(draw, (CANVAS // 2, 220), "Every number you need.",
         F(LATO_BLACK, 38), BRAND, anchor="ma")

    # ── Result card ──
    card_x, card_y = 60, 290
    card_w, card_h = CANVAS - 120, 640
    shadow_card(canvas, card_x, card_y, card_w, card_h, alpha=16, blur=20)
    rounded_rect(draw, (card_x, card_y, card_x + card_w, card_y + card_h),
                 r=22, fill=WHITE, outline=BORDER, width=1)

    # Property header
    text(draw, (card_x + 28, card_y + 26), "Brookside SFR · Kansas City, MO",
         F(LATO_BOLD, 19), INK, anchor="la")
    text(draw, (card_x + 28, card_y + 54), "$245k · 3 bed / 2 bath · $1,950 rent",
         F(LATO_REG, 15), SUB, anchor="la")
    verdict_chip(draw, card_x + card_w - 116, card_y + 26, "STRONG", tone="strong")

    # Metrics row (2x2 grid for cleaner spacing on square)
    metrics_top = card_y + 110
    metrics = [
        ("Cap rate",    "7.9%",     GREEN),
        ("CoC return",  "11.4%",    GREEN),
        ("DSCR",        "1.31",     GREEN),
        ("Cash flow",   "$735/mo",  GREEN),
    ]
    col_w = (card_w - 56) // 4
    for i, (label, val, color) in enumerate(metrics):
        x = card_x + 28 + col_w * i
        text(draw, (x, metrics_top), label, F(LATO_BOLD, 13), SUB, anchor="la")
        text(draw, (x, metrics_top + 22), val, F(LATO_BLACK, 32), color, anchor="la")

    # Divider
    div_y = card_y + 218
    draw.line((card_x + 28, div_y, card_x + card_w - 28, div_y), fill=BORDER, width=1)

    # 10-yr section header — clean two-row layout (no overlapping)
    text(draw, (card_x + 28, div_y + 22), "10-YEAR EQUITY BUILD",
         F(LATO_BLACK, 12), SUB, anchor="la")
    text(draw, (card_x + card_w - 28, div_y + 22),
         "$61k in → $188k out",
         F(LATO_BLACK, 13), BRAND, anchor="ra")

    # Chart — full width, no overlapping callouts
    bars_y = div_y + 58
    bars_h = 180
    bar_count = 10
    chart_avail_w = card_w - 56
    bar_gap = 10
    bar_w = (chart_avail_w - bar_gap * (bar_count - 1)) // bar_count
    chart_x = card_x + 28

    equity_curve = [38, 48, 58, 70, 84, 100, 118, 138, 162, 188]
    max_v = max(equity_curve)
    # Ensure even tiny bars have a minimum visible height
    min_visible = 14
    for i, v in enumerate(equity_curve):
        h = max(min_visible, int((v / max_v) * bars_h))
        bx = chart_x + i * (bar_w + bar_gap)
        by = bars_y + bars_h - h
        is_last = i == len(equity_curve) - 1
        rounded_rect(draw, (bx, by, bx + bar_w, bars_y + bars_h),
                     r=6, fill=BRAND if is_last else BRAND_SOFT)
        if is_last:
            text(draw, (bx + bar_w // 2, by - 6), "$188k",
                 F(LATO_BLACK, 16), BRAND, anchor="mb")

    # Year axis
    for i in [0, 4, 9]:
        bx = chart_x + i * (bar_w + bar_gap) + bar_w // 2
        text(draw, (bx, bars_y + bars_h + 12), f"Yr {i+1}",
             F(LATO_BOLD, 12), MUTED, anchor="ma")

    # Bottom-of-card divider + promise line
    promo_y = card_y + card_h - 56
    draw.line((card_x + 28, promo_y - 16, card_x + card_w - 28, promo_y - 16),
              fill=BORDER, width=1)
    text(draw, (CANVAS // 2, promo_y), "All in one paste. No spreadsheet required.",
         F(LATO_BOLD, 16), INK, anchor="ma")
    text(draw, (CANVAS // 2, promo_y + 24), "Free at usetruecap.com",
         F(LATO_REG, 13), SUB, anchor="ma")

    # ── Bottom: brand mark ──
    truecap_logo(draw, CANVAS // 2 - 52, CANVAS - 56)

    canvas.convert("RGB").save("anchor_03_60_seconds.png", "PNG", optimize=True)
    print("✓ anchor_03_60_seconds.png")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    anchor_01_stop_losing_deals()
    anchor_02_the_walkthrough()
    anchor_03_60_seconds()
    print("\nDone — 3 squares (1080x1080) generated.")
