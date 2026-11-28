/* Feedback dos formulários da aplicação e do primeiro acesso, inclusive campos montados após o carregamento. */
(() => {
  let selected = null;
  let feedback = null;
  let nextId = 0;

  function fieldLabel(field) {
    if (field.getAttribute('aria-label')) return field.getAttribute('aria-label');
    const label = field.labels && field.labels[0];
    return label && Array.from(label.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim()).filter(Boolean).join(' ').replace(/\s*\*$/, '') || '';
  }

  function message(field) {
    const state = field.validity;
    if (state.customError) return field.validationMessage;
    if (state.valueMissing) {
      if (field.type === 'checkbox') return 'Marque esta opção para continuar.';
      if (field.type === 'radio' || field instanceof HTMLSelectElement) return 'Selecione uma opção.';
      if (field.type === 'file') return 'Selecione um arquivo.';
      return 'Preencha este campo.';
    }
    if (state.typeMismatch && field.type === 'email') return 'Informe um endereço de e-mail válido.';
    if (state.typeMismatch && field.type === 'url') return 'Informe uma URL válida.';
    if (state.tooShort) return 'Use pelo menos ' + field.minLength + ' caracteres.';
    if (state.tooLong) return 'Use no máximo ' + field.maxLength + ' caracteres.';
    if (state.patternMismatch) return field.title || 'Use o formato solicitado para este campo.';
    if (state.rangeUnderflow) return 'Informe um valor igual ou superior a ' + field.min + '.';
    if (state.rangeOverflow) return 'Informe um valor igual ou inferior a ' + field.max + '.';
    if (state.stepMismatch) return 'Confira o intervalo permitido para este valor.';
    return 'Confira o valor informado.';
  }

  function clear() {
    if (!feedback) return;
    const {field, note, previousInvalid, observer} = feedback;
    observer.disconnect();
    note.remove();
    const descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== note.id);
    if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
    else field.removeAttribute('aria-describedby');
    if (field.getAttribute('aria-invalid') === 'true') {
      if (previousInvalid === null) field.removeAttribute('aria-invalid');
      else field.setAttribute('aria-invalid', previousInvalid);
    }
    feedback = null;
  }

  function show(field) {
    if (!field.isConnected || !field.willValidate || field.validity.valid || !field.getClientRects().length) return;
    if (!feedback || feedback.field !== field) {
      clear();
      const note = document.createElement('small');
      note.id = 'pige-field-error-' + (++nextId);
      note.className = 'pige-field-error';
      note.setAttribute('role', 'alert');
      const previousInvalid = field.getAttribute('aria-invalid');
      const descriptions = [field.getAttribute('aria-describedby'), note.id].filter(Boolean);
      field.setAttribute('aria-describedby', descriptions.join(' '));
      field.setAttribute('aria-invalid', 'true');
      const anchor = field.closest('label') || field;
      anchor.insertAdjacentElement('afterend', note);
      const observer = new MutationObserver(() => {
        if (!field.isConnected || !note.isConnected || !field.willValidate || field.closest('[hidden]')) clear();
      });
      observer.observe(document.body, {childList: true, subtree: true});
      feedback = {field, note, previousInvalid, observer};
    }
    const text = [fieldLabel(field), message(field)].filter(Boolean).join(' · ');
    if (feedback.note.textContent !== text) feedback.note.textContent = text;
    field.focus();
  }

  // O navegador conserva as constraints e bloqueia submit. Exibimos a primeira falha em ordem de formulário.
  document.addEventListener('invalid', event => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
    event.preventDefault();
    if (selected || !field.getClientRects().length) return;
    selected = field;
    queueMicrotask(() => { const first = selected; selected = null; if (first) show(first); });
  }, true);

  function edited(event) {
    if (!feedback) return;
    const field = feedback.field, target = event.target;
    const sameGroup = field.type === 'radio' && target instanceof HTMLInputElement &&
      target.type === 'radio' && target.name === field.name && target.form === field.form;
    if (target !== field && !sameGroup) return;
    if (field.validity.valid) clear();
    else {
      const text = [fieldLabel(field), message(field)].filter(Boolean).join(' · ');
      if (feedback.note.textContent !== text) feedback.note.textContent = text;
    }
  }
  document.addEventListener('input', edited);
  document.addEventListener('change', edited);
  document.addEventListener('reset', event => { if (feedback && feedback.field.form === event.target) clear(); }, true);
})();
