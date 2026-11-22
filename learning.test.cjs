/* Run: node learning.test.cjs. No dependencies or network required. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const store=new Map();
const ctx=vm.createContext({console,URL,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},window:{addEventListener(){}},location:{href:'https://example.test/app.html'}});
for(const f of ['app-data.js','learning-data.js','learning.js','diagnostic.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx,{filename:f});
let checks=0;
function check(ok,message){assert.ok(ok,message);checks++;}
function run(s){return vm.runInContext(s,ctx);}
check(run('ACADEMY_BANK.length')===56,'56 reviewed questions');
check(run('ACADEMY_SIMULATION.length')===9,'nine simulation stations');
check(run('new Set(ACADEMY_BANK.map(q=>q.id)).size')===56,'unique IDs');
check(run('ACADEMY_BANK.every(q=>q.options.length===3&&q.correct>=0&&q.correct<3&&q.sources.length>0&&q.sources.every(id=>LEARNING_SOURCES[id])&&q.explanation.length>20)'),'question schema and references');
check(run('ACADEMY_BANK.every(q=>q.services.every(n=>n>=1&&n<=14))'),'service tags valid');
check(run('Array.from({length:14},(_,i)=>i+1).every(n=>ACADEMY_BANK.some(q=>q.services.includes(n)))'),'all fourteen services represented, not claimed fully covered');
for(let seed=1;seed<=200;seed++){
 ctx.seed=seed;
 run('var rand=(()=>{var x=seed;return ()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};})();');
 for(let stage=1;stage<=8;stage++){
  ctx.stage=stage;
  run('var session=makeAssessment(stage,rand)');
  check(run('validSession(session,stage)'),`valid randomized session ${seed}/${stage}`);
  check(run('scoreAssessment(session).unanswered===session.items.length&&!scoreAssessment(session).passed'),'blank attempt cannot pass');
  check(run('session.items.every(item=>{var q=questionById(item.id);return item.order.slice().sort().join()===q.options.map((_,i)=>i).join();})'),'option permutation');
  check(run('stage===8?[1,2,3,4,5,6,7].every(s=>session.items.filter(x=>questionById(x.id).stage===s).length===3):session.items.every(x=>questionById(x.id).stage===stage)'),'stage mapping and final balance');
  run('session.items.forEach(x=>session.answers[x.id]=questionById(x.id).correct)');
  check(run('scoreAssessment(session).passed&&scoreAssessment(session).mastery&&scoreAssessment(session).pct===100'),'all correct pass');
  if(run('session.items.some(x=>questionById(x.id).critical)')){
   run('var critical=session.items.find(x=>questionById(x.id).critical);session.answers[critical.id]=(questionById(critical.id).correct+1)%3');
   check(run('!scoreAssessment(session).passed&&scoreAssessment(session).criticalErrors===1'),'critical wrong answer blocks pass');
  }
 }
}
run('var uneven=makeAssessment(8);uneven.items.forEach(x=>{var q=questionById(x.id);uneven.answers[x.id]=q.stage===1?(q.correct+1)%3:q.correct;})');
check(run('scoreAssessment(uneven).pct>=80&&!scoreAssessment(uneven).passed'),'high aggregate cannot hide missing skill');
run('var corrupt=makeAssessment(8);corrupt.items[1]=corrupt.items[0]');
check(!run('validSession(corrupt,8)'),'duplicate items rejected');
store.set('eng540-learning-v1','{"version":1,"active":99,"sessions":{"1":{"stage":1}},"records":{"1":{"best":"bad"}},"simulation":{"index":99}}');
check(run('Object.keys(loadAcademy().sessions).length===0&&loadAcademy().active===1&&!loadAcademy().simulation.done'),'corrupt storage sanitized');
store.set('eng540-learning-v1','not json');
check(run('loadAcademy().active===1'),'invalid JSON handled');
ctx.localStorage.getItem=()=>{throw new Error('blocked')};
check(run('loadAcademy().active===1&&!academyStorageOK'),'storage denied handled');
check(run("escapeLearning('<img src=x onerror=alert(1)>').includes('&lt;img')"),'output escaped');
ctx.base={role:'owner',goal:'build',property:'land_planned',document:'electronic',registration:'outside',authority:'verified',safety:'no_signs',permit:'matching',use:'residential',mortgage:'no',issue:'none',city:'جدة',scope:'new',adjacent:'yes',ownership:'same',completion:'documented',independence:'reviewed',unitMode:'existing',offplanApproval:'verified'};
function diag(overrides){ctx.args={...ctx.base,...overrides};return run('diagnoseCase(args)');}
check(diag({}).status==='conditional','complete base stays conditional, never approved');
check(diag({goal:'unknown'}).status==='incomplete','unknown goal');
check(diag({property:'land_planned',goal:'build',scope:'addition'}).status==='conflict','addition requires existing structure');
check(diag({document:'registered_doc',registration:'declared'}).status==='conflict','registered deed contradicts incomplete registration');
check(diag({document:'registered_doc',registration:'outside'}).status==='conflict','document/region contradiction');
check(diag({goal:'occupancy'}).status==='conflict','empty plot cannot get occupancy');
check(diag({goal:'merge',adjacent:'no'}).status==='blocked','nonadjacent merger blocked');
check(diag({goal:'merge',ownership:'different'}).status==='blocked','ownership difference blocked');
check(diag({goal:'merge',mortgage:'yes'}).status==='blocked','mortgaged disposition gated');
check(diag({goal:'units',property:'building',independence:'not_reviewed',scope:'unknown'}).status==='incomplete','unit feasibility is not assumed');
check(diag({goal:'units',property:'building',independence:'obstacle',scope:'unknown'}).status==='blocked','unit obstacles gated');
check(diag({goal:'renovate',property:'building',scope:'addition'}).status==='blocked','addition is not assumed restoration');
check(diag({goal:'occupancy',property:'building',completion:'unfinished',scope:'unknown'}).status==='blocked','unfinished occupancy gated');
check(diag({goal:'demolish',property:'building',permit:'unlicensed',scope:'unknown'}).status==='conditional','unlicensed demolition does not force legalization');
check(diag({goal:'occupancy',property:'building',permit:'unlicensed',scope:'unknown'}).status==='blocked','unlicensed occupancy gated');
check(diag({goal:'technical',property:'building',safety:'concern',scope:'unknown'}).status==='blocked','safety concern before normal work');
check(diag({goal:'units',property:'land_planned',unitMode:'offplan'}).status==='conditional','licensed off-plan land is not ordinary building contradiction');
check(diag({goal:'units',property:'construction',unitMode:'offplan'}).status==='conditional','off-plan under construction not blanket-blocked');
check(diag({goal:'units',property:'land_planned',unitMode:'offplan',offplanApproval:'pending'}).status==='blocked','off-plan approval gate');
check(diag({goal:'units',property:'land_planned',unitMode:'unknown'}).status==='incomplete','unspecified unit route needs clarification, not false ineligibility');
check(diag({goal:'technical',property:'building',scope:'new'}).status==='conditional','hidden build scope cannot block technical review');
check(diag({goal:'occupancy',property:'building',scope:'new',completion:'documented'}).status==='conditional','hidden build scope cannot block occupancy');
check(diag({goal:'survey',property:'land_planned',permit:'unlicensed',scope:'addition'}).answers.permit==='unknown','hidden permit normalized away');
check(diag({goal:'registration',registration:'outside'}).status==='blocked','initial registration outside announced area gated');
check(diag({document:'paper',registration:'registered'}).status==='incomplete','registered status needs proof');
check(diag({authority:'pending'}).status==='blocked','representation not assumed');
check(diag({issue:'boundary'}).status==='blocked','boundary dispute gated');
check(diag({issue:'area'}).status==='blocked','area difference gated');
check(diag({issue:'rejected'}).status==='incomplete','rejection needs exact evidence');
const goals=run('DIAGNOSTIC_FIELDS.find(f=>f.id==="goal").options.map(o=>o[0])');
let scenarios=0;
for(const goal of goals)for(const property of ['unknown','land_planned','land_raw','building','construction'])for(const document of ['unknown','electronic','paper','registered_doc','unavailable','disputed'])for(const registration of ['unknown','outside','declared','registered'])for(const safety of ['unknown','no_signs','concern','immediate'])for(const permit of ['unknown','matching','missing','unlicensed','modified']){
 const r=diag({goal,property,document,registration,safety,permit});scenarios++;
 assert.ok(['conditional','incomplete','blocked','conflict','urgent'].includes(r.status));
 assert.ok(r.refs.every(k=>run('!!LEARNING_SOURCES['+JSON.stringify(k)+']')));
 if(safety==='immediate'){assert.equal(r.status,'urgent');assert.equal(r.steps.length,1);assert.equal(r.refs.length,1);}
 if(r.status==='conditional'){assert.equal(r.missing.length,0);assert.equal(r.blockers.length,0);}
}
for(const source of Object.values(run('LEARNING_SOURCES'))){
 check(!!source.label&&!!source.url,'source has identity');
 if(source.type==='training')check(fs.existsSync(__dirname+'/'+source.url),'training link exists');
 else check(/^https:\/\//.test(source.url),'official HTTPS source');
}
console.log(JSON.stringify({passed:true,assertions:checks,diagnosticScenarios:scenarios,questionBank:56,simulationStations:9}));
