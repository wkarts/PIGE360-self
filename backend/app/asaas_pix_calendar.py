"""Calendário da operação Pix Automático, compatível com o módulo Perfex."""
from datetime import date, timedelta
from functools import lru_cache


@lru_cache(maxsize=32)
def bank_holidays(year):
    a, (b,c) = year % 19, divmod(year,100)
    d,e = divmod(b,4)
    f = (b+8)//25
    h = (19*a+b-d-(b-f+1)//3+15)%30
    i,k = divmod(c,4)
    l = (32+2*e+2*i-h-k)%7
    m = (a+11*h+22*l)//451
    month, day = divmod(h+l-7*m+114,31)
    easter = date(year,month,day+1)
    fixed = [(1,1),(4,21),(5,1),(9,7),(10,12),(11,2),(11,15),(12,25)]
    if year >= 2024:
        fixed.append((11,20))
    return frozenset([date(year,mo,day) for mo,day in fixed] +
                     [easter+timedelta(days=offset) for offset in (-48,-47,-2,60)])


def business_days(today, due, holidays=()):
    # O agendamento só distingue até dez dias úteis e aceita feriados adicionais.
    day, total = today, 0
    while day < due and total <= 10:
        day += timedelta(days=1)
        if day.weekday() < 5 and day not in bank_holidays(day.year) and day.isoformat() not in holidays:
            total += 1
    return total


def cycle_number(anchor, due, frequency):
    if due < anchor:
        return -1
    if frequency == 'WEEKLY':
        return (due-anchor).days//7
    months = (due.year-anchor.year)*12+due.month-anchor.month
    return months//{'MONTHLY':1,'QUARTERLY':3,'SEMIANNUALLY':6,'ANNUALLY':12}[frequency]
