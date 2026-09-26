"""Entrada do portal e diagnóstico de publicação, sem criar ofertas por suposição."""
from datetime import date
from zoneinfo import ZoneInfo
from datetime import datetime
from sqlalchemy import select
from . import models as m
from .security import fail


def today():
    return datetime.now(ZoneInfo('America/Bahia')).date()


def offered_groups(db, campaign):
    if not campaign.class_group_ids:
        return []
    return list(db.scalars(select(m.ClassGroup).join(m.AcademicYear).where(
        m.ClassGroup.id.in_(campaign.class_group_ids),
        m.ClassGroup.school_id == campaign.school_id,
        m.ClassGroup.active.is_(True), m.AcademicYear.status == 'active',
        m.AcademicYear.school_id == campaign.school_id)))


def public_context(db):
    schools = list(db.scalars(select(m.School).where(m.School.active.is_(True))
                             .order_by(m.School.name, m.School.id).limit(100)))
    return {'schools': [{'id': s.id, 'name': s.name} for s in schools],
            'default_school_id': schools[0].id if len(schools) == 1 else '',
            'server_date': today().isoformat()}


def login_school(db, school_id='', campaign_slug=''):
    """Identifica apenas o escopo. Não procura e-mails entre escolas."""
    if campaign_slug:
        campaign = db.scalar(select(m.AdmissionCampaign).where(m.AdmissionCampaign.slug == campaign_slug))
        if not campaign or (school_id and campaign.school_id != school_id):
            fail(404, 'Processo de matrícula não encontrado nesta unidade.')
        school_id = campaign.school_id
    if not school_id:
        candidates = list(db.scalars(select(m.School).where(m.School.active.is_(True)).limit(2)))
        if len(candidates) != 1:
            fail(422, 'Selecione a unidade para acessar sua conta.')
        school_id = candidates[0].id
    school = db.get(m.School, school_id)
    if not school or not school.active:
        fail(404, 'Unidade indisponível para acesso.')
    return school


def readiness(db, school):
    day = today()
    groups = list(db.scalars(select(m.ClassGroup).join(m.AcademicYear).where(
        m.ClassGroup.school_id == school.id, m.ClassGroup.active.is_(True),
        m.AcademicYear.status == 'active')))
    years = list(db.scalars(select(m.AcademicYear.id).where(
        m.AcademicYear.school_id == school.id, m.AcademicYear.status == 'active')))
    campaigns = list(db.scalars(select(m.AdmissionCampaign).where(
        m.AdmissionCampaign.school_id == school.id).order_by(m.AdmissionCampaign.created_at.desc())))
    items = []
    for c in campaigns:
        reasons = []
        if not c.active: reasons.append('not_published')
        if day < c.opens_on: reasons.append('not_started')
        if day > c.closes_on: reasons.append('closed')
        if not offered_groups(db, c): reasons.append('no_active_groups')
        if not school.active: reasons.append('inactive_school')
        items.append({'id': c.id, 'title': c.title, 'slug': c.slug,
                      'opens_on': c.opens_on.isoformat(), 'closes_on': c.closes_on.isoformat(),
                      'ready': not reasons, 'reasons': reasons})
    issues = []
    if not years: issues.append({'code':'no_academic_year', 'message':'Cadastre ou ative o ano letivo em Estrutura acadêmica.'})
    if not groups: issues.append({'code':'no_class_groups', 'message':'Cadastre turmas ativas vinculadas ao ano letivo em Estrutura acadêmica.'})
    if not campaigns: issues.append({'code':'no_campaigns', 'message':'Crie o processo, selecione as turmas, confira os prazos e marque Publicar processo no portal.'})
    elif not any(c['ready'] for c in items):
        issues.append({'code':'no_open_campaigns', 'message':'Nenhum processo está disponível hoje. Confira publicação, prazos e turmas abaixo.'})
    return {'school_id':school.id, 'server_date':day.isoformat(), 'ready':any(c['ready'] for c in items),
            'active_years':len(years), 'active_groups':len(groups), 'campaigns':items, 'issues':issues,
            'portal_path':'/online.html?school='+school.id}
