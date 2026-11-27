/* Vue pré-compilado; sem eval em runtime. */
var _Vue=Vue; var PigeRenders={familyPortal:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, renderList: _renderList, Fragment: _Fragment, vModelText: _vModelText, withModifiers: _withModifiers, withKeys: _withKeys, withDirectives: _withDirectives, vModelDynamic: _vModelDynamic, normalizeClass: _normalizeClass, vModelSelect: _vModelSelect, resolveComponent: _resolveComponent, createBlock: _createBlock } = _Vue

    const _component_learning_portal = _resolveComponent("learning-portal")

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
                _createElementVNode("p", { class: "auth-help muted" }, "Precisa recuperar seu acesso? Fale com a secretaria da escola."),
                _createElementVNode("details", { class: "family-first-access" }, [_createElementVNode("summary", null, "Primeiro acesso?"), _createElementVNode("p", null, "Utilize o convite enviado ao e-mail do seu cadastro. A conta da inscrição é independente do acesso escolar."), _createElementVNode("a", { href: "/online" }, "Inscrição e matrícula online →")])
              ], 40, ["onSubmit"]))])]))
        : (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "family-shell"
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
            onClick: _withModifiers($event => (section('overview')), ["prevent"])
          }, [(identity.logo_url)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: identity.logo_url,
                alt: identity.display_name
              }, null, 8, ["src", "alt"]))
            : (_openBlock(), _createElementBlock("strong", { key: 1 }, _toDisplayString(identity.display_name), 1)), _createElementVNode("small", null, _toDisplayString(portalName()), 1)], 8, ["onClick"])]), _createElementVNode("div", { class: "family-sidebar-scroll" }, [
            _createElementVNode("p", { class: "family-nav-label" }, "ACOMPANHAMENTO ESCOLAR"),
            _createElementVNode("nav", { "aria-label": "Acompanhamento escolar" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList([{id:'overview',label:'Visão geral',icon:'dashboard'},{id:'students',label:title('students'),icon:'students'},{id:'materials',label:'Atividades',icon:'documents'},{id:'academic',label:title('academic'),icon:'academic'},{id:'agenda',label:'Agenda escolar',icon:'clock'},{id:'news',label:'Comunicados',icon:'bell'}], (item) => {
              return (_openBlock(), _createElementBlock("button", {
                key: item.id,
                type: "button",
                "aria-current": s.section===item.id?'page':undefined,
                onClick: $event => (section(item.id))
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true"
              }, [_createElementVNode("use", { href: '/ui-icons.svg#'+item.icon }, null, 8, ["href"])])), _createElementVNode("span", null, _toDisplayString(item.label), 1), (item.id==='students'&&s.students.length)
                ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(s.students.length), 1))
                : _createCommentVNode("", true)], 8, ["aria-current", "onClick"]))
            }), 128))]),
            _createElementVNode("p", { class: "family-nav-label" }, "Serviços escolares"),
            _createElementVNode("nav", { "aria-label": "Serviços escolares" }, [(s.account.role==='guardian')
              ? (_openBlock(), _createElementBlock("button", {
                  key: 0,
                  type: "button",
                  "aria-current": s.section==='absences'?'page':undefined,
                  onClick: $event => (section('absences'))
                }, [(_openBlock(), _createElementBlock("svg", {
                  class: "ui-icon",
                  "aria-hidden": "true"
                }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createTextVNode("Justificativas de ausência")], 8, ["aria-current", "onClick"]))
              : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList([{id:'finance',label:'Financeiro',icon:'billing'},{id:'documents',label:'Documentos',icon:'documents'},{id:'support',label:'Atendimento',icon:'school'}], (item) => {
              return (_openBlock(), _createElementBlock("button", {
                key: item.id,
                type: "button",
                "aria-current": s.section===item.id?'page':undefined,
                onClick: $event => (section(item.id))
              }, [(_openBlock(), _createElementBlock("svg", {
                class: "ui-icon",
                "aria-hidden": "true"
              }, [_createElementVNode("use", { href: '/ui-icons.svg#'+item.icon }, null, 8, ["href"])])), _createElementVNode("span", null, _toDisplayString(item.label), 1)], 8, ["aria-current", "onClick"]))
            }), 128)), _createElementVNode("a", { href: "/online" }, [(_openBlock(), _createElementBlock("svg", {
              class: "ui-icon",
              "aria-hidden": "true"
            }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createElementVNode("span", null, "Inscrição e contratos ↗")])])
          ]), _createElementVNode("footer", { class: "family-sidebar-footer" }, [_createTextVNode(_toDisplayString(identity.short_name), 1), _createElementVNode("small", null, _toDisplayString(portalName()), 1)])], 2), _createElementVNode("div", {
            class: "family-main",
            inert: s.menuOpen?true:undefined
          }, [_createElementVNode("header", { class: "family-header" }, [
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
          ]), _createElementVNode("main", {
            id: "family-content",
            class: "family-content"
          }, [
            _createElementVNode("div", { class: "family-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "family-breadcrumb" }, _toDisplayString(portalName()) + " / " + _toDisplayString(title()), 1), _createElementVNode("h1", {
              id: "family-title",
              tabindex: "-1"
            }, _toDisplayString(title()), 1)]), _createElementVNode("button", {
              class: "btn btn-secondary",
              type: "button",
              onClick: $event => (run(load)),
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
                }, [_createElementVNode("label", { for: "family-school" }, "Instituição"), _withDirectives(_createElementVNode("select", {
                  id: "family-school",
                  "onUpdate:modelValue": $event => ((s.schoolId) = $event),
                  onChange: changeSchool,
                  disabled: s.busy
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.account.school_ids, (id) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: id,
                    value: id
                  }, _toDisplayString(s.schools[id]||id), 9, ["value"]))
                }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, s.schoolId]])]))
              : _createCommentVNode("", true), (s.students.length)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "field"
                }, [_createElementVNode("label", { for: "family-student" }, _toDisplayString(studentView()?'Aluno':'Você está acompanhando'), 1), _withDirectives(_createElementVNode("select", {
                  id: "family-student",
                  "onUpdate:modelValue": $event => ((s.studentId) = $event),
                  onChange: changeStudent,
                  disabled: s.busy
                }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.students, (item) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: item.id,
                    value: item.id
                  }, _toDisplayString(item.name), 9, ["value"]))
                }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, s.studentId]])]))
              : _createCommentVNode("", true)]),
            (s.contextError)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 2,
                  class: "panel family-empty"
                }, [_createElementVNode("h2", null, "Não foi possível carregar seu vínculo"), _createElementVNode("p", null, "Confira a instituição selecionada e tente atualizar. Se o problema continuar, procure a secretaria.")]))
              : (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                  (s.section==='overview')
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 0,
                        class: "family-overview"
                      }, [
                        _createElementVNode("section", { class: "family-welcome" }, [
                          _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(portalName()), 1),
                          _createElementVNode("h2", null, "Olá, " + _toDisplayString(s.account.name.split(' ')[0]) + ".", 1),
                          _createElementVNode("p", null, _toDisplayString(studentView()?'Consulte suas notas, atividades e documentos.':'Consulte as notas, atividades e documentos dos alunos que você acompanha.'), 1),
                          _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                            class: "btn btn-primary",
                            onClick: $event => (section('academic')),
                            disabled: !student()
                          }, "Consultar boletim", 8, ["onClick", "disabled"]), _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (section('support'))
                          }, "Falar com a escola →", 8, ["onClick"])])
                        ]),
                        _createElementVNode("div", { class: "family-stats" }, [
                          _createElementVNode("button", {
                            class: "family-stat",
                            onClick: $event => (section('students'))
                          }, [
                            _createElementVNode("span", null, _toDisplayString(studentView()?'Meu cadastro':'Alunos vinculados'), 1),
                            (_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#students" })])),
                            _createElementVNode("strong", null, _toDisplayString(s.students.length), 1),
                            _createElementVNode("small", null, _toDisplayString(studentView()?'Dados escolares':'Disponíveis neste acesso'), 1)
                          ], 8, ["onClick"]),
                          _createElementVNode("button", {
                            class: "family-stat",
                            onClick: $event => (section('academic'))
                          }, [
                            _createElementVNode("span", null, _toDisplayString(title('academic')), 1),
                            (_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])),
                            _createElementVNode("strong", null, _toDisplayString(student()?.enrollments.length||0), 1),
                            _createElementVNode("small", null, "Matrícula(s) do aluno selecionado")
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
                            _createElementVNode("strong", null, _toDisplayString(student()?.document_pendencies ? pendingDocuments().length : '—'), 1),
                            _createElementVNode("small", null, _toDisplayString(student()?'Consulte a situação dos documentos':'Selecione um aluno'), 1)
                          ], 8, ["onClick"]),
                          _createElementVNode("button", {
                            class: "family-stat",
                            onClick: $event => (section('finance'))
                          }, [
                            _createElementVNode("span", null, "Financeiro"),
                            (_openBlock(), _createElementBlock("svg", {
                              class: "ui-icon",
                              "aria-hidden": "true"
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#billing" })])),
                            _createElementVNode("strong", { class: "family-stat-word" }, _toDisplayString(!student()?.financial_authorized?'Restrito':s.financeError?'Indisponível':!s.financeLoaded?'Carregando':s.financeOverdue?s.financeOverdue+' vencida(s)':'Sem vencidas'), 1),
                            _createElementVNode("small", null, "Conforme vínculo e cobranças registradas")
                          ], 8, ["onClick"])
                        ]),
                        (s.overviewFeedError)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 0,
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
                          : _createCommentVNode("", true)]), _createElementVNode("section", { class: "panel" }, [_createElementVNode("div", { class: "family-panel-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ACOMPANHAMENTO"), _createElementVNode("h2", null, "O que precisa de atenção?")])]), _createElementVNode("div", { class: "family-attention" }, [_createElementVNode("h3", null, "Documentação escolar"), _createElementVNode("p", null, _toDisplayString(!student()?'Nenhum aluno vinculado.':!student().document_pendencies?'Consulta de pendências indisponível.':pendingDocuments().length?pendingDocuments().length+' documento(s) precisam de atenção.':'Nenhuma pendência documental registrada.'), 1), _createElementVNode("button", {
                          class: "link-button",
                          onClick: $event => (section('documents'))
                        }, "Consultar documentos →", 8, ["onClick"])]), _createElementVNode("div", { class: "family-attention" }, [_createElementVNode("h3", null, "Mensalidades"), _createElementVNode("p", null, _toDisplayString(!student()?.financial_authorized?'A consulta exige vínculo financeiro autorizado.':s.financeError?'Não foi possível consultar as cobranças.':!s.financeLoaded?'Carregando cobranças…':s.financeOverdue?s.financeOverdue+' cobrança(s) marcada(s) como vencida(s).':'Nenhuma cobrança marcada como vencida.'), 1), _createElementVNode("button", {
                          class: "link-button",
                          onClick: $event => (section('finance'))
                        }, "Consultar financeiro →", 8, ["onClick"])])])]),
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
                            }, [_createElementVNode("h2", null, "Materiais de " + _toDisplayString(student().name), 1), (schoolwork.loading)
                              ? (_openBlock(), _createElementBlock("p", {
                                  key: 0,
                                  role: "status"
                                }, "Carregando atividades…"))
                              : (schoolwork.error)
                                ? (_openBlock(), _createElementBlock("p", {
                                    key: 1,
                                    class: "alert error",
                                    role: "alert"
                                  }, [_createTextVNode(_toDisplayString(schoolwork.error) + " ", 1), _createElementVNode("button", {
                                    type: "button",
                                    class: "link-button",
                                    onClick: loadSchoolwork
                                  }, "Tentar novamente", 8, ["onClick"])]))
                                : (!schoolwork.materials.length)
                                  ? (_openBlock(), _createElementBlock("p", { key: 2 }, "Nenhuma atividade publicada para este aluno ou sua turma."))
                                  : (_openBlock(true), _createElementBlock(_Fragment, { key: 3 }, _renderList(schoolwork.materials, (item) => {
                                      return (_openBlock(), _createElementBlock("article", {
                                        key: item.id,
                                        class: "family-detail-panel"
                                      }, [
                                        _createElementVNode("small", null, _toDisplayString(item.kind) + " · " + _toDisplayString(item.enrollment_id?'Individual':'Toda a turma'), 1),
                                        _createElementVNode("h3", null, _toDisplayString(item.title), 1),
                                        _createElementVNode("p", { class: "preserve" }, _toDisplayString(item.body), 1),
                                        _createElementVNode("button", {
                                          class: "btn btn-secondary",
                                          onClick: $event => (run(()=>download('/family/students/'+s.studentId+'/materials/'+item.id+'/print.pdf','material-escolar.pdf')))
                                        }, "Baixar para imprimir", 8, ["onClick"])
                                      ]))
                                    }), 128))]))
                          : _createCommentVNode("", true),
                        (s.section==='absences' && s.account.role==='guardian')
                          ? (_openBlock(), _createElementBlock("section", {
                              key: 1,
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
                            ]))
                          : _createCommentVNode("", true),
                        (s.section==='academic')
                          ? (_openBlock(), _createElementBlock("section", { key: 2 }, [_createElementVNode("article", { class: "panel family-enrollments" }, [
                              _createElementVNode("h2", null, _toDisplayString(student().name), 1),
                              _createElementVNode("p", { class: "muted" }, "Código " + _toDisplayString(student().number), 1),
                              _createElementVNode("div", { class: "family-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student().enrollments, (enrollment) => {
                                return (_openBlock(), _createElementBlock("div", { key: enrollment.id }, [_createElementVNode("strong", null, _toDisplayString(enrollment.class_name), 1), _createElementVNode("p", null, _toDisplayString(enrollment.year_name) + " · " + _toDisplayString(label(enrollment.status)), 1), _createElementVNode("small", null, "Matrícula " + _toDisplayString(enrollment.number), 1)]))
                              }), 128))]),
                              (!student().enrollments.length)
                                ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Nenhuma matrícula disponível."))
                                : _createCommentVNode("", true)
                            ]), (_openBlock(), _createBlock(_component_learning_portal, {
                              identity: identity,
                              key: s.schoolId+':'+s.studentId,
                              request: request,
                              download: download,
                              "school-id": s.schoolId,
                              "student-id": s.studentId
                            }, null, 8, ["identity", "request", "download", "school-id", "student-id"]))]))
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
                        (s.section==='finance')
                          ? (_openBlock(), _createElementBlock("section", {
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
                                      }, _toDisplayString(s.financeError), 1))
                                    : _createCommentVNode("", true),
                                  _createElementVNode("p", { class: "muted" }, _toDisplayString(s.financeNote), 1),
                                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.charges, (charge) => {
                                    return (_openBlock(), _createElementBlock("article", {
                                      key: charge.id,
                                      class: "family-line"
                                    }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(charge.description), 1), _createElementVNode("p", null, "Vencimento: " + _toDisplayString(date(charge.due_on)) + " · " + _toDisplayString(label(charge.status)), 1)]), _createElementVNode("strong", null, _toDisplayString(money(charge.amount)), 1)]))
                                  }), 128)),
                                  (s.financeLoaded&&!s.charges.length)
                                    ? (_openBlock(), _createElementBlock("p", {
                                        key: 1,
                                        class: "family-empty"
                                      }, "Nenhuma cobrança registrada para estas matrículas."))
                                    : _createCommentVNode("", true),
                                  (s.financeLoaded&&s.financeTotal>s.financePageSize)
                                    ? (_openBlock(), _createElementBlock("nav", {
                                        key: 2,
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
                                ], 64))]))
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
                            }, "Nenhuma publicação disponível."))
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
                  (s.section==='support')
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 5,
                        class: "panel family-detail-panel"
                      }, [
                        _createElementVNode("p", { class: "eyebrow" }, "ATENDIMENTO PELA SECRETARIA"),
                        _createElementVNode("h2", null, "Fale com " + _toDisplayString(identity.display_name), 1),
                        _createElementVNode("p", null, "Procure os canais de atendimento informados pela sua escola para dúvidas sobre acesso, vínculos, documentos ou cobranças."),
                        _createElementVNode("div", { class: "family-grid" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, "Acesso escolar"), _createElementVNode("p", null, "Para recuperar sua senha ou revisar quem pode acompanhar o aluno, fale com a secretaria. Não compartilhe sua senha.")]), _createElementVNode("div", null, [_createElementVNode("h3", null, "Inscrição e matrícula"), _createElementVNode("p", null, "Use a conta de inscrição para acompanhar propostas e contratos. Ela é independente deste acesso escolar."), _createElementVNode("a", {
                          class: "link-button",
                          href: "/online"
                        }, "Ir para inscrição e contratos →")])])
                      ]))
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
          ]), _createElementVNode("footer", { class: "family-footer" }, [_createTextVNode(_toDisplayString(identity.display_name) + " · " + _toDisplayString(portalName()) + " ", 1), _createElementVNode("span", null, "Atendimento pela secretaria")])], 8, ["inert"])]))], 8, ["aria-busy"]))
  }
},learning:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, createTextVNode: _createTextVNode, normalizeClass: _normalizeClass, normalizeStyle: _normalizeStyle } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "learning-workspace",
      "aria-label": "Boletim e frequência",
      "aria-busy": state.busy
    }, [_createElementVNode("section", { class: "panel x-card" }, [
      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "VIDA ESCOLAR"), _createElementVNode("h2", null, "Boletim e frequência"), _createElementVNode("p", null, "Resultados publicados pela escola para acompanhar o aprendizado.")]), _createElementVNode("button", {
        class: "btn btn-secondary",
        disabled: state.busy,
        onClick: load
      }, "Atualizar", 8, ["disabled", "onClick"])]),
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
      (state.students.length)
        ? (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "x-grid"
          }, [(props.studentId && student())
            ? (_openBlock(), _createElementBlock("p", {
                key: 0,
                class: "learning-student-name"
              }, _toDisplayString(student().student_name), 1))
            : _createCommentVNode("", true), (!props.studentId)
            ? (_openBlock(), _createElementBlock("label", { key: 1 }, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": $event => ((state.studentId) = $event),
                onChange: selectStudent,
                disabled: state.busy
              }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.students, (item) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: item.student_id,
                  value: item.student_id
                }, _toDisplayString(item.student_name), 9, ["value"]))
              }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, state.studentId]])]))
            : _createCommentVNode("", true), _createElementVNode("label", null, [_createTextVNode("Matrícula"), _withDirectives(_createElementVNode("select", {
            "onUpdate:modelValue": $event => ((state.enrollmentId) = $event),
            disabled: state.busy
          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(student()?.enrollments || [], (item) => {
            return (_openBlock(), _createElementBlock("option", {
              key: item.enrollment_id,
              value: item.enrollment_id
            }, _toDisplayString(item.year_name) + " · " + _toDisplayString(item.class_name) + " · " + _toDisplayString(item.number), 9, ["value"]))
          }), 128))], 8, ["onUpdate:modelValue", "disabled"]), [[_vModelSelect, state.enrollmentId]])])]))
        : _createCommentVNode("", true),
      (!state.students.length && !state.busy && !state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 3,
            class: "empty-state"
          }, [_createElementVNode("h3", null, "Nenhum aluno vinculado"), _createElementVNode("p", null, "Solicite à Secretaria a conferência do seu vínculo com o cadastro escolar.")]))
        : _createCommentVNode("", true)
    ]), (enrollment())
      ? (_openBlock(), _createElementBlock("section", {
          key: 0,
          class: _normalizeClass(["panel bulletin-sheet", 'bulletin-'+enrollment().bulletin_model]),
          style: _normalizeStyle({'font-family':({arial:'Arial, sans-serif',verdana:'Verdana, sans-serif',georgia:'Georgia, serif',times:'Times New Roman, serif'})[student()?.report_font] || 'inherit','border-top':'3px solid '+(enrollment().report_color||'var(--primary)')})
        }, [_createElementVNode("div", { class: "panel-header report-masthead" }, [
          (student()?.report_logo || props.identity?.logo_url)
            ? (_openBlock(), _createElementBlock("img", {
                key: 0,
                src: student()?.report_logo || props.identity.logo_url,
                alt: ""
              }, null, 8, ["src"]))
            : _createCommentVNode("", true),
          (student()?.photo)
            ? (_openBlock(), _createElementBlock("img", {
                key: 1,
                src: student().photo,
                alt: "Foto do aluno",
                class: "avatar large"
              }, null, 8, ["src"]))
            : (_openBlock(), _createElementBlock("span", {
                key: 2,
                class: "avatar",
                "aria-label": "Foto não cadastrada"
              }, _toDisplayString(student()?.student_name.slice(0,1)), 1)),
          _createElementVNode("div", null, [_createElementVNode("p", null, _toDisplayString(student()?.school_name) + " · Boletim escolar", 1), _createElementVNode("h2", null, _toDisplayString(student()?.student_name), 1), _createElementVNode("p", { class: "muted small" }, "Registro " + _toDisplayString(student()?.student_number) + " · Matrícula " + _toDisplayString(enrollment().number) + " · " + _toDisplayString(enrollment().year_name), 1)]),
          _createElementVNode("button", {
            class: "btn btn-primary",
            disabled: state.busy || !rows().length,
            onClick: $event => (download())
          }, "Baixar boletim PDF", 8, ["disabled", "onClick"])
        ]), (rows().length)
          ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
              _createElementVNode("p", { class: "small" }, "O PDF de consulta contém os resultados publicados. Para imprimir a via assinada pela escola, selecione sua revisão."),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(enrollment().official_editions, (edition) => {
                return (_openBlock(), _createElementBlock("button", {
                  key: edition.id,
                  class: "btn btn-secondary",
                  onClick: $event => (download(edition.id))
                }, "Boletim oficial assinado · revisão " + _toDisplayString(edition.revision), 9, ["onClick"]))
              }), 128)),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(enrollment().display_sections, (matrix, index) => {
                return (_openBlock(), _createElementBlock("section", {
                  key: index,
                  class: "bulletin-period"
                }, [
                  _createElementVNode("h3", null, _toDisplayString(matrix.title), 1),
                  (matrix.text)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "preserve-lines"
                      }, _toDisplayString(matrix.text), 1))
                    : _createCommentVNode("", true),
                  (matrix.fields)
                    ? (_openBlock(), _createElementBlock("dl", {
                        key: 1,
                        class: "data-grid"
                      }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matrix.fields, ([label,value]) => {
                        return (_openBlock(), _createElementBlock("div", { key: label }, [_createElementVNode("dt", null, _toDisplayString(label), 1), _createElementVNode("dd", null, _toDisplayString(value), 1)]))
                      }), 128))]))
                    : _createCommentVNode("", true),
                  (matrix.columns)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 2,
                        class: "table-scroll report-records"
                      }, [_createElementVNode("table", null, [_createElementVNode("caption", { class: "sr-only" }, _toDisplayString(matrix.title), 1), _createElementVNode("thead", null, [_createElementVNode("tr", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matrix.columns, (column) => {
                        return (_openBlock(), _createElementBlock("th", {
                          key: column.key,
                          scope: "col"
                        }, _toDisplayString(column.label), 1))
                      }), 128))])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matrix.rows, (record, rowIndex) => {
                        return (_openBlock(), _createElementBlock("tr", { key: rowIndex }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(matrix.columns, (column) => {
                          return (_openBlock(), _createElementBlock("td", {
                            key: column.key,
                            "data-label": column.label
                          }, _toDisplayString(record[column.key]), 9, ["data-label"]))
                        }), 128))]))
                      }), 128))])])]))
                    : _createCommentVNode("", true)
                ]))
              }), 128)),
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(periodGroups, (group) => {
                return (_openBlock(), _createElementBlock("section", {
                  key: group.id,
                  class: "bulletin-period"
                }, [_createElementVNode("h3", null, _toDisplayString(group.label) + " · " + _toDisplayString(group.className), 1), _createElementVNode("div", { class: "table-scroll report-records" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                  _createElementVNode("th", { scope: "col" }, "Componente curricular"),
                  _createElementVNode("th", { scope: "col" }, "Aulas"),
                  _createElementVNode("th", { scope: "col" }, "Nota / conceito"),
                  _createElementVNode("th", { scope: "col" }, "Situação"),
                  _createElementVNode("th", { scope: "col" }, "Frequência"),
                  _createElementVNode("th", { scope: "col" }, "Faltas")
                ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(group.items, (item) => {
                  return (_openBlock(), _createElementBlock("tr", { key: item.diary_id+'-'+item.period_id }, [
                    _createElementVNode("td", { "data-label": "Componente curricular" }, [_createElementVNode("strong", null, _toDisplayString(item.component_name), 1)]),
                    _createElementVNode("td", { "data-label": "Aulas" }, _toDisplayString(item.attendance.total), 1),
                    _createElementVNode("td", { "data-label": "Nota / conceito" }, [_createElementVNode("strong", null, _toDisplayString(item.grade_display || '—'), 1)]),
                    _createElementVNode("td", { "data-label": "Situação" }, _toDisplayString(item.result_label), 1),
                    _createElementVNode("td", { "data-label": "Frequência" }, [_createTextVNode(_toDisplayString(percent(item.attendance.percentage)), 1), (item.attendance.unrecorded)
                      ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(item.attendance.unrecorded) + " aula(s) sem registro", 1))
                      : _createCommentVNode("", true)]),
                    _createElementVNode("td", { "data-label": "Faltas" }, [_createTextVNode(_toDisplayString(item.attendance.absent), 1), (item.attendance.justified_absence)
                      ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(item.attendance.justified_absence) + " justificada(s)", 1))
                      : _createCommentVNode("", true)])
                  ]))
                }), 128))])])])]))
              }), 128))
            ]))
          : (_openBlock(), _createElementBlock("div", {
              key: 1,
              class: "empty-state"
            }, [_createElementVNode("h3", null, "Resultados ainda não publicados"), _createElementVNode("p", null, "As notas e a frequência aparecerão após a conferência e publicação pela escola.")])), _createElementVNode("footer", { class: "panel-footer report-imprint" }, [(state.note)
          ? (_openBlock(), _createElementBlock("p", { key: 0 }, _toDisplayString(state.note), 1))
          : _createCommentVNode("", true), _createElementVNode("span", null, _toDisplayString(student()?.school_name) + " · Uso restrito ao aluno e aos responsáveis autorizados", 1)])], 6))
      : _createCommentVNode("", true)], 8, ["aria-busy"]))
  }
}};
