const api = window.AmlakDesktop;
const params = new URLSearchParams(window.location.search);
const mode = params.get('type') || 'property';
const draftToLoad = params.get('draftId');
const recordType = mode === 'demand' ? 'demand' : 'property';
const isDemand = recordType === 'demand';
const stepNames = isDemand
  ? ['نوع تقاضا','مشخصات موردنظر','موقعیت موردنظر','بودجه و شرایط','اطلاعات متقاضی','تکمیل و ثبت']
  : ['نوع معامله','مشخصات ملک','موقعیت ملک','قیمت و شرایط','اطلاعات مالک','تکمیل و ثبت'];
const transactionOptions = isDemand
  ? [
      ['purchase','خرید ملک','🏠','اگر به دنبال خرید ملک هستید.'],
      ['rent_lease','رهن و اجاره','🔑','برای اجاره، رهن یا هر دو.'],
      ['participation','مشارکت در ساخت','🏗️','برای مشارکت در ساخت‌وساز.'],
      ['pre_purchase','پیش‌خرید','🛒','برای خرید واحد در حال ساخت.']
    ]
  : [
      ['sale','فروش','🏡','ثبت ملکی که قصد فروش آن را دارید.'],
      ['rent_lease','رهن و اجاره','🔑','برای رهن، اجاره یا هر دو.'],
      ['participation','مشارکت در ساخت','🏗️','برای مشارکت در ساخت‌وساز.'],
      ['presale','پیش‌فروش','🤝','برای پیش‌فروش واحد یا پروژه در حال ساخت.']
    ];
const propertyTypes = [['apartment','آپارتمان'],['land','زمین'],['villa','ویلا'],['commercial','مغازه / تجاری'],['office','اداری'],['industrial','صنعتی'],['old_building','کلنگی'],['other','سایر']];
const usageTypes = [['residential','مسکونی'],['commercial','تجاری'],['office','اداری'],['industrial','صنعتی'],['agricultural','کشاورزی'],['mixed','مختلط'],['other','سایر']];
const facilityOptions = ['تلفن ثابت','کمد دیواری','جاکفشی','آیفون تصویری','دوربین مداربسته','انباری اضافه','تراس / بالکن','آب مستقل','برق مستقل','گاز مستقل'];
let draftId = null;
let currentStep = 0;
let saveTimer = null;
let saving = false;
let state = {
  transactionType:'',
  property:{propertyType:'',usageType:''},
  location:{province:'',county:'',city:'',district:'',neighborhood:'',street:'',address:''},
  details:{area:'',landArea:'',constructionYear:'',floorNumber:'',totalFloors:'',unitCount:'',bedrooms:'',elevator:false,parkingType:'none',storage:false,directLight:false,areaMin:'',areaMax:'',bedroomsMin:'',facilities:[]},
  pricing:{publicPrice:'',redlinePrice:'',expertPrice:'',budgetMin:'',budgetMax:''},
  conditions:{deposit:'',monthlyRent:'',depositMin:'',depositMax:'',rentMin:'',rentMax:'',exchange:false,exchangeDetails:'',specialTerms:''},
  contact:{fullName:'',mobile:'',phone:'',email:''},
  notes:{public:'',confidential:''}
};

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const setPath = (object, path, value) => {
  const keys = path.split('.');
  let target = object;
  for (const key of keys.slice(0,-1)) target = target[key] ||= {};
  target[keys[keys.length-1]] = value;
};
const getPath = path => path.split('.').reduce((value,key)=>value?.[key],state);
const numberInput = (path,label,placeholder='',full=false) => `<div class="field ${full?'full':''}"><label>${label}</label><input type="number" min="0" step="any" data-path="${path}" value="${escapeHtml(getPath(path))}" placeholder="${placeholder}"></div>`;
const textInput = (path,label,placeholder='',full=false) => `<div class="field ${full?'full':''}"><label>${label}</label><input type="text" data-path="${path}" value="${escapeHtml(getPath(path))}" placeholder="${placeholder}"></div>`;
const selectInput = (path,label,options,placeholder='انتخاب کنید') => `<div class="field"><label>${label}</label><select data-path="${path}"><option value="">${placeholder}</option>${options.map(([value,label])=>`<option value="${value}" ${getPath(path)===value?'selected':''}>${label}</option>`).join('')}</select></div>`;
const textarea = (path,label,placeholder='',full=true) => `<div class="field ${full?'full':''}"><label>${label}</label><textarea data-path="${path}" placeholder="${placeholder}">${escapeHtml(getPath(path))}</textarea></div>`;
const checkbox = (path,label) => `<label class="check-item"><input type="checkbox" data-path="${path}" ${getPath(path)?'checked':''}><span>${label}</span></label>`;
function toast(message){const el=$('#toast');el.textContent=message;el.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.display='none',2800);}
function setSaveState(message){$('#saveState').textContent=message;}
function renderStepper(){
  $('#stepper').innerHTML=stepNames.map((name,index)=>`<div class="step-item ${index===currentStep?'active':index<currentStep?'done':''}"><span class="step-number">${index<currentStep?'✓':index+1}</span><span class="step-name">${name}</span></div>`).join('');
}
function renderChoiceStep(){
  return `<h2 class="step-title">نوع ${isDemand?'تقاضا':'معامله'} را انتخاب کنید</h2><p class="step-help">لطفاً مشخص کنید ${isDemand?'به دنبال چه نوع ملکی هستید':'قصد انجام چه نوع معامله‌ای را دارید'} تا فرم متناسب نمایش داده شود.</p><div class="choice-grid">${transactionOptions.map(([value,label,icon,description])=>`<button type="button" class="choice-card ${state.transactionType===value?'selected':''}" data-choice="${value}"><span class="choice-icon">${icon}</span><span class="choice-copy"><strong>${label}</strong><small>${description}</small></span><span class="choice-check">${state.transactionType===value?'●':'○'}</span></button>`).join('')}</div><div class="info-strip">${isDemand?'هرچه مشخصات، محدوده و بودجه را دقیق‌تر وارد کنید، امکان تطبیق تقاضا با فایل‌های موجود بهتر خواهد بود.':'تهاتر و معاوضه در بخش شرایط ویژه معامله و در مراحل پایانی قابل ثبت است.'}</div>`;
}
function renderPropertyStep(){
  let details = isDemand
    ? numberInput('details.areaMin','حداقل متراژ (مترمربع)','مثلاً ۷۰') + numberInput('details.areaMax','حداکثر متراژ (مترمربع)','مثلاً ۱۲۰') + numberInput('details.bedroomsMin','حداقل تعداد خواب','مثلاً ۲')
    : numberInput('details.area','متراژ واحد / بنا (مترمربع)','مثلاً ۱۰۰') + numberInput('details.landArea','مساحت زمین (مترمربع)','در صورت کاربرد') + numberInput('details.constructionYear','سال ساخت','مثلاً ۱۴۰۰') + numberInput('details.floorNumber','طبقه واحد','مثلاً ۲') + numberInput('details.totalFloors','تعداد کل طبقات','مثلاً ۵') + numberInput('details.unitCount','تعداد کل واحدهای ساختمان','مثلاً ۱۰') + numberInput('details.bedrooms','تعداد خواب','مثلاً ۲');
  let extras = isDemand
    ? `<div class="field full"><label>امکانات موردنیاز</label><div class="check-grid">${['آسانسور','پارکینگ','انباری',...facilityOptions.slice(0,5)].map(label=>`<label class="check-item"><input type="checkbox" data-array="details.facilities" value="${escapeHtml(label)}" ${state.details.facilities.includes(label)?'checked':''}><span>${label}</span></label>`).join('')}</div></div>`
    : `<div class="field"><label>آسانسور</label><select data-path="details.elevator"><option value="false" ${!state.details.elevator?'selected':''}>ندارد</option><option value="true" ${state.details.elevator?'selected':''}>دارد</option></select></div><div class="field"><label>نوع پارکینگ</label><select data-path="details.parkingType">${[['none','ندارد'],['exclusive','اختصاصی'],['shared','مشاع'],['yard','حیاطی'],['problem','مزاحم / مشکل‌دار']].map(([v,l])=>`<option value="${v}" ${state.details.parkingType===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>انباری</label><select data-path="details.storage"><option value="false" ${!state.details.storage?'selected':''}>ندارد</option><option value="true" ${state.details.storage?'selected':''}>دارد</option></select></div><div class="field"><label>نور مستقیم</label><select data-path="details.directLight"><option value="false" ${!state.details.directLight?'selected':''}>ندارد</option><option value="true" ${state.details.directLight?'selected':''}>دارد</option></select></div><div class="field full"><label>سایر امکانات</label><div class="check-grid">${facilityOptions.map(label=>`<label class="check-item"><input type="checkbox" data-array="details.facilities" value="${escapeHtml(label)}" ${state.details.facilities.includes(label)?'checked':''}><span>${label}</span></label>`).join('')}</div></div>`;
  return `<h2 class="step-title">مشخصات ${isDemand?'ملک موردنظر':'ملک'}</h2><p class="step-help">نوع ملک و کاربری را مشخص کنید؛ فیلدهای تکمیلی با توجه به نوع پرونده در مراحل بعد قابل توسعه و شخصی‌سازی هستند.</p><div class="field-grid">${selectInput('property.propertyType','نوع ملک',propertyTypes)}${selectInput('property.usageType','نوع کاربری',usageTypes)}${details}${extras}</div>`;
}
function renderLocationStep(){
  return `<h2 class="step-title">موقعیت ${isDemand?'موردنظر':'ملک'}</h2><p class="step-help">نشانی را تا حد امکان دقیق وارد کنید. ساختار رسمی استان، شهرستان، شهر، منطقه، محله و معابر در بخش مدیریت موقعیت‌ها قابل تکمیل خواهد بود.</p><div class="field-grid">${textInput('location.province','استان','مثلاً سمنان')}${textInput('location.county','شهرستان','مثلاً گرمسار')}${textInput('location.city','شهر','مثلاً گرمسار')}${textInput('location.district','منطقه / ناحیه','')}${textInput('location.neighborhood','محله','')}${isDemand?'':textInput('location.street','خیابان / بلوار','')}${isDemand?'':textInput('location.address','نشانی و پلاک','',true)}</div>`;
}
function renderPricingStep(){
  if(isDemand){
    return `<h2 class="step-title">بودجه و شرایط تقاضا</h2><p class="step-help">حداقل و حداکثر بودجه را وارد کنید. برای رهن و اجاره، مبلغ ودیعه و اجاره ماهانه جداگانه ثبت می‌شود.</p><div class="field-grid">${numberInput('pricing.budgetMin','حداقل بودجه کل (تومان)','')}${numberInput('pricing.budgetMax','حداکثر بودجه کل (تومان)','')}${numberInput('conditions.depositMin','حداقل ودیعه (تومان)','')}${numberInput('conditions.depositMax','حداکثر ودیعه (تومان)','')}${numberInput('conditions.rentMin','حداقل اجاره ماهانه (تومان)','')}${numberInput('conditions.rentMax','حداکثر اجاره ماهانه (تومان)','')}${checkbox('conditions.exchange','تهاتر / معاوضه نیز پذیرفته شود')}${textarea('conditions.specialTerms','شرایط تکمیلی','شرایط و توضیحات بودجه‌ای متقاضی')}</div>`;
  }
  let priceFields = '';
  if(['sale','presale'].includes(state.transactionType)){
    priceFields += numberInput('pricing.publicPrice','قیمت اعلامی (تومان)','قیمت پیشنهادی مالک');
    priceFields += numberInput('pricing.redlinePrice','قیمت خط قرمز (تومان)','فقط برای استفاده داخلی');
    priceFields += '<div class="field"><label>قیمت کارشناسی (تومان)</label><input type="text" value="پس از اتصال هسته محاسباتی" disabled></div>';
  } else if(state.transactionType==='rent_lease'){
    priceFields += numberInput('conditions.deposit','مبلغ رهن / ودیعه (تومان)','');
    priceFields += numberInput('conditions.monthlyRent','اجاره ماهانه (تومان)','');
    priceFields += numberInput('pricing.redlinePrice','حد خط قرمز مالک (تومان)','محرمانه');
  } else {
    priceFields += numberInput('pricing.publicPrice','مبلغ / ارزش اعلامی (تومان)','در صورت مشخص بودن');
    priceFields += numberInput('pricing.redlinePrice','حد خط قرمز مالک (تومان)','فقط برای استفاده داخلی');
    priceFields += textarea('conditions.specialTerms','شرایط مشارکت و ساخت','سهم سازنده، سهم مالک، مدت و سایر شروط',true);
  }
  return `<h2 class="step-title">قیمت و شرایط واگذاری</h2><p class="step-help">قیمت اعلامی برای معرفی ملک است. قیمت خط قرمز محرمانه می‌ماند. قیمت کارشناسی پس از اتصال به هسته محاسباتی مشترک به‌صورت پیشنهادی محاسبه خواهد شد.</p><div class="field-grid">${priceFields}${checkbox('conditions.exchange','مالک تهاتر / معاوضه را نیز بررسی می‌کند')}${textarea('conditions.exchangeDetails','توضیح تهاتر یا معاوضه','نوع ملک یا شرایط مورد قبول مالک')}</div>`;
}
function renderContactStep(){
  return `<h2 class="step-title">اطلاعات ${isDemand?'متقاضی':'مالک'}</h2><p class="step-help">اطلاعات تماس را وارد کنید تا پرونده به شخص مربوط متصل شود. در مرحله بعد مدیریت کامل ارباب‌رجوع توسعه می‌یابد.</p><div class="field-grid">${textInput('contact.fullName','نام و نام خانوادگی','')}${textInput('contact.mobile','شماره همراه','مثلاً ۰۹۱۲۱۲۳۴۵۶۷')}${textInput('contact.phone','تلفن ثابت','')}${textInput('contact.email','رایانامه','')}</div><div class="info-strip">در نسخه فعلی، اطلاعات تماس به پرونده متصل و در پایگاه داده محلی ذخیره می‌شود. مدیریت سطوح دسترسی چندکاربره در مرحله جداگانه پیاده‌سازی خواهد شد.</div>`;
}
function summaryRow(label,value,privateValue=false){return `<div class="summary-row"><span>${label}</span><strong class="${privateValue?'private-value':''}">${escapeHtml(value||'—')}</strong></div>`;}
function renderFinalStep(){
  const price = isDemand ? `<div class="summary-box"><h3>بودجه و شرایط</h3>${summaryRow('حداقل بودجه',state.pricing.budgetMin)}${summaryRow('حداکثر بودجه',state.pricing.budgetMax)}${summaryRow('حداقل ودیعه',state.conditions.depositMin)}${summaryRow('حداکثر ودیعه',state.conditions.depositMax)}</div>` : `<div class="summary-box"><h3>قیمت‌ها</h3>${summaryRow('قیمت اعلامی',state.pricing.publicPrice)}${summaryRow('قیمت خط قرمز',state.pricing.redlinePrice,true)}${summaryRow('قیمت کارشناسی','پس از اتصال محاسبه‌گر')}</div>`;
  return `<h2 class="step-title">بررسی و ثبت نهایی</h2><p class="step-help">پیش از ثبت، اطلاعات اصلی را مرور کنید. این پرونده با وضعیت «ثبت‌شده داخلی» ذخیره می‌شود و به‌معنای انتشار آگهی نیست.</p><div class="summary-grid"><div class="summary-box"><h3>مشخصات اصلی</h3>${summaryRow('نوع پرونده',isDemand?'تقاضا':'ملک')}${summaryRow('نوع معامله',transactionOptions.find(x=>x[0]===state.transactionType)?.[1])}${summaryRow('نوع ملک',propertyTypes.find(x=>x[0]===state.property.propertyType)?.[1])}${summaryRow('کاربری',usageTypes.find(x=>x[0]===state.property.usageType)?.[1])}${summaryRow('شهر و محله',[state.location.city,state.location.neighborhood].filter(Boolean).join('، '))}</div><div class="summary-box"><h3>اطلاعات تماس</h3>${summaryRow('نام',state.contact.fullName)}${summaryRow('همراه',state.contact.mobile)}${summaryRow('نقش',isDemand?'متقاضی':'مالک')}</div>${price}<div class="summary-box"><h3>توضیحات</h3>${summaryRow('توضیح عمومی',state.notes.public)}${summaryRow('یادداشت محرمانه',state.notes.confidential,true)}</div></div><div class="field-grid" style="margin-top:16px">${textarea('notes.public','توضیحات عمومی','این متن برای معرفی و مشاهده داخلی پرونده استفاده می‌شود.')}${textarea('notes.confidential','توضیحات محرمانه (فقط مشاور)','یادداشت‌های شخصی مالک و موارد محرمانه؛ در خروجی عمومی نمایش داده نمی‌شود.')}</div><div class="info-strip">قیمت خط قرمز و یادداشت محرمانه در ستون‌های داخلی جداگانه ذخیره می‌شوند. تا زمان تکمیل مجوزهای کاربران، نسخه فعلی برای استفاده محلی و آزمایشی است.</div>`;
}
function renderStep(){
  renderStepper();
  const title = isDemand ? 'ثبت تقاضای جدید' : 'ثبت ملک جدید';
  $('#pageTitle').textContent = mode==='drafts'?'پیش‌نویس‌ها':title;
  $('#recordEyebrow').textContent = isDemand?'ثبت تقاضا':'ثبت فایل';
  $('#pageSubtitle').textContent = mode==='drafts'?'پیش‌نویس‌های ذخیره‌شده را ادامه دهید یا حذف کنید.':'اطلاعات را مرحله‌به‌مرحله وارد کنید؛ پیش‌نویس شما به‌صورت خودکار ذخیره می‌شود.';
  $('#draftLabel').textContent = draftId ? 'شناسه پیش‌نویس: '+draftId.slice(0,8) : 'پیش‌نویس جدید';
  const renderers=[renderChoiceStep,renderPropertyStep,renderLocationStep,renderPricingStep,renderContactStep,renderFinalStep];
  $('#stepContent').innerHTML=renderers[currentStep]();
  $('#previousButton').disabled=currentStep===0;
  $('#nextButton').hidden=currentStep===5;
  $('#submitButton').hidden=currentStep!==5;
}
function scheduleSave(){
  if(mode==='drafts') return;
  setSaveState('در حال ذخیره تغییرات…');
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveDraftNow,650);
}
async function saveDraftNow(){
  if(saving || !api) return;
  saving=true;
  try{
    const result=await api.saveDraft({id:draftId,type:recordType,step:currentStep,payload:state});
    draftId=result.id;
    $('#draftLabel').textContent='پیش‌نویس: '+draftId.slice(0,8);
    setSaveState('ذخیره شد · '+new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}));
  }catch(error){setSaveState('ذخیره خودکار انجام نشد');console.error(error);}
  finally{saving=false;}
}
function validateStep(){
  if(currentStep===0 && !state.transactionType){toast('ابتدا نوع معامله یا تقاضا را انتخاب کنید.');return false;}
  if(currentStep===1 && (!state.property.propertyType || !state.property.usageType)){toast('نوع ملک و کاربری را مشخص کنید.');return false;}
  if(currentStep===2 && !state.location.city.trim()){toast('شهر را مشخص کنید.');return false;}
  return true;
}
function updateFromControl(target){
  if(target.dataset.array){
    const path=target.dataset.array;
    const current=getPath(path)||[];
    const next=target.checked?[...new Set([...current,target.value])]:current.filter(item=>item!==target.value);
    setPath(state,path,next);
  }else if(target.dataset.choice){
    state.transactionType=target.dataset.choice;
  }else if(target.dataset.path){
    let value=target.type==='checkbox'?target.checked:target.value;
    if(['details.elevator','details.storage','details.directLight'].includes(target.dataset.path)) value=value===true||value==='true';
    setPath(state,target.dataset.path,value);
  }
  scheduleSave();
}
function renderDraftList(drafts){
  $('#stepper').hidden=true;
  $('#previousButton').hidden=true;$('#nextButton').hidden=true;$('#submitButton').hidden=true;
  $('#cancelButton').textContent='بستن';
  if(!drafts.length){$('#stepContent').innerHTML='<h2 class="step-title">پیش‌نویسی وجود ندارد</h2><div class="empty-state">هر پرونده‌ای که هنگام ثبت به‌صورت خودکار ذخیره شود، در این قسمت قابل ادامه خواهد بود.</div>';return;}
  $('#stepContent').innerHTML='<h2 class="step-title">پیش‌نویس‌های ذخیره‌شده</h2><p class="step-help">برای ادامه، پیش‌نویس موردنظر را انتخاب کنید.</p><div class="draft-list">'+drafts.map(d=>`<div class="draft-item"><div class="draft-meta"><strong>${d.type==='property'?'ثبت ملک':'ثبت تقاضا'} · مرحله ${Number(d.step)+1} از ۶</strong><small>آخرین ذخیره: ${new Date(d.updatedAt).toLocaleString('fa-IR')}</small></div><div class="draft-actions"><button class="small-button" data-resume="${d.id}" data-type="${d.type}">ادامه ثبت</button><button class="small-button danger" data-delete="${d.id}">حذف پیش‌نویس</button></div></div>`).join('')+'</div>';
}
async function init(){
  $('#closeWindow').addEventListener('click',()=>window.close());
  $('#cancelButton').addEventListener('click',()=>window.close());
  if(mode==='drafts'){
    const drafts=await api.listDrafts();
    renderDraftList(drafts);
    $('#draftLabel').textContent=drafts.length+' پیش‌نویس';
    return;
  }
  if(draftToLoad){
    const saved=await api.getDraft(draftToLoad);
    if(saved){draftId=saved.id;state={...state,...saved.payload};currentStep=Math.max(0,Math.min(5,Number(saved.step)||0));}
  }
  renderStep();
  $('#stepContent').addEventListener('input',event=>updateFromControl(event.target));
  $('#stepContent').addEventListener('change',event=>updateFromControl(event.target));
  $('#stepContent').addEventListener('click',event=>{
    const choice=event.target.closest('[data-choice]');
    if(choice){state.transactionType=choice.dataset.choice;renderStep();scheduleSave();}
  });
  $('#previousButton').addEventListener('click',()=>{if(currentStep>0){currentStep--;renderStep();scheduleSave();}});
  $('#nextButton').addEventListener('click',()=>{if(!validateStep())return;currentStep=Math.min(5,currentStep+1);renderStep();scheduleSave();});
  $('#submitButton').addEventListener('click',async()=>{
    if(!validateStep()||!state.contact.fullName.trim()&&!state.contact.mobile.trim()){toast('نام یا شماره تماس را وارد کنید.');currentStep=4;renderStep();return;}
    $('#submitButton').disabled=true;setSaveState('در حال ثبت پرونده…');
    try{
      const result=await api.submitRecord({type:recordType,payload:state,draftId});
      setSaveState('پرونده ثبت شد');
      $('#stepContent').innerHTML=`<div class="empty-state"><h2>پرونده با موفقیت در پایگاه داده محلی ثبت شد.</h2><p>کد پرونده: <strong>${escapeHtml(result.code)}</strong></p><p>وضعیت: ثبت‌شده داخلی · بدون انتشار آگهی</p><button class="primary-button" id="newRecord">ثبت پرونده جدید</button></div>`;
      $('#stepper').hidden=true;$('#previousButton').hidden=true;$('#nextButton').hidden=true;$('#submitButton').hidden=true;$('#cancelButton').textContent='بستن';
      $('#newRecord').addEventListener('click',()=>window.location.replace('record-entry.html?type='+recordType));
      toast('پرونده در پایگاه داده محلی ذخیره شد.');
    }catch(error){toast(error.message||'ثبت پرونده انجام نشد.');$('#submitButton').disabled=false;setSaveState('نیازمند اصلاح اطلاعات');}
  });
  $('#stepContent').addEventListener('click',async event=>{
    const resume=event.target.closest('[data-resume]');
    const remove=event.target.closest('[data-delete]');
    if(resume) window.location.replace('record-entry.html?type='+resume.dataset.type+'&draftId='+encodeURIComponent(resume.dataset.resume));
    if(remove){await api.deleteDraft(remove.dataset.delete);renderDraftList(await api.listDrafts());toast('پیش‌نویس حذف شد.');}
  });
  if(!draftToLoad) scheduleSave();
}
init().catch(error=>{console.error(error);$('#stepContent').innerHTML='<div class="empty-state">راه‌اندازی فرم انجام نشد. لطفاً برنامه را ببندید و دوباره اجرا کنید.</div>';toast(error.message||'خطا در راه‌اندازی فرم');});
