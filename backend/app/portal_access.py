"""Entrada do portal e diagnóstico de publicação, sem criar ofertas por suposição."""
import hashlib
from datetime import date, datetime
from zoneinfo import ZoneInfo
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


PORTAL_DIARY_ACCESS_CONSENT_TEXT = (
    'Autorizo esta conta a acessar os comunicados pedagógicos da escola destinados aos estudantes '
    'para os quais consto como responsável legal ativo no cadastro escolar. O acesso exige CPF e '
    'contato verificado compatíveis com esse cadastro. Os comunicados ficam disponíveis somente '
    'neste portal; esta autorização não permite envio automático por WhatsApp ou e-mail. Posso '
    'revogar o acesso a qualquer momento.'
)
PORTAL_DIARY_ACCESS_CONSENT_VERSION = hashlib.sha256(
    PORTAL_DIARY_ACCESS_CONSENT_TEXT.encode('utf-8')
).hexdigest()[:40]


def _digits(value):
    return ''.join(character for character in str(value or '') if character.isdigit())


def verified_guardian_contact_matches(account, person):
    """Require the portal identity and at least one verified, institution-recorded contact."""
    account_cpf = _digits(account.cpf)
    person_cpf = _digits(person.cpf)
    if not account_cpf or account_cpf != person_cpf:
        return False
    email_matches = bool(
        account.email_verified and account.email and person.email and
        account.email.strip().casefold() == person.email.strip().casefold()
    )
    phone_matches = bool(
        account.phone_verified and _digits(account.phone) and
        _digits(account.phone) == _digits(person.phone)
    )
    return email_matches or phone_matches


def verified_guardian_links(db, account):
    """Legal student links confirmed by the portal account's verified identity."""
    active_enrollments = select(m.Enrollment.student_id).where(
        m.Enrollment.school_id == account.school_id,
        m.Enrollment.status.in_(['active', 'suspended']),
    )
    rows = db.execute(
        select(m.GuardianLink, m.Student, m.Person)
        .join(m.Student, m.Student.id == m.GuardianLink.student_id)
        .join(m.Person, m.Person.id == m.GuardianLink.person_id)
        .where(
            m.GuardianLink.school_id == account.school_id,
            m.GuardianLink.active.is_(True),
            m.GuardianLink.legal.is_(True),
            m.Student.school_id == account.school_id,
            m.Student.status == 'active',
            m.Student.id.in_(active_enrollments),
            m.Person.school_id == account.school_id,
            m.Person.active.is_(True),
        )
        .order_by(m.Student.id, m.GuardianLink.id)
    ).all()
    return [
        (link, student, person)
        for link, student, person in rows
        if verified_guardian_contact_matches(account, person)
    ]


def active_portal_student_access(db, account):
    """Current opt-ins intersected with current legal links and verified contacts."""
    eligible = {link.id: (student, person) for link, student, person in verified_guardian_links(db, account)}
    if not eligible:
        return []
    accesses = db.scalars(select(m.PortalStudentAccess).where(
        m.PortalStudentAccess.school_id == account.school_id,
        m.PortalStudentAccess.account_id == account.id,
        m.PortalStudentAccess.active.is_(True),
        m.PortalStudentAccess.consent_version == PORTAL_DIARY_ACCESS_CONSENT_VERSION,
        m.PortalStudentAccess.guardian_link_id.in_(list(eligible)),
    ).order_by(m.PortalStudentAccess.created_at, m.PortalStudentAccess.id)).all()
    result = []
    for access in accesses:
        student, person = eligible[access.guardian_link_id]
        if access.student_id == student.id:
            result.append((access, student, person))
    return result


def portal_diary_access_summary(db, account):
    """Return only current legal links and require consent for every current link."""
    eligible = verified_guardian_links(db, account)
    current_by_link = {
        access.guardian_link_id: access
        for access, _student, _person in active_portal_student_access(db, account)
    }
    consent_required = any(
        link.id not in current_by_link or
        current_by_link[link.id].consent_version != PORTAL_DIARY_ACCESS_CONSENT_VERSION
        for link, _student, _person in eligible
    )
    students = {}
    eligible_students = {}
    student_person_ids = {student.person_id for _link, student, _person in eligible}
    student_persons = {
        person.id: person
        for person in db.scalars(select(m.Person).where(m.Person.id.in_(student_person_ids)))
    }
    for link, student, _guardian_person in eligible:
        student_person = student_persons.get(student.person_id)
        student_name = student_person.name if student_person else ''
        eligible_row = eligible_students.setdefault(student.id, {
            'student_id': student.id,
            'student_name': student_name,
            'student_number': student.number,
            'relationship': link.relationship,
            'access_active': False,
        })
        access = current_by_link.get(link.id)
        if not access or access.consent_version != PORTAL_DIARY_ACCESS_CONSENT_VERSION:
            continue
        eligible_row['access_active'] = True
        row = students.setdefault(student.id, {
            'student_id': student.id,
            'student_name': student_name,
            'student_number': student.number,
            'relationship': link.relationship,
            'consented_at': access.consented_at.isoformat(),
        })
        if access.consented_at > datetime.fromisoformat(row['consented_at']):
            row['consented_at'] = access.consented_at.isoformat()
    return {
        'consent_version': PORTAL_DIARY_ACCESS_CONSENT_VERSION,
        'consent_required': consent_required,
        'eligible_student_count': len({student.id for _link, student, _person in eligible}),
        'eligible_students': sorted(eligible_students.values(), key=lambda item: (item['student_name'].casefold(), item['student_id'])),
        'students': sorted(students.values(), key=lambda item: (item['student_name'].casefold(), item['student_id'])),
    }


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
