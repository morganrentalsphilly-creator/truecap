#!/usr/bin/env python3
"""
TrueCap Instagram posts: what is left of batch 2 (posts 31-50).

Draws four posts: 32 (sensitivity grid), 35 (rehab estimator), 40 (10-year
projection) and 43 (compare deals). Each is a 1080x1080 PNG.

The other sixteen posts of the batch, and the functions that drew them, were
removed on 2026-10-02 because each stated something that is not true today:
tax and exit features, the refinance and resale strategy models, property tax
filled in automatically, a report described as ready for a lender, an "AI
recommendation", a buy or strong-buy verdict or a price the reader "should
pay" (the product shows a screening result and an Offer Ceiling, not advice),
a lender threshold stated as fact, calculators that are retired, or a share
preview card that shows the address and metrics. Do not add a post back
without checking its text against lib/entitlements-catalog.ts,
lib/product-facts.ts and lib/verdict-display.ts.

The figures in the four remaining mockups are sample figures, not output of
the analyzer. Regenerate them from the real engine before publishing.

Run:  python3 generate_batch2.py
Outputs: 32_*.png, 35_*.png, 40_*.png and 43_*.png in this folder.
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


# ---------------------------------------------------------------- post configs

POSTS = [
    # (number, slug, dark, eyebrow, headline, subtitle, mockup_fn, [headline_size, headline_top, sub_top])
    (32, "sensitivity_grid",     True,  "Phase 1",          "Stress-test before you offer.",  "Rent ±10%, vacancy ±5pp, rates ±1pp — at a glance.",   mockup_sensitivity,    {"hs":60}),
    (35, "rehab_estimator",      True,  "Strategies",       "Defensible rehab budgets.",      "Sq-ft based defaults for every common work item.",     mockup_rehab,          {"hs":56}),
    (40, "projection_chart",     False, "10-Year view",     "$14,200 in 10 years.",           "Compounding cash flow with rent + expense growth.",    mockup_projection_chart,{"hs":62}),
    (43, "compare_deals",        True,  "Compare",          "4 deals. One winner.",           "Side-by-side. Best metric in each row highlighted.",   mockup_compare,        {"hs":62}),
]


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
