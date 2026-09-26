from datetime import date
from decimal import Decimal
import re
from typing import Literal
from pydantic import EmailStr, Field, field_validator, model_validator
from .schemas import Input, PersonInput

class CampaignInput(Input):
    slug: str = Field(min_length=4,max_length=80,pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    title: str = Field(min_length=4,max_length=160)
    instructions: str = Field(default='',max_length=5000)
    privacy_notice: str = Field(min_length=40,max_length=10000)
    terms_version: str = Field(default='1',min_length=1,max_length=40)
    class_group_ids: list[str] = Field(min_length=1,max_length=100)
    opens_on: date
    closes_on: date
    active: bool = False
    require_verified_contact: bool = True
    require_documents: bool = False
    require_payment_before_enrollment: bool = False
    @model_validator(mode='after')
    def dates(self):
        if self.closes_on < self.opens_on: raise ValueError('Data final anterior à inicial.')
        if len(set(self.class_group_ids)) != len(self.class_group_ids): raise ValueError('Turmas duplicadas.')
        return self

class CampaignEdit(CampaignInput):
    version: int = Field(ge=1)

class Registration(Input):
    campaign_slug: str = Field(max_length=80)
    name: str = Field(min_length=2,max_length=180)
    email: EmailStr
    password: str = Field(min_length=12,max_length=128)
    cpf: str | None = None
    phone: str = Field(default='',max_length=24)
    address: str = Field(default='',max_length=400)
    whatsapp_opt_in: bool = False
    accept_privacy: Literal[True]
    terms_version: str = Field(max_length=40)
    @field_validator('cpf')
    @classmethod
    def valid_cpf(cls, v): return PersonInput.cpf_valid(v)
    @field_validator('phone')
    @classmethod
    def phone_valid(cls, value):
        digits = re.sub(r'\D','',value)
        if not digits: return ''
        if len(digits) in (10,11): digits = '55'+digits
        if not 12 <= len(digits) <= 15: raise ValueError('Informe país, DDD e número válidos.')
        return digits

class PortalLogin(Input):
    campaign_slug: str = Field(max_length=80)
    email: EmailStr
    password: str = Field(min_length=1,max_length=128)

class VerifyCode(Input):
    code: str = Field(pattern=r'^\d{6}$')

class VerifyRequest(Input):
    channel: Literal['email','whatsapp'] = 'email'

class ResetRequest(Input):
    campaign_slug: str = Field(max_length=80)
    email: EmailStr

class ResetConfirm(ResetRequest, VerifyCode):
    password: str = Field(min_length=12,max_length=128)

class AdmissionInput(Input):
    campaign_id: str
    class_group_id: str
    client_key: str = Field(min_length=12,max_length=80)
    student: PersonInput
    previous_school: str = Field(default='',max_length=180)
    relationship: str = Field(default='Responsável legal',min_length=2,max_length=60)
    notes: str = Field(default='',max_length=3000)
    @model_validator(mode='after')
    def child(self):
        if not self.student.birth_date: raise ValueError('Informe o nascimento do aluno.')
        if self.student.is_guardian: raise ValueError('O papel de responsável do aluno é definido pela Secretaria.')
        return self

class AdmissionEdit(Input):
    version: int = Field(ge=1)
    class_group_id: str
    student: PersonInput
    previous_school: str = Field(default='',max_length=180)
    relationship: str = Field(default='Responsável legal',min_length=2,max_length=60)
    notes: str = Field(default='',max_length=3000)
    @model_validator(mode='after')
    def child(self):
        if not self.student.birth_date: raise ValueError('Informe o nascimento do aluno.')
        if self.student.is_guardian: raise ValueError('Papel de responsável não permitido.')
        return self

class SubmitAdmission(Input):
    version: int = Field(ge=1)
    accept_terms: Literal[True]
    legal_responsibility: Literal[True]
    terms_version: str = Field(max_length=40)

class AdmissionAction(Input):
    version: int = Field(ge=1)
    action: Literal['review','request_changes','waitlist','reject','withdraw']
    reason: str = Field(min_length=3,max_length=3000)

class Approval(Input):
    version: int = Field(ge=1)
    reason: str = Field(min_length=10,max_length=1000)
    identity_confirmed: Literal[True]
    existing_student_id: str | None = None
    existing_guardian_id: str | None = None
    class_group_id: str | None = None

class FinalizeAdmission(Input):
    version: int = Field(ge=1)
    reason: str = Field(min_length=3,max_length=1000)

class MessageInput(Input):
    text: str = Field(min_length=1,max_length=3000)
    internal: bool = False

class ConnectInstanceInput(Input):
    label: str = Field(default='', max_length=40)
    primary: bool = False


class ConnectPairInput(Input):
    number: str = Field(default='', max_length=24)


class ConnectionInput(Input):
    version: int | None = Field(default=None,ge=1)
    enabled: bool = False
    environment: Literal['sandbox','production'] = 'sandbox'
    config: dict = Field(default_factory=dict)
    api_key: str = Field(default='',max_length=4000)
    webhook_token: str = Field(default='',max_length=256)

class ChargeInput(Input):
    admission_id: str | None = None
    enrollment_id: str | None = None
    amount: Decimal = Field(gt=0,max_digits=12,decimal_places=2)
    due_on: date
    description: str = Field(min_length=3,max_length=500)
    billing_type: Literal['PIX','BOLETO'] = 'PIX'
    client_key: str = Field(min_length=12,max_length=80)
    installment_count: int = Field(default=1,ge=1,le=24)
    required_for_enrollment: bool = False
    @model_validator(mode='after')
    def links(self):
        if bool(self.admission_id) == bool(self.enrollment_id): raise ValueError('Selecione uma inscrição OU uma matrícula.')
        if self.due_on < date.today(): raise ValueError('Informe vencimento atual ou futuro.')
        if self.required_for_enrollment and self.installment_count > 1: raise ValueError('Pagamento obrigatório de matrícula deve ser avulso, separado das mensalidades.')
        if self.installment_count > 1 and len(self.client_key) > 70: raise ValueError('Chave de parcelamento: máximo 70 caracteres.')
        return self

class Reason(Input):
    reason: str = Field(min_length=5,max_length=1000)

class SendMessage(Input):
    admission_id: str
    text: str = Field(min_length=1,max_length=3000)
    client_key: str = Field(min_length=12,max_length=80)

class AttachmentReview(Input):
    version: int = Field(ge=1)
    status: Literal["validated","rejected"]
    note: str = Field(min_length=3,max_length=1000)

class GuardianDetails(Input):
    birth_date: date | None = None
    rg: str = Field(default='',max_length=32)
    rg_issuer: str = Field(default='',max_length=40)
    birth_certificate: str = Field(default='',max_length=80)
    mother_name: str = Field(default='',max_length=180)
    father_name: str = Field(default='',max_length=180)
    postal_code: str = Field(default='',max_length=16)
    street: str = Field(default='',max_length=180)
    address_number: str = Field(default='',max_length=24)
    address_complement: str = Field(default='',max_length=120)
    district: str = Field(default='',max_length=120)
    city: str = Field(default='',max_length=120)
    state: str = Field(default='',max_length=2)
    country: str = Field(default='Brasil',max_length=80)

    @field_validator('birth_date',mode='before')
    @classmethod
    def blank_date(cls,value):return PersonInput.blank_date(value)
    @field_validator('birth_date')
    @classmethod
    def past_date(cls,value):return PersonInput.not_future(value)

class PortalProfile(GuardianDetails):
    version: int = Field(ge=1)
    name: str = Field(min_length=2,max_length=180)
    cpf: str | None = None
    phone: str = Field(default='',max_length=24)
    address: str = Field(default='',max_length=400)
    whatsapp_opt_in: bool = False
    @field_validator('cpf')
    @classmethod
    def valid_cpf(cls,value):return Registration.valid_cpf(value)
    @field_validator('phone')
    @classmethod
    def valid_phone(cls,value):return Registration.phone_valid(value)
