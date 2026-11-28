"""Valida os diálogos da interface e a validação HTML em um navegador real."""
from playwright.sync_api import expect


def verify_dialogs(page, url, *, first_access=True, output=None):
    # Uma tarefa aberta testa também o foco quando a confirmação vira a camada superior.
    page.evaluate("""() => {
      const host = document.createElement('div');
      host.id = 'qa-dialog-host'; host.className = 'modal-backdrop';
      host.innerHTML = '<section class="modal" role="dialog" aria-modal="true" aria-label="Formulário de ensaio"><h2 tabindex="-1" data-dialog-title>Formulário de ensaio</h2><button id="qa-action">Revisar cadastro</button></section>';
      document.body.appendChild(host);
    }""")
    underlying = page.get_by_role('dialog', name='Formulário de ensaio')
    trigger = underlying.get_by_role('button', name='Revisar cadastro')
    trigger.focus()
    page.evaluate("""() => {
      window.qaDecisions = {};
      PigeDialogs.confirm('O cadastro de exemplo possui uma edição pendente.', {
        title:'Descartar edição?', confirmLabel:'Descartar', cancelLabel:'Continuar editando', destructive:true
      }).then(value => window.qaDecisions.first=value);
      PigeDialogs.confirm('Segundo acionamento').then(value => window.qaDecisions.second=value);
    }""")
    dialog = page.get_by_role('dialog', name='Descartar edição?')
    expect(dialog).to_be_visible()
    expect(dialog.get_by_role('button', name='Continuar editando')).to_be_focused()
    assert dialog.evaluate("d=>getComputedStyle(d,'::backdrop').backdropFilter.startsWith('blur(')")
    assert dialog.evaluate("d=>getComputedStyle(d).filter==='none'")
    assert page.evaluate('window.qaDecisions.second === false')
    if output is not None:
        page.screenshot(path=str(output/'confirmacao-sobre-formulario.png'))
    page.keyboard.press('Escape')
    expect(dialog).to_have_count(0)
    expect(trigger).to_be_focused()
    assert page.evaluate('window.qaDecisions.first === false')
    page.evaluate("""() => {
      PigeDialogs.prompt('Descreva o motivo da edição.', {title:'Justificar alteração',inputLabel:'Justificativa',
        confirmLabel:'Aplicar',initialValue:'',minLength:3,maxLength:12}).then(value => window.qaDecisions.reason=value);
    }""")
    prompt = page.get_by_role('dialog', name='Justificar alteração')
    reason = prompt.get_by_role('textbox', name='Justificativa')
    expect(reason).to_be_focused()
    reason.fill('  ')
    prompt.get_by_role('button', name='Aplicar').click()
    expect(prompt.get_by_role('alert')).to_contain_text('3 caracteres')
    expect(reason).to_be_focused()
    reason.fill('Revisão')
    reason.press('Control+Enter')
    expect(prompt).to_have_count(0)
    assert page.evaluate("window.qaDecisions.reason==='Revisão'")
    expect(trigger).to_be_focused()
    page.evaluate("""() => {
      PigeDialogs.confirm('Concluir a operação?', {title:'Etapa atual'}).then(value => window.qaDecisions.current=value);
      PigeDialogs.alert('Operação concluída.', {title:'Resultado'}).then(() => window.qaDecisions.alert=true);
    }""")
    notice = page.get_by_role('dialog', name='Resultado')
    expect(notice).to_have_count(0)
    page.get_by_role('dialog', name='Etapa atual').get_by_role('button', name='Confirmar').click()
    expect(notice.get_by_role('button', name='Entendi')).to_be_focused()
    notice.get_by_role('button', name='Entendi').click()
    expect(trigger).to_be_focused()
    page.evaluate("""() => {
      PigeDialogs.prompt('Edição de exemplo').then(value => window.qaDecisions.cancelled=value);
      PigeDialogs.alert('Aviso do contexto encerrado.', {title:'Outro contexto'});
      PigeDialogs.cancelPending();
    }""")
    assert page.evaluate('window.qaDecisions.current===true && window.qaDecisions.cancelled===null && window.qaDecisions.alert===true')
    expect(page.get_by_role('dialog', name='Outro contexto')).to_have_count(0)
    page.evaluate("() => {document.getElementById('qa-dialog-host').remove();delete window.qaDecisions;}")
    if first_access:
        recovery = page.context.new_page()
        try:
            recovery.goto(url + '/family/recuperar-senha')
            email = recovery.get_by_label('E-mail de acesso')
            recovery.get_by_role('button', name='Enviar link de recuperação').click()
            expect(email).to_be_focused()
            expect(email).to_have_attribute('aria-invalid', 'true')
            expect(recovery.locator('.pige-field-error')).to_contain_text('Preencha este campo')
            email.fill('exemplo')
            expect(recovery.locator('.pige-field-error')).to_contain_text('e-mail válido')
            email.fill('exemplo@example.test')
            expect(recovery.locator('.pige-field-error')).to_have_count(0)
            assert email.evaluate('el=>el.validity.valid && el.required')
        finally:
            recovery.close()
