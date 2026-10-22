/** Executable site editor workflow against compiled Vue code, without network. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sandbox={console,document:{querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({})},navigator:{onLine:true},location:{hash:'',pathname:'/',origin:'https://school.test'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem(){}},URLSearchParams,URL,Intl,Headers,FormData,Blob,File,Event,CustomEvent,AbortController,AbortSignal,setTimeout,clearTimeout};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.confirm=()=>true;
vm.createContext(sandbox);
for(const name of ['vendor/vue-3.5.13.global.prod.js','renders.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',name),'utf8'),sandbox);
sandbox.Vue.onMounted=()=>{};sandbox.Vue.createApp=()=>({mount(){}});
vm.runInContext(fs.readFileSync(path.join(root,'dist/app.js'),'utf8'),sandbox);
const models=['horizon','editorial','culture','campus'].map(id=>({id,name:id,description:'Composição completa',website:{theme:id,headline:'Exemplo '+id,design:{configured:true,composition_version:2,demonstration:true,sections:[{id:'exemplo',kind:'cards',layout:'default',visible:true,title:'Exemplo preenchido',text:'Conteúdo demonstrativo',image:null,action:null,items:[]}],menu:[]}}}));
const calls=[];let saved=null;let version=1;let checkpoint=null;
const request=async(url,options={})=>{
 calls.push({url,options});
 if(url.includes('/community-posts?'))return {items:[],total:0,page:1,page_size:12};
 if(url.endsWith('/website/draft')){saved=JSON.parse(options.body);return {};}
 if(url.endsWith('/website/models'))return {items:models};
 if(url.endsWith('/website/apply-model')){const input=JSON.parse(options.body);checkpoint??=structuredClone(input.website);const preset=models.find(m=>m.id===input.model_id).website;saved={...input.website,...preset,design:{...input.website.design,...preset.design,pages:input.website.design.pages}};return {};}
 if(url.endsWith('/website/restore-model')){saved=checkpoint;checkpoint=null;return {};}
 if(url.endsWith('/website/publish'))return {};
 if(url.includes('/website/preview'))return {html:'<p>Preview</p>'};
 if(url.endsWith('/website'))return {configuration:{...saved,version:++version,draft:saved,enabled:false,model_checkpoint:checkpoint,has_checkpoint:Boolean(checkpoint)}};
 throw Error('Unexpected '+url);
};
const ctx=sandbox.PigeCommunity.component.setup({schoolId:'school-test',permissions:['schools.manage'],request});
const render=()=>sandbox.PigeRenders.community.call(ctx,ctx,[]);
render();ctx.toggleWebsite();render();
await ctx.loadSiteModels();assert.equal(ctx.s.models.length,4);
ctx.s.website.design.header_sticky=true;ctx.s.website.design.mobile_actions=true;ctx.s.website.headline='Conteúdo original';ctx.s.website.public_url='https://school.test';ctx.s.website.design.pages=[{slug:'historia',title:'História existente',published:true,sections:[]}];
for(const theme of ['horizon','editorial','culture','campus']){ctx.s.modelChoice=theme;const before=JSON.stringify(ctx.s.website);await ctx.previewModel();const previewBody=JSON.parse(calls.at(-1).options.body);assert.equal(previewBody.design.header_sticky,true);assert.equal(previewBody.design.mobile_actions,true);assert.deepEqual(JSON.parse(JSON.stringify(ctx.s.website)),JSON.parse(before),'Catalog preview never mutates editor');sandbox.confirm=()=>false;await ctx.applyModel();assert.deepEqual(JSON.parse(JSON.stringify(ctx.s.website)),JSON.parse(before),'Cancel never overwrites');sandbox.confirm=()=>true;await ctx.applyModel();assert.equal(ctx.s.website.design.composition_version,2);assert.equal(ctx.s.website.design.sections[0].title,'Exemplo preenchido');assert.equal(ctx.s.website.public_url,'https://school.test');assert.equal(ctx.s.website.design.pages[0].slug,'historia');assert.equal(ctx.s.website.design.demonstration,true);render();await ctx.restoreModelCheckpoint();assert.equal(ctx.s.website.headline,JSON.parse(before).headline);assert.equal(ctx.s.website.design.pages[0].slug,'historia');assert.equal(ctx.s.hasModelCheckpoint,false);}
ctx.s.website.design.pages=[];
ctx.s.website.design.demonstration=true;const beforePublish=calls.length;await ctx.publishWebsite();assert.equal(calls.length,beforePublish,'No request without explicit demo consent');assert.match(ctx.s.error,/Confirme explicitamente/);ctx.s.website.design.hero_image={url:'/api/v1/public/website-model-assets/garden.jpg',alt:'demo',focal_x:50,focal_y:50};ctx.markDemoReplaced();assert.equal(ctx.s.website.design.demonstration,true);ctx.s.website.design.hero_image=null;ctx.markDemoReplaced();assert.equal(ctx.s.website.design.demonstration,false);

ctx.s.website.design.sections=[];ctx.s.sectionKind='gallery';ctx.addSection();ctx.addSection();assert.notEqual(ctx.s.website.design.sections[0].id,ctx.s.website.design.sections[1].id);
const first=ctx.s.website.design.sections[0];ctx.move(ctx.s.website.design.sections,0,1);assert.equal(ctx.s.website.design.sections[1],first);ctx.move(ctx.s.website.design.sections,1,1);assert.equal(ctx.s.website.design.sections[1],first);
first.image=ctx.newImage();first.image.url='https://images.test/example.png';first.image.alt='Espaço escolar';first.image.focal_x=70;first.action=ctx.newLink();first.action.label='Conheça';first.action.url='#contato';first.items.push(ctx.newItem());first.items[0].image=ctx.newImage();render();
ctx.s.website.design.header_sticky=true;ctx.s.website.design.mobile_actions=false;ctx.s.website.design.menu.push({label:'Espaços',url:'#'+first.id});ctx.s.website.headline='Escola teste';ctx.s.website.public_url='https://school.test';
await ctx.saveWebsite();assert.equal(ctx.s.error,'');assert.equal(saved.design.header_sticky,true);assert.equal(saved.design.mobile_actions,false);assert.equal(saved.design.sections[1].image.focal_x,70);assert.equal(ctx.s.website.design.menu[0].label,'Espaços');
await ctx.previewWebsite();assert.equal(ctx.s.previewHtml,'<p>Preview</p>');
ctx.addSitePage();assert.equal(ctx.s.sitePageIndex,0);ctx.editingPage().title='A escola';ctx.editingPage().slug='sobre';ctx.editingPage().image=ctx.newImage();ctx.editingPage().image.url='https://images.test/internal.png';ctx.addSection();ctx.contentSections()[0].title='Nossa história';assert.equal(ctx.s.website.design.sections.length,2,'Internal sections do not overwrite homepage');ctx.addPageToMenu();render();
await ctx.saveWebsite();assert.equal(ctx.s.error,'');assert.equal(saved.design.pages[0].sections[0].title,'Nossa história');assert.equal(ctx.editingPage().image.url,'https://images.test/internal.png');await ctx.previewWebsite();assert.ok(calls.some(c=>c.url.endsWith('/website/preview?page=sobre')));
ctx.addSitePage();ctx.editingPage().title='Contato';ctx.moveSitePage(-1);assert.equal(ctx.s.sitePageIndex,0);ctx.editingPage().published=false;ctx.addPageToMenu();assert.match(ctx.s.error,/Marque a página/);ctx.s.error='';
sandbox.confirm=()=>false;ctx.removeSitePage();assert.equal(ctx.s.website.design.pages.length,2);sandbox.confirm=()=>true;ctx.removeSitePage();assert.equal(ctx.s.sitePageIndex,-1);ctx.s.sitePageIndex=0;ctx.removeSitePage();assert.equal(ctx.s.website.design.pages.length,0);assert.equal(ctx.s.website.design.menu.some(link=>link.url==='/sobre'),false);
sandbox.confirm=()=>false;ctx.removeSiteItem(ctx.s.website.design.sections,0);assert.equal(ctx.s.website.design.sections.length,2);ctx.s.website.headline='Alterado';ctx.toggleWebsite();assert.equal(ctx.s.websiteOpen,true);
sandbox.confirm=()=>true;ctx.removeSiteItem(ctx.s.website.design.sections,0);assert.equal(ctx.s.website.design.sections.length,1);ctx.toggleWebsite();assert.equal(ctx.s.websiteOpen,false);
ctx.s.website.headline='Preservado após recarregar';ctx.s.modelChoice='editorial';await ctx.applyModel();assert.ok(checkpoint);
let mounted; sandbox.Vue.onMounted=fn=>{mounted=fn};
const reloaded=sandbox.PigeCommunity.component.setup({schoolId:'school-test',permissions:['schools.manage'],request});
mounted();while(reloaded.s.busy)await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(reloaded.s.website.theme,'editorial');assert.equal(reloaded.s.hasModelCheckpoint,true);
await reloaded.restoreModelCheckpoint();assert.equal(reloaded.s.website.headline,'Preservado após recarregar');assert.equal(reloaded.s.hasModelCheckpoint,false);
assert.equal(calls.filter(c=>c.url.endsWith('/publish')).length,0,'Editing, complete-model application, restoration and draft save never publish');
console.log('Website editor: four models, independent pages, sections, order, photo focus, persistence, preview, cancel and no implicit publish OK.');
