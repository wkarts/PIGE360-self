from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import Field, model_validator

from .schemas import Input


class AcademicPeriodInput(Input):
    academic_year_id: str
    name: str = Field(min_length=2,max_length=80)
    starts_on: date
    ends_on: date
    order_index: int = Field(default=1,ge=1,le=30)
    active: bool = True
    @model_validator(mode="after")
    def dates(self):
        if self.ends_on < self.starts_on:
            raise ValueError("Data final anterior à inicial.")
        return self


class CurriculumComponentInput(Input):
    name: str = Field(min_length=2,max_length=120)
    code: str = Field(default="",max_length=40)
    workload_hours: int = Field(default=0,ge=0,le=10000)
    active: bool = True


class CurriculumPlanInput(Input):
    class_group_id: str
    component_id: str
    academic_period_id: str | None = None
    teacher_assignment_id: str | None = None
    objectives: str = Field(default="",max_length=8000)
    thematic_units: str = Field(default="",max_length=8000)
    knowledge_objects: str = Field(default="",max_length=8000)
    bncc_references: list[str] = Field(default_factory=list,max_length=200)
    methodology: str = Field(default="",max_length=8000)
    resources: str = Field(default="",max_length=4000)
    assessment_strategy: str = Field(default="",max_length=8000)
    notes: str = Field(default="",max_length=8000)
    status: Literal["draft","published","archived"] = "draft"


class DiaryInput(Input):
    class_group_id: str
    component_id: str
    teacher_assignment_id: str | None = None
    notes: str = Field(default="",max_length=4000)


class LessonInput(Input):
    academic_period_id: str | None = None
    lesson_date: date
    lesson_count: int = Field(default=1,ge=1,le=20)
    content: str = Field(min_length=2,max_length=12000)
    skills: str = Field(default="",max_length=6000)
    methodology: str = Field(default="",max_length=6000)
    activities: str = Field(default="",max_length=6000)
    homework: str = Field(default="",max_length=4000)
    notes: str = Field(default="",max_length=6000)


class AttendanceItem(Input):
    enrollment_id: str
    status: Literal["present","absent","justified_absence"] = "present"
    note: str = Field(default="",max_length=500)


class AttendanceInput(Input):
    items: list[AttendanceItem] = Field(min_length=1,max_length=300)


class DiaryTransitionInput(Input):
    version: int = Field(ge=1)


class CloseDiaryInput(DiaryTransitionInput):
    academic_period_id: str | None = None
    reason: str = Field(min_length=3,max_length=1000)


class ReopenDiaryInput(DiaryTransitionInput):
    reason: str = Field(min_length=10,max_length=1000)


class PlanEdit(CurriculumPlanInput):
    version: int = Field(ge=1)


class LessonEdit(LessonInput):
    version: int = Field(ge=1)


class AssessmentInstrumentInput(Input):
    academic_period_id: str | None = None
    title: str = Field(min_length=2,max_length=160)
    kind: str = Field(default="activity",min_length=2,max_length=60)
    assessment_date: date
    value_type: Literal["numeric","concept"] = "numeric"
    max_score: Decimal | None = Field(default=None,gt=0,max_digits=10,decimal_places=2)
    weight: Decimal | None = Field(default=None,gt=0,max_digits=10,decimal_places=4)
    description: str = Field(default="",max_length=8000)
    skills: str = Field(default="",max_length=6000)
    status: Literal["draft","published","closed"] = "draft"

    @model_validator(mode="after")
    def numeric_requirements(self):
        if self.value_type == "numeric" and self.max_score is None:
            raise ValueError("Avaliação numérica exige valor máximo.")
        if self.value_type == "concept" and self.max_score is not None:
            raise ValueError("Avaliação conceitual não utiliza valor máximo.")
        return self


class AssessmentResultItem(Input):
    enrollment_id: str
    numeric_score: Decimal | None = Field(default=None,max_digits=10,decimal_places=2)
    concept: str = Field(default="",max_length=80)
    note: str = Field(default="",max_length=1000)


class AssessmentResultsInput(Input):
    items: list[AssessmentResultItem] = Field(min_length=1,max_length=300)


class DescriptiveOpinionInput(Input):
    academic_period_id: str | None = None
    enrollment_id: str
    text: str = Field(min_length=2,max_length=12000)
    status: Literal["draft","reviewed","final"] = "draft"


class PedagogicalRecordInput(Input):
    enrollment_id: str
    record_date: date
    kind: Literal["follow_up","intervention","recovery","adaptation","referral","observation"] = "observation"
    text: str = Field(min_length=2,max_length=12000)


class PeriodAssessmentRuleInput(Input):
    method: Literal["arithmetic","weighted","concept"] = "arithmetic"
    scale_max: Decimal = Field(default=Decimal("10"),gt=0,max_digits=10,decimal_places=4)
    decimal_places: int = Field(default=2,ge=0,le=4)
    minimum_score: Decimal | None = Field(default=None,ge=0,max_digits=10,decimal_places=4)
    minimum_attendance_percent: Decimal | None = Field(default=None,ge=0,le=100,max_digits=5,decimal_places=2)
    justified_absence_counts_as_present: bool | None = None
    recovery_mode: Literal["none","replace","higher","mean"] = "none"
    concept_scale: list[str] = Field(default_factory=list,max_length=30)
    required_opinion: bool = False
    version: int | None = Field(default=None,ge=1)

    @model_validator(mode="after")
    def validate_policy(self):
        if self.minimum_attendance_percent is not None and self.justified_absence_counts_as_present is None:
            raise ValueError("Defina se a falta justificada conta como presença antes de configurar limite de frequência.")
        if self.method == "concept":
            if self.minimum_score is not None:
                raise ValueError("O limite mínimo numérico só se aplica à consolidação numérica.")
            if len(self.concept_scale) < 2 or any(not item.strip() for item in self.concept_scale):
                raise ValueError("A consolidação conceitual exige uma escala ordenada com pelo menos dois conceitos.")
            if len({item.casefold() for item in self.concept_scale}) != len(self.concept_scale):
                raise ValueError("A escala conceitual não pode repetir conceitos.")
        elif self.concept_scale:
            raise ValueError("A escala conceitual só se aplica ao método conceitual.")
        if self.minimum_score is not None and self.minimum_score > self.scale_max:
            raise ValueError("O limite mínimo não pode superar a escala final.")
        return self


class DiaryOccurrenceInput(Input):
    academic_period_id: str | None = None
    enrollment_id: str
    occurrence_date: date
    kind: Literal["positive","pedagogical","behavioral","safety","other"] = "pedagogical"
    title: str = Field(min_length=2,max_length=160)
    description: str = Field(min_length=2,max_length=8000)
    status: Literal["draft","reviewed"] = "draft"


class DiaryOccurrenceEdit(DiaryOccurrenceInput):
    version: int = Field(ge=1)


class DiaryCommunicationInput(Input):
    enrollment_id: str
    academic_period_id: str | None = None
    occurrence_id: str | None = None
    recipient_guardian_link_ids: list[str] = Field(min_length=1,max_length=20)
    title: str = Field(min_length=2,max_length=160)
    message: str = Field(min_length=2,max_length=8000)
    client_key: str = Field(min_length=16,max_length=80)

    @model_validator(mode="after")
    def unique_recipients(self):
        if len(set(self.recipient_guardian_link_ids)) != len(self.recipient_guardian_link_ids):
            raise ValueError("O mesmo responsável não pode ser selecionado mais de uma vez.")
        return self
