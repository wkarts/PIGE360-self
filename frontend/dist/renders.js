/* Vue pré-compilado; sem eval em runtime. */
var _Vue=Vue; var PigeRenders={app:function render(_ctx, _cache) {
  with (_ctx) {
    const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, vModelText: _vModelText, withDirectives: _withDirectives, withModifiers: _withModifiers, normalizeClass: _normalizeClass, renderList: _renderList, Fragment: _Fragment, vShow: _vShow, vModelSelect: _vModelSelect, resolveComponent: _resolveComponent, createBlock: _createBlock, vModelCheckbox: _vModelCheckbox, vModelDynamic: _vModelDynamic } = _Vue

    const _component_expansion_panel = _resolveComponent("expansion-panel")

    return (_openBlock(), _createElementBlock("div", {
      class: "app-root",
      "aria-busy": state.busy || state.loading
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
          : _createCommentVNode("", true), _createElementVNode("h1", null, _toDisplayString(identity.display_name), 1), _createElementVNode("p", null, "Preparando a aplicação…")]))
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
              }, _toDisplayString(identity.display_name), 1)), _createElementVNode("span", { class: "self-label" }, "GESTÃO ESCOLAR")]), _createElementVNode("div", { class: "auth-copy" }, [
            _createElementVNode("p", { class: "eyebrow" }, "GESTÃO EDUCACIONAL • WEB / PWA"),
            _createElementVNode("h1", null, [_createTextVNode("A gestão educacional."), _createElementVNode("br"), _createTextVNode("Organizada, de verdade.")]),
            _createElementVNode("p", null, "Alunos, famílias, matrículas e documentos reunidos em uma aplicação da sua instituição."),
            _createElementVNode("div", { class: "auth-features" }, [_createElementVNode("span", null, "01   Cadastro único"), _createElementVNode("span", null, "02   Matrículas e turmas"), _createElementVNode("span", null, "03   Documentação e histórico")])
          ]), _createElementVNode("div", null, [_createElementVNode("a", {
            class: "btn btn-secondary",
            href: "/online.html"
          }, "Sou responsável · Pré-matrícula online →"), _createElementVNode("p", { class: "small muted" }, "Instalação própria · Dados sob gestão da instituição")])]), _createElementVNode("section", { class: "auth-panel" }, [(!state.configured)
            ? (_openBlock(), _createElementBlock("form", {
                key: 0,
                class: "auth-form setup-form",
                onSubmit: _withModifiers(configure, ["prevent"])
              }, [
                _createElementVNode("p", { class: "eyebrow" }, "PRIMEIRO ACESSO"),
                _createElementVNode("h2", null, "Configure sua instituição"),
                _createElementVNode("p", { class: "muted" }, "Use a chave SETUP_TOKEN gerada no arquivo .env. Nenhuma senha padrão é instalada."),
                (state.error)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "alert error",
                      role: "alert"
                    }, _toDisplayString(state.error), 1))
                  : _createCommentVNode("", true),
                _createElementVNode("div", { class: "form-grid" }, [
                  _createElementVNode("label", { class: "field wide" }, [_createTextVNode("Chave de instalação"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.token) = $event),
                    type: "password",
                    required: "",
                    autocomplete: "off"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.token]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Empresa / mantenedora"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.company_name) = $event),
                    required: "",
                    maxlength: "160"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.company_name]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("CPF / CNPJ"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.setup.company_document) = $event),
                    maxlength: "24"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.setup.company_document]])]),
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
                }, _toDisplayString(state.loginBusy ? 'Configurando…' : 'Concluir instalação'), 9, ["disabled"])
              ], 40, ["onSubmit"]))
            : (_openBlock(), _createElementBlock("form", {
                key: 1,
                class: "auth-form",
                onSubmit: _withModifiers(login, ["prevent"])
              }, [
                _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name), 1),
                _createElementVNode("h2", null, "Acesse sua instituição"),
                _createElementVNode("p", { class: "muted" }, "Informe suas credenciais para continuar."),
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
                  required: "",
                  autocomplete: "username",
                  autofocus: "",
                  placeholder: "seu.nome@escola.com.br"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.login.email]])]),
                _createElementVNode("label", { class: "field" }, [_createTextVNode("Senha"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.login.password) = $event),
                  type: "password",
                  required: "",
                  maxlength: "128",
                  autocomplete: "current-password",
                  placeholder: "Sua senha de acesso"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.login.password]])]),
                _createElementVNode("button", {
                  class: "btn btn-primary full",
                  disabled: state.loginBusy || !state.online
                }, [_createTextVNode(_toDisplayString(state.loginBusy ? 'Autenticando…' : 'Entrar na aplicação') + " ", 1), _createElementVNode("span", null, "→")], 8, ["disabled"]),
                _createElementVNode("p", { class: "small muted" }, "Problemas de acesso? Solicite a recuperação ao administrador desta instalação.")
              ], 40, ["onSubmit"])), (!state.online)
            ? (_openBlock(), _createElementBlock("p", {
                key: 2,
                class: "alert warning"
              }, "Sem conexão com o servidor. O acesso aos dados exige conexão."))
            : _createCommentVNode("", true)])]))
        : (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "workspace"
          }, [(state.menuOpen)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "sidebar-shade",
                onClick: $event => (state.menuOpen=false)
              }, null, 8, ["onClick"]))
            : _createCommentVNode("", true), _createElementVNode("aside", { class: _normalizeClass(["sidebar", {visible:state.menuOpen}]) }, [
            _createElementVNode("a", {
              href: "#/dashboard",
              class: "brand-line",
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
                }, _toDisplayString(identity.short_name), 1))], 8, ["onClick"]),
            _createElementVNode("div", { class: "sidebar-label" }, "OPERAÇÃO ESCOLAR"),
            (!isProfileRole())
              ? (_openBlock(), _createElementBlock("nav", {
                  key: 0,
                  "aria-label": "Menu principal"
                }, [
                  _createElementVNode("a", {
                    href: "#/dashboard",
                    class: _normalizeClass({active:state.page==='dashboard'}),
                    onClick: _withModifiers($event => (navigate('dashboard')), ["prevent"])
                  }, [_createElementVNode("span", { class: "nav-icon" }, "▦"), _createTextVNode("Visão geral")], 10, ["onClick"]),
                  (can('people.read') || can('read'))
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: _normalizeClass(["nav-group", {selected:registryPages.includes(state.page)}])
                      }, [_createElementVNode("button", {
                        type: "button",
                        class: "nav-group-toggle",
                        "aria-label": "Cadastros",
                        onClick: $event => (state.cadastresOpen=!state.cadastresOpen),
                        "aria-expanded": state.cadastresOpen,
                        "aria-controls": "cadastres-menu"
                      }, [_createElementVNode("span", { class: "nav-icon" }, "▣"), _createElementVNode("span", null, "Cadastros"), _createElementVNode("span", {
                        class: "nav-chevron",
                        "aria-hidden": "true"
                      }, _toDisplayString(state.cadastresOpen?'⌄':'›'), 1)], 8, ["onClick", "aria-expanded"]), _withDirectives(_createElementVNode("div", {
                        id: "cadastres-menu",
                        class: "nav-group-items"
                      }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(registryPages, (key) => {
                        return (_openBlock(), _createElementBlock("a", {
                          key: key,
                          href: '#/'+key,
                          class: _normalizeClass({active:state.page===key}),
                          "aria-current": state.page===key?'page':undefined,
                          onClick: _withModifiers($event => (navigate(key)), ["prevent"])
                        }, [_createElementVNode("span", {
                          class: "nav-dot",
                          "aria-hidden": "true"
                        }), _createTextVNode(_toDisplayString(pageLabels[key]), 1)], 10, ["href", "aria-current", "onClick"]))
                      }), 128))], 512), [[_vShow, state.cadastresOpen]])], 2))
                    : _createCommentVNode("", true),
                  _createElementVNode("a", {
                    href: "#/enrollments",
                    class: _normalizeClass({active:state.page==='enrollments'}),
                    onClick: _withModifiers($event => (navigate('enrollments')), ["prevent"])
                  }, [_createElementVNode("span", { class: "nav-icon" }, "▤"), _createTextVNode("Matrículas")], 10, ["onClick"]),
                  _createElementVNode("a", {
                    href: "#/academic",
                    class: _normalizeClass({active:state.page==='academic'}),
                    onClick: _withModifiers($event => (navigate('academic')), ["prevent"])
                  }, [_createElementVNode("span", { class: "nav-icon" }, "▥"), _createTextVNode("Estrutura acadêmica")], 10, ["onClick"]),
                  _createElementVNode("a", {
                    href: "#/documents",
                    class: _normalizeClass({active:state.page==='documents'}),
                    onClick: _withModifiers($event => (navigate('documents')), ["prevent"])
                  }, [_createElementVNode("span", { class: "nav-icon" }, "▱"), _createTextVNode("Documentação")], 10, ["onClick"]),
                  _createElementVNode("a", {
                    href: "#/protocols",
                    class: _normalizeClass({active:state.page==='protocols'}),
                    onClick: _withModifiers($event => (navigate('protocols')), ["prevent"])
                  }, [_createElementVNode("span", { class: "nav-icon" }, "☷"), _createTextVNode("Protocolos")], 10, ["onClick"]),
                  (can('reports.read'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 1,
                        href: "#/reports",
                        class: _normalizeClass({active:state.page==='reports'}),
                        onClick: _withModifiers($event => (navigate('reports')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "▧"), _createTextVNode("Relatórios")], 10, ["onClick"]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "sidebar-label" }, "ADMINISTRAÇÃO"),
            (!isProfileRole())
              ? (_openBlock(), _createElementBlock("nav", {
                  key: 1,
                  "aria-label": "Administração"
                }, [
                  (can('admissions.read'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 0,
                        href: "#/online",
                        class: _normalizeClass({active:state.page==='online'}),
                        onClick: _withModifiers($event => (navigate('online')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "↗"), _createTextVNode("Inscrições online")], 10, ["onClick"]))
                    : _createCommentVNode("", true),
                  (can('banking.read'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 1,
                        href: "#/banking",
                        class: _normalizeClass({active:state.page==='banking'}),
                        onClick: _withModifiers($event => (navigate('banking')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "＄"), _createTextVNode("Cobranças")], 10, ["onClick"]))
                    : _createCommentVNode("", true),
                  (can('integrations.manage'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 2,
                        href: "#/integrations",
                        class: _normalizeClass({active:state.page==='integrations'}),
                        onClick: _withModifiers($event => (navigate('integrations')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "⇄"), _createTextVNode("Financeiro / ASAAS")], 10, ["onClick"]))
                    : _createCommentVNode("", true),
                  (can('connect.manage'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 3,
                        href: "#/connect",
                        class: _normalizeClass({active:state.page==='connect'}),
                        onClick: _withModifiers($event => (navigate('connect')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "◌"), _createTextVNode("Connect API")], 10, ["onClick"]))
                    : _createCommentVNode("", true),
                  (can('schools.manage'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 4,
                        href: "#/settings",
                        class: _normalizeClass({active:state.page==='settings'}),
                        onClick: _withModifiers($event => (navigate('settings')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "◇"), _createTextVNode("Instituição")], 10, ["onClick"]))
                    : _createCommentVNode("", true),
                  (can('users.manage'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 5,
                        href: "#/users",
                        class: _normalizeClass({active:state.page==='users'}),
                        onClick: _withModifiers($event => (navigate('users')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "♙"), _createTextVNode("Usuários e acessos")], 10, ["onClick"]))
                    : _createCommentVNode("", true),
                  (can('audit.read'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 6,
                        href: "#/audit",
                        class: _normalizeClass({active:state.page==='audit'}),
                        onClick: _withModifiers($event => (navigate('audit')), ["prevent"])
                      }, [_createElementVNode("span", { class: "nav-icon" }, "◷"), _createTextVNode("Auditoria")], 10, ["onClick"]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "sidebar-footer" }, [_createElementVNode("span", { class: "dot" }), _createTextVNode("Self-hosted "), _createElementVNode("small", null, "v0.3.0 · Secretaria")])
          ], 2), _createElementVNode("div", { class: "main-column" }, [_createElementVNode("header", { class: "topbar" }, [_createElementVNode("button", {
            class: "icon-button menu-button",
            onClick: $event => (state.menuOpen=!state.menuOpen),
            "aria-label": "Abrir menu"
          }, "☰", 8, ["onClick"]), _createElementVNode("div", { class: "school-switch" }, [_createElementVNode("span", { class: "small muted" }, "INSTITUIÇÃO ATIVA"), _withDirectives(_createElementVNode("select", {
            "aria-label": "Selecionar escola",
            "onUpdate:modelValue": $event => ((state.schoolId) = $event),
            onChange: changeSchool,
            disabled: state.busy || !!state.modal.kind
          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.schools, (s) => {
            return (_openBlock(), _createElementBlock("option", {
              key: s.id,
              value: s.id
            }, _toDisplayString(s.name), 9, ["value"]))
          }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, state.schoolId]])]), _createElementVNode("div", { class: "topbar-actions" }, [
            _createElementVNode("span", { class: _normalizeClass(["online-chip", {offline:!state.online}]) }, [_createElementVNode("i", { class: "dot" }), _createTextVNode(_toDisplayString(state.online?'Online':'Sem conexão'), 1)], 2),
            (state.canInstall)
              ? (_openBlock(), _createElementBlock("button", {
                  key: 0,
                  class: "btn btn-secondary small-button",
                  onClick: install
                }, "Instalar PWA", 8, ["onClick"]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "user-caption" }, [_createElementVNode("strong", null, _toDisplayString(state.user.name), 1), _createElementVNode("small", null, _toDisplayString(label(state.user.role)), 1)]),
            _createElementVNode("button", {
              class: "avatar user-avatar",
              onClick: password,
              title: "Alterar minha senha"
            }, _toDisplayString(initials(state.user.name)), 9, ["onClick"]),
            _createElementVNode("button", {
              class: "icon-button",
              onClick: logout,
              title: "Sair"
            }, "↪", 8, ["onClick"])
          ])]), _createElementVNode("main", {
            id: "main-content",
            class: "main-content"
          }, [
            (!state.online)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "alert warning"
                }, "Sem conexão. Cadastros e matrículas exigem confirmação do servidor; nenhuma alteração será enviada em segundo plano."))
              : _createCommentVNode("", true),
            (state.updateAvailable)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "alert info"
                }, [_createTextVNode("Uma nova versão está disponível. "), _createElementVNode("button", {
                  class: "link-button",
                  disabled: !!state.modal.kind,
                  onClick: updateApp
                }, "Atualizar aplicação", 8, ["disabled", "onClick"])]))
              : _createCommentVNode("", true),
            (state.error)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 2,
                  class: "alert error",
                  role: "alert"
                }, [_createElementVNode("span", null, _toDisplayString(state.error), 1), _createElementVNode("button", {
                  onClick: $event => (state.error=''),
                  "aria-label": "Fechar erro"
                }, "×", 8, ["onClick"])]))
              : _createCommentVNode("", true),
            (state.success)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 3,
                  class: "alert success",
                  role: "status"
                }, [_createElementVNode("span", null, _toDisplayString(state.success), 1), _createElementVNode("button", {
                  onClick: $event => (state.success=''),
                  "aria-label": "Fechar aviso"
                }, "×", 8, ["onClick"])]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "page-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "breadcrumb" }, _toDisplayString(registryPages.includes(state.page)?'Cadastros':'Secretaria') + " / " + _toDisplayString(pageLabels[state.page]), 1), _createElementVNode("h1", null, _toDisplayString(state.selectedStudent ? state.selectedStudent.person.name : pageLabels[state.page]), 1), _createElementVNode("p", { class: "page-subtitle" }, _toDisplayString(state.selectedStudent ? 'Ficha do aluno · '+state.selectedStudent.number : 'Informação organizada para cuidar de cada etapa da vida escolar.'), 1)]), _createElementVNode("div", { class: "actions" }, [
              (registryPages.includes(state.page) && state.page!=='people' && !state.selectedStudent && can('people.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-secondary",
                    onClick: reusePerson
                  }, "Vincular pessoa existente", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (isBusiness() && can('people.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 1,
                    class: "btn btn-primary",
                    onClick: $event => (newBusiness())
                  }, "+ Cadastrar " + _toDisplayString(businessTypes[state.page].singular), 9, ["onClick"]))
                : _createCommentVNode("", true),
              (state.selectedStudent)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 2,
                    class: "btn btn-secondary",
                    onClick: $event => (navigate('students'))
                  }, "← Todos os alunos", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='people' && can('people.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 3,
                    class: "btn btn-primary",
                    onClick: newPerson
                  }, "+ Nova pessoa", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='students' && !state.selectedStudent && can('people.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 4,
                    class: "btn btn-primary",
                    onClick: $event => (newStudent())
                  }, "+ Novo aluno", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='teachers' && can('people.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 5,
                    class: "btn btn-primary",
                    onClick: $event => (newTeacher())
                  }, "+ Novo professor", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='employees' && can('people.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 6,
                    class: "btn btn-primary",
                    onClick: $event => (newEmployee())
                  }, "+ Novo funcionário", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='guardians' && can('people.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 7,
                    class: "btn btn-primary",
                    onClick: newGuardian
                  }, "+ Novo responsável", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='enrollments' && can('enrollments.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 8,
                    class: "btn btn-primary",
                    onClick: newEnrollment
                  }, "+ Nova matrícula", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='academic' && can('academic.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 9,
                    class: "btn btn-primary",
                    onClick: $event => (newCatalog())
                  }, "+ Cadastrar", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='protocols' && can('protocols.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 10,
                    class: "btn btn-primary",
                    onClick: $event => (newProtocol())
                  }, "+ Abrir protocolo", 8, ["onClick"]))
                : _createCommentVNode("", true),
              (state.page==='users' && can('users.manage'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 11,
                    class: "btn btn-primary",
                    onClick: $event => (newUser())
                  }, "+ Criar usuário", 8, ["onClick"]))
                : _createCommentVNode("", true)
            ])]),
            (state.loading)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 4,
                  class: "loading-strip",
                  role: "status"
                }, "Carregando registros…"))
              : _createCommentVNode("", true),
            (['online','banking','integrations','connect'].includes(state.page))
              ? (_openBlock(), _createBlock(_component_expansion_panel, {
                  key: state.schoolId+':'+state.page,
                  "school-id": state.schoolId,
                  page: state.page,
                  permissions: state.user.permissions
                }, null, 8, ["school-id", "page", "permissions"]))
              : _createCommentVNode("", true),
            (state.page==='dashboard' && !isProfileRole())
              ? (_openBlock(), _createElementBlock("section", {
                  key: 6,
                  class: "dashboard"
                }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [
                  _createElementVNode("p", { class: "eyebrow" }, "ROTINA ESCOLAR EM DIA"),
                  _createElementVNode("h2", null, [_createTextVNode("Uma visão completa."), _createElementVNode("br"), _createTextVNode("Uma Secretaria mais próxima.")]),
                  _createElementVNode("p", null, "Comece um cadastro, acompanhe matrículas ou consulte a documentação dos alunos."),
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
                      }, "Nova matrícula →", 8, ["onClick"]))
                    : _createCommentVNode("", true)])
                ]), _createElementVNode("div", {
                  class: "welcome-art",
                  "aria-hidden": "true"
                }, [_createElementVNode("span", null, "ALUNO"), _createElementVNode("strong", null, [
                  _createTextVNode("Cadastro"),
                  _createElementVNode("br"),
                  _createTextVNode("Documentos"),
                  _createElementVNode("br"),
                  _createTextVNode("Matrícula")
                ]), _createElementVNode("i", null, "✓")])]), _createElementVNode("div", { class: "stats-grid" }, [
                  _createElementVNode("div", { class: "stat-card" }, [
                    _createElementVNode("span", null, "Alunos cadastrados"),
                    _createElementVNode("strong", null, _toDisplayString(state.dashboard.students ?? '—'), 1),
                    _createElementVNode("small", null, "Cadastros ativos na escola"),
                    _createElementVNode("i", null, "◎")
                  ]),
                  _createElementVNode("div", { class: "stat-card" }, [
                    _createElementVNode("span", null, "Matrículas ativas"),
                    _createElementVNode("strong", null, _toDisplayString(state.dashboard.enrollments ?? '—'), 1),
                    _createElementVNode("small", null, "Vínculos confirmados"),
                    _createElementVNode("i", null, "▤")
                  ]),
                  _createElementVNode("div", { class: "stat-card" }, [
                    _createElementVNode("span", null, "Aguardando ativação"),
                    _createElementVNode("strong", null, _toDisplayString(state.dashboard.drafts ?? '—'), 1),
                    _createElementVNode("small", null, "Matrículas em rascunho"),
                    _createElementVNode("i", { class: "amber" }, "◷")
                  ]),
                  _createElementVNode("div", { class: "stat-card" }, [
                    _createElementVNode("span", null, "Vagas disponíveis"),
                    _createElementVNode("strong", null, _toDisplayString(state.dashboard.available ?? '—'), 1),
                    _createElementVNode("small", null, "Nos períodos letivos ativos"),
                    _createElementVNode("i", null, "▥")
                  ])
                ]), _createElementVNode("div", { class: "dashboard-grid" }, [_createElementVNode("section", { class: "panel" }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "Matrículas recentes"), _createElementVNode("button", {
                  class: "link-button",
                  onClick: $event => (navigate('enrollments'))
                }, "Ver todas →", 8, ["onClick"])]), _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Aluno"), _createElementVNode("th", null, "Turma"), _createElementVNode("th", null, "Situação")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.dashboard.recent_enrollments, (e) => {
                  return (_openBlock(), _createElementBlock("tr", {
                    key: e.id,
                    onClick: $event => (viewEnrollment(e.id)),
                    class: "clickable"
                  }, [_createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(e.student_name), 1), _createElementVNode("small", null, _toDisplayString(e.number), 1)]), _createElementVNode("td", null, [_createTextVNode(_toDisplayString(e.class_name), 1), _createElementVNode("small", null, _toDisplayString(e.year_name), 1)]), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", e.status]) }, _toDisplayString(label(e.status)), 3)])], 8, ["onClick"]))
                }), 128))])]), (!state.dashboard.recent_enrollments?.length)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "empty-state"
                    }, [_createElementVNode("span", null, "▤"), _createElementVNode("h3", null, "Sua primeira matrícula começa aqui"), _createElementVNode("p", null, "Cadastre o aluno e configure uma turma para iniciar.")]))
                  : _createCommentVNode("", true)])]), _createElementVNode("section", { class: "panel attention-panel" }, [
                  _createElementVNode("p", { class: "eyebrow" }, "ACOMPANHAMENTO"),
                  _createElementVNode("h2", null, "O que precisa de atenção?"),
                  _createElementVNode("button", { onClick: $event => (navigate('documents')) }, [_createElementVNode("span", null, [_createTextVNode("Documentos recebidos"), _createElementVNode("small", null, "Aguardando análise da Secretaria")]), _createElementVNode("b", null, _toDisplayString(state.dashboard.received_documents ?? 0), 1)], 8, ["onClick"]),
                  _createElementVNode("button", { onClick: $event => (navigate('protocols')) }, [_createElementVNode("span", null, [_createTextVNode("Protocolos abertos"), _createElementVNode("small", null, _toDisplayString(state.dashboard.overdue_protocols ?? 0) + " com prazo vencido", 1)]), _createElementVNode("b", null, _toDisplayString(state.dashboard.open_protocols ?? 0), 1)], 8, ["onClick"]),
                  _createElementVNode("button", { onClick: $event => (navigate('academic')) }, [_createElementVNode("span", null, [_createTextVNode("Turmas disponíveis"), _createElementVNode("small", null, "Estrutura dos períodos ativos")]), _createElementVNode("b", null, _toDisplayString(state.dashboard.classes ?? 0), 1)], 8, ["onClick"])
                ])])]))
              : _createCommentVNode("", true),
            (state.page==='dashboard' && isProfileRole())
              ? (_openBlock(), _createElementBlock("section", {
                  key: 7,
                  class: "dashboard"
                }, [(state.user.role==='teacher')
                  ? (_openBlock(), _createElementBlock("div", { key: 0 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ESPAÇO DO PROFESSOR"), _createElementVNode("h2", null, "Suas turmas e alunos."), _createElementVNode("p", null, "Consulte as turmas atribuídas a você e acompanhe a lista real de alunos de cada classe.")]), _createElementVNode("div", {
                      class: "welcome-art",
                      "aria-hidden": "true"
                    }, [_createElementVNode("span", null, "PROFESSOR"), _createElementVNode("strong", null, [
                      _createTextVNode("Turmas"),
                      _createElementVNode("br"),
                      _createTextVNode("Alunos"),
                      _createElementVNode("br"),
                      _createTextVNode("Vínculos")
                    ]), _createElementVNode("i", null, "✓")])]), (!state.profileContext.assignments?.length)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "alert info"
                        }, "Seu usuário ainda não possui turmas atribuídas. Solicite à Direção ou à Coordenação o vínculo com uma turma."))
                      : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.profileContext.assignments || [], (assignment) => {
                      return (_openBlock(), _createElementBlock("section", {
                        key: assignment.id,
                        class: "panel spaced"
                      }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(assignment.school_name), 1), _createElementVNode("h2", null, _toDisplayString(assignment.class_name), 1), _createElementVNode("p", { class: "muted" }, [_createTextVNode(_toDisplayString(assignment.grade_name) + " · " + _toDisplayString(assignment.shift_name) + " · " + _toDisplayString(assignment.year_name), 1), (assignment.subject_name)
                        ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · " + _toDisplayString(assignment.subject_name), 1))
                        : _createCommentVNode("", true)])]), _createElementVNode("span", { class: "badge active" }, _toDisplayString(assignment.students.length) + " aluno(s)", 1)]), _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Número"), _createElementVNode("th", null, "Aluno"), _createElementVNode("th", null, "Situação")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(assignment.students, (student) => {
                        return (_openBlock(), _createElementBlock("tr", { key: student.id }, [_createElementVNode("td", { class: "mono" }, _toDisplayString(student.number), 1), _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(student.name), 1)]), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", student.status]) }, _toDisplayString(label(student.status)), 3)])]))
                      }), 128))])])])]))
                    }), 128))]))
                  : (state.user.role==='student')
                    ? (_openBlock(), _createElementBlock("div", { key: 1 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ESPAÇO DO ALUNO"), _createElementVNode("h2", null, "Acompanhe sua vida escolar."), _createElementVNode("p", null, "Este espaço mostra somente os dados escolares vinculados ao seu próprio cadastro.")]), _createElementVNode("div", {
                        class: "welcome-art",
                        "aria-hidden": "true"
                      }, [_createElementVNode("span", null, "ALUNO"), _createElementVNode("strong", null, [
                        _createTextVNode("Matrículas"),
                        _createElementVNode("br"),
                        _createTextVNode("Documentos"),
                        _createElementVNode("br"),
                        _createTextVNode("Histórico")
                      ]), _createElementVNode("i", null, "✓")])]), (!state.profileContext.students?.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "alert warning"
                          }, "Seu usuário ainda não possui um cadastro de aluno vinculado. Solicite a correção ao administrador."))
                        : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.profileContext.students || [], (student) => {
                        return (_openBlock(), _createElementBlock("section", {
                          key: student.id,
                          class: "panel spaced"
                        }, [
                          _createElementVNode("div", { class: "panel-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(student.school_name), 1), _createElementVNode("h2", null, _toDisplayString(student.name), 1), _createElementVNode("p", { class: "muted" }, _toDisplayString(student.number) + " · " + _toDisplayString(label(student.status)), 1)]), _createElementVNode("span", { class: "badge active" }, _toDisplayString(student.enrollments.length) + " matrícula(s)", 1)]),
                          _createElementVNode("h3", null, "Matrículas"),
                          _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                            _createElementVNode("th", null, "Número"),
                            _createElementVNode("th", null, "Turma"),
                            _createElementVNode("th", null, "Ano letivo"),
                            _createElementVNode("th", null, "Situação")
                          ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student.enrollments, (enrollment) => {
                            return (_openBlock(), _createElementBlock("tr", { key: enrollment.id }, [
                              _createElementVNode("td", { class: "mono" }, _toDisplayString(enrollment.number), 1),
                              _createElementVNode("td", null, [_createTextVNode(_toDisplayString(enrollment.class_name), 1), _createElementVNode("small", null, _toDisplayString(enrollment.grade_name) + " · " + _toDisplayString(enrollment.shift_name), 1)]),
                              _createElementVNode("td", null, _toDisplayString(enrollment.year_name), 1),
                              _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", enrollment.status]) }, _toDisplayString(label(enrollment.status)), 3)])
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
                              }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Documento"), _createElementVNode("th", null, "Situação"), _createElementVNode("th", null, "Validade")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student.documents, (document) => {
                                return (_openBlock(), _createElementBlock("tr", { key: document.id }, [_createElementVNode("td", null, _toDisplayString(document.type_name), 1), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", document.status]) }, _toDisplayString(label(document.status)), 3)]), _createElementVNode("td", null, _toDisplayString(date(document.expires_on)), 1)]))
                              }), 128))])])]))
                        ]))
                      }), 128))]))
                    : (_openBlock(), _createElementBlock("div", { key: 2 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ESPAÇO DO RESPONSÁVEL"), _createElementVNode("h2", null, "Acompanhe os alunos vinculados à família."), _createElementVNode("p", null, "O acesso é limitado aos vínculos ativos autorizados pela instituição.")]), _createElementVNode("div", {
                        class: "welcome-art",
                        "aria-hidden": "true"
                      }, [_createElementVNode("span", null, "FAMÍLIA"), _createElementVNode("strong", null, [
                        _createTextVNode("Alunos"),
                        _createElementVNode("br"),
                        _createTextVNode("Matrículas"),
                        _createElementVNode("br"),
                        _createTextVNode("Vínculos")
                      ]), _createElementVNode("i", null, "✓")])]), (!state.profileContext.students?.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "alert warning"
                          }, "Seu usuário ainda não possui vínculo ativo com um aluno. Solicite a correção à Secretaria."))
                        : _createCommentVNode("", true), _createElementVNode("div", { class: "dashboard-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.profileContext.students || [], (student) => {
                        return (_openBlock(), _createElementBlock("section", {
                          key: student.id,
                          class: "panel"
                        }, [
                          _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(student.school_name), 1),
                          _createElementVNode("h2", null, _toDisplayString(student.name), 1),
                          _createElementVNode("p", { class: "muted" }, _toDisplayString(student.number) + " · " + _toDisplayString(student.relationship) + " · " + _toDisplayString(label(student.status)), 1),
                          _createElementVNode("h3", { class: "spaced" }, "Matrículas"),
                          (!student.enrollments.length)
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 0,
                                class: "empty-state"
                              }, [_createElementVNode("p", null, "Nenhuma matrícula disponível.")]))
                            : (_openBlock(), _createElementBlock("div", {
                                key: 1,
                                class: "table-scroll"
                              }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Turma"), _createElementVNode("th", null, "Ano"), _createElementVNode("th", null, "Situação")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student.enrollments, (enrollment) => {
                                return (_openBlock(), _createElementBlock("tr", { key: enrollment.id }, [_createElementVNode("td", null, [_createTextVNode(_toDisplayString(enrollment.class_name), 1), _createElementVNode("small", null, _toDisplayString(enrollment.grade_name) + " · " + _toDisplayString(enrollment.shift_name), 1)]), _createElementVNode("td", null, _toDisplayString(enrollment.year_name), 1), _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", enrollment.status]) }, _toDisplayString(label(enrollment.status)), 3)])]))
                              }), 128))])])]))
                        ]))
                      }), 128))])]))]))
              : _createCommentVNode("", true),
            (state.page==='students' && state.selectedStudent)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 8,
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
                    _createElementVNode("div", { class: "grow" }, [_createElementVNode("h2", null, _toDisplayString(state.selectedStudent.person.social_name || state.selectedStudent.person.name), 1), _createElementVNode("p", null, _toDisplayString(state.selectedStudent.number) + " · Nascimento " + _toDisplayString(date(state.selectedStudent.person.birth_date)), 1)]),
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
                      onClick: $event => (state.studentTab=tab)
                    }, _toDisplayString({cadastro:'Dados cadastrais',responsaveis:'Responsáveis',documentos:'Documentos',matriculas:'Matrículas',protocolos:'Protocolos',historico:'Movimentações'}[tab]), 11, ["onClick"]))
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
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "Nome social"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.social_name || 'Não informado'), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "CPF"), _createElementVNode("dd", null, _toDisplayString(cpf(state.selectedStudent.person.cpf)), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "Data de nascimento"), _createElementVNode("dd", null, _toDisplayString(date(state.selectedStudent.person.birth_date)), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "Telefone / WhatsApp"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.phone || 'Não informado'), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "E-mail"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.email || 'Não informado'), 1)]),
                        _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "Endereço"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.person.address || 'Não informado'), 1)]),
                        _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "Observações"), _createElementVNode("dd", { class: "preserve" }, _toDisplayString(state.selectedStudent.person.notes || 'Sem observações.'), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "Escola anterior"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.previous_school || 'Não informada'), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "NIS / PIS"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.nis || 'Não informado'), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "Cartão SUS"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.sus_card || 'Não informado'), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "Código INEP"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.inep_code || 'Não informado'), 1)]),
                        _createElementVNode("div", null, [_createElementVNode("dt", null, "Plano de saúde"), _createElementVNode("dd", null, _toDisplayString(state.selectedStudent.health_plan || 'Não informado'), 1)]),
                        _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "Informações de saúde"), _createElementVNode("dd", { class: "preserve" }, _toDisplayString([state.selectedStudent.allergies,state.selectedStudent.medications,state.selectedStudent.health_notes,state.selectedStudent.special_needs].filter(Boolean).join(' · ') || 'Não informado'), 1)]),
                        _createElementVNode("div", { class: "wide" }, [_createElementVNode("dt", null, "Observações pedagógicas"), _createElementVNode("dd", { class: "preserve" }, _toDisplayString(state.selectedStudent.student_notes || 'Sem observações.'), 1)])
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
                      }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "Família e vínculos"), (can('people.write'))
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "btn btn-primary",
                            onClick: newLink
                          }, "+ Vincular responsável", 8, ["onClick"]))
                        : _createCommentVNode("", true)]), (!state.selectedStudent.guardians?.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "empty-state"
                          }, [_createElementVNode("h3", null, "Nenhum responsável vinculado"), _createElementVNode("p", null, "Cadastre a pessoa em Responsáveis e vincule-a ao aluno.")]))
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
                          _createElementVNode("p", null, _toDisplayString(g.relationship) + " · " + _toDisplayString(g.active?'Vínculo ativo':'Vínculo inativo'), 1),
                          _createElementVNode("p", null, _toDisplayString(g.person.phone || g.person.email || 'Contato não informado'), 1),
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
                              }, "Editar vínculo →", 8, ["onClick"]))
                            : _createCommentVNode("", true)
                        ], 2))
                      }), 128))])]))
                    : _createCommentVNode("", true),
                  (state.studentTab==='documentos')
                    ? (_openBlock(), _createElementBlock("section", { key: 2 }, [
                        _createElementVNode("div", { class: "section-actions" }, [_createElementVNode("h2", null, "Documentação do aluno"), _createElementVNode("div", { class: "actions" }, [(can('documents.waive'))
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
                          }, [_createElementVNode("span", { class: _normalizeClass(c.complete?'check-ok':'check-pending') }, _toDisplayString(c.complete?'✓':'!'), 3), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(c.name), 1), _createElementVNode("small", null, _toDisplayString(c.required?'Obrigatório':'Opcional') + " · " + _toDisplayString(label(c.status)), 1)])]))
                        }), 128))]),
                        (!state.studentDocs.checklist.length)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 0,
                              class: "alert info"
                            }, "Cadastre tipos de documento em Estrutura acadêmica → Tipos de documento."))
                          : _createCommentVNode("", true),
                        _createElementVNode("div", { class: "panel table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                          _createElementVNode("th", null, "Documento / arquivo"),
                          _createElementVNode("th", null, "Recebimento"),
                          _createElementVNode("th", null, "Validade"),
                          _createElementVNode("th", null, "Situação"),
                          _createElementVNode("th", null, "Ações")
                        ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentDocs.items, (d) => {
                          return (_openBlock(), _createElementBlock("tr", { key: d.id }, [
                            _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(d.type_name), 1), _createElementVNode("small", null, _toDisplayString(d.file?.original_name || 'Dispensa justificada'), 1)]),
                            _createElementVNode("td", null, _toDisplayString(date(d.created_at)), 1),
                            _createElementVNode("td", null, _toDisplayString(date(d.expires_on)), 1),
                            _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", d.effective_status]) }, _toDisplayString(label(d.effective_status)), 3)]),
                            _createElementVNode("td", null, [_createElementVNode("div", { class: "actions compact" }, [(d.file_id)
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  class: "link-button",
                                  onClick: $event => (downloadFile(d.file_id,d.file.original_name))
                                }, "Baixar", 8, ["onClick"]))
                              : _createCommentVNode("", true), (can('documents.validate') && !['waived','archived'].includes(d.status))
                              ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(d.status!=='validated')
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
                              : _createCommentVNode("", true)])])
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
                              }, [_createElementVNode("span", null, [_createTextVNode(_toDisplayString({student_record:'Ficha cadastral',enrollment_receipt:'Comprovante de matrícula',enrollment_declaration:'Declaração de matrícula',enrollment_form:'Ficha de matrícula'}[d.kind]), 1), _createElementVNode("small", null, _toDisplayString(date(d.created_at)) + " · Modelo v" + _toDisplayString(d.template_version), 1)]), _createElementVNode("button", {
                                class: "link-button",
                                onClick: $event => (downloadFile(d.file_id))
                              }, "Baixar PDF →", 8, ["onClick"])]))
                            }), 128))]))
                          : _createCommentVNode("", true)
                      ]))
                    : _createCommentVNode("", true),
                  (state.studentTab==='matriculas')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 3,
                        class: "panel table-scroll"
                      }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                        _createElementVNode("th", null, "Matrícula"),
                        _createElementVNode("th", null, "Ano letivo"),
                        _createElementVNode("th", null, "Turma"),
                        _createElementVNode("th", null, "Situação"),
                        _createElementVNode("th")
                      ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selectedStudent.enrollments, (e) => {
                        return (_openBlock(), _createElementBlock("tr", { key: e.id }, [
                          _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(e.number), 1)]),
                          _createElementVNode("td", null, _toDisplayString(getName('academic-years',e.academic_year_id)), 1),
                          _createElementVNode("td", null, _toDisplayString(getName('class-groups',e.class_group_id)), 1),
                          _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", e.status]) }, _toDisplayString(label(e.status)), 3)]),
                          _createElementVNode("td", null, [_createElementVNode("button", {
                            class: "link-button",
                            onClick: $event => (viewEnrollment(e.id))
                          }, "Abrir matrícula →", 8, ["onClick"])])
                        ]))
                      }), 128))])]), (!state.selectedStudent.enrollments?.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "empty-state"
                          }, [_createElementVNode("p", null, "Este aluno ainda não possui matrícula.")]))
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
                          }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(p.number) + " · " + _toDisplayString(p.kind), 1), _createElementVNode("small", null, [_createTextVNode(_toDisplayString(date(p.created_at)) + " · " + _toDisplayString(label(p.status)), 1), (p.overdue)
                            ? (_openBlock(), _createElementBlock("span", {
                                key: 0,
                                class: "danger-text"
                              }, " · Prazo vencido"))
                            : _createCommentVNode("", true)])]), _createElementVNode("button", {
                            class: "link-button",
                            onClick: $event => (viewProtocol(p.id))
                          }, "Ver atendimento →", 8, ["onClick"])]))
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
                      }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "Histórico de movimentações")]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.history, (h) => {
                        return (_openBlock(), _createElementBlock("div", {
                          key: h.id,
                          class: "timeline-item"
                        }, [_createElementVNode("span", { class: "timeline-dot" }), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString({created:'Matrícula criada',draft_updated:'Pré-matrícula editada',reenrolled:'Rematrícula criada',activate:'Matrícula ativada',change_class:'Turma alterada',cancel:'Matrícula cancelada',transfer:'Transferência externa',suspend:'Matrícula suspensa',reactivate:'Matrícula reativada',complete:'Matrícula concluída'}[h.action] || h.action), 1), _createElementVNode("p", null, _toDisplayString(h.reason), 1), _createElementVNode("small", null, _toDisplayString(date(h.created_at)) + " · " + _toDisplayString(h.after.number), 1)])]))
                      }), 128)), (!state.history.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "empty-state"
                          }, [_createElementVNode("p", null, "Nenhuma movimentação registrada.")]))
                        : _createCommentVNode("", true)]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true),
            (['people','students','teachers','employees','guardians','suppliers','providers','customers','partners','academic','enrollments','documents','protocols','users','audit'].includes(state.page) && !state.selectedStudent)
              ? (_openBlock(), _createElementBlock("section", { key: 9 }, [
                  (state.page==='academic')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: "tabs"
                      }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(catalogLabels, (caption, kind) => {
                        return (_openBlock(), _createElementBlock("button", {
                          key: kind,
                          class: _normalizeClass({active:state.catalog===kind}),
                          onClick: $event => (setCatalog(kind))
                        }, _toDisplayString(caption), 11, ["onClick"]))
                      }), 128))]))
                    : _createCommentVNode("", true),
                  (['people','students','teachers','employees','guardians','suppliers','providers','customers','partners'].includes(state.page))
                    ? (_openBlock(), _createElementBlock("form", {
                        key: 1,
                        class: "filter-bar",
                        onSubmit: _withModifiers(search, ["prevent"])
                      }, [_createElementVNode("label", { class: "search-field" }, [_createElementVNode("span", null, "⌕"), _withDirectives(_createElementVNode("input", {
                        "onUpdate:modelValue": $event => ((state.q) = $event),
                        placeholder: "Buscar nome, CPF/CNPJ, código ou telefone…",
                        "aria-label": "Buscar registros"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.q]])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Buscar"), _createElementVNode("span", { class: "muted small" }, _toDisplayString(state.total) + " registros", 1)], 40, ["onSubmit"]))
                    : _createCommentVNode("", true),
                  (['people','guardians',...Object.keys(businessTypes)].includes(state.page))
                    ? (_openBlock(), _createElementBlock("form", {
                        key: 2,
                        class: "registry-filters",
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
                      }, [_createElementVNode("option", { value: "" }, "Todas"), _createElementVNode("option", { value: "individual" }, "Pessoa física"), _createElementVNode("option", { value: "organization" }, "Pessoa jurídica")], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.registryFilter.entity_kind]])]), _createElementVNode("label", null, [_createTextVNode("Situação cadastral"), _withDirectives(_createElementVNode("select", {
                        "aria-label": "Situação cadastral",
                        "onUpdate:modelValue": $event => ((state.registryFilter.active) = $event),
                        onChange: search
                      }, [_createElementVNode("option", { value: "" }, "Todas"), _createElementVNode("option", { value: "true" }, "Ativos"), _createElementVNode("option", { value: "false" }, "Inativos")], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.registryFilter.active]])])], 40, ["onSubmit"]))
                    : _createCommentVNode("", true),
                  (['enrollments','documents','protocols'].includes(state.page))
                    ? (_openBlock(), _createElementBlock("form", {
                        key: 3,
                        class: "panel filter-panel",
                        onSubmit: _withModifiers(search, ["prevent"])
                      }, [_createElementVNode("div", { class: "filter-grid" }, [
                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Pesquisar"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((state.q) = $event),
                          placeholder: state.page==='protocols'?'Número, assunto ou descrição':'Nome do aluno ou número',
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
                            }, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", {
                              "aria-label": "Situação",
                              "onUpdate:modelValue": $event => ((state.filters.status) = $event)
                            }, [_createElementVNode("option", { value: "" }, "Todas as situações"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['draft','active','suspended','transferred','cancelled','completed'], (s) => {
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
                            }, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", {
                              "aria-label": "Situação",
                              "onUpdate:modelValue": $event => ((state.filters.status) = $event)
                            }, [_createElementVNode("option", { value: "" }, "Todas as situações"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['open','in_progress','waiting','completed','cancelled'], (s) => {
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
                            }, [_createElementVNode("option", { value: "" }, "Todos os obrigatórios"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('document-types'), (d) => {
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
                            }, [_createTextVNode("Pendência"), _withDirectives(_createElementVNode("select", {
                              "aria-label": "Pendência",
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
                      }, "Limpar", 8, ["onClick"])]), _createElementVNode("span", { class: "small muted" }, _toDisplayString(state.total) + " " + _toDisplayString(state.page==='documents'?(state.total===1?'aluno com pendências':'alunos com pendências'):(state.total===1?'registro':'registros')), 1)])], 40, ["onSubmit"]))
                    : _createCommentVNode("", true),
                  (state.page==='documents')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 4,
                        class: "document-summary"
                      }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(state.pendencySummary.total_documents) + " " + _toDisplayString(state.pendencySummary.total_documents===1?'pendência documental':'pendências documentais'), 1), _createElementVNode("p", { class: "small muted" }, "Documentos obrigatórios ainda não validados, rejeitados ou vencidos. Somente alunos ativos.")]), (can('reports.read'))
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
                        key: 5,
                        class: "alert warning"
                      }, "Resultado limitado: " + _toDisplayString(state.pendencySummary.scanned_students) + " de " + _toDisplayString(state.pendencySummary.total_students) + " alunos verificados. Restrinja por ano, turma ou nome. Exportações parciais são bloqueadas.", 1))
                    : _createCommentVNode("", true),
                  (state.page==='academic' && state.catalog==='class-groups')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 6,
                        class: "alert info"
                      }, "A capacidade é conferida ao ativar a matrícula. Matrículas suspensas continuam reservando a vaga."))
                    : _createCommentVNode("", true),
                  (state.page==='people')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 7,
                        class: "alert info"
                      }, "O cadastro único concentra uma única Pessoa. Ela pode possuir vários tipos funcionais simultaneamente — aluno, professor, funcionário, colaborador, pai, mãe ou responsável — sem duplicação. Login e perfil de acesso são administrados separadamente."))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "panel table-scroll" }, [(state.page==='people')
                    ? (_openBlock(), _createElementBlock("table", { key: 0 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                        _createElementVNode("th", null, "Pessoa"),
                        _createElementVNode("th", null, "Tipos de pessoa"),
                        _createElementVNode("th", null, "CPF / CNPJ"),
                        _createElementVNode("th", null, "Contato"),
                        _createElementVNode("th", null, "Situação"),
                        _createElementVNode("th")
                      ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                        return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                          _createElementVNode("td", null, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r))
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
                            : _createCommentVNode("", true)])])]),
                          _createElementVNode("td", null, _toDisplayString(r.person_type_labels?.length ? r.person_type_labels.join(' · ') : 'Cadastro geral'), 1),
                          _createElementVNode("td", null, _toDisplayString(personDocument(r)), 1),
                          _createElementVNode("td", null, _toDisplayString(r.phone || r.email || '—'), 1),
                          _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.active===false?'archived':'active']) }, _toDisplayString(r.active===false?'Inativo':'Ativo'), 3)]),
                          _createElementVNode("td", null, [_createElementVNode("div", { class: "actions compact" }, [
                            (can('people.write'))
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  class: "link-button",
                                  onClick: $event => (editPerson(r))
                                }, "Editar →", 8, ["onClick"]))
                              : _createCommentVNode("", true),
                            (can('people.write') && r.entity_kind!=='organization' && !r.student_id)
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 1,
                                  class: "link-button",
                                  onClick: $event => (newStudent(r))
                                }, "Adicionar aluno →", 8, ["onClick"]))
                              : _createCommentVNode("", true),
                            (can('people.write') && r.entity_kind!=='organization' && !r.teacher_id)
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 2,
                                  class: "link-button",
                                  onClick: $event => (newTeacher(r))
                                }, "Adicionar professor →", 8, ["onClick"]))
                              : _createCommentVNode("", true),
                            (can('people.write') && r.entity_kind!=='organization' && !r.employee_id)
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 3,
                                  class: "link-button",
                                  onClick: $event => (newEmployee(r))
                                }, "Adicionar funcionário →", 8, ["onClick"]))
                              : _createCommentVNode("", true)
                          ])])
                        ]))
                      }), 128))])]))
                    : (isBusiness())
                      ? (_openBlock(), _createElementBlock("table", { key: 1 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                          _createElementVNode("th", null, "Nome / razão social"),
                          _createElementVNode("th", null, "Natureza"),
                          _createElementVNode("th", null, "CPF / CNPJ"),
                          _createElementVNode("th", null, "Contato"),
                          _createElementVNode("th", null, "Categoria"),
                          _createElementVNode("th", null, "Situação"),
                          _createElementVNode("th")
                        ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                          return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                            _createElementVNode("td", null, [_createElementVNode("div", { class: "person-cell" }, [_createElementVNode("span", { class: "avatar" }, _toDisplayString(initials(r.name)), 1), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.trade_name || r.name), 1), (r.trade_name)
                              ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(r.name), 1))
                              : _createCommentVNode("", true)])])]),
                            _createElementVNode("td", null, _toDisplayString(r.entity_kind==='organization'?'Pessoa jurídica':'Pessoa física'), 1),
                            _createElementVNode("td", null, _toDisplayString(personDocument(r)), 1),
                            _createElementVNode("td", null, _toDisplayString(r.phone || r.email || '—'), 1),
                            _createElementVNode("td", null, _toDisplayString(r.business_profiles?.[businessTypes[state.page].code]?.category || '—'), 1),
                            _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.active?'active':'archived']) }, _toDisplayString(r.active?'Ativo':'Inativo'), 3)]),
                            _createElementVNode("td", null, [(can('people.write'))
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  class: "link-button",
                                  onClick: $event => (newBusiness(r))
                                }, "Editar →", 8, ["onClick"]))
                              : _createCommentVNode("", true)])
                          ]))
                        }), 128))])]))
                      : (state.page==='students')
                        ? (_openBlock(), _createElementBlock("table", { key: 2 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                            _createElementVNode("th", null, "Aluno"),
                            _createElementVNode("th", null, "CPF"),
                            _createElementVNode("th", null, "Nascimento"),
                            _createElementVNode("th", null, "Contato"),
                            _createElementVNode("th", null, "Situação"),
                            _createElementVNode("th")
                          ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                            return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                              _createElementVNode("td", null, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r.person))
                                ? (_openBlock(), _createElementBlock("img", {
                                    key: 0,
                                    class: "avatar",
                                    src: photoSrc(r.person),
                                    alt: 'Foto de '+r.person.name
                                  }, null, 8, ["src", "alt"]))
                                : (_openBlock(), _createElementBlock("span", {
                                    key: 1,
                                    class: "avatar"
                                  }, _toDisplayString(initials(r.person.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.person.social_name || r.person.name), 1), _createElementVNode("small", null, _toDisplayString(r.number), 1)])])]),
                              _createElementVNode("td", null, _toDisplayString(cpf(r.person.cpf)), 1),
                              _createElementVNode("td", null, _toDisplayString(date(r.person.birth_date)), 1),
                              _createElementVNode("td", null, _toDisplayString(r.person.phone || '—'), 1),
                              _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.status]) }, _toDisplayString(label(r.status)), 3)]),
                              _createElementVNode("td", null, [_createElementVNode("button", {
                                class: "link-button",
                                onClick: $event => (viewStudent(r.id))
                              }, "Abrir ficha →", 8, ["onClick"])])
                            ]))
                          }), 128))])]))
                        : (state.page==='teachers')
                          ? (_openBlock(), _createElementBlock("table", { key: 3 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                              _createElementVNode("th", null, "Professor"),
                              _createElementVNode("th", null, "Matrícula / registro"),
                              _createElementVNode("th", null, "Formação e atuação"),
                              _createElementVNode("th", null, "Vínculo"),
                              _createElementVNode("th")
                            ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                              return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                _createElementVNode("td", null, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r.person))
                                  ? (_openBlock(), _createElementBlock("img", {
                                      key: 0,
                                      class: "avatar",
                                      src: photoSrc(r.person),
                                      alt: 'Foto de '+r.person.name
                                    }, null, 8, ["src", "alt"]))
                                  : (_openBlock(), _createElementBlock("span", {
                                      key: 1,
                                      class: "avatar"
                                    }, _toDisplayString(initials(r.person.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.person.social_name || r.person.name), 1), _createElementVNode("small", null, _toDisplayString(r.person.phone || r.person.email || 'Sem contato'), 1)])])]),
                                _createElementVNode("td", null, [_createTextVNode(_toDisplayString(r.registration_number || '—'), 1), _createElementVNode("small", null, _toDisplayString(r.professional_registration || 'Sem registro profissional'), 1)]),
                                _createElementVNode("td", null, [_createTextVNode(_toDisplayString(r.degree_course || 'Formação não informada'), 1), _createElementVNode("small", null, _toDisplayString(r.teaching_areas || 'Áreas não informadas'), 1)]),
                                _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.employment_status]) }, _toDisplayString(label(r.employment_status)), 3), _createElementVNode("small", null, _toDisplayString(label(r.employment_type)) + " · " + _toDisplayString(r.workload_hours || 0) + "h/semana", 1)]),
                                _createElementVNode("td", null, [(can('people.write'))
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 0,
                                      class: "link-button",
                                      onClick: $event => (editTeacher(r))
                                    }, "Editar →", 8, ["onClick"]))
                                  : _createCommentVNode("", true)])
                              ]))
                            }), 128))])]))
                          : (state.page==='employees')
                            ? (_openBlock(), _createElementBlock("table", { key: 4 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                _createElementVNode("th", null, "Funcionário"),
                                _createElementVNode("th", null, "Matrícula"),
                                _createElementVNode("th", null, "Setor / cargo"),
                                _createElementVNode("th", null, "Vínculo"),
                                _createElementVNode("th")
                              ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                  _createElementVNode("td", null, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r.person))
                                    ? (_openBlock(), _createElementBlock("img", {
                                        key: 0,
                                        class: "avatar",
                                        src: photoSrc(r.person),
                                        alt: 'Foto de '+r.person.name
                                      }, null, 8, ["src", "alt"]))
                                    : (_openBlock(), _createElementBlock("span", {
                                        key: 1,
                                        class: "avatar"
                                      }, _toDisplayString(initials(r.person.name)), 1)), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(r.person.social_name || r.person.name), 1), _createElementVNode("small", null, _toDisplayString(r.person.phone || r.person.email || 'Sem contato'), 1)])])]),
                                  _createElementVNode("td", null, _toDisplayString(r.employee_number || '—'), 1),
                                  _createElementVNode("td", null, [_createTextVNode(_toDisplayString(r.department || 'Setor não informado'), 1), _createElementVNode("small", null, _toDisplayString(r.job_title || 'Cargo não informado'), 1)]),
                                  _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.employment_status]) }, _toDisplayString(label(r.employment_status)), 3), _createElementVNode("small", null, _toDisplayString(label(r.employment_type)) + " · " + _toDisplayString(r.work_schedule || 'Jornada não informada'), 1)]),
                                  _createElementVNode("td", null, [(can('people.write'))
                                    ? (_openBlock(), _createElementBlock("button", {
                                        key: 0,
                                        class: "link-button",
                                        onClick: $event => (editEmployee(r))
                                      }, "Editar →", 8, ["onClick"]))
                                    : _createCommentVNode("", true)])
                                ]))
                              }), 128))])]))
                            : (state.page==='guardians')
                              ? (_openBlock(), _createElementBlock("table", { key: 5 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                  _createElementVNode("th", null, "Responsável"),
                                  _createElementVNode("th", null, "CPF"),
                                  _createElementVNode("th", null, "Telefone"),
                                  _createElementVNode("th", null, "E-mail"),
                                  _createElementVNode("th")
                                ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                  return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                    _createElementVNode("td", null, [_createElementVNode("div", { class: "person-cell" }, [(photoSrc(r))
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
                                      : _createCommentVNode("", true)])])]),
                                    _createElementVNode("td", null, _toDisplayString(cpf(r.cpf)), 1),
                                    _createElementVNode("td", null, _toDisplayString(r.phone || '—'), 1),
                                    _createElementVNode("td", null, _toDisplayString(r.email || '—'), 1),
                                    _createElementVNode("td", null, [(can('people.write'))
                                      ? (_openBlock(), _createElementBlock("button", {
                                          key: 0,
                                          class: "link-button",
                                          onClick: $event => (editPerson(r))
                                        }, "Editar →", 8, ["onClick"]))
                                      : _createCommentVNode("", true)])
                                  ]))
                                }), 128))])]))
                              : (state.page==='academic')
                                ? (_openBlock(), _createElementBlock("table", { key: 6 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                    _createElementVNode("th", null, "Nome"),
                                    _createElementVNode("th", null, "Detalhes"),
                                    _createElementVNode("th", null, "Situação"),
                                    _createElementVNode("th")
                                  ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                    return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                      _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.name), 1)]),
                                      _createElementVNode("td", null, [(state.catalog==='class-groups')
                                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createTextVNode(_toDisplayString(getName('academic-years',r.academic_year_id)) + " · " + _toDisplayString(getName('grades',r.grade_id)) + " · " + _toDisplayString(getName('shifts',r.shift_id)), 1), _createElementVNode("small", null, _toDisplayString(r.occupied) + " / " + _toDisplayString(r.capacity) + " vagas ocupadas · " + _toDisplayString(r.available) + " disponíveis", 1)], 64))
                                        : (state.catalog==='academic-years')
                                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createTextVNode(_toDisplayString(date(r.starts_on)) + " a " + _toDisplayString(date(r.ends_on)), 1)], 64))
                                          : (state.catalog==='grades')
                                            ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createTextVNode(_toDisplayString(r.level), 1)], 64))
                                            : (state.catalog==='document-types')
                                              ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [_createTextVNode(_toDisplayString(r.required?'Obrigatório':'Opcional') + " · " + _toDisplayString(r.grade_id?getName('grades',r.grade_id):'Todas as séries'), 1)], 64))
                                              : (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [_createTextVNode("Cadastro institucional")], 64))]),
                                      _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.status || (r.active?'active':'archived')]) }, _toDisplayString(r.status?label(r.status):(r.active?'Ativo':'Inativo')), 3)]),
                                      _createElementVNode("td", null, [(can('academic.write'))
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 0,
                                            class: "link-button",
                                            onClick: $event => (newCatalog(r))
                                          }, "Editar →", 8, ["onClick"]))
                                        : _createCommentVNode("", true)])
                                    ]))
                                  }), 128))])]))
                                : (state.page==='enrollments')
                                  ? (_openBlock(), _createElementBlock("table", { key: 7 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                      _createElementVNode("th", null, "Matrícula / aluno"),
                                      _createElementVNode("th", null, "Turma"),
                                      _createElementVNode("th", null, "Ano letivo"),
                                      _createElementVNode("th", null, "Situação"),
                                      _createElementVNode("th")
                                    ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                      return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                        _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.student_name), 1), _createElementVNode("small", null, _toDisplayString(r.number), 1)]),
                                        _createElementVNode("td", null, [_createTextVNode(_toDisplayString(r.class_name), 1), _createElementVNode("small", null, _toDisplayString(r.shift_name), 1)]),
                                        _createElementVNode("td", null, _toDisplayString(r.year_name), 1),
                                        _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.status]) }, _toDisplayString(label(r.status)), 3)]),
                                        _createElementVNode("td", null, [_createElementVNode("button", {
                                          class: "link-button",
                                          onClick: $event => (viewEnrollment(r.id))
                                        }, "Detalhes →", 8, ["onClick"])])
                                      ]))
                                    }), 128))])]))
                                  : (state.page==='documents')
                                    ? (_openBlock(), _createElementBlock("table", { key: 8 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                        _createElementVNode("th", null, "Aluno / turma"),
                                        _createElementVNode("th", null, "Documentos pendentes"),
                                        _createElementVNode("th", null, "Quantidade"),
                                        _createElementVNode("th")
                                      ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                        return (_openBlock(), _createElementBlock("tr", { key: r.student_id }, [
                                          _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.student_name), 1), _createElementVNode("small", null, _toDisplayString(r.student_number) + " · " + _toDisplayString(r.class_name) + " · " + _toDisplayString(r.year_name), 1)]),
                                          _createElementVNode("td", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(r.documents, (d) => {
                                            return (_openBlock(), _createElementBlock("div", { key: d.document_type_id }, [_createTextVNode(_toDisplayString(d.name) + " ", 1), _createElementVNode("span", { class: "muted" }, "· " + _toDisplayString(label(d.status)), 1)]))
                                          }), 128))]),
                                          _createElementVNode("td", null, [_createElementVNode("span", { class: "badge pending" }, _toDisplayString(r.count), 1)]),
                                          _createElementVNode("td", null, [_createElementVNode("button", {
                                            class: "link-button",
                                            onClick: $event => (viewStudent(r.student_id).then(()=>state.studentTab='documentos'))
                                          }, "Conferir →", 8, ["onClick"])])
                                        ]))
                                      }), 128))])]))
                                    : (state.page==='protocols')
                                      ? (_openBlock(), _createElementBlock("table", { key: 9 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                          _createElementVNode("th", null, "Protocolo"),
                                          _createElementVNode("th", null, "Solicitação"),
                                          _createElementVNode("th", null, "Prazo"),
                                          _createElementVNode("th", null, "Situação"),
                                          _createElementVNode("th")
                                        ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                          return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                            _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.number), 1), _createElementVNode("small", null, _toDisplayString(date(r.created_at)), 1)]),
                                            _createElementVNode("td", null, [_createTextVNode(_toDisplayString(r.kind), 1), _createElementVNode("small", { class: "truncate" }, _toDisplayString(r.description), 1)]),
                                            _createElementVNode("td", null, [_createTextVNode(_toDisplayString(date(r.due_on)), 1), (r.overdue)
                                              ? (_openBlock(), _createElementBlock("small", {
                                                  key: 0,
                                                  class: "danger-text"
                                                }, "Prazo vencido"))
                                              : _createCommentVNode("", true)]),
                                            _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.status]) }, _toDisplayString(label(r.status)), 3)]),
                                            _createElementVNode("td", null, [_createElementVNode("button", {
                                              class: "link-button",
                                              onClick: $event => (viewProtocol(r.id))
                                            }, "Ver atendimento →", 8, ["onClick"])])
                                          ]))
                                        }), 128))])]))
                                      : (state.page==='users')
                                        ? (_openBlock(), _createElementBlock("table", { key: 10 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                            _createElementVNode("th", null, "Usuário"),
                                            _createElementVNode("th", null, "Perfil"),
                                            _createElementVNode("th", null, "Situação"),
                                            _createElementVNode("th")
                                          ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                            return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                              _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.name), 1), _createElementVNode("small", null, _toDisplayString(r.email), 1)]),
                                              _createElementVNode("td", null, _toDisplayString(label(r.role)), 1),
                                              _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", r.active?'active':'archived']) }, _toDisplayString(r.active?'Ativo':'Inativo'), 3)]),
                                              _createElementVNode("td", null, [_createElementVNode("button", {
                                                class: "link-button",
                                                onClick: $event => (newUser(r))
                                              }, "Editar acesso →", 8, ["onClick"])])
                                            ]))
                                          }), 128))])]))
                                        : (state.page==='audit')
                                          ? (_openBlock(), _createElementBlock("table", { key: 11 }, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                                              _createElementVNode("th", null, "Operação"),
                                              _createElementVNode("th", null, "Registro"),
                                              _createElementVNode("th", null, "Data"),
                                              _createElementVNode("th", null, "Referência")
                                            ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (r) => {
                                              return (_openBlock(), _createElementBlock("tr", { key: r.id }, [
                                                _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.action), 1), _createElementVNode("small", null, _toDisplayString(r.entity_type), 1)]),
                                                _createElementVNode("td", { class: "mono small" }, _toDisplayString(r.entity_id), 1),
                                                _createElementVNode("td", null, _toDisplayString(date(r.created_at)), 1),
                                                _createElementVNode("td", { class: "mono small" }, _toDisplayString(r.request_id), 1)
                                              ]))
                                            }), 128))])]))
                                          : _createCommentVNode("", true), (!state.rows.length && !state.loading)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 12,
                        class: "empty-state"
                      }, [_createElementVNode("span", null, "▱"), _createElementVNode("h3", null, _toDisplayString(state.page==='documents'?'Nenhuma pendência encontrada':'Nenhum registro encontrado'), 1), _createElementVNode("p", null, _toDisplayString(state.page==='documents'?'Confira também os tipos de documento exigidos para cada série.':'Cadastre o primeiro registro ou ajuste sua pesquisa.'), 1)]))
                    : _createCommentVNode("", true), (['people','students','teachers','employees','guardians','suppliers','providers','customers','partners','enrollments','documents','protocols','audit'].includes(state.page))
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 13,
                        class: "pagination"
                      }, [_createElementVNode("span", null, _toDisplayString(state.total) + " " + _toDisplayString(state.total===1?'registro':'registros') + " · Página " + _toDisplayString(state.pageNumber), 1), _createElementVNode("div", null, [_createElementVNode("button", {
                        class: "btn btn-secondary small-button",
                        disabled: state.pageNumber<=1 || state.loading,
                        onClick: $event => (page(-1))
                      }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                        class: "btn btn-secondary small-button",
                        disabled: state.pageNumber*30>=state.total || state.loading,
                        onClick: $event => (page(1))
                      }, "Próxima", 8, ["disabled", "onClick"])])]))
                    : _createCommentVNode("", true)])
                ]))
              : _createCommentVNode("", true),
            (state.page==='reports')
              ? (_openBlock(), _createElementBlock("section", {
                  key: 10,
                  class: "panel"
                }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("h2", null, "Relação de alunos por turma"), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: exportStudents
                }, "Exportar cadastro CSV", 8, ["onClick"])]), _createElementVNode("div", { class: "filter-bar" }, [_withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": $event => ((state.reportClass) = $event),
                  onChange: loadReport,
                  "aria-label": "Turma do relatório"
                }, [_createElementVNode("option", { value: "" }, "Selecione a turma…"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(options('class-groups'), (c) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: c.value,
                    value: c.value
                  }, _toDisplayString(c.label), 9, ["value"]))
                }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.reportClass]]), _createElementVNode("button", {
                  class: "btn btn-primary",
                  disabled: !state.reportClass,
                  onClick: exportClass
                }, "Gerar PDF da turma", 8, ["disabled", "onClick"])]), _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                  _createElementVNode("th", null, "Matrícula"),
                  _createElementVNode("th", null, "Aluno"),
                  _createElementVNode("th", null, "Nascimento"),
                  _createElementVNode("th", null, "Situação")
                ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.reportRows, (r) => {
                  return (_openBlock(), _createElementBlock("tr", { key: r.number }, [
                    _createElementVNode("td", null, _toDisplayString(r.number), 1),
                    _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.name), 1)]),
                    _createElementVNode("td", null, _toDisplayString(date(r.birth_date)), 1),
                    _createElementVNode("td", null, _toDisplayString(label(r.status)), 1)
                  ]))
                }), 128))])]), (!state.reportRows.length)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "empty-state"
                    }, [_createElementVNode("p", null, "Selecione uma turma com matrículas ativas ou suspensas.")]))
                  : _createCommentVNode("", true)])]))
              : _createCommentVNode("", true),
            (state.page==='settings')
              ? (_openBlock(), _createElementBlock("section", { key: 11 }, [
                  _createElementVNode("div", { class: "section-actions" }, [_createElementVNode("h2", null, "Minha escola e suas unidades"), _createElementVNode("div", { class: "actions" }, [(state.user.role==='admin')
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary",
                        onClick: editMaintainer
                      }, "Dados da mantenedora", 8, ["onClick"]))
                    : _createCommentVNode("", true), _createElementVNode("button", {
                    class: "btn btn-primary",
                    onClick: manageUnits
                  }, "Gerenciar unidades", 8, ["onClick"])])]),
                  _createElementVNode("article", { class: "panel school-card" }, [
                    _createElementVNode("p", { class: "eyebrow" }, "IDENTIDADE DA ESCOLA"),
                    _createElementVNode("h2", null, _toDisplayString(identity.display_name), 1),
                    _createElementVNode("p", { class: "muted" }, "Nome, logotipo, cores, tipografia e aplicativo desta instituição. A personalização é preservada nas atualizações."),
                    (state.user.role==='admin')
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          class: "btn btn-secondary",
                          onClick: editIdentity
                        }, "Personalizar identidade visual", 8, ["onClick"]))
                      : _createCommentVNode("", true)
                  ]),
                  _createElementVNode("div", { class: "school-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.schools, (s) => {
                    return (_openBlock(), _createElementBlock("article", {
                      key: s.id,
                      class: "panel school-card"
                    }, [
                      _createElementVNode("p", { class: "eyebrow" }, "INSTITUIÇÃO DE ENSINO"),
                      _createElementVNode("h2", null, _toDisplayString(s.name), 1),
                      _createElementVNode("p", null, _toDisplayString(state.companies.find(c=>c.id===s.company_id)?.name), 1),
                      _createElementVNode("p", { class: "muted" }, _toDisplayString(s.address || 'Endereço não informado'), 1),
                      _createElementVNode("div", { class: "divider" }),
                      _createElementVNode("p", { class: "small" }, [_createTextVNode("Documentação: "), _createElementVNode("strong", null, _toDisplayString(s.document_policy==='block'?'obrigatória antes de ativar':'aviso sem bloqueio'), 1)]),
                      _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: $event => (newSchool(s))
                      }, "Editar instituição", 8, ["onClick"])
                    ]))
                  }), 128))]),
                  _createElementVNode("article", { class: "panel support-hub-card" }, [
                    (supportStatus.error)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 0,
                          class: "alert warning",
                          role: "status"
                        }, _toDisplayString(supportStatus.error), 1))
                      : _createCommentVNode("", true),
                    _createElementVNode("div", { class: "panel-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ATENDIMENTO"), _createElementVNode("h2", null, "Chat de suporte via site"), _createElementVNode("p", { class: "muted" }, "Configuração do Hub para a mantenedora da escola ativa.")]), _createElementVNode("span", { class: _normalizeClass(["badge", state.supportHub.enabled?'active':'archived']) }, _toDisplayString(state.supportHub.enabled?'Ativo':'Desativado'), 3)]),
                    (state.supportHub.enabled)
                      ? (_openBlock(), _createElementBlock("p", { key: 1 }, [_createTextVNode("O botão "), _createElementVNode("strong", null, _toDisplayString(state.supportHub.launcher_title), 1), _createTextVNode(" será carregado em " + _toDisplayString(state.supportHub.position==='right'?'à direita':'à esquerda') + " para os usuários do site.", 1)]))
                      : (_openBlock(), _createElementBlock("p", {
                          key: 2,
                          class: "muted"
                        }, "Nenhum widget de suporte será carregado enquanto a integração estiver desativada.")),
                    (state.supportHub.token_configured)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 3,
                          class: "small muted"
                        }, "Website token configurado · " + _toDisplayString(state.supportHub.base_url), 1))
                      : (_openBlock(), _createElementBlock("p", {
                          key: 4,
                          class: "small muted"
                        }, "URL e website token ainda não configurados.")),
                    _createElementVNode("div", { class: "actions" }, [(can('schools.manage'))
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          class: "btn btn-secondary",
                          onClick: editSupportHub
                        }, "Configurar chat", 8, ["onClick"]))
                      : _createCommentVNode("", true)]),
                    _createElementVNode("p", { class: "small muted" }, "Se o navegador informar X-Frame-Options SAMEORIGIN, a rota do widget no servidor HUB precisa autorizar a origem desta escola. As demais telas funcionam independentemente do atendimento.")
                  ]),
                  _createElementVNode("div", { class: "alert info spaced" }, "Esta instalação pertence à sua escola. As unidades, os dados e as integrações são administrados pela própria instituição.")
                ]))
              : _createCommentVNode("", true),
            _createElementVNode("footer", { class: "content-footer" }, [_createElementVNode("span", null, "PIGE360 Self · Gestão educacional"), _createElementVNode("span", null, "Acesso controlado · Histórico preservado")])
          ])])])), (state.modal.kind)
      ? (_openBlock(), _createElementBlock("div", {
          key: 3,
          class: "modal-backdrop",
          onClick: _withModifiers(closeModal, ["self"])
        }, [_createElementVNode("section", {
          id: "main-dialog",
          class: _normalizeClass(["modal", {'modal-wide':isPersonModal() || state.modal.fields.length>10 || ['enrollment-detail','protocol-detail'].includes(state.modal.kind)}]),
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "modal-title"
        }, [_createElementVNode("header", { class: "modal-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name), 1), _createElementVNode("h2", {
          id: "modal-title",
          "data-dialog-title": ""
        }, _toDisplayString(state.modal.title), 1)]), _createElementVNode("button", {
          class: "icon-button",
          disabled: state.busy,
          onClick: closeModal,
          "data-dialog-close": "",
          "aria-label": "Fechar janela"
        }, "×", 8, ["disabled", "onClick"])]), (state.modal.kind==='enrollment-detail' && state.modal.target)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "modal-body"
            }, [
              _createElementVNode("div", { class: "enrollment-summary" }, [_createElementVNode("h3", null, _toDisplayString(state.modal.target.student_name), 1), _createElementVNode("span", { class: _normalizeClass(["badge", state.modal.target.status]) }, _toDisplayString(label(state.modal.target.status)), 3), _createElementVNode("p", null, _toDisplayString(state.modal.target.class_name) + " · " + _toDisplayString(state.modal.target.grade_name) + " · " + _toDisplayString(state.modal.target.shift_name) + " · " + _toDisplayString(state.modal.target.year_name), 1)]),
              _createElementVNode("p", { class: "small preserve" }, _toDisplayString(state.modal.target.notes || 'Sem observações.'), 1),
              _createElementVNode("div", { class: "actions spaced" }, [(state.modal.target.status==='draft' && can('enrollments.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-primary",
                    onClick: editDraft
                  }, "Editar pré-matrícula", 8, ["onClick"]))
                : _createCommentVNode("", true), (can('documents.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 1,
                    class: "btn btn-secondary",
                    onClick: $event => (issueDocument('enrollment_form',state.modal.target))
                  }, "Ficha de matrícula PDF", 8, ["onClick"]))
                : _createCommentVNode("", true)]),
              _createElementVNode("h3", { class: "spaced" }, "Checklist documental"),
              _createElementVNode("div", { class: "checklist-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.checklist, (c) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: c.document_type_id,
                  class: "checklist-item"
                }, [_createElementVNode("span", { class: _normalizeClass(c.complete?'check-ok':'check-pending') }, _toDisplayString(c.complete?'✓':'!'), 3), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(c.name), 1), _createElementVNode("small", null, _toDisplayString(label(c.status)) + " · " + _toDisplayString(c.required?'Obrigatório':'Opcional'), 1)])]))
              }), 128))]),
              _createElementVNode("p", { class: "small muted" }, "Política da escola: " + _toDisplayString(school()?.document_policy==='block'?'bloquear ativação com documentação obrigatória pendente.':'avisar pendências sem bloquear a ativação.'), 1),
              (can('enrollments.write'))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "actions movement-actions"
                  }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.actions, (action) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: action,
                      class: _normalizeClass(["btn", ['activate','reactivate'].includes(action)?'btn-primary':'btn-secondary']),
                      onClick: $event => (startMovement(action))
                    }, _toDisplayString({activate:'Ativar matrícula',change_class:'Mudar turma / turno',suspend:'Suspender',reactivate:'Reativar',transfer:'Transferir',cancel:'Cancelar matrícula',complete:'Concluir'}[action]), 11, ["onClick"]))
                  }), 128)), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: reenroll
                  }, "Rematricular →", 8, ["onClick"])]))
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
                  }, "Declaração PDF", 8, ["onClick"])]))
                : _createCommentVNode("", true),
              _createElementVNode("h3", { class: "spaced" }, "Histórico da matrícula"),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.history, (h) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: h.id,
                  class: "timeline-item"
                }, [_createElementVNode("span", { class: "timeline-dot" }), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(h.reason), 1), _createElementVNode("small", null, _toDisplayString(date(h.created_at)) + " · " + _toDisplayString(label(h.after.status)), 1)])]))
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
                  _createElementVNode("p", null, _toDisplayString(state.modal.target.student_name || 'Sem aluno vinculado') + " · Prazo " + _toDisplayString(date(state.modal.target.due_on)), 1),
                  (state.modal.target.overdue)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "danger-text"
                      }, "Prazo de atendimento vencido."))
                    : _createCommentVNode("", true)
                ]),
                _createElementVNode("p", { class: "preserve" }, _toDisplayString(state.modal.target.description || 'Sem descrição adicional.'), 1),
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
                _createElementVNode("h3", { class: "spaced" }, "Histórico de atendimento"),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.target.history, (h) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: h.id,
                    class: "timeline-item"
                  }, [_createElementVNode("span", { class: "timeline-dot" }), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString({created:'Protocolo aberto',updated:'Protocolo atualizado',note:'Registro de atendimento'}[h.action]), 1), _createElementVNode("p", { class: "preserve" }, _toDisplayString(h.message), 1), _createElementVNode("small", null, _toDisplayString(date(h.created_at)) + " · " + _toDisplayString(h.actor_name), 1)])]))
                }), 128)),
                (!state.modal.target.history?.length)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "alert info spaced"
                    }, "O histórico detalhado será registrado a partir desta versão. O protocolo anterior foi preservado."))
                  : _createCommentVNode("", true)
              ]))
            : (_openBlock(), _createElementBlock("form", {
                key: 2,
                onSubmit: _withModifiers(saveModal, ["prevent"]),
                class: "modal-form",
                novalidate: ""
              }, [(state.discardChanges)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "discard-banner",
                    role: "alert"
                  }, [_createElementVNode("span", null, "Existem alterações não salvas. Deseja descartá-las?"), _createElementVNode("button", {
                    type: "button",
                    class: "btn btn-secondary",
                    onClick: $event => (state.discardChanges=false)
                  }, "Continuar editando", 8, ["onClick"]), _createElementVNode("button", {
                    type: "button",
                    class: "btn btn-danger",
                    onClick: $event => (closeModal(true))
                  }, "Descartar alterações", 8, ["onClick"])]))
                : _createCommentVNode("", true), _createElementVNode("div", { class: _normalizeClass(["modal-workspace", {sectioned:modalSections().length>1}]) }, [(modalSections().length>1)
                ? (_openBlock(), _createElementBlock("nav", {
                    key: 0,
                    class: "form-section-nav",
                    "aria-label": "Seções do cadastro"
                  }, [_createElementVNode("div", { class: "form-profile" }, [
                    _createElementVNode("span", { class: "avatar" }, _toDisplayString(initials(state.modal.form.name || state.modal.target?.name || state.modal.title)), 1),
                    _createElementVNode("strong", null, _toDisplayString(state.modal.form.name || state.modal.target?.name || 'Novo cadastro'), 1),
                    _createElementVNode("small", null, _toDisplayString(state.modal.form.entity_kind==='organization'?'Pessoa jurídica':'Ficha cadastral'), 1),
                    (state.modal.form.person_types?.length)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "profile-types"
                        }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.modal.form.person_types, (type) => {
                          return (_openBlock(), _createElementBlock("span", { key: type }, _toDisplayString(personTypeLabel(type)), 1))
                        }), 128))]))
                      : _createCommentVNode("", true)
                  ]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(modalSections(), (section, i) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: section.id,
                      type: "button",
                      "data-section-target": section.id,
                      onClick: $event => (modalTab(section.id)),
                      class: _normalizeClass({active:visibleSection(section.id)}),
                      "aria-current": visibleSection(section.id)?'step':undefined
                    }, [_createElementVNode("span", null, _toDisplayString(String(i+1).padStart(2,'0')), 1), _createTextVNode(_toDisplayString(section.title), 1), _createElementVNode("i", { "aria-hidden": "true" }, "›")], 10, ["data-section-target", "onClick", "aria-current"]))
                  }), 128)), _createElementVNode("p", { class: "small muted" }, "Os dados permanecem preenchidos ao trocar de seção. Salve para confirmar.")]))
                : _createCommentVNode("", true), _createElementVNode("div", { class: "modal-body" }, [
                (state.modal.error)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "alert error preserve",
                      role: "alert"
                    }, _toDisplayString(state.modal.error), 1))
                  : _createCommentVNode("", true),
                (state.modal.kind==='enrollment')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 1,
                      class: "alert info"
                    }, "A matrícula será salva como rascunho. A confirmação da vaga acontece na ativação."))
                  : _createCommentVNode("", true),
                (state.modal.kind==='draft-edit')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 2,
                      class: "alert info"
                    }, "Aluno e ano letivo são preservados. A alteração exige justificativa e permanece no histórico. Rascunhos não reservam vaga."))
                  : _createCommentVNode("", true),
                (state.modal.kind==='protocol-note')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 3,
                      class: "alert info"
                    }, "O registro será acrescentado ao histórico sem substituir os atendimentos anteriores."))
                  : _createCommentVNode("", true),
                (state.modal.kind==='reenroll')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 4,
                      class: "alert info"
                    }, "Será criada outra matrícula em um período posterior. A matrícula anterior não será sobrescrita."))
                  : _createCommentVNode("", true),
                (state.modal.kind==='identity')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 5,
                      class: "alert info"
                    }, "O nome deve ter até 160 caracteres e o nome curto até 30. Logotipo e fonte: até 2 MB cada. Nenhuma fonte externa é necessária. A tipografia própria requer um arquivo WOFF2 licenciado."))
                  : _createCommentVNode("", true),
                (state.modal.kind==='upload')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 6,
                      class: "alert info"
                    }, "Limite padrão de 10 MB. O recebimento não substitui a validação documental pela Secretaria."))
                  : _createCommentVNode("", true),
                (state.modal.kind==='support-hub')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 7,
                      class: "alert info"
                    }, "A configuração pertence à mantenedora da escola ativa. O token é armazenado criptografado e nunca é devolvido na tela; o navegador recebe somente o website token necessário para inicializar o widget."))
                  : _createCommentVNode("", true),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(modalSections(), (section) => {
                  return _withDirectives((_openBlock(), _createElementBlock("section", {
                    key: section.id,
                    "data-form-section": section.id,
                    class: "form-section"
                  }, [_createElementVNode("div", { class: "form-section-heading" }, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(isPersonModal()?'FICHA CADASTRAL':'LANÇAMENTO'), 1), _createElementVNode("h3", null, _toDisplayString(section.title), 1), _createElementVNode("p", null, _toDisplayString(section.hint), 1)]), _createElementVNode("div", { class: "form-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(section.fields, (f, index) => {
                    return (_openBlock(), _createElementBlock("label", {
                      key: index+'-'+f.key,
                      for: 'modal-field-'+f.key,
                      class: _normalizeClass(["field", {wide:f.wide, 'checkbox-field':f.type==='checkbox'}])
                    }, [(f.type==='checkbox')
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_withDirectives(_createElementVNode("input", {
                          id: 'modal-field-'+f.key,
                          "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                          type: "checkbox"
                        }, null, 8, ["id", "onUpdate:modelValue"]), [[_vModelCheckbox, state.modal.form[f.key]]]), _createTextVNode(_toDisplayString(modalFieldLabel(f)), 1)], 64))
                      : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("span", null, [_createTextVNode(_toDisplayString(modalFieldLabel(f)) + " ", 1), (f.required)
                          ? (_openBlock(), _createElementBlock("b", {
                              key: 0,
                              class: "required"
                            }, "*"))
                          : _createCommentVNode("", true)]), (f.type==='textarea')
                          ? _withDirectives((_openBlock(), _createElementBlock("textarea", {
                              key: 0,
                              id: 'modal-field-'+f.key,
                              "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                              required: f.required,
                              maxlength: "4000",
                              rows: "3"
                            }, null, 8, ["id", "onUpdate:modelValue", "required"])), [[_vModelText, state.modal.form[f.key]]])
                          : (f.type==='select' || f.type==='multiselect')
                            ? _withDirectives((_openBlock(), _createElementBlock("select", {
                                key: 1,
                                id: 'modal-field-'+f.key,
                                "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                required: f.required,
                                multiple: f.type==='multiselect'
                              }, [(f.type!=='multiselect')
                                ? (_openBlock(), _createElementBlock("option", {
                                    key: 0,
                                    value: ""
                                  }, "Selecione…"))
                                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(f.options, (o) => {
                                return (_openBlock(), _createElementBlock("option", {
                                  key: o.value,
                                  value: o.value
                                }, _toDisplayString(o.label), 9, ["value"]))
                              }), 128))], 8, ["id", "onUpdate:modelValue", "required", "multiple"])), [[_vModelSelect, state.modal.form[f.key]]])
                            : (f.type==='student')
                              ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("input", {
                                  placeholder: "Filtrar alunos pelo nome…",
                                  "aria-label": "Filtrar alunos",
                                  onInput: $event => (searchStudents($event.target.value))
                                }, null, 40, ["onInput"]), _withDirectives(_createElementVNode("select", {
                                  id: 'modal-field-'+f.key,
                                  "aria-label": f.label,
                                  "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                  required: f.required
                                }, [_createElementVNode("option", { value: "" }, "Selecione o aluno…"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentChoices, (s) => {
                                  return (_openBlock(), _createElementBlock("option", {
                                    key: s.id,
                                    value: s.id
                                  }, _toDisplayString(s.person.name) + " · " + _toDisplayString(s.number), 9, ["value"]))
                                }), 128))], 8, ["id", "aria-label", "onUpdate:modelValue", "required"]), [[_vModelSelect, state.modal.form[f.key]]])], 64))
                              : (f.type==='person')
                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [_createElementVNode("input", {
                                    placeholder: "Filtrar pessoas pelo nome…",
                                    "aria-label": "Filtrar pessoas",
                                    onInput: $event => (searchPersons($event.target.value))
                                  }, null, 40, ["onInput"]), _withDirectives(_createElementVNode("select", {
                                    id: 'modal-field-'+f.key,
                                    "aria-label": f.label,
                                    "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                    required: f.required
                                  }, [_createElementVNode("option", { value: "" }, "Selecione a pessoa…"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.personChoices, (p) => {
                                    return (_openBlock(), _createElementBlock("option", {
                                      key: p.id,
                                      value: p.id
                                    }, _toDisplayString(p.name) + " · " + _toDisplayString(cpf(p.cpf)), 9, ["value"]))
                                  }), 128))], 8, ["id", "aria-label", "onUpdate:modelValue", "required"]), [[_vModelSelect, state.modal.form[f.key]]]), _createElementVNode("small", null, "Localize a identidade existente para não duplicar o cadastro.")], 64))
                                : (f.type==='identity-logo' || f.type==='identity-font')
                                  ? (_openBlock(), _createElementBlock("input", {
                                      key: 4,
                                      id: 'modal-field-'+f.key,
                                      type: "file",
                                      accept: f.type==='identity-font'?'.woff2':'.png,.jpg,.jpeg,.webp',
                                      onChange: $event => (identityFileChange($event,f.key))
                                    }, null, 40, ["id", "accept", "onChange"]))
                                  : (f.type==='photo')
                                    ? (_openBlock(), _createElementBlock("input", {
                                        key: 5,
                                        id: 'modal-field-'+f.key,
                                        type: "file",
                                        accept: ".png,.jpg,.jpeg",
                                        required: f.required,
                                        onChange: fileChange
                                      }, null, 40, ["id", "required", "onChange"]))
                                    : (f.type==='file')
                                      ? (_openBlock(), _createElementBlock("input", {
                                          key: 6,
                                          id: 'modal-field-'+f.key,
                                          type: "file",
                                          accept: ".pdf,.png,.jpg,.jpeg",
                                          required: f.required,
                                          onChange: fileChange
                                        }, null, 40, ["id", "required", "onChange"]))
                                      : _withDirectives((_openBlock(), _createElementBlock("input", {
                                          key: 7,
                                          id: 'modal-field-'+f.key,
                                          "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                          type: f.type,
                                          required: f.required,
                                          min: f.type==='number'?(f.key==='workload_hours'?0:1):undefined,
                                          minlength: f.type==='password' && f.key!=='current_password'?12:undefined,
                                          maxlength: f.type==='password'?128:400,
                                          autocomplete: f.type==='password'?'new-password':'off'
                                        }, null, 8, ["id", "onUpdate:modelValue", "type", "required", "min", "minlength", "maxlength", "autocomplete"])), [[_vModelDynamic, state.modal.form[f.key]]])], 64))], 10, ["for"]))
                  }), 128))])], 8, ["data-form-section"])), [[_vShow, visibleSection(section.id)]])
                }), 128))
              ])], 2), _createElementVNode("footer", { class: "modal-footer" }, [_createElementVNode("span", { class: "small muted" }, [_createTextVNode(_toDisplayString(modalDirty()?'Alterações ainda não salvas':'Preencha os campos e confirme ao salvar'), 1), _createElementVNode("small", { class: "block" }, "Registro com seu usuário · * obrigatório")]), _createElementVNode("button", {
                type: "button",
                class: "btn btn-secondary",
                disabled: state.busy,
                onClick: closeModal
              }, "Voltar", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                class: "btn btn-primary",
                disabled: state.busy || !state.online
              }, _toDisplayString(state.busy?'Salvando…':state.modal.kind==='issue'?'Gerar e baixar PDF':'Salvar'), 9, ["disabled"])])], 40, ["onSubmit"]))], 2)], 8, ["onClick"]))
      : _createCommentVNode("", true)], 8, ["aria-busy"]))
  }
},portal:function render(_ctx, _cache) {
  with (_ctx) {
    const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, normalizeClass: _normalizeClass, vModelText: _vModelText, withModifiers: _withModifiers, vModelCheckbox: _vModelCheckbox } = _Vue

    return (_openBlock(), _createElementBlock("div", { class: "portal-shell" }, [_createElementVNode("header", { class: "portal-header" }, [_createElementVNode("a", {
      href: "/online.html",
      "aria-label": "Página inicial do portal"
    }, [(identity.logo_url)
      ? (_openBlock(), _createElementBlock("img", {
          key: 0,
          src: identity.logo_url,
          alt: identity.display_name
        }, null, 8, ["src", "alt"]))
      : (_openBlock(), _createElementBlock("strong", { key: 1 }, _toDisplayString(identity.display_name), 1))]), _createElementVNode("div", null, [_createElementVNode("strong", null, "Portal dos responsáveis"), _createElementVNode("small", null, "Pré-matrícula e acompanhamento")]), _createElementVNode("a", {
      class: "btn btn-secondary small-button",
      href: "/"
    }, "Área da escola")]), _createElementVNode("main", { class: "portal-main" }, [
      (!state.ready)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "alert info"
          }, "Carregando portal…"))
        : _createCommentVNode("", true),
      (!state.online)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "alert warning"
          }, "Sem conexão. Reconecte-se antes de salvar, enviar documentos ou confirmar a inscrição."))
        : _createCommentVNode("", true),
      (state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(state.error), 1))
        : _createCommentVNode("", true),
      (state.notice)
        ? (_openBlock(), _createElementBlock("div", {
            key: 3,
            class: "alert success",
            role: "status"
          }, _toDisplayString(state.notice), 1))
        : _createCommentVNode("", true),
      _createElementVNode("fieldset", {
        disabled: state.busy,
        class: "portal-fieldset"
      }, [_createElementVNode("div", { class: "portal-intro" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "UMA NOVA ETAPA COMEÇA AQUI"), _createElementVNode("h1", null, [_createTextVNode("Matrícula com a família."), _createElementVNode("br"), _createTextVNode("Atendimento com a escola.")]), _createElementVNode("p", null, "Cadastre o aluno, envie os documentos e acompanhe cada etapa em um só lugar.")]), _createElementVNode("div", { class: "portal-process" }, [
        _createElementVNode("span", null, "1 · Cadastro"),
        _createElementVNode("span", null, "2 · Documentos"),
        _createElementVNode("span", null, "3 · Análise da escola"),
        _createElementVNode("span", null, "4 · Matrícula")
      ])]), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("label", null, [_createTextVNode("Processo de matrícula"), _withDirectives(_createElementVNode("select", {
        "onUpdate:modelValue": $event => ((state.slug) = $event),
        onChange: selectCampaign
      }, [_createElementVNode("option", { value: "" }, "Selecione a escola / processo"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.campaigns, (c) => {
        return (_openBlock(), _createElementBlock("option", {
          key: c.id,
          value: c.slug
        }, _toDisplayString(c.school_name) + " · " + _toDisplayString(c.title), 9, ["value"]))
      }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.slug]])]), (state.campaign)
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
            _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, _toDisplayString(state.campaign.title), 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(state.campaign.school_name), 1)]),
            _createElementVNode("p", null, "Inscrições de " + _toDisplayString(date(state.campaign.opens_on)) + " a " + _toDisplayString(date(state.campaign.closes_on)) + ". " + _toDisplayString(state.campaign.accepting?'Processo aberto.':'Prazo de novas inscrições encerrado.'), 1),
            _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(state.campaign.instructions), 1),
            _createElementVNode("details", null, [_createElementVNode("summary", null, "Aviso de privacidade · versão " + _toDisplayString(state.campaign.terms_version), 1), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(state.campaign.privacy_notice), 1)])
          ], 64))
        : _createCommentVNode("", true)]), (!state.account)
        ? (_openBlock(), _createElementBlock("section", {
            key: 0,
            class: "panel x-card"
          }, [
            _createElementVNode("nav", { class: "x-tabs" }, [_createElementVNode("button", {
              type: "button",
              class: _normalizeClass(["btn", state.mode==='login'?'btn-primary':'btn-secondary']),
              onClick: $event => (state.mode='login')
            }, "Entrar", 10, ["onClick"]), _createElementVNode("button", {
              type: "button",
              class: _normalizeClass(["btn", state.mode==='register'?'btn-primary':'btn-secondary']),
              onClick: $event => (state.mode='register')
            }, "Criar minha conta", 10, ["onClick"]), _createElementVNode("button", {
              type: "button",
              class: "link-button",
              onClick: $event => (state.mode='reset')
            }, "Recuperar acesso", 8, ["onClick"])]),
            (state.mode==='login')
              ? (_openBlock(), _createElementBlock("form", {
                  key: 0,
                  onSubmit: _withModifiers(login, ["prevent"]),
                  class: "x-form"
                }, [_createElementVNode("h2", null, "Acompanhe suas inscrições"), _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("E-mail"), _withDirectives(_createElementVNode("input", {
                  type: "email",
                  "onUpdate:modelValue": $event => ((state.login.email) = $event),
                  autocomplete: "username",
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.login.email]])]), _createElementVNode("label", null, [_createTextVNode("Senha"), _withDirectives(_createElementVNode("input", {
                  type: "password",
                  "onUpdate:modelValue": $event => ((state.login.password) = $event),
                  autocomplete: "current-password",
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.login.password]])])]), _createElementVNode("button", {
                  class: "btn btn-primary",
                  disabled: !state.slug
                }, "Entrar no portal", 8, ["disabled"])], 40, ["onSubmit"]))
              : _createCommentVNode("", true),
            (state.mode==='register')
              ? (_openBlock(), _createElementBlock("form", {
                  key: 1,
                  onSubmit: _withModifiers(register, ["prevent"]),
                  class: "x-form"
                }, [
                  _createElementVNode("h2", null, "Dados do pai, mãe ou responsável legal"),
                  _createElementVNode("p", null, "O aluno será cadastrado na próxima etapa. Uma conta pode acompanhar inscrições de mais de um filho."),
                  _createElementVNode("div", { class: "x-grid" }, [
                    _createElementVNode("label", null, [_createTextVNode("Seu nome completo"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.register.name) = $event),
                      required: "",
                      minlength: "2",
                      maxlength: "180",
                      autocomplete: "name"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.register.name]])]),
                    _createElementVNode("label", null, [_createTextVNode("Seu e-mail"), _withDirectives(_createElementVNode("input", {
                      type: "email",
                      "onUpdate:modelValue": $event => ((state.register.email) = $event),
                      required: "",
                      autocomplete: "email"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.register.email]])]),
                    _createElementVNode("label", null, [_createTextVNode("Crie uma senha (12 caracteres ou mais)"), _withDirectives(_createElementVNode("input", {
                      type: "password",
                      "onUpdate:modelValue": $event => ((state.register.password) = $event),
                      required: "",
                      minlength: "12",
                      maxlength: "128",
                      autocomplete: "new-password"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.register.password]])]),
                    _createElementVNode("label", null, [_createTextVNode("Seu CPF (necessário para cobrança)"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.register.cpf) = $event),
                      maxlength: "14",
                      inputmode: "numeric"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.register.cpf]])]),
                    _createElementVNode("label", null, [_createTextVNode("WhatsApp / telefone com DDD"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.register.phone) = $event),
                      type: "tel",
                      maxlength: "24",
                      autocomplete: "tel"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.register.phone]])]),
                    _createElementVNode("label", null, [_createTextVNode("Endereço completo"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.register.address) = $event),
                      maxlength: "400",
                      autocomplete: "street-address"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.register.address]])])
                  ]),
                  _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": $event => ((state.register.accept_privacy) = $event),
                    required: ""
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.register.accept_privacy]]), _createTextVNode("Li o aviso de privacidade deste processo e solicito a criação da minha conta.")]),
                  _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": $event => ((state.register.whatsapp_opt_in) = $event)
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.register.whatsapp_opt_in]]), _createTextVNode("Desejo receber avisos deste processo por WhatsApp. A opção é facultativa.")]),
                  _createElementVNode("button", {
                    class: "btn btn-primary",
                    disabled: !state.campaign?.accepting
                  }, "Criar conta e continuar", 8, ["disabled"])
                ], 40, ["onSubmit"]))
              : _createCommentVNode("", true),
            (state.mode==='reset')
              ? (_openBlock(), _createElementBlock("div", {
                  key: 2,
                  class: "x-form"
                }, [_createElementVNode("h2", null, "Recuperar minha senha"), _createElementVNode("form", { onSubmit: _withModifiers(resetRequest, ["prevent"]) }, [_createElementVNode("label", null, [_createTextVNode("E-mail da conta"), _withDirectives(_createElementVNode("input", {
                  type: "email",
                  "onUpdate:modelValue": $event => ((state.reset.email) = $event),
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reset.email]])]), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  disabled: !state.slug
                }, "Solicitar código por e-mail", 8, ["disabled"])], 40, ["onSubmit"]), _createElementVNode("form", { onSubmit: _withModifiers(resetConfirm, ["prevent"]) }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Código de 6 dígitos"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.reset.code) = $event),
                  inputmode: "numeric",
                  pattern: "[0-9]{6}",
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reset.code]])]), _createElementVNode("label", null, [_createTextVNode("Nova senha"), _withDirectives(_createElementVNode("input", {
                  type: "password",
                  "onUpdate:modelValue": $event => ((state.reset.password) = $event),
                  minlength: "12",
                  maxlength: "128",
                  required: "",
                  autocomplete: "new-password"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reset.password]])])]), _createElementVNode("button", { class: "btn btn-primary" }, "Redefinir senha")], 40, ["onSubmit"])]))
              : _createCommentVNode("", true)
          ]))
        : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
            _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "MINHA CONTA"), _createElementVNode("h2", null, _toDisplayString(state.account.name), 1), _createElementVNode("p", null, _toDisplayString(state.account.email) + " · " + _toDisplayString(state.account.email_verified?'E-mail confirmado':'E-mail não confirmado') + " · " + _toDisplayString(state.account.phone_verified?'Telefone confirmado':'Telefone não confirmado'), 1)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
              class: "btn btn-secondary",
              onClick: refresh
            }, "Atualizar", 8, ["onClick"]), _createElementVNode("button", {
              class: "btn btn-secondary",
              onClick: logout
            }, "Sair", 8, ["onClick"])])]), _createElementVNode("details", null, [_createElementVNode("summary", null, "Atualizar meus dados de contato"), _createElementVNode("form", {
              onSubmit: _withModifiers(saveProfile, ["prevent"]),
              class: "x-form"
            }, [
              _createElementVNode("div", { class: "x-grid" }, [
                _createElementVNode("label", null, [_createTextVNode("Seu nome"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.account.name) = $event),
                  required: "",
                  maxlength: "180"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.account.name]])]),
                _createElementVNode("label", null, [_createTextVNode("CPF"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.account.cpf) = $event),
                  maxlength: "14",
                  inputmode: "numeric"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.account.cpf]])]),
                _createElementVNode("label", null, [_createTextVNode("Telefone / WhatsApp"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.account.phone) = $event),
                  type: "tel",
                  maxlength: "24"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.account.phone]])]),
                _createElementVNode("label", null, [_createTextVNode("Endereço"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.account.address) = $event),
                  maxlength: "400"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.account.address]])])
              ]),
              _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                type: "checkbox",
                "onUpdate:modelValue": $event => ((state.account.whatsapp_opt_in) = $event)
              }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.account.whatsapp_opt_in]]), _createTextVNode("Autorizo avisos deste processo por WhatsApp.")]),
              _createElementVNode("p", null, "Alterar o telefone exige nova verificação. O cadastro oficial da escola só pode ser alterado pela Secretaria."),
              _createElementVNode("button", { class: "btn btn-secondary" }, "Salvar meus dados")
            ], 40, ["onSubmit"])]), _createElementVNode("details", null, [_createElementVNode("summary", null, "Confirmar um contato"), _createElementVNode("p", null, "A escola pode exigir essa confirmação antes do envio. O código vence em 10 minutos."), _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("form", { onSubmit: _withModifiers(verifyRequest, ["prevent"]) }, [_createElementVNode("label", null, [_createTextVNode("Receber código por"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.verifyChannel) = $event) }, [_createElementVNode("option", { value: "email" }, "E-mail"), _createElementVNode("option", { value: "whatsapp" }, "WhatsApp informado na conta")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.verifyChannel]])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Enviar código")], 40, ["onSubmit"]), _createElementVNode("form", { onSubmit: _withModifiers(verifyConfirm, ["prevent"]) }, [_createElementVNode("label", null, [_createTextVNode("Código recebido"), _withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((state.code) = $event),
              inputmode: "numeric",
              pattern: "[0-9]{6}",
              maxlength: "6",
              required: "",
              autocomplete: "one-time-code"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.code]])]), _createElementVNode("button", { class: "btn btn-primary" }, "Confirmar contato")], 40, ["onSubmit"])])])]),
            (!state.selected&&!state.editing)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 0,
                  class: "panel x-card"
                }, [
                  _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Minhas inscrições"), _createElementVNode("button", {
                    class: "btn btn-primary",
                    onClick: newAdmission,
                    disabled: !state.campaign?.accepting
                  }, "+ Cadastrar aluno", 8, ["onClick", "disabled"])]),
                  (!state.rows.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "empty"
                      }, "Ainda não há inscrições nesta conta. Comece pelo cadastro do aluno."))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (a) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: a.id,
                      class: "x-record",
                      onClick: $event => (view(a.id))
                    }, [_createElementVNode("div", null, [_createElementVNode("small", null, _toDisplayString(a.number) + " · " + _toDisplayString(a.campaign_title), 1), _createElementVNode("strong", null, _toDisplayString(a.student_data.name), 1), _createElementVNode("span", null, _toDisplayString(a.class_name), 1)]), _createElementVNode("span", { class: "badge" }, _toDisplayString(a.status_label), 1), _createElementVNode("span", { "aria-hidden": "true" }, "→")], 8, ["onClick"]))
                  }), 128))]),
                  _createElementVNode("div", { class: "pagination" }, [_createElementVNode("span", null, _toDisplayString(state.total) + " inscrição(ões)", 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                    class: "btn btn-secondary",
                    disabled: state.page<=1,
                    onClick: $event => (paginate(-1))
                  }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    disabled: state.page*20>=state.total,
                    onClick: $event => (paginate(1))
                  }, "Próxima", 8, ["disabled", "onClick"])])])
                ]))
              : _createCommentVNode("", true),
            (state.editing)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 1,
                  class: "panel x-card"
                }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Dados do aluno"), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => (state.editing=false)
                }, "Voltar", 8, ["onClick"])]), _createElementVNode("form", {
                  class: "x-form",
                  onSubmit: _withModifiers(save, ["prevent"])
                }, [
                  _createElementVNode("div", { class: "x-grid" }, [
                    _createElementVNode("label", null, [_createTextVNode("Nome completo do aluno"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.form.student.name) = $event),
                      required: "",
                      maxlength: "180"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.name]])]),
                    _createElementVNode("label", null, [_createTextVNode("Data de nascimento"), _withDirectives(_createElementVNode("input", {
                      type: "date",
                      "onUpdate:modelValue": $event => ((state.form.student.birth_date) = $event),
                      required: ""
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.birth_date]])]),
                    _createElementVNode("label", null, [_createTextVNode("Nome social (opcional)"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.form.student.social_name) = $event),
                      maxlength: "180"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.social_name]])]),
                    _createElementVNode("label", null, [_createTextVNode("CPF do aluno (opcional)"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.form.student.cpf) = $event),
                      inputmode: "numeric",
                      maxlength: "14"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.cpf]])]),
                    _createElementVNode("label", null, [_createTextVNode("Endereço do aluno"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.form.student.address) = $event),
                      maxlength: "400"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.address]])]),
                    _createElementVNode("label", null, [_createTextVNode("Escola de origem"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.form.previous_school) = $event),
                      maxlength: "180"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.previous_school]])]),
                    _createElementVNode("label", null, [_createTextVNode("Seu vínculo com o aluno"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.form.relationship) = $event),
                      required: "",
                      maxlength: "60"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.relationship]])]),
                    _createElementVNode("label", null, [_createTextVNode("Oferta / turma pretendida"), _withDirectives(_createElementVNode("select", {
                      "onUpdate:modelValue": $event => ((state.form.class_group_id) = $event),
                      required: ""
                    }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.campaign?.groups||[], (g) => {
                      return (_openBlock(), _createElementBlock("option", {
                        key: g.id,
                        value: g.id
                      }, _toDisplayString(g.grade) + " · " + _toDisplayString(g.name) + " · " + _toDisplayString(g.shift) + " · " + _toDisplayString(g.year) + " · " + _toDisplayString(g.unit), 9, ["value"]))
                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.form.class_group_id]])])
                  ]),
                  _createElementVNode("label", null, [_createTextVNode("Observações para a Secretaria"), _withDirectives(_createElementVNode("textarea", {
                    "onUpdate:modelValue": $event => ((state.form.notes) = $event),
                    maxlength: "3000",
                    rows: "3"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.notes]])]),
                  _createElementVNode("p", { class: "muted" }, "Salvar um rascunho não reserva vaga nem confirma a matrícula. A escola conferirá os dados."),
                  _createElementVNode("button", { class: "btn btn-primary" }, "Salvar dados do aluno")
                ], 40, ["onSubmit"])]))
              : _createCommentVNode("", true),
            (state.selected&&!state.editing)
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                  _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [
                    _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(state.selected.number), 1),
                    _createElementVNode("h2", null, _toDisplayString(state.selected.student_data.name), 1),
                    _createElementVNode("p", null, _toDisplayString(state.selected.class_name) + " · " + _toDisplayString(state.selected.campaign_title), 1),
                    _createElementVNode("span", { class: "badge" }, _toDisplayString(state.selected.status_label), 1)
                  ]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (state.selected=null)
                  }, "← Minhas inscrições", 8, ["onClick"]), (editable())
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary",
                        onClick: edit
                      }, "Editar dados", 8, ["onClick"]))
                    : _createCommentVNode("", true), (state.selected.status!=='draft')
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 1,
                        class: "btn btn-secondary",
                        onClick: $event => (download('/admissions/'+state.selected.id+'/receipt.pdf','recibo-inscricao.pdf'))
                      }, "Recibo da inscrição", 8, ["onClick"]))
                    : _createCommentVNode("", true)])]), (state.selected.enrollment)
                    ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Matrícula " + _toDisplayString(state.selected.enrollment.number) + " · " + _toDisplayString(label(state.selected.enrollment.status)), 1))
                    : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.issued_documents, (d) => {
                    return (_openBlock(), _createElementBlock("div", {
                      key: d.id,
                      class: "x-heading"
                    }, [_createElementVNode("span", null, "Documento emitido pela escola · " + _toDisplayString(date(d.created_at)), 1), _createElementVNode("button", {
                      class: "btn btn-secondary",
                      onClick: $event => (download('/admissions/'+state.selected.id+'/issued/'+d.id,'comprovante-matricula.pdf'))
                    }, "Baixar documento escolar", 8, ["onClick"])]))
                  }), 128))]),
                  _createElementVNode("section", { class: "panel x-card" }, [
                    _createElementVNode("h2", null, "Documentação"),
                    _createElementVNode("p", null, "Envie PDF, PNG ou JPEG. A análise documental é feita pela Secretaria."),
                    _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.document_types, (d) => {
                      return (_openBlock(), _createElementBlock("div", {
                        key: d.id,
                        class: "x-line"
                      }, [_createElementVNode("span", null, _toDisplayString(d.name) + " " + _toDisplayString(d.required?'· obrigatório':''), 1), _createElementVNode("span", null, _toDisplayString(state.selected.attachments.some(a=>a.document_type_id===d.id)?'Arquivo recebido':'Ainda não enviado'), 1)]))
                    }), 128))]),
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.attachments, (a) => {
                      return (_openBlock(), _createElementBlock("div", {
                        key: a.id,
                        class: "x-line"
                      }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(a.original_name), 1), _createElementVNode("small", null, _toDisplayString(label(a.review_status)) + " · " + _toDisplayString(a.review_note), 1)]), _createElementVNode("button", {
                        class: "btn btn-secondary small-button",
                        onClick: $event => (download('/admissions/'+state.selected.id+'/attachments/'+a.id,a.original_name))
                      }, "Abrir arquivo", 8, ["onClick"])]))
                    }), 128)),
                    (editable()&&state.selected.document_types.length)
                      ? (_openBlock(), _createElementBlock("form", {
                          key: 0,
                          onSubmit: _withModifiers(upload, ["prevent"]),
                          class: "x-form"
                        }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Tipo de documento"), _withDirectives(_createElementVNode("select", {
                          "onUpdate:modelValue": $event => ((state.documentType) = $event),
                          required: ""
                        }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.document_types, (d) => {
                          return (_openBlock(), _createElementBlock("option", {
                            key: d.id,
                            value: d.id
                          }, _toDisplayString(d.name), 9, ["value"]))
                        }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.documentType]])]), _createElementVNode("label", null, [_createTextVNode("Arquivo"), _createElementVNode("input", {
                          type: "file",
                          accept: ".pdf,.png,.jpg,.jpeg",
                          onChange: fileChange,
                          required: ""
                        }, null, 40, ["onChange"])])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Enviar documento")], 40, ["onSubmit"]))
                      : _createCommentVNode("", true)
                  ]),
                  (editable())
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 0,
                        class: "panel x-card"
                      }, [
                        _createElementVNode("h2", null, "Concluir envio para análise"),
                        _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((state.acceptTerms) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.acceptTerms]]), _createTextVNode("Li o aviso de privacidade, versão " + _toDisplayString(state.campaign?.terms_version) + ", e confirmo os dados informados.", 1)]),
                        _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((state.legal) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.legal]]), _createTextVNode("Declaro ser responsável legal ou representante autorizado do aluno e solicito a análise da inscrição.")]),
                        _createElementVNode("button", {
                          class: "btn btn-primary",
                          onClick: submit,
                          disabled: !state.acceptTerms||!state.legal
                        }, "Enviar pré-matrícula", 8, ["onClick", "disabled"]),
                        _createElementVNode("p", { class: "muted" }, "A aprovação, a disponibilidade de vaga e a efetivação serão informadas neste portal.")
                      ]))
                    : _createCommentVNode("", true),
                  (state.charges.length)
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 1,
                        class: "panel x-card"
                      }, [_createElementVNode("h2", null, "Cobranças vinculadas"), _createElementVNode("p", null, "Confira os dados do beneficiário antes de pagar. Somente a conciliação confirma o recebimento."), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.charges, (c) => {
                        return (_openBlock(), _createElementBlock("article", {
                          key: c.id,
                          class: "x-charge"
                        }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(c.description), 1), _createElementVNode("p", null, "Vencimento " + _toDisplayString(date(c.due_on)) + " · " + _toDisplayString(c.billing_type), 1)]), _createElementVNode("div", null, [_createElementVNode("h3", null, _toDisplayString(money(c.amount)), 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(c.status)), 1)])]), _createElementVNode("div", { class: "actions" }, [(safeLink(c.invoice_url))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 0,
                              href: safeLink(c.invoice_url),
                              target: "_blank",
                              rel: "noopener noreferrer",
                              class: "btn btn-secondary"
                            }, "Abrir cobrança", 8, ["href"]))
                          : _createCommentVNode("", true), (safeLink(c.bank_slip_url))
                          ? (_openBlock(), _createElementBlock("a", {
                              key: 1,
                              href: safeLink(c.bank_slip_url),
                              target: "_blank",
                              rel: "noopener noreferrer",
                              class: "btn btn-secondary"
                            }, "Boleto", 8, ["href"]))
                          : _createCommentVNode("", true)]), (c.pix_copy_paste&&['pending','overdue'].includes(c.status))
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "x-pix"
                            }, [(c.pix_image)
                              ? (_openBlock(), _createElementBlock("img", {
                                  key: 0,
                                  src: 'data:image/png;base64,'+c.pix_image,
                                  alt: "QR Code Pix da cobrança"
                                }, null, 8, ["src"]))
                              : _createCommentVNode("", true), _createElementVNode("label", null, [_createTextVNode("Pix Copia e Cola"), _createElementVNode("textarea", {
                              value: c.pix_copy_paste,
                              readonly: "",
                              rows: "3"
                            }, null, 8, ["value"]), _createElementVNode("button", {
                              class: "btn btn-secondary",
                              onClick: $event => (copy(c.pix_copy_paste))
                            }, "Copiar código Pix", 8, ["onClick"])])]))
                          : _createCommentVNode("", true)]))
                      }), 128))]))
                    : _createCommentVNode("", true),
                  _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Atendimento e histórico"), _createElementVNode("div", { class: "x-timeline" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.messages, (m) => {
                    return (_openBlock(), _createElementBlock("article", { key: m.id }, [_createElementVNode("small", null, _toDisplayString(date(m.created_at)) + " · " + _toDisplayString(m.account_id?'Responsável':'Secretaria'), 1), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(m.text), 1)]))
                  }), 128))]), _createElementVNode("form", {
                    onSubmit: _withModifiers(sendMessage, ["prevent"]),
                    class: "x-form"
                  }, [_createElementVNode("label", null, [_createTextVNode("Mensagem à Secretaria"), _withDirectives(_createElementVNode("textarea", {
                    "onUpdate:modelValue": $event => ((state.message) = $event),
                    required: "",
                    maxlength: "3000",
                    rows: "3"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.message]])]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", { class: "btn btn-primary" }, "Enviar mensagem"), (!['approved','enrolled','rejected','withdrawn'].includes(state.selected.status))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        type: "button",
                        class: "btn btn-secondary",
                        onClick: withdraw,
                        disabled: state.message.length<3
                      }, "Registrar desistência com este motivo", 8, ["onClick", "disabled"]))
                    : _createCommentVNode("", true)])], 40, ["onSubmit"])])
                ], 64))
              : _createCommentVNode("", true)
          ], 64))], 8, ["disabled"]),
      (state.busy)
        ? (_openBlock(), _createElementBlock("p", {
            key: 4,
            class: "portal-working",
            role: "status"
          }, "Processando sua solicitação…"))
        : _createCommentVNode("", true)
    ]), _createElementVNode("footer", { class: "portal-footer" }, "PIGE360 Self · Atendimento escolar Web/PWA · Dados privados não são armazenados no cache offline.")]))
  }
},expansion:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, renderList: _renderList, Fragment: _Fragment, vModelText: _vModelText, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelCheckbox: _vModelCheckbox, withModifiers: _withModifiers, vModelSelect: _vModelSelect, Teleport: _Teleport, createBlock: _createBlock } = _Vue

    return (_openBlock(), _createElementBlock("section", { class: "expansion-panel" }, [
      (s.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(s.error), 1))
        : _createCommentVNode("", true),
      (s.notice)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "alert success",
            role: "status"
          }, _toDisplayString(s.notice), 1))
        : _createCommentVNode("", true),
      (s.busy)
        ? (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "loading-strip",
            role: "status"
          }, "Processando…"))
        : _createCommentVNode("", true),
      _createElementVNode("fieldset", {
        disabled: s.busy,
        class: "portal-fieldset"
      }, [
        (props.page==='online')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("div", { class: "stats-grid" }, [
              _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Enviadas"), _createElementVNode("strong", null, _toDisplayString(s.counts.submitted||0), 1), _createElementVNode("small", null, "Aguardando análise inicial")]),
              _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Em análise"), _createElementVNode("strong", null, _toDisplayString(s.counts.under_review||0), 1), _createElementVNode("small", null, "Em atendimento pela equipe")]),
              _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Lista de espera"), _createElementVNode("strong", null, _toDisplayString(s.counts.waitlisted||0), 1), _createElementVNode("small", null, "Sem garantia de vaga")]),
              _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Efetivadas pelo portal"), _createElementVNode("strong", null, _toDisplayString(s.counts.enrolled||0), 1), _createElementVNode("small", null, "Comprovante emitido")])
            ]), _createElementVNode("nav", { class: "x-tabs" }, [
              _createElementVNode("button", {
                class: _normalizeClass(["btn", s.tab==='queue'?'btn-primary':'btn-secondary']),
                onClick: $event => (s.tab='queue')
              }, "Inscrições recebidas", 10, ["onClick"]),
              _createElementVNode("button", {
                class: _normalizeClass(["btn", s.tab==='campaigns'?'btn-primary':'btn-secondary']),
                onClick: $event => (s.tab='campaigns')
              }, "Processos e link público", 10, ["onClick"]),
              _createElementVNode("a", {
                href: "/online.html",
                target: "_blank",
                rel: "noopener",
                class: "btn btn-secondary"
              }, "Abrir portal dos responsáveis ↗"),
              _createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (run(load))
              }, "Atualizar", 8, ["onClick"])
            ]), (s.tab==='campaigns')
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Processos de matrícula online"), _createElementVNode("p", null, "Defina prazo, ofertas e regras. Os pais acessam apenas o processo publicado.")]), (can('admissions.manage'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn btn-primary",
                      onClick: newCampaign
                    }, "+ Novo processo", 8, ["onClick"]))
                  : _createCommentVNode("", true)]), (!s.campaigns.length)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "empty"
                    }, "Cadastre os anos letivos, séries, turnos e turmas na Estrutura acadêmica. Depois, publique seu primeiro processo."))
                  : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.campaigns, (c) => {
                  return (_openBlock(), _createElementBlock("article", {
                    key: c.id,
                    class: "x-charge"
                  }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, _toDisplayString(c.title), 1), _createElementVNode("p", null, _toDisplayString(date(c.opens_on)) + " a " + _toDisplayString(date(c.closes_on)) + " · " + _toDisplayString(c.active?'Publicado':'Não publicado'), 1), _createElementVNode("p", null, _toDisplayString(c.groups.length) + " oferta(s) · Versão do aviso: " + _toDisplayString(c.terms_version), 1)]), _createElementVNode("div", { class: "actions" }, [(can('admissions.manage'))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary",
                        onClick: $event => (editCampaign(c))
                      }, "Editar", 8, ["onClick"]))
                    : _createCommentVNode("", true), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (copy(publicURL(c.slug)))
                  }, "Copiar link", 8, ["onClick"]), (c.active)
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 1,
                        href: publicURL(c.slug),
                        target: "_blank",
                        rel: "noopener",
                        class: "btn btn-secondary"
                      }, "Abrir ↗", 8, ["href"]))
                    : _createCommentVNode("", true)])]), _createElementVNode("code", { class: "x-url" }, _toDisplayString(publicURL(c.slug)), 1)]))
                }), 128))]), (s.editingCampaign)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 0,
                      class: "panel x-card"
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, _toDisplayString(s.campaignForm.id?'Editar processo':'Novo processo'), 1), _createElementVNode("button", {
                      class: "btn btn-secondary",
                      onClick: $event => (s.editingCampaign=false)
                    }, "Fechar", 8, ["onClick"])]), _createElementVNode("form", {
                      onSubmit: _withModifiers(saveCampaign, ["prevent"]),
                      class: "x-form"
                    }, [
                      _createElementVNode("div", { class: "x-grid" }, [
                        _createElementVNode("label", null, [_createTextVNode("Título"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((s.campaignForm.title) = $event),
                          minlength: "4",
                          maxlength: "160",
                          required: ""
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.title]])]),
                        _createElementVNode("label", null, [_createTextVNode("Identificador do link (imutável)"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((s.campaignForm.slug) = $event),
                          readonly: !!s.campaignForm.id,
                          pattern: "[a-z0-9]+(-[a-z0-9]+)*",
                          minlength: "4",
                          maxlength: "80",
                          required: "",
                          placeholder: "matriculas-2027"
                        }, null, 8, ["onUpdate:modelValue", "readonly"]), [[_vModelText, s.campaignForm.slug]])]),
                        _createElementVNode("label", null, [_createTextVNode("Início"), _withDirectives(_createElementVNode("input", {
                          type: "date",
                          "onUpdate:modelValue": $event => ((s.campaignForm.opens_on) = $event),
                          required: ""
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.opens_on]])]),
                        _createElementVNode("label", null, [_createTextVNode("Encerramento"), _withDirectives(_createElementVNode("input", {
                          type: "date",
                          "onUpdate:modelValue": $event => ((s.campaignForm.closes_on) = $event),
                          required: ""
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.closes_on]])])
                      ]),
                      _createElementVNode("label", null, [_createTextVNode("Instruções para os responsáveis"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((s.campaignForm.instructions) = $event),
                        maxlength: "5000",
                        rows: "3"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.instructions]])]),
                      _createElementVNode("fieldset", { class: "x-choice" }, [_createElementVNode("legend", null, "Turmas oferecidas (mesmo ano letivo)"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.groups, (g) => {
                        return (_openBlock(), _createElementBlock("label", {
                          key: g.id,
                          class: "x-check"
                        }, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((s.campaignForm.class_group_ids) = $event),
                          value: g.id
                        }, null, 8, ["onUpdate:modelValue", "value"]), [[_vModelCheckbox, s.campaignForm.class_group_ids]]), _createTextVNode(_toDisplayString(g.name) + " · capacidade " + _toDisplayString(g.capacity), 1)]))
                      }), 128)), (!s.groups.length)
                        ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Nenhuma turma cadastrada nesta escola."))
                        : _createCommentVNode("", true)]),
                      _createElementVNode("label", null, [_createTextVNode("Aviso de privacidade da instituição"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((s.campaignForm.privacy_notice) = $event),
                        required: "",
                        minlength: "40",
                        maxlength: "10000",
                        rows: "5",
                        placeholder: "Informe finalidade, contato da instituição, tratamento e orientações sobre os dados coletados."
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.privacy_notice]])]),
                      _createElementVNode("label", null, [_createTextVNode("Versão dos termos"), _withDirectives(_createElementVNode("input", {
                        "onUpdate:modelValue": $event => ((s.campaignForm.terms_version) = $event),
                        maxlength: "40",
                        required: ""
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.terms_version]])]),
                      _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                        type: "checkbox",
                        "onUpdate:modelValue": $event => ((s.campaignForm.require_verified_contact) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.campaignForm.require_verified_contact]]), _createTextVNode("Exigir e-mail ou telefone verificado para envio (configure SMTP ou Connect API)")]),
                      _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                        type: "checkbox",
                        "onUpdate:modelValue": $event => ((s.campaignForm.require_documents) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.campaignForm.require_documents]]), _createTextVNode("Exigir anexos obrigatórios antes do envio")]),
                      _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                        type: "checkbox",
                        "onUpdate:modelValue": $event => ((s.campaignForm.require_payment_before_enrollment) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.campaignForm.require_payment_before_enrollment]]), _createTextVNode("Exigir cobrança de matrícula recebida antes da efetivação")]),
                      _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                        type: "checkbox",
                        "onUpdate:modelValue": $event => ((s.campaignForm.active) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.campaignForm.active]]), _createTextVNode("Publicar processo no portal")]),
                      _createElementVNode("p", { class: "muted" }, "A política de documentos da escola continua valendo na ativação. Publicar não reserva vagas."),
                      _createElementVNode("button", {
                        class: "btn btn-primary",
                        disabled: !s.campaignForm.class_group_ids.length
                      }, "Salvar processo", 8, ["disabled"])
                    ], 40, ["onSubmit"])]))
                  : _createCommentVNode("", true)], 64))
              : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(!s.selected)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 0,
                      class: "panel x-card"
                    }, [
                      _createElementVNode("form", {
                        onSubmit: _withModifiers(search, ["prevent"]),
                        class: "x-filter"
                      }, [_createElementVNode("label", null, [_createTextVNode("Pesquisar aluno / inscrição"), _withDirectives(_createElementVNode("input", {
                        "onUpdate:modelValue": $event => ((s.q) = $event),
                        maxlength: "160",
                        placeholder: "Nome do aluno ou PRE-..."
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.q]])]), _createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.status) = $event) }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['draft','submitted','under_review','changes_requested','waitlisted','approved','enrolled','rejected','withdrawn'], (status) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: status,
                          value: status
                        }, _toDisplayString(label(status)), 9, ["value"]))
                      }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.status]])]), _createElementVNode("button", { class: "btn btn-primary" }, "Pesquisar")], 40, ["onSubmit"]),
                      (!s.rows.length)
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 0,
                            class: "empty"
                          }, "Nenhuma inscrição encontrada com estes filtros."))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.rows, (a) => {
                        return (_openBlock(), _createElementBlock("button", {
                          key: a.id,
                          class: "x-record",
                          onClick: $event => (view(a.id))
                        }, [_createElementVNode("div", null, [_createElementVNode("small", null, _toDisplayString(a.number) + " · " + _toDisplayString(a.campaign_title), 1), _createElementVNode("strong", null, _toDisplayString(a.student_data.name), 1), _createElementVNode("span", null, _toDisplayString(a.account?.name) + " · " + _toDisplayString(a.class_name), 1)]), _createElementVNode("span", { class: "badge" }, _toDisplayString(a.status_label), 1), _createElementVNode("span", null, "→")], 8, ["onClick"]))
                      }), 128))]),
                      _createElementVNode("div", { class: "pagination" }, [_createElementVNode("span", null, _toDisplayString(s.total) + " inscrição(ões) · página " + _toDisplayString(s.page), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: $event => (paginate(-1)),
                        disabled: s.page<=1
                      }, "Anterior", 8, ["onClick", "disabled"]), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: $event => (paginate(1)),
                        disabled: s.page*30>=s.total
                      }, "Próxima", 8, ["onClick", "disabled"])])])
                    ]))
                  : _createCommentVNode("", true), (s.selected)
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                      _createElementVNode("section", { class: "panel x-card" }, [
                        _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(s.selected.number) + " · " + _toDisplayString(s.selected.campaign_title), 1), _createElementVNode("h2", null, _toDisplayString(s.selected.student_data.name), 1), _createElementVNode("p", null, [_createTextVNode(_toDisplayString(s.selected.class_name) + " · ", 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(s.selected.status_label), 1)])]), _createElementVNode("button", {
                          class: "btn btn-secondary",
                          onClick: $event => (s.selected=null)
                        }, "← Voltar à fila", 8, ["onClick"])]),
                        _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("div", null, [
                          _createElementVNode("h3", null, "Aluno"),
                          _createElementVNode("p", null, "Nascimento: " + _toDisplayString(date(s.selected.student_data.birth_date||'')), 1),
                          _createElementVNode("p", null, "CPF: " + _toDisplayString(s.selected.student_data.cpf||'Não informado'), 1),
                          _createElementVNode("p", null, "Endereço: " + _toDisplayString(s.selected.student_data.address||'Não informado'), 1),
                          _createElementVNode("p", null, "Escola anterior: " + _toDisplayString(s.selected.student_data.previous_school||'Não informada'), 1)
                        ]), _createElementVNode("div", null, [
                          _createElementVNode("h3", null, "Responsável que enviou"),
                          _createElementVNode("p", null, _toDisplayString(s.selected.guardian_snapshot.name||s.selected.account?.name) + " · " + _toDisplayString(s.selected.relationship), 1),
                          _createElementVNode("p", null, _toDisplayString(s.selected.guardian_snapshot.email||s.selected.account?.email), 1),
                          _createElementVNode("p", null, _toDisplayString(s.selected.guardian_snapshot.phone||s.selected.account?.phone), 1),
                          _createElementVNode("p", null, "CPF: " + _toDisplayString(s.selected.guardian_snapshot.cpf||'Não informado'), 1)
                        ])]),
                        _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(s.selected.notes), 1),
                        _createElementVNode("p", null, "Termos aceitos: versão " + _toDisplayString(s.selected.consent.terms_version||'ainda não aceita') + " · " + _toDisplayString(date(s.selected.consent.accepted_at)), 1),
                        (s.selected.enrollment)
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, [_createTextVNode("Matrícula vinculada: "), _createElementVNode("strong", null, _toDisplayString(s.selected.enrollment.number), 1), _createTextVNode(" · " + _toDisplayString(label(s.selected.enrollment.status)) + ". Disponível também no menu Matrículas.", 1)]))
                          : _createCommentVNode("", true)
                      ]),
                      _createElementVNode("section", { class: "panel x-card" }, [
                        _createElementVNode("h2", null, "Análise e documentos"),
                        (can('admissions.write'))
                          ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Justificativa / parecer para a próxima ação"), _withDirectives(_createElementVNode("textarea", {
                              "onUpdate:modelValue": $event => ((s.reason) = $event),
                              rows: "3",
                              minlength: "3",
                              maxlength: "1000",
                              placeholder: "Registre a conferência ou a orientação enviada à família."
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.reason]])]))
                          : _createCommentVNode("", true),
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.selected.document_types, (d) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: d.id,
                            class: "x-line"
                          }, [_createElementVNode("span", null, _toDisplayString(d.name) + " " + _toDisplayString(d.required?'· obrigatório':''), 1), _createElementVNode("span", null, _toDisplayString(s.selected.attachments.some(a=>a.document_type_id===d.id)?'Recebido':'Ausente'), 1)]))
                        }), 128)),
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.selected.attachments, (a) => {
                          return (_openBlock(), _createElementBlock("article", {
                            key: a.id,
                            class: "x-charge"
                          }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(a.original_name), 1), _createElementVNode("p", null, _toDisplayString(label(a.review_status)) + " · " + _toDisplayString(a.review_note), 1), _createElementVNode("small", null, "SHA-256: " + _toDisplayString(a.sha256), 1)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (download('/admissions/'+s.selected.id+'/attachments/'+a.id,a.original_name))
                          }, "Abrir anexo", 8, ["onClick"]), (can('documents.validate')&&['submitted','under_review','waitlisted','changes_requested'].includes(s.selected.status))
                            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("button", {
                                class: "btn btn-primary",
                                disabled: s.reason.length<3,
                                onClick: $event => (reviewDoc(a,'validated'))
                              }, "Validar", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                                class: "btn btn-secondary",
                                disabled: s.reason.length<3,
                                onClick: $event => (reviewDoc(a,'rejected'))
                              }, "Rejeitar", 8, ["disabled", "onClick"])], 64))
                            : _createCommentVNode("", true)])])]))
                        }), 128)),
                        (can('admissions.write')&&!['approved','enrolled','rejected','withdrawn'].includes(s.selected.status))
                          ? (_openBlock(), _createElementBlock("form", {
                              key: 1,
                              onSubmit: _withModifiers(action, ["prevent"]),
                              class: "x-filter"
                            }, [_createElementVNode("label", null, [_createTextVNode("Movimentar análise"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.action) = $event) }, [
                              _createElementVNode("option", { value: "review" }, "Iniciar análise"),
                              _createElementVNode("option", { value: "request_changes" }, "Solicitar correção"),
                              _createElementVNode("option", { value: "waitlist" }, "Lista de espera"),
                              _createElementVNode("option", { value: "reject" }, "Indeferir inscrição"),
                              _createElementVNode("option", { value: "withdraw" }, "Registrar desistência")
                            ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.action]])]), _createElementVNode("button", {
                              class: "btn btn-secondary",
                              disabled: s.reason.length<3
                            }, "Aplicar com justificativa", 8, ["disabled"])], 40, ["onSubmit"]))
                          : _createCommentVNode("", true),
                        (can('admissions.write')&&['submitted','under_review','waitlisted'].includes(s.selected.status))
                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("details", null, [
                              _createElementVNode("summary", null, "Conciliar com cadastro já existente"),
                              _createElementVNode("p", null, "Não há vínculo automático por CPF. Pesquise e escolha somente após comprovar a identidade e a responsabilidade pelo aluno."),
                              _createElementVNode("div", { class: "x-filter" }, [_createElementVNode("label", null, [_createTextVNode("Pesquisar nome / CPF"), _withDirectives(_createElementVNode("input", { "onUpdate:modelValue": $event => ((s.matchQ) = $event) }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.matchQ]])]), _createElementVNode("button", {
                                type: "button",
                                class: "btn btn-secondary",
                                onClick: match,
                                disabled: s.matchQ.length<3
                              }, "Buscar cadastros", 8, ["onClick", "disabled"])]),
                              _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Aluno existente (opcional)"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.existingStudent) = $event) }, [_createElementVNode("option", { value: "" }, "Criar novo aluno após conferir duplicidade"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.studentMatches, (a) => {
                                return (_openBlock(), _createElementBlock("option", {
                                  key: a.id,
                                  value: a.id
                                }, _toDisplayString(a.person.name) + " · " + _toDisplayString(a.number), 9, ["value"]))
                              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.existingStudent]])]), _createElementVNode("label", null, [_createTextVNode("Responsável existente (opcional)"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.existingGuardian) = $event) }, [_createElementVNode("option", { value: "" }, "Criar novo responsável após conferir duplicidade"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.guardianMatches, (a) => {
                                return (_openBlock(), _createElementBlock("option", {
                                  key: a.id,
                                  value: a.id
                                }, _toDisplayString(a.name) + " · " + _toDisplayString(a.cpf||'sem CPF'), 9, ["value"]))
                              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.existingGuardian]])])])
                            ]), _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                              type: "checkbox",
                              "onUpdate:modelValue": $event => ((s.identity) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.identity]]), _createTextVNode("Conferi a identidade, os documentos e a legitimidade do vínculo do responsável com este aluno.")]), _createElementVNode("button", {
                              class: "btn btn-primary",
                              onClick: approve,
                              disabled: !s.identity||s.reason.length<10
                            }, "Aprovar e criar matrícula em preparação", 8, ["onClick", "disabled"])], 64))
                          : _createCommentVNode("", true),
                        (can('admissions.write')&&s.selected.status==='approved')
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 3,
                              class: "x-form"
                            }, [_createElementVNode("p", null, "A efetivação verifica vagas, documentos obrigatórios e pagamentos exigidos. O comprovante será disponibilizado ao responsável."), _createElementVNode("button", {
                              class: "btn btn-primary",
                              onClick: finalize,
                              disabled: s.reason.length<3
                            }, "Efetivar matrícula e emitir comprovante", 8, ["onClick", "disabled"])]))
                          : _createCommentVNode("", true)
                      ]),
                      _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Cobranças da inscrição"), (can('banking.write')&&!['draft','withdrawn','rejected'].includes(s.selected.status))
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            class: "btn btn-primary",
                            onClick: $event => (newCharge(s.selected.id))
                          }, "+ Criar cobrança", 8, ["onClick"]))
                        : _createCommentVNode("", true)]), (!s.charges.length)
                        ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Nenhuma cobrança vinculada."))
                        : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.charges, (c) => {
                        return (_openBlock(), _createElementBlock("button", {
                          key: c.id,
                          class: "x-record",
                          onClick: $event => (inspectCharge(c))
                        }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(c.description), 1), _createElementVNode("span", null, _toDisplayString(date(c.due_on)) + " · " + _toDisplayString(c.billing_type), 1)]), _createElementVNode("strong", null, _toDisplayString(money(c.amount)), 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(c.status)), 1)], 8, ["onClick"]))
                      }), 128))]),
                      _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Atendimento com o responsável"), _createElementVNode("div", { class: "x-timeline" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.selected.messages, (m) => {
                        return (_openBlock(), _createElementBlock("article", {
                          key: m.id,
                          class: _normalizeClass({'x-internal':m.internal})
                        }, [_createElementVNode("small", null, _toDisplayString(date(m.created_at)) + " · " + _toDisplayString(m.internal?'Nota interna · não visível à família':m.account_id?'Responsável':'Secretaria'), 1), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(m.text), 1)], 2))
                      }), 128))]), (can('admissions.write'))
                        ? (_openBlock(), _createElementBlock("form", {
                            key: 0,
                            onSubmit: _withModifiers(message, ["prevent"]),
                            class: "x-form"
                          }, [
                            _createElementVNode("label", null, [_createTextVNode("Mensagem / anotação"), _withDirectives(_createElementVNode("textarea", {
                              "onUpdate:modelValue": $event => ((s.message) = $event),
                              maxlength: "3000",
                              rows: "3",
                              required: ""
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.message]])]),
                            _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                              type: "checkbox",
                              "onUpdate:modelValue": $event => ((s.internal) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.internal]]), _createTextVNode("Somente nota interna (não exibir no portal)")]),
                            _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", { class: "btn btn-primary" }, "Registrar no atendimento"), (can('communications.send')&&!s.internal)
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  type: "button",
                                  class: "btn btn-secondary",
                                  onClick: whatsapp,
                                  disabled: !s.message
                                }, "Enviar este texto por Connect API", 8, ["onClick", "disabled"]))
                              : _createCommentVNode("", true)]),
                            _createElementVNode("p", { class: "muted" }, "Envios por WhatsApp exigem consentimento e telefone verificado. Prefira avisos curtos com acesso ao portal.")
                          ], 40, ["onSubmit"]))
                        : _createCommentVNode("", true)])
                    ], 64))
                  : _createCommentVNode("", true)], 64))], 64))
          : _createCommentVNode("", true),
        (props.page==='banking')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("p", null, "Cobranças de matrícula e mensalidades via ASAAS. Valores nominais; não é saldo bancário nem escrituração contábil."), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
              class: "btn btn-secondary",
              onClick: $event => (run(load))
            }, "Atualizar", 8, ["onClick"]), (can('banking.write'))
              ? (_openBlock(), _createElementBlock("button", {
                  key: 0,
                  class: "btn btn-primary",
                  onClick: $event => (newCharge())
                }, "+ Nova cobrança", 8, ["onClick"]))
              : _createCommentVNode("", true)])]), _createElementVNode("div", { class: "stats-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.bankSummary, (t) => {
              return (_openBlock(), _createElementBlock("div", {
                key: t.status,
                class: "stat-card"
              }, [_createElementVNode("span", null, _toDisplayString(label(t.status)), 1), _createElementVNode("strong", { class: "x-money" }, _toDisplayString(money(t.amount)), 1), _createElementVNode("small", null, _toDisplayString(t.count) + " cobrança(s)", 1)]))
            }), 128))]), _createElementVNode("section", { class: "panel x-card" }, [
              _createElementVNode("form", {
                onSubmit: _withModifiers(search, ["prevent"]),
                class: "x-filter"
              }, [_createElementVNode("label", null, [_createTextVNode("Descrição / pagador"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((s.q) = $event),
                maxlength: "160"
              }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.q]])]), _createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.status) = $event) }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['queued','pending','confirmed','received','overdue','uncertain','failed','cancelled','refunded','disputed'], (status) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: status,
                  value: status
                }, _toDisplayString(label(status)), 9, ["value"]))
              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.status]])]), _createElementVNode("button", { class: "btn btn-primary" }, "Pesquisar")], 40, ["onSubmit"]),
              (!s.charges.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhuma cobrança encontrada. Configure ASAAS em Integrações e selecione uma matrícula ou inscrição."))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.charges, (c) => {
                return (_openBlock(), _createElementBlock("button", {
                  key: c.id,
                  class: "x-record",
                  onClick: $event => (inspectCharge(c))
                }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(c.description), 1), _createElementVNode("span", null, _toDisplayString(c.payer_snapshot?.name) + " · " + _toDisplayString(date(c.due_on)) + " · " + _toDisplayString(c.billing_type), 1)]), _createElementVNode("strong", null, _toDisplayString(money(c.amount)), 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(c.status)), 1)], 8, ["onClick"]))
              }), 128))]),
              _createElementVNode("div", { class: "pagination" }, [_createElementVNode("span", null, _toDisplayString(s.total) + " cobrança(s) · página " + _toDisplayString(s.page), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (paginate(-1)),
                disabled: s.page<=1
              }, "Anterior", 8, ["onClick", "disabled"]), _createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (paginate(1)),
                disabled: s.page*30>=s.total
              }, "Próxima", 8, ["onClick", "disabled"])])])
            ])], 64))
          : _createCommentVNode("", true),
        (_openBlock(), _createBlock(_Teleport, { to: "body" }, [(s.chargeOpen)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "modal-backdrop",
              onClick: _withModifiers(closeCharge, ["self"])
            }, [_createElementVNode("section", {
              class: "modal charge-dialog",
              role: "dialog",
              "aria-modal": "true",
              "aria-labelledby": "charge-modal-title"
            }, [_createElementVNode("header", { class: "modal-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name) + " · FINANCEIRO", 1), _createElementVNode("h2", {
              id: "charge-modal-title",
              "data-dialog-title": ""
            }, "Nova cobrança ASAAS")]), _createElementVNode("button", {
              type: "button",
              class: "icon-button",
              "data-dialog-close": "",
              "aria-label": "Fechar lançamento",
              disabled: s.busy,
              onClick: closeCharge
            }, "×", 8, ["disabled", "onClick"])]), _createElementVNode("form", {
              class: "modal-form",
              onSubmit: _withModifiers(createCharge, ["prevent"])
            }, [(s.discardCharge)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "discard-banner",
                  role: "alert"
                }, [_createElementVNode("span", null, "Existem alterações não salvas nesta cobrança."), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary",
                  onClick: $event => (s.discardCharge=false)
                }, "Continuar editando", 8, ["onClick"]), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-danger",
                  onClick: $event => (closeCharge(true))
                }, "Descartar alterações", 8, ["onClick"])]))
              : _createCommentVNode("", true), _createElementVNode("div", { class: "modal-workspace" }, [_createElementVNode("div", { class: "modal-body" }, [(s.error)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "alert error",
                  role: "alert"
                }, _toDisplayString(s.error), 1))
              : _createCommentVNode("", true), _createElementVNode("p", { class: "small muted" }, "Revise o aluno, o responsável financeiro e os valores. O lançamento só será enviado ao confirmar."), _createElementVNode("fieldset", {
              class: "dialog-fields x-form",
              disabled: s.busy
            }, [
              (!s.chargeForm.admission_id)
                ? (_openBlock(), _createElementBlock("div", { key: 0 }, [_createElementVNode("div", { class: "x-filter" }, [_createElementVNode("label", null, [_createTextVNode("Pesquisar aluno / matrícula"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((s.enrollmentQ) = $event),
                    maxlength: "160"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.enrollmentQ]])]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    type: "button",
                    onClick: findEnrollments,
                    disabled: s.enrollmentQ.length<3
                  }, "Buscar matrícula", 8, ["onClick", "disabled"])]), _createElementVNode("label", null, [_createTextVNode("Matrícula / responsável financeiro"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((s.chargeForm.enrollment_id) = $event),
                    required: ""
                  }, [_createElementVNode("option", { value: "" }, "Selecione uma matrícula"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.enrollmentMatches, (e) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: e.id,
                      value: e.id
                    }, _toDisplayString(e.number) + " · " + _toDisplayString(e.student_name) + " · " + _toDisplayString(e.class_name), 9, ["value"]))
                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.chargeForm.enrollment_id]])])]))
                : (_openBlock(), _createElementBlock("p", { key: 1 }, "A cobrança será vinculada a esta inscrição e ao responsável que a enviou.")),
              _createElementVNode("div", { class: "x-grid" }, [
                _createElementVNode("label", null, [_createTextVNode("Descrição"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((s.chargeForm.description) = $event),
                  minlength: "3",
                  maxlength: "450",
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.chargeForm.description]])]),
                _createElementVNode("label", null, [_createTextVNode("Valor de cada parcela (R$)"), _withDirectives(_createElementVNode("input", {
                  type: "number",
                  min: "0.01",
                  step: "0.01",
                  "onUpdate:modelValue": $event => ((s.chargeForm.amount) = $event),
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.chargeForm.amount]])]),
                _createElementVNode("label", null, [_createTextVNode("Primeiro vencimento"), _withDirectives(_createElementVNode("input", {
                  type: "date",
                  "onUpdate:modelValue": $event => ((s.chargeForm.due_on) = $event),
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.chargeForm.due_on]])]),
                _createElementVNode("label", null, [_createTextVNode("Quantidade mensal (1 = avulsa)"), _withDirectives(_createElementVNode("input", {
                  type: "number",
                  "onUpdate:modelValue": $event => ((s.chargeForm.installment_count) = $event),
                  min: "1",
                  max: "24",
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[
                  _vModelText,
                  s.chargeForm.installment_count,
                  void 0,
                  { number: true }
                ]])]),
                _createElementVNode("label", null, [_createTextVNode("Forma"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.chargeForm.billing_type) = $event) }, [_createElementVNode("option", { value: "PIX" }, "Pix"), _createElementVNode("option", { value: "BOLETO" }, "Boleto")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.chargeForm.billing_type]])])
              ]),
              _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                type: "checkbox",
                "onUpdate:modelValue": $event => ((s.chargeForm.required_for_enrollment) = $event),
                disabled: s.chargeForm.installment_count>1
              }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelCheckbox, s.chargeForm.required_for_enrollment]]), _createTextVNode("Recebimento obrigatório antes da matrícula (somente cobrança avulsa)")]),
              _createElementVNode("p", null, "O pagador precisa de CPF válido. Para mensalidades, o valor acima é de cada cobrança, não o total dividido."),
              _createElementVNode("div", { class: "charge-summary" }, [_createElementVNode("div", null, [_createElementVNode("small", null, "Valor de cada parcela"), _createElementVNode("strong", null, _toDisplayString(money(s.chargeForm.amount || '0')), 1)]), _createElementVNode("div", null, [_createElementVNode("small", null, "Quantidade"), _createElementVNode("strong", null, _toDisplayString(s.chargeForm.installment_count), 1)]), _createElementVNode("div", null, [_createElementVNode("small", null, "Total nominal previsto"), _createElementVNode("strong", null, _toDisplayString(chargeTotal()), 1)])])
            ], 8, ["disabled"])])]), _createElementVNode("footer", { class: "modal-footer" }, [_createElementVNode("span", { class: "small muted" }, [_createTextVNode("Confira o vínculo, vencimento e valor."), _createElementVNode("small", { class: "block" }, "O valor informado é por parcela.")]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary",
              disabled: s.busy,
              onClick: closeCharge
            }, "Voltar", 8, ["disabled", "onClick"]), _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: s.busy || (!s.chargeForm.admission_id&&!s.chargeForm.enrollment_id)
            }, _toDisplayString(s.busy?'Processando…':'Confirmar criação da(s) cobrança(s)'), 9, ["disabled"])])], 40, ["onSubmit"])])], 8, ["onClick"]))
          : _createCommentVNode("", true)])),
        (_openBlock(), _createBlock(_Teleport, { to: "body" }, [(s.selectedCharge)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "modal-backdrop"
            }, [_createElementVNode("section", {
              class: "modal charge-dialog",
              role: "dialog",
              "aria-modal": "true",
              "aria-labelledby": "charge-detail-title"
            }, [_createElementVNode("header", { class: "modal-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name) + " · COBRANÇA", 1), _createElementVNode("h2", {
              id: "charge-detail-title",
              "data-dialog-title": ""
            }, _toDisplayString(s.selectedCharge.description), 1), _createElementVNode("p", null, _toDisplayString(money(s.selectedCharge.amount)) + " · " + _toDisplayString(label(s.selectedCharge.status)) + " · " + _toDisplayString(date(s.selectedCharge.due_on)), 1)]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary",
              "data-dialog-close": "",
              disabled: s.busy,
              onClick: $event => (s.selectedCharge=null)
            }, "Fechar detalhes", 8, ["disabled", "onClick"])]), _createElementVNode("div", { class: "modal-body" }, [(s.error)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "alert error",
                  role: "alert"
                }, _toDisplayString(s.error), 1))
              : _createCommentVNode("", true), _createElementVNode("fieldset", {
              class: "dialog-fields",
              disabled: s.busy
            }, [
              (s.selectedCharge.required_for_enrollment)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "alert warning"
                  }, "Cobrança obrigatória para a efetivação da matrícula."))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "actions" }, [(safeLink(s.selectedCharge.invoice_url))
                ? (_openBlock(), _createElementBlock("a", {
                    key: 0,
                    href: safeLink(s.selectedCharge.invoice_url),
                    class: "btn btn-secondary",
                    target: "_blank",
                    rel: "noopener"
                  }, "Abrir cobrança ASAAS", 8, ["href"]))
                : _createCommentVNode("", true), (safeLink(s.selectedCharge.bank_slip_url))
                ? (_openBlock(), _createElementBlock("a", {
                    key: 1,
                    href: safeLink(s.selectedCharge.bank_slip_url),
                    class: "btn btn-secondary",
                    target: "_blank",
                    rel: "noopener"
                  }, "Abrir boleto", 8, ["href"]))
                : _createCommentVNode("", true)]),
              (s.selectedCharge.pix_copy_paste)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 1,
                    class: "x-pix"
                  }, [(s.selectedCharge.pix_image)
                    ? (_openBlock(), _createElementBlock("img", {
                        key: 0,
                        src: 'data:image/png;base64,'+s.selectedCharge.pix_image,
                        alt: "QR Code Pix"
                      }, null, 8, ["src"]))
                    : _createCommentVNode("", true), _createElementVNode("label", null, [_createTextVNode("Pix Copia e Cola"), _createElementVNode("textarea", {
                    readonly: "",
                    value: s.selectedCharge.pix_copy_paste,
                    rows: "3"
                  }, null, 8, ["value"]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (copy(s.selectedCharge.pix_copy_paste))
                  }, "Copiar", 8, ["onClick"])])]))
                : _createCommentVNode("", true),
              (can('banking.write'))
                ? (_openBlock(), _createElementBlock("label", { key: 2 }, [_createTextVNode("Justificativa da operação"), _withDirectives(_createElementVNode("textarea", {
                    "onUpdate:modelValue": $event => ((s.bankReason) = $event),
                    maxlength: "1000",
                    rows: "2"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.bankReason]])]))
                : _createCommentVNode("", true),
              (can('banking.write'))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 3,
                    class: "actions"
                  }, [_createElementVNode("button", {
                    class: "btn btn-primary",
                    onClick: $event => (chargeAction('sync')),
                    disabled: s.bankReason.length<5
                  }, "Conciliar com ASAAS", 8, ["onClick", "disabled"]), (['queued','pending','overdue'].includes(s.selectedCharge.status))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary",
                        onClick: $event => (chargeAction('cancel')),
                        disabled: s.bankReason.length<5
                      }, "Cancelar cobrança", 8, ["onClick", "disabled"]))
                    : _createCommentVNode("", true), (can('integrations.manage')&&!s.selectedCharge.remote_payment_id&&['uncertain','failed','queued'].includes(s.selectedCharge.status))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 1,
                        class: "btn btn-secondary",
                        onClick: $event => (chargeAction('authorize-reissue')),
                        disabled: s.bankReason.length<10
                      }, "Conferi a ausência no ASAAS: autorizar reemissão", 8, ["onClick", "disabled"]))
                    : _createCommentVNode("", true)]))
                : _createCommentVNode("", true),
              _createElementVNode("p", { class: "muted" }, "Resultado incerto não é reenviado automaticamente. Antes de autorizar reemissão, confira a conta ASAAS. Pagamentos recebidos não são estornados por este botão."),
              _createElementVNode("h3", null, "Histórico de conciliação"),
              _createElementVNode("div", { class: "x-timeline" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.bankEvents, (e) => {
                return (_openBlock(), _createElementBlock("article", { key: e.id }, [_createElementVNode("small", null, _toDisplayString(date(e.created_at)) + " · " + _toDisplayString(e.source), 1), _createElementVNode("p", null, _toDisplayString(label(e.previous_status)) + " → " + _toDisplayString(label(e.status)), 1)]))
              }), 128))])
            ], 8, ["disabled"])])])]))
          : _createCommentVNode("", true)])),
        (props.page==='connect')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Connect API"), _createElementVNode("p", null, "Instância de comunicação da empresa, independente de ASAAS, matrículas e cadastro de pessoas.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
              class: "btn btn-secondary",
              onClick: connectTest
            }, "Testar API", 8, ["onClick"]), _createElementVNode("button", {
              class: "btn btn-secondary",
              onClick: $event => (run(load))
            }, "Atualizar", 8, ["onClick"])])]), (!s.connect.configured)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "alert warning"
                }, [
                  _createTextVNode("Configure no ambiente da instalação: "),
                  _createElementVNode("code", null, "CONNECT_API_BASE_URL"),
                  _createTextVNode(", "),
                  _createElementVNode("code", null, "CONNECT_API_KEY"),
                  _createTextVNode(" e "),
                  _createElementVNode("code", null, "CONNECT_ALLOWED_HOSTS"),
                  _createTextVNode(". A chave nunca é digitada nesta tela.")
                ]))
              : (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "alert info"
                }, "API configurada em " + _toDisplayString(s.connect.base_url) + " · chave global presente · prefixo de instância " + _toDisplayString(s.connect.instance_prefix), 1)), _createElementVNode("form", {
              class: "x-form",
              onSubmit: _withModifiers(connectCreate, ["prevent"])
            }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Rótulo da instância adicional (opcional)"), _withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((s.connectLabel) = $event),
              maxlength: "40",
              placeholder: "Ex.: Atendimento 2"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectLabel]])]), _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
              type: "checkbox",
              "onUpdate:modelValue": $event => ((s.connectPrimary) = $event)
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.connectPrimary]]), _createTextVNode("Tornar esta a instância principal")])]), _createElementVNode("p", { class: "muted" }, "O primeiro nome é gerado com empresa e CNPJ: PG360-NOME-DA-EMPRESA-CNPJ."), _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: !s.connect.configured
            }, "Cadastrar instância", 8, ["disabled"])], 40, ["onSubmit"])]), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Instâncias cadastradas"), _createElementVNode("span", null, _toDisplayString(s.connectInstances.length) + " ativa(s)", 1)]), (!s.connectInstances.length)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 0,
                  class: "empty"
                }, "Nenhuma instância foi cadastrada para esta empresa."))
              : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.connectInstances, (i) => {
              return (_openBlock(), _createElementBlock("article", {
                key: i.id,
                class: "x-charge"
              }, [
                _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [
                  _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(i.primary?'PRINCIPAL':'ADICIONAL'), 1),
                  _createElementVNode("h3", null, _toDisplayString(i.display_name), 1),
                  _createElementVNode("code", { class: "x-url" }, _toDisplayString(i.name), 1),
                  _createElementVNode("p", null, [_createTextVNode("Estado local: "), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(i.connection_state||i.status)), 1), _createTextVNode(" · " + _toDisplayString(i.remote_configured?'API pronta':'API não configurada'), 1)]),
                  (i.last_synced_at)
                    ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Última consulta: " + _toDisplayString(date(i.last_synced_at)), 1))
                    : _createCommentVNode("", true)
                ]), _createElementVNode("div", { class: "actions" }, [
                  _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (connectSync(i))
                  }, "Consultar estado", 8, ["onClick"]),
                  _createElementVNode("button", {
                    class: "btn btn-primary",
                    onClick: $event => (connectPair(i))
                  }, "Gerar QR / conectar", 8, ["onClick"]),
                  _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (connectLogout(i))
                  }, "Deslogar", 8, ["onClick"]),
                  _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (connectDelete(i))
                  }, "Descadastrar", 8, ["onClick"])
                ])]),
                (i.last_error)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "alert error"
                    }, _toDisplayString(i.last_error), 1))
                  : _createCommentVNode("", true),
                (s.connectQr.base64)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 1,
                      class: "x-pix"
                    }, [_createElementVNode("img", {
                      src: s.connectQr.base64,
                      alt: "QR Code da Connect API"
                    }, null, 8, ["src"]), _createElementVNode("button", {
                      class: "btn btn-secondary",
                      onClick: clearConnectQr
                    }, "Fechar QR", 8, ["onClick"])]))
                  : _createCommentVNode("", true),
                (s.connectQr.pairingCode||s.connectQr.code)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 2,
                      class: "alert info"
                    }, [_createElementVNode("strong", null, _toDisplayString(s.connectQr.pairingCode?'Pairing code':'Código QR'), 1), _createElementVNode("code", { class: "x-url" }, _toDisplayString(s.connectQr.pairingCode||s.connectQr.code), 1)]))
                  : _createCommentVNode("", true),
                _createElementVNode("label", null, [_createTextVNode("Telefone para pairing code (opcional)"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((s.connectNumber) = $event),
                  inputmode: "tel",
                  placeholder: "+5575999990000"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectNumber]])])
              ]))
            }), 128))]), _createElementVNode("section", { class: "panel x-card" }, [
              _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Fila de mensagens Connect API"), _createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: connectJobs
              }, "Atualizar fila", 8, ["onClick"])]),
              (!s.connectJobs.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhuma mensagem enfileirada."))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                _createElementVNode("th", null, "Operação"),
                _createElementVNode("th", null, "Situação"),
                _createElementVNode("th", null, "Tentativas"),
                _createElementVNode("th", null, "Retorno"),
                _createElementVNode("th", null, "Ação")
              ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.connectJobs, (j) => {
                return (_openBlock(), _createElementBlock("tr", { key: j.id }, [
                  _createElementVNode("td", null, [_createTextVNode(_toDisplayString(j.kind), 1), _createElementVNode("small", { class: "block" }, _toDisplayString(date(j.created_at)), 1)]),
                  _createElementVNode("td", null, _toDisplayString(label(j.status)), 1),
                  _createElementVNode("td", null, _toDisplayString(j.attempts), 1),
                  _createElementVNode("td", null, _toDisplayString(j.error_code||label(j.delivery_status)||'—'), 1),
                  _createElementVNode("td", null, [(['failed','retry'].includes(j.status))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary small-button",
                        onClick: $event => (connectRetry(j)),
                        disabled: s.reason.length<5
                      }, "Reprocessar", 8, ["onClick", "disabled"]))
                    : (j.status==='uncertain')
                      ? (_openBlock(), _createElementBlock("small", { key: 1 }, "Conferência remota necessária"))
                      : _createCommentVNode("", true)])
                ]))
              }), 128))])])]),
              _createElementVNode("label", null, [_createTextVNode("Justificativa para reprocessar"), _withDirectives(_createElementVNode("textarea", {
                "onUpdate:modelValue": $event => ((s.reason) = $event),
                maxlength: "1000",
                rows: "2"
              }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.reason]])])
            ])], 64))
          : _createCommentVNode("", true),
        (props.page==='integrations')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Conexões desta escola"), _createElementVNode("p", null, "Credenciais criptografadas no servidor. Nenhuma integração está ativa até ser configurada e habilitada.")]), _createElementVNode("button", {
              class: "btn btn-secondary",
              onClick: $event => (run(load))
            }, "Atualizar", 8, ["onClick"])]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['asaas'], (provider) => {
              return (_openBlock(), _createElementBlock("article", {
                key: provider,
                class: "x-charge"
              }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, _toDisplayString(provider==='asaas'?'ASAAS · Pix e boleto':'ARGWS Connect API · WhatsApp'), 1), _createElementVNode("p", null, _toDisplayString(connectionFor(provider)?.enabled?'Habilitada':'Desabilitada / não configurada') + " · " + _toDisplayString(connectionFor(provider)?.environment||'—'), 1), (connectionFor(provider)?.last_test_at)
                ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Último teste HTTP: " + _toDisplayString(date(connectionFor(provider)?.last_test_at||'')) + " · " + _toDisplayString(connectionFor(provider)?.last_test_ok?'Respondido':'Falhou'), 1))
                : _createCommentVNode("", true)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                class: "btn btn-primary",
                onClick: $event => (configure(provider))
              }, "Configurar", 8, ["onClick"]), (connectionFor(provider)?.enabled)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-secondary",
                    onClick: $event => (testConnection(provider))
                  }, "Testar conexão HTTP", 8, ["onClick"]))
                : _createCommentVNode("", true)])]), (connectionFor(provider))
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("label", null, [_createTextVNode("URL do webhook"), _createElementVNode("input", {
                    readonly: "",
                    value: origin+connectionFor(provider)?.webhook_path
                  }, null, 8, ["value"])]), _createElementVNode("small", null, _toDisplayString(provider==='asaas'?'Header de autenticação: asaas-access-token':'Header: x-connect-webhook-token · consulte o contrato do callback em docs/INTEGRACOES.md'), 1)], 64))
                : _createCommentVNode("", true)]))
            }), 128))]), (s.editingConnection)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 0,
                  class: "panel x-card"
                }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Configurar " + _toDisplayString(s.provider==='asaas'?'ASAAS':'Connect API'), 1), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => {s.editingConnection=false;s.connectionForm.api_key='';s.connectionForm.webhook_token=''}
                }, "Fechar", 8, ["onClick"])]), _createElementVNode("form", {
                  onSubmit: _withModifiers(saveConnection, ["prevent"]),
                  class: "x-form"
                }, [
                  _createElementVNode("div", { class: "alert info" }, "O servidor precisa de INTEGRATION_ENCRYPTION_KEY. O worker processa os envios e as cobranças; mantenha-o ativo."),
                  _createElementVNode("label", null, [_createTextVNode("Ambiente"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.connectionForm.environment) = $event) }, [_createElementVNode("option", { value: "sandbox" }, "Sandbox / homologação"), _createElementVNode("option", { value: "production" }, "Produção")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.connectionForm.environment]])]),
                  _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("API key (vazio preserva a atual)"), _withDirectives(_createElementVNode("input", {
                    type: "password",
                    "onUpdate:modelValue": $event => ((s.connectionForm.api_key) = $event),
                    maxlength: "4000",
                    autocomplete: "new-password"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.api_key]])]), _createElementVNode("label", null, [_createTextVNode("Token exclusivo do webhook (mínimo 32 caracteres)"), _withDirectives(_createElementVNode("input", {
                    type: "password",
                    "onUpdate:modelValue": $event => ((s.connectionForm.webhook_token) = $event),
                    maxlength: "256",
                    autocomplete: "new-password"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.webhook_token]])])]),
                  (s.provider==='asaas')
                    ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Sandbox e produção usam endpoints oficiais diferentes. Após criar cobranças, a conexão não pode ser trocada de ambiente. Use uma instalação/escola de homologação separada."))
                    : _createCommentVNode("", true),
                  (s.provider==='connect_api')
                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                        _createElementVNode("div", { class: "alert warning" }, "Configure conforme a documentação da sua Connect API. Os caminhos não são presumidos. Este pacote não inclui o contrato da sua instalação para homologação automática."),
                        _createElementVNode("div", { class: "x-grid" }, [
                          _createElementVNode("label", null, [_createTextVNode("URL base HTTPS"), _withDirectives(_createElementVNode("input", {
                            type: "url",
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.base_url) = $event),
                            required: "",
                            placeholder: "https://connect.seudominio.com.br"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.base_url]])]),
                          _createElementVNode("label", null, [_createTextVNode("Instância desta escola"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.instance) = $event),
                            required: "",
                            maxlength: "100"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.instance]])]),
                          _createElementVNode("label", null, [_createTextVNode("Caminho de envio de texto com {instance}"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.send_text_path) = $event),
                            required: "",
                            placeholder: "Caminho conforme sua API"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.send_text_path]])]),
                          _createElementVNode("label", null, [_createTextVNode("Caminho de consulta de estado com {instance}"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.connection_state_path) = $event),
                            required: "",
                            placeholder: "Caminho conforme sua API"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.connection_state_path]])]),
                          _createElementVNode("label", null, [_createTextVNode("Header da chave"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.api_key_header) = $event),
                            required: ""
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.api_key_header]])]),
                          _createElementVNode("label", null, [_createTextVNode("Esquema de autenticação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.connectionForm.config.auth_scheme) = $event) }, [_createElementVNode("option", { value: "" }, "Valor direto no header"), _createElementVNode("option", { value: "Bearer" }, "Bearer")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.connectionForm.config.auth_scheme]])]),
                          _createElementVNode("label", null, [_createTextVNode("Campo JSON do destinatário"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.number_field) = $event),
                            required: ""
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.number_field]])]),
                          _createElementVNode("label", null, [_createTextVNode("Campo JSON do texto"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.text_field) = $event),
                            required: ""
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.text_field]])]),
                          _createElementVNode("label", null, [_createTextVNode("Caminho do ID na resposta"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.connectionForm.config.message_id_path) = $event),
                            required: "",
                            placeholder: "key.id"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.config.message_id_path]])])
                        ]),
                        _createElementVNode("p", null, "Inclua o hostname exato em CONNECT_ALLOWED_HOSTS no .env do servidor. Endereços privados são bloqueados, salvo liberação explícita."),
                        _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((s.connectionForm.config.contract_confirmed) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.connectionForm.config.contract_confirmed]]), _createTextVNode("Conferi caminhos, payload, autenticação, instância e identificação da resposta com a documentação da minha API.")])
                      ], 64))
                    : _createCommentVNode("", true),
                  _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": $event => ((s.connectionForm.enabled) = $event)
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.connectionForm.enabled]]), _createTextVNode("Habilitar esta integração")]),
                  _createElementVNode("button", { class: "btn btn-primary" }, "Salvar configuração")
                ], 40, ["onSubmit"])]))
              : _createCommentVNode("", true), _createElementVNode("section", { class: "panel x-card" }, [
              _createElementVNode("h2", null, "Fila e resultados das integrações"),
              _createElementVNode("p", null, "Envios incertos exigem conferência remota. O painel nunca exibe a chave da API nem códigos de acesso."),
              _createElementVNode("form", {
                onSubmit: _withModifiers($event => {s.jobPage=1;run(jobs)}, ["prevent"]),
                class: "x-filter"
              }, [_createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.jobStatus) = $event) }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['pending','processing','completed','retry','failed','uncertain','cancelled'], (st) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: st,
                  value: st
                }, _toDisplayString(label(st)), 9, ["value"]))
              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.jobStatus]])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Filtrar fila")], 40, ["onSubmit"]),
              _createElementVNode("label", null, [_createTextVNode("Justificativa para reprocessar uma falha"), _withDirectives(_createElementVNode("textarea", {
                "onUpdate:modelValue": $event => ((s.reason) = $event),
                maxlength: "1000",
                rows: "2"
              }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.reason]])]),
              _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                _createElementVNode("th", null, "Operação"),
                _createElementVNode("th", null, "Situação"),
                _createElementVNode("th", null, "Tentativas"),
                _createElementVNode("th", null, "Resultado"),
                _createElementVNode("th", null, "Ação")
              ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.jobs, (j) => {
                return (_openBlock(), _createElementBlock("tr", { key: j.id }, [
                  _createElementVNode("td", null, [_createTextVNode(_toDisplayString(j.kind), 1), _createElementVNode("small", { class: "block" }, _toDisplayString(date(j.created_at)), 1)]),
                  _createElementVNode("td", null, _toDisplayString(label(j.status)), 1),
                  _createElementVNode("td", null, _toDisplayString(j.attempts), 1),
                  _createElementVNode("td", null, _toDisplayString(j.error_code||label(j.delivery_status)||'—'), 1),
                  _createElementVNode("td", null, [(['failed','retry'].includes(j.status)&&j.kind!=='bank_issue')
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary small-button",
                        onClick: $event => (retry(j)),
                        disabled: s.reason.length<5
                      }, "Reprocessar", 8, ["onClick", "disabled"]))
                    : (j.status==='uncertain')
                      ? (_openBlock(), _createElementBlock("small", { key: 1 }, "Conferência manual necessária"))
                      : _createCommentVNode("", true)])
                ]))
              }), 128))])])]),
              _createElementVNode("div", { class: "pagination" }, [_createElementVNode("span", null, _toDisplayString(s.jobTotal) + " operação(ões) · página " + _toDisplayString(s.jobPage), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (paginateJobs(-1)),
                disabled: s.jobPage<=1
              }, "Anterior", 8, ["onClick", "disabled"]), _createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (paginateJobs(1)),
                disabled: s.jobPage*30>=s.jobTotal
              }, "Próxima", 8, ["onClick", "disabled"])])])
            ])], 64))
          : _createCommentVNode("", true)
      ], 8, ["disabled"])
    ]))
  }
}};
