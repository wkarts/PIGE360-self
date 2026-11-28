/* Vue pré-compilado; sem eval em runtime. */
var _Vue=Vue; var PigeRenders={familyPortal:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, renderList: _renderList, Fragment: _Fragment, vModelText: _vModelText, withModifiers: _withModifiers, withKeys: _withKeys, withDirectives: _withDirectives, vModelDynamic: _vModelDynamic, normalizeClass: _normalizeClass, resolveComponent: _resolveComponent, vShow: _vShow, createBlock: _createBlock, vModelSelect: _vModelSelect, vModelCheckbox: _vModelCheckbox } = _Vue

    const _component_portal_mail = _resolveComponent("portal-mail")
    const _component_learning_portal = _resolveComponent("learning-portal")
    const _component_portal_protocols = _resolveComponent("portal-protocols")

    return (_openBlock(), _createElementBlock("div", {
      class: "family-root",
      "aria-busy": s.busy
    }, [_createElementVNode("a", {
      class: "skip",
      href: "#family-content"
    }, "Ir para conteúdo"), (!s.ready)
      ? (_openBlock(), _createElementBlock("main", {
          key: 0,
          id: "family-content",
          class: "loading-screen",
          role: "status"
        }, "Carregando seu espaço…"))
      : (!s.account)
        ? (_openBlock(), _createElementBlock("main", {
            key: 1,
            id: "family-content",
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
              }, _toDisplayString(identity.display_name), 1))]), _createElementVNode("div", { class: "auth-copy" }, [_createElementVNode("p", { class: "eyebrow" }, "PORTAL DO ALUNO E RESPONSÁVEL"), _createElementVNode("h1", null, [
            _createTextVNode("A vida escolar."),
            _createElementVNode("br"),
            _createTextVNode("Mais perto"),
            _createElementVNode("br"),
            _createTextVNode("da sua família.")
          ])])]), _createElementVNode("section", { class: "auth-panel" }, [(mfa.state.challenge)
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
                _createElementVNode("header", { class: "auth-heading" }, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(identity.display_name), 1), _createElementVNode("h2", null, "Acesse seu portal"), _createElementVNode("p", { class: "muted" }, "Informe suas credenciais para continuar.")]),
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
                _createElementVNode("div", { class: "field" }, [_createElementVNode("label", { for: "family-password" }, "Senha"), _createElementVNode("div", { class: "password-control" }, [_withDirectives(_createElementVNode("input", {
                  id: "family-password",
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
                  "aria-controls": "family-password",
                  onClick: $event => (s.passwordVisible=!s.passwordVisible)
                }, _toDisplayString(s.passwordVisible?'Ocultar':'Mostrar'), 9, ["aria-label", "aria-pressed", "onClick"])])]),
                _createElementVNode("button", {
                  class: "btn btn-primary full",
                  disabled: s.busy
                }, [_createTextVNode(_toDisplayString(s.busy?'Autenticando…':'Entrar no portal') + " ", 1), _createElementVNode("span", { "aria-hidden": "true" }, "→")], 8, ["disabled"]),
                _createElementVNode("p", { class: "auth-help muted" }, [_createElementVNode("a", { href: "/family/recuperar-senha" }, "Esqueci minha senha")]),
                _createElementVNode("details", { class: "family-first-access" }, [_createElementVNode("summary", null, "Primeiro acesso?"), _createElementVNode("p", null, "Utilize o convite enviado ao e-mail do seu cadastro. A conta da inscrição é independente do acesso escolar."), _createElementVNode("a", { href: "/online" }, "Inscrição e matrícula online →")])
              ], 40, ["onSubmit"]))])]))
        : (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: _normalizeClass(["family-shell", {'family-shell-collapsed':s.sidebarCollapsed}])
          }, [(s.menuOpen)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "family-shade",
                onClick: $event => (closeMenu()),
                "aria-hidden": "true"
              }, null, 8, ["onClick"]))
            : _createCommentVNode("", true), _createElementVNode("aside", {
            id: "family-navigation",
            class: _normalizeClass(["family-sidebar", {visible:s.menuOpen}]),
            "aria-label": "Navegação do portal"
          }, [_createElementVNode("div", { class: "family-sidebar-brand" }, [_createElementVNode("button", {
            id: "family-menu-close",
            class: "icon-button family-menu-close",
            type: "button",
            onClick: $event => (closeMenu()),
            "aria-label": "Fechar menu"
          }, [(_openBlock(), _createElementBlock("svg", {
            class: "ui-icon",
            "aria-hidden": "true"
          }, [_createElementVNode("use", { href: "/ui-icons.svg#close" })]))], 8, ["onClick"]), _createElementVNode("a", {
            href: "/family",
            "aria-label": portalName(),
            title: portalName(),
            onClick: _withModifiers($event => (section('overview')), ["prevent"])
          }, [(identity.logo_url)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: identity.logo_url,
                alt: identity.display_name
              }, null, 8, ["src", "alt"]))
            : (_openBlock(), _createElementBlock("strong", { key: 1 }, _toDisplayString(identity.display_name), 1)), _createElementVNode("small", null, _toDisplayString(portalName()), 1)], 8, ["aria-label", "title", "onClick"])]), _createElementVNode("div", { class: "family-sidebar-scroll" }, [
            (student()?.academic_authorized!==false)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 0,
                  class: "family-nav-label"
                }, "ACOMPANHAMENTO ESCOLAR"))
              : _createCommentVNode("", true),
            (student()?.academic_authorized!==false)
              ? (_openBlock(), _createElementBlock("nav", {
                  key: 1,
                  "aria-label": "Acompanhamento escolar"
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList([{id:'overview',label:'Visão geral',icon:'dashboard'},{id:'students',label:title('students'),icon:'students'},{id:'materials',label:'Atividades',icon:'documents'},{id:'academic',label:title('academic'),icon:'academic'},{id:'agenda',label:'Agenda escolar',icon:'clock'},{id:'news',label:'Comunicados',icon:'bell'}], (item) => {
                  return (_openBlock(), _createElementBlock("button", {
                    key: item.id,
                    type: "button",
                    title: item.label,
                    "aria-label": item.label,
                    "aria-current": s.section===item.id?'page':undefined,
                    onClick: $event => (section(item.id))
                  }, [(_openBlock(), _createElementBlock("svg", {
                    class: "ui-icon",
                    "aria-hidden": "true"
                  }, [_createElementVNode("use", { href: '/ui-icons.svg#'+item.icon }, null, 8, ["href"])])), _createElementVNode("span", null, _toDisplayString(item.label), 1), (item.id==='students'&&!studentView()&&s.students.length)
                    ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(s.students.length), 1))
                    : _createCommentVNode("", true)], 8, ["title", "aria-label", "aria-current", "onClick"]))
                }), 128))]))
              : _createCommentVNode("", true),
            _createElementVNode("p", { class: "family-nav-label" }, "Serviços escolares"),
            _createElementVNode("nav", { "aria-label": "Serviços escolares" }, [
              (mail.state.available)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    type: "button",
                    title: "E-mail",
                    "aria-label": "E-mail",
                    "aria-current": s.section==='webmail'?'page':undefined,
                    onClick: $event => (section('webmail'))
                  }, [(_openBlock(), _createElementBlock("svg", {
                    class: "ui-icon",
                    "aria-hidden": "true"
                  }, [_createElementVNode("use", { href: "/ui-icons.svg#email" })])), _createElementVNode("span", null, "E-mail")], 8, ["aria-current", "onClick"]))
                : _createCommentVNode("", true),
              (s.account.role==='guardian'&&student()?.academic_authorized!==false)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 1,
                    type: "button",
                    title: "Justificativas de ausência",
                    "aria-label": "Justificativas de ausência",
                    "aria-current": s.section==='absences'?'page':undefined,
                    onClick: $event => (section('absences'))
                  }, [(_openBlock(), _createElementBlock("svg", {
                    class: "ui-icon",
                    "aria-hidden": "true"
                  }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createElementVNode("span", null, "Justificativas de ausência")], 8, ["aria-current", "onClick"]))
                : _createCommentVNode("", true),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList([{id:'finance',label:'Financeiro',icon:'billing'},{id:'documents',label:'Documentos',icon:'documents'},{id:'support',label:'Atendimento',icon:'school'}].filter(x=>(x.id!=='finance'||student()?.financial_authorized)&&(x.id!=='documents'||student()?.academic_authorized!==false)), (item) => {
                return (_openBlock(), _createElementBlock("button", {
                  key: item.id,
                  type: "button",
                  title: item.label,
                  "aria-label": item.label,
                  "aria-current": s.section===item.id?'page':undefined,
                  onClick: $event => (section(item.id))
                }, [(_openBlock(), _createElementBlock("svg", {
                  class: "ui-icon",
                  "aria-hidden": "true"
                }, [_createElementVNode("use", { href: '/ui-icons.svg#'+item.icon }, null, 8, ["href"])])), _createElementVNode("span", null, _toDisplayString(item.label), 1)], 8, ["title", "aria-label", "aria-current", "onClick"]))
              }), 128)),
              _createElementVNode("a", {
                href: "/online",
                title: "Inscrição e contratos",
                "aria-label": "Inscrição e contratos"
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true"
              }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createElementVNode("span", null, "Inscrição e contratos ↗")])
            ])
          ]), _createElementVNode("footer", { class: "family-sidebar-footer" }, [_createTextVNode(_toDisplayString(identity.short_name), 1), _createElementVNode("small", null, _toDisplayString(portalName()), 1)])], 2), _createElementVNode("div", {
            class: "family-main",
            inert: s.menuOpen?true:undefined
          }, [
            _createElementVNode("header", { class: "family-header" }, [
              _createElementVNode("button", {
                id: "family-menu-toggle",
                class: "icon-button family-menu-toggle",
                type: "button",
                onClick: openMenu,
                "aria-label": "Abrir menu",
                "aria-controls": "family-navigation",
                "aria-expanded": s.menuOpen
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true"
              }, [_createElementVNode("use", { href: "/ui-icons.svg#menu" })]))], 8, ["onClick", "aria-expanded"]),
              _createElementVNode("button", {
                class: "icon-button family-rail-toggle",
                type: "button",
                onClick: toggleSidebar,
                "aria-label": s.sidebarCollapsed?'Expandir menu lateral':'Recolher menu lateral',
                title: s.sidebarCollapsed?'Expandir menu lateral':'Recolher menu lateral',
                "aria-controls": "family-navigation",
                "aria-expanded": !s.sidebarCollapsed
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true"
              }, [_createElementVNode("use", { href: "/ui-icons.svg#sidebar-toggle" })]))], 8, ["onClick", "aria-label", "title", "aria-expanded"]),
              _createElementVNode("div", { class: "family-header-school" }, [_createElementVNode("small", null, _toDisplayString(portalName()), 1), _createElementVNode("strong", null, _toDisplayString(identity.display_name), 1)]),
              _createElementVNode("div", { class: "family-account" }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(s.account.name), 1), _createElementVNode("small", null, _toDisplayString(s.account.role==='student'?'Aluno':'Responsável'), 1)]), _createElementVNode("span", {
                class: "family-avatar",
                "aria-hidden": "true"
              }, _toDisplayString(initials(s.account.name)), 1)]),
              _createElementVNode("button", {
                type: "button",
                class: "icon-button",
                onClick: logout,
                disabled: s.busy,
                "aria-label": "Sair do portal",
                title: "Sair"
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true"
              }, [_createElementVNode("use", { href: "/ui-icons.svg#logout" })]))], 8, ["onClick", "disabled"])
            ]),
            (s.tabs.length)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "work-tabs family-work-tabs"
                }, [_createElementVNode("div", {
                  class: "work-tabs-list",
                  role: "tablist",
                  "aria-label": "Tarefas abertas",
                  onKeydown: tabKeys
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.tabs, (id) => {
                  return (_openBlock(), _createElementBlock("div", {
                    key: id,
                    class: _normalizeClass(["work-tab", {current:id===s.section}])
                  }, [_createElementVNode("button", {
                    type: "button",
                    role: "tab",
                    id: 'family-tab-'+id,
                    "aria-selected": id===s.section,
                    tabindex: id===s.section?0:-1,
                    "aria-controls": "family-view",
                    title: id===s.tabs[0] && s.tabs.length>1?'Duplo clique para fechar as outras guias':undefined,
                    onClick: $event => (section(id,'',false)),
                    onDblclick: $event => (id===s.tabs[0] && closeTabs())
                  }, _toDisplayString(title(id)), 41, ["id", "aria-selected", "tabindex", "title", "onClick", "onDblclick"]), (id!==s.tabs[0])
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "work-tab-close",
                        type: "button",
                        "aria-label": 'Fechar guia '+title(id),
                        onClick: $event => (closeTabs(id))
                      }, "×", 8, ["aria-label", "onClick"]))
                    : _createCommentVNode("", true)], 2))
                }), 128))], 40, ["onKeydown"]), (s.tabs.length>1)
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      type: "button",
                      class: "icon-button family-close-others",
                      "aria-label": "Fechar outras guias",
                      title: "Fechar outras guias",
                      onClick: $event => (closeTabs())
                    }, [(_openBlock(), _createElementBlock("svg", {
                      class: "ui-icon",
                      "aria-hidden": "true"
                    }, [_createElementVNode("use", { href: "/ui-icons.svg#close-tabs" })]))], 8, ["onClick"]))
                  : _createCommentVNode("", true)]))
              : _createCommentVNode("", true),
            _createElementVNode("main", {
              id: "family-content",
              class: "family-content"
            }, [_createElementVNode("div", {
              id: "family-view",
              role: "tabpanel",
              "aria-labelledby": s.tabs.length?'family-tab-'+s.section:'family-title'
            }, [
              _createElementVNode("div", { class: "family-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "family-breadcrumb" }, _toDisplayString(portalName()) + " / " + _toDisplayString(title()), 1), _createElementVNode("h1", {
                id: "family-title",
                tabindex: "-1"
              }, _toDisplayString(title()), 1)]), _createElementVNode("button", {
                class: "btn btn-secondary",
                type: "button",
                onClick: refreshWorkspace,
                disabled: s.busy
              }, _toDisplayString(s.busy?'Atualizando…':'Atualizar'), 9, ["onClick", "disabled"])]),
              (s.error)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "alert error",
                    role: "alert"
                  }, _toDisplayString(s.error), 1))
                : _createCommentVNode("", true),
              (s.busy)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 1,
                    class: "loading-strip",
                    role: "status"
                  }, "Atualizando os dados do portal…"))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "family-context" }, [(s.account.school_ids.length>1)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "field"
                  }, [_createElementVNode("label", { for: "family-school" }, "Instituição"), _createElementVNode("select", {
                    id: "family-school",
                    value: s.schoolId,
                    onChange: selectSchool,
                    disabled: s.busy
                  }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.account.school_ids, (id) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: id,
                      value: id
                    }, _toDisplayString(s.schools[id]||id), 9, ["value"]))
                  }), 128))], 40, ["value", "onChange", "disabled"])]))
                : _createCommentVNode("", true), (s.section!=='webmail' && s.students.length && (!studentView() || s.students.length>1))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 1,
                    class: "field"
                  }, [_createElementVNode("label", { for: "family-student" }, _toDisplayString(studentView()?'Aluno':'Você está acompanhando'), 1), _createElementVNode("select", {
                    id: "family-student",
                    value: s.studentId,
                    onChange: selectStudent,
                    disabled: s.busy
                  }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.students, (item) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: item.id,
                      value: item.id
                    }, _toDisplayString(item.name), 9, ["value"]))
                  }), 128))], 40, ["value", "onChange", "disabled"])]))
                : _createCommentVNode("", true)]),
              (isOpen('webmail') && mail.state.available)
                ? _withDirectives((_openBlock(), _createBlock(_component_portal_mail, {
                    key: s.schoolId+':'+s.studentId,
                    "school-id": s.schoolId,
                    request: mail.request
                  }, null, 8, ["school-id", "request"])), [[_vShow, s.section==='webmail']])
                : _createCommentVNode("", true),
              (s.contextError && s.section!=='webmail')
                ? (_openBlock(), _createElementBlock("section", {
                    key: 3,
                    class: "panel family-empty"
                  }, [_createElementVNode("h2", null, "Não foi possível carregar seu vínculo"), _createElementVNode("p", null, "Confira a instituição selecionada e tente atualizar. Se o problema continuar, procure a secretaria.")]))
                : (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [
                    (s.section==='overview')
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 0,
                          class: "family-overview"
                        }, [
                          _createElementVNode("section", { class: "family-welcome" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Olá, " + _toDisplayString(s.account.name.split(' ')[0]) + ".", 1), (activeEnrollments().length)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 0,
                                class: "family-class-summary"
                              }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeEnrollments(), (item) => {
                                return (_openBlock(), _createElementBlock("span", { key: item.id }, _toDisplayString(item.class_name) + " · " + _toDisplayString(item.year_name), 1))
                              }), 128))]))
                            : (student())
                              ? (_openBlock(), _createElementBlock("p", {
                                  key: 1,
                                  class: "muted"
                                }, _toDisplayString(studentView()?'Nenhuma matrícula ativa no momento.':'O aluno selecionado está sem matrícula ativa.'), 1))
                              : _createCommentVNode("", true)]), (student())
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 0,
                                class: "actions"
                              }, [_createElementVNode("button", {
                                class: "btn btn-primary",
                                onClick: $event => (section('academic'))
                              }, "Consultar boletim", 8, ["onClick"]), _createElementVNode("button", {
                                class: "btn btn-secondary",
                                onClick: $event => (section('materials'))
                              }, "Ver atividades", 8, ["onClick"])]))
                            : _createCommentVNode("", true)]),
                          (student())
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 0,
                                class: "family-stats"
                              }, [
                                (!studentView())
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 0,
                                      class: "family-stat",
                                      onClick: $event => (section('students'))
                                    }, [
                                      _createElementVNode("span", null, "Alunos vinculados"),
                                      (_openBlock(), _createElementBlock("svg", {
                                        class: "ui-icon",
                                        "aria-hidden": "true"
                                      }, [_createElementVNode("use", { href: "/ui-icons.svg#students" })])),
                                      _createElementVNode("strong", null, _toDisplayString(s.students.length), 1),
                                      _createElementVNode("small", null, "Ver cadastros escolares")
                                    ], 8, ["onClick"]))
                                  : _createCommentVNode("", true),
                                _createElementVNode("button", {
                                  class: "family-stat",
                                  onClick: $event => (section('academic'))
                                }, [
                                  _createElementVNode("span", null, "Matrículas ativas"),
                                  (_openBlock(), _createElementBlock("svg", {
                                    class: "ui-icon",
                                    "aria-hidden": "true"
                                  }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])),
                                  _createElementVNode("strong", null, _toDisplayString(activeEnrollments().length), 1),
                                  _createElementVNode("small", null, "Consultar vida escolar")
                                ], 8, ["onClick"]),
                                _createElementVNode("button", {
                                  class: "family-stat",
                                  onClick: $event => (section('documents'))
                                }, [
                                  _createElementVNode("span", null, "Documentos pendentes"),
                                  (_openBlock(), _createElementBlock("svg", {
                                    class: "ui-icon",
                                    "aria-hidden": "true"
                                  }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])),
                                  _createElementVNode("strong", null, _toDisplayString(student().document_pendencies ? pendingDocuments().length : '—'), 1),
                                  _createElementVNode("small", null, "Conferir documentação")
                                ], 8, ["onClick"]),
                                (student().financial_authorized)
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 1,
                                      class: "family-stat",
                                      onClick: $event => (section('finance'))
                                    }, [
                                      _createElementVNode("span", null, "Financeiro"),
                                      (_openBlock(), _createElementBlock("svg", {
                                        class: "ui-icon",
                                        "aria-hidden": "true"
                                      }, [_createElementVNode("use", { href: "/ui-icons.svg#billing" })])),
                                      _createElementVNode("strong", { class: "family-stat-word" }, _toDisplayString(s.financeError?'Indisponível':!s.financeLoaded?'Carregando':s.financeOverdue?s.financeOverdue+' vencida(s)':'Sem vencidas'), 1),
                                      _createElementVNode("small", null, "Consultar cobranças")
                                    ], 8, ["onClick"]))
                                  : _createCommentVNode("", true)
                              ]))
                            : _createCommentVNode("", true),
                          (student() && student().academic_authorized!==false)
                            ? (_openBlock(), _createElementBlock("section", {
                                key: 1,
                                class: "panel",
                                "aria-labelledby": "family-recent-materials"
                              }, [_createElementVNode("header", { class: "family-panel-heading" }, [_createElementVNode("h2", { id: "family-recent-materials" }, "Atividades recentes"), _createElementVNode("button", {
                                class: "link-button",
                                onClick: $event => (section('materials'))
                              }, "Ver todas as atividades →", 8, ["onClick"])]), (recentMaterials.loading)
                                ? (_openBlock(), _createElementBlock("p", {
                                    key: 0,
                                    role: "status",
                                    class: "family-empty"
                                  }, "Carregando atividades…"))
                                : (recentMaterials.error)
                                  ? (_openBlock(), _createElementBlock("div", {
                                      key: 1,
                                      class: "family-empty"
                                    }, [_createElementVNode("p", { role: "alert" }, _toDisplayString(recentMaterials.error), 1), _createElementVNode("button", {
                                      class: "btn btn-secondary",
                                      onClick: loadRecentMaterials
                                    }, "Tentar novamente", 8, ["onClick"])]))
                                  : (!recentMaterials.items.length)
                                    ? (_openBlock(), _createElementBlock("p", {
                                        key: 2,
                                        class: "family-empty"
                                      }, "Nenhuma atividade publicada para este aluno ou sua turma."))
                                    : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(recentMaterials.items, (item) => {
                                return (_openBlock(), _createElementBlock("article", {
                                  key: item.id,
                                  class: "family-post"
                                }, [(_openBlock(), _createElementBlock("svg", {
                                  class: "ui-icon",
                                  "aria-hidden": "true"
                                }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createElementVNode("div", null, [_createElementVNode("button", {
                                  class: "family-post-title",
                                  onClick: $event => (section('materials',item.id))
                                }, _toDisplayString(item.title), 9, ["onClick"]), _createElementVNode("p", null, [_createTextVNode(_toDisplayString(item.kind) + " · ", 1), _createElementVNode("time", { datetime: item.created_at }, _toDisplayString(date(item.created_at)), 9, ["datetime"])])])]))
                              }), 128))]))
                            : _createCommentVNode("", true),
                          (s.overviewFeedError)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 2,
                                role: "alert",
                                class: "alert error"
                              }, _toDisplayString(s.overviewFeedError), 1))
                            : _createCommentVNode("", true),
                          _createElementVNode("div", { class: "family-dashboard-grid" }, [_createElementVNode("section", { class: "panel" }, [_createElementVNode("div", { class: "family-panel-heading" }, [_createElementVNode("h2", null, "Comunicados da escola"), _createElementVNode("button", {
                            class: "link-button",
                            onClick: $event => (section('news'))
                          }, "Ver todos →", 8, ["onClick"])]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.news, (post) => {
                            return (_openBlock(), _createElementBlock("article", {
                              key: post.id,
                              class: "family-post"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#bell" })])), _createElementVNode("div", null, [_createElementVNode("button", {
                              class: "family-post-title",
                              onClick: $event => (openPost(post))
                            }, _toDisplayString(post.title), 9, ["onClick"]), _createElementVNode("p", null, _toDisplayString(post.summary), 1), _createElementVNode("small", null, _toDisplayString(date(post.publish_at)), 1)])]))
                          }), 128)), (!s.news.length&&!s.overviewFeedError)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 0,
                                class: "family-empty"
                              }, "Nenhum comunicado publicado para seu acesso."))
                            : _createCommentVNode("", true)]), _createElementVNode("section", { class: "panel" }, [
                            _createElementVNode("div", { class: "family-panel-heading" }, [_createElementVNode("h2", null, "Acompanhamento escolar")]),
                            _createElementVNode("div", { class: "family-attention" }, [_createElementVNode("h3", null, "Secretaria"), _createElementVNode("button", {
                              class: "link-button",
                              onClick: $event => (section('support'))
                            }, "Falar com a escola →", 8, ["onClick"])]),
                            (student())
                              ? (_openBlock(), _createElementBlock("div", {
                                  key: 0,
                                  class: "family-attention"
                                }, [_createElementVNode("h3", null, "Documentação escolar"), _createElementVNode("p", null, _toDisplayString(!student()?'Nenhum aluno vinculado.':!student().document_pendencies?'Consulta de pendências indisponível.':pendingDocuments().length?pendingDocuments().length+' documento(s) precisam de atenção.':'Nenhuma pendência documental registrada.'), 1), _createElementVNode("button", {
                                  class: "link-button",
                                  onClick: $event => (section('documents'))
                                }, "Consultar documentos →", 8, ["onClick"])]))
                              : _createCommentVNode("", true),
                            (student()?.financial_authorized)
                              ? (_openBlock(), _createElementBlock("div", {
                                  key: 1,
                                  class: "family-attention"
                                }, [_createElementVNode("h3", null, "Mensalidades"), _createElementVNode("p", null, _toDisplayString(s.financeError?'Não foi possível consultar as cobranças.':!s.financeLoaded?'Carregando cobranças…':s.financeOverdue?s.financeOverdue+' cobrança(s) marcada(s) como vencida(s).':'Nenhuma cobrança marcada como vencida.'), 1), _createElementVNode("button", {
                                  class: "link-button",
                                  onClick: $event => (section('finance'))
                                }, "Consultar financeiro →", 8, ["onClick"])]))
                              : _createCommentVNode("", true)
                          ])]),
                          _createElementVNode("section", { class: "panel" }, [_createElementVNode("div", { class: "family-panel-heading" }, [_createElementVNode("h2", null, "Próximos compromissos"), _createElementVNode("button", {
                            class: "link-button",
                            onClick: $event => (section('agenda'))
                          }, "Ver agenda →", 8, ["onClick"])]), _createElementVNode("div", { class: "family-events" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.events, (post) => {
                            return (_openBlock(), _createElementBlock("article", {
                              key: post.id,
                              class: "family-post"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#clock" })])), _createElementVNode("div", null, [_createElementVNode("button", {
                              class: "family-post-title",
                              onClick: $event => (openPost(post))
                            }, _toDisplayString(post.title), 9, ["onClick"]), _createElementVNode("p", null, _toDisplayString(date(post.event_start)), 1), (post.location)
                              ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(post.location), 1))
                              : _createCommentVNode("", true)])]))
                          }), 128))]), (!s.events.length&&!s.overviewFeedError)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 0,
                                class: "family-empty"
                              }, "Nenhum próximo compromisso publicado."))
                            : _createCommentVNode("", true)])
                        ]))
                      : _createCommentVNode("", true),
                    (s.section==='students')
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 1,
                          class: "family-student-cards"
                        }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.students, (item) => {
                          return (_openBlock(), _createElementBlock("article", {
                            key: item.id,
                            class: "panel family-student-card"
                          }, [
                            _createElementVNode("span", {
                              class: "family-avatar",
                              "aria-hidden": "true"
                            }, _toDisplayString(initials(item.name)), 1),
                            _createElementVNode("h2", null, _toDisplayString(item.name), 1),
                            _createElementVNode("p", { class: "muted" }, "Código " + _toDisplayString(item.number), 1),
                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(item.enrollments, (enrollment) => {
                              return (_openBlock(), _createElementBlock("p", { key: enrollment.id }, _toDisplayString(enrollment.class_name) + " · " + _toDisplayString(enrollment.year_name) + " · " + _toDisplayString(label(enrollment.status)), 1))
                            }), 128)),
                            (!item.enrollments.length)
                              ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Nenhuma matrícula disponível."))
                              : _createCommentVNode("", true),
                            _createElementVNode("button", {
                              class: "btn btn-primary",
                              onClick: $event => (chooseStudent(item.id)),
                              disabled: s.busy
                            }, _toDisplayString(studentView()?'Ver minha vida escolar':'Acompanhar aluno') + " →", 9, ["onClick", "disabled"])
                          ]))
                        }), 128))]))
                      : _createCommentVNode("", true),
                    (!s.students.length&&['overview','students','academic','documents','finance','materials','absences'].includes(s.section))
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 2,
                          class: "panel family-empty"
                        }, [_createElementVNode("h2", null, "Nenhum aluno disponível"), _createElementVNode("p", null, "A escola precisa vincular seu cadastro ao aluno e autorizar seu perfil. Um vínculo inativo não permite consultas.")]))
                      : _createCommentVNode("", true),
                    (student())
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                          (s.section==='materials')
                            ? (_openBlock(), _createElementBlock("section", {
                                key: 0,
                                class: "panel family-detail-panel"
                              }, [_createElementVNode("h2", null, "Materiais de " + _toDisplayString(student().name), 1), (schoolwork.materialNotice)
                                ? (_openBlock(), _createElementBlock("p", {
                                    key: 0,
                                    class: "alert",
                                    role: "status"
                                  }, _toDisplayString(schoolwork.materialNotice), 1))
                                : _createCommentVNode("", true), (schoolwork.loading)
                                ? (_openBlock(), _createElementBlock("p", {
                                    key: 1,
                                    role: "status"
                                  }, "Carregando atividades…"))
                                : (schoolwork.error)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 2,
                                      class: "alert error",
                                      role: "alert"
                                    }, [_createTextVNode(_toDisplayString(schoolwork.error) + " ", 1), _createElementVNode("button", {
                                      type: "button",
                                      class: "link-button",
                                      onClick: loadSchoolwork
                                    }, "Tentar novamente", 8, ["onClick"])]))
                                  : (!schoolwork.materials.length)
                                    ? (_openBlock(), _createElementBlock("p", { key: 3 }, "Nenhuma atividade publicada para este aluno ou sua turma."))
                                    : (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [_createElementVNode("label", { class: "field family-material-search" }, [_createTextVNode("Buscar atividade"), _withDirectives(_createElementVNode("input", {
                                        type: "search",
                                        "onUpdate:modelValue": $event => ((schoolwork.filter) = $event),
                                        placeholder: "Título ou conteúdo"
                                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, schoolwork.filter]])]), (!visibleMaterials().length)
                                        ? (_openBlock(), _createElementBlock("p", {
                                            key: 0,
                                            role: "status"
                                          }, "Nenhuma atividade corresponde à busca."))
                                        : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(visibleMaterials(), (item) => {
                                        return (_openBlock(), _createElementBlock("article", {
                                          key: item.id,
                                          class: "family-detail-panel"
                                        }, [
                                          _createElementVNode("small", null, _toDisplayString(item.kind) + " · " + _toDisplayString(item.enrollment_id?'Individual':'Toda a turma'), 1),
                                          _createElementVNode("h3", {
                                            id: 'material-'+item.id,
                                            tabindex: "-1"
                                          }, _toDisplayString(item.title), 9, ["id"]),
                                          _createElementVNode("p", { class: "preserve" }, _toDisplayString(item.body), 1),
                                          _createElementVNode("button", {
                                            class: "btn btn-secondary",
                                            onClick: $event => (run(()=>download('/family/students/'+s.studentId+'/materials/'+item.id+'/print.pdf','material-escolar.pdf')))
                                          }, "Baixar para imprimir", 8, ["onClick"])
                                        ]))
                                      }), 128))], 64))]))
                            : _createCommentVNode("", true),
                          (isOpen('absences') && s.account.role==='guardian')
                            ? _withDirectives((_openBlock(), _createElementBlock("section", {
                                key: 'absence-'+s.studentId,
                                class: "panel family-detail-panel"
                              }, [
                                _createElementVNode("h2", null, "Justificar ausência de " + _toDisplayString(student().name), 1),
                                _createElementVNode("form", {
                                  class: "x-form",
                                  onSubmit: _withModifiers(submitAbsence, ["prevent"])
                                }, [_createElementVNode("fieldset", {
                                  class: "portal-fieldset",
                                  disabled: s.busy
                                }, [
                                  _createElementVNode("label", null, [_createTextVNode("Data da ausência"), _withDirectives(_createElementVNode("input", {
                                    type: "date",
                                    "onUpdate:modelValue": $event => ((schoolwork.day) = $event),
                                    required: ""
                                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, schoolwork.day]])]),
                                  _createElementVNode("label", null, [_createTextVNode("Motivo"), _withDirectives(_createElementVNode("textarea", {
                                    rows: "3",
                                    "onUpdate:modelValue": $event => ((schoolwork.reason) = $event),
                                    required: "",
                                    minlength: "2",
                                    maxlength: "2000"
                                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, schoolwork.reason]])]),
                                  _createElementVNode("label", null, [_createTextVNode("Atestado ou comprovante (opcional)"), (_openBlock(), _createElementBlock("input", {
                                    type: "file",
                                    key: schoolwork.fileVersion,
                                    accept: ".pdf,.png,.jpg,.jpeg",
                                    onChange: pickEvidence
                                  }, null, 40, ["onChange"]))]),
                                  _createElementVNode("p", { class: "muted" }, "Se o órgão emissor oferecer assinatura digital, QR Code ou código de verificação, prefira o documento original. A autenticação é opcional. Você também pode entregar o comprovante na Secretaria."),
                                  _createElementVNode("button", { class: "btn btn-primary" }, "Enviar à Secretaria")
                                ], 8, ["disabled"])], 40, ["onSubmit"]),
                                (schoolwork.receipt)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 0,
                                      class: "alert success",
                                      role: "status"
                                    }, "Recebido pela Secretaria. Protocolo " + _toDisplayString(schoolwork.receipt) + ".", 1))
                                  : _createCommentVNode("", true),
                                _createElementVNode("h3", null, "Meus protocolos"),
                                (schoolwork.loading)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 1,
                                      role: "status"
                                    }, "Carregando protocolos…"))
                                  : (schoolwork.error)
                                    ? (_openBlock(), _createElementBlock("p", {
                                        key: 2,
                                        class: "alert error",
                                        role: "alert"
                                      }, [_createTextVNode(_toDisplayString(schoolwork.error) + " ", 1), _createElementVNode("button", {
                                        type: "button",
                                        class: "link-button",
                                        onClick: loadSchoolwork
                                      }, "Tentar novamente", 8, ["onClick"])]))
                                    : (!schoolwork.absences.length)
                                      ? (_openBlock(), _createElementBlock("p", { key: 3 }, "Nenhuma justificativa enviada por você para este aluno."))
                                      : (_openBlock(true), _createElementBlock(_Fragment, { key: 4 }, _renderList(schoolwork.absences, (item) => {
                                          return (_openBlock(), _createElementBlock("article", {
                                            class: "family-line",
                                            key: item.number
                                          }, [_createElementVNode("strong", null, _toDisplayString(item.number), 1), _createElementVNode("span", null, _toDisplayString(date(item.absence_date)) + " · " + _toDisplayString(label(item.status)), 1)]))
                                        }), 128))
                              ])), [[_vShow, s.section==='absences']])
                            : _createCommentVNode("", true),
                          (isOpen('academic'))
                            ? _withDirectives((_openBlock(), _createElementBlock("section", { key: 2 }, [(_openBlock(), _createBlock(_component_learning_portal, {
                                identity: identity,
                                key: s.schoolId+':'+s.studentId,
                                request: request,
                                download: download,
                                "school-id": s.schoolId,
                                "student-id": s.studentId
                              }, null, 8, ["identity", "request", "download", "school-id", "student-id"]))], 512)), [[_vShow, s.section==='academic']])
                            : _createCommentVNode("", true),
                          (s.section==='documents')
                            ? (_openBlock(), _createElementBlock("section", {
                                key: 3,
                                class: "panel family-detail-panel"
                              }, [
                                _createElementVNode("h2", null, "Documentos de " + _toDisplayString(student().name), 1),
                                _createElementVNode("p", { class: "muted" }, "Anexos da inscrição são enviados em Inscrição e contratos."),
                                _createElementVNode("h3", null, "Pendências atuais"),
                                (!student().document_pendencies)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 0,
                                      role: "status"
                                    }, "Consulta de pendências indisponível. Atualize o portal ou consulte a Secretaria."))
                                  : (!pendingDocuments().length)
                                    ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Nenhuma pendência documental registrada."))
                                    : _createCommentVNode("", true),
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(pendingDocuments(), (item) => {
                                  return (_openBlock(), _createElementBlock("article", {
                                    key: item.document_type_id,
                                    class: "family-line"
                                  }, [_createElementVNode("strong", null, _toDisplayString(item.name), 1), _createElementVNode("span", null, _toDisplayString(item.status==='received'?'Aguardando análise da escola':label(item.status)), 1)]))
                                }), 128)),
                                _createElementVNode("h3", null, "Histórico de documentos"),
                                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student().documents, (file) => {
                                  return (_openBlock(), _createElementBlock("article", {
                                    key: file.id,
                                    class: "family-line"
                                  }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(file.type_name), 1), _createElementVNode("p", null, _toDisplayString(label(file.status)), 1)]), (file.file_id)
                                    ? (_openBlock(), _createElementBlock("button", {
                                        key: 0,
                                        class: "btn btn-secondary",
                                        onClick: $event => (document(file)),
                                        disabled: s.busy
                                      }, "Baixar documento", 8, ["onClick", "disabled"]))
                                    : _createCommentVNode("", true)]))
                                }), 128)),
                                (!student().documents.length)
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 2,
                                      class: "family-empty"
                                    }, "Nenhum documento disponível."))
                                  : _createCommentVNode("", true)
                              ]))
                            : _createCommentVNode("", true),
                          (isOpen('finance'))
                            ? _withDirectives((_openBlock(), _createElementBlock("section", {
                                key: 4,
                                class: "panel family-detail-panel"
                              }, [_createElementVNode("h2", null, "Financeiro de " + _toDisplayString(student().name), 1), (!student().financial_authorized)
                                ? (_openBlock(), _createElementBlock("p", {
                                    key: 0,
                                    class: "family-empty"
                                  }, "Seu vínculo não autoriza a consulta financeira. Procure a escola se precisar revisar esta permissão."))
                                : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                    (s.financeError)
                                      ? (_openBlock(), _createElementBlock("p", {
                                          key: 0,
                                          class: "alert error",
                                          role: "alert"
                                        }, [_createTextVNode(_toDisplayString(s.financeError) + " ", 1), _createElementVNode("button", {
                                          type: "button",
                                          class: "link-button",
                                          onClick: $event => (run(()=>finance(s.financePage)))
                                        }, "Tentar novamente", 8, ["onClick"])]))
                                      : (!s.financeLoaded)
                                        ? (_openBlock(), _createElementBlock("p", {
                                            key: 1,
                                            role: "status"
                                          }, "Carregando cobranças…"))
                                        : _createCommentVNode("", true),
                                    (s.financeNote)
                                      ? (_openBlock(), _createElementBlock("p", {
                                          key: 2,
                                          class: "muted"
                                        }, _toDisplayString(s.financeNote), 1))
                                      : _createCommentVNode("", true),
                                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.charges, (charge) => {
                                      return (_openBlock(), _createElementBlock("article", {
                                        key: charge.id,
                                        class: "family-charge"
                                      }, [
                                        _createElementVNode("header", { class: "family-charge-header" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, _toDisplayString(charge.description), 1), _createElementVNode("p", null, "Vencimento em " + _toDisplayString(date(charge.due_on)) + " · " + _toDisplayString(chargeStatus(charge)), 1), (paymentKinds[charge.billing_type] || paymentSources[charge.payment_source])
                                          ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString([paymentKinds[charge.billing_type],paymentSources[charge.payment_source]].filter(Boolean).join(' · ')), 1))
                                          : _createCommentVNode("", true)]), _createElementVNode("strong", null, _toDisplayString(money(charge.amount)), 1)]),
                                        (charge.has_payment_documents)
                                          ? (_openBlock(), _createElementBlock("button", {
                                              key: 0,
                                              type: "button",
                                              class: "btn btn-secondary",
                                              "aria-expanded": documentsPanel.chargeId===charge.id,
                                              "aria-controls": documentsPanel.chargeId===charge.id?'charge-documents-'+charge.id:undefined,
                                              onClick: $event => (showChargeDocuments(charge))
                                            }, _toDisplayString(documentsPanel.chargeId===charge.id?'Fechar documentos da cobrança':'Consultar documentos da cobrança'), 9, ["aria-expanded", "aria-controls", "onClick"]))
                                          : _createCommentVNode("", true),
                                        (documentsPanel.chargeId===charge.id)
                                          ? (_openBlock(), _createElementBlock("section", {
                                              key: 1,
                                              id: 'charge-documents-'+charge.id,
                                              class: "family-charge-documents",
                                              "aria-label": 'Documentos de '+charge.description
                                            }, [(documentsPanel.loading)
                                              ? (_openBlock(), _createElementBlock("p", {
                                                  key: 0,
                                                  role: "status"
                                                }, "Consultando documentos…"))
                                              : (documentsPanel.error)
                                                ? (_openBlock(), _createElementBlock("p", {
                                                    key: 1,
                                                    class: "alert error",
                                                    role: "alert"
                                                  }, [_createTextVNode(_toDisplayString(documentsPanel.error) + " ", 1), _createElementVNode("button", {
                                                    type: "button",
                                                    class: "link-button",
                                                    onClick: $event => (showChargeDocuments(charge,true))
                                                  }, "Tentar novamente", 8, ["onClick"])]))
                                                : (documentsPanel.data)
                                                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                                                      (documentsPanel.data.invoice_url||documentsPanel.data.bank_slip_url)
                                                        ? (_openBlock(), _createElementBlock("div", {
                                                            key: 0,
                                                            class: "actions"
                                                          }, [(documentsPanel.data.invoice_url)
                                                            ? (_openBlock(), _createElementBlock("a", {
                                                                key: 0,
                                                                class: "btn btn-secondary",
                                                                href: documentsPanel.data.invoice_url,
                                                                target: "_blank",
                                                                rel: "noopener noreferrer"
                                                              }, "Abrir fatura ↗", 8, ["href"]))
                                                            : _createCommentVNode("", true), (documentsPanel.data.bank_slip_url)
                                                            ? (_openBlock(), _createElementBlock("a", {
                                                                key: 1,
                                                                class: "btn btn-secondary",
                                                                href: documentsPanel.data.bank_slip_url,
                                                                target: "_blank",
                                                                rel: "noopener noreferrer"
                                                              }, "Abrir boleto ↗", 8, ["href"]))
                                                            : _createCommentVNode("", true)]))
                                                        : _createCommentVNode("", true),
                                                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList([{key:'pix_copy_paste',label:'Pix copia e cola'},{key:'identification_field',label:'Linha digitável'},{key:'bar_code',label:'Código de barras'}], (field) => {
                                                        return (_openBlock(), _createElementBlock(_Fragment, { key: field.key }, [(documentsPanel.data[field.key])
                                                          ? (_openBlock(), _createElementBlock("div", {
                                                              key: 0,
                                                              class: "family-charge-code"
                                                            }, [_createElementVNode("label", { for: field.key+'-'+charge.id }, _toDisplayString(field.label), 9, ["for"]), _createElementVNode("input", {
                                                              id: field.key+'-'+charge.id,
                                                              value: documentsPanel.data[field.key],
                                                              readonly: "",
                                                              autocomplete: "off",
                                                              spellcheck: "false"
                                                            }, null, 8, ["id", "value"]), _createElementVNode("button", {
                                                              type: "button",
                                                              class: "btn btn-secondary",
                                                              onClick: $event => (copyChargeCode(field.key+'-'+charge.id)),
                                                              "aria-label": 'Copiar '+field.label
                                                            }, "Copiar", 8, ["onClick", "aria-label"])]))
                                                          : _createCommentVNode("", true)], 64))
                                                      }), 128)),
                                                      (documentsPanel.data.pix_copy_paste&&documentsPanel.data.pix_expires_at)
                                                        ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Validade do Pix: " + _toDisplayString(date(documentsPanel.data.pix_expires_at)), 1))
                                                        : _createCommentVNode("", true),
                                                      (!documentsPanel.data.invoice_url&&!documentsPanel.data.bank_slip_url&&!documentsPanel.data.pix_copy_paste&&!documentsPanel.data.identification_field&&!documentsPanel.data.bar_code)
                                                        ? (_openBlock(), _createElementBlock("p", { key: 2 }, "Nenhum documento disponível para esta cobrança no momento."))
                                                        : _createCommentVNode("", true),
                                                      (documentsPanel.notice)
                                                        ? (_openBlock(), _createElementBlock("p", {
                                                            key: 3,
                                                            role: "status"
                                                          }, _toDisplayString(documentsPanel.notice), 1))
                                                        : _createCommentVNode("", true)
                                                    ], 64))
                                                  : _createCommentVNode("", true)], 8, ["id", "aria-label"]))
                                          : _createCommentVNode("", true),
                                        (charge.payment_source!=='crm')
                                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [(charge.collection_mode==='provider' && charge.billing_type==='PIX')
                                              ? (_openBlock(), _createElementBlock("div", {
                                                  key: 0,
                                                  class: "x-form"
                                                }, [_createElementVNode("button", {
                                                  type: "button",
                                                  class: "btn btn-secondary",
                                                  "aria-expanded": autoPix.state.id===charge.id,
                                                  onClick: $event => (autoPix.open(charge.id))
                                                }, "Pix Automático", 8, ["aria-expanded", "onClick"]), (autoPix.state.id===charge.id)
                                                  ? (_openBlock(), _createElementBlock("div", {
                                                      key: 0,
                                                      class: "x-form",
                                                      "aria-live": "polite"
                                                    }, [(autoPix.state.busy)
                                                      ? (_openBlock(), _createElementBlock("p", {
                                                          key: 0,
                                                          role: "status"
                                                        }, "Consultando a cobrança…"))
                                                      : _createCommentVNode("", true), (autoPix.state.error)
                                                      ? (_openBlock(), _createElementBlock("div", {
                                                          key: 1,
                                                          role: "alert"
                                                        }, [_createElementVNode("p", null, _toDisplayString(autoPix.state.error), 1), _createElementVNode("button", {
                                                          type: "button",
                                                          class: "btn btn-secondary",
                                                          disabled: autoPix.state.busy,
                                                          onClick: autoPix.reload
                                                        }, "Consultar novamente", 8, ["disabled", "onClick"])]))
                                                      : _createCommentVNode("", true), (autoPix.state.view)
                                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [(autoPix.state.view.can_enroll)
                                                          ? (_openBlock(), _createElementBlock("form", {
                                                              key: 0,
                                                              onSubmit: _withModifiers(autoPix.enroll, ["prevent"])
                                                            }, [
                                                              _createElementVNode("p", null, [_createTextVNode("Primeiro pagamento de "), _createElementVNode("strong", null, _toDisplayString(autoPix.money(autoPix.state.view.amount)), 1)]),
                                                              _createElementVNode("label", null, [_createTextVNode("Frequência dos próximos débitos"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((autoPix.state.frequency) = $event) }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(autoPix.frequencies, (label, code) => {
                                                                return (_openBlock(), _createElementBlock("option", {
                                                                  key: code,
                                                                  value: code
                                                                }, _toDisplayString(label), 9, ["value"]))
                                                              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, autoPix.state.frequency]])]),
                                                              _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                                                type: "checkbox",
                                                                "onUpdate:modelValue": $event => ((autoPix.state.accepted) = $event)
                                                              }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, autoPix.state.accepted]]), _createTextVNode(" " + _toDisplayString(autoPix.state.view.terms), 1)]),
                                                              _createElementVNode("button", {
                                                                type: "submit",
                                                                class: "btn btn-primary",
                                                                disabled: !autoPix.state.accepted || autoPix.state.busy
                                                              }, "Gerar QR de adesão", 8, ["disabled"])
                                                            ], 40, ["onSubmit"]))
                                                          : _createCommentVNode("", true), (autoPix.state.view.authorization)
                                                          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                                              _createElementVNode("p", null, [_createTextVNode("Autorização "), _createElementVNode("strong", null, _toDisplayString(autoPix.label(autoPix.state.view.authorization.status)), 1), _createTextVNode(" · " + _toDisplayString(autoPix.frequencies[autoPix.state.view.authorization.frequency]), 1)]),
                                                              (autoPix.state.view.authorization.payload)
                                                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [(autoPix.state.view.authorization.encoded_image)
                                                                    ? (_openBlock(), _createElementBlock("img", {
                                                                        key: 0,
                                                                        src: 'data:image/png;base64,'+autoPix.state.view.authorization.encoded_image,
                                                                        width: "160",
                                                                        height: "160",
                                                                        alt: "QR Pix da adesão"
                                                                      }, null, 8, ["src"]))
                                                                    : _createCommentVNode("", true), _createElementVNode("label", null, [_createTextVNode("Pix copia e cola"), _createElementVNode("textarea", {
                                                                    readonly: "",
                                                                    value: autoPix.state.view.authorization.payload,
                                                                    onFocus: $event => ($event.target.select())
                                                                  }, null, 40, ["value", "onFocus"])]), (autoPix.state.view.authorization.expires_at)
                                                                    ? (_openBlock(), _createElementBlock("p", { key: 1 }, "QR válido até " + _toDisplayString(new Date(autoPix.state.view.authorization.expires_at).toLocaleString('pt-BR')) + ".", 1))
                                                                    : _createCommentVNode("", true)], 64))
                                                                : _createCommentVNode("", true),
                                                              (autoPix.state.view.authorization.cycles.length)
                                                                ? (_openBlock(), _createElementBlock("ul", { key: 1 }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(autoPix.state.view.authorization.cycles, (c) => {
                                                                    return (_openBlock(), _createElementBlock("li", { key: c.id }, [_createTextVNode(_toDisplayString(c.due_on.split('-').reverse().join('/')) + " · " + _toDisplayString(autoPix.money(c.amount)) + " · " + _toDisplayString(autoPix.label(c.status)), 1), (c.instruction_status)
                                                                      ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · " + _toDisplayString(autoPix.label(c.instruction_status)), 1))
                                                                      : _createCommentVNode("", true)]))
                                                                  }), 128))]))
                                                                : _createCommentVNode("", true),
                                                              _createElementVNode("button", {
                                                                type: "button",
                                                                class: "btn btn-secondary",
                                                                disabled: autoPix.state.busy,
                                                                onClick: autoPix.refresh
                                                              }, "Atualizar situação", 8, ["disabled", "onClick"]),
                                                              (['CREATED','ACTIVE'].includes(autoPix.state.view.authorization.status))
                                                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [(!autoPix.state.confirmCancel)
                                                                    ? (_openBlock(), _createElementBlock("button", {
                                                                        key: 0,
                                                                        type: "button",
                                                                        class: "btn btn-secondary",
                                                                        onClick: $event => (autoPix.state.confirmCancel=true)
                                                                      }, "Cancelar autorização", 8, ["onClick"]))
                                                                    : (_openBlock(), _createElementBlock("div", { key: 1 }, [
                                                                        _createElementVNode("p", null, "Deseja interromper os próximos débitos? Os pagamentos já enviados dependem de confirmação bancária."),
                                                                        _createElementVNode("button", {
                                                                          type: "button",
                                                                          class: "btn btn-secondary",
                                                                          disabled: autoPix.state.busy,
                                                                          onClick: autoPix.cancel
                                                                        }, "Confirmar cancelamento", 8, ["disabled", "onClick"]),
                                                                        _createTextVNode(),
                                                                        _createElementVNode("button", {
                                                                          type: "button",
                                                                          class: "btn btn-secondary",
                                                                          onClick: $event => (autoPix.state.confirmCancel=false)
                                                                        }, "Voltar", 8, ["onClick"])
                                                                      ]))], 64))
                                                                : _createCommentVNode("", true)
                                                            ], 64))
                                                          : (!autoPix.state.view.can_enroll)
                                                            ? (_openBlock(), _createElementBlock("p", { key: 2 }, "Adesão indisponível para esta cobrança."))
                                                            : _createCommentVNode("", true)], 64))
                                                      : _createCommentVNode("", true)]))
                                                  : _createCommentVNode("", true)]))
                                              : _createCommentVNode("", true), (charge.has_card_checkout)
                                              ? (_openBlock(), _createElementBlock("div", {
                                                  key: 1,
                                                  class: "family-attention"
                                                }, [_createElementVNode("button", {
                                                  type: "button",
                                                  class: "link-button",
                                                  onClick: $event => (cards.load(charge.id))
                                                }, "Consultar cartão desta cobrança", 8, ["onClick"]), (cards.state.charge===charge.id)
                                                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [(cards.state.loading)
                                                      ? (_openBlock(), _createElementBlock("p", {
                                                          key: 0,
                                                          role: "status"
                                                        }, "Consultando cartão…"))
                                                      : _createCommentVNode("", true), (cards.state.error)
                                                      ? (_openBlock(), _createElementBlock("p", {
                                                          key: 1,
                                                          role: "alert"
                                                        }, _toDisplayString(cards.state.error), 1))
                                                      : _createCommentVNode("", true), (cards.state.view?.checkout)
                                                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                                                          _createElementVNode("p", null, "Valor no cartão " + _toDisplayString(money(String(cards.state.view.checkout.quote.charged_cents/100))), 1),
                                                          (cards.state.view.checkout.mode==='recurrent')
                                                            ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Assinatura hospedada no Asaas com início em " + _toDisplayString(date(cards.state.view.checkout.first_due)) + " e término em " + _toDisplayString(date(cards.state.view.checkout.ends_on)) + ".", 1))
                                                            : _createCommentVNode("", true),
                                                          (cards.link(cards.state.view.checkout.checkout_url))
                                                            ? (_openBlock(), _createElementBlock("a", {
                                                                key: 1,
                                                                href: cards.link(cards.state.view.checkout.checkout_url),
                                                                target: "_blank",
                                                                rel: "noopener noreferrer"
                                                              }, "Abrir checkout seguro do Asaas", 8, ["href"]))
                                                            : _createCommentVNode("", true),
                                                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(cards.state.view.checkout.payments, (payment) => {
                                                            return (_openBlock(), _createElementBlock("div", { key: payment.id }, [(payment.status==='RECEIVED')
                                                              ? (_openBlock(), _createElementBlock("button", {
                                                                  key: 0,
                                                                  type: "button",
                                                                  class: "link-button",
                                                                  onClick: $event => (run(()=>download('/family/students/'+s.studentId+'/charges/'+charge.id+'/cards/receipts/'+payment.id+'.pdf','comprovante-cartao.pdf')))
                                                                }, "Comprovante de " + _toDisplayString(money(String(payment.value))), 9, ["onClick"]))
                                                              : _createCommentVNode("", true)]))
                                                          }), 128)),
                                                          (cards.state.view.can_authorize)
                                                            ? (_openBlock(), _createElementBlock("form", {
                                                                key: 2,
                                                                onSubmit: _withModifiers($event => (cards.submit(false)), ["prevent"])
                                                              }, [
                                                                _createElementVNode("h3", null, "Autorizar cartão para próximas mensalidades"),
                                                                _createElementVNode("label", null, [_createTextVNode("Limite por título (R$)"), _withDirectives(_createElementVNode("input", {
                                                                  "onUpdate:modelValue": $event => ((cards.state.limit) = $event),
                                                                  type: "number",
                                                                  min: "0.01",
                                                                  step: "0.01",
                                                                  required: ""
                                                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, cards.state.limit]])]),
                                                                _createElementVNode("label", null, [_createTextVNode("Autorização válida até"), _withDirectives(_createElementVNode("input", {
                                                                  "onUpdate:modelValue": $event => ((cards.state.until) = $event),
                                                                  type: "date",
                                                                  required: ""
                                                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, cards.state.until]])]),
                                                                _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                                                  type: "checkbox",
                                                                  "onUpdate:modelValue": $event => ((cards.state.agreed) = $event),
                                                                  required: ""
                                                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, cards.state.agreed]]), _createTextVNode(_toDisplayString(cards.state.view.terms), 1)]),
                                                                _createElementVNode("button", {
                                                                  class: "btn",
                                                                  disabled: cards.state.loading||!cards.state.agreed
                                                                }, "Autorizar débitos por título", 8, ["disabled"])
                                                              ], 40, ["onSubmit"]))
                                                            : _createCommentVNode("", true),
                                                          (cards.state.view.authorization?.active)
                                                            ? (_openBlock(), _createElementBlock("div", { key: 3 }, [_createElementVNode("p", null, "Débitos autorizados até " + _toDisplayString(date(cards.state.view.authorization.ends_on)) + ", com limite por título de " + _toDisplayString(money(String(cards.state.view.authorization.limit_cents/100))) + ".", 1), _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                                                type: "checkbox",
                                                                "onUpdate:modelValue": $event => ((cards.state.revoke) = $event)
                                                              }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, cards.state.revoke]]), _createTextVNode("Quero revogar os débitos futuros")]), _createElementVNode("button", {
                                                                class: "btn",
                                                                onClick: $event => (cards.submit(true)),
                                                                disabled: cards.state.loading||!cards.state.revoke
                                                              }, "Revogar autorização", 8, ["onClick", "disabled"])]))
                                                            : _createCommentVNode("", true)
                                                        ], 64))
                                                      : _createCommentVNode("", true)], 64))
                                                  : _createCommentVNode("", true)]))
                                              : _createCommentVNode("", true)], 64))
                                          : _createCommentVNode("", true)
                                      ]))
                                    }), 128)),
                                    (s.financeLoaded&&!s.charges.length)
                                      ? (_openBlock(), _createElementBlock("p", {
                                          key: 3,
                                          class: "family-empty"
                                        }, "Nenhuma cobrança registrada para estas matrículas."))
                                      : _createCommentVNode("", true),
                                    (s.financeLoaded&&s.financeTotal>s.financePageSize)
                                      ? (_openBlock(), _createElementBlock("nav", {
                                          key: 4,
                                          "aria-label": "Páginas de cobranças"
                                        }, [
                                          _createElementVNode("button", {
                                            class: "link-button",
                                            disabled: s.busy||s.financePage===1,
                                            onClick: $event => (run(()=>finance(s.financePage-1)))
                                          }, "Anterior", 8, ["disabled", "onClick"]),
                                          _createTextVNode(),
                                          _createElementVNode("span", null, "Página " + _toDisplayString(s.financePage) + " de " + _toDisplayString(Math.ceil(s.financeTotal/s.financePageSize)), 1),
                                          _createTextVNode(),
                                          _createElementVNode("button", {
                                            class: "link-button",
                                            disabled: s.busy||s.financePage*s.financePageSize>=s.financeTotal,
                                            onClick: $event => (run(()=>finance(s.financePage+1)))
                                          }, "Próxima", 8, ["disabled", "onClick"])
                                        ]))
                                      : _createCommentVNode("", true)
                                  ], 64))], 512)), [[_vShow, s.section==='finance']])
                            : _createCommentVNode("", true)
                        ], 64))
                      : _createCommentVNode("", true),
                    (['news','agenda'].includes(s.section))
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 4,
                          class: "panel family-detail-panel"
                        }, [
                          _createElementVNode("h2", null, _toDisplayString(s.section==='agenda'?'Agenda da escola':'Comunicados da escola'), 1),
                          _createElementVNode("p", { class: "muted" }, "Publicações disponíveis para o seu perfil nesta instituição."),
                          _createElementVNode("form", {
                            class: "family-feed-search",
                            onSubmit: _withModifiers(searchFeed, ["prevent"])
                          }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Buscar " + _toDisplayString(s.section==='agenda'?'compromisso':'comunicado'), 1), _withDirectives(_createElementVNode("input", {
                            type: "search",
                            maxlength: "160",
                            "onUpdate:modelValue": $event => ((s.feedQuery) = $event)
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.feedQuery]])]), _createElementVNode("button", {
                            type: "submit",
                            class: "btn btn-secondary",
                            disabled: s.feedBusy
                          }, "Buscar", 8, ["disabled"])], 40, ["onSubmit"]),
                          (s.feedBusy)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 0,
                                role: "status"
                              }, "Carregando publicações…"))
                            : _createCommentVNode("", true),
                          (s.feedError)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 1,
                                class: "alert error",
                                role: "alert"
                              }, [_createTextVNode(_toDisplayString(s.feedError) + " ", 1), _createElementVNode("button", {
                                class: "link-button",
                                onClick: $event => (loadFeed(s.feedPage))
                              }, "Tentar novamente", 8, ["onClick"])]))
                            : _createCommentVNode("", true),
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.feedItems, (post) => {
                            return (_openBlock(), _createElementBlock("article", {
                              key: post.id,
                              class: "family-post"
                            }, [(_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: '/ui-icons.svg#'+(post.kind==='event'?'clock':'bell') }, null, 8, ["href"])])), _createElementVNode("div", null, [
                              _createElementVNode("button", {
                                class: "family-post-title",
                                onClick: $event => (openPost(post))
                              }, _toDisplayString(post.title), 9, ["onClick"]),
                              _createElementVNode("p", null, _toDisplayString(post.summary), 1),
                              _createElementVNode("small", null, _toDisplayString(date(post.kind==='event'?post.event_start:post.publish_at)) + _toDisplayString(post.location?' · '+post.location:''), 1),
                              _createElementVNode("button", {
                                class: "link-button family-read",
                                onClick: $event => (openPost(post))
                              }, "Ler publicação →", 8, ["onClick"])
                            ])]))
                          }), 128)),
                          (!s.feedBusy&&!s.feedError&&!s.feedItems.length)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 2,
                                class: "family-empty"
                              }, _toDisplayString(s.feedTerm?'Nenhuma publicação corresponde à busca.':'Nenhuma publicação disponível.'), 1))
                            : _createCommentVNode("", true),
                          (s.feedTotal>12)
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 3,
                                class: "family-pagination"
                              }, [_createElementVNode("button", {
                                class: "btn btn-secondary",
                                disabled: s.feedBusy||s.feedPage<=1,
                                onClick: $event => (loadFeed(s.feedPage-1))
                              }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("span", null, "Página " + _toDisplayString(s.feedPage), 1), _createElementVNode("button", {
                                class: "btn btn-secondary",
                                disabled: s.feedBusy||s.feedPage*12>=s.feedTotal,
                                onClick: $event => (loadFeed(s.feedPage+1))
                              }, "Próxima", 8, ["disabled", "onClick"])]))
                            : _createCommentVNode("", true)
                        ]))
                      : _createCommentVNode("", true),
                    (isOpen('support'))
                      ? _withDirectives((_openBlock(), _createElementBlock("div", {
                          key: 5,
                          id: "family-protocols"
                        }, [(_openBlock(), _createBlock(_component_portal_protocols, {
                          key: [s.account.id,s.schoolId,s.studentId,student()?.academic_authorized,student()?.financial_authorized].join(':'),
                          area: "family",
                          "school-id": s.schoolId,
                          "student-id": s.studentId,
                          academic: student()?.academic_authorized!==false,
                          financial: student()?.financial_authorized===true,
                          request: mail.request,
                          download: download
                        }, null, 8, ["school-id", "student-id", "academic", "financial", "request", "download"]))], 512)), [[_vShow, s.section==='support']])
                      : _createCommentVNode("", true),
                    (s.selectedPost)
                      ? (_openBlock(), _createElementBlock("section", {
                          key: 6,
                          id: "family-post-detail",
                          tabindex: "-1",
                          class: "panel family-detail-panel family-post-detail",
                          "aria-label": "Publicação selecionada"
                        }, [
                          _createElementVNode("div", { class: "family-panel-heading" }, [_createElementVNode("h2", null, _toDisplayString(s.selectedPost.title), 1), _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: closePost
                          }, "Fechar leitura", 8, ["onClick"])]),
                          _createElementVNode("p", { class: "muted" }, _toDisplayString(date(s.selectedPost.kind==='event'?s.selectedPost.event_start:s.selectedPost.publish_at)), 1),
                          (s.selectedPost.location)
                            ? (_openBlock(), _createElementBlock("p", { key: 0 }, _toDisplayString(s.selectedPost.location), 1))
                            : _createCommentVNode("", true),
                          (s.selectedPost.event_end)
                            ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Até " + _toDisplayString(date(s.selectedPost.event_end)), 1))
                            : _createCommentVNode("", true),
                          (s.selectedPost.summary)
                            ? (_openBlock(), _createElementBlock("p", { key: 2 }, [_createElementVNode("strong", null, _toDisplayString(s.selectedPost.summary), 1)]))
                            : _createCommentVNode("", true),
                          _createElementVNode("p", { class: "family-post-content" }, _toDisplayString(s.selectedPost.content), 1)
                        ]))
                      : _createCommentVNode("", true)
                  ], 64))
            ], 8, ["aria-labelledby"])]),
            _createElementVNode("footer", { class: "family-footer" }, [_createTextVNode(_toDisplayString(identity.display_name) + " · " + _toDisplayString(portalName()) + " ", 1), _createElementVNode("span", null, "Atendimento pela secretaria")])
          ], 8, ["inert"])], 2))], 8, ["aria-busy"]))
  }
},learning:function render(_ctx, _cache) {
  with (_ctx) {
    const { renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, vModelSelect: _vModelSelect, createElementVNode: _createElementVNode, withDirectives: _withDirectives, createTextVNode: _createTextVNode, createCommentVNode: _createCommentVNode, normalizeClass: _normalizeClass, normalizeStyle: _normalizeStyle } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "learning-workspace",
      "aria-label": "Boletim e frequência",
      "aria-busy": state.busy
    }, [
      _createElementVNode("div", { class: "bulletin-controls" }, [
        (!props.studentId && state.students.length>1)
          ? (_openBlock(), _createElementBlock("label", {
              key: 0,
              class: "field"
            }, [_createTextVNode("Aluno "), _withDirectives(_createElementVNode("select", {
              "onUpdate:modelValue": $event => ((state.studentId) = $event),
              onChange: selectStudent,
              disabled: state.busy
            }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.students, (item) => {
              return (_openBlock(), _createElementBlock("option", {
                key: item.student_id,
                value: item.student_id
              }, _toDisplayString(item.student_name), 9, ["value"]))
            }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, state.studentId]])]))
          : _createCommentVNode("", true),
        (student()?.enrollments.length>1)
          ? (_openBlock(), _createElementBlock("label", {
              key: 1,
              class: "field"
            }, [_createTextVNode("Matrícula "), _withDirectives(_createElementVNode("select", {
              "onUpdate:modelValue": $event => ((state.enrollmentId) = $event),
              onChange: $event => (state.groupId=''),
              disabled: state.busy
            }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student().enrollments, (item) => {
              return (_openBlock(), _createElementBlock("option", {
                key: item.enrollment_id,
                value: item.enrollment_id
              }, _toDisplayString(item.year_name) + " · " + _toDisplayString(item.class_name) + " · " + _toDisplayString(item.number), 9, ["value"]))
            }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, state.enrollmentId]])]))
          : _createCommentVNode("", true),
        (periodGroups.length>1)
          ? (_openBlock(), _createElementBlock("label", {
              key: 2,
              class: "field"
            }, [_createTextVNode("Período e turma "), _withDirectives(_createElementVNode("select", {
              "onUpdate:modelValue": $event => ((state.groupId) = $event),
              disabled: state.busy
            }, [_createElementVNode("option", { value: "" }, "Todos os períodos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodGroups, (group) => {
              return (_openBlock(), _createElementBlock("option", {
                key: group.id,
                value: group.id
              }, _toDisplayString(group.label) + " · " + _toDisplayString(group.className), 9, ["value"]))
            }), 128))], 8, ["onUpdate:modelValue", "disabled"]), [[_vModelSelect, state.groupId]])]))
          : _createCommentVNode("", true),
        _createElementVNode("button", {
          type: "button",
          class: "btn btn-secondary",
          disabled: state.busy,
          onClick: load
        }, "Atualizar boletim", 8, ["disabled", "onClick"])
      ]),
      (state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(state.error), 1))
        : _createCommentVNode("", true),
      (state.busy)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            class: "muted",
            role: "status"
          }, "Carregando informações escolares…"))
        : _createCommentVNode("", true),
      (student() && !student().enrollments.length)
        ? (_openBlock(), _createElementBlock("p", {
            key: 2,
            class: "empty-state"
          }, [_createElementVNode("strong", { class: "learning-student-name" }, _toDisplayString(student().student_name), 1), _createTextVNode(" ainda não tem uma matrícula disponível para consulta.")]))
        : _createCommentVNode("", true),
      (!state.students.length && !state.busy && !state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 3,
            class: "empty-state"
          }, [_createElementVNode("h3", null, "Nenhum aluno vinculado"), _createElementVNode("p", null, "Solicite à Secretaria a conferência do seu vínculo com o cadastro escolar.")]))
        : _createCommentVNode("", true),
      (enrollment())
        ? (_openBlock(), _createElementBlock("article", {
            key: 4,
            class: _normalizeClass(["bulletin-sheet", 'bulletin-'+model]),
            style: _normalizeStyle({'--bulletin-color':enrollment().report_color||'var(--primary)','font-family':fonts[student()?.report_font]||'inherit','--bulletin-title-font':fonts[student()?.report_font]||'Georgia, serif'})
          }, [_createElementVNode("header", { class: "bulletin-heading" }, [_createElementVNode("div", { class: "bulletin-school" }, [(student()?.report_logo || props.identity?.logo_url)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: student()?.report_logo || props.identity.logo_url,
                alt: ""
              }, null, 8, ["src"]))
            : _createCommentVNode("", true), _createElementVNode("div", null, [_createElementVNode("p", null, _toDisplayString(student()?.school_name), 1), _createElementVNode("h2", null, "Boletim escolar")])]), _createElementVNode("div", { class: "bulletin-edition" }, [_createElementVNode("strong", null, _toDisplayString(modelNames[model]), 1), (enrollment().year_name)
            ? (_openBlock(), _createElementBlock("span", { key: 0 }, _toDisplayString(enrollment().year_name), 1))
            : _createCommentVNode("", true)])]), _createElementVNode("div", { class: "bulletin-body" }, [_createElementVNode("section", {
            class: "bulletin-profile",
            "aria-label": "Identificação do estudante"
          }, [_createElementVNode("div", { class: "bulletin-person" }, [(student()?.photo)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: student().photo,
                alt: "Foto do estudante",
                class: "bulletin-photo"
              }, null, 8, ["src"]))
            : (_openBlock(), _createElementBlock("span", {
                key: 1,
                class: "bulletin-photo bulletin-photo-empty",
                role: "img",
                "aria-label": "Foto não cadastrada"
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true"
              }, [_createElementVNode("use", { href: "/ui-icons.svg#students" })]))])), _createElementVNode("div", null, [_createElementVNode("p", { class: "bulletin-label" }, "Estudante"), _createElementVNode("h3", { class: "learning-student-name" }, _toDisplayString(student().student_name), 1), (enrollment().grade_name || enrollment().class_name)
            ? (_openBlock(), _createElementBlock("p", {
                key: 0,
                class: "bulletin-class"
              }, _toDisplayString([enrollment().grade_name,enrollment().class_name].filter(Boolean).join(' · ')), 1))
            : _createCommentVNode("", true)])]), _createElementVNode("dl", { class: "bulletin-facts" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(facts, ([label,value]) => {
            return (_openBlock(), _createElementBlock("div", { key: label }, [_createElementVNode("dt", null, _toDisplayString(label), 1), _createElementVNode("dd", null, _toDisplayString(value), 1)]))
          }), 128))]), uniformStatus
            ? (_openBlock(), _createElementBlock("p", {
                key: 0,
                class: "bulletin-status"
              }, [_createElementVNode("span", { class: "bulletin-label" }, "Situação dos resultados"), _createElementVNode("strong", null, _toDisplayString(uniformStatus), 1)]))
            : _createCommentVNode("", true)]), _createElementVNode("div", { class: "bulletin-results" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(tables, (matrix) => {
            return (_openBlock(), _createElementBlock("section", {
              key: matrix.key,
              class: "bulletin-matrix"
            }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(tableKinds, (kind) => {
              return (_openBlock(), _createElementBlock("section", {
                key: kind,
                class: "bulletin-table-section"
              }, [_createElementVNode("div", { class: "bulletin-table-heading" }, [_createElementVNode("h3", null, _toDisplayString(titles[kind]), 1), (matrix.className)
                ? (_openBlock(), _createElementBlock("p", { key: 0 }, _toDisplayString(matrix.className), 1))
                : _createCommentVNode("", true)]), _createElementVNode("table", { class: "bulletin-table" }, [_createElementVNode("caption", { class: "sr-only" }, _toDisplayString(titles[kind]) + " · " + _toDisplayString(matrix.className) + " · " + _toDisplayString(matrix.periodLabel), 1), _createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", {
                scope: "col",
                rowspan: kind==='integrated'?2:1
              }, "Componente curricular", 8, ["rowspan"]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matrix.periods, (period) => {
                return (_openBlock(), _createElementBlock("th", {
                  scope: kind==='integrated'?'colgroup':'col',
                  colspan: kind==='integrated'?2:1,
                  key: period.period_id
                }, _toDisplayString(period.period_name), 9, ["scope", "colspan"]))
              }), 128))]), (kind==='integrated')
                ? (_openBlock(), _createElementBlock("tr", {
                    key: 0,
                    class: "bulletin-subhead"
                  }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matrix.periods, (period) => {
                    return (_openBlock(), _createElementBlock(_Fragment, { key: period.period_id }, [_createElementVNode("th", { scope: "col" }, "Nota / conceito"), _createElementVNode("th", { scope: "col" }, "Frequência")], 64))
                  }), 128))]))
                : _createCommentVNode("", true)]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matrix.rows, (row) => {
                return (_openBlock(), _createElementBlock("tr", { key: row.id }, [_createElementVNode("th", { scope: "row" }, _toDisplayString(row.name), 1), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(row.cells, (cell) => {
                  return (_openBlock(), _createElementBlock(_Fragment, { key: cell.period.period_id }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(kind==='integrated' && cell.result?['grade','attendance']:[kind], (part) => {
                    return (_openBlock(), _createElementBlock("td", {
                      key: part,
                      class: _normalizeClass('bulletin-part-'+part),
                      colspan: kind==='integrated' && !cell.result?2:1
                    }, [(part!=='attendance' || kind==='attendance')
                      ? (_openBlock(), _createElementBlock("span", {
                          key: 0,
                          class: "bulletin-mobile-period",
                          "aria-hidden": "true"
                        }, _toDisplayString(cell.period.period_name), 1))
                      : _createCommentVNode("", true), (cell.result)
                      ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("dl", { class: "bulletin-values" }, [(part!=='attendance')
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "bulletin-grade"
                            }, [_createElementVNode("dt", null, "Nota / conceito"), _createElementVNode("dd", { "data-metric": "grade" }, _toDisplayString(cell.result.grade_display ?? 'Não informado'), 1)]))
                          : _createCommentVNode("", true), (part!=='grade')
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 1,
                              class: "bulletin-frequency"
                            }, [_createElementVNode("dt", null, "Frequência"), _createElementVNode("dd", { "data-metric": "frequency" }, _toDisplayString(percent(cell.result.attendance.percentage)), 1)]))
                          : _createCommentVNode("", true), (part!=='attendance' && cell.result.recovery?.length)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 2,
                              class: "bulletin-recovery"
                            }, [_createElementVNode("dt", null, "Recuperação"), _createElementVNode("dd", null, _toDisplayString(cell.result.recovery.join(', ')), 1)]))
                          : _createCommentVNode("", true)]), (part!=='grade')
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 0,
                              class: "bulletin-counts"
                            }, [
                              _createElementVNode("span", null, _toDisplayString(cell.result.attendance.total) + " " + _toDisplayString(cell.result.attendance.total===1?'aula':'aulas'), 1),
                              _createElementVNode("span", null, _toDisplayString(cell.result.attendance.absent) + " " + _toDisplayString(cell.result.attendance.absent===1?'falta':'faltas'), 1),
                              (cell.result.attendance.justified_absence)
                                ? (_openBlock(), _createElementBlock("span", { key: 0 }, _toDisplayString(cell.result.attendance.justified_absence) + " " + _toDisplayString(cell.result.attendance.justified_absence===1?'falta justificada':'faltas justificadas'), 1))
                                : _createCommentVNode("", true),
                              (cell.result.attendance.unrecorded)
                                ? (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(cell.result.attendance.unrecorded) + " " + _toDisplayString(cell.result.attendance.unrecorded===1?'aula':'aulas') + " sem chamada", 1))
                                : _createCommentVNode("", true)
                            ]))
                          : _createCommentVNode("", true), (part!=='attendance' && !uniformStatus && cell.result.result_label)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 1,
                              class: "bulletin-cell-status"
                            }, _toDisplayString(cell.result.result_label), 1))
                          : _createCommentVNode("", true)], 64))
                      : (_openBlock(), _createElementBlock("span", {
                          key: 2,
                          class: "bulletin-pending"
                        }, _toDisplayString(cell.empty), 1))], 10, ["colspan"]))
                  }), 128))], 64))
                }), 128))]))
              }), 128))])])]))
            }), 128))]))
          }), 128)), (opinions.length)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "bulletin-opinions"
              }, [_createElementVNode("h3", null, "Pareceres pedagógicos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(opinions, (item) => {
                return (_openBlock(), _createElementBlock("div", { key: JSON.stringify([item.diary_id,item.period_id]) }, [_createElementVNode("h4", null, [_createTextVNode(_toDisplayString(item.component_name) + " · " + _toDisplayString(item.period_name) + " ", 1), (item.class_label)
                  ? (_openBlock(), _createElementBlock("span", { key: 0 }, "· " + _toDisplayString(item.class_label), 1))
                  : _createCommentVNode("", true)]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(item.opinions, (opinion, index) => {
                  return (_openBlock(), _createElementBlock("p", { key: index }, _toDisplayString(opinion), 1))
                }), 128))]))
              }), 128))]))
            : _createCommentVNode("", true), (!periodGroups.length)
            ? (_openBlock(), _createElementBlock("div", {
                key: 1,
                class: "empty-state"
              }, [_createElementVNode("h3", null, "Resultados ainda não publicados"), _createElementVNode("p", null, "As notas e a frequência aparecerão após a conferência e publicação pela escola.")]))
            : _createCommentVNode("", true)])]), _createElementVNode("footer", { class: "bulletin-footer" }, [(periodGroups.length)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "bulletin-downloads"
              }, [_createElementVNode("div", null, [_createElementVNode("h3", null, "Boletim em PDF"), _createElementVNode("p", null, "A via de consulta reúne os resultados publicados da matrícula.")]), _createElementVNode("button", {
                class: "btn btn-primary",
                type: "button",
                disabled: state.busy,
                onClick: $event => (download())
              }, "Baixar boletim PDF", 8, ["disabled", "onClick"]), (enrollment().official_editions?.length)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "bulletin-signed"
                  }, [_createElementVNode("h4", null, "Vias oficiais assinadas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(enrollment().official_editions, (edition) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: edition.id,
                      class: "btn btn-secondary",
                      disabled: state.busy,
                      type: "button",
                      onClick: $event => (download(edition.id))
                    }, "Boletim oficial assinado · revisão " + _toDisplayString(edition.revision), 9, ["disabled", "onClick"]))
                  }), 128))]))
                : _createCommentVNode("", true)]))
            : _createCommentVNode("", true), (state.note)
            ? (_openBlock(), _createElementBlock("details", { key: 1 }, [_createElementVNode("summary", null, "Critérios de leitura"), _createElementVNode("p", null, _toDisplayString(state.note), 1), _createElementVNode("p", null, "Na grade, as faltas sem justificativa e as faltas justificadas aparecem separadamente.")]))
            : _createCommentVNode("", true)])], 6))
        : _createCommentVNode("", true)
    ], 8, ["aria-busy"]))
  }
},portalMail:function render(_ctx, _cache) {
  with (_ctx) {
    const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, vModelText: _vModelText, withDirectives: _withDirectives, createTextVNode: _createTextVNode, withModifiers: _withModifiers, vShow: _vShow } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "portal-mail panel",
      "aria-label": "E-mail institucional"
    }, [
      (m.busy||m.opening)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "loading-strip",
            role: "status"
          }, "Abrindo a caixa institucional…"))
        : _createCommentVNode("", true),
      (m.error)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(m.error), 1))
        : _createCommentVNode("", true),
      (m.needsPassword)
        ? (_openBlock(), _createElementBlock("form", {
            key: 2,
            class: "portal-mail-connection",
            onSubmit: _withModifiers($event => (open(true)), ["prevent"])
          }, [
            _createElementVNode("h2", null, "Conectar caixa institucional"),
            _createElementVNode("p", null, _toDisplayString(m.address), 1),
            _createElementVNode("label", { class: "field" }, [_createTextVNode("Senha da caixa institucional"), _withDirectives(_createElementVNode("input", {
              type: "password",
              "onUpdate:modelValue": $event => ((m.password) = $event),
              required: "",
              autocomplete: "current-password",
              maxlength: "512",
              disabled: m.busy
            }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, m.password]])]),
            _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: m.busy
            }, "Conectar caixa", 8, ["disabled"])
          ], 40, ["onSubmit"]))
        : (m.error)
          ? (_openBlock(), _createElementBlock("button", {
              key: 3,
              class: "btn btn-secondary",
              type: "button",
              onClick: $event => (open()),
              disabled: m.busy
            }, "Abrir caixa novamente", 8, ["onClick", "disabled"]))
          : _createCommentVNode("", true),
      _withDirectives(_createElementVNode("iframe", {
        src: frame.src,
        class: "portal-mail-frame",
        title: "Caixa de e-mail institucional",
        referrerpolicy: "same-origin",
        onLoad: loaded
      }, null, 40, ["src", "onLoad"]), [[_vShow, !m.needsPassword&&!m.error]])
    ]))
  }
},portalProtocols:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode, vModelText: _vModelText, withDirectives: _withDirectives, withModifiers: _withModifiers, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "panel family-detail-panel portal-protocols",
      "aria-label": "Atendimento do colégio",
      "aria-busy": s.busy,
      "data-workspace-dirty": dirty()?'true':undefined
    }, [
      _createElementVNode("header", { class: "portal-protocols-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", {
        id: "portal-protocol-title",
        tabindex: "-1"
      }, _toDisplayString(s.view==='list'?'Fale com o colégio':s.view==='new'?'Novo protocolo':s.ticket?.subject), 1), (s.view==='list')
        ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Abra uma solicitação ou acompanhe o retorno da escola pelo número do protocolo."))
        : _createCommentVNode("", true), (s.ticket)
        ? (_openBlock(), _createElementBlock("p", { key: 1 }, [_createElementVNode("strong", null, _toDisplayString(s.ticket.number), 1), _createTextVNode(" · " + _toDisplayString(statuses[s.ticket.status]||s.ticket.status) + " · " + _toDisplayString(categories[s.ticket.category]||s.ticket.category), 1)]))
        : _createCommentVNode("", true)]), _createElementVNode("div", { class: "actions" }, [(s.view==='list' && (props.area==='teacher' || props.studentId))
        ? (_openBlock(), _createElementBlock("button", {
            key: 0,
            type: "button",
            class: "btn btn-primary",
            disabled: s.busy,
            onClick: showNew
          }, "Novo protocolo", 8, ["disabled", "onClick"]))
        : (s.view!=='list')
          ? (_openBlock(), _createElementBlock("button", {
              key: 1,
              type: "button",
              class: "btn btn-secondary",
              disabled: s.busy,
              onClick: $event => (list(s.page))
            }, "Voltar aos protocolos", 8, ["disabled", "onClick"]))
          : _createCommentVNode("", true), (chat.canOpen)
        ? (_openBlock(), _createElementBlock("button", {
            key: 2,
            type: "button",
            class: "btn btn-secondary",
            onClick: openChat
          }, "Abrir chat da escola", 8, ["onClick"]))
        : _createCommentVNode("", true)])]),
      (chat.canOpen && s.ticket && !closed())
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "portal-ticket-handoff"
          }, [_createElementVNode("p", null, "No chat da escola, informe " + _toDisplayString(s.ticket.number) + ". Para registrar uma mensagem no histórico deste protocolo, use Enviar resposta.", 1), _createElementVNode("button", {
            type: "button",
            class: "link-button",
            onClick: copyNumber
          }, "Copiar número do protocolo", 8, ["onClick"])]))
        : _createCommentVNode("", true),
      (s.busy)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            role: "status"
          }, "Aguarde, atualizando o atendimento…"))
        : _createCommentVNode("", true),
      (s.error)
        ? (_openBlock(), _createElementBlock("p", {
            key: 2,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(s.error), 1))
        : _createCommentVNode("", true),
      (s.notice)
        ? (_openBlock(), _createElementBlock("p", {
            key: 3,
            class: "alert success",
            role: "status"
          }, _toDisplayString(s.notice), 1))
        : _createCommentVNode("", true),
      (s.view==='list')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [
            _createElementVNode("form", {
              class: "family-feed-search",
              onSubmit: _withModifiers($event => (list(1,true)), ["prevent"])
            }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Número do protocolo"), _withDirectives(_createElementVNode("input", {
              type: "search",
              "onUpdate:modelValue": $event => ((s.query) = $event),
              maxlength: "100",
              placeholder: "PRO-",
              disabled: s.busy
            }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, s.query]])]), _createElementVNode("button", {
              class: "btn btn-secondary",
              disabled: s.busy
            }, "Buscar", 8, ["disabled"])], 40, ["onSubmit"]),
            _createElementVNode("h3", null, "Meus protocolos"),
            (s.items.length)
              ? (_openBlock(), _createElementBlock("ul", {
                  key: 0,
                  class: "portal-ticket-list"
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.items, (item) => {
                  return (_openBlock(), _createElementBlock("li", { key: item.id }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(item.number), 1), _createElementVNode("button", {
                    type: "button",
                    class: "link-button",
                    "aria-label": 'Abrir '+item.number+' · '+item.subject,
                    onClick: $event => (open(item.id)),
                    disabled: s.busy
                  }, _toDisplayString(item.subject), 9, ["aria-label", "onClick", "disabled"])]), _createElementVNode("p", null, [_createTextVNode(_toDisplayString(statuses[item.status]||item.status) + " · " + _toDisplayString(categories[item.category]||item.category), 1), _createElementVNode("small", null, "Atualizado em " + _toDisplayString(date(item.updated_at)), 1)])]))
                }), 128))]))
              : (!s.busy&&!s.error)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 1,
                    class: "family-empty"
                  }, _toDisplayString(s.term?'Nenhum protocolo encontrado para esse número.':'Você ainda não tem protocolos neste contexto.'), 1))
                : _createCommentVNode("", true),
            (s.total>s.pageSize)
              ? (_openBlock(), _createElementBlock("nav", {
                  key: 2,
                  class: "family-pagination",
                  "aria-label": "Páginas de protocolos"
                }, [_createElementVNode("button", {
                  class: "btn btn-secondary",
                  disabled: s.busy||s.page<=1,
                  onClick: $event => (list(s.page-1))
                }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("span", null, "Página " + _toDisplayString(s.page) + " de " + _toDisplayString(Math.ceil(s.total/s.pageSize)), 1), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  disabled: s.busy||s.page*s.pageSize>=s.total,
                  onClick: $event => (list(s.page+1))
                }, "Próxima", 8, ["disabled", "onClick"])]))
              : _createCommentVNode("", true),
            (s.options.opening_channel)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 3,
                  class: "portal-opening-channel"
                }, [_createElementVNode("h3", null, "Avisos de novos protocolos abertos pela escola"), _createElementVNode("form", {
                  class: "family-feed-search",
                  onSubmit: _withModifiers(saveOpeningChannel, ["prevent"])
                }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Quando a Secretaria abrir um atendimento para mim"), _withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": $event => ((s.openingChannel) = $event),
                  disabled: s.busy
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.options.channels, (key) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: key,
                    value: key
                  }, _toDisplayString(key==='portal'?'Somente no portal':channels[key]), 9, ["value"]))
                }), 128))], 8, ["onUpdate:modelValue", "disabled"]), [[_vModelSelect, s.openingChannel]])]), _createElementVNode("button", {
                  type: "submit",
                  class: "btn btn-secondary",
                  disabled: s.busy
                }, "Salvar preferência de abertura", 8, ["disabled"])], 40, ["onSubmit"])]))
              : _createCommentVNode("", true)
          ], 64))
        : _createCommentVNode("", true),
      (s.view==='detail' && s.ticket)
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 5 }, [_createElementVNode("div", { class: "portal-protocols-heading" }, [_createElementVNode("h3", null, "Histórico do protocolo"), _createElementVNode("button", {
            class: "btn btn-secondary",
            type: "button",
            onClick: $event => (open(s.ticket.id)),
            disabled: s.busy
          }, "Atualizar histórico", 8, ["onClick", "disabled"])]), _createElementVNode("ol", { class: "portal-ticket-history" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.ticket.history, (entry) => {
            return (_openBlock(), _createElementBlock("li", { key: entry.id }, [_createElementVNode("header", null, [_createElementVNode("strong", null, _toDisplayString(entry.author==='you'?'Você':'Escola'), 1), _createElementVNode("time", { datetime: entry.created_at }, _toDisplayString(date(entry.created_at)), 9, ["datetime"])]), _createElementVNode("p", null, _toDisplayString(entry.message), 1), (entry.attachment)
              ? (_openBlock(), _createElementBlock("button", {
                  key: 0,
                  type: "button",
                  class: "link-button",
                  disabled: s.busy,
                  onClick: $event => (attachment(entry.attachment))
                }, "Baixar anexo · " + _toDisplayString(entry.attachment.name), 9, ["disabled", "onClick"]))
              : _createCommentVNode("", true)]))
          }), 128))])], 64))
        : _createCommentVNode("", true),
      (s.optionsError)
        ? (_openBlock(), _createElementBlock("p", {
            key: 6,
            class: "alert",
            role: "status"
          }, [_createTextVNode("Preferências de contato indisponíveis. O atendimento pelo portal continua disponível. "), _createElementVNode("button", {
            type: "button",
            class: "link-button",
            onClick: options
          }, "Tentar novamente", 8, ["onClick"])]))
        : _createCommentVNode("", true),
      (s.view==='new'||(s.view==='detail'&&!closed()))
        ? (_openBlock(), _createElementBlock("form", {
            key: 7,
            class: "portal-ticket-form",
            onSubmit: _withModifiers(send, ["prevent"])
          }, [_createElementVNode("fieldset", { disabled: s.busy }, [
            _createElementVNode("legend", null, _toDisplayString(s.view==='new'?'Dados da solicitação':'Responder ao colégio'), 1),
            (s.view==='new')
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Categoria"), _withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": $event => ((s.form.category) = $event),
                  required: ""
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(availableCategories, (key) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: key,
                    value: key
                  }, _toDisplayString(categories[key]), 9, ["value"]))
                }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.form.category]])]), _createElementVNode("label", { class: "field" }, [_createTextVNode("Assunto"), _withDirectives(_createElementVNode("input", {
                  type: "text",
                  "onUpdate:modelValue": $event => ((s.form.subject) = $event),
                  minlength: "2",
                  maxlength: "120",
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.subject]])]), (s.options.channels.length>1)
                  ? (_openBlock(), _createElementBlock("label", {
                      key: 0,
                      class: "field"
                    }, [_createTextVNode("Preferência de avisos"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.form.channel) = $event) }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.options.channels, (key) => {
                      return (_openBlock(), _createElementBlock("option", {
                        key: key,
                        value: key
                      }, _toDisplayString(channels[key]), 9, ["value"]))
                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.form.channel]])]))
                  : _createCommentVNode("", true)], 64))
              : _createCommentVNode("", true),
            _createElementVNode("label", { class: "field" }, [_createTextVNode(_toDisplayString(s.view==='new'?'Mensagem':'Sua resposta'), 1), _withDirectives(_createElementVNode("textarea", {
              "onUpdate:modelValue": $event => ((s.form.message) = $event),
              rows: "4",
              minlength: "3",
              maxlength: "4000",
              required: ""
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.message]])]),
            _createElementVNode("label", { class: "field" }, [_createTextVNode("Anexo (opcional)"), (_openBlock(), _createElementBlock("input", {
              key: s.fileVersion,
              type: "file",
              accept: "application/pdf,image/png,image/jpeg",
              onChange: chooseFile
            }, null, 40, ["onChange"])), _createElementVNode("small", null, [_createTextVNode("PDF, JPG ou PNG"), (s.options.max_attachment_mb)
              ? (_openBlock(), _createElementBlock("span", { key: 0 }, " de até " + _toDisplayString(s.options.max_attachment_mb) + " MB", 1))
              : _createCommentVNode("", true), _createTextVNode(".")])]),
            _createElementVNode("button", {
              type: "submit",
              class: "btn btn-primary"
            }, _toDisplayString(s.view==='new'?'Abrir protocolo':'Enviar resposta'), 1)
          ], 8, ["disabled"])], 40, ["onSubmit"]))
        : (s.view==='detail'&&closed())
          ? (_openBlock(), _createElementBlock("p", {
              key: 8,
              class: "muted"
            }, "Este protocolo foi encerrado. Seu histórico continua disponível para consulta."))
          : _createCommentVNode("", true),
      (s.ticket && !closed() && (s.options.channels.length>1 || s.ticket.preferred_channel!=='portal' || whatsappUrl))
        ? (_openBlock(), _createElementBlock("section", {
            key: 9,
            class: "portal-ticket-channels",
            "aria-label": "Canais de contato"
          }, [(!closed() && (s.options.channels.length>1 || s.ticket.preferred_channel!=='portal'))
            ? (_openBlock(), _createElementBlock("form", {
                key: 0,
                class: "family-feed-search",
                onSubmit: _withModifiers(changeChannel, ["prevent"])
              }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Preferência de avisos"), _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": $event => ((s.form.channel) = $event),
                disabled: s.busy
              }, [(!s.options.channels.includes(s.ticket.preferred_channel))
                ? (_openBlock(), _createElementBlock("option", {
                    key: 0,
                    value: s.ticket.preferred_channel,
                    disabled: ""
                  }, _toDisplayString(channels[s.ticket.preferred_channel]) + " (indisponível)", 9, ["value"]))
                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.options.channels, (key) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: key,
                  value: key
                }, _toDisplayString(channels[key]), 9, ["value"]))
              }), 128))], 8, ["onUpdate:modelValue", "disabled"]), [[_vModelSelect, s.form.channel]])]), _createElementVNode("button", {
                class: "btn btn-secondary",
                disabled: s.busy||s.form.channel===s.ticket.preferred_channel
              }, "Salvar preferência", 8, ["disabled"])], 40, ["onSubmit"]))
            : _createCommentVNode("", true), whatsappUrl
            ? (_openBlock(), _createElementBlock("a", {
                key: 1,
                class: "btn btn-secondary",
                href: whatsappUrl,
                target: "_blank",
                rel: "noopener noreferrer"
              }, "Continuar pelo WhatsApp", 8, ["href"]))
            : _createCommentVNode("", true)]))
        : _createCommentVNode("", true)
    ], 8, ["aria-busy", "data-workspace-dirty"]))
  }
}};
