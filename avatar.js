// avatar.js — Avatar sistemi modülü (Ö40, 2026-08-06)
// index.html'teki ana <script> bloğundan ÖNCE yükleniyor,
// bu yüzden buradaki fonksiyonlar ana bloktan çağrılabilir.
// NOT: updateProfile/renderSettings/deleteProfile gibi genel profil/ayarlar
// fonksiyonları BİLEREK burada DEĞİL, index.html'de kaldı — avatar'a özgü değiller,
// sadece bu modüldeki fonksiyonları çağırıyorlar. loadDb() içindeki avatar yükleme
// parçası da aynı sebeple index.html'de kaldı (genel veri yükleme akışının parçası).

// ── AVATAR ────────────────────────────────────────────────────
function avatarHtml(av, size='2rem'){
  if(av&&av.startsWith('data:')){
    return `<img src="${av}" style="width:${size};height:${size};border-radius:50%;object-fit:cover;display:block;"/>`;
  }
  if(av&&av.startsWith('avatar_')){
    const url=`https://hggunay.github.io/project_ashbless/avatars/${av}`;
    return `<img src="${url}" style="width:${size};height:${size};border-radius:50%;object-fit:cover;display:block;"/>`;
  }
  return `<span style="font-size:${size};line-height:1">${av||'📚'}</span>`;
}
function setAvatarEl(el, av){
  if(!el) return;
  if(av&&(av.startsWith('data:')||av.startsWith('avatar_'))){
    const src=av.startsWith('data:')?av:`https://hggunay.github.io/project_ashbless/avatars/${av}`;
    el.innerHTML=`<img src="${src}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"/>`;
    el.style.fontSize='0';
  } else {
    el.innerHTML='';
    el.textContent=av||'📚';
    el.style.fontSize='';
  }
}
function handleAvatarUpload(input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=async()=>{
      const canvas=document.createElement('canvas');
      const size=120;
      canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext('2d');
      // Kare kırp
      const s=Math.min(img.width,img.height);
      const ox=(img.width-s)/2,oy=(img.height-s)/2;
      ctx.drawImage(img,ox,oy,s,s,0,0,size,size);
      const b64=canvas.toDataURL('image/jpeg',0.7);
      db.users[me].avatar=b64;
      // Avatar'ı ayrı node'a kaydet (büyük veri) — sonucunu kontrol et, sessizce yutma
      const uploadOk=await fbSet('aa-avatars/'+me, b64).catch(e=>false);
      saveDb();
      setAvatarEl(document.getElementById('settingsAvatar'),b64);
      setAvatarEl(document.getElementById('headerAvatar'),b64);
      const removeBtn=document.getElementById('removeAvatarBtn');
      if(removeBtn) removeBtn.style.display='';
      if(uploadOk) notify('📷 Fotoğraf Güncellendi','Profil fotoğrafın kaydedildi.');
      else notify('⚠️ Kaydetme Sorunu','Fotoğraf yüklenirken bir hata oldu, tekrar dener misin?');
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
  input.value='';
}
function removeAvatarPhoto(){
  const emoji=document.getElementById('settingAvatar')?.value.trim()||'📚';
  db.users[me].avatar=emoji;
  saveDb();
  setAvatarEl(document.getElementById('settingsAvatar'),emoji);
  setAvatarEl(document.getElementById('headerAvatar'),emoji);
  const removeBtn=document.getElementById('removeAvatarBtn');
  if(removeBtn) removeBtn.style.display='none';
  notify('✕ Fotoğraf Kaldırıldı','Avatar emoji\'ye döndürüldü.');
}
// ──────────────────────────────────────────────────────────────

function renderMapAvatarGrid(){
  const grid=document.getElementById('mapAvatarGrid');
  if(!grid) return;
  const current=(db.users[me]&&db.users[me].avatar)||null;
  const base='https://hggunay.github.io/project_ashbless/avatars/';
  let html='';
  for(let i=1;i<=36;i++){
    const name=`avatar_${String(i).padStart(2,'0')}.png`;
    const url=base+name;
    const selected=current===name;
    html+=`<div onclick="selectMapAvatar('${name}')" title="${name}" style="width:72px;height:72px;border:2px solid ${selected?'var(--gold)':'rgba(201,162,39,.25)'};border-radius:6px;cursor:pointer;background:${selected?'rgba(201,162,39,.15)':'rgba(201,162,39,.05)'};display:flex;align-items:center;justify-content:center;overflow:hidden;transition:all .15s">
      <img src="${url}" style="max-width:68px;max-height:68px;object-fit:contain" loading="lazy"/>
    </div>`;
  }
  grid.innerHTML=html;
}

function selectMapAvatar(name){
  if(!db.users[me]) return;
  db.users[me].avatar=name;
  saveDb();
  fbSet('aa-avatars/'+me, name).catch(e=>{});
  setAvatarEl(document.getElementById('settingsAvatar'),name);
  setAvatarEl(document.getElementById('headerAvatar'),name);
  renderMapAvatarGrid();
  notify('🖼️ Avatar','Yeni avatar seçildi.');
}

function clearMapAvatar(){
  if(!db.users[me]) return;
  const emoji=document.getElementById('settingAvatar')?.value.trim()||'📚';
  db.users[me].avatar=emoji;
  saveDb();
  setAvatarEl(document.getElementById('settingsAvatar'),emoji);
  setAvatarEl(document.getElementById('headerAvatar'),emoji);
  renderMapAvatarGrid();
  notify('🖼️ Avatar','Emoji avatara döndü.');
}

