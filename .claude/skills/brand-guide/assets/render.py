#!/usr/bin/env python3
"""
Build a brand guide from a client directory.

    python3 render.py <client-dir> [--no-pdf]

Expects:
    <client-dir>/brand.json
    <client-dir>/assets/*.svg        (logo + icon files, referenced from brand.json)

Writes:
    <client-dir>/out/brand-guide.html
    <client-dir>/out/brand-guide.pdf
    <client-dir>/out/GAPS.md
"""
import json, sys, shutil, pathlib, re

HERE = pathlib.Path(__file__).parent
TOKEN = "/*__BRAND_JSON__*/"

# Cheapest-next-win ordering: what each locked section costs to unlock.
COST = {
    "foundation":     ("4 short answers",            "positioning headline, one paragraph, 3 pillars"),
    "typography":     ("font names",                 "1-3 typefaces with roles"),
    "logo_variations": ("logo art",                  "reversed / mono / mark / stacked files"),
    "voice":          ("5 short answers",            "3-4 voice attributes, say/avoid lists"),
    "art_direction":  ("3 answers + 1 image",        "photo principles, grounds, one reference"),
    "iconography":    ("icon files",                 "2+ icon SVGs with roles"),
    "legal":          ("jurisdiction + claims",      "required copy, trademark status"),
}


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def build(client_dir: pathlib.Path, make_pdf=True):
    bj = client_dir / "brand.json"
    if not bj.exists():
        die(f"no brand.json in {client_dir}")

    try:
        brand = json.loads(bj.read_text())
    except json.JSONDecodeError as e:
        die(f"brand.json is not valid JSON — {e}")

    out = client_dir / "out"
    out.mkdir(exist_ok=True)

    # Copy client assets next to the rendered HTML so relative paths resolve.
    src_assets = client_dir / "assets"
    if src_assets.exists():
        dst = out / "assets"
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src_assets, dst)

    tpl = (HERE / "template.html").read_text()
    if TOKEN not in tpl:
        die("template.html is missing the __BRAND_JSON__ token")

    # Replace the token AND the inline demo object that follows it.
    payload = TOKEN + " " + json.dumps(brand, ensure_ascii=False)
    tpl = re.sub(
        re.escape(TOKEN) + r"\s*\{.*?\};",
        lambda m: payload + ";",
        tpl,
        count=1,
        flags=re.S,
    )

    html_path = out / "brand-guide.html"
    html_path.write_text(tpl)

    pages, gaps = [], []
    if make_pdf:
        pages, gaps = render_pdf(html_path, out / "brand-guide.pdf")

    write_gaps(out / "GAPS.md", brand, pages, gaps)

    print(f"\n  {len(pages)} pages → {out/'brand-guide.pdf'}")
    if pages:
        print("  " + " · ".join(pages))
    if gaps:
        print(f"\n  {len(gaps)} sections locked. Cheapest next wins:")
        for g in rank(gaps):
            cost = COST.get(g["id"], ("more data", ""))[0]
            print(f"    - {g['title']:<16} {cost}")
    print(f"\n  gap manifest → {out/'GAPS.md'}\n")


def render_pdf(html_path: pathlib.Path, pdf_path: pathlib.Path):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1100, "height": 850})
        pg.goto(html_path.resolve().as_uri())
        pg.wait_for_timeout(900)
        pages = pg.evaluate("window.__PAGES__ || []")
        gaps = pg.evaluate("window.__GAPS__ || []")
        pg.pdf(
            path=str(pdf_path),
            width="11in",
            height="8.5in",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
        )
        b.close()
    return pages, gaps


def rank(gaps):
    """Fewest missing inputs first — the cheapest thing to unlock next."""
    return sorted(gaps, key=lambda g: (len(g["missing"]), g["title"]))


def write_gaps(path, brand, pages, gaps):
    L = [
        f"# {brand.get('name','Brand')} — brand guide status",
        "",
        f"**{len(pages)} pages built.** Revision {brand.get('version','?')}.",
        "",
        "## Built",
        "",
    ]
    for i, p in enumerate(pages, 1):
        L.append(f"{i:02d}. {p}")
    if gaps:
        L += ["", "## Locked", "",
              "| Section | Cost to unlock | What's needed | Missing keys |",
              "|---|---|---|---|"]
        for g in rank(gaps):
            cost, what = COST.get(g["id"], ("more data", "—"))
            keys = ", ".join(f"`{k}`" for k in g["missing"])
            L.append(f"| {g['title']} | {cost} | {what} | {keys} |")
        L += ["", "Add the keys to `brand.json` and re-run. Page numbers renumber themselves."]
    else:
        L += ["", "## Locked", "", "None — every section has data."]
    path.write_text("\n".join(L) + "\n")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        die("usage: python3 render.py <client-dir> [--no-pdf]")
    build(pathlib.Path(args[0]).resolve(), make_pdf="--no-pdf" not in sys.argv)
