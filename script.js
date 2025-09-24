/* ===== Base ===== */
const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const uid = () => (self.crypto && crypto.randomUUID ? crypto.randomUUID()
              : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const state = {
  theme: localStorage.getItem('theme') || 'dark',
  logged: localStorage.getItem('logged') === '1',
  classes: [], teachers: [],
  ia: { threads: [], activeId: null },
  cal: { date: new Date() },
};
const LS_ATT='attendance', LS_NOTES='quick-notes';

function formatDatePT(d=new Date()){ return d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'}) }
function formatYMD(d){ return d.toISOString().slice(0,10) }
function monthLabel(d){ return d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) }
function randomRecentDate(){ const d=new Date(); d.setDate(d.getDate()-Math.floor(Math.random()*15)); return d.toLocaleDateString('pt-BR') }
function avgFromGrades(gs){ const s=gs.reduce((a,g)=>a+g.avg,0); return +(s/gs.length).toFixed(1) }
function statusFromAvg(a){ if(a>=7) return {text:"Aprovado",cls:"ok"}; if(a>=5) return {text:"Recuperação",cls:"warn"}; return {text:"Reprovado",cls:"bad"} }
function initials(n){ return n.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() }
function timeNow(){ return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) }
function botMsg(text){ return { who:'bot', text, at: timeNow() } }
function userMsg(text){ return { who:'me', text, at: timeNow() } }
function toast(msg){
  const d=document.createElement('div');
  d.textContent=msg;
  Object.assign(d.style,{position:'fixed',bottom:'70px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(90deg,#22d3ee,#3B82F6)',color:'#06121f',padding:'10px 14px',borderRadius:'12px',boxShadow:'0 12px 24px rgba(34,211,238,.35)',zIndex:9999,fontWeight:'600'});
  document.body.appendChild(d); setTimeout(()=>d.remove(),1600);
}
function escapeHtml(s=''){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])) }
function formatBytes(b){ if(b===0) return '0 B'; const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i] }
function fakeIaReply(t){
  const a=[x=>`Entendi: “${x}”. Posso sugerir um plano de estudos?`,x=>`Para “${x}”, pratique 5 exercícios e revise a teoria.`,x=>`Anotei sua dúvida sobre “${x}”. Quer um resumo ou um quiz?`,x=>`Sobre “${x}”, posso preparar flashcards agora.`];
  return a[Math.floor(Math.random()*a.length)](t);
}

/* Tema/Topo/Login */
function applyTheme(){
  document.body?.classList.toggle('theme-light', state.theme==='light');
  document.body?.classList.toggle('theme-dark', state.theme==='dark');
  const t=$('#themeToggle'); if(t) t.textContent=`Tema: ${state.theme==='dark'?'Escuro':'Claro'}`;
}
$('#themeToggle')?.addEventListener('click',()=>{
  state.theme=state.theme==='dark'?'light':'dark';
  localStorage.setItem('theme',state.theme);
  applyTheme();
});
function initHeader(){ const d=$('#dateDisplay'); if(d) d.textContent = formatDatePT(new Date()) }

const loginModal=$('#loginModal');
$('#loginBtn')?.addEventListener('click',()=>loginModal?.showModal());
$('#skipLogin')?.addEventListener('click',()=>{ state.logged=true; localStorage.setItem('logged','1'); loginModal?.close(); });
$('#doLogin')?.addEventListener('click',(e)=>{ e.preventDefault(); state.logged=true; localStorage.setItem('logged','1'); loginModal?.close(); });

/* Partículas */
function initParticles(){
  const host = $('#bubbles'); if(!host) return;
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  host.innerHTML=''; host.appendChild(c);
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W=0,H=0, P=[];
  function resize(){ W=host.clientWidth; H=host.clientHeight; c.width=W*dpr; c.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); spawn(); }
  function spawn(){
    const n = Math.floor(Math.min(120, W*H/18000));
    P = Array.from({length:n},()=>({x:Math.random()*W,y:H+Math.random()*H*.2,r:Math.random()*3+1.5,vy:-(Math.random()*.7+.4),vx:(Math.random()-.5)*.2,a:Math.random()*.6+.3}));
  }
  function step(){
    ctx.clearRect(0,0,W,H);
    for(const p of P){
      p.x+=p.vx; p.y+=p.vy;
      if(p.y<-20 || p.x<-20 || p.x>W+20){ p.x=Math.random()*W; p.y=H+10; p.vy=-(Math.random()*.7+.4); }
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);
      g.addColorStop(0,`rgba(255,255,255,${0.6*p.a})`);
      g.addColorStop(.4,`rgba(190,234,255,${0.35*p.a})`);
      g.addColorStop(.8,`rgba(94,234,212,${0.15*p.a})`);
      g.addColorStop(1,`rgba(255,255,255,0)`);
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(step);
  }
  resize(); step(); addEventListener('resize',resize);
}

/* Seed */
function seedData(){
  const subjects=["Matemática","Português","História","Ciências","Inglês","Artes"];
  const makeStudent=(nome,id)=>{
    const g=subjects.map(s=>{const n1=+(Math.random()*4+4).toFixed(1); const n2=+(Math.random()*4+4).toFixed(1); return {subject:s,n1,n2,avg:+((n1+n2)/2).toFixed(1)}});
    return { id, nome, grades:g, attendance:Math.floor(Math.random()*16)+80, lastSeen:randomRecentDate() };
  };
  const makeClass=(nome,serie,turno,q)=>({ id:uid(), nome, serie, turno, students:Array.from({length:q},(_,i)=>makeStudent(fakeName(),i+1)) });
  function fakeName(){ const fn=["Lucas","Marina","João","Isabela","Thiago","Luana","Pedro","Bianca","Rafaela","Henrique","Gabriela","Matheus","Sofia","Felipe","Camila","Caio","Larissa","Eduardo","Júlia","Otávio","Vitória","André","Bruna","Daniel"]; const ln=["Almeida","Silva","Souza","Oliveira","Costa","Santos","Pereira","Rodrigues","Gomes","Martins","Barbosa","Lima","Carvalho","Melo","Rocha"]; return fn[Math.floor(Math.random()*fn.length)]+" "+ln[Math.floor(Math.random()*ln.length)] }
  state.classes=[ makeClass("1ºA","1º ano","Manhã",18), makeClass("1ºB","1º ano","Tarde",22), makeClass("2ºA","2º ano","Manhã",20), makeClass("3ºA","3º ano","Integral",16) ];
  const profs=[["Ana Souza","Matemática"],["Bruno Lima","Português"],["Carla Nogueira","História"],["Diego Martins","Ciências"],["Elisa Prado","Inglês"],["Fábio Azevedo","Artes"]];
  state.teachers = profs.map(([n,m])=>({ id:uid(), nome:n, materia:m }));
  const firstId=uid();
  state.ia.threads=[{ id:firstId, title:"Dúvidas gerais", messages:[botMsg("Olá! Sou a LousaAI. Como posso ajudar?")] }];
  state.ia.activeId=firstId;
}

/* Home */
function initHome(){
  $('#seeEvent')?.addEventListener('click',()=>{
    const el=$('#infoBody'); if(!el) return;
    el.innerHTML=`<p><strong>Reunião pedagógica</strong></p>
      <p><strong>Hoje</strong> às 15:00, na <em>Sala multimídia</em>.</p>
      <p>Pauta: alinhamentos, calendário avaliativo e projetos.</p>
      <p>Participantes: direção e todos os professores.</p>`;
    $('#infoModal')?.showModal();
  });
  $('#addReminder')?.addEventListener('click',()=>{
    const list=JSON.parse(localStorage.getItem('reminders')||'[]');
    const t=$('#eventTitle')?.textContent||'Evento';
    list.push({title:t,at:new Date().toISOString()});
    localStorage.setItem('reminders',JSON.stringify(list));
    toast('Lembrete adicionado!');
  });
  // checklist
  const todoList=$('#todoList'); if(todoList){
    const key='quick-checklist'; let todos=JSON.parse(localStorage.getItem(key)||'[]');
    function save(){ localStorage.setItem(key, JSON.stringify(todos)) }
    function render(){
      todoList.innerHTML='';
      todos.forEach((t,i)=>{
        const li=document.createElement('li');
        li.innerHTML=`<input type="checkbox" ${t.done?'checked':''}><span class="full-w">${escapeHtml(t.text)}</span><button class="icon-btn" title="Remover">🗑</button>`;
        const [chk,,del]=li.children;
        chk.addEventListener('change',()=>{ t.done=chk.checked; save(); render(); });
        del.addEventListener('click',()=>{ todos.splice(i,1); save(); render(); });
        if(t.done) li.classList.add('done');
        todoList.appendChild(li);
      });
    }
    $('#addTodo')?.addEventListener('click',()=>{
      const v=$('#todoInput')?.value?.trim(); if(!v) return;
      $('#todoInput').value=''; todos.push({text:v,done:false}); save(); render();
    });
    render();
  }
  // notas
  const notes=$('#quickNotes');
  if(notes){
    notes.value=localStorage.getItem(LS_NOTES)||'';
    notes.addEventListener('input',()=>localStorage.setItem(LS_NOTES,notes.value));
    $('#saveNotes')?.addEventListener('click',()=>{ localStorage.setItem(LS_NOTES,notes.value); toast('Notas salvas'); });
    $('#clearNotes')?.addEventListener('click',()=>{ notes.value=''; localStorage.removeItem(LS_NOTES); toast('Notas excluídas'); });
  }
  // presença
  if(state.classes.length){
    const pending=state.classes.filter(c=>c.students.length%2===0);
    const info=$('#presenceInfo'); if(info) info.textContent=`${pending.length} turmas aguardando lançamento.`;
    const wrap=$('#presenceClasses');
    if(wrap){ wrap.innerHTML=''; state.classes.forEach(c=>{ const el=document.createElement('span'); el.className='tag'; el.textContent=`${c.nome} • ${c.students.length} alunos`; wrap.appendChild(el); }); }
  }
  buildCalendar();
  $('#calPrev')?.addEventListener('click',()=>{ state.cal.date.setMonth(state.cal.date.getMonth()-1); buildCalendar(); });
  $('#calNext')?.addEventListener('click',()=>{ state.cal.date.setMonth(state.cal.date.getMonth()+1); buildCalendar(); });
  $('#presenceToday')?.addEventListener('click',()=>{ state.cal.date = new Date(); buildCalendar(); });
  initStagger();
}

/* Calendário / Presenças */
function getAttendance(){ return JSON.parse(localStorage.getItem(LS_ATT)||'{}') }
function setAttendance(map){ localStorage.setItem(LS_ATT, JSON.stringify(map)) }
function buildCalendar(){
  const calendar=$('#calendar'); if(!calendar) return;
  const d=new Date(state.cal.date.getFullYear(), state.cal.date.getMonth(), 1);
  const label=$('#calLabel'); if(label) label.textContent = monthLabel(d);
  calendar.innerHTML='';
  const dow=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  dow.forEach(n=>{ const h=document.createElement('div'); h.className='cal-dow'; h.textContent=n; calendar.appendChild(h); });
  const firstDay=d.getDay(); const daysInMonth=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  for(let i=0;i<firstDay;i++){ const v=document.createElement('div'); v.className='cal-day'; v.style.visibility='hidden'; calendar.appendChild(v); }
  const att=getAttendance(); const todayYMD=formatYMD(new Date());
  for(let day=1; day<=daysInMonth; day++){
    const date=new Date(d.getFullYear(), d.getMonth(), day);
    const ymd=formatYMD(date);
    const cell=document.createElement('div'); cell.className='cal-day';
    if(ymd===todayYMD) cell.classList.add('today');
    if(att[ymd]) cell.classList.add('has-att');
    cell.innerHTML=`<div class="num">${day}</div>`;
    cell.addEventListener('click',()=>openAttendanceModal(date));
    calendar.appendChild(cell);
  }
}
const attModal=$('#attendanceModal');
const attSelect=$('#attClass');
const attList=$('#attList');
const attSummary=$('#attSummary');

function openAttendanceModal(date){
  $('#attDateLabel') && ($('#attDateLabel').textContent = `Presenças — ${date.toLocaleDateString('pt-BR')}`);
  attModal?.showModal();
  if(!attSelect||!attList) return;
  attSelect.innerHTML='';
  state.classes.forEach(c=>{
    const o=document.createElement('option'); o.value=c.id; o.textContent=`${c.nome} — ${c.serie}`;
    attSelect.appendChild(o);
  });
  renderAttendanceEditor(date, attSelect.value);
  attSelect.onchange=()=>renderAttendanceEditor(date, attSelect.value);
  $('#attMarkAll').onclick=()=>{ $$('input[type="checkbox"]',attList).forEach(ch=>ch.checked=true); updateAttSummary(); };
  $('#attClearAll').onclick=()=>{ $$('input[type="checkbox"]',attList).forEach(ch=>ch.checked=false); updateAttSummary(); };
  $('#attCancel').onclick=()=>attModal?.close();
  $('#attSave').onclick=(e)=>{
    e.preventDefault();
    const map=getAttendance();
    const ymd=formatYMD(date);
    const cls=attSelect.value;
    const presentIds=$$('input[type="checkbox"]',attList).filter(ch=>ch.checked).map(ch=>+ch.dataset.sid);
    if(!map[ymd]) map[ymd]={};
    map[ymd][cls]={present:presentIds};
    setAttendance(map);
    buildCalendar();
    toast('Presença salva');
    attModal?.close();
  };
}
function renderAttendanceEditor(date,classId){
  const ymd=formatYMD(date);
  const cls=state.classes.find(c=>c.id===classId);
  if(!cls) return;
  const map=getAttendance();
  const present=new Set((map[ymd]&&map[ymd][classId]?.present)||[]);
  attList.innerHTML='';
  cls.students.forEach(st=>{
    const li=document.createElement('li');
    li.innerHTML=`<input type="checkbox" ${present.has(st.id)?'checked':''} data-sid="${st.id}"> <span class="full-w">${escapeHtml(st.nome)}</span><span class="muted tiny">(${st.id})</span>`;
    $('input',li).addEventListener('change',updateAttSummary);
    attList.appendChild(li);
  });
  updateAttSummary();
}
function updateAttSummary(){
  if(!attSummary) return;
  const total=$$('input[type="checkbox"]',attList).length;
  const pres=$$('input[type="checkbox"]',attList).filter(ch=>ch.checked).length;
  attSummary.textContent = `Presentes: ${pres} • Faltas: ${total-pres}`;
}

/* Turmas */
let currentClass=null;
function renderClassList(){
  const list=$('#classList'); if(!list) return;
  const q=($('#classSearch')?.value||'').toLowerCase();
  list.innerHTML='';
  state.classes
    .filter(c=>c.nome.toLowerCase().includes(q)||c.serie.toLowerCase().includes(q))
    .forEach(c=>{
      const li=document.createElement('li'); const btn=document.createElement('button');
      btn.textContent=`${c.nome} — ${c.serie} (${c.turno})`;
      btn.addEventListener('click',()=>openClass(c.id,btn));
      li.appendChild(btn); list.appendChild(li);
    });
}
$('#classSearch')?.addEventListener('input',renderClassList);

function openClass(classId,btn){
  currentClass=state.classes.find(c=>c.id===classId);
  $$('#classList button').forEach(b=>b.classList.remove('active')); btn?.classList.add('active');
  $('#classEmpty')?.classList.add('hidden'); $('#classDetails')?.classList.remove('hidden');
  $('#classTitle') && ($('#classTitle').textContent=`${currentClass.nome} — ${currentClass.serie}`);
  $('#classInfo') && ($('#classInfo').textContent=`${currentClass.turno} • ${currentClass.students.length} alunos`);
  const ul=$('#studentList'); if(!ul) return; ul.innerHTML='';
  currentClass.students.forEach(st=>{
    const li=document.createElement('li'); li.className='card-mini';
    li.innerHTML=`<div class="avatar">${initials(st.nome)}</div>
      <div class="full-w"><div class="name">${st.nome}</div><div class="muted tiny">Última presença: ${st.lastSeen}</div></div>
      <button class="icon-btn" title="Abrir boletim">↗</button>`;
    li.addEventListener('click',()=>openStudent(st));
    ul.appendChild(li);
  });
}
const studentModal=$('#studentModal');
function openStudent(st){
  $('#studentName') && ($('#studentName').textContent=st.nome);
  $('#studentMeta') && ($('#studentMeta').innerHTML=`Frequência: <strong>${st.attendance}%</strong>`);
  const tbody=$('#gradesTable tbody'); if(tbody){ tbody.innerHTML=''; st.grades.forEach(g=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${g.subject}</td><td>${g.n1}</td><td>${g.n2}</td><td>${g.avg}</td>`; tbody.appendChild(tr); }); }
  const geral=avgFromGrades(st.grades); const s=statusFromAvg(geral);
  const stStatus=$('#studentStatus'); if(stStatus){ stStatus.textContent=s.text; stStatus.className=`status ${s.cls}`; }
  $('#studentAvg') && ($('#studentAvg').textContent=geral);
  studentModal?.showModal();
}

/* Classroom */
let activeTeacher=null; const teacherStoreKey='teacher-chats';
function renderTeacherList(){
  const list=$('#teacherList'); if(!list) return;
  const q=($('#teacherSearch')?.value||'').toLowerCase();
  list.innerHTML='';
  state.teachers
    .filter(t=>t.nome.toLowerCase().includes(q)||t.materia.toLowerCase().includes(q))
    .forEach(t=>{
      const li=document.createElement('li'); const btn=document.createElement('button');
      btn.textContent=`${t.nome} — ${t.materia}`;
      btn.addEventListener('click',()=>openTeacherChat(t,btn));
      li.appendChild(btn); list.appendChild(li);
    });
}
$('#teacherSearch')?.addEventListener('input',renderTeacherList);

function openTeacherChat(t,btn){
  activeTeacher=t; $$('#teacherList button').forEach(b=>b.classList.remove('active')); btn?.classList.add('active');
  $('#teacherEmpty')?.classList.add('hidden'); $('#teacherChat')?.classList.remove('hidden');
  $('#teacherName') && ($('#teacherName').textContent=t.nome);
  $('#teacherSubject') && ($('#teacherSubject').textContent=t.materia);
  $('#teacherAvatar') && ($('#teacherAvatar').textContent=initials(t.nome));
  renderTeacherMessages();
}
function getTeacherThread(){ const map=JSON.parse(localStorage.getItem(teacherStoreKey)||'{}'); if(!map[activeTeacher.id]) map[activeTeacher.id]=[]; return map }
function saveTeacherThread(m){ localStorage.setItem(teacherStoreKey, JSON.stringify(m)) }
function renderTeacherMessages(){
  const box=$('#teacherMessages'); if(!box || !activeTeacher) return; box.innerHTML='';
  const map=getTeacherThread();
  (map[activeTeacher.id]||[]).forEach(m=>{
    const d=document.createElement('div'); d.className=`msg ${m.who==='me'?'me':''}`;
    d.innerHTML=`<div>${escapeHtml(m.text) || (m.fileName?`📎 ${m.fileName} (${m.fileSize})`:'')}</div>${m.fileName?`<div class="attachment">📎 <span>${m.fileName}</span> <span class="muted">${m.fileSize}</span></div>`:''}<div class="meta">${m.at}</div>`;
    box.appendChild(d);
  });
  box.scrollTop=box.scrollHeight;
}
$('#teacherSend')?.addEventListener('click',()=>{
  if(!activeTeacher) return;
  const text=$('#teacherText')?.value?.trim()||''; const files=$('#teacherFile')?.files||[];
  if(!text && files.length===0) return;
  const map=getTeacherThread(); const arr=map[activeTeacher.id]||[];
  if(text) arr.push(userMsg(text));
  if(files.length){ [...files].forEach(f=> arr.push({who:'me',text:'',at:timeNow(),fileName:f.name,fileSize:formatBytes(f.size)})); $('#teacherFile').value=''; }
  map[activeTeacher.id]=arr; saveTeacherThread(map);
  const inp=$('#teacherText'); if(inp) inp.value='';
  renderTeacherMessages();
  setTimeout(()=>{
    const resp=botMsg("Recebido! Vamos conversar sobre isso na próxima aula?");
    const m=getTeacherThread(); m[activeTeacher.id].push(resp); saveTeacherThread(m); renderTeacherMessages();
  },600);
});

/* Chat IA */
const iaKey='ia-threads';
function loadIa(){
  const saved=JSON.parse(localStorage.getItem(iaKey)||'null');
  if(saved && saved.threads?.length){ state.ia=saved; } else { saveIa(); }
  renderIaThreads();
  if(state.ia.activeId) openIa(state.ia.activeId);
}
function saveIa(){ localStorage.setItem(iaKey, JSON.stringify(state.ia)) }
function renderIaThreads(){
  const list=$('#iaThreadList'); if(!list) return; list.innerHTML='';
  state.ia.threads.forEach(th=>{
    const li=document.createElement('li'); li.className='row';
    const btn=document.createElement('button'); btn.textContent=th.title; btn.className=(th.id===state.ia.activeId)?'active':''; btn.addEventListener('click',()=>openIa(th.id));
    const del=document.createElement('button'); del.className='trash'; del.title='Excluir chat'; del.textContent='🗑';
    del.addEventListener('click',(e)=>{ e.stopPropagation(); deleteThread(th.id); });
    li.append(btn, del);
    list.appendChild(li);
  });
}
function deleteThread(id){
  const idx=state.ia.threads.findIndex(t=>t.id===id);
  if(idx<0) return;
  state.ia.threads.splice(idx,1);
  if(state.ia.activeId===id){ state.ia.activeId = state.ia.threads[0]?.id || null; }
  saveIa(); renderIaThreads();
  if(state.ia.activeId) openIa(state.ia.activeId); else { $('#iaChat')?.classList.add('hidden'); $('#iaEmpty')?.classList.remove('hidden'); }
}
function openIa(id){
  state.ia.activeId=id; saveIa(); renderIaThreads();
  $('#iaEmpty')?.classList.add('hidden'); $('#iaChat')?.classList.remove('hidden');
  const th=state.ia.threads.find(t=>t.id===id);
  $('#iaTitle') && ($('#iaTitle').textContent=th.title);
  const box=$('#iaMessages'); if(!box) return; box.innerHTML='';
  th.messages.forEach(m=>{ const d=document.createElement('div'); d.className=`msg ${m.who==='me'?'me':''}`; d.innerHTML=`<div>${escapeHtml(m.text)}</div><div class="meta">${m.at}</div>`; box.appendChild(d); });
  box.scrollTop=box.scrollHeight;
}
$('#iaSend')?.addEventListener('click',()=>{
  const input=$('#iaText'); if(!input) return;
  const text=input.value.trim(); if(!text) return;
  const th=state.ia.threads.find(t=>t.id===state.ia.activeId);
  th.messages.push(userMsg(text)); input.value=''; openIa(th.id); saveIa();
  setTimeout(()=>{
    const reply=botMsg(fakeIaReply(text));
    const t2=state.ia.threads.find(t=>t.id===state.ia.activeId);
    t2.messages.push(reply); saveIa(); openIa(t2.id);
  },500);
});
const newChatModal=$('#newChatModal');
$('#newIaChat')?.addEventListener('click',()=>{ const i=$('#newChatName'); if(i) i.value=''; newChatModal?.showModal(); });
$('#cancelNewChat')?.addEventListener('click',()=> newChatModal?.close());
$('#confirmNewChat')?.addEventListener('click',(e)=>{
  e.preventDefault();
  const title=($('#newChatName')?.value?.trim()) || `Chat ${state.ia.threads.length+1}`;
  const id=uid();
  state.ia.threads.unshift({id,title,messages:[botMsg('Oi! Em que posso ajudar?')]});
  state.ia.activeId=id; saveIa(); renderIaThreads(); openIa(id); newChatModal?.close();
});

/* ===== Utils de dialog: fechar no ESC e clicar no backdrop ===== */
function wireDialog(dlg){
  if(!dlg) return;
  // fecha no ESC
  dlg.addEventListener('cancel', (e)=>{ e.preventDefault(); dlg.close(); });
  // fecha clicando fora da caixa .modal
  dlg.addEventListener('click', (e)=>{
    const box = dlg.querySelector('.modal');
    if(!box){ dlg.close(); return; }
    const r = box.getBoundingClientRect();
    const out = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if(out) dlg.close();
  });
}
// pluga todos os dialogs
[
  '#loginModal',
  '#infoModal',
  '#newChatModal',
  '#attendanceModal',
  '#studentModal'
].forEach(sel => wireDialog(document.querySelector(sel)));

/* Navegação + Flip 3D */
const order = ['homeView','turmasView','classroomView','chatIaView'];
function goTo(nextId){
  const current = $('.view.active');
  const next = $('#'+nextId);
  if(!next || current===next) return;

  const ci = order.indexOf(current?.id);
  const ni = order.indexOf(nextId);
  const dir = (ci>-1 && ni>-1 && ni>ci) ? 'right' : 'left';

  $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.target===nextId));

  next.classList.add('turn-enter', dir==='right'?'from-right':'from-left','active');
  current?.classList.add('turn-leave', dir==='right'?'to-left':'to-right');

  next.offsetWidth; // reflow

  const done=()=>{
    current?.classList.remove('active','turn-leave','to-left','to-right');
    next.classList.remove('turn-enter','from-right','from-left');
    next.removeEventListener('animationend',done);
    current?.removeEventListener('animationend',done);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  next.addEventListener('animationend',done,{once:true});
  current?.addEventListener('animationend',done,{once:true});
}
$$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>goTo(btn.dataset.target)));

let touchStart=null;
document.addEventListener('touchstart',(e)=>{ touchStart = e.touches[0]; }, {passive:true});
document.addEventListener('touchend',(e)=>{
  if(!touchStart) return;
  const dx = (e.changedTouches[0].clientX - touchStart.clientX);
  const dy = Math.abs(e.changedTouches[0].clientY - touchStart.clientY);
  if(Math.abs(dx) > 60 && dy < 40){
    const current=$('.view.active'); const idx=order.indexOf(current?.id); if(idx<0) return;
    const nextIdx = dx<0 ? Math.min(order.length-1, idx+1) : Math.max(0, idx-1);
    goTo(order[nextIdx]);
  }
  touchStart=null;
}, {passive:true});

/* Stagger */
function initStagger(){
  const roots = $$('[data-stagger]');
  if(!roots.length || !('IntersectionObserver' in window)){
    roots.forEach(r=>Array.from(r.children).forEach(el=>el.classList.add('reveal','in')));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const kids = Array.from(entry.target.children);
        kids.forEach((el,i)=>{
          el.classList.add('reveal');
          setTimeout(()=>el.classList.add('in'), i*70);
        });
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.15});
  roots.forEach(r=>io.observe(r));
}

/* Boot */
(function boot(){
  try{
    seedData(); initHeader(); applyTheme();
    initHome(); renderClassList(); renderTeacherList(); loadIa();
    initParticles();
    if(!state.logged && $('#loginModal')){ setTimeout(()=> $('#loginModal').showModal(),300); }
  }catch(err){
    console.error('[LousaAI boot error]', err);
    toast('Erro ao iniciar: veja o console (F12).');
  }
})();
