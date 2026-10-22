"""Bounded editorial data, independent of the institution's visual identity."""
import re
import json
from typing import Literal
from urllib.parse import unquote, urlsplit
from pydantic import Field, field_validator, model_validator
from .schemas import Input


def safe_url(value: str, image: bool = False) -> str:
    if not value:
        return ''  # Empty controls can be saved in a private editorial draft.
    decoded = value
    for _ in range(3):
        decoded = unquote(decoded)
    if any(ord(c) < 32 or ord(c) == 127 for c in decoded) or '\\' in decoded:
        raise ValueError('Endereço inválido.')
    try:
        url = urlsplit(value)
        port = url.port
        if url.username or url.password or (port is not None and not 1 <= port <= 65535):
            raise ValueError
        if url.scheme == 'https' and url.hostname:
            if any(c.isspace() for c in url.netloc):
                raise ValueError
            return value
        if url.scheme or url.netloc:
            if not image and url.scheme == 'mailto' and re.fullmatch(r'[^\s@?]+@[^\s@?]+', url.path) and not url.query and not url.fragment:
                return value
            if not image and url.scheme == 'tel' and re.fullmatch(r'\+?[0-9(). -]{3,40}', url.path) and not url.query and not url.fragment:
                return value
            raise ValueError
        if value.startswith('/') and not decoded.startswith('//') and not any(p in {'.', '..'} for p in decoded.split('/')):
            if not image or value.startswith('/api/v1/'):
                return value
        if not image and re.fullmatch(r'#[a-zA-Z][\w-]{0,80}', value):
            return value
    except ValueError:
        pass
    raise ValueError('Use HTTPS ou um destino local válido; imagens locais devem usar /api/v1/.')


class WebsiteImage(Input):
    url: str = Field(default='', max_length=1000)
    alt: str = Field(default='', max_length=200)
    caption: str = Field(default='', max_length=200)
    focal_x: float = Field(default=50, ge=0, le=100, allow_inf_nan=False)
    focal_y: float = Field(default=50, ge=0, le=100, allow_inf_nan=False)

    @field_validator('url')
    @classmethod
    def validate_url(cls, value):
        return safe_url(value, image=True)


class WebsiteLink(Input):
    label: str = Field(default='', max_length=80)
    url: str = Field(default='', max_length=1000)

    @field_validator('url')
    @classmethod
    def validate_url(cls, value):
        return safe_url(value)


class WebsiteItem(Input):
    eyebrow: str = Field(default='', max_length=120)
    title: str = Field(default='', max_length=180)
    text: str = Field(default='', max_length=2000)
    image: WebsiteImage | None = None
    action: WebsiteLink | None = None


class WebsiteSection(Input):
    id: str = Field(pattern=r'^[a-z][a-z0-9-]{0,59}$')
    kind: Literal['cards', 'split', 'gallery', 'steps', 'cta', 'news', 'agenda', 'text']
    layout: Literal['default','pillars','feature','quote','magazine','dates','spotlight'] = 'default'
    visible: bool = True
    eyebrow: str = Field(default='', max_length=120)
    title: str = Field(default='', max_length=180)
    text: str = Field(default='', max_length=10000)
    image: WebsiteImage | None = None
    action: WebsiteLink | None = None
    items: list[WebsiteItem] = Field(default_factory=list, max_length=12)


RESERVED_PAGES={'api','assets','online','portal','family','index','health','robots','sitemap','admin','login','logout','site','manifest','institution'}


def validate_section_ids(sections):
    ids=[section.id for section in sections]
    if len(set(ids))!=len(ids):raise ValueError('Cada seção precisa de um identificador único nesta página.')
    if any(ident in {'conteudo','contato','menu','topo'} for ident in ids):raise ValueError('Identificador reservado para navegação do site.')


class WebsitePage(Input):
    slug:str=Field(pattern=r'^[a-z][a-z0-9-]{0,59}$')
    title:str=Field(default='',max_length=180)
    introduction:str=Field(default='',max_length=2000)
    image:WebsiteImage|None=None
    published:bool=True
    sections:list[WebsiteSection]=Field(default_factory=list,max_length=20)

    @model_validator(mode='after')
    def validate_page(self):
        if self.slug in RESERVED_PAGES:raise ValueError('Este endereço está reservado pelo sistema.')
        validate_section_ids(self.sections)
        return self


def action_urls(value):
    if isinstance(value,dict):
        if 'label' in value and 'url' in value:yield value['url']
        for child in value.values():yield from action_urls(child)
    elif isinstance(value,list):
        for child in value:yield from action_urls(child)


def public_design(design):
    if not design:return {}
    value=dict(design)
    if 'sections' in value:value['sections']=[section for section in value['sections'] if section.get('visible',True)]
    if 'pages' in value:
        value['pages']=[{**page,'sections':[section for section in page.get('sections',[]) if section.get('visible',True)]} for page in value['pages'] if page.get('published',True)]
    return value



def validate_page_links(design):
    """Run at publication, not while an editor is building unpublished pages."""
    published={page['slug'] for page in design.get('pages',[]) if page.get('published',True)}
    visible=public_design(design)
    if design.get('configured'):
        anchors={'contato','conteudo','topo'}|{section['id'] for section in visible.get('sections',[])}
        for link in visible.get('menu',[]):
            target=link.get('url','')
            if target.startswith('#') and target[1:] not in anchors:
                raise ValueError('O menu '+target+' precisa apontar para uma seção visível da página inicial.')
    for value in action_urls(visible):
        if not value.startswith('/'):continue
        url=urlsplit(value)
        if url.path=='/' and not url.query:continue
        slug=url.path[1:]
        if url.query or not re.fullmatch(r'[a-z][a-z0-9-]{0,59}',slug) or slug not in published:
            raise ValueError('O destino '+value+' precisa apontar para uma página existente e publicada. Use HTTPS para outro site.')


class WebsiteDesign(Input):
    composition_version: Literal[1,2] = 1
    demonstration: bool = False
    heading_style: Literal['inherit','editorial'] = 'inherit'
    topline: str = Field(default='', max_length=180)
    hero_caption: str = Field(default='', max_length=200)
    pages:list[WebsitePage]=Field(default_factory=list,max_length=12)
    configured: bool = False
    header_sticky: bool = False
    mobile_actions: bool = False
    eyebrow: str = Field(default='', max_length=120)
    hero_image: WebsiteImage | None = None
    hero_gallery: list[WebsiteImage] = Field(default_factory=list, max_length=3)
    primary_action: WebsiteLink | None = None
    secondary_action: WebsiteLink | None = None
    menu: list[WebsiteLink] = Field(default_factory=list, max_length=8)
    footer_text: str = Field(default='', max_length=500)
    sections: list[WebsiteSection] = Field(default_factory=list, max_length=20)

    @model_validator(mode='after')
    def unique_sections(self):
        validate_section_ids(self.sections)
        slugs=[page.slug for page in self.pages]
        if len(set(slugs))!=len(slugs):raise ValueError('Cada página precisa de um endereço único.')
        if len(json.dumps(self.model_dump(),ensure_ascii=False,separators=(',',':')).encode())>1024*1024:
            raise ValueError('O conteúdo total do site deve ter no máximo 1 MB. Reduza os textos ou a quantidade de blocos.')
        return self
