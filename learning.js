/* ENG540 interactive assessment. No network calls or personal data. */
'use strict';
var ACADEMY_VERSION = 1;
var ACADEMY_KEY = 'eng540-learning-v1';
var academyStorageOK = true;
var activeStageId = 1;
var academyState = loadAcademy();
var academyReviewOnly = false;
function blankAcademy(){ return {version:ACADEMY_VERSION,active:1,sessions:{},records:{},simulation:{index:0,done:false,errors:0,feedback:''}}; }
function escapeLearning(value){return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function shuffled(items, random){
  var copy=items.slice(); random=random || Math.random;
  for(var i=copy.length-1;i>0;i--){var j=Math.floor(random()*(i+1));var tmp=copy[i];copy[i]=copy[j];copy[j]=tmp;}
  return copy;
}
function bankFor(stage){return ACADEMY_BANK.filter(function(q){return q.stage===stage;});}
function makeAssessment(stage, random){
  var selected=[];
  var groups=stage===8 ? [1,2,3,4,5,6,7] : [stage];
  groups.forEach(function(s){
    var pool=shuffled(bankFor(s),random), take=stage===8?3:5;
    // Ensure one safety/ethics decision where this skill has such questions.
    var critical=pool.filter(function(q){return q.critical;})[0];
    if(critical){selected.push(critical);pool=pool.filter(function(q){return q.id!==critical.id;});take--;}
    selected=selected.concat(pool.slice(0,take));
  });
  return {stage:stage,items:shuffled(selected,random).map(function(q){return {id:q.id,order:shuffled(q.options.map(function(_,i){return i;}),random)};}),answers:{},submitted:false,started:new Date().toISOString()};
}
function questionById(id){return ACADEMY_BANK.find(function(q){return q.id===id;});}
function scoreAssessment(session){
  var byStage={},correct=0,unanswered=0,criticalErrors=0;
  session.items.forEach(function(item){
    var q=questionById(item.id), a=session.answers[q.id];
    if(!byStage[q.stage])byStage[q.stage]={correct:0,total:0};
    byStage[q.stage].total++;
    if(a===undefined)unanswered++;
    if(a===q.correct){correct++;byStage[q.stage].correct++;}else if(q.critical)criticalErrors++;
  });
  var pct=Math.round(correct/session.items.length*100);
  var balanced=session.stage!==8 || Object.keys(byStage).every(function(s){return byStage[s].correct>=2;});
  return {correct:correct,total:session.items.length,pct:pct,unanswered:unanswered,byStage:byStage,criticalErrors:criticalErrors,passed:!unanswered&&pct>=80&&balanced&&criticalErrors===0,mastery:!unanswered&&pct>=90&&balanced&&criticalErrors===0};
}
function validSession(session,key){
  if(!session || session.stage!==Number(key) || !Array.isArray(session.items) || !session.answers || typeof session.answers!=='object')return false;
  var ids=session.items.map(function(x){return x.id;}), expected=session.stage===8?21:5;
  if(ids.length!==expected || new Set(ids).size!==expected)return false;
  var counts={};
  if(!session.items.every(function(x){var q=questionById(x.id);if(!q || (session.stage!==8 && q.stage!==session.stage))return false;counts[q.stage]=(counts[q.stage]||0)+1;return Array.isArray(x.order)&&x.order.length===3&&x.order.slice().sort().join(',')==='0,1,2';}))return false;
  if(session.stage===8 && ![1,2,3,4,5,6,7].every(function(s){return counts[s]===3;}))return false;
  return Object.keys(session.answers).every(function(id){return ids.indexOf(id)!==-1&&Number.isInteger(session.answers[id])&&session.answers[id]>=0&&session.answers[id]<3;});
}
function loadAcademy(){
  var clean=blankAcademy();
  try{
    var saved=JSON.parse(localStorage.getItem(ACADEMY_KEY)||'null');
    if(!saved || saved.version!==ACADEMY_VERSION)return clean;
    if(Number.isInteger(saved.active)&&saved.active>=1&&saved.active<=8)clean.active=saved.active;
    for(var s=1;s<=8;s++){
      var session=(saved.sessions||{})[s];
      if(validSession(session,s))clean.sessions[s]=session;
      // Completed attempts are reconstructed, not trusted as free-form HTML or scores.
      var record=(saved.records||{})[s];
      if(record&&validSession(record.best,s)&&record.best.submitted&&scoreAssessment(record.best).unanswered===0){
        clean.records[s]={best:record.best,attempts:Number.isInteger(record.attempts)?Math.max(1,Math.min(record.attempts,100000)):1};
      }
    }
    var sim=saved.simulation;
    if(sim&&Number.isInteger(sim.index)&&sim.index>=0&&sim.index<=ACADEMY_SIMULATION.length){clean.simulation={index:sim.index,done:sim.index===ACADEMY_SIMULATION.length,errors:Number.isInteger(sim.errors)?Math.max(0,Math.min(sim.errors,100000)):0,feedback:''};}
  }catch(e){academyStorageOK=false;}
  return clean;
}
activeStageId=academyState.active;
function saveAcademy(){try{localStorage.setItem(ACADEMY_KEY,JSON.stringify(academyState));}catch(e){academyStorageOK=false;}updateAcademyStorage();}
function updateAcademyStorage(){var el=document.getElementById('academyStorage');if(el)el.textContent=academyStorageOK?'التقدم والمحاولة الحالية محفوظان على هذا المتصفح فقط. لا يُرسل شيء لخادم، ولا تتزامن الأجهزة.':'تعذر الحفظ المحلي. يمكنك المتابعة الآن، لكن التقدم قد يضيع عند إغلاق الصفحة.';}
function learningSources(ids){return ids.map(function(id){var s=LEARNING_SOURCES[id];return '<a href="'+escapeLearning(s.url)+'" target="_blank" rel="noopener">'+escapeLearning(s.label)+'</a>'+(s.type==='official'?' <small>(تحقق '+s.checked+')</small>':' <small>(مرجع تدريبي)</small>');}).join(' · ');}
function stagePassed(id){var r=academyState.records[id];return !!(r&&scoreAssessment(r.best).passed&&(id!==6||academyState.simulation.done));}
function completedAcademy(){return [1,2,3,4,5,6,7,8].every(stagePassed);}
function renderStages(){
  document.getElementById('stageButtonsContainer').innerHTML=TRAINING_STAGES.map(function(s){return '<button type="button" onclick="selectStage('+s.id+')" aria-pressed="'+(s.id===activeStageId)+'" class="stage-btn'+(s.id===activeStageId?' active':'')+'">'+escapeLearning(s.title)+(stagePassed(s.id)?' ✓':'')+'</button>';}).join('');
  var stage=TRAINING_STAGES[activeStageId-1];
  document.getElementById('stageContentBox').innerHTML='<h4 tabindex="-1">'+escapeLearning(stage.title)+'</h4><p>'+escapeLearning(stage.summary)+'</p><ul>'+stage.lessons.map(function(t){return '<li>'+escapeLearning(t)+'</li>';}).join('')+'</ul><p class="learning-refs">مراجع القراءة: '+learningSources(stage.sources)+'</p>'+(activeStageId===6?'<div id="academySimulation"></div>':'');
  if(activeStageId===6)renderSimulation();
  var count=[1,2,3,4,5,6,7,8].filter(stagePassed).length;
  document.getElementById('academyProgress').textContent='مراحل مجتازة: '+count+' / 8';
  document.getElementById('academyCompletion').textContent=completedAcademy()?'اكتمل مسار التقييم التعليمي. لا يمنح هذا اعتماداً أو ترخيصاً مهنياً.':'يمكنك التعلم والتدرب بأي ترتيب. اكتمال المسار يتطلب التقييمات السبعة والمحاكاة والنهائي.';
  updateAcademyStorage();
}
function selectStage(id){if(!Number.isInteger(id)||id<1||id>8)return;activeStageId=id;academyState.active=id;academyReviewOnly=false;saveAcademy();renderStages();renderExam();revealDetail(document.getElementById('stageContentBox'),'h4');}
function startAssessment(){
  var prev=academyState.sessions[activeStageId];
  if(prev&&!prev.submitted&&Object.keys(prev.answers).length&&!window.confirm('بدء محاولة جديدة سيمسح إجابات المحاولة الحالية فقط. هل تتابع؟'))return;
  academyState.sessions[activeStageId]=makeAssessment(activeStageId);academyReviewOnly=false;saveAcademy();renderExam();
}
function chooseAcademyAnswer(id,value){var s=academyState.sessions[activeStageId];if(!s||s.submitted)return;if(!s.items.some(function(x){return x.id===id;}))return;s.answers[id]=Number(value);saveAcademy();updateAnswered();}
function updateAnswered(){var s=academyState.sessions[activeStageId],el=document.getElementById('academyAnswered');if(el&&s)el.textContent='أجبت عن '+Object.keys(s.answers).length+' من '+s.items.length;}
function renderExam(){
  var stage=activeStageId, session=academyState.sessions[stage], record=academyState.records[stage];
  var title=stage===8?'الاختبار النهائي المتوازن · 21 سؤالاً':'تقييم '+TRAINING_STAGES[stage-1].title+' · 5 أسئلة من بنك 8';
  document.getElementById('examTitle').textContent=title;
  document.getElementById('academyAttemptInfo').textContent=(record?'محاولات مصححة: '+record.attempts+' · أفضل نتيجة: '+scoreAssessment(record.best).pct+'%. ':'')+(stage===8?'ثلاثة أسئلة لكل مهارة. النجاح: 80% وإجابتان من ثلاث لكل مهارة، وجميع قرارات السلامة والأمانة المختارة صحيحة.':'النجاح: 4 من 5 مع جميع قرارات السلامة والأمانة المختارة صحيحة. الإتقان: 90% فأكثر.');
  document.getElementById('academyStart').textContent=session?'محاولة جديدة بأسئلة وخيارات معاد ترتيبها':'ابدأ التقييم';
  document.getElementById('academyGrade').hidden=!session||session.submitted;
  document.getElementById('academyReview').hidden=!session||!session.submitted;
  document.getElementById('academyReview').textContent=academyReviewOnly?'عرض جميع الإجابات':'مراجعة الأخطاء فقط';
  var container=document.getElementById('examQuestionsContainer');
  var banner=document.getElementById('examResultBanner');banner.className='banner hidden';banner.textContent='';
  if(!session){container.innerHTML='<p class="learning-empty">اقرأ الدرس ومراجعه، ثم ابدأ التقييم. لا توجد محاولة نشطة لهذه المرحلة.</p>';document.getElementById('academyAnswered').textContent='';return;}
  var items=session.items.filter(function(item){return !academyReviewOnly||session.answers[item.id]!==questionById(item.id).correct;});
  container.innerHTML=items.map(function(item,index){
    var q=questionById(item.id),answered=session.answers[q.id],ok=answered===q.correct;
    return '<fieldset class="q-card" data-question="'+q.id+'"><legend class="q-text">'+(session.items.indexOf(item)+1)+'. '+escapeLearning(q.q)+'</legend><p class="question-meta">'+escapeLearning(TRAINING_STAGES[q.stage-1].title)+' · '+(q.kind==='official'?'معلومة رسمية محددة':q.kind==='illustrative'?'حالة افتراضية':'قرار مهني تعليمي')+(q.critical?' · قرار سلامة أو أمانة حاسم':'')+'</p>'+item.order.map(function(original){return '<label class="opt"><input type="radio" name="'+q.id+'" value="'+original+'"'+(answered===original?' checked':'')+(session.submitted?' disabled':'')+' onchange="chooseAcademyAnswer(\''+q.id+'\',this.value)"><span>'+escapeLearning(q.options[original])+'</span></label>';}).join('')+(session.submitted?'<div class="exp '+(ok?'ok':'no')+'"><strong>'+(ok?'إجابة صحيحة. ':'الإجابة الصحيحة: '+escapeLearning(q.options[q.correct])+'. ')+'</strong>'+escapeLearning(q.explanation)+'<p class="learning-refs">'+learningSources(q.sources)+'</p></div>':'')+'</fieldset>';
  }).join('')||(academyReviewOnly?'<p>لا توجد أخطاء في هذه المحاولة.</p>':'');
  if(session.submitted)showAcademyResult(session);
  updateAnswered();
}
function gradeExam(){
  var s=academyState.sessions[activeStageId];if(!s||s.submitted)return;
  var result=scoreAssessment(s),banner=document.getElementById('examResultBanner');
  if(result.unanswered){banner.className='banner retry';banner.textContent='بقي '+result.unanswered+' سؤال دون إجابة. أكمل جميع الإجابات قبل التصحيح؛ لم تُحتسب محاولة.';banner.scrollIntoView({block:'center',behavior:'smooth'});var q=s.items.find(function(x){return s.answers[x.id]===undefined;});var input=document.querySelector('input[name="'+q.id+'"]');if(input)input.focus({preventScroll:true});return;}
  s.submitted=true;s.finished=new Date().toISOString();
  var r=academyState.records[activeStageId];
  // A pass is never replaced by a higher numerical score that fails a critical gate.
  var prev=r?scoreAssessment(r.best):null;
  var better=!prev||(result.passed&&!prev.passed)||(result.passed===prev.passed&&result.pct>=prev.pct);
  academyState.records[activeStageId]={best:better?JSON.parse(JSON.stringify(s)):r.best,attempts:(r?r.attempts:0)+1};
  saveAcademy();renderStages();renderExam();document.getElementById('examResultBanner').scrollIntoView({block:'center',behavior:'smooth'});
}
function showAcademyResult(s){
  var r=scoreAssessment(s),banner=document.getElementById('examResultBanner');
  banner.className='banner '+(r.mastery?'mastery':r.passed?'pass':'retry');
  banner.innerHTML='<strong>'+(r.mastery?'إتقان تعليمي':r.passed?'اجتياز التقييم':'تحتاج مراجعة')+': '+r.correct+' / '+r.total+' ('+r.pct+'%)</strong>'+(r.criticalErrors?'<p>لم تجتز '+r.criticalErrors+' من قرارات السلامة أو الأمانة الحاسمة. راجعها حتى لو كانت النسبة الإجمالية مرتفعة.</p>':'')+(s.stage===8?'<ul>'+Object.keys(r.byStage).map(function(id){var skill=r.byStage[id];return '<li>'+escapeLearning(TRAINING_STAGES[id-1].title)+': '+skill.correct+' / '+skill.total+(skill.correct<2?' · دون الحد الأدنى':'')+'</li>';}).join('')+'</ul>':'')+(s.stage===6&&!academyState.simulation.done?'<p>بقي إكمال المحاكاة لاحتساب المرحلة السادسة.</p>':'')+'<p>التصحيح تعليمي وليس اعتماداً لقرار هندسي حقيقي. المحاولة المصححة مقفلة؛ ابدأ محاولة جديدة لإعادة التقييم.</p>';
}
function toggleAcademyReview(){academyReviewOnly=!academyReviewOnly;renderExam();}
function renderSimulation(){
  var el=document.getElementById('academySimulation');if(!el)return;
  var sim=academyState.simulation;
  if(sim.done){el.innerHTML='<h4>اكتملت المحاكاة: 9 / 9</h4><p>قرارات تدريبية متتابعة، مع '+sim.errors+' محاولة تصحيح أثناء التعلم. لا تعني إعداد ملف هندسي معتمد.</p><button class="btn btn-ghost" type="button" onclick="resetSimulation()">إعادة المحاكاة</button>';return;}
  var st=ACADEMY_SIMULATION[sim.index];
  // A stable shuffled option order per station keeps labels from moving after feedback.
  if(!sim.order)sim.order=shuffled([0,1,2]);
  el.innerHTML='<h4>محطة '+(sim.index+1)+' / 9: '+escapeLearning(st.title)+'</h4><p>'+escapeLearning(st.q)+'</p><div class="sim-options">'+sim.order.map(function(i){return '<button type="button" class="btn btn-ghost" onclick="answerSimulation('+i+')">'+escapeLearning(st.options[i])+'</button>';}).join('')+'</div><div role="status" class="sim-feedback">'+escapeLearning(sim.feedback||'اختر قراراً للانتقال. القرار غير المناسب لا يفتح المحطة التالية.')+'</div><p class="learning-refs">'+learningSources(st.sources)+'</p>';
}
function answerSimulation(value){
  var sim=academyState.simulation;if(sim.done)return;
  var st=ACADEMY_SIMULATION[sim.index];
  if(value!==st.correct){sim.errors++;sim.feedback='راجع القرار: '+st.explanation;saveAcademy();renderSimulation();return;}
  sim.index++;sim.done=sim.index===ACADEMY_SIMULATION.length;sim.feedback='القرار السابق صحيح. '+st.explanation;delete sim.order;saveAcademy();renderStages();
}
function resetSimulation(){if(!window.confirm('إعادة المحاكاة ستمسح تقدم محطاتها فقط. هل تتابع؟'))return;academyState.simulation={index:0,done:false,errors:0,feedback:''};saveAcademy();renderStages();}
function resetAcademy(){if(!window.confirm('سيُحذف تقدم الأكاديمية ومحاولاتها من هذا المتصفح فقط. هل تتابع؟'))return;academyState=blankAcademy();activeStageId=1;academyReviewOnly=false;saveAcademy();renderStages();renderExam();}
function renderAcademyCoverage(){
  var el=document.getElementById('academyCoverage');if(!el)return;
  var rows=TRAINING_STAGES.slice(0,7).map(function(s){return '<tr><th scope="row">'+escapeLearning(s.title)+'</th><td>'+bankFor(s.id).length+'</td><td>5</td><td>3</td></tr>';}).join('');
  el.innerHTML='<summary>خريطة التغطية والمراجع: بنك 56 سؤالاً + 9 محطات محاكاة</summary><div class="table-scroll"><table><caption>سبع مهارات مستقلة والمرحلة الثامنة اختبار تكاملي لها. ليست ثمانية مواضيع خدمات أو ثمانية اختبارات متطابقة.</caption><thead><tr><th>المهارة</th><th>في البنك</th><th>تقييم المرحلة</th><th>في النهائي</th></tr></thead><tbody>'+rows+'</tbody></table></div><h4>إشارات الخدمات داخل البنك</h4><p>الأرقام التالية عدد الأسئلة الموسومة بالخدمة، وليست شهادة اكتمال تدريب كل خدمة. قد يقيس السؤال أكثر من خدمة؛ السحب متوازن بالمهارة وليس بكل خدمة.</p><ul class="service-coverage">'+SERVICES_DATA.map(function(s){var n=Number(s.code.split('-')[1]);return '<li>'+escapeLearning(s.code+' · '+s.title)+': '+ACADEMY_BANK.filter(function(q){return q.services.indexOf(n)!==-1;}).length+'</li>';}).join('')+'</ul><p>هذه اختبارات موضوعية تعليمية تركز على القرار والحدود والمصدر. التمارين والاختبار التحريري الموسع في الموسوعة تبقى أعمالاً منفصلة تحتاج إجابات مكتوبة ومراجعة؛ لا تدعي هذه الواجهة تصحيحها آلياً أو اعتماد الكفاءة المهنية.</p><p>'+learningSources(['exercises','written','simulation'])+'</p>';
}
window.addEventListener('load',renderAcademyCoverage);
