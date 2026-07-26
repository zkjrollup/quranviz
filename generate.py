#!/usr/bin/env python3
"""
Static page generator for QuranViz.
Reads data/topics.json, stamps out one detail page per topic
into pages/, and writes an index.json manifest the main
page can use to link out to each detail page.

This mirrors the BibViz pattern: one flat, independently
linkable + indexable HTML page per topic, all sharing a
template, all generated from a single data source.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(ROOT, "data", "topics.json")
PAGES_DIR = os.path.join(ROOT, "pages")

os.makedirs(PAGES_DIR, exist_ok=True)

with open(DATA_PATH, "r", encoding="utf-8") as f:
    topics = json.load(f)

# Validation: catch duplicate or malformed slugs before anything gets written
seen_slugs = set()
for t in topics:
    slug = t.get("slug", "")
    if not slug:
        raise ValueError(f"Topic missing a slug: {t.get('title', '(no title)')}")
    if not re.match(r"^[a-z0-9-]+$", slug):
        raise ValueError(f"Slug '{slug}' has invalid characters (use only lowercase, numbers, hyphens)")
    if slug in seen_slugs:
        raise ValueError(f"Duplicate slug detected: '{slug}'")
    seen_slugs.add(slug)

print(f"Validated {len(topics)} topics, all slugs unique and well-formed.\n")

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — QuranViz</title>
<meta name="description" content="{text_escaped}">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');
  :root{{
    --bg: #0B0B0D; --panel: rgba(255,255,255,0.06); --line: rgba(255,255,255,0.14);
    --ink: #EDEDEE; --ink-soft: #9A9BA3; --cat: {color};
  }}
  *{{ box-sizing:border-box; }}
  body{{ margin:0; background:var(--bg); color:var(--ink); font-family:'Inter', sans-serif; line-height:1.6; }}
  .nav{{ padding:1.6rem 6vw; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; }}
  .nav a{{ color:var(--ink-soft); text-decoration:none; font-size:0.85rem; }}
  .nav a:hover{{ color:var(--ink); }}
  .nav .brand{{ color:var(--ink); font-weight:700; font-family:'Source Serif 4', serif; }}
  main{{ max-width:720px; margin:0 auto; padding:3.5rem 6vw 5rem; }}
  .badge{{
    display:inline-block; font-size:0.7rem; letter-spacing:0.05em; text-transform:uppercase;
    color:#fff; background:var(--cat); padding:0.3rem 0.7rem; border-radius:999px; margin-bottom:1.2rem;
  }}
  h1{{ font-family:'Source Serif 4', serif; font-weight:700; font-size:clamp(1.8rem,4.5vw,2.6rem); line-height:1.15; margin:0 0 1.6rem; }}
  .ref{{ font-size:0.85rem; color:var(--ink-soft); margin-bottom:1.8rem; letter-spacing:0.02em; }}
  .quote-card{{
    background:rgba(255,255,255,0.045); border:1px solid var(--line);
    border-bottom:3px solid var(--cat); border-radius:10px; padding:1.8rem 2rem; margin-bottom:1.6rem;
  }}
  .quote-mark{{ font-family:Georgia, serif; font-size:2.6rem; line-height:1; color:var(--cat); opacity:0.35; display:block; margin-bottom:-0.4rem; }}
  .quote-text{{ font-size:1.15rem; line-height:1.6; margin:0; }}
  .note{{ font-size:0.95rem; color:var(--ink-soft); border-left:2px solid var(--line); padding-left:1rem; margin-bottom:2rem; }}
  .note strong{{ color:var(--ink); }}
  .note-label{{ font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--cat); display:block; margin-bottom:0.4rem; }}
  .verses-section{{ margin-bottom:2rem; }}
  .verses-label{{ font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--cat); display:block; margin-bottom:0.8rem; }}
  .verse-item{{
    border:1px solid var(--line); border-radius:8px; padding:1rem 1.2rem; margin-bottom:0.7rem;
    background:rgba(255,255,255,0.03);
  }}
  .verse-ref{{ font-size:0.78rem; color:var(--ink-soft); margin-bottom:0.5rem; }}
  .verse-arabic{{ font-size:1.3rem; direction:rtl; text-align:right; margin-bottom:0.5rem; line-height:1.6; }}
  .verse-translit{{ font-style:italic; color:var(--ink); font-size:0.95rem; margin-bottom:0.3rem; }}
  .verse-gloss{{ font-size:0.85rem; color:var(--ink-soft); }}
  .actions{{ display:flex; gap:1rem; flex-wrap:wrap; }}
  .btn{{
    display:inline-block; padding:0.65rem 1.2rem; border-radius:6px; font-size:0.88rem;
    text-decoration:none; border:1px solid var(--line);
  }}
  .btn.primary{{ background:var(--cat); color:#0B0B0D; border-color:var(--cat); font-weight:600; }}
  .btn.secondary{{ color:var(--ink-soft); }}
  footer{{ text-align:center; color:var(--ink-soft); font-size:0.75rem; padding:2rem 6vw; border-top:1px solid var(--line); }}
</style>
</head>
<body>
<div class="nav">
  <a class="brand" href="../index.html">QuranViz</a>
  <a href="../index.html">&larr; All entries</a>
</div>
<main>
  <span class="badge" style="background:{color}">{category_label}</span>
  <h1>{title}</h1>
  <div class="ref">{ref}</div>
  <div class="quote-card">
    <span class="quote-mark">&ldquo;</span>
    <p class="quote-text">{text}</p>
  </div>
  <div class="note">
    <span class="note-label">Context</span>
    {note}
  </div>
  {verses_html}
  <div class="actions">
    <a class="btn primary" href="{link}" target="_blank" rel="noopener">Read the full passage &rarr;</a>
    <a class="btn secondary" href="../index.html#{category}">Back to {category_label}</a>
  </div>
</main>
<footer>paraphrased for citation purposes &middot; follow the link above for the full passage in a translation of your choice</footer>
</body>
</html>
"""

def esc(s: str) -> str:
    return s.replace('"', "&quot;")

def build_verses_html(topic: dict) -> str:
    verses = topic.get("contested_wording")
    if not verses:
        return ""
    items = ""
    for v in verses:
        items += f"""
    <div class="verse-item">
      <div class="verse-ref">{v['ref']}</div>
      <div class="verse-arabic">{v['arabic']}</div>
      <div class="verse-translit">{v['transliteration']}</div>
      <div class="verse-gloss">{v['gloss']}</div>
    </div>"""
    return f"""<div class="verses-section">
    <span class="verses-label">Contested Wording (Arabic &amp; Transliteration)</span>{items}
  </div>"""

manifest = []

for t in topics:
    html = PAGE_TEMPLATE.format(
        title=t["title"],
        text_escaped=esc(t["text"]),
        color=t["color"],
        category=t["category"],
        category_label=t["category_label"],
        ref=t["ref"],
        text=t["text"],
        note=t["note"],
        link=t["link"],
        verses_html=build_verses_html(t),
    )
    out_path = os.path.join(PAGES_DIR, f"{t['slug']}.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    manifest.append({
        "slug": t["slug"],
        "title": t["title"],
        "category": t["category"],
        "url": f"pages/{t['slug']}.html",
    })
    print(f"  wrote pages/{t['slug']}.html")

with open(os.path.join(ROOT, "data", "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

print(f"\nDone. Generated {len(topics)} pages + data/manifest.json")
