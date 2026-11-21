import assert from 'node:assert/strict';

export async function testPersonRecords({context, sandbox, render, nodes}) {
  const {state} = context;
  const request = sandbox.PigeAPI.request;
  const permissions = state.user.permissions;
  const person = {id:'person-test', version:2, name:'Pessoa de teste', active:true, entity_kind:'individual', photo_file_id:'existing-photo', person_types:['teacher','employee','guardian']};
  const profile = {id:'profile-test', version:3, person, registration_number:'DOC-23', job_title:'Assistente'};
  const business = {category:'Serviços de teste'};
  const familyLink = {id:'link-test', direction:'student', peer:{id:'student-test',name:'Aluno de teste'}, relationship:'Mãe', active:true, legal:true};
  const reply = {person, profiles:{teacher:profile, employee:profile, supplier:business, service_provider:business, customer:business, partner:business}, family:{items:[familyLink],total:2,page:1}};
  const calls = [];
  const button = label => nodes(render()).find(n=>n.type==='button' && n.children===label);
  try {
    state.photoUrls['existing-photo']='blob:saved-photo';
    sandbox.PigeAPI.request=async path=>{
      calls.push(path);
      if(path==='/schools/school-test/persons/person-test/dossier')return structuredClone(reply);
      if(path==='/schools/school-test/persons/person-test/family?page=2')return {items:[{...familyLink,id:'link-two'}],total:2,page:2};
      throw new Error('Consulta inesperada '+path);
    };
    for(const [page,tab] of Object.entries({people:'general',teachers:'teacher',employees:'employee',guardians:'family',suppliers:'supplier',providers:'service_provider',customers:'customer',partners:'partner'})){
      state.page=page;
      state.rows=['teachers','employees'].includes(page)?[profile]:[person];
      const open=button('Abrir ficha →');
      assert.ok(open,page);
      await open.props.onClick();
      assert.equal(state.modal.kind,'');
      assert.equal(state.recordTab,tab);
      assert.equal(state.personRecord.person.id,person.id);
      assert.ok(nodes(render()).some(n=>n.type==='img' && n.props.src==='blob:saved-photo'));
      if(tab==='family'){
        assert.ok(nodes(render()).some(n=>n.children==='Aluno de teste'));
        await button('Carregar mais vínculos').props.onClick();
        assert.equal(state.personRecord.family.items.length,2);
        assert.equal(button('Carregar mais vínculos'),undefined);
      }else if(tab!=='general'){
        const expected=tab==='teacher'?'DOC-23':tab==='employee'?'Assistente':'Serviços de teste';
        assert.ok(nodes(render()).some(n=>n.type==='dd' && n.children===expected),tab);
      }
      await button('Editar cadastro').props.onClick();
      assert.match(state.modal.kind,/^(person|teacher-edit|employee-edit|business|guardian)$/);
      assert.equal(context.editorPhoto(),'blob:saved-photo');
      context.closeModal(true);
      button('← Voltar à lista').props.onClick();
      assert.ok(button('Abrir ficha →'));
    }
    state.page='students';
    state.rows=[{id:'student-test',version:1,number:'AL-TEST',person}];
    calls.length=0;
    button('Editar cadastro').props.onClick();
    assert.equal(state.selectedStudent,null);
    assert.equal(state.modal.kind,'student-edit');
    assert.deepEqual(calls,['/schools/school-test/persons/person-test/dossier']);
    assert.equal(context.editorPhoto(),'blob:saved-photo');
    context.personPhotoChange({target:{files:[new File(['png'],'troca.png',{type:'image/png'})]}});
    assert.notEqual(context.editorPhoto(),'blob:saved-photo');
    context.personPhotoChange({target:{files:[]}});
    assert.equal(context.editorPhoto(),'blob:saved-photo');
    context.closeModal(true);
    state.user.permissions=['people.read'];
    assert.equal(button('Editar cadastro'),undefined);
    state.page='teachers';state.rows=[profile];
    await button('Abrir ficha →').props.onClick();
    assert.equal(button('Editar cadastro'),undefined);
    context.closePersonRecord();
    let deliver;
    sandbox.PigeAPI.request=()=>new Promise(resolve=>{deliver=resolve;});
    const pending=context.viewPersonRecord(profile);
    state.schoolId='another-school';
    deliver(reply);
    await pending;
    assert.equal(state.personRecord,null);
  } finally {
    sandbox.PigeAPI.request=request;state.schoolId='school-test';
    state.user.permissions=permissions;
    context.closePersonRecord();context.closeModal(true);
    state.rows=[];state.page='dashboard';
  }
}
