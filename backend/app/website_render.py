"""Server-rendered institutional sites. The same renderer serves preview and publication.

All editorial text is plain text. URLs are checked again here, independently of
input validation, so legacy/database values cannot turn into active markup.
"""
import html
import math
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zoneinfo import ZoneInfo


THEMES = {'horizon', 'editorial', 'culture', 'campus'}
SECTION_KINDS = {'cards', 'split', 'gallery', 'steps', 'cta', 'news', 'agenda', 'text'}


def escape(value):
    return html.escape(str(value or ''), quote=True)


def safe_url(value, image=False):
    if not isinstance(value, str) or not value or len(value) > 1000:
        return ''
    decoded = unquote(value)
    if value != value.strip() or any(ord(c) < 32 or ord(c) == 127 for c in decoded) or '\\' in decoded:
        return ''
    try:
        url = urlsplit(value)
        port = url.port
        if url.username or url.password or (port is not None and not 1 <= port <= 65535):
            return ''
        if url.scheme == 'https' and url.hostname:
            return value
        if not url.scheme and not url.netloc:
            if value.startswith('/') and not decoded.startswith('//'):
                return value if not image or value.startswith('/api/v1/') else ''
            if not image and re.fullmatch(r'#[a-zA-Z][a-zA-Z0-9_-]*', value):
                return value
        if not image and url.scheme in {'mailto', 'tel'} and url.path and not url.netloc:
            return value
    except (ValueError, UnicodeError):
        pass
    return ''


def paragraphs(value, css=''):
    attribute = f' class="{css}"' if css else ''
    return ''.join(f'<p{attribute}>{escape(p)}</p>'
                   for p in str(value or '').split('\n\n') if p.strip())


def action(value, css='text-link'):
    if not isinstance(value, dict):
        return ''
    url = safe_url(value.get('url'))
    label = value.get('label')
    if not url or not label:
        return ''
    return f'<a class="{css}" href="{escape(url)}">{escape(label)}<span aria-hidden="true"> ↗</span></a>'


def picture(value, css='', eager=False):
    if not isinstance(value, dict):
        return ''
    url = safe_url(value.get('url'), image=True)
    if not url:
        return ''
    def focal(key):
        try:
            result = float(value.get(key, 50))
            return max(0, min(100, result)) if math.isfinite(result) else 50
        except (ValueError, TypeError):
            return 50
    position = f'{focal("focal_x"):g}% {focal("focal_y"):g}%'
    return (f'<img class="photo {css}" src="{escape(url)}" alt="{escape(value.get("alt"))}" '
            f'style="object-position:{position}" loading="{"eager" if eager else "lazy"}" '
            f'decoding="async" referrerpolicy="no-referrer">')


def _post(post, event=False):
    title = escape(post.get('title'))
    summary = paragraphs(post.get('summary'))
    content = paragraphs(post.get('content'))
    # Current community posts have no mandatory image. Explicit editorial blocks
    # can illustrate stories without inventing an image or changing their audience.
    media = picture(post.get('image'))
    meta = ''
    if event:
        try:
            date = datetime.fromisoformat(str(post.get('event_start', '')).replace('Z', '+00:00'))
            if date.tzinfo is not None:
                date = date.astimezone(ZoneInfo('America/Bahia'))
            months = ('JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ')
            meta = f'<time datetime="{escape(post.get("event_start"))}"><b>{date.day:02}</b> {months[date.month-1]} <span>{date.year}</span></time>'
        except (TypeError, ValueError):
            meta = ''
        if post.get('location'):
            meta += f'<p class="location">{escape(post["location"])}</p>'
    details = f'<details class="story-details"><summary>Ler publicação</summary><div class="prose">{content}</div></details>' if content else ''
    return f'<article class="story {"event" if event else ""}">{media}{meta}<h3>{title}</h3>{summary}{details}</article>'


def render(data):
    school, site, brand = data['school'], dict(data['website']), data['identity']
    home_design = site.get('design') or {}
    design = dict(home_design)
    composition_v2 = design.get('composition_version') == 2
    page = data.get('page') if isinstance(data.get('page'), dict) else None
    if page is not None:
        site.update(headline=page.get('title', ''), introduction=page.get('introduction', ''), about='', notice='')
        design.update(configured=True, sections=page.get('sections') or [],
                      hero_image=page.get('image'), hero_gallery=[], eyebrow='')
    # Pydantic may materialize defaults on publication; these are equivalent to
    # legacy {}. Only configured sections suppress the legacy content fallback.
    sections_configured = bool(design.get('configured') or design.get('sections'))
    custom_design = sections_configured or any(design.get(key) for key in ('eyebrow', 'hero_image', 'hero_gallery', 'primary_action', 'secondary_action', 'menu', 'footer_text', 'header_sticky', 'mobile_actions'))
    name = brand.get('display_name') or school['name']
    theme = site.get('theme') if site.get('theme') in THEMES else 'horizon'
    def color(key, fallback):
        value = brand.get(key)
        return value if isinstance(value, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', value) else fallback
    primary, secondary = color('primary_color', '#006D77'), color('secondary_color', '#193549')
    # Legacy explicit serif/sans overrides remain readable; the normal route is
    # the application's existing institution theme (including its custom font).
    font = {'serif': 'Georgia,serif', 'sans': 'Arial,sans-serif'}.get(brand.get('font_family'), 'var(--institution-font,system-ui,sans-serif)')
    logo_url = brand.get('logo_url', '')
    logo = f'<img class="logo" src="{escape(logo_url)}" alt="">' if re.fullmatch(r'/api/v1/institution/assets/[0-9a-f]{64}\.png', logo_url) else ''
    primary_action = design.get('primary_action') or ({'url': site.get('admission_url'), 'label': 'Inscrição e matrícula'} if site.get('admission_url') else {'url': '#contato', 'label': 'Conheça a escola'})
    secondary_action = design.get('secondary_action') or {'url': site.get('portal_url'), 'label': 'Portal do Aluno' if custom_design else 'Portal da família'}
    # Header/footer/mobile actions are global configuration, unlike section CTAs.
    # On an internal page their anchors must target the home they were authored for.
    if page is not None:
        primary_action = dict(primary_action)
        secondary_action = dict(secondary_action)
        for global_action in (primary_action, secondary_action):
            if isinstance(global_action.get('url'), str) and global_action['url'].startswith('#'):
                global_action['url'] = '/' + global_action['url']
    actions = action(primary_action, 'button') + action(secondary_action, 'button secondary')
    hero_copy = f'<div class="hero-copy"><p class="eyebrow">{escape(design.get("eyebrow"))}</p><h1>{escape(site.get("headline"))}</h1>{paragraphs(site.get("introduction"), "lead")}<div class="actions">{actions}</div></div>'
    hero_image = picture(design.get('hero_image'), 'hero-photo', eager=True)
    def captioned(image, css='', eager=False):
        media = picture(image, css, eager)
        if not media:
            return ''
        caption = image.get('caption', '') if isinstance(image, dict) else ''
        return f'<figure class="captioned-photo">{media}<figcaption>{escape(caption)}</figcaption></figure>' if composition_v2 else media
    # The overall hero caption can also be stored on its central photograph.
    # Render that exact text once, below the mosaic, including on small screens.
    gallery = [captioned({**item, 'caption': ''} if composition_v2 and isinstance(item, dict)
                         and item.get('caption') == design.get('hero_caption') else item, eager=True)
               for item in (design.get('hero_gallery') or [])[:3]]
    gallery = [item for item in gallery if item]
    posts = [post for post in data.get('posts', []) if isinstance(post, dict)]
    news_posts = [_post(post) for post in posts if post.get('kind') != 'event']
    news = ''.join(news_posts)
    if theme == 'campus' and news_posts:
        lead = f'<div class="magazine-lead">{news_posts[0]}</div>'
        sides = '<div class="magazine-secondary">' + ''.join(news_posts[1:3]) + '</div>' if len(news_posts) > 1 else ''
        rest = '<div class="magazine-more">' + ''.join(news_posts[3:]) + '</div>' if len(news_posts) > 3 else ''
        news = f'<div class="magazine-news">{lead}{sides}{rest}</div>'
    agenda = ''.join(_post(post, True) for post in posts if post.get('kind') == 'event')

    if page is not None:
        breadcrumb = '<a class="text-link" href="/">← Página inicial</a>'
        page_copy = f'<div class="page-copy">{breadcrumb}<h1>{escape(page.get("title"))}</h1>{paragraphs(page.get("introduction"), "lead")}</div>'
        page_media = f'<div class="page-media">{hero_image}</div>' if hero_image else ''
        hero = f'<section class="hero internal-cover container">{page_copy}{page_media}</section>'
    elif theme == 'editorial':
        mosaic = gallery or ([hero_image] if hero_image else [])
        hero = f'<section class="hero editorial-cover"><div class="container">{hero_copy}<div class="hero-mosaic">{"".join(mosaic)}</div></div></section>'
    elif theme == 'culture':
        project_cover = f'<div class="project-cover">{hero_image}</div>' if hero_image and not composition_v2 else ''
        hero = f'<section class="hero culture-cover container">{hero_copy}{project_cover}</section>'
    elif theme == 'campus':
        # Magazine composition: title above a leading image and companion stories.
        companions = ''.join(f'<figure>{picture(item, eager=True)}<figcaption>{escape(item.get("alt"))}</figcaption></figure>' for item in (design.get('hero_gallery') or [])[:2] if safe_url(item.get('url'), image=True))
        side_images = f'<aside class="quick-links">{companions}</aside>' if companions else ''
        magazine_cover = f'<div class="magazine-cover"><div>{hero_image}</div>{side_images}</div>' if (hero_image or side_images) and not composition_v2 else ''
        hero = f'<section class="hero campus-cover container">{hero_copy}{magazine_cover}</section>'
    else:
        hero = f'<section class="hero institutional-cover {"has-photo" if hero_image else "no-photo"}"><div class="hero-art">{hero_image}</div><div class="container">{hero_copy}</div></section>'

    sections = design.get('sections') or []
    # A genuinely empty design retains the existing about/news/agenda content.
    # An explicit empty sections array on a configured design means intentional removal.
    if not sections_configured:
        sections = ([{'id': 'escola', 'kind': 'text', 'title': 'Nossa escola', 'text': site.get('about', '')}] if site.get('about') else [])
        sections += [{'id': 'novidades', 'kind': 'news', 'title': 'Histórias da escola'}, {'id': 'agenda', 'kind': 'agenda', 'title': 'Próximos encontros'}]
    if composition_v2 and not page and design.get('hero_caption'):
        caption = f'<p class="hero-caption">{escape(design["hero_caption"])}</p>'
        hero = hero.rsplit('</section>', 1)[0] + '<div class="container hero-caption-wrap">' + caption + '</div></section>'
    demonstration = '<aside class="demonstration-banner" role="status">Modelo demonstrativo — substitua textos e imagens antes de publicar.</aside>' if design.get('demonstration') else ''
    visible_sections = []
    used_ids = {'conteudo', 'contato', 'topo'}
    for index, section in enumerate(sections[:20]):
        if not isinstance(section, dict) or section.get('visible', True) is False:
            continue
        section_id = section.get('id', '')
        if not re.fullmatch(r'[a-z][a-z0-9-]{0,59}', str(section_id)) or section_id in used_ids:
            section_id = f'secao-{index+1}'
            while section_id in used_ids:
                section_id += '-bloco'
        used_ids.add(section_id)
        kind = section.get('kind') if section.get('kind') in SECTION_KINDS else 'text'
        deferred_action = composition_v2 and (kind in {'split', 'cta'} or (theme == 'culture' and kind == 'steps'))
        section_action = action(section.get('action'), 'button' if kind == 'cta' and composition_v2 else 'text-link')
        eyebrow = f'<p class="eyebrow">{escape(section["eyebrow"])}</p>' if section.get('eyebrow') else ''
        heading = f'<div class="section-heading"><div>{eyebrow}<h2>{escape(section.get("title"))}</h2></div>{"" if deferred_action else section_action}</div>'
        if composition_v2 and not section.get('title') and not eyebrow and not action(section.get('action')):
            heading = ''
        text = paragraphs(section.get('text'), 'section-intro')
        trailing_action = section_action if deferred_action else ''
        media = captioned(section.get('image'))
        layout = section.get('layout', 'default') if composition_v2 else 'default'
        if layout not in {'default','pillars','feature','quote','magazine','dates','spotlight'}:
            layout = 'default'
        items = []
        for number, item in enumerate((section.get('items') or [])[:12], 1):
            if not isinstance(item, dict):
                continue
            item_eyebrow = f'<p class="eyebrow">{escape(item.get("eyebrow"))}</p>' if composition_v2 and item.get('eyebrow') else ''
            item_body = f'{captioned(item.get("image"))}<div class="item-copy">{item_eyebrow}<h3>{escape(item.get("title"))}</h3>{paragraphs(item.get("text"))}{action(item.get("action"))}</div>'
            step = f'<span class="step-number">{number:02}</span>' if kind == 'steps' or (composition_v2 and kind == 'split' and layout == 'default') else ''
            items.append(f'<article class="content-item">{step}{item_body}</article>')
        content_items = ''.join(items)
        if layout == 'magazine' and kind not in {'news', 'agenda'}:
            lead = f'<div class="composition-lead">{items[0]}</div>' if items else ''
            sides = f'<div class="composition-secondary">{"".join(items[1:3])}</div>' if len(items)>1 else ''
            rest = f'<div class="composition-more">{"".join(items[3:])}</div>' if len(items)>3 else ''
            content = f'{heading}{text}<div class="composition-magazine">{lead}{sides}{rest}</div>'
        elif kind in {'news', 'agenda'}:
            contents = news if kind == 'news' else agenda
            if kind == 'news' and layout == 'magazine' and theme != 'campus' and news_posts:
                lead = f'<div class="magazine-lead">{news_posts[0]}</div>'
                sides = '<div class="magazine-secondary">' + ''.join(news_posts[1:3]) + '</div>' if len(news_posts)>1 else ''
                rest = '<div class="magazine-more">' + ''.join(news_posts[3:]) + '</div>' if len(news_posts)>3 else ''
                contents = f'<div class="magazine-news">{lead}{sides}{rest}</div>'
            empty = 'Novas histórias serão publicadas aqui.' if kind == 'news' else 'Consulte a escola para os próximos encontros.'
            contents = contents or f'<p class="empty">{empty}</p>'
            grid = 'news-grid' if kind == 'news' else 'agenda-grid'
            content = f'{heading}{text}<div class="{grid}">{contents}</div>'
        elif kind == 'split' and layout == 'feature':
            feature_heading = f'<div class="section-heading"><div>{eyebrow}<h2>{escape(section.get("title"))}</h2></div></div>'
            content = f'<div class="split-media">{media}</div><div class="split-copy">{feature_heading}{text}<div class="items-grid">{"".join(items)}</div>{action(section.get("action"), "button")}</div>'
        elif kind == 'split' and layout == 'quote':
            quote = f'<blockquote class="family-quote">{"".join(items)}</blockquote>' if items else ''
            content = f'<div class="split-media">{media}{quote}</div><div class="split-copy">{heading}{text}{trailing_action}</div>'
        elif kind == 'split':
            # Split routines need one grid wrapper; card-like sections add their own below.
            if composition_v2 and items:
                content_items = f'<div class="items-grid">{content_items}</div>'
            content = f'<div class="split-media">{media}</div><div class="split-copy">{heading}{text}{content_items}{trailing_action}</div>' if media else f'<div class="split-copy">{heading}{text}{content_items}{trailing_action}</div>'
        elif kind == 'cta':
            content = f'{media}<div>{heading}{text}{trailing_action}</div>'
        elif composition_v2 and theme == 'culture' and kind == 'steps':
            content = f'<div class="process-copy">{heading}{text}{trailing_action}</div><div class="items-grid">{content_items}</div>'
        elif kind == 'text':
            content = f'{heading}<div class="prose">{text}</div>{media}'
        else:
            content = f'{heading}{text}{media}<div class="items-grid">{content_items}</div>'
        visible_sections.append((section_id, section.get('title', ''), f'<section id="{section_id}" class="content-section section-{kind} layout-{layout}"><div class="container section-inner">{content}</div></section>'))
    menu = [dict(item) for item in (home_design.get('menu') or [])[:8] if isinstance(item, dict)]
    if not menu:
        if page is None:
            menu = [{'url': '#' + sid, 'label': title} for sid, title, _ in visible_sections[:6] if title]
        else:
            home_sections = home_design.get('sections') or []
            if not home_design.get('configured') and not home_sections:
                home_sections = ([{'id': 'escola', 'title': 'Nossa escola'}] if data['website'].get('about') else [])
                home_sections += [{'id': 'novidades', 'title': 'Histórias da escola'}, {'id': 'agenda', 'title': 'Próximos encontros'}]
            menu = [{'url': '#' + item['id'], 'label': item.get('title', '')}
                    for item in home_sections[:6] if isinstance(item, dict) and item.get('visible', True)
                    and re.fullmatch(r'[a-z][a-z0-9-]{0,59}', str(item.get('id', ''))) and item.get('title')]
        menu += [{'url': '/' + item['slug'], 'label': item.get('title', '')}
                 for item in (home_design.get('pages') or [])[:12] if isinstance(item, dict)
                 and item.get('published') and re.fullmatch(r'[a-z][a-z0-9-]{0,59}', str(item.get('slug', '')))]
        menu += [{'url': '#contato', 'label': 'Contato'}]
    # Only global navigation anchors point home. Section actions stay local.
    if page is not None:
        for item in menu:
            if isinstance(item.get('url'), str) and item['url'].startswith('#'):
                item['url'] = '/' + item['url']
    navigation = ''.join(action(item, 'nav-link') for item in menu)
    desktop_nav = f'<nav class="desktop-nav" aria-label="Navegação principal">{navigation}</nav>'
    mobile_nav = f'<details class="mobile-menu"><summary aria-label="Abrir ou fechar menu"><span aria-hidden="true">☰</span> Menu</summary><nav aria-label="Navegação móvel">{navigation}{action(secondary_action, "nav-link")}</nav></details>'
    header = f'<header id="topo" class="site-header {"is-sticky" if design.get("header_sticky") else ""}"><div class="container header-inner"><a class="wordmark" href="/">{logo}<span>{escape(name)}</span></a>{desktop_nav}<div class="header-action">{action(primary_action, "button")}</div>{mobile_nav}</div></header>'
    topline = f'<div class="site-topline"><div class="container"><span>{escape(design.get("topline"))}</span>{action(secondary_action, "topline-link")}</div></div>' if composition_v2 and design.get('topline') else ''
    notice = f'<aside class="notice container" role="status">{escape(site["notice"])}</aside>' if site.get('notice') else ''
    contact = ''.join(f'<p>{escape(school.get(key))}</p>' for key in ('address', 'phone', 'email') if school.get(key))
    contact_section = f'<section id="contato" class="contact"><div class="container contact-inner"><div><p class="eyebrow">VAMOS CONVERSAR</p><h2>Conheça a escola de perto.</h2><address>{contact or "Entre em contato com a Secretaria."}</address></div><div class="actions">{actions}</div></div></section>'
    footer_id = ' id="contato"' if composition_v2 else ''
    footer_contact = f'<address>{contact}</address>' if composition_v2 and contact else ''
    footer = f'<footer{footer_id} class="site-footer"><div class="container footer-inner"><div><strong>{escape(name)}</strong>{paragraphs(design.get("footer_text"))}</div><nav aria-label="Navegação do rodapé">{navigation}</nav><div>{footer_contact}{action(secondary_action, "footer-link")}<a class="footer-link" href="#conteudo">Voltar ao início ↑</a></div></div></footer>'
    if composition_v2:
        # Complete compositions already contain an editable visit/contact module.
        # Keep authoritative contact details in the footer instead of duplicating a CTA section.
        contact_section = ''
    heading_style = design.get('heading_style') if composition_v2 else 'inherit'
    heading_font = 'Georgia,serif' if heading_style == 'editorial' and brand.get('font_family', 'system') == 'system' else font
    mobile_actions = f'<nav class="mobile-actions" aria-label="Ações rápidas">{actions}</nav>' if design.get('mobile_actions') else ''
    title = f'{page.get("title", "")} · {name}' if page is not None else name
    css = Path(__file__).with_name('website.css').read_text()
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title><meta name="description" content="{escape(site.get('introduction'))}"><meta name="theme-color" content="{primary}"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/api/v1/institution/icon.png?size=180"><link rel="stylesheet" href="/api/v1/institution/theme.css"><link rel="icon" href="/api/v1/institution/icon.png?size=32"><style>{css}:root{{--brand:{primary};--ink:{secondary};--font:{font};--heading-font:{heading_font}}}</style></head><body class="{theme}{' composition-v2' if composition_v2 else ''}{' with-mobile-actions' if mobile_actions else ''}"><a class="skip" href="#conteudo">Ir para o conteúdo</a>{demonstration}{topline}{header}<main id="conteudo">{hero}{notice}{''.join(item[2] for item in visible_sections)}{contact_section}</main>{footer}{mobile_actions}</body></html>'''
