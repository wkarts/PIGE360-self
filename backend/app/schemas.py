import re
from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class PersonInput(Input):
    name: str = Field(min_length=2, max_length=180)
    social_name: str = Field(default='', max_length=180)
    cpf: str | None = Field(default=None, max_length=20)
    birth_date: date | None = None
    email: str = Field(default='', max_length=254)
    phone: str = Field(default='', max_length=32)
    address: str = Field(default='', max_length=400)
    notes: str = Field(default='', max_length=4000)
    is_guardian: bool = False
    rg: str = Field(default='', max_length=40)
    rg_issuer: str = Field(default='', max_length=80)
    rg_state: str = Field(default='', max_length=2)
    rg_issued_on: date | None = None
    birth_certificate: str = Field(default='', max_length=80)
    birth_city: str = Field(default='', max_length=120)
    birth_state: str = Field(default='', max_length=2)
    nationality: str = Field(default='', max_length=80)
    sex: str = Field(default='', max_length=32)
    gender: str = Field(default='', max_length=80)
    race_color: str = Field(default='', max_length=80)
    marital_status: str = Field(default='', max_length=40)
    mother_name: str = Field(default='', max_length=180)
    father_name: str = Field(default='', max_length=180)
    phone_secondary: str = Field(default='', max_length=32)
    postal_code: str = Field(default='', max_length=16)
    street: str = Field(default='', max_length=180)
    address_number: str = Field(default='', max_length=24)
    address_complement: str = Field(default='', max_length=120)
    district: str = Field(default='', max_length=120)
    city: str = Field(default='', max_length=120)
    state: str = Field(default='', max_length=2)
    country: str = Field(default='Brasil', max_length=80)
    occupation: str = Field(default='', max_length=120)
    employer: str = Field(default='', max_length=180)
    education: str = Field(default='', max_length=100)
    emergency_contact_name: str = Field(default='', max_length=180)
    emergency_contact_phone: str = Field(default='', max_length=32)
    active: bool = True


    @field_validator('cpf', mode='before')
    @classmethod
    def cpf_valid(cls, value):
        digits = re.sub(r'\D', '', value or '')
        if not digits:
            return None
        if len(digits) != 11 or len(set(digits)) == 1:
            raise ValueError('CPF inválido.')
        for size in (9, 10):
            check = (sum(int(digits[i]) * (size + 1 - i) for i in range(size)) * 10) % 11
            if (0 if check == 10 else check) != int(digits[size]):
                raise ValueError('CPF inválido.')
        return digits

    @field_validator('email')
    @classmethod
    def email_valid(cls, value):
        if value:
            from pydantic import TypeAdapter
            return str(TypeAdapter(EmailStr).validate_python(value)).lower()
        return value

    @field_validator('birth_date', 'rg_issued_on')
    @classmethod
    def not_future(cls, value):
        if value and value > date.today():
            raise ValueError('A data informada não pode ser futura.')
        return value

class StudentData(Input):
    previous_school: str = Field(default='', max_length=180)
    nis: str = Field(default='', max_length=32)
    sus_card: str = Field(default='', max_length=32)
    inep_code: str = Field(default='', max_length=32)
    health_plan: str = Field(default='', max_length=120)
    allergies: str = Field(default='', max_length=4000)
    medications: str = Field(default='', max_length=4000)
    health_notes: str = Field(default='', max_length=4000)
    special_needs: str = Field(default='', max_length=4000)
    authorized_transport: str = Field(default='', max_length=120)
    student_notes: str = Field(default='', max_length=4000)


class StudentInput(Input):
    person: PersonInput | None = None
    person_id: str | None = None
    previous_school: str = Field(default='', max_length=180)
    nis: str = Field(default='', max_length=32)
    sus_card: str = Field(default='', max_length=32)
    inep_code: str = Field(default='', max_length=32)
    health_plan: str = Field(default='', max_length=120)
    allergies: str = Field(default='', max_length=4000)
    medications: str = Field(default='', max_length=4000)
    health_notes: str = Field(default='', max_length=4000)
    special_needs: str = Field(default='', max_length=4000)
    authorized_transport: str = Field(default='', max_length=120)
    student_notes: str = Field(default='', max_length=4000)
    @model_validator(mode='after')
    def one_person(self):
        if bool(self.person) == bool(self.person_id):
            raise ValueError('Informe uma pessoa existente ou os dados pessoais.')
        return self

class GuardianInput(Input):
    person_id: str
    relationship: str = Field(default='Responsável', min_length=2, max_length=60)
    legal: bool = False
    financial: bool = False
    pickup: bool = False
    primary_contact: bool = False
    active: bool = True

class Edit(Input):
    version: int = Field(ge=1)
    data: dict

class UnitInput(Input):
    name: str = Field(min_length=2, max_length=160)
    active: bool = True

class YearInput(Input):
    name: str = Field(min_length=2, max_length=40)
    starts_on: date
    ends_on: date
    status: Literal['active', 'closed'] = 'active'
    @model_validator(mode='after')
    def order(self):
        if self.ends_on < self.starts_on:
            raise ValueError('Data final anterior à inicial.')
        return self

class GradeInput(Input):
    name: str = Field(min_length=2, max_length=100)
    level: str = Field(default='Educação básica', min_length=2, max_length=100)
    active: bool = True

class ShiftInput(Input):
    name: str = Field(min_length=2, max_length=80)
    active: bool = True

class ClassInput(Input):
    name: str = Field(min_length=2, max_length=120)
    unit_id: str
    academic_year_id: str
    grade_id: str
    shift_id: str
    capacity: int = Field(default=30, ge=1, le=2000)
    active: bool = True

class DocumentTypeInput(Input):
    name: str = Field(min_length=2, max_length=120)
    required: bool = False
    active: bool = True
    grade_id: str | None = None

class EnrollmentInput(Input):
    student_id: str
    class_group_id: str
    enrolled_on: date
    financial_person_id: str | None = None
    enrollment_type: Literal['new','renewal','transfer_in','returning'] = 'new'
    origin_school: str = Field(default='', max_length=180)
    origin_city: str = Field(default='', max_length=120)
    entry_reason: str = Field(default='', max_length=1000)
    external_reference: str = Field(default='', max_length=120)
    notes: str = Field(default='', max_length=4000)

class MovementInput(Input):
    version: int = Field(ge=1)
    action: Literal['activate','change_class','suspend','reactivate','transfer','cancel','complete']
    reason: str = Field(min_length=3, max_length=1000)
    class_group_id: str | None = None

class ReenrollmentInput(Input):
    class_group_id: str
    enrolled_on: date
    notes: str = Field(default='', max_length=4000)

class DocumentReview(Input):
    version: int = Field(ge=1)
    status: Literal['validated', 'rejected', 'archived']
    notes: str = Field(min_length=3, max_length=2000)

class WaiverInput(Input):
    document_type_id: str
    reason: str = Field(min_length=5, max_length=2000)

class IssueInput(Input):
    kind: Literal['student_record','enrollment_receipt','enrollment_declaration','enrollment_form']
    enrollment_id: str | None = None

class ProtocolInput(Input):
    kind: str = Field(min_length=2, max_length=120)
    student_id: str | None = None
    description: str = Field(default='', max_length=4000)
    status: Literal['open','in_progress','waiting','completed','cancelled'] = 'open'
    due_on: date | None = None

class SchoolInput(Input):
    company_id: str
    name: str = Field(min_length=2, max_length=160)
    address: str = Field(default='', max_length=400)
    phone: str = Field(default='', max_length=32)
    email: str = Field(default='', max_length=254)
    document_policy: Literal['warn','block'] = 'warn'
    active: bool = True

class CompanyInput(Input):
    name: str = Field(min_length=2, max_length=160)
    document: str | None = Field(default=None, max_length=24)

class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class Setup(Input):
    admin_name: str = Field(min_length=2, max_length=160)
    admin_email: EmailStr
    admin_password: str = Field(min_length=12, max_length=128)
    company_name: str = Field(min_length=2, max_length=160)
    company_document: str | None = Field(default=None, max_length=24)
    school_name: str = Field(min_length=2, max_length=160)
    unit_name: str = Field(default='Unidade principal', min_length=2, max_length=160)
    academic_year: int = Field(ge=2000, le=2200)

class UserInput(Input):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: Literal['admin','direction','coordination','secretary','teacher','student','guardian','viewer'] = 'secretary'
    school_ids: list[str] = Field(default_factory=list, max_length=100)
    person_id: str | None = None

class UserEdit(Input):
    name: str = Field(min_length=2, max_length=160)
    role: Literal['admin','direction','coordination','secretary','teacher','student','guardian','viewer']
    active: bool
    school_ids: list[str] = Field(default_factory=list, max_length=100)
    person_id: str | None = None
    version: int = Field(ge=1)

class PasswordChange(Input):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class TeacherAssignmentInput(Input):
    teacher_user_id: str
    class_group_id: str
    subject_name: str = Field(default='', max_length=120)
    active: bool = True


class DraftEnrollmentEdit(Input):
    version: int = Field(ge=1)
    class_group_id: str
    enrolled_on: date
    notes: str = Field(default='', max_length=4000)
    reason: str = Field(min_length=3, max_length=1000)


class ProtocolNote(Input):
    version: int = Field(ge=1)
    message: str = Field(min_length=3, max_length=2000)
