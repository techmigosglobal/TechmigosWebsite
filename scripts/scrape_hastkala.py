#!/usr/bin/env python3
"""
Hastkala E-Commerce Site Scraper
Scrapes: colors, images, typography, products, navigation, text content
Target: https://ecommerce-site-taupe-seven.vercel.app/
"""

import requests, json, re, time
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://ecommerce-site-taupe-seven.vercel.app"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}
PAGES = ["/", "/shop", "/categories", "/about", "/sell"]

def get_page(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        return BeautifulSoup(resp.text, "html.parser"), resp.text
    except Exception as e:
        print(f"  [ERR] {url}: {e}")
        return None, None

def extract_colors(text):
    hex_c = re.findall(r'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', text)
    css_v = re.findall(r'--([\w-]+)\s*:\s*([^;}\n]+)', text)
    return hex_c, css_v

def extract_images(soup, base_url):
    imgs = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src","")
        if src:
            imgs.append({"src": urljoin(base_url, src), "alt": img.get("alt","")})
    for el in soup.find_all(style=True):
        for u in re.findall(r'url\(["\']?([^"\')\s]+)["\']?\)', el.get("style","")):
            if u.startswith("http") or u.startswith("/"):
                imgs.append({"src": urljoin(base_url, u), "alt": "bg"})
    return imgs

def extract_products(soup):
    products = []
    # Next.js renders products as JSON in script tags
    for script in soup.find_all("script", type="application/json"):
        try:
            data = json.loads(script.string or "")
            def walk(node):
                if isinstance(node, dict):
                    if "name" in node and "price" in node:
                        products.append({
                            "name": str(node.get("name","")),
                            "price": str(node.get("price","")),
                            "originalPrice": str(node.get("originalPrice", node.get("original_price",""))),
                            "discount": str(node.get("discount","")),
                            "category": str(node.get("category","")),
                            "image": str(node.get("image", node.get("img",""))),
                            "rating": str(node.get("rating","")),
                            "reviews": str(node.get("reviews", node.get("reviewCount",""))),
                            "description": str(node.get("description",""))[:200],
                        })
                    for v in node.values():
                        walk(v)
                elif isinstance(node, list):
                    for item in node:
                        walk(item)
            walk(data)
        except:
            pass
    
    # Also try __NEXT_DATA__ 
    for script in soup.find_all("script", id="__NEXT_DATA__"):
        try:
            data = json.loads(script.string or "")
            def walk2(node):
                if isinstance(node, dict):
                    if "name" in node and ("price" in node or "category" in node):
                        products.append({
                            "name": str(node.get("name","")),
                            "price": str(node.get("price","")),
                            "originalPrice": str(node.get("originalPrice", node.get("original_price",""))),
                            "discount": str(node.get("discount","")),
                            "category": str(node.get("category","")),
                            "image": str(node.get("image", node.get("img",""))),
                            "rating": str(node.get("rating","")),
                            "reviews": str(node.get("reviews", node.get("reviewCount",""))),
                            "description": str(node.get("description",""))[:200],
                        })
                    for v in node.values():
                        walk2(v)
                elif isinstance(node, list):
                    for item in node:
                        walk2(item)
            walk2(data)
        except:
            pass
    
    # HTML card fallback
    if not products:
        for card in soup.find_all(class_=re.compile(r'product|card', re.I))[:20]:
            name_el = card.find(["h2","h3","h4","p"], class_=re.compile(r'name|title', re.I)) or card.find(["h2","h3","h4"])
            price_el = card.find(class_=re.compile(r'price|cost', re.I))
            img_el = card.find("img")
            badge_el = card.find(class_=re.compile(r'badge|discount', re.I))
            if name_el:
                products.append({
                    "name": name_el.get_text(strip=True),
                    "price": price_el.get_text(strip=True) if price_el else "",
                    "image": urljoin(BASE_URL, img_el.get("src","")) if img_el else "",
                    "badge": badge_el.get_text(strip=True) if badge_el else "",
                })
    return products

def extract_stats(soup, raw_html):
    stats = []
    # Look for stat patterns in raw HTML
    stat_matches = re.findall(r'([\d,]+\+?[kK]?)\s*[^<]{0,5}<[^>]+>\s*([A-Za-z][^<]{2,40})', raw_html)
    for val, label in stat_matches[:10]:
        clean_label = re.sub(r'<[^>]+>', '', label).strip()
        if clean_label and len(clean_label) < 50:
            stats.append({"value": val, "label": clean_label})
    return stats[:8]

def extract_typography(soup):
    fonts = set()
    for link in soup.find_all("link", rel="stylesheet"):
        href = link.get("href","")
        if "fonts.googleapis.com" in href:
            for f in re.findall(r'family=([^&:]+)', href):
                fonts.add(f.replace("+", " ").split(":")[0])
    for style in soup.find_all("style"):
        for f in re.findall(r"@import.*?family=([^&'\"]+)", style.get_text()):
            fonts.add(f.replace("+", " ").split(":")[0])
    headings = {}
    for tag in ["h1","h2","h3"]:
        texts = [h.get_text(strip=True) for h in soup.find_all(tag) if h.get_text(strip=True)]
        if texts:
            headings[tag] = list(dict.fromkeys(texts))[:6]
    return {"fonts": list(fonts), "headings": headings}

def extract_sections(soup):
    """Extract descriptive page sections."""
    sections = []
    for el in soup.find_all(["section","div"], class_=re.compile(r'hero|about|feature|mission|story|banner|why|value', re.I)):
        text = el.get_text(separator=" ", strip=True)
        if 30 < len(text) < 800:
            sections.append(text[:600])
    return list(dict.fromkeys(sections))[:8]

def scrape():
    result = {
        "base_url": BASE_URL,
        "pages": {},
        "all_colors": set(),
        "css_vars": [],
        "all_images": [],
        "products": [],
        "categories": [],
        "stats": [],
        "typography": {},
        "navigation": [],
    }

    all_imgs = []
    seen_products = {}

    for path in PAGES:
        url = BASE_URL + path
        print(f"\n🔍 {url}")
        soup, raw = get_page(url)
        if not soup:
            continue

        # Colors
        style_text = " ".join(s.get_text() for s in soup.find_all("style"))
        inline = " ".join(el.get("style","") for el in soup.find_all(style=True))
        hex_c, css_v = extract_colors(style_text + inline + (raw[:80000] if raw else ""))
        result["all_colors"].update(hex_c)
        result["css_vars"].extend(css_v[:15])

        # Images
        imgs = extract_images(soup, url)
        all_imgs.extend(imgs)
        print(f"  📸 {len(imgs)} images")

        # Typography
        typo = extract_typography(soup)
        if typo["fonts"]:
            result["typography"]["fonts"] = list(set(result["typography"].get("fonts",[]) + typo["fonts"]))
        for tag, texts in typo["headings"].items():
            existing = result["typography"].get(tag, [])
            result["typography"][tag] = list(dict.fromkeys(existing + texts))[:8]

        # Navigation (from first page only)
        if not result["navigation"]:
            nav = soup.find("nav") or soup.find(class_=re.compile(r'nav|header', re.I))
            if nav:
                for a in nav.find_all("a")[:15]:
                    txt = a.get_text(strip=True)
                    href = a.get("href","")
                    if txt:
                        result["navigation"].append({"text": txt, "href": href})

        # Products
        prods = extract_products(soup)
        for p in prods:
            name = p.get("name","")
            if name and name not in seen_products:
                seen_products[name] = p
        print(f"  🛍️  {len(prods)} products")

        # Stats
        stats = extract_stats(soup, raw or "")
        result["stats"].extend(stats)

        # Sections
        sections = extract_sections(soup)

        # Categories from links
        for a in soup.find_all("a", href=True):
            href = a.get("href","")
            txt = a.get_text(strip=True)
            if ("categor" in href.lower() or "category" in href.lower()) and txt and len(txt) < 40:
                result["categories"].append({"name": txt, "href": href})

        result["pages"][path] = {
            "url": url,
            "title": soup.title.get_text(strip=True) if soup.title else "",
            "meta": (soup.find("meta", attrs={"name":"description"}) or {}).get("content",""),
            "images": [i["src"] for i in imgs[:20]],
            "product_count": len(prods),
            "sections": sections[:4],
            "headings": typo["headings"],
        }

        time.sleep(0.8)

    # Finalize
    result["all_colors"] = sorted(list(result["all_colors"]))
    result["all_images"] = list({i["src"]: i for i in all_imgs if i.get("src","").startswith("http")}.values())
    result["products"] = list(seen_products.values())
    result["categories"] = list({c["name"]: c for c in result["categories"] if c["name"]}.values())[:20]
    result["stats"] = list({s.get("value",""):s for s in result["stats"] if s.get("label","")}.values())[:8]
    result["css_vars"] = list({f"{v[0]}:{v[1]}":v for v in result["css_vars"]}.values())[:30]

    print(f"\n✅ Done! Images:{len(result['all_images'])} Colors:{len(result['all_colors'])} Products:{len(result['products'])} Categories:{len(result['categories'])}")
    return result

if __name__ == "__main__":
    data = scrape()
    out = "/Users/techmigos/Documents/TechmigosWebsite/scripts/hastkala_scraped.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved → {out}")
