/* Vue prÃ©-compilado; sem eval em runtime. */
var _Vue=Vue; var PigeRenders={contractValue:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode, createElementVNode: _createElementVNode, renderList: _renderList, Fragment: _Fragment, normalizeClass: _normalizeClass } = _Vue

    return (_openBlock(), _createElementBlock("label", { class: _normalizeClass(["contract-typed-field", 'contract-kind-'+props.field.input_type]) }, [_createElementVNode("span", null, [_createTextVNode(_toDisplayString(props.field.label) + " ", 1), (props.field.required)
      ? (_openBlock(), _createElementBlock("small", {
          key: 0,
          class: "contract-required"
        }, "ObrigatÃ³rio"))
      : _createCommentVNode("", true)]), (props.field.input_type==='uf')
      ? (_openBlock(), _createElementBlock("select", {
          key: 0,
          value: props.value,
          disabled: props.locked,
          onChange: change,
          "aria-label": props.field.label
        }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(states, (uf) => {
          return (_openBlock(), _createElementBlock("option", {
            key: uf,
            value: uf
          }, _toDisplayString(uf), 9, ["value"]))
        }), 128))], 40, ["value", "disabled", "onChange", "aria-label"]))
      : (_openBlock(), _createElementBlock("input", {
          key: 1,
          type: nativeType(),
          value: display(props.value,props.field.input_type),
          readonly: props.locked,
          onInput: change,
          onBlur: moneyBlur,
          inputmode: mode(),
          min: props.field.input_type==='integer'?(props.field.min||0):undefined,
          max: props.field.max||undefined,
          step: props.field.input_type==='integer'?1:undefined,
          maxlength: props.field.input_type==='cpf'?14:props.field.input_type==='cep'?9:2000,
          "aria-label": props.field.label,
          autocomplete: "off",
          placeholder: props.field.input_type==='money'?'0,00':undefined
        }, null, 40, ["type", "value", "readonly", "onInput", "onBlur", "inputmode", "min", "max", "step", "maxlength", "aria-label", "placeholder"])), (props.locked)
      ? (_openBlock(), _createElementBlock("small", {
          key: 2,
          class: "muted"
        }, _toDisplayString(props.field.source==='cadastro'?'Cadastro':props.field.source), 1))
      : _createCommentVNode("", true)], 2))
  }
},enrollmentWorkflow:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelText: _vModelText, vModelCheckbox: _vModelCheckbox, withModifiers: _withModifiers, resolveComponent: _resolveComponent, createBlock: _createBlock } = _Vue

    const _component_contracts_panel = _resolveComponent("contracts-panel")

    return (_openBlock(), _createElementBlock("section", {
      class: "panel x-card",
      "aria-label": "Assistentes de matrÃ­cula"
    }, [
      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "MatrÃ­cula orientada"), _createElementVNode("p", null, "Reutilize cadastros existentes. MatrÃ­cula, financeiro e contrato tÃªm estados independentes.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
        class: "btn btn-primary",
        disabled: s.busy,
        onClick: $event => (start('single'))
      }, "Assistente manual", 8, ["disabled", "onClick"]), _createElementVNode("button", {
        class: "btn btn-secondary",
        disabled: s.busy,
        onClick: $event => (start('batch'))
      }, "Matricular selecionados", 8, ["disabled", "onClick"])])]),
      (s.error)
        ? (_openBlock(), _createElementBlock("p", {
            key: 0,
            role: "alert",
            class: "alert error"
          }, _toDisplayString(s.error), 1))
        : _createCommentVNode("", true),
      (s.notice)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            role: "status",
            class: "alert success"
          }, _toDisplayString(s.notice), 1))
        : _createCommentVNode("", true),
      _createElementVNode("details", null, [_createElementVNode("summary", null, "HistÃ³rico e retomada (" + _toDisplayString(s.batches.length) + ")", 1), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.batches, (batch) => {
        return (_openBlock(), _createElementBlock("article", {
          key: batch.id,
          class: "family-line"
        }, [_createElementVNode("span", null, _toDisplayString(batch.created_at.slice(0,10)) + " Â· " + _toDisplayString(batch.payload.items.length) + " aluno(s) Â· " + _toDisplayString(({pending:'Aguardando execuÃ§Ã£o',completed:'ConcluÃ­do',partial:'Parcial',failed:'Com pendÃªncias',cancelled:'Cancelado'})[batch.status]||batch.status), 1), _createElementVNode("button", {
          class: "btn",
          onClick: $event => (resume(batch)),
          disabled: s.busy
        }, "Retomar", 8, ["onClick", "disabled"])]))
      }), 128))]),
      (s.open)
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h3", null, _toDisplayString(s.mode==='single'?'MatrÃ­cula manual':'MatrÃ­cula em lote') + " Â· Etapa " + _toDisplayString(s.step), 1), _createElementVNode("button", {
            class: "btn",
            onClick: $event => (s.open=false),
            disabled: s.busy
          }, "Fechar", 8, ["onClick", "disabled"])]), _createElementVNode("fieldset", {
            class: "portal-fieldset",
            disabled: s.busy
          }, [(s.step===1)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                _createElementVNode("p", null, "1. Selecione conscientemente o perÃ­odo, a turma e os alunos. Cadastre uma pessoa nova aqui ou selecione um cadastro existente. Depois de salvar, pesquise para selecionÃ¡-la."),
                (can('people.write'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn",
                      onClick: newStudent
                    }, "Cadastrar aluno neste fluxo", 8, ["onClick"]))
                  : _createCommentVNode("", true),
                _createElementVNode("div", { class: "x-grid" }, [
                  _createElementVNode("label", null, [_createTextVNode("PerÃ­odo destino"), _withDirectives(_createElementVNode("select", {
                    "aria-label": "PerÃ­odo destino",
                    "onUpdate:modelValue": $event => ((s.year) = $event),
                    onChange: changeYear
                  }, [_createElementVNode("option", { value: "" }, "Selecione o perÃ­odo"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.years.filter(y=>y.status==='active'), (year) => {
                    return (_openBlock(), _createElementBlock("option", { value: year.id }, _toDisplayString(year.name), 9, ["value"]))
                  }), 256))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, s.year]])]),
                  _createElementVNode("label", null, [_createTextVNode("Curso ou etapa"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((s.grade) = $event),
                    onChange: $event => {s.group='';assignGroup()}
                  }, [_createElementVNode("option", { value: "" }, "Todos os cursos e etapas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.grades.filter(g=>g.active), (grade) => {
                    return (_openBlock(), _createElementBlock("option", { value: grade.id }, _toDisplayString(grade.name), 9, ["value"]))
                  }), 256))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, s.grade]])]),
                  _createElementVNode("label", null, [_createTextVNode("Turma para a seleÃ§Ã£o"), _withDirectives(_createElementVNode("select", {
                    "aria-label": "Turma para a seleÃ§Ã£o",
                    "onUpdate:modelValue": $event => ((s.group) = $event),
                    onChange: assignGroup
                  }, [_createElementVNode("option", { value: "" }, "Selecione a turma"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(groups(), (group) => {
                    return (_openBlock(), _createElementBlock("option", { value: group.id }, _toDisplayString(group.name), 9, ["value"]))
                  }), 256))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, s.group]])]),
                  _createElementVNode("label", null, [_createTextVNode("Data da matrÃ­cula"), _withDirectives(_createElementVNode("input", {
                    type: "date",
                    "onUpdate:modelValue": $event => ((s.date) = $event)
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.date]])])
                ]),
                _createElementVNode("form", {
                  onSubmit: _withModifiers($event => {s.page=1;run(search)}, ["prevent"]),
                  class: "x-filter"
                }, [_createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": $event => ((s.importedOnly) = $event)
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.importedOnly]]), _createTextVNode("Somente alunos importados")]), _createElementVNode("label", null, [_createTextVNode("Buscar aluno existente"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((s.q) = $event),
                  placeholder: "Nome ou cÃ³digo"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.q]])]), _createElementVNode("button", { class: "btn" }, "Pesquisar")], 40, ["onSubmit"]),
                _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "SeleÃ§Ã£o"), _createElementVNode("th", null, "Aluno"), _createElementVNode("th", null, "CÃ³digo")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.students, (student) => {
                  return (_openBlock(), _createElementBlock("tr", { key: student.id }, [_createElementVNode("td", null, [_createElementVNode("button", {
                    class: "btn",
                    onClick: $event => (select(student))
                  }, _toDisplayString(s.selected.some(r=>r.id===student.id)?'Remover':'Selecionar'), 9, ["onClick"])]), _createElementVNode("td", null, _toDisplayString(student.person.name), 1), _createElementVNode("td", null, _toDisplayString(student.number), 1)]))
                }), 128))])])]),
                _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  class: "btn",
                  disabled: s.page===1,
                  onClick: $event => {s.page--;run(search)}
                }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("span", null, "PÃ¡gina " + _toDisplayString(s.page) + " Â· " + _toDisplayString(s.total) + " aluno(s)", 1), _createElementVNode("button", {
                  class: "btn",
                  disabled: s.page*15>=s.total,
                  onClick: $event => {s.page++;run(search)}
                }, "PrÃ³xima", 8, ["disabled", "onClick"])]),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.selected, (row) => {
                  return (_openBlock(), _createElementBlock("article", {
                    key: row.id,
                    class: "x-grid"
                  }, [_createElementVNode("strong", null, _toDisplayString(row.name), 1), _createElementVNode("label", null, [_createTextVNode("Turma destino"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((row.group) = $event) }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(groups(), (g) => {
                    return (_openBlock(), _createElementBlock("option", { value: g.id }, _toDisplayString(g.name), 9, ["value"]))
                  }), 256))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, row.group]])]), (s.mode==='single')
                    ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("ResponsÃ¡vel financeiro"), _withDirectives(_createElementVNode("select", {
                        "aria-label": "ResponsÃ¡vel financeiro",
                        "onUpdate:modelValue": $event => ((row.financial) = $event)
                      }, [_createElementVNode("option", { value: "" }, "Conferir depois"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.guardians, (guardian) => {
                        return (_openBlock(), _createElementBlock("option", { value: guardian.person_id }, _toDisplayString(guardian.person?.name||guardian.name), 9, ["value"]))
                      }), 256))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, row.financial]])]))
                    : _createCommentVNode("", true)]))
                }), 128)),
                (s.mode==='single'&&s.selected.length&&can('people.write'))
                  ? (_openBlock(), _createElementBlock("details", { key: 1 }, [
                      _createElementVNode("summary", null, "Vincular responsÃ¡vel pelo cadastro Ãºnico"),
                      _createElementVNode("button", {
                        class: "btn",
                        onClick: newPerson
                      }, "Cadastrar pessoa responsÃ¡vel", 8, ["onClick"]),
                      _createElementVNode("label", null, [_createTextVNode("Buscar pessoa responsÃ¡vel"), _withDirectives(_createElementVNode("input", { "onUpdate:modelValue": $event => ((s.personQuery) = $event) }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.personQuery]])]),
                      _createElementVNode("button", {
                        class: "btn",
                        onClick: searchPersons
                      }, "Buscar pessoas", 8, ["onClick"]),
                      _createElementVNode("form", { onSubmit: _withModifiers(linkPerson, ["prevent"]) }, [
                        _createElementVNode("label", null, [_createTextVNode("Pessoa"), _withDirectives(_createElementVNode("select", {
                          "onUpdate:modelValue": $event => ((s.link.person_id) = $event),
                          required: ""
                        }, [_createElementVNode("option", { value: "" }, "Selecione um cadastro"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.persons, (person) => {
                          return (_openBlock(), _createElementBlock("option", { value: person.id }, _toDisplayString(person.name), 9, ["value"]))
                        }), 256))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.link.person_id]])]),
                        _createElementVNode("label", null, [_createTextVNode("Parentesco ou relaÃ§Ã£o"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((s.link.relationship) = $event),
                          maxlength: "60"
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.link.relationship]])]),
                        _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((s.link.legal) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.link.legal]]), _createTextVNode("ResponsÃ¡vel legal")]),
                        _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((s.link.financial) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.link.financial]]), _createTextVNode("ResponsÃ¡vel financeiro")]),
                        _createElementVNode("button", { class: "btn" }, "Salvar vÃ­nculo")
                      ], 40, ["onSubmit"])
                    ]))
                  : _createCommentVNode("", true),
                _createElementVNode("p", null, _toDisplayString(s.selected.length) + " selecionado(s). Nenhuma pessoa serÃ¡ duplicada ou avanÃ§ada de sÃ©rie automaticamente.", 1),
                _createElementVNode("button", {
                  class: "btn btn-primary",
                  onClick: preview,
                  disabled: !s.year||!s.date||!s.selected.length||s.selected.some(r=>!r.group)
                }, "Simular matrÃ­culas", 8, ["onClick", "disabled"])
              ], 64))
            : _createCommentVNode("", true), (s.step===2&&s.plan)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                _createElementVNode("h3", null, "2. Revise a simulaÃ§Ã£o Â· " + _toDisplayString(s.plan.academic_year), 1),
                _createElementVNode("p", null, _toDisplayString(s.plan.effect), 1),
                _createElementVNode("p", null, _toDisplayString(s.plan.eligible) + " elegÃ­vel(is) Â· " + _toDisplayString(s.plan.blocked) + " bloqueado(s)", 1),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.plan.rows, (row) => {
                  return (_openBlock(), _createElementBlock("article", { class: "panel" }, [_createElementVNode("strong", null, _toDisplayString(row.student_name) + " Â· " + _toDisplayString(row.class_name), 1), _createElementVNode("p", null, _toDisplayString(row.status==='eligible'?'ElegÃ­vel':row.reason), 1), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(row.warnings, (warning) => {
                    return (_openBlock(), _createElementBlock("p", null, _toDisplayString(warning), 1))
                  }), 256))]))
                }), 256)),
                _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": $event => ((s.confirmed) = $event)
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.confirmed]]), _createTextVNode("Conferi a seleÃ§Ã£o e autorizo criar as matrÃ­culas em preparaÃ§Ã£o")]),
                _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  class: "btn",
                  onClick: $event => (s.step=1)
                }, "Voltar", 8, ["onClick"]), _createElementVNode("button", {
                  class: "btn btn-primary",
                  onClick: confirm,
                  disabled: s.plan.blocked>0||!s.confirmed
                }, "Confirmar matrÃ­culas", 8, ["onClick", "disabled"])])
              ], 64))
            : _createCommentVNode("", true), (s.step>=3&&s.batch)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                _createElementVNode("h3", null, "3. Resultado persistido"),
                _createElementVNode("button", {
                  class: "btn",
                  onClick: exportBatch
                }, "Exportar resultado", 8, ["onClick"]),
                (!['completed','cancelled'].includes(s.batch.status))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn",
                      onClick: cancelBatch
                    }, "Cancelar itens pendentes", 8, ["onClick"]))
                  : _createCommentVNode("", true),
                (s.batch.status==='cancelled')
                  ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Lote cancelado. Itens concluÃ­dos preservados."))
                  : _createCommentVNode("", true),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.batch.results, (row) => {
                  return (_openBlock(), _createElementBlock("article", { class: "family-line" }, [_createElementVNode("span", null, "Item " + _toDisplayString(row.index+1) + " Â· " + _toDisplayString(row.status==='completed'?'MatrÃ­cula criada em preparaÃ§Ã£o':row.reason), 1), (row.enrollment_id)
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 0,
                        href: "#/enrollments"
                      }, "Consultar matrÃ­cula"))
                    : _createCommentVNode("", true)]))
                }), 256)),
                (!['completed','cancelled'].includes(s.batch.status))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 2,
                      class: "btn",
                      onClick: $event => (run(process))
                    }, "Retentar itens nÃ£o concluÃ­dos", 8, ["onClick"]))
                  : _createCommentVNode("", true),
                (s.mode==='single'&&enrollment())
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                      (s.current)
                        ? (_openBlock(), _createElementBlock("section", {
                            key: 0,
                            class: "panel"
                          }, [
                            _createElementVNode("h4", null, "Estados atuais"),
                            _createElementVNode("p", null, "AcadÃªmico: " + _toDisplayString(({draft:'Em preparaÃ§Ã£o',active:'Efetivada',cancelled:'Cancelada',suspended:'Suspensa',transferred:'Transferida'})[s.current.status]||s.current.status), 1),
                            _createElementVNode("p", null, "Financeiro: " + _toDisplayString(s.charges.length) + " obrigaÃ§Ã£o(Ãµes), " + _toDisplayString(s.charges.filter(c=>['pending','overdue'].includes(c.status)).length) + " pendente(s)", 1),
                            _createElementVNode("p", null, "Documentos: " + _toDisplayString(s.documents.length) + " emitido(s), " + _toDisplayString(s.documents.filter(d=>d.signature_status!=='unsigned').length) + " com assinatura registrada", 1),
                            _createElementVNode("button", {
                              class: "btn",
                              onClick: $event => (run(hydrate))
                            }, "Atualizar estados", 8, ["onClick"])
                          ]))
                        : _createCommentVNode("", true),
                      _createElementVNode("nav", { class: "x-tabs" }, [_createElementVNode("button", {
                        class: "btn",
                        onClick: $event => (s.step=4)
                      }, "4. Financeiro", 8, ["onClick"]), _createElementVNode("button", {
                        class: "btn",
                        onClick: $event => (s.step=5)
                      }, "5. Contratos e fichas", 8, ["onClick"]), _createElementVNode("button", {
                        class: "btn",
                        onClick: activate
                      }, "Conferir e efetivar matrÃ­cula", 8, ["onClick"])]),
                      (s.step===4&&can('banking.write'))
                        ? (_openBlock(), _createElementBlock("form", {
                            key: 1,
                            onSubmit: _withModifiers(finance, ["prevent"]),
                            class: "x-form"
                          }, [
                            _createElementVNode("h3", null, "ObrigaÃ§Ãµes financeiras"),
                            _createElementVNode("label", null, [_createTextVNode("Forma de cobranÃ§a"), _withDirectives(_createElementVNode("select", {
                              "onUpdate:modelValue": $event => ((s.collectionMode) = $event),
                              disabled: s.financialSaved
                            }, [_createElementVNode("option", { value: "manual" }, "Controle interno"), _createTextVNode("Provedor bancÃ¡rio configurado")], 8, ["onUpdate:modelValue", "disabled"]), [[_vModelSelect, s.collectionMode]])]),
                            (s.collectionMode==='provider')
                              ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Meio bancÃ¡rio"), _withDirectives(_createElementVNode("select", {
                                  "onUpdate:modelValue": $event => ((s.billingType) = $event),
                                  disabled: s.financialSaved
                                }, [_createElementVNode("option", { value: "PIX" }, "Pix"), _createElementVNode("option", { value: "BOLETO" }, "Boleto")], 8, ["onUpdate:modelValue", "disabled"]), [[_vModelSelect, s.billingType]])]))
                              : _createCommentVNode("", true),
                            _createElementVNode("p", null, "O valor informado Ã© de cada parcela. O controle interno nÃ£o emite cobranÃ§a externa. O provedor exige configuraÃ§Ã£o e confirmaÃ§Ã£o. Nenhuma opÃ§Ã£o registra pagamento ou desconto presumido."),
                            _createElementVNode("div", { class: "x-grid" }, [
                              _createElementVNode("label", null, [_createTextVNode("Valor por parcela"), _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((s.finance.amount) = $event),
                                type: "number",
                                min: "0.01",
                                step: "0.01",
                                required: "",
                                disabled: s.financialSaved
                              }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, s.finance.amount]])]),
                              _createElementVNode("label", null, [_createTextVNode("Quantidade de parcelas"), _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((s.finance.installments) = $event),
                                type: "number",
                                min: "1",
                                max: "24",
                                required: "",
                                disabled: s.financialSaved
                              }, null, 8, ["onUpdate:modelValue", "disabled"]), [[
                                _vModelText,
                                s.finance.installments,
                                void 0,
                                { number: true }
                              ]])]),
                              _createElementVNode("label", null, [_createTextVNode("Primeiro vencimento"), _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((s.finance.due) = $event),
                                type: "date",
                                required: "",
                                disabled: s.financialSaved
                              }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, s.finance.due]])]),
                              _createElementVNode("label", null, [_createTextVNode("DescriÃ§Ã£o"), _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((s.finance.description) = $event),
                                minlength: "3",
                                maxlength: "450",
                                required: "",
                                disabled: s.financialSaved
                              }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, s.finance.description]])])
                            ]),
                            _createElementVNode("p", null, "Total: " + _toDisplayString(total()) + " Â· Vencimentos mensais a partir da data indicada.", 1),
                            _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                              type: "checkbox",
                              "onUpdate:modelValue": $event => ((s.finance.required) = $event),
                              disabled: s.financialSaved
                            }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelCheckbox, s.finance.required]]), _createTextVNode("Exigir quitaÃ§Ã£o antes da efetivaÃ§Ã£o")]),
                            _createElementVNode("button", {
                              class: "btn btn-primary",
                              disabled: s.financialSaved
                            }, _toDisplayString(s.collectionMode==='manual'?'Registrar parcelas pendentes':'Solicitar cobranÃ§as ao provedor'), 9, ["disabled"]),
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.charges, (charge) => {
                              return (_openBlock(), _createElementBlock("p", null, [_createTextVNode(_toDisplayString(charge.description) + " Â· " + _toDisplayString(charge.due_on) + " Â· " + _toDisplayString(charge.amount) + " Â· " + _toDisplayString(({pending:'Pendente',overdue:'Vencida',received:'Recebida',cancelled:'Cancelada'})[charge.status]||charge.status) + " ", 1), (charge.collection_mode==='manual'&&['pending','overdue'].includes(charge.status))
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    class: "btn",
                                    type: "button",
                                    onClick: $event => (beginReceipt(charge))
                                  }, "Registrar recebimento", 8, ["onClick"]))
                                : _createCommentVNode("", true)]))
                            }), 256)),
                            _createElementVNode("p", null, [_createTextVNode("Para cobrar por provedor ou registrar pagamento comprovado, utilize "), _createElementVNode("a", { href: "#/banking" }, "CobranÃ§as"), _createTextVNode(", com as permissÃµes especÃ­ficas.")])
                          ], 40, ["onSubmit"]))
                        : _createCommentVNode("", true),
                      (s.receiptCharge&&can('banking.write'))
                        ? (_openBlock(), _createElementBlock("form", {
                            key: 2,
                            class: "panel",
                            onSubmit: _withModifiers(receive, ["prevent"])
                          }, [
                            _createElementVNode("h4", null, "Conferir recebimento integral"),
                            _createElementVNode("p", null, _toDisplayString(s.receiptCharge.description), 1),
                            _createElementVNode("label", null, [_createTextVNode("Valor recebido"), _withDirectives(_createElementVNode("input", {
                              type: "number",
                              min: "0.01",
                              step: "0.01",
                              "onUpdate:modelValue": $event => ((s.receipt.amount) = $event),
                              required: ""
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.receipt.amount]])]),
                            _createElementVNode("label", null, [_createTextVNode("Data do recebimento"), _withDirectives(_createElementVNode("input", {
                              type: "date",
                              "onUpdate:modelValue": $event => ((s.receipt.paid_on) = $event),
                              required: ""
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.receipt.paid_on]])]),
                            _createElementVNode("label", null, [_createTextVNode("Meio de recebimento"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.receipt.payment_method) = $event) }, [
                              _createElementVNode("option", { value: "pix" }, "Pix"),
                              _createElementVNode("option", { value: "cash" }, "Dinheiro"),
                              _createElementVNode("option", { value: "transfer" }, "TransferÃªncia"),
                              _createElementVNode("option", { value: "card" }, "CartÃ£o"),
                              _createElementVNode("option", { value: "other" }, "Outro")
                            ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.receipt.payment_method]])]),
                            _createElementVNode("label", null, [_createTextVNode("ReferÃªncia do comprovante"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((s.receipt.reference) = $event),
                              minlength: "3",
                              required: ""
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.receipt.reference]])]),
                            _createElementVNode("button", { class: "btn btn-primary" }, "Confirmar recebimento integral"),
                            _createElementVNode("button", {
                              type: "button",
                              class: "btn",
                              onClick: $event => (s.receiptCharge=null)
                            }, "Voltar sem registrar", 8, ["onClick"])
                          ], 40, ["onSubmit"]))
                        : _createCommentVNode("", true)
                    ], 64))
                  : _createCommentVNode("", true)
              ], 64))
            : _createCommentVNode("", true)], 8, ["disabled"]), (s.step===5&&enrollment()&&can('documents.read'))
            ? (_openBlock(), _createBlock(_component_contracts_panel, {
                key: enrollment(),
                "school-id": props.schoolId,
                permissions: props.permissions,
                role: props.role,
                "enrollment-id": enrollment()
              }, null, 8, ["school-id", "permissions", "role", "enrollment-id"]))
            : _createCommentVNode("", true)], 64))
        : _createCommentVNode("", true)
    ]))
  }
},academicPreparation:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelText: _vModelText, withModifiers: _withModifiers } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "panel x-card",
      "aria-labelledby": "year-preparation-title"
    }, [
      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", { id: "year-preparation-title" }, "Preparar ano letivo"), _createElementVNode("p", null, "Reutilize a estrutura de um ano e prepare todas as suas turmas. O cadastro manual continua disponÃ­vel.")]), (!s.open)
        ? (_openBlock(), _createElementBlock("button", {
            key: 0,
            type: "button",
            class: "btn btn-secondary",
            onClick: $event => (s.open=true)
          }, "Preparar a partir de outro ano", 8, ["onClick"]))
        : _createCommentVNode("", true)]),
      (s.error)
        ? (_openBlock(), _createElementBlock("p", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(s.error), 1))
        : _createCommentVNode("", true),
      (s.notice)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            class: "alert success",
            role: "status"
          }, _toDisplayString(s.notice), 1))
        : _createCommentVNode("", true),
      (s.open)
        ? (_openBlock(), _createElementBlock("form", {
            key: 2,
            onSubmit: _withModifiers(preview, ["prevent"]),
            class: "x-form",
            "aria-busy": s.busy
          }, [
            _createElementVNode("fieldset", { disabled: s.busy }, [_createElementVNode("legend", null, "Origem e destino"), _createElementVNode("div", { class: "x-grid" }, [
              _createElementVNode("label", null, [_createTextVNode("Copiar turmas do ano"), _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": $event => ((s.source) = $event),
                required: ""
              }, [_createElementVNode("option", { value: "" }, "Selecione a origem"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(props.years, (year) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: year.id,
                  value: year.id
                }, _toDisplayString(year.name), 9, ["value"]))
              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.source]])]),
              _createElementVNode("label", null, [_createTextVNode("Ano de destino"), _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": $event => ((s.targetId) = $event),
                onChange: targetChanged
              }, [_createElementVNode("option", { value: "" }, "Criar novo ano"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(props.years.filter(y=>y.status==='active'&&y.id!==s.source), (year) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: year.id,
                  value: year.id
                }, _toDisplayString(year.name), 9, ["value"]))
              }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, s.targetId]])]),
              _createElementVNode("label", null, [_createTextVNode("Nome do ano"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((s.name) = $event),
                required: "",
                minlength: "2",
                maxlength: "40",
                readonly: !!s.targetId
              }, null, 8, ["onUpdate:modelValue", "readonly"]), [[_vModelText, s.name]])]),
              _createElementVNode("label", null, [_createTextVNode("InÃ­cio"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((s.starts) = $event),
                type: "date",
                required: "",
                readonly: !!s.targetId,
                max: s.ends
              }, null, 8, ["onUpdate:modelValue", "readonly", "max"]), [[_vModelText, s.starts]])]),
              _createElementVNode("label", null, [_createTextVNode("TÃ©rmino"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((s.ends) = $event),
                type: "date",
                required: "",
                readonly: !!s.targetId,
                min: s.starts
              }, null, 8, ["onUpdate:modelValue", "readonly", "min"]), [[_vModelText, s.ends]])])
            ])], 8, ["disabled"]),
            _createElementVNode("p", { class: "muted" }, "Copiam-se nomes, capacidades e situaÃ§Ã£o das turmas disponÃ­veis, reutilizando unidade, sÃ©rie e turno. NÃ£o sÃ£o copiados alunos, matrÃ­culas, atribuiÃ§Ãµes de professores, aulas, notas ou documentos. Nenhuma turma existente serÃ¡ sobrescrita."),
            _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
              class: "btn btn-secondary",
              disabled: s.busy,
              type: "submit"
            }, "Conferir prÃ©via", 8, ["disabled"]), _createElementVNode("button", {
              class: "btn btn-secondary",
              disabled: s.busy,
              type: "button",
              onClick: close
            }, "Cancelar", 8, ["disabled", "onClick"])]),
            (s.plan)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 0,
                  "aria-label": "PrÃ©via da preparaÃ§Ã£o"
                }, [
                  _createElementVNode("p", { role: "status" }, _toDisplayString(s.plan.create_count) + " turma(s) para criar Â· " + _toDisplayString(s.plan.reuse_count) + " jÃ¡ existente(s) para preservar", 1),
                  _createElementVNode("p", null, _toDisplayString(s.plan.scope), 1),
                  (s.plan.conflicts.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "alert error"
                      }, "HÃ¡ turmas divergentes no destino. Confira o cadastro manual; nenhuma alteraÃ§Ã£o serÃ¡ aplicada."))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                    _createElementVNode("th", null, "Turma"),
                    _createElementVNode("th", null, "Unidade / sÃ©rie / turno"),
                    _createElementVNode("th", null, "Capacidade"),
                    _createElementVNode("th", null, "Resultado")
                  ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.plan.rows, (row) => {
                    return (_openBlock(), _createElementBlock("tr", { key: row.source_id }, [
                      _createElementVNode("td", null, [_createTextVNode(_toDisplayString(row.name), 1), (!row.active)
                        ? (_openBlock(), _createElementBlock("small", { key: 0 }, " Â· inativa"))
                        : _createCommentVNode("", true)]),
                      _createElementVNode("td", null, _toDisplayString(row.unit) + " Â· " + _toDisplayString(row.grade) + " Â· " + _toDisplayString(row.shift), 1),
                      _createElementVNode("td", null, _toDisplayString(row.capacity), 1),
                      _createElementVNode("td", null, _toDisplayString(row.action==='create'?'Criar':row.action==='reuse'?'Preservar existente':'Conflito'), 1)
                    ]))
                  }), 128))])])]),
                  _createElementVNode("button", {
                    class: "btn btn-primary",
                    type: "button",
                    onClick: apply,
                    disabled: s.busy||!!s.plan.conflicts.length
                  }, "Confirmar preparaÃ§Ã£o do ano letivo", 8, ["onClick", "disabled"])
                ]))
              : _createCommentVNode("", true)
          ], 40, ["onSubmit", "aria-busy"]))
        : _createCommentVNode("", true)
    ]))
  }
},notificationEmail:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, vModelSelect: _vModelSelect, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelText: _vModelText, vModelCheckbox: _vModelCheckbox, withModifiers: _withModifiers, renderList: _renderList, Fragment: _Fragment } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "panel x-card",
      "aria-labelledby": "notification-email-title",
      "aria-busy": s.busy
    }, [
      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", { id: "notification-email-title" }, "Envio de notificaÃ§Ãµes"), _createElementVNode("p", null, "SMTP usado nos convites, avisos de inscriÃ§Ã£o e demais e-mails automÃ¡ticos. A conexÃ£o do webmail Ã© configurada separadamente."), _createElementVNode("span", { class: "badge" }, _toDisplayString(s.config.available?'Envio configurado':s.config.mode==='disabled'?'Envio desativado':'SMTP nÃ£o configurado'), 1)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
        class: "btn btn-secondary",
        type: "button",
        onClick: $event => (s.open=true),
        disabled: s.busy
      }, "Configurar envio", 8, ["onClick", "disabled"]), _createElementVNode("button", {
        class: "btn btn-secondary",
        type: "button",
        onClick: refresh,
        disabled: s.busy||dirty
      }, "Atualizar fila de e-mail", 8, ["onClick", "disabled"])])]),
      (s.error)
        ? (_openBlock(), _createElementBlock("p", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(s.error), 1))
        : _createCommentVNode("", true),
      (s.notice)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            class: "alert success",
            role: "status"
          }, _toDisplayString(s.notice), 1))
        : _createCommentVNode("", true),
      (s.delayed)
        ? (_openBlock(), _createElementBlock("p", {
            key: 2,
            class: "alert warning"
          }, "HÃ¡ e-mails aguardando hÃ¡ mais de cinco minutos. Solicite a verificaÃ§Ã£o do serviÃ§o de processamento de integraÃ§Ãµes."))
        : _createCommentVNode("", true),
      (s.open)
        ? (_openBlock(), _createElementBlock("form", {
            key: 3,
            onSubmit: _withModifiers(save, ["prevent"]),
            class: "x-form"
          }, [
            _createElementVNode("fieldset", { disabled: s.busy }, [
              _createElementVNode("legend", null, "Servidor de envio"),
              _createElementVNode("label", null, [_createTextVNode("ConfiguraÃ§Ã£o"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.form.mode) = $event) }, [_createElementVNode("option", { value: "inherit" }, "Usar SMTP da instalaÃ§Ã£o"), _createElementVNode("option", { value: "school" }, "Configurar SMTP desta escola"), _createElementVNode("option", { value: "disabled" }, "Desativar notificaÃ§Ãµes por e-mail desta escola")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.form.mode]])]),
              (s.form.mode==='inherit')
                ? (_openBlock(), _createElementBlock("p", { key: 0 }, _toDisplayString(s.config.installation_configured?'A instalaÃ§Ã£o possui servidor e remetente configurados.':'A instalaÃ§Ã£o nÃ£o possui servidor e remetente SMTP configurados. Configure o SMTP desta escola para habilitar o envio.'), 1))
                : _createCommentVNode("", true),
              (s.form.mode==='school')
                ? (_openBlock(), _createElementBlock("div", {
                    key: 1,
                    class: "x-grid"
                  }, [
                    _createElementVNode("label", null, [_createTextVNode("Servidor SMTP"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((s.form.host) = $event),
                      required: "",
                      maxlength: "253",
                      placeholder: "mail.escola.edu.br",
                      autocomplete: "off"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.host]])]),
                    _createElementVNode("label", null, [_createTextVNode("SeguranÃ§a e porta"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.form.port) = $event) }, [_createElementVNode("option", { value: 587 }, "STARTTLS Â· 587", 8, ["value"]), _createElementVNode("option", { value: 465 }, "TLS Â· 465", 8, ["value"])], 8, ["onUpdate:modelValue"]), [[
                      _vModelSelect,
                      s.form.port,
                      void 0,
                      { number: true }
                    ]])]),
                    _createElementVNode("label", null, [_createTextVNode("UsuÃ¡rio SMTP"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((s.form.username) = $event),
                      required: "",
                      maxlength: "254",
                      autocomplete: "username"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.username]])]),
                    _createElementVNode("label", null, [_createTextVNode("Remetente"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((s.form.from_address) = $event),
                      required: "",
                      type: "email",
                      maxlength: "254"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.from_address]])]),
                    _createElementVNode("label", null, [_createTextVNode("Senha SMTP"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((s.password) = $event),
                      type: "password",
                      required: !s.config.password_configured,
                      maxlength: "512",
                      autocomplete: "new-password",
                      placeholder: s.config.password_configured?'Vazio preserva a senha salva':'Senha do remetente'
                    }, null, 8, ["onUpdate:modelValue", "required", "placeholder"]), [[_vModelText, s.password]])]),
                    _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((s.form.allow_private_network) = $event),
                      type: "checkbox"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.form.allow_private_network]]), _createTextVNode("Servidor na rede privada desta instalaÃ§Ã£o")])
                  ]))
                : _createCommentVNode("", true)
            ], 8, ["disabled"]),
            _createElementVNode("p", { class: "muted" }, "Use uma conta autorizada a enviar pelo remetente informado. A senha Ã© armazenada criptografada. O certificado TLS Ã© sempre verificado."),
            _createElementVNode("div", { class: "actions" }, [
              _createElementVNode("button", {
                class: "btn btn-primary",
                disabled: s.busy
              }, "Salvar envio", 8, ["disabled"]),
              (s.form.mode==='school')
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    type: "button",
                    class: "btn btn-secondary",
                    onClick: validate,
                    disabled: s.busy||dirty
                  }, "Validar autenticaÃ§Ã£o", 8, ["onClick", "disabled"]))
                : _createCommentVNode("", true),
              _createElementVNode("button", {
                type: "button",
                class: "btn btn-secondary",
                onClick: test,
                disabled: s.busy||dirty||!s.config.available
              }, "Enviar teste para meu e-mail", 8, ["onClick", "disabled"]),
              _createElementVNode("button", {
                type: "button",
                class: "btn btn-secondary",
                onClick: cancel,
                disabled: s.busy
              }, "Fechar", 8, ["onClick", "disabled"])
            ]),
            (s.config.checked_at)
              ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Ãšltima validaÃ§Ã£o: " + _toDisplayString(dateTime(s.config.checked_at)) + " Â· " + _toDisplayString(s.config.last_error||'AutenticaÃ§Ã£o aceita'), 1))
              : _createCommentVNode("", true)
          ], 40, ["onSubmit"]))
        : _createCommentVNode("", true),
      _createElementVNode("p", { class: "muted" }, "â€œAceito pelo servidor SMTPâ€ confirma apenas a aceitaÃ§Ã£o do envio. A entrega exige conferir o destinatÃ¡rio, spam e os registros do provedor. Resultados desconhecidos exigem conferÃªncia antes de reenviar."),
      (s.jobs.length)
        ? (_openBlock(), _createElementBlock("div", {
            key: 4,
            class: "table-wrap"
          }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
            _createElementVNode("th", null, "Data"),
            _createElementVNode("th", null, "SituaÃ§Ã£o"),
            _createElementVNode("th", null, "Tentativas"),
            _createElementVNode("th", null, "DiagnÃ³stico")
          ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.jobs, (job) => {
            return (_openBlock(), _createElementBlock("tr", { key: job.id }, [
              _createElementVNode("td", null, _toDisplayString(dateTime(job.created_at)), 1),
              _createElementVNode("td", null, _toDisplayString(job.label), 1),
              _createElementVNode("td", null, _toDisplayString(job.attempts), 1),
              _createElementVNode("td", null, _toDisplayString(job.error_code||'â€”'), 1)
            ]))
          }), 128))])])]))
        : (_openBlock(), _createElementBlock("p", {
            key: 5,
            class: "muted"
          }, "Nenhum e-mail na fila recente desta escola."))
    ], 8, ["aria-busy"]))
  }
},app:function render(_ctx, _cache) {
  with (_ctx) {
    const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, vModelText: _vModelText, withDirectives: _withDirectives, resolveComponent: _resolveComponent, createVNode: _createVNode, renderList: _renderList, Fragment: _Fragment, vModelDynamic: _vModelDynamic, withModifiers: _withModifiers, withKeys: _withKeys, normalizeClass: _normalizeClass, vShow: _vShow, createBlock: _createBlock, normalizeStyle: _normalizeStyle, vModelSelect: _vModelSelect, vModelCheckbox: _vModelCheckbox } = _Vue

    const _component_assist_panel = _resolveComponent("assist-panel")
    const _component_legacy_import_panel = _resolveComponent("legacy-import-panel")
    const _component_diagnostics_panel = _resolveComponent("diagnostics-panel")
    const _component_institutional_email = _resolveComponent("institutional-email")
    const _component_audit_panel = _resolveComponent("audit-panel")
    const _component_notification_email = _resolveComponent("notification-email")
    const _component_mailcow_panel = _resolveComponent("mailcow-panel")
    const _component_expansion_panel = _resolveComponent("expansion-panel")
    const _component_diary_panel = _resolveComponent("diary-panel")
    const _component_contracts_panel = _resolveComponent("contracts-panel")
    const _component_school_community = _resolveComponent("school-community")
    const _component_learning_panel = _resolveComponent("learning-panel")
    const _component_academic_preparation = _resolveComponent("academic-preparation")
    const _component_reports_panel = _resolveComponent("reports-panel")
    const _component_enrollment_workflow = _resolveComponent("enrollment-workflow")
    const _component_users_panel = _resolveComponent("users-panel")
    const _component_signing_panel = _resolveComponent("signing-panel")
    const _component_lifecycle_panel = _resolveComponent("lifecycle-panel")
    const _component_camera_capture = _resolveComponent("camera-capture")

    return (_openBlock(), _createElementBlock("div", {
      class: "app-root",
      "aria-busy": state.busy || state.loading || state.schoolLoading
    }, [(!state.ready)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "loading-screen"
        }, [(identity.logo_url)
          ? (_openBlock(), _createElementBlock("img", {
              key: 0,
              class: "brand-symbol official-symbol",
              src: identity.logo_url,
              alt: identity.display_name
            }, null, 8, ["src", "alt"]))
          : _createCommentVNode("", true), _createElementVNode("h1", null, _toDisplayString(identity.display_name), 1), _createElementVNode("p", null, "Preparando a aplicaÃ§Ã£oâ€¦")]))
      : (!state.user)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "auth-layout"
          }, [_createElementVNode("section", { class: "auth-intro" }, [_createElementVNode("div", { class: "official-brand" }, [(identity.logo_url)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: identity.logo_url,
                alt: identity.display_name
              }, null, 8, ["src", "alt"]))
            : (_openBlock(), _createElementBlock("strong", {
                key: 1,
                class: "institution-name"
              }, _toDisplayString(identity.display_name), 1))]), _createElementVNode("div", { class: "auth-copy" }, [_createElementVNode("p", { class: "eyebrow" }, "GESTÃƒO EDUCACIONAL"), _createElementVNode("h1", null, [_createTextVNode("A gestÃ£o educacional."), _createElementVNode("br"), _createTextVNode("Organizada, de verdade.")])])]), _createElementVNode("section", { class: "auth-panel" }, [(!state.configured)
            ? (_openBlock(), _createElementBlock("form", {
                key: 0,
                class: "auth-form setup-form",
                onSubmit: _withModifiers(configure, ["prevent"])
              }, [
                _createElementVNode("p", { class: "eyebrow" }, "PRIMEIRO ACESSO"),
                _createElementVNode("h2", null, "Configure sua instituiÃ§Ã£o"),
                _createElementVNode("p", { class: "muted" }, "Use a chave SETUP_TOKEN gerada no arquivo .env. Nenhuma senha padrÃ£o Ã© instalada."),
                (state.error)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "alert error",
                      role: "alert"
                    }, _toDisplayString(state.error), 1))
                  : _createCommentVNode("", true),
                _createElementVNode("div", { class: "form-grid" }, [
                  _createElementVNode("label", { class: "field wide" }, [_createTextVNode("Chave de instalaÃ§Ã£o"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.token) = $event),
                    type: "password",
                    required: "",
                    autocomplete: "off"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.token]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Empresa / mantenedora"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((setupCompany.name) = $event),
                    required: "",
                    maxlength: "160"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, setupCompany.name]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("CPF / CNPJ"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((setupCompany.document) = $event),
                    maxlength: "24"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, setupCompany.document]])]),
                  _createVNode(_component_assist_panel, {
                    target: setupCompany,
                    fields: setupCompanyFields,
                    request: setupLookup,
                    root: "/setup",
                    ocr: false,
                    cnpj: true,
                    cep: false,
                    mapping: {cnpj:'document'},
                    label: "mantenedora desta escola"
                  }, null, 8, ["target", "fields", "request", "ocr", "cnpj", "cep", "mapping"]),
                  _createElementVNode("details", { class: "wide" }, [_createElementVNode("summary", null, "Dados complementares da mantenedora"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(companyExtra, ([key,caption]) => {
                    return (_openBlock(), _createElementBlock("label", {
                      key: key,
                      class: "field"
                    }, [_createTextVNode(_toDisplayString(caption), 1), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((setupCompany[key]) = $event),
                      type: key==='email'?'email':'text'
                    }, null, 8, ["onUpdate:modelValue", "type"]), [[_vModelDynamic, setupCompany[key]]])]))
                  }), 128))]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Nome da escola"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.school_name) = $event),
                    required: "",
                    maxlength: "160"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.school_name]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Unidade principal"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.unit_name) = $event),
                    required: "",
                    maxlength: "160"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.unit_name]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Ano letivo"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.academic_year) = $event),
                    type: "number",
                    min: "2000",
                    max: "2200",
                    required: ""
                  }, null, 8, ["onUpdate:modelValue"]), [[
                    _vModelText,
                    state.setup.academic_year,
                    void 0,
                    { number: true }
                  ]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Administrador"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.admin_name) = $event),
                    required: "",
                    maxlength: "160"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.admin_name]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("E-mail do administrador"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.admin_email) = $event),
                    type: "email",
                    required: "",
                    autocomplete: "username"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.admin_email]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Senha inicial"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.admin_password) = $event),
                    type: "password",
                    required: "",
                    minlength: "12",
                    maxlength: "128",
                    autocomplete: "new-password"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.admin_password]])])
                ]),
                _createElementVNode("button", {
                  class: "btn btn-primary full",
                  disabled: state.loginBusy || !state.online
                }, _toDisplayString(state.loginBusy ? 'Configurandoâ€¦' : 'Concluir instalaÃ§Ã£o'), 9, ["disabled"])
              ], 40, ["onSubmit"]))
            : (mfa.state.challenge)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 1,
                  class: "auth-form"
                }, [_createElementVNode("div", {
                  class: "mfa-box",
                  "aria-live": "polite"
                }, [(mfa.state.error)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      role: "alert",
                      class: "alert error"
                    }, _toDisplayString(mfa.state.error), 1))
                  : _createCommentVNode("", true), (mfa.state.codes.length)
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                      _createElementVNode("h2", null, "Guarde seus cÃ³digos de recuperaÃ§Ã£o"),
                      _createElementVNode("p", null, "Use um cÃ³digo se perder o autenticador. Cada cÃ³digo funciona uma Ãºnica vez; eles nÃ£o serÃ£o exibidos novamente."),
                      _createElementVNode("div", { class: "mfa-codes" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(mfa.state.codes, (code) => {
                        return (_openBlock(), _createElementBlock("code", { key: code }, _toDisplayString(code), 1))
                      }), 128))]),
                      _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                        class: "btn btn-secondary",
                        type: "button",
                        onClick: mfa.downloadCodes
                      }, "Salvar cÃ³digos", 8, ["onClick"]), _createElementVNode("button", {
                        class: "btn btn-primary",
                        type: "button",
                        disabled: mfa.state.busy,
                        onClick: mfa.acknowledge
                      }, "Guardei os cÃ³digos Â· Continuar", 8, ["disabled", "onClick"])])
                    ], 64))
                  : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                      _createElementVNode("h2", null, _toDisplayString(mfa.state.enrolling?'Ative a autenticaÃ§Ã£o em duas etapas':'Confirme seu acesso'), 1),
                      (mfa.state.enrolling)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("p", null, "Adicione esta conta ao seu aplicativo autenticador e informe o cÃ³digo gerado."), (mfa.state.qr)
                            ? (_openBlock(), _createElementBlock("img", {
                                key: 0,
                                src: mfa.state.qr,
                                class: "mfa-qr",
                                alt: "QR Code para configurar seu autenticador"
                              }, null, 8, ["src"]))
                            : _createCommentVNode("", true), _createElementVNode("details", null, [_createElementVNode("summary", null, "Digitar chave manualmente"), _createElementVNode("code", { class: "mfa-secret" }, _toDisplayString(mfa.state.secret), 1)])], 64))
                        : (_openBlock(), _createElementBlock("p", { key: 1 }, "Informe o cÃ³digo do autenticador ou um cÃ³digo de recuperaÃ§Ã£o.")),
                      _createElementVNode("label", { class: "field" }, [_createTextVNode(_toDisplayString(mfa.state.enrolling?'CÃ³digo de 6 dÃ­gitos':'CÃ³digo do autenticador ou de recuperaÃ§Ã£o'), 1), _withDirectives(_createElementVNode("input", {
                        "onUpdate:modelValue": $event => ((mfa.state.code) = $event),
                        autocomplete: "one-time-code",
                        inputmode: mfa.state.enrolling?'numeric':'text',
                        maxlength: "30",
                        disabled: mfa.state.busy,
                        onKeydown: _withKeys(_withModifiers(mfa.finish, ["prevent"]), ["enter"])
                      }, null, 40, ["onUpdate:modelValue", "inputmode", "disabled", "onKeydown"]), [[_vModelText, mfa.state.code]])]),
                      _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                        type: "button",
                        class: "btn btn-secondary",
                        disabled: mfa.state.busy,
                        onClick: mfa.cancel
                      }, "Voltar", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                        type: "button",
                        class: "btn btn-primary",
                        disabled: mfa.state.busy || !mfa.state.code,
                        onClick: mfa.finish
                      }, _toDisplayString(mfa.state.busy?'Validandoâ€¦':'Confirmar'), 9, ["disabled", "onClick"])])
                    ], 64))])]))
              : (_openBlock(), _createElementBlock("form", {
                  key: 2,
                  class: "auth-form",
                  onSubmit: _withModifiers(login, ["prevent"])
                }, [
                  _createElementVNode("header", { class: "auth-heading" }, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name), 1), _createElementVNode("h2", null, "Acesse sua instituiÃ§Ã£o"), _createElementVNode("p", { class: "muted" }, "Informe suas credenciais para continuar.")]),
                  (state.error)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: "alert error",
                        role: "alert"
                      }, _toDisplayString(state.error), 1))
                    : _createCommentVNode("", true),
                  (state.success)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 1,
                        class: "alert success"
                      }, _toDisplayString(state.success), 1))
                    : _createCommentVNode("", true),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("E-mail"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.login.email) = $event),
                    type: "email",
                    inputmode: "email",
                    autocapitalize: "none",
                    spellcheck: false,
                    enterkeyhint: "next",
                    required: "",
                    autocomplete: "username",
                    placeholder: "seu.nome@escola.com.br"
                  }, null, 8, ["onUpdate:modelValue", "spellcheck"]), [[_vModelText, state.login.email]])]),
                  _createElementVNode("div", { class: "field" }, [_createElementVNode("label", { for: "login-password" }, "Senha"), _createElementVNode("div", { class: "password-control" }, [_withDirectives(_createElementVNode("input", {
                    id: "login-password",
                    "onUpdate:modelValue": $event => ((state.login.password) = $event),
                    type: state.loginPasswordVisible ? 'text' : 'password',
                    required: "",
                    maxlength: "128",
                    autocomplete: "current-password",
                    enterkeyhint: "go",
                    placeholder: "Sua senha de acesso"
                  }, null, 8, ["onUpdate:modelValue", "type"]), [[_vModelDynamic, state.login.password]]), _createElementVNode("button", {
                    type: "button",
                    class: "password-toggle",
                    "aria-label": state.loginPasswordVisible ? 'Ocultar senha' : 'Mostrar senha',
                    "aria-pressed": state.loginPasswordVisible,
                    "aria-controls": "login-password",
                    onClick: $event => (state.loginPasswordVisible=!state.loginPasswordVisible)
                  }, _toDisplayString(state.loginPasswordVisible ? 'Ocultar' : 'Mostrar'), 9, ["aria-label", "aria-pressed", "onClick"])])]),
                  _createElementVNode("button", {
                    class: "btn btn-primary full",
                    disabled: state.loginBusy || !state.online
                  }, [_createTextVNode(_toDisplayString(state.loginBusy ? 'Autenticandoâ€¦' : 'Entrar na aplicaÃ§Ã£o') + " ", 1), _createElementVNode("span", null, "â†’")], 8, ["disabled"]),
                  (state.embedded)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 2,
                        class: "small muted"
                      }, [_createTextVNode("Se nÃ£o conseguir entrar nesta janela, "), _createElementVNode("a", {
                        href: "/",
                        target: "_blank",
                        rel: "noopener"
                      }, "abra a escola no navegador"), _createTextVNode(".")]))
                    : _createCommentVNode("", true),
                  _createElementVNode("p", { class: "auth-help muted" }, "Precisa recuperar seu acesso? Fale com a secretaria da escola.")
                ], 40, ["onSubmit"])), (state.configured && !mfa.state.challenge && identity.show_preenrollment_button)
            ? (_openBlock(), _createElementBlock("div", {
                key: 3,
                class: "auth-enrollment"
              }, [_createElementVNode("p", null, "Ainda nÃ£o faz parte da escola?"), _createElementVNode("a", {
                class: "btn btn-secondary full",
                href: "/online.html"
              }, "Sou responsÃ¡vel Â· PrÃ©-matrÃ­cula online â†’")]))
            : _createCommentVNode("", true), (!state.online)
            ? (_openBlock(), _createElementBlock("p", {
                key: 4,
                class: "alert warning"
              }, "Sem conexÃ£o com o servidor. O acesso aos dados exige conexÃ£o."))
            : _createCommentVNode("", true)])]))
        : (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "workspace"
          }, [
            _createElementVNode("a", {
              href: "#main-content",
              class: "skip-content",
              "data-focus-content": ""
            }, "Ir para o conteÃºdo"),
            (state.menuOpen)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "sidebar-shade",
                  onClick: $event => (state.menuOpen=false)
                }, null, 8, ["onClick"]))
              : _createCommentVNode("", true),
            _createElementVNode("aside", {
              id: "school-navigation",
              class: _normalizeClass(["sidebar", {visible:state.menuOpen}]),
              "aria-label": "NavegaÃ§Ã£o da escola"
            }, [_createElementVNode("div", { class: "sidebar-brand" }, [_createElementVNode("button", {
              type: "button",
              class: "icon-button sidebar-close",
              "aria-label": "Fechar menu",
              onClick: $event => (state.menuOpen=false)
            }, [(_openBlock(), _createElementBlock("svg", {
              class: "ui-icon",
              "aria-hidden": "true",
              focusable: "false"
            }, [_createElementVNode("use", { href: "/ui-icons.svg#close" })]))], 8, ["onClick"]), _createElementVNode("a", {
              href: "#/dashboard",
              class: "brand-line",
              inert: state.schoolLoading,
              onClick: _withModifiers($event => (navigate('dashboard')), ["prevent"])
            }, [(identity.logo_url)
              ? (_openBlock(), _createElementBlock("img", {
                  key: 0,
                  class: "sidebar-logo",
                  src: identity.logo_url,
                  alt: identity.display_name
                }, null, 8, ["src", "alt"]))
              : (_openBlock(), _createElementBlock("strong", {
                  key: 1,
                  class: "institution-name"
                }, _toDisplayString(identity.short_name), 1))], 8, ["inert", "onClick"])]), (state.schoolLoading)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "sidebar-scroll"
                }, [_createElementVNode("p", {
                  class: "sidebar-label",
                  role: "status"
                }, "Carregando o menu da escolaâ€¦")]))
              : (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "sidebar-scroll",
                  tabindex: "0",
                  role: "region",
                  "aria-label": "Rolagem do menu"
                }, [
                  _createElementVNode("div", { class: "sidebar-label" }, "OPERAÃ‡ÃƒO ESCOLAR"),
                  (state.emailAvailable)
                    ? (_openBlock(), _createElementBlock("nav", {
                        key: 0,
                        "aria-label": "E-mail institucional"
                      }, [_createElementVNode("a", {
                        href: "#/webmail",
                        class: _normalizeClass({active:state.page==='webmail'}),
                        "aria-current": state.page==='webmail'?'page':undefined,
                        onClick: _withModifiers($event => (navigate('webmail')), ["prevent"])
                      }, [(_openBlock(), _createElementBlock("svg", {
                        class: "nav-icon",
                        "aria-hidden": "true"
                      }, [_createElementVNode("use", { href: "/ui-icons.svg#email" })])), _createTextVNode("E-mail")], 10, ["aria-current", "onClick"]), (state.user?.role!=='admin')
                        ? (_openBlock(), _createElementBlock("a", {
                            key: 0,
                            href: "#/email",
                            class: _normalizeClass({active:state.page==='email'}),
                            "aria-current": state.page==='email'?'page':undefined,
                            onClick: _withModifiers($event => (navigate('email')), ["prevent"])
                          }, [(_openBlock(), _createElementBlock("svg", {
                            class: "nav-icon",
                            "aria-hidden": "true"
                          }, [_createElementVNode("use", { href: "/ui-icons.svg#integrations" })])), _createTextVNode("PreferÃªncias de e-mail")], 10, ["aria-current", "onClick"]))
                        : _createCommentVNode("", true)]))
                    : _createCommentVNode("", true),
                  (!isProfileRole())
                    ? (_openBlock(), _createElementBlock("nav", {
                        key: 1,
                        "aria-label": "Menu principal"
                      }, [
                        (can('dashboard.read') || isProfileRole())
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 0,
                              href: "#/dashboard",
                              class: _normalizeClass({active:state.page==='dashboard'}),
                              "aria-current": state.page==='dashboard'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('dashboard')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#dashboard" })])), _createTextVNode("VisÃ£o geral")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true),
                        (can('people.read') || can('read'))
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 1,
                              class: _normalizeClass(["nav-group", {selected:registryPages.includes(state.page)}])
                            }, [_createElementVNode("button", {
                              type: "button",
                              class: "nav-group-toggle",
                              "aria-label": "Cadastros",
                              onClick: $event => (state.cadastresOpen=!state.cadastresOpen),
                              "aria-expanded": state.cadastresOpen,
                              "aria-controls": "cadastres-menu"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#records" })])), _createElementVNode("span", null, "Cadastros"), (_openBlock(), _createElementBlock("svg", {
                              class: _normalizeClass(["nav-chevron ui-icon", {expanded:state.cadastresOpen}]),
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#chevron" })], 2))], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                              id: "cadastres-menu",
                              class: "nav-group-items"
                            }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(registryPages, (key) => {
                              return (_openBlock(), _createElementBlock("a", {
                                key: key,
                                href: '#/'+key,
                                class: _normalizeClass({active:state.page===key}),
                                "aria-current": state.page===key?'page':undefined,
                                onClick: _withModifiers($event => (navigate(key)), ["prevent"])
                              }, [(_openBlock(), _createElementBlock("svg", {
                                class: "nav-icon",
                                "aria-hidden": "true",
                                focusable: "false"
                              }, [_createElementVNode("use", { href: '/ui-icons.svg#'+key }, null, 8, ["href"])])), _createElementVNode("span", null, _toDisplayString(pageLabels[key]), 1)], 10, ["href", "aria-current", "onClick"]))
                            }), 128))], 512), [[_vShow, state.cadastresOpen]])], 2))
                          : _createCommentVNode("", true),
                        (can('enrollments.read'))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 2,
                              href: "#/enrollments",
                              class: _normalizeClass({active:state.page==='enrollments'}),
                              "aria-current": state.page==='enrollments'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('enrollments')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#enrollment" })])), _createTextVNode("MatrÃ­culas")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true),
                        (can('academic.read'))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 3,
                              href: "#/academic",
                              class: _normalizeClass({active:state.page==='academic'}),
                              "aria-current": state.page==='academic'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('academic')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])), _createTextVNode("Estrutura acadÃªmica")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true),
                        (can('diary.read'))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 4,
                              href: "#/diary",
                              class: _normalizeClass({active:state.page==='diary'}),
                              "aria-current": state.page==='diary'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('diary')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])), _createTextVNode("DiÃ¡rio Escolar")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true),
                        (can('documents.read'))
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 5,
                              class: _normalizeClass(["nav-group", {selected:documentPages.includes(state.page)}])
                            }, [_createElementVNode("button", {
                              type: "button",
                              class: "nav-group-toggle",
                              "aria-label": "Documentos",
                              onClick: $event => (state.documentsOpen=!state.documentsOpen),
                              "aria-expanded": state.documentsOpen || documentPages.includes(state.page),
                              "aria-controls": "documents-menu"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createElementVNode("span", null, "Documentos"), (_openBlock(), _createElementBlock("svg", {
                              class: _normalizeClass(["nav-chevron ui-icon", {expanded:state.documentsOpen || documentPages.includes(state.page)}]),
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#chevron" })], 2))], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                              id: "documents-menu",
                              class: "nav-group-items"
                            }, [
                              _createElementVNode("a", {
                                href: "#/documents",
                                class: _normalizeClass({active:state.page==='documents'}),
                                "aria-current": state.page==='documents'?'page':undefined,
                                onClick: _withModifiers($event => (navigate('documents')), ["prevent"])
                              }, "PendÃªncias documentais", 10, ["aria-current", "onClick"]),
                              _createElementVNode("a", {
                                href: "#/contracts",
                                class: _normalizeClass({active:state.page==='contracts'}),
                                "aria-current": state.page==='contracts'?'page':undefined,
                                onClick: _withModifiers($event => (navigate('contracts')), ["prevent"])
                              }, "Modelos e contratos", 10, ["aria-current", "onClick"]),
                              _createElementVNode("a", {
                                href: "#/pending-signatures",
                                class: _normalizeClass({active:state.page==='pending-signatures'}),
                                "aria-current": state.page==='pending-signatures'?'page':undefined,
                                onClick: _withModifiers($event => (navigate('pending-signatures')), ["prevent"])
                              }, "Assinaturas pendentes", 10, ["aria-current", "onClick"]),
                              (can('documents.validate'))
                                ? (_openBlock(), _createElementBlock("a", {
                                    key: 0,
                                    href: "#/signature-review",
                                    class: _normalizeClass({active:state.page==='signature-review'}),
                                    "aria-current": state.page==='signature-review'?'page':undefined,
                                    onClick: _withModifiers($event => (navigate('signature-review')), ["prevent"])
                                  }, "ConferÃªncia de assinaturas", 10, ["aria-current", "onClick"]))
                                : _createCommentVNode("", true)
                            ], 512), [[_vShow, state.documentsOpen || documentPages.includes(state.page)]])], 2))
                          : _createCommentVNode("", true),
                        (can('protocols.read'))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 6,
                              href: "#/protocols",
                              class: _normalizeClass({active:state.page==='protocols'}),
                              "aria-current": state.page==='protocols'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('protocols')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#protocols" })])), _createTextVNode("Protocolos")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true),
                        (can('reports.read'))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 7,
                              href: "#/reports",
                              class: _normalizeClass({active:state.page==='reports'}),
                              "aria-current": state.page==='reports'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('reports')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#reports" })])), _createTextVNode("RelatÃ³rios")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true)
                      ]))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "sidebar-label" }, "INSTITUIÃ‡ÃƒO"),
                  (!isProfileRole())
                    ? (_openBlock(), _createElementBlock("nav", {
                        key: 2,
                        "aria-label": "GestÃ£o da instituiÃ§Ã£o"
                      }, [(can('schools.manage'))
                        ? (_openBlock(), _createElementBlock("a", {
                            key: 0,
                            href: "#/settings",
                            class: _normalizeClass({active:state.page==='settings'}),
                            "aria-current": state.page==='settings'?'page':undefined,
                            onClick: _withModifiers($event => (navigate('settings')), ["prevent"])
                          }, [(_openBlock(), _createElementBlock("svg", {
                            class: "nav-icon",
                            "aria-hidden": "true"
                          }, [_createElementVNode("use", { href: "/ui-icons.svg#school" })])), _createTextVNode("InstituiÃ§Ã£o")], 10, ["aria-current", "onClick"]))
                        : _createCommentVNode("", true), (can('users.manage'))
                        ? (_openBlock(), _createElementBlock("a", {
                            key: 1,
                            href: "#/users",
                            class: _normalizeClass({active:state.page==='users'}),
                            "aria-current": state.page==='users'?'page':undefined,
                            onClick: _withModifiers($event => (navigate('users')), ["prevent"])
                          }, [(_openBlock(), _createElementBlock("svg", {
                            class: "nav-icon",
                            "aria-hidden": "true"
                          }, [_createElementVNode("use", { href: "/ui-icons.svg#access" })])), _createTextVNode("UsuÃ¡rios e acessos")], 10, ["aria-current", "onClick"]))
                        : _createCommentVNode("", true)]))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "sidebar-label" }, "GESTÃƒO E SERVIÃ‡OS"),
                  (!isProfileRole())
                    ? (_openBlock(), _createElementBlock("nav", {
                        key: 3,
                        "aria-label": "AdministraÃ§Ã£o"
                      }, [
                        (can('admissions.read'))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 0,
                              href: "#/online",
                              class: _normalizeClass({active:state.page==='online'}),
                              "aria-current": state.page==='online'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('online')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createTextVNode("InscriÃ§Ãµes online")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true),
                        (can('banking.read'))
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 1,
                              class: _normalizeClass(["nav-group", {selected:state.page==='banking'}])
                            }, [_createElementVNode("button", {
                              type: "button",
                              class: "nav-group-toggle",
                              "aria-label": "Financeiro",
                              onClick: $event => (state.financeOpen=!state.financeOpen),
                              "aria-expanded": state.financeOpen || state.page==='banking',
                              "aria-controls": "finance-menu"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#billing" })])), _createElementVNode("span", null, "Financeiro"), (_openBlock(), _createElementBlock("svg", {
                              class: _normalizeClass(["nav-chevron ui-icon", {expanded:state.financeOpen || state.page==='banking'}]),
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#chevron" })], 2))], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                              id: "finance-menu",
                              class: "nav-group-items"
                            }, [_createElementVNode("a", {
                              href: "#/banking",
                              class: _normalizeClass({active:state.page==='banking'}),
                              "aria-current": state.page==='banking'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('banking')), ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#billing" })])), _createTextVNode("CobranÃ§as")], 10, ["aria-current", "onClick"])], 512), [[_vShow, state.financeOpen || state.page==='banking']])], 2))
                          : _createCommentVNode("", true),
                        (can('connect.manage') || can('integrations.manage') || state.user?.role==='admin')
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 2,
                              class: _normalizeClass(["nav-group", {selected:integrationPages.includes(state.page)}])
                            }, [_createElementVNode("button", {
                              type: "button",
                              class: "nav-group-toggle",
                              "aria-label": "IntegraÃ§Ãµes",
                              onClick: $event => (state.integrationsOpen=!state.integrationsOpen),
                              "aria-expanded": state.integrationsOpen,
                              "aria-controls": "integrations-menu"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#integrations" })])), _createElementVNode("span", null, "IntegraÃ§Ãµes"), (_openBlock(), _createElementBlock("svg", {
                              class: _normalizeClass(["nav-chevron ui-icon", {expanded:state.integrationsOpen}]),
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#chevron" })], 2))], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                              id: "integrations-menu",
                              class: "nav-group-items"
                            }, [(can('connect.manage'))
                              ? (_openBlock(), _createElementBlock("a", {
                                  key: 0,
                                  href: "#/connect",
                                  class: _normalizeClass({active:state.page==='connect'}),
                                  "aria-current": state.page==='connect'?'page':undefined,
                                  onClick: _withModifiers($event => (navigate('connect')), ["prevent"])
                                }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "nav-icon",
                                  "aria-hidden": "true",
                                  focusable: "false"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#whatsapp" })])), _createTextVNode("WhatsApp")], 10, ["aria-current", "onClick"]))
                              : _createCommentVNode("", true), (state.user?.role==='admin')
                              ? (_openBlock(), _createElementBlock("a", {
                                  key: 1,
                                  href: "#/email",
                                  class: _normalizeClass({active:state.page==='email'}),
                                  "aria-current": state.page==='email'?'page':undefined,
                                  onClick: _withModifiers($event => (navigate('email')), ["prevent"])
                                }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "nav-icon",
                                  "aria-hidden": "true",
                                  focusable: "false"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#integrations" })])), _createTextVNode("ParÃ¢metros de e-mail")], 10, ["aria-current", "onClick"]))
                              : _createCommentVNode("", true), (can('integrations.manage'))
                              ? (_openBlock(), _createElementBlock("a", {
                                  key: 2,
                                  href: "#/integrations",
                                  class: _normalizeClass({active:state.page==='integrations'}),
                                  "aria-current": state.page==='integrations'?'page':undefined,
                                  onClick: _withModifiers($event => (navigate('integrations')), ["prevent"])
                                }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "nav-icon",
                                  "aria-hidden": "true",
                                  focusable: "false"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#bank" })])), _createTextVNode("BancÃ¡ria")], 10, ["aria-current", "onClick"]))
                              : _createCommentVNode("", true)], 512), [[_vShow, state.integrationsOpen]])], 2))
                          : _createCommentVNode("", true),
                        _createElementVNode("div", { class: _normalizeClass(["nav-group", {selected:state.page==='community'}]) }, [_createElementVNode("button", {
                          type: "button",
                          class: "nav-group-toggle",
                          "aria-label": "Publicidade",
                          onClick: $event => (state.publicityOpen=!state.publicityOpen),
                          "aria-expanded": state.publicityOpen || state.page==='community',
                          "aria-controls": "publicity-menu"
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createElementVNode("span", null, "Publicidade"), (_openBlock(), _createElementBlock("svg", {
                          class: _normalizeClass(["nav-chevron ui-icon", {expanded:state.publicityOpen || state.page==='community'}]),
                          "aria-hidden": "true"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#chevron" })], 2))], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                          id: "publicity-menu",
                          class: "nav-group-items"
                        }, [_createElementVNode("a", {
                          href: "#/community",
                          class: _normalizeClass({active:state.page==='community'}),
                          "aria-current": state.page==='community'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('community')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createTextVNode("NotÃ­cias e eventos")], 10, ["aria-current", "onClick"]), (can('schools.manage'))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 0,
                              href: "#/community/site",
                              onClick: _withModifiers(openSiteEditor, ["prevent"])
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createTextVNode("Site da escola")], 8, ["onClick"]))
                          : _createCommentVNode("", true)], 512), [[_vShow, state.publicityOpen || state.page==='community']])], 2),
                        (can('schools.manage'))
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 3,
                              class: _normalizeClass(["nav-group", {selected:configurationPages.includes(state.page)}])
                            }, [_createElementVNode("button", {
                              type: "button",
                              class: "nav-group-toggle",
                              "aria-label": "ConfiguraÃ§Ãµes",
                              onClick: $event => (state.configurationOpen=!state.configurationOpen),
                              "aria-expanded": state.configurationOpen || configurationPages.includes(state.page),
                              "aria-controls": "configuration-menu"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#school" })])), _createElementVNode("span", null, "ConfiguraÃ§Ãµes"), (_openBlock(), _createElementBlock("svg", {
                              class: _normalizeClass(["nav-chevron ui-icon", {expanded:state.configurationOpen || configurationPages.includes(state.page)}]),
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#chevron" })], 2))], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                              id: "configuration-menu",
                              class: "nav-group-items"
                            }, [_createElementVNode("a", {
                              href: "#/certificate",
                              class: _normalizeClass({active:state.page==='certificate'}),
                              "aria-current": state.page==='certificate'?'page':undefined,
                              onClick: _withModifiers($event => (navigate('certificate')), ["prevent"])
                            }, "Certificados A1", 10, ["aria-current", "onClick"])], 512), [[_vShow, state.configurationOpen || configurationPages.includes(state.page)]])], 2))
                          : _createCommentVNode("", true),
                        (state.user?.role==='admin' || adminTool('legacy-import'))
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 4,
                              class: _normalizeClass(["nav-group admin-nav-group", {selected:administrationPages.includes(state.page)}])
                            }, [_createElementVNode("button", {
                              type: "button",
                              class: "nav-group-toggle",
                              "aria-label": "AdministraÃ§Ã£o do sistema",
                              onClick: $event => (state.adminMenuOpen=!state.adminMenuOpen),
                              "aria-expanded": state.adminMenuOpen || administrationPages.includes(state.page),
                              "aria-controls": "administration-menu"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "nav-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#admin" })])), _createElementVNode("span", null, "AdministraÃ§Ã£o do sistema"), (_openBlock(), _createElementBlock("svg", {
                              class: _normalizeClass(["nav-chevron ui-icon", {expanded:state.adminMenuOpen || administrationPages.includes(state.page)}]),
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#chevron" })], 2))], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                              id: "administration-menu",
                              class: "nav-group-items"
                            }, [(adminTool('diagnostics'))
                              ? (_openBlock(), _createElementBlock("a", {
                                  key: 0,
                                  href: "#/diagnostics",
                                  class: _normalizeClass({active:state.page==='diagnostics'}),
                                  "aria-current": state.page==='diagnostics'?'page':undefined,
                                  onClick: _withModifiers($event => (navigate('diagnostics')), ["prevent"])
                                }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "nav-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#diagnostics" })])), _createTextVNode("DiagnÃ³stico")], 10, ["aria-current", "onClick"]))
                              : _createCommentVNode("", true), (adminTool('audit'))
                              ? (_openBlock(), _createElementBlock("a", {
                                  key: 1,
                                  href: "#/audit",
                                  class: _normalizeClass({active:state.page==='audit'}),
                                  "aria-current": state.page==='audit'?'page':undefined,
                                  onClick: _withModifiers($event => (navigate('audit')), ["prevent"])
                                }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "nav-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#audit" })])), _createTextVNode("Auditoria")], 10, ["aria-current", "onClick"]))
                              : _createCommentVNode("", true), (adminTool('legacy-import'))
                              ? (_openBlock(), _createElementBlock("a", {
                                  key: 2,
                                  href: "#/legacy-import",
                                  class: _normalizeClass({active:state.page==='legacy-import'}),
                                  "aria-current": state.page==='legacy-import'?'page':undefined,
                                  onClick: _withModifiers($event => (navigate('legacy-import')), ["prevent"])
                                }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "nav-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#portability" })])), _createTextVNode("Portabilidade de dados")], 10, ["aria-current", "onClick"]))
                              : _createCommentVNode("", true)], 512), [[_vShow, state.adminMenuOpen || administrationPages.includes(state.page)]])], 2))
                          : _createCommentVNode("", true)
                      ]))
                    : _createCommentVNode("", true)
                ])), _createElementVNode("div", { class: "sidebar-footer" }, [_createElementVNode("small", null, [_createTextVNode(_toDisplayString(identity.short_name), 1), (state.user.role==='admin')
              ? (_openBlock(), _createElementBlock("span", { key: 0 }, " Â· " + _toDisplayString(identity.app_version || 'â€”'), 1))
              : _createCommentVNode("", true)])])], 2),
            _createElementVNode("div", { class: _normalizeClass(["main-column", {'webmail-layout':state.page==='webmail'}]) }, [_createElementVNode("header", { class: "topbar" }, [_createElementVNode("button", {
              type: "button",
              class: "icon-button menu-button",
              onClick: $event => (state.menuOpen=!state.menuOpen),
              "aria-label": "Abrir menu",
              "aria-expanded": state.menuOpen,
              "aria-controls": "school-navigation"
            }, [(_openBlock(), _createElementBlock("svg", {
              class: "ui-icon",
              "aria-hidden": "true",
              focusable: "false"
            }, [_createElementVNode("use", { href: "/ui-icons.svg#menu" })]))], 8, ["onClick", "aria-expanded"]), _createElementVNode("div", { class: "school-switch" }, [_createElementVNode("span", { class: "small muted" }, "INSTITUIÃ‡ÃƒO ATIVA"), _createElementVNode("select", {
              "aria-label": "Selecionar escola",
              value: state.schoolId,
              onChange: selectSchool,
              disabled: state.busy || state.schoolLoading || !!state.modal.kind || contractDirty()
            }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.schools, (s) => {
              return (_openBlock(), _createElementBlock("option", {
                key: s.id,
                value: s.id
              }, _toDisplayString(s.name), 9, ["value"]))
            }), 128))], 40, ["value", "onChange", "disabled"])]), _createElementVNode("div", { class: "topbar-actions" }, [
              (state.certificateAlerts.length)
                ? (_openBlock(), _createElementBlock("details", {
                    key: 0,
                    class: "notice-menu"
                  }, [_createElementVNode("summary", { "aria-label": state.certificateAlerts.length+' aviso de certificado' }, [(_openBlock(), _createElementBlock("svg", {
                    class: "ui-icon",
                    "aria-hidden": "true"
                  }, [_createElementVNode("use", { href: "/ui-icons.svg#bell" })])), _createElementVNode("span", { class: "notice-count" }, _toDisplayString(state.certificateAlerts.length), 1)], 8, ["aria-label"]), _createElementVNode("div", { class: "notice-popover" }, [_createElementVNode("p", { class: "eyebrow" }, "AVISOS DA ESCOLA"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.certificateAlerts, (notice) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: notice.id,
                      type: "button",
                      onClick: $event => (navigate('certificate'))
                    }, [_createElementVNode("strong", null, _toDisplayString(notice.title), 1), _createElementVNode("span", null, _toDisplayString(notice.message), 1)], 8, ["onClick"]))
                  }), 128))])]))
                : _createCommentVNode("", true),
              _createElementVNode("span", { class: _normalizeClass(["online-chip", {offline:!state.online}]) }, [_createElementVNode("i", { class: "dot" }), _createTextVNode(_toDisplayString(state.online?'Online':'Sem conexÃ£o'), 1)], 2),
              (state.canInstall)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 1,
                    class: "btn btn-secondary small-button",
                    onClick: install
                  }, "Instalar aplicativo", 8, ["onClick"]))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "user-caption" }, [_createElementVNode("strong", null, _toDisplayString(state.user.name), 1), _createElementVNode("small", null, _toDisplayString(label(state.user.role)), 1)]),
              _createElementVNode("button", {
                class: "avatar user-avatar",
                onClick: editMyProfile,
                title: "Meu perfil",
                "aria-label": "Meu perfil"
              }, [(state.userPhotoUrl)
                ? (_openBlock(), _createElementBlock("img", {
                    key: 0,
                    src: state.userPhotoUrl,
                    alt: "Minha foto"
                  }, null, 8, ["src"]))
                : (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(initials(state.user.name)), 1))], 8, ["onClick"]),
              _createElementVNode("button", {
                type: "button",
                class: "icon-button",
                onClick: logout,
                title: "Sair",
                "aria-label": "Sair"
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true",
                focusable: "false"
              }, [_createElementVNode("use", { href: "/ui-icons.svg#logout" })]))], 8, ["onClick"])
            ])]), (taskState.pages.length)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "work-tabs",
                  "aria-label": "Ãrea de trabalho"
                }, [
                  _createElementVNode("button", {
                    type: "button",
                    class: "work-tabs-step",
                    "aria-label": "Rolar guias para a esquerda",
                    onClick: $event => (scrollTabs($event,-1))
                  }, "â€¹", 8, ["onClick"]),
                  _createElementVNode("div", {
                    class: "work-tabs-list",
                    role: "tablist",
                    "aria-label": "Tarefas abertas",
                    onKeydown: keyTabs
                  }, [(taskState.home!=='dashboard'&&!pageAllowed('dashboard'))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        type: "button",
                        role: "tab",
                        "aria-selected": "false",
                        disabled: "",
                        title: "VisÃ£o geral indisponÃ­vel para este perfil"
                      }, "VisÃ£o geral"))
                    : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(taskState.pages, (key) => {
                    return (_openBlock(), _createElementBlock("div", {
                      key: key,
                      class: _normalizeClass(["work-tab", {current:key===state.page}])
                    }, [_createElementVNode("button", {
                      type: "button",
                      role: "tab",
                      "data-work-tab": "",
                      "aria-selected": key===state.page,
                      tabindex: key===state.page?0:-1,
                      "aria-controls": "main-content",
                      onClick: $event => (navigate(key))
                    }, _toDisplayString(pageLabels[key]), 9, ["aria-selected", "tabindex", "onClick"]), (key!==taskState.home)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          type: "button",
                          class: "work-tab-close",
                          "aria-label": 'Fechar guia '+pageLabels[key],
                          onClick: $event => (closeDesk(key))
                        }, "Ã—", 8, ["aria-label", "onClick"]))
                      : _createCommentVNode("", true)], 2))
                  }), 128))], 40, ["onKeydown"]),
                  _createElementVNode("button", {
                    type: "button",
                    class: "work-tabs-step",
                    "aria-label": "Rolar guias para a direita",
                    onClick: $event => (scrollTabs($event,1))
                  }, "â€º", 8, ["onClick"]),
                  (taskState.paused)
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        type: "button",
                        class: "work-resume",
                        onClick: resumeForm
                      }, "Retomar formulÃ¡rio", 8, ["onClick"]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true), _createElementVNode("main", {
              id: "main-content",
              class: "main-content",
              tabindex: "-1",
              "aria-label": "ConteÃºdo da escola"
            }, [
              (!state.online && state.page!=='webmail')
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "alert warning"
                  }, "Sem conexÃ£o. Reconecte-se para consultar e salvar alteraÃ§Ãµes."))
                : _createCommentVNode("", true),
              (state.updateAvailable && state.page!=='webmail')
                ? (_openBlock(), _createElementBlock("div", {
                    key: 1,
                    class: "alert info"
                  }, [_createTextVNode("Uma nova versÃ£o estÃ¡ disponÃ­vel. "), _createElementVNode("button", {
                    class: "link-button",
                    disabled: !!state.modal.kind,
                    onClick: updateApp
                  }, "Atualizar aplicaÃ§Ã£o", 8, ["disabled", "onClick"])]))
                : _createCommentVNode("", true),
              (state.error && state.page!=='webmail')
                ? (_openBlock(), _createElementBlock("div", {
                    key: 2,
                    class: "alert error",
                    role: "alert"
                  }, [_createElementVNode("span", null, _toDisplayString(state.error), 1), _createElementVNode("button", {
                    onClick: $event => (state.error=''),
                    "aria-label": "Fechar erro"
                  }, "Ã—", 8, ["onClick"])]))
                : _createCommentVNode("", true),
              (state.success && state.page!=='webmail')
                ? (_openBlock(), _createElementBlock("div", {
                    key: 3,
                    class: "alert success",
                    role: "status"
                  }, [_createElementVNode("span", null, _toDisplayString(state.success), 1), _createElementVNode("button", {
                    onClick: $event => (state.success=''),
                    "aria-label": "Fechar aviso"
                  }, "Ã—", 8, ["onClick"])]))
                : _createCommentVNode("", true),
              (state.schoolLoading)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 4,
                    class: "loading-strip",
                    role: "status"
                  }, "Carregando a instituiÃ§Ã£o selecionadaâ€¦"))
                : _createCommentVNode("", true),
              (!state.schoolLoading && state.schoolId)
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 5 }, [
                    (state.page!=='webmail')
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "page-header"
                        }, [_createElementVNode("div", { class: "page-heading" }, [_createElementVNode("p", { class: "breadcrumb" }, _toDisplayString(registryPages.includes(state.page)?'Cadastros':integrationPages.includes(state.page)?'IntegraÃ§Ãµes':administrationPages.includes(state.page)?'AdministraÃ§Ã£o do sistema':state.page==='settings'?'InstituiÃ§Ã£o':configurationPages.includes(state.page)?'ConfiguraÃ§Ãµes':documentPages.includes(state.page)?'Documentos':'Secretaria') + " / " + _toDisplayString(pageLabels[state.page]), 1), _createElementVNode("div", { class: "page-heading-title" }, [_createElementVNode("h1", null, _toDisplayString(state.selectedStudent ? state.selectedStudent.person.name : pageLabels[state.page]), 1)]), (state.selectedStudent)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 0,
                              class: "page-subtitle"
                            }, "Ficha do aluno Â· " + _toDisplayString(state.selectedStudent.number), 1))
                          : _createCommentVNode("", true)]), _createElementVNode("div", { class: "actions" }, [
                          (state.page!=='help')
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-secondary page-help",
                                onClick: $event => (navigate('help'))
                              }, "Guia de uso", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (registryPages.includes(state.page) && state.page!=='people' && !state.selectedStudent && can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 1,
                                class: "btn btn-secondary",
                                onClick: reusePerson
                              }, "Vincular pessoa existente", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (isBusiness() && can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 2,
                                class: "btn btn-primary",
                                onClick: $event => (newBusiness())
                              }, "+ Cadastrar " + _toDisplayString(businessTypes[state.page].singular), 9, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.selectedStudent)
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 3,
                                class: "btn btn-secondary",
                                onClick: studentList
                              }, "â† Todos os alunos", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='people' && can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 4,
                                class: "btn btn-primary",
                                onClick: newPerson
                              }, "+ Nova pessoa", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='students' && !state.selectedStudent && can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 5,
                                class: "btn btn-primary",
                                onClick: $event => (newStudent())
                              }, "+ Novo aluno", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='teachers' && can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 6,
                                class: "btn btn-primary",
                                onClick: $event => (newTeacher())
                              }, "+ Novo professor", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='employees' && can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 7,
                                class: "btn btn-primary",
                                onClick: $event => (newEmployee())
                              }, "+ Novo funcionÃ¡rio", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='guardians' && can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 8,
                                class: "btn btn-primary",
                                onClick: newGuardian
                              }, "+ Novo responsÃ¡vel", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='enrollments' && can('enrollments.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 9,
                                class: "btn btn-primary",
                                onClick: newEnrollment
                              }, "+ Nova matrÃ­cula", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='academic' && can('academic.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 10,
                                class: "btn btn-primary",
                                onClick: $event => (newCatalog())
                              }, "+ Cadastrar", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.page==='protocols' && can('protocols.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 11,
                                class: "btn btn-primary",
                                onClick: $event => (newProtocol())
                              }, "+ Abrir protocolo", 8, ["onClick"]))
                            : _createCommentVNode("", true)
                        ])]))
                      : _createCommentVNode("", true),
                    (state.loading && !['email','webmail'].includes(state.page))
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "loading-strip",
                          role: "status"
                        }, "Carregando registrosâ€¦"))
                      : _createCommentVNode("", true),
                    (state.page==='legacy-import' && adminTool('legacy-import'))
                      ? (_openBlock(), _createBlock(_component_legacy_import_panel, {
                          key: state.schoolId,
                          "school-id": state.schoolId,
                          "school-name": school()?.name || '',
                          units: state.catalogs.units || [],
                          onChanged: importedDataChanged
                        }, null, 8, ["school-id", "school-name", "units", "onChanged"]))
                      : _createCommentVNode("", true),
                    (state.page==='diagnostics' && adminTool('diagnostics'))
                      ? (_openBlock(), _createBlock(_component_diagnostics_panel, { key: state.schoolId }))
                      : _createCommentVNode("", true),
                    (state.page==='webmail')
                      ? (_openBlock(), _createElementBlock("section", {
                          class: "webmail-view",
                          key: state.schoolId+':webmail',
                          style: _normalizeStyle({'--webmail-primary':identity.primary_color,'--webmail-secondary':identity.secondary_color}),
                          "aria-label": "Caixa de e-mail"
                        }, [(state.sogoStarting && !state.sogoFallback && !state.sogoError)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "webmail-loading",
                              role: "status"
                            }, [_createElementVNode("span", {
                              class: "webmail-spinner",
                              "aria-hidden": "true"
                            }), _createElementVNode("span", null, "Abrindo sua caixa de e-mailâ€¦")]))
                          : _createCommentVNode("", true), (state.sogoError && !state.sogoFallback)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 1,
                              class: "webmail-error",
                              role: "alert"
                            }, [_createElementVNode("div", null, [
                              _createElementVNode("strong", null, "NÃ£o foi possÃ­vel abrir o webmail"),
                              _createElementVNode("p", null, _toDisplayString(state.sogoError), 1),
                              _createElementVNode("button", {
                                type: "button",
                                class: "btn btn-secondary",
                                onClick: openSogoWebmail,
                                disabled: state.sogoStarting
                              }, _toDisplayString(state.sogoStarting?'Conectandoâ€¦':'Tentar novamente'), 9, ["onClick", "disabled"]),
                              _createElementVNode("button", {
                                type: "button",
                                class: "btn btn-secondary",
                                onClick: $event => (state.sogoFallback=true),
                                disabled: state.sogoStarting
                              }, "Reparar conexÃ£o da caixa existente", 8, ["onClick", "disabled"])
                            ])]))
                          : _createCommentVNode("", true), (!state.sogoFallback)
                          ? _withDirectives((_openBlock(), _createElementBlock("iframe", {
                              key: 2,
                              id: "pige-sogo-frame",
                              name: "pige-sogo-frame",
                              class: "webmail-frame",
                              title: "Caixa de e-mail",
                              referrerpolicy: "same-origin",
                              allow: "clipboard-read; clipboard-write; downloads",
                              onLoad: webmailFrameLoaded
                            }, null, 40, ["onLoad"])), [[_vShow, !state.sogoError]])
                          : (_openBlock(), _createBlock(_component_institutional_email, {
                              class: "webmail-fallback",
                              key: state.schoolId+':email-fallback',
                              "school-id": state.schoolId,
                              admin: state.user.role==='admin'
                            }, null, 8, ["school-id", "admin"]))], 4))
                      : _createCommentVNode("", true),
                    (state.page==='audit' && adminTool('audit'))
                      ? (_openBlock(), _createBlock(_component_audit_panel, {
                          key: state.schoolId+':audit',
                          "school-id": state.schoolId
                        }, null, 8, ["school-id"]))
                      : _createCommentVNode("", true),
                    (state.page==='email' && (state.user?.role==='admin' || state.emailAvailable))
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 6,
                          class: "panel x-card webmail-preferences",
                          "aria-labelledby": "webmail-preferences-title"
                        }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "PREFERÃŠNCIAS Â· E-MAIL"), _createElementVNode("h2", { id: "webmail-preferences-title" }, "Seu acesso ao webmail"), _createElementVNode("p", null, "Escolha a caixa que serÃ¡ aberta para sua conta. A opÃ§Ã£o padrÃ£o acompanha a preferÃªncia da instituiÃ§Ã£o.")])]), _createElementVNode("label", { class: "webmail-preference-choice" }, [_createTextVNode("Caixa de e-mail "), _createElementVNode("select", {
                          value: state.webmailOverride,
                          onChange: $event => (saveWebmailPreference($event.target.value))
                        }, [_createElementVNode("option", { value: "inherit" }, "Usar o padrÃ£o da instituiÃ§Ã£o (" + _toDisplayString(state.webmailDefault==='sogo'?'SOGo integrado':'caixa alternativa') + ")", 1), _createElementVNode("option", { value: "sogo" }, "SOGo integrado"), _createElementVNode("option", { value: "alternative" }, "Caixa alternativa PIGE360")], 40, ["value", "onChange"])])]))
                      : _createCommentVNode("", true),
                    (state.page==='email' && can('integrations.manage'))
                      ? (_openBlock(), _createBlock(_component_notification_email, {
                          key: state.schoolId+':notification-email',
                          "school-id": state.schoolId
                        }, null, 8, ["school-id"]))
                      : _createCommentVNode("", true),
                    (state.page==='email' && state.user?.role==='admin')
                      ? (_openBlock(), _createBlock(_component_mailcow_panel, {
                          key: state.schoolId,
                          "school-id": state.schoolId
                        }, null, 8, ["school-id"]))
                      : _createCommentVNode("", true),
                    (state.page==='email' && state.user?.role==='admin')
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 9,
                          class: "panel x-card",
                          "aria-labelledby": "smtp-title"
                        }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "INTEGRAÃ‡Ã•ES Â· E-MAIL"), _createElementVNode("h2", { id: "smtp-title" }, "Envio de avisos"), _createElementVNode("p", null, "Acompanhe a configuraÃ§Ã£o de envio de mensagens da escola.")])]), (state.emailStatus==='configured')
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 0,
                              class: "alert success",
                              role: "status"
                            }, "Envio de e-mail configurado."))
                          : (state.emailStatus==='missing')
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 1,
                                class: "alert warning",
                                role: "status"
                              }, "O envio de e-mail ainda nÃ£o estÃ¡ configurado nesta instalaÃ§Ã£o."))
                            : (state.emailStatus==='unavailable')
                              ? (_openBlock(), _createElementBlock("p", {
                                  key: 2,
                                  class: "alert warning",
                                  role: "status"
                                }, "NÃ£o foi possÃ­vel consultar a configuraÃ§Ã£o de envio. Tente novamente mais tarde."))
                              : (_openBlock(), _createElementBlock("p", {
                                  key: 3,
                                  class: "muted",
                                  role: "status"
                                }, "Consultando configuraÃ§Ã£o de envioâ€¦")), _createElementVNode("details", null, [_createElementVNode("summary", null, "ConfiguraÃ§Ã£o tÃ©cnica"), _createElementVNode("p", { class: "muted" }, "Configure SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM e SMTP_SECURITY no .env da instalaÃ§Ã£o. Reinicie os serviÃ§os para aplicar as alteraÃ§Ãµes.")])]))
                      : _createCommentVNode("", true),
                    (state.page==='email' && state.user?.role==='admin')
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 10,
                          class: "panel x-card webmail-default",
                          "aria-labelledby": "webmail-default-title"
                        }, [_createElementVNode("h2", { id: "webmail-default-title" }, "Webmail padrÃ£o da instituiÃ§Ã£o"), _createElementVNode("p", null, "Aplica-se a todos os usuÃ¡rios que nÃ£o escolheram uma opÃ§Ã£o pessoal."), _createElementVNode("div", { class: "actions" }, [_createElementVNode("label", null, [_createTextVNode("Cliente de e-mail "), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.webmailDefault) = $event) }, [_createElementVNode("option", { value: "sogo" }, "SOGo integrado"), _createElementVNode("option", { value: "alternative" }, "Caixa alternativa PIGE360")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.webmailDefault]])]), _createElementVNode("button", {
                          type: "button",
                          class: "btn btn-primary",
                          onClick: saveWebmailDefault
                        }, "Salvar padrÃ£o", 8, ["onClick"])])]))
                      : _createCommentVNode("", true),
                    (['online','banking','integrations','connect'].includes(state.page))
                      ? (_openBlock(), _createBlock(_component_expansion_panel, {
                          onViewStudent: viewStudent,
                          key: state.schoolId+':'+state.page,
                          "school-id": state.schoolId,
                          page: state.page,
                          permissions: state.user.permissions,
                          role: state.user.role
                        }, null, 8, ["onViewStudent", "school-id", "page", "permissions", "role"]))
                      : _createCommentVNode("", true),
                    (state.page==='diary')
                      ? (_openBlock(), _createBlock(_component_diary_panel, {
                          key: state.schoolId+':diary',
                          "school-id": state.schoolId,
                          permissions: state.user.permissions
                        }, null, 8, ["school-id", "permissions"]))
                      : _createCommentVNode("", true),
                    (state.page==='contracts' && can('documents.read'))
                      ? (_openBlock(), _createBlock(_component_contracts_panel, {
                          key: state.schoolId+':contracts:'+state.contractEnrollmentId+':'+state.contractReviewIssuedId,
                          "school-id": state.schoolId,
                          permissions: state.user.permissions,
                          role: state.user.role,
                          "enrollment-id": state.contractEnrollmentId,
                          "issued-id": state.contractReviewIssuedId
                        }, null, 8, ["school-id", "permissions", "role", "enrollment-id", "issued-id"]))
                      : _createCommentVNode("", true),
                    (state.page==='help')
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 14,
                          class: "school-guide",
                          "aria-labelledby": "guide-title"
                        }, [_createElementVNode("header", { class: "guide-intro" }, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(isProfileRole() ? 'SEU ESPAÃ‡O ESCOLAR' : 'POR ONDE COMEÃ‡AR'), 1), _createElementVNode("h2", { id: "guide-title" }, _toDisplayString(isProfileRole() ? 'Use seu espaÃ§o escolar' : 'Siga a ordem da rotina escolar'), 1), (!isProfileRole())
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Encontre a tarefa que precisa realizar. Abra as orientaÃ§Ãµes de cada etapa quando precisar de ajuda."))
                          : (state.user.role==='teacher')
                            ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Suas turmas, aulas e registros pedagÃ³gicos em um sÃ³ lugar."))
                            : (_openBlock(), _createElementBlock("p", { key: 2 }, "Acompanhe as informaÃ§Ãµes escolares e os comunicados da sua escola."))]), (!isProfileRole())
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "guide-grid"
                            }, [
                              (can('academic.read') || can('read'))
                                ? (_openBlock(), _createElementBlock("article", {
                                    key: 0,
                                    class: "guide-card"
                                  }, [
                                    _createElementVNode("div", { class: "guide-card-heading" }, [_createElementVNode("span", {
                                      class: "guide-step",
                                      "aria-hidden": "true"
                                    }, "01"), _createElementVNode("div", null, [_createElementVNode("p", { class: "guide-category" }, "PreparaÃ§Ã£o"), _createElementVNode("h3", null, "Organize a estrutura acadÃªmica")])]),
                                    _createElementVNode("p", null, "Defina o ano letivo, as sÃ©ries, os turnos e as turmas para receber as matrÃ­culas."),
                                    _createElementVNode("button", {
                                      class: "btn btn-secondary guide-action",
                                      onClick: $event => (navigate('academic'))
                                    }, [_createTextVNode("Abrir Estrutura acadÃªmica "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"]),
                                    _createElementVNode("details", { class: "guide-details" }, [_createElementVNode("summary", null, "O que configurar primeiro?"), _createElementVNode("div", null, [_createElementVNode("p", null, "Cadastre a unidade, o ano letivo, as sÃ©ries, os turnos, as turmas e os tipos de documento."), _createElementVNode("p", null, "Para usar o DiÃ¡rio, atribua cada professor Ã  sua turma e ao componente curricular.")])])
                                  ]))
                                : _createCommentVNode("", true),
                              (can('people.read') || can('read'))
                                ? (_openBlock(), _createElementBlock("article", {
                                    key: 1,
                                    class: "guide-card"
                                  }, [
                                    _createElementVNode("div", { class: "guide-card-heading" }, [_createElementVNode("span", {
                                      class: "guide-step",
                                      "aria-hidden": "true"
                                    }, "02"), _createElementVNode("div", null, [_createElementVNode("p", { class: "guide-category" }, "Cadastros"), _createElementVNode("h3", null, "Cadastre cada pessoa uma vez")])]),
                                    _createElementVNode("p", null, "Pesquise o aluno ou responsÃ¡vel antes de cadastrar e mantenha os vÃ­nculos da famÃ­lia atualizados."),
                                    _createElementVNode("button", {
                                      class: "btn btn-secondary guide-action",
                                      onClick: $event => (navigate('students'))
                                    }, [_createTextVNode("Abrir Alunos "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"]),
                                    _createElementVNode("details", { class: "guide-details" }, [_createElementVNode("summary", null, "Como evitar cadastros duplicados?"), _createElementVNode("div", null, [_createElementVNode("p", null, [_createTextVNode("Pesquise por nome ou CPF. Se a pessoa jÃ¡ existir, use "), _createElementVNode("strong", null, "Vincular pessoa existente"), _createTextVNode(" nas telas de Alunos, Professores, FuncionÃ¡rios ou ResponsÃ¡veis.")]), _createElementVNode("p", null, "Confira as pessoas com nomes iguais antes de selecionar. Se nÃ£o encontrar o cadastro, crie uma nova pessoa. Os dados pessoais ficam no Cadastro Ãºnico.")])])
                                  ]))
                                : _createCommentVNode("", true),
                              (can('enrollments.read') || can('read'))
                                ? (_openBlock(), _createElementBlock("article", {
                                    key: 2,
                                    class: "guide-card"
                                  }, [
                                    _createElementVNode("div", { class: "guide-card-heading" }, [_createElementVNode("span", {
                                      class: "guide-step",
                                      "aria-hidden": "true"
                                    }, "03"), _createElementVNode("div", null, [_createElementVNode("p", { class: "guide-category" }, "MatrÃ­culas"), _createElementVNode("h3", null, "Vincule o aluno Ã  turma")])]),
                                    _createElementVNode("p", null, "Escolha o aluno, a turma e a data de entrada. Revise os dados antes de ativar a matrÃ­cula."),
                                    _createElementVNode("button", {
                                      class: "btn btn-secondary guide-action",
                                      onClick: $event => (navigate('enrollments'))
                                    }, [_createTextVNode("Abrir MatrÃ­culas "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"]),
                                    _createElementVNode("details", { class: "guide-details" }, [_createElementVNode("summary", null, "Quando a matrÃ­cula fica ativa?"), _createElementVNode("div", null, [_createElementVNode("p", null, "Escolha Salvar rascunho para continuar depois ou Efetivar matrÃ­cula para confirmar a vaga na mesma tela."), _createElementVNode("p", null, "A escola precisa ter vaga na turma, a documentaÃ§Ã£o exigida e o vÃ­nculo com o responsÃ¡vel legal, quando necessÃ¡rio.")])])
                                  ]))
                                : _createCommentVNode("", true),
                              (can('diary.read'))
                                ? (_openBlock(), _createElementBlock("article", {
                                    key: 3,
                                    class: "guide-card"
                                  }, [
                                    _createElementVNode("div", { class: "guide-card-heading" }, [_createElementVNode("span", {
                                      class: "guide-step",
                                      "aria-hidden": "true"
                                    }, "04"), _createElementVNode("div", null, [_createElementVNode("p", { class: "guide-category" }, "Rotina pedagÃ³gica"), _createElementVNode("h3", null, "Registre aulas, presenÃ§a e notas")])]),
                                    _createElementVNode("p", null, "Use o DiÃ¡rio para acompanhar cada turma e manter os registros do perÃ­odo em dia."),
                                    _createElementVNode("button", {
                                      class: "btn btn-secondary guide-action",
                                      onClick: $event => (navigate('diary'))
                                    }, [_createTextVNode("Abrir DiÃ¡rio Escolar "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"]),
                                    _createElementVNode("details", { class: "guide-details" }, [_createElementVNode("summary", null, "Como organizar os registros?"), _createElementVNode("div", null, [_createElementVNode("p", null, "Configure perÃ­odos e componentes. Na turma, registre o planejamento, as aulas, a chamada, as avaliaÃ§Ãµes e os resultados conforme a regra da escola."), _createElementVNode("p", null, "Pareceres, ocorrÃªncias, comunicaÃ§Ãµes familiares e relatÃ³rios tambÃ©m ficam no DiÃ¡rio. Confira os dados antes do fechamento; uma correÃ§Ã£o posterior exige reabertura justificada.")])])
                                  ]))
                                : _createCommentVNode("", true),
                              (can('documents.read') || can('protocols.read') || can('read'))
                                ? (_openBlock(), _createElementBlock("article", {
                                    key: 4,
                                    class: "guide-card"
                                  }, [
                                    _createElementVNode("div", { class: "guide-card-heading" }, [_createElementVNode("span", {
                                      class: "guide-step",
                                      "aria-hidden": "true"
                                    }, "05"), _createElementVNode("div", null, [_createElementVNode("p", { class: "guide-category" }, "Secretaria"), _createElementVNode("h3", null, "Acompanhe documentos e pedidos")])]),
                                    _createElementVNode("p", null, "Confira as pendÃªncias dos alunos e acompanhe as solicitaÃ§Ãµes recebidas pela escola."),
                                    _createElementVNode("div", { class: "guide-actions" }, [(can('documents.read') || can('read'))
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 0,
                                          class: "btn btn-secondary",
                                          onClick: $event => (navigate('documents'))
                                        }, "DocumentaÃ§Ã£o", 8, ["onClick"]))
                                      : _createCommentVNode("", true), (can('protocols.read') || can('read'))
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 1,
                                          class: "btn btn-secondary",
                                          onClick: $event => (navigate('protocols'))
                                        }, "Protocolos", 8, ["onClick"]))
                                      : _createCommentVNode("", true)]),
                                    _createElementVNode("details", { class: "guide-details" }, [_createElementVNode("summary", null, "Onde registrar cada atendimento?"), _createElementVNode("div", null, [_createElementVNode("p", null, "Receba e analise os documentos na ficha do aluno ou em DocumentaÃ§Ã£o. Em Protocolos, registre as solicitaÃ§Ãµes e acompanhe o prazo e a situaÃ§Ã£o de cada pedido.")])])
                                  ]))
                                : _createCommentVNode("", true),
                              (can('reports.read'))
                                ? (_openBlock(), _createElementBlock("article", {
                                    key: 5,
                                    class: "guide-card"
                                  }, [
                                    _createElementVNode("div", { class: "guide-card-heading" }, [_createElementVNode("span", {
                                      class: "guide-step",
                                      "aria-hidden": "true"
                                    }, "06"), _createElementVNode("div", null, [_createElementVNode("p", { class: "guide-category" }, "Acompanhamento"), _createElementVNode("h3", null, "Consulte e emita relatÃ³rios")])]),
                                    _createElementVNode("p", null, "Selecione o relatÃ³rio e o perÃ­odo para consultar os dados e gerar a versÃ£o para impressÃ£o."),
                                    _createElementVNode("button", {
                                      class: "btn btn-secondary guide-action",
                                      onClick: $event => (navigate('reports'))
                                    }, [_createTextVNode("Abrir RelatÃ³rios "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"]),
                                    _createElementVNode("details", { class: "guide-details" }, [_createElementVNode("summary", null, "Como conferir antes de imprimir?"), _createElementVNode("div", null, [_createElementVNode("p", null, "Escolha os filtros disponÃ­veis para o relatÃ³rio e confira o perÃ­odo e os resultados. Em seguida, use a opÃ§Ã£o de exportaÃ§Ã£o ou impressÃ£o desejada.")])])
                                  ]))
                                : _createCommentVNode("", true)
                            ]))
                          : (_openBlock(), _createElementBlock("div", {
                              key: 1,
                              class: "guide-grid guide-profile-grid"
                            }, [_createElementVNode("article", { class: "guide-card" }, [_createElementVNode("div", { class: "guide-card-heading" }, [(_openBlock(), _createElementBlock("svg", {
                              class: "guide-feature-icon ui-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])), _createElementVNode("h3", null, _toDisplayString(state.user.role==='teacher' ? 'Sua rotina de professor' : 'Sua vida escolar'), 1)]), (state.user.role==='teacher')
                              ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Professores acessam somente as turmas atribuÃ­das ao prÃ³prio usuÃ¡rio. Abra o DiÃ¡rio para registrar aulas e frequÃªncia."))
                              : (_openBlock(), _createElementBlock("p", { key: 1 }, "Consulte as informaÃ§Ãµes disponÃ­veis para o aluno e acompanhe os registros escolares no seu painel.")), (can('diary.read'))
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 2,
                                  class: "btn btn-secondary guide-action",
                                  onClick: $event => (navigate('diary'))
                                }, [_createTextVNode("Abrir DiÃ¡rio Escolar "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"]))
                              : (_openBlock(), _createElementBlock("button", {
                                  key: 3,
                                  class: "btn btn-secondary guide-action",
                                  onClick: $event => (navigate('dashboard'))
                                }, [_createTextVNode("Abrir meu painel "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"]))]), _createElementVNode("article", { class: "guide-card" }, [_createElementVNode("div", { class: "guide-card-heading" }, [(_openBlock(), _createElementBlock("svg", {
                              class: "guide-feature-icon ui-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createElementVNode("h3", null, "NotÃ­cias e eventos da escola")]), _createElementVNode("p", null, "Acompanhe os comunicados e as prÃ³ximas atividades publicados pela escola."), _createElementVNode("button", {
                              class: "btn btn-secondary guide-action",
                              onClick: $event => (navigate('community'))
                            }, [_createTextVNode("Ver notÃ­cias e eventos "), _createElementVNode("span", { "aria-hidden": "true" }, "â†’")], 8, ["onClick"])])])), _createElementVNode("details", { class: "guide-support" }, [_createElementVNode("summary", null, "Precisa de ajuda?"), _createElementVNode("div", null, [(isProfileRole())
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Para corrigir seus dados, solicitar acesso ou conferir um vÃ­nculo com aluno ou turma, procure a Secretaria da escola."))
                          : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("p", null, "Se o formulÃ¡rio indicar um campo obrigatÃ³rio ou invÃ¡lido, corrija o campo destacado e tente salvar novamente."), _createElementVNode("p", null, "Se outra pessoa tiver alterado o cadastro, atualize a tela e confira os dados antes de repetir a operaÃ§Ã£o.")], 64)), _createElementVNode("p", null, "Se a dificuldade continuar, informe Ã  equipe de suporte a mensagem e o cÃ³digo de referÃªncia exibidos na tela, quando houver.")])])]))
                      : _createCommentVNode("", true),
                    (state.page==='dashboard' && !isProfileRole())
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 15,
                          class: "dashboard"
                        }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [
                          _createElementVNode("p", { class: "eyebrow" }, "ROTINA ESCOLAR EM DIA"),
                          _createElementVNode("h2", null, "Rotina da escola"),
                          _createElementVNode("p", null, "Cadastros, matrÃ­culas e pendÃªncias em um sÃ³ lugar."),
                          _createElementVNode("div", { class: "actions" }, [(can('people.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-primary",
                                onClick: $event => (newStudent())
                              }, "+ Cadastrar aluno", 8, ["onClick"]))
                            : _createCommentVNode("", true), (can('enrollments.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 1,
                                class: "btn btn-secondary",
                                onClick: newEnrollment
                              }, "Nova matrÃ­cula â†’", 8, ["onClick"]))
                            : _createCommentVNode("", true)])
                        ])]), _createElementVNode("div", { class: "stats-grid" }, [
                          _createElementVNode("div", { class: "stat-card" }, [
                            _createElementVNode("span", null, "Alunos cadastrados"),
                            _createElementVNode("strong", null, _toDisplayString(state.dashboard.students ?? 'â€”'), 1),
                            _createElementVNode("small", null, "Cadastros ativos na escola"),
                            _createElementVNode("i", null, [(_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#students" })]))])
                          ]),
                          _createElementVNode("div", { class: "stat-card" }, [
                            _createElementVNode("span", null, "MatrÃ­culas ativas"),
                            _createElementVNode("strong", null, _toDisplayString(state.dashboard.enrollments ?? 'â€”'), 1),
                            _createElementVNode("small", null, "VÃ­nculos confirmados"),
                            _createElementVNode("i", null, [(_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#enrollment" })]))])
                          ]),
                          _createElementVNode("div", { class: "stat-card" }, [
                            _createElementVNode("span", null, "Aguardando ativaÃ§Ã£o"),
                            _createElementVNode("strong", null, _toDisplayString(state.dashboard.drafts ?? 'â€”'), 1),
                            _createElementVNode("small", null, "MatrÃ­culas em rascunho"),
                            _createElementVNode("i", { class: "amber" }, [(_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#clock" })]))])
                          ]),
                          _createElementVNode("div", { class: "stat-card" }, [
                            _createElementVNode("span", null, "Vagas disponÃ­veis"),
                            _createElementVNode("strong", null, _toDisplayString(state.dashboard.available ?? 'â€”'), 1),
                            _createElementVNode("small", null, "Nos perÃ­odos letivos ativos"),
                            _createElementVNode("i", null, [(_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true",
                              focusable: "false"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })]))])
                          ])
                        ]), _createElementVNode("div", { class: "dashboard-grid" }, [_createElementVNode("section", { class: "panel" }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "MatrÃ­culas recentes"), _createElementVNode("button", {
                          class: "link-button",
                          onClick: $event => (navigate('enrollments'))
                        }, "Ver todas â†’", 8, ["onClick"])]), _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Aluno"), _createElementVNode("th", null, "Turma"), _createElementVNode("th", null, "SituaÃ§Ã£o")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.dashboard.recent_enrollments, (e) => {
                          return (_openBlock(), _createElementBlock("tr", {
                            key: e.id,
                            onClick: $event => (viewEnrollment(e.id)),
                            class: "clickable"
                          }, [_createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(e.student_name), 1), _createElementVNode("small", null, _toDisplayString(e.number), 1)]), _createElementVNode("td", null, [_createTextVNode(_toDisplayString(e.class_name), 1), _createElementVNode("small", null, _toDisplayString(e.year_name), 1)]), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", e.status]) }, _toDisplayString(enrollmentLabel(e.status)), 3)])], 8, ["onClick"]))
                        }), 128))])]), (!state.dashboard.recent_enrollments?.length)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "empty-state"
                            }, [_createElementVNode("span", null, "â–¤"), _createElementVNode("h3", null, "Sua primeira matrÃ­cula comeÃ§a aqui"), _createElementVNode("p", null, "Cadastre o aluno e configure uma turma para iniciar.")]))
                          : _createCommentVNode("", true)])]), _createElementVNode("section", { class: "panel attention-panel" }, [
                          _createElementVNode("p", { class: "eyebrow" }, "ACOMPANHAMENTO"),
                          _createElementVNode("h2", null, "O que precisa de atenÃ§Ã£o?"),
                          _createElementVNode("button", { onClick: $event => (navigate('documents')) }, [_createElementVNode("span", null, [_createTextVNode("Documentos recebidos"), _createElementVNode("small", null, "Aguardando anÃ¡lise da Secretaria")]), _createElementVNode("b", null, _toDisplayString(state.dashboard.received_documents ?? 0), 1)], 8, ["onClick"]),
                          _createElementVNode("button", { onClick: $event => (navigate('protocols')) }, [_createElementVNode("span", null, [_createTextVNode("Protocolos abertos"), _createElementVNode("small", null, _toDisplayString(state.dashboard.overdue_protocols ?? 0) + " com prazo vencido", 1)]), _createElementVNode("b", null, _toDisplayString(state.dashboard.open_protocols ?? 0), 1)], 8, ["onClick"]),
                          _createElementVNode("button", { onClick: $event => (navigate('academic')) }, [_createElementVNode("span", null, [_createTextVNode("Turmas disponÃ­veis"), _createElementVNode("small", null, "Estrutura dos perÃ­odos ativos")]), _createElementVNode("b", null, _toDisplayString(state.dashboard.classes ?? 0), 1)], 8, ["onClick"])
                        ])])]))
                      : _createCommentVNode("", true),
                    (state.page==='dashboard' && isProfileRole())
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 16,
                          class: "dashboard"
                        }, [(_openBlock(), _createBlock(_component_school_community, {
                          key: state.schoolId+'-feed',
                          "school-id": state.schoolId,
                          permissions: [],
                          request: request,
                          compact: true
                        }, null, 8, ["school-id", "permissions", "request", "compact"])), (['student','guardian'].includes(state.user.role))
                          ? (_openBlock(), _createBlock(_component_learning_panel, {
                              key: state.schoolId,
                              "school-id": state.schoolId,
                              request: request,
                              download: download,
                              "root-path": "/profile"
                            }, null, 8, ["school-id", "request", "download"]))
                          : _createCommentVNode("", true), (state.user.role==='teacher')
                          ? (_openBlock(), _createElementBlock("div", { key: 1 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [
                              _createElementVNode("p", { class: "eyebrow" }, "ESPAÃ‡O DO PROFESSOR"),
                              _createElementVNode("h2", null, "Suas turmas e alunos."),
                              _createElementVNode("p", null, "Consulte as turmas atribuÃ­das a vocÃª e acompanhe a lista real de alunos de cada classe."),
                              _createElementVNode("div", { class: "actions" }, [(can('diary.read'))
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    class: "btn btn-primary",
                                    onClick: $event => (navigate('diary'))
                                  }, "Abrir DiÃ¡rio Escolar â†’", 8, ["onClick"]))
                                : _createCommentVNode("", true)])
                            ]), _createElementVNode("div", {
                              class: "welcome-art",
                              "aria-hidden": "true"
                            }, [_createElementVNode("span", null, "PROFESSOR"), _createElementVNode("strong", null, [
                              _createTextVNode("Turmas"),
                              _createElementVNode("br"),
                              _createTextVNode("Alunos"),
                              _createElementVNode("br"),
                              _createTextVNode("VÃ­nculos")
                            ]), _createElementVNode("i", null, "âœ“")])]), (!state.profileContext.assignments?.length)
                              ? (_openBlock(), _createElementBlock("div", {
                                  key: 0,
                                  class: "alert info"
                                }, "Seu usuÃ¡rio ainda nÃ£o possui turmas atribuÃ­das. Solicite Ã  DireÃ§Ã£o ou Ã  CoordenaÃ§Ã£o o vÃ­nculo com uma turma."))
                              : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.profileContext.assignments || [], (assignment) => {
                              return (_openBlock(), _createElementBlock("section", {
                                key: assignment.id,
                                class: "panel spaced"
                              }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(assignment.school_name), 1), _createElementVNode("h2", null, _toDisplayString(assignment.class_name), 1), _createElementVNode("p", { class: "muted" }, [_createTextVNode(_toDisplayString(assignment.grade_name) + " Â· " + _toDisplayString(assignment.shift_name) + " Â· " + _toDisplayString(assignment.year_name), 1), (assignment.subject_name)
                                ? (_openBlock(), _createElementBlock("span", { key: 0 }, " Â· " + _toDisplayString(assignment.subject_name), 1))
                                : _createCommentVNode("", true)])]), _createElementVNode("span", { class: "badge active" }, _toDisplayString(assignment.students.length) + " aluno(s)", 1)]), _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "NÃºmero"), _createElementVNode("th", null, "Aluno"), _createElementVNode("th", null, "SituaÃ§Ã£o")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(assignment.students, (student) => {
                                return (_openBlock(), _createElementBlock("tr", { key: student.id }, [_createElementVNode("td", { class: "mono" }, _toDisplayString(student.number), 1), _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(student.name), 1)]), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", student.status]) }, _toDisplayString(label(student.status)), 3)])]))
                              }), 128))])])])]))
                            }), 128))]))
                          : (state.user.role==='student')
                            ? (_openBlock(), _createElementBlock("div", { key: 2 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ESPAÃ‡O DO ALUNO"), _createElementVNode("h2", null, "Acompanhe sua vida escolar."), _createElementVNode("p", null, "Este espaÃ§o mostra somente os dados escolares vinculados ao seu prÃ³prio cadastro.")]), _createElementVNode("div", {
                                class: "welcome-art",
                                "aria-hidden": "true"
                              }, [_createElementVNode("span", null, "ALUNO"), _createElementVNode("strong", null, [
                                _createTextVNode("MatrÃ­culas"),
                                _createElementVNode("br"),
                                _createTextVNode("Documentos"),
                                _createElementVNode("br"),
                                _createTextVNode("HistÃ³rico")
                              ]), _createElementVNode("i", null, "âœ“")])]), (!state.profileContext.students?.length)
                                ? (_openBlock(), _createElementBlock("div", {
                                    key: 0,
                                    class: "alert warning"
                                  }, "Seu usuÃ¡rio ainda nÃ£o possui um cadastro de aluno vinculado. Solicite a correÃ§Ã£o ao administrador."))
                                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.profileContext.students || [], (student) => {
                                return (_openBlock(), _createElementBlock("section", {
                                  key: student.id,
                                  class: "panel spaced"
                                }, [
                                  _createElementVNode("div", { class: "panel-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(student.school_name), 1), _createElementVNode("h2", null, _toDisplayString(student.name), 1), _createElementVNode("p", { class: "muted" }, _toDisplayString(student.number) + " Â· " + _toDisplayString(label(student.status)), 1)]), _createElementVNode("span", { class: "badge active" }, _toDisplayString(student.enrollments.length) + " matrÃ­cula(s)", 1)]),
                                  _createElementVNode("h3", null, "MatrÃ­culas"),
                                  _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                    _createElementVNode("th", null, "NÃºmero"),
                                    _createElementVNode("th", null, "Turma"),
                                    _createElementVNode("th", null, "Ano letivo"),
                                    _createElementVNode("th", null, "SituaÃ§Ã£o")
                                  ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student.enrollments, (enrollment) => {
                                    return (_openBlock(), _createElementBlock("tr", { key: enrollment.id }, [
                                      _createElementVNode("td", { class: "mono" }, _toDisplayString(enrollment.number), 1),
                                      _createElementVNode("td", null, [_createTextVNode(_toDisplayString(enrollment.class_name), 1), _createElementVNode("small", null, _toDisplayString(enrollment.grade_name) + " Â· " + _toDisplayString(enrollment.shift_name), 1)]),
                                      _createElementVNode("td", null, _toDisplayString(enrollment.year_name), 1),
                                      _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", enrollment.status]) }, _toDisplayString(enrollmentLabel(enrollment.status)), 3)])
                                    ]))
                                  }), 128))])])]),
                                  _createElementVNode("h3", { class: "spaced" }, "Documentos registrados"),
                                  (!student.documents?.length)
                                    ? (_openBlock(), _createElementBlock("div", {
                                        key: 0,
                                        class: "empty-state"
                                      }, [_createElementVNode("p", null, "Nenhum documento registrado para consulta.")]))
                                    : (_openBlock(), _createElementBlock("div", {
                                        key: 1,
                                        class: "table-scroll"
                                      }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Documento"), _createElementVNode("th", null, "SituaÃ§Ã£o"), _createElementVNode("th", null, "Validade")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student.documents, (document) => {
                                        return (_openBlock(), _createElementBlock("tr", { key: document.id }, [_createElementVNode("td", null, _toDisplayString(document.type_name), 1), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", document.status]) }, _toDisplayString(label(document.status)), 3)]), _createElementVNode("td", null, _toDisplayString(date(document.expires_on)), 1)]))
                                      }), 128))])])]))
                                ]))
                              }), 128))]))
                            : (_openBlock(), _createElementBlock("div", { key: 3 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ESPAÃ‡O DO RESPONSÃVEL"), _createElementVNode("h2", null, "Acompanhe os alunos vinculados Ã  famÃ­lia."), _createElementVNode("p", null, "O acesso Ã© limitado aos vÃ­nculos ativos autorizados pela instituiÃ§Ã£o.")]), _createElementVNode("div", {
                                class: "welcome-art",
                                "aria-hidden": "true"
                              }, [_createElementVNode("span", null, "FAMÃLIA"), _createElementVNode("strong", null, [
                                _createTextVNode("Alunos"),
                                _createElementVNode("br"),
                                _createTextVNode("MatrÃ­culas"),
                                _createElementVNode("br"),
                                _createTextVNode("VÃ­nculos")
                              ]), _createElementVNode("i", null, "âœ“")])]), (!state.profileContext.students?.length)
                                ? (_openBlock(), _createElementBlock("div", {
                                    key: 0,
                                    class: "alert warning"
                                  }, "Seu usuÃ¡rio ainda nÃ£o possui vÃ­nculo ativo com um aluno. Solicite a correÃ§Ã£o Ã  Secretaria."))
                                : _createCommentVNode("", true), _createElementVNode("div", { class: "dashboard-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.profileContext.students || [], (student) => {
                                return (_openBlock(), _createElementBlock("section", {
                                  key: student.id,
                                  class: "panel profile-student-card"
                                }, [
                                  _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(student.school_name), 1),
                                  _createElementVNode("h2", null, _toDisplayString(student.name), 1),
                                  _createElementVNode("p", { class: "muted" }, _toDisplayString(student.number) + " Â· " + _toDisplayString(student.relationship) + " Â· " + _toDisplayString(label(student.status)), 1),
                                  _createElementVNode("h3", { class: "spaced" }, "MatrÃ­culas"),
                                  (!student.enrollments.length)
                                    ? (_openBlock(), _createElementBlock("div", {
                                        key: 0,
                                        class: "empty-state"
                                      }, [_createElementVNode("p", null, "Nenhuma matrÃ­cula disponÃ­vel.")]))
                                    : (_openBlock(), _createElementBlock("div", {
                                        key: 1,
                                        class: "table-scroll"
                                      }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Turma"), _createElementVNode("th", null, "Ano"), _createElementVNode("th", null, "SituaÃ§Ã£o")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student.enrollments, (enrollment) => {
                                        return (_openBlock(), _createElementBlock("tr", { key: enrollment.id }, [_createElementVNode("td", null, [_createTextVNode(_toDisplayString(enrollment.class_name), 1), _createElementVNode("small", null, _toDisplayString(enrollment.grade_name) + " Â· " + _toDisplayString(enrollment.shift_name), 1)]), _createElementVNode("td", null, _toDisplayString(enrollment.year_name), 1), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", enrollment.status]) }, _toDisplayString(enrollmentLabel(enrollment.status)), 3)])]))
                                      }), 128))])])]))
                                ]))
                              }), 128))])]))]))
                      : _createCommentVNode("", true),
                    (state.page==='students' && state.selectedStudent)
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 17,
                          class: "student-detail"
                        }, [
                          _createElementVNode("div", { class: "student-banner" }, [
                            (photoSrc(state.selectedStudent.person))
                              ? (_openBlock(), _createElementBlock("img", {
                                  key: 0,
                                  class: "avatar large",
                                  src: photoSrc(state.selectedStudent.person),
                                  alt: 'Foto de '+state.selectedStudent.person.name
                                }, null, 8, ["src", "alt"]))
                              : (_openBlock(), _createElementBlock("div", {
                                  key: 1,
                                  class: "avatar large"
                                }, _toDisplayString(initials(state.selectedStudent.person.name)), 1)),
                            _createElementVNode("div", { class: "grow" }, [_createElementVNode("h2", null, _toDisplayString(state.selectedStudent.person.social_name || state.selectedStudent.person.name), 1), _createElementVNode("p", null, _toDisplayString(state.selectedStudent.number) + " Â· Nascimento " + _toDisplayString(date(state.selectedStudent.person.birth_date)), 1)]),
                            _createElementVNode("span", { class: _normalizeClass(["badge", state.selectedStudent.status]) }, _toDisplayString(label(state.selectedStudent.status)), 3),
                            (can('enrollments.write'))
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 2,
                                  class: "btn btn-primary",
                                  onClick: newEnrollment
                                }, "+ Matricular aluno", 8, ["onClick"]))
                              : _createCommentVNode("", true)
                          ]),
                          _createElementVNode("div", {
                            class: "tabs",
                            role: "tablist"
                          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['cadastro','responsaveis','documentos','matriculas','protocolos','historico'], (tab) => {
                            return (_openBlock(), _createElementBlock("button", {
                              key: tab,
                              class: _normalizeClass({active:state.studentTab===tab}),
                              onClick: $event => (studentSection(tab))
                            }, _toDisplayString({cadastro:'Dados cadastrais',responsaveis:'ResponsÃ¡veis',documentos:'Documentos',matriculas:'MatrÃ­culas',protocolos:'Protocolos',historico:'MovimentaÃ§Ãµes'}[tab]), 11, ["onClick"]))
                          }), 128))]),
                          (state.studentTab==='cadastro')
                            ? (_openBlock(), _createElementBlock("section", {
                                key: 0,
                                class: "panel"
                              }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "Dados pessoais e contato"), (can('people.write'))
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    class: "btn btn-secondary",
                                    onClick: editStudent
                                  }, "Editar cadastro", 8, ["onClick"]))
                                : _createCommentVNode("", true)]), _createElementVNode("dl", { class: "data-grid" }, [
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Nome completo"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.name), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Nome social"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.social_name || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "CPF"), _createElementVNode("dd", null, _toDisplayString(cpf(state.selectedStudent.person.cpf)), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Data de nascimento"), _createElementVNode("dd", null, _toDisplayString(date(state.selectedStudent.person.birth_date)), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Telefone / WhatsApp"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.phone || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "E-mail"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.email || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "EndereÃ§o"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.address || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "ObservaÃ§Ãµes"), _createElementVNode("dd", { class: "preserve" }, _toDisplayString(state.selectedStudent.person.notes || 'Sem observaÃ§Ãµes.'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Escola anterior"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.previous_school || 'NÃ£o informada'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "NIS / PIS"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.nis || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "CartÃ£o SUS"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.sus_card || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "CÃ³digo INEP"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.inep_code || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Plano de saÃºde"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.health_plan || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "InformaÃ§Ãµes de saÃºde"), _createElementVNode("dd", { class: "preserve" }, _toDisplayString([state.selectedStudent.allergies,state.selectedStudent.medications,state.selectedStudent.health_notes,state.selectedStudent.special_needs].filter(Boolean).join(' Â· ') || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "ObservaÃ§Ãµes pedagÃ³gicas"), _createElementVNode("dd", { class: "preserve" }, _toDisplayString(state.selectedStudent.student_notes || 'Sem observaÃ§Ãµes.'), 1)])
                              ]), _createElementVNode("div", { class: "panel-footer" }, [(can('documents.write'))
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    class: "btn btn-secondary",
                                    onClick: $event => (issueDocument())
                                  }, "Emitir ficha em PDF", 8, ["onClick"]))
                                : _createCommentVNode("", true), (can('people.write') && state.selectedStudent.status==='active')
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 1,
                                    class: "link-button danger-text",
                                    onClick: archiveStudent
                                  }, "Arquivar cadastro", 8, ["onClick"]))
                                : _createCommentVNode("", true)])]))
                            : _createCommentVNode("", true),
                          (state.studentTab==='responsaveis')
                            ? (_openBlock(), _createElementBlock("section", {
                                key: 1,
                                class: "panel"
                              }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "FamÃ­lia e vÃ­nculos"), (can('people.write'))
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    class: "btn btn-primary",
                                    onClick: newLink
                                  }, "+ Vincular responsÃ¡vel", 8, ["onClick"]))
                                : _createCommentVNode("", true)]), (!state.selectedStudent.guardians?.length)
                                ? (_openBlock(), _createElementBlock("div", {
                                    key: 0,
                                    class: "empty-state"
                                  }, [_createElementVNode("h3", null, "Nenhum responsÃ¡vel vinculado"), _createElementVNode("p", null, "Cadastre a pessoa em ResponsÃ¡veis e vincule-a ao aluno.")]))
                                : _createCommentVNode("", true), _createElementVNode("div", { class: "guardian-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selectedStudent.guardians, (g) => {
                                return (_openBlock(), _createElementBlock("article", {
                                  key: g.id,
                                  class: _normalizeClass(["guardian-card", {faded:!g.active}])
                                }, [
                                  (photoSrc(g.person))
                                    ? (_openBlock(), _createElementBlock("img", {
                                        key: 0,
                                        class: "avatar",
                                        src: photoSrc(g.person),
                                        alt: 'Foto de '+g.person.name
                                      }, null, 8, ["src", "alt"]))
                                    : (_openBlock(), _createElementBlock("div", {
                                        key: 1,
                                        class: "avatar"
                                      }, _toDisplayString(initials(g.person.name)), 1)),
                                  _createElementVNode("h3", null, _toDisplayString(g.person.name), 1),
                                  _createElementVNode("p", null, _toDisplayString(g.relationship) + " Â· " + _toDisplayString(g.active?'VÃ­nculo ativo':'VÃ­nculo inativo'), 1),
                                  _createElementVNode("p", null, _toDisplayString(g.person.phone || g.person.email || 'Contato nÃ£o informado'), 1),
                                  _createElementVNode("div", { class: "pills" }, [
                                    (g.legal)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 0,
                                          class: "badge active"
                                        }, "Legal"))
                                      : _createCommentVNode("", true),
                                    (g.financial)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 1,
                                          class: "badge active"
                                        }, "Financeiro"))
                                      : _createCommentVNode("", true),
                                    (g.pickup)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 2,
                                          class: "badge received"
                                        }, "Retirada"))
                                      : _createCommentVNode("", true),
                                    (g.primary_contact)
                                      ? (_openBlock(), _createElementBlock("span", {
                                          key: 3,
                                          class: "badge received"
                                        }, "Principal"))
                                      : _createCommentVNode("", true)
                                  ]),
                                  (can('people.write'))
                                    ? (_openBlock(), _createElementBlock("button", {
                                        key: 2,
                                        class: "link-button",
                                        onClick: $event => (editLink(g))
                                      }, "Editar vÃ­nculo â†’", 8, ["onClick"]))
                                    : _createCommentVNode("", true)
                                ], 2))
                              }), 128))])]))
                            : _createCommentVNode("", true),
                          (state.studentTab==='documentos')
                            ? (_openBlock(), _createElementBlock("section", { key: 2 }, [
                                _createElementVNode("div", { class: "section-actions" }, [_createElementVNode("h2", null, "DocumentaÃ§Ã£o do aluno"), _createElementVNode("div", { class: "actions" }, [(can('documents.waive'))
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 0,
                                      class: "btn btn-secondary",
                                      onClick: waiveDocument
                                    }, "Dispensar documento", 8, ["onClick"]))
                                  : _createCommentVNode("", true), (can('documents.write'))
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 1,
                                      class: "btn btn-secondary",
                                      onClick: $event => (issueDocument())
                                    }, "Emitir PDF", 8, ["onClick"]))
                                  : _createCommentVNode("", true), (can('documents.write'))
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 2,
                                      class: "btn btn-primary",
                                      onClick: uploadDocument
                                    }, "+ Receber documento", 8, ["onClick"]))
                                  : _createCommentVNode("", true)])]),
                                _createElementVNode("div", { class: "checklist-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentDocs.checklist, (c) => {
                                  return (_openBlock(), _createElementBlock("div", {
                                    key: c.document_type_id,
                                    class: "checklist-item"
                                  }, [_createElementVNode("span", { class: _normalizeClass(c.complete?'check-ok':'check-pending') }, _toDisplayString(c.complete?'âœ“':'!'), 3), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(c.name), 1), _createElementVNode("small", null, _toDisplayString(c.required?'ObrigatÃ³rio':'Opcional') + " Â· " + _toDisplayString(label(c.status)), 1)])]))
                                }), 128))]),
                                (!state.studentDocs.checklist.length)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 0,
                                      class: "alert info"
                                    }, "Cadastre tipos de documento em Estrutura acadÃªmica â†’ Tipos de documento."))
                                  : _createCommentVNode("", true),
                                _createElementVNode("div", { class: "panel table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                  _createElementVNode("th", null, "Documento / arquivo"),
                                  _createElementVNode("th", null, "Recebimento"),
                                  _createElementVNode("th", null, "Validade"),
                                  _createElementVNode("th", null, "SituaÃ§Ã£o"),
                                  _createElementVNode("th", null, "AÃ§Ãµes")
                                ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentDocs.items, (d) => {
                                  return (_openBlock(), _createElementBlock("tr", { key: d.id }, [
                                    _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(d.type_name), 1), _createElementVNode("small", null, _toDisplayString(d.file?.original_name || 'Dispensa justificada'), 1)]),
                                    _createElementVNode("td", null, _toDisplayString(date(d.created_at)), 1),
                                    _createElementVNode("td", null, _toDisplayString(date(d.expires_on)), 1),
                                    _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", d.effective_status]) }, _toDisplayString(label(d.effective_status)), 3)]),
                                    _createElementVNode("td", null, [_createElementVNode("div", { class: "actions compact" }, [
                                      (d.file_id && can('people.write'))
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 0,
                                            class: "link-button",
                                            onClick: $event => (readStudentDocument(d.file_id))
                                          }, "Ler dados do aluno", 8, ["onClick"]))
                                        : _createCommentVNode("", true),
                                      (d.file_id && can('people.write'))
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 1,
                                            class: "link-button",
                                            onClick: $event => (readResponsibleDocument(d.file_id))
                                          }, "Ler para responsÃ¡vel", 8, ["onClick"]))
                                        : _createCommentVNode("", true),
                                      (d.file_id)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 2,
                                            class: "link-button",
                                            onClick: $event => (downloadFile(d.file_id,d.file.original_name))
                                          }, "Baixar", 8, ["onClick"]))
                                        : _createCommentVNode("", true),
                                      (can('documents.validate') && !['waived','archived'].includes(d.status))
                                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [(d.status!=='validated')
                                            ? (_openBlock(), _createElementBlock("button", {
                                                key: 0,
                                                class: "link-button",
                                                onClick: $event => (reviewDocument(d,'validated'))
                                              }, "Validar", 8, ["onClick"]))
                                            : _createCommentVNode("", true), (d.status!=='rejected')
                                            ? (_openBlock(), _createElementBlock("button", {
                                                key: 1,
                                                class: "link-button danger-text",
                                                onClick: $event => (reviewDocument(d,'rejected'))
                                              }, "Rejeitar", 8, ["onClick"]))
                                            : _createCommentVNode("", true), _createElementVNode("button", {
                                            class: "link-button muted",
                                            onClick: $event => (reviewDocument(d,'archived'))
                                          }, "Arquivar", 8, ["onClick"])], 64))
                                        : _createCommentVNode("", true)
                                    ])])
                                  ]))
                                }), 128))])]), (!state.studentDocs.items.length)
                                  ? (_openBlock(), _createElementBlock("div", {
                                      key: 0,
                                      class: "empty-state"
                                    }, [_createElementVNode("p", null, "Nenhum documento recebido.")]))
                                  : _createCommentVNode("", true)]),
                                (state.studentDocs.issued.length)
                                  ? (_openBlock(), _createElementBlock("section", {
                                      key: 1,
                                      class: "panel spaced"
                                    }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "Documentos emitidos e preservados")]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentDocs.issued, (d) => {
                                      return (_openBlock(), _createElementBlock("div", {
                                        key: d.id,
                                        class: "list-row"
                                      }, [_createElementVNode("span", null, [_createTextVNode(_toDisplayString(d.template_name || {student_record:'Ficha cadastral',enrollment_receipt:'Comprovante de matrÃ­cula',enrollment_declaration:'DeclaraÃ§Ã£o de matrÃ­cula',enrollment_form:'Ficha de matrÃ­cula'}[d.kind] || 'Documento emitido'), 1), _createElementVNode("small", null, [_createTextVNode(_toDisplayString(date(d.created_at)) + " Â· Modelo v" + _toDisplayString(d.template_version), 1), (d.kind==='template')
                                        ? (_openBlock(), _createElementBlock("span", { key: 0 }, " Â· " + _toDisplayString({unsigned:'Sem assinatura',company_signed:'Assinado pela escola',pending_validation:'Assinatura em revisÃ£o',verified:'Assinatura conferida',rejected:'Devolvido para correÃ§Ã£o'}[d.signature_status] || 'Verificar assinaturas'), 1))
                                        : _createCommentVNode("", true)])]), _createElementVNode("div", { class: "actions" }, [(d.kind==='template' && d.enrollment_id && can('documents.read'))
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 0,
                                            class: "link-button",
                                            onClick: $event => (contractsForEnrollment(d.enrollment_id,d.id))
                                          }, "Conferir assinaturas â†’", 8, ["onClick"]))
                                        : _createCommentVNode("", true), _createElementVNode("button", {
                                        class: "link-button",
                                        onClick: $event => (downloadFile(d.current_file_id || d.file_id))
                                      }, "Baixar PDF â†’", 8, ["onClick"])])]))
                                    }), 128))]))
                                  : _createCommentVNode("", true)
                              ]))
                            : _createCommentVNode("", true),
                          (state.studentTab==='matriculas')
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 3,
                                class: "panel table-scroll"
                              }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                _createElementVNode("th", null, "MatrÃ­cula"),
                                _createElementVNode("th", null, "Ano letivo"),
                                _createElementVNode("th", null, "Turma"),
                                _createElementVNode("th", null, "SituaÃ§Ã£o"),
                                _createElementVNode("th")
                              ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selectedStudent.enrollments, (e) => {
                                return (_openBlock(), _createElementBlock("tr", { key: e.id }, [
                                  _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(e.number), 1)]),
                                  _createElementVNode("td", null, _toDisplayString(getName('academic-years',e.academic_year_id)), 1),
                                  _createElementVNode("td", null, _toDisplayString(getName('class-groups',e.class_group_id)), 1),
                                  _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", e.status]) }, _toDisplayString(enrollmentLabel(e.status)), 3)]),
                                  _createElementVNode("td", null, [_createElementVNode("button", {
                                    class: "link-button",
                                    onClick: $event => (viewEnrollment(e.id))
                                  }, "Abrir matrÃ­cula â†’", 8, ["onClick"])])
                                ]))
                              }), 128))])]), (!state.selectedStudent.enrollments?.length)
                                ? (_openBlock(), _createElementBlock("div", {
                                    key: 0,
                                    class: "empty-state"
                                  }, [_createElementVNode("p", null, "Este aluno ainda nÃ£o possui matrÃ­cula.")]))
                                : _createCommentVNode("", true)]))
                            : _createCommentVNode("", true),
                          (state.studentTab==='protocolos')
                            ? (_openBlock(), _createElementBlock("section", {
                                key: 4,
                                class: "panel"
                              }, [
                                _createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "Protocolos deste aluno"), (can('protocols.write'))
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 0,
                                      class: "btn btn-primary",
                                      onClick: $event => (newProtocol())
                                    }, "+ Abrir protocolo", 8, ["onClick"]))
                                  : _createCommentVNode("", true)]),
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentProtocols, (p) => {
                                  return (_openBlock(), _createElementBlock("div", {
                                    key: p.id,
                                    class: "list-row"
                                  }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(p.number) + " Â· " + _toDisplayString(p.kind), 1), _createElementVNode("small", null, [_createTextVNode(_toDisplayString(date(p.created_at)) + " Â· " + _toDisplayString(label(p.status)), 1), (p.overdue)
                                    ? (_openBlock(), _createElementBlock("span", {
                                        key: 0,
                                        class: "danger-text"
                                      }, " Â· Prazo vencido"))
                                    : _createCommentVNode("", true)])]), _createElementVNode("button", {
                                    class: "link-button",
                                    onClick: $event => (viewProtocol(p.id))
                                  }, "Ver atendimento â†’", 8, ["onClick"])]))
                                }), 128)),
                                (!state.studentProtocols.length)
                                  ? (_openBlock(), _createElementBlock("div", {
                                      key: 0,
                                      class: "empty-state"
                                    }, [_createElementVNode("p", null, "Nenhum protocolo vinculado a este aluno.")]))
                                  : _createCommentVNode("", true),
                                (state.studentProtocolTotal>100)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 1,
                                      class: "alert warning"
                                    }, "Exibidos os 100 protocolos mais recentes de " + _toDisplayString(state.studentProtocolTotal) + ". Consulte os demais pela tela de Protocolos.", 1))
                                  : _createCommentVNode("", true)
                              ]))
                            : _createCommentVNode("", true),
                          (state.studentTab==='historico')
                            ? (_openBlock(), _createElementBlock("section", {
                                key: 5,
                                class: "panel"
                              }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "HistÃ³rico de movimentaÃ§Ãµes")]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.history, (h) => {
                                return (_openBlock(), _createElementBlock("div", {
                                  key: h.id,
                                  class: "timeline-item"
                                }, [_createElementVNode("span", { class: "timeline-dot" }), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString({created:'MatrÃ­cula criada',draft_updated:'PrÃ©-matrÃ­cula editada',reenrolled:'RematrÃ­cula criada',activate:'MatrÃ­cula ativada',change_class:'Turma alterada',cancel:'MatrÃ­cula cancelada',transfer:'TransferÃªncia externa',suspend:'MatrÃ­cula suspensa',reactivate:'MatrÃ­cula reativada',complete:'MatrÃ­cula concluÃ­da'}[h.action] || h.action), 1), _createElementVNode("p", null, _toDisplayString(h.reason), 1), _createElementVNode("small", null, _toDisplayString(date(h.created_at)) + " Â· " + _toDisplayString(h.after.number), 1)])]))
                              }), 128)), (!state.history.length)
                                ? (_openBlock(), _createElementBlock("div", {
                                    key: 0,
                                    class: "empty-state"
                                  }, [_createElementVNode("p", null, "Nenhuma movimentaÃ§Ã£o registrada.")]))
                                : _createCommentVNode("", true)]))
                            : _createCommentVNode("", true)
                        ]))
                      : _createCommentVNode("", true),
                    (['people','students','teachers','employees','guardians','suppliers','providers','customers','partners','academic','enrollments','documents','protocols'].includes(state.page) && !state.selectedStudent)
                      ? (_openBlock(), _createElementBlock("section", { key: 18 }, [
                          (state.page==='academic' && can('academic.write'))
                            ? (_openBlock(), _createBlock(_component_academic_preparation, {
                                key: state.schoolId+':year-preparation',
                                "school-id": state.schoolId,
                                years: state.catalogs['academic-years']||[],
                                onPrepared: academicPrepared
                              }, null, 8, ["school-id", "years", "onPrepared"]))
                            : _createCommentVNode("", true),
                          (state.page==='academic')
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 1,
                                class: "academic-workspace"
                              }, [_createElementVNode("nav", {
                                class: "academic-sections",
                                "aria-label": "OrganizaÃ§Ã£o acadÃªmica"
                              }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(catalogLabels, (caption, kind) => {
                                return (_openBlock(), _createElementBlock("button", {
                                  key: kind,
                                  type: "button",
                                  "aria-label": caption,
                                  class: _normalizeClass({active:state.catalog===kind}),
                                  "aria-pressed": state.catalog===kind,
                                  onClick: $event => (setCatalog(kind))
                                }, [_createElementVNode("span", { class: "academic-section-head" }, [_createElementVNode("strong", null, _toDisplayString(caption), 1), _createElementVNode("span", null, _toDisplayString((state.catalogs[kind] || []).length), 1)]), _createElementVNode("small", null, _toDisplayString(catalogDescriptions[kind]), 1)], 10, ["aria-label", "aria-pressed", "onClick"]))
                              }), 128))]), _createElementVNode("div", { class: "academic-list-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, _toDisplayString(catalogLabels[state.catalog]), 1), _createElementVNode("p", null, _toDisplayString(catalogDescriptions[state.catalog]), 1)]), _createElementVNode("span", { class: "badge" }, _toDisplayString(state.total) + " registros", 1)]), _createElementVNode("form", {
                                class: "academic-filters",
                                onSubmit: _withModifiers(search, ["prevent"])
                              }, [_createElementVNode("label", { class: "academic-search" }, [_createTextVNode("Buscar " + _toDisplayString(catalogLabels[state.catalog].toLocaleLowerCase('pt-BR')), 1), _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((state.q) = $event),
                                type: "search",
                                placeholder: "Digite o nome",
                                onInput: search
                              }, null, 40, ["onUpdate:modelValue", "onInput"]), [[_vModelText, state.q]])]), (state.catalog==='class-groups')
                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                    _createElementVNode("label", null, [_createTextVNode("Ano letivo"), _withDirectives(_createElementVNode("select", {
                                      "onUpdate:modelValue": $event => ((state.academicFilter.year) = $event),
                                      onChange: search
                                    }, [_createElementVNode("option", { value: "" }, "Todos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('academic-years'), (o) => {
                                      return (_openBlock(), _createElementBlock("option", { value: o.value }, _toDisplayString(o.label), 9, ["value"]))
                                    }), 256))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.academicFilter.year]])]),
                                    _createElementVNode("label", null, [_createTextVNode("Unidade"), _withDirectives(_createElementVNode("select", {
                                      "onUpdate:modelValue": $event => ((state.academicFilter.unit) = $event),
                                      onChange: search
                                    }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('units'), (o) => {
                                      return (_openBlock(), _createElementBlock("option", { value: o.value }, _toDisplayString(o.label), 9, ["value"]))
                                    }), 256))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.academicFilter.unit]])]),
                                    _createElementVNode("label", null, [_createTextVNode("SÃ©rie"), _withDirectives(_createElementVNode("select", {
                                      "onUpdate:modelValue": $event => ((state.academicFilter.grade) = $event),
                                      onChange: search
                                    }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('grades'), (o) => {
                                      return (_openBlock(), _createElementBlock("option", { value: o.value }, _toDisplayString(o.label), 9, ["value"]))
                                    }), 256))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.academicFilter.grade]])]),
                                    _createElementVNode("label", null, [_createTextVNode("Turno"), _withDirectives(_createElementVNode("select", {
                                      "onUpdate:modelValue": $event => ((state.academicFilter.shift) = $event),
                                      onChange: search
                                    }, [_createElementVNode("option", { value: "" }, "Todos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('shifts'), (o) => {
                                      return (_openBlock(), _createElementBlock("option", { value: o.value }, _toDisplayString(o.label), 9, ["value"]))
                                    }), 256))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.academicFilter.shift]])])
                                  ], 64))
                                : _createCommentVNode("", true)], 40, ["onSubmit"])]))
                            : _createCommentVNode("", true),
                          (registryPages.includes(state.page) || state.page==='academic')
                            ? (_openBlock(), _createElementBlock("label", {
                                key: 2,
                                class: "record-archive-filter"
                              }, [_createTextVNode("Exibir"), _withDirectives(_createElementVNode("select", {
                                "aria-label": "Exibir registros",
                                "onUpdate:modelValue": $event => ((state.archiveFilter) = $event),
                                onChange: search
                              }, [_createElementVNode("option", { value: "active" }, "Cadastros disponÃ­veis"), _createElementVNode("option", { value: "archived" }, "Arquivados"), _createElementVNode("option", { value: "all" }, "Todos os cadastros")], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.archiveFilter]])]))
                            : _createCommentVNode("", true),
                          (['people','students','teachers','employees','guardians','suppliers','providers','customers','partners'].includes(state.page))
                            ? (_openBlock(), _createElementBlock("form", {
                                key: 3,
                                class: "filter-bar",
                                onSubmit: _withModifiers(search, ["prevent"])
                              }, [_createElementVNode("label", { class: "search-field" }, [_createElementVNode("span", null, "âŒ•"), _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((state.q) = $event),
                                placeholder: "Buscar nome, CPF/CNPJ, cÃ³digo ou telefoneâ€¦",
                                "aria-label": "Buscar registros"
                              }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.q]])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Buscar"), _createElementVNode("span", { class: "muted small" }, _toDisplayString(state.total) + " registros", 1)], 40, ["onSubmit"]))
                            : _createCommentVNode("", true),
                          (['people','guardians',...Object.keys(businessTypes)].includes(state.page))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 4,
                                type: "button",
                                class: "registry-filter-toggle",
                                "aria-expanded": state.registryFiltersOpen,
                                "aria-controls": "registry-filters",
                                onClick: $event => (state.registryFiltersOpen=!state.registryFiltersOpen)
                              }, [_createElementVNode("span", null, [_createTextVNode("Filtros "), (Object.values(state.registryFilter).filter(Boolean).length)
                                ? (_openBlock(), _createElementBlock("span", {
                                    key: 0,
                                    class: "badge"
                                  }, _toDisplayString(Object.values(state.registryFilter).filter(Boolean).length) + " ativos", 1))
                                : _createCommentVNode("", true)]), _createElementVNode("span", { "aria-hidden": "true" }, _toDisplayString(state.registryFiltersOpen ? 'âˆ’' : '+'), 1)], 8, ["aria-expanded", "onClick"]))
                            : _createCommentVNode("", true),
                          (['people','guardians',...Object.keys(businessTypes)].includes(state.page))
                            ? (_openBlock(), _createElementBlock("form", {
                                key: 5,
                                id: "registry-filters",
                                class: _normalizeClass(["registry-filters", {'filters-open':state.registryFiltersOpen}]),
                                onSubmit: _withModifiers(search, ["prevent"])
                              }, [(state.page==='people')
                                ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Tipo de pessoa"), _withDirectives(_createElementVNode("select", {
                                    "aria-label": "Tipo de pessoa",
                                    "onUpdate:modelValue": $event => ((state.registryFilter.type_code) = $event),
                                    onChange: search
                                  }, [_createElementVNode("option", { value: "" }, "Todos os tipos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(personTypeOptions(), (t) => {
                                    return (_openBlock(), _createElementBlock("option", {
                                      key: t.value,
                                      value: t.value
                                    }, _toDisplayString(t.label), 9, ["value"]))
                                  }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.registryFilter.type_code]])]))
                                : _createCommentVNode("", true), _createElementVNode("label", null, [_createTextVNode("Natureza"), _withDirectives(_createElementVNode("select", {
                                "aria-label": "Natureza",
                                "onUpdate:modelValue": $event => ((state.registryFilter.entity_kind) = $event),
                                onChange: search
                              }, [_createElementVNode("option", { value: "" }, "Todas"), _createElementVNode("option", { value: "individual" }, "Pessoa fÃ­sica"), _createElementVNode("option", { value: "organization" }, "Pessoa jurÃ­dica")], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.registryFilter.entity_kind]])]), _createElementVNode("label", null, [_createTextVNode("SituaÃ§Ã£o cadastral"), _withDirectives(_createElementVNode("select", {
                                "aria-label": "SituaÃ§Ã£o cadastral",
                                "onUpdate:modelValue": $event => ((state.registryFilter.active) = $event),
                                onChange: search
                              }, [_createElementVNode("option", { value: "" }, "Todas"), _createElementVNode("option", { value: "true" }, "Ativos"), _createElementVNode("option", { value: "false" }, "Inativos")], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.registryFilter.active]])])], 42, ["onSubmit"]))
                            : _createCommentVNode("", true),
                          (['enrollments','documents','protocols'].includes(state.page))
                            ? (_openBlock(), _createElementBlock("form", {
                                key: 6,
                                class: "panel filter-panel",
                                onSubmit: _withModifiers(search, ["prevent"])
                              }, [_createElementVNode("div", { class: "filter-grid" }, [
                                _createElementVNode("label", { class: "field" }, [_createTextVNode("Pesquisar"), _withDirectives(_createElementVNode("input", {
                                  "onUpdate:modelValue": $event => ((state.q) = $event),
                                  placeholder: state.page==='protocols'?'NÃºmero, assunto ou descriÃ§Ã£o':'Nome do aluno ou nÃºmero',
                                  "aria-label": "Pesquisar na lista"
                                }, null, 8, ["onUpdate:modelValue", "placeholder"]), [[_vModelText, state.q]])]),
                                (state.page!=='protocols')
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 0,
                                      class: "field"
                                    }, [_createTextVNode("Ano letivo"), _withDirectives(_createElementVNode("select", {
                                      "aria-label": "Ano letivo",
                                      "onUpdate:modelValue": $event => ((state.filters.academic_year_id) = $event),
                                      onChange: yearChanged
                                    }, [_createElementVNode("option", { value: "" }, "Todos os anos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('academic-years'), (a) => {
                                      return (_openBlock(), _createElementBlock("option", {
                                        key: a.value,
                                        value: a.value
                                      }, _toDisplayString(a.label), 9, ["value"]))
                                    }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.filters.academic_year_id]])]))
                                  : _createCommentVNode("", true),
                                (state.page!=='protocols')
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 1,
                                      class: "field"
                                    }, [_createTextVNode("Turma"), _withDirectives(_createElementVNode("select", {
                                      "aria-label": "Turma",
                                      "onUpdate:modelValue": $event => ((state.filters.class_group_id) = $event)
                                    }, [_createElementVNode("option", { value: "" }, "Todas as turmas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(filteredClasses(), (c) => {
                                      return (_openBlock(), _createElementBlock("option", {
                                        key: c.value,
                                        value: c.value
                                      }, _toDisplayString(c.label), 9, ["value"]))
                                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.filters.class_group_id]])]))
                                  : _createCommentVNode("", true),
                                (state.page==='enrollments')
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 2,
                                      class: "field"
                                    }, [_createTextVNode("SituaÃ§Ã£o"), _withDirectives(_createElementVNode("select", {
                                      "aria-label": "SituaÃ§Ã£o",
                                      "onUpdate:modelValue": $event => ((state.filters.status) = $event)
                                    }, [_createElementVNode("option", { value: "" }, "Todas as situaÃ§Ãµes"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['draft','active','suspended','transferred','cancelled','completed'], (s) => {
                                      return (_openBlock(), _createElementBlock("option", {
                                        key: s,
                                        value: s
                                      }, _toDisplayString(label(s)), 9, ["value"]))
                                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.filters.status]])]))
                                  : _createCommentVNode("", true),
                                (state.page==='protocols')
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 3,
                                      class: "field"
                                    }, [_createTextVNode("SituaÃ§Ã£o"), _withDirectives(_createElementVNode("select", {
                                      "aria-label": "SituaÃ§Ã£o",
                                      "onUpdate:modelValue": $event => ((state.filters.status) = $event)
                                    }, [_createElementVNode("option", { value: "" }, "Todas as situaÃ§Ãµes"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['open','in_progress','waiting','completed','cancelled'], (s) => {
                                      return (_openBlock(), _createElementBlock("option", {
                                        key: s,
                                        value: s
                                      }, _toDisplayString(label(s)), 9, ["value"]))
                                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.filters.status]])]))
                                  : _createCommentVNode("", true),
                                (state.page==='protocols')
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 4,
                                      class: "field checkbox-field"
                                    }, [_withDirectives(_createElementVNode("input", {
                                      type: "checkbox",
                                      "onUpdate:modelValue": $event => ((state.filters.overdue) = $event)
                                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.filters.overdue]]), _createTextVNode("Somente prazos vencidos")]))
                                  : _createCommentVNode("", true),
                                (state.page==='documents')
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 5,
                                      class: "field"
                                    }, [_createTextVNode("Documento"), _withDirectives(_createElementVNode("select", {
                                      "aria-label": "Documento",
                                      "onUpdate:modelValue": $event => ((state.filters.document_type_id) = $event)
                                    }, [_createElementVNode("option", { value: "" }, "Todos os obrigatÃ³rios"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('document-types'), (d) => {
                                      return (_openBlock(), _createElementBlock("option", {
                                        key: d.value,
                                        value: d.value
                                      }, _toDisplayString(d.label), 9, ["value"]))
                                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.filters.document_type_id]])]))
                                  : _createCommentVNode("", true),
                                (state.page==='documents')
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 6,
                                      class: "field"
                                    }, [_createTextVNode("PendÃªncia"), _withDirectives(_createElementVNode("select", {
                                      "aria-label": "PendÃªncia",
                                      "onUpdate:modelValue": $event => ((state.filters.document_status) = $event)
                                    }, [_createElementVNode("option", { value: "" }, "Todos os tipos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['pending','received','rejected','expired'], (s) => {
                                      return (_openBlock(), _createElementBlock("option", {
                                        key: s,
                                        value: s
                                      }, _toDisplayString(label(s)), 9, ["value"]))
                                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.filters.document_status]])]))
                                  : _createCommentVNode("", true)
                              ]), _createElementVNode("div", { class: "filter-actions" }, [_createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                                class: "btn btn-primary",
                                disabled: state.loading
                              }, "Aplicar filtros", 8, ["disabled"]), _createElementVNode("button", {
                                type: "button",
                                class: "btn btn-secondary",
                                onClick: clearFilters
                              }, "Limpar", 8, ["onClick"])]), _createElementVNode("span", { class: "small muted" }, _toDisplayString(state.total) + " " + _toDisplayString(state.page==='documents'?(state.total===1?'aluno com pendÃªncias':'alunos com pendÃªncias'):(state.total===1?'registro':'registros')), 1)])], 40, ["onSubmit"]))
                            : _createCommentVNode("", true),
                          (state.page==='documents')
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 7,
                                class: "document-summary"
                              }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(state.pendencySummary.total_documents) + " " + _toDisplayString(state.pendencySummary.total_documents===1?'pendÃªncia documental':'pendÃªncias documentais'), 1), _createElementVNode("p", { class: "small muted" }, "Documentos obrigatÃ³rios ainda nÃ£o validados, rejeitados ou vencidos. Somente alunos ativos.")]), (can('reports.read'))
                                ? (_openBlock(), _createElementBlock("div", {
                                    key: 0,
                                    class: "actions"
                                  }, [_createElementVNode("button", {
                                    class: "btn btn-secondary",
                                    onClick: $event => (exportPendencies('csv'))
                                  }, "Exportar CSV", 8, ["onClick"]), _createElementVNode("button", {
                                    class: "btn btn-primary",
                                    onClick: $event => (exportPendencies('pdf'))
                                  }, "Gerar PDF", 8, ["onClick"])]))
                                : _createCommentVNode("", true)]))
                            : _createCommentVNode("", true),
                          (state.page==='documents' && state.pendencySummary.truncated)
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 8,
                                class: "alert warning"
                              }, "Resultado limitado: " + _toDisplayString(state.pendencySummary.scanned_students) + " de " + _toDisplayString(state.pendencySummary.total_students) + " alunos verificados. Restrinja por ano, turma ou nome. ExportaÃ§Ãµes parciais sÃ£o bloqueadas.", 1))
                            : _createCommentVNode("", true),
                          (state.page==='academic' && state.catalog==='class-groups')
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 9,
                                class: "alert info"
                              }, "A capacidade Ã© conferida ao ativar a matrÃ­cula. MatrÃ­culas suspensas continuam reservando a vaga."))
                            : _createCommentVNode("", true),
                          _createElementVNode("div", { class: "panel table-scroll record-list" }, [(state.page==='people')
                            ? (_openBlock(), _createElementBlock("table", {
                                key: 0,
                                role: "table"
                              }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                _createElementVNode("th", {
                                  scope: "col",
                                  role: "columnheader",
                                  id: "record-1-column-1"
                                }, "Pessoa"),
                                _createElementVNode("th", {
                                  scope: "col",
                                  role: "columnheader",
                                  id: "record-1-column-2"
                                }, "Tipos de pessoa"),
                                _createElementVNode("th", {
                                  scope: "col",
                                  role: "columnheader",
                                  id: "record-1-column-3"
                                }, "CPF / CNPJ"),
                                _createElementVNode("th", {
                                  scope: "col",
                                  role: "columnheader",
                                  id: "record-1-column-4"
                                }, "Contato"),
                                _createElementVNode("th", {
                                  scope: "col",
                                  role: "columnheader",
                                  id: "record-1-column-5"
                                }, "SituaÃ§Ã£o"),
                                _createElementVNode("th", {
                                  scope: "col",
                                  role: "columnheader",
                                  id: "record-1-column-6"
                                }, "AÃ§Ãµes")
                              ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                return (_openBlock(), _createElementBlock("tr", {
                                  role: "row",
                                  key: r.id
                                }, [
                                  _createElementVNode("td", {
                                    role: "cell",
                                    headers: "record-1-column-1",
                                    "data-label": "Pessoa"
                                  }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r))
                                    ? (_openBlock(), _createElementBlock("img", {
                                        key: 0,
                                        class: "avatar",
                                        src: photoSrc(r),
                                        alt: 'Foto de '+r.name
                                      }, null, 8, ["src", "alt"]))
                                    : (_openBlock(), _createElementBlock("span", {
                                        key: 1,
                                        class: "avatar"
                                      }, _toDisplayString(initials(r.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.social_name || r.name), 1), (r.social_name)
                                    ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(r.name), 1))
                                    : _createCommentVNode("", true)])])])]),
                                  _createElementVNode("td", {
                                    role: "cell",
                                    headers: "record-1-column-2",
                                    "data-label": "Tipos de pessoa"
                                  }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.person_type_labels?.length ? r.person_type_labels.join(' Â· ') : 'Cadastro geral'), 1)]),
                                  _createElementVNode("td", {
                                    role: "cell",
                                    headers: "record-1-column-3",
                                    "data-label": "CPF / CNPJ"
                                  }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(personDocument(r)), 1)]),
                                  _createElementVNode("td", {
                                    role: "cell",
                                    headers: "record-1-column-4",
                                    "data-label": "Contato"
                                  }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.phone || r.email || 'â€”'), 1)]),
                                  _createElementVNode("td", {
                                    role: "cell",
                                    headers: "record-1-column-5",
                                    "data-label": "SituaÃ§Ã£o"
                                  }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.archived || r.active===false?'archived':'active']) }, _toDisplayString(r.archived?'Arquivado':r.active===false?'Inativo':'Ativo'), 3)])]),
                                  _createElementVNode("td", {
                                    role: "cell",
                                    headers: "record-1-column-6",
                                    "data-label": "AÃ§Ãµes"
                                  }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("div", { class: "actions compact" }, [
                                    ((can('people.write')) && !r.archived)
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 0,
                                          class: "link-button",
                                          onClick: $event => (editPerson(r))
                                        }, "Editar â†’", 8, ["onClick"]))
                                      : _createCommentVNode("", true),
                                    (can('people.write') && r.entity_kind!=='organization' && !r.student_id)
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 1,
                                          class: "link-button",
                                          onClick: $event => (newStudent(r))
                                        }, "Adicionar aluno â†’", 8, ["onClick"]))
                                      : _createCommentVNode("", true),
                                    (can('people.write') && r.entity_kind!=='organization' && !r.teacher_id)
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 2,
                                          class: "link-button",
                                          onClick: $event => (newTeacher(r))
                                        }, "Adicionar professor â†’", 8, ["onClick"]))
                                      : _createCommentVNode("", true),
                                    (can('people.write') && r.entity_kind!=='organization' && !r.employee_id)
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 3,
                                          class: "link-button",
                                          onClick: $event => (newEmployee(r))
                                        }, "Adicionar funcionÃ¡rio â†’", 8, ["onClick"]))
                                      : _createCommentVNode("", true)
                                  ])]), (can('people.write'))
                                    ? (_openBlock(), _createElementBlock("button", {
                                        key: 0,
                                        class: "link-button record-manage",
                                        onClick: $event => (manageRecord(r))
                                      }, _toDisplayString(r.archived?'Restaurar ou excluir':'Arquivar ou excluir'), 9, ["onClick"]))
                                    : _createCommentVNode("", true)])
                                ]))
                              }), 128))])]))
                            : (isBusiness())
                              ? (_openBlock(), _createElementBlock("table", {
                                  key: 1,
                                  role: "table"
                                }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                  _createElementVNode("th", {
                                    scope: "col",
                                    role: "columnheader",
                                    id: "record-2-column-1"
                                  }, "Nome / razÃ£o social"),
                                  _createElementVNode("th", {
                                    scope: "col",
                                    role: "columnheader",
                                    id: "record-2-column-2"
                                  }, "Natureza"),
                                  _createElementVNode("th", {
                                    scope: "col",
                                    role: "columnheader",
                                    id: "record-2-column-3"
                                  }, "CPF / CNPJ"),
                                  _createElementVNode("th", {
                                    scope: "col",
                                    role: "columnheader",
                                    id: "record-2-column-4"
                                  }, "Contato"),
                                  _createElementVNode("th", {
                                    scope: "col",
                                    role: "columnheader",
                                    id: "record-2-column-5"
                                  }, "Categoria"),
                                  _createElementVNode("th", {
                                    scope: "col",
                                    role: "columnheader",
                                    id: "record-2-column-6"
                                  }, "SituaÃ§Ã£o"),
                                  _createElementVNode("th", {
                                    scope: "col",
                                    role: "columnheader",
                                    id: "record-2-column-7"
                                  }, "AÃ§Ãµes")
                                ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                  return (_openBlock(), _createElementBlock("tr", {
                                    role: "row",
                                    key: r.id
                                  }, [
                                    _createElementVNode("td", {
                                      role: "cell",
                                      headers: "record-2-column-1",
                                      "data-label": "Nome / razÃ£o social"
                                    }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("div", { class: "person-cell" }, [_createElementVNode("span", { class: "avatar" }, _toDisplayString(initials(r.name)), 1), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.trade_name || r.name), 1), (r.trade_name)
                                      ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(r.name), 1))
                                      : _createCommentVNode("", true)])])])]),
                                    _createElementVNode("td", {
                                      role: "cell",
                                      headers: "record-2-column-2",
                                      "data-label": "Natureza"
                                    }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.entity_kind==='organization'?'Pessoa jurÃ­dica':'Pessoa fÃ­sica'), 1)]),
                                    _createElementVNode("td", {
                                      role: "cell",
                                      headers: "record-2-column-3",
                                      "data-label": "CPF / CNPJ"
                                    }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(personDocument(r)), 1)]),
                                    _createElementVNode("td", {
                                      role: "cell",
                                      headers: "record-2-column-4",
                                      "data-label": "Contato"
                                    }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.phone || r.email || 'â€”'), 1)]),
                                    _createElementVNode("td", {
                                      role: "cell",
                                      headers: "record-2-column-5",
                                      "data-label": "Categoria"
                                    }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.business_profiles?.[businessTypes[state.page].code]?.category || 'â€”'), 1)]),
                                    _createElementVNode("td", {
                                      role: "cell",
                                      headers: "record-2-column-6",
                                      "data-label": "SituaÃ§Ã£o"
                                    }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.active?'active':'archived']) }, _toDisplayString(r.active?'Ativo':'Inativo'), 3)])]),
                                    _createElementVNode("td", {
                                      role: "cell",
                                      headers: "record-2-column-7",
                                      "data-label": "AÃ§Ãµes"
                                    }, [_createElementVNode("div", { class: "record-value" }, [((can('people.write')) && !r.archived)
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 0,
                                          class: "link-button",
                                          onClick: $event => (newBusiness(r))
                                        }, "Editar â†’", 8, ["onClick"]))
                                      : _createCommentVNode("", true)]), (can('people.write'))
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 0,
                                          class: "link-button record-manage",
                                          onClick: $event => (manageRecord(r))
                                        }, "Gerenciar exclusÃ£o", 8, ["onClick"]))
                                      : _createCommentVNode("", true)])
                                  ]))
                                }), 128))])]))
                              : (state.page==='students')
                                ? (_openBlock(), _createElementBlock("table", {
                                    key: 2,
                                    role: "table"
                                  }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                    _createElementVNode("th", {
                                      scope: "col",
                                      role: "columnheader",
                                      id: "record-3-column-1"
                                    }, "Aluno"),
                                    _createElementVNode("th", {
                                      scope: "col",
                                      role: "columnheader",
                                      id: "record-3-column-2"
                                    }, "CPF"),
                                    _createElementVNode("th", {
                                      scope: "col",
                                      role: "columnheader",
                                      id: "record-3-column-3"
                                    }, "Nascimento"),
                                    _createElementVNode("th", {
                                      scope: "col",
                                      role: "columnheader",
                                      id: "record-3-column-4"
                                    }, "Contato"),
                                    _createElementVNode("th", {
                                      scope: "col",
                                      role: "columnheader",
                                      id: "record-3-column-5"
                                    }, "SituaÃ§Ã£o"),
                                    _createElementVNode("th", {
                                      scope: "col",
                                      role: "columnheader",
                                      id: "record-3-column-6"
                                    }, "AÃ§Ãµes")
                                  ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                    return (_openBlock(), _createElementBlock("tr", {
                                      role: "row",
                                      key: r.id
                                    }, [
                                      _createElementVNode("td", {
                                        role: "cell",
                                        headers: "record-3-column-1",
                                        "data-label": "Aluno"
                                      }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r.person))
                                        ? (_openBlock(), _createElementBlock("img", {
                                            key: 0,
                                            class: "avatar",
                                            src: photoSrc(r.person),
                                            alt: 'Foto de '+r.person.name
                                          }, null, 8, ["src", "alt"]))
                                        : (_openBlock(), _createElementBlock("span", {
                                            key: 1,
                                            class: "avatar"
                                          }, _toDisplayString(initials(r.person.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.person.social_name || r.person.name), 1), _createElementVNode("small", null, _toDisplayString(r.number), 1)])])])]),
                                      _createElementVNode("td", {
                                        role: "cell",
                                        headers: "record-3-column-2",
                                        "data-label": "CPF"
                                      }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(cpf(r.person.cpf)), 1)]),
                                      _createElementVNode("td", {
                                        role: "cell",
                                        headers: "record-3-column-3",
                                        "data-label": "Nascimento"
                                      }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(date(r.person.birth_date)), 1)]),
                                      _createElementVNode("td", {
                                        role: "cell",
                                        headers: "record-3-column-4",
                                        "data-label": "Contato"
                                      }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.person.phone || 'â€”'), 1)]),
                                      _createElementVNode("td", {
                                        role: "cell",
                                        headers: "record-3-column-5",
                                        "data-label": "SituaÃ§Ã£o"
                                      }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.status]) }, _toDisplayString(label(r.status)), 3)])]),
                                      _createElementVNode("td", {
                                        role: "cell",
                                        headers: "record-3-column-6",
                                        "data-label": "AÃ§Ãµes"
                                      }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("button", {
                                        class: "link-button",
                                        onClick: $event => (viewStudent(r.id))
                                      }, "Abrir ficha â†’", 8, ["onClick"])]), (can('people.write'))
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 0,
                                            class: "link-button record-manage",
                                            onClick: $event => (manageRecord(r))
                                          }, _toDisplayString(r.archived?'Restaurar ou excluir':'Arquivar ou excluir'), 9, ["onClick"]))
                                        : _createCommentVNode("", true)])
                                    ]))
                                  }), 128))])]))
                                : (state.page==='teachers')
                                  ? (_openBlock(), _createElementBlock("table", {
                                      key: 3,
                                      role: "table"
                                    }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                      _createElementVNode("th", {
                                        scope: "col",
                                        role: "columnheader",
                                        id: "record-4-column-1"
                                      }, "Professor"),
                                      _createElementVNode("th", {
                                        scope: "col",
                                        role: "columnheader",
                                        id: "record-4-column-2"
                                      }, "MatrÃ­cula / registro"),
                                      _createElementVNode("th", {
                                        scope: "col",
                                        role: "columnheader",
                                        id: "record-4-column-3"
                                      }, "FormaÃ§Ã£o e atuaÃ§Ã£o"),
                                      _createElementVNode("th", {
                                        scope: "col",
                                        role: "columnheader",
                                        id: "record-4-column-4"
                                      }, "VÃ­nculo"),
                                      _createElementVNode("th", {
                                        scope: "col",
                                        role: "columnheader",
                                        id: "record-4-column-5"
                                      }, "AÃ§Ãµes")
                                    ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                      return (_openBlock(), _createElementBlock("tr", {
                                        role: "row",
                                        key: r.id
                                      }, [
                                        _createElementVNode("td", {
                                          role: "cell",
                                          headers: "record-4-column-1",
                                          "data-label": "Professor"
                                        }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r.person))
                                          ? (_openBlock(), _createElementBlock("img", {
                                              key: 0,
                                              class: "avatar",
                                              src: photoSrc(r.person),
                                              alt: 'Foto de '+r.person.name
                                            }, null, 8, ["src", "alt"]))
                                          : (_openBlock(), _createElementBlock("span", {
                                              key: 1,
                                              class: "avatar"
                                            }, _toDisplayString(initials(r.person.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.person.social_name || r.person.name), 1), _createElementVNode("small", null, _toDisplayString(r.person.phone || r.person.email || 'Sem contato'), 1)])])])]),
                                        _createElementVNode("td", {
                                          role: "cell",
                                          headers: "record-4-column-2",
                                          "data-label": "MatrÃ­cula / registro"
                                        }, [_createElementVNode("div", { class: "record-value" }, [_createTextVNode(_toDisplayString(r.registration_number || 'â€”'), 1), _createElementVNode("small", null, _toDisplayString(r.professional_registration || 'Sem registro profissional'), 1)])]),
                                        _createElementVNode("td", {
                                          role: "cell",
                                          headers: "record-4-column-3",
                                          "data-label": "FormaÃ§Ã£o e atuaÃ§Ã£o"
                                        }, [_createElementVNode("div", { class: "record-value" }, [_createTextVNode(_toDisplayString(r.degree_course || 'FormaÃ§Ã£o nÃ£o informada'), 1), _createElementVNode("small", null, _toDisplayString(r.teaching_areas || 'Ãreas nÃ£o informadas'), 1)])]),
                                        _createElementVNode("td", {
                                          role: "cell",
                                          headers: "record-4-column-4",
                                          "data-label": "VÃ­nculo"
                                        }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.archived?'archived':r.employment_status]) }, _toDisplayString(r.archived?'Arquivado':label(r.employment_status)), 3), _createElementVNode("small", null, _toDisplayString(label(r.employment_type)) + " Â· " + _toDisplayString(r.workload_hours || 0) + "h/semana", 1)])]),
                                        _createElementVNode("td", {
                                          role: "cell",
                                          headers: "record-4-column-5",
                                          "data-label": "AÃ§Ãµes"
                                        }, [_createElementVNode("div", { class: "record-value" }, [((can('people.write')) && !r.archived)
                                          ? (_openBlock(), _createElementBlock("button", {
                                              key: 0,
                                              class: "link-button",
                                              onClick: $event => (editTeacher(r))
                                            }, "Editar â†’", 8, ["onClick"]))
                                          : _createCommentVNode("", true)]), (can('people.write'))
                                          ? (_openBlock(), _createElementBlock("button", {
                                              key: 0,
                                              class: "link-button record-manage",
                                              onClick: $event => (manageRecord(r))
                                            }, _toDisplayString(r.archived?'Restaurar ou excluir':'Arquivar ou excluir'), 9, ["onClick"]))
                                          : _createCommentVNode("", true)])
                                      ]))
                                    }), 128))])]))
                                  : (state.page==='employees')
                                    ? (_openBlock(), _createElementBlock("table", {
                                        key: 4,
                                        role: "table"
                                      }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                        _createElementVNode("th", {
                                          scope: "col",
                                          role: "columnheader",
                                          id: "record-5-column-1"
                                        }, "FuncionÃ¡rio"),
                                        _createElementVNode("th", {
                                          scope: "col",
                                          role: "columnheader",
                                          id: "record-5-column-2"
                                        }, "MatrÃ­cula"),
                                        _createElementVNode("th", {
                                          scope: "col",
                                          role: "columnheader",
                                          id: "record-5-column-3"
                                        }, "Setor / cargo"),
                                        _createElementVNode("th", {
                                          scope: "col",
                                          role: "columnheader",
                                          id: "record-5-column-4"
                                        }, "VÃ­nculo"),
                                        _createElementVNode("th", {
                                          scope: "col",
                                          role: "columnheader",
                                          id: "record-5-column-5"
                                        }, "AÃ§Ãµes")
                                      ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                        return (_openBlock(), _createElementBlock("tr", {
                                          role: "row",
                                          key: r.id
                                        }, [
                                          _createElementVNode("td", {
                                            role: "cell",
                                            headers: "record-5-column-1",
                                            "data-label": "FuncionÃ¡rio"
                                          }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r.person))
                                            ? (_openBlock(), _createElementBlock("img", {
                                                key: 0,
                                                class: "avatar",
                                                src: photoSrc(r.person),
                                                alt: 'Foto de '+r.person.name
                                              }, null, 8, ["src", "alt"]))
                                            : (_openBlock(), _createElementBlock("span", {
                                                key: 1,
                                                class: "avatar"
                                              }, _toDisplayString(initials(r.person.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.person.social_name || r.person.name), 1), _createElementVNode("small", null, _toDisplayString(r.person.phone || r.person.email || 'Sem contato'), 1)])])])]),
                                          _createElementVNode("td", {
                                            role: "cell",
                                            headers: "record-5-column-2",
                                            "data-label": "MatrÃ­cula"
                                          }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.employee_number || 'â€”'), 1)]),
                                          _createElementVNode("td", {
                                            role: "cell",
                                            headers: "record-5-column-3",
                                            "data-label": "Setor / cargo"
                                          }, [_createElementVNode("div", { class: "record-value" }, [_createTextVNode(_toDisplayString(r.department || 'Setor nÃ£o informado'), 1), _createElementVNode("small", null, _toDisplayString(r.job_title || 'Cargo nÃ£o informado'), 1)])]),
                                          _createElementVNode("td", {
                                            role: "cell",
                                            headers: "record-5-column-4",
                                            "data-label": "VÃ­nculo"
                                          }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.archived?'archived':r.employment_status]) }, _toDisplayString(r.archived?'Arquivado':label(r.employment_status)), 3), _createElementVNode("small", null, _toDisplayString(label(r.employment_type)) + " Â· " + _toDisplayString(r.work_schedule || 'Jornada nÃ£o informada'), 1)])]),
                                          _createElementVNode("td", {
                                            role: "cell",
                                            headers: "record-5-column-5",
                                            "data-label": "AÃ§Ãµes"
                                          }, [_createElementVNode("div", { class: "record-value" }, [((can('people.write')) && !r.archived)
                                            ? (_openBlock(), _createElementBlock("button", {
                                                key: 0,
                                                class: "link-button",
                                                onClick: $event => (editEmployee(r))
                                              }, "Editar â†’", 8, ["onClick"]))
                                            : _createCommentVNode("", true)]), (can('people.write'))
                                            ? (_openBlock(), _createElementBlock("button", {
                                                key: 0,
                                                class: "link-button record-manage",
                                                onClick: $event => (manageRecord(r))
                                              }, _toDisplayString(r.archived?'Restaurar ou excluir':'Arquivar ou excluir'), 9, ["onClick"]))
                                            : _createCommentVNode("", true)])
                                        ]))
                                      }), 128))])]))
                                    : (state.page==='guardians')
                                      ? (_openBlock(), _createElementBlock("table", {
                                          key: 5,
                                          role: "table"
                                        }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                          _createElementVNode("th", {
                                            scope: "col",
                                            role: "columnheader",
                                            id: "record-6-column-1"
                                          }, "ResponsÃ¡vel"),
                                          _createElementVNode("th", {
                                            scope: "col",
                                            role: "columnheader",
                                            id: "record-6-column-2"
                                          }, "CPF"),
                                          _createElementVNode("th", {
                                            scope: "col",
                                            role: "columnheader",
                                            id: "record-6-column-3"
                                          }, "Telefone"),
                                          _createElementVNode("th", {
                                            scope: "col",
                                            role: "columnheader",
                                            id: "record-6-column-4"
                                          }, "E-mail"),
                                          _createElementVNode("th", {
                                            scope: "col",
                                            role: "columnheader",
                                            id: "record-6-column-5"
                                          }, "AÃ§Ãµes")
                                        ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                          return (_openBlock(), _createElementBlock("tr", {
                                            role: "row",
                                            key: r.id
                                          }, [
                                            _createElementVNode("td", {
                                              role: "cell",
                                              headers: "record-6-column-1",
                                              "data-label": "ResponsÃ¡vel"
                                            }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r))
                                              ? (_openBlock(), _createElementBlock("img", {
                                                  key: 0,
                                                  class: "avatar",
                                                  src: photoSrc(r),
                                                  alt: 'Foto de '+r.name
                                                }, null, 8, ["src", "alt"]))
                                              : (_openBlock(), _createElementBlock("span", {
                                                  key: 1,
                                                  class: "avatar"
                                                }, _toDisplayString(initials(r.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.social_name || r.name), 1), (r.social_name)
                                              ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(r.name), 1))
                                              : _createCommentVNode("", true)])])])]),
                                            _createElementVNode("td", {
                                              role: "cell",
                                              headers: "record-6-column-2",
                                              "data-label": "CPF"
                                            }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(cpf(r.cpf)), 1)]),
                                            _createElementVNode("td", {
                                              role: "cell",
                                              headers: "record-6-column-3",
                                              "data-label": "Telefone"
                                            }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.phone || 'â€”'), 1)]),
                                            _createElementVNode("td", {
                                              role: "cell",
                                              headers: "record-6-column-4",
                                              "data-label": "E-mail"
                                            }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.email || 'â€”'), 1)]),
                                            _createElementVNode("td", {
                                              role: "cell",
                                              headers: "record-6-column-5",
                                              "data-label": "AÃ§Ãµes"
                                            }, [_createElementVNode("div", { class: "record-value" }, [((can('people.write')) && !r.archived)
                                              ? (_openBlock(), _createElementBlock("button", {
                                                  key: 0,
                                                  class: "link-button",
                                                  onClick: $event => (editPerson(r))
                                                }, "Editar â†’", 8, ["onClick"]))
                                              : _createCommentVNode("", true)]), (can('people.write'))
                                              ? (_openBlock(), _createElementBlock("button", {
                                                  key: 0,
                                                  class: "link-button record-manage",
                                                  onClick: $event => (manageRecord(r))
                                                }, _toDisplayString(r.archived?'Restaurar ou excluir':'Arquivar ou excluir'), 9, ["onClick"]))
                                              : _createCommentVNode("", true)])
                                          ]))
                                        }), 128))])]))
                                      : (state.page==='academic')
                                        ? (_openBlock(), _createElementBlock("table", {
                                            key: 6,
                                            role: "table"
                                          }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                            _createElementVNode("th", {
                                              scope: "col",
                                              role: "columnheader",
                                              id: "record-7-column-1"
                                            }, "Nome"),
                                            _createElementVNode("th", {
                                              scope: "col",
                                              role: "columnheader",
                                              id: "record-7-column-2"
                                            }, "Detalhes"),
                                            _createElementVNode("th", {
                                              scope: "col",
                                              role: "columnheader",
                                              id: "record-7-column-3"
                                            }, "SituaÃ§Ã£o"),
                                            _createElementVNode("th", {
                                              scope: "col",
                                              role: "columnheader",
                                              id: "record-7-column-4"
                                            }, "AÃ§Ãµes")
                                          ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                            return (_openBlock(), _createElementBlock("tr", {
                                              role: "row",
                                              key: r.id
                                            }, [
                                              _createElementVNode("td", {
                                                role: "cell",
                                                headers: "record-7-column-1",
                                                "data-label": "Nome"
                                              }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("strong", null, _toDisplayString(r.name), 1)])]),
                                              _createElementVNode("td", {
                                                role: "cell",
                                                headers: "record-7-column-2",
                                                "data-label": "Detalhes"
                                              }, [_createElementVNode("div", { class: "record-value" }, [(state.catalog==='class-groups')
                                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createTextVNode(_toDisplayString(r.year_name || getName('academic-years',r.academic_year_id)) + " Â· " + _toDisplayString(r.grade_name || getName('grades',r.grade_id)) + " Â· " + _toDisplayString(r.shift_name || getName('shifts',r.shift_id)), 1), _createElementVNode("small", null, _toDisplayString(r.occupied) + " / " + _toDisplayString(r.capacity) + " vagas ocupadas Â· " + _toDisplayString(r.available) + " disponÃ­veis", 1)], 64))
                                                : (state.catalog==='academic-years')
                                                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createTextVNode(_toDisplayString(date(r.starts_on)) + " a " + _toDisplayString(date(r.ends_on)), 1)], 64))
                                                  : (state.catalog==='grades')
                                                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createTextVNode(_toDisplayString(r.level), 1)], 64))
                                                    : (state.catalog==='document-types')
                                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [_createTextVNode(_toDisplayString(r.required?'ObrigatÃ³rio':'Opcional') + " Â· " + _toDisplayString(r.grade_id?getName('grades',r.grade_id):'Todas as sÃ©ries'), 1)], 64))
                                                      : (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [_createTextVNode("Cadastro institucional")], 64))])]),
                                              _createElementVNode("td", {
                                                role: "cell",
                                                headers: "record-7-column-3",
                                                "data-label": "SituaÃ§Ã£o"
                                              }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.archived?'archived':r.status || (r.active?'active':'archived')]) }, _toDisplayString(r.archived?'Arquivado':r.status?label(r.status):(r.active?'Ativo':'Inativo')), 3)])]),
                                              _createElementVNode("td", {
                                                role: "cell",
                                                headers: "record-7-column-4",
                                                "data-label": "AÃ§Ãµes"
                                              }, [_createElementVNode("div", { class: "record-value" }, [(can(state.catalog==='document-types'?'documents.write':'academic.write') && !r.archived)
                                                ? (_openBlock(), _createElementBlock("button", {
                                                    key: 0,
                                                    class: "link-button",
                                                    onClick: $event => (newCatalog(r))
                                                  }, "Editar â†’", 8, ["onClick"]))
                                                : _createCommentVNode("", true)]), (can(state.catalog==='document-types'?'documents.write':'academic.write'))
                                                ? (_openBlock(), _createElementBlock("button", {
                                                    key: 0,
                                                    class: "link-button record-manage",
                                                    onClick: $event => (manageRecord(r))
                                                  }, _toDisplayString(r.archived?'Restaurar ou excluir':'Arquivar ou excluir'), 9, ["onClick"]))
                                                : _createCommentVNode("", true)])
                                            ]))
                                          }), 128))])]))
                                        : (state.page==='enrollments')
                                          ? (_openBlock(), _createElementBlock("table", {
                                              key: 7,
                                              role: "table"
                                            }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                              _createElementVNode("th", {
                                                scope: "col",
                                                role: "columnheader",
                                                id: "record-8-column-1"
                                              }, "MatrÃ­cula / aluno"),
                                              _createElementVNode("th", {
                                                scope: "col",
                                                role: "columnheader",
                                                id: "record-8-column-2"
                                              }, "Turma"),
                                              _createElementVNode("th", {
                                                scope: "col",
                                                role: "columnheader",
                                                id: "record-8-column-3"
                                              }, "Ano letivo"),
                                              _createElementVNode("th", {
                                                scope: "col",
                                                role: "columnheader",
                                                id: "record-8-column-4"
                                              }, "SituaÃ§Ã£o"),
                                              _createElementVNode("th", {
                                                scope: "col",
                                                role: "columnheader",
                                                id: "record-8-column-5"
                                              }, "AÃ§Ãµes")
                                            ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                              return (_openBlock(), _createElementBlock("tr", {
                                                role: "row",
                                                key: r.id
                                              }, [
                                                _createElementVNode("td", {
                                                  role: "cell",
                                                  headers: "record-8-column-1",
                                                  "data-label": "MatrÃ­cula / aluno"
                                                }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("strong", null, _toDisplayString(r.student_name), 1), _createElementVNode("small", null, _toDisplayString(r.number), 1)])]),
                                                _createElementVNode("td", {
                                                  role: "cell",
                                                  headers: "record-8-column-2",
                                                  "data-label": "Turma"
                                                }, [_createElementVNode("div", { class: "record-value" }, [_createTextVNode(_toDisplayString(r.class_name), 1), _createElementVNode("small", null, _toDisplayString(r.shift_name), 1)])]),
                                                _createElementVNode("td", {
                                                  role: "cell",
                                                  headers: "record-8-column-3",
                                                  "data-label": "Ano letivo"
                                                }, [_createElementVNode("div", { class: "record-value" }, _toDisplayString(r.year_name), 1)]),
                                                _createElementVNode("td", {
                                                  role: "cell",
                                                  headers: "record-8-column-4",
                                                  "data-label": "SituaÃ§Ã£o"
                                                }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.status]) }, _toDisplayString(enrollmentLabel(r.status)), 3)])]),
                                                _createElementVNode("td", {
                                                  role: "cell",
                                                  headers: "record-8-column-5",
                                                  "data-label": "AÃ§Ãµes"
                                                }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("button", {
                                                  class: "link-button",
                                                  onClick: $event => (viewEnrollment(r.id))
                                                }, "Detalhes â†’", 8, ["onClick"])])])
                                              ]))
                                            }), 128))])]))
                                          : (state.page==='documents')
                                            ? (_openBlock(), _createElementBlock("table", {
                                                key: 8,
                                                role: "table"
                                              }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                                _createElementVNode("th", {
                                                  scope: "col",
                                                  role: "columnheader",
                                                  id: "record-9-column-1"
                                                }, "Aluno / turma"),
                                                _createElementVNode("th", {
                                                  scope: "col",
                                                  role: "columnheader",
                                                  id: "record-9-column-2"
                                                }, "Documentos pendentes"),
                                                _createElementVNode("th", {
                                                  scope: "col",
                                                  role: "columnheader",
                                                  id: "record-9-column-3"
                                                }, "Quantidade"),
                                                _createElementVNode("th", {
                                                  scope: "col",
                                                  role: "columnheader",
                                                  id: "record-9-column-4"
                                                }, "AÃ§Ãµes")
                                              ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                                return (_openBlock(), _createElementBlock("tr", {
                                                  role: "row",
                                                  key: r.student_id
                                                }, [
                                                  _createElementVNode("td", {
                                                    role: "cell",
                                                    headers: "record-9-column-1",
                                                    "data-label": "Aluno / turma"
                                                  }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("strong", null, _toDisplayString(r.student_name), 1), _createElementVNode("small", null, _toDisplayString(r.student_number) + " Â· " + _toDisplayString(r.class_name) + " Â· " + _toDisplayString(r.year_name), 1)])]),
                                                  _createElementVNode("td", {
                                                    role: "cell",
                                                    headers: "record-9-column-2",
                                                    "data-label": "Documentos pendentes"
                                                  }, [_createElementVNode("div", { class: "record-value" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(r.documents, (d) => {
                                                    return (_openBlock(), _createElementBlock("div", { key: d.document_type_id }, [_createTextVNode(_toDisplayString(d.name) + " ", 1), _createElementVNode("span", { class: "muted" }, "Â· " + _toDisplayString(label(d.status)), 1)]))
                                                  }), 128))])]),
                                                  _createElementVNode("td", {
                                                    role: "cell",
                                                    headers: "record-9-column-3",
                                                    "data-label": "Quantidade"
                                                  }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: "badge pending" }, _toDisplayString(r.count), 1)])]),
                                                  _createElementVNode("td", {
                                                    role: "cell",
                                                    headers: "record-9-column-4",
                                                    "data-label": "AÃ§Ãµes"
                                                  }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("button", {
                                                    class: "link-button",
                                                    onClick: $event => (viewStudent(r.student_id).then(()=>state.studentTab='documentos'))
                                                  }, "Conferir â†’", 8, ["onClick"])])])
                                                ]))
                                              }), 128))])]))
                                            : (state.page==='protocols')
                                              ? (_openBlock(), _createElementBlock("table", {
                                                  key: 9,
                                                  role: "table"
                                                }, [_createElementVNode("thead", { role: "rowgroup" }, [_createElementVNode("tr", { role: "row" }, [
                                                  _createElementVNode("th", {
                                                    scope: "col",
                                                    role: "columnheader",
                                                    id: "record-10-column-1"
                                                  }, "Protocolo"),
                                                  _createElementVNode("th", {
                                                    scope: "col",
                                                    role: "columnheader",
                                                    id: "record-10-column-2"
                                                  }, "SolicitaÃ§Ã£o"),
                                                  _createElementVNode("th", {
                                                    scope: "col",
                                                    role: "columnheader",
                                                    id: "record-10-column-3"
                                                  }, "Prazo"),
                                                  _createElementVNode("th", {
                                                    scope: "col",
                                                    role: "columnheader",
                                                    id: "record-10-column-4"
                                                  }, "SituaÃ§Ã£o"),
                                                  _createElementVNode("th", {
                                                    scope: "col",
                                                    role: "columnheader",
                                                    id: "record-10-column-5"
                                                  }, "AÃ§Ãµes")
                                                ])]), _createElementVNode("tbody", { role: "rowgroup" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                                  return (_openBlock(), _createElementBlock("tr", {
                                                    role: "row",
                                                    key: r.id
                                                  }, [
                                                    _createElementVNode("td", {
                                                      role: "cell",
                                                      headers: "record-10-column-1",
                                                      "data-label": "Protocolo"
                                                    }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("strong", null, _toDisplayString(r.number), 1), _createElementVNode("small", null, _toDisplayString(date(r.created_at)), 1)])]),
                                                    _createElementVNode("td", {
                                                      role: "cell",
                                                      headers: "record-10-column-2",
                                                      "data-label": "SolicitaÃ§Ã£o"
                                                    }, [_createElementVNode("div", { class: "record-value" }, [_createTextVNode(_toDisplayString(r.kind), 1), _createElementVNode("small", { class: "truncate" }, _toDisplayString(r.description), 1)])]),
                                                    _createElementVNode("td", {
                                                      role: "cell",
                                                      headers: "record-10-column-3",
                                                      "data-label": "Prazo"
                                                    }, [_createElementVNode("div", { class: "record-value" }, [_createTextVNode(_toDisplayString(date(r.due_on)), 1), (r.overdue)
                                                      ? (_openBlock(), _createElementBlock("small", {
                                                          key: 0,
                                                          class: "danger-text"
                                                        }, "Prazo vencido"))
                                                      : _createCommentVNode("", true)])]),
                                                    _createElementVNode("td", {
                                                      role: "cell",
                                                      headers: "record-10-column-4",
                                                      "data-label": "SituaÃ§Ã£o"
                                                    }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("span", { class: _normalizeClass(["badge", r.status]) }, _toDisplayString(label(r.status)), 3)])]),
                                                    _createElementVNode("td", {
                                                      role: "cell",
                                                      headers: "record-10-column-5",
                                                      "data-label": "AÃ§Ãµes"
                                                    }, [_createElementVNode("div", { class: "record-value" }, [_createElementVNode("button", {
                                                      class: "link-button",
                                                      onClick: $event => (viewProtocol(r.id))
                                                    }, "Ver atendimento â†’", 8, ["onClick"])])])
                                                  ]))
                                                }), 128))])]))
                                              : _createCommentVNode("", true), (!state.rows.length && !state.loading)
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 10,
                                class: "empty-state"
                              }, [_createElementVNode("span", null, "â–±"), _createElementVNode("h3", null, _toDisplayString(state.page==='documents'?'Nenhuma pendÃªncia encontrada':'Nenhum registro encontrado'), 1), _createElementVNode("p", null, _toDisplayString(state.page==='documents'?'Confira tambÃ©m os tipos de documento exigidos para cada sÃ©rie.':'Cadastre o primeiro registro ou ajuste sua pesquisa.'), 1)]))
                            : _createCommentVNode("", true), (['people','students','teachers','employees','guardians','suppliers','providers','customers','partners','enrollments','documents','protocols'].includes(state.page))
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 11,
                                class: "pagination"
                              }, [_createElementVNode("span", null, _toDisplayString(state.total) + " " + _toDisplayString(state.total===1?'registro':'registros') + " Â· PÃ¡gina " + _toDisplayString(state.pageNumber), 1), _createElementVNode("div", null, [_createElementVNode("button", {
                                class: "btn btn-secondary small-button",
                                disabled: state.pageNumber<=1 || state.loading,
                                onClick: $event => (page(-1))
                              }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                                class: "btn btn-secondary small-button",
                                disabled: state.pageNumber*30>=state.total || state.loading,
                                onClick: $event => (page(1))
                              }, "PrÃ³xima", 8, ["disabled", "onClick"])])]))
                            : _createCommentVNode("", true)])
                        ]))
                      : _createCommentVNode("", true),
                    (state.page==='reports')
                      ? (_openBlock(), _createBlock(_component_reports_panel, {
                          key: state.schoolId,
                          "school-id": state.schoolId,
                          catalogs: state.catalogs
                        }, null, 8, ["school-id", "catalogs"]))
                      : _createCommentVNode("", true),
                    (state.page==='enrollments'&&can('enrollments.write'))
                      ? (_openBlock(), _createBlock(_component_enrollment_workflow, {
                          onNewPerson: $event => (newPerson()),
                          onNewStudent: $event => (newStudent()),
                          key: state.schoolId+'-enrollment-workflow',
                          "school-id": state.schoolId,
                          permissions: state.user.permissions,
                          role: state.user.role
                        }, null, 8, ["onNewPerson", "onNewStudent", "school-id", "permissions", "role"]))
                      : _createCommentVNode("", true),
                    (state.page==='community')
                      ? (_openBlock(), _createBlock(_component_school_community, {
                          key: state.schoolId,
                          "website-request": state.websiteRequest,
                          "school-id": state.schoolId,
                          permissions: state.user.permissions,
                          request: request
                        }, null, 8, ["website-request", "school-id", "permissions", "request"]))
                      : _createCommentVNode("", true),
                    (state.page==='users' && can('users.manage'))
                      ? (_openBlock(), _createBlock(_component_users_panel, {
                          key: state.schoolId+':users',
                          "school-id": state.schoolId,
                          "current-user-id": state.user.id,
                          onChanged: refreshAccess
                        }, null, 8, ["school-id", "current-user-id", "onChanged"]))
                      : _createCommentVNode("", true),
                    (['certificate','pending-signatures','signature-review'].includes(state.page))
                      ? (_openBlock(), _createBlock(_component_signing_panel, {
                          mode: state.page,
                          key: state.schoolId+':'+state.page,
                          "school-id": state.schoolId,
                          permissions: state.user.permissions,
                          role: state.user.role
                        }, null, 8, ["mode", "school-id", "permissions", "role"]))
                      : _createCommentVNode("", true),
                    (state.page==='settings')
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 24,
                          class: "institution-workspace"
                        }, [
                          _createElementVNode("header", { class: "institution-summary" }, [_createElementVNode("div", { class: "institution-mark" }, [(identity.logo_url)
                            ? (_openBlock(), _createElementBlock("img", {
                                key: 0,
                                src: identity.logo_url,
                                alt: ""
                              }, null, 8, ["src"]))
                            : (_openBlock(), _createElementBlock("svg", {
                                key: 1,
                                class: "ui-icon",
                                "aria-hidden": "true"
                              }, [_createElementVNode("use", { href: "/ui-icons.svg#school" })]))]), _createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "SUA INSTITUIÃ‡ÃƒO"), _createElementVNode("h2", null, _toDisplayString(school()?.name), 1), _createElementVNode("p", null, _toDisplayString(state.companies.find(c=>c.id===school()?.company_id)?.name), 1)]), _createElementVNode("span", { class: _normalizeClass(["badge", school()?.active?'active':'archived']) }, _toDisplayString(school()?.active?'Ativa':'Inativa'), 3)]),
                          _createElementVNode("nav", {
                            class: "institution-tabs",
                            "aria-label": "ConfiguraÃ§Ãµes da instituiÃ§Ã£o"
                          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(institutionTabs.filter(t=>state.user.role==='admin' || ['general','support'].includes(t.id)), (tab) => {
                            return (_openBlock(), _createElementBlock("button", {
                              key: tab.id,
                              type: "button",
                              "aria-pressed": state.institutionTab===tab.id,
                              class: _normalizeClass({active:state.institutionTab===tab.id}),
                              onClick: $event => (state.institutionTab=tab.id)
                            }, _toDisplayString(tab.label), 11, ["aria-pressed", "onClick"]))
                          }), 128))]),
                          (state.institutionTab==='general')
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 0,
                                class: "institution-grid"
                              }, [_createElementVNode("article", { class: "panel institution-card institution-profile" }, [_createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                class: "ui-icon",
                                "aria-hidden": "true"
                              }, [_createElementVNode("use", { href: "/ui-icons.svg#school" })])), _createElementVNode("h3", null, "Dados da escola")]), _createElementVNode("dl", { class: "institution-data" }, [
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Nome"), _createElementVNode("dd", null, _toDisplayString(school()?.name), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "EndereÃ§o"), _createElementVNode("dd", null, _toDisplayString(school()?.address || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "Telefone"), _createElementVNode("dd", null, _toDisplayString(school()?.phone || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", null, [_createElementVNode("dt", null, "E-mail"), _createElementVNode("dd", null, _toDisplayString(school()?.email || 'NÃ£o informado'), 1)]),
                                _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "Documentos para matrÃ­cula"), _createElementVNode("dd", null, _toDisplayString(school()?.document_policy==='block'?'Validar os obrigatÃ³rios antes da ativaÃ§Ã£o':'Avisar sobre pendÃªncias sem impedir a ativaÃ§Ã£o'), 1)])
                              ]), _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                class: "btn btn-secondary",
                                onClick: $event => (newSchool(school()))
                              }, "Editar dados", 8, ["onClick"]), (state.user.role==='admin')
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    class: "link-button",
                                    onClick: editMaintainer
                                  }, "Dados da mantenedora", 8, ["onClick"]))
                                : _createCommentVNode("", true)])]), _createElementVNode("article", { class: "panel institution-card" }, [
                                _createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "ui-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])), _createElementVNode("h3", null, "Unidades e organizaÃ§Ã£o")]),
                                _createElementVNode("p", null, "Organize os locais de atendimento e a estrutura que recebe seus alunos."),
                                _createElementVNode("div", { class: "institution-stat" }, [_createElementVNode("strong", null, _toDisplayString((state.catalogs.units || []).length), 1), _createElementVNode("span", null, "unidades cadastradas")]),
                                _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                  class: "btn btn-secondary",
                                  onClick: manageUnits
                                }, "Gerenciar unidades", 8, ["onClick"]), _createElementVNode("button", {
                                  class: "link-button",
                                  onClick: $event => (navigate('academic'))
                                }, "Estrutura acadÃªmica â†’", 8, ["onClick"])])
                              ]), _createElementVNode("article", { class: "panel institution-card" }, [
                                _createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "ui-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#certificate" })])), _createElementVNode("h3", null, "Certificados A1")]),
                                _createElementVNode("p", null, "Cadastre o certificado da escola e acompanhe sua validade."),
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.certificateAlerts, (notice) => {
                                  return (_openBlock(), _createElementBlock("div", {
                                    key: notice.id,
                                    class: "certificate-inline-notice"
                                  }, [_createElementVNode("strong", null, _toDisplayString(notice.title), 1), _createElementVNode("p", null, _toDisplayString(notice.message), 1)]))
                                }), 128)),
                                _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                  class: "btn btn-secondary",
                                  onClick: $event => (navigate('certificate'))
                                }, "Gerenciar certificados", 8, ["onClick"])])
                              ])]))
                            : _createCommentVNode("", true),
                          (state.institutionTab==='identity' && state.user.role==='admin')
                            ? (_openBlock(), _createElementBlock("article", {
                                key: 1,
                                class: "panel institution-card"
                              }, [
                                _createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "ui-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#school" })])), _createElementVNode("h3", null, "A identidade da sua escola")]),
                                _createElementVNode("div", { class: "identity-preview" }, [(identity.logo_url)
                                  ? (_openBlock(), _createElementBlock("img", {
                                      key: 0,
                                      src: identity.logo_url,
                                      alt: identity.display_name
                                    }, null, 8, ["src", "alt"]))
                                  : _createCommentVNode("", true), _createElementVNode("div", null, [_createElementVNode("h2", null, _toDisplayString(identity.display_name), 1), _createElementVNode("p", null, _toDisplayString(identity.short_name), 1), _createElementVNode("div", { class: "identity-swatches" }, [_createElementVNode("span", {
                                  style: _normalizeStyle({backgroundColor:identity.primary_color}),
                                  "aria-hidden": "true"
                                }, null, 4), _createElementVNode("span", {
                                  style: _normalizeStyle({backgroundColor:identity.secondary_color}),
                                  "aria-hidden": "true"
                                }, null, 4), _createElementVNode("small", null, "Cores da instituiÃ§Ã£o")])])]),
                                _createElementVNode("p", null, "Personalize o nome, a marca, as cores e a tipografia exibidos nos seus portais."),
                                _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                  class: "btn btn-primary",
                                  onClick: editIdentity
                                }, "Personalizar identidade visual", 8, ["onClick"])])
                              ]))
                            : _createCommentVNode("", true),
                          (state.institutionTab==='security' && state.user.role==='admin')
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 2,
                                class: "institution-grid"
                              }, [_createElementVNode("article", { class: "panel institution-card" }, [_createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                class: "ui-icon",
                                "aria-hidden": "true"
                              }, [_createElementVNode("use", { href: "/ui-icons.svg#access" })])), _createElementVNode("h3", null, "ProteÃ§Ã£o das contas")]), _createElementVNode("p", null, "Exija uma segunda verificaÃ§Ã£o para proteger o acesso aos dados escolares."), _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                class: "btn btn-secondary",
                                onClick: editMFAPolicy
                              }, "VerificaÃ§Ã£o em duas etapas", 8, ["onClick"])])]), _createElementVNode("article", { class: "panel institution-card" }, [_createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                class: "ui-icon",
                                "aria-hidden": "true"
                              }, [_createElementVNode("use", { href: "/ui-icons.svg#integrations" })])), _createElementVNode("h3", null, "Acesso pelo site da escola")]), _createElementVNode("p", null, "Defina quais sites podem incorporar a aplicaÃ§Ã£o."), _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                class: "btn btn-secondary",
                                onClick: editEmbedding
                              }, "Gerenciar sites autorizados", 8, ["onClick"])])]), _createElementVNode("article", { class: "panel institution-card" }, [_createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                class: "ui-icon",
                                "aria-hidden": "true"
                              }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createElementVNode("h3", null, "Preenchimento assistido")]), _createElementVNode("p", null, "Escolha se a escola permite ler documentos e consultar dados cadastrais durante o preenchimento."), _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                class: "btn btn-secondary",
                                onClick: editIntake
                              }, "Configurar preenchimento", 8, ["onClick"])])])]))
                            : _createCommentVNode("", true),
                          (state.institutionTab==='support')
                            ? (_openBlock(), _createElementBlock("article", {
                                key: 3,
                                class: "panel institution-card"
                              }, [
                                _createElementVNode("div", { class: "institution-card-title" }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "ui-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#connect" })])), _createElementVNode("h3", null, "Atendimento pelo site"), _createElementVNode("span", { class: _normalizeClass(["badge", state.supportHub.enabled?'active':'archived']) }, _toDisplayString(state.supportHub.enabled?'Ativo':'Desativado'), 3)]),
                                (supportStatus.error)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 0,
                                      class: "alert warning",
                                      role: "status"
                                    }, _toDisplayString(supportStatus.error), 1))
                                  : _createCommentVNode("", true),
                                _createElementVNode("p", null, _toDisplayString(state.supportHub.enabled?'O atendimento aparece nas Ã¡reas selecionadas desta escola.':'Ative o atendimento para disponibilizar um canal de ajuda aos usuÃ¡rios.'), 1),
                                (state.supportHub.enabled)
                                  ? (_openBlock(), _createElementBlock("dl", {
                                      key: 1,
                                      class: "institution-data"
                                    }, [_createElementVNode("div", null, [_createElementVNode("dt", null, "Ãreas habilitadas"), _createElementVNode("dd", null, _toDisplayString(supportAreaLabels()), 1)]), _createElementVNode("div", null, [_createElementVNode("dt", null, "Nome do botÃ£o"), _createElementVNode("dd", null, _toDisplayString(state.supportHub.launcher_title), 1)]), _createElementVNode("div", null, [_createElementVNode("dt", null, "PosiÃ§Ã£o"), _createElementVNode("dd", null, _toDisplayString(state.supportHub.position==='right'?'Ã€ direita':'Ã€ esquerda'), 1)])]))
                                  : _createCommentVNode("", true),
                                _createElementVNode("div", { class: "institution-card-actions" }, [_createElementVNode("button", {
                                  class: "btn btn-secondary",
                                  onClick: editSupportHub
                                }, "Configurar atendimento", 8, ["onClick"])])
                              ]))
                            : _createCommentVNode("", true)
                        ]))
                      : _createCommentVNode("", true),
                    (state.lifecycleTarget)
                      ? (_openBlock(), _createBlock(_component_lifecycle_panel, {
                          key: state.schoolId+state.lifecycleTarget.resource+state.lifecycleTarget.id,
                          "school-id": state.schoolId,
                          target: state.lifecycleTarget,
                          onClose: $event => (state.lifecycleTarget=null),
                          onCompleted: lifecycleCompleted
                        }, null, 8, ["school-id", "target", "onClose", "onCompleted"]))
                      : _createCommentVNode("", true),
                    (state.page!=='webmail')
                      ? (_openBlock(), _createElementBlock("footer", {
                          key: 26,
                          class: "content-footer"
                        }, [_createElementVNode("span", null, _toDisplayString(identity.display_name), 1), _createElementVNode("a", {
                          href: '/news.html?school='+state.schoolId,
                          target: "_blank",
                          rel: "noopener"
                        }, "Portal da escola", 8, ["href"]), _createElementVNode("span", null, "Acesso controlado Â· HistÃ³rico preservado")]))
                      : _createCommentVNode("", true)
                  ], 64))
                : _createCommentVNode("", true)
            ])], 2)
          ])), (state.modal.kind)
      ? (_openBlock(), _createElementBlock("div", {
          key: 3,
          class: "modal-backdrop",
          onClick: _withModifiers(closeModal, ["self"])
        }, [_createElementVNode("section", {
          id: "main-dialog",
          class: _normalizeClass(["modal", {'modal-person':isPersonModal(),'modal-enrollment':isEnrollmentForm(),'modal-account':state.modal.kind==='my-profile','modal-wide':isPersonModal() || state.modal.fields.length>10 || ['enrollment-detail','protocol-detail'].includes(state.modal.kind)}]),
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "modal-title"
        }, [_createElementVNode("header", { class: "modal-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name), 1), _createElementVNode("h2", {
          id: "modal-title",
          "data-dialog-title": ""
        }, _toDisplayString(state.modal.title), 1)]), (dossier.eligible(state.modal.kind))
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "person-type-picker",
              "aria-label": "Tipos de pessoa"
            }, [_createElementVNode("small", null, "Tipos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(selectedPersonTypes(), (type) => {
              return (_openBlock(), _createElementBlock("button", {
                key: type,
                type: "button",
                class: "person-type-chip",
                disabled: lockedPersonType(type) || dossier.state.loading,
                title: lockedPersonType(type)?'VÃ­nculo existente ou cadastro especÃ­fico preservado':'Remover '+personTypeLabel(type),
                onClick: $event => (togglePersonType(type))
              }, [_createTextVNode(_toDisplayString(personTypeLabel(type)) + " ", 1), (!lockedPersonType(type))
                ? (_openBlock(), _createElementBlock("span", {
                    key: 0,
                    "aria-hidden": "true"
                  }, "Ã—"))
                : _createCommentVNode("", true)], 8, ["disabled", "title", "onClick"]))
            }), 128)), _createElementVNode("details", null, [_createElementVNode("summary", null, "+ Adicionar tipo"), _createElementVNode("div", { class: "person-type-options" }, [_withDirectives(_createElementVNode("input", {
              type: "search",
              "onUpdate:modelValue": $event => ((state.personTypeQuery) = $event),
              "aria-label": "Buscar tipo de pessoa",
              placeholder: "Buscar tipoâ€¦"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.personTypeQuery]]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(availablePersonTypes(), (type) => {
              return (_openBlock(), _createElementBlock("button", {
                key: type,
                type: "button",
                disabled: dossier.state.loading,
                onClick: $event => {togglePersonType(type); $event.currentTarget.closest('details').open=false}
              }, _toDisplayString(personTypeLabel(type)), 9, ["disabled", "onClick"]))
            }), 128))])])]))
          : _createCommentVNode("", true), _createElementVNode("button", {
          class: "icon-button",
          disabled: state.busy,
          onClick: closeModal,
          "data-dialog-close": "",
          "aria-label": "Fechar janela"
        }, "Ã—", 8, ["disabled", "onClick"])]), (state.modal.kind==='enrollment-detail' && state.modal.target)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "modal-body"
            }, [
              _createElementVNode("div", { class: "enrollment-summary" }, [_createElementVNode("h3", null, _toDisplayString(state.modal.target.student_name), 1), _createElementVNode("span", { class: _normalizeClass(["badge", state.modal.target.status]) }, _toDisplayString(enrollmentLabel(state.modal.target.status)), 3), _createElementVNode("p", null, _toDisplayString(state.modal.target.class_name) + " Â· " + _toDisplayString(state.modal.target.grade_name) + " Â· " + _toDisplayString(state.modal.target.shift_name) + " Â· " + _toDisplayString(state.modal.target.year_name), 1)]),
              _createElementVNode("p", { class: "small preserve" }, _toDisplayString(state.modal.target.notes || 'Sem observaÃ§Ãµes.'), 1),
              _createElementVNode("div", { class: "actions spaced" }, [(state.modal.target.status==='draft' && can('enrollments.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-primary",
                    onClick: editDraft
                  }, "Editar prÃ©-matrÃ­cula", 8, ["onClick"]))
                : _createCommentVNode("", true), (can('documents.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 1,
                    class: "btn btn-secondary",
                    onClick: $event => (issueDocument('enrollment_form',state.modal.target))
                  }, "Ficha de matrÃ­cula PDF", 8, ["onClick"]))
                : _createCommentVNode("", true)]),
              _createElementVNode("h3", { class: "spaced" }, "Checklist documental"),
              _createElementVNode("div", { class: "checklist-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.checklist, (c) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: c.document_type_id,
                  class: "checklist-item"
                }, [_createElementVNode("span", { class: _normalizeClass(c.complete?'check-ok':'check-pending') }, _toDisplayString(c.complete?'âœ“':'!'), 3), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(c.name), 1), _createElementVNode("small", null, _toDisplayString(label(c.status)) + " Â· " + _toDisplayString(c.required?'ObrigatÃ³rio':'Opcional'), 1)])]))
              }), 128))]),
              _createElementVNode("p", { class: "small muted" }, "PolÃ­tica da escola: " + _toDisplayString(school()?.document_policy==='block'?'bloquear ativaÃ§Ã£o com documentaÃ§Ã£o obrigatÃ³ria pendente.':'avisar pendÃªncias sem bloquear a ativaÃ§Ã£o.'), 1),
              (can('enrollments.write'))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "actions movement-actions"
                  }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.actions, (action) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: action,
                      class: _normalizeClass(["btn", ['activate','reactivate'].includes(action)?'btn-primary':'btn-secondary']),
                      onClick: $event => (startMovement(action))
                    }, _toDisplayString({activate:'Ativar matrÃ­cula',change_class:'Mudar turma / turno',suspend:'Suspender',reactivate:'Reativar',transfer:'Transferir',cancel:'Cancelar matrÃ­cula',complete:'Concluir'}[action]), 11, ["onClick"]))
                  }), 128)), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: reenroll
                  }, "Rematricular â†’", 8, ["onClick"])]))
                : _createCommentVNode("", true),
              (state.modal.target.status==='active' && can('documents.write'))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 1,
                    class: "actions"
                  }, [_createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (issueDocument('enrollment_receipt',state.modal.target))
                  }, "Comprovante PDF", 8, ["onClick"]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (issueDocument('enrollment_declaration',state.modal.target))
                  }, "DeclaraÃ§Ã£o PDF", 8, ["onClick"])]))
                : _createCommentVNode("", true),
              (can('documents.read'))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 2,
                    class: "actions spaced"
                  }, [_createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (contractsForEnrollment(state.modal.target.id))
                  }, "Contratos e documentos deste perÃ­odo â†’", 8, ["onClick"])]))
                : _createCommentVNode("", true),
              _createElementVNode("h3", { class: "spaced" }, "HistÃ³rico da matrÃ­cula"),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.history, (h) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: h.id,
                  class: "timeline-item"
                }, [_createElementVNode("span", { class: "timeline-dot" }), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(h.reason), 1), _createElementVNode("small", null, _toDisplayString(date(h.created_at)) + " Â· " + _toDisplayString(enrollmentLabel(h.after.status)), 1)])]))
              }), 128))
            ]))
          : (state.modal.kind==='protocol-detail' && state.modal.target)
            ? (_openBlock(), _createElementBlock("div", {
                key: 1,
                class: "modal-body"
              }, [
                _createElementVNode("div", { class: "enrollment-summary" }, [
                  _createElementVNode("h3", null, _toDisplayString(state.modal.target.kind), 1),
                  _createElementVNode("span", { class: _normalizeClass(["badge", state.modal.target.status]) }, _toDisplayString(label(state.modal.target.status)), 3),
                  _createElementVNode("p", null, _toDisplayString(state.modal.target.student_name || 'Sem aluno vinculado') + " Â· Prazo " + _toDisplayString(date(state.modal.target.due_on)), 1),
                  (state.modal.target.overdue)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "danger-text"
                      }, "Prazo de atendimento vencido."))
                    : _createCommentVNode("", true)
                ]),
                _createElementVNode("p", { class: "preserve" }, _toDisplayString(state.modal.target.description || 'Sem descriÃ§Ã£o adicional.'), 1),
                _createElementVNode("div", { class: "actions spaced" }, [(can('protocols.write'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn btn-secondary",
                      onClick: $event => (newProtocol(state.modal.target))
                    }, "Atualizar protocolo", 8, ["onClick"]))
                  : _createCommentVNode("", true), (can('protocols.write') && !['completed','cancelled'].includes(state.modal.target.status))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 1,
                      class: "btn btn-primary",
                      onClick: protocolNote
                    }, "Registrar atendimento", 8, ["onClick"]))
                  : _createCommentVNode("", true), (can('reports.read'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 2,
                      class: "btn btn-secondary",
                      onClick: $event => (protocolReceipt(state.modal.target.id))
                    }, "Comprovante PDF", 8, ["onClick"]))
                  : _createCommentVNode("", true)]),
                _createElementVNode("h3", { class: "spaced" }, "HistÃ³rico de atendimento"),
                (state.modal.target.evidence_file_id && can('documents.read'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn btn-secondary",
                      onClick: $event => (downloadFile(state.modal.target.evidence_file_id,state.modal.target.evidence_filename))
                    }, "Baixar comprovante da ausÃªncia", 8, ["onClick"]))
                  : _createCommentVNode("", true),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.history, (h) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: h.id,
                    class: "timeline-item"
                  }, [_createElementVNode("span", { class: "timeline-dot" }), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString({created:'Protocolo aberto',updated:'Protocolo atualizado',note:'Registro de atendimento'}[h.action]), 1), _createElementVNode("p", { class: "preserve" }, _toDisplayString(h.message), 1), _createElementVNode("small", null, _toDisplayString(date(h.created_at)) + " Â· " + _toDisplayString(h.actor_name), 1)])]))
                }), 128)),
                (!state.modal.target.history?.length)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 1,
                      class: "alert info spaced"
                    }, "O histÃ³rico detalhado serÃ¡ registrado a partir desta versÃ£o. O protocolo anterior foi preservado."))
                  : _createCommentVNode("", true)
              ]))
            : (state.modal.kind==='mfa-manage')
              ? (_openBlock(), _createElementBlock("div", {
                  key: 2,
                  class: "mfa-standalone"
                }, [_createElementVNode("section", { class: "mfa-box" }, [(mfa.state.challenge || mfa.state.codes.length)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "mfa-box",
                      "aria-live": "polite"
                    }, [(mfa.state.error)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          role: "alert",
                          class: "alert error"
                        }, _toDisplayString(mfa.state.error), 1))
                      : _createCommentVNode("", true), (mfa.state.codes.length)
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                          _createElementVNode("h2", null, "Guarde seus cÃ³digos de recuperaÃ§Ã£o"),
                          _createElementVNode("p", null, "Use um cÃ³digo se perder o autenticador. Cada cÃ³digo funciona uma Ãºnica vez; eles nÃ£o serÃ£o exibidos novamente."),
                          _createElementVNode("div", { class: "mfa-codes" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(mfa.state.codes, (code) => {
                            return (_openBlock(), _createElementBlock("code", { key: code }, _toDisplayString(code), 1))
                          }), 128))]),
                          _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                            class: "btn btn-secondary",
                            type: "button",
                            onClick: mfa.downloadCodes
                          }, "Salvar cÃ³digos", 8, ["onClick"]), _createElementVNode("button", {
                            class: "btn btn-primary",
                            type: "button",
                            disabled: mfa.state.busy,
                            onClick: mfa.acknowledge
                          }, "Guardei os cÃ³digos Â· Continuar", 8, ["disabled", "onClick"])])
                        ], 64))
                      : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                          _createElementVNode("h2", null, _toDisplayString(mfa.state.enrolling?'Ative a autenticaÃ§Ã£o em duas etapas':'Confirme seu acesso'), 1),
                          (mfa.state.enrolling)
                            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("p", null, "Adicione esta conta ao seu aplicativo autenticador e informe o cÃ³digo gerado."), (mfa.state.qr)
                                ? (_openBlock(), _createElementBlock("img", {
                                    key: 0,
                                    src: mfa.state.qr,
                                    class: "mfa-qr",
                                    alt: "QR Code para configurar seu autenticador"
                                  }, null, 8, ["src"]))
                                : _createCommentVNode("", true), _createElementVNode("details", null, [_createElementVNode("summary", null, "Digitar chave manualmente"), _createElementVNode("code", { class: "mfa-secret" }, _toDisplayString(mfa.state.secret), 1)])], 64))
                            : (_openBlock(), _createElementBlock("p", { key: 1 }, "Informe o cÃ³digo do autenticador ou um cÃ³digo de recuperaÃ§Ã£o.")),
                          _createElementVNode("label", { class: "field" }, [_createTextVNode(_toDisplayString(mfa.state.enrolling?'CÃ³digo de 6 dÃ­gitos':'CÃ³digo do autenticador ou de recuperaÃ§Ã£o'), 1), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((mfa.state.code) = $event),
                            autocomplete: "one-time-code",
                            inputmode: mfa.state.enrolling?'numeric':'text',
                            maxlength: "30",
                            disabled: mfa.state.busy,
                            onKeydown: _withKeys(_withModifiers(mfa.finish, ["prevent"]), ["enter"])
                          }, null, 40, ["onUpdate:modelValue", "inputmode", "disabled", "onKeydown"]), [[_vModelText, mfa.state.code]])]),
                          _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                            type: "button",
                            class: "btn btn-secondary",
                            disabled: mfa.state.busy,
                            onClick: mfa.cancel
                          }, "Voltar", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                            type: "button",
                            class: "btn btn-primary",
                            disabled: mfa.state.busy || !mfa.state.code,
                            onClick: mfa.finish
                          }, _toDisplayString(mfa.state.busy?'Validandoâ€¦':'Confirmar'), 9, ["disabled", "onClick"])])
                        ], 64))]))
                  : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                      _createElementVNode("h3", null, "AutenticaÃ§Ã£o em duas etapas"),
                      _createElementVNode("p", null, _toDisplayString(mfa.state.status.enabled?'2FA ativado nesta conta.':'2FA ainda nÃ£o ativado nesta conta.') + " " + _toDisplayString(mfa.state.status.required?'ObrigatÃ³rio pela instituiÃ§Ã£o.':'Uso opcional pela instituiÃ§Ã£o.'), 1),
                      (mfa.state.status.enabled)
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 0,
                            class: "small muted"
                          }, _toDisplayString(mfa.state.status.recovery_remaining) + " cÃ³digos de recuperaÃ§Ã£o disponÃ­veis.", 1))
                        : _createCommentVNode("", true),
                      (mfa.state.error)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 1,
                            class: "alert error",
                            role: "alert"
                          }, _toDisplayString(mfa.state.error), 1))
                        : _createCommentVNode("", true),
                      _createElementVNode("label", { class: "field" }, [_createTextVNode("Senha atual"), _withDirectives(_createElementVNode("input", {
                        type: "password",
                        "onUpdate:modelValue": $event => ((mfa.state.password) = $event),
                        autocomplete: "current-password",
                        maxlength: "128",
                        disabled: mfa.state.busy
                      }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, mfa.state.password]])]),
                      (mfa.state.status.enabled)
                        ? (_openBlock(), _createElementBlock("label", {
                            key: 2,
                            class: "field"
                          }, [_createTextVNode("CÃ³digo do autenticador ou de recuperaÃ§Ã£o"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((mfa.state.code) = $event),
                            autocomplete: "one-time-code",
                            maxlength: "30",
                            disabled: mfa.state.busy
                          }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, mfa.state.code]])]))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", { class: "actions" }, [(!mfa.state.status.enabled)
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "btn btn-primary",
                            type: "button",
                            disabled: mfa.state.busy || !mfa.state.password,
                            onClick: mfa.enroll
                          }, "Configurar 2FA", 8, ["disabled", "onClick"]))
                        : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("button", {
                            type: "button",
                            class: "btn btn-secondary",
                            disabled: mfa.state.busy || !mfa.state.password || !mfa.state.code,
                            onClick: mfa.recovery
                          }, "Gerar novos cÃ³digos", 8, ["disabled", "onClick"]), (!mfa.state.status.required)
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                type: "button",
                                class: "btn btn-secondary",
                                disabled: mfa.state.busy || !mfa.state.password || !mfa.state.code,
                                onClick: mfa.disable
                              }, "Desativar 2FA", 8, ["disabled", "onClick"]))
                            : _createCommentVNode("", true)], 64))])
                    ], 64))])]))
              : (_openBlock(), _createElementBlock("form", {
                  key: 3,
                  onSubmit: _withModifiers($event => (saveModal()), ["prevent"]),
                  class: "modal-form",
                  novalidate: ""
                }, [(state.discardChanges)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "discard-banner",
                      role: "alert"
                    }, [_createElementVNode("span", null, "Existem alteraÃ§Ãµes nÃ£o salvas. Deseja descartÃ¡-las?"), _createElementVNode("button", {
                      type: "button",
                      class: "btn btn-secondary",
                      onClick: $event => (state.discardChanges=false)
                    }, "Continuar editando", 8, ["onClick"]), _createElementVNode("button", {
                      type: "button",
                      class: "btn btn-danger",
                      onClick: $event => (closeModal(true))
                    }, "Descartar alteraÃ§Ãµes", 8, ["onClick"])]))
                  : _createCommentVNode("", true), _createElementVNode("div", { class: _normalizeClass(["modal-workspace", {sectioned:modalSections().length>1 && !isEnrollmentForm(),'enrollment-workspace':isEnrollmentForm()}]) }, [(modalSections().length>1 && !isEnrollmentForm())
                  ? (_openBlock(), _createElementBlock("nav", {
                      key: 0,
                      class: "form-section-nav",
                      "aria-label": "SeÃ§Ãµes do cadastro"
                    }, [_createElementVNode("div", { class: "form-profile" }, [_createElementVNode("span", { class: "avatar" }, _toDisplayString(initials(state.modal.form.name || state.modal.target?.name || state.modal.title)), 1), _createElementVNode("strong", null, _toDisplayString(state.modal.form.name || state.modal.target?.name || 'Novo cadastro'), 1), _createElementVNode("small", null, _toDisplayString(state.modal.form.entity_kind==='organization'?'Pessoa jurÃ­dica':'Ficha cadastral'), 1)]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(modalSections(), (section, i) => {
                      return (_openBlock(), _createElementBlock("button", {
                        key: section.id,
                        type: "button",
                        "data-section-target": section.id,
                        onClick: $event => (modalTab(section.id)),
                        class: _normalizeClass({active:visibleSection(section.id)}),
                        "aria-current": visibleSection(section.id)?'step':undefined
                      }, [_createElementVNode("span", null, _toDisplayString(String(i+1).padStart(2,'0')), 1), _createTextVNode(_toDisplayString(section.title), 1), _createElementVNode("i", { "aria-hidden": "true" }, "â€º")], 10, ["data-section-target", "onClick", "aria-current"]))
                    }), 128)), _createElementVNode("p", { class: "small muted" }, "Os dados permanecem preenchidos ao trocar de seÃ§Ã£o. Salve para confirmar.")]))
                  : _createCommentVNode("", true), _createElementVNode("div", { class: "modal-body" }, [
                  (assistEligible() && !dossier.state.loading)
                    ? (_openBlock(), _createBlock(_component_assist_panel, {
                        key: state.modal.kind+String(state.modal.target?.id||'new')+state.assistSource,
                        target: state.modal.form,
                        fields: assistFields(),
                        request: assistRequest,
                        root: base(),
                        "lookup-root": assistCompany()?'/institution':'',
                        ocr: isPersonModal(),
                        cnpj: assistCompany() || state.modal.form.entity_kind==='organization',
                        mapping: assistCompany()?{cnpj:'document'}:{},
                        label: state.modal.title+' Â· '+(state.modal.form.name || 'novo registro'),
                        source: state.assistSource
                      }, null, 8, ["target", "fields", "request", "root", "lookup-root", "ocr", "cnpj", "mapping", "label", "source"]))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='intake-settings')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 1,
                        class: "alert info"
                      }, "Confira os dados sugeridos antes de salvar. A leitura auxilia o preenchimento e nÃ£o valida a autenticidade dos documentos."))
                    : _createCommentVNode("", true),
                  (state.modal.error)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 2,
                        class: "alert error preserve",
                        role: "alert"
                      }, _toDisplayString(state.modal.error), 1))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='enrollment')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 3,
                        class: "enrollment-stage"
                      }, [_createElementVNode("span", { class: "badge draft" }, "PrÃ©-matrÃ­cula"), _createElementVNode("p", null, "O rascunho permite continuar depois. Ao efetivar, o sistema confere os requisitos e ocupa a vaga.")]))
                    : _createCommentVNode("", true),
                  (enrollmentLinkStudentId() && can('people.write') && can('students.read'))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 4,
                        type: "button",
                        class: "btn btn-secondary",
                        disabled: state.busy,
                        onClick: linkFromEnrollment
                      }, "Vincular ou revisar responsÃ¡vel", 8, ["disabled", "onClick"]))
                    : _createCommentVNode("", true),
                  (state.modal.enrollmentReturn)
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 5,
                        class: "alert info"
                      }, [_createElementVNode("strong", null, "ResponsÃ¡veis de " + _toDisplayString(state.modal.enrollmentReturn.student.person.name), 1), _createElementVNode("p", null, "Ao salvar o vÃ­nculo, vocÃª voltarÃ¡ Ã  matrÃ­cula com a turma e os dados preenchidos."), (state.modal.kind==='link' && state.modal.enrollmentReturn.student.guardians?.length)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("p", null, "Para alterar uma pessoa jÃ¡ vinculada, selecione seu nome."), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.enrollmentReturn.student.guardians, (link) => {
                            return (_openBlock(), _createElementBlock("button", {
                              key: link.id,
                              type: "button",
                              class: "link-button",
                              onClick: $event => (editLink(link))
                            }, "Editar " + _toDisplayString(link.person.name), 9, ["onClick"]))
                          }), 128))], 64))
                        : _createCommentVNode("", true)]))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='draft-edit')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 6,
                        class: "alert info"
                      }, "Aluno e ano letivo sÃ£o preservados. A alteraÃ§Ã£o exige justificativa e permanece no histÃ³rico. Rascunhos nÃ£o reservam vaga."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='protocol-note')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 7,
                        class: "alert info"
                      }, "O registro serÃ¡ acrescentado ao histÃ³rico sem substituir os atendimentos anteriores."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='reenroll')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 8,
                        class: "alert info"
                      }, "SerÃ¡ criada outra matrÃ­cula em um perÃ­odo posterior. A matrÃ­cula anterior nÃ£o serÃ¡ sobrescrita."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='my-profile')
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 9,
                        class: "account-summary"
                      }, [_createElementVNode("div", { class: "account-photo" }, [(!state.modal.form.remove_photo && (state.profilePhotoPreview || state.userPhotoUrl))
                        ? (_openBlock(), _createElementBlock("img", {
                            key: 0,
                            src: state.profilePhotoPreview || state.userPhotoUrl,
                            alt: "PrÃ©via da foto"
                          }, null, 8, ["src"]))
                        : (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(initials(state.modal.form.name)), 1))]), _createElementVNode("div", null, [
                        _createElementVNode("h3", null, _toDisplayString(state.modal.form.name || 'Meu perfil'), 1),
                        _createElementVNode("p", null, _toDisplayString(label(state.user.role)) + " Â· " + _toDisplayString(identity.display_name), 1),
                        _createElementVNode("small", null, "O perfil de acesso e as unidades sÃ£o definidos pela administraÃ§Ã£o."),
                        _createElementVNode("br"),
                        _createElementVNode("button", {
                          class: "link-button",
                          type: "button",
                          onClick: profilePassword
                        }, "Alterar minha senha", 8, ["onClick"]),
                        _createTextVNode(),
                        _createElementVNode("button", {
                          class: "link-button",
                          type: "button",
                          onClick: manageMFA
                        }, "SeguranÃ§a Â· 2FA", 8, ["onClick"])
                      ])]))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='mfa-policy')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 10,
                        class: "alert info mfa-policy-hint"
                      }, "A exigÃªncia vale para todas as contas desta instalaÃ§Ã£o, incluindo o portal. Quem nÃ£o configurou o autenticador deve ativÃ¡-lo antes de acessar dados. Alterar a polÃ­tica encerra as sessÃµes abertas; desmarcar a exigÃªncia nÃ£o desativa o 2FA jÃ¡ configurado por cada usuÃ¡rio."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='embedding-security')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 11,
                        class: "embedding-notice"
                      }, [
                        _createElementVNode("button", {
                          type: "button",
                          class: "btn btn-secondary",
                          disabled: state.embeddingProbe.busy,
                          onClick: probeEmbedding
                        }, _toDisplayString(state.embeddingProbe.busy?'Verificandoâ€¦':'Verificar resposta pÃºblica de iframe'), 9, ["disabled", "onClick"]),
                        (state.embeddingProbe.message)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "alert info preserve",
                              role: "status"
                            }, [
                              _createTextVNode(_toDisplayString(state.embeddingProbe.message), 1),
                              _createElementVNode("br"),
                              _createTextVNode(_toDisplayString(state.embeddingProbe.frame_policy), 1),
                              _createElementVNode("br"),
                              _createTextVNode(_toDisplayString(state.embeddingProbe.x_frame_options?'X-Frame-Options: '+state.embeddingProbe.x_frame_options:''), 1)
                            ]))
                          : _createCommentVNode("", true),
                        _createElementVNode("p", { class: "alert info" }, [_createTextVNode("Informe a origem completa: "), _createElementVNode("strong", null, "https://hub-dev.argws.com.br"), _createTextVNode(". Sem caminhos, curingas ou credenciais. Cada subdomÃ­nio e porta precisam de autorizaÃ§Ã£o prÃ³pria.")]),
                        (!state.modal.target.https_ready)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 1,
                              class: "alert warning"
                            }, "Antes de ativar: configure APP_URL com HTTPS e COOKIE_SECURE=true no ambiente da aplicaÃ§Ã£o."))
                          : _createCommentVNode("", true),
                        _createElementVNode("p", { class: "small muted" }, "Origem da aplicaÃ§Ã£o: " + _toDisplayString(state.modal.target.app_origin) + ". ConfiguraÃ§Ã£o atual: " + _toDisplayString(state.modal.target.source==='environment'?'padrÃ£o do ambiente':'salva na instituiÃ§Ã£o') + ".", 1),
                        _createElementVNode("p", { class: "small muted" }, "Ao mudar a lista ou a ativaÃ§Ã£o, as sessÃµes abertas serÃ£o encerradas. A nova autorizaÃ§Ã£o vale no prÃ³ximo carregamento; o navegador continuarÃ¡ exigindo login. Um proxy com bloqueio prÃ³prio de iframe tambÃ©m precisa ser ajustado.")
                      ]))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='identity')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 12,
                        class: "alert info"
                      }, "O nome deve ter atÃ© 160 caracteres e o nome curto atÃ© 30. Logotipo e fonte: atÃ© 2 MB cada. Nenhuma fonte externa Ã© necessÃ¡ria. Use uma fonte TTF ou WOFF2 estÃ¡tica licenciada para tela e incorporaÃ§Ã£o em PDF. Sem arquivo prÃ³prio, o PDF usa uma fonte equivalente serifada ou sem serifa."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='upload')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 13,
                        class: "alert info"
                      }, "Limite padrÃ£o de 10 MB. O recebimento nÃ£o substitui a validaÃ§Ã£o documental pela Secretaria."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='support-hub')
                    ? (_openBlock(), _createElementBlock("fieldset", {
                        key: 14,
                        class: "panel"
                      }, [_createElementVNode("legend", null, "Onde exibir o atendimento"), _createElementVNode("p", { class: "small muted" }, "Escolha as Ã¡reas desta escola que terÃ£o o botÃ£o de atendimento."), _createElementVNode("div", { class: "form-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(supportAreas, (area) => {
                        return (_openBlock(), _createElementBlock("label", {
                          key: area.value,
                          class: "checkbox-label"
                        }, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((state.modal.form.enabled_areas) = $event),
                          value: area.value
                        }, null, 8, ["onUpdate:modelValue", "value"]), [[_vModelCheckbox, state.modal.form.enabled_areas]]), _createElementVNode("span", null, _toDisplayString(area.label), 1)]))
                      }), 128))])]))
                    : _createCommentVNode("", true),
                  (familyRelevant())
                    ? _withDirectives((_openBlock(), _createElementBlock("section", {
                        key: 15,
                        class: "family-editor",
                        "data-form-section": "links"
                      }, [
                        _createElementVNode("div", { class: "form-section-heading" }, [_createElementVNode("h3", null, "VÃ­nculos"), _createElementVNode("p", null, "Um Ãºnico relacionamento, visÃ­vel na ficha do aluno e da famÃ­lia. Parentesco nÃ£o concede responsabilidades automaticamente.")]),
                        (dossier.state.error)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "alert error",
                              role: "alert"
                            }, _toDisplayString(dossier.state.error), 1))
                          : _createCommentVNode("", true),
                        (!dossier.state.editor)
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 1,
                              type: "button",
                              class: "btn btn-secondary",
                              disabled: dossier.state.loading,
                              onClick: $event => (dossier.begin(selectedPersonTypes().includes('student')))
                            }, "Adicionar vÃ­nculo", 8, ["disabled", "onClick"]))
                          : _createCommentVNode("", true),
                        (dossier.state.editor)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 2,
                              class: "family-draft"
                            }, [
                              _createElementVNode("div", { class: "form-grid" }, [
                                (!dossier.state.editId)
                                  ? (_openBlock(), _createElementBlock("label", {
                                      key: 0,
                                      class: "field"
                                    }, [_createTextVNode("Vincular ao cadastro atual"), _withDirectives(_createElementVNode("select", {
                                      "onUpdate:modelValue": $event => ((dossier.state.draft.direction) = $event),
                                      onChange: dossier.search
                                    }, [(selectedPersonTypes().includes('student'))
                                      ? (_openBlock(), _createElementBlock("option", {
                                          key: 0,
                                          value: "guardian"
                                        }, "Familiar / responsÃ¡vel"))
                                      : _createCommentVNode("", true), _createElementVNode("option", { value: "student" }, "Aluno")], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, dossier.state.draft.direction]])]))
                                  : _createCommentVNode("", true),
                                _createElementVNode("label", { class: "field" }, [_createTextVNode("Parentesco / relacionamento"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((dossier.state.draft.relationship) = $event) }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['ResponsÃ¡vel','MÃ£e','Pai','AvÃ³','AvÃ´','Tia','Tio','IrmÃ£','IrmÃ£o','Tutor(a)','Outro'], (name) => {
                                  return (_openBlock(), _createElementBlock("option", { key: name }, _toDisplayString(name), 1))
                                }), 128)), (!['ResponsÃ¡vel','MÃ£e','Pai','AvÃ³','AvÃ´','Tia','Tio','IrmÃ£','IrmÃ£o','Tutor(a)','Outro'].includes(dossier.state.draft.relationship))
                                  ? (_openBlock(), _createElementBlock("option", { key: 0 }, _toDisplayString(dossier.state.draft.relationship), 1))
                                  : _createCommentVNode("", true)], 8, ["onUpdate:modelValue"]), [[_vModelSelect, dossier.state.draft.relationship]])]),
                                (!dossier.state.editId)
                                  ? (_openBlock(), _createElementBlock("div", {
                                      key: 1,
                                      class: "field wide"
                                    }, [_createElementVNode("label", { class: "checkbox-field" }, [_withDirectives(_createElementVNode("input", {
                                      type: "checkbox",
                                      "onUpdate:modelValue": $event => ((dossier.state.draft.newMode) = $event),
                                      onChange: $event => (dossier.state.draft.person_id='')
                                    }, null, 40, ["onUpdate:modelValue", "onChange"]), [[_vModelCheckbox, dossier.state.draft.newMode]]), _createTextVNode("Cadastrar " + _toDisplayString(dossier.state.draft.direction==='student'?'novo aluno':'nova pessoa') + " nesta ficha", 1)])]))
                                  : _createCommentVNode("", true),
                                (dossier.state.draft.newMode)
                                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                                      _createElementVNode("div", { class: "wide" }, [_createVNode(_component_assist_panel, {
                                        target: dossier.state.draft,
                                        fields: familyAssistFields,
                                        request: assistRequest,
                                        root: base(),
                                        label: dossier.state.draft.direction==='guardian'?'familiar / responsÃ¡vel a vincular':'aluno a vincular'
                                      }, null, 8, ["target", "fields", "request", "root", "label"])]),
                                      _createElementVNode("label", { class: "field" }, [_createTextVNode("Nome completo"), _withDirectives(_createElementVNode("input", {
                                        "onUpdate:modelValue": $event => ((dossier.state.draft.name) = $event),
                                        maxlength: "180"
                                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.name]])]),
                                      _createElementVNode("label", { class: "field" }, [_createTextVNode("CPF"), _withDirectives(_createElementVNode("input", {
                                        "onUpdate:modelValue": $event => ((dossier.state.draft.cpf) = $event),
                                        maxlength: "14"
                                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.cpf]])]),
                                      _createElementVNode("label", { class: "field" }, [_createTextVNode("Data de nascimento" + _toDisplayString(dossier.state.draft.direction==='student'?' *':''), 1), _withDirectives(_createElementVNode("input", {
                                        type: "date",
                                        "onUpdate:modelValue": $event => ((dossier.state.draft.birth_date) = $event)
                                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.birth_date]])]),
                                      _createElementVNode("label", { class: "field" }, [_createTextVNode("Telefone"), _withDirectives(_createElementVNode("input", {
                                        type: "tel",
                                        "onUpdate:modelValue": $event => ((dossier.state.draft.phone) = $event),
                                        maxlength: "32"
                                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.phone]])]),
                                      _createElementVNode("label", { class: "field" }, [_createTextVNode("E-mail"), _withDirectives(_createElementVNode("input", {
                                        type: "email",
                                        "onUpdate:modelValue": $event => ((dossier.state.draft.email) = $event),
                                        maxlength: "254"
                                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.email]])]),
                                      _createElementVNode("details", { class: "wide" }, [_createElementVNode("summary", null, "Documentos e endereÃ§o da pessoa a vincular"), _createElementVNode("div", { class: "form-grid" }, [
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("RG"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.rg) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.rg]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Ã“rgÃ£o emissor"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.rg_issuer) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.rg_issuer]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("CertidÃ£o"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.birth_certificate) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.birth_certificate]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Nome da mÃ£e"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.mother_name) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.mother_name]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Nome do pai"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.father_name) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.father_name]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("CEP"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.postal_code) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.postal_code]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Logradouro"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.street) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.street]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("NÃºmero"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.address_number) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.address_number]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Complemento"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.address_complement) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.address_complement]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Bairro"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.district) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.district]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Cidade"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.city) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.city]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("UF"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.state) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.state]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("PaÃ­s"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.country) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.country]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("EndereÃ§o completo"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.address) = $event),
                                          maxlength: "400"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.address]])])
                                      ])])
                                    ], 64))
                                  : (!dossier.state.editId)
                                    ? (_openBlock(), _createElementBlock("div", {
                                        key: 3,
                                        class: "field wide"
                                      }, [
                                        _createElementVNode("label", null, [_createTextVNode("Buscar " + _toDisplayString(dossier.state.draft.direction==='student'?'aluno':'pessoa') + " existente", 1), _withDirectives(_createElementVNode("input", {
                                          type: "search",
                                          "onUpdate:modelValue": $event => ((dossier.state.query) = $event),
                                          placeholder: "Nome ou CPF Â· mÃ­nimo 2 caracteres",
                                          onInput: dossier.search,
                                          onKeydown: _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])
                                        }, null, 40, ["onUpdate:modelValue", "onInput", "onKeydown"]), [[_vModelText, dossier.state.query]])]),
                                        (dossier.state.searching)
                                          ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Buscandoâ€¦"))
                                          : _createCommentVNode("", true),
                                        _createElementVNode("div", { class: "family-matches" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(dossier.state.matches, (person) => {
                                          return (_openBlock(), _createElementBlock("button", {
                                            key: person.id,
                                            type: "button",
                                            onClick: $event => (dossier.choose(person))
                                          }, _toDisplayString(person.name) + " Â· " + _toDisplayString(cpf(person.cpf)), 9, ["onClick"]))
                                        }), 128))]),
                                        (dossier.state.draft.person_id)
                                          ? (_openBlock(), _createElementBlock("small", { key: 1 }, "Selecionado: " + _toDisplayString(dossier.state.draft.name), 1))
                                          : _createCommentVNode("", true)
                                      ]))
                                    : (_openBlock(), _createElementBlock("p", {
                                        key: 4,
                                        class: "field wide"
                                      }, [_createElementVNode("strong", null, _toDisplayString(dossier.state.draft.name), 1)]))
                              ]),
                              _createElementVNode("div", { class: "family-flags" }, [
                                _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                  type: "checkbox",
                                  "onUpdate:modelValue": $event => ((dossier.state.draft.legal) = $event)
                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, dossier.state.draft.legal]]), _createTextVNode("ResponsÃ¡vel legal")]),
                                _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                  type: "checkbox",
                                  "onUpdate:modelValue": $event => ((dossier.state.draft.financial) = $event)
                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, dossier.state.draft.financial]]), _createTextVNode("ResponsÃ¡vel financeiro")]),
                                _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                  type: "checkbox",
                                  "onUpdate:modelValue": $event => ((dossier.state.draft.pickup) = $event)
                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, dossier.state.draft.pickup]]), _createTextVNode("Autorizado a retirar")]),
                                _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                  type: "checkbox",
                                  "onUpdate:modelValue": $event => ((dossier.state.draft.primary_contact) = $event)
                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, dossier.state.draft.primary_contact]]), _createTextVNode("Contato principal")])
                              ]),
                              _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                                type: "button",
                                class: "btn btn-secondary",
                                onClick: dossier.cancelEditor
                              }, "Cancelar vÃ­nculo", 8, ["onClick"]), _createElementVNode("button", {
                                type: "button",
                                class: "btn btn-primary",
                                onClick: dossier.stage
                              }, "Adicionar Ã  ficha", 8, ["onClick"])]),
                              _createElementVNode("small", null, "SerÃ¡ gravado junto com o cadastro ao clicar em Salvar.")
                            ]))
                          : _createCommentVNode("", true),
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(dossier.state.rows, (row) => {
                          return (_openBlock(), _createElementBlock("article", {
                            key: row.id,
                            class: _normalizeClass(["family-row", {inactive:!row.active}])
                          }, [_createElementVNode("div", null, [
                            _createElementVNode("strong", null, _toDisplayString(row.peer.name), 1),
                            _createElementVNode("span", null, _toDisplayString(row.direction==='student'?'Aluno Â· ':'') + _toDisplayString(row.relationship) + " Â· " + _toDisplayString(row.active?'Ativo':'Inativo'), 1),
                            _createElementVNode("small", null, _toDisplayString([row.legal?'Legal':'',row.financial?'Financeiro':'',row.pickupïž½óFòµë(š+myÚÖöFòâ"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ%&W7VÇFF÷2FòW,:ÖöFò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6öç7VÇFR2æ÷F2Rg&W\:¦æ6–6öç6öÆ–FF2VÆ6ö÷&FVæ:|:6òâ"•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öf–ÇFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W,:ÖöFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçE'VÆTf÷&ÒçW&–öEö–B’ÒFWfVçB’À¢öä6†ævS¢FWfVçBÓâ·6VÆV7E'VÆUW&–öB‡7FFRæ76W76ÖVçE'VÆTf÷&ÒçW&–öEö–B“·7FFRçW&–öE&W7VÇG3Õµ×Ð¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçW&–öG2æf–ÇFW"‡ƒÓç‚æ6FVÖ–5÷–V%ö–CÓÓ×7FFRç6VÆV7FVBæ6FVÖ–5÷–V%ö–B’Â‡’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢æ–BÀ¢fÇVS¢æ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡ææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ76W76ÖVçE'VÆTf÷&ÒçW&–öEö–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢ÆöEW&–öE&W7VÇG2À¢F—6&ÆVC¢7FFRæ76W76ÖVçE'VÆTf÷&ÒçW&–öEö–@¢ÒÂ$6öç7VÇF""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Â†6â‚vF–'’ç&Wf–Wrr’bb²v÷VârÂw&Wf–WvVBuÒæ–æ6ÇVFW2‡7FFRç6VÆV7FVBç7FGW2’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢6öç6öÆ–FFUW&–öBÀ¢F—6&ÆVC¢7FFRæ76W76ÖVçE'VÆTf÷&ÒçW&–öEö–@¢ÒÂ$6öç6öÆ–F"v÷&"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢‡7FFRçW&–öE&W7VÇG2ç6öÖR‡#Óç"ç&WV—&W5÷&V6Æ7VÆF–öâ’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ$Œ:&W7VÇFF÷26Æ7VÆF÷26öÒVÒ7&—L:—&–òçFW&–÷"FRg&W\:¦æ6–â6ö÷&FVæ:|:6òFWfR6öç6öÆ–F"æ÷fÖVçFRòW,:ÖöFòâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRçW&–öE&W7VÇG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'F&ÆR×w& ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$ÇVæò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%&W7VÇFFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$g&W\:¦æ6–"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%6—GV:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$ö'6W'f:|;VW2"¢Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçW&–öE&W7VÇG2Â‡"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢"æ–BÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡"ç7GVFVçEöæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡"ç7GVFVçEöçVÖ&W"’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡"æçVÖW&–5÷fÇVSó÷"æ6öæ6WE÷fÇVSóò~(	Br’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡"ç&WV—&W5÷&V6Æ7VÆF–öãòu&V6Æ7VÆ"s§"æ6Æ7VÆF–öãòæGFVæFæ6U÷W&6VçBÖçVÆÃôçVÖ&W"‡"æ6Æ7VÆF–öâæGFVæFæ6U÷W&6VçB’çFôÆö6ÆU7G&–ær‚wBÔ%"rÇ¶Ö†–×VÔg&7F–öäF–v—G3£Ò’²rRs¢~(	Br’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†Æ&VÂ‡"ç7FGW2’’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‚‡"æfÆw7ÇÅµÒ’æÖ†Æ&VÂ’æ¦ö–â‚rÂr—ÇÂ~(	Br’Â¢Ò’¢Ò’Â#‚’•Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’À¢‡7FFRç6VÆV7FVBç7FGW3ÓÓÒv÷Vârbb6â‚vF–'’æ76W76ÖVçG2r’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæ76W76ÖVçDVF—F–æsòtVF—F"fÆ–:|:6òs¢tæ÷ffÆ–:|:6òr’Â’Â‡7FFRæ76W76ÖVçDVF—F–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢6æ6VÄ76W76ÖVçDVF—@¢ÒÂ$6æ6VÆ"VFœ:|:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢'‚Öf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2†7&VFT76W76ÖVçBÂ²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%L:×GVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&ÒçF—FÆR’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢#c ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ76W76ÖVçDf÷&ÒçF—FÆUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%F—ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&Òæ¶–æB’ÒFWfVçB’ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&7F—f—G’"ÒÂ$F—f–FFR"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&W†Ò"ÒÂ%&÷f"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'&ö¦V7B"ÒÂ%&ö¦WFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'&V6÷fW'’"ÒÂ%&V7WW&:|:6ò"’À¢‚²v7F—f—G’rÂvW†ÒrÂw&ö¦V7BrÂw&V6÷fW'’uÒæ–æ6ÇVFW2‡7FFRæ76W76ÖVçDf÷&Òæ¶–æB’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢À¢fÇVS¢7FFRæ76W76ÖVçDf÷&Òæ¶–æ@¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ76W76ÖVçDf÷&Òæ¶–æB’Â’Â²'fÇVR%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ76W76ÖVçDf÷&Òæ¶–æEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FF"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFR"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&Òæ76W76ÖVçEöFFR’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ76W76ÖVçDf÷&Òæ76W76ÖVçEöFFUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W,:ÖöFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&Òæ6FVÖ–5÷W&–öEö–B’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÒW,:ÖöFò"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçW&–öG2æf–ÇFW"‡ƒÓç‚æ6FVÖ–5÷–V%ö–CÓÓ×7FFRç6VÆV7FVBæ6FVÖ–5÷–V%ö–B’Â‡’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢æ–BÀ¢fÇVS¢æ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡ææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ76W76ÖVçDf÷&Òæ6FVÖ–5÷W&–öEö–EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$f÷&ÖFR&W7VÇFFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&ÒçfÇVU÷G—R’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&çVÖW&–2"ÒÂ$æ÷FçVÜ:—&–6"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&6öæ6WB"ÒÂ$6öæ6V—Fò"•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ76W76ÖVçDf÷&ÒçfÇVU÷G—UÕÒ•Ò’À¢‡7FFRæ76W76ÖVçDf÷&ÒçfÇVU÷G—SÓÓÒvçVÖW&–2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%fÆ÷"Ü:†–Öò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#ã"À¢7FW¢#ã"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&ÒæÖ…÷66÷&R’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ76W76ÖVçDf÷&ÒæÖ…÷66÷&UÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W6òFfÆ–:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#ã"À¢7FW¢#ã"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&ÒçvV–v‡B’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ76W76ÖVçDf÷&ÒçvV–v‡EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%6—GV:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&Òç7FGW2’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&G&gB"ÒÂ%&67Væ†ò"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'V&Æ—6†VB"ÒÂ%V&Æ–6F+rVçG&æ6öç6öÆ–F:|:6ò"’Â‡7FFRæ76W76ÖVçDVF—F–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢À¢fÇVS¢&6Æ÷6VB ¢ÒÂ$fV6†F+ræ÷F2&Æ÷VVF2"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ76W76ÖVçDf÷&Òç7FGW5ÕÒ•Ò¢Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&ÒæFW67&—F–öâ’ÒFWfVçB’À¢&÷w3¢#" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ76W76ÖVçDf÷&ÒæFW67&—F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$†&–Æ–FFW2fÆ–F2"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ76W76ÖVçDf÷&Òç6¶–ÆÇ2’ÒFWfVçB’À¢&÷w3¢#" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ76W76ÖVçDf÷&Òç6¶–ÆÇ5ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â²6Æ73¢&'Fâ'Fâ×&–Ö'’"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ76W76ÖVçDVF—F–æsòu6Çf"fÆ–:|:6òs¢t7&–"fÆ–:|:6òr’Â¢ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$fÆ–:|;VW2&Vv—7G&F2"’Â‚7FFRæ76W76ÖVçG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’ ¢ÒÂ$æVæ‡VÖfÆ–:|:6ò6F7G&FæW7FRFœ:&–òâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚ÖÆ—7B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ76W76ÖVçG2Â†’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢æ–BÀ¢6Æ73¢'‚×&V6÷&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†çF—FÆR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR†æ76W76ÖVçEöFFR’’²"+r"²÷FôF—7Æ•7G&–ær†çfÇVU÷G—SÓÓÒvçVÖW&–2sòtçVÜ:—&–6s¢t6öæ6V—GVÂr’²"+r"²÷FôF—7Æ•7G&–ær†ç&W7VÇEö6÷VçB’²"&W7VÇFFò‡2’"Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†Æ&VÂ†ç7FGW2’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ²‡7FFRç6VÆV7FVBç7FGW3ÓÓÒv÷Vârbb6â‚vF–'’æ76W76ÖVçG2r’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†VF—D76W76ÖVçB†’¢ÒÂ$VF—F"fÆ–:|:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†÷Vä76W76ÖVçB†’¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç6VÆV7FVBç7FGW3ÓÓÒv÷Vârbbç7FGW2ÓÒv6Æ÷6VBrbb6â‚vF–'’æ76W76ÖVçG2r“òtÆì:v"æ÷F2s¢t6öç7VÇF"æ÷F2r’Â’Â²&öä6Æ–6²%Ò•Ò•Ò’¢Ò’Â#‚’•Ò•Ò’À¢‡7FFRç6VÆV7FVD76W76ÖVçB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢"À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç6VÆV7FVD76W76ÖVçBçF—FÆR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡7FFRç6VÆV7FVD76W76ÖVçBæ76W76ÖVçEöFFR’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRç6VÆV7FVD76W76ÖVçCÖçVÆÂ¢ÒÂ$fV6†""Â‚Â²&öä6Æ–6²%Ò•Ò’À¢‡7FFRç6VÆV7FVD76W76ÖVçBç7FGW2ÓÒv6Æ÷6VBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVB ¢ÒÂ%fö<:¢öFR6Çf"2æ÷F2&VVæ6†–F2R6öæ6ÇV—"2FVÖ—2FWö—2â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'F&ÆR×w&"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$ÇVæò"’Âö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%&W7VÇFFò"’Âö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$ö'6W'f:|:6ò"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ76W76ÖVçE&÷7FW"Â‡"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢"æVç&öÆÆÖVçEö–BÒÂµö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡"ææÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡"æçVÖ&W"’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ²‡7FFRç6VÆV7FVD76W76ÖVçBçfÇVU÷G—SÓÓÒvçVÖW&–2r¢ò÷v—F„F—&V7F—fW2‚…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–çWB"Â°¢¶W“¢À¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢7FFRç6VÆV7FVD76W76ÖVçBæÖ…÷66÷&RÀ¢7FW¢#ã"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡"ç&W7VÇBæçVÖW&–5÷66÷&R’ÒFWfVçB’À¢&&–ÖÆ&VÂ#¢tæ÷FFRr·"ææÖRÀ¢F—6&ÆVC¢7FFRç6VÆV7FVBç7FGW2ÓÒv÷VâwÇÇ7FFRç6VÆV7FVD76W76ÖVçBç7FGW3ÓÓÒv6Æ÷6VBwÇÂ6â‚vF–'’æ76W76ÖVçG2r¢ÒÂçVÆÂÂ‚Â²&Ö‚"Â&öåWFFS¦ÖöFVÅfÇVR"Â&&–ÖÆ&VÂ"Â&F—6&ÆVB%Ò’’Âµµ÷dÖöFVÅFW‡BÂ"ç&W7VÇBæçVÖW&–5÷66÷&UÕÒ¢¢÷v—F„F—&V7F—fW2‚…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–çWB"Â°¢¶W“¢À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡"ç&W7VÇBæ6öæ6WB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ"À¢&&–ÖÆ&VÂ#¢t6öæ6V—FòFRr·"ææÖRÀ¢F—6&ÆVC¢7FFRç6VÆV7FVBç7FGW2ÓÒv÷VâwÇÇ7FFRç6VÆV7FVD76W76ÖVçBç7FGW3ÓÓÒv6Æ÷6VBwÇÂ6â‚vF–'’æ76W76ÖVçG2r¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&&–ÖÆ&VÂ"Â&F—6&ÆVB%Ò’’Âµµ÷dÖöFVÅFW‡BÂ"ç&W7VÇBæ6öæ6WEÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡"ç&W7VÇBææ÷FR’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢&&–ÖÆ&VÂ#¢tö'6W'f:|:6òFRr·"ææÖRÀ¢F—6&ÆVC¢7FFRç6VÆV7FVBç7FGW2ÓÒv÷VâwÇÇ7FFRç6VÆV7FVD76W76ÖVçBç7FGW3ÓÓÒv6Æ÷6VBwÇÂ6â‚vF–'’æ76W76ÖVçG2r¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&&–ÖÆ&VÂ"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÅFW‡BÂ"ç&W7VÇBææ÷FUÕÒ•Ò•Ò’¢Ò’Â#‚’•Ò•Ò•Ò’À¢‡7FFRç6VÆV7FVBç7FGW3ÓÓÒv÷Vârbb7FFRç6VÆV7FVD76W76ÖVçBç7FGW2ÓÒv6Æ÷6VBrbb6â‚vF–'’æ76W76ÖVçG2r’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢6fT76W76ÖVçE&W7VÇG2À¢F—6&ÆVC¢7FFRæ76W76ÖVçE&÷7FW"æÆVæwF€¢ÒÂ%6Çf"&W7VÇFF÷2"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂcB’•ÒÂcB’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRçF#ÓÓÒv÷–æ–öç2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢bÒÂ²‚7FFRç6VÆV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6VÆV6–öæRVÒFœ:&–ò&&Vv—7G&"&V6W&W2FW67&—F—f÷2â"•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂ²‡7FFRç6VÆV7FVBç7FGW3ÓÓÒv÷Vârbb6â‚vF–'’çw&—FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ%&V6W"FW67&—F—fò"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢'‚Öf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fT÷–æ–öâÂ²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÇVæò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ÷–æ–öäf÷&ÒæVç&öÆÆÖVçEö–B’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç6VÆV7FVBç&÷7FW'ÇÅµÒÂ‡"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢"æVç&öÆÆÖVçEö–BÀ¢fÇVS¢"æVç&öÆÆÖVçEö–@¢ÒÂ÷FôF—7Æ•7G&–ær‡"ææÖR’²"+r"²÷FôF—7Æ•7G&–ær‡"æçVÖ&W"’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ÷–æ–öäf÷&ÒæVç&öÆÆÖVçEö–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W,:ÖöFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ÷–æ–öäf÷&Òæ6FVÖ–5÷W&–öEö–B’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ$vW&Â"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçW&–öG2æf–ÇFW"‡ƒÓç‚æ6FVÖ–5÷–V%ö–CÓÓ×7FFRç6VÆV7FVBæ6FVÖ–5÷–V%ö–B’Â‡’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢æ–BÀ¢fÇVS¢æ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡ææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ÷–æ–öäf÷&Òæ6FVÖ–5÷W&–öEö–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%6—GV:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ÷–æ–öäf÷&Òç7FGW2’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&G&gB"ÒÂ%&67Væ†ò"’Â†6â‚vF–'’ç&Wf–Wrr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢À¢fÇVS¢'&Wf–WvVB ¢ÒÂ%&Wf—6Fò"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â†6â‚vF–'’ç&Wf–Wrr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢À¢fÇVS¢&f–æÂ ¢ÒÂ$f–æÂ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ÷–æ–öäf÷&Òç7FGW5ÕÒ•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ÷–æ–öäf÷&ÒçFW‡B’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#""À¢Ö†ÆVæwFƒ¢##"À¢&÷w3¢#R ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ÷–æ–öäf÷&ÒçFW‡EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â²6Æ73¢&'Fâ'Fâ×&–Ö'’"ÒÂ%6Çf"&V6W""•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ%&V6W&W2&Vv—7G&F÷2"’Â‚7FFRæ÷–æ–öç2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’ ¢ÒÂ$æVæ‡VÒ&V6W"&Vv—7G&Fòâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ÷–æ–öç2Â†ò’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢òæ–BÀ¢6Æ73¢'‚Ö6†&vR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†Æ&VÂ†òç7FGW2’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR†òçWFFVEöB’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'&W6W'fRÖÆ–æW2"ÒÂ÷FôF—7Æ•7G&–ær†òçFW‡B’Â•Ò’¢Ò’Â#‚’•Ò•ÒÂcB’•ÒÂcB’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRçF#ÓÓÒw&V6÷&G2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢rÒÂ²‚7FFRç6VÆV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6VÆV6–öæRVÒFœ:&–ò&6öç7VÇF"&Vv—7G&÷2VF|;6v–6÷26ö×ÆVÖVçF&W2â"•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂ²‡7FFRç6VÆV7FVBç7FGW3ÓÓÒv÷Vârbb6â‚vF–'’çw&—FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$æ÷fò&Vv—7G&òVF|;6v–6ò"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢'‚Öf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2†7&VFUVFvöv–6Å&V6÷&BÂ²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÇVæò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçVFvöv–6Äf÷&ÒæVç&öÆÆÖVçEö–B’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç6VÆV7FVBç&÷7FW'ÇÅµÒÂ‡"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢"æVç&öÆÆÖVçEö–BÀ¢fÇVS¢"æVç&öÆÆÖVçEö–@¢ÒÂ÷FôF—7Æ•7G&–ær‡"ææÖR’²"+r"²÷FôF—7Æ•7G&–ær‡"æçVÖ&W"’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRçVFvöv–6Äf÷&ÒæVç&öÆÆÖVçEö–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FF"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFR"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçVFvöv–6Äf÷&Òç&V6÷&EöFFR’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRçVFvöv–6Äf÷&Òç&V6÷&EöFFUÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%F—ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçVFvöv–6Äf÷&Òæ¶–æB’ÒFWfVçB’ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&föÆÆ÷u÷W"ÒÂ$6ö×æ†ÖVçFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&–çFW'fVçF–öâ"ÒÂ$–çFW'fVì:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'&V6÷fW'’"ÒÂ%&V7WW&:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&FFF–öâ"ÒÂ$FF:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'&VfW'&Â"ÒÂ$Væ6Ö–æ†ÖVçFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&ö'6W'fF–öâ"ÒÂ$ö'6W'f:|:6ò"¢ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRçVFvöv–6Äf÷&Òæ¶–æEÕÒ•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%&Vv—7G&ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçVFvöv–6Äf÷&ÒçFW‡B’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#""À¢Ö†ÆVæwFƒ¢##"À¢&÷w3¢#B ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRçVFvöv–6Äf÷&ÒçFW‡EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â²6Æ73¢&'Fâ'Fâ×&–Ö'’"ÒÂ%&Vv—7G&""•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$†—7L;7&–6òVF|;6v–6ò"’Â‚7FFRçVFvöv–6Å&V6÷&G2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’ ¢ÒÂ$æVæ‡VÒ&Vv—7G&ò6ö×ÆVÖVçF"â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçVFvöv–6Å&V6÷&G2Â‡"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢"æ–BÀ¢6Æ73¢'‚Ö6†&vR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†Æ&VÂ‡"æ¶–æB’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡"ç&V6÷&EöFFR’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'&W6W'fRÖÆ–æW2"ÒÂ÷FôF—7Æ•7G&–ær‡"çFW‡B’Â•Ò’¢Ò’Â#‚’•Ò•ÒÂcB’•ÒÂcB’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRçF#ÓÓÒvö67W'&Væ6W2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢‚ÒÂ²‚7FFRç6VÆV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6VÆV6–öæRVÒFœ:&–ò&&Vv—7G&"ö6÷',:¦æ6–2â"•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂ²‡7FFRç6VÆV7FVBç7FGW3ÓÓÒv÷Vârbb6â‚vF–'’çw&—FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$æ÷fö6÷',:¦æ6–VF|;6v–6"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢'‚Öf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fTö67W'&Væ6RÂ²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÇVæò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæö67W'&Væ6Tf÷&ÒæVç&öÆÆÖVçEö–B’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç6VÆV7FVBç&÷7FW'ÇÅµÒÂ‡"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢"æVç&öÆÆÖVçEö–BÀ¢fÇVS¢"æVç&öÆÆÖVçEö–@¢ÒÂ÷FôF—7Æ•7G&–ær‡"ææÖR’²"+r"²÷FôF—7Æ•7G&–ær‡"æçVÖ&W"’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæö67W'&Væ6Tf÷&ÒæVç&öÆÆÖVçEö–EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FF"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFR"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæö67W'&Væ6Tf÷&Òæö67W'&Væ6UöFFR’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæö67W'&Væ6Tf÷&Òæö67W'&Væ6UöFFUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W,:ÖöFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæö67W'&Væ6Tf÷&Òæ6FVÖ–5÷W&–öEö–B’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçW&–öG2æf–ÇFW"‡ƒÓç‚æ6FVÖ–5÷–V%ö–CÓÓ×7FFRç6VÆV7FVBæ6FVÖ–5÷–V%ö–B’Â‡’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢æ–BÀ¢fÇVS¢æ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡ææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæö67W'&Væ6Tf÷&Òæ6FVÖ–5÷W&–öEö–EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%F—ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæö67W'&Væ6Tf÷&Òæ¶–æB’ÒFWfVçB’ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'÷6—F—fR"ÒÂ%÷6—F—f"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'VFvöv–6Â"ÒÂ%VF|;6v–6"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&&V†f–÷&Â"ÒÂ$6ö×÷'FÖVçFÂ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'6fWG’"ÒÂ%6VwW&ì:v"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&÷F†W""ÒÂ$÷WG&"¢ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæö67W'&Væ6Tf÷&Òæ¶–æEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%6—GV:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæö67W'&Væ6Tf÷&Òç7FGW2’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&G&gB"ÒÂ$wV&FæFò&Wf—<:6ò"’Â†6â‚vF–'’ç&Wf–Wrr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢À¢fÇVS¢'&Wf–WvVB ¢ÒÂ%&Wf—6F"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæö67W'&Væ6Tf÷&Òç7FGW5ÕÒ•Ò¢Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%L:×GVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæö67W'&Væ6Tf÷&ÒçF—FÆR’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#""À¢Ö†ÆVæwFƒ¢#c ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæö67W'&Væ6Tf÷&ÒçF—FÆUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæö67W'&Væ6Tf÷&ÒæFW67&—F–öâ’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#""À¢Ö†ÆVæwFƒ¢#ƒ"À¢&÷w3¢#B ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæö67W'&Væ6Tf÷&ÒæFW67&—F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ%&Vv—7G&RVæ2–æf÷&Ö:|;VW2VF|;6v–62æV6W7<:&–2âW7FRf÷&×VÌ:&–òì:6òVçf–ÖVç6vVÒ:fÜ:ÖÆ–â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â²6Æ73¢&'Fâ'Fâ×&–Ö'’"ÒÂ%&Vv—7G&""¢ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$ö6÷',:¦æ6–2"’Â‚7FFRæö67W'&Væ6W2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’ ¢ÒÂ$æVæ‡VÖö6÷',:¦æ6–&Vv—7G&Fâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæö67W'&Væ6W2Â†ò’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢òæ–BÀ¢6Æ73¢'‚Ö6†&vR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†òçF—FÆR’²"+r"²÷FôF—7Æ•7G&–ær†Æ&VÂ†òç7FGW2’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR†òæö67W'&Væ6UöFFR’’²"+r"²÷FôF—7Æ•7G&–ær†Æ&VÂ†òæ¶–æB’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‚‡7FFRç6VÆV7FVBç&÷7FW'ÇÅµÒ’æf–æB‡ƒÓç‚æVç&öÆÆÖVçEö–CÓÓÖòæVç&öÆÆÖVçEö–B“òææÖWÇÂtÇVæòr’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'&W6W'fRÖÆ–æW2"ÒÂ÷FôF—7Æ•7G&–ær†òæFW67&—F–öâ’Â•Ò’¢Ò’Â#‚’•Ò•ÒÂcB’•ÒÂcB’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRçF#ÓÓÒv6öÖ×Væ–6F–öç2rbb6â‚v6öÖ×Væ–6F–öç2ç6VæBr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢’ÒÂ²‚7FFRç6VÆV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6VÆV6–öæRVÒFœ:&–ò&Vçf–"6ö×Væ–6F÷2R6öç7VÇF"ò†—7L;7&–6òâ"•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$6ö×Væ–6Fòæò÷'FÂFfÜ:ÖÆ–"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$ò6ö×Væ–6Fòf–6,:F—7öì:×fVÂVæ2&÷2&W7öç<:fV—2ÆVv—2VR6öæf—&Ö&Òòl:Öæ7VÆòRWF÷&—¦&Òò6W76òòFœ:&–òæò÷'FÂâW7FFVÆì:6òVçf–RÖÖ–ÂæVÒv†G4â"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢'‚Öf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6VæD6öÖ×Væ–6F–öâÂ²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$W7GVFçFR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öÖ×Væ–6F–öäf÷&ÒæVç&öÆÆÖVçEö–B’ÒFWfVçB’À¢öä6†ævS¢ÆöD6öÖ×Væ–6F–öå&V6—–VçG2À¢&WV—&VC¢" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç6VÆV7FVBç&÷7FW'ÇÅµÒÂ‡"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢"æVç&öÆÆÖVçEö–BÀ¢fÇVS¢"æVç&öÆÆÖVçEö–@¢ÒÂ÷FôF—7Æ•7G&–ær‡"ææÖR’²"+r"²÷FôF—7Æ•7G&–ær‡"æçVÖ&W"’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ6öÖ×Væ–6F–öäf÷&ÒæVç&öÆÆÖVçEö–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W,:ÖöFòFR&VfW,:¦æ6–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öÖ×Væ–6F–öäf÷&Òæ6FVÖ–5÷W&–öEö–B’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÒW,:ÖöFòW7V<:Öf–6ò"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçW&–öG2æf–ÇFW"‡ƒÓç‚æ6FVÖ–5÷–V%ö–CÓÓ×7FFRç6VÆV7FVBæ6FVÖ–5÷–V%ö–B’Â‡’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢æ–BÀ¢fÇVS¢æ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡ææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ6öÖ×Væ–6F–öäf÷&Òæ6FVÖ–5÷W&–öEö–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ö6÷',:¦æ6–&Wf—6F†÷6–öæÂ’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öÖ×Væ–6F–öäf÷&Òæö67W'&Væ6Uö–B’ÒFWfVçB’À¢öä6†ævS¢6öÖ×Væ–6F–öäö67W'&Væ6T6†ævV@¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÒö6÷',:¦æ6–f–æ7VÆF"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæö67W'&Væ6W2æf–ÇFW"‡ƒÓç‚æVç&öÆÆÖVçEö–CÓÓ×7FFRæ6öÖ×Væ–6F–öäf÷&ÒæVç&öÆÆÖVçEö–Bbg‚ç7FGW3ÓÓÒw&Wf–WvVBr’Â†ò’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢òæ–BÀ¢fÇVS¢òæ–@¢ÒÂ÷FôF—7Æ•7G&–ær†FFR†òæö67W'&Væ6UöFFR’’²"+r"²÷FôF—7Æ•7G&–ær†òçF—FÆR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ6öÖ×Væ–6F–öäf÷&Òæö67W'&Væ6Uö–EÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢6Æ73¢'‚Öf÷&Ò"À¢F—6&ÆVC¢7FFRæ6öÖ×Væ–6F–öå&V6—–VçG2æÆVæwF€¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ%&W7öç<:fV—2WF÷&—¦F÷2"’Â‡7FFRæ6öÖ×Væ–6F–öäf÷&ÒæVç&öÆÆÖVçEö–Bbb7FFRæ6öÖ×Væ–6F–öå&V6—–VçG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’ ¢ÒÂ$æVæ‡VÒ&W7öç<:fVÂÆVvÂ6öÒ6W76ò6öç6VçF–FòR6öçFFòfW&–f–6Fò&W7FRW7GVFçFRâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ6öÖ×Væ–6F–öå&V6—–VçG2Â‡&V6—–VçB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢&V6—–VçBæwV&F–åöÆ–æµö–BÀ¢6Æ73¢'‚Ö6†V6² ¢ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢fÇVS¢&V6—–VçBæwV&F–åöÆ–æµö–BÀ¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öÖ×Væ–6F–öäf÷&Òç&V6—–VçEöwV&F–åöÆ–æµö–G2’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²'fÇVR"Â&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæ6öÖ×Væ–6F–öäf÷&Òç&V6—–VçEöwV&F–åöÆ–æµö–G5ÕÒ’Âö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡&V6—–VçBææÖR’²"+r"²÷FôF—7Æ•7G&–ær‡&V6—–VçBç&VÆF–öç6†—’²"+r"²÷FôF—7Æ•7G&–ær‡&V6—–VçBç÷'FÅö66÷VçEö6÷VçB’²"6öçF‡2’Fò÷'FÂ"Â•Ò’¢Ò’Â#‚’•ÒÂ‚Â²&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%L:×GVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öÖ×Væ–6F–öäf÷&ÒçF—FÆR’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#""À¢Ö†ÆVæwFƒ¢#c ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ6öÖ×Væ–6F–öäf÷&ÒçF—FÆUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÖVç6vVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öÖ×Væ–6F–öäf÷&ÒæÖW76vR’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#""À¢Ö†ÆVæwFƒ¢#ƒ"À¢&÷w3¢#R ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ6öÖ×Væ–6F–öäf÷&ÒæÖW76vUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ6öÖ×Væ–6F–öäf÷&Òç&V6—–VçEöwV&F–åöÆ–æµö–G2æÆVæwF€¢ÒÂ$F—7öæ–&–Æ—¦"æò÷'FÂ"Â‚Â²&F—6&ÆVB%Ò¢ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$†—7L;7&–6òFR6ö×Væ–6F÷2"’Â‚7FFRæ6öÖ×Væ–6F–öç2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’ ¢ÒÂ$æVæ‡VÒ6ö×Væ–6FòVçf–Fò÷"W7FRFœ:&–òâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ6öÖ×Væ–6F–öç2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢—FVÒæ–BÀ¢6Æ73¢'‚Ö6†&vR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒçF—FÆR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær†—FVÒç7GVFVçEöæÖR’²"+r"²÷FôF—7Æ•7G&–ær†—FVÒæwV&F–åöæÖR’²"+r"²÷FôF—7Æ•7G&–ær†FFR†—FVÒç6VçEöB’’Â’Â†—FVÒæ6FVÖ–5÷W&–öEö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â²¶W“¢ÒÂ"+r"²÷FôF—7Æ•7G&–ær‡7FFRçW&–öG2æf–æB‡Óçæ–CÓÓÖ—FVÒæ6FVÖ–5÷W&–öEö–B“òææÖWÇÂuW,:ÖöFòr’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&&FvR"ÒÂ÷FôF—7Æ•7G&–ær†—FVÒç&VEöCòtÆ–Fòæò÷'FÂs¢tF—7öì:×fVÂæò÷'FÂr’Â•Ò’Â†—FVÒæö67W'&Væ6U÷F—FÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&×WFVB ¢ÒÂ$ö6÷',:¦æ6–¢"²÷FôF—7Æ•7G&–ær†—FVÒæö67W'&Væ6U÷F—FÆR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'&W6W'fRÖÆ–æW2"ÒÂ÷FôF—7Æ•7G&–ær†—FVÒæÖW76vR’Â•Ò’¢Ò’Â#‚’•Ò•ÒÂcB’•ÒÂcB’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂ‚Â²&F—6&ÆVB%Ò•Ò’¢Ð§ÒÆ6öçG&7G3¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²FôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂ7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂæ÷&ÖÆ—¦T6Æ73¢öæ÷&ÖÆ—¦T6Æ72Â&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Â7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÂdÖöFVÄ6†V6¶&÷ƒ¢÷dÖöFVÄ6†V6¶&÷‚Âe6†÷s¢÷e6†÷rÂv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2Â&W6öÇfT6ö×öæVçC¢÷&W6öÇfT6ö×öæVçBÂ7&VFT&Æö6³¢ö7&VFT&Æö6²ÒÒõgVP ¢6öç7Bö6ö×öæVçEö6öçG&7E÷fÇVUöf–VÆBÒ÷&W6öÇfT6ö×öæVçB‚&6öçG&7B×fÇVRÖf–VÆB"¢6öç7Bö6ö×öæVçE÷6–væ–æu÷æVÂÒ÷&W6öÇfT6ö×öæVçB‚'6–væ–ær×æVÂ" ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢6Æ73¢&6öçG&7G2"À¢&&–ÖÆ&VÂ#¢$ÖöFVÆ÷2RFö7VÖVçF÷2W66öÆ&W2 ¢ÒÂ°¢‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRææ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRææ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'æVÂ‚Ö6&B6öçG&7BÖ–çG&ò"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$Dô5TÔTåDõ2DU44ôÄ"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$ÖöFVÆ÷2R6öçG&F÷2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6F7G&R6öçG&F÷2ÂWF÷&—¦:|;VW2ÂFV6Æ&:|;VW2R÷WG&÷2Fö7VÖVçF÷2âf–æ7VÆR6FÖöFVÆòòæòÆWF—fòR:fÆ–FFRÂ&VVæ6†÷2FF÷2FÖG,:Ö7VÆRVÖ—FòDb&W6W'fFòæf–6†FòÇVæòâ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢F—6&ÆVC¢7FFRæÆöF–ærÇÂ7FFRæ'W7’À¢öä6Æ–6³¢Æö@¢ÒÂ$GVÆ—¦""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢'F'2"À¢&öÆS¢'F&Æ—7B"À¢&&–ÖÆ&VÂ#¢$WF2F÷2Fö7VÖVçF÷2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢&öÆS¢'F""À¢&&–×6VÆV7FVB#¢7FFRçF#ÓÓÒwFV×ÆFW2rÀ¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡¶7F—fS§7FFRçF#ÓÓÒwFV×ÆFW2wÒ’À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRçF#ÒwFV×ÆFW2r¢ÒÂ$ÖöFVÆ÷2"ÂÂ²&&–×6VÆV7FVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢&öÆS¢'F""À¢&&–×6VÆV7FVB#¢7FFRçF#ÓÓÒv—77VRrÀ¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡¶7F—fS§7FFRçF#ÓÓÒv—77VRwÒ’À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRçF#Òv—77VRr¢ÒÂ%&VVæ6†W"RVÖ—F—""ÂÂ²&&–×6VÆV7FVB"Â&öä6Æ–6²%Ò’Â†6â‚vFö7VÖVçG2ç&VBr’bb†4Fö7VÖVçD6öçFW‡B‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢&öÆS¢'F""À¢&&–×6VÆV7FVB#¢7FFRçF#ÓÓÒw6–væGW&W2rÀ¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡¶7F—fS§7FFRçF#ÓÓÒw6–væGW&W2wÒ’À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRçF#Òw6–væGW&W2r¢ÒÂ$Fö7VÖVçF÷2FÖG,:Ö7VÆ"ÂÂ²&&–×6VÆV7FVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$W66öÆöFRÖçFW"l:&–÷2ÖöFVÆ÷2RGVÆ—¦"7V2fW'<;VW2âòFö7VÖVçFò¬:VÖ—F–Fò6öç6W'fò6öçF\;¦FòRfW'<:6òWF–Æ—¦F÷2æòÖöÖVçFòFVÖ—7<:6òâ"•Ò’À¢‡7FFRæÆöF–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢"À¢6Æ73¢&ÆöF–ær×7G&—"À¢&öÆS¢'7FGW2 ¢ÒÂ$6'&VvæFòÖöFVÆ÷>(
b"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRçF#ÓÓÒwFV×ÆFW2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢2ÒÂ²‚7FFRæVF—F–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$&–&Æ–÷FV6FRÖöFVÆ÷2"’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$ÖöFVÆ÷2–æF—f÷26öçF–çVÒæò†—7L;7&–6òRFV—†ÒFR&V6W"&æ÷f2VÖ—7<;VW2â"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ²†6â‚v6FVÖ–2çw&—FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢&Vv–äæWp¢ÒÂ"²æ÷fòÖöFVÆò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â†6â‚v6FVÖ–2çw&—FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢W6T'V–ÇF–à¢ÒÂ%W6"ÖöFVÆòFR6W'fœ:v÷2VGV66–öæ—2"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'F&ÆR×67&öÆÂ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$ÖöFVÆò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$6FVv÷&–"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$æòÆWF—fò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%f–|:¦æ6–"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%6—GV:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$:|;VW2"¢Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçFV×ÆFW2Â‡FV×ÆFR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢FV×ÆFRæ–BÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡FV×ÆFRææÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ%fW'<:6ò"²÷FôF—7Æ•7G&–ær‡FV×ÆFRçfW'6–öâ’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡FV×ÆFRæ¶–æB’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡–V$æÖR‡FV×ÆFRæ6FVÖ–5÷–V%ö–B’’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡FV×ÆFRçfÆ–Eög&öÒ’’²""²÷FôF—7Æ•7G&–ær†FFR‡FV×ÆFRçfÆ–E÷VçF–Â’’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&&FvR"ÂFV×ÆFRæ7F—fSòv7F—fRs¢v&6†—fVBuÒ’ÒÂ÷FôF—7Æ•7G&–ær‡FV×ÆFRæ7F—fSòtF—fòs¢t–æF—fòr’Â2•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ²†6â‚v6FVÖ–2çw&—FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&Æ–æ²Ö'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†&Vv–äVF—B‡FV×ÆFR’¢ÒÂ$VF—F"(i""Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&Æ–æ²Ö'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†&Vv–äVF—B‡FV×ÆFR’¢ÒÂ$6öç7VÇF"(i""Â‚Â²&öä6Æ–6²%Ò’•Ò¢Ò’¢Ò’Â#‚’•Ò•Ò•Ò’Â‚7FFRçFV×ÆFW2æÆVæwF‚bb7FFRæÆöF–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂ$æVæ‡VÒÖöFVÆò6F7G&Fòâ7&–RVÒFö7VÖVçFò÷R–×÷'FRòFW‡FòFRVÒDô5‚&6öÖ\:v"â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢&6öçG&7BÖVF—F÷""À¢&&–ÖÆ&VÂ#¢$VF—F÷"FòÖöFVÆò ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7BÖVF—F÷"Ö7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç6VÆV7FVCòtVF—F"ÖöFVÆòs¢tæ÷fòÖöFVÆòr’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢6æ6VÄVF—@¢ÒÂ%föÇF""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Â†6â‚v6FVÖ–2çw&—FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢6fP¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ'W7“òu6ÇfæFþ(
bs¢u6Çf"ÖöFVÆòr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢F—6&ÆVC¢7FFRæ'W7’ÇÂ6â‚v6FVÖ–2çw&—FRr’À¢6Æ73¢&6öçG&7BÖVF—F÷"Öw&–B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7BÖVF—BÖ6öÇVÖâ"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$–FVçF–f–6:|:6òRW,:ÖöFò"’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ%VÒÖöFVÆòöFRFVæFW"VÇVW"W,:ÖöFò÷RVæ2òæòÆWF—fò6VÆV6–öæFòâFF2<:6ò÷6–öæ—3²VæFò–æf÷&ÖF2ÂÆ–Ö—FÒVÖ—7<:6òâ"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7BÖf–VÆG2"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆBv–FR"ÒÂµö7&VFUFW‡EdæöFR‚$æöÖRFòÖöFVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBææÖR’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#c"À¢&WV—&VC¢""À¢Æ6V†öÆFW#¢$W‚ã¢6öçG&FòFR&W7F:|:6òFR6W'fœ:v÷2##r ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBææÖUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$6FVv÷&–†<;6F–vò’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæ¶–æB’ÒFWfVçB’À¢öä–çWC¢7–æ46öçG&7E6–væGW&RÀ¢GFW&ã¢%¶×¥Õ¶×£Ó•õ×³Ã3—Ò"À¢Ö†ÆVæwFƒ¢#C"À¢&WV—&VC¢""À¢Æ6V†öÆFW#¢&VGV6F–öæÅö6öçG&7B ¢ÒÂçVÆÂÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä–çWB%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBæ¶–æEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$æòÆWF—fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæ6FVÖ–5÷–V%ö–B’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF÷2÷2W,:ÖöF÷2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç–V'2Â‡–V"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢–V"æ–BÀ¢fÇVS¢–V"æ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡–V"ææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæG&gBæ6FVÖ–5÷–V%ö–EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%l:Æ–Fò'F—"FR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBçfÆ–Eög&öÒ’ÒFWfVçB’À¢G—S¢&FFR ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBçfÆ–Eög&öÕÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%l:Æ–FòL:’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBçfÆ–E÷VçF–Â’ÒFWfVçB’À¢G—S¢&FFR ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBçfÆ–E÷VçF–ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB6†V6¶&÷‚Öf–VÆBv–FR"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæ7F—fR’ÒFWfVçB’À¢G—S¢&6†V6¶&÷‚ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæG&gBæ7F—fUÕÒ’Âö7&VFUFW‡EdæöFR‚$ÖöFVÆòF—fò&æ÷f2VÖ—7<;VW2"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB6†V6¶&÷‚Öf–VÆBv–FR"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBç&WV—&U÷6–væGW&R’ÒFWfVçB’À¢G—S¢&6†V6¶&÷‚"À¢F—6&ÆVC¢6öçG&7D¶–æB‡7FFRæG&gBæ¶–æB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæG&gBç&WV—&U÷6–væGW&UÕÒ’Âö7&VFUFW‡EdæöFR‚$W†–v—"76–æGW&WFöÜ:F–6FW66öÆæòDb"•Ò’À¢†6öçG&7D¶–æB‡7FFRæG&gBæ¶–æB’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVBv–FR ¢ÒÂ$ÖöFVÆ÷26Æ76–f–6F÷26öÖò6öçG&FòW†–vVÒ76–æGW&²W7F÷:|:6òf–6ö'&–vL;7&–â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæG&gBç&WV—&U÷6–væGW&R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVBv–FR ¢ÒÂ$VÖ—7<:6òW†–vR6W'F–f–6Fò6öæf–wW&FòæW66öÆâ76–æGW&W‡FW&æFò&W7öç<:fVÂÂVæFòÆ–<:fVÂÂ:’Vçf–F6W&FÖVçFRRæÆ—6FVÆ6V7&WF&–â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$–×÷'F"'V—fòFR&VfW,:¦æ6–"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$ò÷&–v–æÂf–6&—fFòæW66öÆâòÖöFò&W6W'f"Æ–÷WBÖçL:–ÒF&VÆ2Â–ÖvVç2Â6&\:vÆ†÷2Rf÷&ÖF:|:6òFòDô5‚Â7V'7F—GV–æFò6öÖVçFR÷26×÷2&÷fF÷2â6öçfW'<:6ò&DbW†–vR6öæfW,:¦æ6–FRFöF22:v–æ2â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%6VÆV6–öæ"Dô5‚FRL:’‚Ô""’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢"æFö7‚ÆÆ–6F–öâ÷fæBæ÷Vç†ÖÆf÷&ÖG2Ööff–6VFö7VÖVçBçv÷&G&ö6W76–ævÖÂæFö7VÖVçB"À¢öä6†ævS¢–×÷'DFö7€¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢&&–ÖÆ&VÂ#¢%&Wf—<:6òFò÷&–v–æÂDô5‚ ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$27VvW7L;VW2<:6òöçF÷2FR'F–FâÆ7Væ2Ö,:ÖwV2R&Vw&26öçG&GV—2FWVæFVÒF6öæfW,:¦æ6–FW66öÆâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢F÷væÆöD÷&–v–æÀ¢ÒÂ$&—†"÷&–v–æÂ"Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ‡&Wf–Wu6÷W&6R‡G'VR’¢ÒÂ%DbFò÷&–v–æÂ"Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡&Wf–Wu6÷W&6R†fÇ6R’¢ÒÂ$6öæfW&—"DbÖVFò"Â‚Â²&öä6Æ–6²%Ò•Ò’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæG&gBæFö7…öÖ–ærÂ†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢—FVÒæ–BÀ¢6Æ73¢'æVÂ ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'&W6W'fR"ÒÂ÷FôF—7Æ•7G&–ær†—FVÒæ6öçFW‡B’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$6×ò&W7F&Vvœ:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢$6×ò&W7F&Vvœ:6ò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæf–VÆB’ÒFWfVçB’À¢öä6†ævS¢Ö–æt6†ævV@¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ$W66öÆ†ò6×ò"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæf–VÆG2Â†f–VÆB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â²fÇVS¢f–VÆBæ¶W’ÒÂ÷FôF—7Æ•7G&–ær†f–VÆBæÆ&VÂ’Â’Â²'fÇVR%Ò’¢Ò’Â#Sb’’Â†—FVÒæf–VÆBbb7FFRæf–VÆG2ç6öÖR†cÓæbæ¶W“ÓÓÖ—FVÒæf–VÆB’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢À¢fÇVS¢—FVÒæf–VÆ@¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒæf–VÆB’Â’Â²'fÇVR%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ—FVÒæf–VÆEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ66WFVB’ÒFWfVçB’À¢F—6&ÆVC¢—FVÒæf–VÆBÀ¢öä6†ævS¢FWfVçBÓâ¶—FVÒç&W6W'fSÖfÇ6S¶Ö–æt6†ævVB‚—Ð¢ÒÂçVÆÂÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â—FVÒæ66WFVEÕÒ’Âö7&VFUFW‡EdæöFR‚$&÷f"7V'7F—GVœ:|:6òFW7F&Vvœ:6ò"•Ò’À¢†—FVÒæ6öæf–FVæ6RÓÒvW‡Æ–6—Br¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢À¢6Æ73¢'‚Ö6†V6² ¢ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒç&W6W'fR’ÒFWfVçB’À¢öä6†ævS¢FWfVçBÓâ¶—FVÒæ66WFVCÖfÇ6S¶Ö–æt6†ævVB‚—Ð¢ÒÂçVÆÂÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â—FVÒç&W6W'fUÕÒ’Âö7&VFUFW‡EdæöFR‚$ÖçFW"W7F&Vvœ:6òW†FÖVçFR6öÖòæò÷&–v–æÂ"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢Ò’Â#‚’’À¢‚7FFRæG&gBæFö7…öÖ–æræÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$æVæ‡VÖÆ7Væ&V6öæ†V6–Fâ–ç6—&Ö&6F÷&W26öÖò"²÷FôF—7Æ•7G&–ær‚w²r²w¶ÇVæòææöÖWÒr²wÒr’²"æòv÷&BR–×÷'FRæ÷fÖVçFR6R&V6—6"FR6×÷2F–ì:&Ö–6÷2â"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæFö7…÷&Wf–WvVB’ÒFWfVçB’À¢F—6&ÆVC¢7FFRæFö7…&Wf–WvV@¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæG&gBæFö7…÷&Wf–WvVEÕÒ’Âö7&VFUFW‡EdæöFR‚$6öæfW&’FöF22:v–æ2ÂFF÷2Â6Ì:W7VÆ2Â6×÷2R76–æGW&æòDbÖVFò"•Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$÷R6'&Vv"ÖöFVÆò¥4ôâÆö6Â†L:’Ô"’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢"æ§6öâÆÆ–6F–öâö§6öâ"À¢öä6†ævS¢–×÷'D§6öà¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡7FFRæ–×÷'Df–ÆTæÖR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVB ¢ÒÂ%FW‡Fò–×÷'FFòFR"²÷FôF—7Æ•7G&–ær‡7FFRæ–×÷'Df–ÆTæÖR’²"â6ÇfRòÖöFVÆò&ÖçL:¢ÖÆòæò6—7FVÖâ"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ–×÷'Ev&æ–æw2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&ÆW'Bv&æ–ær"À¢&öÆS¢'7FGW2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ–×÷'Ev&æ–æw2Â‡v&æ–ær’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢v&æ–ærÒÂ÷FôF—7Æ•7G&–ær‡v&æ–ær’Â’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢'æVÂ‚Ö6&B"À¢&&–ÖÆ&VÂ#¢%,:&ÖWG&÷2F2f&œ:fV—2Fò6öçG&Fò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%,:&ÖWG&÷2F2f&œ:fV—2"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$Ö'VRV—2f&œ:fV—2<:6òö'&–vL;7&–2â2÷6–öæ—2f¦–2R6WW2G&V6†÷26÷'&W7öæFVçFW26W,:6òöÖ—F–F÷2FòFö7VÖVçFòâæVæ‡VÒfÆ÷"6W,:–çfVçFFòâ6Çf"ÇFW&&Wf—<:6òFòÖöFVÆòâ"’À¢‚Æ6V†öÆFW'2‚’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$–æ6ÇV÷26×÷2æòFW‡Fò÷R&W&RòÖVÖVçFòFòDô5‚â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×&ÖWFW"ÖÆ—7B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡Æ6V†öÆFW'2‚’Â†¶W’’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â²¶W“¢¶W’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†f–VÆDÆ&VÂ†¶W’’’Â’Âö7&VFTVÆVÖVçEdæöFR‚&6öFR"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†¶W’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡f&–&ÆT÷F–öç2†¶W’’ç&WV—&VB’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Âf&–&ÆT÷F–öç2†¶W’’ç&WV—&VEÕÒ’Âö7&VFUFW‡EdæöFR‚$ö'&–vL;7&–"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6ö×öæVçFR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡f&–&ÆT÷F–öç2†¶W’’æ–çWE÷G—R’ÒFWfVçB’ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†f–VÆD¶–æG2Â†¶–æB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢¶–æBçfÇVRÀ¢fÇVS¢¶–æBçfÇVP¢ÒÂ÷FôF—7Æ•7G&–ær†¶–æBæÆ&VÂ’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂf&–&ÆT÷F–öç2†¶W’’æ–çWE÷G—UÕÒ•Ò•Ò’¢Ò’Â#‚’•Ò¢Ò’À¢‚7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%VÂF–Ö'&Fò†÷6–öæÂ’"’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$;726Çf"òÖöFVÆòÂæW†RVÖ–ÖvVÒär÷R¥TrBFRL:’"Ô"â–ÖvVÒf–6&—fFæW7FW66öÆR6W,:&WWF–F6öÖògVæFòVÒ6F:v–æFòDbâ6VÒVÆÂVÖ—7<:6òW6–FVçF–FFRf—7VÂ6F7G&FF–ç7F—GVœ:|:6òâ"’Â‚7FFRç6VÆV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'B–æfò ¢ÒÂ%6ÇfR&–ÖV—&òòÖöFVÆò&F–6–öæ"òVÂF–Ö'&Fòâ"’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%7V'7F—GV—"÷RF–6–öæ"–ÖvVÒ"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢&–ÖvR÷ærÆ–ÖvRö§Vr"À¢öä6†ævS¢ÆWGFW&†VD6†ævV@¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç276VB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæÆWGFW&†VDæÖRÇÂ7FFRæ'W7’À¢öä6Æ–6³¢WÆöDÆWGFW&†V@¢ÒÂ$Vçf–""²÷FôF—7Æ•7G&–ær‡7FFRæÆWGFW&†VDæÖRÇÂv–ÖvVÒr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Â‡7FFRç6VÆV7FVBæÆWGFW&†VEöf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢&VÖ÷fTÆWGFW&†V@¢ÒÂ%&VÖ÷fW"F–Ö'&Fò"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Â‡7FFRç6VÆV7FVBæÆWGFW&†VEöf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVB ¢ÒÂ$–ÖvVÒ&—fFf–æ7VÆFòÖöFVÆòb"²÷FôF—7Æ•7G&–ær‡7FFRç6VÆV7FVBçfW'6–öâ’²"â"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂcB’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‚7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$6×÷2F–ì:&Ö–6÷2"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$6Æ—VR&–ç6W&—"ò6×òæò7W'6÷"Fò6&\:vÆ†òÂ6öçF\;¦Fò÷R&öF:’âFF÷26F7G&F÷2<:6ò&VVæ6†–F÷2æ,:—f–²Æ7Væ2öFVÒ6W"–æf÷&ÖF2ÖçVÆÖVçFRæVÖ—7<:6òâ"’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6FVv÷&–W2Â†w&÷W’Óâ°¢&WGW&â÷v—F„F—&V7F—fW2‚…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â°¢¶W“¢w&÷WÀ¢6Æ73¢&6öçG&7BÖf–VÆG2Öw&÷W ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†w&÷W’²"+r"²÷FôF—7Æ•7G&–ær†6FVv÷'”f–VÆG2†w&÷W’æÆVæwF‚’²"6×÷2"Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7BÖf–VÆBÖ'WGFöç2"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6FVv÷'”f–VÆG2†w&÷W’Â†f–VÆB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢f–VÆBæ¶W’À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢F—FÆS¢f–VÆBæ¶W’²r+rr¶f–VÆBç6÷W&6RÀ¢öä6Æ–6³¢FWfVçBÓâ†–ç6W'Df–VÆB†f–VÆBæ¶W’ÂFWfVçB’¢ÒÂ÷FôF—7Æ•7G&–ær†f–VÆBæÆ&VÂ’Â’Â²'F—FÆR"Â&öä6Æ–6²%Ò’¢Ò’Â#‚’•Ò•Ò’’Âµµ÷e6†÷rÂ6FVv÷'”f–VÆG2†w&÷W’æÆVæwF…ÕÒ¢Ò’Â#‚’’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$6×÷2FW7FRÖöFVÆó¢"²÷FôF—7Æ•7G&–ær‡Æ6V†öÆFW'2‚’æ¦ö–â‚r+rr’ÇÂvæVæ‡VÒâW6R6†fW2GWÆ2&÷26×÷2âr’Â¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7BÖVF—BÖ6öÇVÖâ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%FW‡FòFòFö7VÖVçFò"’À¢‡7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ%&W7VÖò6öÖVçFR&6öç7VÇFâÇFW&Rò÷&–v–æÂ÷R6WRÖVÖVçFò&&W6W'f"òÆ–÷WBâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$VF—FR6&\:vÆ†òÂ6÷'òR&öF:’Æ—g&VÖVçFRâ2VV'&2FRÆ–æ†<:6òÖçF–F2æ,:—f–RæòDbâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$6&\:vÆ†ò†÷6–öæÂ’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢–C¢&6öçG&7BÖ†VFW"ÖVF—F÷""À¢&FF×6V7F–öâ#¢&†VFW""À¢&VFöæÇ“¢&ööÆVâ‡7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B’À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæ†VFW"’ÒFWfVçB’À¢öäfö7W3¢FWfVçBÓâ‡7FFRæ7F—fU6V7F–öãÒv†VFW"r’À¢&÷w3¢#2"À¢Ö†ÆVæwFƒ¢#S"À¢Æ6V†öÆFW#¢%FW‡FòF–6–öæÂ6–ÖFò6÷'ò ¢ÒÂçVÆÂÂCÂ²'&VFöæÇ’"Â&öåWFFS¦ÖöFVÅfÇVR"Â&öäfö7W2%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBæ†VFW%ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$6Ì:W7VÆ2R6öçF\;¦Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢–C¢&6öçG&7BÖ&öG’ÖVF—F÷""À¢&FF×6V7F–öâ#¢&&öG’"À¢&VFöæÇ“¢&ööÆVâ‡7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B’À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæ&öG’’ÒFWfVçB’À¢öäfö7W3¢FWfVçBÓâ‡7FFRæ7F—fU6V7F–öãÒv&öG’r’À¢&÷w3¢##""À¢Ö†ÆVæwFƒ¢#"À¢&WV—&VC¢""À¢Æ6V†öÆFW#¢$F–v—FR26Ì:W7VÆ2R–æ6ÇV6×÷26öÖò·¶ÇVæòææöÖW×Òâ ¢ÒÂçVÆÂÂCÂ²'&VFöæÇ’"Â&öåWFFS¦ÖöFVÅfÇVR"Â&öäfö7W2%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBæ&öG•ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%&öF:’†÷6–öæÂ’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢–C¢&6öçG&7BÖfö÷FW"ÖVF—F÷""À¢&FF×6V7F–öâ#¢&fö÷FW""À¢&VFöæÇ“¢&ööÆVâ‡7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B’À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæfö÷FW"’ÒFWfVçB’À¢öäfö7W3¢FWfVçBÓâ‡7FFRæ7F—fU6V7F–öãÒvfö÷FW"r’À¢&÷w3¢#2"À¢Ö†ÆVæwFƒ¢#S"À¢Æ6V†öÆFW#¢%FW‡FòF–6–öæÂFRVæ6W'&ÖVçFò ¢ÒÂçVÆÂÂCÂ²'&VFöæÇ’"Â&öåWFFS¦ÖöFVÅfÇVR"Â&öäfö7W2%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBæfö÷FW%ÕÒ•Ò¢Ò’Â‚7FFRæG&gBç6÷W&6UöFö7…öf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢&6öçG&7B×W"æVÂ"À¢&&–ÖÆ&VÂ#¢%,:—f–FW‡GVÂF:v–æ ¢ÒÂ°¢‡7FFRæÆWGFW&†VEW&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–Ör"Â°¢¶W“¢À¢6Æ73¢&6öçG&7BÖÆWGFW&†VB"À¢7&3¢7FFRæÆWGFW&†VEW&ÂÀ¢ÇC¢%VÂF–Ö'&FòFòÖöFVÆò ¢ÒÂçVÆÂÂ‚Â²'7&2%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‚7FFRæÆWGFW&†VEW&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&6öçG&7B×W"Ö†VB ¢ÒÂ²†–FVçF—G’æÆövõ÷W&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–Ör"Â°¢¶W“¢À¢7&3¢–FVçF—G’æÆövõ÷W&ÂÀ¢ÇC¢tÆöv÷F—òFRr¶–FVçF—G’æF—7Æ•öæÖP¢ÒÂçVÆÂÂ‚Â²'7&2"Â&ÇB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†–FVçF—G’æF—7Æ•öæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$Fö7VÖVçFòF–ç7F—GVœ:|:6ò"•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×W"Ö6öçFVçB"ÒÂ²‡7FFRæG&gBæ†VFW"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'&W6W'fR ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæG&gBæ†VFW"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'&W6W'fR"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæG&gBæ&öG’ÇÂtòFW‡FòFòFö7VÖVçFò&V6W,:V’âr’Â’Â‡7FFRæG&gBæfö÷FW"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'&W6W'fR ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæG&gBæfö÷FW"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢‚7FFRæÆWGFW&†VEW&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&6öçG&7B×W"Öfö÷B ¢ÒÂ÷FôF—7Æ•7G&–ær†–FVçF—G’æF—7Æ•öæÖR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•ÒÂ‚Â²&F—6&ÆVB%Ò•Ò’•ÒÂcB’¢¢‡7FFRçF#ÓÓÒv—77VRr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢BÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ#+r6VÆV6–öæ"ÖG,:Ö7VÆ"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ%W7V—6RòÇVæò÷Ròì;¦ÖW&òFÖG,:Ö7VÆâ&VÆ:|:6òFRÖöFVÆ÷26öç6–FW&òæòÆWF—fòRf–|:¦æ6–â"’À¢‡7FFRæVç&öÆÆÖVçB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&6öçG&7BÖVç&öÆÆÖVçB ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæVç&öÆÆÖVçBç7GVFVçEöæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæVç&öÆÆÖVçBæçVÖ&W"’²"+r"²÷FôF—7Æ•7G&–ær‡7FFRæVç&öÆÆÖVçBç–V%öæÖR’²"+r"²÷FôF—7Æ•7G&–ær‡7FFRæVç&öÆÆÖVçBç7FGW2’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢6ÆV$Vç&öÆÆÖVç@¢ÒÂ%G&ö6"ÖG,:Ö7VÆ"Â‚Â²&öä6Æ–6²%Ò•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f÷&Ò"Â°¢¶W“¢À¢6Æ73¢&6öçG&7B×6V&6‚"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6V&6„Vç&öÆÆÖVçG2Â²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆBw&÷r"ÒÂµö7&VFUFW‡EdæöFR‚$ÇVæò÷RÖG,:Ö7VÆ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæVç&öÆÆÖVçE6V&6‚’ÒFWfVçB’À¢G—S¢'6V&6‚"À¢Ö–æÆVæwFƒ¢#""À¢Æ6V†öÆFW#¢$F–v—FRòÖVæ÷2"6&7FW&W2"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæVç&öÆÆÖVçE6V&6…ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRæVç&öÆÆÖVçE6V&6‚çG&–Ò‚’æÆVæwFƒÃ ¢ÒÂ%W7V—6""Â‚Â²&F—6&ÆVB%Ò•ÒÂCÂ²&öå7V&Ö—B%Ò’’À¢‡7FFRæVç&öÆÆÖVçD6†ö–6W2æÆVæwF‚bb7FFRæVç&öÆÆÖVçB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&6öçG&7B×&W7VÇG2 ¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæVç&öÆÆÖVçD6†ö–6W2Â†Vç&öÆÆÖVçB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢Vç&öÆÆÖVçBæ–BÀ¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†6†ö÷6TVç&öÆÆÖVçB†Vç&öÆÆÖVçB’¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†Vç&öÆÆÖVçBç7GVFVçEöæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†Vç&öÆÆÖVçBæçVÖ&W"’²"+r"²÷FôF—7Æ•7G&–ær†Vç&öÆÆÖVçBç–V%öæÖR’²"+r"²÷FôF—7Æ•7G&–ær†Vç&öÆÆÖVçBç7FGW2’Â•ÒÂ‚Â²&öä6Æ–6²%Ò’¢Ò’Â#‚’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’Â‡7FFRæVç&öÆÆÖVçB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ#"+r6VÆV6–öæ"ÖöFVÆòl:Æ–Fò"’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$ÖöFVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçFV×ÆFT–B’ÒFWfVçB’À¢öä6†ævS¢6VÆV7EFV×ÆFP¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæRVÒFö7VÖVçFò"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæÆ–6&ÆRÂ‡FV×ÆFR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢FV×ÆFRæ–BÀ¢fÇVS¢FV×ÆFRæ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡FV×ÆFRææÖR’²"+rfW'<:6ò"²÷FôF—7Æ•7G&–ær‡FV×ÆFRçfW'6–öâ’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRçFV×ÆFT–EÕÒ•Ò’Â‚7FFRæÆ–6&ÆRæÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'B–æfò76VB ¢ÒÂ$ì:6òŒ:ÖöFVÆ÷2F—f÷2l:Æ–F÷2&W7FÖG,:Ö7VÆâ6F7G&RVÒÖöFVÆò&òW,:ÖöFòæ&ÖöFVÆ÷2â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â‡7FFRæVç&öÆÆÖVçBbb7FFRçFV×ÆFT–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ#2+r6öæfW&—"R&VVæ6†W""’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$,:—f–Æ–6÷2FF÷2FW66öÆÂFòÇVæòÂFÖG,:Ö7VÆRF÷2&W7öç<:fV—2â–æf÷&ÖR÷26×÷2–æFVæFVçFW2Â6öÖòfÆ÷&W2f–ææ6V—&÷2ÂFFFR76–æGW&RFW7FV×Væ†2âFF÷2WFöÜ:F–6÷2¬:6F7G&F÷2FWfVÒ6W"6÷'&–v–F÷2æf–6†FR÷&–vVÒâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢&Wf–Wp¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–WsòtGVÆ—¦",:—f–s¢tvW&",:—f–r’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’À¢‡7FFRç&Wf–Wr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&6öçG&7B×&Wf–Wr ¢ÒÂ°¢‡7FFRç&Wf–WræÖ—76–æuöf–VÆG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–WræÖ—76–æuöf–VÆG2æÆVæwF‚’²"6×ò‡2’–æFVæFVçFR‡2’â&VVæ6†&—†òRGVÆ—¦R,:—f–â"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&Wf–Wu7FÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'B–æfò ¢ÒÂ$FF÷2ÇFW&F÷2âGVÆ—¦R,:—f–çFW2FVÖ—7<:6òâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ%&VVæ6†6öÖVçFR2–æf÷&Ö:|;VW2Æ–<:fV—2â÷6–öæ—2f¦–2ì:6ò&V6VÒæòDc²2ö'&–vL;7&–2W7L:6ò–FVçF–f–6F2â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×f&–&ÆRÖw&÷W2"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†f–VÆDw&÷W2Â†w&÷W’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢w&÷WÒÂ²†w&÷W¶W—2†w&÷W’æÆVæwF‚bb…²t6öçG&FçFR”’rÂuFW7FV×Væ†2uÒæ–æ6ÇVFW2†w&÷W’bfw&÷W¶W—2†w&÷W’æWfW'’†¶W“Óâf–VÆDÖWF†¶W’’ç&WV—&VB’’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â°¢¶W“¢À¢6Æ73¢&6öçG&7BÖ÷F–öæÂÖw&÷W ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†w&÷W’²"+r6×÷2÷6–öæ—2"Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×fÇVRÖw&–B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†w&÷W¶W—2†w&÷W’Â†¶W’’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFT&Æö6²…ö6ö×öæVçEö6öçG&7E÷fÇVUöf–VÆBÂ°¢¶W“¢¶W’À¢f–VÆC¢f–VÆDÖWF†¶W’’À¢fÇVS¢F—7Æ•fÇVR†¶W’’À¢öä6†ævS¢FWfVçBÓâ‡6WDf–VÆEfÇVR†¶W’ÂFWfVçB’¢ÒÂçVÆÂÂ‚Â²&f–VÆB"Â'fÇVR"Â&öä6†ævR%Ò’¢Ò’Â#‚’•Ò•Ò’¢¢†w&÷W¶W—2†w&÷W’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f–VÆG6WB"Â°¢¶W“¢À¢6Æ73¢&6öçG&7B×f&–&ÆRÖw&÷W ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†w&÷W’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×fÇVRÖw&–B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†w&÷W¶W—2†w&÷W’Â†¶W’’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFT&Æö6²…ö6ö×öæVçEö6öçG&7E÷fÇVUöf–VÆBÂ°¢¶W“¢¶W’À¢f–VÆC¢f–VÆDÖWF†¶W’’À¢fÇVS¢F—7Æ•fÇVR†¶W’’À¢öä6†ævS¢FWfVçBÓâ‡6WDf–VÆEfÇVR†¶W’ÂFWfVçB’¢ÒÂçVÆÂÂ‚Â²&f–VÆB"Â'fÇVR"Â&öä6†ævR%Ò’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â†w&÷W¶W—2†w&÷WÇG'VR’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â²¶W“¢"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†w&÷W’²"+rFF÷2¬:&VVæ6†–F÷2"Â’Âö7&VFTVÆVÖVçEdæöFR‚&FÂ"Â²6Æ73¢&6öçG&7B×&Vv—7G'’×7VÖÖ'’"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†w&÷W¶W—2†w&÷WÇG'VR’Â†¶W’’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²¶W“¢¶W’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&GB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†f–VÆDÆ&VÂ†¶W’’’Â’Âö7&VFTVÆVÖVçEdæöFR‚&FB"ÂçVÆÂÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wrçf&–&ÆW5¶¶W•Ò’²""Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ,+r"²÷FôF—7Æ•7G&–ær†f–VÆDÖWF†¶W’’ç6÷W&6R’Â•Ò•Ò’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂcB’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢6fU&W&F–öâÀ¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ%6Çf"&67Væ†ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæG&gDF—'G“òtÇFW&:|;VW2–æFì:6ò6Çf2s¢u&67Væ†òFW7FÖG,:Ö7VÆR&Wf—<:6òr’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"Â²6Æ73¢&6öçG&7B×&Wf–Wr×FövvÆR"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$6öæfW&—"6öçF\;¦FòFòFö7VÖVçFò"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&6öçG&7B×W"æVÂ"À¢&&–ÖÆ&VÂ#¢%,:—f–Fò6öçF\;¦Fò&VVæ6†–Fò ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×W"Ö†VB"ÒÂ²†–FVçF—G’æÆövõ÷W&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–Ör"Â°¢¶W“¢À¢7&3¢–FVçF—G’æÆövõ÷W&ÂÀ¢ÇC¢tÆöv÷F—òFRr¶–FVçF—G’æF—7Æ•öæÖP¢ÒÂçVÆÂÂ‚Â²'7&2"Â&ÇB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†–FVçF—G’æF—7Æ•öæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ%,:—f–FRVÖ—7<:6ò+rfW'<:6ò"²÷FôF—7Æ•7G&–ær‡7FFRç&Wf–WrçFV×ÆFU÷fW'6–öâ’Â•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×W"Ö6öçFVçB&W6W'fR"ÒÂ²‡7FFRç&Wf–Wræ†VFW"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wræ†VFW"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wræ6öçFVçB’Â’Â‡7FFRç&Wf–Wræfö÷FW"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wræfö÷FW"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×W"Öfö÷B"ÒÂ÷FôF—7Æ•7G&–ær†–FVçF—G’æF—7Æ•öæÖR’Â•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRç&Wf–Wu7FÆRÇÂ7FFRç&Wf–WræÖ—76–æuöf–VÆG2æÆVæwF‚À¢öä6Æ–6³¢F÷væÆöEFe&Wf–Wp¢ÒÂ$6öæfW&—"VÂF–Ö'&FòVÒDb"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Â†6â‚vFö7VÖVçG2ævVæW&FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRç&Wf–Wu7FÆRÇÂ7FFRç&Wf–WræÖ—76–æuöf–VÆG2æÆVæwF‚À¢öä6Æ–6³¢—77VP¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ'W7“òtVÖ—F–æFþ(
bs¢tVÖ—F—"R&—†"Dbr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ—77VVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'B7V66W72 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$Fö7VÖVçFòVÖ—F–FòR&W6W'fFòæf–6†FòÇVæòâ"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&Æ–æ²Ö'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢F÷væÆöD—77VV@¢ÒÂ$&—†"æ÷fÖVçFR"Â‚Â²&öä6Æ–6²%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂcB’¢¢‡7FFRçF#ÓÓÒw6–væGW&W2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFT&Æö6²…ö6ö×öæVçE÷6–væ–æu÷æVÂÂ°¢¶W“¢66†ööÄ–B²s¢r²†Vç&öÆÆÖVçD–BÇÂ‡7FFRæVç&öÆÆÖVçBbb7FFRæVç&öÆÆÖVçBæ–B’ÇÂrr’²s¢r²†—77VVD–BÇÂrr’À¢ÖöFS¢&Fö7VÖVçB"À¢'66†ööÂÖ–B#¢66†ööÄ–BÀ¢W&Ö—76–öç3¢W&Ö—76–öç2À¢&öÆS¢&öÆRÀ¢&Vç&öÆÆÖVçBÖ–B#¢Vç&öÆÆÖVçD–BÇÂ‡7FFRæVç&öÆÆÖVçBbb7FFRæVç&öÆÆÖVçBæ–B’ÇÂrrÀ¢&—77VVBÖ–B#¢—77VVD–@¢ÒÂçVÆÂÂ‚Â²'66†ööÂÖ–B"Â'W&Ö—76–öç2"Â'&öÆR"Â&Vç&öÆÆÖVçBÖ–B"Â&—77VVBÖ–B%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢Ð§ÒÇ6–væ–æs¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²FôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂ7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂæ÷&ÖÆ—¦T6Æ73¢öæ÷&ÖÆ—¦T6Æ72Â7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Âv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2ÂdÖöFVÄ6†V6¶&÷ƒ¢÷dÖöFVÄ6†V6¶&÷‚Â&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÒÒõgVP ¢&WGW&â†—47W'&VçB‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢&6öçG&7B×6–væGW&W2"À¢&&–ÖÆ&VÂ#¢&VÆ&VÂ‚¢ÒÂ°¢‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRææ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRææ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæÆöF–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&ÆöF–ær×7G&—"À¢&öÆS¢'7FGW2 ¢ÒÂ$6'&VvæFþ(
b"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†6äÖævT‚’bb—4ÖöFR‚v6W'F–f–6FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢2À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$4U%D”d”4DòD”å5D•ETœ8|84ò"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$6W'F–f–6Fò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6F7G&Rò6W'F–f–6FòFÖçFVæVF÷&R6ö×æ†R7VfÆ–FFRâ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&&FvR"Â6W'F–f–6FTW‡—&VB‚“òvW‡—&VBs§7FFRæ6öæf–wW&VCòv7F—fRs¢wVæF–æruÒ’ÒÂ÷FôF—7Æ•7G&–ær†6W'F–f–6FTW‡—&VB‚“òufVæ6–Fòs§7FFRæ6öæf–wW&VCòt6öæf–wW&Fòs¢tì:6ò6öæf–wW&Fòr’Â2•Ò’À¢‡7FFRæ6W'F–f–6FR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&6öçG&7BÖ6W'F–f–6FRÖÖWFFF ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ%F—GVÆ""’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæ6W'F–f–6FRç7V&¦V7B’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ%fÆ–FFR"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡7FFRæ6W'F–f–6FRæW‡—&W5öB’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$–FVçF–f–6:|:6òL:–6æ–6"’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$–×&W7<:6òF–v—FÂ4„Ó#Sb"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"Â²6Æ73¢&Ööæò"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ6W'F–f–6FRæ6W'F–f–6FU÷6†#Sb’Â•Ò•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'B–æfò ¢ÒÂ$ÖöFVÆ÷2VRW†–vVÒ76–æGW&FW66öÆ6öÖVçFRöFW,:6ò6W"VÖ—F–F÷2;726öæf–wW&:|:6òFòâ"’’À¢†6äÖævT‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f÷&Ò"Â°¢¶W“¢"À¢6Æ73¢&6öçG&7BÖ6W'F–f–6FRÖf÷&Ò"À¢WFö6ö×ÆWFS¢&öfb"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fT6W'F–f–6FRÂ²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡7FFRæ6öæf–wW&VCòu7V'7F—GV—"6W'F–f–6Fòs¢t6F7G&"6W'F–f–6Fòr’²""õe‚†L:’Ô"’"Â’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢–C¢&Ö6W'F–f–6FRÖf–ÆR"À¢G—S¢&f–ÆR"À¢66WC¢"ç"Âçg‚ÆÆ–6F–öâ÷‚×¶73""À¢öä6†ævS¢6W'F–f–6FT6†ævVBÀ¢&WV—&VC¢" ¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%6Væ†Fò'V—fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6W'F–f–6FU77v÷&B’ÒFWfVçB’À¢G—S¢'77v÷&B"À¢WFö6ö×ÆWFS¢&öfb"À¢Ö†ÆVæwFƒ¢##Sb"À¢&WV—&VC¢""À¢Æ6V†öÆFW#¢%6Væ†Fò"õe‚ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ6W'F–f–6FU77v÷&EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRæ6W'F–f–6FTæÖRÇÂ7FFRæ6W'F–f–6FU77v÷&@¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ'W7“òtVçf–æFþ(
bs¢u6Çf"6W'F–f–6Fòr’Â’Â²&F—6&ÆVB%Ò’Â‡7FFRæ6öæf–wW&VB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRç&VÖ÷fT6W'F–f–6FT÷Vã×G'VR¢ÒÂ$FW6F—f"6W'F–f–6Fò"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•ÒÂCÂ²&öå7V&Ö—B%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&VÖ÷fT6W'F–f–6FT÷Vâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢2À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$FW6F—f"ò6W'F–f–6Fò&gWGW&276–æGW&3ò÷2Fö7VÖVçF÷2¬:76–æF÷26W,:6ò&W6W'fF÷2â"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRç&VÖ÷fT6W'F–f–6FT÷VãÖfÇ6R¢ÒÂ$ÖçFW"6W'F–f–6Fò"Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢&VÖ÷fT6W'F–f–6FP¢ÒÂ$FW6F—f""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$7V'7F—GVœ:|:6ò&W6W'f÷2Fö7VÖVçF÷2¬:76–æF÷2âò6W'F–f–6FòR6Væ†<:6òVçf–F÷2ò6W'f–F÷"Væ2ò6Çf#²ì:6ò<:6òwV&FF÷2æò&Ö¦VæÖVçFòFW7FRæfVvF÷"â"¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†6äÖævT‚’bb—4ÖöFR‚v6W'F–f–6FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢BÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ%$Täõd8|84ò"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$f—6÷2FRfVæ6–ÖVçFò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%&V6V&ÆVÖ'&WFW26öÒ3ÂRÂrRF–FRçFV6VL:¦æ6–RòfVæ6W"â"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â²öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fTÆW'E&VfW&Væ6W2Â²'&WfVçB%Ò’ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7BÖ6W'F–f–6FRÖf÷&Ò"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB6†V6¶&÷‚Öf–VÆB"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæÆW'G2æVÖ–ÅöVæ&ÆVB’ÒFWfVçB’À¢G—S¢&6†V6¶&÷‚ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæÆW'G2æVÖ–ÅöVæ&ÆVEÕÒ’Âö7&VFUFW‡EdæöFR‚%&V6V&W"æòÖWRRÖÖ–Â"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB6†V6¶&÷‚Öf–VÆB"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæÆW'G2çv†G6öVæ&ÆVB’ÒFWfVçB’À¢G—S¢&6†V6¶&÷‚"À¢F—6&ÆVC¢7FFRæÆW'G2ç†öæUöf–Æ&ÆP¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæÆW'G2çv†G6öVæ&ÆVEÕÒ’Âö7&VFUFW‡EdæöFR‚%&V6V&W"æòÖWRv†G4"•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂµö7&VFUFW‡EdæöFR‚$RÖÖ–Ã¢"²÷FôF—7Æ•7G&–ær‡7FFRæÆW'G2æVÖ–Â’²"â"Â’Â‚7FFRæÆW'G2ç†öæUöf–Æ&ÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â²¶W“¢ÒÂ$6F7G&R6WRv†G46öÒDD’RDDBVÒÖWRW&f–Â&F—f"W76R6æÂâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFUFW‡EdæöFR‚"÷2Vçf–÷2W6Ò÷26W'fœ:v÷2FR6ö×Væ–6:|:6ò6öæf–wW&F÷2VÆFÖ–æ—7G&:|:6òâ"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$òf—6òæÆ–6:|:6òf–6F—7öì:×fVÂ&F—&\:|:6òRFÖ–æ—7G&:|:6òâ6F6æÂ:’÷6–öæÂRW66WW2,;7&–÷2FF÷2FR6öçFFòâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢'7V&Ö—B"À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ%6Çf"&VfW,:¦æ6–2"Â‚Â²&F—6&ÆVB%Ò¢ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†6â‚vFö7VÖVçG2ç&VBr’bb—4ÖöFR‚wVæF–ær×6–væGW&W2r’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢RÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ%TäL8¤ä4”2"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$76–æGW&2VæFVçFW2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$Fö7VÖVçF÷2VÖ—F–F÷2VRwV&FÒ76–æGW&FW66öÆâ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢Æö@¢ÒÂ$GVÆ—¦""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’À¢†6å6–vâ‚’bb7FFRæÆöF–ærbb‚7FFRæ6öæf–wW&VBÇÂ6W'F–f–6FTW‡—&VB‚’’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ÷FôF—7Æ•7G&–ær†6W'F–f–6FTW‡—&VB‚“òtò6W'F–f–6FòfVæ6WRâs¢t–ç7F—GVœ:|:6ò–æFì:6òFVÒVÒ6W'F–f–6Fò6öæf–wW&Fòâr’²"6W76R6öæf–wW&:|;VW2(i"6W'F–f–6F÷2&"²÷FôF—7Æ•7G&–ær†6W'F–f–6FTW‡—&VB‚“òw7V'7F—G\:ÒÖÆòs¢v6F7G,:ÖÆòr’²"â"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‚7FFRçVç6–væVBæÆVæwF‚bb7FFRæÆöF–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂ$æVæ‡VÒFö7VÖVçFòwV&FæFò76–æGW&â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçVç6–væVBÂ†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢—FVÒæFö7VÖVçEö–BÀ¢6Æ73¢&6öçG&7B×VWVR×&÷r ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒç7GVFVçEöæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†¶–æDÆ&VÂ†—FVÒæ¶–æB’’²"+r"²÷FôF—7Æ•7G&–ær†FFR†—FVÒæ7&VFVEöB’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB†—FVÒæf–ÆUö–BÂvFö7VÖVçFòÖ÷&–v–æÂçFbr’¢ÒÂ$6öæfW&—"Db"Â‚Â²&öä6Æ–6²%Ò’Â†6å6–vâ‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×&–Ö'’6ÖÆÂÖ'WGFöâ"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRæ6öæf–wW&VBÇÂ6W'F–f–6FTW‡—&VB‚’À¢öä6Æ–6³¢FWfVçBÓâ‡6–väFö7VÖVçB†—FVÒæFö7VÖVçEö–B’¢ÒÂ$76–æ"6öÒ"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’¢Ò’Â#‚’’À¢‡7FFRçVç6–væVEF÷FÃç7FFRæÆ–Ö—B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢'v–æF–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRçVç6–væVEF÷FÂ’²"Fö7VÖVçF÷2"Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢F—6&ÆVC¢7FFRçVç6–væVDöfg6WCÓÓÓÇÂ7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ‡Vç6–væVEvR‚Ó’¢ÒÂ$çFW&–÷""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢F—6&ÆVC¢7FFRçVç6–væVDöfg6WB·7FFRæÆ–Ö—Cã×7FFRçVç6–væVEF÷FÂÇÂ7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ‡Vç6–væVEvRƒ’¢ÒÂ%,;7†–Ö"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†—4ÖöFR‚vFö7VÖVçBr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢bÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$Fö7VÖVçF÷2FÖG,:Ö7VÆ"’Â‚7FFRæVç&öÆÆÖVçD—77VVBæÆVæwF‚bb7FFRæÆöF–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂ$æVæ‡VÒFö7VÖVçFòVÖ—F–Fò&W7FÖG,:Ö7VÆâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæVç&öÆÆÖVçD—77VVBÂ†Fö7VÖVçB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢Fö7VÖVçBæ–BÀ¢6Æ73¢&6öçG&7B×VWVR×&÷r ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†Fö7VÖVçBçFV×ÆFUöæÖWÇÆ¶–æDÆ&VÂ†Fö7VÖVçBæ¶–æB’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR†Fö7VÖVçBæ7&VFVEöB’’²"+r"²÷FôF—7Æ•7G&–ær†Æ&VÂ†Fö7VÖVçBç6–væGW&U÷7FGW2’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†÷Vå&Wf–Wr†Fö7VÖVçBæ–B’¢ÒÂ$6öç7VÇF"Fö7VÖVçFò"Â‚Â²&öä6Æ–6²%Ò’Â†Fö7VÖVçBç6–væGW&U÷7FGW3ÓÓÒwVç6–væVBrbb6å6–vâ‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×&–Ö'’6ÖÆÂÖ'WGFöâ"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRæ6öæf–wW&VBÇÂ6W'F–f–6FTW‡—&VB‚’À¢öä6Æ–6³¢FWfVçBÓâ‡6–väFö7VÖVçB†Fö7VÖVçBæ–B’¢ÒÂ$76–æ"6öÒ"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’¢Ò’Â#‚’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†—4ÖöFR‚w6–væGW&R×&Wf–Wrr’bb6â‚vFö7VÖVçG2çfÆ–FFRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢rÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$Dô5TÔTåDõ2DUdôÅd”Dõ2TÄ2dÜ8ÔÄ”2"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$6öæfW,:¦æ6–FR76–æGW&2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6öæf—&÷2Dg276–æF÷2VÆ÷2&W7öç<:fV—2çFW2FR&÷f"÷R6öÆ–6—F"6÷'&\:|:6òâ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢Æö@¢ÒÂ$GVÆ—¦"f–Æ"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’À¢‚7FFRçVæF–æræÆVæwF‚bb7FFRæÆöF–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$æVæ‡VÖ76–æGW&W‡FW&æVæFVçFRFR&Wf—<:6òæW7FW66öÆâ"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRçVæF–ærÂ†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢—FVÒæFö7VÖVçEö–BÀ¢6Æ73¢&6öçG&7B×VWVR×&÷r ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒç7GVFVçEöæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†¶–æDÆ&VÂ†—FVÒæ¶–æB’’²"+r"²÷FôF—7Æ•7G&–ær†FFR†—FVÒæ7&VFVEöB’’²"+r"²÷FôF—7Æ•7G&–ær†Æ&VÂ†—FVÒç6–væGW&U÷7FGW2’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†÷Vå&Wf–Wr†—FVÒæFö7VÖVçEö–B’¢ÒÂ$æÆ—6"Db"Â‚Â²&öä6Æ–6²%Ò•Ò’¢Ò’Â#‚’’À¢‡7FFRçVæF–æuF÷FÃç7FFRæÆ–Ö—B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'v–æF–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRçVæF–æuF÷FÂ’²"VæFVçFR‡2’+r"²÷FôF—7Æ•7G&–ær‡7FFRæöfg6WB³’².(	2"²÷FôF—7Æ•7G&–ær„ÖF‚æÖ–â‡7FFRæöfg6WB·7FFRæÆ–Ö—BÇ7FFRçVæF–æuF÷FÂ’’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢F—6&ÆVC¢7FFRæöfg6WCÓÓÓÇÂ7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ‡vR‚Ó’¢ÒÂ$çFW&–÷""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢F—6&ÆVC¢7FFRæöfg6WB·7FFRæÆ–Ö—Cã×7FFRçVæF–æuF÷FÂÇÂ7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ‡vRƒ’¢ÒÂ%,;7†–Ö"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&Wf–Wrbb—4ÖöFR‚v6W'F–f–6FRr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢‚À¢6Æ73¢'æVÂ‚Ö6&B"À¢&&–ÖÆ&VÂ#¢%&Wf—<:6òFR76–æGW& ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$„•5L95$”4òDòDô5TÔTåDò"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–WuF—FÆR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$76–æGW&2R†—7L;7&–6òFòFö7VÖVçFò"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&&FvR"Â7FFRç&Wf–Wrç7FGW3ÓÓÒwfW&–f–VBsòv7F—fRs§7FFRç&Wf–Wrç7FGW3ÓÓÒw&V¦V7FVBsòw&V¦V7FVBs¢wVæF–æruÒ’ÒÂ÷FôF—7Æ•7G&–ær†Æ&VÂ‡7FFRç&Wf–Wrç7FGW2’’Â2•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öçG&7B×fW&–f–6F–öâ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$–çFVw&–FFR7&—Föw,:f–6"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wræ7'—Föw&†–5÷fÆ–CÓÓ×G'VSòul:Æ–Fs§7FFRç&Wf–Wræ7'—Föw&†–5÷fÆ–CÓÓÖfÇ6Sòt–çl:Æ–Fs¢t–æFì:6ò76–æFr’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$6FV–FR6öæf–ì:v"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–WrçG'W7E÷7FGW7ÇÂtì:6ò–æf÷&ÖFr’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ%&Wföv:|:6ò6öç7VÇFF"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wrç&Wfö6F–öåö6†V6¶VCÓÓ×G'VSòu6–Òs§7FFRç&Wf–Wrç&Wfö6F–öåö6†V6¶VCÓÓÖfÇ6Sòtì:6òs¢tì:6òF—7öì:×fVÂr’Â•Ò•Ò’À¢‡7FFRç&Wf–Wrç7FGW3ÓÓÒwVæF–æu÷fÆ–FF–öâr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ$6öæfW,:¦æ6–æòdÄ”D"ô•D’R6ö×&:|:6òFò5bFò&W7öç<:fVÂW†–vVÒì:Æ—6R‡VÖæâÖG,:Ö7VÆì:6òFWfR6W"Æ–&W&FçFW2FfÆ–F:|:6ò&Vv—7G&Fâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&Wf–Wræ7'—Föw&†–5÷fÆ–CÓÓÖfÇ6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷" ¢ÒÂ$–çFVw&–FFR7&—Föw,:f–6FòDbfÆ†÷Râì:6òfÆ–FRW7F76–æGW&â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ²‡7FFRç&Wf–Wræf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB‡7FFRç&Wf–Wræf–ÆUö–BÂvFö7VÖVçFò×&Wf—6òÖGVÂçFbr’¢ÒÂ$&—†"DbGVÂ"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&Wf–Wrç&Wf—6–öç2Â‡&Wf—6–öâ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢&Wf—6–öâæ–BÀ¢6Æ73¢&6öçG&7B×&Wf—6–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡&Wf—6–öâç6÷W&6SÓÓÒv6ö×ç•ösòt76–æGW&FW66öÆs¢t76–æGW&W‡FW&æFò&W7öç<:fVÂr’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡&Wf—6–öâæ7&VFVEöB’’²"+r"²÷FôF—7Æ•7G&–ær‡&Wf—6–öâç6–væW"’²"+r"²÷FôF—7Æ•7G&–ær‡&Wf—6–öâçG'W7E÷7FGW2’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"Â²6Æ73¢&Ööæò"ÒÂ%4„Ó#Sb"²÷FôF—7Æ•7G&–ær‡&Wf—6–öâç6†#Sb’Â’À¢‡&Wf—6–öâçfÆ–FFVEöB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ$6öæfW&–FòVÒ"²÷FôF—7Æ•7G&–ær†FFR‡&Wf—6–öâçfÆ–FFVEöB’’²"+r&VfW,:¦æ6–"²÷FôF—7Æ•7G&–ær‡&Wf—6–öâçfÆ–FF–öå÷&VfW&Væ6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡&Wf—6–öâç&V¦V7F–öå÷&V6öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ$FWföÇf–Fó¢"²÷FôF—7Æ•7G&–ær‡&Wf—6–öâç&V¦V7F–öå÷&V6öâ’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&Æ–æ²Ö'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB‡&Wf—6–öâæf–ÆUö–BÂvFö7VÖVçFòÖ76–æFòçFbr’¢ÒÂ$&—†"&Wf—<:6ò"Â‚Â²&öä6Æ–6²%Ò’Â‡&Wf—6–öâçfÆ–FF–öåöWf–FVæ6Uöf–ÆUö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&Æ–æ²Ö'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB‡&Wf—6–öâçfÆ–FF–öåöWf–FVæ6Uöf–ÆUö–BÂw&VÆF÷&–ò×fÆ–F"Ö—F’çFbr’¢ÒÂ%&VÆL;7&–òdÄ”D"ô•D’"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’¢Ò’Â#‚’’À¢‡7FFRç&Wf–Wrç7FGW3ÓÓÒwVæF–æu÷fÆ–FF–öârbb6äFV6–FR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢"À¢6Æ73¢&6öçG&7BÖFV6—6–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%&Vv—7G&"6öæfW,:¦æ6–æòdÄ”D"ô•D’"’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$'&òDb6–Öæò6W'fœ:vòöf–6–ÂFRfÆ–F:|:6òÂ6öæf—&ò&W7VÇFFòRò5bFò6–væL:&–òâæW†Rò&VÆL;7&–òDbvW&FòVÆòdÄ”D"ô•D’R&Vv—7G&R7V&VfW,:¦æ6–âò&VÆL;7&–ò–çFVw&ò†—7L;7&–6ò–×WL:fVÂFW7FRFö7VÖVçFòâ"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&6öçG&7BÖFV6—6–öâÖf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡fÆ–FFRÂ²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$5bFò&W7öç<:fVÂ6öæfW&–Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç6–væW$7b’ÒFWfVçB’À¢–çWFÖöFS¢&çVÖW&–2"À¢WFö6ö×ÆWFS¢&öfb"À¢Ö†ÆVæwFƒ¢#B"À¢Æ6V†öÆFW#¢#ããÓ"À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRç6–væW$7eÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%&VfW,:¦æ6–Fò&VÆL;7&–ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçfÆ–FF–öå&VfW&Væ6R’ÒFWfVçB’À¢WFö6ö×ÆWFS¢&öfb"À¢Ö†ÆVæwFƒ¢##"À¢Æ6V†öÆFW#¢$–FVçF–f–6F÷"FòdÄ”D"ô•D’"À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRçfÆ–FF–öå&VfW&Væ6UÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%&VÆL;7&–òDbFòdÄ”D"ô•D’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢"çFbÆÆ–6F–öâ÷Fb"À¢öä6†ævS¢&W÷'D6†ævVBÀ¢&WV—&VC¢" ¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB6†V6¶&÷‚Öf–VÆBv–FR"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öæf—&ÖVE&Wf–Wr’ÒFWfVçB’À¢G—S¢&6†V6¶&÷‚"À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæ6öæf—&ÖVE&Wf–WuÕÒ’Âö7&VFUFW‡EdæöFR‚$6öæfW&’–çFVw&–FFRFòDbÂ–FVçF–FFRRò&W7VÇFFòFò&VÆL;7&–ò"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRæ6öæf—&ÖVE&Wf–WrÇÂ7FFRç&W÷'DæÖP¢ÒÂ%&Vv—7G&"fÆ–F:|:6ò"Â‚Â²&F—6&ÆVB%Ò¢ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$FWföÇfW"76–æGW&"’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$W‡Æ—VRò&ö&ÆVÖ²fW'<:6ò÷&–v–æÂFW66öÆ6öçF–çV,:F—7öì:×fVÂ&æ÷fòVçf–òVÆò&W7öç<:fVÂâ"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â²öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡&V¦V7BÂ²'&WfVçB%Ò’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$Ö÷F—fòFFWföÇ\:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç&V¦V7F–öå&V6öâ’ÒFWfVçB’À¢&÷w3¢#B"À¢Ö–æÆVæwFƒ¢#"À¢Ö†ÆVæwFƒ¢##"À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRç&V¦V7F–öå&V6öåÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’76VB"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRç&V¦V7F–öå&V6öâçG&–Ò‚’æÆVæwFƒÃ ¢ÒÂ$FWföÇfW"&6÷'&\:|:6ò"Â‚Â²&F—6&ÆVB%Ò•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂ‚Â²&&–ÖÆ&VÂ%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ð§ÒÇ&W÷'G3¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂ&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²ÂFôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Â7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂ7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2Âæ÷&ÖÆ—¦T6Æ73¢öæ÷&ÖÆ—¦T6Æ72ÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²6Æ73¢'&W÷'G2×v÷&·76R"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$4ôå5TÅDRU…õ%D8|84ò"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ%&VÆL;7&–÷2FW66öÆ"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$W66öÆ†ò&VÆL;7&–òRòW,:ÖöFòVRFW6V¦6ö×æ†"â"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â²öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ†vVæW&FR‚’’Â²'&WfVçB%Ò’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢F—6&ÆVC¢7FFRæ'W7’À¢6Æ73¢'&W÷'BÖf–ÇFW"Öf–VÆG2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%&VÆL;7&–ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢%&VÆL;7&–ò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ¶–æB’ÒFWfVçB’À¢öä6†ævS¢6†ævT¶–æBÀ¢&WV—&VC¢" ¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ6FÆörÂ†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒæ–BÀ¢fÇVS¢—FVÒæ–@¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒçF—FÆR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ¶–æEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W,:ÖöFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢%W,:ÖöFò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç&W6WB’ÒFWfVçB’À¢öä6†ævS¢W&–ö@¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&Æ7B×F‡&VR"ÒÂ,9¦ÇF–Ö÷2G,:§2ÖW6W26ö×ÆWF÷2"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&ÖöçF‚"ÒÂ$Ü:§2GVÂ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'V'FW""ÒÂ%G&–ÖW7G&RGVÂ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'–V""ÒÂ$æòGVÂ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&7W7FöÒ"ÒÂ%W'6öæÆ—¦Fò"¢ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRç&W6WEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFR"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæFFTg&öÒ’ÒFWfVçB’À¢öä–çWC¢FWfVçBÓâ‡7FFRç&W6WCÒv7W7FöÒr’À¢&WV—&VC¢" ¢ÒÂçVÆÂÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä–çWB%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæFFTg&öÕÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$L:’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFR"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæFFUFò’ÒFWfVçB’À¢öä–çWC¢FWfVçBÓâ‡7FFRç&W6WCÒv7W7FöÒr’À¢Ö–ã¢7FFRæFFTg&öÒÀ¢&WV—&VC¢" ¢ÒÂçVÆÂÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä–çWB"Â&Ö–â%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæFFUFõÕÒ•Ò¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"Â²6Æ73¢'&W÷'BÖW‡G&Öf–ÇFW'2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$Ö—2f–ÇG&÷2"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂ°¢†f–ÇFW$ÆÆ÷vVB‚v6FVÖ–5÷–V%ö–Br’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚$æòÆWF—fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6FVÖ–5–V"’ÒFWfVçB’À¢öä6†ævS¢FWfVçBÓâ‡7FFRæ6Æ74w&÷WÒrr¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF÷2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6FÆöw5²v6FVÖ–2×–V'2uÒÇÂµÒÂ†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒæ–BÀ¢fÇVS¢—FVÒæ–@¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ6FVÖ–5–V%ÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†f–ÇFW$ÆÆ÷vVB‚wVæ—Eö–Br’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%Væ–FFR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçVæ—B’ÒFWfVçB’À¢öä6†ævS¢FWfVçBÓâ‡7FFRæ6Æ74w&÷WÒrr¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6FÆöw2çVæ—G2ÇÂµÒÂ†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒæ–BÀ¢fÇVS¢—FVÒæ–@¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRçVæ—EÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†f–ÇFW$ÆÆ÷vVB‚v6Æ75öw&÷Wö–Br’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢"ÒÂµö7&VFUFW‡EdæöFR‚%GW&Ö"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6Æ74w&÷W’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6Æ76W2‚’Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒæ–BÀ¢fÇVS¢—FVÒæ–@¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ6Æ74w&÷WÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡6VÆV7FVB‚“òç7FGW6W3òæÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢2ÒÂµö7&VFUFW‡EdæöFR‚%6—GV:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç7FGW2’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡6VÆV7FVB‚’ç7FGW6W2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒçfÇVRÀ¢fÇVS¢—FVÒçfÇVP¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒæÆ&VÂ’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRç7FGW5ÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W7V—6""’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç’ÒFWfVçB’À¢G—S¢'6V&6‚"À¢Ö†ÆVæwFƒ¢#c"À¢Æ6V†öÆFW#¢$æöÖR÷R–FVçF–f–6:|:6ò ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRçÕÒ•Ò¢Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'&W÷'BÖvVæW&FR×&÷r"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB6ÖÆÂ"ÒÂ÷FôF—7Æ•7G&–ær‡6VÆV7FVB‚“òæFFUö&6—2’Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢7FFRæ¶–æ@¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ'W7“òtvW&æFþ(
bs¢tvW&"&VÆL;7&–òr’Â’Â²&F—6&ÆVB%Ò•Ò•ÒÂ‚Â²&F—6&ÆVB%Ò•ÒÂCÂ²&öå7V&Ö—B%Ò’Â‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Â‡7FFRç&W7VÇB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'&W÷'B×&W7VÇB"À¢&&–ÖÆ—fR#¢'öÆ—FR"À¢&&–Ö'W7’#¢7FFRæ'W7¢ÒÂ°¢†6†ævVB‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ$÷2f–ÇG&÷2f÷&ÒÇFW&F÷2â6Æ—VRVÒvW&"&VÆL;7&–ò&GVÆ—¦"÷2&W7VÇFF÷2â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'&W÷'BÖÖWG&–72"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7VÇBç7VÖÖ'’Â†ÖWG&–2’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢ÖWG&–2æ¶W’À¢6Æ73¢'æVÂ&W÷'BÖÖWG&–2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖWG&–2æÆ&VÂ’Â’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡fÇVR†ÖWG&–2çfÇVRÆÖWG&–2çG—R’’Â•Ò’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'æVÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&W7VÇBçF—FÆR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB6ÖÆÂ"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç&W7VÇBçW&–öBæÆ&VÂ’²"+r"²÷FôF—7Æ•7G&–ær‡7FFRç&W7VÇBçF÷FÂ’²"&Vv—7G&ò‡2’"Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ6†ævVB‚’À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB‚v77br’¢ÒÂ$W‡÷'F"55b"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ6†ævVB‚’À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB‚wFbr’¢ÒÂ$&—†"Db"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'&W÷'BÖÆ–VBÖf–ÇFW'2"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7VÇBæf–ÇFW'2Â†f–ÇFW"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢f–ÇFW"æÆ&VÂÀ¢6Æ73¢&&FvR ¢ÒÂ÷FôF—7Æ•7G&–ær†f–ÇFW"æÆ&VÂ’²#¢"²÷FôF—7Æ•7G&–ær†f–ÇFW"çfÇVR’Â’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'F&ÆR×67&öÆÂ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&6F–öâ"Â²6Æ73¢'7"ÖöæÇ’"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç&W7VÇBçF—FÆR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7VÇBæ6öÇVÖç2Â†6öÇVÖâ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'F‚"Â°¢¶W“¢6öÇVÖâæ¶W’À¢66÷S¢&6öÂ ¢ÒÂ÷FôF—7Æ•7G&–ær†6öÇVÖâæÆ&VÂ’Â’¢Ò’Â#‚’•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7VÇBæ—FV×2Â†—FVÒÂ–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢–æFW‚ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7VÇBæ6öÇVÖç2Â†6öÇVÖâ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'FB"Â°¢¶W“¢6öÇVÖâæ¶W’À¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡²vçVÖW&–2Ö6VÆÂs¦6öÇVÖâçG—SÓÓÒv7W'&Væ7’wÒ¢ÒÂ÷FôF—7Æ•7G&–ær‡fÇVR†—FVÕ¶6öÇVÖâæ¶W•ÒÆ6öÇVÖâçG—R’’Â2’¢Ò’Â#‚’•Ò’¢Ò’Â#‚’•Ò•Ò•Ò’À¢‚7FFRç&W7VÇBçF÷FÂ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$æVæ‡VÒ&Vv—7G&òæW7FRW,:ÖöFò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$§W7FR2FF2÷R÷2f–ÇG&÷2&×Æ–"6öç7VÇFâ"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&W7VÇBçF÷FÃç7FFRç&W7VÇBçvU÷6—¦R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'v–æF–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ6†ævVB‚’ÇÂ7FFRçvSÃÓÀ¢öä6Æ–6³¢FWfVçBÓâ†vVæW&FR‡7FFRçvRÓ’¢ÒÂ$çFW&–÷""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ%:v–æ"²÷FôF—7Æ•7G&–ær‡7FFRçvR’²"FR"²÷FôF—7Æ•7G&–ær„ÖF‚æ6V–Â‡7FFRç&W7VÇBçF÷FÂ÷7FFRç&W7VÇBçvU÷6—¦R’’Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ6†ævVB‚’ÇÂ7FFRçvR§7FFRç&W7VÇBçvU÷6—¦Sã×7FFRç&W7VÇBçF÷FÂÀ¢öä6Æ–6³¢FWfVçBÓâ†vVæW&FR‡7FFRçvR³’¢ÒÂ%,;7†–Ö"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’À¢‡7FFRç&W7VÇBæÖöçF†Ç’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%&W7VÖò÷"Ü:§2"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'&W÷'BÖÖöçF‡2"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7VÇBæÖöçF†Ç’Â†ÖöçF‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â²¶W“¢ÖöçF‚æÖöçF‚ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖöçF‚æÆ&VÂ’Â’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖöçF‚æ6÷VçB’²"&Vv—7G&ò‡2’"Â’Â†ÖöçF‚æÖ÷VçBÓ×VæFVf–æVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡fÇVR†ÖöçF‚æÖ÷VçBÂv7W'&Væ7’r’’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&W7VÇBææ÷FW2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â°¢¶W“¢"À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$7&—L:—&–÷2Fò&VÆL;7&–ò"’Âö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7VÇBææ÷FW2Â†æ÷FR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢æ÷FRÒÂ÷FôF—7Æ•7G&–ær†æ÷FR’Â’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂ‚Â²&&–Ö'W7’%Ò’¢¢‚7FFRæ'W7’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂV×G’×7FFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$–æf÷&Ö:|:6òVRfö<:¢&V6—6ÂæòW,:ÖöFò6W'Fò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6öç7VÇFR÷2&Vv—7G&÷2VÒFVÆ÷RvW&RVÒFö7VÖVçFò6öÒ÷2f–ÇG&÷2Â÷2F÷F—2R–FVçF–f–6:|:6òFW66öÆâ"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢Ð§ÒÆÆVv7”–×÷'C¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂFôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Â7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2Â&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂæ÷&ÖÆ—¦T6Æ73¢öæ÷&ÖÆ—¦T6Æ72ÂdÖöFVÄ6†V6¶&÷ƒ¢÷dÖöFVÄ6†V6¶&÷‚ÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²6Æ73¢&–×÷'B×v÷&·76R"ÒÂ°¢‡7FFRæ66W73òæ6åöÖævR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$&6·W6ö×ÆWFòF–ç7FÆ:|:6ò"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ‡'Vâ†ÆöD&6·W2’¢ÒÂ$GVÆ—¦"†—7L;7&–6ò"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$–æ6ÇV’FöF22W66öÆ2Â&æ6ò÷7Fw&U5ÂÂFö7VÖVçF÷2Æö6—2÷RÖ–ä”òR&:×¦W2FR6öæf–ì:vâGW&çFR<;7–Âw&f:|;VW2wV&FÒòL:—&Ö–æòâÖçFVæ†26†fW2FR7&—Föw&f–VÒ<;7–6VwW&6W&Fâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$g&W\:¦æ6–ÖçVÂâæVæ‡VÒ&6·W:’vFòWFöÖF–6ÖVçFRâ&W7FW&:|:6ó¢&W&Rò6÷FR&—†òR6öæf—&ÖRæòFWÆ÷–W"Æö6Ââ÷26W'fœ:v÷26W,:6ò&F÷2RòW7FFòçFW&–÷"&W6W'fFòçFW2F7V'7F—GVœ:|:6òâ6R†÷WfW"'V—f÷2W6VçFW2÷R6÷'&ö×–F÷2Â&÷F\:|:6ò&Vv—7G&W762f&–2RwV&F÷2'—FW2F—7öì:×fV—3²W76<;7–FVw&FFì:6ò:’G&FF6öÖò&6·W:ÖçFVw&òâ"’À¢‚7FFRæ&6·W7W÷'FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ$vW&:|:6ò6ö×ÆWFW†–vR÷7Fw&U5ÂâW7FRÖ&–VçFRì:6òöfW&V6RW7666–FFRâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7—ÇÂ7FFRæ&6·W7W÷'FVBÀ¢öä6Æ–6³¢7&VFT&6·W ¢ÒÂ$vW&"&6·WÆö6Â"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’À¢‡7FFRæ&6·Wæ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ&6·Wæ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$6öæf–wW&"vöövÆRG&—fR÷RG&÷&÷‚"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fT&6·WF&vWBÂ²'&WfVçB%Ò’À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW7F–æò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ&6·WF&vWBç&÷f–FW"’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&G&—fR"ÒÂ$vöövÆRG&—fR"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&G&÷&÷‚"ÒÂ$G&÷&÷‚"•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ&6·WF&vWBç&÷f–FW%ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡7FFRæ&6·WF&vWBç&÷f–FW#ÓÓÒvG&—fRsòt”BF7FæòG&—fRs¢t6Ö–æ†òF7FæòG&÷&÷‚r’Â’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ&6·WF&vWBæföÆFW"’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢##Sb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ&6·WF&vWBæföÆFW%ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%Fö¶VâFR6W76òWF÷&—¦Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ&6·WF&vWBæ66W75÷Fö¶Vâ’ÒFWfVçB’À¢G—S¢'77v÷&B"À¢WFö6ö×ÆWFS¢&æWr×77v÷&B"À¢Æ6V†öÆFW#¢%f¦–ò&W6W'fòFö¶VâGVÂ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ&6·WF&vWBæ66W75÷Fö¶VåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$WF÷&—¦Rw&f:|:6òæ6öçFFòFW7F–æòR–æf÷&ÖRòFö¶VââFö¶Vç2W‡—&F÷2&V6—6Ò6W"&Væ÷fF÷2V’â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â²6Æ73¢&'Fâ'Fâ×6V6öæF'’"ÒÂ%6Çf"FW7F–æò"¢ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ&6·W2Â†&6·W’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢&6·Wæ–BÀ¢6Æ73¢'‚Ö6†&vR ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR†&6·Wæ7&VFVEöB’’²"+r"²÷FôF—7Æ•7G&–ær‡7FGW4Æ&VÂ†&6·Wç7FGW2’’²"+r"²÷FôF—7Æ•7G&–ær‡7FGW4Æ&VÂ†&6·Wç7FvR’’Â’À¢†&6·WæW'&÷%ö6öFR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær†&6·WæW'&÷%ö6öFR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†&6·Wç6†#Sb¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&Ööæò6ÖÆÂ ¢ÒÂ%4„Ó#Sb"²÷FôF—7Æ•7G&–ær†&6·Wç6†#Sb’²"+r"²÷FôF—7Æ•7G&–ær†&6·Wç6—¦R’²"'—FW2"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†&6·Wç7FGW3ÓÓÒv6ö×ÆWFVBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&7F–öç2 ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöD&6·W†&6·Wæ–B’¢ÒÂ$&—†"&6·W"Â‚Â²&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡&W&U&W7F÷&R†&6·Wæ–B’¢ÒÂ%&W&"&W7FW&:|:6ò"Â‚Â²&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡6VæD&6·W†&6·Wæ–B’’À¢F—6&ÆVC¢²væ÷E÷6VçBrÂvf–ÆVBuÒæ–æ6ÇVFW2†&6·Wç&VÖ÷FU÷7FGW2¢ÒÂ$Vçf–"òFW7F–æò6öæf–wW&Fò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$Vçf–ó¢"²÷FôF—7Æ•7G&–ær‡7FGW4Æ&VÂ†&6·Wç&VÖ÷FU÷7FGW2’’Â’À¢†&6·Wæ6å÷&V6÷fW"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡&V6÷fW$&6·W†&6·Wæ–B’¢ÒÂ$6öæ6–Æ–"R&WFöÖ""Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢Ò’Â#‚’¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ66W73òæ6åöÖævR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ%&W7FW&:|:6òF–ç7FÆ:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%fÆ–FRVÒ6÷FR6ö×ÆWFòÆö6Â÷R6'&VvFòâ&W&:|:6òì:6òÇFW&ò&æ6òâ7V'7F—GVœ:|:6òFW7G'WF—fW†–vR6öæf—&Ö:|:6òW†–&–FV’æòFWÆ÷–W"Æö6ÂFò†÷7BÂ6öÒ<;7–,:—f–Â&FFR6W'fœ:v÷2RfW&–f–6:|:6òFR6;¦FRâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6'&Vv"&6·W6ö×ÆWFò¤•"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢"ç¦—"À¢öä6†ævS¢&W7F÷&T6†ævP¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢WÆöE&W7F÷&RÀ¢F—6&ÆVC¢7FFRæ'W7—ÇÂ7FFRç&W7F÷&TæÖP¢ÒÂ%fÆ–F"6÷FR6'&VvFò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&W7F÷&UÆç2Â‡Æâ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â²¶W“¢Æâæ–BÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡Æâç7FGW2’²"+r"²÷FôF—7Æ•7G&–ær‡Æâç7FvR’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%Ææò"²÷FôF—7Æ•7G&–ær‡Æâæ–B’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡Æâæö&¦V7G2’²"ö&¦WFò‡2’+r"²÷FôF—7Æ•7G&–ær‡Æâæö&¦V7Eö'—FW2’²"'—FW2"Â’À¢‡Æâç7FGW3ÓÓÒw&W&VBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚$6öæf—&Ö:|:6òæòFWÆ÷–W#¢"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡Æâæ6öæf—&ÖF–öâ’Â’Âö7&VFUFW‡EdæöFR‚"âl:Æ–Fò÷"VÖ†÷&â"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡ÆâæW'&÷%ö6öFR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡ÆâæW'&÷%ö6öFR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢Ò’Â#‚’¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ66W73òæ6åöÖævR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢"À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$6W76ò:÷'F&–Æ–FFR"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$F—7öì:×fVÂVÒ&öG\:|:6òâ†&–Æ—F:|:6òfÆR&–ç7FÆ:|:6ó²6FFVÆVv:|:6òfÆR6öÖVçFR&W7FW66öÆâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢6öæf–wW&T66W70¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ66W72æVæ&ÆVCòtFW6&–Æ—F"÷'F&–Æ–FFRs¢t†&–Æ—F"÷'F&–Æ–FFRr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$FVÆVv"6W76òæW7FW66öÆ"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ66W72æw&çG2Â†w&çB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢w&çBçW6W%ö–BÒÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær†w&çBææÖR’²"+r"²÷FôF—7Æ•7G&–ær†w&çBç&öÆR’²""Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ†FVÆVvFT66W72†w&çB’¢ÒÂ÷FôF—7Æ•7G&–ær†w&çBæVæ&ÆVCòu&Wföv"s¢uW&Ö—F—"–×÷'F:|:6òr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’¢Ò’Â#‚’’Â‚7FFRæ66W72æw&çG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$6F7G&R÷Rf–æ7VÆRòW7\:&–òFÖ–æ—7G&F—fò:W66öÆVÒW7\:&–÷2R6W76÷2â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ66W72bb7FFRæ66W72æVæ&ÆVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢2À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ$†&–Æ—FR÷'F&–Æ–FFR6–Ö&–æ–6–"–×÷'F:|:6òâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&öÂ"Â°¢6Æ73¢&–×÷'B×7FW2"À¢&&–ÖÆ&VÂ#¢$WF2F–×÷'F:|:6ò ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ’"Â²6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡¶7F—fS¢7FFRæ–çfVçF÷'—Ò’ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ#"’Âö7&VFUFW‡EdæöFR‚"W66öÆ†W"'V—fò"•ÒÂ"’Âö7&VFTVÆVÖVçEdæöFR‚&Æ’"Â²6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡¶7F—fS§7FFRæ–çfVçF÷'’bb7FFRç&Wf–WwÒ’ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ#""’Âö7&VFUFW‡EdæöFR‚"6VÆV6–öæ"FF÷2"•ÒÂ"’Âö7&VFTVÆVÖVçEdæöFR‚&Æ’"Â²6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡¶7F—fS¢7FFRç&Wf–WwÒ’ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ#2"’Âö7&VFUFW‡EdæöFR‚"6öæfW&—"R–×÷'F""•ÒÂ"•Ò’À¢‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢BÀ¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&W7VÇB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢RÀ¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ$–×÷'F:|:6ò6öæ6Ç\:ÖFVÒ"²÷FôF—7Æ•7G&–ær‡66†ööÄæÖR’²"â÷2FWFÆ†W2W7L:6òF—7öì:×fV—2æò†—7L;7&–6ò&—†òâ"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$–×÷'F"FÆ–6:|:6òçFW&–÷""’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$W66öÆ†W†FÖVçFR÷26F7G&÷2VRFW6V¦G&¦W"&W7FW66öÆâ"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&–×÷'BÖFW7F–æF–öâ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$–ç7F—GVœ:|:6òFRFW7F–æò"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡66†ööÄæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$–×÷'F:|:6òÖçL:–ÒW7F–ç7F—GVœ:|:6òâ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢F—6&ÆVC¢7FFRæ'W7’À¢6Æ73¢'&W÷'BÖf–ÇFW"Öf–VÆG2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$'V—fò5Æ—FR÷R&6·W¤•"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢"ç¦—ÂæF"Âç7Æ—FRÂç7Æ—FS2"À¢öä6†ævS¢FWfVçBÓâ†f–ÆT6†ævR‚FWfVçBÂv&6·Wr’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò’Â‡7FFRæ&6·WæÖR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ&6·WæÖR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂ°¢ö7&VFUFW‡EdæöFR‚$f÷F÷2RFö7VÖVçF÷2VÒ¤•"’À¢ö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&×WFVB"ÒÂ"†÷6–öæÂ’"’À¢ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢"ç¦—"À¢öä6†ævS¢FWfVçBÓâ†f–ÆT6†ævR‚FWfVçBÂvÖVF–r’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò’À¢‡7FFRæÖVF–æÖR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæÖVF–æÖR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'&W÷'BÖvVæW&FR×&÷r"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&×WFVB6ÖÆÂ"ÒÂ$ò'V—fò6W,:æÆ—6FòçFW2FRVÇVW"w&f:|:6òâ"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ&6·WæÖRÀ¢öä6Æ–6³¢æÇ—¦P¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ'W7“òtwV&F^(
bs¢tæÆ—6"'V—fòr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò•ÒÂ‚Â²&F—6&ÆVB%Ò•Ò’À¢‡7FFRæ–çfVçF÷'’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢bÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$òVRFW6V¦–×÷'F#ò"’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$Ö'VR26FVv÷&–2RW66öÆ†FöF÷2÷2&Vv—7G&÷2÷RVæ2÷2VRfö<:¢–æF–6"â"’Âö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢F—6&ÆVC¢7FFRæ'W7’À¢6Æ73¢'&W÷'BÖf–ÇFW"Öf–VÆG2 ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%Væ–FFRFRFW7F–æò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç6VÆV7F–öâçVæ—Eö–B’ÒFWfVçB’À¢öä6†ævS¢FW7F–æF–öä6†ævV@¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ$ì:6òFVf–æ—"VÖVæ–FFR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡Væ—G2Â‡Væ—B’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢Væ—Bæ–BÀ¢fÇVS¢Væ—Bæ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡Væ—BææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRç6VÆV7F–öâçVæ—Eö–EÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"Â²6Æ73¢&×WFVB"ÒÂ$òW66öÆ†W"VÖVæ–FFRW†—7FVçFRÂ2Væ–FFW2Fò'V—fòì:6ò6W,:6ò7&–F2â"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&–×÷'B×6VÆV7F–öâ"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6FVv÷&–W2‚’Â‡F&ÆR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢F&ÆRææÖRÀ¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&–×÷'BÖ6FVv÷'’"Â·6VÆV7FVC§7FFRç6VÆV7F–öâçF&ÆW2æ–æ6ÇVFW2‡F&ÆRææÖR—ÕÒ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&–×÷'BÖ6†V6²"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢6†V6¶VC¢7FFRç6VÆV7F–öâçF&ÆW2æ–æ6ÇVFW2‡F&ÆRææÖR’À¢F—6&ÆVC¢F&ÆRææÖSÓÓÒwVæ–FFW5öW66öÆ&W2rbb7FFRç6VÆV7F–öâçVæ—Eö–BÀ¢öä6†ævS¢FWfVçBÓâ‡FövvÆUF&ÆR‡F&ÆRææÖR’¢ÒÂçVÆÂÂCÂ²&6†V6¶VB"Â&F—6&ÆVB"Â&öä6†ævR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡F&ÆTæÖR‡F&ÆRææÖR’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡F&ÆRç&÷w2’²"&Vv—7G&ò‡2’F—7öì:×fVÂ†—2’"Â•Ò•Ò’Â‡7FFRç6VÆV7F–öâçF&ÆW2æ–æ6ÇVFW2‡F&ÆRææÖR’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&–×÷'BÖ6FVv÷'’Ö7F–öç2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&&FvR"ÒÂ÷FôF—7Æ•7G&–ær†6÷VçB‡F&ÆRææÖRÇF&ÆRç&÷w2’’²"6VÆV6–öæFò‡2’"Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&Æ–æ²Ö'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†6†ö÷6U&V6÷&G2‡F&ÆRææÖR’¢ÒÂ$W66öÆ†W"&Vv—7G&÷2"Â‚Â²&öä6Æ–6²%Ò’Â‡F&ÆRææÖR–â7FFRç6VÆV7F–öâç&V6÷&Eö–G2¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&Æ–æ²Ö'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†ÆÅ&V6÷&G2‡F&ÆRææÖR’¢ÒÂ%6VÆV6–öæ"FöF÷2"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂ"’¢Ò’Â#‚’•Ò’À¢‡7FFRç&V6÷&EF&ÆRbb7FFRç&V6÷&G2¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢&–×÷'B×&V6÷&G2 ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡F&ÆTæÖR‡7FFRç&V6÷&EF&ÆR’’²"+r6VÆ\:|:6ò–æF—f–GVÂ"Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ·7FFRç&V6÷&EF&ÆSÒrs·7FFRç&V6÷&G3ÖçVÆÇÐ¢ÒÂ$6öæ6ÇV—"6VÆ\:|:6ò"Â‚Â²&öä6Æ–6²%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&f–ÇFW"Ö&""À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ†ÆöE&V6÷&G2ƒ’’Â²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â°¢6Æ73¢'7"ÖöæÇ’"À¢f÷#¢&–×÷'B×&V6÷&B×6V&6‚ ¢ÒÂ%W7V—6"&Vv—7G&ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢–C¢&–×÷'B×&V6÷&B×6V&6‚"À¢G—S¢'6V&6‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç&V6÷&EVW'’’ÒFWfVçB’À¢Æ6V†öÆFW#¢%W7V—6"VÆòæöÖR÷R<;6F–vò ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRç&V6÷&EVW'•ÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢'7V&Ö—B ¢ÒÂ%W7V—6""•ÒÂCÂ²&öå7V&Ö—B%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&–×÷'B×&V6÷&BÖÆ—7B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&V6÷&G2æ—FV×2Â‡&V6÷&B’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢&V6÷&Bæ–BÀ¢6Æ73¢&–×÷'BÖ6†V6² ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢6†V6¶VC¢‡7FFRç6VÆV7F–öâç&V6÷&Eö–G5·7FFRç&V6÷&EF&ÆUÒÇÂµÒ’æ–æ6ÇVFW2‡&V6÷&Bæ–B’À¢öä6†ævS¢FWfVçBÓâ‡FövvÆU&V6÷&B‡&V6÷&Bæ–B’¢ÒÂçVÆÂÂCÂ²&6†V6¶VB"Â&öä6†ævR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡&V6÷&BææÖRÇÂ&V6÷&Bæ–B’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$<;6F–vò"²÷FôF—7Æ•7G&–ær‡&V6÷&Bæ–B’Â•Ò•Ò’¢Ò’Â#‚’•Ò’À¢‚7FFRç&V6÷&G2æ—FV×2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂ$æVæ‡VÒ&Vv—7G&òVæ6öçG&Fòâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'v–æF–öâ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRç&V6÷&G2çvSÃÓÀ¢öä6Æ–6³¢FWfVçBÓâ†ÆöE&V6÷&G2‡7FFRç&V6÷&G2çvRÓ’¢ÒÂ$çFW&–÷""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&V6÷&G2çF÷FÂ’²"&W7VÇFFò‡2’+r:v–æ"²÷FôF—7Æ•7G&–ær‡7FFRç&V6÷&G2çvR’Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRç&V6÷&G2çvR§7FFRç&V6÷&G2çvU÷6—¦Sã×7FFRç&V6÷&G2çF÷FÂÀ¢öä6Æ–6³¢FWfVçBÓâ†ÆöE&V6÷&G2‡7FFRç&V6÷&G2çvR³’¢ÒÂ%,;7†–Ö"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&–×÷'BÖÖVF–Ö÷F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&–×÷'BÖ6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç6VÆV7F–öâæ–æ6ÇVFU÷†÷F÷2’ÒFWfVçB’À¢öä6†ævS¢–çfÆ–FFP¢ÒÂçVÆÂÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRç6VÆV7F–öâæ–æ6ÇVFU÷†÷F÷5ÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$–×÷'F"f÷F÷2F÷2&Vv—7G&÷26VÆV6–öæF÷2"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&–×÷'BÖ6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç6VÆV7F–öâæ–æ6ÇVFUöÖVF–’ÒFWfVçB’À¢öä6†ævS¢–çfÆ–FFP¢ÒÂçVÆÂÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRç6VÆV7F–öâæ–æ6ÇVFUöÖVF–ÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$–×÷'F"Fö7VÖVçF÷2R'V—f÷2f–æ7VÆF÷2"•Ò•Ò’À¢†W‡G&2‚’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$÷WG&÷2FF÷2Fò'V—fò"’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB6ÖÆÂ"ÒÂ$W7F26FVv÷&–26W,:6ò&W6W'fF26öÖVçFRæò†—7L;7&–6òF–×÷'F:|:6òÂ6VÒ7&–"6F7G&÷2æÆ–6:|:6òâ"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†W‡G&2‚’Â‡F&ÆR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢F&ÆRææÖRÀ¢6Æ73¢&–×÷'BÖ6†V6² ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢6†V6¶VC¢7FFRç6VÆV7F–öâçF&ÆW2æ–æ6ÇVFW2‡F&ÆRææÖR’À¢öä6†ævS¢FWfVçBÓâ‡FövvÆUF&ÆR‡F&ÆRææÖR’¢ÒÂçVÆÂÂCÂ²&6†V6¶VB"Â&öä6†ævR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡F&ÆTæÖR‡F&ÆRææÖR’’²"+r"²÷FôF—7Æ•7G&–ær‡F&ÆRç&÷w2’²"&Vv—7G&ò‡2’"Â•Ò’¢Ò’Â#‚’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'&W÷'BÖvVæW&FR×&÷r"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB6ÖÆÂ"ÒÂ%&W7öç<:fV—2Âl:Öæ7VÆ÷2RÖG,:Ö7VÆ2FWfVÒ6W"6VÆV6–öæF÷2VæFòfö<:¢V—6W"G&¬:¢ÖÆ÷2FÖ,:–Òâ"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRç6VÆV7F–öâçF&ÆW2æÆVæwF‚À¢öä6Æ–6³¢&Wf–Wp¢ÒÂ$6öæfW&—"6VÆ\:|:6ò"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò¢ÒÂ‚Â²&F—6&ÆVB%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&Wf–Wr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢rÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$6öæf—&çFW2FR–×÷'F""’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wrç6VÆV7FVE÷&V6÷&Eö6÷VçB’²"&Vv—7G&ò‡2’"Â’À¢ö7&VFUFW‡EdæöFR‚"&"²÷FôF—7Æ•7G&–ær‡7FFRç&Wf–WræFW7F–æF–öâç66†ööÅöæÖR’Â’À¢‡7FFRç&Wf–WræFW7F–æF–öâçVæ—EöæÖR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â²¶W“¢ÒÂ"+r"²÷FôF—7Æ•7G&–ær‡7FFRç&Wf–WræFW7F–æF–öâçVæ—EöæÖR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFUFW‡EdæöFR‚"â"¢Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'F&ÆR×67&öÆÂ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$6FVv÷&–"’Âö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%6VÆV6–öæF÷2"’Âö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$FW7F–æò"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&Wf–WrçF&ÆW2æf–ÇFW"‡CÓçBç6VÆV7FVE÷&÷w3ã’Â‡F&ÆR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢F&ÆRææÖRÒÂµö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡F&ÆTæÖR‡F&ÆRææÖR’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡F&ÆRç6VÆV7FVE÷&÷w2’Â’Âö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡F&ÆRæFW7F–æF–öâ’Â•Ò’¢Ò’Â#‚’•Ò•Ò•Ò’À¢‡7FFRç&Wf–Wræ—77VW3òæÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&Wf–Wræ—77VW2Â†—77VR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢—77VRÒÂ÷FôF—7Æ•7G&–ær†—77VR’Â’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç&Wf–Wrçv&æ–æw3òæÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$ö'6W'f:|;VW2F6öæfW,:¦æ6–‚"²÷FôF—7Æ•7G&–ær‡7FFRç&Wf–Wrçv&æ–æw2æÆVæwF‚’²"’"Â’Âö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&Wf–Wrçv&æ–æw2Â‡v&æ–ær’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢v&æ–ærÒÂ÷FôF—7Æ•7G&–ær‡v&æ–ær’Â’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$6F7G&÷2W†—7FVçFW26W,:6ò&W6W'fF÷2â&Wf—6R26FVv÷&–26–ÖçFW2FR6öæf—&Ö"â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$F–v—FR”Õõ%D"&6öæf—&Ö""’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ6öæf—&ÖF–öâ’ÒFWfVçB’À¢F—6&ÆVC¢7FFRæ'W7’À¢Ö†ÆVæwFƒ¢##"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ6öæf—&ÖF–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ7FFRç&Wf–Wræ6åöÇ’ÇÂ7FFRæ6öæf—&ÖF–öâçG&–Ò‚’çFõWW$66R‚’ÓÒt”Õõ%D"rÀ¢öä6Æ–6³¢Ç¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ'W7“òt–×÷'FæFþ(
bs¢t6öæf—&Ö"–×÷'F:|:6òr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$÷W&:|;VW2VÒæFÖVçFòR&V7WW&:|:6ò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$ò&ö6W76ÖVçFò6öçF–çVæòv÷&¶W";72GVÆ—¦":v–æâWF2W†–&VÒ6öçFvVç2&V—3²VÖ–çFW''W:|:6ò&W&ö6W76G&ç6:|:6ò6VÒGWÆ–6"FF÷2â"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ÷W&F–öç2Â†÷W&F–öâ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â²¶W“¢÷W&F–öâæ–BÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FGW4Æ&VÂ†÷W&F–öâç7FGW2’’²"+r"²÷FôF—7Æ•7G&–ær‡7FGW4Æ&VÂ†÷W&F–öâç7FvR’’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6VÆV6–öæF÷3¢"²÷FôF—7Æ•7G&–ær†÷W&F–öâç&öw&W72ç6VÆV7FVE÷&V6÷&G2’²"+r'V—fF÷3¢"²÷FôF—7Æ•7G&–ær†÷W&F–öâç&öw&W72æ&6†—fVE÷&V6÷&G7ÇÃ’²"+rFVçFF—f3¢"²÷FôF—7Æ•7G&–ær†÷W&F–öâæGFV×G2’Â’À¢†÷W&F–öâæW'&÷%ö6öFR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær†÷W&F–öâæW'&÷%ö6öFR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…²vf–ÆVBrÂwVæ6W'F–âuÒæ–æ6ÇVFW2†÷W&F–öâç7FGW2’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡&W7VÖT–×÷'B†÷W&F–öâæ–B’¢ÒÂ%&WFöÖ"÷W&:|:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$†—7L;7&–6òFR–×÷'F:|;VW2"’Â‚7FFRç'Vç2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$æVæ‡VÖ–×÷'F:|:6ò6öæ6Ç\:ÖFæW7FW66öÆâ"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç'Vç2Â‡'Vâ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢'Vâæ–BÀ¢6Æ73¢'‚ÖÆ–æR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡'Vâæ7&VFVEöB’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"Â²6Æ73¢&×WFVB"ÒÂ÷FôF—7Æ•7G&–ær‡'Vâç6÷W&6U÷7—7FVÒ’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB‡'Vâæ–B’¢ÒÂ$&—†"FWFÆ†W2"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’¢Ò’Â#‚’•Ò¢Ò’¢Ð§ÒÆÆV&æ–æs¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂFôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂ&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Â7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢6Æ73¢&ÆV&æ–ær×v÷&·76R"À¢&&–ÖÆ&VÂ#¢$&öÆWF–ÒRg&W\:¦æ6–"À¢&&–Ö'W7’#¢7FFRæ'W7¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ%d”DU44ôÄ""’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$&öÆWF–ÒRg&W\:¦æ6–"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%&W7VÇFF÷2V&Æ–6F÷2VÆW66öÆ&6ö×æ†"ò&VæF—¦Fòâ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7’À¢öä6Æ–6³¢Æö@¢ÒÂ$GVÆ—¦""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’À¢‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ'W7’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&×WFVB"À¢&öÆS¢'7FGW2 ¢ÒÂ$6'&VvæFò–æf÷&Ö:|;VW2W66öÆ&W>(
b"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç7GVFVçG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢'‚Öw&–B ¢ÒÂ²‡&÷2ç7GVFVçD–Bbb7GVFVçB‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆV&æ–ær×7GVFVçBÖæÖR ¢ÒÂ÷FôF—7Æ•7G&–ær‡7GVFVçB‚’ç7GVFVçEöæÖR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â‚&÷2ç7GVFVçD–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚$ÇVæò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç7GVFVçD–B’ÒFWfVçB’À¢öä6†ævS¢6VÆV7E7GVFVçBÀ¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç7GVFVçG2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒç7GVFVçEö–BÀ¢fÇVS¢—FVÒç7GVFVçEö–@¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒç7GVFVçEöæÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRç7GVFVçD–EÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÖG,:Ö7VÆ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæVç&öÆÆÖVçD–B’ÒFWfVçB’À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7GVFVçB‚“òæVç&öÆÆÖVçG2ÇÂµÒÂ†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒæVç&öÆÆÖVçEö–BÀ¢fÇVS¢—FVÒæVç&öÆÆÖVçEö–@¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒç–V%öæÖR’²"+r"²÷FôF—7Æ•7G&–ær†—FVÒæ6Æ75öæÖR’²"+r"²÷FôF—7Æ•7G&–ær†—FVÒæçVÖ&W"’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæVç&öÆÆÖVçD–EÕÒ•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‚7FFRç7GVFVçG2æÆVæwF‚bb7FFRæ'W7’bb7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢2À¢6Æ73¢&V×G’×7FFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$æVæ‡VÒÇVæòf–æ7VÆFò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6öÆ–6—FR:6V7&WF&–6öæfW,:¦æ6–Fò6WRl:Öæ7VÆò6öÒò6F7G&òW66öÆ"â"•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’Â†Vç&öÆÆÖVçB‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'æVÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7GVFVçB‚“òç7GVFVçEöæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB6ÖÆÂ"ÒÂ÷FôF—7Æ•7G&–ær‡7GVFVçB‚“òç66†ööÅöæÖR’²"+r"²÷FôF—7Æ•7G&–ær†Vç&öÆÆÖVçB‚’æ6Æ75öæÖR’²"+r"²÷FôF—7Æ•7G&–ær†Vç&öÆÆÖVçB‚’ç–V%öæÖR’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢7FFRæ'W7’ÇÂ&÷w2‚’æÆVæwF‚À¢öä6Æ–6³¢F÷væÆö@¢ÒÂ$&—†"&öÆWF–ÒDb"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’Â‡&÷w2‚’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'F&ÆR×67&öÆÂ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²66÷S¢&6öÂ"ÒÂ$6ö×öæVçFR7W'&–7VÆ""’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²66÷S¢&6öÂ"ÒÂ%W,:ÖöFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²66÷S¢&6öÂ"ÒÂ$æ÷Fò6öæ6V—Fò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²66÷S¢&6öÂ"ÒÂ%6—GV:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²66÷S¢&6öÂ"ÒÂ$g&W\:¦æ6–"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²66÷S¢&6öÂ"ÒÂ$fÇF2"¢Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡&÷w2‚’Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢—FVÒæF–'•ö–B²rÒr¶—FVÒçW&–öEö–BÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ6ö×öæVçEöæÖR’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒçW&–öEöæÖR’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæw&FUöF—7Æ’ÇÂ~(	Br’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒç&W7VÇEöÆ&VÂ’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡W&6VçB†—FVÒæGFVæFæ6RçW&6VçFvR’’Â’Â†—FVÒæGFVæFæ6RçVç&V6÷&FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒæGFVæFæ6RçVç&V6÷&FVB’²"VÆ‡2’6VÒ&Vv—7G&ò"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær†—FVÒæGFVæFæ6Ræ'6VçB’Â’Â†—FVÒæGFVæFæ6Ræ§W7F–f–VEö'6Væ6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒæGFVæFæ6Ræ§W7F–f–VEö'6Væ6R’²"§W7F–f–6F‡2’"Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò¢Ò’¢Ò’Â#‚’•Ò•Ò•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%&W7VÇFF÷2–æFì:6òV&Æ–6F÷2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$2æ÷F2Rg&W\:¦æ6–&V6W,:6ò;726öæfW,:¦æ6–RV&Æ–6:|:6òVÆW66öÆâ"•Ò’’Â‡7FFRææ÷FR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢'æVÂÖfö÷FW" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB6ÖÆÂ"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRææ÷FR’Â•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂ‚Â²&&–Ö'W7’%Ò’¢Ð§ÒÆ6öÖ×Væ—G“¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂFôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂ&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂ7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂe6†÷s¢÷e6†÷rÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2ÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂdÖöFVÄ6†V6¶&÷ƒ¢÷dÖöFVÄ6†V6¶&÷‚Âv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2Âæ÷&ÖÆ—¦U7G–ÆS¢öæ÷&ÖÆ—¦U7G–ÆRÂFVÆW÷'C¢õFVÆW÷'BÂ7&VFT&Æö6³¢ö7&VFT&Æö6²ÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢6Æ73¢&6öÖ×Væ—G’×vR"À¢&&–ÖÆ&VÂ#¢$æ÷L:Ö6–2RvVæFFW66öÆ ¢ÒÂ°¢†ÖævR‚’bb&÷2æ6ö×7B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ%6—FR–ç7F—GV6–öæÂ"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2çV&Æ—6†VCòuV&Æ–6Fò+rfW'<:6òr·2çV&Æ—6†VEfW'6–öã¢t–æFì:6òV&Æ–6Fòr’²÷FôF—7Æ•7G&–ær‡2æ†4G&gCòr+r&67Væ†ò6öÒÇFW&:|;VW2VæFVçFW2s¢rr’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢2æ'W7’À¢öä6Æ–6³¢FövvÆUvV'6—FP¢ÒÂ÷FôF—7Æ•7G&–ær‡2çvV'6—FT÷VãòtfV6†"6öæf–wW&:|:6òs¢t6öæf–wW&"6—FRr’Â’Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’Â‡2çvV'6—FT÷Vâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f÷&Ò"Â°¢¶W“¢À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fUvV'6—FRÂ²'&WfVçB%Ò’À¢öä–çWC¢FWfVçBÓâ‡2ç&Wf–Wt‡FÖÃÒrr’À¢6Æ73¢'‚Öf÷&ÒvV'6—FRÖVF—F÷""À¢öä–çfÆ–D6GW&S¢FWfVçBÓâ‡&WfVÄ–çfÆ–E6—FTf–VÆB‚FWfVçB’¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&6–FR"Â°¢6Æ73¢'6—FR×V&Æ—6‚×&–Â"À¢&&–ÖÆ&VÂ#¢$W7FFòFV&Æ–6:|:6òRÖG,:Ö7VÆ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ%V&Æ–6:|:6òRÖG,:Ö7VÆ"’Â‡2çvV'6—FRæFÖ—76–öå÷W&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$6×æ†6öæf–wW&Fâò&÷L:6ò(	ÄÖG,:Ö7VÆ>(	Ò&V6Ræ6Ræò6&\:vÆ†òVæFòæVæ‡VÖ:|:6òW6òÖW6ÖòVæFW&\:vòâ"’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$FVf–æòVæFW&\:vòF6×æ†÷R:v–æFRÖG,:Ö7VÆâò5D6W,:W†–&–Fòæ6Ræò6&\:vÆ†òÂ6VÒ7&–"VÖ6×æ†æ÷fâ"’’Â‡2æFÖ—76–öå&VF–æW72¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢'6—FRÖFÖ—76–öâ×7FGW2"À¢&öÆS¢'7FGW2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$F—7öæ–&–Æ–FFRFò&ö6W76ò"’Â‡2æFÖ—76–öå&VF–æW72æ6×–vç2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'VÂ"Â²¶W“¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æFÖ—76–öå&VF–æW72æ6×–vç2Â†6×–vâ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢6×–vâæ–BÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†6×–vâçF—FÆR’Â’À¢ö7&VFUFW‡EdæöFR‚"+r"’À¢ö7&VFTVÆVÖVçEdæöFR‚&""ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†6×–vâç&VG“òt&W'Fòs¢tfV6†Fò÷R–æF—7öì:×fVÂr’Â’À¢‚6×–vâç&VG’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær†6×–vâç&V6öç2æÖ†FÖ—76–öå&V6öäÆ&VÂ’æ¦ö–â‚r+rr’’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢Ò’Â#‚’•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$æVæ‡VÒ&ö6W76ò6F7G&Fòâ"’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6—FTwV–FSÒv–FVçF—G’r¢ÒÂ$6öæf–wW&"ÖG,:Ö7VÆ"Â‚Â²&öä6Æ–6²%Ò’Â‡&÷2çW&Ö—76–öç3òæ–æ6ÇVFW2‚vFÖ—76–öç2ç&VBr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢ÆöDFÖ—76–öå&VF–æW70¢ÒÂ%fW&–f–6"6×æ†"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â‡2çvV'6—FRæFÖ—76–öå÷W&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢‡&Vc¢2çvV'6—FRæFÖ—76–öå÷W&ÂÀ¢F&vWC¢%ö&Ææ²"À¢&VÃ¢&æ÷&VfW'&W" ¢ÒÂ$'&—"ÖG,:Ö7VÆ"Â‚Â²&‡&Vb%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢6Æ73¢'÷'FÂÖf–VÆG6WB"À¢F—6&ÆVC¢2æ'W7¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&æb"Â°¢6Æ73¢'6—FRÖVF—F÷"ÖwV–FW2"À¢&&–ÖÆ&VÂ#¢$6öæf–wW&:|:6òFò6—FR ¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡6—FTwV–FW2Â‡F"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢¶W“¢F"æ–BÀ¢&&–×&W76VB#¢2ç6—FTwV–FSÓÓ×F"æ–BÀ¢öä6Æ–6³¢FWfVçBÓâ‡2ç6—FTwV–FS×F"æ–B¢ÒÂ÷FôF—7Æ•7G&–ær‡F"æÆ&VÂ’Â’Â²&&–×&W76VB"Â&öä6Æ–6²%Ò’¢Ò’Â#‚’•Ò’À¢÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢&FF×6—FRÖwV–FR#¢&ÖöFVÇ2"À¢6Æ73¢'6—FRÖÖöFVÂ×æVÂ"À¢&&–ÖÆ&VÆÆVF'’#¢'6—FRÖÖöFVÇ2×F—FÆR ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"Â²–C¢'6—FRÖÖöFVÇ2×F—FÆR"ÒÂ$ÖöFVÆ÷2FR6—FR"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6öæ†\:v÷2ÖöFVÆ÷26öÒFW‡F÷2Rf÷Föw&f–2FRW†V×Æòâ,:—f–ì:6òÇFW&6WR6öçF\;¦Fòâ6FÖöFVÆòFVÒVÖ:v–æ–æ–6–Â7W'FR6V—2:v–æ2&V—2&òÖVçRâÆ–6"7V'7F—GV’:v–æ–æ–6–ÂRòÖVçRÂ7&W66VçF2æ÷f2:v–æ2R&W6W'fFöF22:v–æ2GV—2(	B6öÖVçFRæò&67Væ†òÂ;726öæf—&Ö:|:6òâ"’À¢‚2æÖöFVÇ2æÆVæwF‚bb2æ'W7’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢ÆöE6—FTÖöFVÇ0¢ÒÂ$6'&Vv"ÖöFVÆ÷26ö×ÆWF÷2"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æÖöFVÇ2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢'6—FRÖÖöFVÂÖ6&G2"À¢&&–ÖÆ&VÂ#¢$6L:ÆövòFRÖöFVÆ÷2 ¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æÖöFVÇ2Â†ÖöFVÂ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢ÖöFVÂæ–BÀ¢G—S¢&'WGFöâ"À¢&&–ÖÆ&VÂ#¢ÖöFVÂææÖRÀ¢&&–×&W76VB#¢2æÖöFVÄ6†ö–6SÓÓÖÖöFVÂæ–BÀ¢öä6Æ–6³¢FWfVçBÓâ·2æÖöFVÄ6†ö–6SÖÖöFVÂæ–C¶6ÆV$ÖöFVÅ&Wf–Wr‚—Ð¢ÒÂ²†ÖöFVÄ6÷fW"†ÖöFVÂ’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–Ör"Â°¢¶W“¢À¢7&3¢ÖöFVÄ6÷fW"†ÖöFVÂ’À¢ÇC¢""À¢ÆöF–æs¢&Æ§’ ¢ÒÂçVÆÂÂ‚Â²'7&2%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖöFVÂææÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖöFVÂæFW67&—F–öâ’Â•Ò•ÒÂ‚Â²&&–ÖÆ&VÂ"Â&&–×&W76VB"Â&öä6Æ–6²%Ò’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%&–ÖV—&òvW&R,:—f–&6öæfW&—"ò&W7VÇFFòfÆ–FFòVÆÆFf÷&Öâ,:—f–ì:6òw&fæVÒV&Æ–66öçF\;¦Fòâ"’À¢†ÖöFVÅ&VG’‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B"À¢&&–ÖÆ&VÆÆVF'’#¢&ÖöFVÂÖÖ×F—FÆR ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒB"Â²–C¢&ÖöFVÂÖÖ×F—FÆR"ÒÂ$ÖçFW2FRÆ–6""’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$–ì:Ö6–ò7W'Fò‚"²÷FôF—7Æ•7G&–ær‡2ç&W6öÇfVDÖöFVÃòæFW6–vãòç6V7F–öç2æÆVæwF‡ÇÃ’²"&Æö6÷2’Â"²÷FôF—7Æ•7G&–ær†ÖöFVÄæWuvW2‚’æÆVæwF‚’²"æ÷f2:v–æ26ö×ÆWF2R"²÷FôF—7Æ•7G&–ær‡2çvV'6—FRæFW6–vãòçvW2æÆVæwF‡ÇÃ’²":v–æ2GV—2&W6W'fF2â"Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒR"ÂçVÆÂÂ$æ÷fòÖVçR&–æ6—Â"’À¢ö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2ç&W6öÇfVDÖöFVÃòæFW6–vãòæÖVçRÂ†Æ–æ²’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢Æ–æ²çW&ÂÒÂ÷FôF—7Æ•7G&–ær†Æ–æ²æÆ&VÂ’²"(i""²÷FôF—7Æ•7G&–ær†Æ–æ²çW&Â’Â’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒR"ÂçVÆÂÂ%:v–æ27&W66VçFF2"’À¢ö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†ÖöFVÄæWuvW2‚’Â‡vR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢vRç6ÇVrÒÂ÷FôF—7Æ•7G&–ær‡vRçF—FÆR’²"+rò"²÷FôF—7Æ•7G&–ær‡vRç6ÇVr’Â’¢Ò’Â#‚’•Ò’À¢†ÖöFVÅ&VæÖW2‚’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$VæFW&\:v÷2¬:W†—7FVçFW2f÷&Ò&W6W'fF÷2â"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$2æ÷f2:v–æ2&V6V&W,:6ò÷WG&÷2VæFW&\:v÷2R6WW2Æ–æ·26W,:6ò§W7FF÷3¢"’Âö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†ÖöFVÅ&VæÖW2‚’Â‡&VæÖR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢&VæÖRÒÂ÷FôF—7Æ•7G&–ær‡&VæÖR’Â’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$òÖVçRGVÂ6W,:7V'7F—G\:ÖFòVÆòÖVçRFòÖöFVÆòâ2:v–æ2W†—7FVçFW26öçF–çVÒæò&67Væ†ó²fö<:¢öFR–æ6Ç\:ÒÖÆ2æ÷fÖVçFRæòÖVçRâÖ&6:|:6òFR–æ6ÇW<:6òF2æ÷f2:v–æ2ì84òV&Æ–6WFöÖF–6ÖVçFS¢:’&V6—6ò6öæf—&Ö":|:6òV&Æ–6"6—FRâ"¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢&Wf–WtÖöFVÀ¢ÒÂ%fW"ÖöFVÆò6ö×ÆWFò6VÒÇFW&""Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢Ç”ÖöFVÂÀ¢F—6&ÆVC¢ÖöFVÅ&VG’‚¢ÒÂ$Æ–6":v–æ2RÖVçRò&67Væ†ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ†4ÖöFVÄ6†V6·ö–çB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&ÆW'B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$<;7–÷&–v–æÂ6ÇfæÆFf÷&ÖÂF—7öì:×fVÂÖW6Öò;726—"R&V6'&Vv"âÆ–6:|;VW26öç6V7WF—f2&W6W'fÒW76ÖW6Ö<;7–L:’fö<:¢&W7FW,:ÖÆâ"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢&W7F÷&TÖöFVÄ6†V6·ö–ç@¢ÒÂ%&W7FW&"<;7–÷&–v–æÂ"Â‚Â²&öä6Æ–6²%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂS"’Âµµ÷e6†÷rÂ2ç6—FTwV–FSÓÓÒvÖöFVÇ2uÕÒ’À¢÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢&FF×6—FRÖwV–FR#¢&–FVçF—G’"À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$W7F–ÆòFò6öçF\;¦FòW†—7FVçFR†ì:6òÆ–66ö×÷6œ:|:6ò’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢$W7F–ÆòFò6öçF\;¦FòW†—7FVçFR†ì:6òÆ–66ö×÷6œ:|:6ò’"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRçF†VÖR’ÒFWfVçB¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&†÷&—¦öâ"ÒÂ$–ç7F—GV6–öæÂ+rf÷Föw&f–R6öÆ†–ÖVçFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&VF—F÷&–Â"ÒÂ$–æl:&æ6–+rFW66ö&W'F2R7V–FFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&7VÇGW&R"ÒÂ%&ö¦WF÷2+rW‡W&œ:¦æ6–2R&VæF—¦vVÒ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&6×W2"ÒÂ$6ö×Væ–FFR+r†—7L;7&–2RvVæF"¢ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2çvV'6—FRçF†VÖUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FöÜ:Öæ–ò;¦&Æ–6òFò6—FR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRçV&Æ–5÷W&Â’ÒFWfVçB’À¢G—S¢'W&Â"À¢Æ6V†öÆFW#¢&‡GG3¢òöW66öÆæW†V×Æòæ6öÒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRçV&Æ–5÷W&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòFò÷'FÂW66öÆ""’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRç÷'FÅ÷W&Â’ÒFWfVçB’À¢G—S¢'W&Â"À¢Æ6V†öÆFW#¢&‡GG3¢ò÷÷'FÂæW†V×Æòæ6öÒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRç÷'FÅ÷W&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF–ç67&œ:|:6òRÖG,:Ö7VÆ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFÖ—76–öå÷W&Â’ÒFWfVçB’À¢G—S¢'W&Â"À¢Æ6V†öÆFW#¢&‡GG3¢ò÷÷'FÂæW†V×Æòæ6öÒööæÆ–æRæ‡FÖÃö6×–vã×&ö6W76ò ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFÖ—76–öå÷W&ÅÕÒ•Ò¢Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6†ÖF&–æ6—Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæ†VFÆ–æR’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ"À¢Æ6V†öÆFW#¢%VÒL:×GVÆò&&W6VçF"7VW66öÆ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæ†VFÆ–æUÕÒ•Ò’À¢‚õâ†‡GG3ó§ÇwwuÂâ’ö’çFW7B‡2çvV'6—FRæ†VFÆ–æR’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ$W7FR6×ò:’VÒL:×GVÆòâ6öÆ÷VRVæFW&\:v÷2æ÷26×÷2Fò÷'FÂ÷RFÖG,:Ö7VÆâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$&W6VçF:|:6ò7W'F"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæ–çG&öGV7F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#S"À¢&÷w3¢#" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæ–çG&öGV7F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%6ö'&RW66öÆ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæ&÷WB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢&÷w3¢#R ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæ&÷WEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$f—6òFò×W&Â;¦&Æ–6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRææ÷F–6R’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢&÷w3¢#" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRææ÷F–6UÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&ÆW'B"ÒÂ$ÆövòÂ6÷&W2RF—öw&f–l:¦ÒF–FVçF–FFRf—7VÂ6öæf–wW&Fæò”tRâ×VF"Væ2òW7F–Æò&W6W'f÷2&Æö6÷2âÆ–6"VÖ6ö×÷6œ:|:6ò6ö×ÆWF:’VÖ:|:6ò6W&FR6öæf—&ÖFâ"’À¢‡2çvV'6—FRæ'&æBbb‡2çvV'6—FRæ'&æBæF—7Æ•öæÖWÇÇ2çvV'6—FRæ'&æBç&–Ö'•ö6öÆ÷'ÇÇ2çvV'6—FRæ'&æBç6V6öæF'•ö6öÆ÷'ÇÇ2çvV'6—FRæ'&æBæföçEöfÖ–Ç’’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂµö7&VFUFW‡EdæöFR‚$W7FR6—FR÷77V’VÖW'6öæÆ—¦:|:6òçFW&–÷"â"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢–æ†W&—D'&æ@¢ÒÂ%&W7FW&"–FVçF–FFRFò”tR"Â‚Â²&öä6Æ–6²%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂS"’Âµµ÷e6†÷rÂ2ç6—FTwV–FSÓÓÒv–FVçF—G’uÕÒ’À¢÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²&FF×6—FRÖwV–FR#¢'†÷F÷2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$&–&Æ–÷FV6FRf÷Föw&f–2"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$f÷Föw&f–2Vçf–F2:W66öÆâVÆ2W&ÖæV6VÒ&—fF2L:’6W&VÒW6F2æò6—FRV&Æ–6Fò÷RVÒVÖV&Æ–6:|:6ò;¦&Æ–6â–ÖvVç2VÒW6òì:6òöFVÒ6W"W†6Ç\:ÖF2â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢ÆöE6—FT76WG0¢ÒÂ$6'&Vv"&–&Æ–÷FV6"Â‚Â²&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öÖ×Væ—G’Öw&–B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ76WG2Â†76WBÂ76WD–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢76WBæ–BÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢†76WBçF‡VÖ&æ–Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–Ör"Â°¢¶W“¢À¢7&3¢76WBçF‡VÖ&æ–ÂÀ¢ÇC¢$Ö–æ–GW&F&–&Æ–÷FV6"À¢v–GFƒ¢##"À¢†V–v‡C¢#“"À¢7G–ÆS¢²&ö&¦V7BÖf—B#¢&6÷fW"'Ð¢ÒÂçVÆÂÂ‚Â²'7&2%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$f÷Fò"²÷FôF—7Æ•7G&–ær†76WD–æFW‚³’²"+r"²÷FôF—7Æ•7G&–ær†76WBç6†#Sbç6Æ–6RƒÃ‚’’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vò&&WWF–Æ—¦""’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢fÇVS¢76WBçW&ÂÀ¢&VFöæÇ“¢""À¢öäfö7W3¢FWfVçBÓâ‚FWfVçBçF&vWBç6VÆV7B‚’¢ÒÂçVÆÂÂCÂ²'fÇVR"Â&öäfö7W2%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢FWfVçBÓâ‡&VÖ÷fU6—FT76WB†76WB’¢ÒÂ$W†6ÇV—"f÷Fò6VÒW6ò"Â‚Â²&öä6Æ–6²%Ò¢Ò’¢Ò’Â#‚’•Ò¢Ò•ÒÂS"’Âµµ÷e6†÷rÂ2ç6—FTwV–FSÓÓÒw†÷F÷2uÕÒ’À¢‡2çvV'6—FRæFW6–vâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"Â°¢÷Vã¢""À¢&FF×6—FRÖwV–FR#¢&æf–vF–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$&W6VçF:|:6òRæfVv:|:6ò"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öf÷&Ò"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†VFW%÷7F–6·’’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â2çvV'6—FRæFW6–vâæ†VFW%÷7F–6·•ÕÒ’Âö7&VFUFW‡EdæöFR‚$ÖçFW"6&\:vÆ†òæòF÷òGW&çFR&öÆvVÒ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæÖö&–ÆUö7F–öç2’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â2çvV'6—FRæFW6–vâæÖö&–ÆUö7F–öç5ÕÒ’Âö7&VFUFW‡EdæöFR‚$W†–&—"&'&FR:|;VW2æò6VÇVÆ""•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$2GV2÷:|;VW2<:6ò–æFWVæFVçFW2âò&öF:’W&ÖæV6RæòfÇW†òF:v–æÂ6VÒ6ö'&—"ò6öçF\;¦Fòâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$f—†7WW&–÷""’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâçF÷Æ–æR’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâçF÷Æ–æUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÆVvVæF&–æ6—Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†W&õö6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâæ†W&õö6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$W7F–ÆòVF—F÷&–ÂF÷2L:×GVÆ÷2"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†VF–æu÷7G–ÆR’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&–æ†W&—B"ÒÂ$†W&F"–FVçF–FFR"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&VF—F÷&–Â"ÒÂ$VF—F÷&–Â†föçFRW'6öæÆ—¦FFò”tRFVÒ&–÷&–FFR’"•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2çvV'6—FRæFW6–vâæ†VF–æu÷7G–ÆUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$–FVçF–f–6F÷"6–ÖFòL:×GVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæW–V'&÷r’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâæW–V'&÷uÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$f÷Fò&–æ6—Â"’Â‚2çvV'6—FRæFW6–vâæ†W&õö–ÖvR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvSÖæWt–ÖvR‚’¢ÒÂ$F–6–öæ"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Vçf–"f÷Föw&f–„¥TrÂär÷RvV%ÂL:’2Ô"’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"À¢öä6†ævS¢FWfVçBÓâ‡WÆöE6—FT–ÖvR‚FWfVçBÇ2çvV'6—FRæFW6–vâæ†W&õö–ÖvR’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡2æ76WG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%&WWF–Æ—¦"f÷Föw&f–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvRçW&Â’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ76WG2Â†76WBÂ76WD–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢76WBæ–BÀ¢fÇVS¢76WBçW&À¢ÒÂ$f÷Fò"²÷FôF—7Æ•7G&–ær†76WD–æFW‚³’²"+r"²÷FôF—7Æ•7G&–ær†76WBç6†#Sbç6Æ–6RƒÃ‚’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2çvV'6—FRæFW6–vâæ†W&õö–ÖvRçW&ÅÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF–ÖvVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvRçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢&‡GG3¢òþ(
b÷RVçf–RVÖf÷Föw&f–6–Ö ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâæ†W&õö–ÖvRçW&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò6W7<:×fVÂFf÷Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæÇB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæÇEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÆVvVæFf—<:×fVÂ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæ6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæ6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6ò†÷&—¦öçFÂ‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæfö6Å÷‚’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæfö6Å÷‚À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6òfW'F–6Â‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæfö6Å÷’’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢2çvV'6—FRæFW6–vâæ†W&õö–ÖvRæfö6Å÷’À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâæ†W&õö–ÖvSÖçVÆÂ¢ÒÂ%&WF—&"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò¢Ò’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$&÷L:6ò&–æ6—Â"’Â‚2çvV'6—FRæFW6–vâç&–Ö'•ö7F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâç&–Ö'•ö7F–öãÖæWtÆ–æ²‚’¢ÒÂ$F–6–öæ"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öw&–B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡FòFò&÷L:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâç&–Ö'•ö7F–öâæÆ&VÂ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâç&–Ö'•ö7F–öâæÆ&VÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW7F–æò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâç&–Ö'•ö7F–öâçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢"66öçFFò÷R‡GG3¢òþ(
b ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâç&–Ö'•ö7F–öâçW&ÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâç&–Ö'•ö7F–öãÖçVÆÂ¢ÒÂ%&WF—&"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò•Ò’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$&÷L:6ò6V7VæL:&–ò"’Â‚2çvV'6—FRæFW6–vâç6V6öæF'•ö7F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâç6V6öæF'•ö7F–öãÖæWtÆ–æ²‚’¢ÒÂ$F–6–öæ"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öw&–B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡FòFò&÷L:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâç6V6öæF'•ö7F–öâæÆ&VÂ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâç6V6öæF'•ö7F–öâæÆ&VÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW7F–æò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâç6V6öæF'•ö7F–öâçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢"66öçFFò÷R‡GG3¢òþ(
b ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâç6V6öæF'•ö7F–öâçW&ÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâç6V6öæF'•ö7F–öãÖçVÆÂ¢ÒÂ%&WF—&"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò•Ò’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$Ö÷6–6òFR&W6VçF:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$L:’G,:§2f÷Föw&f–26ö×ÆVÖVçF&W2ÂW6F2W7V6–ÆÖVçFRæòÖöFVÆò–æl:&æ6–â&Vf—&Vçf–"2f÷Föw&f–3¢VæFW&\:v÷2W‡FW&æ÷2öFVÒ6W"&Æ÷VVF÷2æ,:—f–&—fFVÆ&÷F\:|:6òFòæfVvF÷"â"’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2çvV'6—FRæFW6–vâæ†W&õövÆÆW'’Â‡†÷FòÂ–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢–æFW‚À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Vçf–"f÷Föw&f–„¥TrÂär÷RvV%ÂL:’2Ô"’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"À¢öä6†ævS¢FWfVçBÓâ‡WÆöE6—FT–ÖvR‚FWfVçBÇ†÷Fò’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡2æ76WG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%&WWF–Æ—¦"f÷Föw&f–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡†÷FòçW&Â’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ76WG2Â†76WBÂ76WD–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢76WBæ–BÀ¢fÇVS¢76WBçW&À¢ÒÂ$f÷Fò"²÷FôF—7Æ•7G&–ær†76WD–æFW‚³’²"+r"²÷FôF—7Æ•7G&–ær†76WBç6†#Sbç6Æ–6RƒÃ‚’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ†÷FòçW&ÅÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF–ÖvVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡†÷FòçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢# ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ†÷FòçW&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡†÷FòæÇB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ†÷FòæÇEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÆVvVæFf—<:×fVÂ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡†÷Fòæ6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ†÷Fòæ6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6ò†÷&—¦öçFÂ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡†÷Fòæfö6Å÷‚’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢†÷Fòæfö6Å÷‚À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6òfW'F–6Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡†÷Fòæfö6Å÷’’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢†÷Fòæfö6Å÷’À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR‡2çvV'6—FRæFW6–vâæ†W&õövÆÆW'’Æ–æFW‚ÂÓ’’À¢F—6&ÆVC¢–æFWƒÓÓÓ ¢ÒÂ%7V&—""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR‡2çvV'6—FRæFW6–vâæ†W&õövÆÆW'’Æ–æFW‚Ã’’À¢F—6&ÆVC¢–æFWƒÓÓ×2çvV'6—FRæFW6–vâæ†W&õövÆÆW'’æÆVæwF‚Ó¢ÒÂ$FW66W""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ‡&VÖ÷fU6—FT—FVÒ‡2çvV'6—FRæFW6–vâæ†W&õövÆÆW'’Æ–æFW‚’¢ÒÂ%&VÖ÷fW"f÷Fò"Â‚Â²&öä6Æ–6²%Ò•Ò¢Ò’¢Ò’Â#‚’’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢2çvV'6—FRæFW6–vâæ†W&õövÆÆW'’æÆVæwFƒãÓ2À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâæ†W&õövÆÆW'’çW6‚†æWt–ÖvR‚’’¢ÒÂ$F–6–öæ"f÷FòòÖ÷6–6ò"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$ÖVçRFò6—FR"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%W6R26VwV–FòFò–FVçF–f–6F÷"FRVÖ6\:|:6òF:v–æ–æ–6–ÂÂ÷6ÇVr&VÖ:v–æ7&–F&—†òÂ÷RVÒVæFW&\:vò…EE2â:v–æ2Æö6—2&V6—6ÒW†—7F—"RW7F"Ö&6F2&V&Æ–6:|:6òâ6VÒ—FVç2W'6öæÆ—¦F÷2Âò6—FRÖöçFòÖVçR'F—"F26\:|;VW2f—<:×fV—2â"’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2çvV'6—FRæFW6–vâæÖVçRÂ†VçG'’Â–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢–æFW‚À¢6Æ73¢'‚Öw&–B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VçG'’æÆ&VÂ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVçG'’æÆ&VÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW7F–æò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VçG'’çW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢"6W66öÆ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVçG'’çW&ÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR‡2çvV'6—FRæFW6–vâæÖVçRÆ–æFW‚ÂÓ’’À¢F—6&ÆVC¢–æFWƒÓÓÓ ¢ÒÂ%7V&—""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR‡2çvV'6—FRæFW6–vâæÖVçRÆ–æFW‚Ã’’À¢F—6&ÆVC¢–æFWƒÓÓ×2çvV'6—FRæFW6–vâæÖVçRæÆVæwF‚Ó¢ÒÂ$FW66W""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ‡&VÖ÷fU6—FT—FVÒ‡2çvV'6—FRæFW6–vâæÖVçRÆ–æFW‚’¢ÒÂ%&VÖ÷fW"Æ–æ²"Â‚Â²&öä6Æ–6²%Ò•Ò•Ò’¢Ò’Â#‚’’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢2çvV'6—FRæFW6–vâæÖVçRæÆVæwFƒãÓ‚À¢öä6Æ–6³¢FWfVçBÓâ‡2çvV'6—FRæFW6–vâæÖVçRçW6‚†æWtÆ–æ²‚’’¢ÒÂ$F–6–öæ"Æ–æ²òÖVçR"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡FòFò&öF:’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çvV'6—FRæFW6–vâæfö÷FW%÷FW‡B’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#S"À¢&÷w3¢#" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çvV'6—FRæFW6–vâæfö÷FW%÷FW‡EÕÒ•Ò¢Ò•ÒÂS"’Âµµ÷e6†÷rÂ2ç6—FTwV–FSÓÓÒvæf–vF–öâuÕÒ’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢&FF×6—FRÖwV–FR#¢'vW2"À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%:v–æ2Fò6—FR"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$:v–æ–æ–6–ÂW6òÖöFVÆòW66öÆ†–Fòâ2:v–æ2–çFW&æ2L:¦ÒVæFW&\:vò,;7&–òÂ6öÖò÷6ö'&RÂR†W&FÒ–FVçF–FFRÂÖVçRR&öF:’âFöF2<:6ò6Çf2æòÖW6Öò&67Væ†ó²×VFì:v2<;2VçG&Òæò"òV&Æ–6"ò6—FRâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%:v–æVÒVFœ:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç6—FUvT–æFW‚’ÒFWfVçB’À¢öä6†ævS¢6VÆV7E6—FUvP¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢ÓÒÂ%:v–æ–æ–6–Â"Â‚Â²'fÇVR%Ò’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2çvV'6—FRæFW6–vâçvW2Â‡6—FUvRÂvT–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢vT–æFW‚À¢fÇVS¢vT–æFW€¢ÒÂ÷FôF—7Æ•7G&–ær‡6—FUvRçF—FÆWÇÇ6—FUvRç6ÇVr’²÷FôF—7Æ•7G&–ær‡6—FUvRçV&Æ—6†VCòrs¢r†ì:6ò–æ6ÇV—"æ,;7†–ÖV&Æ–6:|:6ò’r’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµ°¢÷dÖöFVÅ6VÆV7BÀ¢2ç6—FUvT–æFW‚À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FE6—FUvRÀ¢F—6&ÆVC¢2çvV'6—FRæFW6–vâçvW2æÆVæwFƒãÓ# ¢ÒÂ$F–6–öæ":v–æ"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’À¢†VF—F–æuvR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%L:×GVÆòF:v–æ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’çF—FÆR’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVF—F–æuvR‚’çF—FÆUÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF:v–æ‡6ÇVr’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’ç6ÇVr’ÒFWfVçB’À¢&WV—&VC¢""À¢GFW&ã¢%¶×¥Õ¶×£Ó’Õ×³ÃS—Ò"À¢Ö†ÆVæwFƒ¢#c"À¢Æ6V†öÆFW#¢'6ö'&R ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVF—F–æuvR‚’ç6ÇVuÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’çV&Æ—6†VB’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚ÂVF—F–æuvR‚’çV&Æ—6†VEÕÒ’Âö7&VFUFW‡EdæöFR‚$–æ6ÇV—":v–ææ,;7†–ÖV&Æ–6:|:6ò6öæf—&ÖF"•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’ç6†÷uö6öçF7EöFWF–Ç2’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚ÂVF—F–æuvR‚’ç6†÷uö6öçF7EöFWF–Ç5ÕÒ’Âö7&VFUFW‡EdæöFR‚$W†–&—"FF÷2FR6öçFFòFW66öÆ†W&FF÷2Fò6F7G&ò"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’ç6†÷uöfÖ–Ç•öÆ–æ·2’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚ÂVF—F–æuvR‚’ç6†÷uöfÖ–Ç•öÆ–æ·5ÕÒ’Âö7&VFUFW‡EdæöFR‚$W†–&—"Æ–æ·26öæf–wW&F÷2FRÖG,:Ö7VÆR÷'FÂFfÜ:ÖÆ–"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$Ö&6"–æ6ÇW<:6òì:6ò6öÆö6:v–ææò"WFöÖF–6ÖVçFRâ6ÇfRR6öæf—&ÖRV&Æ–6"6—FRVæFòW7F—fW"&öçFâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$VæFW&\:vó¢ò"²÷FôF—7Æ•7G&–ær†VF—F–æuvR‚’ç6ÇVr’²"âæöÖW2FR6W'fœ:v÷26öÖò’ÂöæÆ–æRR÷'FÂ<:6ò&W6W'fF÷2âòFW6Ö&6"V&Æ–6:|:6òÂ&WF—&RFÖ,:–Ò÷2Æ–æ·2&W7F:v–æFòÖVçRRF÷2&÷L;VW3²7VU$Âf–6,:–æF—7öì:×fVÂ;72V&Æ–6"ò6—FRâ"Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$&W6VçF:|:6òF:v–æ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’æ–çG&öGV7F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢##"À¢&÷w3¢#2 ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVF—F–æuvR‚’æ–çG&öGV7F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$f÷Föw&f–F:v–æ"’Â‚VF—F–æuvR‚’æ–ÖvR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†VF—F–æuvR‚’æ–ÖvSÖæWt–ÖvR‚’¢ÒÂ$F–6–öæ"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Vçf–"f÷Föw&f–„¥TrÂär÷RvV%ÂL:’2Ô"’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"À¢öä6†ævS¢FWfVçBÓâ‡WÆöE6—FT–ÖvR‚FWfVçBÆVF—F–æuvR‚’æ–ÖvR’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡2æ76WG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%&WWF–Æ—¦"f÷Föw&f–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’æ–ÖvRçW&Â’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ76WG2Â†76WBÂ76WD–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢76WBæ–BÀ¢fÇVS¢76WBçW&À¢ÒÂ$f÷Fò"²÷FôF—7Æ•7G&–ær†76WD–æFW‚³’²"+r"²÷FôF—7Æ•7G&–ær†76WBç6†#Sbç6Æ–6RƒÃ‚’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂVF—F–æuvR‚’æ–ÖvRçW&ÅÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF–ÖvVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’æ–ÖvRçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢# ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVF—F–æuvR‚’æ–ÖvRçW&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò6W7<:×fVÂFf÷Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’æ–ÖvRæÇB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVF—F–æuvR‚’æ–ÖvRæÇEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÆVvVæFf—<:×fVÂ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’æ–ÖvRæ6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂVF—F–æuvR‚’æ–ÖvRæ6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6ò†÷&—¦öçFÂ‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’æ–ÖvRæfö6Å÷‚’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢VF—F–æuvR‚’æ–ÖvRæfö6Å÷‚À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6òfW'F–6Â‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†VF—F–æuvR‚’æ–ÖvRæfö6Å÷’’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢VF—F–æuvR‚’æ–ÖvRæfö6Å÷’À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†VF—F–æuvR‚’æ–ÖvSÖçVÆÂ¢ÒÂ%&WF—&"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò¢Ò’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fU6—FUvR‚Ó’’À¢F—6&ÆVC¢2ç6—FUvT–æFWƒÓÓÓ ¢ÒÂ%7V&—":v–æ"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fU6—FUvRƒ’’À¢F—6&ÆVC¢2ç6—FUvT–æFWƒÓÓ×2çvV'6—FRæFW6–vâçvW2æÆVæwF‚Ó¢ÒÂ$FW66W":v–æ"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FEvUFôÖVçRÀ¢F—6&ÆVC¢2çvV'6—FRæFW6–vâæÖVçRæÆVæwFƒãÓ€¢ÒÂ$F–6–öæ":v–æòÖVçR"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢&VÖ÷fU6—FUvP¢ÒÂ%&VÖ÷fW":v–æ"Â‚Â²&öä6Æ–6²%Ò¢Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%6\:|;VW2FR6öçF\;¦Fò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$÷&væ—¦R:v–æ6VÆV6–öæF6öÒ&Æö6÷2â6F–FVçF–f–6F÷"vW&VÒÆ–æ²F—&WFòÂ6öÖò6VGV66òâæ÷L:Ö6–2RvVæFW6Ò6öÖVçFR2V&Æ–6:|;VW2FW7F–æF2ò;¦&Æ–6òâ&Æö6÷2f¦–÷2<:6òöÖ—F–F÷3²–ÖvVç2RFW‡F÷2ì:6ò<:6ò&VVæ6†–F÷2WFöÖF–6ÖVçFR6öÒFF÷2FR÷WG&W66öÆâ"’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6öçFVçE6V7F–öç2‚’Â‡6V7F–öâÂ–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â°¢¶W“¢6V7F–öâæ–BÀ¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†–æFW‚³’²"â"²÷FôF—7Æ•7G&–ær‡6V7F–öâçF—FÆWÇÇ6V7F–öäÆ&VÇ5·6V7F–öâæ¶–æEÒ’²""²÷FôF—7Æ•7G&–ær‡6V7F–öâçf—6–&ÆSòrs¢r†ö7VÇF’r’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öf÷&Ò"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR†6öçFVçE6V7F–öç2‚’Æ–æFW‚ÂÓ’’À¢F—6&ÆVC¢–æFWƒÓÓÓ ¢ÒÂ%7V&—"6\:|:6ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR†6öçFVçE6V7F–öç2‚’Æ–æFW‚Ã’’À¢F—6&ÆVC¢–æFWƒÓÓÖ6öçFVçE6V7F–öç2‚’æÆVæwF‚Ó¢ÒÂ$FW66W"6\:|:6ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢FWfVçBÓâ‡&VÖ÷fU6—FT—FVÒ†6öçFVçE6V7F–öç2‚’Æ–æFW‚’¢ÒÂ%&VÖ÷fW"6\:|:6ò"Â‚Â²&öä6Æ–6²%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$f÷&ÖFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ¶–æB’ÒFWfVçB’ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡6V7F–öäÆ&VÇ2Â†Æ&VÂÂfÇVR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â²fÇVS¢fÇVRÒÂ÷FôF—7Æ•7G&–ær†Æ&VÂ’Â’Â²'fÇVR%Ò’¢Ò’Â#Sb’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ6V7F–öâæ¶–æEÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$–FVçF–f–6F÷"FòÆ–æ²"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ–B’ÒFWfVçB’À¢&WV—&VC¢""À¢GFW&ã¢%¶×¥Õ¶×£Ó’Õ×³ÃS—Ò"À¢Ö†ÆVæwFƒ¢#c ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâæ–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâçf—6–&ÆR’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â6V7F–öâçf—6–&ÆUÕÒ’Âö7&VFUFW‡EdæöFR‚$W†–&—"6\:|:6ò"•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6ö×÷6œ:|:6òF6\:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæÆ–÷WB’ÒFWfVçB’ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&FVfVÇB"ÒÂ%G,:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'–ÆÆ'2"ÒÂ$f—†FR–Æ&W2"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&fVGW&R"ÒÂ$FW7FVR6öÒ–æVÂ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'V÷FR"ÒÂ$f÷FòRFWö–ÖVçFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&Öv¦–æR"ÒÂ$Öæ6†WFRR†—7L;7&–2"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&FFW2"ÒÂ$f—†FRFF2"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'7÷FÆ–v‡B"ÒÂ$FW7FVR6öçG&7FçFR"¢ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ6V7F–öâæÆ–÷WEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$–FVçF–f–6F÷"VF—F÷&–Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæW–V'&÷r’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâæW–V'&÷uÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%L:×GVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâçF—FÆR’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâçF—FÆUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâçFW‡B’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢&÷w3¢#B ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâçFW‡EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$f÷Föw&f–F6\:|:6ò"’Â‚6V7F–öâæ–ÖvR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡6V7F–öâæ–ÖvSÖæWt–ÖvR‚’¢ÒÂ$F–6–öæ"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Vçf–"f÷Föw&f–„¥TrÂär÷RvV%ÂL:’2Ô"’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"À¢öä6†ævS¢FWfVçBÓâ‡WÆöE6—FT–ÖvR‚FWfVçBÇ6V7F–öâæ–ÖvR’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡2æ76WG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%&WWF–Æ—¦"f÷Föw&f–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ–ÖvRçW&Â’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ76WG2Â†76WBÂ76WD–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢76WBæ–BÀ¢fÇVS¢76WBçW&À¢ÒÂ$f÷Fò"²÷FôF—7Æ•7G&–ær†76WD–æFW‚³’²"+r"²÷FôF—7Æ•7G&–ær†76WBç6†#Sbç6Æ–6RƒÃ‚’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ6V7F–öâæ–ÖvRçW&ÅÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF–ÖvVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ–ÖvRçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢&‡GG3¢òþ(
b÷RVçf–RVÖf÷Föw&f–6–Ö ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâæ–ÖvRçW&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò6W7<:×fVÂFf÷Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ–ÖvRæÇB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâæ–ÖvRæÇEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÆVvVæFf—<:×fVÂ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ–ÖvRæ6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâæ–ÖvRæ6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6ò†÷&—¦öçFÂ‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ–ÖvRæfö6Å÷‚’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢6V7F–öâæ–ÖvRæfö6Å÷‚À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6òfW'F–6Â‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ–ÖvRæfö6Å÷’’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢6V7F–öâæ–ÖvRæfö6Å÷’À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡6V7F–öâæ–ÖvSÖçVÆÂ¢ÒÂ%&WF—&"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò¢Ò’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$&÷L:6òF6\:|:6ò"’Â‚6V7F–öâæ7F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡6V7F–öâæ7F–öãÖæWtÆ–æ²‚’¢ÒÂ$F–6–öæ"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öw&–B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡FòFò&÷L:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ7F–öâæÆ&VÂ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâæ7F–öâæÆ&VÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW7F–æò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡6V7F–öâæ7F–öâçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢"66öçFFò÷R‡GG3¢òþ(
b ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ6V7F–öâæ7F–öâçW&ÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡6V7F–öâæ7F–öãÖçVÆÂ¢ÒÂ%&WF—&"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò•Ò’•Ò’À¢‚²væWw2rÂvvVæFuÒæ–æ6ÇVFW2‡6V7F–öâæ¶–æB’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒB"ÂçVÆÂÂ$—FVç2FW7F6\:|:6ò"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡6V7F–öâæ—FV×2Â†—FVÒÂ—FVÔ–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&FWF–Ç2"Â°¢¶W“¢—FVÔ–æFW‚À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÔ–æFW‚³’²"â"²÷FôF—7Æ•7G&–ær†—FVÒçF—FÆWÇÂtæ÷fò—FVÒr’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öf÷&Ò"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6FVv÷&–÷RFF"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæW–V'&÷r’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒæW–V'&÷uÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%L:×GVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒçF—FÆR’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒçF—FÆUÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒçFW‡B’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢##"À¢&÷w3¢#2 ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒçFW‡EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$f÷Föw&f–Fò—FVÒ"’Â‚—FVÒæ–ÖvR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†—FVÒæ–ÖvSÖæWt–ÖvR‚’¢ÒÂ$F–6–öæ"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Vçf–"f÷Föw&f–„¥TrÂär÷RvV%ÂL:’2Ô"’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"À¢öä6†ævS¢FWfVçBÓâ‡WÆöE6—FT–ÖvR‚FWfVçBÆ—FVÒæ–ÖvR’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡2æ76WG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%&WWF–Æ—¦"f÷Föw&f–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ–ÖvRçW&Â’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ76WG2Â†76WBÂ76WD–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢76WBæ–BÀ¢fÇVS¢76WBçW&À¢ÒÂ$f÷Fò"²÷FôF—7Æ•7G&–ær†76WD–æFW‚³’²"+r"²÷FôF—7Æ•7G&–ær†76WBç6†#Sbç6Æ–6RƒÃ‚’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ—FVÒæ–ÖvRçW&ÅÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF–ÖvVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ–ÖvRçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢&‡GG3¢òþ(
b÷RVçf–RVÖf÷Föw&f–6–Ö ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒæ–ÖvRçW&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò6W7<:×fVÂFf÷Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ–ÖvRæÇB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒæ–ÖvRæÇEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÆVvVæFf—<:×fVÂ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ–ÖvRæ6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒæ–ÖvRæ6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6ò†÷&—¦öçFÂ‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ–ÖvRæfö6Å÷‚’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢—FVÒæ–ÖvRæfö6Å÷‚À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6òfW'F–6Â‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ–ÖvRæfö6Å÷’’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢—FVÒæ–ÖvRæfö6Å÷’À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†—FVÒæ–ÖvSÖçVÆÂ¢ÒÂ%&WF—&"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò¢Ò’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$Æ–æ²Fò—FVÒ"’Â‚—FVÒæ7F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†—FVÒæ7F–öãÖæWtÆ–æ²‚’¢ÒÂ$F–6–öæ"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öw&–B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%FW‡FòFò&÷L:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ7F–öâæÆ&VÂ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#ƒ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒæ7F–öâæÆ&VÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW7F–æò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚†—FVÒæ7F–öâçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢"66öçFFò÷R‡GG3¢òþ(
b ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ—FVÒæ7F–öâçW&ÅÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†—FVÒæ7F–öãÖçVÆÂ¢ÒÂ%&WF—&"&÷L:6ò"Â‚Â²&öä6Æ–6²%Ò•Ò’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR‡6V7F–öâæ—FV×2Æ—FVÔ–æFW‚ÂÓ’’À¢F—6&ÆVC¢—FVÔ–æFWƒÓÓÓ ¢ÒÂ%7V&—"—FVÒ"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fR‡6V7F–öâæ—FV×2Æ—FVÔ–æFW‚Ã’’À¢F—6&ÆVC¢—FVÔ–æFWƒÓÓ×6V7F–öâæ—FV×2æÆVæwF‚Ó¢ÒÂ$FW66W"—FVÒ"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢FWfVçBÓâ‡&VÖ÷fU6—FT—FVÒ‡6V7F–öâæ—FV×2Æ—FVÔ–æFW‚’¢ÒÂ%&VÖ÷fW"—FVÒ"Â‚Â²&öä6Æ–6²%Ò•Ò¢Ò•Ò’¢Ò’Â#‚’’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢6V7F–öâæ—FV×2æÆVæwFƒãÓ"À¢öä6Æ–6³¢FWfVçBÓâ‡6V7F–öâæ—FV×2çW6‚†æWt—FVÒ‚’’¢ÒÂ$F–6–öæ"—FVÒ"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò•Ò’¢Ò’Â#‚’’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$æ÷f6\:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç6V7F–öä¶–æB’ÒFWfVçB’ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡6V7F–öäÆ&VÇ2Â†Æ&VÂÂfÇVR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â²fÇVS¢fÇVRÒÂ÷FôF—7Æ•7G&–ær†Æ&VÂ’Â’Â²'fÇVR%Ò’¢Ò’Â#Sb’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2ç6V7F–öä¶–æEÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FE6V7F–öâÀ¢F—6&ÆVC¢6öçFVçE6V7F–öç2‚’æÆVæwFƒãÓ# ¢ÒÂ$F–6–öæ"6\:|:6ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò¢ÒÂS"’Âµµ÷e6†÷rÂ2ç6—FTwV–FSÓÓÒwvW2uÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2çvV'6—FRæFW6–vãòæFVÖöç7G&F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'Bv&æ–ær ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$6öçF\;¦FòFVÖöç7G&F—fò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%FW‡F÷2ÂFF2Rf÷Föw&f–2<:6òW†V×Æ÷2f–7L:Ö6–÷2Âì:6ò–æf÷&Ö:|;VW2F7VW66öÆâ7V'7F—GVÖ÷2çFW2FV&Æ–6:|:6òFVf–æ—F—fâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢Ö&´FVÖõ&WÆ6V@¢ÒÂ$6öæ6Ç\:Ò7V'7F—GVœ:|:6òR&Wf—<:6òF÷2W†V×Æ÷2"Â‚Â²&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æFVÖô6öæf—&ÖVB’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â2æFVÖô6öæf—&ÖVEÕÒ’Âö7&VFUFW‡EdæöFR‚$VçFVæFòVRÂ6RV&Æ–6"v÷&ÂW†V×Æ÷2f–7L:Ö6–÷2RVÖf—†FVÖöç7G&F—ff–6,:6òf—<:×fV—2ò;¦&Æ–6òâ"•Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6Çf"&67Væ†òRG&ö6"ÖöFVÆòì:6òV&Æ–6ÒÇFW&:|;VW2â,:—f–:’&—fFRW6ÖW6Ö6ö×÷6œ:|:6òFò6—FR;¦&Æ–6òâ&Æö6÷2÷6–öæ—2f¦–÷2<:6òöÖ—F–F÷2â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â²6Æ73¢&'Fâ'Fâ×6V6öæF'’"ÒÂ%6Çf"&67Væ†ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢&Wf–WuvV'6—FP¢ÒÂ%f—7VÆ—¦",:—f–"Â‚Â²&öä6Æ–6²%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢V&Æ—6…vV'6—FP¢ÒÂ%V&Æ–6"6—FR"Â‚Â²&öä6Æ–6²%Ò’À¢‡2çV&Æ—6†VB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢VçV&Æ—6…vV'6—FP¢ÒÂ%&WF—&"V&Æ–6:|:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2çV&Æ—6†VBbg2çV&Æ—6†VEW&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢‡&Vc¢2çV&Æ—6†VEW&ÂÀ¢F&vWC¢%ö&Ææ²"À¢&VÃ¢&æö÷VæW"æ÷&VfW'&W" ¢ÒÂ$'&—"6—FRV&Æ–6Fò"Â‚Â²&‡&Vb%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò¢ÒÂ‚Â²&F—6&ÆVB%Ò•ÒÂCÂ²&öå7V&Ö—B"Â&öä–çWB"Â&öä–çfÆ–D6GW&R%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â‡2ç&Wf–Wt‡FÖÂ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'vV'6—FR×&Wf–Wr ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ²‡2æÖöFVÅ&Wf–Wt7F—fRbfÖöFVÅ&VG’‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²f÷#¢wvV'6—FRÖÖöFVÂ×&Wf–Wr×vRÒr·&÷2ç66†ööÄ–BÒÂ%:v–æF,:—f–FòÖöFVÆò"Â‚Â²&f÷"%Ò’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢–C¢wvV'6—FRÖÖöFVÂ×&Wf–Wr×vRÒr·&÷2ç66†ööÄ–BÀ¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æÖöFVÅ&Wf–WuvR’ÒFWfVçB’À¢öä6†ævS¢&Wf–WtÖöFVÅvRÀ¢F—6&ÆVC¢2æ'W7¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ$–ì:Ö6–ò"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2ç&W6öÇfVDÖöFVÃòæFW6–vãòçvW2Â‡vR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢vRç6ÇVrÀ¢fÇVS¢vRç6ÇVp¢ÒÂ÷FôF—7Æ•7G&–ær‡vRçF—FÆR’²"+rò"²÷FôF—7Æ•7G&–ær‡vRç6ÇVr’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&–B"Â&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2æÖöFVÅ&Wf–WuvUÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Æ&wW&F,:—f–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç&Wf–Wuv–GF‚’ÒFWfVçB’ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢#R"ÒÂ$FW6·F÷"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢#sc‡‚"ÒÂ#sc‚‚"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢#3“‚"ÒÂ#3“‚"’À¢ö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢#3#‚"ÒÂ#3#‚"¢ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2ç&Wf–Wuv–GF…ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ"À¢öä6Æ–6³¢6Æ÷6U&Wf–Wp¢ÒÂ$fV6†",:—f–"Â‚Â²&öä6Æ–6²%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&–g&ÖR"Â°¢F—FÆS¢%,:—f–&—fFFò6—FR"À¢öäÆöC¢&–æE&Wf–WtÆ–æ·2À¢6æF&÷ƒ¢&ÆÆ÷r×6ÖRÖ÷&–v–â"À¢7&6Fö3¢2ç&Wf–Wt‡FÖÂÀ¢7G–ÆS¢öæ÷&ÖÆ—¦U7G–ÆR‡·v–GFƒ§2ç&Wf–Wuv–GF‚ÆÖ…v–GFƒ¢sRrÆ†V–v‡C¢ss#‚rÆ&÷&FW#¢s‚6öÆ–B6662wÒ¢ÒÂçVÆÂÂCBÂ²&öäÆöB"Â'7&6Fö2%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$4ôÕTä”DDRU44ôÄ""’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡&÷2æ6ö×7Còt6öçFV6RæW66öÆs¢tæ÷L:Ö6–2RvVæFr’Â’Â‚&÷2æ6ö×7B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$–æf÷&Ö:|;VW2ÂVæ6öçG&÷2RÖöÖVçF÷2–×÷'FçFW2FW66öÆâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡'Vâ†ÆöB’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$GVÆ—¦""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Â†ÖævR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢FWfVçBÓâ†VF—B‚’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ"²æ÷fV&Æ–6:|:6ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’À¢‡2æW'&÷"bb2æVF—F–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ææ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡2ææ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‚&÷2æ6ö×7B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢2À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢'‚Öf–ÇFW""À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6V&6‚Â²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W7V—6""’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#c"À¢Æ6V†öÆFW#¢$æ÷L:Ö6–Â77VçFò÷RWfVçFò ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6öçF\;¦Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢$6öçF\;¦Fò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ¶–æB’ÒFWfVçB¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ$æ÷L:Ö6–2RWfVçF÷2"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&æWw2"ÒÂ$æ÷L:Ö6–2"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&WfVçB"ÒÂ$WfVçF÷2"•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2æ¶–æEÕÒ•Ò’À¢†ÖævR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%6—GV:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢%6—GV:|:6ò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç7FGW2’ÒFWfVçB¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FGW4Æ&VÇ2Â†Æ&VÂÂfÇVR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢fÇVRÀ¢fÇVS¢fÇVP¢ÒÂ÷FôF—7Æ•7G&–ær†Æ&VÂ’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2ç7FGW5ÕÒ•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢À¢6Æ73¢'‚Ö6†V6² ¢ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2çW6öÖ–ær’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â2çW6öÖ–æuÕÒ’Âö7&VFUFW‡EdæöFR‚%6öÖVçFR,;7†–Ö÷2WfVçF÷2"•Ò’’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢2æ'W7¢ÒÂ%W7V—6""Â‚Â²&F—6&ÆVB%Ò¢ÒÂCÂ²&öå7V&Ö—B%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ'W7’bb2æ—FV×2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢BÀ¢6Æ73¢&V×G’"À¢&öÆS¢'7FGW2 ¢ÒÂ$6'&VvæFòV&Æ–6:|;VW>(
b"’¢¢‚2æ—FV×2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢RÀ¢6Æ73¢'æVÂ6öÖ×Væ—G’ÖV×G’ ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7â"Â°¢6Æ73¢&6öÖ×Væ—G’ÖV×G’Ö–6öâ"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂ.)jB"’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖævR‚“òt6öÖV6R6ö×'F–Æ†"2æ÷f–FFW2s¢tæVæ‡VÖV&Æ–6:|:6òæW7FRÖöÖVçFòr’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖævR‚“òuV&Æ—VRæ÷L:Ö6–2R÷&væ—¦R÷2,;7†–Ö÷2WfVçF÷2FW66öÆâs¢t2æ÷f–FFW2R÷2WfVçF÷2FW66öÆ&V6W,:6òV’âr’Â’À¢†ÖævR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢FWfVçBÓâ†VF—B‚’¢ÒÂ$7&–"V&Æ–6:|:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öÖ×Væ—G’Öw&–B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ—FV×2Â‡÷7B’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â°¢¶W“¢÷7Bæ–BÀ¢6Æ73¢'æVÂ6öÖ×Væ—G’Ö6&B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öÖ×Væ—G’Ö6&BÖÖWF"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&&FvR"ÒÂ÷FôF—7Æ•7G&–ær‡÷7Bæ¶–æCÓÓÒvWfVçBsòtWfVçFòs¢tæ÷L:Ö6–r’Â’Â‡÷7Bç–ææVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVB ¢ÒÂ$VÒFW7FVR"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â†ÖævR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVB ¢ÒÂ÷FôF—7Æ•7G&–ær‡66†VGVÆVB‡÷7B“òtvVæFFòs¦W‡—&VB‡÷7B“òtVæ6W'&Fòs§7FGW4Æ&VÇ5·÷7Bç7FGW5Ò’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢‡÷7Bæ¶–æCÓÓÒvWfVçBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&6öÖ×Væ—G’ÖWfVçBÖFFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡÷7BæWfVçE÷7F'BÇG'VR’’Â’Â‡÷7BæÆö6F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡÷7BæÆö6F–öâ’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡÷7BçF—FÆR’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&6öÖ×Væ—G’ÖW†6W'B"ÒÂ÷FôF—7Æ•7G&–ær‡÷7Bç7VÖÖ'—ÇÇ÷7Bæ6öçFVçBç6Æ–6RƒÃ##’²‡÷7Bæ6öçFVçBæÆVæwFƒã##ò~(
bs¢rr’’Â’À¢†ÖævR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â°¢¶W“¢À¢6Æ73¢&×WFVB ¢ÒÂ÷FôF—7Æ•7G&–ær†VF–Væ6TÆ&VÇ5·÷7BæVF–Væ6UÒ’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öÖ×Væ—G’Ö6&BÖfö÷FW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ÷FôF—7Æ•7G&–ær‡÷7BçV&Æ—6…öCöFFR‡÷7BçV&Æ—6…öB“¢tì:6òV&Æ–6Fòr’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†÷Vâ‡÷7B’¢ÒÂ$ÆW"V&Æ–6:|:6ò"Â‚Â²&öä6Æ–6²%Ò’Â†ÖævR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’6ÖÆÂÖ'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†VF—B‡÷7B’¢ÒÂ$VF—F""Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò¢Ò’¢Ò’Â#‚’•Ò’À¢‚&÷2æ6ö×7Bbg2çF÷FÃã"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢bÀ¢6Æ73¢'v–æF–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2çF÷FÂ’²"V&Æ–6:|:6òŒ;VW2’+r:v–æ"²÷FôF—7Æ•7G&–ær‡2çvR’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡vR‚Ó’’À¢F—6&ÆVC¢2æ'W7—ÇÇ2çvSÃÓ¢ÒÂ$çFW&–÷""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡vRƒ’’À¢F—6&ÆVC¢2æ'W7—ÇÇ2çvR£#ã×2çF÷FÀ¢ÒÂ%,;7†–Ö"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…ö÷Vä&Æö6²‚’Âö7&VFT&Æö6²…õFVÆW÷'BÂ²Fó¢F–ÆöuF&vWBÒÂ²‡2ç6VÆV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÖöFÂÖ&6¶G&÷"À¢öä6Æ–6³¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ‡2ç6VÆV7FVCÖçVÆÂ’Â²'6VÆb%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂ6öÖ×Væ—G’ÖFWF–Â"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&6öÖ×Væ—G’×÷7B×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBæ¶–æCÓÓÒvWfVçBsòttTäDDU44ôÄs¢täõL8Ô4”r’Â’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&6öÖ×Væ—G’×÷7B×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBçF—FÆR’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&–6öâÖ'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢&&–ÖÆ&VÂ#¢$fV6†"V&Æ–6:|:6ò"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6VÆV7FVCÖçVÆÂ¢ÒÂ,9r"Â‚Â²&öä6Æ–6²%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ°¢‡2ç6VÆV7FVBæ¶–æCÓÓÒvWfVçBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&6öÖ×Væ—G’ÖWfVçBÖFFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡2ç6VÆV7FVBæWfVçE÷7F'BÇG'VR’’Â’Â‡2ç6VÆV7FVBæWfVçEöVæB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â²¶W“¢ÒÂ$L:’"²÷FôF—7Æ•7G&–ær†FFR‡2ç6VÆV7FVBæWfVçEöVæBÇG'VR’’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â‡2ç6VÆV7FVBæÆö6F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBæÆö6F–öâ’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç6VÆV7FVBç7VÖÖ'’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&6öÖ×Væ—G’ÖÆVB ¢ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBç7VÖÖ'’’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&6öÖ×Væ—G’×&÷6R"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡&w&‡2‡2ç6VÆV7FVBæ6öçFVçB’Â‡&w&‚Â–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢–æFW‚ÒÂ÷FôF—7Æ•7G&–ær‡&w&‚’Â’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBçV&Æ—6…öCòuV&Æ–6FòVÒr¶FFR‡2ç6VÆV7FVBçV&Æ—6…öB“¢u,:—f–Fò&67Væ†òr’Â¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW""ÒÂ²†ÖævR‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†VF—B‡2ç6VÆV7FVB’¢ÒÂ$VF—F"V&Æ–6:|:6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6VÆV7FVCÖçVÆÂ¢ÒÂ$6öæ6ÇV—"ÆV—GW&"Â‚Â²&öä6Æ–6²%Ò•Ò•Ò•ÒÂ‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂ‚Â²'Fò%Ò’’À¢…ö÷Vä&Æö6²‚’Âö7&VFT&Æö6²…õFVÆW÷'BÂ²Fó¢F–ÆöuF&vWBÒÂ²‡2æVF—F–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÖöFÂÖ&6¶G&÷"À¢öä6Æ–6³¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ†6Æ÷6TVF—F÷"‚’’Â²'6VÆb%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂ6öÖ×Væ—G’ÖVF—F÷""À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&6öÖ×Væ—G’ÖVF—F÷"×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$4ôÕTä”48|84òDU44ôÄ"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&6öÖ×Væ—G’ÖVF—F÷"×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æf÷&Òæ–CòtVF—F"V&Æ–6:|:6òs¢tæ÷fV&Æ–6:|:6òr’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&–6öâÖ'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢&&–ÖÆ&VÂ#¢$fV6†"VF—F÷""À¢öä6Æ–6³¢FWfVçBÓâ†6Æ÷6TVF—F÷"‚’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ,9r"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&ÖöFÂÖf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fRÂ²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ°¢‡2æW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æF—66&B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&F—66&BÖ&ææW" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$Œ:ÇFW&:|;VW2ì:6ò6Çf2â"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2æF—66&CÖfÇ6R¢ÒÂ$6öçF–çV"VF—FæFò"Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢FWfVçBÓâ†6Æ÷6TVF—F÷"‡G'VR’¢ÒÂ$FW66'F""Â‚Â²&öä6Æ–6²%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&æb"Â°¢6Æ73¢&VF—F÷"×7FW2"À¢&&–ÖÆ&VÂ#¢$WF2FV&Æ–6:|:6ò ¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†VF—F÷%7FW2Â‡7FW’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢7FWæ–BÀ¢G—S¢&'WGFöâ"À¢&&–Ö7W'&VçB#¢2æVF—F÷%7FWÓÓ×7FWæ–Còw7FWs§VæFVf–æVBÀ¢öä6Æ–6³¢FWfVçBÓâ‡6WDVF—F÷%7FW‡7FWæ–B’¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FWæçVÖ&W"’Â’Âö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡7FWæÆ&VÂ’Â•ÒÂ‚Â²&&–Ö7W'&VçB"Â&öä6Æ–6²%Ò’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&VF—F÷"×7FW×7VÖÖ'’"ÒÂ÷FôF—7Æ•7G&–ær†VF—F÷%7FW7VÖÖ'’‚’’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢6Æ73¢&F–ÆörÖf–VÆG2‚Öf÷&Ò"À¢F—6&ÆVC¢2æ'W7¢ÒÂ°¢÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VF—F÷"×7FW×æVÂ"À¢&FFÖVF—F÷"×7FW#¢&6öçFVçB ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%F—ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢%F—ò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ¶–æB’ÒFWfVçB¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&æWw2"ÒÂ$æ÷L:Ö6–"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&WfVçB"ÒÂ$WfVçFò"•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2æf÷&Òæ¶–æEÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%;¦&Æ–6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢%;¦&Æ–6ò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&ÒæVF–Væ6R’ÒFWfVçB¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†VF–Væ6TÆ&VÇ2Â†Æ&VÂÂfÇVR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢fÇVRÀ¢fÇVS¢fÇVP¢ÒÂ÷FôF—7Æ•7G&–ær†Æ&VÂ’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2æf÷&ÒæVF–Væ6UÕÒ•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%L:×GVÆò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&ÒçF—FÆR’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#2"À¢Ö†ÆVæwFƒ¢#c"À¢Æ6V†öÆFW#¢$òVR6ö×Væ–FFR&V6—66&W#ò ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&ÒçF—FÆUÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%&W7VÖò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òç7VÖÖ'’’ÒFWfVçB’À¢&÷w3¢#""À¢Ö†ÆVæwFƒ¢#C"À¢Æ6V†öÆFW#¢%VÖ&W6VçF:|:6ò'&WfR&Æ—7FFRV&Æ–6:|;VW2â ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&Òç7VÖÖ'•ÕÒ•Ò•ÒÂS"’Âµµ÷e6†÷rÂ2æVF—F÷%7FWÓÓÒv6öçFVçBuÕÒ’À¢÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VF—F÷"×7FW×æVÂ"À¢&FFÖVF—F÷"×7FW#¢&ÖVF– ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â²6Æ73¢'÷'FÂÖf–VÆG6WB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$f÷FòFV&Æ–6:|:6ò"’Â‚2æf÷&Òæ–ÖvR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2æf÷&Òæ–ÖvSÖæWt–ÖvR‚’¢ÒÂ$F–6–öæ"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'‚Öf÷&Ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Vçf–"f÷Föw&f–„¥TrÂär÷RvV%ÂL:’2Ô"’"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢66WC¢&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'"À¢öä6†ævS¢FWfVçBÓâ‡WÆöE6—FT–ÖvR‚FWfVçBÇ2æf÷&Òæ–ÖvR’¢ÒÂçVÆÂÂCÂ²&öä6†ævR%Ò•Ò’À¢‡2æ76WG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â²¶W“¢ÒÂµö7&VFUFW‡EdæöFR‚%&WWF–Æ—¦"f÷Föw&f–"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ–ÖvRçW&Â’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ76WG2Â†76WBÂ76WD–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢76WBæ–BÀ¢fÇVS¢76WBçW&À¢ÒÂ$f÷Fò"²÷FôF—7Æ•7G&–ær†76WD–æFW‚³’²"+r"²÷FôF—7Æ•7G&–ær†76WBç6†#Sbç6Æ–6RƒÃ‚’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2æf÷&Òæ–ÖvRçW&ÅÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòF–ÖvVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ–ÖvRçW&Â’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢&‡GG3¢òþ(
b÷RVçf–RVÖf÷Föw&f–6–Ö ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&Òæ–ÖvRçW&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW67&œ:|:6ò6W7<:×fVÂFf÷Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ–ÖvRæÇB’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&Òæ–ÖvRæÇEÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$ÆVvVæFf—<:×fVÂ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ–ÖvRæ6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&Òæ–ÖvRæ6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6ò†÷&—¦öçFÂ‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ–ÖvRæfö6Å÷‚’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢2æf÷&Òæ–ÖvRæfö6Å÷‚À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$fö6òfW'F–6Â‚R’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ–ÖvRæfö6Å÷’’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢2æf÷&Òæ–ÖvRæfö6Å÷’À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2æf÷&Òæ–ÖvSÖçVÆÂ¢ÒÂ%&WF—&"f÷Föw&f–"Â‚Â²&öä6Æ–6²%Ò¢Ò’•Ò•ÒÂS"’Âµµ÷e6†÷rÂ2æVF—F÷%7FWÓÓÒvÖVF–uÕÒ’À¢÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VF—F÷"×7FW×æVÂ"À¢&FFÖVF—F÷"×7FW#¢&6öçFVçB ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6öçF\;¦Fò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òæ6öçFVçB’ÒFWfVçB’À¢&÷w3¢#‚"À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#"À¢Ö†ÆVæwFƒ¢#c"À¢Æ6V†öÆFW#¢$W67&WfòFW‡Fò6ö×ÆWFòFV&Æ–6:|:6òâ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&Òæ6öçFVçEÕÒ•Ò•ÒÂS"’Âµµ÷e6†÷rÂ2æVF—F÷%7FWÓÓÒv6öçFVçBuÕÒ’À¢÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VF—F÷"×7FW×æVÂ"À¢&FFÖVF—F÷"×7FW#¢'V&Æ—6‚ ¢ÒÂ°¢‡2æf÷&Òæ¶–æCÓÓÒvWfVçBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&6öÖ×Væ—G’ÖWfVçBÖf–VÆG2 ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%VæFòRöæFR"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$–ì:Ö6–ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFWF–ÖRÖÆö6Â"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&ÒæWfVçE÷7F'B’ÒFWfVçB’À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&ÒæWfVçE÷7F'EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Væ6W'&ÖVçFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFWF–ÖRÖÆö6Â"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&ÒæWfVçEöVæB’ÒFWfVçB’À¢Ö–ã¢2æf÷&ÒæWfVçE÷7F'GÇÇVæFVf–æV@¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&Ö–â%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&ÒæWfVçEöVæEÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Æö6Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&ÒæÆö6F–öâ’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢##C"À¢Æ6V†öÆFW#¢$VF—L;7&–òÂ:F–ò÷RVæFW&\:vòFòVæ6öçG&ò ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&ÒæÆö6F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"Â²6Æ73¢&×WFVB"ÒÂ$†÷,:&–÷2FR'&<:ÖÆ–ò&†–…UD>(‰#2’â"¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%6—GV:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&&–ÖÆ&VÂ#¢%6—GV:|:6ò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òç7FGW2’ÒFWfVçB¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&G&gB"ÒÂ%&67Væ†ò"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢'V&Æ—6†VB"ÒÂ%V&Æ–6Fò"’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢&&6†—fVB"ÒÂ$'V—fFò"•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2æf÷&Òç7FGW5ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&Òç–ææVB’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â2æf÷&Òç–ææVEÕÒ’Âö7&VFUFW‡EdæöFR‚$FW7F6"æÆ—7F"•Ò•Ò’À¢‡2æf÷&Òç7FGW3ÓÓÒwV&Æ—6†VBrbg2æf÷&ÒæVF–Væ6SÓÓÒwV&Æ–2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢'6ÖÆÂ×WFVB ¢ÒÂ$W7FV&Æ–6:|:6òf–6,:F—7öì:×fVÂVÇVW"f—6—FçFRF:v–æ;¦&Æ–6FW66öÆâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ%&öw&Ö"W,:ÖöFòFRW†–&œ:|:6ò"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%V&Æ–6"'F—"FR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFWF–ÖRÖÆö6Â"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&ÒçV&Æ—6…öB’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&ÒçV&Æ—6…öEÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%&WF—&"FW†–&œ:|:6òVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFWF–ÖRÖÆö6Â"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æf÷&ÒæW‡—&W5öB’ÒFWfVçB’À¢Ö–ã¢2æf÷&ÒçV&Æ—6…öGÇÇVæFVf–æV@¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&Ö–â%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æf÷&ÒæW‡—&W5öEÕÒ•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ%6VÒFF–æ–6–ÂÂV&Æ–6:|:6ò:’–ÖVF–Fâ†÷,:&–÷2FR'&<:ÖÆ–ò&†–…UD>(‰#2’â"•Ò’À¢‡2æf÷&Òæ–Bbg2æf÷&Òç7FGW3ÓÓÒvG&gBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²¶W“¢"ÒÂ²‚2æFVÆWFT6öæf—&Ò¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢FWfVçBÓâ‡2æFVÆWFT6öæf—&Ó×G'VR¢ÒÂ$W†6ÇV—"&67Væ†ò"Â‚Â²&öä6Æ–6²%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&F—66&BÖ&ææW" ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$W†6ÇV—"W7FR&67Væ†òFVf–æ—F—fÖVçFSò"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡2æFVÆWFT6öæf—&ÓÖfÇ6R¢ÒÂ%föÇF""Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'FâÖFævW""À¢öä6Æ–6³¢&VÖ÷fP¢ÒÂ$6öæf—&Ö"W†6ÇW<:6ò"Â‚Â²&öä6Æ–6²%Ò•Ò’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂS"’Âµµ÷e6†÷rÂ2æVF—F÷%7FWÓÓÒwV&Æ—6‚uÕÒ¢ÒÂ‚Â²&F—6&ÆVB%Ò¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW""ÒÂ°¢‡2æVF—F÷%7FWÓÒv6öçFVçBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢&Wf–÷W4VF—F÷%7FWÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ%föÇF""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æVF—F÷%7FWÓÒwV&Æ—6‚r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢æW‡DVF—F÷%7FWÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$6öçF–çV""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†6Æ÷6TVF—F÷"‚’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢2æ'W7¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òu6ÇfæFþ(
bs§2æf÷&Òç7FGW3ÓÓÒwV&Æ—6†VBsòu6Çf"RV&Æ–6"s¢u6Çf"V&Æ–6:|:6òr’Â’Â²&F—6&ÆVB%Ò¢Ò•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò•ÒÂ‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂ‚Â²'Fò%Ò’¢Ò’¢Ð§ÒÆæWw3¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂFôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂ7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂ&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Â&W6öÇfT6ö×öæVçC¢÷&W6öÇfT6ö×öæVçBÂ7&VFT&Æö6³¢ö7&VFT&Æö6²ÒÒõgVP ¢6öç7Bö6ö×öæVçE÷66†ööÅö6öÖ×Væ—G’Ò÷&W6öÇfT6ö×öæVçB‚'66†ööÂÖ6öÖ×Væ—G’" ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²6Æ73¢'66†ööÂÖæWw2×6†VÆÂ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢'66†ööÂÖæWw2Ö†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&"Â°¢6Æ73¢'66†ööÂÖæWw2Ö'&æB"À¢‡&Vc¢"öæWw2æ‡FÖÂ ¢ÒÂ²†–FVçF—G’æÆövõ÷W&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&–Ör"Â°¢¶W“¢À¢7&3¢–FVçF—G’æÆövõ÷W&ÂÀ¢ÇC¢–FVçF—G’æF—7Æ•öæÖP¢ÒÂçVÆÂÂ‚Â²'7&2"Â&ÇB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†–FVçF—G’æF—7Æ•öæÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$æ÷L:Ö6–2RvVæFFW66öÆ"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢‡&Vc¢rööæÆ–æRæ‡FÖÂr²‡7FFRç66†ööÄ–Còs÷66†ööÃÒr¶Væ6öFUU$”6ö×öæVçB‡7FFRç66†ööÄ–B“¢rr¢ÒÂ%÷'FÂF÷2&W7öç<:fV—2"Â‚Â²&‡&Vb%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢‡&Vc¢"ò ¢ÒÂ$6W76"Ö–æ†6öçF"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Ö–â"Â²–C¢&Ö–âÖ6öçFVçB"ÒÂ²‚7FFRç&VG’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'B–æfò"À¢&öÆS¢'7FGW2 ¢ÒÂ$6'&VvæFòW66öÆ(
b"’¢¢‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢7F'@¢ÒÂ%FVçF"æ÷fÖVçFR"Â‚Â²&öä6Æ–6²%Ò•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢"ÒÂ²‡7FFRç66†ööÇ2æÆVæwFƒã¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%Væ–FFRW66öÆ""’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç66†ööÄ–B’ÒFWfVçB’À¢öä6†ævS¢6VÆV7E66†ööÀ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæRVÖVæ–FFR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç66†ööÇ2Â‡66†ööÂ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢66†ööÂæ–BÀ¢fÇVS¢66†ööÂæ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡66†ööÂææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRç66†ööÄ–EÕÒ•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â‡7FFRç66†ööÄ–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFT&Æö6²…ö6ö×öæVçE÷66†ööÅö6öÖ×Væ—G’Â°¢¶W“¢7FFRç66†ööÄ–BÀ¢'66†ööÂÖ–B#¢7FFRç66†ööÄ–BÀ¢'V&Æ–2ÖÖöFR#¢G'VP¢ÒÂçVÆÂÂ‚Â²'66†ööÂÖ–B"Â'V&Æ–2ÖÖöFR%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢"À¢6Æ73¢'æVÂ6öÖ×Væ—G’ÖV×G’ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç66†ööÇ2æÆVæwFƒòtW66öÆ†7VVæ–FFRW66öÆ"s¢t&VÒ×f–æFò:W66öÆr’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRç66†ööÇ2æÆVæwFƒòu6VÆV6–öæRVÖVæ–FFR&6öç7VÇF"2æ÷L:Ö6–2R÷2,;7†–Ö÷2WfVçF÷2âs¢t2æ÷L:Ö6–2RvVæF6W,:6òF—7öæ–&–Æ—¦F2VÆ–ç7F—GVœ:|:6òâr’Â•Ò’•ÒÂcB’•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢'66†ööÂÖæWw2Öfö÷FW""ÒÂ÷FôF—7Æ•7G&–ær†–FVçF—G’æF—7Æ•öæÖR’²"+r–æf÷&Ö:|;VW2öf–6–—2F–ç7F—GVœ:|:6òâ"Â•Ò’¢Ð§ÒÆÖ–Æ6÷s¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂFôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Â7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÄ6†V6¶&÷ƒ¢÷dÖöFVÄ6†V6¶&÷‚Âv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2Â&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢6Æ73¢&Ö–Æ6÷r×vR"À¢&&–ÖÆ&VÂ#¢$RÖÖ–Â–ç7F—GV6–öæÂ ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$”åDTu$8|9TU2"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$RÖÖ–Â–ç7F—GV6–öæÂ"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6öçF2FW66öÆ&&öfW76÷&W2ÂgVæ6–öì:&–÷2RÇVæ÷2â"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢&Vg&W6‚À¢F—6&ÆVC¢7FFRæ'W7—ÇÆF—'G¢ÒÂ$GVÆ—¦""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FövvÆT6öæf–rÀ¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRç6†÷t6öæf–sòtfV6†"6öæf–wW&:|:6òs¢t6öæf–wW&"r’Â’Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢‡7FFRæ6öæf–ræVæ&ÆVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†W†—7F–æuvR‚’’À¢F—6&ÆVC¢7FFRæ'W7—ÇÆF—'G¢ÒÂ%f–æ7VÆ"RÖÖ–Ç2W†—7FVçFW2"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ6öæf–ræVæ&ÆVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢&Vv–äæWrÀ¢F—6&ÆVC¢7FFRæ'W7—ÇÆF—'G¢ÒÂ$æ÷f6—†FRRÖÖ–Â"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò•Ò’À¢‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRææ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRææ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç6†÷t6öæf–r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f÷&Ò"Â°¢¶W“¢"À¢6Æ73¢'æVÂ‚Ö6&B"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ‡6fR‚FWfVçBç7V&Ö—GFW#òçfÇVSÓÓÒwFW7Br’’Â²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%6W'f–F÷"FW66öÆ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòFò6W'f–F÷"FRRÖÖ–Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæ&6U÷W&Â’ÒFWfVçB’À¢G—S¢'W&Â"À¢&WV—&VC¢""À¢Æ6V†öÆFW#¢&‡GG3¢òöÖ–ÂæW66öÆæVGRæ'""À¢Ö†ÆVæwFƒ¢#3"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBæ&6U÷W&ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$FöÜ:Öæ–òFRRÖÖ–Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæFöÖ–â’ÒFWfVçB’À¢&WV—&VC¢""À¢Æ6V†öÆFW#¢&W66öÆæVGRæ'""À¢Ö†ÆVæwFƒ¢##S2"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæG&gBæFöÖ–åÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$6†fRF’FRÆV—GW&RW67&—F"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ”¶W’’ÒFWfVçB’À¢G—S¢'77v÷&B"À¢Æ6V†öÆFW#¢7FFRæ6öæf–ræ•ö¶W•ö6öæf–wW&VCòt6†fR6Çf(	B&VVæ6†6öÖVçFR&G&ö6"s¢t6öÆR6†fRFRÆV—GW&RW67&—FrÀ¢&WV—&VC¢7FFRæG&gBæVæ&ÆVBbb7FFRæ6öæf–ræ•ö¶W•ö6öæf–wW&VBÀ¢WFö6ö×ÆWFS¢&æWr×77v÷&B"À¢Ö†ÆVæwFƒ¢#S" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â'Æ6V†öÆFW""Â'&WV—&VB%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæ”¶W•ÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$6†fR6öÖVçFRFRÆV—GW&W&Ö—FR6öç7VÇF"ÂÖ2ì:6ò7&–6öçF2â"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$6÷FG,:6ò÷"6—†„Ô"’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæFVfVÇE÷V÷FöÖ"’ÒFWfVçB’À¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#CƒSsb"À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢7FFRæG&gBæFVfVÇE÷V÷FöÖ"À¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ#ã#BÔ"WV—fÆVÒt"â"•Ò¢Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæVæ&ÆVB’ÒFWfVçB’À¢G—S¢&6†V6¶&÷‚ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæG&gBæVæ&ÆVEÕÒ’Âö7&VFUFW‡EdæöFR‚$†&–Æ—F"7&–:|:6òFR6öçF2–ç7F—GV6–öæ—2"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ%&VFRFò6W'f–F÷""’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢'‚Ö6†V6²"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæG&gBæÆÆ÷u÷&—fFUöæWGv÷&²’ÒFWfVçB’À¢G—S¢&6†V6¶&÷‚ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â7FFRæG&gBæÆÆ÷u÷&—fFUöæWGv÷&µÕÒ’Âö7&VFUFW‡EdæöFR‚$ò6W'f–F÷"f–6æ&VFR&—fFFW7F–ç7FÆ:|:6ò"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ%W6RVÒ†÷7FæÖR…EE26öÒ6W'F–f–6Fòl:Æ–FòâVæFW&\:v÷2Æö6—2RFRÖWFFF÷26öçF–çVÒ&Æ÷VVF÷2â"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$æò6W'f–F÷"FRRÖÖ–ÂÂ†&–Æ—FR’FRÆV—GW&RW67&—FRWF÷&—¦R÷2VæFW&\:v÷2FR6:ÖFFW7F–ç7FÆ:|:6òâòVæFW&\:vòFò6WR6VÇVÆ"÷R6ö×WFF÷"ì:6ò7V'7F—GV’òVæFW&\:vòFò6W'f–F÷"FW66öÆâ"’À¢F—'G¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&×WFVB"À¢&öÆS¢'7FGW2 ¢ÒÂ$ÇFW&:|;VW2–æFì:6ò6Çf2â6ÇfRRFW7FR&fÆ–F"W7F6öæf–wW&:|:6òâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ%6Çf"6öæf–wW&:|:6ò"Â‚Â²&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢'7V&Ö—B"À¢fÇVS¢'FW7B"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ%6Çf"RFW7F""Â‚Â²&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢6Æ÷6T6öæf–rÀ¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò¢ÒÂCÂ²&öå7V&Ö—B%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRæ6öæf–ræ6öæf–wW&VB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢2À¢6Æ73¢'æVÂ‚Ö6&B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæ6öæf–ræFöÖ–â’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæ6öæf–ræVæ&ÆVCòt7&–:|:6òFR6öçF2†&–Æ—FFs¢t7&–:|:6òFR6öçF2FW6F—fFr’Â’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&&FvR"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæ6öæf–ræÆ7E÷FW7Eöö³ÓÓ×G'VSòt6öç7VÇFòFöÜ:Öæ–òfÆ–FFs§7FFRæ6öæf–ræÆ7E÷FW7Eöö³ÓÓÖfÇ6SòtfÆ†æ6öç7VÇFs¢t6öæWŒ:6ò–æFì:6òFW7FFr’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FW7BÀ¢F—6&ÆVC¢7FFRæ'W7—ÇÆF—'G—ÇÂ7FFRæ6öæf–ræ•ö¶W•ö6öæf–wW&V@¢ÒÂ%FW7F"6öæWŒ:6ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Â‡7FFRæ6öæf–rçvV&Ö–Å÷W&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&"Â°¢¶W“¢À¢‡&Vc¢7FFRæ6öæf–rçvV&Ö–Å÷W&ÂÀ¢F&vWC¢%ö&Ææ²"À¢&VÃ¢&æö÷VæW"æ÷&VfW'&W""À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’ ¢ÒÂ$'&—"vV&Ö–Â"Â‚Â²&‡&Vb%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$òFW7FR6öç7VÇFòFöÜ:Öæ–ò6öÒ6öæf–wW&:|:6ò6ÇfâW&Ö—7<:6òFR7&–:|:6ò:’6öæf—&ÖF6öÖVçFRVæFòVÖ6—†:’&÷f—6–öæFâ"’Â‡7FFRçFW7E&W7VÇBbb7FFRçFW7E&W7VÇBæö²¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&×WFVB ¢ÒÂµö7&VFUFW‡EdæöFR‚$<;6F–vò&7W÷'FS¢"’Âö7&VFTVÆVÖVçEdæöFR‚&6öFR"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRçFW7E&W7VÇBæ6öFR’Â•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç6†÷tW†—7F–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢BÀ¢6Æ73¢'æVÂ‚Ö6&B"À¢&&–ÖÆ&VÆÆVF'’#¢&W†—7F–ærÖÖ–Æ&÷†W2×F—FÆR ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"Â²–C¢&W†—7F–ærÖÖ–Æ&÷†W2×F—FÆR"ÒÂ%f–æ7VÆ"RÖÖ–Ç2W†—7FVçFW2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%W7\:&–÷2FW7FW66öÆ6öÒVæFW&\:vòVÒ"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæ6öæf–ræFöÖ–â’Â’Âö7&VFUFW‡EdæöFR‚"âòf–æ7VÆ"Âò6—7FVÖfW&–f–66R6—†W†—7FRRW7L:F—fâ"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRç6†÷tW†—7F–æsÖfÇ6R’À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ$fV6†""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$2ÖVç6vVç2R6Væ†GVÂ<:6ò&W6W'fF2â6FW7\:&–ò6öæV7F7V6—†VÒÖWRRÖÖ–Â6öÒ,;7&–6Væ†â"’À¢‚7FFRæ6æF–FFW2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂ$æVæ‡VÒW7\:&–òF—7öì:×fVÂæW7F:v–æâ6öæf—&òRÖÖ–ÂRò6W76òFòW7\:&–ò:W66öÆâ"’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'F&ÆR×w& ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%W7\:&–ò"’Âö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$RÖÖ–Â6F7G&Fò"’Âö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$:|:6ò"•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ6æF–FFW2Â†6æF–FFR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢6æF–FFRçW6W%ö–BÒÂµö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†6æF–FFRææÖR’Â’Âö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†6æF–FFRæFG&W72’Â’Âö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡&V6öæ6–ÆR†6æF–FFR’’À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ%fW&–f–6"Rf–æ7VÆ""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò•Ò’¢Ò’Â#‚’•Ò•Ò•Ò’’À¢‡7FFRæ6æF–FFUF÷FÃã#ÇÇ7FFRæ6æF–FFTöfg6WB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&7F–öç2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†W†—7F–æuvR‡7FFRæ6æF–FFTöfg6WBÓ#’’À¢F—6&ÆVC¢7FFRæ'W7—ÇÇ7FFRæ6æF–FFTöfg6WCÓÓÓ ¢ÒÂ$çFW&–÷""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ%:v–æ"²÷FôF—7Æ•7G&–ær„ÖF‚æfÆö÷"‡7FFRæ6æF–FFTöfg6WBó#’³’Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†W†—7F–æuvR‡7FFRæ6æF–FFTöfg6WB³#’’À¢F—6&ÆVC¢7FFRæ'W7—ÇÇ7FFRæ6æF–FFTöfg6WB³#ã×7FFRæ6æF–FFUF÷FÀ¢ÒÂ%,;7†–Ö"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡7FFRç6†÷tæWr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f÷&Ò"Â°¢¶W“¢RÀ¢6Æ73¢'æVÂ‚Ö6&B"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2†7&VFRÂ²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$æ÷f6—†FRRÖÖ–Â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'‚Öw&–B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%W7\:&–ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçW6W$–B’ÒFWfVçB’À¢&WV—&VC¢""À¢öä6†ævS¢6VÆV7EW6W ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%6VÆV6–öæR"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†f–Æ&ÆUW6W'2Â‡W6W"’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢W6W"æ–BÀ¢fÇVS¢W6W"æ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡W6W"ææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRçW6W$–EÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$æöÖRF6—†"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæÆö6Å'B’ÒFWfVçB’À¢&WV—&VC¢""À¢GFW&ã¢%¶×£Ó•Õ¶×£Ó’åòÕÒ¢"À¢Ö†ÆVæwFƒ¢#cB"À¢Æ6V†öÆFW#¢&æöÖRç6ö'&VæöÖR"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæÆö6Å'EÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRæÆö6Å'GÇÂvæöÖRr’²$"²÷FôF—7Æ•7G&–ær‡7FFRæ6öæf–ræFöÖ–â’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$&Ö¦VæÖVçFò„Ô"’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçV÷F’ÒFWfVçB’À¢G—S¢&çVÖ&W""À¢Ö–ã¢#"À¢Öƒ¢#CƒSsb"À¢&WV—&VC¢" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅFW‡BÀ¢7FFRçV÷FÀ¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$6Væ†–æ–6–Â6W,:vW&FWFöÖF–6ÖVçFRâ;727&–:|:6òÂ6öç7VÇFRÖVÖ;¦æ–6fW¢&VçG&Vv"òW7\:&–òâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ$7&–"6—†"Â‚Â²&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRç6†÷tæWsÖfÇ6R¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²%Ò•Ò¢ÒÂCÂ²&öå7V&Ö—B%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'æVÂ‚Ö6&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$6—†2–ç7F—GV6–öæ—2"’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&&FvR"ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæÖ–Æ&÷†W2æÆVæwF‚’Â•Ò’Â‚7FFRæÖ–Æ&÷†W2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&V×G’×7FFR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$æVæ‡VÖ6—†6F7G&F"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6öæf–wW&Rò6W'f–F÷"&7&–"6—†2÷Rf–æ7VÆ"RÖÖ–Ç2¬:W†—7FVçFW2F÷2W7\:&–÷2FW7FW66öÆâ"•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢'F&ÆR×w& ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F&ÆR"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'F†VB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'G""ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%W7\:&–òRVæFW&\:vò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ%6—GV:|:6ò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$&Ö¦VæÖVçFò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'F‚"ÂçVÆÂÂ$:|;VW2"¢Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F&öG’"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæÖ–Æ&÷†W2Â†&÷‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'G""Â²¶W“¢&÷‚æ–BÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†&÷‚çW6W%öæÖR’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&'""’À¢ö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†&÷‚æFG&W72’Â’À¢†&÷‚æ÷&–v–ãÓÓÒvW†—7F–ærr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ$6—†W†—7FVçFRf–æ7VÆF"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&&FvR"ÒÂ÷FôF—7Æ•7G&–ær‡7FGW2†&÷‚ç7FGW2’’Â’Â†&÷‚æW'&÷%ö6öFR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6ÖÆÂ"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær†—77VR†&÷‚’’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡W6vR†&÷‚çV÷F÷W6VEö'—FW2’’²"FR"²÷FôF—7Æ•7G&–ær‡W6vR†&÷‚çV÷FöÖ"£CƒSsb’’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'FB"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ°¢†&÷‚æ7&VFVçF–Ç5öf–Æ&ÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†7&VFVçF–Ç2†&÷‚’’À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ%fW"6W76ò–æ–6–Â"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…²vf–ÆVBrÂwVæ6W'F–ârÂw&WG'’uÒæ–æ6ÇVFW2†&÷‚æ¦ö%÷7FGW2’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†7F–öâ†&÷‚Âw&WG'’r’’À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ%FVçF"æ÷fÖVçFR"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†7F–öâ†&÷‚Âw&W—"r’’À¢F—6&ÆVC¢7FFRæ'W7—ÇÆ&÷‚æ¦ö%÷7FGW3ÓÓÒw&ö6W76–ærp¢ÒÂ%&W&"l:Öæ7VÆòÆö6Â"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†7F–öâ†&÷‚Âw7–æ2r’’À¢F—6&ÆVC¢7FFRæ'W7¢ÒÂ$6öç7VÇF"6W'f–F÷""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò¢Ò•Ò¢Ò’¢Ò’Â#‚’•Ò•Ò•Ò’•Ò’À¢‡7FFRæ7&VFVçF–Ç2¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢bÀ¢6Æ73¢&ÖöFÂÖ&6¶G&÷"À¢öä6Æ–6³¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ‡7FFRæ7&VFVçF–Ç3ÖçVÆÂ’Â²'6VÆb%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂÖ–Æ&÷‚Ö7&VFVçF–Ç2"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&Ö–Æ&÷‚Ö7&VFVçF–Ç2×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&Ö–Æ&÷‚Ö7&VFVçF–Ç2×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ$6W76ò–æ–6–ÂòRÖÖ–Â"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢öä6Æ–6³¢FWfVçBÓâ‡7FFRæ7&VFVçF–Ç3ÖçVÆÂ¢ÒÂ$fV6†""Â‚Â²&öä6Æ–6²%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$6÷–R6Væ†v÷&âVÆ:’W†–&–FVÖ;¦æ–6fW¢RFWfW,:6W"G&ö6Fæò&–ÖV—&ò6W76òâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vò"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢fÇVS¢7FFRæ7&VFVçF–Ç2æFG&W72À¢&VFöæÇ“¢""À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²'fÇVR%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%6Væ†–æ–6–Â"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢fÇVS¢7FFRæ7&VFVçF–Ç2ç77v÷&BÀ¢&VFöæÇ“¢""À¢WFö6ö×ÆWFS¢&öfb"À¢7VÆÆ6†V6³¢&fÇ6R ¢ÒÂçVÆÂÂ‚Â²'fÇVR%Ò•Ò’À¢‡7FFRæ7&VFVçF–Ç2çvV&Ö–Å÷W&Â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢‡&Vc¢7FFRæ7&VFVçF–Ç2çvV&Ö–Å÷W&ÂÀ¢F&vWC¢%ö&Ææ²"À¢&VÃ¢&æö÷VæW"æ÷&VfW'&W" ¢ÒÂ$'&—"vV&Ö–Â"Â‚Â²&‡&Vb%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò•Ò•ÒÂ‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢Ð§ÒÆVF—C¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²FôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂ7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂ&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Â7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2ÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢6Æ73¢&FÖ–âÖ6öç6öÆR"À¢&&–ÖÆ&VÂ#¢$VF—F÷&–F–ç7F—GVœ:|:6ò ¢ÒÂ²‡7FFRæW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRæW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â‡7FFRææ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡7FFRææ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢F—6&ÆVC¢7FFRæ'W7’À¢6Æ73¢'÷'FÂÖf–VÆG6WB ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&FÖ–âÖ†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""ÂçVÆÂÂ$†—7L;7&–6òFR÷W&:|;VW2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$–FVçF–f—VRVVÒÇFW&÷RVÒ&Vv—7G&òR6ö×æ†R2÷W&:|;VW2&VÆ6–öæF2â"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢Æö@¢ÒÂ$GVÆ—¦""Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢öä6Æ–6³¢F÷væÆö@¢ÒÂ$W‡÷'F"VF—F÷&–"Â‚Â²&öä6Æ–6²%Ò•Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"Â°¢6Æ73¢'æVÂFÖ–âÖ6&BFÖ–âÖf–ÇFW"×æVÂ"À¢÷Vã¢7FFRæf–ÇFW'4÷VâÀ¢öåFövvÆS¢FWfVçBÓâ‡7FFRæf–ÇFW'4÷VãÒFWfVçBçF&vWBæ÷Vâ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$f–ÇG&÷2FR6öç7VÇF"’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&FÖ–âÖf–ÇFW""À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6V&6‚Â²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$÷W&:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ7F–öâ’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF22÷W&:|;VW2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ6†ö–6W2æ7F–öç2Â‡b’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢bÀ¢fÇVS¢`¢ÒÂ÷FôF—7Æ•7G&–ær†VçF—G”æÖR‡bç7Æ—B‚râr•³Ò’’²"+r"²÷FôF—7Æ•7G&–ær†7F–öäæÖR‡b’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ7F–öåÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%F—òFR&Vv—7G&ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæVçF—G’’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF÷2÷2&Vv—7G&÷2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ6†ö–6W2æVçF—F–W2Â‡b’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢bÀ¢fÇVS¢`¢ÒÂ÷FôF—7Æ•7G&–ær†VçF—G”æÖR‡b’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæVçF—G•ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$WF÷""’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæ7F÷"’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ%FöF÷2÷2WF÷&W2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRæ6†ö–6W2æ7F÷'2Â‡b’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢bæ–BÀ¢fÇVS¢bæ–@¢ÒÂ÷FôF—7Æ•7G&–ær‡bææÖR’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ7FFRæ7F÷%ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$FW6FR"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFWF–ÖRÖÆö6Â"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç6–æ6R’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRç6–æ6UÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$L:’"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&FFWF–ÖRÖÆö6Â"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRçVçF–Â’ÒFWfVçB¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRçVçF–ÅÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%&VfW,:¦æ6–F÷W&:|:6ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRç&VfW&Væ6R’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#cB"À¢Æ6V†öÆFW#¢$<;6F–vòFö6÷',:¦æ6– ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRç&VfW&Væ6UÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$–FVçF–f–6F÷"Fò&Vv—7G&ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡7FFRæVçF—G”–B’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#cB"À¢Æ6V†öÆFW#¢$<;6F–vòFò6F7G&ò÷RFö7VÖVçFò ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ7FFRæVçF—G”–EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2FÖ–âÖf–ÇFW"×7V&Ö—B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢6ÆV ¢ÒÂ$Æ–×"f–ÇG&÷2"Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â²6Æ73¢&'Fâ'Fâ×&–Ö'’"ÒÂ$Æ–6"f–ÇG&÷2"•Ò¢ÒÂCÂ²&öå7V&Ö—B%Ò•ÒÂCÂ²&÷Vâ"Â&öåFövvÆR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â²6Æ73¢'æVÂFÖ–âÖ6&B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&FÖ–âÖ†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡7FFRçF÷FÂ’²""²÷FôF—7Æ•7G&–ær‡7FFRçF÷FÃÓÓÓòv÷W&:|:6òVæ6öçG&Fs¢v÷W&:|;VW2Væ6öçG&F2r’Â’Â‡7FFRæ'W7’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢&öÆS¢'7FGW2 ¢ÒÂ$6öç7VÇFæFþ(
b"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&×WFVB"ÒÂ$†÷,:&–÷2Æö6—2"•Ò’À¢‚7FFRç&÷w2æÆVæwF‚bb7FFRæ'W7’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&FÖ–âÖV×G’ ¢ÒÂ$æVæ‡VÖ÷W&:|:6ò6÷'&W7öæFR÷2f–ÇG&÷26VÆV6–öæF÷2â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&öÂ"Â²6Æ73¢&FÖ–âÖWfVçBÖÆ—7B"ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡7FFRç&÷w2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢—FVÒæ–BÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&FÖ–âÖWfVçBÖÖ–â"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&FÖ–âÖ&FvR—2Ö–æfò"ÒÂ÷FôF—7Æ•7G&–ær†7F–öäæÖR†—FVÒæ7F–öâ’’Â’Âö7&VFTVÆVÖVçEdæöFR‚'F–ÖR"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR†—FVÒæ7&VFVEöB’’Â’Â†—FVÒç66÷SÓÓÒv–ç7F—GWF–öâr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢6Æ73¢&FÖ–â×6W'f–6R ¢ÒÂ$–ç7FÆ:|:6ò"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†VçF—G”æÖR†—FVÒæVçF—G•÷G—R’’²"+r"²÷FôF—7Æ•7G&–ær†—FVÒæ7F÷%öæÖR’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ7F–öâ’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&6öFR"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæVçF—G•ö–B’Â¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡&VÆFVB†—FVÒÂw&V6÷&Br’¢ÒÂ$†—7L;7&–6òFò&Vv—7G&ò"Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢&&–ÖW‡æFVB#¢7FFRç6VÆV7FVCÓÓÖ—FVÒÀ¢öä6Æ–6³¢FWfVçBÓâ‡7FFRç6VÆV7FVC×7FFRç6VÆV7FVCÓÓÖ—FVÓöçVÆÃ¦—FVÒ¢ÒÂ$FWFÆ†W2"Â‚Â²&&–ÖW‡æFVB"Â&öä6Æ–6²%Ò•Ò’Â‡7FFRç6VÆV7FVCÓÓÖ—FVÒ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&FÖ–âÖWfVçBÖFWF–Â ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&FÂ"Â²6Æ73¢&FÖ–âÖFWF–ÂÖw&–B"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&GB"ÂçVÆÂÂ$WF÷""’Âö7&VFTVÆVÖVçEdæöFR‚&FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ7F÷%öæÖR’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&GB"ÂçVÆÂÂ$VæFW&\:vòFR÷&–vVÒ"’Âö7&VFTVÆVÖVçEdæöFR‚&FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ—ÇÂtì:6ò&Vv—7G&Fòr’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&GB"ÂçVÆÂÂ%&VfW,:¦æ6–"’Âö7&VFTVÆVÖVçEdæöFR‚&FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒç&WVW7Eö–GÇÂtì:6ò&Vv—7G&Fr’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&GB"ÂçVÆÂÂ$–FVçF–f–6F÷"FVF—F÷&–"’Âö7&VFTVÆVÖVçEdæöFR‚&FB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ–B’Â•Ò¢Ò’À¢†—FVÒç&WVW7Eö–B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&7F–öç2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ‡&VÆFVB†—FVÒÂw&WVW7Br’¢ÒÂ$÷W&:|;VW26öÒW7F&VfW,:¦æ6–"Â‚Â²&öä6Æ–6²%Ò’Â‚õå¶ÖcÓ•×³#GÒBòçFW7B†—FVÒç&WVW7Eö–B’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢öä6Æ–6³¢FWfVçBÓâ†–çfW7F–vFR†—FVÒ’¢ÒÂ$–çfW7F–v"F–vì;77F–6ò"Â‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†6†ævW2†—FVÒ’æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&FÖ–âÖ6†ævW2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒB"ÂçVÆÂÂ$ÇFW&:|;VW2&Vv—7G&F2"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B†6†ævW2†—FVÒ’Â†6†ævR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'F–6ÆR"Â²¶W“¢6†ævRæf–VÆBÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†6†ævRæf–VÆB’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$çFW2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡fÇVR†6†ævRæ&Vf÷&R’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$FWö—2"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡fÇVR†6†ævRægFW"’’Â•Ò•Ò’¢Ò’Â#‚’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"Â²6Æ73¢&FÖ–âÖ†VÇ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$FWFÆ†W26ö×ÆWF÷2"’Âö7&VFTVÆVÖVçEdæöFR‚'&R"Â²6Æ73¢&F–væ÷7F–2×&R"ÒÂ÷FôF—7Æ•7G&–ær‡&WGG’†—FVÒæFWF–Ç2’’Â•Ò¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢'v–æF–öâ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ%:v–æ"²÷FôF—7Æ•7G&–ær‡7FFRçvR’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRçvSÃÓÀ¢öä6Æ–6³¢FWfVçBÓâ‡vR‚Ó’¢ÒÂ$çFW&–÷""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢7FFRçvR£3ã×7FFRçF÷FÂÀ¢öä6Æ–6³¢FWfVçBÓâ‡vRƒ’¢ÒÂ%,;7†–Ö"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò•Ò¢Ò•ÒÂ‚Â²&F—6&ÆVB%Ò•Ò’¢Ð§ÒÆVÖ–Ã¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²FôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂ7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂ7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2Âv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2Â&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂæ÷&ÖÆ—¦T6Æ73¢öæ÷&ÖÆ—¦T6Æ72ÂdÖöFVÅ6VÆV7C¢÷dÖöFVÅ6VÆV7BÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢6Æ73¢&VÖ–ÂÖ6Æ–VçB"À¢&&–ÖÆ&VÂ#¢$RÖÖ–Â"À¢&&–Ö'W7’#¢2æ'W7¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&VÖ–Â×vRÖ†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂ²‡2æ66÷VçCòæf–Æ&ÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&×WFVB ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ66÷VçBæFG&W72’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ°¢‡2æ66÷VçCòç&W—%öf–Æ&ÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢&W—"À¢F—6&ÆVC¢2æ'W7¢ÒÂ%&W&"6öæWŒ:6ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡&÷2æFÖ–â¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢6†÷u6WGF–æw2À¢F—6&ÆVC¢2æ'W7¢ÒÂ$6öæf–wW&:|:6ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ66÷VçCòæ6öææV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ·2æ6öææV7F–öäFG&W73×2æ66÷VçBæFG&W73·2ç77v÷&CÒrs·2ç6†÷t6öææV7F–öã×G'VWÒÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$6öæV7F"÷WG&6—†"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ66÷VçCòæ6öææV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢2À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢&Vg&W6‚À¢F—6&ÆVC¢2æ'W7¢ÒÂ$GVÆ—¦""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ66÷VçCòæ6öææV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢BÀ¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†&Vv–â‚’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$W67&WfW""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò•Ò’À¢‡2æW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ææ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡2ææ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æÆöF–ær¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&VÖ–ÂÖV×G’"À¢&öÆS¢'7FGW2 ¢ÒÂ$6'&VvæFò7V6—†FRRÖÖ–Î(
b"’¢¢‡2æ66÷VçCòæ6å÷&V6öæ6–ÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢2À¢6Æ73¢'æVÂVÖ–Â×7F'B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VÖ–ÂÖV×G’×7–Ö&öÂ"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂ$"’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%fö<:¢¬:FVÒRÖÖ–ÂFW66öÆò"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚%fÖ÷2fW&–f–6"6R"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2æ66÷VçBæ6æF–FFUöFG&W72’Â’Âö7&VFUFW‡EdæöFR‚"÷77V’VÖ6—†F—f&6W76"7V2ÖVç6vVç2V’â"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢&V6öæ6–ÆRÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òufW&–f–6æFþ(
bs¢ufW&–f–6"ÖWRRÖÖ–Âr’Â’Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$FWö—2FfW&–f–6:|:6òÂW6R6Væ†GVÂFW766—†&6öæV7F"â"¢Ò’¢¢‚2æ66÷VçCòæf–Æ&ÆR¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢BÀ¢6Æ73¢'æVÂVÖ–Â×7F'B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VÖ–ÂÖV×G’×7–Ö&öÂ"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂ$"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%7V6—†–ç7F—GV6–öæÂ–æFì:6òW7L:F—7öì:×fVÂ"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6öÆ–6—FR:FÖ–æ—7G&:|:6òFW66öÆ7&–:|:6ò÷RF—f:|:6òFò6WRVæFW&\:vòFRRÖÖ–Ââ"•Ò’¢¢‡2æ66÷VçBæ6åöWFõö6öææV7B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢RÀ¢6Æ73¢'æVÂVÖ–Â×7F'B ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VÖ–ÂÖV×G’×7–Ö&öÂ"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂ$"’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òu&W&æFò6WRRÖÖ–Âs¢t6öæ6ÇV—"6öæWŒ:6òFòRÖÖ–Âr’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$26öæf–wW&:|;VW2F7V6—†¬:f÷&Ò&VVæ6†–F2âW7FÖ÷2fW&–f–6æFòò&V6V&–ÖVçFòRòVçf–ò&Æ–&W&"7V2ÖVç6vVç2â"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢&Vg&W6‚À¢F—6&ÆVC¢2æ'W7¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òufÆ–FæFò6öæWŒ:6þ(
bs¢uFVçF"æ÷fÖVçFRr’Â’Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò¢Ò’¢¢‚2æ66÷VçBæ6öææV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f÷&Ò"Â°¢¶W“¢bÀ¢6Æ73¢'æVÂVÖ–Â×7F'B"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2†6öææV7BÂ²'&WfVçB%Ò¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VÖ–ÂÖV×G’×7–Ö&öÂ"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂ$"’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2æ66÷VçBæ6öææV7F–öåöW'&÷#òt6÷'&–v—"6öæWŒ:6òFòRÖÖ–Âs¢t6öæV7FR7V6—†r’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2æ66÷VçBæ6öææV7F–öåöW'&÷#òt–æf÷&ÖR6Væ†GVÂF6—†â—76òGVÆ—¦6öæWŒ:6òÂ6VÒv"ÖVç6vVç2÷RÇFW&"6Væ†æò6W'f–F÷"âs¢t–æf÷&ÖRòVæFW&\:vòF6—†R6Væ†GVÂFòRÖÖ–Ââ6Væ†öFR6W"F–fW&VçFRFW6F&VçG&"æò6—7FVÖW66öÆ"âr’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòFRRÖÖ–Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6öææV7F–öäFG&W72’ÒFWfVçB’À¢G—S¢&VÖ–Â"À¢–çWFÖöFS¢&VÖ–Â"À¢WFö6ö×ÆWFS¢'W6W&æÖR"À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢##SB"À¢Æ6V†öÆFW#¢2æ66÷VçBæFG&W77ÇÂvæöÖTW66öÆæVGRæ'"p¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â'Æ6V†öÆFW"%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6öææV7F–öäFG&W75ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%6Væ†F6—†"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç77v÷&B’ÒFWfVçB’À¢G—S¢'77v÷&B"À¢WFö6ö×ÆWFS¢&7W'&VçB×77v÷&B"À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢#S" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2ç77v÷&EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢F—6&ÆVC¢2æ'W7’À¢G—S¢'7V&Ö—B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òufÆ–FæFò&V6V&–ÖVçFòRVçf–þ(
bs¢t6öæV7F"RÖÖ–Âr’Â’Â²&F—6&ÆVB%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$Væ2VÖ6—†¬:F—fæòFöÜ:Öæ–òF–ç7F—GVœ:|:6ò6W,:6V—Fâ6öæWŒ:6ò:’fÆ–FF&&V6V&–ÖVçFòRVçf–ó²æVæ‡VÖÖVç6vVÒ:’Vçf–FGW&çFRòFW7FRâ"¢ÒÂCÂ²&öå7V&Ö—B%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ66÷VçCòæ6öææV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢rÀ¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&VÖ–Â×v÷&·76R"Â²vVÖ–Â×&VF–ærs§2ç6VÆV7FVGÕÒ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&æb"Â°¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&VÖ–ÂÖföÆFW'2"Â²v—2Ö÷Vâs§2ç6†÷tföÆFW'7ÕÒ’À¢&&–ÖÆ&VÂ#¢%7F2FRRÖÖ–Â ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–ÂÖföÆFW"Ö†VF–ær"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ%7V27F2"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâVÖ–ÂÖföÆFW'2Ö6Æ÷6R"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷tföÆFW'3ÖfÇ6R’À¢&&–ÖÆ&VÂ#¢$fV6†"7F2 ¢ÒÂ,9r"Â‚Â²&öä6Æ–6²%Ò•Ò’À¢…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æföÆFW'2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢—FVÒæ–BÀ¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&VÖ–ÂÖföÆFW""Â¶7F—fS§2æföÆFW#ÓÓÖ—FVÒæ–GÕÒ’À¢&&–Ö7W'&VçB#¢2æföÆFW#ÓÓÖ—FVÒæ–CòwvRs§VæFVf–æVBÀ¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡6VÆV7DföÆFW"†—FVÒæ–B’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ²…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7fr"Â°¢f–Wt&÷ƒ¢##B#B"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²C¢$Ó2vƒvÃ"&ƒ—cƒ7¢Ó2ucFƒvÃ"2"Ò•Ò’’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†föÆFW$æÖR†—FVÒ’’Â’Â†—FVÒçVç&VB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖ6÷VçB"À¢&&–ÖÆ&VÂ#¢—FVÒçVç&VB²rì:6òÆ–F2p¢ÒÂ÷FôF—7Æ•7G&–ær†—FVÒçVç&VB’Â’Â²&&–ÖÆ&VÂ%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•ÒÂÂ²&&–Ö7W'&VçB"Â&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢Ò’Â#‚’’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖföÆFW"VÖ–ÂÖ7&VFRÖföÆFW""À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷tæWtföÆFW#Ò2ç6†÷tæWtföÆFW"’À¢F—6&ÆVC¢2æ'W7¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²&&–Ö†–FFVâ#¢'G'VR"ÒÂ"²"’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ$æ÷f7F"•ÒÂ‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢‡2ç6†÷tæWtföÆFW"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&f÷&Ò"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖæWrÖföÆFW""À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2†æWtföÆFW"Â²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$æöÖRF7F"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ææWtföÆFW"’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢#ƒ"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2ææWtföÆFW%ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢2æ'W7¢ÒÂ$7&–"7F"Â‚Â²&F—6&ÆVB%Ò•ÒÂCÂ²&öå7V&Ö—B%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–ÂÖ6öææV7F–öâ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&VÖ–ÂÖ6öææV7FVB"ÒÂ$6—†6öæV7FF"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–Â×FW‡BÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ·2æ6öææV7F–öäFG&W73×2æ66÷VçBæFG&W73·2ç77v÷&CÒrs·2ç6†÷t6öææV7F–öã×G'VWÒÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$6öæV7F"÷WG&6—†"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–Â×FW‡BÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æF—66öææV7D6öæf—&Ó×G'VR’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$FW66öæV7F""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò¢ÒÂ"’Âö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&VÖ–ÂÖÆ—7B"À¢&&–ÖÆ&VÂ#¢$ÖVç6vVç2 ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&VÖ–ÂÖÆ—7BÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâVÖ–ÂÖföÆFW"×FövvÆR"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷tföÆFW'3Ò2ç6†÷tföÆFW'2’À¢&&–ÖW‡æFVB#¢2ç6†÷tföÆFW'2À¢&&–ÖÆ&VÂ#¢$'&—"7F2 ¢ÒÂ.)‹"Â‚Â²&öä6Æ–6²"Â&&–ÖW‡æFVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†föÆFW"‚“öföÆFW$æÖR†föÆFW"‚’“¢tÖVç6vVç2r’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†föÆFW"‚“òçVç&VGÇÃ’²"ì:6òÆ–F2"Â•Ò’Â†föÆFW"‚“òç&öÆSÓÓÒv7W7FöÒr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢ÖævTföÆFW"À¢&&–ÖÆ&VÂ#¢$vW&Væ6–"7F"À¢F—6&ÆVC¢2æ'W7¢ÒÂ.(ºò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&VÖ–Â×6V&6‚"À¢&öÆS¢'6V&6‚"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6V&6‚Â²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â°¢6Æ73¢'7"ÖöæÇ’"À¢f÷#¢&VÖ–Â×6V&6‚ ¢ÒÂ$'W66"ÖVç6vVç2"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢–C¢&VÖ–Â×6V&6‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç’ÒFWfVçB’À¢G—S¢'6V&6‚"À¢Æ6V†öÆFW#¢$'W66"æW7F7F"À¢Ö†ÆVæwFƒ¢## ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2çÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢&&–ÖÆ&VÂ#¢$'W66"ÖVç6vVç2"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢2æ'W7¢ÒÂ²…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7fr"Â°¢f–Wt&÷ƒ¢##B#B"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&6—&6ÆR"Â°¢7ƒ¢#"À¢7“¢#"À¢#¢#b ¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚'F‚"Â²C¢&ÓRRRR"Ò•Ò’•ÒÂ‚Â²&F—6&ÆVB%Ò•ÒÂCÂ²&öå7V&Ö—B%Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–ÂÖÖW76vRÖÆ—7B"ÒÂ²‚2æ—FV×2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖV×G’ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒB"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2æ7F—fUVW'“òtæVæ‡VÖÖVç6vVÒVæ6öçG&Fs¢uGVFòVÒF–÷"V’r’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2æ7F—fUVW'“òuFVçFR÷WG&òæöÖR÷R77VçFòâs¢t2ÖVç6vVç2FW7F7F&V6W,:6òV’âr’Â•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ—FV×2Â†ÖW76vR’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢ÖW76vRçV–BÀ¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&VÖ–ÂÖÖW76vR"Â·Vç&VC¢ÖW76vRç6VVâÇ6VÆV7FVC§2ç6VÆV7FVCòçV–CÓÓÖÖW76vRçV–GÕÒ’À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†÷Vâ†ÖW76vR’’À¢F—6&ÆVC¢2æ'W7’À¢&&–×&W76VB#¢2ç6VÆV7FVCòçV–CÓÓÖÖW76vRçV–@¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&VÖ–ÂÖÖW76vR×F÷"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†ÖW76vRæg&ö×ÇÂr…6VÒ&VÖWFVçFR’r’Â’Â‚ÖW76vRç6VVâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢6Æ73¢&VÖ–Â×Vç&VBÖF÷B"À¢&&–ÖÆ&VÂ#¢$ì:6òÆ–F ¢Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â†ÖW76vRæfÆvvVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢&&–ÖÆ&VÂ#¢$6öÒW7G&VÆ ¢ÒÂ.)ˆR"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢&VÖ–ÂÖÖW76vR×7V&¦V7B"ÒÂ÷FôF—7Æ•7G&–ær†ÖW76vRç7V&¦V7GÇÂr…6VÒ77VçFò’r’Â’Âö7&VFTVÆVÖVçEdæöFR‚'F–ÖR"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR†ÖW76vRæFFR’’Â•ÒÂÂ²&öä6Æ–6²"Â&F—6&ÆVB"Â&&–×&W76VB%Ò’¢Ò’Â#‚’•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&VÖ–Â×v–æF–öâ"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢&Wf–÷W5vRÀ¢F—6&ÆVC¢2æ'W7—ÇÂ2æ7W'6÷'2æÆVæwF€¢ÒÂ$çFW&–÷&W2"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ%:v–æ"²÷FôF—7Æ•7G&–ær‡2æ7W'6÷'2æÆVæwF‚³’Â’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢æW‡EvRÀ¢F—6&ÆVC¢2æ'W7—ÇÇ2ææW‡CÓÓÖçVÆÀ¢ÒÂ%,;7†–Ö2"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'F–6ÆR"Â°¢6Æ73¢&VÖ–Â×&VFW""À¢&&–ÖÆ&VÂ#¢$ÆV—GW&FÖVç6vVÒ ¢ÒÂ²‚2ç6VÆV7FVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖV×G’VÖ–Â×&VFW"ÖV×G’ ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&VÖ–ÂÖV×G’×7–Ö&öÂ"À¢&&–Ö†–FFVâ#¢'G'VR ¢ÒÂ$"’À¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%6WRRÖÖ–ÂÂV’æW66öÆ"’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%6VÆV6–öæRVÖÖVç6vVÒ&ÆW"÷RW67&WfVÖæ÷fâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†&Vv–â‚’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$W67&WfW"ÖVç6vVÒ"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò¢Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–Â×&VFW"×FööÆ&""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’VÖ–ÂÖ&6²"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6VÆV7FVCÖçVÆÂ’À¢F—6&ÆVC¢2æ'W7¢ÒÂ.(iÖVç6vVç2"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢fÆrÀ¢F—6&ÆVC¢2æ'W7’À¢&&–ÖÆ&VÂ#¢2ç6VÆV7FVBæfÆvvVCòu&VÖ÷fW"W7G&VÆs¢tÖ&6"6öÒW7G&VÆrÀ¢&&–×&W76VB#¢2ç6VÆV7FVBæfÆvvV@¢ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBæfÆvvVCò~)ˆRs¢~)ˆbr’Â’Â²&öä6Æ–6²"Â&F—6&ÆVB"Â&&–ÖÆ&VÂ"Â&&–×&W76VB%Ò’À¢†föÆFW"‚“òç&öÆRÓÒv&6†—fRr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fU&öÆR‚v&6†—fRr’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$'V—f""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‚²wG&6‚rÂw7ÒuÒæ–æ6ÇVFW2†föÆFW"‚“òç&öÆWÇÂrr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fU&öÆR‚wG&6‚r’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$Æ—†V—&"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…²wG&6‚rÂw7ÒuÒæ–æ6ÇVFW2†föÆFW"‚“òç&öÆWÇÂrr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fU&öÆR‚v–æ&÷‚r’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ%&W7FW&""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&FWF–Ç2"Â²6Æ73¢&VÖ–ÂÖÖ÷&R"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7VÖÖ'’"ÂçVÆÂÂ$Ö—2:|;VW2"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–ÂÖÖ÷&RÖÖVçR"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢Vç&VBÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$Ö&6"6öÖòì:6òÆ–F"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’À¢†föÆFW"‚“òç&öÆRÓÒw7Òr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†Ö÷fU&öÆR‚w7Òr’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$Ö÷fW"&7Ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…²wG&6‚rÂw7ÒuÒæ–æ6ÇVFW2†föÆFW"‚“òç&öÆWÇÂrr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æFVÆWFT6öæf—&Ó×G'VR’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$W†6ÇV—"FVf–æ—F—fÖVçFR"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$Ö÷fW"&"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æÖ÷fUFò’ÒFWfVçB’À¢F—6&ÆVC¢2æ'W7’À¢öä6†ævS¢FWfVçBÓâ†Ö÷fR‡2æÖ÷fUFò’¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢""ÒÂ$W66öÆ†VÖ7F"’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æföÆFW'2æf–ÇFW"‡ƒÓç‚æ–BÓ×2æföÆFW"’Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&÷F–öâ"Â°¢¶W“¢—FVÒæ–BÀ¢fÇVS¢—FVÒæ–@¢ÒÂ÷FôF—7Æ•7G&–ær†föÆFW$æÖR†—FVÒ’’Â’Â²'fÇVR%Ò’¢Ò’Â#‚’•ÒÂCÂ²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB"Â&öä6†ævR%Ò’Âµµ÷dÖöFVÅ6VÆV7BÂ2æÖ÷fUFõÕÒ•Ò¢Ò•Ò¢Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–Â×&VFW"Ö&öG’"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&VÖ–ÂÖÖW76vRÖ†VF–ær"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"Â°¢–C¢&VÖ–Â×&VF–ær×F—FÆR"À¢F&–æFWƒ¢"Ó ¢ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBç7V&¦V7GÇÂr…6VÒ77VçFò’r’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$FS¢"’Âö7&VFUFW‡EdæöFR‚""²÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBæg&öÒ’Â•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ%&¢"’Âö7&VFUFW‡EdæöFR‚""²÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBçFò’Â•Ò’À¢‡2ç6VÆV7FVBæ62¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$63¢"’Âö7&VFUFW‡EdæöFR‚""²÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBæ62’Â•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç6VÆV7FVBæ&62¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$66ó¢"’Âö7&VFUFW‡EdæöFR‚""²÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBæ&62’Â•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'F–ÖR"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†FFR‡2ç6VÆV7FVBæFFRÇG'VR’’Â¢Ò’À¢‡2æFVÆWFT6öæf—&Ò¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖ6öæf—&Ò"À¢&öÆS¢&ÆW'B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$W†6ÇV—"W7FÖVç6vVÒFVf–æ—F—fÖVçFSò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$VÆì:6òöFW,:6W"&V7WW&F÷"W7FÆ–6:|:6òâ"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æFVÆWFT6öæf—&ÓÖfÇ6R’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'FâÖFævW""À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢&VÖ÷fRÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$W†6ÇV—"FVf–æ—F—fÖVçFR"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–ÂÖÖW76vR×FW‡B"ÒÂ÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBçFW‡GÇÂtW7FÖVç6vVÒì:6ò6öçL:–ÒFW‡Fò&W†–&œ:|:6òâr’Â’À¢‡2ç6VÆV7FVBæGF6†ÖVçG3òæÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖGF6†ÖVçG2"À¢&&–ÖÆ&VÂ#¢$æW†÷2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒB"ÂçVÆÂÂ$æW†÷2+r"²÷FôF—7Æ•7G&–ær‡2ç6VÆV7FVBæGF6†ÖVçG2æÆVæwF‚’Â’Â…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2ç6VÆV7FVBæGF6†ÖVçG2Â†GF6†ÖVçB’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢GF6†ÖVçBç'BÀ¢6Æ73¢&VÖ–ÂÖGF6†ÖVçB"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†F÷væÆöB†GF6†ÖVçB’’À¢F—6&ÆVC¢2æ'W7¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†GF6†ÖVçBæf–ÆVæÖWÇÂtæW†òr’Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡6—¦R†GF6†ÖVçBç6—¦R’’²"+r&—†""Â•ÒÂ‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢Ò’Â#‚’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&VÖ–Â×&WÇ’Ö7F–öç2"ÒÂ²†föÆFW"‚“òç&öÆSÓÓÒvG&gG2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢VF—DG&gBÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$6öçF–çV"&67Væ†ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†&Vv–â‚w&WÇ’r’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ%&W7öæFW""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†&Vv–â‚vÆÂr’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ%&W7öæFW"FöF÷2"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢f÷'v&BÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$Væ6Ö–æ†""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•ÒÂcB’•Ò¢Ò•ÒÂcB’•Ò•ÒÂ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æföÆFW$VF—B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢‚À¢6Æ73¢&ÖöFÂÖ&6¶G&÷ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂVÖ–Â×6ÖÆÂÖF–Æör"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&VÖ–ÂÖföÆFW"ÖVF—B×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&VÖ–ÂÖföÆFW"ÖVF—B×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ$vW&Væ6–"7F"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢öä6Æ–6³¢FWfVçBÓâ‡2æföÆFW$VF—CÖfÇ6R’À¢&&–ÖÆ&VÂ#¢$fV6†"7F"À¢F—6&ÆVC¢2æ'W7¢ÒÂ,9r"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&ÖöFÂÖf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡&VæÖTföÆFW"Â²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ²‡2æW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$æöÖRF7F"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æföÆFW%&VæÖR’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢#ƒ"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æföÆFW%&VæÖUÕÒ•Ò’Â‡2æföÆFW$FVÆWFT6öæf—&Ò¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖ6öæf—&Ò"À¢&öÆS¢&ÆW'B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$W†6ÇV—"W7F7Fò"’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$Væ27F2f¦–2öFVÒ6W"W†6Ç\:ÖF2â7V2ÖVç6vVç2ì:6ò6W,:6òvF2÷"W7F:|:6òâ"’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æföÆFW$FVÆWFT6öæf—&ÓÖfÇ6R’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$ÖçFW"7F"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'FâÖFævW""À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FVÆWFTföÆFW"À¢F—6&ÆVC¢2æ'W7¢ÒÂ$W†6ÇV—"7Ff¦–"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò•Ò’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢"À¢6Æ73¢&VÖ–Â×FW‡BÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æföÆFW$FVÆWFT6öæf—&Ó×G'VR’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$W†6ÇV—"7F(
b"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æföÆFW$VF—CÖfÇ6R’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢2æ'W7¢ÒÂ%&VæöÖV"7F"Â‚Â²&F—6&ÆVB%Ò•Ò•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æF—66öææV7D6öæf—&Ò¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢’À¢6Æ73¢&ÖöFÂÖ&6¶G&÷"À¢öä6Æ–6³¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ‡2æF—66öææV7D6öæf—&ÓÖfÇ6R’Â²'6VÆb%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂVÖ–Â×6ÖÆÂÖF–Æör"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&VÖ–ÂÖF—66öææV7B×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&VÖ–ÂÖF—66öææV7B×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ$FW66öæV7F"RÖÖ–Ãò"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢öä6Æ–6³¢FWfVçBÓâ‡2æF—66öææV7D6öæf—&ÓÖfÇ6R’À¢&&–ÖÆ&VÂ#¢$fV6†" ¢ÒÂ,9r"Â‚Â²&öä6Æ–6²%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ²‡2æW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%7V2ÖVç6vVç26W,:6òÖçF–F2â&6W76"W7F6—†æ÷fÖVçFRÂ6W,:æV6W7<:&–ò–æf÷&Ö"6Væ†FòRÖÖ–Ââ"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æF—66öææV7D6öæf—&ÓÖfÇ6R¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢F—66öææV7BÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$FW66öæV7F""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò•Ò•ÒÂ‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç6†÷t6öææV7F–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÖöFÂÖ&6¶G&÷"À¢öä6Æ–6³¢÷v—F„ÖöF–f–W'2‚FWfVçBÓâ‡2ç6†÷t6öææV7F–öãÖfÇ6R’Â²'6VÆb%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂVÖ–Â×6ÖÆÂÖF–Æör"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&VÖ–ÂÖ6öææV7B×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$4ôåDD”å5D•ETœ8|84ò"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&VÖ–ÂÖ6öææV7B×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ$6öæV7F"6—†FRRÖÖ–Â"•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷t6öææV7F–öãÖfÇ6R’À¢&&–ÖÆ&VÂ#¢$fV6†""À¢F—6&ÆVC¢2æ'W7¢ÒÂ,9r"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&ÖöFÂÖf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2†6öææV7BÂ²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ°¢‡2æW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$F–v—FR6Væ†GVÂ&6÷'&–v—"VÖ6öæWŒ:6ò÷RW6"÷WG&6—†¬:7&–Fâò6W76òçFW&–÷"6öçF–çVwV&FFòRöFR6W"6öæV7FFòæ÷fÖVçFRâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$VæFW&\:vòFRRÖÖ–Â"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6öææV7F–öäFG&W72’ÒFWfVçB’À¢G—S¢&VÖ–Â"À¢–çWFÖöFS¢&VÖ–Â"À¢WFö6ö×ÆWFS¢'W6W&æÖR"À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢##SB"À¢Æ6V†öÆFW#¢&æöÖTW66öÆæVGRæ'" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6öææV7F–öäFG&W75ÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%6Væ†F6—†"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç77v÷&B’ÒFWfVçB’À¢G—S¢'77v÷&B"À¢WFö6ö×ÆWFS¢&7W'&VçB×77v÷&B"À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢#S" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2ç77v÷&EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&×WFVB"ÒÂ$ò6—7FVÖ6öæf—&Öò6W76ò6VwW&ò&&V6V&W"RVçf–"çFW2FRG&ö6"6—†GVÂâ"¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷t6öææV7F–öãÖfÇ6R’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢2æ'W7¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òufÆ–FæFþ(
bs¢t6öæV7F"6—†r’Â’Â²&F—6&ÆVB%Ò•Ò•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò•ÒÂ‚Â²&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç6†÷u6WGF–æw2¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÖöFÂÖ&6¶G&÷ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂVÖ–Â×6ÖÆÂÖF–Æör"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&VÖ–Â×6WGF–æw2×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&VÖ–Â×6WGF–æw2×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ$6öæWŒ:6òFòRÖÖ–Â"’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷u6WGF–æw3ÖfÇ6R’À¢&&–ÖÆ&VÂ#¢$fV6†""À¢F—6&ÆVC¢2æ'W7¢ÒÂ,9r"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&ÖöFÂÖf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6fU6WGF–æw2Â²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ°¢‡2æW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%&VVæ6†6öÖVçFR6RW66öÆWF–Æ—¦VæFW&\:v÷2F–fW&VçFW2&ÆV—GW&RVçf–òâVÒ'&æ6òÂòVæFW&\:vò–ç7F—GV6–öæÂ6W,:WF–Æ—¦Fòâ"’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%6W'f–F÷"FR&V6V&–ÖVçFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç6WGF–æw2æ–Öö†÷7B’ÒFWfVçB’À¢WFö6ö×ÆWFS¢&öfb"À¢Ö†ÆVæwFƒ¢##S2"À¢Æ6V†öÆFW#¢&Ö–ÂæW66öÆæVGRæ'" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2ç6WGF–æw2æ–Öö†÷7EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%6W'f–F÷"FRVçf–ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç6WGF–æw2ç6×Gö†÷7B’ÒFWfVçB’À¢WFö6ö×ÆWFS¢&öfb"À¢Ö†ÆVæwFƒ¢##S2"À¢Æ6V†öÆFW#¢&Ö–ÂæW66öÆæVGRæ'" ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2ç6WGF–æw2ç6×Gö†÷7EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$6öæWŒ:6òFRVçf–ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'6VÆV7B"Â²&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç6WGF–æw2ç6×G÷÷'B’ÒFWfVçB’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢CcRÒÂ%÷'FCcR(	B6öæWŒ:6ò6VwW&"Â‚Â²'fÇVR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&÷F–öâ"Â²fÇVS¢SƒrÒÂ%÷'FSƒr(	B6öæWŒ:6ò6VwW&"Â‚Â²'fÇVR%Ò•ÒÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµ°¢÷dÖöFVÅ6VÆV7BÀ¢2ç6WGF–æw2ç6×G÷÷'BÀ¢fö–BÀ¢²çVÖ&W#¢G'VRÐ¢ÕÒ•Ò¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷u6WGF–æw3ÖfÇ6R’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$6æ6VÆ""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢2æ'W7¢ÒÂ%6Çf""Â‚Â²&F—6&ÆVB%Ò•Ò•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ6ö×÷6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢"À¢6Æ73¢&ÖöFÂÖ&6¶G&÷VÖ–ÂÖ6ö×÷6RÖ&6¶G&÷ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂVÖ–ÂÖ6ö×÷6R"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&VÖ–ÂÖ6ö×÷6R×F—FÆR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ÷FôF—7Æ•7G&–ær‡2æ66÷VçCòæFG&W72’Â’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&VÖ–ÂÖ6ö×÷6R×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ6ö×÷6RæG&gCòtVF—F"&67Væ†òs¢tæ÷fÖVç6vVÒr’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢öä6Æ–6³¢FWfVçBÓâ†6Æ÷6T6ö×÷6R‚’’À¢F—6&ÆVC¢2æ'W7’À¢&&–ÖÆ&VÂ#¢$fV6†"ÖVç6vVÒ ¢ÒÂ,9r"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&ÖöFÂÖf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡6VæBÂ²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’VÖ–ÂÖ6ö×÷6RÖ&öG’"ÒÂ°¢‡2æF—66&B¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖ6öæf—&Ò"À¢&öÆS¢&ÆW'B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2çVæF–æu–ÆöCòtfV6†"ÖVç6vVÓòs¢tFW66'F"ÇFW&:|;VW3òr’Â’Âö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2çVæF–æu–ÆöCòt6öÆ–6—F:|:6ò¬:fö’&Vv—7G&FâfV6†"ì:6ò6æ6VÆòVçf–òâ6öæf—&7FVçf–F÷2çFW2FRVçf–"÷WG&<;7–âs¢u6ÇfRò&67Væ†ò&6öçF–çV"FWö—2÷RFW66'FRòVRfö’ÇFW&Fòâr’Â’Âö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&7F–öç2"ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æF—66&CÖfÇ6R¢ÒÂ$6öçF–çV"V’"Â‚Â²&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'FâÖFævW""À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†6Æ÷6T6ö×÷6R‡G'VR’¢ÒÂ÷FôF—7Æ•7G&–ær‡2çVæF–æu–ÆöCòtfV6†"s¢tFW66'F"ÇFW&:|;VW2r’Â’Â²&öä6Æ–6²%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ6ö×÷6Tæ÷F–6R¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&ÆW'B7V66W72"À¢&öÆS¢'7FGW2 ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ6ö×÷6Tæ÷F–6R’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ6ö×÷6TW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢"À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ6ö×÷6TW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç6VæE&W7VÇB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢2À¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&VÖ–Â×6VæB×&W7VÇB"Â²v—2×7V66W72s§2ç6VæE&W7VÇBç7FGW3ÓÓÒw6VçBwÕÒ’À¢&öÆS¢'7FGW2 ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2ç6VæE&W7VÇBç7FGW3ÓÓÒw6VçBsòtÖVç6vVÒVçf–Fs§2ç6VæE&W7VÇBç7FGW3ÓÓÒw'F–ÂsòtVçf–ò&6–Âs§2ç6VæE&W7VÇBç7FGW3ÓÓÒvf–ÆVBsòtÖVç6vVÒì:6òVçf–Fs§2ç6VæE&W7VÇBç7FGW3ÓÓÒw6VæF–ærsòtVçf–òVÒæFÖVçFòs¢t6öæf—&Ö:|:6òVæFVçFRr’Â’À¢ö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2ç6VæE&W7VÇBæÖW76vR’Â’À¢‡2ç6VæE&W7VÇBç&VgW6VBæÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$FW7F–æL:&–÷2ì:6ò6V—F÷3¢"²÷FôF—7Æ•7G&–ær‡2ç6VæE&W7VÇBç&VgW6VBæ¦ö–â‚rÂr’’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢…²wVæ6W'F–ârÂw6VæF–ærrÂw'F–ÂuÒæ–æ6ÇVFW2‡2ç6VæE&W7VÇBç7FGW2’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ$ì:6òVçf–R÷WG&<;7–çFW2FR6öæfW&—"6—GV:|:6òFW7FÖVç6vVÒâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç6VæE&W7VÇBç7FGW3ÓÓÒw6VçBrbb2ç6VæE&W7VÇBç6VçE÷6fVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢"ÒÂ$ÖVç6vVÒfö’Vçf–FÂÖ2<;7–ì:6ò;FFR6W"6Çfæ7FVçf–F÷2â"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢F—6&ÆVC¢2æ'W7—ÇÄ&ööÆVâ‡2çVæF–æu–ÆöB’À¢6Æ73¢&VÖ–ÂÖ6ö×÷6RÖf–VÆG2 ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚%&"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&&–ÖÆ&VÂ#¢%&"À¢&&–ÖFW67&–&VF'’#¢&VÖ–Â×&V6—–VçBÖ†–çB"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6ö×÷6RçFò’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#C"À¢Æ6V†öÆFW#¢&æöÖTW66öÆæVGRæ'""À¢WFö6ö×ÆWFS¢&öfb"À¢–çWFÖöFS¢&VÖ–Â ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6ö×÷6RçFõÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"Â²–C¢&VÖ–Â×&V6—–VçBÖ†–çB"ÒÂ%6W&R÷2VæFW&\:v÷2÷"l:×&wVÆâ"•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–Â×FW‡BÖ'WGFöâVÖ–ÂÖ6÷’×FövvÆR"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2ç6†÷t6÷–W3Ò2ç6†÷t6÷–W2’À¢&&–ÖW‡æFVB#¢2ç6†÷t6÷–W0¢ÒÂ÷FôF—7Æ•7G&–ær‡2ç6†÷t6÷–W3òtö7VÇF"<;7–2s¢tF–6–öæ"62ò66òr’Â’Â²&öä6Æ–6²"Â&&–ÖW‡æFVB%Ò’À¢‡2ç6†÷t6÷–W2¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&VÖ–ÂÖ6÷’Öf–VÆG2 ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$62"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6ö×÷6Ræ62’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#C"À¢WFö6ö×ÆWFS¢&öfb"À¢–çWFÖöFS¢&VÖ–Â ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6ö×÷6Ræ65ÕÒ•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$66ò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&&–ÖÆ&VÂ#¢$66ò"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6ö×÷6Ræ&62’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#C"À¢WFö6ö×ÆWFS¢&öfb"À¢–çWFÖöFS¢&VÖ–Â ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6ö×÷6Ræ&65ÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$FW7F–æL:&–÷2ö7VÇF÷2F÷2FVÖ—2'F–6—çFW2â"•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$77VçFò"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6ö×÷6Rç7V&¦V7B’ÒFWfVçB’À¢Ö†ÆVæwFƒ¢#““‚"À¢Æ6V†öÆFW#¢$77VçFòFÖVç6vVÒ"À¢WFö6ö×ÆWFS¢&öfb ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6ö×÷6Rç7V&¦V7EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆBVÖ–ÂÖ&öG’Öf–VÆB"ÒÂµö7&VFUFW‡EdæöFR‚$ÖVç6vVÒ"’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6ö×÷6RçFW‡B’ÒFWfVçB’À¢&÷w3¢#"À¢Ö†ÆVæwFƒ¢#"À¢Æ6V†öÆFW#¢$W67&Wf7VÖVç6vVÞ(
b ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6ö×÷6RçFW‡EÕÒ•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&VÖ–Â×WÆöB'Fâ'Fâ×6V6öæF'’"ÒÂµö7&VFUFW‡EdæöFR‚$F–6–öæ"æW†÷2"’Âö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&f–ÆR"À¢×VÇF—ÆS¢""À¢öä6†ævS¢FDf–ÆW2À¢F—6&ÆVC¢2æ'W7—ÇÄ&ööÆVâ‡2çVæF–æu–ÆöB¢ÒÂçVÆÂÂCÂ²&öä6†ævR"Â&F—6&ÆVB%Ò•Ò’À¢ö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"Â²6Æ73¢&VÖ–ÂÖGF6†ÖVçBÖÆ–Ö—B"ÒÂ$L:’'V—f÷2ÂF÷FÂFRRÔ"â"’À¢‡2æ6ö×÷6RæGF6†ÖVçG2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'VÂ"Â°¢¶W“¢À¢6Æ73¢&VÖ–Â×WÆöBÖÆ—7B ¢ÒÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2æ6ö×÷6RæGF6†ÖVçG2Â†GF6†ÖVçBÂ–æFW‚’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢–æFW‚ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFUFW‡EdæöFR…÷FôF—7Æ•7G&–ær†GF6†ÖVçBæf–ÆVæÖR’²""Â’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡6—¦R†GF6†ÖVçBç6—¦R’’Â•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&VÖ–ÂÖ–6öâÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ‡2æ6ö×÷6RæGF6†ÖVçG2ç7Æ–6R†–æFW‚Ã’’À¢&&–ÖÆ&VÂ#¢u&VÖ÷fW"æW†òr¶GF6†ÖVçBæf–ÆVæÖP¢ÒÂ,9r"Â‚Â²&öä6Æ–6²"Â&&–ÖÆ&VÂ%Ò•Ò’¢Ò’Â#‚’•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂ‚Â²&F—6&ÆVB%Ò¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW"VÖ–ÂÖ6ö×÷6RÖfö÷FW""ÒÂ²‚2çVæF–æu–ÆöB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢6fTG&gBÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ%6Çf"&67Væ†ò"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢2æ'W7¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òtwV&F^(
bs¢tVçf–"ÖVç6vVÒr’Â’Â²&F—6&ÆVB%Ò•ÒÂcB’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂ²‡2ç6VæE&W7VÇCòç7FGW3ÓÓÒvf–ÆVBr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢VF—DgFW$f–ÇW&RÀ¢F—6&ÆVC¢2æ'W7¢ÒÂ$VF—F"ÖVç6vVÒ"Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Â…²wVæ6W'F–ârÂw6VæF–æruÒæ–æ6ÇVFW2‡2ç6VæE&W7VÇCòç7FGW7ÇÂrr’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢À¢6Æ73¢&'Fâ'Fâ×&–Ö'’"À¢G—S¢'7V&Ö—B"À¢F—6&ÆVC¢2æ'W7¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òt6öç7VÇFæFþ(
bs¢t6öç7VÇF"Vçf–òr’Â’Â²&F—6&ÆVB%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢G—S¢&'WGFöâ"À¢öä6Æ–6³¢FWfVçBÓâ†6Æ÷6T6ö×÷6R‚’’À¢F—6&ÆVC¢2æ'W7¢ÒÂ$fV6†""Â‚Â²&öä6Æ–6²"Â&F—6&ÆVB%Ò•ÒÂcB’•Ò•ÒÂCÂ²&öå7V&Ö—B%Ò•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂ‚Â²&&–Ö'W7’%Ò’¢Ð§ÒÆÆ–fV7–6ÆS¦gVæ7F–öâ&VæFW"…ö7G‚Âö66†R’°¢v—F‚…ö7G‚’°¢6öç7B²7&VFTVÆVÖVçEdæöFS¢ö7&VFTVÆVÖVçEdæöFRÂFôF—7Æ•7G&–æs¢÷FôF—7Æ•7G&–ærÂ÷Vä&Æö6³¢ö÷Vä&Æö6²Â7&VFTVÆVÖVçD&Æö6³¢ö7&VFTVÆVÖVçD&Æö6²Â7&VFT6öÖÖVçEdæöFS¢ö7&VFT6öÖÖVçEdæöFRÂæ÷&ÖÆ—¦T6Æ73¢öæ÷&ÖÆ—¦T6Æ72Â&VæFW$Æ—7C¢÷&VæFW$Æ—7BÂg&vÖVçC¢ôg&vÖVçBÂ7&VFUFW‡EdæöFS¢ö7&VFUFW‡EdæöFRÂdÖöFVÅFW‡C¢÷dÖöFVÅFW‡BÂv—F„F—&V7F—fW3¢÷v—F„F—&V7F—fW2ÂdÖöFVÄ6†V6¶&÷ƒ¢÷dÖöFVÄ6†V6¶&÷‚Âv—F„ÖöF–f–W'3¢÷v—F„ÖöF–f–W'2ÂFVÆW÷'C¢õFVÆW÷'BÂ7&VFT&Æö6³¢ö7&VFT&Æö6²ÒÒõgVP ¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFT&Æö6²…õFVÆW÷'BÂ²Fó¢F–ÆöuF&vWBÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â°¢6Æ73¢&ÖöFÂÖ&6¶G&÷"À¢öä6Æ–6³¢÷v—F„ÖöF–f–W'2†6Æ÷6RÂ²'6VÆb%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'6V7F–öâ"Â°¢6Æ73¢&ÖöFÂÆ–fV7–6ÆRÖF–Æör"À¢&öÆS¢&F–Æör"À¢&&–ÖÖöFÂ#¢'G'VR"À¢&&–ÖÆ&VÆÆVF'’#¢&Æ–fV7–6ÆR×F—FÆR"À¢&&–Ö'W7’#¢2æ'W7¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&†VFW""Â²6Æ73¢&ÖöFÂÖ†VFW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢&W–V'&÷r"ÒÂ$tU$Tä4”"4D5E$ò"’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ""Â°¢–C¢&Æ–fV7–6ÆR×F—FÆR"À¢&FFÖF–Æör×F—FÆR#¢" ¢ÒÂ$'V—f"÷RW†6ÇV—""•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢&–6öâÖ'WGFöâ"À¢G—S¢&'WGFöâ"À¢&FFÖF–ÆörÖ6Æ÷6R#¢""À¢&&–ÖÆ&VÂ#¢$fV6†"vW&Væ6–ÖVçFòFò6F7G&ò"À¢F—6&ÆVC¢2æ'W7’À¢öä6Æ–6³¢6Æ÷6P¢ÒÂ,9r"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò•Ò’Âö7&VFTVÆVÖVçEdæöFR‚&f÷&Ò"Â°¢6Æ73¢&ÖöFÂÖf÷&Ò"À¢öå7V&Ö—C¢÷v—F„ÖöF–f–W'2‡7V&Ö—BÂ²'&WfVçB%Ò¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&ÖöFÂÖ&öG’"ÒÂ°¢‡2æW'&÷"¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢À¢6Æ73¢&ÆW'BW'&÷""À¢&öÆS¢&ÆW'B ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æW'&÷"’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æ'W7’bb2ç&Wf–Wr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢&öÆS¢'7FGW2 ¢ÒÂ$6öæfW&–æFòò6F7G&òR6WW2l:Öæ7VÆ÷>(
b"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç&Wf–Wr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢"ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&F—b"Â²6Æ73¢&Æ–fV7–6ÆR×&V6÷&B"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ÷FôF—7Æ•7G&–ær‡2ç&Wf–Wræ¶–æB’Â’Âö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2ç&Wf–WræÆ&VÂ’Â’Â‡2ç&Wf–Wræ&6†—fVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'7â"Â°¢¶W“¢À¢6Æ73¢&&FvR&6†—fVB ¢ÒÂ$'V—fFò"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR•Ò’À¢‡2ç&Wf–Wrç&W6W'fW5÷W'6öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&Æ–fV7–6ÆRÖæ÷FR ¢ÒÂ$W7F÷W&:|:6òG&F6öÖVçFRFW7FRW&f–ÂâW76öFò6F7G&ò;¦æ–6òR6WW2÷WG&÷2W&f—26W,:6ò&W6W'fF÷2â"’¢¢‡2ç&Wf–Wrç&W6÷W&6SÓÓÒwW'6öç2r¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢À¢6Æ73¢&Æ–fV7–6ÆRÖæ÷FR ¢ÒÂ$W7F÷W&:|:6òG&FF–FVçF–FFRæò6F7G&ò;¦æ–6òÂ–æ6ÇV–æFò7V26Æ76–f–6:|;VW26öÖò&W7öç<:fVÂÂf÷&æV6VF÷"Â6Æ–VçFR÷R<;66–òâ"’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢ö7&VFTVÆVÖVçEdæöFR‚&f–VÆG6WB"Â°¢6Æ73¢&Æ–fV7–6ÆRÖÖöFW2"À¢F—6&ÆVC¢2æ'W7¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ÆVvVæB"ÂçVÆÂÂ$òVRFW6V¦f¦W#ò"’Â‚2ç&Wf–Wræ&6†—fVB¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢À¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡·6VÆV7FVC§2æ7F–öãÓÓÒv&6†—fRwÒ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢'&F–ò"À¢æÖS¢&Æ–fV7–6ÆRÖ7F–öâ"À¢fÇVS¢&&6†—fR"À¢6†V6¶VC¢2æ7F–öãÓÓÒv&6†—fRrÀ¢öä6†ævS¢FWfVçBÓâ†6†ö÷6R‚v&6†—fRr’¢ÒÂçVÆÂÂCÂ²&6†V6¶VB"Â&öä6†ævR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$'V—f""’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ%&WF—&F2Æ—7F2FRW6òâ÷2FF÷2Rò†—7L;7&–6òW&ÖæV6VÒRöFVÒ6W"&W7FW&F÷2â"•Ò•ÒÂ"’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢À¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡·6VÆV7FVC§2æ7F–öãÓÓÒw&W7F÷&RwÒ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢'&F–ò"À¢æÖS¢&Æ–fV7–6ÆRÖ7F–öâ"À¢fÇVS¢'&W7F÷&R"À¢6†V6¶VC¢2æ7F–öãÓÓÒw&W7F÷&RrÀ¢öä6†ævS¢FWfVçBÓâ†6†ö÷6R‚w&W7F÷&Rr’¢ÒÂçVÆÂÂCÂ²&6†V6¶VB"Â&öä6†ævR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ%&W7FW&""’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ$FWföÇfRò6F7G&ò:2Æ—7F2Â6öÒ6—GV:|:6òVRF–æ†çFW2Fò'V—fÖVçFòâ"•Ò•ÒÂ"’’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢öæ÷&ÖÆ—¦T6Æ72‡·6VÆV7FVC§2æ7F–öãÓÓÒvFVÆWFRwÒ’ÒÂµö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢'&F–ò"À¢æÖS¢&Æ–fV7–6ÆRÖ7F–öâ"À¢fÇVS¢&FVÆWFR"À¢6†V6¶VC¢2æ7F–öãÓÓÒvFVÆWFRrÀ¢öä6†ævS¢FWfVçBÓâ†6†ö÷6R‚vFVÆWFRr’¢ÒÂçVÆÂÂCÂ²&6†V6¶VB"Â&öä6†ævR%Ò’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$W†6ÇV—"FVf–æ—F—fÖVçFR"’Âö7&VFTVÆVÖVçEdæöFR‚'6ÖÆÂ"ÂçVÆÂÂ%&VÖ÷fRW7FR6F7G&ò6VÒ÷:|:6òFR&W7FW&:|:6òâF—7öì:×fVÂ6öÖVçFRVæFò÷2l:Öæ7VÆ÷2W&Ö—FVÒâ"•Ò•ÒÂ"•ÒÂ‚Â²&F—6&ÆVB%Ò’À¢‡2æ7F–öãÓÓÒvFVÆWFRr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢"À¢6Æ73¢&Æ–fV7–6ÆRÖ–×7B"À¢&&–ÖÆ&VÂ#¢$–×7FòFW†6ÇW<:6ò ¢ÒÂ°¢ö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$6öæfW,:¦æ6–FRl:Öæ7VÆ÷2"’À¢‚2ç&Wf–WræFVÆWFU÷W&Ö—76–öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢ÒÂ÷FôF—7Æ•7G&–ær‡2ç&Wf–WræFVÆWFUöæ÷FR’Â’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç&Wf–WræFWVæFVæ6–W2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂ²¶W“¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ$W7FW2l:Öæ7VÆ÷2–×VFVÒW†6ÇW<:6òFVf–æ—F—f¢"’Âö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2ç&Wf–WræFWVæFVæ6–W2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢—FVÒæ¶W’ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæÆ&VÂ’Â’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ6÷VçB’Â•Ò’¢Ò’Â#‚’•Ò’Âö7&VFTVÆVÖVçEdæöFR‚'"Â²6Æ73¢'6ÖÆÂ×WFVB"ÒÂ$ÖG,:Ö7VÆ2ÂFö7VÖVçF÷2Â&Vv—7G&÷2f–ææ6V—&÷2R†—7L;7&–6÷2ì:6ò<:6òvF÷2÷"W7F÷W&:|:6òâ"•ÒÂcB’¢¢…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â²¶W“¢"ÒÂ$æVæ‡VÒl:Öæ7VÆòVR–×\:vW†6ÇW<:6òfö’Væ6öçG&Fòâ6öæfW,:¦æ6–6W,:&WWF–Fò6öæf—&Ö"â"’’À¢‡2ç&Wf–Wræ÷væVE÷&V6÷&G2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â²¶W“¢2ÒÂµö7&VFTVÆVÖVçEdæöFR‚'"ÂçVÆÂÂ%FÖ,:–Ò6W,:6ò&VÖ÷f–F÷2÷2ÖWFFF÷2,;7&–÷2FW7FR6F7G&ó¢"’Âö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2ç&Wf–Wræ÷væVE÷&V6÷&G2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢—FVÒæ¶W’ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæÆ&VÂ’Â’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ6÷VçB’Â•Ò’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’¢¢‡2æ7F–öãÓÓÒv&6†—fRrbb2ç&Wf–Wræ&6†—fUö&Æö6·2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢2À¢6Æ73¢&Æ–fV7–6ÆRÖ–×7B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ%&W6öÇf÷2l:Öæ7VÆ÷2VÒW6òçFW2FR'V—f""’Âö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2ç&Wf–Wræ&6†—fUö&Æö6·2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢—FVÒæÆ&VÂÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæÆ&VÂ’Â’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæ6÷VçB’Â•Ò’¢Ò’Â#‚’•Ò•Ò’¢¢‡2æ7F–öãÓÓÒw&W7F÷&Rrbb2ç&Wf–Wrç&W7F÷&Uö&Æö6·2æÆVæwF‚¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'6V7F–öâ"Â°¢¶W“¢BÀ¢6Æ73¢&Æ–fV7–6ÆRÖ–×7B ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&ƒ2"ÂçVÆÂÂ$çFW2FR&W7FW&""’Âö7&VFTVÆVÖVçEdæöFR‚'VÂ"ÂçVÆÂÂ²…ö÷Vä&Æö6²‡G'VR’Âö7&VFTVÆVÖVçD&Æö6²…ôg&vÖVçBÂçVÆÂÂ÷&VæFW$Æ—7B‡2ç&Wf–Wrç&W7F÷&Uö&Æö6·2Â†—FVÒ’Óâ°¢&WGW&â…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ’"Â²¶W“¢—FVÒæÆ&VÂÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær†—FVÒæÆ&VÂ’Â•Ò’¢Ò’Â#‚’•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2ç&Wf–Wræ&6†—fVBbb2ç&Wf–Wræ&6†—fU÷&V6öâ¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚'"Â°¢¶W“¢RÀ¢6Æ73¢&Æ–fV7–6ÆRÖæ÷FR ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ$Ö÷F—fòFò'V—fÖVçFó¢"’Âö7&VFUFW‡EdæöFR‚""²÷FôF—7Æ•7G&–ær‡2ç&Wf–Wræ&6†—fU÷&V6öâ’Â•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢†ÆÆ÷vVB‚’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&F—b"Â°¢¶W“¢bÀ¢6Æ73¢&Æ–fV7–6ÆRÖ6öæf—&ÖF–öâ ¢ÒÂµö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&f–VÆB"ÒÂµö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂµö7&VFUFW‡EdæöFR‚$Ö÷F—fò"’Âö7&VFTVÆVÖVçEdæöFR‚'7â"Â²6Æ73¢'&WV—&VB"ÒÂ"¢"•Ò’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚'FW‡F&V"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2ç&V6öâ’ÒFWfVçB’À¢&÷w3¢#2"À¢&WV—&VC¢""À¢Ö–æÆVæwFƒ¢#2"À¢Ö†ÆVæwFƒ¢#"À¢F—6&ÆVC¢2æ'W7’À¢Æ6V†öÆFW#¢$W‡Æ—VR÷"VRFW6V¦&VÆ—¦"W7F÷W&:|:6òâ ¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÅFW‡BÂ2ç&V6öåÕÒ•Ò’Â‡2æ7F–öãÓÓÒvFVÆWFRr¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&Æ&VÂ"Â°¢¶W“¢À¢6Æ73¢&f–VÆB ¢ÒÂµö7&VFUFW‡EdæöFR‚%&6öæf—&Ö"ÂF–v—FS¢"’Âö7&VFTVÆVÖVçEdæöFR‚'7G&öær"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2ç&Wf–Wræ6öæf—&ÖF–öâ’Â’Â÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6öæf—&ÖF–öâ’ÒFWfVçB’À¢&WV—&VC¢""À¢Ö†ÆVæwFƒ¢##"À¢WFö6ö×ÆWFS¢&öfb"À¢7VÆÆ6†V6³¢fÇ6RÀ¢F—6&ÆVC¢2æ'W7¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â'7VÆÆ6†V6²"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÅFW‡BÂ2æ6öæf—&ÖF–öåÕÒ•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’Âö7&VFTVÆVÖVçEdæöFR‚&Æ&VÂ"Â²6Æ73¢&Æ–fV7–6ÆRÖ6¶æ÷vÆVFvR"ÒÂµ÷v—F„F—&V7F—fW2…ö7&VFTVÆVÖVçEdæöFR‚&–çWB"Â°¢G—S¢&6†V6¶&÷‚"À¢&öåWFFS¦ÖöFVÅfÇVR#¢FWfVçBÓâ‚‡2æ6¶æ÷vÆVFvVB’ÒFWfVçB’À¢F—6&ÆVC¢2æ'W7¢ÒÂçVÆÂÂ‚Â²&öåWFFS¦ÖöFVÅfÇVR"Â&F—6&ÆVB%Ò’Âµµ÷dÖöFVÄ6†V6¶&÷‚Â2æ6¶æ÷vÆVFvVEÕÒ’Âö7&VFTVÆVÖVçEdæöFR‚'7â"ÂçVÆÂÂ÷FôF—7Æ•7G&–ær‡2æ7F–öãÓÓÒvFVÆWFRsòt6öæfW&’ò6F7G&òRVçFVæFòVRW†6ÇW<:6ò:’FVf–æ—F—fâs¢t6öæfW&’ò6F7G&òR÷2VfV—F÷2FW7F÷W&:|:6òâr’Â•Ò•Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢ÒÂcB’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR’À¢‡2æW'&÷"ÇÂ‡2ç&Wf–WrbbÆÆ÷vVB‚’’¢ò…ö÷Vä&Æö6²‚’Âö7&VFTVÆVÖVçD&Æö6²‚&'WGFöâ"Â°¢¶W“¢2À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’Æ–fV7–6ÆR×&Vg&W6‚"À¢G—S¢&'WGFöâ"À¢F—6&ÆVC¢2æ'W7’À¢öä6Æ–6³¢Æö@¢ÒÂ$GVÆ—¦",:—f–"Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’¢¢ö7&VFT6öÖÖVçEdæöFR‚""ÂG'VR¢Ò’Âö7&VFTVÆVÖVçEdæöFR‚&fö÷FW""Â²6Æ73¢&ÖöFÂÖfö÷FW""ÒÂµö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢G—S¢&'WGFöâ"À¢6Æ73¢&'Fâ'Fâ×6V6öæF'’"À¢F—6&ÆVC¢2æ'W7’À¢öä6Æ–6³¢6Æ÷6P¢ÒÂ$6æ6VÆ""Â‚Â²&F—6&ÆVB"Â&öä6Æ–6²%Ò’Âö7&VFTVÆVÖVçEdæöFR‚&'WGFöâ"Â°¢6Æ73¢öæ÷&ÖÆ—¦T6Æ72…²&'Fâ"Â2æ7F–öãÓÓÒvFVÆWFRsòv'FâÖFævW"s¢v'Fâ×&–Ö'’uÒ’À¢F—6&ÆVC¢2æ'W7’ÇÂÆÆ÷vVB‚’ÇÂ2æ6¶æ÷vÆVFvVBÇÂ2ç&V6öâçG&–Ò‚’æÆVæwFƒÃ2ÇÂ‡2æ7F–öãÓÓÒvFVÆWFRrbb2æ6öæf—&ÖF–öâÓ×2ç&Wf–Wsòæ6öæf—&ÖF–öâ¢ÒÂ÷FôF—7Æ•7G&–ær‡2æ'W7“òt6öæfW&–æFþ(
bs¦6F–öâ‚’’ÂÂ²&F—6&ÆVB%Ò•Ò•ÒÂCÂ²&öå7V&Ö—B%Ò•ÒÂ‚Â²&&–Ö'W7’%Ò•ÒÂ‚Â²&öä6Æ–6²%Ò•ÒÂ‚Â²'Fò%Ò’¢Ð§×Ó°