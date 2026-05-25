#!/usr/bin/env python3
"""
TrueCap Instagram Posts — batch 2 (posts 31-50).

Style matches the original 30 (eyebrow + headline + subtitle + UI mockup
+ Truecap. footer). Each post is a 1080x1080 PNG. Mix of light + dark
backgrounds for visual variety in the feed.

Run:  python3 generate_batch2.py
Outputs: 31_*.png through 50_*.png in this folder.
"""

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------- palette
LIGHT_BG       = (250, 250, 252)
DARK_BG        = (15, 23, 42)
DARK_BG_SOFT   = (32, 42, 68)
BRAND          = (82, 72, 212)        # #5248D4
BRAND_SOFT     = (236, 234, 255)
INK            = (15, 23, 42)
SUB            = (100, 116, 139)
MUTED          = (148, 163, 184)
BORDER         = (226, 232, 240)
BORDER_DARK    = (45, 55, 80)
CARD_DARK      = (24, 33, 56)
GREEN          = (22, 163, 74)
GREEN_SOFT     = (220, 252, 231)
RED            = (220, 38, 38)
AMBER          = (217, 119, 6)
WHITE          = (255, 255, 255)

CANVAS = 1080

# --------------------------------------------------------------- fonts
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
    raise FileNotFoundError(f"None of {names} found in {FONT_DIRS}")

LATO_BLACK  = _find("Lato-Black.ttf",  "DejaVuSans-Bold.ttf")
LATO_BOLD   = _find("Lato-Bold.ttf",   "DejaVuSans-Bold.ttf")
LATO_REG    = _find("Lato-Regular.ttf","DejaVuSans.ttf")
LATO_MED    = _find("Lato-Medium.ttf", "Lato-Regular.ttf", "DejaVuSans.ttf")

def F(path, size):
    return ImageFont.truetype(path, size)

# ---------------------------------------------------------------- helpers

def measure(draw, text, font):
    if not text: return (0, 0)
    bb = draw.textbbox((0, 0), text, font=font)
    return (bb[2] - bb[0], bb[3] - bb[1])

def text(draw, xy, text, font, color, anchor="la"):
    draw.text(xy, text, font=font, fill=color, anchor=anchor)

def rounded_rect(draw, xy, r, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)

def shadow_card(canvas, x, y, w, h, r=20, color=(15,23,42), alpha=18, blur=14):
    """Soft drop shadow behind a card-shaped region."""
    shadow = Image.new("RGBA", canvas.size, (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x+2, y+8, x+w+2, y+h+8), radius=r, fill=(*color, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow)

def eyebrow(draw, x, y, label, dark=False):
    """Vertical purple bar + uppercase label."""
    bar_color = BRAND
    draw.rectangle((x, y, x+5, y+30), fill=bar_color)
    text(draw, (x+14, y+1), label.upper(), F(LATO_BLACK, 24), bar_color)

def footer(canvas, dark=False):
    """Truecap. wordmark on the left + url on right."""
    d = ImageDraw.Draw(canvas)
    fg = WHITE if dark else INK
    sub = MUTED if dark else SUB
    text(d, (70, 990), "Truecap", F(LATO_BLACK, 56), fg)
    # the trademark dot in brand color
    bb = d.textbbox((70, 990), "Truecap", font=F(LATO_BLACK, 56))
    dot_x = bb[2] + 4
    text(d, (dot_x, 990), ".", F(LATO_BLACK, 56), BRAND)
    text(d, (CANVAS - 70, 1014), "usetruecap.com  →", F(LATO_MED, 22), sub, anchor="ra")

def page_header(canvas, eyebrow_label, headline, subtitle, dark=False, headline_size=72, headline_top=148, sub_top=None):
    d = ImageDraw.Draw(canvas)
    fg = WHITE if dark else INK
    sub_col = MUTED if dark else SUB
    eyebrow(d, 70, 100, eyebrow_label, dark=dark)
    text(d, (70, headline_top), headline, F(LATO_BLACK, headline_size), fg)
    # measure to place subtitle just below headline
    if sub_top is None:
        # rough line height: 1.0 of font size
        sub_top = headline_top + headline_size + 16
    text(d, (70, sub_top), subtitle, F(LATO_REG, 26), sub_col)

# ---------------------------------------------------------------- UI primitives

def browser_chrome(canvas, x, y, w, h, url="usetruecap.com", dark=False):
    """A 'rounded laptop window' frame. Returns inner rect (x, y, w, h)."""
    bg = CARD_DARK if dark else WHITE
    border_col = BORDER_DARK if dark else BORDER
    sub_col = MUTED if dark else SUB
    d = ImageDraw.Draw(canvas)
    rounded_rect(d, (x, y, x+w, y+h), 22, fill=bg, outline=border_col, width=2)
    # top bar
    bar_h = 50
    rounded_rect(d, (x, y, x+w, y+bar_h), 22, fill=bg)
    d.rectangle((x, y+bar_h-1, x+w, y+bar_h), fill=border_col)
    # traffic lights
    cx = x + 20; cy = y + 25
    for col in [(252,99,89), (251,193,67), (87,202,87)]:
        d.ellipse((cx, cy-7, cx+14, cy+7), fill=col)
        cx += 22
    # url pill
    pill_w = 260; pill_h = 30
    pill_x = x + (w - pill_w)//2
    pill_y = y + 10
    pill_col = (240,242,247) if not dark else (40,52,80)
    rounded_rect(d, (pill_x, pill_y, pill_x+pill_w, pill_y+pill_h), 15, fill=pill_col)
    text(d, (pill_x + pill_w//2, pill_y + pill_h//2), url,
         F(LATO_MED, 16), sub_col, anchor="mm")
    return (x+24, y+bar_h+22, w-48, h-bar_h-44)

def metric_tile(draw, x, y, w, h, label, value, value_color=INK, sub=None, dark=False):
    bg = (28, 38, 64) if dark else (250, 251, 254)
    border_col = BORDER_DARK if dark else BORDER
    label_col = MUTED if dark else SUB
    sub_col = MUTED if dark else SUB
    rounded_rect(draw, (x, y, x+w, y+h), 14, fill=bg, outline=border_col, width=1)
    text(draw, (x+18, y+18), label.upper(), F(LATO_BOLD, 14), label_col)
    text(draw, (x+18, y+42), value, F(LATO_BLACK, 40), value_color)
    if sub:
        text(draw, (x+18, y+h-32), sub, F(LATO_REG, 14), sub_col)

def pill(draw, x, y, text_str, fg=WHITE, bg=BRAND, pad_x=12, pad_y=6, font_size=14):
    f = F(LATO_BOLD, font_size)
    tw, th = measure(draw, text_str, f)
    rounded_rect(draw, (x, y, x+tw+pad_x*2, y+th+pad_y*2+4), 999, fill=bg)
    text(draw, (x+pad_x, y+pad_y), text_str, f, fg)
    return tw + pad_x*2

def button(draw, x, y, label, kind="primary", w=None, h=44, font_size=15):
    f = F(LATO_BOLD, font_size)
    pad = 18
    tw, th = measure(draw, label, f)
    if w is None: w = tw + pad*2
    if kind == "primary":
        bg, fg, border = BRAND, WHITE, BRAND
    elif kind == "outline":
        bg, fg, border = WHITE, INK, BORDER
    elif kind == "ghost":
        bg, fg, border = (240,242,247), INK, (240,242,247)
    rounded_rect(draw, (x, y, x+w, y+h), 10, fill=bg, outline=border, width=1)
    text(draw, (x+w//2, y+h//2), label, f, fg, anchor="mm")
    return w

def sparkline(draw, x, y, w, h, points, line_color=BRAND, fill_color=None):
    """Simple line chart inside (x,y,w,h)."""
    if not points: return
    mn, mx = min(points), max(points)
    rng = max(1, mx - mn)
    step = w / max(1, len(points) - 1)
    pts = []
    for i, v in enumerate(points):
        px = x + i * step
        py = y + h - ((v - mn) / rng) * h
        pts.append((px, py))
    if fill_color:
        # filled area under line
        poly = pts + [(x+w, y+h), (x, y+h)]
        draw.polygon(poly, fill=fill_color)
    for i in range(len(pts)-1):
        draw.line([pts[i], pts[i+1]], fill=line_color, width=3)
    # end dot
    px, py = pts[-1]
    r = 6
    draw.ellipse((px-r, py-r, px+r, py+r), fill=line_color, outline=WHITE, width=2)

# ---------------------------------------------------------------- per-post mockups

def mockup_mao(canvas, ix, iy, iw, ih, dark=False):
    """Mockup: 'Max Allowable Offer' card with three target inputs and a big result."""
    d = ImageDraw.Draw(canvas)
    # header
    text(d, (ix, iy), "Max Allowable Offer", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Highest price you should pay to hit your return thresholds.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # three target inputs row
    row_y = iy + 80
    col_w = (iw - 24) // 3
    for i, (lbl, val, suffix) in enumerate([
        ("TARGET CAP RATE", "8.0", "%"),
        ("TARGET CASH-ON-CASH", "8.0", "%"),
        ("MIN CASH FLOW", "200", "$/mo"),
    ]):
        cx = ix + i * (col_w + 12)
        bg = (28, 38, 64) if dark else WHITE
        rounded_rect(d, (cx, row_y, cx+col_w, row_y+78), 12,
                     fill=bg, outline=BORDER_DARK if dark else BORDER, width=1)
        text(d, (cx+14, row_y+12), lbl, F(LATO_BOLD, 12), MUTED if dark else SUB)
        text(d, (cx+14, row_y+34), val, F(LATO_BLACK, 28), WHITE if dark else INK)
        text(d, (cx+col_w-14, row_y+52), suffix, F(LATO_BOLD, 14), MUTED if dark else SUB, anchor="ra")
    # big result card
    res_y = row_y + 100
    res_h = 130
    rounded_rect(d, (ix, res_y, ix+iw, res_y+res_h), 16,
                 fill=BRAND_SOFT if not dark else (40, 52, 100),
                 outline=BRAND if not dark else (90, 100, 220), width=2)
    text(d, (ix+24, res_y+18), "MAX OFFER", F(LATO_BOLD, 14), BRAND)
    text(d, (ix+24, res_y+38), "$284,500", F(LATO_BLACK, 60), BRAND)
    text(d, (ix+iw-24, res_y+50), "At this price you'd get:",
         F(LATO_REG, 14), MUTED if dark else SUB, anchor="ra")
    text(d, (ix+iw-24, res_y+72), "8.0% cap · 8.0% CoC · $200/mo",
         F(LATO_BOLD, 16), WHITE if dark else INK, anchor="ra")

def mockup_sensitivity(canvas, ix, iy, iw, ih, dark=False):
    """Mockup: sensitivity grid with rent / vacancy / rate rows."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Sensitivity analysis", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "If rent comes in lower, vacancy spikes, or rates rise.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # header row
    col_w = (iw - 140) // 3
    hdr_y = iy + 90
    headers = ["STRESS", "BASE", "UPSIDE"]
    for i, h in enumerate(headers):
        x = ix + 140 + i * col_w
        text(d, (x + col_w//2, hdr_y), h, F(LATO_BOLD, 13), MUTED if dark else SUB, anchor="mm")
    # rows
    rows = [
        ("Rent",        "-10%",  "$2,950/mo", "+10%",   [-410, 640, 1690], [4.2, 7.6, 11.0]),
        ("Vacancy",     "+5pp",  "5%",        "-5pp",   [380, 640, 900],    [6.7, 7.6, 8.4]),
        ("Interest Rate","+1pp", "6.75%",     "-1pp",   [350, 640, 935],    [6.5, 7.6, 8.6]),
    ]
    row_h = (ih - 130) // 3
    for r_i, (lbl, sd, bd, ud, cfs, caps) in enumerate(rows):
        ry = iy + 120 + r_i * row_h
        text(d, (ix, ry+14), lbl, F(LATO_BLACK, 20), WHITE if dark else INK)
        text(d, (ix, ry+40), "±change", F(LATO_REG, 13), MUTED if dark else SUB)
        for i, (delta, cf, cap) in enumerate(zip([sd, bd, ud], cfs, caps)):
            x = ix + 140 + i * col_w + col_w//2
            tone = INK if i == 1 else (GREEN if cf >= cfs[1] else RED)
            if dark and i == 1: tone = WHITE
            text(d, (x, ry+6), delta, F(LATO_BOLD, 12), MUTED if dark else SUB, anchor="mm")
            sign = "" if cf < 0 else ""
            cf_str = ("$" + f"{abs(cf):,}" + "/mo") if cf >= 0 else ("-$" + f"{abs(cf):,}" + "/mo")
            text(d, (x, ry+28), cf_str, F(LATO_BLACK, 22), tone, anchor="mm")
            text(d, (x, ry+56), f"+{cap:.1f}% cap", F(LATO_REG, 14), MUTED if dark else SUB, anchor="mm")
        if r_i < len(rows) - 1:
            d.line([(ix, ry+row_h-6), (ix+iw, ry+row_h-6)],
                   fill=BORDER_DARK if dark else BORDER, width=1)

def mockup_brrrr(canvas, ix, iy, iw, ih, dark=False):
    """Mockup: BRRRR cash-left-in-deal with infinite-return badge."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "BRRRR analyzer", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Buy → rehab → rent → refinance. Models the cash-out.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # 4 metric tiles
    tile_y = iy + 88
    tile_h = 116
    col_w = (iw - 36) // 4
    metrics = [
        ("CASH LEFT IN DEAL", "$0", GREEN, "∞ return"),
        ("CASH RETURNED",     "$72,400", GREEN, "at refi"),
        ("POST-REFI CF",      "$520/mo", GREEN, "rented"),
        ("POST-REFI CoC",     "∞", BRAND, "infinite"),
    ]
    for i, (lbl, val, c, sub) in enumerate(metrics):
        x = ix + i * (col_w + 12)
        metric_tile(d, x, tile_y, col_w, tile_h, lbl, val, value_color=c, sub=sub, dark=dark)
    # cash-flow breakdown row
    br_y = tile_y + tile_h + 24
    text(d, (ix, br_y), "Cash going in", F(LATO_BOLD, 13), MUTED if dark else SUB)
    text(d, (ix + iw//2, br_y), "Refi", F(LATO_BOLD, 13), MUTED if dark else SUB)
    items_left = [("Down payment", "$25,000"), ("Rehab", "$45,000"),
                  ("Closing + carry", "$7,500"), ("Total invested", "$77,500")]
    items_right = [("New loan (75% LTV)", "$262,500"),
                   ("Refi closing", "$5,250"),
                   ("Cash returned", "$72,400"),
                   ("Equity created", "$58,000")]
    for i, (lbl, val) in enumerate(items_left):
        y = br_y + 22 + i*22
        bold = i == 3
        text(d, (ix, y), lbl, F(LATO_REG, 14), MUTED if dark else SUB)
        text(d, (ix + iw//2 - 30, y), val,
             F(LATO_BLACK if bold else LATO_BOLD, 14), WHITE if dark else INK, anchor="ra")
    for i, (lbl, val) in enumerate(items_right):
        y = br_y + 22 + i*22
        bold = i == 3
        text(d, (ix + iw//2, y), lbl, F(LATO_REG, 14), MUTED if dark else SUB)
        text(d, (ix + iw - 4, y), val,
             F(LATO_BLACK if bold else LATO_BOLD, 14), WHITE if dark else INK, anchor="ra")

def mockup_fixflip(canvas, ix, iy, iw, ih, dark=False):
    """Mockup: fix-and-flip with profit/ROI."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Fix-and-flip analyzer", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Buy → rehab → sell. With carrying costs and break-even ARV.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # 4 tiles
    tile_y = iy + 88
    tile_h = 120
    col_w = (iw - 36) // 4
    metrics = [
        ("NET PROFIT",      "$58,200",  GREEN,   "after sale"),
        ("ROI ON CASH",     "+42.8%",   GREEN,   "in hand"),
        ("ANNUALIZED ROI",  "+85.6%",   GREEN,   "6-mo hold"),
        ("PROFIT / DAY",    "$323",     BRAND,   "while rehabbing"),
    ]
    for i, (lbl, val, c, sub) in enumerate(metrics):
        x = ix + i * (col_w + 12)
        metric_tile(d, x, tile_y, col_w, tile_h, lbl, val, value_color=c, sub=sub, dark=dark)
    # ARV waterfall
    br_y = tile_y + tile_h + 26
    rounded_rect(d, (ix, br_y, ix+iw, br_y+150), 14,
                 fill=(28,38,64) if dark else (250,251,254),
                 outline=BORDER_DARK if dark else BORDER, width=1)
    text(d, (ix+20, br_y+16), "BREAK-EVEN ARV", F(LATO_BOLD, 13), MUTED if dark else SUB)
    text(d, (ix+20, br_y+40), "$386,500", F(LATO_BLACK, 42), WHITE if dark else INK)
    text(d, (ix+iw-20, br_y+50), "vs. target ARV $450,000",
         F(LATO_REG, 16), MUTED if dark else SUB, anchor="ra")
    # bars
    bar_y = br_y + 100
    bar_h = 24
    text(d, (ix+20, bar_y), "Break-even", F(LATO_REG, 12), MUTED if dark else SUB)
    rounded_rect(d, (ix+120, bar_y-4, ix+120+int(iw*0.55), bar_y+bar_h), 6, fill=AMBER)
    text(d, (ix+20, bar_y+32), "Target ARV", F(LATO_REG, 12), MUTED if dark else SUB)
    rounded_rect(d, (ix+120, bar_y+28, ix+120+int(iw*0.72), bar_y+28+bar_h), 6, fill=GREEN)

def mockup_rehab(canvas, ix, iy, iw, ih, dark=False):
    """Rehab estimator — sq-ft based catalog."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Rehab cost estimator", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Sq-ft defaults for every common work item.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # rows
    items = [
        ("Cosmetic paint",   "1,400 sf",  "$2.50/sf",  "$3,500"),
        ("Flooring (LVP)",   "1,400 sf",  "$4.00/sf",  "$5,600"),
        ("Kitchen refresh",  "1 ea",      "$7,500",    "$7,500"),
        ("Bath remodel",     "2 ea",      "$5,000",    "$10,000"),
        ("HVAC + water heater","1 ea",    "$8,500",    "$8,500"),
        ("Misc + 10% buffer","",          "",           "$3,500"),
    ]
    row_y = iy + 88
    row_h = 44
    for i, (label, qty, rate, total) in enumerate(items):
        y = row_y + i * row_h
        if i % 2 == 0:
            rounded_rect(d, (ix, y, ix+iw, y+row_h-4), 8,
                         fill=(28,38,64) if dark else (250,251,254))
        text(d, (ix+14, y+10), label, F(LATO_BOLD, 16), WHITE if dark else INK)
        text(d, (ix+iw*0.45, y+12), qty, F(LATO_REG, 14), MUTED if dark else SUB)
        text(d, (ix+iw*0.65, y+12), rate, F(LATO_REG, 14), MUTED if dark else SUB)
        text(d, (ix+iw-14, y+10), total, F(LATO_BLACK, 18), WHITE if dark else INK, anchor="ra")
    # total
    total_y = row_y + len(items)*row_h + 8
    d.line([(ix, total_y), (ix+iw, total_y)], fill=BORDER_DARK if dark else BORDER, width=2)
    text(d, (ix+14, total_y+12), "TOTAL REHAB BUDGET", F(LATO_BOLD, 14), MUTED if dark else SUB)
    text(d, (ix+iw-14, total_y+10), "$38,600", F(LATO_BLACK, 30), BRAND, anchor="ra")

def mockup_share(canvas, ix, iy, iw, ih, dark=False):
    """Share-link card with copy button."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Share this deal", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Public read-only view. No login required to view.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # url card
    card_y = iy + 90
    rounded_rect(d, (ix, card_y, ix+iw, card_y+72), 12,
                 fill=(28,38,64) if dark else WHITE,
                 outline=BORDER_DARK if dark else BORDER, width=1)
    text(d, (ix+18, card_y+12), "SHAREABLE LINK", F(LATO_BOLD, 11), MUTED if dark else SUB)
    text(d, (ix+18, card_y+34), "usetruecap.com/d/eyJ2IjoxL...d3MifQ",
         F(LATO_MED, 18), BRAND)
    btn_w = button(d, ix+iw-130, card_y+18, "Copy link", kind="primary", h=38)
    # share platforms
    p_y = card_y + 102
    text(d, (ix, p_y), "Send to", F(LATO_BOLD, 13), MUTED if dark else SUB)
    chip_x = ix + 80
    chip_y = p_y - 6
    for label in ["iMessage", "WhatsApp", "Slack", "Email", "X / Twitter"]:
        chip_w = pill(d, chip_x, chip_y, label, fg=INK if not dark else WHITE,
                      bg=(240,242,247) if not dark else (40,52,80),
                      pad_x=10, pad_y=6, font_size=13)
        chip_x += chip_w + 8
    # preview card
    pv_y = p_y + 60
    rounded_rect(d, (ix, pv_y, ix+iw, pv_y+170), 14,
                 fill=(28,38,64) if dark else (250,251,254),
                 outline=BORDER_DARK if dark else BORDER, width=1)
    text(d, (ix+18, pv_y+14), "PREVIEW CARD (auto-generated)",
         F(LATO_BOLD, 11), MUTED if dark else SUB)
    text(d, (ix+18, pv_y+34), "1700 W Erie · Philadelphia",
         F(LATO_BLACK, 22), WHITE if dark else INK)
    pill(d, ix+18, pv_y+68, "BUY", bg=GREEN, fg=WHITE, font_size=12)
    text(d, (ix+85, pv_y+72), "Purchase $295,000",
         F(LATO_BOLD, 15), MUTED if dark else SUB)
    # mini metrics
    mini_y = pv_y + 108
    mini_w = (iw - 18*2 - 24) // 3
    for i, (lbl, val) in enumerate([("CASH FLOW", "+$640/mo"), ("CAP", "+8.2%"), ("CoC", "+13.1%")]):
        x = ix + 18 + i * (mini_w + 12)
        text(d, (x, mini_y), lbl, F(LATO_BOLD, 10), MUTED if dark else SUB)
        text(d, (x, mini_y+18), val, F(LATO_BLACK, 22), GREEN)

def mockup_verdict(canvas, ix, iy, iw, ih, dark=False):
    """Auto-verdict paragraph card."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Plain-English verdict", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Auto-generated for every deal. 5-6 sentences, no jargon.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    card_y = iy + 88
    card_h = 420
    rounded_rect(d, (ix, card_y, ix+iw, card_y+card_h), 16,
                 fill=(28,38,64) if dark else WHITE,
                 outline=BORDER_DARK if dark else BORDER, width=1)
    # left accent
    d.rounded_rectangle((ix, card_y, ix+5, card_y+card_h), radius=4, fill=GREEN)
    text(d, (ix+24, card_y+18), "AI RECOMMENDATION", F(LATO_BOLD, 13), GREEN)
    text(d, (ix+24, card_y+38), "Buy — Low Risk", F(LATO_BLACK, 26), WHITE if dark else INK)
    # paragraph (wrapped)
    paragraph = [
        "1700 W Erie: solid fundamentals.",
        "Monthly cash flow of $640 after all expenses",
        "and debt service. Cap rate of 8.2% is healthy for",
        "most markets. DSCR of 1.34 clears the typical",
        "≥1.25 lender threshold — the property comfortably",
        "covers debt service. Cash-on-cash of 13.1% is",
        "strong; your capital is working harder than most",
        "alternatives. Solid fundamentals across the board;",
        "worth a deeper underwrite before offering.",
    ]
    ty = card_y + 88
    for line in paragraph:
        text(d, (ix+24, ty), line, F(LATO_REG, 18), WHITE if dark else INK)
        ty += 32

def mockup_address(canvas, ix, iy, iw, ih, dark=False):
    """Address autocomplete with dropdown of suggestions."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Address autocomplete", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Type the address. We fill the rest.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # input
    in_y = iy + 100
    rounded_rect(d, (ix, in_y, ix+iw, in_y+56), 12,
                 fill=WHITE, outline=BRAND, width=2)
    text(d, (ix+18, in_y+16), "1700 W Erie Ave", F(LATO_MED, 22), INK)
    # cursor
    d.rectangle((ix+220, in_y+16, ix+222, in_y+44), fill=BRAND)
    # dropdown
    dd_y = in_y + 64
    items = [
        ("1700 W Erie Ave",      "Philadelphia, PA 19140"),
        ("1700 Erie Blvd E",     "Syracuse, NY 13210"),
        ("1700 Erie Ave",        "North Hampton, OH 45349"),
        ("1700 W Erie St",       "Chicago, IL 60622"),
    ]
    row_h = 56
    rounded_rect(d, (ix, dd_y, ix+iw, dd_y+row_h*len(items)+12), 12,
                 fill=WHITE, outline=BORDER, width=1)
    for i, (line1, line2) in enumerate(items):
        y = dd_y + 8 + i*row_h
        if i == 0:
            rounded_rect(d, (ix+6, y, ix+iw-6, y+row_h-8), 8, fill=BRAND_SOFT)
        # pin
        pin_x = ix+22; pin_y = y + 18
        d.ellipse((pin_x-2, pin_y-2, pin_x+18, pin_y+18), fill=BRAND if i==0 else MUTED)
        text(d, (ix+56, y+8), line1, F(LATO_BOLD, 17), INK)
        text(d, (ix+56, y+30), line2, F(LATO_REG, 14), SUB)
    # auto-fill callout
    cb_y = dd_y + row_h*len(items) + 36
    rounded_rect(d, (ix, cb_y, ix+iw, cb_y+62), 12, fill=GREEN_SOFT,
                 outline=GREEN, width=1)
    text(d, (ix+18, cb_y+12), "↻ AUTO-FILLED FROM HUD + FRED",
         F(LATO_BOLD, 12), GREEN)
    text(d, (ix+18, cb_y+32), "Monthly rent $1,425  ·  Property tax 1.49% (PA)  ·  Rate 6.78%",
         F(LATO_MED, 17), INK)

def mockup_cash_purchase(canvas, ix, iy, iw, ih, dark=False):
    """Cash purchase metric — DSCR shown as '— Cash purchase'."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "All-cash purchase", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "DSCR is N/A when there's no debt. We get it right.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # tiles row
    tile_y = iy + 88
    tile_h = 116
    col_w = (iw - 36) // 4
    for i, (lbl, val, c, sub) in enumerate([
        ("CASH FLOW", "+$1,840/mo", GREEN, "no mortgage"),
        ("CAP RATE",  "+8.2%",      GREEN, "unleveraged"),
        ("CoC",       "+5.6%",      BRAND, "year 1"),
        ("DSCR",      "—",          INK,   "Cash purchase"),
    ]):
        x = ix + i * (col_w + 12)
        metric_tile(d, x, tile_y, col_w, tile_h, lbl, val,
                    value_color=c if not dark else (WHITE if c==INK else c),
                    sub=sub, dark=dark)
    # verdict card
    v_y = tile_y + tile_h + 24
    rounded_rect(d, (ix, v_y, ix+iw, v_y+140), 14,
                 fill=BRAND_SOFT if not dark else (40,52,100),
                 outline=BRAND, width=2)
    text(d, (ix+20, v_y+14), "DEAL VERDICT", F(LATO_BOLD, 13), BRAND)
    text(d, (ix+20, v_y+34), "Strong Buy", F(LATO_BLACK, 30), WHITE if dark else INK)
    text(d, (ix+20, v_y+76), "DSCR isn't applicable for an all-cash purchase —",
         F(LATO_REG, 16), MUTED if dark else SUB)
    text(d, (ix+20, v_y+100), "no debt service to cover. Score reflects cash deal correctly.",
         F(LATO_REG, 16), MUTED if dark else SUB)

def mockup_projection_chart(canvas, ix, iy, iw, ih, dark=False):
    """10-year cash flow projection — line chart."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "10-year projection", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Cumulative cash flow + rent growth modeled annually.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # big number
    text(d, (ix, iy+88), "$14,200", F(LATO_BLACK, 64), GREEN)
    text(d, (ix+260, iy+126), "Year 10 cumulative", F(LATO_REG, 16), MUTED if dark else SUB)
    # chart area
    ch_x = ix; ch_y = iy + 200; ch_w = iw; ch_h = 240
    rounded_rect(d, (ch_x, ch_y, ch_x+ch_w, ch_y+ch_h), 14,
                 fill=(28,38,64) if dark else (250,251,254),
                 outline=BORDER_DARK if dark else BORDER, width=1)
    # data
    cum = [7680, 8500, 9380, 10310, 11290, 12320, 13400, 14530, 15710, 16940]
    fill_col = (130, 110, 220, 60) if not dark else (130, 110, 220, 80)
    inner = (ch_x+20, ch_y+30, ch_w-40, ch_h-60)
    canvas2 = canvas.convert("RGBA")
    d2 = ImageDraw.Draw(canvas2)
    sparkline(d2, inner[0], inner[1], inner[2], inner[3], cum,
              line_color=BRAND, fill_color=(130, 110, 220, 60))
    canvas.paste(canvas2, (0,0))
    # axis labels
    d = ImageDraw.Draw(canvas)
    for i in range(0, 10, 2):
        x = inner[0] + i * inner[2] / 9
        text(d, (x, ch_y+ch_h-22), f"Y{i+1}", F(LATO_REG, 12), MUTED if dark else SUB, anchor="mm")

def mockup_tax_chart(canvas, ix, iy, iw, ih, dark=False):
    """Tax savings bar chart per year."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Depreciation = tax savings", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "27.5-yr residential schedule. Bigger savings the first 10 yrs.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    text(d, (ix, iy+88), "$8,420", F(LATO_BLACK, 64), GREEN)
    text(d, (ix+260, iy+126), "yr-1 tax savings", F(LATO_REG, 16), MUTED if dark else SUB)
    ch_y = iy + 200
    ch_h = 240
    rounded_rect(d, (ix, ch_y, ix+iw, ch_y+ch_h), 14,
                 fill=(28,38,64) if dark else (250,251,254),
                 outline=BORDER_DARK if dark else BORDER, width=1)
    # bars
    savings = [8420, 8550, 8680, 8810, 8950, 9090, 9230, 9370, 9520, 9670]
    mx = max(savings); mn = 7000
    bar_x = ix + 30
    bar_y_base = ch_y + ch_h - 50
    bar_y_top = ch_y + 40
    bar_w = (iw - 60 - 9*8) // 10
    for i, s in enumerate(savings):
        h_px = int((s - mn) / (mx - mn) * (bar_y_base - bar_y_top))
        x = bar_x + i * (bar_w + 8)
        top = bar_y_base - h_px
        rounded_rect(d, (x, top, x+bar_w, bar_y_base), 6, fill=GREEN)
        text(d, (x+bar_w//2, bar_y_base+18), f"Y{i+1}", F(LATO_REG, 12), MUTED if dark else SUB, anchor="mm")

def mockup_exit_chart(canvas, ix, iy, iw, ih, dark=False):
    """Exit scenarios — best year to sell as bars."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Exit scenarios", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Total profit if you sold in year X — including appreciation.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    text(d, (ix, iy+88), "Year 7", F(LATO_BLACK, 64), BRAND)
    text(d, (ix+200, iy+126), "best year to sell", F(LATO_REG, 16), MUTED if dark else SUB)
    ch_y = iy + 200
    ch_h = 240
    rounded_rect(d, (ix, ch_y, ix+iw, ch_y+ch_h), 14,
                 fill=(28,38,64) if dark else (250,251,254),
                 outline=BORDER_DARK if dark else BORDER, width=1)
    profits = [38, 52, 67, 84, 102, 121, 144, 132, 119, 105]
    mx = max(profits); mn = 0
    bar_x = ix + 30
    bar_y_base = ch_y + ch_h - 50
    bar_y_top = ch_y + 40
    bar_w = (iw - 60 - 9*8) // 10
    best_idx = profits.index(mx)
    for i, p in enumerate(profits):
        h_px = int((p - mn) / (mx - mn) * (bar_y_base - bar_y_top))
        x = bar_x + i * (bar_w + 8)
        top = bar_y_base - h_px
        fill = BRAND if i == best_idx else (BORDER_DARK if dark else (200,210,240))
        rounded_rect(d, (x, top, x+bar_w, bar_y_base), 6, fill=fill)
        if i == best_idx:
            text(d, (x+bar_w//2, top-22), f"${p}K", F(LATO_BLACK, 14), BRAND, anchor="mm")
        text(d, (x+bar_w//2, bar_y_base+18), f"Y{i+1}", F(LATO_REG, 12),
             MUTED if dark else SUB, anchor="mm")

def mockup_compare(canvas, ix, iy, iw, ih, dark=False):
    """Side-by-side compare 4 deals."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Compare 4 deals", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Side-by-side. Best metric in each row is highlighted.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # deals
    col_x = ix + 180
    col_w = (iw - 180) // 4
    addresses = ["1700 W Erie", "823 N 25th", "5142 Walton", "2200 Diamond"]
    rows = [
        ("Cash flow/mo", ["$640", "$420", "$510", "$380"], 0),
        ("Cap rate",     ["+8.2%", "+6.4%", "+7.1%", "+5.9%"], 0),
        ("CoC return",   ["+13.1%", "+8.8%", "+10.5%", "+7.2%"], 0),
        ("DSCR",         ["1.34", "1.12", "1.21", "1.08"], 0),
    ]
    # header row
    hdr_y = iy + 90
    for i, addr in enumerate(addresses):
        cx = col_x + i * col_w + col_w//2
        chip_color = [GREEN, BRAND, AMBER, MUTED][i]
        rounded_rect(d, (cx - 18, hdr_y - 6, cx + 18, hdr_y + 18), 999, fill=chip_color)
        text(d, (cx, hdr_y + 4), str(i+1), F(LATO_BLACK, 14), WHITE, anchor="mm")
        text(d, (cx, hdr_y + 36), addr, F(LATO_BOLD, 14), WHITE if dark else INK, anchor="mm")
    # rows
    row_y = hdr_y + 78
    row_h = 56
    for r_i, (lbl, vals, best_idx) in enumerate(rows):
        y = row_y + r_i * row_h
        if r_i % 2 == 0:
            rounded_rect(d, (ix, y-6, ix+iw, y+row_h-12), 8,
                         fill=(28,38,64) if dark else (250,251,254))
        text(d, (ix+8, y+10), lbl, F(LATO_BOLD, 15), MUTED if dark else SUB)
        for i, v in enumerate(vals):
            cx = col_x + i * col_w + col_w//2
            color = GREEN if i == best_idx else (WHITE if dark else INK)
            text(d, (cx, y+10), v, F(LATO_BLACK, 22), color, anchor="mm")
    # winner badge
    badge_y = row_y + len(rows)*row_h + 16
    rounded_rect(d, (ix, badge_y, ix+iw, badge_y+50), 12, fill=GREEN_SOFT,
                 outline=GREEN, width=1)
    text(d, (ix+18, badge_y+15), "🏆  WINNER: 1700 W ERIE  ·  best in 4 of 4 metrics",
         F(LATO_BLACK, 16), GREEN)

def mockup_pdf_export(canvas, ix, iy, iw, ih, dark=False):
    """PDF cover preview."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Pro PDF export", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Send to lenders + partners. Multi-page report.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # paper card — smaller so the Export button below has room
    p_x = ix + (iw - 340)//2
    p_y = iy + 86
    p_w = 340; p_h = 380
    # shadow
    shadow = Image.new("RGBA", canvas.size, (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((p_x+4, p_y+12, p_x+p_w+4, p_y+p_h+12), radius=10, fill=(15,23,42,40))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(canvas)
    rounded_rect(d, (p_x, p_y, p_x+p_w, p_y+p_h), 10, fill=WHITE, outline=BORDER, width=1)
    # top accent
    rounded_rect(d, (p_x, p_y, p_x+p_w, p_y+8), 10, fill=BRAND)
    # logo — measure 'Truecap' to place the dot tight against the end
    logo_font = F(LATO_BLACK, 22)
    text(d, (p_x+20, p_y+24), "Truecap", logo_font, INK)
    logo_bb = d.textbbox((p_x+20, p_y+24), "Truecap", font=logo_font)
    text(d, (logo_bb[2] + 2, p_y+24), ".", logo_font, BRAND)
    text(d, (p_x+20, p_y+50), "Investment analysis report", F(LATO_REG, 12), SUB)
    # hero address
    text(d, (p_x+20, p_y+98), "1700 W ERIE", F(LATO_BLACK, 26), INK)
    text(d, (p_x+20, p_y+130), "PHILADELPHIA, PA", F(LATO_BOLD, 12), SUB)
    # pills
    px = p_x+20; py = p_y+158
    pw = pill(d, px, py, "BUY", bg=GREEN, fg=WHITE, font_size=10); px += pw + 6
    pw = pill(d, px, py, "SCORE 84", bg=BRAND, fg=WHITE, font_size=10); px += pw + 6
    pw = pill(d, px, py, "LOW RISK", bg=GREEN, fg=WHITE, font_size=10)
    # mini metrics grid 3x2 — denser to fit the smaller paper
    g_y = p_y+200
    g_w = (p_w - 40 - 12) // 3
    grid_items = [
        ("CASH FLOW", "$640", GREEN),
        ("CoC", "+13.1%", BRAND),
        ("CAP", "+8.2%", GREEN),
        ("DSCR", "1.34", GREEN),
        ("TAX SAVE", "$320", GREEN),
        ("AFTER-TAX", "$960", BRAND),
    ]
    for i, (lbl, val, c) in enumerate(grid_items):
        gx = p_x + 20 + (i%3)*(g_w+6)
        gy = g_y + (i//3)*46
        rounded_rect(d, (gx, gy, gx+g_w, gy+40), 6, fill=(250,251,254), outline=BORDER, width=1)
        text(d, (gx+8, gy+4), lbl, F(LATO_BOLD, 8), SUB)
        text(d, (gx+8, gy+16), val, F(LATO_BLACK, 16), c)
    # verdict block
    vy = g_y + 100
    rounded_rect(d, (p_x+20, vy, p_x+p_w-20, vy+62), 8, fill=(248,250,255), outline=BORDER, width=1)
    text(d, (p_x+30, vy+8), "AI RECOMMENDATION", F(LATO_BOLD, 9), BRAND)
    text(d, (p_x+30, vy+22), "1700 W Erie: solid fundamentals.", F(LATO_BOLD, 10), INK)
    text(d, (p_x+30, vy+38), "Cap 8.2% · DSCR 1.34 · clears threshold.", F(LATO_REG, 9), SUB)
    # download button below paper — within mockup card
    btn_y = p_y + p_h + 18
    btn_w = 220
    btn_x = ix + (iw - btn_w)//2
    button(d, btn_x, btn_y, "↓ Export PDF", kind="primary", w=btn_w, h=46, font_size=16)

def mockup_glossary(canvas, ix, iy, iw, ih, dark=False):
    """Hovering glossary tooltip over a DSCR metric."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Glossary tooltips", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Hover any underlined term. No jargon left unexplained.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # mini dashboard row of metrics
    tile_y = iy + 100
    tile_h = 116
    col_w = (iw - 24) // 3
    for i, (lbl, val, c, sub) in enumerate([
        ("CAP RATE", "+8.2%", GREEN, "healthy"),
        ("DSCR",     "1.34",  GREEN, "Bankable (≥1.25)"),
        ("CoC",      "+13.1%", BRAND, "year 1"),
    ]):
        x = ix + i * (col_w + 12)
        metric_tile(d, x, tile_y, col_w, tile_h, lbl, val, value_color=c, sub=sub, dark=dark)
        # underline dotted on label of DSCR
        if i == 1:
            # underline label
            d.line([(x+18, tile_y+34), (x+18+58, tile_y+34)], fill=MUTED, width=1)
    # tooltip pointing at DSCR
    tt_x = ix + col_w + 12 + col_w//2 - 200
    tt_y = tile_y + tile_h + 14
    tt_w = 400; tt_h = 174
    # triangle pointer
    d.polygon([(tt_x + 220, tt_y),
               (tt_x + 232, tt_y - 12),
               (tt_x + 244, tt_y)], fill=INK if not dark else WHITE)
    rounded_rect(d, (tt_x, tt_y, tt_x+tt_w, tt_y+tt_h), 12,
                 fill=INK if not dark else WHITE)
    fg = WHITE if not dark else INK
    sub_col = (210,215,230) if not dark else SUB
    text(d, (tt_x+18, tt_y+14), "DSCR (Debt Service Coverage Ratio)",
         F(LATO_BLACK, 16), fg)
    lines = [
        "Net Operating Income ÷ mortgage payment.",
        "Measures whether the property's income",
        "comfortably covers the debt service.",
        "",
        "Lenders typically want ≥1.25 for investment",
        "loans; 1.0 means exactly break-even on debt.",
    ]
    ty = tt_y + 40
    for line in lines:
        if line:
            text(d, (tt_x+18, ty), line, F(LATO_REG, 14), sub_col)
        ty += 20

def mockup_mobile(canvas, ix, iy, iw, ih, dark=False):
    """Phone frame in the middle of the canvas."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "On any device", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "Full analyzer fits in your pocket. Run the deal mid-walkthrough.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # phone frame
    ph_w = 260; ph_h = 510
    ph_x = ix + (iw - ph_w)//2
    ph_y = iy + 96
    # shadow
    shadow = Image.new("RGBA", canvas.size, (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((ph_x+4, ph_y+10, ph_x+ph_w+4, ph_y+ph_h+10), radius=38, fill=(15,23,42,60))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(canvas)
    rounded_rect(d, (ph_x, ph_y, ph_x+ph_w, ph_y+ph_h), 38, fill=INK)
    # screen inset
    sc_x = ph_x + 10; sc_y = ph_y + 14
    sc_w = ph_w - 20; sc_h = ph_h - 28
    rounded_rect(d, (sc_x, sc_y, sc_x+sc_w, sc_y+sc_h), 32,
                 fill=WHITE if not dark else (32,42,68))
    # notch
    rounded_rect(d, (ph_x+ph_w//2-40, ph_y+12, ph_x+ph_w//2+40, ph_y+30), 12, fill=INK)
    # screen content — header
    text(d, (sc_x + 16, sc_y + 38), "1700 W Erie", F(LATO_BLACK, 16), INK if not dark else WHITE)
    text(d, (sc_x + 16, sc_y + 58), "Single Family · $295k", F(LATO_REG, 10), SUB if not dark else MUTED)
    # pill
    pill(d, sc_x + 16, sc_y + 86, "BUY", bg=GREEN, fg=WHITE, font_size=9)
    # 4 mini tiles 2x2
    mt_y = sc_y + 130
    mw = (sc_w - 32 - 8) // 2
    mtiles = [
        ("CASH FLOW", "+$640", GREEN),
        ("CAP RATE",  "+8.2%", GREEN),
        ("CoC",       "+13.1%", BRAND),
        ("DSCR",      "1.34",   GREEN),
    ]
    for i, (lbl, val, c) in enumerate(mtiles):
        x = sc_x + 16 + (i%2)*(mw+8)
        y = mt_y + (i//2)*64
        rounded_rect(d, (x, y, x+mw, y+56), 8,
                     fill=(250,251,254) if not dark else (28,38,64),
                     outline=BORDER if not dark else BORDER_DARK, width=1)
        text(d, (x+8, y+6), lbl, F(LATO_BOLD, 8), SUB if not dark else MUTED)
        text(d, (x+8, y+18), val, F(LATO_BLACK, 20), c)
    # mini sparkline
    sp_y = mt_y + 64*2 + 18
    rounded_rect(d, (sc_x+16, sp_y, sc_x+sc_w-16, sp_y+100), 8,
                 fill=(250,251,254) if not dark else (28,38,64),
                 outline=BORDER if not dark else BORDER_DARK, width=1)
    text(d, (sc_x+24, sp_y+8), "10-YR CASH FLOW", F(LATO_BOLD, 9), SUB if not dark else MUTED)
    text(d, (sc_x+sc_w-24, sp_y+8), "$14,200", F(LATO_BLACK, 12), GREEN, anchor="ra")
    cum = [7680, 8500, 9380, 10310, 11290, 12320, 13400, 14530, 15710, 16940]
    canvas2 = canvas.convert("RGBA")
    d2 = ImageDraw.Draw(canvas2)
    sparkline(d2, sc_x+24, sp_y+34, sc_w-48, 50, cum, line_color=BRAND, fill_color=(130,110,220,80))
    canvas.paste(canvas2, (0,0))

def mockup_tools_grid(canvas, ix, iy, iw, ih, dark=False):
    """Grid of 5 free calculator cards."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "5 free calculators", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "No signup. Same math as the full analyzer.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # 2-up grid of 5 cards
    cards = [
        ("CAP RATE",         "/tools/cap-rate-calculator",     "Earnings ÷ price"),
        ("CASH-ON-CASH",     "/tools/cash-on-cash-calculator", "ROI on cash invested"),
        ("BRRRR",            "/tools/brrrr-calculator",        "Cash-out refi math"),
        ("1% RULE",          "/tools/1-percent-rule-calculator","Quick pass/fail screen"),
        ("REHAB COST",       "/tools/rehab-cost-estimator",    "Sq-ft based budget"),
    ]
    cw = (iw - 24) // 2
    ch = 130
    for i, (title, slug, sub) in enumerate(cards):
        row = i // 2; col = i % 2
        x = ix + col * (cw + 24)
        y = iy + 100 + row * (ch + 20)
        if i == 4:
            # span 2 cols on last row
            x = ix
            cw_local = iw
        else:
            cw_local = cw
        rounded_rect(d, (x, y, x+cw_local, y+ch), 14,
                     fill=(28,38,64) if dark else WHITE,
                     outline=BORDER_DARK if dark else BORDER, width=1)
        # calc icon (square)
        d.rounded_rectangle((x+18, y+18, x+58, y+58), radius=10, fill=BRAND_SOFT)
        text(d, (x+38, y+38), "Σ", F(LATO_BLACK, 28), BRAND, anchor="mm")
        text(d, (x+74, y+22), title, F(LATO_BLACK, 20), WHITE if dark else INK)
        text(d, (x+74, y+50), sub, F(LATO_REG, 14), MUTED if dark else SUB)
        text(d, (x+18, y+ch-30), "usetruecap.com" + slug,
             F(LATO_MED, 12), BRAND)

def mockup_setup_time(canvas, ix, iy, iw, ih, dark=False):
    """Big '60 seconds' number with feature list."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "60 seconds", F(LATO_BLACK, 140), BRAND)
    text(d, (ix, iy+148), "from address to defensible answer.",
         F(LATO_BOLD, 24), WHITE if dark else INK)
    text(d, (ix, iy+186), "No spreadsheet. No setup. No signup.",
         F(LATO_REG, 18), MUTED if dark else SUB)
    # checklist
    items = [
        "Type the address — auto-fills rent + rate + tax",
        "Adjust price + financing in two clicks",
        "Cap rate, CoC, DSCR, cash flow — live",
        "10-year projection + tax + exit + Deal Score",
        "Export PDF. Save. Compare. Share.",
    ]
    cy = iy + 250
    for line in items:
        # check chip
        rounded_rect(d, (ix, cy, ix+32, cy+32), 8, fill=GREEN)
        text(d, (ix+16, cy+16), "✓", F(LATO_BLACK, 20), WHITE, anchor="mm")
        text(d, (ix+50, cy+4), line, F(LATO_BOLD, 18), WHITE if dark else INK)
        cy += 50

# ---------------------------------------------------------------- post configs

POSTS = [
    # (number, slug, dark, eyebrow, headline, subtitle, mockup_fn, [headline_size, headline_top, sub_top])
    (31, "mao_calculator",       False, "Pro feature",      "Reverse-solve the offer.",       "Type your target return. We give you the max price.", mockup_mao,            {"hs":62}),
    (32, "sensitivity_grid",     True,  "Phase 1",          "Stress-test before you offer.",  "Rent ±10%, vacancy ±5pp, rates ±1pp — at a glance.",   mockup_sensitivity,    {"hs":60}),
    (33, "brrrr_analyzer",       False, "Strategies",       "Did your money come back?",      "BRRRR math: cash left in deal + post-refi cash flow.", mockup_brrrr,          {"hs":58}),
    (34, "fixflip_analyzer",     False, "Strategies",       "Will this flip pay?",            "ROI, annualized ROI, profit/day, break-even ARV.",     mockup_fixflip,        {"hs":62}),
    (35, "rehab_estimator",      True,  "Strategies",       "Defensible rehab budgets.",      "Sq-ft based defaults for every common work item.",     mockup_rehab,          {"hs":56}),
    (36, "share_link",           False, "Share + collab",   "One link. View-only.",           "Send your analysis. No login required to view.",       mockup_share,          {"hs":68}),
    (37, "auto_verdict",         True,  "Auto-verdict",     "Plain English in 6 sentences.",  "Every deal gets a 'what does this mean?' summary.",    mockup_verdict,        {"hs":52}),
    (38, "address_autocomplete", False, "Auto-fill",        "Type the address.",              "We fill in rent (HUD), rate (FRED), property tax (state).", mockup_address,    {"hs":68}),
    (39, "cash_purchase",        True,  "Edge case",        "All cash? We still get it right.","DSCR is N/A when there's no debt. Verdict reflects it.", mockup_cash_purchase,{"hs":50}),
    (40, "projection_chart",     False, "10-Year view",     "$14,200 in 10 years.",           "Compounding cash flow with rent + expense growth.",    mockup_projection_chart,{"hs":62}),
    (41, "tax_strategy",         True,  "Tax strategy",     "$8,420/yr saved in taxes.",      "Depreciation modeled on the 27.5-yr residential schedule.", mockup_tax_chart,{"hs":56}),
    (42, "exit_scenarios",       False, "Exit scenarios",   "Best year to sell: Year 7.",     "Total profit if you sold in year X — including appreciation.", mockup_exit_chart,{"hs":56}),
    (43, "compare_deals",        True,  "Compare",          "4 deals. One winner.",           "Side-by-side. Best metric in each row highlighted.",   mockup_compare,        {"hs":62}),
    (44, "pdf_export",           False, "Pro PDF",          "Lender-ready report.",           "4-page PDF with verdict, projections, tax, exit.",     mockup_pdf_export,     {"hs":62}),
    (45, "glossary_tooltips",    False, "Glossary",         "Every term explained.",          "Hover any metric. Plain-English + benchmark range.",   mockup_glossary,       {"hs":62}),
    (46, "mobile_first",         True,  "Mobile",           "Underwrite from the showing.",   "Full analyzer + Strategies + Compare. No desktop required.", mockup_mobile,  {"hs":54}),
    (47, "free_calculators",     False, "Free /tools",      "5 calculators. No signup.",      "Cap rate, CoC, BRRRR, 1% rule, rehab. Same math.",     mockup_tools_grid,     {"hs":58}),
    (48, "fast_setup",           True,  "Speed",            "Stop building spreadsheets.",    "TrueCap replaces the 50-tab workbook in 60 seconds.",  mockup_setup_time,     {"hs":56}),
    # 2 stand-alones — also UI-led
    (49, "deal_score_again",     False, "Deal Score",       "Triage 20 deals in an hour.",    "0-100 composite of cap, CoC, cash flow, DSCR.",        None,                   {"hs":58}),
    (50, "ready_to_underwrite",  True,  "Get started",      "Run your first deal free.",      "No card. No spreadsheet. usetruecap.com",              None,                   {"hs":62}),
]

# ---------------------------------------------------------------- standalone mockups for 49, 50

def mockup_deal_score(canvas, ix, iy, iw, ih, dark=False):
    """Big circular score gauge."""
    d = ImageDraw.Draw(canvas)
    text(d, (ix, iy), "Deal Score", F(LATO_BLACK, 26), WHITE if dark else INK)
    text(d, (ix, iy+34), "0-100 composite of cap, CoC, cash flow, DSCR.",
         F(LATO_REG, 16), MUTED if dark else SUB)
    # gauge centered
    g_size = 320
    gx = ix + (iw - g_size)//2
    gy = iy + 100
    # bg ring
    d.arc((gx, gy, gx+g_size, gy+g_size), start=135, end=405, fill=BRAND_SOFT, width=24)
    # value ring (84/100 = 84%)
    sweep = int(270 * 0.84)
    d.arc((gx, gy, gx+g_size, gy+g_size), start=135, end=135+sweep, fill=BRAND, width=24)
    # value number
    text(d, (gx+g_size//2, gy+g_size//2-12), "84",
         F(LATO_BLACK, 130), BRAND, anchor="mm")
    text(d, (gx+g_size//2, gy+g_size//2+72), "STRONG BUY",
         F(LATO_BLACK, 22), GREEN, anchor="mm")
    # breakdown row
    br_y = gy + g_size + 40
    parts = [("CASH FLOW", "+25", GREEN), ("CoC", "+20", GREEN), ("CAP RATE", "+20", GREEN), ("DSCR", "+20", GREEN), ("RISK", "-1", AMBER)]
    pw = (iw - (len(parts)-1)*10) // len(parts)
    for i, (lbl, val, c) in enumerate(parts):
        x = ix + i * (pw + 10)
        rounded_rect(d, (x, br_y, x+pw, br_y+58), 8,
                     fill=(28,38,64) if dark else (250,251,254),
                     outline=BORDER_DARK if dark else BORDER, width=1)
        text(d, (x+pw//2, br_y+8), lbl, F(LATO_BOLD, 10), MUTED if dark else SUB, anchor="ma")
        text(d, (x+pw//2, br_y+28), val, F(LATO_BLACK, 22), c, anchor="ma")

def mockup_cta(canvas, ix, iy, iw, ih, dark=False):
    """Big CTA card."""
    d = ImageDraw.Draw(canvas)
    # card
    c_h = 360
    c_y = iy + (ih - c_h)//2 - 40
    rounded_rect(d, (ix, c_y, ix+iw, c_y+c_h), 24,
                 fill=BRAND if not dark else (40, 52, 100),
                 outline=BRAND, width=0)
    text(d, (ix+iw//2, c_y+76), "Run your first", F(LATO_REG, 28), WHITE, anchor="mm")
    text(d, (ix+iw//2, c_y+136), "deal free.", F(LATO_BLACK, 88), WHITE, anchor="mm")
    text(d, (ix+iw//2, c_y+200), "No card. No spreadsheet.", F(LATO_REG, 22), (220, 225, 250), anchor="mm")
    # big button
    btn_w = 280
    button(d, ix+(iw-btn_w)//2, c_y+248, "Start at usetruecap.com →",
           kind="ghost", w=btn_w, h=64, font_size=18)
    # feature chips below
    chips_y = c_y + c_h + 30
    cx = ix
    for label in ["100% free to start", "Auto-fill from address", "Lender-ready PDF"]:
        cw_local = pill(d, cx, chips_y, label,
                        fg=INK if not dark else WHITE,
                        bg=(240,242,247) if not dark else (40,52,80),
                        font_size=14, pad_x=14, pad_y=8)
        cx += cw_local + 12

# patch references
POSTS[18] = (49, "deal_score_again", False, "Deal Score", "Triage 20 deals in an hour.",
             "0-100 composite of cap, CoC, cash flow, DSCR.", mockup_deal_score, {"hs":58})
POSTS[19] = (50, "ready_to_underwrite", True, "Get started", "Run your first deal free.",
             "No card. No spreadsheet. usetruecap.com", mockup_cta, {"hs":62})

# ---------------------------------------------------------------- main

def make_post(num, slug, dark, eyebrow_label, headline, subtitle, mockup_fn, opts):
    bg = DARK_BG if dark else LIGHT_BG
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (*bg, 255))
    # subtle radial glow in dark mode
    if dark:
        glow = Image.new("RGBA", canvas.size, (0,0,0,0))
        gd = ImageDraw.Draw(glow)
        # purple glow top-right
        gd.ellipse((600, -200, 1300, 500), fill=(82, 72, 212, 50))
        glow = glow.filter(ImageFilter.GaussianBlur(120))
        canvas.alpha_composite(glow)
    # header
    page_header(canvas, eyebrow_label, headline, subtitle, dark=dark,
                headline_size=opts.get("hs", 62),
                headline_top=opts.get("ht", 148))
    # mockup
    mock_x = 60
    mock_y = 320
    mock_w = CANVAS - 120
    mock_h = 600
    # outer card wrap
    d = ImageDraw.Draw(canvas)
    if mockup_fn:
        # soft container around the mockup area
        if not dark:
            shadow_card(canvas, mock_x-12, mock_y-12, mock_w+24, mock_h+24, r=24)
            d = ImageDraw.Draw(canvas)
        bg_card = WHITE if not dark else (24, 33, 56)
        rounded_rect(d, (mock_x, mock_y, mock_x+mock_w, mock_y+mock_h), 22,
                     fill=bg_card, outline=BORDER_DARK if dark else BORDER, width=1)
        # inner mockup
        mockup_fn(canvas, mock_x+30, mock_y+28, mock_w-60, mock_h-56, dark=dark)
    # footer
    footer(canvas, dark=dark)
    # save
    out = canvas.convert("RGB")
    path = f"/sessions/adoring-sweet-einstein/mnt/final_source_code/instagram-posts/{num:02d}_{slug}.png"
    out.save(path, "PNG", optimize=True)
    return path

if __name__ == "__main__":
    paths = []
    for p in POSTS:
        path = make_post(*p)
        paths.append(path)
        print(f"  {os.path.basename(path)}")
    print(f"\nGenerated {len(paths)} posts.")
