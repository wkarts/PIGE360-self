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


def test_assign_existing_diary_from_teacher_registry(api, client, admin, school):
    catalog = api.catalogs(year="2027")
    group_id = catalog["group"]["id"]
    teacher = api.post("/teachers", {"person": {"name": "Docente de Ciências"}})
    user = create_user(client, admin, name="Docente de Ciências", email="ciencias@example.com",
                       role="teacher", school_id=school["id"], person_id=teacher["person"]["id"])
    actor = login(client, user["email"], "Profile-Test-Password-2026!")
    component = api.post("/curriculum-components", {"name": "Ciências"})
    diary = api.post("/diaries", {"class_group_id": group_id, "component_id": component["id"]})
    lesson = api.post("/diaries/"+diary["id"]+"/lessons", {"lesson_date": "2027-02-01", "content": "Observação"})
    endpoint = "/diaries/"+diary["id"]+"/teacher-assignment"
    portal = "/api/v1/teacher/schools/"+school["id"]+"/diaries/"+diary["id"]
    assignment_data = {"teacher_person_id": teacher["person"]["id"], "class_group_id": group_id, "subject_name": "Ciências"}
    assignment = api.post("/teacher-assignments", assignment_data)
    assert api.post("/teacher-assignments", assignment_data)["id"] == assignment["id"]
    other = api.post("/teacher-assignments", dict(assignment_data, subject_name="Língua Portuguesa"))
    initial = api.get("/diaries/"+diary["id"])
    change = {"version": initial["version"], "teacher_assignment_id": assignment["id"]}
    api.call("PUT", endpoint, dict(change, teacher_assignment_id=other["id"]), expect=422)
    assert client.put(portal+"/teacher-assignment", headers=actor, json=change).status_code == 403
    saved = api.call("PUT", endpoint, change)
    assert saved["teacher_name"] == "Docente de Ciências"
    assert saved["teacher_assignment_id"] == assignment["id"]
    assert client.get(portal, headers=actor).json()["lessons"][0]["id"] == lesson["id"]
    api.call("PUT", endpoint, dict(change, teacher_assignment_id=None), expect=409)
    api.call("PUT", endpoint, {"version": saved["version"], "teacher_assignment_id": None})
    assert client.get(portal, headers=actor).status_code == 403
