"""Renderer único para prévia autenticada e site publicado. Conteúdo sempre escapado."""
import html
import re
from pathlib import Path
from urllib.parse import urlsplit


def render(data):
    e=lambda value:html.escape(str(value or ''),quote=True)
    school,site,brand=data['school'],data['website'],data['identity']
    name=brand.get('display_name') or school['name']
    theme=site['theme'] if site['theme'] in {'horizon','editorial','campus','culture'} else 'horizon'
    primary=brand.get('primary_color','#006D77');secondary=brand.get('secondary_color','#193549')
    primary=primary if re.fullmatch(r'#[0-9a-fA-F]{6}',primary) else '#006D77'
    secondary=secondary if re.fullmatch(r'#[0-9a-fA-F]{6}',secondary) else '#193549'
    font={'serif':'Georgia,serif','sans':'Arial,sans-serif'}.get(brand.get('font_family'),'var(--institution-font,system-ui,sans-serif)')
    logo=brand.get('logo_url','')
    logo_html=f'<img class="logo" src="{e(logo)}" alt="">' if re.fullmatch(r'/api/v1/institution/assets/[0-9a-f]{64}\.png',logo) else ''
    def link(value,label,css='button'):
        try:
            url=urlsplit(value or '')
            if url.scheme!='https' or not url.hostname or url.username or url.password or url.fragment:return ''
        except ValueError:return ''
        return f'<a class="{css}" href="{e(value)}">{e(label)} <span aria-hidden="true">↗</span></a>'
    actions=link(site.get('admission_url'),'Inscrição e matrícula')+link(site.get('portal_url'),'Portal da família','button secondary')
    if not actions:actions='<a class="button" href="#contato">Converse com a escola</a>'
    title=f'<h1>{e(site.get("headline"))}</h1>'
    intro=f'<p class="lead">{e(site["introduction"])}</p>' if site.get('introduction') else ''
    about=''.join('<p>'+e(p)+'</p>' for p in site.get('about','').split('\n\n') if p.strip())
    about_section=f'<section id="escola" class="about"><div><p class="eyebrow">NOSSA ESCOLA</p><h2>Educação que faz parte da vida.</h2></div><div class="prose">{about}</div></section>' if about else ''
    cards=[];events=[]
    for post in data.get('posts',[]):
        content=''.join('<p>'+e(p)+'</p>' for p in post.get('content','').split('\n\n') if p.strip())
        date=e(post.get('event_start',''))[:16].replace('T',' · ')
        meta=f'<p class="date">{date} · {e(post.get("location"))}</p>' if post['kind']=='event' else ''
        summary=f'<p>{e(post["summary"])}</p>' if post.get('summary') else ''
        card=f'<article class="card"><span class="tag">{"Agenda" if post["kind"]=="event" else "Na escola"}</span><h3>{e(post["title"])}</h3>{meta}{summary}<details><summary>Ler publicação</summary>{content}</details></article>'
        (events if post['kind']=='event' else cards).append(card)
    news=''.join(cards) or '<p>Novas histórias serão publicadas aqui.</p>'
    agenda=''.join(events) or '<p>Consulte a escola para os próximos encontros.</p>'
    notice=f'<aside class="notice" role="status">{e(site["notice"])}</aside>' if site.get('notice') else ''
    art='<div class="hero-art" aria-hidden="true"><span class="orb"></span><span class="arch"></span><span class="dot"></span><span class="art-caption">APRENDER<br>É DESCOBRIR.</span></div>'
    # Composições diferentes: leitura editorial, comunidade, agenda acadêmica e revista cultural.
    if theme=='editorial':
        body=f'<section class="editorial-cover"><p class="eyebrow">UMA ESCOLA, MUITAS POSSIBILIDADES</p>{title}<div class="editorial-intro">{intro}<div class="actions">{actions}</div></div></section>{notice}{about_section}<section id="novidades" class="editorial-columns"><div><h2>Histórias da escola</h2><div class="stories">{news}</div></div><aside><h2>Agenda</h2>{agenda}</aside></section>'
    elif theme=='campus':
        body=f'<section class="campus-cover"><div><p class="eyebrow">CONHECIMENTO EM MOVIMENTO</p>{title}{intro}<div class="actions">{actions}</div></div><aside class="quick-links"><h2>Seu próximo passo</h2><a href="#escola">Conheça a escola →</a><a href="#novidades">Acompanhe as novidades →</a><a href="#agenda">Veja a agenda →</a></aside></section>{notice}<section id="agenda" class="agenda"><h2>Próximos encontros</h2><div class="cards">{agenda}</div></section>{about_section}<section id="novidades"><p class="eyebrow">VIDA ACADÊMICA</p><h2>Aprender também é participar.</h2><div class="cards">{news}</div></section>'
    elif theme=='culture':
        body=f'<section class="culture-cover"><div class="culture-label">ESCOLA · CULTURA · COMUNIDADE</div><div>{title}{intro}</div><div class="actions">{actions}</div></section>{notice}<section id="novidades" class="culture-stories"><p class="eyebrow">NOSSO COTIDIANO</p><h2>Um olhar para cada descoberta.</h2>{news}</section>{about_section}<section class="culture-agenda"><h2>Encontros que aproximam</h2><div class="cards">{agenda}</div></section>'
    else:
        body=f'<section class="hero"><div><p class="eyebrow">APRENDER · CONVIVER · DESCOBRIR</p>{title}{intro}<div class="actions">{actions}</div></div>{art}</section>{notice}{about_section}<section id="novidades"><p class="eyebrow">VIDA EM COMUNIDADE</p><h2>Acontece por aqui.</h2><div class="cards">{news}{agenda}</div></section>'
    contact=''.join(f'<p>{e(school.get(key))}</p>' for key in ('address','phone','email') if school.get(key))
    css=Path(__file__).with_name('website.css').read_text()
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(name)}</title><meta name="description" content="{e(site.get('introduction'))}"><meta name="theme-color" content="{primary}"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/api/v1/institution/icon.png?size=180"><link rel="stylesheet" href="/api/v1/institution/theme.css"><link rel="icon" href="/api/v1/institution/icon.png?size=32"><style>{css}:root{{--brand:{primary};--ink:{secondary};--font:{font}}}</style></head><body class="{theme}"><a class="skip" href="#conteudo">Ir para o conteúdo</a><header>{logo_html}<a class="wordmark" href="#conteudo">{e(name)}</a><nav aria-label="Navegação principal">{'<a href="#escola">A escola</a>' if about else ''}<a href="#novidades">Novidades</a><a href="#contato">Contato</a></nav></header><main id="conteudo">{body}<section id="contato" class="contact"><div><p class="eyebrow">VAMOS CONVERSAR</p><h2>Estamos perto.</h2></div><address>{contact or 'Entre em contato com a Secretaria.'}</address><div class="actions">{actions}</div></section></main><footer><strong>{e(name)}</strong><a href="#conteudo">Voltar ao início ↑</a></footer></body></html>'''
