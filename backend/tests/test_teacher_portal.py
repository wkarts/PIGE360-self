from test_profiles import create_user, login


def test_teacher_portal_is_scoped_and_reads_the_same_diary(api, client, admin, school):
    catalog = api.catalogs(year="2027")
    teacher = create_user(client, admin, name="Professor", email="docente-portal@example.com",
                          role="teacher", school_id=school["id"],
                          person_id=api.post("/persons", {"name":"Docente do portal"})["id"])
    principal = login(client, teacher["email"], "Profile-Test-Password-2026!")
    prefix = "/api/v1/teacher/schools/" + school["id"]
    agenda = prefix + "/programacao?week=2027-02-02"
    assert client.get(agenda, headers=admin).status_code == 403
    assert client.get(agenda, headers=principal).json()["assignments"] == []
    assignment = api.post("/teacher-assignments", {"teacher_user_id": teacher["id"],
                          "class_group_id":catalog["group"]["id"], "subject_name":"História"})
    empty = client.get(agenda, headers=principal).json()
    assert [a["id"] for a in empty["assignments"]] == [assignment["id"]]
    assert empty["diaries"] == []
    component = api.post("/curriculum-components", {"name":"História"})
    def diary(group, assigned=None):
        return api.post("/diaries", {"class_group_id":group, "component_id":component["id"],
                                      "teacher_assignment_id":assigned})["id"]
    own = diary(catalog["group"]["id"], assignment["id"])
    other_group = api.post("/class-groups", {"name":"Outra turma","academic_year_id":catalog["year"]["id"],
                         "unit_id":catalog["unit"]["id"],"grade_id":catalog["grade"]["id"],
                         "shift_id":catalog["shift"]["id"],"capacity":10})
    other = diary(other_group["id"])
    for day, diary_id in (("2027-02-01", own), ("2027-02-08", own), ("2027-02-03", other)):
        api.post("/diaries/"+diary_id+"/lessons", {"lesson_date":day, "lesson_count":1, "content":"Aula "+day})
    result = client.get(agenda, headers=principal).json()
    assert [e["date"] for e in result["events"]] == ["2027-02-01"]
    assert [d["id"] for d in result["diaries"]] == [own]
    assert client.get(prefix+"/diaries/"+other, headers=principal).status_code == 403
    assert client.post(prefix+"/diaries/"+other+"/lessons", headers=principal,
                       json={"lesson_date":"2027-02-04","content":"Outra turma"}).status_code == 403
    assert client.get(prefix+"/diaries/"+own, headers=admin).status_code == 403
    api.call("PATCH","/teacher-assignments/"+assignment["id"],{"version":assignment["version"],"data":{"active":False,"teacher_user_id":teacher["id"],"class_group_id":catalog["group"]["id"],"subject_name":"História"}})
    assert client.get(agenda, headers=principal).json()["events"] == []
    assert client.get(prefix+"/diaries/"+own, headers=principal).status_code == 403
