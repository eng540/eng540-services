/* Case triage, not an eligibility decision. No personal data is stored. */
'use strict';
var DIAGNOSTIC_FIELDS = [
 {id:'role',label:'صفة المستخدم',options:[['owner','مالك'],['office','مكتب هندسي أو منسق'],['tenant','مستأجر'],['agent','وكيل أو ممثل'],['other','طرف آخر']]},
 {id:'goal',label:'المشكلة أو المخرج المطلوب',options:[['build','بناء جديد أو إضافة إنشائية'],['units','فرز وحدات عقارية'],['subdivide','تجزئة أرض'],['merge','دمج قطع أو صكوك'],['occupancy','شهادة إشغال'],['renovate','ترميم مبنى قائم'],['compliance','شهادة امتثال للمباني'],['demolish','هدم مبنى'],['deed','تحديث أو تعديل وثيقة ملكية'],['survey','تقرير أو قرار مساحي'],['stake','تحديد حدود على الطبيعة'],['registration','التسجيل العيني الأول أو حالة السجل'],['technical','تقرير فني لمبنى أو فحص سلامة'],['correction','مراجعة مخالفة أو تصحيح وضع مبنى'],['planning','دراسة تخطيط أرض خام'],['other','مشكلة أخرى أو لا أعرف الخدمة']]},
 {id:'property',label:'الوضع الفعلي للعقار',options:[['land_planned','أرض بلا مبنى داخل مخطط معتمد'],['land_raw','أرض خام غير مخططة'],['building','مبنى قائم'],['construction','مبنى تحت التنفيذ']]},
 {id:'document',label:'وثيقة الملكية المتاحة للمراجعة',options:[['electronic','صك إلكتروني'],['paper','صك ورقي قديم أو ناقص البيانات'],['registered_doc','صك تسجيل ملكية من السجل العقاري'],['unavailable','لا توجد وثيقة متاحة للمراجعة'],['disputed','ملكية أو صفة محل نزاع']]},
 {id:'registration',label:'حالة المنطقة والعقار في السجل العقاري',options:[['outside','تحققت: خارج المناطق المعلنة حالياً'],['declared','داخل منطقة معلنة ولم يكتمل التسجيل الأول'],['registered','اكتمل تسجيل العقار وله وثيقة تسجيل']]},
 {id:'authority',label:'هل صفة مقدم الطلب وتمثيل الملاك موثقان؟',options:[['verified','نعم، تحقق المالك أو التمثيل اللازم'],['pending','لم تكتمل موافقات شركاء أو ورثة أو التمثيل'],['no','لا توجد صفة أو صلاحية مثبتة']]},
 {id:'safety',label:'مؤشرات السلامة الحالية، مستقلة عن وجود الرخصة',options:[['no_signs','لا توجد مؤشرات خطر معلومة لي، وليس هذا إثبات سلامة'],['concern','تشققات أو هبوط أو ضرر يحتاج فحصاً'],['immediate','خطر مباشر أو سقوط أو انهيار محتمل الآن']]},
 {id:'permit',label:'حالة رخصة المبنى والمطابقة',building:true,options:[['matching','رخصة متاحة والواقع مطابق بحسب المعطيات المتاحة'],['missing','رخصة قديمة معروفة لكنها لا تظهر أو غير متاحة'],['unlicensed','لا توجد رخصة بناء معلومة'],['modified','توجد رخصة مع تعديلات أو مخالفات محتملة']]},
 {id:'use',label:'استعمال العقار',options:[['residential','سكني'],['commercial','تجاري أو مختلط'],['other','استعمال آخر']]},
 {id:'mortgage',label:'هل توجد قيود أو رهن موثقة؟',options:[['no','لا توجد بحسب الوثائق المراجعة'],['yes','رهن أو قيد قائم']]},
 {id:'issue',label:'العائق الذي يحتاج معالجة',options:[['none','لا يوجد عائق آخر معلوم'],['area','فرق مساحة أو بيانات بين الوثائق والواقع'],['boundary','نزاع حدود أو تعد على مجاور'],['missing_record','عدم ظهور رخصة أو قرار قديم'],['notes','ملاحظة أو نقص في طلب قائم'],['rejected','رفض أو غرامة تحتاج مراجعة'],['heirs','ورثة أو شركاء وصفة غير محسومة'],['other','عائق آخر غير مصنف']]}
];
DIAGNOSTIC_FIELDS = DIAGNOSTIC_FIELDS.concat([
 {id:'unitMode',label:'نوع فرز الوحدات المطلوب',goals:['units'],options:[['existing','فرز اعتيادي لمبنى قائم'],['offplan','فرز مشروع بيع على الخارطة مرخص أو قيد دراسة الترخيص']]},
 {id:'offplanApproval',label:'هل موافقة الجهة المرخصة للمشروع على الفرز موثقة؟',goals:['units'],offplan:true,options:[['verified','الموافقة موثقة وتحتاج مراجعة المختص'],['pending','لا توجد موافقة موثقة بعد']]},
 {id:'adjacent',label:'هل القطع متجاورة بحد مشترك موثق؟',goals:['merge'],options:[['yes','نعم، بحسب الوثائق والرفع'],['no','لا، القطع غير متجاورة']]},
 {id:'ownership',label:'هل الملكية والحقوق في القطع المراد دمجها متوافقة؟',goals:['merge'],options:[['same','المالك أو الملاك والحقوق متطابقون بحسب الوثائق'],['different','يوجد اختلاف يحتاج معالجة قانونية أو موافقات']]},
 {id:'scope',label:'نطاق الأعمال المطلوبة',goals:['build','renovate'],options:[['new','إنشاء جديد على أرض'],['repair','إصلاح القائم دون إضافة مقصودة'],['addition','إضافة أو تعلية أو تغيير إنشائي'],['change_use','تغيير استعمال أو نشاط']]},
 {id:'completion',label:'حالة إتمام الأعمال وإشعارات الإشراف',goals:['occupancy'],options:[['documented','الأعمال مكتملة والمستندات أو الإشعارات متاحة للمراجعة'],['unfinished','الأعمال أو الإشعارات لم تكتمل'],['old','رخصة قديمة تحتاج تحديد مسارها']]},
 {id:'independence',label:'هل قابلية استقلال الوحدات والأجزاء المشتركة مدروسة؟',goals:['units'],options:[['reviewed','راجعها مكتب معتمد وحدد الملاحظات'],['not_reviewed','لم تُدرس بعد'],['obstacle','توجد موانع أو اختلافات في الواقع']]}
]);
function relevantDiagField(f,a){return (!f.building||isDiagBuilding(a.property))&&(!f.goals||f.goals.indexOf(a.goal)!==-1)&&(!f.offplan||a.unitMode==='offplan');}
var DIAGNOSTIC_ROUTES = {
 build:{name:'دراسة ترخيص بناء أو إضافة',services:[1,4,8],refs:['building','survey'],steps:[['تعريف نطاق المشروع','حدد هل المطلوب بناء جديد أو إضافة أو تغيير استعمال. راجع اشتراطات الموقع والجهة؛ لا تفترض قبول الارتفاع أو الاستخدام.'],['المساحة والمعطيات الفنية','راجع وثيقة الملكية والغرض المساحي ومتطلبات الموقع، ثم كلف المختصين بالرفع والدراسات والتصميم المناسب للحالة.'],['طلب الترخيص ومتابعته','المكتب المعني يكمل إجراءات المنصة والمراجعات والتعاقدات والرسوم والتأمين حين ينطبق، ثم يتحقق من مخرج الإصدار قبل بدء العمل المرخص.']]},
 units:{name:'دراسة فرز وحدات عقارية',services:[3,6],refs:['units','occupancy','registration'],steps:[['فحص قابلية الفرز','يراجع المكتب المعتمد الملكية والواقع والرخصة ووصف الوحدات والأجزاء المشتركة والحقوق. لا تضمن صكوكاً مستقلة قبل الدراسة.'],['تحديد الجهة والمسار','تحقق من تسجيل العقار ونوع وثيقته والخدمة المتاحة له لدى السجل العقاري أو منظومة فرز الوحدات. إعلان المنطقة وحده لا يعني أن التسجيل اكتمل.'],['إعداد الملف الفني ومتابعة المخرج','استكمل المتطلبات الفنية والوثائق المطلوبة للحالة ثم تابع الطلب والملاحظات واعتماد المخرج من الجهة المختصة.']]},
 subdivide:{name:'دراسة تجزئة أرض',services:[9,4],refs:['land','survey'],steps:[['التحقق من النطاق','بطاقة بلدي للدمج والتجزئة تخص الأراضي السكنية داخل مخطط معتمد. خارج هذا النطاق يلزم سؤال الجهة عن مسار التخطيط المناسب.'],['دراسة المقترح','يراجع المكتب الأبعاد والمداخل والاشتراطات والحقوق، ويعد مخطط التجزئة والقرار المساحي بحسب متطلبات الحالة.'],['المراجعة البلدية والتوثيق','تابع اعتماد طلب التجزئة ثم وثائق الملكية الناتجة لدى جهة التوثيق المناسبة لوضع العقار، دون ضمان نتيجة أو مدة.']]},
 merge:{name:'دراسة دمج قطع أو وثائق',services:[7,4],refs:['land','registration'],steps:[['مراجعة أهلية القطع','تحقق من التجاور والملكية والحقوق والاشتراطات والاستخدام؛ الملكية الواحدة لا تضمن قبول الدمج.'],['المسار الفني والبلدي','يراجع المكتب القرار المساحي بغرض الدمج ونطاق خدمة بلدي أو المسار الذي تحدده الجهة لوضع العقار.'],['تحديث وثائق الملكية','بعد الموافقات المطلوبة يتابع صاحب الصفة المخرج لدى جهة التوثيق أو السجل المناسبة للحالة.']]},
 occupancy:{name:'دراسة إصدار شهادة إشغال',services:[6],refs:['occupancy'],steps:[['تصنيف الرخصة والواقع','حدد رخصة البناء وحالة التنفيذ والمطابقة. بلدي يميز مسار إشعارات البناء للطلبات الجديدة عن التقديم للرخص القديمة.'],['استكمال المتطلبات','راجع إشعارات المكتب المشرف أو التقرير والوثائق المطلوبة للحالة مع بلدي؛ لا تعمم شرطاً خاصاً بالرخص القديمة على كل رخصة.'],['متابعة الاعتماد والإصدار','تابع الملاحظات والمتطلبات والفاتورة ثم تحقق من صدور الشهادة؛ وصول خدمة كهرباء وحده ليس شهادة إشغال.']]},
 renovate:{name:'دراسة ترخيص ترميم',services:[5,13],refs:['restoration'],steps:[['تمييز نطاق الأعمال','حدد أعمال الإصلاح وما إذا كانت إضافة أو تغييراً إنشائياً يحتاج مساراً آخر. قيّم مؤشرات السلامة بواسطة مختص.'],['التحقق من الرخصة','بطاقة الترميم تذكر رخصة البناء ضمن المتطلبات، وتحتوي عبارات عامة أخرى؛ عند فقدها أو تعارض الوصف اطلب تأكيداً للحالة من البلدية، ولا تعد بقبول بديل.'],['إعداد الطلب والتنفيذ المرخص','استكمل الدراسة والمستندات والمخططات والمتطلبات التي تعتمدها الجهة ثم نفذ بإشراف المختص وبعد الترخيص اللازم.']]},
 compliance:{name:'دراسة شهادة الامتثال للمباني',services:[14],refs:['compliance','occupancy'],steps:[['تحديد النطاق المحلي','تحقق من موقع العقار واستعماله ونطاق تطبيق الشهادة لدى الأمانة أو المستكشف. لا تفترض سريان الإلزام على كل عقار.'],['فحص عناصر الامتثال','راجع عناصر التقييم والوثائق وأزل الملاحظات وفق المسار المعتمد. الشهادة مرتبطة بالاشتراطات والتشوه البصري ولا تحسم السلامة الإنشائية.'],['اختيار قناة الإصدار','تحقق مما إذا صدرت استباقياً مع الإشغال أو تحتاج طلباً مستقلاً، ومن القناة الخاصة بالأمانة المعنية.']]},
 demolish:{name:'دراسة ترخيص هدم',services:[10],refs:['demolition'],steps:[['فحص المتطلبات','بطاقة بلدي تذكر رخصة بناء أو قراراً مساحياً مع مكتب هندسي. عدم توفر رخصة لا يعني اشتراط تصحيح المبنى أولاً في جميع الحالات.'],['خطة آمنة قبل التنفيذ','يتولى المختصون تقييم الجوار والإخلاء وفصل الخدمات والتصاريح وخطة الهدم. لا يباشر غير المختص إخلاء موقع خطر أو قطع المرافق.'],['إصدار ومتابعة الهدم','استكمل طلب الرخصة والرسوم المعتمدة، ثم نفذ في نطاقها بإشراف المختصين ووثق الإغلاق وترحيل المخلفات.']]},
 deed:{name:'مراجعة وثيقة الملكية أو تحديث بياناتها',services:[2,8],refs:['deed','registration','survey'],steps:[['تحديد الوثيقة والجهة','فرق بين صك وزارة العدل ووثيقة السجل العقاري وحالة التسجيل الفعلية قبل اختيار خدمة تحديث أو تصحيح.'],['حصر النقص والتعارض','حدد الحقول الناقصة ونص إشعار الجهة؛ قد يلزم مستند أو رفع مساحي بحسب الملاحظة، ولا تفرض مرفقات موحدة من الذاكرة.'],['مراجعة المسار المناسب','صاحب الصفة يتابع خدمة الجهة المختصة، ويصعد النزاع الحقوقي للمختص القانوني؛ المكتب لا يعدل الوثيقة بنفسه.']]},
 survey:{name:'دراسة تقرير أو قرار مساحي',services:[4,8],refs:['survey'],steps:[['تحديد الغرض والوثيقة','حدد الغرض من التقرير والجهة المستخدمة ووثيقة العقار. تحقق من صلاحية القرار السابق وغرضه إن وجد.'],['إسناد العمل المساحي','تتطلب خدمة بلدي مكتباً مصنفاً مساحياً؛ يقوم المختص بالرفع ومراجعة النتائج والتعارضات.'],['اعتماد المخرج المناسب','تابع الملاحظات والرسوم والمخرج من المنصة؛ التقرير لا يغير حدود الملكية تلقائياً ولا يحسم نزاعاً.']]},
 stake:{name:'تحديد حدود على الطبيعة',services:[8,4],refs:['survey'],steps:[['مطابقة الأساس الوثائقي','اجمع وثيقة الملكية والمخطط والبيانات المساحية المعتمدة وحدد الغرض من التحديد.'],['رفع وتوقيع بواسطة مختص','يراجع المختص الإحداثيات والحدود ميدانياً ويوثق العمل وحدوده. لا تستنتج الحدود من لقطة خريطة أو سياج فقط.'],['معالجة التعارض قبل التصرف','إذا ظهر تعد أو اختلاف فتوقف عن الإقرار بالحد المتنازع ووثق الأدلة وراجع الجهة والمختص.']]},
 registration:{name:'تحديد حالة التسجيل العيني',services:[12],refs:['registration','deed'],steps:[['التحقق من الإعلان للعقار','خدمة التسجيل الأول موجهة للعقارات في المناطق المعلنة. استخدم الخريطة والإعلان والمدة الخاصة بالمنطقة لدى السجل، لا اسم المدينة وحده.'],['فحص الصفة والوثائق','بطاقة الهيئة تتضمن صكاً إلكترونياً من وزارة العدل، وهوية أو سجلاً سارياً، ووكالة سارية للوكيل. تحقق من الانطباق للحالة.'],['استكمال أو مراجعة التسجيل','إن لم يكتمل التسجيل راجع طلب التسجيل الأول؛ وإن اكتمل فراجع بيانات العقار وخدمة التصرف أو التصحيح المطلوبة، وليس طلب تسجيل أول مكرراً.']]},
 technical:{name:'تقييم فني بواسطة مختص',services:[13],refs:['exercises'],steps:[['تحديد سبب الفحص','صف الضرر وموقعه وتطوره والاستعمال دون الجزم بسببه أو سلامة المبنى من الصور.'],['إسناد لمختص مؤهل','المختص يحدد المعاينة والاختبارات والحسابات والتقرير اللازم وحدود الرأي. التقرير ليس مرفقاً شكلياً.'],['المسار بعد التقييم','تعالج توصيات المختص والمتطلبات المحلية؛ قد تختلف بين متابعة أو تدعيم أو ترميم أو إزالة، ولا يقررها هذا النموذج.']]},
 correction:{name:'مراجعة مخالفة أو تصحيح وضع',services:[11,13],refs:['correction','building'],steps:[['توثيق الوضع الحالي','اجمع الرخصة إن وجدت والرسومات والواقع وإشعار المخالفة أو الرفض. لا تفترض أن كل مبنى قابل للتصحيح.'],['تقييم قابلية المعالجة','يراجع المختص والجهة نوع المخالفة والاشتراطات والحقوق والسلامة والمسار المتاح. لا توجد غرامة أو قائمة معالجة موحدة لكل حالة.'],['اعتماد الحل المناسب','قد يحتاج الملف تصحيحاً أو تعديلاً أو معالجة أخرى تعتمدها الجهة. لا تبدأ أعمال إزالة أو تعديل مؤثر دون دراسة وترخيص لازم.']]},
 planning:{name:'دراسة تخطيط أرض خام',services:[9,8],refs:['land','survey'],steps:[['مراجعة الوضع التخطيطي','تحقق من الموقع والملكية والاستعمال والنطاق والجهة المخولة قبل إسقاط شروط قطعة سكنية مخططة.'],['تحديد مسار اعتماد المخطط','استوضح من الأمانة والجهات المختصة مسار التخطيط والدراسات والموافقات المطلوبة للحالة؛ لا توجد قائمة واحدة يعتمدها هذا النموذج.'],['تحديد الخدمات اللاحقة','بعد حسم التخطيط تدرس التجزئة والبنية الأساسية والتراخيص اللاحقة وفق الموافقات، دون وعد بقبول أو جدول ثابت.']]}
};
function diagLabels(a){return DIAGNOSTIC_FIELDS.filter(function(f){return relevantDiagField(f,a);}).map(function(f){var op=f.options.find(function(o){return o[0]===a[f.id];});return f.label+': '+(op?op[1]:'لا أعرف / لم يحدد');}).concat(['المدينة أو الأمانة: '+(a.city||'لم تحدد')]);}
function isDiagBuilding(v){return v==='building'||v==='construction';}
function diagnoseCase(input){
 var a={},missing=[],warnings=[],blockers=[],preparation=[],refs=[],status='conditional',title='مسار أولي مشروط',steps=[];
 DIAGNOSTIC_FIELDS.forEach(function(f){a[f.id]=f.options.some(function(o){return o[0]===input[f.id];})?input[f.id]:'unknown';});
 a.city=typeof input.city==='string'?input.city.trim().slice(0,100):'';
 // Hidden conditional answers must never influence another goal or property type.
 DIAGNOSTIC_FIELDS.forEach(function(f){if(!relevantDiagField(f,a))a[f.id]='unknown';});
 var snapshot=diagLabels(a),route=DIAGNOSTIC_ROUTES[a.goal];
 var result=function(){return {status:status,title:title,goal:a.goal,answers:a,snapshot:snapshot,missing:missing,warnings:warnings,blockers:blockers,preparation:preparation,steps:steps,refs:Array.from(new Set(refs)),services:route?route.services:[]};};
 // Safety outranks property assumptions, documentary gaps and every normal route.
 if(a.safety==='immediate'){
  status='urgent';title='أولوية عاجلة للسلامة، لا تتابع المعاملة الآن';
  warnings.push('ابتعد عن موضع الخطر ولا تدخل موقعاً غير آمن لجمع مستندات أو قياسات. تواصل فوراً مع الطوارئ أو الدفاع المدني عبر القنوات المحلية المتاحة، واطلب تقييماً عاجلاً من مختص.');
  steps=[['السلامة أولاً','لا يحكم هذا النموذج على صلاحية الإشغال أو ضرورة الهدم. الجهات المختصة والمختص الميداني يحددون الإجراء الآمن.']];refs=['exercises'];return result();
 }
 if(a.safety==='concern'){
  blockers.push('توجد مؤشرات تستلزم فحصاً فنياً قبل أي خطوة متأثرة بالسلامة. لا يعني وجود رخصة أو شهادة امتثال سلامة المبنى.');
  preparation.push('أحِل مؤشرات الضرر لمختص، ووثقها من مكان آمن فقط. إذا أصبح الخطر مباشراً غيّر التقييم إلى طارئ واتصل بالجهات المختصة.');refs.push('exercises');
 }
 var offplan=a.goal==='units'&&a.unitMode==='offplan';
 var buildingGoal=['occupancy','renovate','compliance','demolish','technical','correction'].indexOf(a.goal)!==-1||(a.goal==='units'&&a.unitMode==='existing');
 var land=a.property==='land_planned'||a.property==='land_raw';
 if(land&&a.goal==='build'&&a.scope==='addition'){blockers.push('تعارض مدخلات: إضافة أو تعلية تفترض مكوناً قائماً، بينما العقار أرض بلا مبنى. وضح هل المطلوب إنشاء جديد أم أن حالة العقار غير صحيحة.');status='conflict';title='تعارض بين حالة العقار ونطاق العمل';return result();}
 if(buildingGoal&&land){blockers.push('تعارض مدخلات: المخرج المختار يفترض مبنى، لكن العقار أرض بلا مبنى. صحح الهدف أو حالة العقار.');status='conflict';title='تعارض يمنع رسم مسار صالح';return result();}
 if(a.document==='registered_doc'&&(a.registration==='outside'||a.registration==='declared')){blockers.push('تعارض: اخترت وثيقة تسجيل ملكية مع حالة تقول إن العقار خارج المناطق المعلنة أو لم يكتمل تسجيله. تحقق من نوع الوثيقة وحالة التسجيل للعقار نفسه.');status='conflict';title='تحقق من وثيقة السجل والنطاق';return result();}
 ['role','goal','property','document','registration','authority','safety','use','mortgage','issue'].forEach(function(key){if(a[key]==='unknown'){var f=DIAGNOSTIC_FIELDS.find(function(f){return f.id===key;});missing.push(f.label);}});
 DIAGNOSTIC_FIELDS.filter(function(f){return f.goals&&relevantDiagField(f,a)&&a[f.id]==='unknown';}).forEach(function(f){missing.push(f.label);});
 if(!a.city)missing.push('المدينة أو الأمانة، للتحقق من الاختصاص والاشتراطات المحلية');
 if(isDiagBuilding(a.property)&&a.permit==='unknown')missing.push('حالة رخصة المبنى والمطابقة');
 if(a.goal==='other'){missing.push('وصف المشكلة وتحديد المخرج المطلوب مع المختص؛ هذه الحالة خارج المسارات المحددة');}
 if(a.authority==='pending'||a.authority==='no'||a.issue==='heirs'){
  blockers.push('الصفة أو التمثيل غير مكتمل: لا تقدم أو تتصرف نيابة عن الملاك قبل توثيق الصلاحية والموافقات المطلوبة. النزاع أو الإرث المعقد يحتاج مختصاً قانونياً.');preparation.push('جهز ما يثبت صفة مقدم الطلب والتمثيل، وحدد الشركاء أو الورثة والجهة التي تحتاج مراجعة.');
 }
 if(a.document==='disputed'||a.issue==='boundary'){
  blockers.push('نزاع ملكية أو حدود: احصر الوقائع وأحل حسم الحقوق للجهة أو المختص القانوني. الرفع الفني ليس حكماً في النزاع.');preparation.push('اجمع الوثائق والرفوع والإشعارات المتعارضة للمختص دون تعديل حدود أو تقديم إقرارات غير مثبتة.');refs.push('survey','exercises');
 }
 if(a.document==='unavailable')missing.push('وثيقة ملكية أو بيان رسمي يمكن التحقق منه؛ لا يمكن اعتماد أهلية الطلب دونها');
 if(a.document==='paper'){
  preparation.push('راجع نوع النقص ومسار تحديث وثيقة الملكية لدى الجهة المختصة. لا تنسب لكل صك قديم قائمة مرفقات أو علاجاً واحداً.');refs.push('deed');
 }
 if(a.registration==='declared'){
  preparation.push('تحقق من إعلان المنطقة والمهلة وحالة التسجيل الأول للعقار وشروطه. إعلان المنطقة لا يساوي اكتمال التسجيل أو تحديد كل التصرفات اللاحقة.');refs.push('registration');
 }
 if(a.registration==='registered'){
  preparation.push('ابدأ بوثيقة وبيانات السجل العقاري وتحقق من الخدمة المتاحة للعقار. لا تعاد معاملة التسجيل الأول لمجرد الحاجة إلى تصرف لاحق.');refs.push('registration');
 }
 if(a.registration==='registered'&&a.document!=='registered_doc')missing.push('وثيقة التسجيل أو بيانات تحقق رسمية لتأكيد أن التسجيل اكتمل');
 if(offplan){
  route={name:'فرز مشروع بيع على الخارطة: مسار متخصص',services:[3],refs:['unitsLaw','units'],steps:[['تمييز الفرز عن إصدار الصكوك','اللائحة التنفيذية، المادة 4 فقرة 4، تجيز فرز وحدات مشاريع البيع على الخارطة بعد موافقة الجهة المرخصة للمشروع. هذا ليس إذناً عاماً لفرز أي أرض خالية.'],['مراجعة ترخيص المشروع والموافقة','راجع الجهة المرخصة والمكتب المعتمد للتحقق من ترخيص المشروع وموافقة الفرز ومخططاته وحقوق الوحدات والأجزاء المشتركة والضوابط المنطبقة. لا تتحقق هذه الأداة من الترخيص.'],['تأجيل الصكوك حتى تحقق شروطها','لا تصدر صكوك هذه الوحدات إلا بعد اكتمال إنجاز العقار وإصدار شهادة مطابقة الواقع لمحضر الفرز بحسب الفقرة المذكورة. تحديد توفر الشروط يرجع للمختص والجهة.']]};
  warnings.push('مسار بيع على الخارطة متخصص: لا تعمم عليه شروط الفرز الاعتيادي لمبنى قائم، ولا تخلط السماح بالفرز بإصدار صكوك وحدات مكتملة.');
  if(a.offplanApproval==='pending')blockers.push('لم توثق موافقة الجهة المرخصة للمشروع على الفرز بعد؛ راجع الجهة المختصة قبل متابعة طلب الفرز.');
 }
 if(a.goal==='units'&&a.unitMode==='unknown')missing.push('تحديد هل الفرز اعتيادي لمبنى قائم أم مشروع بيع على الخارطة يحتاج مساراً متخصصاً');
 if(a.goal==='merge'&&a.adjacent==='no')blockers.push('القطع غير متجاورة: لا تعرض مسار دمج عادي لقطع منفصلة. راجع الجهة والمختص لتحديد ما إذا كان هناك مسار آخر.');
 if(a.goal==='merge'&&a.ownership==='different')blockers.push('اختلاف في ملكية القطع أو الحقوق: يلزم تحديد المعالجة والموافقات القانونية أولاً، ولا يفترض النموذج انتقال الملكية أو موافقة الأطراف.');
 if(a.goal==='renovate'&&(a.scope==='addition'||a.scope==='change_use'||a.scope==='new'))blockers.push('نطاق العمل ليس إصلاح القائم فقط. حدد مسار إضافة أو بناء أو تغيير استعمال مع المكتب والبلدية بدلاً من افتراض أن رخصة الترميم تغطيه.');
 if(a.goal==='build'&&a.scope==='repair')warnings.push('إذا كان المطلوب إصلاح القائم دون إنشاء أو إضافة فراجع مسار الترميم مع المختص بدلاً من اختيار بناء جديد تلقائياً.');
 if(a.scope==='new'&&isDiagBuilding(a.property))blockers.push('تعارض نطاق: اخترت إنشاء جديداً على أرض، بينما يوجد مبنى قائم أو تحت التنفيذ. وضح هل المطلوب هدم أو تعديل أو إضافة قبل اختيار المسار.');
 if(a.goal==='occupancy'&&a.completion==='unfinished')blockers.push('الأعمال أو إشعارات الإشراف غير مكتملة. راجع المكتب لاستكمال ما ينطبق على الرخصة قبل طلب المخرج النهائي.');
 if(a.goal==='units'&&a.independence==='not_reviewed')missing.push('دراسة المكتب المعتمد لقابلية الفرز واستقلال الوحدات والأجزاء المشتركة');
 if(a.goal==='units'&&a.independence==='obstacle')blockers.push('توجد موانع أو اختلافات في استقلال الوحدات أو الواقع. يلزم تقييم فني ومعالجة معتمدة قبل التعهد بفرزها.');
 if(a.mortgage==='yes'){
  if(['units','subdivide','merge','deed'].indexOf(a.goal)!==-1)blockers.push('الرهن أو القيد مؤثر في التصرف المقترح: لا تتابع الجزء المتأثر حتى التحقق من الموافقات والقيود لدى صاحب الحق والجهة.');
  warnings.push('يوجد رهن أو قيد: افحص أثره وموافقات صاحب الحق والجهة قبل الالتزام، خصوصاً الفرز والدمج والتجزئة. لا يفترض النموذج موافقة المرتهن.');preparation.push('راجع القيود في الوثائق وحدد موافقات أصحاب الحقوق المطلوبة للحالة.');
 }
 if(a.issue==='area'){
  blockers.push('فرق مساحة أو بيانات: يلزم توثيق الفرق والتحقق المساحي ومسار التصحيح قبل اعتماد الجزء المتأثر من التصميم أو التصرف.');preparation.push('اطلب من المختص مقارنة وثيقة الملكية والمخطط والرفع وتحديد منشأ التعارض.');refs.push('survey','deed');
 }
 if(a.issue==='missing_record'||a.permit==='missing'){
  preparation.push('عدم ظهور رخصة أو قرار قديم لا يثبت انعدامه. اجمع الرقم والتاريخ والجهة المصدرة، وراجع خدمة الإدخال أو الاسترجاع والدعم الرسمي قبل تكرار الطلب.');refs.push('survey','occupancy');
 }
 if(a.issue==='notes'||a.issue==='rejected'){
  missing.push('نص الملاحظة أو الرفض ورقم الطلب وتاريخه والجهة والمهلة إن وجدت، لمراجعة المختص');
  preparation.push('سجل نص القرار والمرجع، وحدد هل هو نقص وثائقي أو فني أو اعتراض. تحقق من المهل وقناة المعالجة الرسمية للحالة، ولا تعد بإلغاء غرامة أو رفض.');
 }
 if(a.issue==='other')missing.push('تفصيل العائق غير المصنف يحتاج مراجعة بشرية');
 if(isDiagBuilding(a.property)&&(a.permit==='unlicensed'||a.permit==='modified')){
  if(a.goal==='demolish'){
   warnings.push('عدم الترخيص لا يفرض تصحيح الوضع قبل الهدم في كل الحالات؛ بطاقة الهدم تذكر رخصة بناء أو قراراً مساحياً. يراجع المكتب والجهة بقية المتطلبات.');refs.push('demolition');
  }else if((['occupancy','build','renovate','correction'].indexOf(a.goal)!==-1)||(a.goal==='units'&&!offplan)){
   blockers.push('عدم ترخيص أو مخالفة محتملة: افحص قابلية المعالجة ونوع الإجراء مع المختص والبلدية قبل متابعة المخرج النهائي. لا يضمن وجود خدمة تصحيح قبول المبنى.');preparation.push('راجع الواقع والرخصة والرسومات والمخالفات مع المكتب والبلدية؛ لا تفترض قائمة فحوص أو غرامة موحدة.');refs.push('correction');
  }else{
   warnings.push('توجد مخالفة أو رخصة غير مثبتة؛ المخرج المختار لا يسوي وضع الترخيص تلقائياً. افصل تقييم المخالفة عن الإجراء المطلوب.');refs.push('correction');
  }
 }
 if(a.property==='land_raw'&&['build','subdivide','merge'].indexOf(a.goal)!==-1){
  blockers.push('أرض خام: لا تستخدم تلقائياً مسار الأراضي السكنية داخل مخطط معتمد. تحقق من الوضع التخطيطي والمسار المختص قبل البناء أو التجزئة أو الدمج.');preparation.push('راجع الأمانة أو جهة التخطيط لتحديد نطاق الخدمة والدراسات والموافقات للحالة.');refs.push('land');
 }
 if(['subdivide','merge'].indexOf(a.goal)!==-1&&a.use!=='residential')warnings.push('بطاقة بلدي المذكورة تخص الأراضي السكنية في مخطط معتمد. يجب تأكيد المسار المناسب لهذا الاستعمال بدلاً من تعميمها.');
 if(a.property==='construction'&&(a.goal==='occupancy'||(a.goal==='units'&&a.unitMode==='existing')))blockers.push('المبنى تحت التنفيذ: لا تعتبره مستكملاً أو مؤهلاً للإشغال أو الفرز. راجع حالة الإنجاز وإشعارات الإشراف والوثائق مع المكتب والجهة.');
 if(a.goal==='build'&&isDiagBuilding(a.property))warnings.push('يوجد مبنى قائم أو تحت التنفيذ: حدد هل الطلب إضافة أو تعديل أو إزالة وبناء. لا تعامل الموقع كأرض خالية.');
 if(a.goal==='registration'&&a.registration==='outside')blockers.push('خدمة التسجيل الأول مرتبطة بالمناطق المعلنة. تحقق من الإعلان الحديث للعقار قبل تقديم طلب لا ينطبق عليه النطاق.');
 if(a.goal==='technical')preparation.push('هذا مسار إحالة لفحص مختص وليس نتيجة سلامة. لا يمكن للمنصة تصنيف سبب الضرر أو صلاحية الإشغال من هذه المدخلات.');
 if(route){steps=route.steps.map(function(s){return s.slice();});refs=refs.concat(route.refs);}else{warnings.push('لم يحدد مسار مدعوم بعد. راجع المخرج المطلوب مع المختص، ولا تختَر أقرب اسم خدمة لمجرد تشابه الألفاظ.');}
 if(blockers.length){status='blocked';title='توجد عوائق قبل متابعة الجزء المتأثر';}
 else if(missing.length){status='incomplete';title='المعطيات غير كافية، لا نتيجة نهائية';}
 else {status='conditional';title='توجيه أولي مشروط بالمراجعة، وليس موافقة أو إثبات أهلية';}
 warnings.push('الرسوم والمدد والاشتراطات تتغير بحسب الحالة والجهة. لم تُحسب رسوم أو غرامات ولم يُتحقق من موقع العقار عبر حساب حكومي.');
 return result();
}
function renderDiagnosticForm(){
 var holder=document.getElementById('diagnosticFields');if(!holder)return;
 holder.innerHTML=DIAGNOSTIC_FIELDS.map(function(f){return '<div id="diag-field-'+f.id+'"'+(f.building||f.goals||f.offplan?' hidden':'')+'><label class="field-label" for="diag-'+f.id+'">'+escapeLearning(f.label)+'</label><select class="txt" id="diag-'+f.id+'" onchange="runDiagnostic()"><option value="unknown">لا أعرف / لم يحدد</option>'+f.options.map(function(o){return '<option value="'+o[0]+'">'+escapeLearning(o[1])+'</option>';}).join('')+'</select></div>';}).join('')+'<div><label class="field-label" for="diag-city">المدينة أو الأمانة (دون عنوان تفصيلي)</label><input id="diag-city" class="txt" type="text" maxlength="100" autocomplete="off" placeholder="مثال: جدة" oninput="runDiagnostic()"></div>';
}
function readDiagnosticAnswers(){var a={};DIAGNOSTIC_FIELDS.forEach(function(f){var el=document.getElementById('diag-'+f.id);a[f.id]=el?el.value:'unknown';});var city=document.getElementById('diag-city');a.city=city?city.value:'';return a;}
function diagnosticText(result){
 var lines=['ENG540 · توجيه أولي للحالة، لا قرار نظامي أو تقرير سلامة',result.title,'','المعطيات المدخلة:'].concat(result.snapshot);
 [['معلومات ناقصة',result.missing],['عوائق وموانع متابعة',result.blockers],['تحضير ومعالجة أولية',result.preparation],['تنبيهات وحدود',result.warnings]].forEach(function(group){if(group[1].length)lines=lines.concat(['',group[0]+':'],group[1].map(function(x){return '• '+x;}));});
 if(result.steps.length){lines.push('',result.status==='urgent'?'إجراء السلامة:':'مسار مقترح بعد حسم النواقص والعوائق، لا يجيز البدء:');result.steps.forEach(function(st,i){lines.push((i+1)+'. '+st[0],st[1]);});}
 lines.push('','المراجع المحددة، تحقق 2026-11-22:');result.refs.forEach(function(id){var s=LEARNING_SOURCES[id];lines.push(s.label+': '+new URL(s.url,location.href).href);});
 lines.push('','لا تخزن المنصة هذه المدخلات أو ترسلها لخادم. راجع البيانات قبل نسخ التقرير أو طباعته.');return lines.join('\n');
}
function runDiagnostic(){
 if(!document.getElementById('diag-goal'))renderDiagnosticForm();
 var a=readDiagnosticAnswers();DIAGNOSTIC_FIELDS.forEach(function(f){var row=document.getElementById('diag-field-'+f.id);if(row)row.hidden=!relevantDiagField(f,a);});
 var result=diagnoseCase(a),box=document.getElementById('diagnosticResultBox');if(!box)return;
 var lists=[['المعلومات الناقصة',result.missing],['عوائق قبل المتابعة',result.blockers],['ما يمكنك تحضيره الآن',result.preparation],['تنبيهات وحدود',result.warnings]];
 box.innerHTML='<div class="diag-status status-'+result.status+'" role="status"><h3>'+escapeLearning(result.title)+'</h3><p>هذه النتيجة مبنية على مدخلاتك فقط. لا تتحقق من وثائق أو حسابات حكومية ولا تثبت أهلية أو سلامة.</p></div><details class="diag-snapshot"><summary>المعطيات التي بُني عليها التقرير</summary><ul>'+result.snapshot.map(function(x){return '<li>'+escapeLearning(x)+'</li>';}).join('')+'</ul></details>'+lists.filter(function(g){return g[1].length;}).map(function(g){return '<div class="diag-list"><h4>'+g[0]+'</h4><ul>'+g[1].map(function(x){return '<li>'+escapeLearning(x)+'</li>';}).join('')+'</ul></div>';}).join('')+(result.steps.length?'<h3>'+(result.status==='urgent'?'السلامة أولاً':'المسار المقترح بعد حسم النواقص والعوائق')+'</h3>'+result.steps.map(function(st,i){return '<div class="route-step"><span class="step-dot">'+(i+1)+'</span><div><h4>'+escapeLearning(st[0])+'</h4><p>'+escapeLearning(st[1])+'</p></div></div>';}).join(''):'')+(result.services.length&&result.status!=='urgent'?'<p>أدلة ذات صلة: '+result.services.map(function(n){var code='SRV-'+String(n).padStart(2,'0');return '<a href="?view=services&amp;srv='+code+'">'+code+'</a>';}).join(' · ')+'</p>':'')+'<p class="learning-refs">مراجع وحدود القراءة: '+learningSources(result.refs)+'</p>';
 var report=diagnosticText(result);document.getElementById('diagPlainText').textContent=report;document.getElementById('diagPrintReport').textContent=report;
}
function resetDiagnostic(){document.getElementById('diagnosticFields').innerHTML='';renderDiagnosticForm();runDiagnostic();}
