/* Vue pré-compilado; sem eval em runtime. */
var _Vue=Vue; var PigeRenders={app:function render(_ctx, _cache) {
  with (_ctx) {
    const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, vModelText: _vModelText, withDirectives: _withDirectives, resolveComponent: _resolveComponent, createVNode: _createVNode, renderList: _renderList, Fragment: _Fragment, vModelDynamic: _vModelDynamic, withModifiers: _withModifiers, withKeys: _withKeys, normalizeClass: _normalizeClass, vShow: _vShow, vModelSelect: _vModelSelect, createBlock: _createBlock, vModelCheckbox: _vModelCheckbox } = _Vue

    const _component_assist_panel = _resolveComponent("assist-panel")
    const _component_legacy_import_panel = _resolveComponent("legacy-import-panel")
    const _component_diagnostics_panel = _resolveComponent("diagnostics-panel")
    const _component_mailcow_panel = _resolveComponent("mailcow-panel")
    const _component_expansion_panel = _resolveComponent("expansion-panel")
    const _component_diary_panel = _resolveComponent("diary-panel")
    const _component_contracts_panel = _resolveComponent("contracts-panel")
    const _component_school_community = _resolveComponent("school-community")
    const _component_learning_panel = _resolveComponent("learning-panel")
    const _component_reports_panel = _resolveComponent("reports-panel")
    const _component_signing_panel = _resolveComponent("signing-panel")

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
              }, _toDisplayString(identity.display_name), 1))]), _createElementVNode("div", { class: "auth-copy" }, [_createElementVNode("p", { class: "eyebrow" }, "GESTÃO EDUCACIONAL"), _createElementVNode("h1", null, [_createTextVNode("A gestão educacional."), _createElementVNode("br"), _createTextVNode("Organizada, de verdade.")])]), _createElementVNode("div", null, [(identity.show_preenrollment_button)
            ? (_openBlock(), _createElementBlock("a", {
                key: 0,
                class: "btn btn-secondary",
                href: "/online.html"
              }, "Sou responsável · Pré-matrícula online →"))
            : _createCommentVNode("", true)])]), _createElementVNode("section", { class: "auth-panel" }, [(!state.configured)
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
                }, _toDisplayString(state.loginBusy ? 'Configurando…' : 'Concluir instalação'), 9, ["disabled"])
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
                  key: 2,
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
                  (state.embedded)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 2,
                        class: "small muted"
                      }, [_createTextVNode("Acesso dentro do HUB: sua sessão é independente da janela externa. Se o navegador restringir o login, "), _createElementVNode("a", {
                        href: "/",
                        target: "_blank",
                        rel: "noopener"
                      }, "abra a escola no navegador"), _createTextVNode(".")]))
                    : _createCommentVNode("", true),
                  _createElementVNode("p", { class: "small muted" }, "Problemas de acesso? Solicite a recuperação ao administrador desta instalação.")
                ], 40, ["onSubmit"])), (!state.online)
            ? (_openBlock(), _createElementBlock("p", {
                key: 3,
                class: "alert warning"
              }, "Sem conexão com o servidor. O acesso aos dados exige conexão."))
            : _createCommentVNode("", true)])]))
        : (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "workspace"
          }, [
            _createElementVNode("a", {
              href: "#main-content",
              class: "skip-content",
              "data-focus-content": ""
            }, "Ir para o conteúdo"),
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
              "aria-label": "Navegação da escola"
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
                }, _toDisplayString(identity.short_name), 1))], 8, ["onClick"])]), _createElementVNode("div", {
              class: "sidebar-scroll",
              tabindex: "0",
              role: "region",
              "aria-label": "Rolagem do menu"
            }, [
              _createElementVNode("div", { class: "sidebar-label" }, "OPERAÇÃO ESCOLAR"),
              (!isProfileRole())
                ? (_openBlock(), _createElementBlock("nav", {
                    key: 0,
                    "aria-label": "Menu principal"
                  }, [
                    _createElementVNode("a", {
                      href: "#/dashboard",
                      class: _normalizeClass({active:state.page==='dashboard'}),
                      "aria-current": state.page==='dashboard'?'page':undefined,
                      onClick: _withModifiers($event => (navigate('dashboard')), ["prevent"])
                    }, [(_openBlock(), _createElementBlock("svg", {
                      class: "nav-icon",
                      "aria-hidden": "true",
                      focusable: "false"
                    }, [_createElementVNode("use", { href: "/ui-icons.svg#dashboard" })])), _createTextVNode("Visão geral")], 10, ["aria-current", "onClick"]),
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
                    _createElementVNode("a", {
                      href: "#/enrollments",
                      class: _normalizeClass({active:state.page==='enrollments'}),
                      "aria-current": state.page==='enrollments'?'page':undefined,
                      onClick: _withModifiers($event => (navigate('enrollments')), ["prevent"])
                    }, [(_openBlock(), _createElementBlock("svg", {
                      class: "nav-icon",
                      "aria-hidden": "true",
                      focusable: "false"
                    }, [_createElementVNode("use", { href: "/ui-icons.svg#enrollment" })])), _createTextVNode("Matrículas")], 10, ["aria-current", "onClick"]),
                    _createElementVNode("a", {
                      href: "#/academic",
                      class: _normalizeClass({active:state.page==='academic'}),
                      "aria-current": state.page==='academic'?'page':undefined,
                      onClick: _withModifiers($event => (navigate('academic')), ["prevent"])
                    }, [(_openBlock(), _createElementBlock("svg", {
                      class: "nav-icon",
                      "aria-hidden": "true",
                      focusable: "false"
                    }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])), _createTextVNode("Estrutura acadêmica")], 10, ["aria-current", "onClick"]),
                    (can('diary.read'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 1,
                          href: "#/diary",
                          class: _normalizeClass({active:state.page==='diary'}),
                          "aria-current": state.page==='diary'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('diary')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })])), _createTextVNode("Diário Escolar")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    _createElementVNode("a", {
                      href: "#/documents",
                      class: _normalizeClass({active:state.page==='documents'}),
                      "aria-current": state.page==='documents'?'page':undefined,
                      onClick: _withModifiers($event => (navigate('documents')), ["prevent"])
                    }, [(_openBlock(), _createElementBlock("svg", {
                      class: "nav-icon",
                      "aria-hidden": "true",
                      focusable: "false"
                    }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createTextVNode("Documentação")], 10, ["aria-current", "onClick"]),
                    (can('documents.read'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 2,
                          href: "#/contracts",
                          class: _normalizeClass({active:state.page==='contracts'}),
                          "aria-current": state.page==='contracts'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('contracts')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createTextVNode("Modelos e contratos")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    _createElementVNode("a", {
                      href: "#/protocols",
                      class: _normalizeClass({active:state.page==='protocols'}),
                      "aria-current": state.page==='protocols'?'page':undefined,
                      onClick: _withModifiers($event => (navigate('protocols')), ["prevent"])
                    }, [(_openBlock(), _createElementBlock("svg", {
                      class: "nav-icon",
                      "aria-hidden": "true",
                      focusable: "false"
                    }, [_createElementVNode("use", { href: "/ui-icons.svg#protocols" })])), _createTextVNode("Protocolos")], 10, ["aria-current", "onClick"]),
                    (can('reports.read'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 3,
                          href: "#/reports",
                          class: _normalizeClass({active:state.page==='reports'}),
                          "aria-current": state.page==='reports'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('reports')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#reports" })])), _createTextVNode("Relatórios")], 10, ["aria-current", "onClick"]))
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
                          "aria-current": state.page==='online'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('online')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createTextVNode("Inscrições online")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    (can('banking.read'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 1,
                          href: "#/banking",
                          class: _normalizeClass({active:state.page==='banking'}),
                          "aria-current": state.page==='banking'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('banking')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#billing" })])), _createTextVNode("Cobranças")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    (can('connect.manage') || can('integrations.manage') || state.user?.role==='admin')
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 2,
                          class: _normalizeClass(["nav-group", {selected:integrationPages.includes(state.page)}])
                        }, [_createElementVNode("button", {
                          type: "button",
                          class: "nav-group-toggle",
                          "aria-label": "Integrações",
                          onClick: $event => (state.integrationsOpen=!state.integrationsOpen),
                          "aria-expanded": state.integrationsOpen,
                          "aria-controls": "integrations-menu"
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#connect" })])), _createElementVNode("span", null, "Integrações"), (_openBlock(), _createElementBlock("svg", {
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
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#connect" })])), _createTextVNode("WhatsApp")], 10, ["aria-current", "onClick"]))
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
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createTextVNode("E-mail / SMTP")], 10, ["aria-current", "onClick"]))
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
                            }, [_createElementVNode("use", { href: "/ui-icons.svg#bank" })])), _createTextVNode("Bancária")], 10, ["aria-current", "onClick"]))
                          : _createCommentVNode("", true)], 512), [[_vShow, state.integrationsOpen]])], 2))
                      : _createCommentVNode("", true),
                    _createElementVNode("a", {
                      href: "#/community",
                      class: _normalizeClass({active:state.page==='community'}),
                      "aria-current": state.page==='community'?'page':undefined,
                      onClick: _withModifiers($event => (navigate('community')), ["prevent"])
                    }, [(_openBlock(), _createElementBlock("svg", {
                      class: "nav-icon",
                      "aria-hidden": "true"
                    }, [_createElementVNode("use", { href: "/ui-icons.svg#online" })])), _createTextVNode("Notícias e eventos")], 10, ["aria-current", "onClick"]),
                    (can('documents.read'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 3,
                          href: "#/signatures",
                          class: _normalizeClass({active:state.page==='signatures'}),
                          "aria-current": state.page==='signatures'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('signatures')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createTextVNode("Assinaturas")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    (can('schools.manage'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 4,
                          href: "#/settings",
                          class: _normalizeClass({active:state.page==='settings'}),
                          "aria-current": state.page==='settings'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('settings')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#school" })])), _createTextVNode("Instituição")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    (can('users.manage'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 5,
                          href: "#/users",
                          class: _normalizeClass({active:state.page==='users'}),
                          "aria-current": state.page==='users'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('users')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#access" })])), _createTextVNode("Usuários e acessos")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    (state.user?.role==='admin')
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 6,
                          href: "#/legacy-import",
                          class: _normalizeClass({active:state.page==='legacy-import'}),
                          "aria-current": state.page==='legacy-import'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('legacy-import')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#documents" })])), _createTextVNode("Portabilidade de dados")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true),
                    (state.user?.role==='admin')
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 7,
                          href: "#/diagnostics",
                          class: _normalizeClass({active:state.page==='diagnostics'}),
                          onClick: _withModifiers($event => (navigate('diagnostics')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#audit" })])), _createTextVNode("Diagnóstico e logs")], 10, ["onClick"]))
                      : _createCommentVNode("", true),
                    (can('audit.read'))
                      ? (_openBlock(), _createElementBlock("a", {
                          key: 8,
                          href: "#/audit",
                          class: _normalizeClass({active:state.page==='audit'}),
                          "aria-current": state.page==='audit'?'page':undefined,
                          onClick: _withModifiers($event => (navigate('audit')), ["prevent"])
                        }, [(_openBlock(), _createElementBlock("svg", {
                          class: "nav-icon",
                          "aria-hidden": "true",
                          focusable: "false"
                        }, [_createElementVNode("use", { href: "/ui-icons.svg#audit" })])), _createTextVNode("Auditoria")], 10, ["aria-current", "onClick"]))
                      : _createCommentVNode("", true)
                  ]))
                : _createCommentVNode("", true)
            ]), _createElementVNode("div", { class: "sidebar-footer" }, [_createElementVNode("small", null, "PIGE360 · " + _toDisplayString(identity.app_version || '—'), 1)])], 2),
            _createElementVNode("div", { class: "main-column" }, [_createElementVNode("header", { class: "topbar" }, [_createElementVNode("button", {
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
            }, [_createElementVNode("use", { href: "/ui-icons.svg#menu" })]))], 8, ["onClick", "aria-expanded"]), _createElementVNode("div", { class: "school-switch" }, [_createElementVNode("span", { class: "small muted" }, "INSTITUIÇÃO ATIVA"), _withDirectives(_createElementVNode("select", {
              "aria-label": "Selecionar escola",
              "onUpdate:modelValue": $event => ((state.schoolId) = $event),
              onChange: changeSchool,
              disabled: state.busy || !!state.modal.kind || contractDirty()
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
            ])]), _createElementVNode("main", {
              id: "main-content",
              class: "main-content",
              tabindex: "-1",
              "aria-label": "Conteúdo da escola"
            }, [
              (!state.online)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "alert warning"
                  }, "Sem conexão. Reconecte-se para consultar e salvar alterações."))
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
              _createElementVNode("div", { class: "page-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "breadcrumb" }, _toDisplayString(registryPages.includes(state.page)?'Cadastros':integrationPages.includes(state.page)?'Integrações':'Secretaria') + " / " + _toDisplayString(pageLabels[state.page]), 1), _createElementVNode("h1", null, _toDisplayString(state.selectedStudent ? state.selectedStudent.person.name : pageLabels[state.page]), 1), (state.selectedStudent)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "page-subtitle"
                  }, "Ficha do aluno · " + _toDisplayString(state.selectedStudent.number), 1))
                : _createCommentVNode("", true)]), _createElementVNode("div", { class: "actions" }, [
                (state.page!=='help')
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn btn-secondary",
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
                      onClick: $event => (navigate('students'))
                    }, "← Todos os alunos", 8, ["onClick"]))
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
                    }, "+ Novo funcionário", 8, ["onClick"]))
                  : _createCommentVNode("", true),
                (state.page==='guardians' && can('people.write'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 8,
                      class: "btn btn-primary",
                      onClick: newGuardian
                    }, "+ Novo responsável", 8, ["onClick"]))
                  : _createCommentVNode("", true),
                (state.page==='enrollments' && can('enrollments.write'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 9,
                      class: "btn btn-primary",
                      onClick: newEnrollment
                    }, "+ Nova matrícula", 8, ["onClick"]))
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
                  : _createCommentVNode("", true),
                (state.page==='users' && can('users.manage'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 12,
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
              (state.page==='legacy-import' && state.user?.role==='admin')
                ? (_openBlock(), _createBlock(_component_legacy_import_panel, {
                    key: state.schoolId,
                    "school-id": state.schoolId,
                    "school-name": school()?.name || '',
                    units: state.catalogs.units || []
                  }, null, 8, ["school-id", "school-name", "units"]))
                : _createCommentVNode("", true),
              (state.page==='diagnostics' && state.user?.role==='admin')
                ? (_openBlock(), _createBlock(_component_diagnostics_panel, { key: 6 }))
                : _createCommentVNode("", true),
              (state.page==='email' && state.user?.role==='admin')
                ? (_openBlock(), _createBlock(_component_mailcow_panel, {
                    key: state.schoolId,
                    "school-id": state.schoolId
                  }, null, 8, ["school-id"]))
                : _createCommentVNode("", true),
              (state.page==='email' && state.user?.role==='admin')
                ? (_openBlock(), _createElementBlock("section", {
                    key: 8,
                    class: "panel x-card",
                    "aria-labelledby": "smtp-title"
                  }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "INTEGRAÇÕES · E-MAIL"), _createElementVNode("h2", { id: "smtp-title" }, "Envio por SMTP"), _createElementVNode("p", null, "Acompanhe a configuração de envio de mensagens da escola.")])]), (state.emailStatus==='configured')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "alert success",
                        role: "status"
                      }, "SMTP configurado na instalação."))
                    : (state.emailStatus==='missing')
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 1,
                          class: "alert warning",
                          role: "status"
                        }, "O envio de e-mail ainda não está configurado nesta instalação."))
                      : (state.emailStatus==='unavailable')
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 2,
                            class: "alert warning",
                            role: "status"
                          }, "Não foi possível consultar a configuração de SMTP. Tente novamente mais tarde."))
                        : (_openBlock(), _createElementBlock("p", {
                            key: 3,
                            class: "muted",
                            role: "status"
                          }, "Consultando configuração de SMTP…")), _createElementVNode("details", null, [_createElementVNode("summary", null, "Configuração técnica"), _createElementVNode("p", { class: "muted" }, "Configure SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM e SMTP_SECURITY no .env da instalação. Reinicie os serviços para aplicar as alterações.")])]))
                : _createCommentVNode("", true),
              (['online','banking','integrations','connect'].includes(state.page))
                ? (_openBlock(), _createBlock(_component_expansion_panel, {
                    key: state.schoolId+':'+state.page,
                    "school-id": state.schoolId,
                    page: state.page,
                    permissions: state.user.permissions
                  }, null, 8, ["school-id", "page", "permissions"]))
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
                    key: 12,
                    class: "dashboard",
                    "aria-labelledby": "guide-title"
                  }, [(!isProfileRole())
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 0,
                        class: "panel x-card"
                      }, [
                        _createElementVNode("p", { class: "eyebrow" }, "GUIA DE USO"),
                        _createElementVNode("h2", { id: "guide-title" }, "Siga a ordem da rotina escolar"),
                        _createElementVNode("p", null, "O PIGE360 trabalha com uma identidade por pessoa e perfis ligados a essa identidade. A regra reduz cadastros duplicados quando a busca é feita antes de criar um registro."),
                        _createElementVNode("p", null, "Para começar, configure a estrutura da escola; depois cadastre ou reutilize as pessoas, efetive as matrículas e opere o Diário.")
                      ]))
                    : (_openBlock(), _createElementBlock("section", {
                        key: 1,
                        class: "panel x-card"
                      }, [
                        _createElementVNode("p", { class: "eyebrow" }, "SEU PERFIL"),
                        _createElementVNode("h2", { id: "guide-title" }, "Use seu espaço escolar"),
                        (state.user.role==='teacher')
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Professores acessam somente as turmas atribuídas ao próprio usuário. Abra o Diário para registrar aulas, frequência e demais atividades permitidas."))
                          : (_openBlock(), _createElementBlock("p", { key: 1 }, "Seu painel apresenta as informações liberadas para sua conta. Se precisar corrigir dados ou pedir acesso, procure a Secretaria da escola.")),
                        (can('diary.read'))
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 2,
                              class: "btn btn-primary",
                              onClick: $event => (navigate('diary'))
                            }, "Abrir Diário Escolar", 8, ["onClick"]))
                          : _createCommentVNode("", true)
                      ])), (!isProfileRole())
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 2,
                        class: "dashboard-grid"
                      }, [
                        _createElementVNode("section", { class: "panel" }, [
                          _createElementVNode("p", { class: "eyebrow" }, "01 · PREPARAÇÃO"),
                          _createElementVNode("h2", null, "Configure a estrutura acadêmica"),
                          _createElementVNode("p", null, "Cadastre unidade, ano letivo, série, turno, turma e tipos de documento antes de iniciar as matrículas. Professores também precisam de atribuição à turma e ao componente para operar o Diário."),
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (navigate('academic'))
                          }, "Abrir Estrutura acadêmica", 8, ["onClick"])
                        ]),
                        _createElementVNode("section", { class: "panel" }, [
                          _createElementVNode("p", { class: "eyebrow" }, "02 · IDENTIDADES E PERFIS"),
                          _createElementVNode("h2", null, "Cadastre cada pessoa uma vez"),
                          _createElementVNode("p", null, [_createTextVNode("Em Cadastro único, mantenha os dados pessoais. Nas telas Alunos, Professores, Funcionários e Responsáveis, use "), _createElementVNode("strong", null, "Vincular pessoa existente"), _createTextVNode(" antes de criar. O perfil profissional ou escolar é separado dos dados de identidade.")]),
                          _createElementVNode("p", null, "Se não houver correspondência por nome ou CPF, volte à tela e crie a pessoa. Confira homônimos antes de selecionar."),
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (navigate('students'))
                          }, "Abrir Alunos", 8, ["onClick"])
                        ]),
                        _createElementVNode("section", { class: "panel" }, [
                          _createElementVNode("p", { class: "eyebrow" }, "03 · MATRÍCULA"),
                          _createElementVNode("h2", null, "Vincule aluno, turma e ano"),
                          _createElementVNode("p", null, "Crie a matrícula com aluno, turma, data e tipo de entrada. O primeiro salvamento cria um rascunho; abra os detalhes para ativar. A ativação confere vaga, documentação e vínculo legal quando exigido."),
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (navigate('enrollments'))
                          }, "Abrir Matrículas", 8, ["onClick"])
                        ]),
                        _createElementVNode("section", { class: "panel" }, [
                          _createElementVNode("p", { class: "eyebrow" }, "04 · REGISTRO PEDAGÓGICO"),
                          _createElementVNode("h2", null, "Use o Diário ao longo do período"),
                          _createElementVNode("p", null, "Configure períodos e componentes; abra o Diário da turma; registre planejamento, aulas e chamada. Lance avaliações e resultados conforme a regra escolar e consolide somente quando estiver conferido."),
                          _createElementVNode("p", null, "Pareceres, ocorrências, comunicações familiares e relatórios ficam no Diário. O fechamento é auditável; para corrigir depois, é necessária reabertura justificada."),
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (navigate('diary'))
                          }, "Abrir Diário Escolar", 8, ["onClick"])
                        ]),
                        _createElementVNode("section", { class: "panel" }, [
                          _createElementVNode("p", { class: "eyebrow" }, "05 · DOCUMENTOS E ATENDIMENTO"),
                          _createElementVNode("h2", null, "Acompanhe pendências e pedidos"),
                          _createElementVNode("p", null, "Receba e analise documentos na ficha do aluno ou em Documentação. Use Protocolos para registrar solicitações e Relatórios para emitir listagens e PDFs."),
                          _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (navigate('documents'))
                          }, "Documentação", 8, ["onClick"]), _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (navigate('protocols'))
                          }, "Protocolos", 8, ["onClick"])])
                        ]),
                        _createElementVNode("section", { class: "panel" }, [
                          _createElementVNode("p", { class: "eyebrow" }, "SE UMA OPERAÇÃO FALHAR"),
                          _createElementVNode("h2", null, "Corrija no formulário e tente novamente"),
                          _createElementVNode("p", null, "Campos obrigatórios são marcados. Em erro de validação, o formulário informa o campo e o leva até ele. Em conflito, atualize a tela e confira o cadastro antes de repetir, para evitar duplicar vínculos ou movimentos."),
                          _createElementVNode("p", null, "Se precisar de suporte, envie o código de referência exibido junto à mensagem; ele permite localizar o evento sem compartilhar dados pessoais.")
                        ])
                      ]))
                    : _createCommentVNode("", true)]))
                : _createCommentVNode("", true),
              (state.page==='dashboard' && !isProfileRole())
                ? (_openBlock(), _createElementBlock("section", {
                    key: 13,
                    class: "dashboard"
                  }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [
                    _createElementVNode("p", { class: "eyebrow" }, "ROTINA ESCOLAR EM DIA"),
                    _createElementVNode("h2", null, "Rotina da escola"),
                    _createElementVNode("p", null, "Cadastros, matrículas e pendências em um só lugar."),
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
                  ])]), _createElementVNode("div", { class: "stats-grid" }, [
                    _createElementVNode("div", { class: "stat-card" }, [
                      _createElementVNode("span", null, "Alunos cadastrados"),
                      _createElementVNode("strong", null, _toDisplayString(state.dashboard.students ?? '—'), 1),
                      _createElementVNode("small", null, "Cadastros ativos na escola"),
                      _createElementVNode("i", null, [(_openBlock(), _createElementBlock("svg", {
                        class: "ui-icon",
                        "aria-hidden": "true",
                        focusable: "false"
                      }, [_createElementVNode("use", { href: "/ui-icons.svg#students" })]))])
                    ]),
                    _createElementVNode("div", { class: "stat-card" }, [
                      _createElementVNode("span", null, "Matrículas ativas"),
                      _createElementVNode("strong", null, _toDisplayString(state.dashboard.enrollments ?? '—'), 1),
                      _createElementVNode("small", null, "Vínculos confirmados"),
                      _createElementVNode("i", null, [(_openBlock(), _createElementBlock("svg", {
                        class: "ui-icon",
                        "aria-hidden": "true",
                        focusable: "false"
                      }, [_createElementVNode("use", { href: "/ui-icons.svg#enrollment" })]))])
                    ]),
                    _createElementVNode("div", { class: "stat-card" }, [
                      _createElementVNode("span", null, "Aguardando ativação"),
                      _createElementVNode("strong", null, _toDisplayString(state.dashboard.drafts ?? '—'), 1),
                      _createElementVNode("small", null, "Matrículas em rascunho"),
                      _createElementVNode("i", { class: "amber" }, [(_openBlock(), _createElementBlock("svg", {
                        class: "ui-icon",
                        "aria-hidden": "true",
                        focusable: "false"
                      }, [_createElementVNode("use", { href: "/ui-icons.svg#clock" })]))])
                    ]),
                    _createElementVNode("div", { class: "stat-card" }, [
                      _createElementVNode("span", null, "Vagas disponíveis"),
                      _createElementVNode("strong", null, _toDisplayString(state.dashboard.available ?? '—'), 1),
                      _createElementVNode("small", null, "Nos períodos letivos ativos"),
                      _createElementVNode("i", null, [(_openBlock(), _createElementBlock("svg", {
                        class: "ui-icon",
                        "aria-hidden": "true",
                        focusable: "false"
                      }, [_createElementVNode("use", { href: "/ui-icons.svg#academic" })]))])
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
                    key: 14,
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
                        _createElementVNode("p", { class: "eyebrow" }, "ESPAÇO DO PROFESSOR"),
                        _createElementVNode("h2", null, "Suas turmas e alunos."),
                        _createElementVNode("p", null, "Consulte as turmas atribuídas a você e acompanhe a lista real de alunos de cada classe."),
                        _createElementVNode("div", { class: "actions" }, [(can('diary.read'))
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 0,
                              class: "btn btn-primary",
                              onClick: $event => (navigate('diary'))
                            }, "Abrir Diário Escolar →", 8, ["onClick"]))
                          : _createCommentVNode("", true)])
                      ]), _createElementVNode("div", {
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
                      ? (_openBlock(), _createElementBlock("div", { key: 2 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ESPAÇO DO ALUNO"), _createElementVNode("h2", null, "Acompanhe sua vida escolar."), _createElementVNode("p", null, "Este espaço mostra somente os dados escolares vinculados ao seu próprio cadastro.")]), _createElementVNode("div", {
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
                      : (_openBlock(), _createElementBlock("div", { key: 3 }, [_createElementVNode("div", { class: "welcome-card" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ESPAÇO DO RESPONSÁVEL"), _createElementVNode("h2", null, "Acompanhe os alunos vinculados à família."), _createElementVNode("p", null, "O acesso é limitado aos vínculos ativos autorizados pela instituição.")]), _createElementVNode("div", {
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
                    key: 15,
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
                                    }, "Ler para responsável", 8, ["onClick"]))
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
                                }, [_createElementVNode("span", null, [_createTextVNode(_toDisplayString(d.template_name || {student_record:'Ficha cadastral',enrollment_receipt:'Comprovante de matrícula',enrollment_declaration:'Declaração de matrícula',enrollment_form:'Ficha de matrícula'}[d.kind] || 'Documento emitido'), 1), _createElementVNode("small", null, [_createTextVNode(_toDisplayString(date(d.created_at)) + " · Modelo v" + _toDisplayString(d.template_version), 1), (d.kind==='template')
                                  ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · " + _toDisplayString({unsigned:'Sem assinatura',company_signed:'Assinado pela escola',pending_validation:'Assinatura em revisão',verified:'Assinatura conferida',rejected:'Devolvido para correção'}[d.signature_status] || 'Verificar assinaturas'), 1))
                                  : _createCommentVNode("", true)])]), _createElementVNode("div", { class: "actions" }, [(d.kind==='template' && d.enrollment_id && can('documents.read'))
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 0,
                                      class: "link-button",
                                      onClick: $event => (contractsForEnrollment(d.enrollment_id,d.id))
                                    }, "Conferir assinaturas →", 8, ["onClick"]))
                                  : _createCommentVNode("", true), _createElementVNode("button", {
                                  class: "link-button",
                                  onClick: $event => (downloadFile(d.current_file_id || d.file_id))
                                }, "Baixar PDF →", 8, ["onClick"])])]))
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
                ? (_openBlock(), _createElementBlock("section", { key: 16 }, [
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
                ? (_openBlock(), _createBlock(_component_reports_panel, {
                    key: state.schoolId,
                    "school-id": state.schoolId,
                    catalogs: state.catalogs
                  }, null, 8, ["school-id", "catalogs"]))
                : _createCommentVNode("", true),
              (state.page==='community')
                ? (_openBlock(), _createBlock(_component_school_community, {
                    key: state.schoolId,
                    "school-id": state.schoolId,
                    permissions: state.user.permissions,
                    request: request
                  }, null, 8, ["school-id", "permissions", "request"]))
                : _createCommentVNode("", true),
              (state.page==='signatures')
                ? (_openBlock(), _createBlock(_component_signing_panel, {
                    key: state.schoolId,
                    "school-id": state.schoolId,
                    permissions: state.user.permissions,
                    role: state.user.role
                  }, null, 8, ["school-id", "permissions", "role"]))
                : _createCommentVNode("", true),
              (state.page==='settings')
                ? (_openBlock(), _createElementBlock("section", { key: 20 }, [
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
                    (state.user.role==='admin')
                      ? (_openBlock(), _createElementBlock("article", {
                          key: 0,
                          class: "panel school-card"
                        }, [
                          _createElementVNode("p", { class: "eyebrow" }, "SEGURANÇA"),
                          _createElementVNode("h2", null, "Segurança da instituição"),
                          _createElementVNode("p", { class: "muted" }, "Controle a incorporação em sites autorizados e a exigência de autenticação em duas etapas."),
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: editEmbedding
                          }, "Autorizar origens de iframe", 8, ["onClick"]),
                          (state.user.role==='admin')
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-secondary",
                                onClick: editMFAPolicy
                              }, "Política de 2FA", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: editIntake
                          }, "OCR e consultas cadastrais", 8, ["onClick"])
                        ]))
                      : _createCommentVNode("", true),
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
                      _createElementVNode("details", null, [_createElementVNode("summary", null, "Ajuda para configuração"), _createElementVNode("p", { class: "small muted" }, "Se o chat não abrir, verifique no serviço de suporte a autorização para o endereço desta escola.")])
                    ]),
                    _createElementVNode("article", { class: "panel school-card" }, [
                      _createElementVNode("p", { class: "eyebrow" }, "DOCUMENTOS"),
                      _createElementVNode("h2", null, "Certificados e assinaturas"),
                      _createElementVNode("p", { class: "muted" }, "Configure o certificado A1 da escola e acompanhe as assinaturas dos documentos."),
                      _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: $event => (navigate('signatures'))
                      }, "Gerenciar assinaturas", 8, ["onClick"])
                    ])
                  ]))
                : _createCommentVNode("", true),
              _createElementVNode("footer", { class: "content-footer" }, [_createElementVNode("span", null, _toDisplayString(identity.display_name), 1), _createElementVNode("a", {
                href: '/news.html?school='+state.schoolId,
                target: "_blank",
                rel: "noopener"
              }, "Portal da escola", 8, ["href"]), _createElementVNode("span", null, "Acesso controlado · Histórico preservado")])
            ])])
          ])), (state.modal.kind)
      ? (_openBlock(), _createElementBlock("div", {
          key: 3,
          class: "modal-backdrop",
          onClick: _withModifiers(closeModal, ["self"])
        }, [_createElementVNode("section", {
          id: "main-dialog",
          class: _normalizeClass(["modal", {'modal-account':state.modal.kind==='my-profile','modal-wide':isPersonModal() || state.modal.fields.length>10 || ['enrollment-detail','protocol-detail'].includes(state.modal.kind)}]),
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
                title: lockedPersonType(type)?'Vínculo existente ou cadastro específico preservado':'Remover '+personTypeLabel(type),
                onClick: $event => (togglePersonType(type))
              }, [_createTextVNode(_toDisplayString(personTypeLabel(type)) + " ", 1), (!lockedPersonType(type))
                ? (_openBlock(), _createElementBlock("span", {
                    key: 0,
                    "aria-hidden": "true"
                  }, "×"))
                : _createCommentVNode("", true)], 8, ["disabled", "title", "onClick"]))
            }), 128)), _createElementVNode("details", null, [_createElementVNode("summary", null, "+ Adicionar tipo"), _createElementVNode("div", { class: "person-type-options" }, [_withDirectives(_createElementVNode("input", {
              type: "search",
              "onUpdate:modelValue": $event => ((state.personTypeQuery) = $event),
              "aria-label": "Buscar tipo de pessoa",
              placeholder: "Buscar tipo…"
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
              (can('documents.read'))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 2,
                    class: "actions spaced"
                  }, [_createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (contractsForEnrollment(state.modal.target.id))
                  }, "Contratos e documentos deste período →", 8, ["onClick"])]))
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
                        ], 64))]))
                  : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                      _createElementVNode("h3", null, "Autenticação em duas etapas"),
                      _createElementVNode("p", null, _toDisplayString(mfa.state.status.enabled?'2FA ativado nesta conta.':'2FA ainda não ativado nesta conta.') + " " + _toDisplayString(mfa.state.status.required?'Obrigatório pela instituição.':'Uso opcional pela instituição.'), 1),
                      (mfa.state.status.enabled)
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 0,
                            class: "small muted"
                          }, _toDisplayString(mfa.state.status.recovery_remaining) + " códigos de recuperação disponíveis.", 1))
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
                          }, [_createTextVNode("Código do autenticador ou de recuperação"), _withDirectives(_createElementVNode("input", {
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
                          }, "Gerar novos códigos", 8, ["disabled", "onClick"]), (!mfa.state.status.required)
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
                    }, [_createElementVNode("div", { class: "form-profile" }, [_createElementVNode("span", { class: "avatar" }, _toDisplayString(initials(state.modal.form.name || state.modal.target?.name || state.modal.title)), 1), _createElementVNode("strong", null, _toDisplayString(state.modal.form.name || state.modal.target?.name || 'Novo cadastro'), 1), _createElementVNode("small", null, _toDisplayString(state.modal.form.entity_kind==='organization'?'Pessoa jurídica':'Ficha cadastral'), 1)]), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(modalSections(), (section, i) => {
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
                        label: state.modal.title+' · '+(state.modal.form.name || 'novo registro'),
                        source: state.assistSource
                      }, null, 8, ["target", "fields", "request", "root", "lookup-root", "ocr", "cnpj", "mapping", "label", "source"]))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='intake-settings')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 1,
                        class: "alert info"
                      }, "OCR no worker local, sem envio de documentos a serviços externos. CNPJ e CEP consultam provedores públicos com cache e limites. Os resultados precisam de conferência; o preenchimento manual permanece disponível. O OCR não valida a autenticidade dos documentos."))
                    : _createCommentVNode("", true),
                  (state.modal.error)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 2,
                        class: "alert error preserve",
                        role: "alert"
                      }, _toDisplayString(state.modal.error), 1))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='enrollment')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 3,
                        class: "alert info"
                      }, "A matrícula será salva como rascunho. A confirmação da vaga acontece na ativação."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='draft-edit')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 4,
                        class: "alert info"
                      }, "Aluno e ano letivo são preservados. A alteração exige justificativa e permanece no histórico. Rascunhos não reservam vaga."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='protocol-note')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 5,
                        class: "alert info"
                      }, "O registro será acrescentado ao histórico sem substituir os atendimentos anteriores."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='reenroll')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 6,
                        class: "alert info"
                      }, "Será criada outra matrícula em um período posterior. A matrícula anterior não será sobrescrita."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='my-profile')
                    ? (_openBlock(), _createElementBlock("section", {
                        key: 7,
                        class: "account-summary"
                      }, [_createElementVNode("div", { class: "account-photo" }, [(!state.modal.form.remove_photo && (state.profilePhotoPreview || state.userPhotoUrl))
                        ? (_openBlock(), _createElementBlock("img", {
                            key: 0,
                            src: state.profilePhotoPreview || state.userPhotoUrl,
                            alt: "Prévia da foto"
                          }, null, 8, ["src"]))
                        : (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(initials(state.modal.form.name)), 1))]), _createElementVNode("div", null, [
                        _createElementVNode("h3", null, _toDisplayString(state.modal.form.name || 'Meu perfil'), 1),
                        _createElementVNode("p", null, _toDisplayString(label(state.user.role)) + " · " + _toDisplayString(identity.display_name), 1),
                        _createElementVNode("small", null, "O perfil de acesso e as unidades são definidos pela administração."),
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
                        }, "Segurança · 2FA", 8, ["onClick"])
                      ])]))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='mfa-policy')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 8,
                        class: "alert info mfa-policy-hint"
                      }, "A exigência vale para todas as contas desta instalação, incluindo o portal. Quem não configurou o autenticador deve ativá-lo antes de acessar dados. Alterar a política encerra as sessões abertas; desmarcar a exigência não desativa o 2FA já configurado por cada usuário."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='embedding-security')
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 9,
                        class: "embedding-notice"
                      }, [
                        _createElementVNode("button", {
                          type: "button",
                          class: "btn btn-secondary",
                          disabled: state.embeddingProbe.busy,
                          onClick: probeEmbedding
                        }, _toDisplayString(state.embeddingProbe.busy?'Verificando…':'Verificar resposta pública de iframe'), 9, ["disabled", "onClick"]),
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
                        _createElementVNode("p", { class: "alert info" }, [_createTextVNode("Informe a origem completa: "), _createElementVNode("strong", null, "https://hub-dev.argws.com.br"), _createTextVNode(". Sem caminhos, curingas ou credenciais. Cada subdomínio e porta precisam de autorização própria.")]),
                        (!state.modal.target.https_ready)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 1,
                              class: "alert warning"
                            }, "Antes de ativar: configure APP_URL com HTTPS e COOKIE_SECURE=true no ambiente da aplicação."))
                          : _createCommentVNode("", true),
                        _createElementVNode("p", { class: "small muted" }, "Origem da aplicação: " + _toDisplayString(state.modal.target.app_origin) + ". Configuração atual: " + _toDisplayString(state.modal.target.source==='environment'?'padrão do ambiente':'salva na instituição') + ".", 1),
                        _createElementVNode("p", { class: "small muted" }, "Ao mudar a lista ou a ativação, as sessões abertas serão encerradas. A nova autorização vale no próximo carregamento; o navegador continuará exigindo login. Um proxy com bloqueio próprio de iframe também precisa ser ajustado.")
                      ]))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='identity')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 10,
                        class: "alert info"
                      }, "O nome deve ter até 160 caracteres e o nome curto até 30. Logotipo e fonte: até 2 MB cada. Nenhuma fonte externa é necessária. Use uma fonte TTF ou WOFF2 estática licenciada para tela e incorporação em PDF. Sem arquivo próprio, o PDF usa uma fonte equivalente serifada ou sem serifa."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='upload')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 11,
                        class: "alert info"
                      }, "Limite padrão de 10 MB. O recebimento não substitui a validação documental pela Secretaria."))
                    : _createCommentVNode("", true),
                  (state.modal.kind==='support-hub')
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 12,
                        class: "alert info"
                      }, "A configuração pertence à mantenedora da escola ativa. O token é armazenado criptografado e nunca é devolvido na tela; o navegador recebe somente o website token necessário para inicializar o widget."))
                    : _createCommentVNode("", true),
                  (familyRelevant())
                    ? _withDirectives((_openBlock(), _createElementBlock("section", {
                        key: 13,
                        class: "family-editor",
                        "data-form-section": "links"
                      }, [
                        _createElementVNode("div", { class: "form-section-heading" }, [_createElementVNode("h3", null, "Vínculos"), _createElementVNode("p", null, "Um único relacionamento, visível na ficha do aluno e da família. Parentesco não concede responsabilidades automaticamente.")]),
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
                            }, "Adicionar vínculo", 8, ["disabled", "onClick"]))
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
                                        }, "Familiar / responsável"))
                                      : _createCommentVNode("", true), _createElementVNode("option", { value: "student" }, "Aluno")], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, dossier.state.draft.direction]])]))
                                  : _createCommentVNode("", true),
                                _createElementVNode("label", { class: "field" }, [_createTextVNode("Parentesco / relacionamento"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((dossier.state.draft.relationship) = $event) }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['Responsável','Mãe','Pai','Avó','Avô','Tia','Tio','Irmã','Irmão','Tutor(a)','Outro'], (name) => {
                                  return (_openBlock(), _createElementBlock("option", { key: name }, _toDisplayString(name), 1))
                                }), 128)), (!['Responsável','Mãe','Pai','Avó','Avô','Tia','Tio','Irmã','Irmão','Tutor(a)','Outro'].includes(dossier.state.draft.relationship))
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
                                        label: dossier.state.draft.direction==='guardian'?'familiar / responsável a vincular':'aluno a vincular'
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
                                      _createElementVNode("details", { class: "wide" }, [_createElementVNode("summary", null, "Documentos e endereço da pessoa a vincular"), _createElementVNode("div", { class: "form-grid" }, [
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("RG"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.rg) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.rg]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Órgão emissor"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.rg_issuer) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.rg_issuer]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Certidão"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.birth_certificate) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.birth_certificate]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Nome da mãe"), _withDirectives(_createElementVNode("input", {
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
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Número"), _withDirectives(_createElementVNode("input", {
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
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("País"), _withDirectives(_createElementVNode("input", {
                                          "onUpdate:modelValue": $event => ((dossier.state.draft.country) = $event),
                                          maxlength: "120"
                                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, dossier.state.draft.country]])]),
                                        _createElementVNode("label", { class: "field" }, [_createTextVNode("Endereço completo"), _withDirectives(_createElementVNode("input", {
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
                                          placeholder: "Nome ou CPF · mínimo 2 caracteres",
                                          onInput: dossier.search,
                                          onKeydown: _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])
                                        }, null, 40, ["onUpdate:modelValue", "onInput", "onKeydown"]), [[_vModelText, dossier.state.query]])]),
                                        (dossier.state.searching)
                                          ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Buscando…"))
                                          : _createCommentVNode("", true),
                                        _createElementVNode("div", { class: "family-matches" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(dossier.state.matches, (person) => {
                                          return (_openBlock(), _createElementBlock("button", {
                                            key: person.id,
                                            type: "button",
                                            onClick: $event => (dossier.choose(person))
                                          }, _toDisplayString(person.name) + " · " + _toDisplayString(cpf(person.cpf)), 9, ["onClick"]))
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
                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, dossier.state.draft.legal]]), _createTextVNode("Responsável legal")]),
                                _createElementVNode("label", null, [_withDirectives(_createElementVNode("input", {
                                  type: "checkbox",
                                  "onUpdate:modelValue": $event => ((dossier.state.draft.financial) = $event)
                                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, dossier.state.draft.financial]]), _createTextVNode("Responsável financeiro")]),
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
                              }, "Cancelar vínculo", 8, ["onClick"]), _createElementVNode("button", {
                                type: "button",
                                class: "btn btn-primary",
                                onClick: dossier.stage
                              }, "Adicionar à ficha", 8, ["onClick"])]),
                              _createElementVNode("small", null, "Será gravado junto com o cadastro ao clicar em Salvar.")
                            ]))
                          : _createCommentVNode("", true),
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(dossier.state.rows, (row) => {
                          return (_openBlock(), _createElementBlock("article", {
                            key: row.id,
                            class: _normalizeClass(["family-row", {inactive:!row.active}])
                          }, [_createElementVNode("div", null, [
                            _createElementVNode("strong", null, _toDisplayString(row.peer.name), 1),
                            _createElementVNode("span", null, _toDisplayString(row.direction==='student'?'Aluno · ':'') + _toDisplayString(row.relationship) + " · " + _toDisplayString(row.active?'Ativo':'Inativo'), 1),
                            _createElementVNode("small", null, _toDisplayString([row.legal?'Legal':'',row.financial?'Financeiro':'',row.pickup?'Retirada':'',row.primary_contact?'Contato principal':''].filter(Boolean).join(' · ') || 'Nenhuma responsabilidade adicional'), 1),
                            (dossier.state.operations[row.id])
                              ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Alteração pendente"))
                              : _createCommentVNode("", true)
                          ]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                            class: "link-button",
                            type: "button",
                            onClick: $event => (dossier.edit(row))
                          }, "Editar", 8, ["onClick"]), _createElementVNode("button", {
                            class: "link-button",
                            type: "button",
                            onClick: $event => (dossier.toggle(row))
                          }, _toDisplayString(row.local?'Remover':row.active?'Desativar':'Reativar'), 9, ["onClick"])])], 2))
                        }), 128)),
                        (!dossier.state.rows.length && !dossier.state.editor)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 3,
                              class: "small muted"
                            }, "Nenhum vínculo cadastrado."))
                          : _createCommentVNode("", true),
                        (dossier.state.page*50<dossier.state.total)
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 4,
                              class: "link-button",
                              type: "button",
                              disabled: dossier.state.loading,
                              onClick: dossier.more
                            }, "Carregar mais vínculos", 8, ["disabled", "onClick"]))
                          : _createCommentVNode("", true)
                      ], 512)), [[_vShow, visibleSection('links')]])
                    : _createCommentVNode("", true),
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(modalSections().filter(s=>s.id!=='links'), (section) => {
                    return _withDirectives((_openBlock(), _createElementBlock("section", {
                      key: section.id,
                      "data-form-section": section.id,
                      class: "form-section"
                    }, [_createElementVNode("div", { class: "form-section-heading" }, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(state.modal.kind==='my-profile'?'CONTA':isPersonModal()?'FICHA CADASTRAL':'LANÇAMENTO'), 1), _createElementVNode("h3", null, _toDisplayString(section.title), 1), _createElementVNode("p", null, _toDisplayString(section.hint), 1)]), _createElementVNode("fieldset", {
                      class: "dossier-fieldset",
                      disabled: state.busy || (dossier.eligible(state.modal.kind) && dossier.state.loading)
                    }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList([section.fields.filter(f=>!advancedPersonField(f))], (fieldGroup) => {
                      return (_openBlock(), _createElementBlock("div", { class: "form-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(fieldGroup, (f, index) => {
                        return (_openBlock(), _createElementBlock("div", {
                          key: index+'-'+f.key,
                          class: _normalizeClass(["field", {wide:f.wide, 'checkbox-field':f.type==='checkbox'}])
                        }, [(f.type==='checkbox')
                          ? (_openBlock(), _createElementBlock("label", {
                              key: 0,
                              class: "checkbox-label",
                              for: 'modal-field-'+f.key
                            }, [_withDirectives(_createElementVNode("input", {
                              id: 'modal-field-'+f.key,
                              "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                              type: "checkbox"
                            }, null, 8, ["id", "onUpdate:modelValue"]), [[_vModelCheckbox, state.modal.form[f.key]]]), _createElementVNode("span", null, _toDisplayString(modalFieldLabel(f)), 1)], 8, ["for"]))
                          : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("label", {
                              class: "field-label",
                              for: 'modal-field-'+f.key
                            }, [_createTextVNode(_toDisplayString(modalFieldLabel(f)) + " ", 1), (f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')))
                              ? (_openBlock(), _createElementBlock("b", {
                                  key: 0,
                                  class: "required",
                                  "aria-hidden": "true"
                                }, "*"))
                              : _createCommentVNode("", true), (f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')))
                              ? (_openBlock(), _createElementBlock("span", {
                                  key: 1,
                                  class: "sr-only"
                                }, " (obrigatório)"))
                              : _createCommentVNode("", true)], 8, ["for"]), (f.type==='textarea')
                              ? _withDirectives((_openBlock(), _createElementBlock("textarea", {
                                  key: 0,
                                  id: 'modal-field-'+f.key,
                                  "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                  required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                  maxlength: "4000",
                                  rows: "3"
                                }, null, 8, ["id", "onUpdate:modelValue", "required"])), [[_vModelText, state.modal.form[f.key]]])
                              : (f.type==='select' || f.type==='multiselect')
                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_withDirectives(_createElementVNode("select", {
                                    id: 'modal-field-'+f.key,
                                    "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                    required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                    multiple: f.type==='multiselect',
                                    "aria-describedby": f.type==='multiselect'?'modal-hint-'+f.key:undefined
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
                                  }), 128))], 8, ["id", "onUpdate:modelValue", "required", "multiple", "aria-describedby"]), [[_vModelSelect, state.modal.form[f.key]]]), (f.type==='multiselect')
                                    ? (_openBlock(), _createElementBlock("small", {
                                        key: 0,
                                        id: 'modal-hint-'+f.key,
                                        class: "field-hint"
                                      }, "Para selecionar mais de uma opção, use Ctrl ou ⌘ no computador.", 8, ["id"]))
                                    : _createCommentVNode("", true)], 64))
                                : (f.type==='student')
                                  ? (_openBlock(), _createElementBlock("div", {
                                      key: 2,
                                      class: "field-lookup",
                                      "aria-busy": state.studentSearchBusy
                                    }, [_createElementVNode("input", {
                                      type: "search",
                                      value: state.studentSearchQuery,
                                      placeholder: "Busque por nome ou número",
                                      "aria-label": "Filtrar alunos",
                                      "aria-describedby": 'modal-hint-'+f.key,
                                      autocomplete: "off",
                                      onInput: $event => {state.modal.form[f.key]='';searchStudents($event.target.value)},
                                      onKeydown: _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])
                                    }, null, 40, ["value", "aria-describedby", "onInput", "onKeydown"]), _withDirectives(_createElementVNode("select", {
                                      id: 'modal-field-'+f.key,
                                      "aria-label": modalFieldLabel(f),
                                      "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                      required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                      "aria-describedby": 'modal-hint-'+f.key
                                    }, [_createElementVNode("option", { value: "" }, "Selecione o aluno…"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentChoices, (s) => {
                                      return (_openBlock(), _createElementBlock("option", {
                                        key: s.id,
                                        value: s.id
                                      }, _toDisplayString(s.person.name) + " · " + _toDisplayString(s.number), 9, ["value"]))
                                    }), 128))], 8, ["id", "aria-label", "onUpdate:modelValue", "required", "aria-describedby"]), [[_vModelSelect, state.modal.form[f.key]]]), _createElementVNode("small", {
                                      id: 'modal-hint-'+f.key,
                                      class: "field-hint",
                                      role: "status",
                                      "aria-live": "polite"
                                    }, _toDisplayString(state.studentSearchMessage), 9, ["id"])], 8, ["aria-busy"]))
                                  : (f.type==='person')
                                    ? (_openBlock(), _createElementBlock("div", {
                                        key: 3,
                                        class: "field-lookup",
                                        "aria-busy": state.personSearchBusy
                                      }, [_createElementVNode("input", {
                                        type: "search",
                                        value: state.personSearchQuery,
                                        placeholder: "Busque por nome ou CPF",
                                        "aria-label": "Filtrar pessoas",
                                        "aria-describedby": 'modal-hint-'+f.key,
                                        autocomplete: "off",
                                        onInput: $event => {state.modal.form[f.key]='';searchPersons($event.target.value)},
                                        onKeydown: _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])
                                      }, null, 40, ["value", "aria-describedby", "onInput", "onKeydown"]), _withDirectives(_createElementVNode("select", {
                                        id: 'modal-field-'+f.key,
                                        "aria-label": modalFieldLabel(f),
                                        "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                        required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                        "aria-describedby": 'modal-hint-'+f.key
                                      }, [_createElementVNode("option", { value: "" }, "Selecione a pessoa…"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.personChoices, (p) => {
                                        return (_openBlock(), _createElementBlock("option", {
                                          key: p.id,
                                          value: p.id
                                        }, _toDisplayString(p.name) + " · " + _toDisplayString(cpf(p.cpf)), 9, ["value"]))
                                      }), 128))], 8, ["id", "aria-label", "onUpdate:modelValue", "required", "aria-describedby"]), [[_vModelSelect, state.modal.form[f.key]]]), _createElementVNode("small", {
                                        id: 'modal-hint-'+f.key,
                                        class: "field-hint",
                                        role: "status",
                                        "aria-live": "polite"
                                      }, _toDisplayString(state.personSearchMessage), 9, ["id"])], 8, ["aria-busy"]))
                                    : (f.type==='identity-logo' || f.type==='identity-font')
                                      ? (_openBlock(), _createElementBlock("input", {
                                          key: 4,
                                          id: 'modal-field-'+f.key,
                                          type: "file",
                                          accept: f.type==='identity-font'?'.ttf,.woff2':'.png,.jpg,.jpeg,.webp',
                                          onChange: $event => (identityFileChange($event,f.key))
                                        }, null, 40, ["id", "accept", "onChange"]))
                                      : (f.type==='user-photo')
                                        ? (_openBlock(), _createElementBlock("input", {
                                            key: 5,
                                            id: 'modal-field-'+f.key,
                                            type: "file",
                                            accept: ".png,.jpg,.jpeg,.webp",
                                            onChange: myPhotoChange
                                          }, null, 40, ["id", "onChange"]))
                                        : (f.type==='photo')
                                          ? (_openBlock(), _createElementBlock("input", {
                                              key: 6,
                                              id: 'modal-field-'+f.key,
                                              type: "file",
                                              accept: ".png,.jpg,.jpeg",
                                              required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                              onChange: fileChange
                                            }, null, 40, ["id", "required", "onChange"]))
                                          : (f.type==='file')
                                            ? (_openBlock(), _createElementBlock("input", {
                                                key: 7,
                                                id: 'modal-field-'+f.key,
                                                type: "file",
                                                accept: ".pdf,.png,.jpg,.jpeg",
                                                required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                                onChange: fileChange
                                              }, null, 40, ["id", "required", "onChange"]))
                                            : _withDirectives((_openBlock(), _createElementBlock("input", {
                                                key: 8,
                                                id: 'modal-field-'+f.key,
                                                "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                                type: f.type,
                                                required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                                min: f.type==='number'?(f.key==='workload_hours'?0:1):undefined,
                                                minlength: f.type==='password' && f.key!=='current_password'?12:undefined,
                                                maxlength: f.type==='password'?128:400,
                                                inputmode: ['cpf','cep','postal_code'].includes(f.key)?'numeric':f.type==='tel'?'tel':f.type==='email'?'email':undefined,
                                                autocomplete: f.type==='password'?(f.key==='current_password'?'current-password':'new-password'):'off'
                                              }, null, 8, ["id", "onUpdate:modelValue", "type", "required", "min", "minlength", "maxlength", "inputmode", "autocomplete"])), [[_vModelDynamic, state.modal.form[f.key]]])], 64))], 2))
                      }), 128))]))
                    }), 256)), (section.fields.some(f=>advancedPersonField(f)))
                      ? (_openBlock(), _createElementBlock("details", {
                          key: 0,
                          class: "person-complements"
                        }, [_createElementVNode("summary", null, "Dados complementares"), _createElementVNode("p", { class: "small muted" }, "Documentação complementar e informações históricas preservadas. Para associar familiares cadastrados, utilize Vínculos."), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList([section.fields.filter(f=>advancedPersonField(f))], (fieldGroup) => {
                          return (_openBlock(), _createElementBlock("div", { class: "form-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(fieldGroup, (f, index) => {
                            return (_openBlock(), _createElementBlock("div", {
                              key: index+'-'+f.key,
                              class: _normalizeClass(["field", {wide:f.wide, 'checkbox-field':f.type==='checkbox'}])
                            }, [(f.type==='checkbox')
                              ? (_openBlock(), _createElementBlock("label", {
                                  key: 0,
                                  class: "checkbox-label",
                                  for: 'modal-field-'+f.key
                                }, [_withDirectives(_createElementVNode("input", {
                                  id: 'modal-field-'+f.key,
                                  "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                  type: "checkbox"
                                }, null, 8, ["id", "onUpdate:modelValue"]), [[_vModelCheckbox, state.modal.form[f.key]]]), _createElementVNode("span", null, _toDisplayString(modalFieldLabel(f)), 1)], 8, ["for"]))
                              : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("label", {
                                  class: "field-label",
                                  for: 'modal-field-'+f.key
                                }, [_createTextVNode(_toDisplayString(modalFieldLabel(f)) + " ", 1), (f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')))
                                  ? (_openBlock(), _createElementBlock("b", {
                                      key: 0,
                                      class: "required",
                                      "aria-hidden": "true"
                                    }, "*"))
                                  : _createCommentVNode("", true), (f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')))
                                  ? (_openBlock(), _createElementBlock("span", {
                                      key: 1,
                                      class: "sr-only"
                                    }, " (obrigatório)"))
                                  : _createCommentVNode("", true)], 8, ["for"]), (f.type==='textarea')
                                  ? _withDirectives((_openBlock(), _createElementBlock("textarea", {
                                      key: 0,
                                      id: 'modal-field-'+f.key,
                                      "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                      required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                      maxlength: "4000",
                                      rows: "3"
                                    }, null, 8, ["id", "onUpdate:modelValue", "required"])), [[_vModelText, state.modal.form[f.key]]])
                                  : (f.type==='select' || f.type==='multiselect')
                                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_withDirectives(_createElementVNode("select", {
                                        id: 'modal-field-'+f.key,
                                        "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                        required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                        multiple: f.type==='multiselect',
                                        "aria-describedby": f.type==='multiselect'?'modal-hint-'+f.key:undefined
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
                                      }), 128))], 8, ["id", "onUpdate:modelValue", "required", "multiple", "aria-describedby"]), [[_vModelSelect, state.modal.form[f.key]]]), (f.type==='multiselect')
                                        ? (_openBlock(), _createElementBlock("small", {
                                            key: 0,
                                            id: 'modal-hint-'+f.key,
                                            class: "field-hint"
                                          }, "Para selecionar mais de uma opção, use Ctrl ou ⌘ no computador.", 8, ["id"]))
                                        : _createCommentVNode("", true)], 64))
                                    : (f.type==='student')
                                      ? (_openBlock(), _createElementBlock("div", {
                                          key: 2,
                                          class: "field-lookup",
                                          "aria-busy": state.studentSearchBusy
                                        }, [_createElementVNode("input", {
                                          type: "search",
                                          value: state.studentSearchQuery,
                                          placeholder: "Busque por nome ou número",
                                          "aria-label": "Filtrar alunos",
                                          "aria-describedby": 'modal-hint-'+f.key,
                                          autocomplete: "off",
                                          onInput: $event => {state.modal.form[f.key]='';searchStudents($event.target.value)},
                                          onKeydown: _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])
                                        }, null, 40, ["value", "aria-describedby", "onInput", "onKeydown"]), _withDirectives(_createElementVNode("select", {
                                          id: 'modal-field-'+f.key,
                                          "aria-label": modalFieldLabel(f),
                                          "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                          required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                          "aria-describedby": 'modal-hint-'+f.key
                                        }, [_createElementVNode("option", { value: "" }, "Selecione o aluno…"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.studentChoices, (s) => {
                                          return (_openBlock(), _createElementBlock("option", {
                                            key: s.id,
                                            value: s.id
                                          }, _toDisplayString(s.person.name) + " · " + _toDisplayString(s.number), 9, ["value"]))
                                        }), 128))], 8, ["id", "aria-label", "onUpdate:modelValue", "required", "aria-describedby"]), [[_vModelSelect, state.modal.form[f.key]]]), _createElementVNode("small", {
                                          id: 'modal-hint-'+f.key,
                                          class: "field-hint",
                                          role: "status",
                                          "aria-live": "polite"
                                        }, _toDisplayString(state.studentSearchMessage), 9, ["id"])], 8, ["aria-busy"]))
                                      : (f.type==='person')
                                        ? (_openBlock(), _createElementBlock("div", {
                                            key: 3,
                                            class: "field-lookup",
                                            "aria-busy": state.personSearchBusy
                                          }, [_createElementVNode("input", {
                                            type: "search",
                                            value: state.personSearchQuery,
                                            placeholder: "Busque por nome ou CPF",
                                            "aria-label": "Filtrar pessoas",
                                            "aria-describedby": 'modal-hint-'+f.key,
                                            autocomplete: "off",
                                            onInput: $event => {state.modal.form[f.key]='';searchPersons($event.target.value)},
                                            onKeydown: _withKeys(_withModifiers(() => {}, ["prevent"]), ["enter"])
                                          }, null, 40, ["value", "aria-describedby", "onInput", "onKeydown"]), _withDirectives(_createElementVNode("select", {
                                            id: 'modal-field-'+f.key,
                                            "aria-label": modalFieldLabel(f),
                                            "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                            required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                            "aria-describedby": 'modal-hint-'+f.key
                                          }, [_createElementVNode("option", { value: "" }, "Selecione a pessoa…"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.personChoices, (p) => {
                                            return (_openBlock(), _createElementBlock("option", {
                                              key: p.id,
                                              value: p.id
                                            }, _toDisplayString(p.name) + " · " + _toDisplayString(cpf(p.cpf)), 9, ["value"]))
                                          }), 128))], 8, ["id", "aria-label", "onUpdate:modelValue", "required", "aria-describedby"]), [[_vModelSelect, state.modal.form[f.key]]]), _createElementVNode("small", {
                                            id: 'modal-hint-'+f.key,
                                            class: "field-hint",
                                            role: "status",
                                            "aria-live": "polite"
                                          }, _toDisplayString(state.personSearchMessage), 9, ["id"])], 8, ["aria-busy"]))
                                        : (f.type==='identity-logo' || f.type==='identity-font')
                                          ? (_openBlock(), _createElementBlock("input", {
                                              key: 4,
                                              id: 'modal-field-'+f.key,
                                              type: "file",
                                              accept: f.type==='identity-font'?'.ttf,.woff2':'.png,.jpg,.jpeg,.webp',
                                              onChange: $event => (identityFileChange($event,f.key))
                                            }, null, 40, ["id", "accept", "onChange"]))
                                          : (f.type==='user-photo')
                                            ? (_openBlock(), _createElementBlock("input", {
                                                key: 5,
                                                id: 'modal-field-'+f.key,
                                                type: "file",
                                                accept: ".png,.jpg,.jpeg,.webp",
                                                onChange: myPhotoChange
                                              }, null, 40, ["id", "onChange"]))
                                            : (f.type==='photo')
                                              ? (_openBlock(), _createElementBlock("input", {
                                                  key: 6,
                                                  id: 'modal-field-'+f.key,
                                                  type: "file",
                                                  accept: ".png,.jpg,.jpeg",
                                                  required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                                  onChange: fileChange
                                                }, null, 40, ["id", "required", "onChange"]))
                                              : (f.type==='file')
                                                ? (_openBlock(), _createElementBlock("input", {
                                                    key: 7,
                                                    id: 'modal-field-'+f.key,
                                                    type: "file",
                                                    accept: ".pdf,.png,.jpg,.jpeg",
                                                    required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                                    onChange: fileChange
                                                  }, null, 40, ["id", "required", "onChange"]))
                                                : _withDirectives((_openBlock(), _createElementBlock("input", {
                                                    key: 8,
                                                    id: 'modal-field-'+f.key,
                                                    "onUpdate:modelValue": $event => ((state.modal.form[f.key]) = $event),
                                                    type: f.type,
                                                    required: f.required || (f.key==='birth_date' && selectedPersonTypes().includes('student')),
                                                    min: f.type==='number'?(f.key==='workload_hours'?0:1):undefined,
                                                    minlength: f.type==='password' && f.key!=='current_password'?12:undefined,
                                                    maxlength: f.type==='password'?128:400,
                                                    inputmode: ['cpf','cep','postal_code'].includes(f.key)?'numeric':f.type==='tel'?'tel':f.type==='email'?'email':undefined,
                                                    autocomplete: f.type==='password'?(f.key==='current_password'?'current-password':'new-password'):'off'
                                                  }, null, 8, ["id", "onUpdate:modelValue", "type", "required", "min", "minlength", "maxlength", "inputmode", "autocomplete"])), [[_vModelDynamic, state.modal.form[f.key]]])], 64))], 2))
                          }), 128))]))
                        }), 256))]))
                      : _createCommentVNode("", true)], 8, ["disabled"])], 8, ["data-form-section"])), [[_vShow, visibleSection(section.id)]])
                  }), 128))
                ])], 2), _createElementVNode("footer", { class: "modal-footer" }, [_createElementVNode("span", { class: "small muted" }, [_createTextVNode(_toDisplayString(modalDirty()?'Alterações ainda não salvas':'Preencha os campos e confirme ao salvar'), 1), _createElementVNode("small", { class: "block" }, "* Campo obrigatório")]), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary",
                  disabled: state.busy,
                  onClick: closeModal
                }, "Cancelar", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                  class: "btn btn-primary",
                  disabled: state.busy || !state.online || (dossier.eligible(state.modal.kind) && dossier.state.loading)
                }, _toDisplayString(state.busy?'Salvando…':state.modal.kind==='issue'?'Gerar e baixar PDF':'Salvar'), 9, ["disabled"])])], 40, ["onSubmit"]))], 2)], 8, ["onClick"]))
      : _createCommentVNode("", true)], 8, ["aria-busy"]))
  }
},portal:function render(_ctx, _cache) {
  with (_ctx) {
    const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, normalizeClass: _normalizeClass, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, vModelText: _vModelText, withModifiers: _withModifiers, withKeys: _withKeys, vModelCheckbox: _vModelCheckbox, resolveComponent: _resolveComponent, createBlock: _createBlock, vModelDynamic: _vModelDynamic } = _Vue

    const _component_school_community = _resolveComponent("school-community")
    const _component_learning_portal = _resolveComponent("learning-portal")
    const _component_assist_panel = _resolveComponent("assist-panel")

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
            id: "portal-error",
            tabindex: "-1",
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
        "aria-busy": state.busy,
        class: "portal-fieldset"
      }, [
        (!state.account)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "portal-intro"
            }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "MATRÍCULA ONLINE"), _createElementVNode("h1", null, [_createTextVNode("O próximo passo"), _createElementVNode("br"), _createTextVNode("começa aqui.")]), _createElementVNode("p", null, "Cadastre o aluno, envie os documentos e acompanhe cada etapa em um só lugar.")]), _createElementVNode("div", { class: "portal-process" }, [
              _createElementVNode("span", null, "1 · Cadastro"),
              _createElementVNode("span", null, "2 · Documentos"),
              _createElementVNode("span", null, "3 · Análise da escola"),
              _createElementVNode("span", null, "4 · Matrícula")
            ])]))
          : _createCommentVNode("", true),
        (state.account)
          ? (_openBlock(), _createElementBlock("nav", {
              key: 1,
              class: "portal-navigation",
              "aria-label": "Navegação do portal"
            }, [
              _createElementVNode("button", {
                type: "button",
                class: _normalizeClass({active:state.section==='admissions'}),
                "aria-current": state.section==='admissions'?'page':undefined,
                onClick: $event => (selectSection('admissions'))
              }, [_createTextVNode("Minhas matrículas"), _createElementVNode("span", null, "Inscrições e documentos")], 10, ["aria-current", "onClick"]),
              _createElementVNode("button", {
                type: "button",
                class: _normalizeClass({active:state.section==='diary'}),
                "aria-current": state.section==='diary'?'page':undefined,
                onClick: $event => (selectSection('diary'))
              }, [_createTextVNode("Diário Escolar"), _createElementVNode("span", null, "Comunicados da escola")], 10, ["aria-current", "onClick"]),
              _createElementVNode("button", {
                type: "button",
                class: _normalizeClass({active:state.section==='learning'}),
                "aria-current": state.section==='learning'?'page':undefined,
                onClick: $event => (selectSection('learning'))
              }, [_createTextVNode("Boletim"), _createElementVNode("span", null, "Notas e frequência")], 10, ["aria-current", "onClick"]),
              _createElementVNode("button", {
                type: "button",
                class: _normalizeClass({active:state.section==='community'}),
                "aria-current": state.section==='community'?'page':undefined,
                onClick: $event => (selectSection('community'))
              }, [_createTextVNode("Notícias"), _createElementVNode("span", null, "Eventos e novidades")], 10, ["aria-current", "onClick"]),
              _createElementVNode("button", {
                type: "button",
                class: _normalizeClass({active:state.section==='account'}),
                "aria-current": state.section==='account'?'page':undefined,
                onClick: $event => (selectSection('account'))
              }, [_createTextVNode("Minha conta"), _createElementVNode("span", null, "Dados e segurança")], 10, ["aria-current", "onClick"])
            ]))
          : _createCommentVNode("", true),
        (state.ready&&(!state.account||(state.section==='admissions'&&!state.selected&&!state.editing)))
          ? (_openBlock(), _createElementBlock("section", {
              key: 2,
              class: "panel x-card portal-availability",
              "aria-label": "Acesso e disponibilidade de matrícula"
            }, [(state.catalogFailed)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "alert error",
                  role: "alert"
                }, [_createElementVNode("p", null, "Não foi possível consultar a disponibilidade. Isto não significa que as inscrições estão encerradas."), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary",
                  onClick: start
                }, "Tentar novamente", 8, ["onClick"])]))
              : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                  (state.schools.length>1 && !state.account)
                    ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Unidade"), _withDirectives(_createElementVNode("select", {
                        "onUpdate:modelValue": $event => ((state.schoolId) = $event),
                        onChange: selectSchool
                      }, [_createElementVNode("option", { value: "" }, "Selecione a unidade"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.schools, (unit) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: unit.id,
                          value: unit.id
                        }, _toDisplayString(unit.name), 9, ["value"]))
                      }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.schoolId]])]))
                    : (state.schools.length)
                      ? (_openBlock(), _createElementBlock("p", { key: 1 }, _toDisplayString(state.schools.find(u=>u.id===state.schoolId)?.name||identity.display_name), 1))
                      : _createCommentVNode("", true),
                  (!state.schools.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 2,
                        role: "status"
                      }, "O portal ainda não está disponível. Entre em contato com a Secretaria."))
                    : _createCommentVNode("", true),
                  (visibleCampaigns().length>1)
                    ? (_openBlock(), _createElementBlock("label", { key: 3 }, [_createTextVNode("Processo de matrícula"), _withDirectives(_createElementVNode("select", {
                        "onUpdate:modelValue": $event => ((state.slug) = $event),
                        onChange: selectCampaign
                      }, [_createElementVNode("option", { value: "" }, "Selecione o processo"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(visibleCampaigns(), (c) => {
                        return (_openBlock(), _createElementBlock("option", {
                          key: c.id,
                          value: c.slug
                        }, _toDisplayString(c.title), 9, ["value"]))
                      }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.slug]])]))
                    : _createCommentVNode("", true),
                  (!visibleCampaigns().length && state.schoolId)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 4,
                        class: "alert info",
                        role: "status"
                      }, "Não há processo de matrícula aberto neste momento. Quem já possui conta pode entrar abaixo e acompanhar suas inscrições. Para uma nova matrícula, consulte a Secretaria."))
                    : _createCommentVNode("", true)
                ], 64)), (state.campaign)
              ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                  _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, _toDisplayString(state.campaign.title), 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(state.campaign.school_name), 1)]),
                  _createElementVNode("p", null, "Inscrições de " + _toDisplayString(date(state.campaign.opens_on)) + " a " + _toDisplayString(date(state.campaign.closes_on)) + ". " + _toDisplayString(state.campaign.accepting?'Processo aberto.':'Novas inscrições indisponíveis neste processo.'), 1),
                  (state.campaign.instructions)
                    ? (_openBlock(), _createElementBlock("details", { key: 0 }, [_createElementVNode("summary", null, "Orientações para a matrícula"), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(state.campaign.instructions), 1)]))
                    : _createCommentVNode("", true),
                  _createElementVNode("details", null, [_createElementVNode("summary", null, "Aviso de privacidade"), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(state.campaign.privacy_notice), 1)])
                ], 64))
              : _createCommentVNode("", true)]))
          : _createCommentVNode("", true),
        (!state.account && mfa.state.challenge)
          ? (_openBlock(), _createElementBlock("section", {
              key: 3,
              class: "panel x-card"
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
          : (!state.account)
            ? (_openBlock(), _createElementBlock("section", {
                key: 4,
                class: "panel x-card"
              }, [
                _createElementVNode("nav", { class: "x-tabs" }, [_createElementVNode("button", {
                  type: "button",
                  class: _normalizeClass(["btn", state.mode==='login'?'btn-primary':'btn-secondary']),
                  onClick: $event => (state.mode='login')
                }, "Entrar", 10, ["onClick"]), _createElementVNode("button", {
                  type: "button",
                  class: _normalizeClass(["btn", state.mode==='register'?'btn-primary':'btn-secondary']),
                  onClick: openRegistration,
                  disabled: !state.schoolId
                }, "Criar minha conta", 10, ["onClick", "disabled"]), _createElementVNode("button", {
                  type: "button",
                  class: "link-button",
                  onClick: $event => (state.mode='reset')
                }, "Recuperar acesso", 8, ["onClick"])]),
                (state.mode==='register'&&state.campaign?.accepting)
                  ? (_openBlock(), _createElementBlock("nav", {
                      key: 0,
                      class: "x-tabs",
                      "aria-label": "Tipo de cadastro"
                    }, [_createElementVNode("button", {
                      type: "button",
                      class: _normalizeClass(["btn", state.registerPurpose==='admission'?'btn-primary':'btn-secondary']),
                      onClick: $event => (chooseRegistrationPurpose('admission'))
                    }, "Fazer nova pré-matrícula", 10, ["onClick"]), _createElementVNode("button", {
                      type: "button",
                      class: _normalizeClass(["btn", state.registerPurpose==='portal'?'btn-primary':'btn-secondary']),
                      onClick: $event => (chooseRegistrationPurpose('portal'))
                    }, "Já tenho estudante na escola", 10, ["onClick"])]))
                  : _createCommentVNode("", true),
                (state.mode==='login')
                  ? (_openBlock(), _createElementBlock("form", {
                      key: 1,
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
                      disabled: !state.schoolId || !state.ready
                    }, "Entrar no portal", 8, ["disabled"])], 40, ["onSubmit"]))
                  : _createCommentVNode("", true),
                (state.mode==='register'&&state.registerPurpose==='admission'&&state.campaign?.accepting)
                  ? (_openBlock(), _createElementBlock("form", {
                      key: 2,
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
                        _createElementVNode("label", null, [_createTextVNode("Seu CPF (opcional neste momento)"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((state.register.cpf) = $event),
                          onBlur: $event => (state.register.cpf=formatCPF(state.register.cpf)),
                          maxlength: "14",
                          inputmode: "numeric"
                        }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, state.register.cpf]])]),
                        _createElementVNode("label", null, [_createTextVNode("WhatsApp / telefone com DDD"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((state.register.phone) = $event),
                          onBlur: $event => (state.register.phone=formatPhone(state.register.phone)),
                          placeholder: "(75) 99999-0000",
                          type: "tel",
                          maxlength: "24",
                          autocomplete: "tel"
                        }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, state.register.phone]])]),
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
                (state.mode==='register'&&state.registerPurpose==='portal')
                  ? (_openBlock(), _createElementBlock("form", {
                      key: 3,
                      onSubmit: _withModifiers(register, ["prevent"]),
                      class: "x-form"
                    }, [
                      _createElementVNode("h2", null, "Criar acesso para uma família já matriculada"),
                      _createElementVNode("p", null, "A criação da conta não cria nem altera matrícula. Confirme seu contato para consultar os comunicados dos estudantes vinculados a você."),
                      _createElementVNode("details", null, [_createElementVNode("summary", null, "Aviso de privacidade"), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(state.registrationTerms.text), 1)]),
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
                        _createElementVNode("label", null, [_createTextVNode("Seu CPF"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((state.register.cpf) = $event),
                          onBlur: $event => (state.register.cpf=formatCPF(state.register.cpf)),
                          required: "",
                          minlength: "11",
                          maxlength: "14",
                          inputmode: "numeric",
                          autocomplete: "off"
                        }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, state.register.cpf]])]),
                        _createElementVNode("label", null, [_createTextVNode("Telefone / WhatsApp"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((state.register.phone) = $event),
                          onBlur: $event => (state.register.phone=formatPhone(state.register.phone)),
                          placeholder: "(75) 99999-0000",
                          type: "tel",
                          maxlength: "24",
                          autocomplete: "tel"
                        }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, state.register.phone]])]),
                        _createElementVNode("label", null, [_createTextVNode("Endereço"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((state.register.address) = $event),
                          maxlength: "400",
                          autocomplete: "street-address"
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.register.address]])])
                      ]),
                      _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                        type: "checkbox",
                        "onUpdate:modelValue": $event => ((state.register.accept_privacy) = $event),
                        required: ""
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.register.accept_privacy]]), _createTextVNode("Li e aceito o aviso de privacidade da escola.")]),
                      _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                        type: "checkbox",
                        "onUpdate:modelValue": $event => ((state.register.whatsapp_opt_in) = $event)
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.register.whatsapp_opt_in]]), _createTextVNode("Desejo receber avisos deste processo por WhatsApp. A opção é facultativa.")]),
                      _createElementVNode("button", {
                        class: "btn btn-primary",
                        disabled: !state.schoolId||!state.registrationTerms.version
                      }, "Criar conta do responsável", 8, ["disabled"])
                    ], 40, ["onSubmit"]))
                  : _createCommentVNode("", true),
                (state.mode==='reset')
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 4,
                      class: "x-form"
                    }, [_createElementVNode("h2", null, "Recuperar minha senha"), _createElementVNode("form", { onSubmit: _withModifiers(resetRequest, ["prevent"]) }, [_createElementVNode("label", null, [_createTextVNode("E-mail da conta"), _withDirectives(_createElementVNode("input", {
                      type: "email",
                      "onUpdate:modelValue": $event => ((state.reset.email) = $event),
                      required: ""
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reset.email]])]), _createElementVNode("button", {
                      class: "btn btn-secondary",
                      disabled: !state.schoolId || !state.ready
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
            : (_openBlock(), _createElementBlock(_Fragment, { key: 5 }, [
                (state.section==='community')
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 0,
                      class: "panel x-card"
                    }, [(_openBlock(), _createBlock(_component_school_community, {
                      key: state.schoolId,
                      "portal-mode": true,
                      "school-id": state.schoolId
                    }, null, 8, ["portal-mode", "school-id"]))]))
                  : _createCommentVNode("", true),
                (state.section==='learning')
                  ? (_openBlock(), _createElementBlock("section", { key: 1 }, [(!state.diaryAccess.students.length)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "alert info"
                        }, "Para consultar notas e frequência, ative o acesso do estudante na aba Diário Escolar."))
                      : (_openBlock(), _createBlock(_component_learning_portal, {
                          key: 1,
                          request: assistRequest,
                          download: learningDownload,
                          "root-path": "/portal"
                        }, null, 8, ["request", "download"]))]))
                  : _createCommentVNode("", true),
                (state.section==='account')
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 2,
                      class: "panel x-card"
                    }, [
                      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "MINHA CONTA"), _createElementVNode("h2", null, _toDisplayString(state.account.name), 1), _createElementVNode("p", null, _toDisplayString(state.account.email) + " · " + _toDisplayString(state.account.email_verified?'E-mail confirmado':'E-mail não confirmado') + " · " + _toDisplayString(state.account.phone_verified?'Telefone confirmado':'Telefone não confirmado'), 1)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: refresh
                      }, "Atualizar", 8, ["onClick"]), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: logout
                      }, "Sair", 8, ["onClick"])])]),
                      _createElementVNode("details", {
                        id: "portal-profile",
                        open: state.profileOpen,
                        onToggle: $event => (state.profileOpen=$event.target.open)
                      }, [_createElementVNode("summary", null, "Meus dados de contato"), _createElementVNode("form", {
                        onSubmit: _withModifiers(saveProfile, ["prevent"]),
                        class: "x-form"
                      }, [
                        (state.profileOpen)
                          ? (_openBlock(), _createBlock(_component_assist_panel, {
                              key: state.account.id+state.profileReadSource,
                              target: state.account,
                              fields: personAssistFields.filter(k=>k!=='email'),
                              request: assistRequest,
                              root: "/portal",
                              label: 'responsável desta conta · '+state.account.name,
                              source: state.profileReadSource
                            }, null, 8, ["target", "fields", "request", "label", "source"]))
                          : _createCommentVNode("", true),
                        _createElementVNode("div", { class: "x-grid" }, [
                          _createElementVNode("label", null, [_createTextVNode("Seu nome"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((state.account.name) = $event),
                            required: "",
                            maxlength: "180"
                          }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.account.name]])]),
                          _createElementVNode("label", null, [_createTextVNode("CPF"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((state.account.cpf) = $event),
                            onBlur: $event => (state.account.cpf=formatCPF(state.account.cpf)),
                            maxlength: "14",
                            inputmode: "numeric"
                          }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, state.account.cpf]])]),
                          _createElementVNode("label", null, [_createTextVNode("Telefone / WhatsApp"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((state.account.phone) = $event),
                            onBlur: $event => (state.account.phone=formatPhone(state.account.phone)),
                            type: "tel",
                            maxlength: "24"
                          }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, state.account.phone]])]),
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
                        _createElementVNode("details", null, [_createElementVNode("summary", null, "Identificação e endereço detalhado do responsável"), _createElementVNode("div", { class: "x-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(detailFields, ([key,caption]) => {
                          return (_openBlock(), _createElementBlock("label", { key: key }, [_createTextVNode(_toDisplayString(caption), 1), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((state.account[key]) = $event),
                            type: key==='birth_date'?'date':'text'
                          }, null, 8, ["onUpdate:modelValue", "type"]), [[_vModelDynamic, state.account[key]]])]))
                        }), 128))])]),
                        _createElementVNode("button", { class: "btn btn-secondary" }, "Salvar meus dados")
                      ], 40, ["onSubmit"])], 40, ["open", "onToggle"]),
                      _createElementVNode("details", { onToggle: $event => ($event.target.open && mfa.manage()) }, [_createElementVNode("summary", null, "Segurança da minha conta"), _createElementVNode("section", { class: "mfa-box" }, [(mfa.state.challenge || mfa.state.codes.length)
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
                              ], 64))]))
                        : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                            _createElementVNode("h3", null, "Autenticação em duas etapas"),
                            _createElementVNode("p", null, _toDisplayString(mfa.state.status.enabled?'2FA ativado nesta conta.':'2FA ainda não ativado nesta conta.') + " " + _toDisplayString(mfa.state.status.required?'Obrigatório pela instituição.':'Uso opcional pela instituição.'), 1),
                            (mfa.state.status.enabled)
                              ? (_openBlock(), _createElementBlock("p", {
                                  key: 0,
                                  class: "small muted"
                                }, _toDisplayString(mfa.state.status.recovery_remaining) + " códigos de recuperação disponíveis.", 1))
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
                                }, [_createTextVNode("Código do autenticador ou de recuperação"), _withDirectives(_createElementVNode("input", {
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
                                }, "Gerar novos códigos", 8, ["disabled", "onClick"]), (!mfa.state.status.required)
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 0,
                                      type: "button",
                                      class: "btn btn-secondary",
                                      disabled: mfa.state.busy || !mfa.state.password || !mfa.state.code,
                                      onClick: mfa.disable
                                    }, "Desativar 2FA", 8, ["disabled", "onClick"]))
                                  : _createCommentVNode("", true)], 64))])
                          ], 64))])], 40, ["onToggle"]),
                      _createElementVNode("details", { open: !state.account.email_verified&&!state.account.phone_verified }, [_createElementVNode("summary", null, "Confirmar meu e-mail ou telefone"), _createElementVNode("p", null, "A escola pode exigir essa confirmação antes do envio. O código vence em 10 minutos."), _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("form", { onSubmit: _withModifiers(verifyRequest, ["prevent"]) }, [_createElementVNode("label", null, [_createTextVNode("Receber código por"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.verifyChannel) = $event) }, [_createElementVNode("option", { value: "email" }, "E-mail"), _createElementVNode("option", { value: "whatsapp" }, "WhatsApp informado na conta")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.verifyChannel]])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Enviar código")], 40, ["onSubmit"]), _createElementVNode("form", { onSubmit: _withModifiers(verifyConfirm, ["prevent"]) }, [_createElementVNode("label", null, [_createTextVNode("Código recebido"), _withDirectives(_createElementVNode("input", {
                        "onUpdate:modelValue": $event => ((state.code) = $event),
                        inputmode: "numeric",
                        pattern: "[0-9]{6}",
                        maxlength: "6",
                        required: "",
                        autocomplete: "one-time-code"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.code]])]), _createElementVNode("button", { class: "btn btn-primary" }, "Confirmar contato")], 40, ["onSubmit"])])], 8, ["open"])
                    ]))
                  : _createCommentVNode("", true),
                (state.section==='diary')
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 3,
                      class: "panel x-card",
                      "aria-label": "Diário Escolar e comunicados"
                    }, [
                      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ACOMPANHAMENTO ESCOLAR"), _createElementVNode("h2", null, "Diário Escolar"), _createElementVNode("p", null, "Leia comunicados pedagógicos destinados aos estudantes vinculados à sua conta.")]), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: loadDiaryPortal
                      }, "Atualizar Diário", 8, ["onClick"])]),
                      (state.diaryError)
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 0,
                            class: "alert error",
                            role: "alert"
                          }, _toDisplayString(state.diaryError), 1))
                        : (state.diaryAccess.eligible_student_count===0)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 1,
                              class: "alert info"
                            }, "Nenhum estudante está vinculado a esta conta. Confira seu CPF e confirme um contato em Minha conta. Se precisar, procure a Secretaria."))
                          : _createCommentVNode("", true),
                      (state.diaryAccess.consent_required)
                        ? (_openBlock(), _createElementBlock("section", {
                            key: 2,
                            class: "x-form"
                          }, [
                            _createElementVNode("h3", null, _toDisplayString(state.diaryAccess.students.length?'Atualizar autorização do Diário':'Ativar acesso ao Diário'), 1),
                            _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(state.diaryConsent.text), 1),
                            (state.diaryAccess.eligible_students.length)
                              ? (_openBlock(), _createElementBlock("div", { key: 0 }, [_createElementVNode("strong", null, "Esta autorização cobre os seguintes estudantes:"), _createElementVNode("ul", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.diaryAccess.eligible_students, (student) => {
                                  return (_openBlock(), _createElementBlock("li", { key: student.student_id }, [_createTextVNode(_toDisplayString(student.student_name) + " · " + _toDisplayString(student.relationship), 1), (student.access_active)
                                    ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · autorização já ativa"))
                                    : (_openBlock(), _createElementBlock("span", { key: 1 }, " · acesso será ativado"))]))
                                }), 128))])]))
                              : _createCommentVNode("", true),
                            _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                              type: "checkbox",
                              "onUpdate:modelValue": $event => ((state.diaryConsentAccepted) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.diaryConsentAccepted]]), _createTextVNode("Li e autorizo o acesso da minha conta conforme o texto acima.")]),
                            _createElementVNode("button", {
                              class: "btn btn-primary",
                              onClick: activateDiaryAccess,
                              disabled: !state.diaryConsentAccepted
                            }, _toDisplayString(state.diaryAccess.students.length?'Salvar autorização':'Ativar acesso'), 9, ["onClick", "disabled"])
                          ]))
                        : _createCommentVNode("", true),
                      (state.diaryAccess.students.length)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 3,
                            class: "x-list"
                          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.diaryAccess.students, (student) => {
                            return (_openBlock(), _createElementBlock("article", {
                              key: student.student_id,
                              class: "x-line"
                            }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(student.student_name) + " · " + _toDisplayString(student.student_number), 1), _createElementVNode("small", null, _toDisplayString(student.relationship) + " · acesso autorizado em " + _toDisplayString(date(student.consented_at)), 1)]), _createElementVNode("button", {
                              class: "btn btn-secondary small-button",
                              onClick: $event => (revokeDiaryAccess(student.student_id))
                            }, "Revogar acesso", 8, ["onClick"])]))
                          }), 128))]))
                        : _createCommentVNode("", true),
                      (state.diaryCommunications.length)
                        ? (_openBlock(), _createElementBlock("section", {
                            key: 4,
                            class: "x-list",
                            "aria-label": "Comunicados pedagógicos"
                          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.diaryCommunications, (item) => {
                            return (_openBlock(), _createElementBlock("article", {
                              key: item.id,
                              class: "x-charge"
                            }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(item.title), 1), _createElementVNode("small", null, [_createTextVNode(_toDisplayString(item.student_name) + " · " + _toDisplayString(date(item.sent_at)), 1), (item.occurrence_title)
                              ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · " + _toDisplayString(item.occurrence_title), 1))
                              : _createCommentVNode("", true)])]), _createElementVNode("span", { class: "badge" }, _toDisplayString(item.read_at?'Lido':'Novo'), 1)]), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(item.message), 1), (!item.read_at)
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  class: "btn btn-secondary small-button",
                                  onClick: $event => (markDiaryCommunicationRead(item.id))
                                }, "Marcar como lido", 8, ["onClick"]))
                              : _createCommentVNode("", true)]))
                          }), 128))]))
                        : (state.diaryAccess.students.length)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 5,
                              class: "empty"
                            }, "Não há comunicados novos ou anteriores nesta conta."))
                          : _createCommentVNode("", true)
                    ]))
                  : _createCommentVNode("", true),
                (state.section==='admissions'&&!state.selected&&!state.editing)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 4,
                      class: "panel x-card"
                    }, [
                      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ACOMPANHE CADA ETAPA"), _createElementVNode("h2", null, "Minhas inscrições")]), _createElementVNode("button", {
                        class: "btn btn-primary",
                        onClick: newAdmission,
                        disabled: !state.campaign?.accepting
                      }, "Nova pré-matrícula", 8, ["onClick", "disabled"])]),
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
                (state.section==='admissions'&&state.editing)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 5,
                      class: "panel x-card portal-wizard"
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(state.selected?'ATUALIZAR PRÉ-MATRÍCULA':'NOVA PRÉ-MATRÍCULA'), 1), _createElementVNode("h2", null, "Vamos conhecer o aluno")]), _createElementVNode("button", {
                      type: "button",
                      class: "btn btn-secondary",
                      onClick: backToAdmissions
                    }, "Voltar às inscrições", 8, ["onClick"])]), _createElementVNode("ol", {
                      class: "portal-steps",
                      "aria-label": "Etapas do cadastro"
                    }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(formSteps, (title, index) => {
                      return (_openBlock(), _createElementBlock("li", {
                        key: title,
                        class: _normalizeClass({current:state.step===index,done:state.step>index}),
                        "aria-current": state.step===index?'step':undefined
                      }, [_createElementVNode("span", null, _toDisplayString(state.step>index?'✓':index+1), 1), _createTextVNode(_toDisplayString(title), 1)], 10, ["aria-current"]))
                    }), 128))]), _createElementVNode("form", {
                      class: "x-form",
                      onSubmit: _withModifiers(nextStep, ["prevent"])
                    }, [
                      _createElementVNode("h3", {
                        id: "admission-step-title",
                        tabindex: "-1"
                      }, _toDisplayString(formSteps[state.step]), 1),
                      (state.step===0)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("p", { class: "muted" }, "Preencha conforme o documento do aluno. Nome e nascimento são obrigatórios."), _createElementVNode("details", { open: Boolean(state.assistSource) }, [_createElementVNode("summary", null, "Preencher com ajuda de um documento"), (_openBlock(), _createBlock(_component_assist_panel, {
                            key: state.assistSource,
                            target: state.form.student,
                            fields: personAssistFields,
                            request: assistRequest,
                            root: "/portal",
                            label: 'aluno · '+(state.form.student.name||'novo cadastro'),
                            source: state.assistSource
                          }, null, 8, ["target", "fields", "request", "label", "source"]))], 8, ["open"]), _createElementVNode("div", { class: "x-grid" }, [
                            _createElementVNode("label", null, [_createTextVNode("Nome completo do aluno *"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((state.form.student.name) = $event),
                              required: "",
                              minlength: "2",
                              maxlength: "180",
                              autocomplete: "off"
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.name]])]),
                            _createElementVNode("label", null, [_createTextVNode("Data de nascimento *"), _withDirectives(_createElementVNode("input", {
                              type: "date",
                              "onUpdate:modelValue": $event => ((state.form.student.birth_date) = $event),
                              max: today(),
                              required: ""
                            }, null, 8, ["onUpdate:modelValue", "max"]), [[_vModelText, state.form.student.birth_date]])]),
                            _createElementVNode("label", null, [_createTextVNode("Nome social (opcional)"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((state.form.student.social_name) = $event),
                              maxlength: "180"
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.social_name]])]),
                            _createElementVNode("label", null, [_createTextVNode("CPF do aluno (opcional)"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((state.form.student.cpf) = $event),
                              onBlur: $event => (state.form.student.cpf=formatCPF(state.form.student.cpf)),
                              inputmode: "numeric",
                              maxlength: "14",
                              placeholder: "000.000.000-00"
                            }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, state.form.student.cpf]])])
                          ])], 64))
                        : _createCommentVNode("", true),
                      (state.step===1)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                            _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Turma pretendida *"), _withDirectives(_createElementVNode("select", {
                              "onUpdate:modelValue": $event => ((state.form.class_group_id) = $event),
                              required: ""
                            }, [_createElementVNode("option", { value: "" }, "Selecione uma turma"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.campaign?.groups||[], (g) => {
                              return (_openBlock(), _createElementBlock("option", {
                                key: g.id,
                                value: g.id
                              }, _toDisplayString(g.grade) + " · " + _toDisplayString(g.name) + " · " + _toDisplayString(g.shift) + " · " + _toDisplayString(g.year) + " · " + _toDisplayString(g.unit), 9, ["value"]))
                            }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.form.class_group_id]])]), _createElementVNode("label", null, [_createTextVNode("Seu vínculo com o aluno *"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((state.form.relationship) = $event),
                              required: "",
                              minlength: "2",
                              maxlength: "60",
                              placeholder: "Ex.: mãe, pai, responsável legal"
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.relationship]])])]),
                            (selectedGroup())
                              ? (_openBlock(), _createElementBlock("div", {
                                  key: 0,
                                  class: "portal-class-summary"
                                }, [_createElementVNode("strong", null, _toDisplayString(selectedGroup().grade) + " · " + _toDisplayString(selectedGroup().shift), 1), _createElementVNode("span", null, _toDisplayString(selectedGroup().unit) + " · Ano letivo " + _toDisplayString(selectedGroup().year), 1), _createElementVNode("small", null, "A disponibilidade será confirmada pela Secretaria.")]))
                              : _createCommentVNode("", true),
                            _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Endereço do aluno"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((state.form.student.address) = $event),
                              maxlength: "400",
                              autocomplete: "street-address"
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.student.address]])]), _createElementVNode("label", null, [_createTextVNode("Escola de origem (opcional)"), _withDirectives(_createElementVNode("input", {
                              "onUpdate:modelValue": $event => ((state.form.previous_school) = $event),
                              maxlength: "180"
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.previous_school]])])]),
                            (state.account.address||state.account.street)
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 1,
                                  type: "button",
                                  class: "link-button",
                                  onClick: useGuardianAddress
                                }, "Usar o endereço do responsável", 8, ["onClick"]))
                              : _createCommentVNode("", true),
                            _createElementVNode("details", null, [_createElementVNode("summary", null, "Dados complementares e endereço detalhado"), _createElementVNode("div", { class: "x-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(detailFields.filter(([k])=>k!=='birth_date'), ([key,caption]) => {
                              return (_openBlock(), _createElementBlock("label", { key: key }, [_createTextVNode(_toDisplayString(caption), 1), _withDirectives(_createElementVNode("input", {
                                "onUpdate:modelValue": $event => ((state.form.student[key]) = $event),
                                maxlength: key==='state'?2:undefined
                              }, null, 8, ["onUpdate:modelValue", "maxlength"]), [[_vModelText, state.form.student[key]]])]))
                            }), 128))])]),
                            _createElementVNode("label", null, [_createTextVNode("Observações para a Secretaria (opcional)"), _withDirectives(_createElementVNode("textarea", {
                              "onUpdate:modelValue": $event => ((state.form.notes) = $event),
                              maxlength: "3000",
                              rows: "3",
                              placeholder: "Algo que a escola precisa saber sobre esta inscrição?"
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.form.notes]])])
                          ], 64))
                        : _createCommentVNode("", true),
                      (state.step===2)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("p", null, "Confira os dados antes de continuar para os documentos."), _createElementVNode("dl", { class: "portal-review" }, [
                            _createElementVNode("div", null, [_createElementVNode("dt", null, "Aluno"), _createElementVNode("dd", null, _toDisplayString(state.form.student.name), 1)]),
                            _createElementVNode("div", null, [_createElementVNode("dt", null, "Nascimento"), _createElementVNode("dd", null, _toDisplayString(date(state.form.student.birth_date)), 1)]),
                            (state.form.student.cpf)
                              ? (_openBlock(), _createElementBlock("div", { key: 0 }, [_createElementVNode("dt", null, "CPF do aluno"), _createElementVNode("dd", null, _toDisplayString(formatCPF(state.form.student.cpf)), 1)]))
                              : _createCommentVNode("", true),
                            _createElementVNode("div", null, [_createElementVNode("dt", null, "Turma pretendida"), _createElementVNode("dd", null, _toDisplayString(selectedGroup()?.grade) + " · " + _toDisplayString(selectedGroup()?.name) + " · " + _toDisplayString(selectedGroup()?.shift), 1)]),
                            _createElementVNode("div", null, [_createElementVNode("dt", null, "Responsável"), _createElementVNode("dd", null, _toDisplayString(state.account.name) + " · " + _toDisplayString(state.form.relationship), 1)]),
                            _createElementVNode("div", null, [_createElementVNode("dt", null, "Contato"), _createElementVNode("dd", null, [_createTextVNode(_toDisplayString(state.account.email), 1), (state.account.phone)
                              ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · " + _toDisplayString(formatPhone(state.account.phone)), 1))
                              : _createCommentVNode("", true)])]),
                            _createElementVNode("div", null, [_createElementVNode("dt", null, "Endereço do aluno"), _createElementVNode("dd", null, _toDisplayString(state.form.student.address||'Não informado'), 1)]),
                            (state.form.notes)
                              ? (_openBlock(), _createElementBlock("div", { key: 1 }, [_createElementVNode("dt", null, "Observações"), _createElementVNode("dd", { class: "preserve-lines" }, _toDisplayString(state.form.notes), 1)]))
                              : _createCommentVNode("", true)
                          ]), _createElementVNode("p", { class: "portal-hint" }, "Os dados serão salvos para você enviar os documentos. A pré-matrícula só será enviada para análise após sua confirmação na próxima tela.")], 64))
                        : _createCommentVNode("", true),
                      _createElementVNode("div", { class: "portal-form-actions" }, [(state.step>0)
                        ? (_openBlock(), _createElementBlock("button", {
                            key: 0,
                            type: "button",
                            class: "btn btn-secondary",
                            onClick: $event => {state.step--;state.error=''}
                          }, "Voltar", 8, ["onClick"]))
                        : _createCommentVNode("", true), _createElementVNode("span", null, "Etapa " + _toDisplayString(state.step+1) + " de " + _toDisplayString(formSteps.length), 1), _createElementVNode("button", { class: "btn btn-primary" }, _toDisplayString(state.step===2?'Salvar e continuar':'Continuar'), 1)])
                    ], 40, ["onSubmit"])]))
                  : _createCommentVNode("", true),
                (state.section==='admissions'&&state.selected&&!state.editing)
                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 6 }, [
                      _createElementVNode("section", { class: "panel x-card" }, [
                        _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [
                          _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(state.selected.number), 1),
                          _createElementVNode("h2", null, _toDisplayString(state.selected.student_data.name), 1),
                          _createElementVNode("p", null, _toDisplayString(state.selected.class_name) + " · " + _toDisplayString(state.selected.campaign_title), 1),
                          _createElementVNode("span", { class: "badge" }, _toDisplayString(state.selected.status_label), 1)
                        ]), _createElementVNode("div", { class: "actions" }, [
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: refresh
                          }, "Atualizar", 8, ["onClick"]),
                          _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: backToAdmissions
                          }, "← Minhas inscrições", 8, ["onClick"]),
                          (editable())
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-secondary",
                                onClick: edit
                              }, "Editar dados", 8, ["onClick"]))
                            : _createCommentVNode("", true),
                          (state.selected.status!=='draft')
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 1,
                                class: "btn btn-secondary",
                                onClick: $event => (download('/admissions/'+state.selected.id+'/receipt.pdf','recibo-inscricao.pdf'))
                              }, "Recibo da inscrição", 8, ["onClick"]))
                            : _createCommentVNode("", true)
                        ])]),
                        _createElementVNode("ol", {
                          class: "portal-steps portal-tracking",
                          "aria-label": "Andamento da matrícula"
                        }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['Dados e documentos','Análise da escola','Contrato e pagamento','Matrícula'], (title, index) => {
                          return (_openBlock(), _createElementBlock("li", {
                            key: title,
                            class: _normalizeClass({current:progressStep()===index+1,done:progressStep()>index+1}),
                            "aria-current": progressStep()===index+1?'step':undefined
                          }, [_createElementVNode("span", null, _toDisplayString(progressStep()>index+1?'✓':index+1), 1), _createTextVNode(_toDisplayString(title), 1)], 10, ["aria-current"]))
                        }), 128))]),
                        (state.selected.enrollment)
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Matrícula " + _toDisplayString(state.selected.enrollment.number) + " · " + _toDisplayString(label(state.selected.enrollment.status)), 1))
                          : _createCommentVNode("", true),
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.issued_documents.filter(item=>!state.selected?.contract?.template_id || item.template_id!==state.selected.contract.template_id), (d) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: d.id,
                            class: "x-heading"
                          }, [_createElementVNode("span", null, "Documento emitido pela escola · " + _toDisplayString(date(d.created_at)), 1), _createElementVNode("button", {
                            class: "btn btn-secondary",
                            onClick: $event => (download('/admissions/'+state.selected.id+'/issued/'+d.id,'documento-escolar.pdf'))
                          }, "Baixar documento escolar", 8, ["onClick"])]))
                        }), 128))
                      ]),
                      (state.selected.contract?.required)
                        ? (_openBlock(), _createElementBlock("section", {
                            key: 0,
                            class: "panel x-card",
                            "aria-labelledby": "contract-heading"
                          }, [_createElementVNode("h2", { id: "contract-heading" }, "Contrato da matrícula"), (!state.selected.enrollment_id)
                            ? (_openBlock(), _createElementBlock("p", { key: 0 }, "A escola disponibilizará o contrato após aprovar a inscrição."))
                            : (!state.selected.contract.issued_document_id)
                              ? (_openBlock(), _createElementBlock("p", { key: 1 }, "A escola está preparando o contrato. Você poderá baixá-lo aqui assim que estiver pronto."))
                              : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [(state.selected.contract.signature_status==='verified')
                                  ? (_openBlock(), _createElementBlock("p", {
                                      key: 0,
                                      role: "status"
                                    }, "Assinaturas verificadas. A Secretaria pode concluir a matrícula após as demais conferências."))
                                  : (state.selected.contract.signature_status==='pending_validation')
                                    ? (_openBlock(), _createElementBlock("p", {
                                        key: 1,
                                        role: "status"
                                      }, "Contrato recebido. A Secretaria está conferindo a assinatura e a identidade do responsável. A matrícula ainda não está efetivada."))
                                    : (state.selected.contract.signature_status==='rejected')
                                      ? (_openBlock(), _createElementBlock("p", {
                                          key: 2,
                                          role: "alert"
                                        }, "O PDF enviado não foi validado. Baixe novamente a versão assinada pela escola, assine e envie outro arquivo. Confira as orientações da Secretaria."))
                                      : (_openBlock(), _createElementBlock("p", { key: 3 }, "Baixe o PDF assinado pela escola. Assine este mesmo arquivo no portal Gov.br, salve o PDF resultante e envie-o abaixo. Não imprima, digitalize nem converta em imagem.")), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                                  class: "btn btn-secondary",
                                  onClick: $event => (download('/admissions/'+state.selected.id+'/issued/'+state.selected.contract.issued_document_id,'contrato-matricula.pdf'))
                                }, "Conferir contrato em PDF", 8, ["onClick"])]), (['company_signed','rejected'].includes(state.selected.contract.signature_status))
                                  ? (_openBlock(), _createElementBlock("div", { key: 4 }, [
                                      _createElementVNode("h4", null, "Como deseja assinar?"),
                                      _createElementVNode("div", {
                                        class: "actions",
                                        "aria-label": "Forma de assinatura"
                                      }, [_createElementVNode("button", {
                                        type: "button",
                                        class: "btn btn-secondary",
                                        "aria-pressed": signing.method==='a1',
                                        onClick: $event => (signing.method='a1')
                                      }, "Certificado A1", 8, ["aria-pressed", "onClick"]), _createElementVNode("button", {
                                        type: "button",
                                        class: "btn btn-secondary",
                                        "aria-pressed": signing.method==='govbr',
                                        onClick: $event => (signing.method='govbr')
                                      }, "GOV.BR", 8, ["aria-pressed", "onClick"]), _createElementVNode("button", {
                                        type: "button",
                                        class: "btn btn-secondary",
                                        "aria-pressed": signing.method==='a3',
                                        onClick: $event => (signing.method='a3')
                                      }, "Certificado A3 / PDF assinado", 8, ["aria-pressed", "onClick"])]),
                                      (signing.method==='a1')
                                        ? (_openBlock(), _createElementBlock("form", {
                                            key: 0,
                                            class: "x-form",
                                            autocomplete: "off",
                                            onSubmit: _withModifiers(signPersonalA1, ["prevent"])
                                          }, [
                                            _createElementVNode("label", null, [_createTextVNode("Seu certificado A1 (.pfx ou .p12)"), _createElementVNode("input", {
                                              id: "personal-a1",
                                              type: "file",
                                              accept: ".pfx,.p12,application/x-pkcs12",
                                              onChange: personalCertificateChange,
                                              required: ""
                                            }, null, 40, ["onChange"])]),
                                            _createElementVNode("label", null, [_createTextVNode("Senha do certificado"), _withDirectives(_createElementVNode("input", {
                                              "onUpdate:modelValue": $event => ((signing.password) = $event),
                                              type: "password",
                                              autocomplete: "off",
                                              maxlength: "256",
                                              required: ""
                                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, signing.password]])]),
                                            _createElementVNode("p", { class: "small muted" }, "O certificado e a senha serão usados apenas nesta assinatura. O CPF deve ser o mesmo do responsável pela matrícula."),
                                            _createElementVNode("label", { class: "check" }, [_withDirectives(_createElementVNode("input", {
                                              "onUpdate:modelValue": $event => ((signing.consent) = $event),
                                              type: "checkbox",
                                              required: ""
                                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, signing.consent]]), _createTextVNode("Li o contrato e autorizo sua assinatura com meu certificado.")]),
                                            _createElementVNode("button", {
                                              class: "btn btn-primary",
                                              disabled: state.busy || !signing.consent
                                            }, "Assinar e enviar à escola", 8, ["disabled"])
                                          ], 40, ["onSubmit"]))
                                        : _createCommentVNode("", true),
                                      (signing.method==='govbr')
                                        ? (_openBlock(), _createElementBlock("div", {
                                            key: 1,
                                            class: "spaced"
                                          }, [
                                            (signing.integrated)
                                              ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Autorize no GOV.BR. O documento assinado retornará automaticamente à escola."))
                                              : (_openBlock(), _createElementBlock("p", { key: 1 }, "Baixe o contrato acima, assine no serviço GOV.BR e envie o PDF assinado abaixo.")),
                                            _createElementVNode("label", { class: "check" }, [_withDirectives(_createElementVNode("input", {
                                              "onUpdate:modelValue": $event => ((signing.consent) = $event),
                                              type: "checkbox"
                                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, signing.consent]]), _createTextVNode("Li o contrato e desejo assiná-lo.")]),
                                            _createElementVNode("button", {
                                              type: "button",
                                              class: "btn btn-primary spaced",
                                              disabled: state.busy || signing.pending || !signing.consent,
                                              onClick: signGovbr
                                            }, _toDisplayString(signing.pending?'Aguardando autorização…':signing.integrated?'Entrar com GOV.BR':'Abrir assinador GOV.BR'), 9, ["disabled", "onClick"]),
                                            (signing.pending)
                                              ? (_openBlock(), _createElementBlock("p", {
                                                  key: 2,
                                                  class: "small",
                                                  role: "status"
                                                }, "Conclua a autorização na janela aberta. Esta página será atualizada automaticamente."))
                                              : _createCommentVNode("", true)
                                          ]))
                                        : _createCommentVNode("", true),
                                      (signing.method==='a3')
                                        ? (_openBlock(), _createElementBlock("div", {
                                            key: 2,
                                            class: "spaced"
                                          }, [_createElementVNode("p", null, "Baixe o contrato, assine com seu token ou cartão A3 no assinador que você utiliza e envie o PDF abaixo."), _createElementVNode("p", { class: "small muted" }, "O token A3 permanece no seu computador. Este navegador não acessa sua chave privada diretamente.")]))
                                        : _createCommentVNode("", true),
                                      (signing.method==='a3' || (signing.method==='govbr' && !signing.integrated))
                                        ? (_openBlock(), _createElementBlock("form", {
                                            key: 3,
                                            onSubmit: _withModifiers(uploadSignedContract, ["prevent"]),
                                            class: "x-form"
                                          }, [_createElementVNode("label", null, [_createTextVNode("PDF assinado pelo responsável"), _createElementVNode("input", {
                                            type: "file",
                                            accept: "application/pdf,.pdf",
                                            onChange: signedContractChange,
                                            required: ""
                                          }, null, 40, ["onChange"])]), _createElementVNode("button", {
                                            class: "btn btn-primary",
                                            type: "submit",
                                            disabled: state.busy
                                          }, "Enviar contrato assinado", 8, ["disabled"])], 40, ["onSubmit"]))
                                        : _createCommentVNode("", true)
                                    ]))
                                  : _createCommentVNode("", true)], 64))]))
                        : _createCommentVNode("", true),
                      _createElementVNode("section", { class: "panel x-card" }, [
                        _createElementVNode("h2", null, "Documentos do aluno"),
                        (state.selected.document_types.length)
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, _toDisplayString(editable()?'Envie arquivos PDF, PNG ou JPEG legíveis. Para corrigir um documento, envie um novo arquivo do mesmo tipo.':'Confira os documentos enviados e as orientações da Secretaria.'), 1))
                          : (_openBlock(), _createElementBlock("p", {
                              key: 1,
                              class: "portal-hint"
                            }, "A escola não solicitou anexos para esta inscrição. Você já pode concluir o envio.")),
                        _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.document_types, (d) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: d.id,
                            class: "x-line"
                          }, [_createElementVNode("span", null, _toDisplayString(d.name) + " " + _toDisplayString(d.required?'· obrigatório':''), 1), _createElementVNode("span", null, _toDisplayString(documentStatus(d.id)), 1)]))
                        }), 128))]),
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.attachments, (a) => {
                          return (_openBlock(), _createElementBlock("div", {
                            key: a.id,
                            class: "x-line"
                          }, [
                            _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(a.original_name), 1), _createElementVNode("small", null, _toDisplayString(label(a.review_status)) + " · " + _toDisplayString(a.review_note), 1)]),
                            (editable())
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  class: "btn btn-secondary small-button",
                                  onClick: $event => (readAttachment(a.id,'student'))
                                }, "Preencher dados do aluno", 8, ["onClick"]))
                              : _createCommentVNode("", true),
                            _createElementVNode("button", {
                              class: "btn btn-secondary small-button",
                              onClick: $event => (readAttachment(a.id,'guardian'))
                            }, "Preencher meus dados", 8, ["onClick"]),
                            _createElementVNode("button", {
                              class: "btn btn-secondary small-button",
                              onClick: $event => (download('/admissions/'+state.selected.id+'/attachments/'+a.id,a.original_name))
                            }, "Abrir arquivo", 8, ["onClick"])
                          ]))
                        }), 128)),
                        (editable()&&state.selected.document_types.length)
                          ? (_openBlock(), _createElementBlock("form", {
                              key: 2,
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
                            }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.documentType]])]), _createElementVNode("label", null, [_createTextVNode("Arquivo"), (_openBlock(), _createElementBlock("input", {
                              key: state.selected.version,
                              type: "file",
                              accept: "image/jpeg,image/png,application/pdf",
                              onChange: fileChange,
                              required: ""
                            }, null, 40, ["onChange"]))])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Enviar documento")], 40, ["onSubmit"]))
                          : _createCommentVNode("", true)
                      ]),
                      (editable())
                        ? (_openBlock(), _createElementBlock("section", {
                            key: 1,
                            class: "panel x-card portal-submit"
                          }, [
                            _createElementVNode("h2", null, "Pronto para enviar?"),
                            _createElementVNode("p", null, "Confira os dados do aluno e os documentos. Depois do envio, acompanhe a resposta da escola por aqui."),
                            (submissionIssues().length)
                              ? (_openBlock(), _createElementBlock("div", {
                                  key: 0,
                                  class: "alert warning"
                                }, [_createElementVNode("strong", null, "Antes de continuar:"), _createElementVNode("ul", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(submissionIssues(), (issue) => {
                                  return (_openBlock(), _createElementBlock("li", { key: issue }, _toDisplayString(issue), 1))
                                }), 128))]), (state.campaign?.require_verified_contact&&!state.account.email_verified&&!state.account.phone_verified)
                                  ? (_openBlock(), _createElementBlock("button", {
                                      key: 0,
                                      type: "button",
                                      class: "btn btn-secondary small-button",
                                      onClick: $event => (selectSection('account'))
                                    }, "Confirmar meu contato", 8, ["onClick"]))
                                  : _createCommentVNode("", true)]))
                              : _createCommentVNode("", true),
                            _createElementVNode("details", null, [_createElementVNode("summary", null, "Revisar os dados da inscrição"), _createElementVNode("dl", { class: "portal-review" }, [
                              _createElementVNode("div", null, [_createElementVNode("dt", null, "Aluno"), _createElementVNode("dd", null, _toDisplayString(state.selected.student_data.name), 1)]),
                              _createElementVNode("div", null, [_createElementVNode("dt", null, "Nascimento"), _createElementVNode("dd", null, _toDisplayString(date(state.selected.student_data.birth_date)), 1)]),
                              _createElementVNode("div", null, [_createElementVNode("dt", null, "Turma"), _createElementVNode("dd", null, _toDisplayString(state.selected.class_name), 1)]),
                              _createElementVNode("div", null, [_createElementVNode("dt", null, "Responsável"), _createElementVNode("dd", null, _toDisplayString(state.account.name) + " · " + _toDisplayString(state.selected.relationship), 1)]),
                              _createElementVNode("div", null, [_createElementVNode("dt", null, "Endereço do aluno"), _createElementVNode("dd", null, _toDisplayString(state.selected.student_data.address||'Não informado'), 1)])
                            ])]),
                            _createElementVNode("details", null, [_createElementVNode("summary", null, "Aviso de privacidade"), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(state.campaign?.privacy_notice), 1)]),
                            _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                              type: "checkbox",
                              "onUpdate:modelValue": $event => ((state.acceptTerms) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.acceptTerms]]), _createTextVNode("Li o aviso de privacidade e confirmo os dados informados.")]),
                            _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                              type: "checkbox",
                              "onUpdate:modelValue": $event => ((state.legal) = $event)
                            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.legal]]), _createTextVNode("Declaro ser responsável legal ou representante autorizado do aluno e solicito a análise da inscrição.")]),
                            _createElementVNode("button", {
                              class: "btn btn-primary",
                              onClick: submit,
                              disabled: !state.acceptTerms||!state.legal||submissionIssues().length>0
                            }, "Enviar pré-matrícula", 8, ["onClick", "disabled"]),
                            _createElementVNode("p", { class: "muted" }, "A aprovação, a disponibilidade de vaga e a efetivação serão informadas neste portal.")
                          ]))
                        : _createCommentVNode("", true),
                      (state.charges.length)
                        ? (_openBlock(), _createElementBlock("section", {
                            key: 2,
                            class: "panel x-card"
                          }, [_createElementVNode("h2", null, "Cobranças vinculadas"), _createElementVNode("p", null, "Confira o beneficiário antes de pagar. A situação será atualizada após a confirmação do pagamento."), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.charges, (c) => {
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
                      _createElementVNode("section", { class: "panel x-card" }, [
                        _createElementVNode("h2", null, "Atendimento e histórico"),
                        _createElementVNode("div", { class: "x-timeline" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.messages, (m) => {
                          return (_openBlock(), _createElementBlock("article", { key: m.id }, [_createElementVNode("small", null, _toDisplayString(date(m.created_at)) + " · " + _toDisplayString(m.account_id?'Responsável':'Secretaria'), 1), _createElementVNode("p", { class: "preserve-lines" }, _toDisplayString(m.text), 1)]))
                        }), 128))]),
                        (!state.selected.messages.length)
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 0,
                              class: "muted"
                            }, "As mensagens da escola e suas solicitações aparecerão aqui."))
                          : _createCommentVNode("", true),
                        (!['rejected','withdrawn'].includes(state.selected.status))
                          ? (_openBlock(), _createElementBlock("form", {
                              key: 1,
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
                              : _createCommentVNode("", true)])], 40, ["onSubmit"]))
                          : _createCommentVNode("", true)
                      ])
                    ], 64))
                  : _createCommentVNode("", true)
              ], 64))
      ], 8, ["disabled", "aria-busy"]),
      (state.busy)
        ? (_openBlock(), _createElementBlock("p", {
            key: 4,
            class: "portal-working",
            role: "status"
          }, "Processando sua solicitação…"))
        : _createCommentVNode("", true)
    ]), _createElementVNode("footer", { class: "portal-footer" }, _toDisplayString(identity.display_name) + " · Atendimento escolar", 1)]))
  }
},expansion:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, renderList: _renderList, Fragment: _Fragment, createTextVNode: _createTextVNode, normalizeClass: _normalizeClass, vModelText: _vModelText, withDirectives: _withDirectives, vModelCheckbox: _vModelCheckbox, vModelSelect: _vModelSelect, withModifiers: _withModifiers, Teleport: _Teleport, createBlock: _createBlock } = _Vue

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
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
              (s.readiness)
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card",
                    "aria-label": "Disponibilidade da matrícula online"
                  }, [
                    _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Matrícula online · " + _toDisplayString(s.readiness.ready?'Disponível':'Configuração pendente'), 1), _createElementVNode("p", null, _toDisplayString(s.readiness.ready?'O portal está pronto para receber inscrições.':'Conclua os itens abaixo para abrir as inscrições.'), 1)]), _createElementVNode("a", {
                      class: "btn btn-secondary",
                      href: '/online.html?school='+props.schoolId,
                      target: "_blank",
                      rel: "noopener"
                    }, "Ver portal", 8, ["href"])]),
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.readiness.issues, (issue) => {
                      return (_openBlock(), _createElementBlock("p", {
                        key: issue.code,
                        class: "alert warning"
                      }, _toDisplayString(issue.message), 1))
                    }), 128)),
                    (!s.readiness.ready)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "actions"
                        }, [_createElementVNode("a", {
                          class: "btn btn-secondary",
                          href: "#/academic"
                        }, "Estrutura acadêmica"), (can('admissions.manage'))
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 0,
                              type: "button",
                              class: "btn btn-primary",
                              onClick: newCampaign
                            }, "Configurar processo de matrícula", 8, ["onClick"]))
                          : _createCommentVNode("", true), _createElementVNode("button", {
                          type: "button",
                          class: "btn btn-secondary",
                          onClick: $event => (s.tab='campaigns')
                        }, "Revisar processos existentes", 8, ["onClick"])]))
                      : _createCommentVNode("", true),
                    (s.readiness.campaigns.length)
                      ? (_openBlock(), _createElementBlock("details", { key: 1 }, [_createElementVNode("summary", null, "Conferir publicação e disponibilidade por processo"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.readiness.campaigns, (c) => {
                          return (_openBlock(), _createElementBlock("p", { key: c.id }, [_createElementVNode("strong", null, _toDisplayString(c.title), 1), _createTextVNode(" · " + _toDisplayString(c.ready?'Disponível':c.reasons.map(r=>({not_published:'Não publicado',not_started:'Abertura futura',closed:'Prazo encerrado',no_active_groups:'Sem turma ativa em ano letivo ativo',inactive_school:'Unidade inativa'}[r]||r)).join(' · ')), 1)]))
                        }), 128))]))
                      : _createCommentVNode("", true)
                  ]))
                : _createCommentVNode("", true),
              (s.tab==='queue'&&!s.selected)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 1,
                    class: "stats-grid"
                  }, [
                    _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Enviadas"), _createElementVNode("strong", null, _toDisplayString(s.counts.submitted||0), 1), _createElementVNode("small", null, "Aguardando análise inicial")]),
                    _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Em análise"), _createElementVNode("strong", null, _toDisplayString(s.counts.under_review||0), 1), _createElementVNode("small", null, "Em atendimento pela equipe")]),
                    _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Lista de espera"), _createElementVNode("strong", null, _toDisplayString(s.counts.waitlisted||0), 1), _createElementVNode("small", null, "Sem garantia de vaga")]),
                    _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Efetivadas pelo portal"), _createElementVNode("strong", null, _toDisplayString(s.counts.enrolled||0), 1), _createElementVNode("small", null, "Comprovante emitido")])
                  ]))
                : _createCommentVNode("", true),
              _createElementVNode("nav", { class: "x-tabs" }, [
                _createElementVNode("button", {
                  class: _normalizeClass(["btn", s.tab==='queue'?'btn-primary':'btn-secondary']),
                  onClick: $event => (s.tab='queue')
                }, "Inscrições recebidas", 10, ["onClick"]),
                _createElementVNode("button", {
                  class: _normalizeClass(["btn", s.tab==='campaigns'?'btn-primary':'btn-secondary']),
                  onClick: $event => (s.tab='campaigns')
                }, "Processos e link público", 10, ["onClick"]),
                _createElementVNode("a", {
                  href: '/online.html?school='+props.schoolId,
                  target: "_blank",
                  rel: "noopener",
                  class: "btn btn-secondary"
                }, "Abrir portal dos responsáveis ↗", 8, ["href"]),
                _createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => (run(load))
                }, "Atualizar", 8, ["onClick"])
              ]),
              (s.tab==='campaigns')
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Processos de matrícula online"), _createElementVNode("p", null, "Defina prazo, ofertas e regras. Os pais acessam apenas o processo publicado.")]), (can('admissions.manage'))
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
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [
                      _createElementVNode("h3", null, _toDisplayString(c.title), 1),
                      _createElementVNode("p", null, _toDisplayString(date(c.opens_on)) + " a " + _toDisplayString(date(c.closes_on)) + " · " + _toDisplayString(c.active?'Publicado':'Não publicado'), 1),
                      _createElementVNode("p", null, _toDisplayString(c.groups.length) + " oferta(s) · Versão do aviso: " + _toDisplayString(c.terms_version), 1),
                      _createElementVNode("p", null, "Contrato: " + _toDisplayString(c.contract_template_id?templateName(c.contract_template_id):"não exigido neste processo"), 1)
                    ]), _createElementVNode("div", { class: "actions" }, [(can('admissions.manage'))
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
                        class: "panel x-card",
                        "aria-label": "Configurar processo de matrícula"
                      }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, _toDisplayString(s.campaignForm.id?'Editar processo':'Novo processo'), 1), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        onClick: $event => (s.editingCampaign=false)
                      }, "Fechar", 8, ["onClick"])]), _createElementVNode("form", {
                        onSubmit: _withModifiers(saveCampaign, ["prevent"]),
                        class: "x-form"
                      }, [
                        _createElementVNode("div", { class: "x-grid" }, [
                          _createElementVNode("label", null, [_createTextVNode("Nome do processo"), _withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((s.campaignForm.title) = $event),
                            onBlur: campaignSlug,
                            minlength: "4",
                            maxlength: "160",
                            required: ""
                          }, null, 40, ["onUpdate:modelValue", "onBlur"]), [[_vModelText, s.campaignForm.title]])]),
                          _createElementVNode("label", null, [_createTextVNode("Endereço do link público"), _withDirectives(_createElementVNode("input", {
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
                            min: s.campaignForm.opens_on,
                            required: ""
                          }, null, 8, ["onUpdate:modelValue", "min"]), [[_vModelText, s.campaignForm.closes_on]])])
                        ]),
                        _createElementVNode("h3", null, "Orientações e turmas"),
                        _createElementVNode("label", null, [_createTextVNode("Instruções para os responsáveis"), _withDirectives(_createElementVNode("textarea", {
                          "onUpdate:modelValue": $event => ((s.campaignForm.instructions) = $event),
                          maxlength: "5000",
                          rows: "3"
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.instructions]])]),
                        _createElementVNode("fieldset", { class: "x-choice" }, [_createElementVNode("legend", null, "Turmas oferecidas (mesmo ano letivo)"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(campaignGroups(), (g) => {
                          return (_openBlock(), _createElementBlock("label", {
                            key: g.id,
                            class: "x-check"
                          }, [_withDirectives(_createElementVNode("input", {
                            type: "checkbox",
                            "onUpdate:modelValue": $event => ((s.campaignForm.class_group_ids) = $event),
                            value: g.id
                          }, null, 8, ["onUpdate:modelValue", "value"]), [[_vModelCheckbox, s.campaignForm.class_group_ids]]), _createTextVNode(_toDisplayString(campaignGroupLabel(g)) + " · " + _toDisplayString(g.available) + " vaga(s)", 1)]))
                        }), 128)), (!campaignGroups().length)
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Não há turmas disponíveis. Cadastre uma turma ativa na Estrutura acadêmica."))
                          : _createCommentVNode("", true)]),
                        _createElementVNode("h3", null, "Contrato e requisitos"),
                        _createElementVNode("label", null, [_createTextVNode("Modelo de contrato para este processo"), _withDirectives(_createElementVNode("select", {
                          "onUpdate:modelValue": $event => ((s.campaignForm.contract_template_id) = $event),
                          disabled: !can('documents.read')
                        }, [_createElementVNode("option", { value: "" }, "Sem contrato digital obrigatório"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(eligibleContractTemplates(), (template) => {
                          return (_openBlock(), _createElementBlock("option", {
                            key: template.id,
                            value: template.id
                          }, _toDisplayString(template.name) + " · versão " + _toDisplayString(template.version) + " · " + _toDisplayString(template.academic_year_id?"ano específico":"todos os anos"), 9, ["value"]))
                        }), 128))], 8, ["onUpdate:modelValue", "disabled"]), [[_vModelSelect, s.campaignForm.contract_template_id]])]),
                        (s.campaignForm.contract_template_id && !eligibleContractTemplates().some(t=>t.id===s.campaignForm.contract_template_id))
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 0,
                              class: "alert warning"
                            }, "O modelo anterior não está ativo ou não atende ao ano letivo destas turmas. Selecione outro modelo antes de salvar."))
                          : _createCommentVNode("", true),
                        _createElementVNode("p", { class: "small muted" }, "O modelo deve estar ativo e ser compatível com o ano letivo. Cada inscrição manterá a versão do contrato aprovada pela escola."),
                        _createElementVNode("details", null, [_createElementVNode("summary", null, "Aviso de privacidade e versão dos termos"), _createElementVNode("label", null, [_createTextVNode("Aviso de privacidade da instituição"), _withDirectives(_createElementVNode("textarea", {
                          "onUpdate:modelValue": $event => ((s.campaignForm.privacy_notice) = $event),
                          required: "",
                          minlength: "40",
                          maxlength: "10000",
                          rows: "5",
                          placeholder: "Informe finalidade, contato da instituição, tratamento e orientações sobre os dados coletados."
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.privacy_notice]])]), _createElementVNode("label", null, [_createTextVNode("Versão dos termos"), _withDirectives(_createElementVNode("input", {
                          "onUpdate:modelValue": $event => ((s.campaignForm.terms_version) = $event),
                          maxlength: "40",
                          required: ""
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.campaignForm.terms_version]])])]),
                        _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                          type: "checkbox",
                          "onUpdate:modelValue": $event => ((s.campaignForm.require_verified_contact) = $event)
                        }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.campaignForm.require_verified_contact]]), _createTextVNode("Solicitar confirmação de e-mail ou telefone antes do envio")]),
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
                        _createElementVNode("p", { class: "muted" }, "Se exigir confirmação de contato, configure o envio de e-mail ou WhatsApp em Integrações antes da publicação."),
                        _createElementVNode("button", {
                          class: "btn btn-primary",
                          disabled: !s.campaignForm.class_group_ids.length
                        }, "Salvar processo", 8, ["disabled"])
                      ], 40, ["onSubmit"])]))
                    : _createCommentVNode("", true)], 64))
                : (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [(!s.selected)
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
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "empty"
                            }, [_createElementVNode("strong", null, _toDisplayString(s.q||s.status?'Nenhuma inscrição encontrada':'Aguardando as primeiras inscrições'), 1), _createElementVNode("p", null, _toDisplayString(s.q||s.status?'Ajuste a pesquisa ou a situação selecionada.':'Publique um processo e compartilhe o link do portal com as famílias.'), 1)]))
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
                        (s.selected.contract?.required)
                          ? (_openBlock(), _createElementBlock("section", {
                              key: 0,
                              class: "panel x-card"
                            }, [
                              _createElementVNode("h2", null, "Contrato desta matrícula"),
                              _createElementVNode("p", null, [_createTextVNode("Modelo " + _toDisplayString(templateName(s.selected.contract.template_id)) + " · revisão congelada v" + _toDisplayString(selectedContractVersion()), 1), (s.selected.contract_template_revision_sha256)
                                ? (_openBlock(), _createElementBlock("span", {
                                    key: 0,
                                    class: "mono small"
                                  }, " · SHA-256 " + _toDisplayString(s.selected.contract_template_revision_sha256), 1))
                                : _createCommentVNode("", true)]),
                              _createElementVNode("p", { class: "alert info" }, "A revisão foi preservada na aprovação. Alterar o modelo depois não muda este contrato. A escola assina primeiro com A1; a família recebe a via assinada para adicionar sua assinatura. A efetivação aguarda a conferência da Direção."),
                              (s.selected.contract.issued_document_id)
                                ? (_openBlock(), _createElementBlock("div", { key: 0 }, [_createElementVNode("p", null, [_createTextVNode("Situação: "), _createElementVNode("strong", null, _toDisplayString(contractStatus(s.selected.contract.signature_status)), 1)]), _createElementVNode("button", {
                                    type: "button",
                                    class: "btn btn-secondary",
                                    onClick: downloadSignedContract
                                  }, "Baixar PDF assinado atual", 8, ["onClick"]), (s.selected.contract.signature_status==='pending_validation')
                                    ? (_openBlock(), _createElementBlock("p", {
                                        key: 0,
                                        class: "small muted"
                                      }, "A revisão está na fila de Assinaturas e revisão do menu Modelos e contratos."))
                                    : _createCommentVNode("", true)]))
                                : (s.selected.status==='approved' && can('documents.generate'))
                                  ? (_openBlock(), _createElementBlock("div", { key: 1 }, [_createElementVNode("button", {
                                      type: "button",
                                      class: "btn btn-secondary",
                                      onClick: previewFrozenContract,
                                      disabled: s.busy
                                    }, _toDisplayString(s.contractPreview?'Atualizar prévia':'Preparar contrato'), 9, ["onClick", "disabled"]), (s.contractPreview)
                                      ? (_openBlock(), _createElementBlock("div", {
                                          key: 0,
                                          class: "x-form spaced"
                                        }, [
                                          (s.contractPreview.missing_fields.length)
                                            ? (_openBlock(), _createElementBlock("p", {
                                                key: 0,
                                                class: "alert warning"
                                              }, "Preencha " + _toDisplayString(s.contractPreview.missing_fields.length) + " campo(s) pendente(s) e atualize a prévia.", 1))
                                            : _createCommentVNode("", true),
                                          (s.contractPreviewStale)
                                            ? (_openBlock(), _createElementBlock("p", {
                                                key: 1,
                                                class: "alert info"
                                              }, "Valores alterados. Atualize a prévia antes de emitir."))
                                            : _createCommentVNode("", true),
                                          _createElementVNode("div", { class: "x-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(contractPreviewKeys(), (key) => {
                                            return (_openBlock(), _createElementBlock("label", { key: key }, [_createTextVNode(_toDisplayString(contractFieldLabel(key)) + " ", 1), _createElementVNode("small", { class: "muted" }, _toDisplayString(key) + " · " + _toDisplayString(contractAutomatic(key)?'do cadastro':'desta emissão'), 1), _createElementVNode("input", {
                                              value: contractValue(key),
                                              readonly: contractAutomatic(key),
                                              onInput: $event => (setContractValue(key,$event)),
                                              maxlength: "2000",
                                              autocomplete: "off"
                                            }, null, 40, ["value", "readonly", "onInput"])]))
                                          }), 128))]),
                                          _createElementVNode("div", {
                                            class: "contract-paper panel",
                                            "aria-label": "Prévia textual da revisão congelada"
                                          }, [_createElementVNode("div", { class: "contract-paper-head" }, [_createElementVNode("strong", null, _toDisplayString(identity.display_name) + " · versão " + _toDisplayString(s.contractPreview.template_version), 1)]), _createElementVNode("div", { class: "contract-paper-content preserve" }, [(s.contractPreview.header)
                                            ? (_openBlock(), _createElementBlock("p", { key: 0 }, _toDisplayString(s.contractPreview.header), 1))
                                            : _createCommentVNode("", true), _createElementVNode("p", null, _toDisplayString(s.contractPreview.content), 1), (s.contractPreview.footer)
                                            ? (_openBlock(), _createElementBlock("p", { key: 1 }, _toDisplayString(s.contractPreview.footer), 1))
                                            : _createCommentVNode("", true)])]),
                                          _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                                            type: "button",
                                            class: "btn btn-secondary",
                                            disabled: s.busy || s.contractPreviewStale,
                                            onClick: previewFrozenPdf
                                          }, "Conferir PDF timbrado", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                                            type: "button",
                                            class: "btn btn-primary",
                                            disabled: s.busy || s.contractPreviewStale || !!s.contractPreview.missing_fields.length,
                                            onClick: issueFrozenContract
                                          }, "Emitir revisão congelada e assinar com A1", 8, ["disabled", "onClick"])])
                                        ]))
                                      : _createCommentVNode("", true)]))
                                  : (!s.selected.contract.issued_document_id)
                                    ? (_openBlock(), _createElementBlock("p", {
                                        key: 2,
                                        class: "small muted"
                                      }, "O contrato pode ser emitido após a aprovação e a criação da matrícula em preparação."))
                                    : _createCommentVNode("", true)
                            ]))
                          : _createCommentVNode("", true),
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
                            }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(a.original_name), 1), _createElementVNode("p", null, _toDisplayString(label(a.review_status)) + " · " + _toDisplayString(a.review_note), 1), _createElementVNode("details", null, [_createElementVNode("summary", null, "Informações do arquivo"), _createElementVNode("small", null, "Identificação de integridade: " + _toDisplayString(a.sha256), 1)])]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
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
                              }, [_createElementVNode("label", null, [_createTextVNode("Movimentar análise"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.action) = $event) }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(admissionActions(), (item) => {
                                return (_openBlock(), _createElementBlock("option", {
                                  key: item.value,
                                  value: item.value
                                }, _toDisplayString(item.label), 9, ["value"]))
                              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.action]])]), _createElementVNode("button", {
                                class: "btn btn-secondary",
                                disabled: s.reason.length<3
                              }, "Aplicar com justificativa", 8, ["disabled"])], 40, ["onSubmit"]))
                            : _createCommentVNode("", true),
                          (can('admissions.write')&&can('enrollments.write')&&['submitted','under_review','waitlisted'].includes(s.selected.status))
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
                          (can('admissions.write')&&can('enrollments.write')&&s.selected.status==='approved')
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 3,
                                class: "x-form"
                              }, [_createElementVNode("p", null, "A efetivação verifica vagas, documentos obrigatórios e pagamentos exigidos. O comprovante será disponibilizado ao responsável."), (s.selected.contract?.required && s.selected.contract.signature_status!=='verified')
                                ? (_openBlock(), _createElementBlock("p", {
                                    key: 0,
                                    class: "alert warning"
                                  }, "Aguarde a assinatura do responsável e a conferência da Direção em Modelos e contratos → Assinaturas e revisão."))
                                : _createCommentVNode("", true), _createElementVNode("button", {
                                class: "btn btn-primary",
                                onClick: finalize,
                                disabled: s.reason.length<3 || (s.selected.contract?.required && s.selected.contract.signature_status!=='verified')
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
                                  }, "Enviar este texto via WhatsApp", 8, ["onClick", "disabled"]))
                                : _createCommentVNode("", true)]),
                              _createElementVNode("p", { class: "muted" }, "Envios por WhatsApp exigem consentimento e telefone verificado. Prefira avisos curtos com acesso ao portal.")
                            ], 40, ["onSubmit"]))
                          : _createCommentVNode("", true)])
                      ], 64))
                    : _createCommentVNode("", true)], 64))
            ], 64))
          : _createCommentVNode("", true),
        (props.page==='banking')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
              _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Cobranças e recebimentos"), _createElementVNode("p", null, "Acompanhe mensalidades, taxas de matrícula e pagamentos.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (run(load))
              }, "Atualizar", 8, ["onClick"]), (can('banking.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-primary",
                    onClick: $event => (newCharge()),
                    disabled: !s.bankingStatus?.enabled
                  }, "+ Nova cobrança", 8, ["onClick", "disabled"]))
                : _createCommentVNode("", true)])]),
              (s.bankingStatus&&!s.bankingStatus.enabled)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "alert warning"
                  }, [_createElementVNode("strong", null, "Ative a integração bancária para emitir cobranças."), _createElementVNode("p", null, "Cadastre a conta da instituição em Integrações → Bancária."), (can('integrations.manage'))
                    ? (_openBlock(), _createElementBlock("a", {
                        key: 0,
                        class: "btn btn-secondary",
                        href: "#/integrations"
                      }, "Configurar conta"))
                    : _createCommentVNode("", true)]))
                : (s.bankingStatus?.environment==='sandbox')
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 1,
                      class: "alert info"
                    }, "Ambiente de testes. As cobranças emitidas aqui são de homologação."))
                  : _createCommentVNode("", true),
              (s.bankingStatus?.queue_delayed)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 2,
                    class: "alert warning"
                  }, "Há operações aguardando processamento há mais de cinco minutos. Solicite à administração a verificação do serviço de cobranças."))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "stats-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(bankCards(), (card) => {
                return (_openBlock(), _createElementBlock("div", {
                  key: card.title,
                  class: "stat-card"
                }, [_createElementVNode("span", null, _toDisplayString(card.title), 1), _createElementVNode("strong", { class: "x-money" }, _toDisplayString(money(card.amount)), 1), _createElementVNode("small", null, _toDisplayString(card.count) + " cobrança(s)", 1)]))
              }), 128))]),
              _createElementVNode("section", { class: "panel x-card" }, [
                _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, "Consultar cobranças"), _createElementVNode("p", { class: "small muted" }, "Totais nominais conforme os filtros abaixo.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  class: "btn btn-secondary small-button",
                  onClick: $event => (bankPeriod(1))
                }, "Este mês", 8, ["onClick"]), _createElementVNode("button", {
                  class: "btn btn-secondary small-button",
                  onClick: $event => (bankPeriod(3))
                }, "Últimos 3 meses", 8, ["onClick"]), _createElementVNode("button", {
                  class: "btn btn-secondary small-button",
                  onClick: $event => (bankPeriod(0))
                }, "Todo o período", 8, ["onClick"])])]),
                _createElementVNode("form", {
                  onSubmit: _withModifiers(search, ["prevent"]),
                  class: "x-filter"
                }, [
                  _createElementVNode("label", null, [_createTextVNode("Descrição ou pagador"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((s.q) = $event),
                    maxlength: "160",
                    placeholder: "Nome ou mensalidade"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.q]])]),
                  _createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.status) = $event) }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['queued','pending','confirmed','received','received_external','overdue','uncertain','failed','cancelled','refunded','refund_requested','partially_refunded','disputed','awaiting_review'], (status) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: status,
                      value: status
                    }, _toDisplayString(label(status)), 9, ["value"]))
                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.status]])]),
                  _createElementVNode("label", null, [_createTextVNode("Vencimento de"), _withDirectives(_createElementVNode("input", {
                    type: "date",
                    "onUpdate:modelValue": $event => ((s.bankDueFrom) = $event),
                    max: s.bankDueTo||undefined
                  }, null, 8, ["onUpdate:modelValue", "max"]), [[_vModelText, s.bankDueFrom]])]),
                  _createElementVNode("label", null, [_createTextVNode("Até"), _withDirectives(_createElementVNode("input", {
                    type: "date",
                    "onUpdate:modelValue": $event => ((s.bankDueTo) = $event),
                    min: s.bankDueFrom||undefined
                  }, null, 8, ["onUpdate:modelValue", "min"]), [[_vModelText, s.bankDueTo]])]),
                  _createElementVNode("button", { class: "btn btn-primary" }, "Aplicar filtros")
                ], 40, ["onSubmit"]),
                _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("span", { class: "small muted" }, _toDisplayString(s.total) + " cobrança(s) encontrada(s)", 1), (can('banking.write')&&s.bankingStatus?.enabled)
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      class: "btn btn-secondary",
                      onClick: reconcileBank,
                      disabled: !s.total
                    }, "Conciliar cobranças do filtro", 8, ["onClick", "disabled"]))
                  : _createCommentVNode("", true)]),
                (!s.charges.length)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "empty"
                    }, "Nenhuma cobrança neste período. Ajuste os filtros ou crie uma cobrança para uma matrícula."))
                  : (_openBlock(), _createElementBlock("div", {
                      key: 1,
                      class: "table-wrap"
                    }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                      _createElementVNode("th", null, "Cobrança / pagador"),
                      _createElementVNode("th", null, "Vencimento"),
                      _createElementVNode("th", null, "Forma"),
                      _createElementVNode("th", null, "Valor"),
                      _createElementVNode("th", null, "Situação"),
                      _createElementVNode("th")
                    ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.charges, (c) => {
                      return (_openBlock(), _createElementBlock("tr", { key: c.id }, [
                        _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(c.description), 1), _createElementVNode("small", { class: "block" }, _toDisplayString(c.payer_snapshot?.name), 1)]),
                        _createElementVNode("td", null, _toDisplayString(date(c.due_on)), 1),
                        _createElementVNode("td", null, _toDisplayString(c.billing_type==='PIX'?'Pix':'Boleto'), 1),
                        _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(money(c.amount)), 1)]),
                        _createElementVNode("td", null, [_createElementVNode("span", { class: "badge" }, _toDisplayString(label(c.status)), 1)]),
                        _createElementVNode("td", null, [_createElementVNode("button", {
                          class: "btn btn-secondary small-button",
                          onClick: $event => (inspectCharge(c))
                        }, "Ver cobrança", 8, ["onClick"])])
                      ]))
                    }), 128))])])])),
                _createElementVNode("div", { class: "pagination" }, [_createElementVNode("span", null, "Página " + _toDisplayString(s.page), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => (paginate(-1)),
                  disabled: s.page<=1
                }, "Anterior", 8, ["onClick", "disabled"]), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => (paginate(1)),
                  disabled: s.page*30>=s.total
                }, "Próxima", 8, ["onClick", "disabled"])])])
              ])
            ], 64))
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
            }, "Nova cobrança")]), _createElementVNode("button", {
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
            }, _toDisplayString(s.selectedCharge.description), 1), _createElementVNode("p", null, _toDisplayString(s.selectedCharge.payer_snapshot?.name), 1)]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary",
              "data-dialog-close": "",
              disabled: s.busy,
              onClick: $event => (s.selectedCharge=null)
            }, "Fechar", 8, ["disabled", "onClick"])]), _createElementVNode("div", { class: "modal-body" }, [(s.error)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "alert error",
                  role: "alert"
                }, _toDisplayString(s.error), 1))
              : _createCommentVNode("", true), (s.notice)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "alert success",
                  role: "status"
                }, _toDisplayString(s.notice), 1))
              : _createCommentVNode("", true), _createElementVNode("fieldset", {
              class: "dialog-fields",
              disabled: s.busy
            }, [
              _createElementVNode("div", { class: "charge-summary" }, [_createElementVNode("div", null, [_createElementVNode("small", null, "Valor"), _createElementVNode("strong", null, _toDisplayString(money(s.selectedCharge.amount)), 1)]), _createElementVNode("div", null, [_createElementVNode("small", null, "Vencimento"), _createElementVNode("strong", null, _toDisplayString(date(s.selectedCharge.due_on)), 1)]), _createElementVNode("div", null, [_createElementVNode("small", null, "Situação"), _createElementVNode("strong", null, _toDisplayString(label(s.selectedCharge.status)), 1)])]),
              (s.selectedCharge.required_for_enrollment)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "alert info"
                  }, "O recebimento desta cobrança é necessário para efetivar a matrícula."))
                : _createCommentVNode("", true),
              (s.selectedCharge.status==='queued')
                ? (_openBlock(), _createElementBlock("p", {
                    key: 1,
                    class: "alert info",
                    role: "status"
                  }, "Emissão em andamento. Atualize os detalhes para acessar o pagamento."))
                : _createCommentVNode("", true),
              (s.selectedCharge.issuance?.error_code&&['failed','uncertain'].includes(s.selectedCharge.status))
                ? (_openBlock(), _createElementBlock("p", {
                    key: 2,
                    class: "alert warning"
                  }, _toDisplayString(bankError(s.selectedCharge.issuance.error_code)), 1))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "actions" }, [
                _createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => (inspectCharge(s.selectedCharge))
                }, "Atualizar detalhes", 8, ["onClick"]),
                (safeLink(s.selectedCharge.invoice_url))
                  ? (_openBlock(), _createElementBlock("a", {
                      key: 0,
                      href: safeLink(s.selectedCharge.invoice_url),
                      class: "btn btn-primary",
                      target: "_blank",
                      rel: "noopener"
                    }, "Abrir cobrança ↗", 8, ["href"]))
                  : _createCommentVNode("", true),
                (safeLink(s.selectedCharge.bank_slip_url))
                  ? (_openBlock(), _createElementBlock("a", {
                      key: 1,
                      href: safeLink(s.selectedCharge.bank_slip_url),
                      class: "btn btn-secondary",
                      target: "_blank",
                      rel: "noopener"
                    }, "Abrir boleto ↗", 8, ["href"]))
                  : _createCommentVNode("", true),
                (can('banking.write'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 2,
                      class: "btn btn-secondary",
                      onClick: $event => (chargeAction('sync'))
                    }, "Consultar pagamento no banco", 8, ["onClick"]))
                  : _createCommentVNode("", true)
              ]),
              (s.selectedCharge.pix_copy_paste&&['pending','overdue'].includes(s.selectedCharge.status))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 3,
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
                  }, "Copiar código Pix", 8, ["onClick"])])]))
                : _createCommentVNode("", true),
              _createElementVNode("p", { class: "small muted" }, "Última conciliação: " + _toDisplayString(date(s.selectedCharge.last_synced_at)), 1),
              _createElementVNode("h3", null, "Histórico da cobrança"),
              (!s.bankEvents.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 4,
                    class: "empty"
                  }, "O histórico será atualizado após a emissão."))
                : _createCommentVNode("", true),
              _createElementVNode("div", { class: "x-timeline" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.bankEvents, (e) => {
                return (_openBlock(), _createElementBlock("article", { key: e.id }, [_createElementVNode("small", null, _toDisplayString(date(e.created_at)), 1), _createElementVNode("p", null, _toDisplayString(label(e.previous_status)) + " → " + _toDisplayString(label(e.status)), 1)]))
              }), 128))]),
              (can('banking.write'))
                ? (_openBlock(), _createElementBlock("details", { key: 5 }, [
                    _createElementVNode("summary", null, "Cancelamento e recuperação de emissão"),
                    _createElementVNode("label", null, [_createTextVNode("Motivo da operação"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((s.bankReason) = $event),
                      maxlength: "1000",
                      rows: "2",
                      placeholder: "Descreva o motivo antes de prosseguir"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.bankReason]])]),
                    _createElementVNode("div", { class: "actions" }, [(['queued','pending','overdue'].includes(s.selectedCharge.status))
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          class: "btn btn-danger",
                          onClick: $event => (chargeAction('cancel')),
                          disabled: s.bankReason.length<5
                        }, "Cancelar cobrança", 8, ["onClick", "disabled"]))
                      : _createCommentVNode("", true), (can('integrations.manage')&&!s.selectedCharge.remote_payment_id&&['uncertain','failed','queued'].includes(s.selectedCharge.status))
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 1,
                          class: "btn btn-secondary",
                          onClick: $event => (chargeAction('authorize-reissue')),
                          disabled: s.bankReason.length<10
                        }, "Conferi a ausência no banco: autorizar nova emissão", 8, ["onClick", "disabled"]))
                      : _createCommentVNode("", true)]),
                    _createElementVNode("p", { class: "small muted" }, "Antes de reemitir, confira a conta bancária para evitar duplicidade. O cancelamento não estorna pagamentos recebidos.")
                  ]))
                : _createCommentVNode("", true)
            ], 8, ["disabled"])])])]))
          : _createCommentVNode("", true)])),
        (props.page==='connect')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
              _createElementVNode("section", { class: "panel x-card" }, [
                _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "WhatsApp"), _createElementVNode("p", null, "Instâncias e fila de mensagens da instituição. Atendimento e conversação permanecem fora deste módulo.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: connectTest
                }, "Testar conexão", 8, ["onClick"]), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => (run(load))
                }, "Atualizar", 8, ["onClick"])])]),
                _createElementVNode("label", null, [_createTextVNode("Provedor de WhatsApp"), _createElementVNode("select", {
                  disabled: "",
                  "aria-label": "Provedor de WhatsApp"
                }, [_createElementVNode("option", { value: "connect_api" }, "Connect API")])]),
                (!s.connect.configured)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "alert warning"
                    }, [
                      _createTextVNode("Configure o provedor no ambiente da instalação com "),
                      _createElementVNode("code", null, "CONNECT_API_BASE_URL"),
                      _createTextVNode(" e "),
                      _createElementVNode("code", null, "CONNECT_API_KEY"),
                      _createTextVNode(". "),
                      _createElementVNode("code", null, "CONNECT_ALLOWED_HOSTS"),
                      _createTextVNode(" é opcional para restringir ainda mais o hostname; quando vazio, somente o host exato da URL configurada é aceito.")
                    ]))
                  : (_openBlock(), _createElementBlock("div", {
                      key: 1,
                      class: "alert info"
                    }, "Provedor configurado em " + _toDisplayString(s.connect.base_url) + " · chave global presente · host efetivo " + _toDisplayString(s.connect.effective_host) + " · prefixo de instância " + _toDisplayString(s.connect.instance_prefix), 1)),
                _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("form", {
                  class: "x-form",
                  onSubmit: _withModifiers(connectCreate, ["prevent"])
                }, [
                  _createElementVNode("h3", null, "Criar nova instância"),
                  _createElementVNode("label", null, [_createTextVNode("Telefone da instância"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((s.connectCreatePhone) = $event),
                    inputmode: "tel",
                    autocomplete: "tel",
                    minlength: "10",
                    maxlength: "24",
                    required: "",
                    placeholder: "+5575999990000"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectCreatePhone]])]),
                  _createElementVNode("label", null, [_createTextVNode("Rótulo adicional (opcional)"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((s.connectLabel) = $event),
                    maxlength: "40",
                    placeholder: "Ex.: Secretaria 2"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectLabel]])]),
                  _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": $event => ((s.connectPrimary) = $event)
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.connectPrimary]]), _createTextVNode("Usar como preferencial desta escola")]),
                  _createElementVNode("p", { class: "muted" }, "O telefone é obrigatório e ficará associado à instância para geração do código de pareamento. A instância recebe nome padronizado com empresa e CNPJ."),
                  _createElementVNode("button", {
                    class: "btn btn-primary",
                    disabled: s.busy||!s.connect.configured||s.connectCreatePhone.replace(/\D/g,'').length<10
                  }, _toDisplayString(s.connectOperation.kind==='create'?'Criando instância…':'Criar instância'), 9, ["disabled"])
                ], 40, ["onSubmit"]), _createElementVNode("div", { class: "x-form" }, [_createElementVNode("h3", null, "Usar instância existente"), _createElementVNode("p", null, "Consulte as instâncias já disponíveis no provedor configurado e vincule uma delas a esta escola. O PIGE360 não exclui, reinicia nem desloga automaticamente instâncias preexistentes."), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary",
                  onClick: connectInventory,
                  disabled: !s.connect.configured
                }, "Buscar instâncias existentes", 8, ["onClick", "disabled"])])])
              ]),
              (s.connectInventoryLoaded)
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card"
                  }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Instâncias disponíveis no provedor"), _createElementVNode("p", null, "Inventário remoto. Vincular não transfere propriedade nem remove o uso por outros sistemas.")]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: connectInventory
                  }, "Atualizar inventário", 8, ["onClick"])]), (!s.connectRemote.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "empty"
                      }, "Nenhuma instância retornada pelo provedor."))
                    : (_openBlock(), _createElementBlock("div", {
                        key: 1,
                        class: "table-wrap"
                      }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                        _createElementVNode("th", null, "Instância"),
                        _createElementVNode("th", null, "Estado"),
                        _createElementVNode("th", null, "Integração"),
                        _createElementVNode("th", null, "Uso local"),
                        _createElementVNode("th", null, "Ação")
                      ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.connectRemote, (r) => {
                        return (_openBlock(), _createElementBlock("tr", { key: r.name }, [
                          _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.name), 1), (r.number)
                            ? (_openBlock(), _createElementBlock("small", {
                                key: 0,
                                class: "block"
                              }, _toDisplayString(r.number), 1))
                            : _createCommentVNode("", true)]),
                          _createElementVNode("td", null, _toDisplayString(label(r.state||'unknown')), 1),
                          _createElementVNode("td", null, _toDisplayString(r.integration||'—'), 1),
                          _createElementVNode("td", null, _toDisplayString(r.registered?'Já vinculada':'Disponível'), 1),
                          _createElementVNode("td", null, [(!r.registered)
                            ? (_openBlock(), _createElementBlock("button", {
                                key: 0,
                                class: "btn btn-primary small-button",
                                onClick: $event => (connectAdopt(r))
                              }, "Usar nesta escola", 8, ["onClick"]))
                            : (_openBlock(), _createElementBlock("span", {
                                key: 1,
                                class: "badge"
                              }, "Vinculada"))])
                        ]))
                      }), 128))])])]))]))
                : _createCommentVNode("", true),
              _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Instâncias da empresa"), _createElementVNode("span", null, _toDisplayString(s.connectInstances.length) + " cadastrada(s)", 1)]), (!s.connectInstances.length)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty"
                  }, "Nenhuma instância foi vinculada para esta empresa."))
                : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.connectInstances, (i) => {
                return (_openBlock(), _createElementBlock("article", {
                  key: i.id,
                  class: "x-charge"
                }, [
                  _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [
                    _createElementVNode("p", { class: "eyebrow" }, _toDisplayString(i.preferred_for_school?'PREFERENCIAL DESTA ESCOLA':(i.managed_by_pige360?'CRIADA PELO PIGE360':'PREEXISTENTE')), 1),
                    _createElementVNode("h3", null, _toDisplayString(i.display_name), 1),
                    _createElementVNode("code", { class: "x-url" }, _toDisplayString(i.name), 1),
                    _createElementVNode("p", null, [
                      _createElementVNode("span", { class: "badge" }, _toDisplayString(i.managed_by_pige360?'Gerenciada':'Vinculada'), 1),
                      _createTextVNode(" · Estado: "),
                      _createElementVNode("span", { class: "badge" }, _toDisplayString(label(i.connection_state||i.status)), 1),
                      _createTextVNode(" · " + _toDisplayString(i.remote_configured?'API pronta':'API não configurada'), 1)
                    ]),
                    (i.last_synced_at)
                      ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Última consulta: " + _toDisplayString(date(i.last_synced_at)), 1))
                      : _createCommentVNode("", true)
                  ]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => (connectSync(i)),
                    disabled: s.busy
                  }, "Consultar estado", 8, ["onClick", "disabled"]), (!i.preferred_for_school)
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary",
                        onClick: $event => (connectPrefer(i)),
                        disabled: s.busy
                      }, "Tornar preferencial", 8, ["onClick", "disabled"]))
                    : _createCommentVNode("", true), (i.managed_by_pige360)
                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                        _createElementVNode("button", {
                          class: "btn btn-primary",
                          onClick: $event => (connectQr(i)),
                          disabled: s.busy
                        }, _toDisplayString(s.connectOperation.instanceId===i.id&&s.connectOperation.kind==='qr'?'Aguardando QR Code…':'Gerar QR Code'), 9, ["onClick", "disabled"]),
                        _createElementVNode("button", {
                          class: "btn btn-secondary",
                          onClick: $event => (connectPairingCode(i)),
                          disabled: s.busy||!i.phone
                        }, _toDisplayString(s.connectOperation.instanceId===i.id&&s.connectOperation.kind==='pairing'?'Aguardando código…':'Obter código de pareamento'), 9, ["onClick", "disabled"]),
                        _createElementVNode("button", {
                          class: "btn btn-secondary",
                          onClick: $event => (connectRestart(i)),
                          disabled: s.busy
                        }, "Reiniciar", 8, ["onClick", "disabled"]),
                        _createElementVNode("button", {
                          class: "btn btn-secondary",
                          onClick: $event => (connectLogout(i)),
                          disabled: s.busy
                        }, "Deslogar", 8, ["onClick", "disabled"]),
                        _createElementVNode("button", {
                          class: "btn btn-secondary",
                          onClick: $event => (connectDelete(i)),
                          disabled: s.busy
                        }, "Excluir", 8, ["onClick", "disabled"])
                      ], 64))
                    : (_openBlock(), _createElementBlock("button", {
                        key: 2,
                        class: "btn btn-secondary",
                        onClick: $event => (connectDelete(i)),
                        disabled: s.busy
                      }, "Desvincular", 8, ["onClick", "disabled"]))])]),
                  (s.connectOperation.instanceId===i.id&&['qr','pairing'].includes(s.connectOperation.kind))
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "alert info",
                        role: "status"
                      }, "Aguardando a resposta do provedor. A geração pode levar até cerca de 75 segundos."))
                    : _createCommentVNode("", true),
                  (i.last_error)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 1,
                        class: "alert error"
                      }, _toDisplayString(i.last_error), 1))
                    : _createCommentVNode("", true),
                  (i.managed_by_pige360)
                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Telefone da instância"), _withDirectives(_createElementVNode("input", {
                        "onUpdate:modelValue": $event => ((s.connectPhoneDrafts[i.id]) = $event),
                        inputmode: "tel",
                        autocomplete: "tel",
                        minlength: "10",
                        maxlength: "24",
                        required: "",
                        placeholder: "+5575999990000"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectPhoneDrafts[i.id]]])]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                        type: "button",
                        class: "btn btn-secondary",
                        onClick: $event => (connectSavePhone(i)),
                        disabled: s.busy||(s.connectPhoneDrafts[i.id]||'').replace(/\D/g,'').length<10
                      }, "Salvar telefone", 8, ["onClick", "disabled"])])]), (!i.phone)
                        ? (_openBlock(), _createElementBlock("p", {
                            key: 0,
                            class: "alert warning"
                          }, "Esta instância foi cadastrada antes da exigência de telefone. Informe e salve o número para habilitar o código de pareamento."))
                        : _createCommentVNode("", true), (s.connectQr.instanceId===i.id)
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(s.connectQr.connected)
                            ? (_openBlock(), _createElementBlock("p", {
                                key: 0,
                                class: "alert info",
                                role: "status"
                              }, "WhatsApp conectado. Não é necessário parear novamente."))
                            : (s.connectQr.pending)
                              ? (_openBlock(), _createElementBlock("p", {
                                  key: 1,
                                  class: "alert warning",
                                  role: "status"
                                }, _toDisplayString(s.connectQr.kind==='qr'&&s.connectQr.code?'O provedor devolveu somente o texto do QR, sem imagem para escanear. Aguarde e tente novamente.':'O provedor respondeu, mas ainda não disponibilizou '+(s.connectQr.kind==='pairing'?'o código de pareamento':'o QR Code')+'. Aguarde alguns instantes e tente novamente.'), 1))
                              : _createCommentVNode("", true), (s.connectQr.base64)
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 2,
                                class: "x-pix"
                              }, [_createElementVNode("img", {
                                src: s.connectQr.base64,
                                alt: "QR Code de conexão do WhatsApp"
                              }, null, 8, ["src"]), _createElementVNode("button", {
                                class: "btn btn-secondary",
                                onClick: $event => (clearConnectQr(i.id))
                              }, "Fechar QR", 8, ["onClick"])]))
                            : _createCommentVNode("", true), (s.connectQr.pairingCode||s.connectQr.code)
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 3,
                                class: "alert info"
                              }, [_createElementVNode("strong", null, _toDisplayString(s.connectQr.pairingCode?'Código de pareamento':'Código QR'), 1), _createElementVNode("code", { class: "x-url" }, _toDisplayString(s.connectQr.pairingCode||s.connectQr.code), 1)]))
                            : _createCommentVNode("", true)], 64))
                        : _createCommentVNode("", true)], 64))
                    : _createCommentVNode("", true)
                ]))
              }), 128))]),
              (s.connectUnits.length)
                ? (_openBlock(), _createElementBlock("section", {
                    key: 1,
                    class: "panel x-card"
                  }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Preferência por unidade"), _createElementVNode("p", null, "Opcional. Sem escolha específica, a unidade usa a instância preferencial da escola.")])]), _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.connectUnits, (u) => {
                    return (_openBlock(), _createElementBlock("div", {
                      key: u.id,
                      class: "x-record"
                    }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(u.name), 1), _createElementVNode("span", null, _toDisplayString(u.preferred_instance_id?'Preferência específica':'Herda da escola'), 1)]), _createElementVNode("label", null, [_createTextVNode("Instância"), _createElementVNode("select", {
                      value: u.preferred_instance_id,
                      onChange: $event => (connectPreferUnit(u,$event.target.value))
                    }, [_createElementVNode("option", { value: "" }, "Usar preferência da escola"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.connectInstances, (i) => {
                      return (_openBlock(), _createElementBlock("option", {
                        key: i.id,
                        value: i.id
                      }, _toDisplayString(i.display_name) + " · " + _toDisplayString(i.managed_by_pige360?'gerenciada':'preexistente'), 9, ["value"]))
                    }), 128))], 40, ["value", "onChange"])])]))
                  }), 128))])]))
                : _createCommentVNode("", true),
              _createElementVNode("section", { class: "panel x-card" }, [
                _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Fila operacional do WhatsApp"), _createElementVNode("p", null, "Mensagens e notificações geradas pelo PIGE360. Este módulo não implementa caixa de entrada nem interface de conversação.")]), _createElementVNode("button", {
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
              ])
            ], 64))
          : _createCommentVNode("", true),
        (props.page==='integrations')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
              _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Conta bancária da instituição"), _createElementVNode("p", null, "Receba por Pix e boleto e acompanhe os pagamentos no sistema.")]), _createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (run(load))
              }, "Atualizar", 8, ["onClick"])]), _createElementVNode("article", { class: "x-charge" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, "ASAAS"), _createElementVNode("p", null, [_createElementVNode("span", { class: "badge" }, _toDisplayString(connectionFor('asaas')?.enabled?'Habilitada':'Não habilitada'), 1), _createTextVNode(" · " + _toDisplayString(connectionFor('asaas')?.environment==='production'?'Produção':'Homologação'), 1)]), (connectionFor('asaas')?.last_test_at)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "small muted"
                  }, "Conexão " + _toDisplayString(connectionFor('asaas')?.last_test_ok?'validada':'com falha') + " em " + _toDisplayString(date(connectionFor('asaas')?.last_test_at||'')), 1))
                : _createCommentVNode("", true)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                class: "btn btn-primary",
                onClick: $event => (configure('asaas'))
              }, _toDisplayString(connectionFor('asaas')?'Editar conta':'Conectar conta'), 9, ["onClick"]), (connectionFor('asaas')?.api_key_configured)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-secondary",
                    onClick: $event => (testConnection('asaas'))
                  }, "Testar conexão", 8, ["onClick"]))
                : _createCommentVNode("", true), (connectionFor('asaas')?.enabled)
                ? (_openBlock(), _createElementBlock("a", {
                    key: 1,
                    class: "btn btn-secondary",
                    href: "#/banking"
                  }, "Ver cobranças"))
                : _createCommentVNode("", true)])])]), _createElementVNode("p", { class: "small muted" }, "Pix e boleto disponíveis com ASAAS. Selecione Produção para cobranças reais ou Homologação para testes.")]),
              (s.editingConnection)
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card"
                  }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, "Configurar conta ASAAS"), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    onClick: $event => {s.editingConnection=false;s.connectionForm.api_key='';s.connectionForm.webhook_token=''}
                  }, "Fechar", 8, ["onClick"])]), _createElementVNode("form", {
                    onSubmit: _withModifiers(saveConnection, ["prevent"]),
                    class: "x-form"
                  }, [
                    _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Ambiente"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.connectionForm.environment) = $event) }, [_createElementVNode("option", { value: "sandbox" }, "Homologação — testes"), _createElementVNode("option", { value: "production" }, "Produção — cobranças reais")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.connectionForm.environment]])]), _createElementVNode("label", null, [_createTextVNode("Chave da API"), _withDirectives(_createElementVNode("input", {
                      type: "password",
                      "onUpdate:modelValue": $event => ((s.connectionForm.api_key) = $event),
                      maxlength: "4000",
                      autocomplete: "new-password",
                      placeholder: connectionFor('asaas')?.api_key_configured?'Deixe vazio para manter a chave atual':'Cole a chave da conta ASAAS'
                    }, null, 8, ["onUpdate:modelValue", "placeholder"]), [[_vModelText, s.connectionForm.api_key]])])]),
                    _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
                      type: "checkbox",
                      "onUpdate:modelValue": $event => ((s.connectionForm.enabled) = $event)
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.connectionForm.enabled]]), _createTextVNode("Habilitar emissão e atualização de cobranças")]),
                    _createElementVNode("details", null, [_createElementVNode("summary", null, "Configuração avançada do retorno bancário"), _createElementVNode("label", null, [_createTextVNode("Token de um webhook já existente"), _withDirectives(_createElementVNode("input", {
                      type: "password",
                      "onUpdate:modelValue": $event => ((s.connectionForm.webhook_token) = $event),
                      maxlength: "255",
                      minlength: "32",
                      autocomplete: "new-password",
                      placeholder: "Opcional — gerado automaticamente"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.connectionForm.webhook_token]])]), _createElementVNode("p", { class: "small muted" }, "Preencha somente para reutilizar um token próprio. A aplicação gera e protege um token exclusivo quando necessário.")]),
                    _createElementVNode("p", { class: "small muted" }, "Após emitir cobranças, o ambiente dessa conta não pode ser alterado."),
                    _createElementVNode("button", { class: "btn btn-primary" }, "Salvar conta")
                  ], 40, ["onSubmit"])]))
                : _createCommentVNode("", true),
              (connectionFor('asaas')?.enabled)
                ? (_openBlock(), _createElementBlock("section", {
                    key: 1,
                    class: "panel x-card"
                  }, [
                    _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Atualizações de pagamento"), _createElementVNode("p", null, _toDisplayString(s.bankingStatus?.webhook_registered?'Retorno automático configurado.':'Ative o retorno automático para receber as confirmações de pagamento.'), 1)]), (s.bankingStatus?.webhook_registered)
                      ? (_openBlock(), _createElementBlock("span", {
                          key: 0,
                          class: "badge"
                        }, "Configurado"))
                      : _createCommentVNode("", true)]),
                    _createElementVNode("form", {
                      onSubmit: _withModifiers(activateBankWebhook, ["prevent"]),
                      class: "x-filter"
                    }, [_createElementVNode("label", null, [_createTextVNode("E-mail para avisos da integração"), _withDirectives(_createElementVNode("input", {
                      type: "email",
                      "onUpdate:modelValue": $event => ((s.webhookEmail) = $event),
                      maxlength: "254",
                      required: "",
                      placeholder: "financeiro@instituicao.com.br"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.webhookEmail]])]), _createElementVNode("button", { class: "btn btn-primary" }, _toDisplayString(s.bankingStatus?.webhook_registered?'Atualizar retorno bancário':'Ativar atualizações automáticas'), 1)], 40, ["onSubmit"]),
                    (s.bankingStatus?.last_webhook_at)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 0,
                          class: "small muted"
                        }, "Último retorno recebido em " + _toDisplayString(date(s.bankingStatus.last_webhook_at)), 1))
                      : _createCommentVNode("", true),
                    _createElementVNode("details", null, [
                      _createElementVNode("summary", null, "Dados técnicos da integração"),
                      _createElementVNode("label", null, [_createTextVNode("URL do webhook"), _createElementVNode("input", {
                        readonly: "",
                        value: origin+connectionFor('asaas')?.webhook_path
                      }, null, 8, ["value"])]),
                      _createElementVNode("button", {
                        class: "btn btn-secondary small-button",
                        onClick: $event => (copy(origin+connectionFor('asaas')?.webhook_path))
                      }, "Copiar endereço", 8, ["onClick"]),
                      _createElementVNode("p", { class: "small muted" }, "Autenticação: asaas-access-token. O token permanece protegido no servidor.")
                    ])
                  ]))
                : _createCommentVNode("", true),
              _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Processamento bancário"), _createElementVNode("p", null, _toDisplayString(s.bankingStatus?.pending_jobs||0) + " operação(ões) em andamento · " + _toDisplayString(s.bankingStatus?.failed_jobs||0) + " exigem conferência", 1)]), _createElementVNode("button", {
                class: "btn btn-secondary",
                onClick: $event => (s.showBankOperations=!s.showBankOperations)
              }, _toDisplayString(s.showBankOperations?'Recolher operações':'Ver operações'), 9, ["onClick"])]), (s.bankingStatus?.queue_delayed)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "alert warning"
                  }, "Há operações aguardando há mais de cinco minutos. Verifique o serviço de processamento da instalação."))
                : _createCommentVNode("", true), (s.showBankOperations)
                ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                    _createElementVNode("form", {
                      onSubmit: _withModifiers($event => {s.jobPage=1;run(jobs)}, ["prevent"]),
                      class: "x-filter"
                    }, [_createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((s.jobStatus) = $event) }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(['pending','processing','completed','retry','failed','uncertain','cancelled'], (st) => {
                      return (_openBlock(), _createElementBlock("option", {
                        key: st,
                        value: st
                      }, _toDisplayString(label(st)), 9, ["value"]))
                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.jobStatus]])]), _createElementVNode("button", { class: "btn btn-secondary" }, "Filtrar")], 40, ["onSubmit"]),
                    (!s.jobs.length)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 0,
                          class: "empty"
                        }, "Nenhuma operação encontrada."))
                      : (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "table-wrap"
                        }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                          _createElementVNode("th", null, "Operação"),
                          _createElementVNode("th", null, "Situação"),
                          _createElementVNode("th", null, "Tentativas"),
                          _createElementVNode("th", null, "Resultado"),
                          _createElementVNode("th", null, "Ação")
                        ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.jobs, (j) => {
                          return (_openBlock(), _createElementBlock("tr", { key: j.id }, [
                            _createElementVNode("td", null, [_createTextVNode(_toDisplayString(bankOperation(j.kind)), 1), _createElementVNode("small", { class: "block" }, _toDisplayString(date(j.created_at)), 1)]),
                            _createElementVNode("td", null, _toDisplayString(label(j.status)), 1),
                            _createElementVNode("td", null, _toDisplayString(j.attempts), 1),
                            _createElementVNode("td", null, [_createTextVNode(_toDisplayString(j.error_code?bankError(j.error_code):label(j.delivery_status)||'—'), 1), (j.error_code)
                              ? (_openBlock(), _createElementBlock("details", { key: 0 }, [_createElementVNode("summary", null, "Código técnico"), _createElementVNode("code", null, _toDisplayString(j.error_code), 1)]))
                              : _createCommentVNode("", true)]),
                            _createElementVNode("td", null, [(['failed','retry'].includes(j.status)&&j.kind!=='bank_issue')
                              ? (_openBlock(), _createElementBlock("button", {
                                  key: 0,
                                  class: "btn btn-secondary small-button",
                                  onClick: $event => (retry(j)),
                                  disabled: s.reason.length<5
                                }, "Reprocessar", 8, ["onClick", "disabled"]))
                              : (['uncertain','failed'].includes(j.status))
                                ? (_openBlock(), _createElementBlock("small", { key: 1 }, "Confira a cobrança"))
                                : _createCommentVNode("", true)])
                          ]))
                        }), 128))])])])),
                    _createElementVNode("label", null, [_createTextVNode("Motivo para reprocessar"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((s.reason) = $event),
                      maxlength: "1000",
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.reason]])]),
                    _createElementVNode("div", { class: "pagination" }, [_createElementVNode("span", null, _toDisplayString(s.jobTotal) + " operação(ões) · página " + _toDisplayString(s.jobPage), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                      class: "btn btn-secondary",
                      onClick: $event => (paginateJobs(-1)),
                      disabled: s.jobPage<=1
                    }, "Anterior", 8, ["onClick", "disabled"]), _createElementVNode("button", {
                      class: "btn btn-secondary",
                      onClick: $event => (paginateJobs(1)),
                      disabled: s.jobPage*30>=s.jobTotal
                    }, "Próxima", 8, ["onClick", "disabled"])])])
                  ], 64))
                : _createCommentVNode("", true)])
            ], 64))
          : _createCommentVNode("", true)
      ], 8, ["disabled"])
    ]))
  }
},assist:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, vModelText: _vModelText, withModifiers: _withModifiers, withKeys: _withKeys, withDirectives: _withDirectives, createTextVNode: _createTextVNode, Fragment: _Fragment, vModelSelect: _vModelSelect, renderList: _renderList, vModelCheckbox: _vModelCheckbox } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "assist",
      "aria-label": "Preenchimento assistido"
    }, [_createElementVNode("div", { class: "assist-toolbar" }, [
      _createElementVNode("span", { class: "assist-caption" }, "Preencher com ajuda"),
      (props.ocr)
        ? (_openBlock(), _createElementBlock("button", {
            key: 0,
            type: "button",
            class: "btn btn-secondary small-button",
            onClick: openDocument,
            disabled: s.busy
          }, "Ler documento", 8, ["onClick", "disabled"]))
        : _createCommentVNode("", true),
      (props.cnpj)
        ? (_openBlock(), _createElementBlock("button", {
            key: 1,
            type: "button",
            class: "btn btn-secondary small-button",
            onClick: $event => (openLookup('cnpj')),
            disabled: s.busy
          }, "Consultar CNPJ", 8, ["onClick", "disabled"]))
        : _createCommentVNode("", true),
      (props.cep)
        ? (_openBlock(), _createElementBlock("button", {
            key: 2,
            type: "button",
            class: "btn btn-secondary small-button",
            onClick: $event => (openLookup('cep')),
            disabled: s.busy
          }, "Consultar CEP", 8, ["onClick", "disabled"]))
        : _createCommentVNode("", true)
    ]), (s.open)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "assist-panel"
        }, [
          _createElementVNode("div", { class: "assist-heading" }, [_createElementVNode("strong", null, "Preenchendo: " + _toDisplayString(props.label), 1), _createElementVNode("button", {
            type: "button",
            class: "link-button",
            onClick: cancel
          }, "Fechar / descartar leitura", 8, ["onClick"])]),
          (s.kind)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("div", { class: "assist-query" }, [_createElementVNode("label", { for: id+'-query' }, [_createTextVNode(_toDisplayString(s.kind==='cnpj'?'CNPJ':'CEP'), 1), _withDirectives(_createElementVNode("input", {
                id: id+'-query',
                "onUpdate:modelValue": $event => ((s.query) = $event),
                inputmode: s.kind==='cep'?'numeric':'text',
                maxlength: s.kind==='cep'?9:24,
                onKeydown: _withKeys(_withModifiers(lookup, ["prevent"]), ["enter"]),
                disabled: s.busy
              }, null, 40, ["id", "onUpdate:modelValue", "inputmode", "maxlength", "onKeydown", "disabled"]), [[_vModelText, s.query]])], 8, ["for"]), _createElementVNode("button", {
                type: "button",
                class: "btn btn-primary",
                onClick: lookup,
                disabled: s.busy||!s.query
              }, "Consultar", 8, ["onClick", "disabled"])]), _createElementVNode("small", null, "Consulta pontual a provedores externos. Cache e limites evitam chamadas repetidas. Não altera a ficha sem sua conferência.")], 64))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                _createElementVNode("p", null, "Fotografe um documento por vez, inteiro, reto e sem reflexos. Use frente e verso em leituras separadas. Somente texto impresso; confira a pessoa indicada acima."),
                _createElementVNode("div", { class: "assist-query" }, [_createElementVNode("label", { for: id+'-purpose' }, [_createTextVNode("Documento"), _withDirectives(_createElementVNode("select", {
                  id: id+'-purpose',
                  "onUpdate:modelValue": $event => ((s.purpose) = $event),
                  disabled: s.busy
                }, [
                  _createElementVNode("option", { value: "identity" }, "Identidade / CIN / RG / CNH / CPF"),
                  _createElementVNode("option", { value: "birth" }, "Certidão de nascimento"),
                  _createElementVNode("option", { value: "address" }, "Comprovante de endereço"),
                  _createElementVNode("option", { value: "company" }, "Cartão do CNPJ"),
                  _createElementVNode("option", { value: "generic" }, "Outro documento")
                ], 8, ["id", "onUpdate:modelValue", "disabled"]), [[_vModelSelect, s.purpose]])], 8, ["for"]), _createElementVNode("label", { for: id+'-file' }, [_createTextVNode("Fotografar / escolher arquivo"), _createElementVNode("input", {
                  id: id+'-file',
                  type: "file",
                  accept: "image/jpeg,image/png,image/webp,application/pdf",
                  capture: "environment",
                  onChange: selectFile,
                  disabled: s.busy
                }, null, 40, ["id", "onChange", "disabled"])], 8, ["for"])]),
                _createElementVNode("div", { class: "assist-toolbar" }, [_createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary small-button",
                  onClick: camera,
                  disabled: s.busy
                }, "Abrir câmera com guia", 8, ["onClick", "disabled"]), (s.preview)
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      type: "button",
                      class: "btn btn-secondary small-button",
                      onClick: rotate,
                      disabled: s.busy
                    }, "Girar 90°", 8, ["onClick", "disabled"]))
                  : _createCommentVNode("", true)]),
                (s.camera)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 0,
                      class: "assist-camera"
                    }, [
                      _createElementVNode("video", {
                        id: id+'-camera',
                        autoplay: "",
                        muted: "",
                        playsinline: ""
                      }, null, 8, ["id"]),
                      _createElementVNode("div", {
                        class: "assist-frame",
                        "aria-hidden": "true"
                      }),
                      _createElementVNode("p", null, "Mantenha todo o documento dentro da imagem."),
                      _createElementVNode("button", {
                        type: "button",
                        class: "btn btn-primary",
                        onClick: capture
                      }, "Fotografar", 8, ["onClick"]),
                      _createElementVNode("button", {
                        type: "button",
                        class: "btn btn-secondary",
                        onClick: stopCamera
                      }, "Cancelar câmera", 8, ["onClick"])
                    ]))
                  : _createCommentVNode("", true),
                (s.preview)
                  ? (_openBlock(), _createElementBlock("img", {
                      key: 1,
                      class: "assist-preview",
                      src: s.preview,
                      alt: "Confira se o documento está inteiro e legível"
                    }, null, 8, ["src"]))
                  : _createCommentVNode("", true),
                (s.fileName)
                  ? (_openBlock(), _createElementBlock("p", { key: 2 }, _toDisplayString(s.fileName), 1))
                  : _createCommentVNode("", true),
                _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-primary",
                  onClick: analyze,
                  disabled: s.busy||(!s.fileName&&!props.source)
                }, "Ler e conferir dados", 8, ["onClick", "disabled"]),
                _createElementVNode("small", { class: "assist-privacy" }, "Leitura local na instalação da escola. Cópia temporária, sem envio a serviços de OCR externos. A leitura não substitui o envio e a conferência dos documentos exigidos.")
              ], 64)),
          (s.busy)
            ? (_openBlock(), _createElementBlock("p", {
                key: 2,
                role: "status"
              }, _toDisplayString(s.status||'Consultando…') + " Você pode continuar preenchendo os demais campos.", 1))
            : _createCommentVNode("", true),
          (s.error)
            ? (_openBlock(), _createElementBlock("p", {
                key: 3,
                class: "alert error",
                role: "alert"
              }, _toDisplayString(s.error), 1))
            : _createCommentVNode("", true),
          (s.notice)
            ? (_openBlock(), _createElementBlock("p", {
                key: 4,
                class: "alert info",
                role: "status"
              }, _toDisplayString(s.notice), 1))
            : _createCommentVNode("", true),
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.warnings, (w) => {
            return (_openBlock(), _createElementBlock("p", {
              key: w,
              class: "assist-warning"
            }, _toDisplayString(w), 1))
          }), 128)),
          (s.source)
            ? (_openBlock(), _createElementBlock("small", { key: 5 }, "Origem: " + _toDisplayString(s.source), 1))
            : _createCommentVNode("", true),
          (s.rows.length)
            ? (_openBlock(), _createElementBlock("div", {
                key: 6,
                class: "assist-review"
              }, [
                _createElementVNode("p", null, "Selecione o que deseja utilizar. Campos já preenchidos ficam desmarcados; marcar autoriza a substituição."),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.rows, (row) => {
                  return (_openBlock(), _createElementBlock("label", {
                    key: row.field,
                    class: "assist-row"
                  }, [_withDirectives(_createElementVNode("input", {
                    type: "checkbox",
                    "onUpdate:modelValue": $event => ((row.checked) = $event)
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, row.checked]]), _createElementVNode("span", null, [
                    _createElementVNode("strong", null, _toDisplayString(labels[row.field]||row.field), 1),
                    (row.before)
                      ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Atual: " + _toDisplayString(row.before), 1))
                      : _createCommentVNode("", true),
                    _createElementVNode("span", null, _toDisplayString(row.value), 1),
                    (row.confidence!=null)
                      ? (_openBlock(), _createElementBlock("small", { key: 1 }, "Qualidade média da leitura: " + _toDisplayString(row.confidence) + "% · não é garantia do dado", 1))
                      : _createCommentVNode("", true)
                  ])]))
                }), 128)),
                _createElementVNode("label", { class: "assist-confirm" }, [_withDirectives(_createElementVNode("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": $event => ((s.confirmed) = $event)
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.confirmed]]), _createTextVNode("Conferi os dados e a pessoa à qual este documento pertence.")]),
                _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-primary",
                  onClick: apply,
                  disabled: !s.confirmed||s.busy
                }, "Aplicar campos selecionados", 8, ["onClick", "disabled"])
              ]))
            : _createCommentVNode("", true),
          (s.text)
            ? (_openBlock(), _createElementBlock("details", { key: 7 }, [_createElementVNode("summary", null, "Texto extraído para conferência"), _createElementVNode("pre", { class: "assist-text" }, _toDisplayString(s.text), 1)]))
            : _createCommentVNode("", true)
        ]))
      : _createCommentVNode("", true)]))
  }
},diagnostics:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelText: _vModelText, withModifiers: _withModifiers } = _Vue

    return (_openBlock(), _createElementBlock("section", { "aria-label": "Diagnóstico da instalação" }, [(state.error)
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
      disabled: state.busy,
      class: "portal-fieldset"
    }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Diagnóstico e logs"), _createElementVNode("p", null, "Informações técnicas da escola para análise do suporte. Sem documentos, senhas, tokens ou dados dos alunos.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
      class: "btn btn-secondary",
      onClick: load
    }, "Atualizar diagnóstico", 8, ["onClick"]), _createElementVNode("button", {
      class: "btn btn-primary",
      onClick: download
    }, "Baixar pacote de diagnóstico", 8, ["onClick"])])]), (state.busy)
      ? (_openBlock(), _createElementBlock("p", {
          key: 0,
          role: "status"
        }, "Consultando diagnóstico…"))
      : _createCommentVNode("", true), _createElementVNode("p", { class: "muted" }, "O ZIP inclui resumo, eventos JSONL filtrados, manifesto e hashes. Não é um backup do banco nem uma coleta dos logs do host.")]), (state.summary)
      ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
          _createElementVNode("div", { class: "stats-grid" }, [
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Versão"), _createElementVNode("strong", null, _toDisplayString(state.summary.version), 1), _createElementVNode("small", null, "Build " + _toDisplayString(state.summary.build.build_id||'indisponível'), 1)]),
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Banco"), _createElementVNode("strong", null, _toDisplayString(state.summary.database.status==='ok'?'Disponível':'Indisponível'), 1), _createElementVNode("small", null, _toDisplayString(state.summary.database.dialect), 1)]),
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Armazenamento local"), _createElementVNode("strong", null, _toDisplayString(state.summary.storage.status==='ok'?'Disponível':'Indisponível'), 1), _createElementVNode("small", null, "Não testa provedores externos")]),
            _createElementVNode("div", { class: "stat-card" }, [_createElementVNode("span", null, "Logs"), _createElementVNode("strong", null, _toDisplayString(state.summary.logging.status==='ok'?'Ativos':'Degradados'), 1), _createElementVNode("small", null, "Retenção de " + _toDisplayString(state.summary.logging.retention_days) + " dias ou limite de tamanho", 1)])
          ]),
          _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Atividade dos serviços"), _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.summary.services, (item) => {
            return (_openBlock(), _createElementBlock("div", {
              key: item.service,
              class: "x-record"
            }, [_createElementVNode("strong", null, _toDisplayString(item.service), 1), _createElementVNode("span", null, _toDisplayString(item.status==='recent'?'Atividade recente':item.status==='stale'?'Sem atividade recente':'Ainda não observado'), 1), _createElementVNode("small", null, _toDisplayString(date(item.last_seen||'')), 1)]))
          }), 128))]), _createElementVNode("p", { class: "muted" }, "Atividade observada não equivale ao healthcheck do Docker. Um worker parado ou ausente precisa ser conferido no Dockge.")]),
          _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Disponibilidade da matrícula online"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.summary.portal, (school) => {
            return (_openBlock(), _createElementBlock("div", { key: school.school_name }, [_createElementVNode("h3", null, _toDisplayString(school.school_name) + " · " + _toDisplayString(school.ready?'Disponível':'Pendente'), 1), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(school.issues, (issue) => {
              return (_openBlock(), _createElementBlock("p", { key: issue.code }, _toDisplayString(issue.message), 1))
            }), 128))]))
          }), 128)), _createElementVNode("a", {
            class: "btn btn-secondary",
            href: "#/online"
          }, "Abrir inscrições online")]),
          _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("details", null, [_createElementVNode("summary", null, "Filas, migrations e configuração sem segredos"), _createElementVNode("pre", { class: "diagnostic-pre" }, _toDisplayString(pretty({queues:state.summary.queues,migrations:state.summary.database.migrations,configuration:state.summary.configuration})), 1)])])
        ], 64))
      : _createCommentVNode("", true), _createElementVNode("section", { class: "panel x-card" }, [
      _createElementVNode("h2", null, "Eventos técnicos"),
      _createElementVNode("form", {
        class: "x-filter",
        onSubmit: _withModifiers(search, ["prevent"])
      }, [
        _createElementVNode("label", null, [_createTextVNode("Serviço"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.service) = $event) }, [
          _createElementVNode("option", { value: "" }, "Todos"),
          _createElementVNode("option", null, "app"),
          _createElementVNode("option", null, "worker"),
          _createElementVNode("option", null, "worker-ocr")
        ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.service]])]),
        _createElementVNode("label", null, [_createTextVNode("Nível"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.level) = $event) }, [
          _createElementVNode("option", { value: "" }, "Todos"),
          _createElementVNode("option", null, "INFO"),
          _createElementVNode("option", null, "WARNING"),
          _createElementVNode("option", null, "ERROR")
        ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.level]])]),
        _createElementVNode("label", null, [_createTextVNode("Referência do erro"), _withDirectives(_createElementVNode("input", {
          "onUpdate:modelValue": $event => ((state.reference) = $event),
          maxlength: "24",
          pattern: "[a-f0-9]{24}",
          placeholder: "Código exibido na mensagem"
        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reference]])]),
        _createElementVNode("label", null, [_createTextVNode("Desde (horário local)"), _withDirectives(_createElementVNode("input", {
          type: "datetime-local",
          "onUpdate:modelValue": $event => ((state.since) = $event)
        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.since]])]),
        _createElementVNode("label", null, [_createTextVNode("Até (horário local)"), _withDirectives(_createElementVNode("input", {
          type: "datetime-local",
          "onUpdate:modelValue": $event => ((state.until) = $event)
        }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.until]])]),
        _createElementVNode("button", { class: "btn btn-secondary" }, "Filtrar")
      ], 40, ["onSubmit"]),
      (state.truncated)
        ? (_openBlock(), _createElementBlock("p", {
            key: 0,
            class: "alert warning"
          }, "Recorte limitado aos 10.000 eventos mais recentes. Refine o período."))
        : _createCommentVNode("", true),
      (!state.rows.length)
        ? (_openBlock(), _createElementBlock("p", { key: 1 }, "Nenhum evento neste recorte. Logs antigos não são reconstruídos."))
        : _createCommentVNode("", true),
      _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
        _createElementVNode("th", null, "Horário"),
        _createElementVNode("th", null, "Serviço / nível"),
        _createElementVNode("th", null, "Evento"),
        _createElementVNode("th", null, "Referência"),
        _createElementVNode("th", null, "Detalhes")
      ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.rows, (item, index) => {
        return (_openBlock(), _createElementBlock("tr", { key: index }, [
          _createElementVNode("td", null, _toDisplayString(date(item.timestamp)), 1),
          _createElementVNode("td", null, _toDisplayString(item.service) + " · " + _toDisplayString(item.level), 1),
          _createElementVNode("td", null, [_createTextVNode(_toDisplayString(item.event), 1), _createElementVNode("small", null, _toDisplayString(item.route) + " · " + _toDisplayString(item.status||''), 1)]),
          _createElementVNode("td", null, [_createElementVNode("code", null, _toDisplayString(item.request_id||'—'), 1)]),
          _createElementVNode("td", null, [_createElementVNode("details", null, [_createElementVNode("summary", null, "Ver"), _createElementVNode("pre", { class: "diagnostic-pre" }, _toDisplayString(pretty(item)), 1)])])
        ]))
      }), 128))])])]),
      _createElementVNode("div", { class: "pagination" }, [_createElementVNode("span", null, _toDisplayString(state.total) + " eventos no recorte", 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
        class: "btn btn-secondary",
        disabled: state.page<=1,
        onClick: $event => (page(-1))
      }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("button", {
        class: "btn btn-secondary",
        disabled: state.page*50>=state.total,
        onClick: $event => (page(1))
      }, "Próxima", 8, ["disabled", "onClick"])])])
    ])], 8, ["disabled"])]))
  }
},diary:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, createTextVNode: _createTextVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, vModelText: _vModelText, withModifiers: _withModifiers, vModelCheckbox: _vModelCheckbox } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "diary-workspace",
      "aria-label": "Diário Escolar Digital"
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
      disabled: state.busy,
      class: "portal-fieldset"
    }, [
      _createElementVNode("section", { class: "panel x-card diary-navigation" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Rotina pedagógica"), _createElementVNode("p", null, "Aulas, frequência e avaliações por turma.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
        class: "btn btn-secondary",
        onClick: load
      }, "Atualizar", 8, ["onClick"])])]), _createElementVNode("div", { class: "tabs" }, [
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
      ])]),
      _createElementVNode("details", { class: "panel x-card diary-help" }, [_createElementVNode("summary", null, "Como usar o Diário"), _createElementVNode("ol", null, [
        _createElementVNode("li", null, [_createTextVNode("Em "), _createElementVNode("strong", null, "Configuração"), _createTextVNode(", cadastre períodos e componentes e abra o diário da turma.")]),
        _createElementVNode("li", null, "Selecione o diário, registre a aula e abra a chamada."),
        _createElementVNode("li", null, [_createTextVNode("Em "), _createElementVNode("strong", null, "Avaliações"), _createTextVNode(", lance os resultados. A coordenação define a regra e consolida o período.")]),
        _createElementVNode("li", null, "Preencha os demais registros e envie o diário para revisão antes do fechamento."),
        _createElementVNode("li", null, "As comunicações ficam disponíveis no portal para responsáveis com acesso autorizado.")
      ]), _createElementVNode("p", { class: "muted" }, [_createTextVNode("Alunos da chamada precisam estar matriculados na turma. "), _createElementVNode("a", { href: "#/help" }, "Consultar o guia de uso"), _createTextVNode(".")])]),
      (state.tab==='setup' && can('diary.configure'))
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("section", { class: "panel x-card" }, [
            _createElementVNode("h2", null, "Períodos letivos"),
            (!state.academicYears.length)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 0,
                  class: "alert info"
                }, [_createTextVNode("Cadastre um ano letivo em "), _createElementVNode("a", { href: "#/academic" }, "Estrutura acadêmica"), _createTextVNode(" antes de criar períodos para o Diário.")]))
              : _createCommentVNode("", true),
            _createElementVNode("form", {
              class: "x-form",
              onSubmit: _withModifiers(createPeriod, ["prevent"])
            }, [
              _createElementVNode("label", null, [_createTextVNode("Ano letivo"), _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": $event => ((state.periodForm.academic_year_id) = $event),
                required: ""
              }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.academicYears, (year) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: year.id,
                  value: year.id
                }, _toDisplayString(year.name) + " · " + _toDisplayString(date(year.starts_on)) + " a " + _toDisplayString(date(year.ends_on)), 9, ["value"]))
              }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.periodForm.academic_year_id]])]),
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
            _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods, (p) => {
              return (_openBlock(), _createElementBlock("div", {
                key: p.id,
                class: "x-record"
              }, [_createElementVNode("strong", null, _toDisplayString(p.name), 1), _createElementVNode("span", null, _toDisplayString(date(p.starts_on)) + " a " + _toDisplayString(date(p.ends_on)), 1)]))
            }), 128))])
          ]), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Componentes curriculares"), _createElementVNode("form", {
            class: "x-form",
            onSubmit: _withModifiers(createComponent, ["prevent"])
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
            _createElementVNode("button", { class: "btn btn-primary" }, "Criar componente")
          ], 40, ["onSubmit"]), _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.components, (c) => {
            return (_openBlock(), _createElementBlock("div", {
              key: c.id,
              class: "x-record"
            }, [_createElementVNode("strong", null, _toDisplayString(c.name), 1), _createElementVNode("span", null, _toDisplayString(c.code||'Sem código') + " · " + _toDisplayString(c.workload_hours||0) + "h", 1)]))
          }), 128))])])]), _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Abrir diário"), _createElementVNode("form", {
            class: "x-form",
            onSubmit: _withModifiers(createDiary, ["prevent"])
          }, [
            _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Turma"), _withDirectives(_createElementVNode("select", {
              "onUpdate:modelValue": $event => ((state.diaryForm.class_group_id) = $event),
              onChange: $event => (state.diaryForm.teacher_assignment_id=''),
              required: ""
            }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.groups, (g) => {
              return (_openBlock(), _createElementBlock("option", {
                key: g.id,
                value: g.id
              }, _toDisplayString(g.name), 9, ["value"]))
            }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.diaryForm.class_group_id]])]), _createElementVNode("label", null, [_createTextVNode("Componente"), _withDirectives(_createElementVNode("select", {
              "onUpdate:modelValue": $event => ((state.diaryForm.component_id) = $event),
              required: ""
            }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.components, (c) => {
              return (_openBlock(), _createElementBlock("option", {
                key: c.id,
                value: c.id
              }, _toDisplayString(c.name), 9, ["value"]))
            }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.diaryForm.component_id]])]), _createElementVNode("label", null, [_createTextVNode("Atribuição docente"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.diaryForm.teacher_assignment_id) = $event) }, [_createElementVNode("option", { value: "" }, "Sem atribuição definida"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.assignments.filter(x=>x.active && x.class_group_id===state.diaryForm.class_group_id), (a) => {
              return (_openBlock(), _createElementBlock("option", {
                key: a.id,
                value: a.id
              }, _toDisplayString(a.teacher_name) + " · " + _toDisplayString(a.subject_name||'Componente não informado'), 9, ["value"]))
            }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.diaryForm.teacher_assignment_id]])])]),
            (!state.groups.length || !state.components.length)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 0,
                  class: "alert info"
                }, [_createTextVNode("Antes de abrir o diário, cadastre uma turma em "), _createElementVNode("a", { href: "#/academic" }, "Estrutura acadêmica"), _createTextVNode(" e crie o componente curricular nesta aba.")]))
              : _createCommentVNode("", true),
            _createElementVNode("label", null, [_createTextVNode("Observações"), _withDirectives(_createElementVNode("textarea", {
              "onUpdate:modelValue": $event => ((state.diaryForm.notes) = $event),
              rows: "2",
              maxlength: "4000"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.diaryForm.notes]])]),
            _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: !state.groups.length || !state.components.length
            }, "Abrir diário", 8, ["disabled"])
          ], 40, ["onSubmit"])])], 64))
        : _createCommentVNode("", true),
      (state.tab==='dashboard')
        ? (_openBlock(), _createElementBlock("section", {
            key: 1,
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
              onClick: $event => {state.tab='diaries';selectDiary(d)}
            }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(d.class_name) + " · " + _toDisplayString(d.component_name), 1), _createElementVNode("span", null, _toDisplayString(d.year_name) + " · " + _toDisplayString(label(d.status)), 1)]), _createElementVNode("span", null, "Chamada: " + _toDisplayString(d.pending.lessons_without_complete_attendance) + " · Avaliação: " + _toDisplayString(d.pending.assessment_results_pending) + " · Consolidação: " + _toDisplayString(d.pending.consolidation_results_pending) + " · Ocorrências: " + _toDisplayString(d.pending.occurrences_pending_review), 1)], 8, ["onClick"]))
          }), 128))])]))
        : _createCommentVNode("", true),
      (state.tab==='diaries')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Diários disponíveis"), _createElementVNode("p", null, "Selecione a turma para continuar.")])]), (!state.diaries.length)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "empty"
                  }, [_createElementVNode("p", null, "Nenhum diário disponível para esta escola."), _createElementVNode("p", null, [_createTextVNode("Se você tiver permissão de configuração, crie períodos e componentes na aba "), _createElementVNode("strong", null, "Configuração"), _createTextVNode(". Caso contrário, solicite à coordenação que abra um diário para sua turma.")]), (can('diary.configure'))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "btn btn-secondary",
                        onClick: $event => (state.tab='setup')
                      }, "Abrir configuração", 8, ["onClick"]))
                    : _createCommentVNode("", true)]))
                : _createCommentVNode("", true), _createElementVNode("div", { class: "x-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.diaries, (d) => {
                return (_openBlock(), _createElementBlock("button", {
                  key: d.id,
                  class: "x-record",
                  onClick: $event => (selectDiary(d))
                }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(d.class_name) + " · " + _toDisplayString(d.component_name), 1), _createElementVNode("span", null, _toDisplayString(d.year_name) + " · " + _toDisplayString(d.teacher_name||'Professor não definido'), 1)]), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(d.status)), 1), _createElementVNode("span", null, "→")], 8, ["onClick"]))
              }), 128))])]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(state.selected.year_name) + " · " + _toDisplayString(state.selected.class_name), 1), _createElementVNode("h2", null, _toDisplayString(state.selected.component_name), 1), _createElementVNode("p", null, [_createTextVNode(_toDisplayString(state.selected.teacher_name||'Professor não definido') + " · ", 1), _createElementVNode("span", { class: "badge" }, _toDisplayString(label(state.selected.status)), 1)])]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  class: "btn btn-secondary",
                  onClick: $event => {state.selected=null;state.selectedLesson=null}
                }, "← Voltar", 8, ["onClick"]), (can('diary.reports'))
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
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
                  : _createCommentVNode("", true)]),
                (can('diary.reports'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 0,
                      class: "panel x-card"
                    }, [_createElementVNode("h2", null, "Relatórios oficiais"), _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Relatório"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.reportType) = $event) }, [
                      _createElementVNode("option", { value: "class_diary" }, "Diário da turma/componente"),
                      _createElementVNode("option", { value: "lessons" }, "Registro de aulas"),
                      _createElementVNode("option", { value: "attendance" }, "Mapa de frequência"),
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
                    ], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.reportType]])]), (['period_consolidation','class_diary','attendance','assessments','opinions','occurrences','communications','student_record'].includes(state.reportType))
                      ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.reportPeriod) = $event) }, [_createElementVNode("option", { value: "" }, "Todos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
                          return (_openBlock(), _createElementBlock("option", {
                            key: p.id,
                            value: p.id
                          }, _toDisplayString(p.name), 9, ["value"]))
                        }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.reportPeriod]])]))
                      : _createCommentVNode("", true), (state.reportType==='student_record')
                      ? (_openBlock(), _createElementBlock("label", { key: 1 }, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.reportEnrollment) = $event) }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.roster||[], (r) => {
                          return (_openBlock(), _createElementBlock("option", {
                            key: r.enrollment_id,
                            value: r.enrollment_id
                          }, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 9, ["value"]))
                        }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.reportEnrollment]])]))
                      : _createCommentVNode("", true)]), _createElementVNode("button", {
                      class: "btn btn-primary",
                      onClick: report,
                      disabled: (state.reportType==='period_consolidation'&&!state.reportPeriod)||(state.reportType==='student_record'&&!state.reportEnrollment)
                    }, "Baixar PDF", 8, ["onClick", "disabled"])]))
                  : _createCommentVNode("", true),
                (state.selected.status==='open' && can('diary.write'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 1,
                      class: "panel x-card"
                    }, [_createElementVNode("h2", null, "Registrar aula"), _createElementVNode("form", {
                      class: "x-form",
                      onSubmit: _withModifiers(createLesson, ["prevent"])
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
                      ]])]), _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.lessonForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Sem período"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
                      _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Habilidades / referências"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.lessonForm.skills) = $event),
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonForm.skills]])]), _createElementVNode("label", null, [_createTextVNode("Metodologia"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.lessonForm.methodology) = $event),
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonForm.methodology]])])]),
                      _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Atividades"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.lessonForm.activities) = $event),
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonForm.activities]])]), _createElementVNode("label", null, [_createTextVNode("Tarefa / orientação"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.lessonForm.homework) = $event),
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonForm.homework]])])]),
                      _createElementVNode("label", null, [_createTextVNode("Observações"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.lessonForm.notes) = $event),
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.lessonForm.notes]])]),
                      _createElementVNode("button", { class: "btn btn-primary" }, "Registrar aula")
                    ], 40, ["onSubmit"])]))
                  : _createCommentVNode("", true),
                _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Aulas registradas"), (!state.selected.lessons?.length)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "empty"
                    }, "Nenhuma aula registrada."))
                  : _createCommentVNode("", true), _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                  _createElementVNode("th", null, "Data"),
                  _createElementVNode("th", null, "Aulas"),
                  _createElementVNode("th", null, "Conteúdo"),
                  _createElementVNode("th", null, "Chamada")
                ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.lessons||[], (lesson) => {
                  return (_openBlock(), _createElementBlock("tr", { key: lesson.id }, [
                    _createElementVNode("td", null, _toDisplayString(date(lesson.lesson_date)), 1),
                    _createElementVNode("td", null, _toDisplayString(lesson.lesson_count), 1),
                    _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(lesson.content), 1), _createElementVNode("small", null, _toDisplayString(lesson.skills), 1)]),
                    _createElementVNode("td", null, [_createElementVNode("button", {
                      class: "btn btn-secondary small-button",
                      onClick: $event => (openAttendance(lesson))
                    }, "Abrir chamada", 8, ["onClick"])])
                  ]))
                }), 128))])])])]),
                (state.selectedLesson)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 2,
                      class: "panel x-card"
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Chamada · " + _toDisplayString(date(state.selectedLesson.lesson_date)), 1), _createElementVNode("p", null, _toDisplayString(state.selectedLesson.content), 1)]), _createElementVNode("button", {
                      class: "btn btn-secondary",
                      onClick: $event => (state.selectedLesson=null)
                    }, "Fechar", 8, ["onClick"])]), (!state.attendance.length)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 0,
                          class: "empty"
                        }, "Nenhum aluno estava matriculado nesta turma na data da aula."))
                      : (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "table-wrap"
                        }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Aluno"), _createElementVNode("th", null, "Situação"), _createElementVNode("th", null, "Observação")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.attendance, (r) => {
                          return (_openBlock(), _createElementBlock("tr", { key: r.enrollment_id }, [_createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(r.name), 1), _createElementVNode("small", null, _toDisplayString(r.number), 1)]), _createElementVNode("td", null, [_withDirectives(_createElementVNode("select", {
                            "onUpdate:modelValue": $event => ((r.attendance.status) = $event),
                            "aria-label": 'Presença de '+r.name,
                            disabled: state.selected.status!=='open'||!can('diary.attendance')
                          }, [_createElementVNode("option", { value: "present" }, "Presente"), _createElementVNode("option", { value: "absent" }, "Falta"), _createElementVNode("option", { value: "justified_absence" }, "Falta justificada")], 8, ["onUpdate:modelValue", "aria-label", "disabled"]), [[_vModelSelect, r.attendance.status]])]), _createElementVNode("td", null, [_withDirectives(_createElementVNode("input", {
                            "onUpdate:modelValue": $event => ((r.attendance.note) = $event),
                            maxlength: "500",
                            "aria-label": 'Observação de '+r.name,
                            disabled: state.selected.status!=='open'||!can('diary.attendance')
                          }, null, 8, ["onUpdate:modelValue", "aria-label", "disabled"]), [[_vModelText, r.attendance.note]])])]))
                        }), 128))])])])), (state.selected.status==='open' && can('diary.attendance'))
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 2,
                          class: "btn btn-primary",
                          onClick: saveAttendance,
                          disabled: !state.attendance.length
                        }, "Salvar chamada", 8, ["onClick", "disabled"]))
                      : _createCommentVNode("", true)]))
                  : _createCommentVNode("", true),
                _createElementVNode("section", { class: "panel x-card" }, [
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
                        ? (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [_createElementVNode("p", { class: "alert info" }, "Diário revisado. Registros estão bloqueados até uma reabertura formal."), (can('diary.close'))
                            ? (_openBlock(), _createElementBlock("div", {
                                key: 0,
                                class: "x-form"
                              }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Período do fechamento"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.closePeriod) = $event) }, [_createElementVNode("option", { value: "" }, "Diário completo"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
                                onClick: closeDiary
                              }, _toDisplayString(state.closePeriod?'Fechar período':'Fechar diário'), 9, ["onClick"])]))
                            : _createCommentVNode("", true)], 64))
                        : (state.selected.status==='closed')
                          ? (_openBlock(), _createElementBlock("p", {
                              key: 3,
                              class: "alert info"
                            }, "Diário fechado. Alterações exigem reabertura formal e ficam registradas no histórico."))
                          : _createCommentVNode("", true),
                  (state.selected.status!=='open' && can('diary.reopen'))
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 4,
                        class: "x-form"
                      }, [_createElementVNode("label", null, [_createTextVNode("Motivo da reabertura"), _withDirectives(_createElementVNode("textarea", {
                        "onUpdate:modelValue": $event => ((state.reopenReason) = $event),
                        minlength: "10",
                        maxlength: "1000",
                        rows: "2"
                      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.reopenReason]])]), _createElementVNode("button", {
                        class: "btn btn-secondary",
                        disabled: state.reopenReason.length<10,
                        onClick: reopenDiary
                      }, "Reabrir com justificativa", 8, ["disabled", "onClick"])]))
                    : _createCommentVNode("", true),
                  _createElementVNode("h3", null, "Histórico"),
                  _createElementVNode("div", { class: "table-wrap" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Tipo"), _createElementVNode("th", null, "Data"), _createElementVNode("th", null, "Hash / motivo")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.history.closures, (c) => {
                    return (_openBlock(), _createElementBlock("tr", { key: 'c'+c.id }, [_createElementVNode("td", null, "Fechamento"), _createElementVNode("td", null, _toDisplayString(date(c.closed_at)), 1), _createElementVNode("td", null, [_createElementVNode("code", null, _toDisplayString(c.snapshot_hash), 1)])]))
                  }), 128)), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.history.revisions, (r) => {
                    return (_openBlock(), _createElementBlock("tr", { key: 'r'+r.id }, [_createElementVNode("td", null, "Reabertura"), _createElementVNode("td", null, _toDisplayString(date(r.reopened_at)), 1), _createElementVNode("td", null, _toDisplayString(r.reason), 1)]))
                  }), 128))])])])
                ])
              ], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='planning')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, [_createTextVNode("Selecione um diário na aba "), _createElementVNode("strong", null, "Diários"), _createTextVNode(" para registrar ou consultar o planejamento correspondente.")])]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [(can('diary.write'))
                ? (_openBlock(), _createElementBlock("section", {
                    key: 0,
                    class: "panel x-card"
                  }, [_createElementVNode("h2", null, "Planejamento curricular · " + _toDisplayString(state.selected.class_name) + " · " + _toDisplayString(state.selected.component_name), 1), _createElementVNode("form", {
                    class: "x-form",
                    onSubmit: _withModifiers(createPlan, ["prevent"])
                  }, [
                    _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.planForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Planejamento geral"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
                      return (_openBlock(), _createElementBlock("option", {
                        key: p.id,
                        value: p.id
                      }, _toDisplayString(p.name), 9, ["value"]))
                    }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.planForm.academic_period_id]])]),
                    _createElementVNode("label", null, [_createTextVNode("Objetivos"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.planForm.objectives) = $event),
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.objectives]])]),
                    _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Unidades temáticas"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.planForm.thematic_units) = $event),
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.thematic_units]])]), _createElementVNode("label", null, [_createTextVNode("Objetos de conhecimento"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.planForm.knowledge_objects) = $event),
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.knowledge_objects]])])]),
                    _createElementVNode("label", null, [_createTextVNode("Referências BNCC / habilidades"), _withDirectives(_createElementVNode("input", {
                      "onUpdate:modelValue": $event => ((state.planForm.bncc_references) = $event),
                      placeholder: "Separe códigos por espaço, vírgula ou ponto e vírgula"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.bncc_references]])]),
                    _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Metodologia"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.planForm.methodology) = $event),
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.methodology]])]), _createElementVNode("label", null, [_createTextVNode("Recursos"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.planForm.resources) = $event),
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.resources]])])]),
                    _createElementVNode("label", null, [_createTextVNode("Estratégia de avaliação"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.planForm.assessment_strategy) = $event),
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.assessment_strategy]])]),
                    _createElementVNode("label", null, [_createTextVNode("Observações"), _withDirectives(_createElementVNode("textarea", {
                      "onUpdate:modelValue": $event => ((state.planForm.notes) = $event),
                      rows: "2"
                    }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.planForm.notes]])]),
                    _createElementVNode("button", { class: "btn btn-primary" }, "Salvar planejamento")
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
                }, [_createElementVNode("strong", null, _toDisplayString(label(p.status)), 1), _createElementVNode("p", null, _toDisplayString(p.objectives), 1), _createElementVNode("small", null, _toDisplayString((p.bncc_references||[]).join(', ')), 1)]))
              }), 128))])], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='assessments')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, "Selecione um diário para lançar avaliações.")]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                (can('diary.configure'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 0,
                      class: "panel x-card"
                    }, [_createElementVNode("h2", null, "Regra de avaliação e consolidação"), _createElementVNode("form", {
                      class: "x-form",
                      onSubmit: _withModifiers(saveAssessmentRule, ["prevent"])
                    }, [
                      _createElementVNode("div", { class: "x-grid" }, [
                        _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", {
                          "onUpdate:modelValue": $event => ((state.assessmentRuleForm.period_id) = $event),
                          onChange: $event => (selectRulePeriod(state.assessmentRuleForm.period_id)),
                          required: ""
                        }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
                _createElementVNode("section", { class: "panel x-card" }, [
                  _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Resultados do período"), _createElementVNode("p", null, "Consulte as notas e a frequência consolidadas pela coordenação.")])]),
                  _createElementVNode("div", { class: "x-filter" }, [_createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((state.assessmentRuleForm.period_id) = $event),
                    onChange: $event => {selectRulePeriod(state.assessmentRuleForm.period_id);state.periodResults=[]}
                  }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
                      }, "Há resultados calculados com um critério anterior de frequência. A coordenação deve consolidar novamente o período."))
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
                ]),
                (state.selected.status==='open' && can('diary.assessments'))
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 1,
                      class: "panel x-card"
                    }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h2", null, _toDisplayString(state.assessmentEditing?'Editar avaliação':'Nova avaliação'), 1), (state.assessmentEditing)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          class: "btn btn-secondary small-button",
                          onClick: cancelAssessmentEdit
                        }, "Cancelar edição", 8, ["onClick"]))
                      : _createCommentVNode("", true)]), _createElementVNode("form", {
                      class: "x-form",
                      onSubmit: _withModifiers(createAssessment, ["prevent"])
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
                        _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.assessmentForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Sem período"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
                _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Avaliações registradas"), (!state.assessments.length)
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
                }), 128))])]),
                (state.selectedAssessment)
                  ? (_openBlock(), _createElementBlock("section", {
                      key: 2,
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
                            onClick: saveAssessmentResults,
                            disabled: !state.assessmentRoster.length
                          }, "Salvar resultados", 8, ["onClick", "disabled"]))
                        : _createCommentVNode("", true)
                    ]))
                  : _createCommentVNode("", true)
              ], 64))], 64))
        : _createCommentVNode("", true),
      (state.tab==='opinions')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 5 }, [(!state.selected)
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
                    onSubmit: _withModifiers(saveOpinion, ["prevent"])
                  }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", {
                    "onUpdate:modelValue": $event => ((state.opinionForm.enrollment_id) = $event),
                    required: ""
                  }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.selected.roster||[], (r) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: r.enrollment_id,
                      value: r.enrollment_id
                    }, _toDisplayString(r.name) + " · " + _toDisplayString(r.number), 9, ["value"]))
                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.opinionForm.enrollment_id]])]), _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.opinionForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Geral"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 6 }, [(!state.selected)
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
                    onSubmit: _withModifiers(createPedagogicalRecord, ["prevent"])
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
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 7 }, [(!state.selected)
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
                    onSubmit: _withModifiers(saveOccurrence, ["prevent"])
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
                      }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 8 }, [(!state.selected)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("p", null, "Selecione um diário para enviar comunicados e consultar o histórico.")]))
            : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Comunicado no portal da família"), _createElementVNode("p", null, "O comunicado ficará disponível apenas para os responsáveis legais que confirmaram o vínculo e autorizaram o acesso ao Diário no portal. Esta tela não envia e-mail nem WhatsApp."), _createElementVNode("form", {
                class: "x-form",
                onSubmit: _withModifiers(sendCommunication, ["prevent"])
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
                }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.communicationForm.enrollment_id]])]), _createElementVNode("label", null, [_createTextVNode("Período de referência"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.communicationForm.academic_period_id) = $event) }, [_createElementVNode("option", { value: "" }, "Sem período específico"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.periods.filter(x=>x.academic_year_id===state.selected.academic_year_id), (p) => {
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
    ], 8, ["disabled"])]))
  }
},contracts:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, renderList: _renderList, Fragment: _Fragment, vModelText: _vModelText, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelSelect: _vModelSelect, vModelCheckbox: _vModelCheckbox, vShow: _vShow, withModifiers: _withModifiers, resolveComponent: _resolveComponent, createBlock: _createBlock } = _Vue

    const _component_signing_panel = _resolveComponent("signing-panel")

    return (_openBlock(), _createElementBlock("section", {
      class: "contracts",
      "aria-label": "Modelos e documentos escolares"
    }, [
      (state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(state.error), 1))
        : _createCommentVNode("", true),
      (state.notice)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "alert success",
            role: "status"
          }, _toDisplayString(state.notice), 1))
        : _createCommentVNode("", true),
      _createElementVNode("div", { class: "panel x-card contract-intro" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "DOCUMENTOS DA ESCOLA"), _createElementVNode("h2", null, "Modelos e contratos"), _createElementVNode("p", null, "Cadastre contratos, autorizações, declarações e outros documentos. Vincule cada modelo ao ano letivo e à validade, preencha os dados da matrícula e emita o PDF preservado na ficha do aluno.")]), _createElementVNode("button", {
        class: "btn btn-secondary",
        type: "button",
        disabled: state.loading || state.busy,
        onClick: load
      }, "Atualizar", 8, ["disabled", "onClick"])]), _createElementVNode("div", {
        class: "tabs",
        role: "tablist",
        "aria-label": "Etapas dos documentos"
      }, [_createElementVNode("button", {
        type: "button",
        role: "tab",
        "aria-selected": state.tab==='templates',
        class: _normalizeClass({active:state.tab==='templates'}),
        onClick: $event => (state.tab='templates')
      }, "Modelos", 10, ["aria-selected", "onClick"]), _createElementVNode("button", {
        type: "button",
        role: "tab",
        "aria-selected": state.tab==='issue',
        class: _normalizeClass({active:state.tab==='issue'}),
        onClick: $event => (state.tab='issue')
      }, "Preencher e emitir", 10, ["aria-selected", "onClick"]), (can('documents.read'))
        ? (_openBlock(), _createElementBlock("button", {
            key: 0,
            type: "button",
            role: "tab",
            "aria-selected": state.tab==='signatures',
            class: _normalizeClass({active:state.tab==='signatures'}),
            onClick: $event => (state.tab='signatures')
          }, "Assinaturas e revisão", 10, ["aria-selected", "onClick"]))
        : _createCommentVNode("", true)]), _createElementVNode("p", { class: "small muted" }, "A escola pode manter vários modelos e atualizar suas versões. O documento já emitido conserva o conteúdo e a versão utilizados no momento da emissão.")]),
      (state.loading)
        ? (_openBlock(), _createElementBlock("p", {
            key: 2,
            class: "loading-strip",
            role: "status"
          }, "Carregando modelos…"))
        : _createCommentVNode("", true),
      (state.tab==='templates')
        ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [(!state.editing)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, "Biblioteca de modelos"), _createElementVNode("p", { class: "muted" }, "Modelos inativos continuam no histórico e deixam de aparecer para novas emissões.")]), (can('academic.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-primary",
                    type: "button",
                    onClick: beginNew
                  }, "+ Novo modelo", 8, ["onClick"]))
                : _createCommentVNode("", true)]), _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
                _createElementVNode("th", null, "Modelo"),
                _createElementVNode("th", null, "Categoria"),
                _createElementVNode("th", null, "Ano letivo"),
                _createElementVNode("th", null, "Vigência"),
                _createElementVNode("th", null, "Situação"),
                _createElementVNode("th", null, "Ações")
              ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.templates, (template) => {
                return (_openBlock(), _createElementBlock("tr", { key: template.id }, [
                  _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(template.name), 1), _createElementVNode("small", null, "Versão " + _toDisplayString(template.version), 1)]),
                  _createElementVNode("td", null, _toDisplayString(template.kind), 1),
                  _createElementVNode("td", null, _toDisplayString(yearName(template.academic_year_id)), 1),
                  _createElementVNode("td", null, _toDisplayString(date(template.valid_from)) + " a " + _toDisplayString(date(template.valid_until)), 1),
                  _createElementVNode("td", null, [_createElementVNode("span", { class: _normalizeClass(["badge", template.active?'active':'archived']) }, _toDisplayString(template.active?'Ativo':'Inativo'), 3)]),
                  _createElementVNode("td", null, [(can('academic.write'))
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "link-button",
                        type: "button",
                        onClick: $event => (beginEdit(template))
                      }, "Editar →", 8, ["onClick"]))
                    : (_openBlock(), _createElementBlock("button", {
                        key: 1,
                        class: "link-button",
                        type: "button",
                        onClick: $event => (beginEdit(template))
                      }, "Consultar →", 8, ["onClick"]))])
                ]))
              }), 128))])])]), (!state.templates.length && !state.loading)
                ? (_openBlock(), _createElementBlock("p", {
                    key: 0,
                    class: "empty-state"
                  }, "Nenhum modelo cadastrado. Crie um documento ou importe o texto de um DOCX para começar."))
                : _createCommentVNode("", true)]))
            : (_openBlock(), _createElementBlock("section", {
                key: 1,
                class: "contract-editor",
                "aria-label": "Editor do modelo"
              }, [_createElementVNode("div", { class: "contract-editor-actions" }, [_createElementVNode("h3", null, _toDisplayString(state.selected?'Editar modelo':'Novo modelo'), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                class: "btn btn-secondary",
                type: "button",
                disabled: state.busy,
                onClick: cancelEdit
              }, "Voltar", 8, ["disabled", "onClick"]), (can('academic.write'))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-primary",
                    type: "button",
                    disabled: state.busy,
                    onClick: save
                  }, _toDisplayString(state.busy?'Salvando…':'Salvar modelo'), 9, ["disabled", "onClick"]))
                : _createCommentVNode("", true)])]), _createElementVNode("fieldset", {
                disabled: state.busy || !can('academic.write'),
                class: "contract-editor-grid"
              }, [_createElementVNode("div", { class: "contract-edit-column" }, [
                _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h3", null, "Identificação e período"), _createElementVNode("p", { class: "small muted" }, "Um modelo pode atender qualquer período ou apenas o ano letivo selecionado. Datas são opcionais; quando informadas, limitam a emissão."), _createElementVNode("div", { class: "contract-fields" }, [
                  _createElementVNode("label", { class: "field wide" }, [_createTextVNode("Nome do modelo"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.draft.name) = $event),
                    maxlength: "160",
                    required: "",
                    placeholder: "Ex.: Contrato de prestação de serviços 2027"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.draft.name]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Categoria (código)"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.draft.kind) = $event),
                    onInput: syncContractSignature,
                    pattern: "[a-z][a-z0-9_]{1,39}",
                    maxlength: "40",
                    required: "",
                    placeholder: "educational_contract"
                  }, null, 40, ["onUpdate:modelValue", "onInput"]), [[_vModelText, state.draft.kind]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Ano letivo"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.draft.academic_year_id) = $event) }, [_createElementVNode("option", { value: "" }, "Todos os períodos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.years, (year) => {
                    return (_openBlock(), _createElementBlock("option", {
                      key: year.id,
                      value: year.id
                    }, _toDisplayString(year.name), 9, ["value"]))
                  }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.draft.academic_year_id]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Válido a partir de"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.draft.valid_from) = $event),
                    type: "date"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.draft.valid_from]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Válido até"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.draft.valid_until) = $event),
                    type: "date"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.draft.valid_until]])]),
                  _createElementVNode("label", { class: "field checkbox-field wide" }, [_withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.draft.active) = $event),
                    type: "checkbox"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.draft.active]]), _createTextVNode("Modelo ativo para novas emissões")]),
                  _createElementVNode("label", { class: "field checkbox-field wide" }, [_withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.draft.require_signature) = $event),
                    type: "checkbox",
                    disabled: contractKind(state.draft.kind)
                  }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelCheckbox, state.draft.require_signature]]), _createTextVNode("Exigir assinatura A1 automática da escola no PDF")]),
                  (contractKind(state.draft.kind))
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "small muted wide"
                      }, "Modelos classificados como contrato exigem assinatura A1; esta opção fica obrigatória."))
                    : _createCommentVNode("", true),
                  (state.draft.require_signature)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 1,
                        class: "small muted wide"
                      }, "A emissão exige certificado A1 configurado na escola. A assinatura externa do responsável, quando aplicável, é enviada separadamente e analisada pela Secretaria."))
                    : _createCommentVNode("", true)
                ])]),
                _createElementVNode("section", { class: "panel x-card" }, [
                  _createElementVNode("h3", null, "Importar arquivo de referência"),
                  _createElementVNode("p", { class: "small muted" }, "O DOCX é convertido em texto editável. Revise títulos, tabelas, espaços e cláusulas: a tipografia e a diagramação do Word podem mudar. O PDF final usa a identidade da escola."),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Selecionar DOCX de até 2 MB"), _createElementVNode("input", {
                    type: "file",
                    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    onChange: importDocx
                  }, null, 40, ["onChange"])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Ou carregar modelo JSON local (até 1 MB)"), _createElementVNode("input", {
                    type: "file",
                    accept: ".json,application/json",
                    onChange: importJson
                  }, null, 40, ["onChange"])]),
                  (state.importFileName)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "small muted"
                      }, "Texto importado de " + _toDisplayString(state.importFileName) + ". Salve o modelo para mantê-lo no sistema.", 1))
                    : _createCommentVNode("", true),
                  (state.importWarnings.length)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 1,
                        class: "alert warning",
                        role: "status"
                      }, [_createElementVNode("ul", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.importWarnings, (warning) => {
                        return (_openBlock(), _createElementBlock("li", { key: warning }, _toDisplayString(warning), 1))
                      }), 128))])]))
                    : _createCommentVNode("", true)
                ]),
                _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h3", null, "Papel timbrado (opcional)"), _createElementVNode("p", { class: "small muted" }, "Após salvar o modelo, anexe uma imagem PNG ou JPEG A4 de até 2 MB. A imagem fica privada nesta escola e será repetida como fundo em cada página do PDF. Sem ela, a emissão usa a identidade visual cadastrada da instituição."), (!state.selected)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "alert info"
                    }, "Salve primeiro o modelo para adicionar o papel timbrado."))
                  : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Substituir ou adicionar imagem"), _createElementVNode("input", {
                      type: "file",
                      accept: "image/png,image/jpeg",
                      onChange: letterheadChanged
                    }, null, 40, ["onChange"])]), _createElementVNode("div", { class: "actions spaced" }, [_createElementVNode("button", {
                      type: "button",
                      class: "btn btn-secondary",
                      disabled: !state.letterheadName || state.busy,
                      onClick: uploadLetterhead
                    }, "Enviar " + _toDisplayString(state.letterheadName || 'imagem'), 9, ["disabled", "onClick"]), (state.selected.letterhead_file_id)
                      ? (_openBlock(), _createElementBlock("button", {
                          key: 0,
                          type: "button",
                          class: "btn btn-secondary",
                          disabled: state.busy,
                          onClick: removeLetterhead
                        }, "Remover timbrado", 8, ["disabled", "onClick"]))
                      : _createCommentVNode("", true)]), (state.selected.letterhead_file_id)
                      ? (_openBlock(), _createElementBlock("p", {
                          key: 0,
                          class: "small muted"
                        }, "Imagem privada vinculada ao modelo v" + _toDisplayString(state.selected.version) + ".", 1))
                      : _createCommentVNode("", true)], 64))]),
                _createElementVNode("section", { class: "panel x-card" }, [
                  _createElementVNode("h3", null, "Campos dinâmicos"),
                  _createElementVNode("p", { class: "small muted" }, "Clique para inserir o campo no cursor do cabeçalho, conteúdo ou rodapé. Dados cadastrados são preenchidos na prévia; lacunas podem ser informadas manualmente na emissão."),
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(categories, (group) => {
                    return _withDirectives((_openBlock(), _createElementBlock("details", {
                      key: group,
                      class: "contract-fields-group"
                    }, [_createElementVNode("summary", null, _toDisplayString(group) + " · " + _toDisplayString(categoryFields(group).length) + " campos", 1), _createElementVNode("div", { class: "contract-field-buttons" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(categoryFields(group), (field) => {
                      return (_openBlock(), _createElementBlock("button", {
                        key: field.key,
                        type: "button",
                        class: "btn btn-secondary small-button",
                        title: field.key+' · '+field.source,
                        onClick: $event => (insertField(field.key,$event))
                      }, _toDisplayString(field.label), 9, ["title", "onClick"]))
                    }), 128))])])), [[_vShow, categoryFields(group).length]])
                  }), 128)),
                  _createElementVNode("p", { class: "small muted" }, "Campos deste modelo: " + _toDisplayString(placeholders().join(' · ') || 'nenhum. Use chaves duplas para os campos.'), 1)
                ])
              ]), _createElementVNode("div", { class: "contract-edit-column" }, [_createElementVNode("section", { class: "panel x-card" }, [
                _createElementVNode("h3", null, "Texto do documento"),
                _createElementVNode("p", { class: "small muted" }, "Edite cabeçalho, corpo e rodapé livremente. As quebras de linha são mantidas na prévia e no PDF."),
                _createElementVNode("label", { class: "field" }, [_createTextVNode("Cabeçalho (opcional)"), _withDirectives(_createElementVNode("textarea", {
                  id: "contract-header-editor",
                  "data-section": "header",
                  "onUpdate:modelValue": $event => ((state.draft.header) = $event),
                  onFocus: $event => (state.activeSection='header'),
                  rows: "3",
                  maxlength: "500",
                  placeholder: "Texto adicional acima do corpo"
                }, null, 40, ["onUpdate:modelValue", "onFocus"]), [[_vModelText, state.draft.header]])]),
                _createElementVNode("label", { class: "field" }, [_createTextVNode("Cláusulas e conteúdo"), _withDirectives(_createElementVNode("textarea", {
                  id: "contract-body-editor",
                  "data-section": "body",
                  "onUpdate:modelValue": $event => ((state.draft.body) = $event),
                  onFocus: $event => (state.activeSection='body'),
                  rows: "22",
                  maxlength: "100000",
                  required: "",
                  placeholder: "Digite as cláusulas e inclua campos como {{aluno.nome}}."
                }, null, 40, ["onUpdate:modelValue", "onFocus"]), [[_vModelText, state.draft.body]])]),
                _createElementVNode("label", { class: "field" }, [_createTextVNode("Rodapé (opcional)"), _withDirectives(_createElementVNode("textarea", {
                  id: "contract-footer-editor",
                  "data-section": "footer",
                  "onUpdate:modelValue": $event => ((state.draft.footer) = $event),
                  onFocus: $event => (state.activeSection='footer'),
                  rows: "3",
                  maxlength: "500",
                  placeholder: "Texto adicional de encerramento"
                }, null, 40, ["onUpdate:modelValue", "onFocus"]), [[_vModelText, state.draft.footer]])])
              ]), _createElementVNode("section", {
                class: "contract-paper panel",
                "aria-label": "Prévia textual da página"
              }, [
                (state.letterheadUrl)
                  ? (_openBlock(), _createElementBlock("img", {
                      key: 0,
                      class: "contract-letterhead",
                      src: state.letterheadUrl,
                      alt: "Papel timbrado do modelo"
                    }, null, 8, ["src"]))
                  : _createCommentVNode("", true),
                (!state.letterheadUrl)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 1,
                      class: "contract-paper-head"
                    }, [(identity.logo_url)
                      ? (_openBlock(), _createElementBlock("img", {
                          key: 0,
                          src: identity.logo_url,
                          alt: 'Logotipo de '+identity.display_name
                        }, null, 8, ["src", "alt"]))
                      : _createCommentVNode("", true), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(identity.display_name), 1), _createElementVNode("small", null, "Documento da instituição")])]))
                  : _createCommentVNode("", true),
                _createElementVNode("div", { class: "contract-paper-content" }, [(state.draft.header)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "preserve"
                    }, _toDisplayString(state.draft.header), 1))
                  : _createCommentVNode("", true), _createElementVNode("p", { class: "preserve" }, _toDisplayString(state.draft.body || 'O texto do documento aparecerá aqui.'), 1), (state.draft.footer)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 1,
                      class: "preserve"
                    }, _toDisplayString(state.draft.footer), 1))
                  : _createCommentVNode("", true)]),
                (!state.letterheadUrl)
                  ? (_openBlock(), _createElementBlock("div", {
                      key: 2,
                      class: "contract-paper-foot"
                    }, _toDisplayString(identity.display_name), 1))
                  : _createCommentVNode("", true)
              ])])], 8, ["disabled"])]))], 64))
        : (state.tab==='issue')
          ? (_openBlock(), _createElementBlock(_Fragment, { key: 4 }, [_createElementVNode("section", { class: "panel x-card" }, [
              _createElementVNode("h3", null, "1 · Selecionar matrícula"),
              _createElementVNode("p", { class: "small muted" }, "Pesquise o aluno ou o número da matrícula. A relação de modelos considera o ano letivo e a vigência."),
              (state.enrollment)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "contract-enrollment"
                  }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(state.enrollment.student_name), 1), _createElementVNode("small", null, _toDisplayString(state.enrollment.number) + " · " + _toDisplayString(state.enrollment.year_name) + " · " + _toDisplayString(state.enrollment.status), 1)]), _createElementVNode("button", {
                    type: "button",
                    class: "btn btn-secondary small-button",
                    onClick: clearEnrollment
                  }, "Trocar matrícula", 8, ["onClick"])]))
                : (_openBlock(), _createElementBlock("form", {
                    key: 1,
                    class: "contract-search",
                    onSubmit: _withModifiers(searchEnrollments, ["prevent"])
                  }, [_createElementVNode("label", { class: "field grow" }, [_createTextVNode("Aluno ou matrícula"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.enrollmentSearch) = $event),
                    type: "search",
                    minlength: "2",
                    placeholder: "Digite ao menos 2 caracteres",
                    autocomplete: "off"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.enrollmentSearch]])]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    type: "submit",
                    disabled: state.busy || state.enrollmentSearch.trim().length<2
                  }, "Pesquisar", 8, ["disabled"])], 40, ["onSubmit"])),
              (state.enrollmentChoices.length && !state.enrollment)
                ? (_openBlock(), _createElementBlock("div", {
                    key: 2,
                    class: "contract-results"
                  }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.enrollmentChoices, (enrollment) => {
                    return (_openBlock(), _createElementBlock("button", {
                      key: enrollment.id,
                      type: "button",
                      onClick: $event => (chooseEnrollment(enrollment))
                    }, [_createElementVNode("strong", null, _toDisplayString(enrollment.student_name), 1), _createElementVNode("small", null, _toDisplayString(enrollment.number) + " · " + _toDisplayString(enrollment.year_name) + " · " + _toDisplayString(enrollment.status), 1)], 8, ["onClick"]))
                  }), 128))]))
                : _createCommentVNode("", true)
            ]), (state.enrollment)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 0,
                  class: "panel x-card"
                }, [_createElementVNode("h3", null, "2 · Selecionar modelo válido"), _createElementVNode("label", { class: "field" }, [_createTextVNode("Modelo"), _withDirectives(_createElementVNode("select", {
                  "onUpdate:modelValue": $event => ((state.templateId) = $event),
                  onChange: selectTemplate
                }, [_createElementVNode("option", { value: "" }, "Selecione um documento"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.applicable, (template) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: template.id,
                    value: template.id
                  }, _toDisplayString(template.name) + " · versão " + _toDisplayString(template.version), 9, ["value"]))
                }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.templateId]])]), (!state.applicable.length)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 0,
                      class: "alert info spaced"
                    }, "Não há modelos ativos válidos para esta matrícula. Cadastre um modelo para o período na aba Modelos."))
                  : _createCommentVNode("", true)]))
              : _createCommentVNode("", true), (state.enrollment && state.templateId)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 1,
                  class: "panel x-card"
                }, [
                  _createElementVNode("h3", null, "3 · Conferir e preencher"),
                  _createElementVNode("p", { class: "small muted" }, "A prévia aplica os dados da escola, do aluno, da matrícula e dos responsáveis. Informe os campos ainda pendentes, como valores financeiros, data de assinatura e testemunhas. Dados automáticos já cadastrados devem ser corrigidos na ficha de origem."),
                  _createElementVNode("button", {
                    class: "btn btn-secondary",
                    type: "button",
                    disabled: state.busy,
                    onClick: preview
                  }, _toDisplayString(state.preview?'Atualizar prévia':'Gerar prévia'), 9, ["disabled", "onClick"]),
                  (state.preview)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        class: "contract-preview"
                      }, [
                        (state.preview.missing_fields.length)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 0,
                              class: "alert warning"
                            }, _toDisplayString(state.preview.missing_fields.length) + " campo(s) ainda pendente(s). Preencha abaixo e atualize a prévia.", 1))
                          : _createCommentVNode("", true),
                        (state.previewStale)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 1,
                              class: "alert info"
                            }, "Dados alterados. Atualize a prévia antes da emissão."))
                          : _createCommentVNode("", true),
                        (previewKeys().length)
                          ? (_openBlock(), _createElementBlock("div", {
                              key: 2,
                              class: "contract-value-grid"
                            }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(previewKeys(), (key) => {
                              return (_openBlock(), _createElementBlock("label", {
                                key: key,
                                class: _normalizeClass(["field", {'contract-missing':state.preview.missing_fields.includes(key)}])
                              }, [_createTextVNode(_toDisplayString(fieldLabel(key)) + " ", 1), _createElementVNode("small", { class: "muted" }, _toDisplayString(key) + " · " + _toDisplayString(automaticValue(key)?'do cadastro':'preenchimento desta emissão'), 1), _createElementVNode("input", {
                                value: displayValue(key),
                                readonly: automaticValue(key),
                                onInput: $event => (setValue(key,$event)),
                                "aria-label": fieldLabel(key),
                                autocomplete: "off",
                                maxlength: "2000"
                              }, null, 40, ["value", "readonly", "onInput", "aria-label"])], 2))
                            }), 128))]))
                          : _createCommentVNode("", true),
                        _createElementVNode("div", {
                          class: "contract-paper panel",
                          "aria-label": "Prévia do conteúdo preenchido"
                        }, [_createElementVNode("div", { class: "contract-paper-head" }, [(identity.logo_url)
                          ? (_openBlock(), _createElementBlock("img", {
                              key: 0,
                              src: identity.logo_url,
                              alt: 'Logotipo de '+identity.display_name
                            }, null, 8, ["src", "alt"]))
                          : _createCommentVNode("", true), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(identity.display_name), 1), _createElementVNode("small", null, "Prévia de emissão · versão " + _toDisplayString(state.preview.template_version), 1)])]), _createElementVNode("div", { class: "contract-paper-content preserve" }, [(state.preview.header)
                          ? (_openBlock(), _createElementBlock("p", { key: 0 }, _toDisplayString(state.preview.header), 1))
                          : _createCommentVNode("", true), _createElementVNode("p", null, _toDisplayString(state.preview.content), 1), (state.preview.footer)
                          ? (_openBlock(), _createElementBlock("p", { key: 1 }, _toDisplayString(state.preview.footer), 1))
                          : _createCommentVNode("", true)]), _createElementVNode("div", { class: "contract-paper-foot" }, _toDisplayString(identity.display_name), 1)]),
                        _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                          type: "button",
                          class: "btn btn-secondary",
                          disabled: state.busy || state.previewStale,
                          onClick: downloadPdfPreview
                        }, "Conferir papel timbrado em PDF", 8, ["disabled", "onClick"]), (can('documents.generate'))
                          ? (_openBlock(), _createElementBlock("button", {
                              key: 0,
                              type: "button",
                              class: "btn btn-primary",
                              disabled: state.busy || state.previewStale || !!state.preview.missing_fields.length,
                              onClick: issue
                            }, _toDisplayString(state.busy?'Emitindo…':'Emitir e baixar PDF'), 9, ["disabled", "onClick"]))
                          : _createCommentVNode("", true)])
                      ]))
                    : _createCommentVNode("", true),
                  (state.issued)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 1,
                        class: "alert success"
                      }, [_createElementVNode("span", null, "Documento emitido e preservado na ficha do aluno."), _createElementVNode("button", {
                        class: "link-button",
                        type: "button",
                        onClick: downloadIssued
                      }, "Baixar novamente", 8, ["onClick"])]))
                    : _createCommentVNode("", true)
                ]))
              : _createCommentVNode("", true)], 64))
          : (state.tab==='signatures')
            ? (_openBlock(), _createBlock(_component_signing_panel, {
                key: 5,
                "school-id": schoolId,
                permissions: permissions,
                role: role,
                "enrollment-id": enrollmentId,
                "issued-id": issuedId
              }, null, 8, ["school-id", "permissions", "role", "enrollment-id", "issued-id"]))
            : _createCommentVNode("", true)
    ]))
  }
},signing:function render(_ctx, _cache) {
  with (_ctx) {
    const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, createTextVNode: _createTextVNode, vModelText: _vModelText, withDirectives: _withDirectives, withModifiers: _withModifiers, renderList: _renderList, Fragment: _Fragment, vModelCheckbox: _vModelCheckbox } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "contract-signatures",
      "aria-label": "Assinaturas de documentos"
    }, [
      (state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(state.error), 1))
        : _createCommentVNode("", true),
      (state.notice)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "alert success",
            role: "status"
          }, _toDisplayString(state.notice), 1))
        : _createCommentVNode("", true),
      (state.loading)
        ? (_openBlock(), _createElementBlock("div", {
            key: 2,
            class: "loading-strip",
            role: "status"
          }, "Carregando assinaturas…"))
        : _createCommentVNode("", true),
      (can('schools.manage'))
        ? (_openBlock(), _createElementBlock("section", {
            key: 3,
            class: "panel x-card"
          }, [
            _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "ASSINATURA DA ESCOLA"), _createElementVNode("h3", null, "Certificado A1"), _createElementVNode("p", null, "Assine contratos, declarações, fichas e outros documentos emitidos pela escola.")]), _createElementVNode("span", { class: _normalizeClass(["badge", certificateExpired()?'expired':state.configured?'active':'pending']) }, _toDisplayString(certificateExpired()?'Vencido':state.configured?'Configurado':'Não configurado'), 3)]),
            (state.certificate)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "contract-certificate-metadata"
                }, [_createElementVNode("div", null, [_createElementVNode("small", null, "Sujeito"), _createElementVNode("strong", null, _toDisplayString(state.certificate.subject), 1)]), _createElementVNode("div", null, [_createElementVNode("small", null, "Validade"), _createElementVNode("strong", null, _toDisplayString(date(state.certificate.expires_at)), 1)]), _createElementVNode("details", null, [_createElementVNode("summary", null, "Identificação técnica"), _createElementVNode("small", null, "Impressão digital SHA-256"), _createElementVNode("strong", { class: "mono" }, _toDisplayString(state.certificate.certificate_sha256), 1)])]))
              : (_openBlock(), _createElementBlock("p", {
                  key: 1,
                  class: "alert info"
                }, "Modelos que exigem assinatura da escola somente poderão ser emitidos após a configuração do A1.")),
            (canManageA1())
              ? (_openBlock(), _createElementBlock("form", {
                  key: 2,
                  class: "contract-certificate-form",
                  autocomplete: "off",
                  onSubmit: _withModifiers(saveCertificate, ["prevent"])
                }, [_createElementVNode("label", { class: "field" }, [_createTextVNode(_toDisplayString(state.configured?'Rotacionar certificado':'Cadastrar certificado') + " P12/PFX (até 1 MB)", 1), _createElementVNode("input", {
                  id: "a1-certificate-file",
                  type: "file",
                  accept: ".p12,.pfx,application/x-pkcs12",
                  onChange: certificateChanged,
                  required: ""
                }, null, 40, ["onChange"])]), _createElementVNode("label", { class: "field" }, [_createTextVNode("Senha do arquivo A1"), _withDirectives(_createElementVNode("input", {
                  "onUpdate:modelValue": $event => ((state.certificatePassword) = $event),
                  type: "password",
                  autocomplete: "off",
                  maxlength: "256",
                  required: "",
                  placeholder: "Senha do P12/PFX"
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.certificatePassword]])]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  class: "btn btn-primary",
                  disabled: state.busy || !state.certificateName || !state.certificatePassword
                }, _toDisplayString(state.busy?'Enviando…':'Salvar certificado'), 9, ["disabled"]), (state.configured)
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      type: "button",
                      class: "btn btn-secondary",
                      disabled: state.busy,
                      onClick: $event => (state.removeCertificateOpen=true)
                    }, "Desativar certificado", 8, ["disabled", "onClick"]))
                  : _createCommentVNode("", true)])], 40, ["onSubmit"]))
              : _createCommentVNode("", true),
            (state.removeCertificateOpen)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 3,
                  class: "alert warning"
                }, [_createElementVNode("p", null, "Desativar o certificado para futuras assinaturas? Os documentos já assinados serão preservados."), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary",
                  onClick: $event => (state.removeCertificateOpen=false)
                }, "Manter certificado", 8, ["onClick"]), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-danger",
                  disabled: state.busy,
                  onClick: removeCertificate
                }, "Desativar", 8, ["disabled", "onClick"])])]))
              : _createCommentVNode("", true),
            _createElementVNode("p", { class: "small muted" }, "A rotação não modifica os PDFs já assinados. O certificado e a senha são enviados ao servidor apenas ao salvar; não são guardados no armazenamento deste navegador.")
          ]))
        : _createCommentVNode("", true),
      (can('documents.read'))
        ? (_openBlock(), _createElementBlock("section", {
            key: 4,
            class: "panel x-card"
          }, [
            _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "DOCUMENTOS DA ESCOLA"), _createElementVNode("h3", null, "Prontos para assinatura"), _createElementVNode("p", null, "Confira o PDF e assine com o certificado A1 cadastrado.")]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary",
              disabled: state.busy,
              onClick: loadUnsigned
            }, "Atualizar", 8, ["disabled", "onClick"])]),
            (!state.unsigned.length && !state.loading)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 0,
                  class: "empty-state"
                }, "Nenhum documento aguardando assinatura."))
              : _createCommentVNode("", true),
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.unsigned, (item) => {
              return (_openBlock(), _createElementBlock("div", {
                key: item.document_id,
                class: "contract-queue-row"
              }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(item.student_name), 1), _createElementVNode("small", null, _toDisplayString(({enrollment:'Comprovante de matrícula',declaration:'Declaração escolar',student_record:'Ficha do aluno',template:'Documento personalizado'})[item.kind]||'Documento escolar') + " · " + _toDisplayString(date(item.created_at)), 1)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                type: "button",
                class: "btn btn-secondary small-button",
                onClick: $event => (download(item.file_id,'documento-original.pdf'))
              }, "Conferir PDF", 8, ["onClick"]), (canManageA1())
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    type: "button",
                    class: "btn btn-primary small-button",
                    disabled: state.busy || !state.configured || certificateExpired(),
                    onClick: $event => (signDocument(item))
                  }, "Assinar com A1", 8, ["disabled", "onClick"]))
                : _createCommentVNode("", true)])]))
            }), 128)),
            (state.unsignedTotal>state.limit)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "pagination"
                }, [_createElementVNode("span", null, _toDisplayString(state.unsignedTotal) + " documentos", 1), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary small-button",
                  disabled: state.unsignedOffset===0 || state.busy,
                  onClick: $event => (unsignedPage(-1))
                }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("button", {
                  type: "button",
                  class: "btn btn-secondary small-button",
                  disabled: state.unsignedOffset+state.limit>=state.unsignedTotal || state.busy,
                  onClick: $event => (unsignedPage(1))
                }, "Próxima", 8, ["disabled", "onClick"])]))
              : _createCommentVNode("", true)
          ]))
        : _createCommentVNode("", true),
      (state.enrollmentIssued.length)
        ? (_openBlock(), _createElementBlock("section", {
            key: 5,
            class: "panel x-card"
          }, [_createElementVNode("h3", null, "Documentos emitidos desta matrícula"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.enrollmentIssued, (document) => {
            return (_openBlock(), _createElementBlock("div", {
              key: document.id,
              class: "contract-queue-row"
            }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(document.template_name||'Documento da matrícula'), 1), _createElementVNode("small", null, _toDisplayString(date(document.created_at)) + " · " + _toDisplayString(label(document.signature_status)), 1)]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary small-button",
              onClick: $event => (openReview(document.id))
            }, "Ver assinaturas", 8, ["onClick"])]))
          }), 128))]))
        : _createCommentVNode("", true),
      _createElementVNode("section", { class: "panel x-card" }, [
        _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "CONFERÊNCIA DOCUMENTAL"), _createElementVNode("h3", null, "PDFs assinados aguardando revisão"), _createElementVNode("p", null, "A assinatura externa é adicionada ao PDF pela família. A decisão final requer conferência da identidade e do relatório no VALIDAR/ITI.")]), _createElementVNode("button", {
          type: "button",
          class: "btn btn-secondary",
          disabled: state.busy,
          onClick: loadPending
        }, "Atualizar fila", 8, ["disabled", "onClick"])]),
        (!state.pending.length && !state.loading)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "empty-state"
            }, [_createElementVNode("p", null, "Nenhuma assinatura externa pendente de revisão nesta escola.")]))
          : _createCommentVNode("", true),
        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.pending, (item) => {
          return (_openBlock(), _createElementBlock("div", {
            key: item.document_id,
            class: "contract-queue-row"
          }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(item.student_name), 1), _createElementVNode("small", null, _toDisplayString(date(item.created_at)) + " · matrícula " + _toDisplayString(item.enrollment_id) + " · " + _toDisplayString(label(item.signature_status)), 1)]), _createElementVNode("button", {
            type: "button",
            class: "btn btn-secondary small-button",
            onClick: $event => (openReview(item.document_id))
          }, "Analisar PDF", 8, ["onClick"])]))
        }), 128)),
        (state.pendingTotal>state.limit)
          ? (_openBlock(), _createElementBlock("div", {
              key: 1,
              class: "pagination"
            }, [_createElementVNode("span", null, _toDisplayString(state.pendingTotal) + " pendente(s) · " + _toDisplayString(state.offset+1) + "–" + _toDisplayString(Math.min(state.offset+state.limit,state.pendingTotal)), 1), _createElementVNode("div", null, [_createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary small-button",
              disabled: state.offset===0 || state.busy,
              onClick: $event => (page(-1))
            }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary small-button",
              disabled: state.offset+state.limit>=state.pendingTotal || state.busy,
              onClick: $event => (page(1))
            }, "Próxima", 8, ["disabled", "onClick"])])]))
          : _createCommentVNode("", true)
      ]),
      (state.review)
        ? (_openBlock(), _createElementBlock("section", {
            key: 6,
            class: "panel x-card",
            "aria-label": "Revisão de assinatura"
          }, [
            _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "HISTÓRICO DO DOCUMENTO"), _createElementVNode("h3", null, "Assinaturas e revisões"), _createElementVNode("p", null, "Documento " + _toDisplayString(state.review.document_id), 1)]), _createElementVNode("span", { class: _normalizeClass(["badge", state.review.status==='verified'?'active':state.review.status==='rejected'?'rejected':'pending']) }, _toDisplayString(label(state.review.status)), 3)]),
            _createElementVNode("div", { class: "contract-verification" }, [_createElementVNode("div", null, [_createElementVNode("small", null, "Integridade criptográfica"), _createElementVNode("strong", null, _toDisplayString(state.review.cryptographic_valid===true?'Válida':state.review.cryptographic_valid===false?'Inválida':'Ainda não assinada'), 1)]), _createElementVNode("div", null, [_createElementVNode("small", null, "Cadeia de confiança"), _createElementVNode("strong", null, _toDisplayString(state.review.trust_status||'Não informada'), 1)]), _createElementVNode("div", null, [_createElementVNode("small", null, "Revogação consultada"), _createElementVNode("strong", null, _toDisplayString(state.review.revocation_checked===true?'Sim':state.review.revocation_checked===false?'Não':'Não disponível'), 1)])]),
            (state.review.status==='pending_validation')
              ? (_openBlock(), _createElementBlock("p", {
                  key: 0,
                  class: "alert warning"
                }, "A conferência no VALIDAR/ITI e a comparação do CPF do responsável exigem análise humana. A matrícula não deve ser liberada antes da validação registrada."))
              : _createCommentVNode("", true),
            (state.review.cryptographic_valid===false)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 1,
                  class: "alert error"
                }, "A integridade criptográfica do PDF falhou. Não valide esta assinatura."))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "actions" }, [(state.review.file_id)
              ? (_openBlock(), _createElementBlock("button", {
                  key: 0,
                  type: "button",
                  class: "btn btn-secondary",
                  onClick: $event => (download(state.review.file_id,'contrato-revisao-atual.pdf'))
                }, "Baixar PDF atual", 8, ["onClick"]))
              : _createCommentVNode("", true)]),
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.review.revisions, (revision) => {
              return (_openBlock(), _createElementBlock("div", {
                key: revision.id,
                class: "contract-revision"
              }, [_createElementVNode("div", null, [
                _createElementVNode("strong", null, _toDisplayString(revision.source==='company_a1'?'Assinatura A1 da escola':'Assinatura externa do responsável'), 1),
                _createElementVNode("small", null, _toDisplayString(date(revision.created_at)) + " · " + _toDisplayString(revision.signer) + " · " + _toDisplayString(revision.trust_status), 1),
                _createElementVNode("small", { class: "mono" }, "SHA-256 " + _toDisplayString(revision.sha256), 1),
                (revision.validated_at)
                  ? (_openBlock(), _createElementBlock("small", { key: 0 }, "Conferido em " + _toDisplayString(date(revision.validated_at)) + " · referência " + _toDisplayString(revision.validation_reference), 1))
                  : _createCommentVNode("", true),
                (revision.rejection_reason)
                  ? (_openBlock(), _createElementBlock("small", { key: 1 }, "Devolvido: " + _toDisplayString(revision.rejection_reason), 1))
                  : _createCommentVNode("", true)
              ]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
                type: "button",
                class: "link-button",
                onClick: $event => (download(revision.file_id,'contrato-assinado.pdf'))
              }, "Baixar revisão", 8, ["onClick"]), (revision.validation_evidence_file_id)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    type: "button",
                    class: "link-button",
                    onClick: $event => (download(revision.validation_evidence_file_id,'relatorio-validar-iti.pdf'))
                  }, "Relatório VALIDAR/ITI", 8, ["onClick"]))
                : _createCommentVNode("", true)])]))
            }), 128)),
            (state.review.status==='pending_validation' && canDecide())
              ? (_openBlock(), _createElementBlock("section", {
                  key: 2,
                  class: "contract-decision"
                }, [_createElementVNode("div", null, [_createElementVNode("h3", null, "Registrar conferência no VALIDAR/ITI"), _createElementVNode("p", { class: "small muted" }, "Abra o PDF acima no serviço oficial de validação, confira o resultado e o CPF do signatário. Anexe o relatório PDF gerado pelo VALIDAR/ITI e registre sua referência. O relatório integra o histórico imutável deste documento."), _createElementVNode("form", {
                  class: "contract-decision-form",
                  onSubmit: _withModifiers(validate, ["prevent"])
                }, [
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("CPF do responsável conferido"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.signerCpf) = $event),
                    inputmode: "numeric",
                    autocomplete: "off",
                    maxlength: "14",
                    placeholder: "000.000.000-00",
                    required: ""
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.signerCpf]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Referência do relatório"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.validationReference) = $event),
                    autocomplete: "off",
                    maxlength: "120",
                    placeholder: "Identificador do VALIDAR/ITI",
                    required: ""
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.validationReference]])]),
                  _createElementVNode("label", { class: "field" }, [_createTextVNode("Relatório PDF do VALIDAR/ITI"), _createElementVNode("input", {
                    type: "file",
                    accept: ".pdf,application/pdf",
                    onChange: reportChanged,
                    required: ""
                  }, null, 40, ["onChange"])]),
                  _createElementVNode("label", { class: "field checkbox-field wide" }, [_withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((state.confirmedReview) = $event),
                    type: "checkbox",
                    required: ""
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.confirmedReview]]), _createTextVNode("Conferi a integridade do PDF, a identidade e o resultado do relatório")]),
                  _createElementVNode("button", {
                    class: "btn btn-primary",
                    disabled: state.busy || !state.confirmedReview || !state.reportName
                  }, "Registrar validação", 8, ["disabled"])
                ], 40, ["onSubmit"])]), _createElementVNode("div", null, [_createElementVNode("h3", null, "Devolver assinatura"), _createElementVNode("p", { class: "small muted" }, "Explique o problema; a versão A1 original da escola continuará disponível para novo envio pelo responsável."), _createElementVNode("form", { onSubmit: _withModifiers(reject, ["prevent"]) }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Motivo da devolução"), _withDirectives(_createElementVNode("textarea", {
                  "onUpdate:modelValue": $event => ((state.rejectionReason) = $event),
                  rows: "4",
                  minlength: "10",
                  maxlength: "2000",
                  required: ""
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.rejectionReason]])]), _createElementVNode("button", {
                  class: "btn btn-secondary spaced",
                  disabled: state.busy || state.rejectionReason.trim().length<10
                }, "Devolver para correção", 8, ["disabled"])], 40, ["onSubmit"])])]))
              : _createCommentVNode("", true)
          ]))
        : _createCommentVNode("", true)
    ]))
  }
},reports:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, toDisplayString: _toDisplayString, vModelSelect: _vModelSelect, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelText: _vModelText, createCommentVNode: _createCommentVNode, withModifiers: _withModifiers, normalizeClass: _normalizeClass } = _Vue

    return (_openBlock(), _createElementBlock("div", { class: "reports-workspace" }, [_createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "CONSULTA E EXPORTAÇÃO"), _createElementVNode("h2", null, "Relatórios da escola"), _createElementVNode("p", null, "Escolha o relatório e o período que deseja acompanhar.")])]), _createElementVNode("form", { onSubmit: _withModifiers($event => (generate()), ["prevent"]) }, [_createElementVNode("fieldset", {
      disabled: state.busy,
      class: "report-filter-fields"
    }, [_createElementVNode("div", { class: "x-grid" }, [
      _createElementVNode("label", null, [_createTextVNode("Relatório"), _withDirectives(_createElementVNode("select", {
        "aria-label": "Relatório",
        "onUpdate:modelValue": $event => ((state.kind) = $event),
        onChange: changeKind,
        required: ""
      }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.catalog, (item) => {
        return (_openBlock(), _createElementBlock("option", {
          key: item.id,
          value: item.id
        }, _toDisplayString(item.title), 9, ["value"]))
      }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.kind]])]),
      _createElementVNode("label", null, [_createTextVNode("Período"), _withDirectives(_createElementVNode("select", {
        "aria-label": "Período",
        "onUpdate:modelValue": $event => ((state.preset) = $event),
        onChange: period
      }, [
        _createElementVNode("option", { value: "last-three" }, "Últimos três meses completos"),
        _createElementVNode("option", { value: "month" }, "Mês atual"),
        _createElementVNode("option", { value: "quarter" }, "Trimestre atual"),
        _createElementVNode("option", { value: "year" }, "Ano atual"),
        _createElementVNode("option", { value: "custom" }, "Personalizado")
      ], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.preset]])]),
      _createElementVNode("label", null, [_createTextVNode("De"), _withDirectives(_createElementVNode("input", {
        type: "date",
        "onUpdate:modelValue": $event => ((state.dateFrom) = $event),
        onInput: $event => (state.preset='custom'),
        required: ""
      }, null, 40, ["onUpdate:modelValue", "onInput"]), [[_vModelText, state.dateFrom]])]),
      _createElementVNode("label", null, [_createTextVNode("Até"), _withDirectives(_createElementVNode("input", {
        type: "date",
        "onUpdate:modelValue": $event => ((state.dateTo) = $event),
        onInput: $event => (state.preset='custom'),
        min: state.dateFrom,
        required: ""
      }, null, 40, ["onUpdate:modelValue", "onInput", "min"]), [[_vModelText, state.dateTo]])])
    ]), _createElementVNode("details", { class: "report-extra-filters" }, [_createElementVNode("summary", null, "Mais filtros"), _createElementVNode("div", { class: "x-grid" }, [
      (filterAllowed('academic_year_id'))
        ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Ano letivo"), _withDirectives(_createElementVNode("select", {
            "onUpdate:modelValue": $event => ((state.academicYear) = $event),
            onChange: $event => (state.classGroup='')
          }, [_createElementVNode("option", { value: "" }, "Todos"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(catalogs['academic-years'] || [], (item) => {
            return (_openBlock(), _createElementBlock("option", {
              key: item.id,
              value: item.id
            }, _toDisplayString(item.name), 9, ["value"]))
          }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.academicYear]])]))
        : _createCommentVNode("", true),
      (filterAllowed('unit_id'))
        ? (_openBlock(), _createElementBlock("label", { key: 1 }, [_createTextVNode("Unidade"), _withDirectives(_createElementVNode("select", {
            "onUpdate:modelValue": $event => ((state.unit) = $event),
            onChange: $event => (state.classGroup='')
          }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(catalogs.units || [], (item) => {
            return (_openBlock(), _createElementBlock("option", {
              key: item.id,
              value: item.id
            }, _toDisplayString(item.name), 9, ["value"]))
          }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.unit]])]))
        : _createCommentVNode("", true),
      (filterAllowed('class_group_id'))
        ? (_openBlock(), _createElementBlock("label", { key: 2 }, [_createTextVNode("Turma"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.classGroup) = $event) }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(classes(), (item) => {
            return (_openBlock(), _createElementBlock("option", {
              key: item.id,
              value: item.id
            }, _toDisplayString(item.name), 9, ["value"]))
          }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.classGroup]])]))
        : _createCommentVNode("", true),
      (selected()?.statuses?.length)
        ? (_openBlock(), _createElementBlock("label", { key: 3 }, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", { "onUpdate:modelValue": $event => ((state.status) = $event) }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(selected().statuses, (item) => {
            return (_openBlock(), _createElementBlock("option", {
              key: item.value,
              value: item.value
            }, _toDisplayString(item.label), 9, ["value"]))
          }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, state.status]])]))
        : _createCommentVNode("", true),
      _createElementVNode("label", null, [_createTextVNode("Pesquisar"), _withDirectives(_createElementVNode("input", {
        "onUpdate:modelValue": $event => ((state.q) = $event),
        type: "search",
        maxlength: "160",
        placeholder: "Nome ou identificação"
      }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.q]])])
    ])]), _createElementVNode("div", { class: "report-generate-row" }, [_createElementVNode("p", { class: "muted small" }, _toDisplayString(selected()?.date_basis), 1), _createElementVNode("button", {
      class: "btn btn-primary",
      type: "submit",
      disabled: !state.kind
    }, _toDisplayString(state.busy?'Gerando…':'Gerar relatório'), 9, ["disabled"])])], 8, ["disabled"])], 40, ["onSubmit"]), (state.error)
      ? (_openBlock(), _createElementBlock("div", {
          key: 0,
          class: "alert error",
          role: "alert"
        }, _toDisplayString(state.error), 1))
      : _createCommentVNode("", true)]), (state.result)
      ? (_openBlock(), _createElementBlock("section", {
          key: 0,
          class: "report-result",
          "aria-live": "polite",
          "aria-busy": state.busy
        }, [
          (changed())
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "alert warning"
              }, "Os filtros foram alterados. Clique em Gerar relatório para atualizar os resultados."))
            : _createCommentVNode("", true),
          _createElementVNode("div", { class: "report-metrics" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.result.summary, (metric) => {
            return (_openBlock(), _createElementBlock("article", {
              key: metric.key,
              class: "panel report-metric"
            }, [_createElementVNode("span", null, _toDisplayString(metric.label), 1), _createElementVNode("strong", null, _toDisplayString(value(metric.value,metric.type)), 1)]))
          }), 128))]),
          _createElementVNode("section", { class: "panel" }, [
            _createElementVNode("div", { class: "panel-header" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, _toDisplayString(state.result.title), 1), _createElementVNode("p", { class: "muted small" }, _toDisplayString(state.result.period.label) + " · " + _toDisplayString(state.result.total) + " registro(s)", 1)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
              class: "btn btn-secondary",
              disabled: state.busy || changed(),
              onClick: $event => (download('csv'))
            }, "Exportar CSV", 8, ["disabled", "onClick"]), _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: state.busy || changed(),
              onClick: $event => (download('pdf'))
            }, "Baixar PDF", 8, ["disabled", "onClick"])])]),
            _createElementVNode("div", { class: "report-applied-filters" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.result.filters, (filter) => {
              return (_openBlock(), _createElementBlock("span", {
                key: filter.label,
                class: "badge"
              }, _toDisplayString(filter.label) + ": " + _toDisplayString(filter.value), 1))
            }), 128))]),
            _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("caption", { class: "sr-only" }, _toDisplayString(state.result.title), 1), _createElementVNode("thead", null, [_createElementVNode("tr", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.result.columns, (column) => {
              return (_openBlock(), _createElementBlock("th", {
                key: column.key,
                scope: "col"
              }, _toDisplayString(column.label), 1))
            }), 128))])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.result.items, (item, index) => {
              return (_openBlock(), _createElementBlock("tr", { key: index }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.result.columns, (column) => {
                return (_openBlock(), _createElementBlock("td", {
                  key: column.key,
                  class: _normalizeClass({'numeric-cell':column.type==='currency'})
                }, _toDisplayString(value(item[column.key],column.type)), 3))
              }), 128))]))
            }), 128))])])]),
            (!state.result.total)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "empty-state"
                }, [_createElementVNode("h3", null, "Nenhum registro neste período"), _createElementVNode("p", null, "Ajuste as datas ou os filtros para ampliar a consulta.")]))
              : _createCommentVNode("", true),
            (state.result.total>state.result.page_size)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "pagination"
                }, [_createElementVNode("button", {
                  class: "btn btn-secondary",
                  disabled: state.busy || changed() || state.page<=1,
                  onClick: $event => (generate(state.page-1))
                }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("span", null, "Página " + _toDisplayString(state.page) + " de " + _toDisplayString(Math.ceil(state.result.total/state.result.page_size)), 1), _createElementVNode("button", {
                  class: "btn btn-secondary",
                  disabled: state.busy || changed() || state.page*state.result.page_size>=state.result.total,
                  onClick: $event => (generate(state.page+1))
                }, "Próxima", 8, ["disabled", "onClick"])]))
              : _createCommentVNode("", true)
          ]),
          (state.result.monthly.length)
            ? (_openBlock(), _createElementBlock("section", {
                key: 1,
                class: "panel x-card"
              }, [_createElementVNode("h3", null, "Resumo por mês"), _createElementVNode("div", { class: "report-months" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.result.monthly, (month) => {
                return (_openBlock(), _createElementBlock("article", { key: month.month }, [_createElementVNode("span", null, _toDisplayString(month.label), 1), _createElementVNode("strong", null, _toDisplayString(month.count) + " registro(s)", 1), (month.amount!==undefined)
                  ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(value(month.amount,'currency')), 1))
                  : _createCommentVNode("", true)]))
              }), 128))])]))
            : _createCommentVNode("", true),
          (state.result.notes.length)
            ? (_openBlock(), _createElementBlock("details", {
                key: 2,
                class: "panel x-card"
              }, [_createElementVNode("summary", null, "Critérios do relatório"), _createElementVNode("ul", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.result.notes, (note) => {
                return (_openBlock(), _createElementBlock("li", { key: note }, _toDisplayString(note), 1))
              }), 128))])]))
            : _createCommentVNode("", true)
        ], 8, ["aria-busy"]))
      : (!state.busy)
        ? (_openBlock(), _createElementBlock("section", {
            key: 1,
            class: "panel empty-state"
          }, [_createElementVNode("h3", null, "A informação que você precisa, no período certo"), _createElementVNode("p", null, "Consulte os registros em tela ou gere um documento com os filtros, os totais e a identificação da escola.")]))
        : _createCommentVNode("", true)]))
  }
},legacyImport:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, normalizeClass: _normalizeClass, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, vModelText: _vModelText, withModifiers: _withModifiers, vModelCheckbox: _vModelCheckbox } = _Vue

    return (_openBlock(), _createElementBlock("div", { class: "import-workspace" }, [
      _createElementVNode("ol", {
        class: "import-steps",
        "aria-label": "Etapas da importação"
      }, [_createElementVNode("li", { class: _normalizeClass({active:!state.inventory}) }, [_createElementVNode("span", null, "1"), _createTextVNode(" Escolher arquivo")], 2), _createElementVNode("li", { class: _normalizeClass({active:state.inventory && !state.preview}) }, [_createElementVNode("span", null, "2"), _createTextVNode(" Selecionar dados")], 2), _createElementVNode("li", { class: _normalizeClass({active:!!state.preview}) }, [_createElementVNode("span", null, "3"), _createTextVNode(" Conferir e importar")], 2)]),
      (state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(state.error), 1))
        : _createCommentVNode("", true),
      (state.result)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "alert success",
            role: "status"
          }, "Importação concluída em " + _toDisplayString(schoolName) + ". Os detalhes estão disponíveis no histórico abaixo.", 1))
        : _createCommentVNode("", true),
      _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, "Importar da aplicação anterior"), _createElementVNode("p", null, "Escolha exatamente os cadastros que deseja trazer para esta escola.")])]), _createElementVNode("div", { class: "import-destination" }, [_createElementVNode("span", null, "Instituição de destino"), _createElementVNode("strong", null, _toDisplayString(schoolName), 1), _createElementVNode("small", null, "A importação mantém esta instituição.")]), _createElementVNode("fieldset", {
        disabled: state.busy,
        class: "report-filter-fields"
      }, [_createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Arquivo SQLite ou backup ZIP"), _createElementVNode("input", {
        type: "file",
        accept: ".zip,.db,.sqlite,.sqlite3",
        onChange: $event => (fileChange($event,'backup'))
      }, null, 40, ["onChange"]), (state.backupName)
        ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(state.backupName), 1))
        : _createCommentVNode("", true)]), _createElementVNode("label", null, [
        _createTextVNode("Fotos e documentos em ZIP "),
        _createElementVNode("span", { class: "muted" }, "(opcional)"),
        _createElementVNode("input", {
          type: "file",
          accept: ".zip",
          onChange: $event => (fileChange($event,'media'))
        }, null, 40, ["onChange"]),
        (state.mediaName)
          ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(state.mediaName), 1))
          : _createCommentVNode("", true)
      ])]), _createElementVNode("div", { class: "report-generate-row" }, [_createElementVNode("span", { class: "muted small" }, "O arquivo será analisado antes de qualquer gravação."), _createElementVNode("button", {
        class: "btn btn-primary",
        disabled: !state.backupName,
        onClick: analyze
      }, _toDisplayString(state.busy?'Aguarde…':'Analisar arquivo'), 9, ["disabled", "onClick"])])], 8, ["disabled"])]),
      (state.inventory)
        ? (_openBlock(), _createElementBlock("section", {
            key: 2,
            class: "panel x-card"
          }, [_createElementVNode("h2", null, "O que deseja importar?"), _createElementVNode("p", { class: "muted" }, "Marque as categorias e escolha todos os registros ou apenas os que você indicar."), _createElementVNode("fieldset", {
            disabled: state.busy,
            class: "report-filter-fields"
          }, [
            _createElementVNode("label", null, [_createTextVNode("Unidade de destino"), _withDirectives(_createElementVNode("select", {
              "onUpdate:modelValue": $event => ((state.selection.unit_id) = $event),
              onChange: destinationChanged
            }, [_createElementVNode("option", { value: "" }, "Não definir uma unidade"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(units, (unit) => {
              return (_openBlock(), _createElementBlock("option", {
                key: unit.id,
                value: unit.id
              }, _toDisplayString(unit.name), 9, ["value"]))
            }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.selection.unit_id]]), _createElementVNode("small", { class: "muted" }, "Ao escolher uma unidade existente, as unidades do arquivo não serão criadas.")]),
            _createElementVNode("div", { class: "import-selection" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(categories(), (table) => {
              return (_openBlock(), _createElementBlock("article", {
                key: table.name,
                class: _normalizeClass(["import-category", {selected:state.selection.tables.includes(table.name)}])
              }, [_createElementVNode("label", { class: "import-check" }, [_createElementVNode("input", {
                type: "checkbox",
                checked: state.selection.tables.includes(table.name),
                disabled: table.name==='unidades_escolares' && !!state.selection.unit_id,
                onChange: $event => (toggleTable(table.name))
              }, null, 40, ["checked", "disabled", "onChange"]), _createElementVNode("span", null, [_createElementVNode("strong", null, _toDisplayString(tableName(table.name)), 1), _createElementVNode("small", null, _toDisplayString(table.rows) + " registro(s) disponível(is)", 1)])]), (state.selection.tables.includes(table.name))
                ? (_openBlock(), _createElementBlock("div", {
                    key: 0,
                    class: "import-category-actions"
                  }, [_createElementVNode("span", { class: "badge" }, _toDisplayString(count(table.name,table.rows)) + " selecionado(s)", 1), _createElementVNode("button", {
                    class: "link-button",
                    onClick: $event => (chooseRecords(table.name))
                  }, "Escolher registros", 8, ["onClick"]), (table.name in state.selection.record_ids)
                    ? (_openBlock(), _createElementBlock("button", {
                        key: 0,
                        class: "link-button",
                        onClick: $event => (allRecords(table.name))
                      }, "Selecionar todos", 8, ["onClick"]))
                    : _createCommentVNode("", true)]))
                : _createCommentVNode("", true)], 2))
            }), 128))]),
            (state.recordTable && state.records)
              ? (_openBlock(), _createElementBlock("section", {
                  key: 0,
                  class: "import-records"
                }, [
                  _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("h3", null, _toDisplayString(tableName(state.recordTable)) + " · seleção individual", 1), _createElementVNode("button", {
                    class: "btn btn-secondary small-button",
                    onClick: $event => {state.recordTable='';state.records=null}
                  }, "Concluir seleção", 8, ["onClick"])]),
                  _createElementVNode("form", {
                    class: "filter-bar",
                    onSubmit: _withModifiers($event => (loadRecords(1)), ["prevent"])
                  }, [_createElementVNode("label", {
                    class: "sr-only",
                    for: "import-record-search"
                  }, "Pesquisar registro"), _withDirectives(_createElementVNode("input", {
                    id: "import-record-search",
                    type: "search",
                    "onUpdate:modelValue": $event => ((state.recordQuery) = $event),
                    placeholder: "Pesquisar pelo nome ou código"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.recordQuery]]), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    type: "submit"
                  }, "Pesquisar")], 40, ["onSubmit"]),
                  _createElementVNode("div", { class: "import-record-list" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.records.items, (record) => {
                    return (_openBlock(), _createElementBlock("label", {
                      key: record.id,
                      class: "import-check"
                    }, [_createElementVNode("input", {
                      type: "checkbox",
                      checked: (state.selection.record_ids[state.recordTable] || []).includes(record.id),
                      onChange: $event => (toggleRecord(record.id))
                    }, null, 40, ["checked", "onChange"]), _createElementVNode("span", null, [_createTextVNode(_toDisplayString(record.name || record.id), 1), _createElementVNode("small", null, "Código " + _toDisplayString(record.id), 1)])]))
                  }), 128))]),
                  (!state.records.items.length)
                    ? (_openBlock(), _createElementBlock("p", {
                        key: 0,
                        class: "empty-state"
                      }, "Nenhum registro encontrado."))
                    : _createCommentVNode("", true),
                  _createElementVNode("div", { class: "pagination" }, [_createElementVNode("button", {
                    class: "btn btn-secondary",
                    disabled: state.records.page<=1,
                    onClick: $event => (loadRecords(state.records.page-1))
                  }, "Anterior", 8, ["disabled", "onClick"]), _createElementVNode("span", null, _toDisplayString(state.records.total) + " resultado(s) · página " + _toDisplayString(state.records.page), 1), _createElementVNode("button", {
                    class: "btn btn-secondary",
                    disabled: state.records.page*state.records.page_size>=state.records.total,
                    onClick: $event => (loadRecords(state.records.page+1))
                  }, "Próxima", 8, ["disabled", "onClick"])])
                ]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "import-media-options" }, [_createElementVNode("label", { class: "import-check" }, [_withDirectives(_createElementVNode("input", {
              type: "checkbox",
              "onUpdate:modelValue": $event => ((state.selection.include_photos) = $event),
              onChange: invalidate
            }, null, 40, ["onUpdate:modelValue", "onChange"]), [[_vModelCheckbox, state.selection.include_photos]]), _createElementVNode("span", null, "Importar fotos dos registros selecionados")]), _createElementVNode("label", { class: "import-check" }, [_withDirectives(_createElementVNode("input", {
              type: "checkbox",
              "onUpdate:modelValue": $event => ((state.selection.include_media) = $event),
              onChange: invalidate
            }, null, 40, ["onUpdate:modelValue", "onChange"]), [[_vModelCheckbox, state.selection.include_media]]), _createElementVNode("span", null, "Importar documentos e arquivos vinculados")])]),
            (extras().length)
              ? (_openBlock(), _createElementBlock("details", { key: 1 }, [_createElementVNode("summary", null, "Outros dados do arquivo"), _createElementVNode("p", { class: "muted small" }, "Estas categorias serão preservadas somente no histórico da importação, sem criar cadastros na aplicação."), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(extras(), (table) => {
                  return (_openBlock(), _createElementBlock("label", {
                    key: table.name,
                    class: "import-check"
                  }, [_createElementVNode("input", {
                    type: "checkbox",
                    checked: state.selection.tables.includes(table.name),
                    onChange: $event => (toggleTable(table.name))
                  }, null, 40, ["checked", "onChange"]), _createElementVNode("span", null, _toDisplayString(tableName(table.name)) + " · " + _toDisplayString(table.rows) + " registro(s)", 1)]))
                }), 128))]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "report-generate-row" }, [_createElementVNode("p", { class: "muted small" }, "Responsáveis, vínculos e matrículas devem ser selecionados quando você quiser trazê-los também."), _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: !state.selection.tables.length,
              onClick: review
            }, "Conferir seleção", 8, ["disabled", "onClick"])])
          ], 8, ["disabled"])]))
        : _createCommentVNode("", true),
      (state.preview)
        ? (_openBlock(), _createElementBlock("section", {
            key: 3,
            class: "panel x-card"
          }, [
            _createElementVNode("h2", null, "Confira antes de importar"),
            _createElementVNode("p", null, [
              _createElementVNode("strong", null, _toDisplayString(state.preview.selected_record_count) + " registro(s)", 1),
              _createTextVNode(" para " + _toDisplayString(state.preview.destination.school_name), 1),
              (state.preview.destination.unit_name)
                ? (_openBlock(), _createElementBlock("span", { key: 0 }, " · " + _toDisplayString(state.preview.destination.unit_name), 1))
                : _createCommentVNode("", true),
              _createTextVNode(".")
            ]),
            _createElementVNode("div", { class: "table-scroll" }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [_createElementVNode("th", null, "Categoria"), _createElementVNode("th", null, "Selecionados"), _createElementVNode("th", null, "Destino")])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.preview.tables.filter(t=>t.selected_rows>0), (table) => {
              return (_openBlock(), _createElementBlock("tr", { key: table.name }, [_createElementVNode("td", null, _toDisplayString(tableName(table.name)), 1), _createElementVNode("td", null, _toDisplayString(table.selected_rows), 1), _createElementVNode("td", null, _toDisplayString(table.destination), 1)]))
            }), 128))])])]),
            (state.preview.issues?.length)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "alert error"
                }, [_createElementVNode("ul", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.preview.issues, (issue) => {
                  return (_openBlock(), _createElementBlock("li", { key: issue }, _toDisplayString(issue), 1))
                }), 128))])]))
              : _createCommentVNode("", true),
            (state.preview.warnings?.length)
              ? (_openBlock(), _createElementBlock("details", { key: 1 }, [_createElementVNode("summary", null, "Observações da conferência (" + _toDisplayString(state.preview.warnings.length) + ")", 1), _createElementVNode("ul", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.preview.warnings, (warning) => {
                  return (_openBlock(), _createElementBlock("li", { key: warning }, _toDisplayString(warning), 1))
                }), 128))])]))
              : _createCommentVNode("", true),
            _createElementVNode("p", { class: "small muted" }, "Cadastros existentes serão preservados. Revise as categorias acima antes de confirmar."),
            _createElementVNode("label", null, [_createTextVNode("Digite IMPORTAR para confirmar"), _withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((state.confirmation) = $event),
              disabled: state.busy,
              maxlength: "20",
              autocomplete: "off"
            }, null, 8, ["onUpdate:modelValue", "disabled"]), [[_vModelText, state.confirmation]])]),
            _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: state.busy || !state.preview.can_apply || state.confirmation.trim().toUpperCase()!=='IMPORTAR',
              onClick: apply
            }, _toDisplayString(state.busy?'Importando…':'Confirmar importação'), 9, ["disabled", "onClick"])
          ]))
        : _createCommentVNode("", true),
      _createElementVNode("section", { class: "panel x-card" }, [_createElementVNode("h2", null, "Histórico de importações"), (!state.runs.length)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "empty-state"
          }, [_createElementVNode("p", null, "Nenhuma importação concluída nesta escola.")]))
        : _createCommentVNode("", true), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.runs, (run) => {
        return (_openBlock(), _createElementBlock("div", {
          key: run.id,
          class: "x-line"
        }, [_createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(date(run.created_at)), 1), _createElementVNode("small", { class: "muted" }, _toDisplayString(run.source_system), 1)]), _createElementVNode("button", {
          class: "btn btn-secondary",
          disabled: state.busy,
          onClick: $event => (download(run.id))
        }, "Baixar detalhes", 8, ["disabled", "onClick"])]))
      }), 128))])
    ]))
  }
},learning:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, createTextVNode: _createTextVNode } = _Vue

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
          }, [_createElementVNode("label", null, [_createTextVNode("Aluno"), _withDirectives(_createElementVNode("select", {
            "onUpdate:modelValue": $event => ((state.studentId) = $event),
            onChange: selectStudent,
            disabled: state.busy
          }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.students, (item) => {
            return (_openBlock(), _createElementBlock("option", {
              key: item.student_id,
              value: item.student_id
            }, _toDisplayString(item.student_name), 9, ["value"]))
          }), 128))], 40, ["onUpdate:modelValue", "onChange", "disabled"]), [[_vModelSelect, state.studentId]])]), _createElementVNode("label", null, [_createTextVNode("Matrícula"), _withDirectives(_createElementVNode("select", {
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
          class: "panel"
        }, [_createElementVNode("div", { class: "panel-header" }, [_createElementVNode("div", null, [_createElementVNode("h2", null, _toDisplayString(student()?.student_name), 1), _createElementVNode("p", { class: "muted small" }, _toDisplayString(student()?.school_name) + " · " + _toDisplayString(enrollment().class_name) + " · " + _toDisplayString(enrollment().year_name), 1)]), _createElementVNode("button", {
          class: "btn btn-primary",
          disabled: state.busy || !rows().length,
          onClick: download
        }, "Baixar boletim PDF", 8, ["disabled", "onClick"])]), (rows().length)
          ? (_openBlock(), _createElementBlock("div", {
              key: 0,
              class: "table-scroll"
            }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
              _createElementVNode("th", { scope: "col" }, "Componente curricular"),
              _createElementVNode("th", { scope: "col" }, "Período"),
              _createElementVNode("th", { scope: "col" }, "Nota / conceito"),
              _createElementVNode("th", { scope: "col" }, "Situação"),
              _createElementVNode("th", { scope: "col" }, "Frequência"),
              _createElementVNode("th", { scope: "col" }, "Faltas")
            ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(rows(), (item) => {
              return (_openBlock(), _createElementBlock("tr", { key: item.diary_id+'-'+item.period_id }, [
                _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(item.component_name), 1)]),
                _createElementVNode("td", null, _toDisplayString(item.period_name), 1),
                _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(item.grade_display || '—'), 1)]),
                _createElementVNode("td", null, _toDisplayString(item.result_label), 1),
                _createElementVNode("td", null, [_createTextVNode(_toDisplayString(percent(item.attendance.percentage)), 1), (item.attendance.unrecorded)
                  ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(item.attendance.unrecorded) + " aula(s) sem registro", 1))
                  : _createCommentVNode("", true)]),
                _createElementVNode("td", null, [_createTextVNode(_toDisplayString(item.attendance.absent), 1), (item.attendance.justified_absence)
                  ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(item.attendance.justified_absence) + " justificada(s)", 1))
                  : _createCommentVNode("", true)])
              ]))
            }), 128))])])]))
          : (_openBlock(), _createElementBlock("div", {
              key: 1,
              class: "empty-state"
            }, [_createElementVNode("h3", null, "Resultados ainda não publicados"), _createElementVNode("p", null, "As notas e a frequência aparecerão após a conferência e publicação pela escola.")])), (state.note)
          ? (_openBlock(), _createElementBlock("div", {
              key: 2,
              class: "panel-footer"
            }, [_createElementVNode("p", { class: "muted small" }, _toDisplayString(state.note), 1)]))
          : _createCommentVNode("", true)]))
      : _createCommentVNode("", true)], 8, ["aria-busy"]))
  }
},community:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, vModelText: _vModelText, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelSelect: _vModelSelect, renderList: _renderList, Fragment: _Fragment, vModelCheckbox: _vModelCheckbox, withModifiers: _withModifiers, Teleport: _Teleport, createBlock: _createBlock } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "community-page",
      "aria-label": "Notícias e agenda da escola"
    }, [
      _createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "COMUNIDADE ESCOLAR"), _createElementVNode("h2", null, _toDisplayString(props.compact?'Acontece na escola':'Notícias e agenda'), 1), (!props.compact)
        ? (_openBlock(), _createElementBlock("p", { key: 0 }, "Informações, encontros e momentos importantes da escola."))
        : _createCommentVNode("", true)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
        class: "btn btn-secondary",
        onClick: $event => (run(load)),
        disabled: s.busy
      }, "Atualizar", 8, ["onClick", "disabled"]), (manage())
        ? (_openBlock(), _createElementBlock("button", {
            key: 0,
            class: "btn btn-primary",
            onClick: $event => (edit()),
            disabled: s.busy
          }, "+ Nova publicação", 8, ["onClick", "disabled"]))
        : _createCommentVNode("", true)])]),
      (s.error&&!s.editing)
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
      (!props.compact)
        ? (_openBlock(), _createElementBlock("section", {
            key: 2,
            class: "panel x-card"
          }, [_createElementVNode("form", {
            class: "x-filter",
            onSubmit: _withModifiers(search, ["prevent"])
          }, [
            _createElementVNode("label", null, [_createTextVNode("Pesquisar"), _withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((s.q) = $event),
              maxlength: "160",
              placeholder: "Notícia, assunto ou evento"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.q]])]),
            _createElementVNode("label", null, [_createTextVNode("Conteúdo"), _withDirectives(_createElementVNode("select", {
              "aria-label": "Conteúdo",
              "onUpdate:modelValue": $event => ((s.kind) = $event)
            }, [_createElementVNode("option", { value: "" }, "Notícias e eventos"), _createElementVNode("option", { value: "news" }, "Notícias"), _createElementVNode("option", { value: "event" }, "Eventos")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.kind]])]),
            (manage())
              ? (_openBlock(), _createElementBlock("label", { key: 0 }, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", {
                  "aria-label": "Situação",
                  "onUpdate:modelValue": $event => ((s.status) = $event)
                }, [_createElementVNode("option", { value: "" }, "Todas"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(statusLabels, (label, value) => {
                  return (_openBlock(), _createElementBlock("option", {
                    key: value,
                    value: value
                  }, _toDisplayString(label), 9, ["value"]))
                }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.status]])]))
              : (_openBlock(), _createElementBlock("label", {
                  key: 1,
                  class: "x-check"
                }, [_withDirectives(_createElementVNode("input", {
                  type: "checkbox",
                  "onUpdate:modelValue": $event => ((s.upcoming) = $event)
                }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.upcoming]]), _createTextVNode("Somente próximos eventos")])),
            _createElementVNode("button", {
              class: "btn btn-primary",
              disabled: s.busy
            }, "Pesquisar", 8, ["disabled"])
          ], 40, ["onSubmit"])]))
        : _createCommentVNode("", true),
      (s.busy&&!s.items.length)
        ? (_openBlock(), _createElementBlock("p", {
            key: 3,
            class: "empty",
            role: "status"
          }, "Carregando publicações…"))
        : (!s.items.length)
          ? (_openBlock(), _createElementBlock("section", {
              key: 4,
              class: "panel community-empty"
            }, [
              _createElementVNode("span", {
                class: "community-empty-icon",
                "aria-hidden": "true"
              }, "▤"),
              _createElementVNode("h3", null, _toDisplayString(manage()?'Comece a compartilhar as novidades':'Nenhuma publicação neste momento'), 1),
              _createElementVNode("p", null, _toDisplayString(manage()?'Publique notícias e organize os próximos eventos da escola.':'As novidades e os eventos da escola aparecerão aqui.'), 1),
              (manage())
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-primary",
                    onClick: $event => (edit())
                  }, "Criar publicação", 8, ["onClick"]))
                : _createCommentVNode("", true)
            ]))
          : _createCommentVNode("", true),
      _createElementVNode("div", { class: "community-grid" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(s.items, (post) => {
        return (_openBlock(), _createElementBlock("article", {
          key: post.id,
          class: "panel community-card"
        }, [
          _createElementVNode("div", { class: "community-card-meta" }, [_createElementVNode("span", { class: "badge" }, _toDisplayString(post.kind==='event'?'Evento':'Notícia'), 1), (post.pinned)
            ? (_openBlock(), _createElementBlock("span", {
                key: 0,
                class: "small muted"
              }, "Em destaque"))
            : _createCommentVNode("", true), (manage())
            ? (_openBlock(), _createElementBlock("span", {
                key: 1,
                class: "small muted"
              }, _toDisplayString(scheduled(post)?'Agendado':expired(post)?'Encerrado':statusLabels[post.status]), 1))
            : _createCommentVNode("", true)]),
          (post.kind==='event')
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "community-event-date"
              }, [_createElementVNode("strong", null, _toDisplayString(date(post.event_start,true)), 1), (post.location)
                ? (_openBlock(), _createElementBlock("span", { key: 0 }, _toDisplayString(post.location), 1))
                : _createCommentVNode("", true)]))
            : _createCommentVNode("", true),
          _createElementVNode("h3", null, _toDisplayString(post.title), 1),
          _createElementVNode("p", { class: "community-excerpt" }, _toDisplayString(post.summary||post.content.slice(0,220)+(post.content.length>220?'…':'')), 1),
          (manage())
            ? (_openBlock(), _createElementBlock("small", {
                key: 1,
                class: "muted"
              }, _toDisplayString(audienceLabels[post.audience]), 1))
            : _createCommentVNode("", true),
          _createElementVNode("div", { class: "community-card-footer" }, [_createElementVNode("span", { class: "small muted" }, _toDisplayString(post.publish_at?date(post.publish_at):'Não publicado'), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
            class: "btn btn-secondary small-button",
            onClick: $event => (open(post))
          }, "Ler publicação", 8, ["onClick"]), (manage())
            ? (_openBlock(), _createElementBlock("button", {
                key: 0,
                class: "btn btn-secondary small-button",
                onClick: $event => (edit(post))
              }, "Editar", 8, ["onClick"]))
            : _createCommentVNode("", true)])])
        ]))
      }), 128))]),
      (!props.compact&&s.total>12)
        ? (_openBlock(), _createElementBlock("div", {
            key: 5,
            class: "pagination"
          }, [_createElementVNode("span", null, _toDisplayString(s.total) + " publicação(ões) · página " + _toDisplayString(s.page), 1), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
            class: "btn btn-secondary",
            onClick: $event => (page(-1)),
            disabled: s.busy||s.page<=1
          }, "Anterior", 8, ["onClick", "disabled"]), _createElementVNode("button", {
            class: "btn btn-secondary",
            onClick: $event => (page(1)),
            disabled: s.busy||s.page*12>=s.total
          }, "Próxima", 8, ["onClick", "disabled"])])]))
        : _createCommentVNode("", true),
      (_openBlock(), _createBlock(_Teleport, { to: "body" }, [(s.selected)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "modal-backdrop",
            onClick: _withModifiers($event => (s.selected=null), ["self"])
          }, [_createElementVNode("section", {
            class: "modal community-detail",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "community-post-title"
          }, [_createElementVNode("header", { class: "modal-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, _toDisplayString(s.selected.kind==='event'?'AGENDA DA ESCOLA':'NOTÍCIA'), 1), _createElementVNode("h2", {
            id: "community-post-title",
            "data-dialog-title": ""
          }, _toDisplayString(s.selected.title), 1)]), _createElementVNode("button", {
            class: "icon-button",
            "data-dialog-close": "",
            "aria-label": "Fechar publicação",
            onClick: $event => (s.selected=null)
          }, "×", 8, ["onClick"])]), _createElementVNode("div", { class: "modal-body" }, [
            (s.selected.kind==='event')
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "community-event-date"
                }, [_createElementVNode("strong", null, _toDisplayString(date(s.selected.event_start,true)), 1), (s.selected.event_end)
                  ? (_openBlock(), _createElementBlock("span", { key: 0 }, "Até " + _toDisplayString(date(s.selected.event_end,true)), 1))
                  : _createCommentVNode("", true), (s.selected.location)
                  ? (_openBlock(), _createElementBlock("span", { key: 1 }, _toDisplayString(s.selected.location), 1))
                  : _createCommentVNode("", true)]))
              : _createCommentVNode("", true),
            (s.selected.summary)
              ? (_openBlock(), _createElementBlock("p", {
                  key: 1,
                  class: "community-lead"
                }, _toDisplayString(s.selected.summary), 1))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "community-prose" }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(paragraphs(s.selected.content), (paragraph, index) => {
              return (_openBlock(), _createElementBlock("p", { key: index }, _toDisplayString(paragraph), 1))
            }), 128))]),
            _createElementVNode("p", { class: "small muted" }, _toDisplayString(s.selected.publish_at?'Publicado em '+date(s.selected.publish_at):'Prévia do rascunho'), 1)
          ]), _createElementVNode("footer", { class: "modal-footer" }, [(manage())
            ? (_openBlock(), _createElementBlock("button", {
                key: 0,
                class: "btn btn-secondary",
                onClick: $event => (edit(s.selected))
              }, "Editar publicação", 8, ["onClick"]))
            : _createCommentVNode("", true), _createElementVNode("button", {
            class: "btn btn-primary",
            "data-dialog-close": "",
            onClick: $event => (s.selected=null)
          }, "Concluir leitura", 8, ["onClick"])])])], 8, ["onClick"]))
        : _createCommentVNode("", true)])),
      (_openBlock(), _createBlock(_Teleport, { to: "body" }, [(s.editing)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "modal-backdrop",
            onClick: _withModifiers($event => (closeEditor()), ["self"])
          }, [_createElementVNode("section", {
            class: "modal community-editor",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "community-editor-title"
          }, [_createElementVNode("header", { class: "modal-header" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "COMUNICAÇÃO DA ESCOLA"), _createElementVNode("h2", {
            id: "community-editor-title",
            "data-dialog-title": ""
          }, _toDisplayString(s.form.id?'Editar publicação':'Nova publicação'), 1)]), _createElementVNode("button", {
            class: "icon-button",
            "data-dialog-close": "",
            "aria-label": "Fechar editor",
            onClick: $event => (closeEditor()),
            disabled: s.busy
          }, "×", 8, ["onClick", "disabled"])]), _createElementVNode("form", {
            class: "modal-form",
            onSubmit: _withModifiers(save, ["prevent"])
          }, [_createElementVNode("div", { class: "modal-body" }, [(s.error)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "alert error",
                role: "alert"
              }, _toDisplayString(s.error), 1))
            : _createCommentVNode("", true), (s.discard)
            ? (_openBlock(), _createElementBlock("div", {
                key: 1,
                class: "discard-banner"
              }, [_createElementVNode("span", null, "Há alterações não salvas."), _createElementVNode("button", {
                type: "button",
                class: "btn btn-secondary",
                onClick: $event => (s.discard=false)
              }, "Continuar editando", 8, ["onClick"]), _createElementVNode("button", {
                type: "button",
                class: "btn btn-danger",
                onClick: $event => (closeEditor(true))
              }, "Descartar", 8, ["onClick"])]))
            : _createCommentVNode("", true), _createElementVNode("fieldset", {
            class: "dialog-fields x-form",
            disabled: s.busy
          }, [
            _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Tipo"), _withDirectives(_createElementVNode("select", {
              "aria-label": "Tipo",
              "onUpdate:modelValue": $event => ((s.form.kind) = $event)
            }, [_createElementVNode("option", { value: "news" }, "Notícia"), _createElementVNode("option", { value: "event" }, "Evento")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.form.kind]])]), _createElementVNode("label", null, [_createTextVNode("Público"), _withDirectives(_createElementVNode("select", {
              "aria-label": "Público",
              "onUpdate:modelValue": $event => ((s.form.audience) = $event)
            }, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(audienceLabels, (label, value) => {
              return (_openBlock(), _createElementBlock("option", {
                key: value,
                value: value
              }, _toDisplayString(label), 9, ["value"]))
            }), 128))], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.form.audience]])])]),
            _createElementVNode("label", null, [_createTextVNode("Título"), _withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((s.form.title) = $event),
              required: "",
              minlength: "3",
              maxlength: "160",
              placeholder: "O que a comunidade precisa saber?"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.title]])]),
            _createElementVNode("label", null, [_createTextVNode("Resumo"), _withDirectives(_createElementVNode("textarea", {
              "onUpdate:modelValue": $event => ((s.form.summary) = $event),
              rows: "2",
              maxlength: "400",
              placeholder: "Uma apresentação breve para a lista de publicações."
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.summary]])]),
            _createElementVNode("label", null, [_createTextVNode("Conteúdo"), _withDirectives(_createElementVNode("textarea", {
              "onUpdate:modelValue": $event => ((s.form.content) = $event),
              rows: "8",
              required: "",
              minlength: "10",
              maxlength: "16000",
              placeholder: "Escreva o texto completo da publicação."
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.content]])]),
            (s.form.kind==='event')
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "community-event-fields"
                }, [
                  _createElementVNode("h3", null, "Quando e onde"),
                  _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Início"), _withDirectives(_createElementVNode("input", {
                    type: "datetime-local",
                    "onUpdate:modelValue": $event => ((s.form.event_start) = $event),
                    required: ""
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.event_start]])]), _createElementVNode("label", null, [_createTextVNode("Encerramento"), _withDirectives(_createElementVNode("input", {
                    type: "datetime-local",
                    "onUpdate:modelValue": $event => ((s.form.event_end) = $event),
                    min: s.form.event_start||undefined
                  }, null, 8, ["onUpdate:modelValue", "min"]), [[_vModelText, s.form.event_end]])])]),
                  _createElementVNode("label", null, [_createTextVNode("Local"), _withDirectives(_createElementVNode("input", {
                    "onUpdate:modelValue": $event => ((s.form.location) = $event),
                    maxlength: "240",
                    placeholder: "Auditório, pátio ou endereço do encontro"
                  }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.location]])]),
                  _createElementVNode("small", { class: "muted" }, "Horários de Brasília / Bahia (UTC−3).")
                ]))
              : _createCommentVNode("", true),
            _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Situação"), _withDirectives(_createElementVNode("select", {
              "aria-label": "Situação",
              "onUpdate:modelValue": $event => ((s.form.status) = $event)
            }, [_createElementVNode("option", { value: "draft" }, "Rascunho"), _createElementVNode("option", { value: "published" }, "Publicado"), _createElementVNode("option", { value: "archived" }, "Arquivado")], 8, ["onUpdate:modelValue"]), [[_vModelSelect, s.form.status]])]), _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
              type: "checkbox",
              "onUpdate:modelValue": $event => ((s.form.pinned) = $event)
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, s.form.pinned]]), _createTextVNode("Destacar na lista")])]),
            (s.form.status==='published'&&s.form.audience==='public')
              ? (_openBlock(), _createElementBlock("p", {
                  key: 1,
                  class: "small muted"
                }, "Esta publicação ficará disponível a qualquer visitante da página pública da escola."))
              : _createCommentVNode("", true),
            _createElementVNode("details", null, [_createElementVNode("summary", null, "Programar período de exibição"), _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", null, [_createTextVNode("Publicar a partir de"), _withDirectives(_createElementVNode("input", {
              type: "datetime-local",
              "onUpdate:modelValue": $event => ((s.form.publish_at) = $event)
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, s.form.publish_at]])]), _createElementVNode("label", null, [_createTextVNode("Retirar da exibição em"), _withDirectives(_createElementVNode("input", {
              type: "datetime-local",
              "onUpdate:modelValue": $event => ((s.form.expires_at) = $event),
              min: s.form.publish_at||undefined
            }, null, 8, ["onUpdate:modelValue", "min"]), [[_vModelText, s.form.expires_at]])])]), _createElementVNode("p", { class: "small muted" }, "Sem data inicial, a publicação é imediata. Horários de Brasília / Bahia (UTC−3).")]),
            (s.form.id&&s.form.status==='draft')
              ? (_openBlock(), _createElementBlock("div", { key: 2 }, [(!s.deleteConfirm)
                  ? (_openBlock(), _createElementBlock("button", {
                      key: 0,
                      type: "button",
                      class: "btn btn-danger",
                      onClick: $event => (s.deleteConfirm=true)
                    }, "Excluir rascunho", 8, ["onClick"]))
                  : (_openBlock(), _createElementBlock("div", {
                      key: 1,
                      class: "discard-banner"
                    }, [_createElementVNode("span", null, "Excluir este rascunho definitivamente?"), _createElementVNode("button", {
                      type: "button",
                      class: "btn btn-secondary",
                      onClick: $event => (s.deleteConfirm=false)
                    }, "Voltar", 8, ["onClick"]), _createElementVNode("button", {
                      type: "button",
                      class: "btn btn-danger",
                      onClick: remove
                    }, "Confirmar exclusão", 8, ["onClick"])]))]))
              : _createCommentVNode("", true)
          ], 8, ["disabled"])]), _createElementVNode("footer", { class: "modal-footer" }, [_createElementVNode("button", {
            type: "button",
            class: "btn btn-secondary",
            onClick: $event => (closeEditor()),
            disabled: s.busy
          }, "Cancelar", 8, ["onClick", "disabled"]), _createElementVNode("button", {
            class: "btn btn-primary",
            disabled: s.busy
          }, _toDisplayString(s.busy?'Salvando…':s.form.status==='published'?'Salvar e publicar':'Salvar publicação'), 9, ["disabled"])])], 40, ["onSubmit"])])], 8, ["onClick"]))
        : _createCommentVNode("", true)]))
    ]))
  }
},news:function render(_ctx, _cache) {
  with (_ctx) {
    const { openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect, withDirectives: _withDirectives, resolveComponent: _resolveComponent, createBlock: _createBlock } = _Vue

    const _component_school_community = _resolveComponent("school-community")

    return (_openBlock(), _createElementBlock("div", { class: "school-news-shell" }, [_createElementVNode("header", { class: "school-news-header" }, [_createElementVNode("a", {
      class: "school-news-brand",
      href: "/news.html"
    }, [(identity.logo_url)
      ? (_openBlock(), _createElementBlock("img", {
          key: 0,
          src: identity.logo_url,
          alt: identity.display_name
        }, null, 8, ["src", "alt"]))
      : _createCommentVNode("", true), _createElementVNode("div", null, [_createElementVNode("strong", null, _toDisplayString(identity.display_name), 1), _createElementVNode("small", null, "Notícias e agenda da escola")])]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("a", {
      class: "btn btn-secondary",
      href: '/online.html'+(state.schoolId?'?school='+encodeURIComponent(state.schoolId):'')
    }, "Portal dos responsáveis", 8, ["href"]), _createElementVNode("a", {
      class: "btn btn-primary",
      href: "/"
    }, "Acessar minha conta")])]), _createElementVNode("main", { id: "main-content" }, [(!state.ready)
      ? (_openBlock(), _createElementBlock("p", {
          key: 0,
          class: "alert info",
          role: "status"
        }, "Carregando escola…"))
      : (state.error)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "alert error",
            role: "alert"
          }, [_createTextVNode(_toDisplayString(state.error), 1), _createElementVNode("button", {
            class: "btn btn-secondary",
            onClick: start
          }, "Tentar novamente", 8, ["onClick"])]))
        : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [(state.schools.length>1)
            ? (_openBlock(), _createElementBlock("section", {
                key: 0,
                class: "panel x-card"
              }, [_createElementVNode("label", null, [_createTextVNode("Unidade escolar"), _withDirectives(_createElementVNode("select", {
                "onUpdate:modelValue": $event => ((state.schoolId) = $event),
                onChange: selectSchool
              }, [_createElementVNode("option", { value: "" }, "Selecione uma unidade"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.schools, (school) => {
                return (_openBlock(), _createElementBlock("option", {
                  key: school.id,
                  value: school.id
                }, _toDisplayString(school.name), 9, ["value"]))
              }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.schoolId]])])]))
            : _createCommentVNode("", true), (state.schoolId)
            ? (_openBlock(), _createBlock(_component_school_community, {
                key: state.schoolId,
                "school-id": state.schoolId,
                "public-mode": true
              }, null, 8, ["school-id", "public-mode"]))
            : (_openBlock(), _createElementBlock("section", {
                key: 2,
                class: "panel community-empty"
              }, [_createElementVNode("h1", null, _toDisplayString(state.schools.length?'Escolha sua unidade escolar':'Bem-vindo à escola'), 1), _createElementVNode("p", null, _toDisplayString(state.schools.length?'Selecione uma unidade para consultar as notícias e os próximos eventos.':'As notícias e a agenda serão disponibilizadas pela instituição.'), 1)]))], 64))]), _createElementVNode("footer", { class: "school-news-footer" }, _toDisplayString(identity.display_name) + " · Informações oficiais da instituição.", 1)]))
  }
},mailcow:function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, vModelText: _vModelText, withDirectives: _withDirectives, createTextVNode: _createTextVNode, vModelCheckbox: _vModelCheckbox, withModifiers: _withModifiers, renderList: _renderList, Fragment: _Fragment, vModelSelect: _vModelSelect } = _Vue

    return (_openBlock(), _createElementBlock("section", {
      class: "mailcow-page",
      "aria-label": "E-mail institucional"
    }, [
      _createElementVNode("header", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("p", { class: "eyebrow" }, "INTEGRAÇÕES"), _createElementVNode("h2", null, "E-mail institucional"), _createElementVNode("p", null, "Contas da escola para professores, funcionários e alunos.")]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
        type: "button",
        class: "btn btn-secondary",
        onClick: refresh,
        disabled: state.busy
      }, "Atualizar", 8, ["onClick", "disabled"]), _createElementVNode("button", {
        type: "button",
        class: "btn btn-secondary",
        onClick: $event => (state.showConfig=!state.showConfig),
        disabled: state.busy
      }, "Configurar", 8, ["onClick", "disabled"]), (state.config.enabled)
        ? (_openBlock(), _createElementBlock("button", {
            key: 0,
            class: "btn btn-primary",
            onClick: beginNew,
            disabled: state.busy
          }, "Nova caixa de e-mail", 8, ["onClick", "disabled"]))
        : _createCommentVNode("", true)])]),
      (state.error)
        ? (_openBlock(), _createElementBlock("p", {
            key: 0,
            class: "alert error",
            role: "alert"
          }, _toDisplayString(state.error), 1))
        : _createCommentVNode("", true),
      (state.notice)
        ? (_openBlock(), _createElementBlock("p", {
            key: 1,
            class: "alert success",
            role: "status"
          }, _toDisplayString(state.notice), 1))
        : _createCommentVNode("", true),
      (state.showConfig)
        ? (_openBlock(), _createElementBlock("form", {
            key: 2,
            class: "panel x-card",
            onSubmit: _withModifiers(save, ["prevent"])
          }, [
            _createElementVNode("h3", null, "Servidor da escola"),
            _createElementVNode("div", { class: "x-grid" }, [
              _createElementVNode("label", { class: "field" }, [_createTextVNode("Endereço do Mailcow"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((state.config.base_url) = $event),
                type: "url",
                required: "",
                placeholder: "https://mail.escola.edu.br",
                maxlength: "300",
                autocomplete: "off"
              }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.config.base_url]])]),
              _createElementVNode("label", { class: "field" }, [_createTextVNode("Domínio de e-mail"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((state.config.domain) = $event),
                required: "",
                placeholder: "escola.edu.br",
                maxlength: "253",
                autocomplete: "off"
              }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.config.domain]])]),
              _createElementVNode("label", { class: "field" }, [_createTextVNode("Chave da API"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((state.apiKey) = $event),
                type: "password",
                placeholder: state.config.api_key_configured?'Chave salva — preencha somente para trocar':'Chave com permissão de escrita',
                required: state.config.enabled&&!state.config.api_key_configured,
                autocomplete: "new-password",
                maxlength: "512"
              }, null, 8, ["onUpdate:modelValue", "placeholder", "required"]), [[_vModelText, state.apiKey]])]),
              _createElementVNode("label", { class: "field" }, [_createTextVNode("Cota padrão por caixa (MB)"), _withDirectives(_createElementVNode("input", {
                "onUpdate:modelValue": $event => ((state.config.default_quota_mb) = $event),
                type: "number",
                min: "1",
                max: "1048576",
                required: ""
              }, null, 8, ["onUpdate:modelValue"]), [[
                _vModelText,
                state.config.default_quota_mb,
                void 0,
                { number: true }
              ]]), _createElementVNode("small", null, "1.024 MB equivalem a 1 GB.")])
            ]),
            _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((state.config.enabled) = $event),
              type: "checkbox"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.config.enabled]]), _createTextVNode("Habilitar criação de contas institucionais")]),
            _createElementVNode("details", null, [_createElementVNode("summary", null, "Rede do servidor"), _createElementVNode("label", { class: "x-check" }, [_withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((state.config.allow_private_network) = $event),
              type: "checkbox"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelCheckbox, state.config.allow_private_network]]), _createTextVNode("O servidor fica na rede privada desta instalação")]), _createElementVNode("p", { class: "muted" }, "Use um hostname HTTPS com certificado válido. Endereços locais e de metadados continuam bloqueados.")]),
            _createElementVNode("p", { class: "muted" }, "O domínio deve estar cadastrado no Mailcow. Habilite a API de leitura e escrita e autorize o IP desta aplicação no servidor."),
            _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
              class: "btn btn-primary",
              type: "submit",
              disabled: state.busy
            }, "Salvar configuração", 8, ["disabled"]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary",
              onClick: $event => (state.showConfig=false),
              disabled: state.busy
            }, "Fechar", 8, ["onClick", "disabled"])])
          ], 40, ["onSubmit"]))
        : _createCommentVNode("", true),
      (state.config.configured)
        ? (_openBlock(), _createElementBlock("div", {
            key: 3,
            class: "panel x-card"
          }, [_createElementVNode("div", { class: "x-heading" }, [_createElementVNode("div", null, [_createElementVNode("h3", null, _toDisplayString(state.config.domain), 1), _createElementVNode("p", null, _toDisplayString(state.config.enabled?'Criação de contas habilitada':'Criação de contas desativada'), 1)]), _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
            type: "button",
            class: "btn btn-secondary",
            onClick: test,
            disabled: state.busy||!state.config.enabled
          }, "Testar conexão", 8, ["onClick", "disabled"]), (state.config.webmail_url)
            ? (_openBlock(), _createElementBlock("a", {
                key: 0,
                href: state.config.webmail_url,
                target: "_blank",
                rel: "noopener noreferrer",
                class: "btn btn-secondary"
              }, "Abrir webmail", 8, ["href"]))
            : _createCommentVNode("", true)])])]))
        : _createCommentVNode("", true),
      (state.showNew)
        ? (_openBlock(), _createElementBlock("form", {
            key: 4,
            class: "panel x-card",
            onSubmit: _withModifiers(create, ["prevent"])
          }, [
            _createElementVNode("h3", null, "Nova caixa de e-mail"),
            _createElementVNode("div", { class: "x-grid" }, [_createElementVNode("label", { class: "field" }, [_createTextVNode("Usuário"), _withDirectives(_createElementVNode("select", {
              "onUpdate:modelValue": $event => ((state.userId) = $event),
              required: "",
              onChange: selectUser
            }, [_createElementVNode("option", { value: "" }, "Selecione"), (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(availableUsers, (user) => {
              return (_openBlock(), _createElementBlock("option", {
                key: user.id,
                value: user.id
              }, _toDisplayString(user.name), 9, ["value"]))
            }), 128))], 40, ["onUpdate:modelValue", "onChange"]), [[_vModelSelect, state.userId]])]), _createElementVNode("label", { class: "field" }, [_createTextVNode("Nome da caixa"), _withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((state.localPart) = $event),
              required: "",
              pattern: "[a-z0-9][a-z0-9._-]*",
              maxlength: "64",
              placeholder: "nome.sobrenome",
              autocomplete: "off"
            }, null, 8, ["onUpdate:modelValue"]), [[_vModelText, state.localPart]]), _createElementVNode("small", null, _toDisplayString(state.localPart||'nome') + "@" + _toDisplayString(state.config.domain), 1)]), _createElementVNode("label", { class: "field" }, [_createTextVNode("Armazenamento (MB)"), _withDirectives(_createElementVNode("input", {
              "onUpdate:modelValue": $event => ((state.quota) = $event),
              type: "number",
              min: "1",
              max: "1048576",
              required: ""
            }, null, 8, ["onUpdate:modelValue"]), [[
              _vModelText,
              state.quota,
              void 0,
              { number: true }
            ]])])]),
            _createElementVNode("p", { class: "muted" }, "A senha inicial será gerada automaticamente. Após a criação, consulte-a uma única vez para entregar ao usuário."),
            _createElementVNode("div", { class: "actions" }, [_createElementVNode("button", {
              class: "btn btn-primary",
              type: "submit",
              disabled: state.busy
            }, "Criar caixa", 8, ["disabled"]), _createElementVNode("button", {
              type: "button",
              class: "btn btn-secondary",
              onClick: $event => (state.showNew=false)
            }, "Cancelar", 8, ["onClick"])])
          ], 40, ["onSubmit"]))
        : _createCommentVNode("", true),
      _createElementVNode("div", { class: "panel x-card" }, [_createElementVNode("h3", null, [_createTextVNode("Caixas institucionais "), _createElementVNode("span", { class: "badge" }, _toDisplayString(state.mailboxes.length), 1)]), (!state.mailboxes.length)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "empty-state"
          }, [_createElementVNode("h3", null, "Nenhuma caixa cadastrada"), _createElementVNode("p", null, "Configure o servidor e crie uma caixa para um usuário da escola. Você também poderá solicitar a caixa ao cadastrar um novo usuário.")]))
        : (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "table-wrap"
          }, [_createElementVNode("table", null, [_createElementVNode("thead", null, [_createElementVNode("tr", null, [
            _createElementVNode("th", null, "Usuário e endereço"),
            _createElementVNode("th", null, "Situação"),
            _createElementVNode("th", null, "Armazenamento"),
            _createElementVNode("th", null, "Ações")
          ])]), _createElementVNode("tbody", null, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(state.mailboxes, (box) => {
            return (_openBlock(), _createElementBlock("tr", { key: box.id }, [
              _createElementVNode("td", null, [_createElementVNode("strong", null, _toDisplayString(box.user_name), 1), _createElementVNode("br"), _createElementVNode("span", null, _toDisplayString(box.address), 1)]),
              _createElementVNode("td", null, [_createElementVNode("span", { class: "badge" }, _toDisplayString(status(box.status)), 1), (box.error_code)
                ? (_openBlock(), _createElementBlock("small", { key: 0 }, _toDisplayString(issue(box)), 1))
                : _createCommentVNode("", true)]),
              _createElementVNode("td", null, _toDisplayString(usage(box.quota_used_bytes)) + " de " + _toDisplayString(usage(box.quota_mb*1048576)), 1),
              _createElementVNode("td", null, [_createElementVNode("div", { class: "actions" }, [(box.credentials_available)
                ? (_openBlock(), _createElementBlock("button", {
                    key: 0,
                    class: "btn btn-secondary",
                    onClick: $event => (credentials(box)),
                    disabled: state.busy
                  }, "Ver acesso inicial", 8, ["onClick", "disabled"]))
                : _createCommentVNode("", true), (['failed','uncertain','retry'].includes(box.job_status))
                ? (_openBlock(), _createElementBlock("button", {
                    key: 1,
                    class: "btn btn-secondary",
                    onClick: $event => (action(box,'retry')),
                    disabled: state.busy
                  }, "Tentar novamente", 8, ["onClick", "disabled"]))
                : _createCommentVNode("", true), _createElementVNode("button", {
                type: "button",
                class: "btn btn-secondary",
                onClick: $event => (action(box,'sync')),
                disabled: state.busy
              }, "Consultar servidor", 8, ["onClick", "disabled"])])])
            ]))
          }), 128))])])]))]),
      (state.credentials)
        ? (_openBlock(), _createElementBlock("div", {
            key: 5,
            class: "modal-backdrop",
            onClick: _withModifiers($event => (state.credentials=null), ["self"])
          }, [_createElementVNode("section", {
            class: "modal mailbox-credentials",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "mailbox-credentials-title"
          }, [_createElementVNode("header", { class: "modal-header" }, [_createElementVNode("h2", { id: "mailbox-credentials-title" }, "Acesso inicial ao e-mail"), _createElementVNode("button", {
            type: "button",
            class: "btn btn-secondary",
            onClick: $event => (state.credentials=null)
          }, "Fechar", 8, ["onClick"])]), _createElementVNode("div", { class: "modal-body" }, [
            _createElementVNode("p", null, "Copie a senha agora. Ela é exibida uma única vez e deverá ser trocada no primeiro acesso."),
            _createElementVNode("label", { class: "field" }, [_createTextVNode("Endereço"), _createElementVNode("input", {
              value: state.credentials.address,
              readonly: "",
              autocomplete: "off"
            }, null, 8, ["value"])]),
            _createElementVNode("label", { class: "field" }, [_createTextVNode("Senha inicial"), _createElementVNode("input", {
              value: state.credentials.password,
              readonly: "",
              autocomplete: "off",
              spellcheck: "false"
            }, null, 8, ["value"])]),
            (state.credentials.webmail_url)
              ? (_openBlock(), _createElementBlock("a", {
                  key: 0,
                  class: "btn btn-secondary",
                  href: state.credentials.webmail_url,
                  target: "_blank",
                  rel: "noopener noreferrer"
                }, "Abrir webmail", 8, ["href"]))
              : _createCommentVNode("", true)
          ])])], 8, ["onClick"]))
        : _createCommentVNode("", true)
    ]))
  }
}};
