const api=window.AmlakDesktop;
const $=s=>document.querySelector(s);
const labels={province:'استان',county:'شهرستان',city:'شهر',district:'منطقه',neighborhood:'محله',street:'خیابان / بلوار / میدان',village:'روستا'};
let levels=[],locations=[];
function toast(message){const el=$('#toast');el.textContent=message;el.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.display='none',2600)}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function parentLevels(level){return levels.find(x=>x.value===level)?.parents||[]}
function populateLevels(selected='province'){$('#level').innerHTML=levels.map(x=>'<option value="'+x.value+'" '+(x.value===selected?'selected':'')+'>'+escapeHtml(x.label)+'</option>').join('')}
function populateParents(selected=''){
 const level=$('#level').value,allowed=parentLevels(level);
 const choices=locations.filter(x=>allowed.includes(x.level)&&x.isActive);
 $('#parentId').innerHTML=(allowed.length?'<option value="">انتخاب موقعیت بالادستی</option>':'<option value="">بدون والد (سطح اصلی)</option>')+
 choices.map(x=>'<option value="'+x.id+'" '+(x.id===selected?'selected':'')+'>'+escapeHtml(pathLabel(x))+'</option>').join('');
 $('#parentId').disabled=allowed.length===0;
 $('#parentHint').textContent=allowed.length?'سطح مجاز والد: '+allowed.map(x=>labels[x]).join('، '):'استان در بالاترین سطح قرار دارد.';
}
function pathLabel(loc){const parts=[loc.officialName];let p=locations.find(x=>x.id===loc.parentId),guard=0;while(p&&guard++<8){parts.unshift(p.officialName);p=locations.find(x=>x.id===p.parentId)}return parts.join(' / ')}
function resetForm(){ $('#locationId').value='';$('#formTitle').textContent='افزودن موقعیت جدید';$('#saveBtn').textContent='ذخیره موقعیت';$('#officialName').value='';$('#commonName').value='';$('#sortOrder').value='0';$('#level').disabled=false;populateLevels();populateParents(); }
function renderList(){
 const term=$('#search').value.trim().toLocaleLowerCase('fa');
 const showInactive=$('#showInactive').checked;
 const rows=locations.filter(x=>(showInactive||x.isActive)&&(!term||(x.officialName+' '+x.commonName+' '+pathLabel(x)).toLocaleLowerCase('fa').includes(term)));
 rows.sort((a,b)=>pathLabel(a).localeCompare(pathLabel(b),'fa'));
 $('#locationList').innerHTML=rows.length?rows.map(x=>'<article class="loc-row '+(!x.isActive?'inactive':'')+'"><div class="loc-main"><strong>'+escapeHtml(x.officialName)+(x.commonName?' ('+escapeHtml(x.commonName)+')':'')+'</strong><small>'+labels[x.level]+' · '+escapeHtml(pathLabel(x.parentId?locations.find(p=>p.id===x.parentId)||{officialName:'—'}:x))+' · '+(x.isActive?'فعال':'غیرفعال')+'</small></div><div class="loc-actions"><button data-edit="'+x.id+'">ویرایش</button><button class="off" data-toggle="'+x.id+'" data-active="'+(x.isActive?'0':'1')+'">'+(x.isActive?'غیرفعال‌کردن':'فعال‌کردن')+'</button></div></article>').join(''):'<div class="empty">موقعیتی با این مشخصات ثبت نشده است.</div>';
}
async function refresh(){locations=await api.listLocationCatalog(true);renderList();populateParents($('#parentId').value)}
function editLocation(id){const x=locations.find(v=>v.id===id);if(!x)return;$('#locationId').value=x.id;$('#formTitle').textContent='ویرایش موقعیت';$('#saveBtn').textContent='ذخیره تغییرات';populateLevels(x.level);$('#level').disabled=true;populateParents(x.parentId||'');$('#officialName').value=x.officialName;$('#commonName').value=x.commonName;$('#sortOrder').value=x.sortOrder||0;window.scrollTo({top:0,behavior:'smooth'})}
$('#level').addEventListener('change',()=>populateParents());
$('#locationForm').addEventListener('submit',async e=>{e.preventDefault();try{await api.saveLocation({id:$('#locationId').value||null,level:$('#level').value,parentId:$('#parentId').value||null,officialName:$('#officialName').value,commonName:$('#commonName').value,sortOrder:$('#sortOrder').value});toast('موقعیت با موفقیت ذخیره شد.');resetForm();await refresh()}catch(err){toast(err.message||'ذخیره موقعیت انجام نشد.')}});
$('#locationList').addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]');if(edit){editLocation(edit.dataset.edit);return}const toggle=e.target.closest('[data-toggle]');if(toggle){try{await api.setLocationActive(toggle.dataset.toggle,toggle.dataset.active==='1');toast('وضعیت موقعیت تغییر کرد.');await refresh()}catch(err){toast(err.message||'تغییر وضعیت انجام نشد.')}}});
$('#resetBtn').onclick=resetForm;$('#refreshBtn').onclick=()=>refresh().catch(e=>toast(e.message));$('#search').oninput=renderList;$('#showInactive').onchange=renderList;$('#backBtn').onclick=()=>window.close();
(async()=>{try{levels=await api.locationLevelLabels();populateLevels();await refresh()}catch(err){toast(err.message||'دریافت فهرست موقعیت‌ها ناموفق بود.')}})();
