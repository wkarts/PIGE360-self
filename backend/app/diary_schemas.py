from datetime import date
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


class CloseDiaryInput(Input):
    academic_period_id: str | None = None
    reason: str = Field(min_length=3,max_length=1000)


class ReopenDiaryInput(Input):
    reason: str = Field(min_length=10,max_length=1000)


class PlanEdit(CurriculumPlanInput):
    version: int = Field(ge=1)


class LessonEdit(LessonInput):
    version: int = Field(ge=1)
