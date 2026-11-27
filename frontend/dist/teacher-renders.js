/* Vue pré-compilado; sem eval em runtime. */
var _Vue=Vue; var PigeRenders={teacherPortal:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, renderList: _renderList, Fragment: _Fragment, vModelText: _vModelText, withModifiers: _withModifiers, withKeys: _withKeys, withDirectives: _withDirectives, vModelDynamic: _vModelDynamic, normalizeClass: _normalizeClass, vShow: _vShow, resolveComponent: _resolveComponent, createBlock: _createBlock } = _Vue

    const _component_school_diary = _resolveComponent("school-diary")

    return (_openBlock(), _createElementBlock("div", {
      class: "family-root",
      "aria-busy": s.busy
    }, [_createElementVNode("a", {
      class: "skip",
      href: "#teacher-content"
    }, "Ir para conteúdo"), (!s.ready)
      ? (_openBlock(), _createElementBlock("main", {
          key: 0,
          id: "teacher-content",
          class: "loading-screen",
          role: "status"
        }, "Carregando seu espaço…"))
      : (!s.user)
        ? (_openBlock(), _createElementBlock("main", {
            key: 1,
            id: "teacher-content",
            class: "auth-layout family-auth"
          }, [_createElementVNode("section", { class: "auth-intro" }, [_createElementVNode("div", { class: "official-brand" }, [(identity.logo_url)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: identity.logo_url,
                alt: identity.display_name
              }, null, 8, ["src", "alt"]))
            : (_openBlock(), _createElementBlock("strong", {
                key: 1,
                class: "institution-name"
              }, _toDisplayString(identity.display_name), 1))]), _createElementVNode("div", { class: "auth-copy" }, [_createElementVNode("p", { class: "eyebrow" }, "PORTAL DO PROFESSOR"), _createElementVNode("h1", null, [_createTextVNode("Seu diário"), _createElementVNode("br"), _createTextVNode("de classe.")])])]), _createElementVNode("section", { class: "auth-panel" }, [(mfa.state.challenge)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
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
                    _createElementVNode("h2", null, "Guarde seus códigos de recuperação"),
                    _createElementVNode("p", null, "Use um código se perder o autenticador. Cada código funciona uma única vez; eles não serão exibidos novamente."),
                    _createElementVNode("div", { class: "mfa-codes" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(mfa.state.codes, (code) => {
                      return (_openBlock(), _createElementBlock("code", { key: code }, _toDisplayString(code), 1))
                    }), 128))]),
                    _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                      class: "btn btn-secondary",
                      type: "button",
                      onClick: mfa.downloadCodes
                    }, "Salvar códigos", 8, ["onClick"]), _createElementVNode("button", {
                      class: "btn btn-primary",
                      type: "button",
                      disabled: mfa.state.busy,
                      onClick: mfa.acknowledge
                    }, "Guardei os códigos · Continuar", 8, ["disabled", "onClick"])])
                  ], 64))
                : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                    _createElementVNode("h2", null, _toDisplayString(mfa.state.enrolling?'Ative a autenticação em duas etapas':'Confirme seu acesso'), 1),
                    (mfa.state.enrolling)
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("p", null, "Adicione esta conta ao seu aplicativo autenticador e informe o código gerado."), (mfa.state.qr)
                          ? (_openBlock(), _createElementBlock("img", {
                              key: 0,
                              src: mfa.state.qr,
                              class: "mfa-qr",
                              alt: "QR Code para configurar seu autenticador"
                            }, null, 8, ["src"]))
                          : _createCommentVNode("", true), _createElementVNode("details", null, [_createElementVNode("summary", null, "Digitar chave manualmente"), _createElementVNode("code", { class: "mfa-secret" }, _toDisplayString(mfa.state.secret), 1)])], 64))
                      : (_openBlock(), _createElementBlock("p", { key: 1 }, "Informe o código do autenticador ou um código de recuperação.")),
                    _createElementVNode("label", { class: "field" }, [_createTextVNode(_toDisplayString(mfa.state.enrolling?'Código de 6 dígitos':'Código do autenticador ou de recuperação'), 1), _withDirectives(_createElementVNode("input", {
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
                    }, _toDisplayString(mfa.state.busy?'Validando…':'Confirmar'), 9, ["disabled", "onClick"])])
                  ], 64))])]))
            : (_openBlock(), _createElementBlock("form", {
                key: 1,
                class: "auth-form",
                onSubmit: _withModifiers(login, ["prevent"])
              }, [
                _createElementVNode("header", { class: "auth-heading" }, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name), 1), _createElementVNode("h2", null, "Acesso do professor"), _createElementVNode("p", { class: "muted" }, "Informe suas credenciais para continuar.")]),
                (s.error)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "alert error",
                      role: "alert"
                    }, _toDisplayString(s.error), 1))
                  : _createCommentVNode("", true),
                _createElementVNode("label", { class: "field" }, [_createTextVNode("E-mail"), _withDirectives(_createElementVNode("input", {
                  type: "email",
                  "onUpdate:modelValue": $event => ((s.email) = $event),
                  inputmode: "email",
                  autocapitalize: "none",
                  spellcheck: false,
                  enterkeyhint: "next",
                  required: "",
                  autocomplete: "username",
                  placeholder: "seu.email@exemplo.com",
                  disabled: s.busy
                }, null, 8, ["onUpdate:modelValue", "spellcheck", "disabled"]), [[_vModelText, s.email]])]),
                _createElementVNode("div", { class: "field" }, [_createElementVNode("label", { for: "teacher-password" }, "Senha"), _createElementVNode("div", { class: "password-control" }, [_withDirectives(_createElementVNode("input", {
                  id: "teacher-password",
                  "onUpdate:modelValue": $event => ((s.password) = $event),
                  type: s.passwordVisible?'text':'password',
                  required: "",
                  maxlength: "128",
                  autocomplete: "current-password",
                  enterkeyhint: "go",
                  placeholder: "Sua senha de acesso",
                  disabled: s.busy
                }, null, 8, ["onUpdate:modelValue", "type", "disabled"]), [[_vModelDynamic, s.password]]), _createElementVNode("button", {
                  class: "password-toggle",
                  type: "button",
                  "aria-label": s.passwordVisible?'Ocultar senha':'Mostrar senha',
                  "aria-pressed": s.passwordVisible,
                  "aria-controls": "teacher-password",
                  onClick: $event => (s.passwordVisible=!s.passwordVisible)
                }, _toDisplayString(s.passwordVisible?'Ocultar':'Mostrar'), 9, ["aria-label", "aria-pressed", "onClick"])])]),
                _createElementVNode("button", {
                  class: "btn btn-primary full",
                  disabled: s.busy
                }, [_createTextVNode(_toDisplayString(s.busy?'Autenticando…':'Entrar como professor') + " ", 1), _createElementVNode("span", { "aria-hidden": "true" }, "→")], 8, ["disabled"]),
                _createElementVNode("p", { class: "auth-help muted" }, "Precisa recuperar seu acesso? Fale com a secretaria da escola.")
              ], 40, ["onSubmit"]))])]))
        : (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "family-shell",
            onKeydown: menuKey
          }, [(s.menuOpen)
            ? (_openBlock(), _createElementBlock("button", {
                key: 0,
                class: "family-shade",
                "aria-label": "Fechar navegação",
                onClick: $event => (toggleMenu(false))
              }, null, 8, ["onClick"]))
            : _createCommentVNode("", true), _createElementVNode("aside", {
            id: "teacher-navigation",
            class: _normalizeClass(["family-sidebar", {visible:s.menuOpen}])
          }, [_createElementVNode("div", { class: "family-sidebar-brand" }, [_createElementVNode("button", {
            id: "teacher-menu-close",
            type: "button",
            class: "icon-button family-menu-close",
            onClick: $event => (toggleMenu(false)),
            "aria-label": "Fechar menu"
          }, "×", 8, ["onClick"]), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(identity.display_name), 1), _createElementVNode("small", null, "PORTAL DO PROFESSOR")])]), _createElementVNode("div", { class: "family-sidebar-scroll" }, [_createElementVNode("p", { class: "family-nav-label" }, "ROTINA DOCENTE"), _createElementVNode("nav", { "aria-label": "Rotina do professor" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList([{id:'overview',label:'Visão geral',icon:'dashboard'},{id:'agenda',label:'Minha programação',icon:'clock'},{id:'diary',label:'Diário de classe',icon:'academic'},{id:'materials',label:'Atividades e trabalhos',icon:'documents'},{id:'news',label:'Avisos e publicações',icon:'bell'}], (item) => {
            return (_openBlock(), _createElementBlock("button", {
              key: item.id,
              "aria-current": s.section===item.id?'page':undefined,
              disabled: s.busy || (['diary','materials'].includes(item.id) && !s.agenda?.diaries.length) || (!s.schoolId && item.id!=='overview'),
              onClick: $event => (navigate(item.id))
            }, [(_openBlock(), _createElementBlock("svg", {
              class: "ui-icon",
              "aria-hidden": "true"
            }, [_createElementVNode("use", { href: '/ui-icons.svg#'+item.icon }, null, 8, ["href"])])), _createTextVNode(_toDisplayString(item.label), 1)], 8, ["aria-current", "disabled", "onClick"]))
          }), 128))])]), _createElementVNode("footer", { class: "family-sidebar-footer" }, [_createTextVNode(_toDisplayString(identity.short_name), 1), _createElementVNode("small", null, "Portal do Professor")])], 2), _createElementVNode("div", {
            class: "family-main",
            inert: s.menuOpen?true:undefined
          }, [_createElementVNode("main", {
            id: "teacher-content",
            class: "teacher-main"
          }, [
            _createElementVNode("header", { class: "teacher-header" }, [_createElementVNode("button", {
              id: "teacher-menu-toggle",
              class: "icon-button family-menu-toggle",
              "aria-label": "Abrir menu",
              "aria-controls": "teacher-navigation",
              "aria-expanded": s.menuOpen,
              onClick: $event => (toggleMenu(true))
            }, [(_openBlock(), _createElementBlock("svg", {
              class: "ui-icon",
              "aria-hidden": "true"
            }, [_createElementVNode("use", { href: "/ui-icons.svg#menu" })]))], 8, ["aria-expanded", "onClick"]), _createElementVNode("div", { class: "teacher-brand" }, [(identity.logo_url)
              ? (_openBlock(), _createElementBlock("img", {
                  key: 0,
                  src: identity.logo_url,
                  alt: ""
                }, null, 8, ["src"]))
              : _createCommentVNode("", true), _createElementVNode("span", null, _toDisplayString(identity.display_name), 1)]), _createElementVNode("div", { class: "teacher-account" }, [_createElementVNode("span", null, _toDisplayString(s.user.name), 1), _createElementVNode("button", {
              class: "btn btn-secondary",
              disabled: s.busy,
              onClick: logout
            }, "Sair", 8, ["disabled", "onClick"])])]),
            _createElementVNode("div", { class: "teacher-heading" }, [_createElementVNode("h1", {
              id: "teacher-title",
              tabindex: "-1"
            }, _toDisplayString(({overview:'Visão geral',agenda:'Minha programação',diary:'Diário de classe',materials:'Atividades e trabalhos',news:'Avisos e publicações'})[s.section]), 1), (s.schools.length>1)
              ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Instituição"), _createElementVNode("select", {
                  value: s.schoolId,
                  disabled: s.busy,
                  onChange: selectSchool
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.schools, (item) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: item.id,
                    value: item.id
                  }, _toDisplayString(item.name), 9, ["value"]))
                }), 128))], 40, ["value", "disabled", "onChange"])]))
              : _createCommentVNode("", true)]),
            (s.section==='overview' || s.section==='diary')
              ? (_openBlock(), _createElementBlock("details", {
                  key: 0,
                  class: "panel teacher-guide"
                }, [_createElementVNode("summary", null, "Guia de uso do diário"), _createElementVNode("div", { class: "teacher-guide-content" }, [_createElementVNode("ol", null, [_createElementVNode("li", null, "Em Visão geral, localize a turma e o componente em Minhas turmas. Se o diário ainda não aparecer, peça à coordenação que confira sua atribuição."), _createElementVNode("li", null, "Use Planejar aula para preparar o planejamento. Para registrar uma aula e consultar seu conteúdo, escolha Abrir diário."), _createElementVNode("li", null, "Use Fazer chamada, selecione a aula e registre a frequência dos alunos. Confira os lançamentos antes de salvar.")]), _createElementVNode("figure", null, [_createElementVNode("a", {
                  href: "/guia/professor.webp",
                  target: "_blank",
                  rel: "noopener",
                  "aria-label": "Ampliar imagem de Minhas turmas (nova aba)"
                }, [_createElementVNode("img", {
                  src: "/guia/professor.webp",
                  width: "278",
                  height: "287",
                  loading: "lazy",
                  alt: "Exemplo de Minhas turmas com os botões Abrir diário, Fazer chamada e Planejar aula para Ciências."
                })]), _createElementVNode("figcaption", null, "Os três atalhos abrem a turma e o componente escolhidos.")])])]))
              : _createCommentVNode("", true),
            (s.error)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 1,
                  class: "alert error",
                  role: "alert"
                }, [_createTextVNode(_toDisplayString(s.error) + " ", 1), _createElementVNode("button", {
                  class: "btn",
                  disabled: s.busy,
                  onClick: $event => (run(workspace))
                }, "Tentar novamente", 8, ["disabled", "onClick"])]))
              : _createCommentVNode("", true),
            (!s.schools.length&&!s.error&&!s.busy)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 2,
                  class: "alert"
                }, "Peça à Secretaria que vincule sua conta de Professor à instituição."))
              : _createCommentVNode("", true),
            (s.section==='news')
              ? (_openBlock(), _createElementBlock("section", {
                  key: 3,
                  class: "panel x-card"
                }, [
                  _createElementVNode("h2", null, "Comunicados da escola"),
                  (!s.news.length&&!s.busy)
                    ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Nenhuma publicação disponível."))
                    : _createCommentVNode("", true),
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.news, (item) => {
                    return (_openBlock(), _createElementBlock("article", { key: item.id }, [_createElementVNode("h3", null, _toDisplayString(item.title), 1), _createElementVNode("p", { class: "preserve" }, _toDisplayString(item.content||item.summary), 1)]))
                  }), 128)),
                  (s.newsTotal>10)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 1,
                        class: "actions"
                      }, [_createElementVNode("button", {
                        disabled: s.busy||s.newsPage===1,
                        onClick: $event => (run(()=>publications(s.newsPage-1)))
                      }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                        disabled: s.busy||s.newsPage*10>=s.newsTotal,
                        onClick: $event => (run(()=>publications(s.newsPage+1)))
                      }, "Próxima", 8, ["disabled", "onClick"])]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true),
            (s.agenda && !s.agenda.diaries.length && s.section==='diary')
              ? (_openBlock(), _createElementBlock("p", {
                  key: 4,
                  class: "alert"
                }, "Peça à Coordenação que confira sua atribuição e abra o diário da turma."))
              : _createCommentVNode("", true),
            (s.agenda)
              ? _withDirectives((_openBlock(), _createElementBlock("section", {
                  key: 5,
                  class: "teacher-overview"
                }, [_withDirectives(_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Minhas turmas"), (!s.agenda.assignments.length)
                  ? (_openBlock(), _createElementBlock("p", { key: 0 }, "A Coordenação precisa associar seu cadastro à turma e à disciplina em Atribuições docentes."))
                  : _createCommentVNode("", true), _createElementVNode("ul", { class: "teacher-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.agenda.assignments, (a) => {
                  return (_openBlock(), _createElementBlock("li", { key: a.id }, [
                    _createElementVNode("strong", null, _toDisplayString(a.class_name) + " · " + _toDisplayString(a.subject_name), 1),
                    _createElementVNode("span", null, _toDisplayString([a.shift_name,a.year_name].filter(Boolean).join(' · ')), 1),
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.agenda.diaries.filter(item=>item.teacher_assignment_id===a.id), (d) => {
                      return (_openBlock(), _createElementBlock(_Fragment, { key: d.id }, [_createElementVNode("button", {
                        class: "btn btn-secondary teacher-open",
                        onClick: $event => {s.requestedDiary={id:d.id,tab:s.section==='materials'?'materials':'diaries'};s.section='diary'}
                      }, _toDisplayString(s.section==='materials'?'Abrir materiais':'Abrir diário') + " · " + _toDisplayString(d.component), 9, ["onClick"]), (s.section==='overview')
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "btn btn-secondary teacher-open",
                            onClick: $event => {s.requestedDiary={id:d.id,tab:'attendance'};s.section='diary'}
                          }, "Fazer chamada · " + _toDisplayString(d.component), 9, ["onClick"]))
                        : _createCommentVNode("", true), (s.section==='overview')
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 1,
                            class: "btn btn-secondary teacher-open",
                            onClick: $event => {s.requestedDiary={id:d.id,tab:'planning'};s.section='diary'}
                          }, "Planejar aula · " + _toDisplayString(d.component), 9, ["onClick"]))
                        : _createCommentVNode("", true)], 64))
                    }), 128)),
                    (!s.agenda.diaries.some(d=>d.teacher_assignment_id===a.id))
                      ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Peça à Coordenação que abra o diário desta turma e o vincule à sua atribuição."))
                      : _createCommentVNode("", true)
                  ]))
                }), 128))])], 512), [[_vShow, s.section!=='agenda']]), _withDirectives(_createElementVNode("section", { class: "panel x-card" }, [
                  _createElementVNode("div", { class: "teacher-week" }, [_createElementVNode("h2", null, "Programação da semana"), _createElementVNode("label", null, [_createTextVNode("Semana de"), _withDirectives(_createElementVNode("input", {
                    type: "date",
                    "onUpdate:modelValue": $event => ((s.week) = $event),
                    disabled: s.busy,
                    onChange: $event => (run(agenda))
                  }, null, 40, ["onUpdate:modelValue", "disabled", "onChange"]), [[_vModelText, s.week]])])]),
                  _createElementVNode("p", null, _toDisplayString(date(s.agenda.starts_on)) + " a " + _toDisplayString(date(s.agenda.ends_on)), 1),
                  (!s.agenda.events.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "muted"
                      }, "Nenhuma aula registrada ou avaliação marcada para esta semana."))
                    : _createCommentVNode("", true),
                  _createElementVNode("ul", { class: "teacher-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.agenda.events, (e) => {
                    return (_openBlock(), _createElementBlock("li", { key: e.kind+e.id }, [_createElementVNode("span", null, _toDisplayString(date(e.date)) + " · " + _toDisplayString(e.kind), 1), _createElementVNode("strong", null, _toDisplayString(e.title), 1), _createElementVNode("small", null, _toDisplayString(group(e.diary_id)), 1)]))
                  }), 128))])
                ], 512), [[_vShow, s.section!=='materials']])], 512)), [[_vShow, ['overview','agenda','materials'].includes(s.section)]])
              : _createCommentVNode("", true),
            (s.agenda?.diaries.length)
              ? _withDirectives((_openBlock(), _createElementBlock("section", {
                  key: 6,
                  "aria-label": "Diário de classe"
                }, [(_openBlock(), _createBlock(_component_school_diary, {
                  "school-name": s.schools.find(item=>item.id===s.schoolId)?.name,
                  key: s.schoolId,
                  "school-id": s.schoolId,
                  permissions: s.user.permissions,
                  "teacher-portal": true,
                  "requested-diary": s.requestedDiary
                }, null, 8, ["school-name", "school-id", "permissions", "teacher-portal", "requested-diary"]))], 512)), [[_vShow, s.section==='diary']])
              : _createCommentVNode("", true)
          ])], 8, ["inert"])], 40, ["onKeydown"]))], 8, ["aria-busy"]))
  }
},diary:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode, Fragment: _Fragment, createElementVNode: _createElementVNode, renderList: _renderList, withModifiers: _withModifiers, normalizeClass: _normalizeClass, vModelSelect: _vModelSelect, withDirectives: _withDirectives, vModelText: _vModelText, vModelCheckbox: _vModelCheckbox, withKeys: _withKeys } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "diary-workspace",
      "aria-label": "Diário Escolar Digital",
      "aria-busy": state.busy,
      "data-workspace-dirty": workspaceDirty
    }, [(state.error)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "alert error",
          role: "alert"
        }, _toDisplayString(state.error), 1))
      : _createCommentVNode("", true), (state.notice)
      ? (_openBlock(), _createElementBlock("div", {
          key: 1,
          class: "alert success",
          role: "status"
        }, _toDisplayString(state.notice), 1))
      : _createCommentVNode("", true), _createElementVNode("fieldset", {
      onInput: markDraft,
      disabled: state.busy,
      class: "portal-fieldset"
    }, [
      pilot
        ? (_openBlock(), _createElementBlock("p", {
            key: 0,
            class: "diary-context"
          }, [_createTextVNode(_toDisplayString(props.schoolName), 1), (state.selected)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createTextVNode(" · " + _toDisplayString(state.selected.year_name) + " · " + _toDisplayString(state.selected.class_name) + " · " + _toDisplayString(state.selected.component_name), 1)], 64))
            : _createCommentVNode("", true)]))
        : _createCommentVNode("", true),
      _createElementVNode("section", { class: "panel x-card diary-navigation" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Rotina pedagógica"), _createElementVNode("p", null, "Aulas, frequência e avaliações por turma.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
        class: "btn btn-secondary",
        onClick: load
      }, "Atualizar", 8, ["onClick"])])]), pilot
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("nav", {
            class: "diary-links",
            "aria-label": "Áreas do Diário"
          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(navigation, (group) => {
            return (_openBlock(), _createElementBlock("a", {
              key: group.label,
              href: pageLink(group.pages[0].id),
              onClick: _withModifiers($event => (go(group.pages[0].id)), ["exact","prevent"]),
              "aria-current": group.label===activeGroup?.label?'true':null
            }, _toDisplayString(group.label), 9, ["href", "onClick", "aria-current"]))
          }), 128))]), activeGroup
            ? (_openBlock(), _createElementBlock("nav", {
                key: 0,
                class: "diary-links",
                "aria-label": "Subguias do Diário"
              }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeGroup.pages, (page) => {
                return (_openBlock(), _createElementBlock("a", {
                  key: page.id,
                  href: pageLink(page.id),
                  onClick: _withModifiers($event => (go(page.id)), ["exact","prevent"]),
                  "aria-current": state.page===page.id?'page':null
                }, _toDisplayString(page.label), 9, ["href", "onClick", "aria-current"]))
              }), 128))]))
            : _createCommentVNode("", true), (state.selected)
            ? (_openBlock(), _createElementBlock("button", {
                key: 1,
                class: "btn btn-secondary",
                onClick: chooseAnother
              }, "Trocar diário", 8, ["onClick"]))
            : _createCommentVNode("", true)], 64))
        : (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "tabs"
          }, [
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='dashboard'}),
              onClick: $event => (state.tab='dashboard')
            }, "Pendências", 10, ["onClick"]),
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='diaries'}),
              onClick: $event => (state.tab='diaries')
            }, "Diários", 10, ["onClick"]),
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='planning'}),
              onClick: $event => (state.tab='planning')
            }, "Planejamento", 10, ["onClick"]),
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='assessments'}),
              onClick: $event => (state.tab='assessments')
            }, "Avaliações", 10, ["onClick"]),
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='opinions'}),
              onClick: $event => (state.tab='opinions')
            }, "Pareceres", 10, ["onClick"]),
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='records'}),
              onClick: $event => (state.tab='records')
            }, "Registros pedagógicos", 10, ["onClick"]),
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='occurrences'}),
              onClick: $event => (state.tab='occurrences')
            }, "Ocorrências", 10, ["onClick"]),
            _createElementVNode("button", {
              class: _normalizeClass({active:state.tab==='materials'}),
              onClick: $event => (state.tab='materials')
            }, "Materiais da turma", 10, ["onClick"]),
            (can('communications.send'))
              ? (_openBlock(), _createElementBlock("button", {
                  key: 0,
                  class: _normalizeClass({active:state.tab==='communications'}),
                  onClick: $event => (state.tab='communications')
                }, "Comunicações", 10, ["onClick"]))
              : _createCommentVNode("", true),
            (can('diary.configure'))
              ? (_openBlock(), _createElementBlock("button", {
                  key: 1,
                  class: _normalizeClass({active:state.tab==='setup'}),
                  onClick: $event => (state.tab='setup')
                }, "Configuração", 10, ["onClick"]))
              : _createCommentVNode("", true)
          ]))]),
      (state.tab==='materials')
        ? (_openBlock(), _createElementBlock("section", {
            key: 1,
            class: "panel x-card"
          }, [_createElementVNode("h2", null, "Materiais da turma"), (!state.selected)
            ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Abra o diário da turma em Diários para publicar ou imprimir."))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                _createElementVNode("h3", null, _toDisplayString(state.selected.class_name) + " · " + _toDisplayString(state.selected.component_name), 1),
                (can('diary.write') && state.selected.status==='open')
                  ? (_openBlock(), _createElementBlock("form", {
                      key: 0,
                      class: "x-form",
                      onSubmit: _withModifiers($event => (save(publishMaterial)), ["prevent"])
                    }, [
                      _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Tipo de material"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.materialForm.kind) = $event) }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['Atividade','Trabalho','Orientação','Aviso'], (k) => {
                        return (_openBlock(), _createElementBlock("option", { key: k }, _toDisplayString(k), 1))
                      }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.materialForm.kind]])]), _createElementVNode("label", null, [_createTextVNode("Destinatário"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.materialForm.enrollment_id) = $event) }, [_createElementVNode("option", { value: "" }, "Toda a turma"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList((state.selected.roster||[]).filter(x=>x.enrollment_status==='active'), (r) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: r.enrollment_id,
                          value: r.enrollment_id
                        }, _toDisplayString(r.name), 9, ["value"]))
                      }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.materialForm.enrollment_id]])])]),
                      _createElementVNode("label", null, [_createTextVNode("Título do material"), _withDirectives(_createElementVNode("input", {
                        required: "",
                        minlength: "2",
                        maxlength: "160",
                        "onUpdate:modelValue": $event => ((state.materialForm.title) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.materialForm.title]])]),
                      _createElementVNode("label", null, [_createTextVNode("Conteúdo para a família"), _withDirectives(_createElementVNode("textarea", {
                        required: "",
                        minlength: "2",
                        maxlength: "8000",
                        rows: "5",
                        "onUpdate:modelValue": $event => ((state.materialForm.body) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.materialForm.body]])]),
                      _createElementVNode("button", { class: "btn btn-primary" }, "Publicar material")
                    ], 40, ["onSubmit"]))
                  : _createCommentVNode("", true),
                _createElementVNode("h3", null, "Materiais publicados"),
                (!state.materials.length)
                  ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Nenhum material publicado neste diário."))
                  : _createCommentVNode("", true),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.materials, (item) => {
                  return (_openBlock(), _createElementBlock("article", {
                    key: item.id,
                    class: "family-line"
                  }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(item.title), 1), _createElementVNode("p", null, _toDisplayString(item.kind) + " · " + _toDisplayString(item.enrollment_id?(state.selected.roster||[]).find(r=>r.enrollment_id===item.enrollment_id)?.name||'Individual':'Toda a turma'), 1)]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (printMaterial(item.id))
                  }, "Baixar para imprimir", 8, ["onClick"])]))
                }), 128))
              ], 64))]))
        : _createCommentVNode("", true),
      _createElementVNode("details", { class: "panel x-card diary-help" }, [_createElementVNode("summary", null, "Como usar o Diário"), _createElementVNode("ol", null, [
        _createElementVNode("li", null, [_createTextVNode("Em "), _createElementVNode("strong", null, "Configuração"), _createTextVNode(", cadastre períodos e componentes e abra o diário da turma.")]),
        _createElementVNode("li", null, "Selecione o diário, registre a aula e abra a chamada."),
        _createElementVNode("li", null, [_createTextVNode("Em "), _createElementVNode("strong", null, "Avaliações"), _createTextVNode(", lance os resultados. A coordenação define a regra e consolida o período.")]),
        _createElementVNode("li", null, "Preencha os demais registros e envie o diário para revisão antes do fechamento."),
        _createElementVNode("li", null, "As comunicações ficam disponíveis no portal para responsáveis com acesso autorizado.")
      ]), _createElementVNode("p", { class: "muted" }, [_createTextVNode("Alunos da chamada precisam estar matriculados na turma. "), (!props.teacherPortal)
        ? (_openBlock(), _createElementBlock("a", {
            key: 0,
            href: "#/help"
          }, "Consultar o guia de uso"))
        : (_openBlock(), _createElementBlock("span", { key: 1 }, "Em caso de divergência na lista, procure a Secretaria."))])]),
      (state.tab==='setup' && can('diary.configure'))
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
            _createElementVNode("div", { class: "x-grid" }, [(show('setup'))
              ? (_openBlock(), _createElementBlock("section", {
                  key: 0,
                  class: "panel x-card"
                }, [
                  _createElementVNode("h2", null, "Períodos letivos"),
                  (!state.academicYears.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "alert info"
                      }, [_createTextVNode("Cadastre um ano letivo em "), _createElementVNode("a", { href: "#/academic" }, "Estrutura acadêmica"), _createTextVNode(" antes de criar períodos para o Diário.")]))
                    : _createCommentVNode("", true),
                  _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(createPeriod)), ["prevent"])
                  }, [
                    _createElementVNode("label", null, [_createTextVNode("Ano letivo"), _withDirectives(_createElementVNode("select", {
                      "onUpdate:modelValue": $event => ((state.periodForm.academic_year_id) = $event),
                      onChange: $event => (state.periodForm.class_group_id=''),
                      required: ""
                    }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.academicYears, (year) => {
                      return (_openBlock(), _createElementBlock("option", {
                        key: year.id,
                        value: year.id
                      }, _toDisplayString(year.name) + " · " + _toDisplayString(date(year.starts_on)) + " a " + _toDisplayString(date(year.ends_on)), 9, ["value"]))
                    }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.periodForm.academic_year_id]])]),
                    _createElementVNode("label", null, [_createTextVNode("Calendário da turma"), _withDirectives(_createElementVNode("select", {
                      "onUpdate:modelValue": $event => ((state.periodForm.class_group_id) = $event),
                      onChange: loadCalendar
                    }, [_createElementVNode("option", { value: "" }, "Padrão do ano letivo"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.groups.filter(g=>g.academic_year_id===state.periodForm.academic_year_id), (g) => {
                      return (_openBlock(), _createElementBlock("option", {
                        value: g.id,
                        key: g.id
                      }, _toDisplayString(g.name), 9, ["value"]))
                    }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.periodForm.class_group_id]])]),
                    _createElementVNode("label", null, [_createTextVNode("Nome"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.periodForm.name) = $event),
                      required: "",
                      maxlength: "80",
                      placeholder: "Ex.: 1º bimestre"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.periodForm.name]])]),
                    _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Início"), _withDirectives(_createElementVNode("input", {
                      type: "date",
                      "onUpdate:modelValue": $event => ((state.periodForm.starts_on) = $event),
                      required: ""
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.periodForm.starts_on]])]), _createElementVNode("label", null, [_createTextVNode("Fim"), _withDirectives(_createElementVNode("input", {
                      type: "date",
                      "onUpdate:modelValue": $event => ((state.periodForm.ends_on) = $event),
                      required: ""
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.periodForm.ends_on]])])]),
                    _createElementVNode("label", null, [_createTextVNode("Ordem"), _withDirectives(_createElementVNode("input", {
                      type: "number",
                      min: "1",
                      max: "30",
                      "onUpdate:modelValue": $event => ((state.periodForm.order_index) = $event)
                    }, null, 8, ["onUpdate:modelValue"]), [[
                      _vModelText,
                      state.periodForm.order_index,
                      void 0,
                      { number: true }
                    ]])]),
                    _createElementVNode("button", {
                      class: "btn btn-primary",
                      disabled: !state.academicYears.length
                    }, "Criar período", 8, ["disabled"])
                  ], 40, ["onSubmit"]),
                  (state.periodForm.class_group_id)
                    ? (_openBlock(), _createElementBlock("fieldset", { key: 1 }, [_createElementVNode("legend", null, "Períodos desta turma"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(p=>p.academic_year_id===state.periodForm.academic_year_id), (p) => {
                        return (_openBlock(), _createElementBlock("label", { key: p.id }, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          value: p.id,
                          "onUpdate:modelValue": $event => ((state.calendarIds) = $event)
                        }, null, 8, ["value", "onUpdate:modelValue"]), [[_vModelCheckbox, state.calendarIds]]), _createTextVNode(_toDisplayString(p.name), 1)]))
                      }), 128)), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        disabled: !state.calendarIds.length || state.busy,
                        onClick: saveCalendar
                      }, "Aplicar calendário à turma", 8, ["disabled", "onClick"])]))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods, (p) => {
                    return (_openBlock(), _createElementBlock("div", {
                      key: p.id,
                      class: "x-record"
                    }, [_createElementVNode("strong", null, _toDisplayString(p.name), 1), _createElementVNode("span", null, _toDisplayString(date(p.starts_on)) + " a " + _toDisplayString(date(p.ends_on)), 1)]))
                  }), 128))])
                ]))
              : _createCommentVNode("", true), (show('components'))
              ? (_openBlock(), _createElementBlock("section", {
                  key: 1,
                  class: "panel x-card"
                }, [
                  _createElementVNode("h2", {
                    id: "diary-component-heading",
                    tabindex: "-1"
                  }, "Componentes curriculares"),
                  _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(createComponent)), ["prevent"])
                  }, [
                    _createElementVNode("label", null, [_createTextVNode("Nome"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.componentForm.name) = $event),
                      required: "",
                      maxlength: "120",
                      placeholder: "Ex.: Língua Portuguesa"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.componentForm.name]])]),
                    _createElementVNode("label", null, [_createTextVNode("Código"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.componentForm.code) = $event),
                      maxlength: "40"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.componentForm.code]])]),
                    _createElementVNode("label", null, [_createTextVNode("Carga horária"), _withDirectives(_createElementVNode("input", {
                      type: "number",
                      min: "0",
                      "onUpdate:modelValue": $event => ((state.componentForm.workload_hours) = $event)
                    }, null, 8, ["onUpdate:modelValue"]), [[
                      _vModelText,
                      state.componentForm.workload_hours,
                      void 0,
                      { number: true }
                    ]])]),
                    _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", { class: "btn btn-primary" }, _toDisplayString(state.componentEditing?'Salvar alterações':'Criar componente'), 1), (state.componentEditing)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          type: "button",
                          class: "btn btn-secondary",
                          onClick: resetComponent
                        }, "Cancelar edição", 8, ["onClick"]))
                      : _createCommentVNode("", true)])
                  ], 40, ["onSubmit"]),
                  _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.components, (c) => {
                    return (_openBlock(), _createElementBlock("div", {
                      key: c.id,
                      class: "x-record"
                    }, [_createElementVNode("strong", null, _toDisplayString(c.name), 1), _createElementVNode("span", null, _toDisplayString(c.code||'Sem código') + " · " + _toDisplayString(c.workload_hours||0) + "h · " + _toDisplayString(c.active?'Ativo':'Inativo'), 1), (c.active)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "actions"
                        }, [_createElementVNode("button", {
                          class: "btn btn-secondary",
                          "aria-label": 'Editar '+c.name,
                          onClick: $event => (editComponent(c))
                        }, "Editar", 8, ["aria-label", "onClick"]), _createElementVNode("button", {
                          class: "btn btn-secondary",
                          "aria-label": 'Retirar '+c.name,
                          onClick: $event => {state.removalTarget=c;state.removalReason=''}
                        }, "Retirar", 8, ["aria-label", "onClick"])]))
                      : _createCommentVNode("", true)]))
                  }), 128))]),
                  (state.removalTarget)
                    ? (_openBlock(), _createElementBlock("form", {
                        key: 0,
                        class: "x-form",
                        onSubmit: _withModifiers($event => (save(removeComponent)), ["prevent"])
                      }, [
                        _createElementVNode("h3", null, "Retirar " + _toDisplayString(state.removalTarget.name), 1),
                        _createElementVNode("p", null, "Componentes vinculados a registros serão desativados. Componentes sem vínculos serão excluídos."),
                        _createElementVNode("label", null, [_createTextVNode("Justificativa"), _withDirectives(_createElementVNode("textarea", {
                          "onUpdate:modelValue": $event => ((state.removalReason) = $event),
                          required: "",
                          minlength: "3",
                          maxlength: "1000"
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.removalReason]])]),
                        _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", { class: "btn btn-primary" }, "Confirmar retirada"), _createElementVNode("button", {
                          type: "button",
                          class: "btn btn-secondary",
                          onClick: $event => (state.removalTarget=null)
                        }, "Cancelar", 8, ["onClick"])])
                      ], 40, ["onSubmit"]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true)]),
            (show('components'))
              ? (_openBlock(), _createElementBlock("section", {
                  key: 0,
                  class: "panel x-card"
                }, [
                  _createElementVNode("h2", null, "Composição de aulas e planejamentos"),
                  _createElementVNode("p", null, "Edite os nomes e a ordem dos campos usados pelos professores desta escola. Retirar um campo preserva os valores já registrados."),
                  _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers(addField, ["prevent"])
                  }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Ficha"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.newFieldScope) = $event) }, [_createElementVNode("option", { value: "lesson" }, "Aula"), _createElementVNode("option", { value: "plan" }, "Planejamento")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.newFieldScope]])]), _createElementVNode("label", null, [_createTextVNode("Nome do novo campo"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.newFieldLabel) = $event),
                    required: "",
                    minlength: "2",
                    maxlength: "100"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.newFieldLabel]])])]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    disabled: state.configFields.length>=40
                  }, "Adicionar campo", 8, ["disabled"])], 40, ["onSubmit"]),
                  (restorableFields.length)
                    ? (_openBlock(), _createElementBlock("form", {
                        key: 0,
                        class: "x-form",
                        onSubmit: _withModifiers(restoreField, ["prevent"])
                      }, [_createElementVNode("label", null, [_createTextVNode("Restaurar campo padrão"), _withDirectives(_createElementVNode("select", {
                        "onUpdate:modelValue": $event => ((state.restoreFieldId) = $event),
                        required: ""
                      }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(restorableFields, (id) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: id,
                          value: id
                        }, _toDisplayString(id.startsWith('standard-plan-')?'Planejamento':'Aula') + " · " + _toDisplayString(state.fields.standard_labels[id]), 9, ["value"]))
                      }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.restoreFieldId]])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Restaurar campo")], 40, ["onSubmit"]))
                    : _createCommentVNode("", true),
                  _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(saveFields)), ["prevent"])
                  }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.configFields, (field, index) => {
                    return (_openBlock(), _createElementBlock("div", {
                      key: field.id,
                      class: "x-record"
                    }, [_createElementVNode("label", null, [_createTextVNode(_toDisplayString(field.scope==='lesson'?'Aula':'Planejamento') + " · campo " + _toDisplayString(index+1), 1), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((field.label) = $event),
                      required: "",
                      minlength: "2",
                      maxlength: "100"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, field.label]])]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                      type: "button",
                      class: "btn btn-secondary",
                      onClick: $event => (moveField(index,-1)),
                      disabled: index===0,
                      "aria-label": 'Mover '+field.label+' para cima'
                    }, "Subir", 8, ["onClick", "disabled", "aria-label"]), _createElementVNode("button", {
                      type: "button",
                      class: "btn btn-secondary",
                      onClick: $event => (moveField(index,1)),
                      disabled: index===state.configFields.length-1,
                      "aria-label": 'Mover '+field.label+' para baixo'
                    }, "Descer", 8, ["onClick", "disabled", "aria-label"]), _createElementVNode("button", {
                      type: "button",
                      class: "btn btn-secondary",
                      onClick: $event => (state.configFields.splice(index,1)),
                      "aria-label": 'Retirar campo '+field.label
                    }, "Retirar campo", 8, ["onClick", "aria-label"])])]))
                  }), 128)), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                    class: "btn btn-primary",
                    disabled: !compositionDirty
                  }, "Salvar composição", 8, ["disabled"]), compositionDirty
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        type: "button",
                        class: "btn btn-secondary",
                        onClick: $event => (setComposition(state.fields))
                      }, "Descartar alterações na composição", 8, ["onClick"]))
                    : _createCommentVNode("", true)])], 40, ["onSubmit"])
                ]))
              : _createCommentVNode("", true),
            (pilot && props.catalogEnabled && state.page==='catalog')
              ? (_openBlock(), _createElementBlock("section", {
                  key: 1,
                  class: "panel x-card"
                }, [
                  _createElementVNode("h2", null, "Catálogo e vigência"),
                  _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(suggest)), ["prevent"])
                  }, [
                    _createElementVNode("label", null, [_createTextVNode("Nome sugerido"), _withDirectives(_createElementVNode("input", {
                      required: "",
                      minlength: "2",
                      maxlength: "120",
                      list: "curriculum-suggestions",
                      "onUpdate:modelValue": $event => ((catalog.name) = $event)
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, catalog.name]])]),
                    _createElementVNode("datalist", { id: "curriculum-suggestions" }, [_createElementVNode("option", { value: "Projeto de Leitura" }), _createElementVNode("option", { value: "Oficina de Artes" })]),
                    _createElementVNode("label", null, [_createTextVNode("Código interno"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((catalog.code) = $event),
                      maxlength: "40"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, catalog.code]])]),
                    _createElementVNode("label", null, [_createTextVNode("Carga horária planejada"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((catalog.hours) = $event),
                      type: "number",
                      min: "0",
                      max: "10000"
                    }, null, 8, ["onUpdate:modelValue"]), [[
                      _vModelText,
                      catalog.hours,
                      void 0,
                      { number: true }
                    ]])]),
                    _createElementVNode("button", { class: "btn btn-primary" }, "Guardar sugestão")
                  ], 40, ["onSubmit"]),
                  _createElementVNode("label", null, [_createTextVNode("Componente para conferência"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((catalog.target) = $event),
                    onChange: catalogImpact
                  }, [_createElementVNode("option", { value: "" }, "Selecione"), _createElementVNode("optgroup", { label: "Em rascunho" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(catalog.drafts, (c) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: c.id,
                      value: c.id
                    }, _toDisplayString(c.name), 9, ["value"]))
                  }), 128))]), _createElementVNode("optgroup", { label: "Cadastrados" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.components, (c) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: c.id,
                      value: c.id
                    }, _toDisplayString(c.name), 9, ["value"]))
                  }), 128))])], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, catalog.target]])]),
                  (catalog.impact)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: "x-form"
                      }, [(catalog.impact.effective_on)
                        ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Desativado em " + _toDisplayString(date(catalog.impact.effective_on)) + ".", 1))
                        : (catalog.impact.catalog_status==='draft')
                          ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Rascunho aguardando decisão."))
                          : (_openBlock(), _createElementBlock("p", { key: 2 }, "A desativação vale a partir da data de registro e preserva o histórico.")), (catalog.impact.references.length)
                        ? (_openBlock(), _createElementBlock("ul", { key: 3 }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(catalog.impact.references, (dep) => {
                            return (_openBlock(), _createElementBlock("li", { key: dep.key }, _toDisplayString(dep.label) + " · " + _toDisplayString(dep.count), 1))
                          }), 128))]))
                        : (_openBlock(), _createElementBlock("p", { key: 4 }, "Sem vínculos registrados.")), (!catalog.impact.effective_on)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 5 }, [_createElementVNode("label", null, [_createTextVNode("Justificativa da decisão"), _withDirectives(_createElementVNode("textarea", {
                            "onUpdate:modelValue": $event => ((catalog.reason) = $event),
                            minlength: "3",
                            maxlength: "1000"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, catalog.reason]])]), _createElementVNode("div", { class: "actions" }, [(catalog.impact.catalog_status==='draft')
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-primary",
                                disabled: catalog.reason.trim().length<3,
                                onClick: $event => (save(()=>decide('publish')))
                              }, "Publicar componente", 8, ["disabled", "onClick"]))
                            : _createCommentVNode("", true), (catalog.impact.discard_allowed)
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 1,
                                class: "btn btn-secondary",
                                disabled: catalog.reason.trim().length<3,
                                onClick: $event => (save(()=>decide('discard')))
                              }, "Descartar rascunho", 8, ["disabled", "onClick"]))
                            : _createCommentVNode("", true), (catalog.impact.catalog_status==='available')
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 2,
                                class: "btn btn-secondary",
                                disabled: catalog.reason.trim().length<3,
                                onClick: $event => (save(()=>decide('retire')))
                              }, "Desativar componente", 8, ["disabled", "onClick"]))
                            : _createCommentVNode("", true)])], 64))
                        : _createCommentVNode("", true)]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true),
            (show('new-diary'))
              ? (_openBlock(), _createElementBlock("section", {
                  key: 2,
                  class: "panel x-card"
                }, [_createElementVNode("h2", {
                  id: "diary-assignment-heading",
                  tabindex: "-1"
                }, "Abrir diário ou vincular professor"), _createElementVNode("form", {
                  class: "x-form",
                  onSubmit: _withModifiers($event => (save(createDiary)), ["prevent"])
                }, [
                  _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Turma"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((state.diaryForm.class_group_id) = $event),
                    onChange: syncDiaryAssignment,
                    required: ""
                  }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.groups, (g) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: g.id,
                      value: g.id
                    }, _toDisplayString(g.name), 9, ["value"]))
                  }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.diaryForm.class_group_id]])]), _createElementVNode("label", null, [_createTextVNode("Componente"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((state.diaryForm.component_id) = $event),
                    onChange: syncDiaryAssignment,
                    required: ""
                  }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.components.filter(row=>row.active), (c) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: c.id,
                      value: c.id
                    }, _toDisplayString(c.name), 9, ["value"]))
                  }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.diaryForm.component_id]])]), _createElementVNode("label", null, [_createTextVNode("Atribuição docente"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((state.diaryForm.teacher_assignment_id) = $event),
                    onChange: $event => (state.teacherPersonId=''),
                    disabled: !state.diaryForm.component_id || !can('staff.assignments.read')
                  }, [_createElementVNode("option", { value: "" }, "Sem atribuição definida"), (existingDiary?.teacher_assignment_id && !matchingAssignments.some(a=>a.id===existingDiary.teacher_assignment_id))
                    ? (_openBlock(), _createElementBlock("option", {
                        key: 0,
                        value: existingDiary.teacher_assignment_id,
                        disabled: ""
                      }, _toDisplayString(existingDiary.teacher_name) + " · Atribuição anterior", 9, ["value"]))
                    : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matchingAssignments, (a) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: a.id,
                      value: a.id
                    }, _toDisplayString(a.teacher_name) + " · " + _toDisplayString(a.subject_name||'Turma'), 9, ["value"]))
                  }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, state.diaryForm.teacher_assignment_id]])])]),
                  (can('staff.assignments.write') && can('people.read') && state.diaryForm.class_group_id && state.diaryForm.component_id && (!existingDiary || existingDiary.status==='open'))
                    ? (_openBlock(), _createElementBlock("fieldset", { key: 0 }, [
                        _createElementVNode("legend", null, "Vincular professor do cadastro"),
                        _createElementVNode("label", null, [_createTextVNode("Buscar professor por nome ou registro"), _withDirectives(_createElementVNode("input", {
                          type: "search",
                          "onUpdate:modelValue": $event => ((state.teacherSearch) = $event),
                          onInput: resetTeacherSearch,
                          onKeydown: _withKeys(_withModifiers(searchTeachers, ["prevent"]), ["enter"]),
                          maxlength: "160"
                        }, null, 40, ["onUpdate:modelValue", "onInput", "onKeydown"]), [[_vModelText, state.teacherSearch]])]),
                        _createElementVNode("button", {
                          class: "btn btn-secondary",
                          type: "button",
                          onClick: searchTeachers,
                          disabled: state.teacherSearch.trim().length<2 || state.busy
                        }, "Pesquisar professores", 8, ["onClick", "disabled"]),
                        (state.teacherResults.length)
                          ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Professor cadastrado"), _withDirectives(_createElementVNode("select", {
                              "onUpdate:modelValue": $event => ((state.teacherPersonId) = $event),
                              onChange: $event => (state.diaryForm.teacher_assignment_id='')
                            }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.teacherResults, (t) => {
                              return (_openBlock(), _createElementBlock("option", {
                                key: t.person.id,
                                value: t.person.id
                              }, _toDisplayString(t.person.name) + _toDisplayString(t.registration_number?' · '+t.registration_number:''), 9, ["value"]))
                            }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.teacherPersonId]])]))
                          : (state.teacherSearched)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 1,
                                role: "status"
                              }, "Nenhum professor ativo encontrado para esta busca."))
                            : _createCommentVNode("", true)
                      ]))
                    : _createCommentVNode("", true),
                  (!state.groups.length || !state.components.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 1,
                        class: "alert info"
                      }, [_createTextVNode("Antes de abrir o diário, cadastre uma turma em "), _createElementVNode("a", { href: "#/academic" }, "Estrutura acadêmica"), _createTextVNode(" e crie o componente curricular nesta aba.")]))
                    : _createCommentVNode("", true),
                  existingDiary
                    ? (_openBlock(), _createElementBlock("p", { key: 2 }, "Diário " + _toDisplayString(label(existingDiary.status)) + " · " + _toDisplayString(existingDiary.teacher_name||'Professor não definido') + ".", 1))
                    : (_openBlock(), _createElementBlock("label", { key: 3 }, [_createTextVNode("Observações"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.diaryForm.notes) = $event),
                        rows: "2",
                        maxlength: "4000"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.diaryForm.notes]])])),
                  _createElementVNode("button", {
                    class: "btn btn-primary",
                    disabled: !state.groups.length || !state.components.length || (existingDiary && (existingDiary.status!=='open' || !can('staff.assignments.write') || (!state.teacherPersonId && state.diaryForm.teacher_assignment_id===(existingDiary.teacher_assignment_id||''))))
                  }, _toDisplayString(existingDiary?'Salvar vínculo docente':'Abrir diário'), 9, ["disabled"])
                ], 40, ["onSubmit"])]))
              : _createCommentVNode("", true)
          ], 64))
        : _createCommentVNode("", true),
      (state.tab==='dashboard')
        ? (_openBlock(), _createElementBlock("section", {
            key: 3,
            class: "panel x-card"
          }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Pendências do Diário"), _createElementVNode("p", null, "Chamadas, resultados, consolidações e revisão de ocorrências.")]), _createElementVNode("button", {
            class: "btn btn-secondary",
            onClick: load
          }, "Atualizar", 8, ["onClick"])]), _createElementVNode("div", { class: "stats-grid" }, [
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Diários"), _createElementVNode("strong", null, _toDisplayString(state.dashboard.totals.diaries||0), 1)]),
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Chamadas"), _createElementVNode("strong", null, _toDisplayString(state.dashboard.totals.lessons_without_complete_attendance||0), 1)]),
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Resultados"), _createElementVNode("strong", null, _toDisplayString(state.dashboard.totals.assessment_results_pending||0), 1)]),
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Consolidações"), _createElementVNode("strong", null, _toDisplayString(state.dashboard.totals.consolidation_results_pending||0), 1)]),
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Ocorrências a revisar"), _createElementVNode("strong", null, _toDisplayString(state.dashboard.totals.occurrences_pending_review||0), 1)])
          ]), _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.dashboard.items, (d) => {
            return (_openBlock(), _createElementBlock("button", {
              key: d.id,
              class: "x-record",
              onClick: $event => {pilot ? go('diaries') : state.tab='diaries';selectDiary(d)}
            }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(d.class_name) + " · " + _toDisplayString(d.component_name), 1), _createElementVNode("span", null, _toDisplayString(d.year_name) + " · " + _toDisplayString(label(d.status)), 1)]), _createElementVNode("span", null, "Chamada: " + _toDisplayString(d.pending.lessons_without_complete_attendance) + " · Avaliação: " + _toDisplayString(d.pending.assessment_results_pending) + " · Consolidação: " + _toDisplayString(d.pending.consolidation_results_pending) + " · Ocorrências: " + _toDisplayString(d.pending.occurrences_pending_review), 1)], 8, ["onClick"]))
          }), 128))])]))
        : _createCommentVNode("", true),
      (!state.selected && (state.tab==='diaries' || (pilot && !['dashboard','setup'].includes(state.tab))))
        ? (_openBlock(), _createElementBlock("section", {
            key: 4,
            class: "panel x-card"
          }, [
            _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Diários disponíveis"), _createElementVNode("p", null, "Selecione a turma para continuar.")])]),
            (!state.diaries.length)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "empty"
                }, [_createElementVNode("p", null, "Nenhum diário disponível para esta escola."), _createElementVNode("p", null, [_createTextVNode("Se você tiver permissão de configuração, crie períodos e componentes na aba "), _createElementVNode("strong", null, "Configuração"), _createTextVNode(". Para o Professor, a Coordenação deve vincular sua atribuição docente ao diário da turma e do componente.")]), (can('diary.configure'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn btn-secondary",
                      onClick: $event => (pilot ? go('setup') : state.tab='setup')
                    }, "Abrir configuração", 8, ["onClick"]))
                  : _createCommentVNode("", true)]))
              : _createCommentVNode("", true),
            pilot
              ? (_openBlock(), _createElementBlock("label", { key: 1 }, [_createTextVNode("Filtrar diários por ano, turma, componente ou professor"), _withDirectives(_createElementVNode("input", {
                  type: "search",
                  "onUpdate:modelValue": $event => ((state.diaryFilter) = $event)
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.diaryFilter]])]))
              : _createCommentVNode("", true),
            (pilot && state.diaries.length && !filteredDiaries.length)
              ? (_openBlock(), _createElementBlock("p", { key: 2 }, "Nenhum diário corresponde ao filtro."))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList((pilot ? filteredDiaries : state.diaries), (d) => {
              return (_openBlock(), _createElementBlock("button", {
                key: d.id,
                class: "x-record",
                onClick: $event => (selectDiary(d))
              }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(d.class_name) + " · " + _toDisplayString(d.component_name), 1), _createElementVNode("span", null, _toDisplayString(d.year_name) + " · " + _toDisplayString(d.teacher_name||'Professor não definido'), 1)]), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(d.status)), 1), _createElementVNode("span", null, "→")], 8, ["onClick"]))
            }), 128))])
          ]))
        : _createCommentVNode("", true),
      (state.tab==='diaries')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 5 }, [(state.selected)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                (show('diaries','review'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 0,
                      class: "panel x-card"
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(state.selected.year_name) + " · " + _toDisplayString(state.selected.class_name), 1), _createElementVNode("h2", null, _toDisplayString(state.selected.component_name), 1), _createElementVNode("p", null, [_createTextVNode(_toDisplayString(state.selected.teacher_name||'Professor não definido') + " · ", 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(state.selected.status)), 1)])]), _createElementVNode("div", { class: "actions" }, [(can('diary.configure') && can('staff.assignments.write') && state.selected.status==='open')
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          class: "btn btn-secondary",
                          onClick: $event => (configureTeacher(state.selected))
                        }, "Vincular professor", 8, ["onClick"]))
                      : _createCommentVNode("", true), (!pilot)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 1,
                          class: "btn btn-secondary",
                          onClick: chooseAnother
                        }, "← Voltar", 8, ["onClick"]))
                      : _createCommentVNode("", true), (can('diary.reports'))
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 2,
                          class: "btn btn-secondary",
                          onClick: report
                        }, "Baixar PDF", 8, ["onClick"]))
                      : _createCommentVNode("", true)])]), (state.summary)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "stats-grid"
                        }, [
                          _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Registros de aula"), _createElementVNode("strong", null, _toDisplayString(state.summary.lessons), 1), _createElementVNode("small", null, _toDisplayString(state.summary.lesson_count) + " aula(s)", 1)]),
                          _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Alunos"), _createElementVNode("strong", null, _toDisplayString(state.summary.roster), 1), _createElementVNode("small", null, "matrículas ativas/suspensas")]),
                          _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Faltas"), _createElementVNode("strong", null, _toDisplayString(state.summary.absences), 1), _createElementVNode("small", null, "não justificadas")]),
                          _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Faltas justificadas"), _createElementVNode("strong", null, _toDisplayString(state.summary.justified_absences), 1), _createElementVNode("small", null, "registros atuais")])
                        ]))
                      : _createCommentVNode("", true)]))
                  : _createCommentVNode("", true),
                (show('reports') && can('diary.reports'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 1,
                      class: "panel x-card"
                    }, [_createElementVNode("h2", null, "Relatórios oficiais"), _createElementVNode("div", { class: "x-grid" }, [
                      _createElementVNode("label", null, [_createTextVNode("Relatório"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.reportType) = $event) }, [
                        _createElementVNode("option", { value: "class_diary" }, "Diário da turma/componente"),
                        _createElementVNode("option", { value: "lessons" }, "Registro de aulas"),
                        _createElementVNode("option", { value: "attendance" }, "Mapa de frequência por aula"),
                        _createElementVNode("option", { value: "pedagogical_register" }, "Registro pedagógico"),
                        _createElementVNode("option", { value: "assessments" }, "Mapa de avaliações/notas/conceitos"),
                        _createElementVNode("option", { value: "opinions" }, "Pareceres descritivos"),
                        _createElementVNode("option", { value: "occurrences" }, "Ocorrências pedagógicas"),
                        _createElementVNode("option", { value: "communications" }, "Comunicações à família"),
                        _createElementVNode("option", { value: "student_record" }, "Ficha individual"),
                        _createElementVNode("option", { value: "period_consolidation" }, "Consolidação por período"),
                        _createElementVNode("option", { value: "closure" }, "Relatório de fechamento"),
                        _createElementVNode("option", { value: "pending" }, "Relatório de pendências"),
                        _createElementVNode("option", { value: "revision_history" }, "Histórico de retificações"),
                        _createElementVNode("option", { value: "audit_validation" }, "Auditoria e validação")
                      ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.reportType]])]),
                      (['period_consolidation','class_diary','attendance','pedagogical_register','assessments','opinions','occurrences','communications','student_record'].includes(state.reportType))
                        ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.reportPeriod) = $event) }, [_createElementVNode("option", { value: "" }, "Todos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                            return (_openBlock(), _createElementBlock("option", {
                              key: p.id,
                              value: p.id
                            }, _toDisplayString(p.name), 9, ["value"]))
                          }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.reportPeriod]])]))
                        : _createCommentVNode("", true),
                      (['attendance','pedagogical_register'].includes(state.reportType))
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("label", null, [_createTextVNode("De"), _withDirectives(_createElementVNode("input", {
                            type: "date",
                            "onUpdate:modelValue": $event => ((state.reportFrom) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reportFrom]])]), _createElementVNode("label", null, [_createTextVNode("Até"), _withDirectives(_createElementVNode("input", {
                            type: "date",
                            "onUpdate:modelValue": $event => ((state.reportTo) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reportTo]])])], 64))
                        : _createCommentVNode("", true),
                      (state.reportType==='student_record')
                        ? (_openBlock(), _createElementBlock("label", { key: 2 }, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.reportEnrollment) = $event) }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.roster||[], (r) => {
                            return (_openBlock(), _createElementBlock("option", {
                              key: r.enrollment_id,
                              value: r.enrollment_id
                            }, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 9, ["value"]))
                          }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.reportEnrollment]])]))
                        : _createCommentVNode("", true)
                    ]), _createElementVNode("button", {
                      class: "btn btn-primary",
                      onClick: report,
                      disabled: (state.reportType==='period_consolidation'&&!state.reportPeriod)||(state.reportType==='student_record'&&!state.reportEnrollment)
                    }, "Baixar PDF", 8, ["onClick", "disabled"])]))
                  : _createCommentVNode("", true),
                (show('diaries') && state.selected.status==='open' && can('diary.write'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 2,
                      class: "panel x-card"
                    }, [_createElementVNode("h2", {
                      id: "diary-lesson-heading",
                      tabindex: "-1"
                    }, _toDisplayString(state.lessonEditing?'Editar aula':'Registrar aula'), 1), _createElementVNode("form", {
                      class: "x-form",
                      onSubmit: _withModifiers($event => (save(createLesson)), ["prevent"])
                    }, [
                      _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Data"), _withDirectives(_createElementVNode("input", {
                        type: "date",
                        "onUpdate:modelValue": $event => ((state.lessonForm.lesson_date) = $event),
                        required: ""
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonForm.lesson_date]])]), _createElementVNode("label", null, [_createTextVNode("Quantidade de aulas"), _withDirectives(_createElementVNode("input", {
                        type: "number",
                        min: "1",
                        max: "20",
                        "onUpdate:modelValue": $event => ((state.lessonForm.lesson_count) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[
                        _vModelText,
                        state.lessonForm.lesson_count,
                        void 0,
                        { number: true }
                      ]])]), _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.lessonForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Sem período"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: p.id,
                          value: p.id
                        }, _toDisplayString(p.name), 9, ["value"]))
                      }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.lessonForm.academic_period_id]])])]),
                      _createElementVNode("label", null, [_createTextVNode("Conteúdo ministrado"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.lessonForm.content) = $event),
                        required: "",
                        minlength: "2",
                        maxlength: "12000",
                        rows: "3"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonForm.content]])]),
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.fields.fields.filter(f=>f.scope==='lesson'), (field) => {
                        return (_openBlock(), _createElementBlock("label", { key: field.id }, [_createTextVNode(_toDisplayString(field.label) + " ", 1), (state.fields.standard_columns[field.id])
                          ? _withDirectives((_openBlock(), _createElementBlock("textarea", {
                              key: 0,
                              "onUpdate:modelValue": $event => ((state.lessonForm[state.fields.standard_columns[field.id]]) = $event),
                              maxlength: state.fields.standard_columns[field.id]==='homework'?4000:6000,
                              rows: "2"
                            }, null, 8, ["onUpdate:modelValue", "maxlength"])), [[_vModelText, state.lessonForm[state.fields.standard_columns[field.id]]]])
                          : _withDirectives((_openBlock(), _createElementBlock("textarea", {
                              key: 1,
                              "onUpdate:modelValue": $event => ((state.lessonValues[field.id]) = $event),
                              maxlength: "4000",
                              rows: "2"
                            }, null, 8, ["onUpdate:modelValue"])), [[_vModelText, state.lessonValues[field.id]]])]))
                      }), 128)),
                      _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", { class: "btn btn-primary" }, _toDisplayString(state.lessonEditing?'Salvar alterações da aula':'Registrar aula'), 1), (state.lessonEditing)
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            type: "button",
                            class: "btn btn-secondary",
                            onClick: resetLesson
                          }, "Cancelar edição", 8, ["onClick"]))
                        : _createCommentVNode("", true), (state.lessonEditing)
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 1,
                            type: "button",
                            class: "btn btn-secondary",
                            onClick: $event => (state.lessonRemoval=true)
                          }, "Remover aula", 8, ["onClick"]))
                        : _createCommentVNode("", true)])
                    ], 40, ["onSubmit"]), (state.lessonRemoval && state.lessonEditing)
                      ? (_openBlock(), _createElementBlock("form", {
                          key: 0,
                          class: "x-form",
                          onSubmit: _withModifiers($event => (save(removeLesson)), ["prevent"])
                        }, [
                          _createElementVNode("h3", null, "Remover aula de " + _toDisplayString(date(state.lessonEditing.lesson_date)), 1),
                          _createElementVNode("p", null, "Somente aulas sem chamada e sem fechamento anterior podem ser removidas."),
                          _createElementVNode("label", null, [_createTextVNode("Justificativa"), _withDirectives(_createElementVNode("textarea", {
                            "onUpdate:modelValue": $event => ((state.lessonRemovalReason) = $event),
                            required: "",
                            minlength: "3",
                            maxlength: "1000"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonRemovalReason]])]),
                          _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", { class: "btn btn-primary" }, "Confirmar remoção da aula"), _createElementVNode("button", {
                            type: "button",
                            class: "btn btn-secondary",
                            onClick: $event => {state.lessonRemoval=false;state.lessonRemovalReason=''}
                          }, "Cancelar remoção", 8, ["onClick"])])
                        ], 40, ["onSubmit"]))
                      : _createCommentVNode("", true)]))
                  : _createCommentVNode("", true),
                (show('diaries','attendance'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 3,
                      class: "panel x-card"
                    }, [
                      _createElementVNode("h2", {
                        id: "diary-lessons-heading",
                        tabindex: "-1"
                      }, "Aulas registradas"),
                      pilot
                        ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Filtrar aulas por período"), _createElementVNode("select", {
                            value: state.lessonPeriod,
                            onChange: filterPeriod
                          }, [_createElementVNode("option", { value: "" }, "Todos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                            return (_openBlock(), _createElementBlock("option", {
                              key: p.id,
                              value: p.id
                            }, _toDisplayString(p.name), 9, ["value"]))
                          }), 128))], 40, ["value", "onChange"])]))
                        : _createCommentVNode("", true),
                      (!lessons.length)
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 1,
                            class: "empty"
                          }, "Nenhuma aula registrada" + _toDisplayString(state.lessonPeriod?' neste período':'') + ".", 1))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(lessons, (lesson) => {
                        return (_openBlock(), _createElementBlock("article", {
                          key: lesson.id,
                          class: "x-record diary-lesson"
                        }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(date(lesson.lesson_date)) + " · " + _toDisplayString(lesson.lesson_count) + " aula(s)", 1), _createElementVNode("p", null, _toDisplayString(lesson.content), 1), (storedFields(lesson).length)
                          ? (_openBlock(), _createElementBlock("dl", { key: 0 }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(storedFields(lesson), (field) => {
                              return (_openBlock(), _createElementBlock(_Fragment, { key: field.id }, [_createElementVNode("dt", null, _toDisplayString(field.label), 1), _createElementVNode("dd", null, _toDisplayString(field.value), 1)], 64))
                            }), 128))]))
                          : _createCommentVNode("", true)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                          class: "btn btn-secondary",
                          onClick: $event => (openAttendance(lesson)),
                          "aria-label": 'Abrir chamada de '+date(lesson.lesson_date)
                        }, "Abrir chamada", 8, ["onClick", "aria-label"]), (state.selected.status==='open' && can('diary.write'))
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 0,
                              class: "btn btn-secondary",
                              onClick: $event => (editLesson(lesson)),
                              "aria-label": 'Editar aula de '+date(lesson.lesson_date)
                            }, "Editar aula", 8, ["onClick", "aria-label"]))
                          : _createCommentVNode("", true)])]))
                      }), 128))])
                    ]))
                  : _createCommentVNode("", true),
                (show('diaries','attendance') && state.selectedLesson)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 4,
                      class: "panel x-card"
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", {
                      id: "diary-attendance-heading",
                      tabindex: "-1"
                    }, "Chamada · " + _toDisplayString(date(state.selectedLesson.lesson_date)), 1), _createElementVNode("p", null, _toDisplayString(state.selectedLesson.content), 1)]), _createElementVNode("button", {
                      class: "btn btn-secondary",
                      onClick: closeAttendance
                    }, "Fechar chamada", 8, ["onClick"])]), (!state.attendance.length)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 0,
                          class: "empty"
                        }, "Nenhum aluno estava matriculado nesta turma na data da aula."))
                      : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                          _createElementVNode("p", {
                            role: "status",
                            "aria-live": "polite"
                          }, _toDisplayString(state.attendance.length-pendingAttendance) + " de " + _toDisplayString(state.attendance.length) + " alunos com frequência marcada · " + _toDisplayString(pendingAttendance) + " pendente(s)", 1),
                          (can('diary.attendance') && state.selected.status==='open')
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-secondary",
                                onClick: markPendingPresent,
                                disabled: !pendingAttendance
                              }, "Marcar pendentes como presentes", 8, ["onClick", "disabled"]))
                            : _createCommentVNode("", true),
                          _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.attendance, (r) => {
                            return (_openBlock(), _createElementBlock("fieldset", {
                              key: r.enrollment_id,
                              class: "diary-roll-row",
                              disabled: state.selected.status!=='open'||!can('diary.attendance')
                            }, [_createElementVNode("legend", null, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 1), _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", {
                              "onUpdate:modelValue": $event => ((r.attendance.status) = $event),
                              "aria-label": 'Frequência de '+r.name
                            }, [
                              _createElementVNode("option", {
                                value: "",
                                disabled: Boolean(r.attendance.version)
                              }, "Sem lançamento", 8, ["disabled"]),
                              _createElementVNode("option", { value: "present" }, "Presente"),
                              _createElementVNode("option", { value: "absent" }, "Falta"),
                              _createElementVNode("option", { value: "justified_absence" }, "Falta justificada")
                            ], 8, ["onUpdate:modelValue", "aria-label"]), [[_vModelSelect, r.attendance.status]])]), _createElementVNode("label", null, [_createTextVNode("Observação"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((r.attendance.note) = $event),
                              disabled: !r.attendance.status,
                              maxlength: "500",
                              "aria-label": 'Observação de '+r.name
                            }, null, 8, ["onUpdate:modelValue", "disabled", "aria-label"]), [[_vModelText, r.attendance.note]])])])], 8, ["disabled"]))
                          }), 128))]),
                          (state.selected.status==='open' && can('diary.attendance'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 1,
                                class: "btn btn-primary",
                                onClick: $event => (save(saveAttendance)),
                                disabled: !changedAttendance.length
                              }, "Salvar chamada (" + _toDisplayString(changedAttendance.length) + ")", 9, ["onClick", "disabled"]))
                            : _createCommentVNode("", true)
                        ], 64))]))
                  : _createCommentVNode("", true),
                (show('review'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 5,
                      class: "panel x-card"
                    }, [
                      _createElementVNode("h2", null, "Revisão e fechamento"),
                      (state.selected.status==='open')
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("p", null, "O diário está aberto para lançamentos. Envie-o para revisão quando estiver pronto."), (can('diary.write'))
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-primary",
                                onClick: submitDiary
                              }, "Enviar para revisão", 8, ["onClick"]))
                            : _createCommentVNode("", true)], 64))
                        : (state.selected.status==='submitted')
                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("p", { class: "alert info" }, "Diário enviado e aguardando revisão da coordenação."), (can('diary.review'))
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  class: "btn btn-primary",
                                  onClick: reviewDiary
                                }, "Marcar como revisado", 8, ["onClick"]))
                              : _createCommentVNode("", true)], 64))
                          : (state.selected.status==='reviewed')
                            ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("p", { class: "alert info" }, "Diário revisado pela coordenação."), (can('diary.reopen') && state.history.closures.some(c=>c.active && c.academic_period_id))
                                ? (_openBlock(), _createElementBlock("button", {
                                    key: 0,
                                    class: "btn btn-secondary",
                                    onClick: $event => (save(resumeDiary))
                                  }, "Continuar lançamentos nos períodos abertos", 8, ["onClick"]))
                                : _createCommentVNode("", true), (can('diary.close'))
                                ? (_openBlock(), _createElementBlock("div", {
                                    key: 1,
                                    class: "x-form"
                                  }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Período do fechamento"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.closePeriod) = $event) }, [_createElementVNode("option", { value: "" }, "Diário completo"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                                    return (_openBlock(), _createElementBlock("option", {
                                      key: p.id,
                                      value: p.id
                                    }, _toDisplayString(p.name), 9, ["value"]))
                                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.closePeriod]])]), _createElementVNode("label", null, [_createTextVNode("Justificativa / conferência"), _withDirectives(_createElementVNode("input", {
                                    "onUpdate:modelValue": $event => ((state.closeReason) = $event),
                                    minlength: "3",
                                    maxlength: "1000"
                                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.closeReason]])])]), _createElementVNode("button", {
                                    class: "btn btn-primary",
                                    onClick: $event => (save(closeDiary))
                                  }, _toDisplayString(state.closePeriod?'Fechar período':'Fechar diário'), 9, ["onClick"])]))
                                : _createCommentVNode("", true)], 64))
                            : (state.selected.status==='closed')
                              ? (_openBlock(), _createElementBlock("p", {
                                  key: 3,
                                  class: "alert info"
                                }, "Diário fechado. Alterações exigem reabertura formal e ficam registradas no histórico."))
                              : _createCommentVNode("", true),
                      ((state.selected.status!=='open' || state.history.closures.some(c=>c.active)) && can('diary.reopen'))
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 4,
                            class: "x-form"
                          }, [(state.history.closures.some(c=>c.active))
                            ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Fechamento a reabrir"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.reopenPeriod) = $event) }, [_createElementVNode("option", { value: "" }, _toDisplayString(state.history.closures.some(c=>c.active&&!c.academic_period_id)?'Diário completo':'Selecione o período'), 1), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.history.closures.filter(c=>c.active&&c.academic_period_id), (c) => {
                                return (_openBlock(), _createElementBlock("option", {
                                  key: c.id,
                                  value: c.academic_period_id
                                }, _toDisplayString(state.periods.find(p=>p.id===c.academic_period_id)?.name), 9, ["value"]))
                              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.reopenPeriod]])]))
                            : _createCommentVNode("", true), _createElementVNode("label", null, [_createTextVNode("Motivo da reabertura"), _withDirectives(_createElementVNode("textarea", {
                            "onUpdate:modelValue": $event => ((state.reopenReason) = $event),
                            minlength: "10",
                            maxlength: "1000",
                            rows: "2"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reopenReason]])]), _createElementVNode("button", {
                            class: "btn btn-secondary",
                            disabled: state.reopenReason.length<10,
                            onClick: $event => (save(reopenDiary))
                          }, "Reabrir com justificativa", 8, ["disabled", "onClick"])]))
                        : _createCommentVNode("", true),
                      _createElementVNode("h3", null, "Histórico"),
                      _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Tipo"), _createElementVNode("th", null, "Data"), _createElementVNode("th", null, "Hash / motivo")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.history.closures, (c) => {
                        return (_openBlock(), _createElementBlock("tr", { key: 'c'+c.id }, [_createElementVNode("td", null, "Fechamento"), _createElementVNode("td", null, _toDisplayString(date(c.closed_at)), 1), _createElementVNode("td", null, [_createElementVNode("code", null, _toDisplayString(c.snapshot_hash), 1)])]))
                      }), 128)), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.history.revisions, (r) => {
                        return (_openBlock(), _createElementBlock("tr", { key: 'r'+r.id }, [_createElementVNode("td", null, "Reabertura"), _createElementVNode("td", null, _toDisplayString(date(r.reopened_at)), 1), _createElementVNode("td", null, _toDisplayString(r.reason), 1)]))
                      }), 128))])])])
                    ]))
                  : _createCommentVNode("", true)
              ], 64))
            : _createCommentVNode("", true)], 64))
        : _createCommentVNode("", true),
      (state.tab==='planning')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 6 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("h2", null, "Planejamento curricular"), _createElementVNode("label", null, [_createTextVNode("Escolha o diário"), _createElementVNode("select", {
                onChange: $event => (selectDiary(state.diaries.find(d=>d.id===$event.target.value))),
                disabled: !state.diaries.length
              }, [_createElementVNode("option", {
                value: "",
                selected: "",
                disabled: ""
              }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.diaries, (d) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: d.id,
                  value: d.id
                }, _toDisplayString(d.class_name) + " · " + _toDisplayString(d.component_name) + " · " + _toDisplayString(d.year_name), 9, ["value"]))
              }), 128))], 40, ["onChange", "disabled"])]), (!state.diaries.length)
                ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Nenhum diário disponível nesta escola."))
                : _createCommentVNode("", true)]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(can('diary.write') && state.selected.status==='open')
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card"
                  }, [_createElementVNode("h2", {
                    id: "diary-plan-heading",
                    tabindex: "-1"
                  }, _toDisplayString(state.planEditing?'Editar planejamento':'Planejamento curricular') + " · " + _toDisplayString(state.selected.class_name) + " · " + _toDisplayString(state.selected.component_name), 1), _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(createPlan)), ["prevent"])
                  }, [
                    _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.planForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Planejamento geral"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                      return (_openBlock(), _createElementBlock("option", {
                        key: p.id,
                        value: p.id
                      }, _toDisplayString(p.name), 9, ["value"]))
                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.planForm.academic_period_id]])]),
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.fields.fields.filter(f=>f.scope==='plan'), (field) => {
                      return (_openBlock(), _createElementBlock("label", { key: field.id }, [_createTextVNode(_toDisplayString(field.label) + " ", 1), (state.fields.standard_columns[field.id]==='bncc_references')
                        ? _withDirectives((_openBlock(), _createElementBlock("input", {
                            key: 0,
                            "onUpdate:modelValue": $event => ((state.planForm.bncc_references) = $event),
                            placeholder: "Separe códigos por espaço, vírgula ou ponto e vírgula"
                          }, null, 8, ["onUpdate:modelValue"])), [[_vModelText, state.planForm.bncc_references]])
                        : (state.fields.standard_columns[field.id])
                          ? _withDirectives((_openBlock(), _createElementBlock("textarea", {
                              key: 1,
                              "onUpdate:modelValue": $event => ((state.planForm[state.fields.standard_columns[field.id]]) = $event),
                              maxlength: state.fields.standard_columns[field.id]==='resources'?4000:8000,
                              rows: "2"
                            }, null, 8, ["onUpdate:modelValue", "maxlength"])), [[_vModelText, state.planForm[state.fields.standard_columns[field.id]]]])
                          : _withDirectives((_openBlock(), _createElementBlock("textarea", {
                              key: 2,
                              "onUpdate:modelValue": $event => ((state.planValues[field.id]) = $event),
                              maxlength: "4000",
                              rows: "2"
                            }, null, 8, ["onUpdate:modelValue"])), [[_vModelText, state.planValues[field.id]]])]))
                    }), 128)),
                    _createElementVNode("label", null, [_createTextVNode("Situação do planejamento"), _withDirectives(_createElementVNode("select", {
                      "onUpdate:modelValue": $event => ((state.planForm.status) = $event),
                      "aria-label": "Situação do planejamento"
                    }, [_createElementVNode("option", { value: "draft" }, "Rascunho"), _createElementVNode("option", { value: "published" }, "Publicado"), (state.planEditing)
                      ? (_openBlock(), _createElementBlock("option", {
                          key: 0,
                          value: "archived"
                        }, "Arquivado"))
                      : _createCommentVNode("", true)], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.planForm.status]])]),
                    _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", { class: "btn btn-primary" }, "Salvar planejamento"), (state.planEditing)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          type: "button",
                          class: "btn btn-secondary",
                          onClick: resetPlan
                        }, "Cancelar edição", 8, ["onClick"]))
                      : _createCommentVNode("", true)])
                  ], 40, ["onSubmit"])]))
                : _createCommentVNode("", true), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Planejamentos registrados"), (!state.plans.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhum planejamento registrado."))
                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.plans, (p) => {
                return (_openBlock(), _createElementBlock("article", {
                  key: p.id,
                  class: "x-charge"
                }, [_createElementVNode("strong", null, _toDisplayString(state.periods.find(period=>period.id===p.academic_period_id)?.name||'Planejamento geral') + " · " + _toDisplayString(label(p.status)), 1), (storedFields(p).length)
                  ? (_openBlock(), _createElementBlock("dl", { key: 0 }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(storedFields(p), (field) => {
                      return (_openBlock(), _createElementBlock(_Fragment, { key: field.id }, [_createElementVNode("dt", null, _toDisplayString(field.label), 1), _createElementVNode("dd", null, _toDisplayString(field.value), 1)], 64))
                    }), 128))]))
                  : _createCommentVNode("", true), (can('diary.write') && state.selected.status==='open')
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 1,
                      class: "btn btn-secondary",
                      onClick: $event => (editPlan(p))
                    }, "Editar planejamento", 8, ["onClick"]))
                  : _createCommentVNode("", true)]))
              }), 128))])], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='assessments')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 7 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, "Selecione um diário para lançar avaliações.")]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                (show('rules') && can('diary.configure'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 0,
                      class: "panel x-card"
                    }, [_createElementVNode("h2", null, "Regra de avaliação e consolidação"), _createElementVNode("form", {
                      class: "x-form",
                      onSubmit: _withModifiers($event => (save(saveAssessmentRule)), ["prevent"])
                    }, [
                      _createElementVNode("div", { class: "x-grid" }, [
                        _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", {
                          "onUpdate:modelValue": $event => ((state.assessmentRuleForm.period_id) = $event),
                          onChange: $event => (selectRulePeriod(state.assessmentRuleForm.period_id)),
                          required: ""
                        }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                          return (_openBlock(), _createElementBlock("option", {
                            key: p.id,
                            value: p.id
                          }, _toDisplayString(p.name), 9, ["value"]))
                        }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.assessmentRuleForm.period_id]])]),
                        _createElementVNode("label", null, [_createTextVNode("Método"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.assessmentRuleForm.method) = $event) }, [_createElementVNode("option", { value: "arithmetic" }, "Média aritmética"), _createElementVNode("option", { value: "weighted" }, "Média ponderada"), _createElementVNode("option", { value: "concept" }, "Conceitual por escala ordenada")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.assessmentRuleForm.method]])]),
                        (state.assessmentRuleForm.method!=='concept')
                          ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Escala máxima"), _withDirectives(_createElementVNode("input", {
                              type: "number",
                              min: "0.0001",
                              step: "0.0001",
                              "onUpdate:modelValue": $event => ((state.assessmentRuleForm.scale_max) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentRuleForm.scale_max]])]))
                          : _createCommentVNode("", true),
                        (state.assessmentRuleForm.method!=='concept')
                          ? (_openBlock(), _createElementBlock("label", { key: 1 }, [_createTextVNode("Casas decimais"), _withDirectives(_createElementVNode("input", {
                              type: "number",
                              min: "0",
                              max: "4",
                              "onUpdate:modelValue": $event => ((state.assessmentRuleForm.decimal_places) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[
                              _vModelText,
                              state.assessmentRuleForm.decimal_places,
                              void 0,
                              { number: true }
                            ]])]))
                          : _createCommentVNode("", true)
                      ]),
                      (state.assessmentRuleForm.method==='concept')
                        ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Conceitos em ordem"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((state.assessmentRuleForm.concept_scale) = $event),
                            placeholder: "Insuficiente, Em desenvolvimento, Adequado"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentRuleForm.concept_scale]])]))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", { class: "x-grid" }, [
                        (state.assessmentRuleForm.method!=='concept')
                          ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Limite mínimo"), _withDirectives(_createElementVNode("input", {
                              type: "number",
                              min: "0",
                              step: "0.0001",
                              "onUpdate:modelValue": $event => ((state.assessmentRuleForm.minimum_score) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentRuleForm.minimum_score]])]))
                          : _createCommentVNode("", true),
                        _createElementVNode("label", null, [_createTextVNode("Recuperação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.assessmentRuleForm.recovery_mode) = $event) }, [
                          _createElementVNode("option", { value: "none" }, "Ignorar na consolidação"),
                          _createElementVNode("option", { value: "replace" }, "Substituir"),
                          _createElementVNode("option", { value: "higher" }, "Manter maior resultado"),
                          _createElementVNode("option", { value: "mean" }, "Média entre resultado e recuperação")
                        ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.assessmentRuleForm.recovery_mode]])]),
                        _createElementVNode("label", null, [_createTextVNode("Limite de frequência (%)"), _withDirectives(_createElementVNode("input", {
                          type: "number",
                          min: "0",
                          max: "100",
                          step: "0.01",
                          "onUpdate:modelValue": $event => ((state.assessmentRuleForm.minimum_attendance_percent) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentRuleForm.minimum_attendance_percent]])]),
                        (state.assessmentRuleForm.minimum_attendance_percent)
                          ? (_openBlock(), _createElementBlock("label", { key: 1 }, [_createTextVNode("Falta justificada conta como presença?"), _withDirectives(_createElementVNode("select", {
                              "onUpdate:modelValue": $event => ((state.assessmentRuleForm.justified_absence_counts_as_present) = $event),
                              required: ""
                            }, [_createElementVNode("option", { value: "" }, "Selecione"), _createElementVNode("option", { value: "true" }, "Sim"), _createElementVNode("option", { value: "false" }, "Não")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.assessmentRuleForm.justified_absence_counts_as_present]])]))
                          : _createCommentVNode("", true)
                      ]),
                      _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                        type: "checkbox",
                        "onUpdate:modelValue": $event => ((state.assessmentRuleForm.required_opinion) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.assessmentRuleForm.required_opinion]]), _createTextVNode(" Exigir parecer final")]),
                      _createElementVNode("button", {
                        class: "btn btn-primary",
                        disabled: !state.assessmentRuleForm.period_id
                      }, "Salvar regra", 8, ["disabled"])
                    ], 40, ["onSubmit"]), _createElementVNode("p", { class: "muted" }, "Salve a regra e clique em Consolidar agora para atualizar os resultados do período.")]))
                  : _createCommentVNode("", true),
                (show('results'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 1,
                      class: "panel x-card"
                    }, [
                      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Resultados do período"), _createElementVNode("p", null, "Consulte as notas e a frequência consolidadas pela coordenação.")])]),
                      _createElementVNode("div", { class: "x-filter" }, [_createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", {
                        "onUpdate:modelValue": $event => ((state.assessmentRuleForm.period_id) = $event),
                        onChange: $event => {selectRulePeriod(state.assessmentRuleForm.period_id);state.periodResults=[]}
                      }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: p.id,
                          value: p.id
                        }, _toDisplayString(p.name), 9, ["value"]))
                      }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.assessmentRuleForm.period_id]])]), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: loadPeriodResults,
                        disabled: !state.assessmentRuleForm.period_id
                      }, "Consultar", 8, ["onClick", "disabled"]), (can('diary.review') && ['open','reviewed'].includes(state.selected.status))
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "btn btn-primary",
                            onClick: consolidatePeriod,
                            disabled: !state.assessmentRuleForm.period_id
                          }, "Consolidar agora", 8, ["onClick", "disabled"]))
                        : _createCommentVNode("", true)]),
                      (state.periodResults.some(r=>r.requires_recalculation))
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "alert warning"
                          }, "Há resultados calculados com uma regra anterior de avaliação ou frequência. A coordenação deve consolidar novamente o período."))
                        : _createCommentVNode("", true),
                      (state.periodResults.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 1,
                            class: "table-wrap"
                          }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                            _createElementVNode("th", null, "Aluno"),
                            _createElementVNode("th", null, "Resultado"),
                            _createElementVNode("th", null, "Frequência"),
                            _createElementVNode("th", null, "Situação"),
                            _createElementVNode("th", null, "Observações")
                          ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periodResults, (r) => {
                            return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                              _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.student_name), 1), _createElementVNode("small", null, _toDisplayString(r.student_number), 1)]),
                              _createElementVNode("td", null, _toDisplayString(r.numeric_value??r.concept_value??'—'), 1),
                              _createElementVNode("td", null, _toDisplayString(r.requires_recalculation?'Recalcular':r.calculation?.attendance_percent!=null?Number(r.calculation.attendance_percent).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—'), 1),
                              _createElementVNode("td", null, _toDisplayString(label(r.status)), 1),
                              _createElementVNode("td", null, _toDisplayString((r.flags||[]).map(label).join(', ')||'—'), 1)
                            ]))
                          }), 128))])])]))
                        : _createCommentVNode("", true)
                    ]))
                  : _createCommentVNode("", true),
                (show('assessments') && state.selected.status==='open' && can('diary.assessments'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 2,
                      class: "panel x-card"
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, _toDisplayString(state.assessmentEditing?'Editar avaliação':'Nova avaliação'), 1), (state.assessmentEditing)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          class: "btn btn-secondary small-button",
                          onClick: cancelAssessmentEdit
                        }, "Cancelar edição", 8, ["onClick"]))
                      : _createCommentVNode("", true)]), _createElementVNode("form", {
                      class: "x-form",
                      onSubmit: _withModifiers($event => (save(createAssessment)), ["prevent"])
                    }, [
                      _createElementVNode("div", { class: "x-grid" }, [
                        _createElementVNode("label", null, [_createTextVNode("Título"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((state.assessmentForm.title) = $event),
                          required: "",
                          maxlength: "160"
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentForm.title]])]),
                        _createElementVNode("label", null, [_createTextVNode("Tipo"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.assessmentForm.kind) = $event) }, [
                          _createElementVNode("option", { value: "activity" }, "Atividade"),
                          _createElementVNode("option", { value: "exam" }, "Prova"),
                          _createElementVNode("option", { value: "project" }, "Projeto"),
                          _createElementVNode("option", { value: "recovery" }, "Recuperação"),
                          (!['activity','exam','project','recovery'].includes(state.assessmentForm.kind))
                            ? (_openBlock(), _createElementBlock("option", {
                                key: 0,
                                value: state.assessmentForm.kind
                              }, _toDisplayString(state.assessmentForm.kind), 9, ["value"]))
                            : _createCommentVNode("", true)
                        ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.assessmentForm.kind]])]),
                        _createElementVNode("label", null, [_createTextVNode("Data"), _withDirectives(_createElementVNode("input", {
                          type: "date",
                          "onUpdate:modelValue": $event => ((state.assessmentForm.assessment_date) = $event),
                          required: ""
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentForm.assessment_date]])]),
                        _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.assessmentForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Sem período"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                          return (_openBlock(), _createElementBlock("option", {
                            key: p.id,
                            value: p.id
                          }, _toDisplayString(p.name), 9, ["value"]))
                        }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.assessmentForm.academic_period_id]])]),
                        _createElementVNode("label", null, [_createTextVNode("Forma de resultado"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.assessmentForm.value_type) = $event) }, [_createElementVNode("option", { value: "numeric" }, "Nota numérica"), _createElementVNode("option", { value: "concept" }, "Conceito")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.assessmentForm.value_type]])]),
                        (state.assessmentForm.value_type==='numeric')
                          ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Valor máximo"), _withDirectives(_createElementVNode("input", {
                              type: "number",
                              min: "0.01",
                              step: "0.01",
                              "onUpdate:modelValue": $event => ((state.assessmentForm.max_score) = $event),
                              required: ""
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentForm.max_score]])]))
                          : _createCommentVNode("", true),
                        _createElementVNode("label", null, [_createTextVNode("Peso da avaliação"), _withDirectives(_createElementVNode("input", {
                          type: "number",
                          min: "0.0001",
                          step: "0.0001",
                          "onUpdate:modelValue": $event => ((state.assessmentForm.weight) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentForm.weight]])]),
                        _createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.assessmentForm.status) = $event) }, [_createElementVNode("option", { value: "draft" }, "Rascunho"), _createElementVNode("option", { value: "published" }, "Publicada · entra na consolidação"), (state.assessmentEditing)
                          ? (_openBlock(), _createElementBlock("option", {
                              key: 0,
                              value: "closed"
                            }, "Fechada · notas bloqueadas"))
                          : _createCommentVNode("", true)], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.assessmentForm.status]])])
                      ]),
                      _createElementVNode("label", null, [_createTextVNode("Descrição"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.assessmentForm.description) = $event),
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentForm.description]])]),
                      _createElementVNode("label", null, [_createTextVNode("Habilidades avaliadas"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.assessmentForm.skills) = $event),
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.assessmentForm.skills]])]),
                      _createElementVNode("button", { class: "btn btn-primary" }, _toDisplayString(state.assessmentEditing?'Salvar avaliação':'Criar avaliação'), 1)
                    ], 40, ["onSubmit"])]))
                  : _createCommentVNode("", true),
                (show('assessments'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 3,
                      class: "panel x-card"
                    }, [_createElementVNode("h2", null, "Avaliações registradas"), (!state.assessments.length)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 0,
                          class: "empty"
                        }, "Nenhuma avaliação cadastrada neste diário."))
                      : _createCommentVNode("", true), _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.assessments, (a) => {
                      return (_openBlock(), _createElementBlock("article", {
                        key: a.id,
                        class: "x-record"
                      }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(a.title), 1), _createElementVNode("span", null, _toDisplayString(date(a.assessment_date)) + " · " + _toDisplayString(a.value_type==='numeric'?'Numérica':'Conceitual') + " · " + _toDisplayString(a.result_count) + " resultado(s)", 1), _createElementVNode("small", null, _toDisplayString(label(a.status)), 1)]), _createElementVNode("div", { class: "actions" }, [(state.selected.status==='open' && can('diary.assessments'))
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "btn btn-secondary small-button",
                            onClick: $event => (editAssessment(a))
                          }, "Editar avaliação", 8, ["onClick"]))
                        : _createCommentVNode("", true), _createElementVNode("button", {
                        class: "btn btn-primary small-button",
                        onClick: $event => (openAssessment(a))
                      }, _toDisplayString(state.selected.status==='open' && a.status!=='closed' && can('diary.assessments')?'Lançar notas':'Consultar notas'), 9, ["onClick"])])]))
                    }), 128))])]))
                  : _createCommentVNode("", true),
                (show('assessments') && state.selectedAssessment)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 4,
                      class: "panel x-card"
                    }, [
                      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, _toDisplayString(state.selectedAssessment.title), 1), _createElementVNode("p", null, _toDisplayString(date(state.selectedAssessment.assessment_date)), 1)]), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: $event => (state.selectedAssessment=null)
                      }, "Fechar", 8, ["onClick"])]),
                      (state.selectedAssessment.status!=='closed')
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 0,
                            class: "small muted"
                          }, "Você pode salvar as notas preenchidas e concluir as demais depois."))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Aluno"), _createElementVNode("th", null, "Resultado"), _createElementVNode("th", null, "Observação")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.assessmentRoster, (r) => {
                        return (_openBlock(), _createElementBlock("tr", { key: r.enrollment_id }, [_createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.name), 1), _createElementVNode("small", null, _toDisplayString(r.number), 1)]), _createElementVNode("td", null, [(state.selectedAssessment.value_type==='numeric')
                          ? _withDirectives((_openBlock(), _createElementBlock("input", {
                              key: 0,
                              type: "number",
                              min: "0",
                              max: state.selectedAssessment.max_score,
                              step: "0.01",
                              "onUpdate:modelValue": $event => ((r.result.numeric_score) = $event),
                              "aria-label": 'Nota de '+r.name,
                              disabled: state.selected.status!=='open'||state.selectedAssessment.status==='closed'||!can('diary.assessments')
                            }, null, 8, ["max", "onUpdate:modelValue", "aria-label", "disabled"])), [[_vModelText, r.result.numeric_score]])
                          : _withDirectives((_openBlock(), _createElementBlock("input", {
                              key: 1,
                              "onUpdate:modelValue": $event => ((r.result.concept) = $event),
                              maxlength: "80",
                              "aria-label": 'Conceito de '+r.name,
                              disabled: state.selected.status!=='open'||state.selectedAssessment.status==='closed'||!can('diary.assessments')
                            }, null, 8, ["onUpdate:modelValue", "aria-label", "disabled"])), [[_vModelText, r.result.concept]])]), _createElementVNode("td", null, [_withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((r.result.note) = $event),
                          maxlength: "1000",
                          "aria-label": 'Observação de '+r.name,
                          disabled: state.selected.status!=='open'||state.selectedAssessment.status==='closed'||!can('diary.assessments')
                        }, null, 8, ["onUpdate:modelValue", "aria-label", "disabled"]), [[_vModelText, r.result.note]])])]))
                      }), 128))])])]),
                      (state.selected.status==='open' && state.selectedAssessment.status!=='closed' && can('diary.assessments'))
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 1,
                            class: "btn btn-primary",
                            onClick: $event => (save(saveAssessmentResults)),
                            disabled: !state.assessmentRoster.length
                          }, "Salvar resultados", 8, ["onClick", "disabled"]))
                        : _createCommentVNode("", true)
                    ]))
                  : _createCommentVNode("", true)
              ], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='opinions')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 8 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, "Selecione um diário para registrar pareceres descritivos.")]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(state.selected.status==='open' && can('diary.write'))
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card"
                  }, [_createElementVNode("h2", null, "Parecer descritivo"), _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(saveOpinion)), ["prevent"])
                  }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((state.opinionForm.enrollment_id) = $event),
                    required: ""
                  }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.roster||[], (r) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: r.enrollment_id,
                      value: r.enrollment_id
                    }, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 9, ["value"]))
                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.opinionForm.enrollment_id]])]), _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.opinionForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Geral"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: p.id,
                      value: p.id
                    }, _toDisplayString(p.name), 9, ["value"]))
                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.opinionForm.academic_period_id]])]), _createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.opinionForm.status) = $event) }, [_createElementVNode("option", { value: "draft" }, "Rascunho"), (can('diary.review'))
                    ? (_openBlock(), _createElementBlock("option", {
                        key: 0,
                        value: "reviewed"
                      }, "Revisado"))
                    : _createCommentVNode("", true), (can('diary.review'))
                    ? (_openBlock(), _createElementBlock("option", {
                        key: 1,
                        value: "final"
                      }, "Final"))
                    : _createCommentVNode("", true)], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.opinionForm.status]])])]), _createElementVNode("label", null, [_createTextVNode("Texto"), _withDirectives(_createElementVNode("textarea", {
                    "onUpdate:modelValue": $event => ((state.opinionForm.text) = $event),
                    required: "",
                    minlength: "2",
                    maxlength: "12000",
                    rows: "5"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.opinionForm.text]])]), _createElementVNode("button", { class: "btn btn-primary" }, "Salvar parecer")], 40, ["onSubmit"])]))
                : _createCommentVNode("", true), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Pareceres registrados"), (!state.opinions.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhum parecer registrado."))
                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.opinions, (o) => {
                return (_openBlock(), _createElementBlock("article", {
                  key: o.id,
                  class: "x-charge"
                }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("strong", null, _toDisplayString(label(o.status)), 1), _createElementVNode("small", null, _toDisplayString(date(o.updated_at)), 1)]), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(o.text), 1)]))
              }), 128))])], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='records')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 9 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, "Selecione um diário para consultar registros pedagógicos complementares.")]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(state.selected.status==='open' && can('diary.write'))
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card"
                  }, [_createElementVNode("h2", null, "Novo registro pedagógico"), _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(createPedagogicalRecord)), ["prevent"])
                  }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((state.pedagogicalForm.enrollment_id) = $event),
                    required: ""
                  }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.roster||[], (r) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: r.enrollment_id,
                      value: r.enrollment_id
                    }, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 9, ["value"]))
                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.pedagogicalForm.enrollment_id]])]), _createElementVNode("label", null, [_createTextVNode("Data"), _withDirectives(_createElementVNode("input", {
                    type: "date",
                    "onUpdate:modelValue": $event => ((state.pedagogicalForm.record_date) = $event),
                    required: ""
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.pedagogicalForm.record_date]])]), _createElementVNode("label", null, [_createTextVNode("Tipo"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.pedagogicalForm.kind) = $event) }, [
                    _createElementVNode("option", { value: "follow_up" }, "Acompanhamento"),
                    _createElementVNode("option", { value: "intervention" }, "Intervenção"),
                    _createElementVNode("option", { value: "recovery" }, "Recuperação"),
                    _createElementVNode("option", { value: "adaptation" }, "Adaptação"),
                    _createElementVNode("option", { value: "referral" }, "Encaminhamento"),
                    _createElementVNode("option", { value: "observation" }, "Observação")
                  ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.pedagogicalForm.kind]])])]), _createElementVNode("label", null, [_createTextVNode("Registro"), _withDirectives(_createElementVNode("textarea", {
                    "onUpdate:modelValue": $event => ((state.pedagogicalForm.text) = $event),
                    required: "",
                    minlength: "2",
                    maxlength: "12000",
                    rows: "4"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.pedagogicalForm.text]])]), _createElementVNode("button", { class: "btn btn-primary" }, "Registrar")], 40, ["onSubmit"])]))
                : _createCommentVNode("", true), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Histórico pedagógico"), (!state.pedagogicalRecords.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhum registro complementar."))
                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.pedagogicalRecords, (r) => {
                return (_openBlock(), _createElementBlock("article", {
                  key: r.id,
                  class: "x-charge"
                }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("strong", null, _toDisplayString(label(r.kind)), 1), _createElementVNode("small", null, _toDisplayString(date(r.record_date)), 1)]), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(r.text), 1)]))
              }), 128))])], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='occurrences')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 10 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, "Selecione um diário para registrar ocorrências.")]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(state.selected.status==='open' && can('diary.write'))
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card"
                  }, [_createElementVNode("h2", null, "Nova ocorrência pedagógica"), _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers($event => (save(saveOccurrence)), ["prevent"])
                  }, [
                    _createElementVNode("div", { class: "x-grid" }, [
                      _createElementVNode("label", null, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", {
                        "onUpdate:modelValue": $event => ((state.occurrenceForm.enrollment_id) = $event),
                        required: ""
                      }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.roster||[], (r) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: r.enrollment_id,
                          value: r.enrollment_id
                        }, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 9, ["value"]))
                      }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.occurrenceForm.enrollment_id]])]),
                      _createElementVNode("label", null, [_createTextVNode("Data"), _withDirectives(_createElementVNode("input", {
                        type: "date",
                        "onUpdate:modelValue": $event => ((state.occurrenceForm.occurrence_date) = $event),
                        required: ""
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.occurrenceForm.occurrence_date]])]),
                      _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", {
                        "onUpdate:modelValue": $event => ((state.occurrenceForm.academic_period_id) = $event),
                        required: ""
                      }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: p.id,
                          value: p.id
                        }, _toDisplayString(p.name), 9, ["value"]))
                      }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.occurrenceForm.academic_period_id]])]),
                      _createElementVNode("label", null, [_createTextVNode("Tipo"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.occurrenceForm.kind) = $event) }, [
                        _createElementVNode("option", { value: "positive" }, "Positiva"),
                        _createElementVNode("option", { value: "pedagogical" }, "Pedagógica"),
                        _createElementVNode("option", { value: "behavioral" }, "Comportamental"),
                        _createElementVNode("option", { value: "safety" }, "Segurança"),
                        _createElementVNode("option", { value: "other" }, "Outra")
                      ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.occurrenceForm.kind]])]),
                      _createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.occurrenceForm.status) = $event) }, [_createElementVNode("option", { value: "draft" }, "Aguardando revisão"), (can('diary.review'))
                        ? (_openBlock(), _createElementBlock("option", {
                            key: 0,
                            value: "reviewed"
                          }, "Revisada"))
                        : _createCommentVNode("", true)], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.occurrenceForm.status]])])
                    ]),
                    _createElementVNode("label", null, [_createTextVNode("Título"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.occurrenceForm.title) = $event),
                      required: "",
                      minlength: "2",
                      maxlength: "160"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.occurrenceForm.title]])]),
                    _createElementVNode("label", null, [_createTextVNode("Descrição"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.occurrenceForm.description) = $event),
                      required: "",
                      minlength: "2",
                      maxlength: "8000",
                      rows: "4"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.occurrenceForm.description]])]),
                    _createElementVNode("p", { class: "muted" }, "Registre apenas informações pedagógicas necessárias. Este formulário não envia mensagem à família."),
                    _createElementVNode("button", { class: "btn btn-primary" }, "Registrar")
                  ], 40, ["onSubmit"])]))
                : _createCommentVNode("", true), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Ocorrências"), (!state.occurrences.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhuma ocorrência registrada."))
                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.occurrences, (o) => {
                return (_openBlock(), _createElementBlock("article", {
                  key: o.id,
                  class: "x-charge"
                }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("strong", null, _toDisplayString(o.title) + " · " + _toDisplayString(label(o.status)), 1), _createElementVNode("small", null, _toDisplayString(date(o.occurrence_date)) + " · " + _toDisplayString(label(o.kind)), 1)]), _createElementVNode("p", null, [_createElementVNode("strong", null, _toDisplayString((state.selected.roster||[]).find(x=>x.enrollment_id===o.enrollment_id)?.name||'Aluno'), 1)]), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(o.description), 1)]))
              }), 128))])], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='communications' && can('communications.send'))
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 11 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, "Selecione um diário para enviar comunicados e consultar o histórico.")]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Comunicado no portal da família"), _createElementVNode("p", null, "O comunicado ficará disponível apenas para os responsáveis legais que confirmaram o vínculo e autorizaram o acesso ao Diário no portal. Esta tela não envia e-mail nem WhatsApp."), _createElementVNode("form", {
                class: "x-form",
                onSubmit: _withModifiers($event => (save(sendCommunication)), ["prevent"])
              }, [
                _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Estudante"), _withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": $event => ((state.communicationForm.enrollment_id) = $event),
                  onChange: loadCommunicationRecipients,
                  required: ""
                }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.roster||[], (r) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: r.enrollment_id,
                    value: r.enrollment_id
                  }, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 9, ["value"]))
                }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.communicationForm.enrollment_id]])]), _createElementVNode("label", null, [_createTextVNode("Período de referência"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.communicationForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Sem período específico"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodsFor(state.selected), (p) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: p.id,
                    value: p.id
                  }, _toDisplayString(p.name), 9, ["value"]))
                }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.communicationForm.academic_period_id]])]), _createElementVNode("label", null, [_createTextVNode("Ocorrência revisada (opcional)"), _withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": $event => ((state.communicationForm.occurrence_id) = $event),
                  onChange: communicationOccurrenceChanged
                }, [_createElementVNode("option", { value: "" }, "Sem ocorrência vinculada"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.occurrences.filter(x=>x.enrollment_id===state.communicationForm.enrollment_id&&x.status==='reviewed'), (o) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: o.id,
                    value: o.id
                  }, _toDisplayString(date(o.occurrence_date)) + " · " + _toDisplayString(o.title), 9, ["value"]))
                }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.communicationForm.occurrence_id]])])]),
                _createElementVNode("fieldset", {
                  class: "x-form",
                  disabled: !state.communicationRecipients.length
                }, [_createElementVNode("legend", null, "Responsáveis autorizados"), (state.communicationForm.enrollment_id&&!state.communicationRecipients.length)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "empty"
                    }, "Nenhum responsável legal com acesso consentido e contato verificado para este estudante."))
                  : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.communicationRecipients, (recipient) => {
                  return (_openBlock(), _createElementBlock("label", {
                    key: recipient.guardian_link_id,
                    class: "x-check"
                  }, [_withDirectives(_createElementVNode("input", {
                    type: "checkbox",
                    value: recipient.guardian_link_id,
                    "onUpdate:modelValue": $event => ((state.communicationForm.recipient_guardian_link_ids) = $event)
                  }, null, 8, ["value", "onUpdate:modelValue"]), [[_vModelCheckbox, state.communicationForm.recipient_guardian_link_ids]]), _createTextVNode(_toDisplayString(recipient.name) + " · " + _toDisplayString(recipient.relationship) + " · " + _toDisplayString(recipient.portal_account_count) + " conta(s) do portal", 1)]))
                }), 128))], 8, ["disabled"]),
                _createElementVNode("label", null, [_createTextVNode("Título"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.communicationForm.title) = $event),
                  required: "",
                  minlength: "2",
                  maxlength: "160"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.communicationForm.title]])]),
                _createElementVNode("label", null, [_createTextVNode("Mensagem"), _withDirectives(_createElementVNode("textarea", {
                  "onUpdate:modelValue": $event => ((state.communicationForm.message) = $event),
                  required: "",
                  minlength: "2",
                  maxlength: "8000",
                  rows: "5"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.communicationForm.message]])]),
                _createElementVNode("button", {
                  class: "btn btn-primary",
                  disabled: !state.communicationForm.recipient_guardian_link_ids.length
                }, "Disponibilizar no portal", 8, ["disabled"])
              ], 40, ["onSubmit"])]), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Histórico de comunicados"), (!state.communications.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhum comunicado enviado por este Diário."))
                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.communications, (item) => {
                return (_openBlock(), _createElementBlock("article", {
                  key: item.id,
                  class: "x-charge"
                }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(item.title), 1), _createElementVNode("small", null, [_createTextVNode(_toDisplayString(item.student_name) + " · " + _toDisplayString(item.guardian_name) + " · " + _toDisplayString(date(item.sent_at)), 1), (item.academic_period_id)
                  ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · " + _toDisplayString(state.periods.find(p=>p.id===item.academic_period_id)?.name||'Período'), 1))
                  : _createCommentVNode("", true)])]), _createElementVNode("span", { class: "badge" }, _toDisplayString(item.read_at?'Lido no portal':'Disponível no portal'), 1)]), (item.occurrence_title)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "muted"
                    }, "Ocorrência: " + _toDisplayString(item.occurrence_title), 1))
                  : _createCommentVNode("", true), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(item.message), 1)]))
              }), 128))])], 64))], 64))
        : _createCommentVNode("", true)
    ], 40, ["onInput", "disabled"])], 8, ["aria-busy", "data-workspace-dirty"]))
  }
}};
