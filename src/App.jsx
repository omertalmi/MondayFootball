import { useState, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_COLORS = {
  blue:   { bg: "#0e2a4a", mid: "#1a4a8a", accent: "#5bc8fa" },
  yellow: { bg: "#3a2e00", mid: "#c48a00", accent: "#ffd84d" },
  red:    { bg: "#3a0e0e", mid: "#9a1a1a", accent: "#ff6b6b" },
};
const TEAM_NAMES = ["blue","yellow","red"];
const TEAM_EMOJI = { blue:"🔵", yellow:"🟡", red:"🔴" };
const ROLE_ICONS  = { attack:"⚡", midfield:"🔄", defence:"🛡️" };
const ROLE_COLORS = { attack:"#ff8a80", midfield:"#82b1ff", defence:"#69db7c" };

const INITIAL_DB = [
  { id:1,  name:"Avi Cohen",     role:"attack",   grade:4.5, isMember:true  },
  { id:2,  name:"Barak Levi",    role:"defence",  grade:3.8, isMember:true  },
  { id:3,  name:"Chen Mizrahi",  role:"midfield", grade:4.2, isMember:true  },
  { id:4,  name:"Dan Shapiro",   role:"attack",   grade:3.5, isMember:false },
  { id:5,  name:"Elan Peretz",   role:"defence",  grade:4.0, isMember:true  },
  { id:6,  name:"Fadi Nasser",   role:"midfield", grade:3.2, isMember:false },
  { id:7,  name:"Guy Katz",      role:"attack",   grade:4.8, isMember:true  },
  { id:8,  name:"Haim Ofer",     role:"defence",  grade:3.6, isMember:true  },
  { id:9,  name:"Ido Ben-David", role:"midfield", grade:4.1, isMember:true  },
  { id:10, name:"Yoni Stern",    role:"attack",   grade:2.9, isMember:false },
  { id:11, name:"Kfir Gabay",    role:"defence",  grade:4.3, isMember:true  },
  { id:12, name:"Lior Dayan",    role:"midfield", grade:3.7, isMember:false },
  { id:13, name:"Matan Hadad",   role:"attack",   grade:4.0, isMember:true  },
  { id:14, name:"Nir Azulay",    role:"defence",  grade:3.3, isMember:false },
  { id:15, name:"Or Friedman",   role:"midfield", grade:4.6, isMember:true  },
  { id:16, name:"Pini Cohen",    role:"attack",   grade:3.1, isMember:false },
  { id:17, name:"Ron Biton",     role:"defence",  grade:4.4, isMember:true  },
  { id:18, name:"Shai Malka",    role:"midfield", grade:3.9, isMember:true  },
  { id:19, name:"Tal Ohayon",    role:"attack",   grade:3.6, isMember:false },
  { id:20, name:"Uri Katz",      role:"midfield", grade:3.4, isMember:false },
  { id:21, name:"Vered Shamir",  role:"defence",  grade:4.2, isMember:true  },
  { id:22, name:"Zohar Ben-Ami", role:"attack",   grade:3.8, isMember:false },
  { id:23, name:"Amit Peretz",   role:"midfield", grade:3.0, isMember:false },
  { id:24, name:"Dror Mizrahi",  role:"defence",  grade:4.1, isMember:true  },
];

// Seed history with 4 past games so stats tab is interesting from the start
function buildSeedHistory(db) {
  const games = [];
  const dateBase = new Date();
  for (let g = 4; g >= 1; g--) {
    const d = new Date(dateBase);
    d.setDate(d.getDate() - g * 7);
    const pool = db.slice().sort(() => Math.random() - 0.5).slice(0, 21);
    const teams = distributeToTeams(pool);
    const gkO = randomGKOrders(teams);
    const effGK = effectiveGK(teams, gkO);
    games.push({
      id: `hist-seed-${g}`,
      date: d.toISOString().slice(0,10),
      teams,
      gkOrders: gkO,
      effGK,
      firstGame: { a: TEAM_NAMES[g%3], b: TEAM_NAMES[(g+1)%3], wait: TEAM_NAMES[(g+2)%3] },
    });
  }
  return games;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function makeFiller(tk, i) {
  return { id:`filler-${tk}-${i}`, name:"Goalkeeper", role:"defence", grade:2.85, isFiller:true };
}
function sortByGrade(arr) { return [...arr].sort((a,b) => b.grade - a.grade); }

function fillAndSort(players, tk) {
  const real = players.filter(p => !p.isFiller);
  const needed = Math.max(0, 7 - real.length);
  const fillers = Array.from({length:needed},(_,i)=>makeFiller(tk,i));
  return sortByGrade([...real,...fillers]);
}

function distributeToTeams(players) {
  const real = players.filter(p=>!p.isFiller);
  const sorted = sortByGrade(real);
  const teams = {blue:[],yellow:[],red:[]};
  sorted.forEach((p,i) => {
    const round = Math.floor(i/3), pos = i%3;
    const idx = round%2===0 ? pos : 2-pos;
    teams[TEAM_NAMES[idx]].push({...p});
  });
  return {
    blue:   fillAndSort(teams.blue,  "blue"),
    yellow: fillAndSort(teams.yellow,"yellow"),
    red:    fillAndSort(teams.red,   "red"),
  };
}

function randomGKOrders(teams) {
  const result = {};
  TEAM_NAMES.forEach(tk => {
    const nums = [1,2,3,4,5,6,7];
    for (let i=nums.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]];}
    const orders = {};
    teams[tk].forEach((p,i) => { orders[p.id]=nums[i]; });
    result[tk]=orders;
  });
  return result;
}

function effectiveGK(teams, gkOrders) {
  const out={};
  TEAM_NAMES.forEach(tk=>{
    const hasFiller = teams[tk].some(p=>p.isFiller);
    out[tk]={};
    teams[tk].forEach(p=>{
      out[tk][p.id] = p.isFiller?"—": hasFiller?7:(gkOrders[tk]?.[p.id]??1);
    });
  });
  return out;
}

function teamScore(players) { return players.reduce((s,p)=>s+p.grade,0).toFixed(1); }

function parseCSV(text) {
  return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(line=>{
    const parts = line.split(/[,\t;]/);
    const name = parts[0]?.trim();
    const role = ["attack","midfield","defence"].includes(parts[1]?.trim().toLowerCase())
      ? parts[1].trim().toLowerCase() : "midfield";
    const grade = parseFloat(parts[2]);
    return name ? {name,role,grade:isNaN(grade)?3.0:Math.min(5,Math.max(1,grade))} : null;
  }).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  input: {
    background:"#ffffff0d",border:"1px solid #ffffff1a",borderRadius:7,
    padding:"7px 10px",color:"#fff",fontSize:12,outline:"none",
    width:"100%",boxSizing:"border-box",
  },
  select: {
    background:"#0d1b2a",border:"1px solid #ffffff1a",borderRadius:7,
    padding:"7px 8px",color:"#fff",fontSize:12,width:"100%",
  },
  btn:(color="#4fc3f7",bg="#1a3a6b")=>({
    background:bg,border:`1px solid ${color}44`,borderRadius:8,
    padding:"7px 14px",color,cursor:"pointer",fontSize:12,fontWeight:700,
  }),
  label:{ fontSize:10,color:"#ffffff44",marginBottom:4,letterSpacing:1 },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER FORM
// ─────────────────────────────────────────────────────────────────────────────

function PlayerForm({ initial, onSave, onCancel, title }) {
  const [form,setForm] = useState(initial || {name:"",role:"midfield",grade:3.5,isMember:false});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div style={{background:"#0d1b2a",border:"1px solid #ffffff14",borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontWeight:700,fontSize:13,color:"#5bc8fa",marginBottom:2}}>{title}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:3,minWidth:130}}>
          <div style={S.label}>NAME</div>
          <input style={S.input} value={form.name} placeholder="Full name" onChange={e=>set("name",e.target.value)}/>
        </div>
        <div style={{flex:2,minWidth:110}}>
          <div style={S.label}>ROLE</div>
          <select style={S.select} value={form.role} onChange={e=>set("role",e.target.value)}>
            <option value="attack">⚡ Attack</option>
            <option value="midfield">🔄 Midfield</option>
            <option value="defence">🛡️ Defence</option>
          </select>
        </div>
        <div style={{width:80}}>
          <div style={S.label}>GRADE 1–5</div>
          <input style={S.input} type="number" min="1" max="5" step="0.1"
            value={form.grade} onChange={e=>set("grade",parseFloat(e.target.value)||3)}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,paddingBottom:2}}>
          <button onClick={()=>set("isMember",!form.isMember)} style={{
            background:form.isMember?"#3a2e00":"#ffffff08",
            border:`1px solid ${form.isMember?"#ffd84d55":"#ffffff18"}`,
            borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:14,
            color:form.isMember?"#ffd84d":"#ffffff33",
          }} title="Toggle constant member">
            {form.isMember?"⭐":"☆"}
          </button>
          <span style={{fontSize:10,color:"#ffffff33"}}>Member</span>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={S.btn("#69db7c","#1a3a1a")} onClick={()=>form.name.trim()&&onSave(form)}>✓ Save</button>
        <button style={S.btn("#ffffff44","#ffffff08")} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE TAB
// ─────────────────────────────────────────────────────────────────────────────

function DatabaseTab({ db, setDb, attendance, setAttendance }) {
  const [adding,setAdding]       = useState(false);
  const [editing,setEditing]     = useState(null);
  const [search,setSearch]       = useState("");
  const [roleFilter,setRoleFilter] = useState("all");
  const [memberFilter,setMemberFilter] = useState("all"); // all | members | guests
  const [showImport,setShowImport] = useState(false);
  const [importText,setImportText] = useState("");
  const [importError,setImportError] = useState("");
  const fileRef = useRef();

  const filtered = db
    .filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p=>roleFilter==="all"||p.role===roleFilter)
    .filter(p=>memberFilter==="all"||(memberFilter==="members"?p.isMember:!p.isMember))
    .sort((a,b)=>{
      if(b.isMember!==a.isMember) return b.isMember?1:-1;
      return b.grade-a.grade;
    });

  const allFilteredIds = filtered.map(p=>p.id);
  const allChecked = allFilteredIds.length>0 && allFilteredIds.every(id=>attendance[id]);
  const someChecked = allFilteredIds.some(id=>attendance[id]);

  const toggleAll = () => {
    if(allChecked) {
      setAttendance(prev=>{const n={...prev};allFilteredIds.forEach(id=>delete n[id]);return n;});
    } else {
      setAttendance(prev=>{const n={...prev};allFilteredIds.forEach(id=>{n[id]=true;});return n;});
    }
  };

  const toggleMember = (id) => setDb(prev=>prev.map(p=>p.id===id?{...p,isMember:!p.isMember}:p));
  const toggleAttendance = (id) => setAttendance(prev=>({...prev,[id]:!prev[id]}));
  const removePlayer = (id) => {
    setDb(prev=>prev.filter(p=>p.id!==id));
    setAttendance(prev=>{const n={...prev};delete n[id];return n;});
  };
  const addPlayer = (form) => {
    setDb(prev=>[...prev,{...form,id:Date.now(),grade:parseFloat(form.grade)}]);
    setAdding(false);
  };
  const saveEdit = (form) => {
    setDb(prev=>prev.map(p=>p.id===editing?{...p,...form,grade:parseFloat(form.grade)}:p));
    setEditing(null);
  };
  const doImport = () => {
    const parsed = parseCSV(importText);
    if(!parsed.length){setImportError("No valid rows. Format: Name, role, grade");return;}
    setDb(prev=>[...prev,...parsed.map(p=>({...p,id:Date.now()+Math.random(),isMember:false}))]);
    setImportText("");setShowImport(false);setImportError("");
  };

  const attendingCount = db.filter(p=>attendance[p.id]).length;
  const membersCount   = db.filter(p=>p.isMember).length;

  return (
    <div>
      {/* top bar */}
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        <input style={{...S.input,width:170}} placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={{...S.select,width:120}} value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          <option value="attack">⚡ Attack</option>
          <option value="midfield">🔄 Midfield</option>
          <option value="defence">🛡️ Defence</option>
        </select>
        <select style={{...S.select,width:120}} value={memberFilter} onChange={e=>setMemberFilter(e.target.value)}>
          <option value="all">All players</option>
          <option value="members">⭐ Members</option>
          <option value="guests">Guests</option>
        </select>
        <div style={{flex:1}}/>
        <div style={{fontSize:11,color:"#ffffff33"}}>
          <span style={{color:"#ffd84d88"}}>⭐ {membersCount}</span>
          {" · "}{attendingCount} attending / {db.length} total
        </div>
        <button style={S.btn("#b39ddb","#2d1a6b")} onClick={()=>setShowImport(v=>!v)}>📥 Import</button>
        <button style={S.btn("#69db7c","#1a3a1a")} onClick={()=>{setAdding(true);setEditing(null);}}>+ Add</button>
      </div>

      {adding && <div style={{marginBottom:12}}><PlayerForm title="Add New Player" onSave={addPlayer} onCancel={()=>setAdding(false)}/></div>}

      {showImport && (
        <div style={{background:"#0d1b2a",border:"1px solid #b39ddb33",borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:12,color:"#b39ddb",marginBottom:8}}>📥 Import CSV / Excel</div>
          <div style={{fontSize:10,color:"#ffffff33",marginBottom:8}}>
            Format per line: <code style={{color:"#b39ddb"}}>Name, role, grade</code> — e.g. <code style={{color:"#ffffff44"}}>John Smith, attack, 4.2</code>
          </div>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)}
            placeholder={"Avi Cohen, attack, 4.5\nBarak Levi, defence, 3.8"}
            style={{...S.input,height:90,resize:"vertical",fontFamily:"monospace",fontSize:11}}/>
          {importError && <div style={{color:"#ff8a80",fontSize:11,marginTop:4}}>⚠️ {importError}</div>}
          <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
            <button style={S.btn("#b39ddb","#2d1a6b")} onClick={doImport}>
              Import {importText?`(${parseCSV(importText).length} rows)`:""}
            </button>
            <button style={S.btn("#ffffff44","#ffffff08")} onClick={()=>fileRef.current?.click()}>📁 File</button>
            <button style={S.btn("#ffffff33","#ffffff06")} onClick={()=>{setShowImport(false);setImportError("");}}>Cancel</button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{display:"none"}}
              onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setImportText(ev.target.result);r.readAsText(f);e.target.value="";}}/>
          </div>
        </div>
      )}

      {/* Select all bar */}
      {filtered.length > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"6px 10px",background:"#ffffff06",borderRadius:8,border:"1px solid #ffffff0a"}}>
          <button onClick={toggleAll} style={{
            width:22,height:22,borderRadius:5,flexShrink:0,cursor:"pointer",
            background: allChecked?"#69db7c": someChecked?"#69db7c44":"#ffffff11",
            border:`1.5px solid ${allChecked||someChecked?"#69db7c":"#ffffff22"}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,color:allChecked?"#0a1a0a":"#ffffff44",fontWeight:800,
          }}>{allChecked?"✓":someChecked?"–":""}</button>
          <span style={{fontSize:11,color:"#ffffff44"}}>
            {allChecked?"Deselect all":"Select all"} ({filtered.length} shown)
          </span>
          {someChecked && !allChecked && (
            <span style={{fontSize:10,color:"#ffffff22",marginLeft:4}}>
              {allFilteredIds.filter(id=>attendance[id]).length} selected
            </span>
          )}
        </div>
      )}

      {/* Player list */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(285px,1fr))",gap:5}}>
        {filtered.map(p=>(
          <div key={p.id}>
            {editing===p.id ? (
              <PlayerForm title={`Edit — ${p.name}`} initial={p} onSave={saveEdit} onCancel={()=>setEditing(null)}/>
            ):(
              <div style={{
                background:attendance[p.id]?"#0d2a18":"#ffffff05",
                border:`1px solid ${attendance[p.id]?"#69db7c33":"#ffffff0e"}`,
                borderRadius:10,padding:"9px 11px",
                display:"flex",alignItems:"center",gap:9,transition:"all .2s",
              }}>
                {/* Attendance checkbox */}
                <button onClick={()=>toggleAttendance(p.id)} style={{
                  width:24,height:24,borderRadius:"50%",flexShrink:0,cursor:"pointer",
                  background:attendance[p.id]?"#69db7c":"#ffffff0e",
                  border:`2px solid ${attendance[p.id]?"#69db7c":"#ffffff1a"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,color:attendance[p.id]?"#071a0e":"#ffffff33",fontWeight:800,
                }}>{attendance[p.id]?"✓":""}</button>

                {/* Star member */}
                <button onClick={()=>toggleMember(p.id)} title="Toggle constant member" style={{
                  background:"transparent",border:"none",cursor:"pointer",
                  fontSize:15,padding:0,lineHeight:1,flexShrink:0,
                  color:p.isMember?"#ffd84d":"#ffffff22",
                  textShadow:p.isMember?"0 0 8px #ffd84d88":"none",
                  transition:"all .2s",
                }}>{p.isMember?"⭐":"☆"}</button>

                <span style={{fontSize:14}}>{ROLE_ICONS[p.role]}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{
                    fontWeight:600,fontSize:12,
                    color:attendance[p.id]?"#eee":"#ffffff77",
                    display:"flex",alignItems:"center",gap:5,
                  }}>
                    {p.name}
                    {p.isMember && <span style={{fontSize:9,color:"#ffd84d88",fontWeight:400}}>member</span>}
                  </div>
                  <div style={{fontSize:10,color:"#ffffff33",textTransform:"capitalize"}}>{p.role}</div>
                </div>
                <div style={{
                  fontSize:11,fontWeight:700,
                  color:ROLE_COLORS[p.role],
                  background:ROLE_COLORS[p.role]+"18",
                  border:`1px solid ${ROLE_COLORS[p.role]}33`,
                  borderRadius:6,padding:"2px 7px",
                }}>{p.grade}</div>
                <button onClick={()=>{setEditing(p.id);setAdding(false);}} style={{background:"transparent",border:"none",color:"#5bc8fa55",cursor:"pointer",fontSize:13,padding:"0 2px"}}>✏️</button>
                <button onClick={()=>removePlayer(p.id)} style={{background:"transparent",border:"none",color:"#ff6b6b55",cursor:"pointer",fontSize:15,padding:"0 2px",lineHeight:1}}>×</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {filtered.length===0 && <div style={{textAlign:"center",color:"#ffffff1a",padding:40,fontSize:13}}>No players found</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEXT GAME TAB
// ─────────────────────────────────────────────────────────────────────────────

function NextGameTab({ db, attendance, setAttendance, gameRoster, setGameRoster }) {
  const [adding,setAdding]   = useState(false);
  const [editing,setEditing] = useState(null);

  const syncFromDB = () => {
    setGameRoster(db.filter(p=>attendance[p.id]).map(p=>({...p})));
  };
  const addToRoster = (form) => {
    setGameRoster(prev=>[...prev,{...form,id:Date.now(),grade:parseFloat(form.grade),isManual:true}]);
    setAdding(false);
  };
  const saveEdit = (form) => {
    setGameRoster(prev=>prev.map(p=>p.id===editing?{...p,...form,grade:parseFloat(form.grade)}:p));
    setEditing(null);
  };
  const remove = (id) => {
    setGameRoster(prev=>prev.filter(p=>p.id!==id));
    setAttendance(prev=>{const n={...prev};delete n[id];return n;});
  };

  const dbAttending = db.filter(p=>attendance[p.id]).length;
  const sorted = sortByGrade(gameRoster);

  return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#5bc8fa"}}>Next Game Roster</div>
          <div style={{fontSize:10,color:"#ffffff33",marginTop:2}}>{gameRoster.length} players · {dbAttending} marked in DB</div>
        </div>
        <div style={{flex:1}}/>
        <button style={S.btn("#69db7c","#1a3a1a")} onClick={syncFromDB}>🔄 Sync from DB ({dbAttending})</button>
        <button style={S.btn("#5bc8fa","#0e2a4a")} onClick={()=>{setAdding(true);setEditing(null);}}>+ Add manually</button>
      </div>

      {adding && <div style={{marginBottom:12}}><PlayerForm title="Add to Roster" onSave={addToRoster} onCancel={()=>setAdding(false)}/></div>}

      {sorted.length===0 ? (
        <div style={{textAlign:"center",padding:48,color:"#ffffff1a",fontSize:13}}>
          <div style={{fontSize:32,marginBottom:8}}>📋</div>
          Mark attendance in DB then click Sync, or add manually.
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:5}}>
          {sorted.map(p=>(
            <div key={p.id}>
              {editing===p.id ? (
                <PlayerForm title={`Edit — ${p.name}`} initial={p} onSave={saveEdit} onCancel={()=>setEditing(null)}/>
              ):(
                <div style={{background:"#0d2a18",border:"1px solid #69db7c2a",borderRadius:10,padding:"9px 11px",display:"flex",alignItems:"center",gap:9}}>
                  {p.isMember && <span style={{fontSize:13,flexShrink:0,color:"#ffd84d",textShadow:"0 0 6px #ffd84d55"}}>⭐</span>}
                  <span style={{fontSize:14}}>{ROLE_ICONS[p.role]}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:12,color:"#eee"}}>{p.name}</div>
                    <div style={{fontSize:10,color:"#ffffff33",textTransform:"capitalize"}}>{p.role}{p.isManual?" · manual":""}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:ROLE_COLORS[p.role],background:ROLE_COLORS[p.role]+"18",border:`1px solid ${ROLE_COLORS[p.role]}33`,borderRadius:6,padding:"2px 7px"}}>{p.grade}</div>
                  <button onClick={()=>{setEditing(p.id);setAdding(false);}} style={{background:"transparent",border:"none",color:"#5bc8fa55",cursor:"pointer",fontSize:13,padding:"0 2px"}}>✏️</button>
                  <button onClick={()=>remove(p.id)} style={{background:"transparent",border:"none",color:"#ff6b6b55",cursor:"pointer",fontSize:15,padding:"0 2px",lineHeight:1}}>×</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sorted.length>0 && (
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          {["attack","midfield","defence"].map(role=>{
            const count=sorted.filter(p=>p.role===role).length;
            return <div key={role} style={{background:ROLE_COLORS[role]+"18",border:`1px solid ${ROLE_COLORS[role]}33`,borderRadius:20,padding:"4px 12px",fontSize:11,color:ROLE_COLORS[role]}}>{ROLE_ICONS[role]} {role}: {count}</div>;
          })}
          <div style={{marginLeft:"auto",fontSize:11,color:"#ffffff33",padding:"4px 0"}}>Total: {sorted.length}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW BANNER
// ─────────────────────────────────────────────────────────────────────────────

function DrawBanner({ result, onClear }) {
  if(!result) return null;
  const Ca=TEAM_COLORS[result.a], Cb=TEAM_COLORS[result.b], Cw=TEAM_COLORS[result.wait];
  return (
    <div style={{background:"linear-gradient(90deg,#0a0d18,#1a1a3a,#0a0d18)",border:"1px solid #b39ddb44",borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
      <div style={{fontSize:13,fontWeight:800,color:"#b39ddb",letterSpacing:2}}>🎲 FIRST GAME</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:Ca.bg,border:`2px solid ${Ca.accent}`,borderRadius:8,padding:"4px 13px",fontWeight:800,fontSize:13,color:Ca.accent,textTransform:"uppercase",letterSpacing:1}}>{TEAM_EMOJI[result.a]} {result.a}</span>
        <span style={{fontSize:13,fontWeight:800,color:"#ffffff44"}}>VS</span>
        <span style={{background:Cb.bg,border:`2px solid ${Cb.accent}`,borderRadius:8,padding:"4px 13px",fontWeight:800,fontSize:13,color:Cb.accent,textTransform:"uppercase",letterSpacing:1}}>{TEAM_EMOJI[result.b]} {result.b}</span>
      </div>
      <div style={{fontSize:11,color:"#ffffff33"}}>⏳ <span style={{color:Cw.accent,fontWeight:700,textTransform:"uppercase"}}>{result.wait}</span> waits</div>
      <div style={{flex:1}}/>
      <button onClick={onClear} style={{background:"transparent",border:"none",color:"#ffffff22",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER CARD (teams tab)
// ─────────────────────────────────────────────────────────────────────────────

function PlayerCard({ player, teamKey, dragging, onDragStart, onDrop, gkVal, hideGrades }) {
  const C = TEAM_COLORS[teamKey];
  return (
    <div
      draggable={!player.isFiller}
      onDragStart={()=>!player.isFiller&&onDragStart(player)}
      onDragOver={e=>e.preventDefault()}
      onDrop={()=>onDrop(player)}
      style={{
        background: dragging?.id===player.id?"#ffffff18":player.isFiller?"#ffffff06":`${C.bg}ee`,
        border:`1px solid ${player.isFiller?"#ffffff10":C.accent+"2a"}`,
        borderRadius:8,padding:"5px 9px",
        display:"flex",alignItems:"center",gap:6,
        cursor:player.isFiller?"default":"grab",
        opacity: dragging?.id===player.id?0.4:player.isFiller?0.5:1,
        userSelect:"none",transition:"opacity .15s",
      }}
    >
      {player.isMember&&!player.isFiller && <span style={{fontSize:11,color:"#ffd84d",flexShrink:0}}>⭐</span>}
      <span style={{fontSize:12}}>{player.isFiller?"🥅":ROLE_ICONS[player.role]}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:600,color:player.isFiller?"#ffffff2a":"#eee",fontStyle:player.isFiller?"italic":"normal",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{player.name}</div>
      </div>
      <div style={{background:player.isFiller?"#ffffff08":C.mid+"77",border:`1px solid ${player.isFiller?"#ffffff10":C.accent+"33"}`,borderRadius:5,padding:"1px 5px",fontSize:9,fontWeight:700,color:player.isFiller?"#ffffff1a":C.accent}}>
        {gkVal==="—"?"GK=—":`GK=${gkVal}`}
      </div>
      {!hideGrades&&(
        <div style={{fontSize:10,fontWeight:700,color:player.isFiller?"#ffffff1a":C.accent,background:player.isFiller?"#ffffff06":C.accent+"18",border:`1px solid ${player.isFiller?"#ffffff10":C.accent+"33"}`,borderRadius:5,padding:"1px 6px"}}>
          {player.grade}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS TAB
// ─────────────────────────────────────────────────────────────────────────────

function TeamsTab({ teams, setTeams, gkOrders, setGkOrders, hideGrades, drawResult, setDrawResult, onApprove }) {
  const [dragging,setDragging] = useState(null);
  const [fromTeam,setFromTeam] = useState(null);
  const [drawing,setDrawing]   = useState(false);

  const gkEff = effectiveGK(teams,gkOrders);

  const rebuildGK = (newTeams,affected) => {
    const ng={...gkOrders};
    affected.forEach(tk=>{
      const real=newTeams[tk].filter(p=>!p.isFiller);
      if(newTeams[tk].some(p=>p.isFiller)) return;
      const prev=ng[tk]||{};
      const usedNums=new Set(real.filter(p=>prev[p.id]).map(p=>prev[p.id]));
      const avail=[1,2,3,4,5,6,7].filter(n=>!usedNums.has(n));
      const orders={};
      real.forEach(p=>{orders[p.id]=prev[p.id]??avail.shift()??7;});
      ng[tk]=orders;
    });
    return ng;
  };

  const dropOnTeam = (toTeam) => {
    if(!dragging||fromTeam===toTeam){setDragging(null);return;}
    const nt={blue:[...teams.blue],yellow:[...teams.yellow],red:[...teams.red]};
    nt[fromTeam]=sortByGrade(nt[fromTeam].filter(p=>p.id!==dragging.id));
    nt[toTeam]=sortByGrade([...nt[toTeam].filter(p=>!p.isFiller),dragging]);
    const filled={blue:fillAndSort(nt.blue,"blue"),yellow:fillAndSort(nt.yellow,"yellow"),red:fillAndSort(nt.red,"red")};
    setTeams(filled);setGkOrders(rebuildGK(filled,[fromTeam,toTeam]));setDragging(null);
  };

  const dropOnPlayer = (targetPlayer,toTeam) => {
    if(!dragging||dragging.id===targetPlayer.id) return;
    if(fromTeam===toTeam){setDragging(null);return;}
    const nt={blue:[...teams.blue],yellow:[...teams.yellow],red:[...teams.red]};
    const fi=nt[fromTeam].findIndex(p=>p.id===dragging.id);
    const ti=nt[toTeam].findIndex(p=>p.id===targetPlayer.id);
    [nt[fromTeam][fi],nt[toTeam][ti]]=[nt[toTeam][ti],nt[fromTeam][fi]];
    nt[fromTeam]=sortByGrade(nt[fromTeam]);nt[toTeam]=sortByGrade(nt[toTeam]);
    const filled={blue:fillAndSort(nt.blue,"blue"),yellow:fillAndSort(nt.yellow,"yellow"),red:fillAndSort(nt.red,"red")};
    setTeams(filled);setGkOrders(rebuildGK(filled,[fromTeam,toTeam]));setDragging(null);
  };

  const autoBalance = () => {
    const all=[...teams.blue,...teams.yellow,...teams.red];
    const nt=distributeToTeams(all);
    setTeams(nt);setGkOrders(randomGKOrders(nt));
  };

  const doDraw = () => {
    setDrawing(true);setDrawResult(null);
    let n=0;
    const iv=setInterval(()=>{
      n++;const s=[...TEAM_NAMES].sort(()=>Math.random()-.5);
      setDrawResult({a:s[0],b:s[1],wait:s[2]});
      if(n>=14){clearInterval(iv);setDrawing(false);}
    },100);
  };

  return (
    <div>
      <DrawBanner result={drawResult} onClear={()=>setDrawResult(null)}/>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
        <div style={{fontSize:11,color:"#ffffff22"}}>Drag players between teams · sorted by grade</div>
        <div style={{flex:1}}/>
        <button onClick={onApprove} style={{...S.btn("#69db7c","#1a3a1a"),background:"linear-gradient(135deg,#1a3a1a,#0d4a1a)",border:"1px solid #69db7c55"}}>
          ✅ Approve & Save to History
        </button>
        <button onClick={doDraw} disabled={drawing} style={S.btn("#b39ddb","#2d1a6b")}>
          {drawing?"Drawing…":"🎲 Draw First Game"}
        </button>
        <button onClick={autoBalance} style={S.btn("#5bc8fa","#0e2a4a")}>⚖️ Auto Balance</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {TEAM_NAMES.map(tk=>{
          const C=TEAM_COLORS[tk];
          const hasFiller=teams[tk].some(p=>p.isFiller);
          return (
            <div key={tk}
              onDragOver={e=>e.preventDefault()}
              onDrop={()=>dropOnTeam(tk)}
              style={{background:`${C.bg}55`,border:`1.5px solid ${C.mid}44`,borderRadius:12,overflow:"hidden"}}
            >
              <div style={{background:`linear-gradient(90deg,${C.bg},${C.mid}33)`,padding:"9px 12px",borderBottom:`1px solid ${C.mid}33`,display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:C.mid,boxShadow:`0 0 6px ${C.accent}`}}/>
                <div style={{fontWeight:800,fontSize:12,color:C.accent,textTransform:"uppercase",letterSpacing:2}}>{TEAM_EMOJI[tk]} {tk}</div>
                {hasFiller&&<div style={{fontSize:9,color:"#ff8a80",background:"#ff8a8012",border:"1px solid #ff8a8025",borderRadius:7,padding:"1px 5px"}}>⚠️ filler</div>}
                <div style={{flex:1}}/>
                {!hideGrades&&<div style={{fontSize:11,fontWeight:700,color:C.accent}}>⭐ {teamScore(teams[tk])}</div>}
              </div>
              <div style={{padding:7,display:"flex",flexDirection:"column",gap:3}}>
                {teams[tk].map(p=>(
                  <PlayerCard key={p.id} player={p} teamKey={tk} dragging={dragging}
                    onDragStart={pl=>{setDragging(pl);setFromTeam(tk);}}
                    onDrop={pl=>dropOnPlayer(pl,tk)}
                    gkVal={gkEff[tk]?.[p.id]} hideGrades={hideGrades}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!hideGrades&&(
        <div style={{marginTop:12,background:"#ffffff05",border:"1px solid #ffffff0a",borderRadius:12,padding:"12px 16px"}}>
          <div style={{fontSize:10,color:"#ffffff22",marginBottom:10,letterSpacing:2}}>TEAM BALANCE</div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            {TEAM_NAMES.map(tk=>{
              const C=TEAM_COLORS[tk];
              const sc=parseFloat(teamScore(teams[tk]));
              const mx=Math.max(...TEAM_NAMES.map(t=>parseFloat(teamScore(teams[t]))));
              const pct=mx>0?(sc/mx)*100:0;
              return (
                <div key={tk} style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.accent,marginBottom:4}}>{sc}</div>
                  <div style={{height:46,background:`${C.bg}88`,border:`1px solid ${C.mid}33`,borderRadius:6,display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
                    <div style={{width:"100%",height:`${pct}%`,background:`linear-gradient(0deg,${C.mid},${C.accent}33)`,transition:"height .4s"}}/>
                  </div>
                  <div style={{fontSize:10,color:C.accent,marginTop:4,textTransform:"uppercase"}}>{tk}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GK ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function GKOrdersTab({ teams, gkOrders, setGkOrders, hideGrades }) {
  const [dragItem,setDragItem] = useState(null);
  const gkEff = effectiveGK(teams,gkOrders);

  const getSorted = (tk) => [...teams[tk]].sort((a,b)=>{
    const va=gkEff[tk]?.[a.id], vb=gkEff[tk]?.[b.id];
    if(typeof va!=="number") return 1;
    if(typeof vb!=="number") return -1;
    return va-vb;
  });

  const onDropOnItem = (tk,targetId) => {
    if(!dragItem||dragItem.tk!==tk||dragItem.id===targetId){setDragItem(null);return;}
    const sorted=getSorted(tk).filter(p=>!p.isFiller);
    const fi=sorted.findIndex(p=>String(p.id)===String(dragItem.id));
    const ti=sorted.findIndex(p=>String(p.id)===String(targetId));
    if(fi===-1||ti===-1){setDragItem(null);return;}
    const reordered=[...sorted];
    const [moved]=reordered.splice(fi,1);
    reordered.splice(ti,0,moved);
    const newOrders={...gkOrders[tk]};
    reordered.forEach((p,i)=>{newOrders[p.id]=i+1;});
    setGkOrders(prev=>({...prev,[tk]:newOrders}));
    setDragItem(null);
  };

  return (
    <div>
      <div style={{fontSize:11,color:"#ffffff33",marginBottom:4}}>GK rotation per team (1–7)</div>
      <div style={{fontSize:10,color:"#ffffff1a",marginBottom:14}}>Drag rows up/down to reorder. Teams with a filler player auto-set all real players to GK=7.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {TEAM_NAMES.map(tk=>{
          const C=TEAM_COLORS[tk];
          const hasFiller=teams[tk].some(p=>p.isFiller);
          const sorted=getSorted(tk);
          return (
            <div key={tk} style={{background:`${C.bg}33`,border:`1px solid ${C.mid}33`,borderRadius:12,overflow:"hidden"}}>
              <div style={{background:`linear-gradient(90deg,${C.bg},${C.mid}18)`,padding:"8px 12px",borderBottom:`1px solid ${C.mid}18`,display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.mid}}/>
                <div style={{fontWeight:800,fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:2}}>{TEAM_EMOJI[tk]} {tk}</div>
                {hasFiller&&<div style={{fontSize:9,color:"#ff8a80",marginLeft:4}}>⚠️ GK=7</div>}
              </div>
              <div style={{padding:7,display:"flex",flexDirection:"column",gap:3}}>
                {sorted.map(p=>{
                  const gkVal=gkEff[tk]?.[p.id];
                  const isDragging=dragItem?.tk===tk&&String(dragItem?.id)===String(p.id);
                  return (
                    <div key={p.id}
                      draggable={!p.isFiller&&!hasFiller}
                      onDragStart={()=>!p.isFiller&&!hasFiller&&setDragItem({tk,id:p.id})}
                      onDragOver={e=>e.preventDefault()}
                      onDrop={()=>!p.isFiller&&!hasFiller&&onDropOnItem(tk,p.id)}
                      style={{
                        display:"flex",alignItems:"center",gap:8,
                        background:isDragging?"#ffffff12":p.isFiller?"#ffffff04":`${C.bg}77`,
                        border:`1px solid ${p.isFiller?"#ffffff0a":C.mid+"25"}`,
                        borderRadius:8,padding:"6px 10px",
                        cursor:p.isFiller||hasFiller?"default":"grab",
                        opacity:isDragging?0.4:p.isFiller?0.45:1,
                        userSelect:"none",transition:"opacity .15s",
                      }}
                    >
                      <div style={{
                        width:26,height:26,borderRadius:"50%",flexShrink:0,
                        background:p.isFiller?"#ffffff08":`linear-gradient(135deg,${C.mid},${C.bg})`,
                        border:`2px solid ${p.isFiller?"#ffffff14":C.accent}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontWeight:800,fontSize:11,color:p.isFiller?"#ffffff1a":C.accent,
                      }}>{typeof gkVal==="number"?gkVal:"—"}</div>
                      {p.isMember&&!p.isFiller&&<span style={{fontSize:11,color:"#ffd84d",flexShrink:0}}>⭐</span>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:600,color:p.isFiller?"#ffffff2a":"#eee",fontStyle:p.isFiller?"italic":"normal",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                        {!hideGrades&&<div style={{fontSize:9,color:C.accent+"99"}}>{!p.isFiller&&`${ROLE_ICONS[p.role]} · `}⭐ {p.grade}</div>}
                      </div>
                      {!p.isFiller&&!hasFiller&&<div style={{fontSize:10,color:"#ffffff18"}}>⠿</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:10,fontSize:10,color:"#ffffff14",textAlign:"center"}}>Drag rows up/down to reorder GK rotation</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY TAB
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab({ history, setHistory }) {
  const [expanded,setExpanded] = useState(null);

  const deleteGame = (id,e) => { e.stopPropagation(); setHistory(prev=>prev.filter(g=>g.id!==id)); if(expanded===id)setExpanded(null); };

  if(history.length===0) return (
    <div style={{textAlign:"center",padding:60,color:"#ffffff1a",fontSize:13}}>
      <div style={{fontSize:36,marginBottom:10}}>🏟️</div>
      No games in history yet.<br/>Approve teams from the Teams tab to save a game.
    </div>
  );

  return (
    <div>
      <div style={{fontSize:11,color:"#ffffff33",marginBottom:14}}>{history.length} game{history.length!==1?"s":""} recorded</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[...history].reverse().map((game,ri)=>{
          const isOpen=expanded===game.id;
          return (
            <div key={game.id} style={{background:"#ffffff06",border:`1px solid ${isOpen?"#5bc8fa33":"#ffffff0e"}`,borderRadius:12,overflow:"hidden",transition:"border .2s"}}>
              {/* Header row */}
              <div onClick={()=>setExpanded(isOpen?null:game.id)}
                style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",userSelect:"none"}}>
                <div style={{width:32,height:32,borderRadius:8,background:"#0e2a4a",border:"1px solid #5bc8fa22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#5bc8fa44",flexShrink:0}}>
                  #{history.length-ri}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:"#eee"}}>{game.date}</div>
                  <div style={{fontSize:10,color:"#ffffff33",marginTop:1}}>
                    {TEAM_NAMES.map(tk=>`${TEAM_EMOJI[tk]} ${teamScore(game.teams[tk])}`).join("  ·  ")}
                  </div>
                </div>
                {game.firstGame && (
                  <div style={{fontSize:11,color:"#b39ddb",background:"#b39ddb14",border:"1px solid #b39ddb22",borderRadius:8,padding:"3px 10px",marginLeft:4}}>
                    🎲 {TEAM_EMOJI[game.firstGame.a]} vs {TEAM_EMOJI[game.firstGame.b]}
                  </div>
                )}
                <div style={{flex:1}}/>
                <button onClick={(e)=>deleteGame(game.id,e)} style={{background:"transparent",border:"none",color:"#ff6b6b44",cursor:"pointer",fontSize:15,padding:"0 4px",lineHeight:1}}>🗑</button>
                <div style={{color:"#ffffff22",fontSize:14}}>{isOpen?"▲":"▼"}</div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{padding:"0 14px 14px",borderTop:"1px solid #ffffff0a"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
                    {TEAM_NAMES.map(tk=>{
                      const C=TEAM_COLORS[tk];
                      const effGK=game.effGK||effectiveGK(game.teams,game.gkOrders);
                      return (
                        <div key={tk} style={{background:`${C.bg}44`,border:`1px solid ${C.mid}33`,borderRadius:10,overflow:"hidden"}}>
                          <div style={{background:`${C.bg}`,padding:"6px 10px",borderBottom:`1px solid ${C.mid}22`,display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:12}}>{TEAM_EMOJI[tk]}</span>
                            <span style={{fontWeight:700,fontSize:11,color:C.accent,textTransform:"uppercase",letterSpacing:1}}>{tk}</span>
                            <span style={{marginLeft:"auto",fontSize:10,color:C.accent+"99"}}>⭐ {teamScore(game.teams[tk])}</span>
                          </div>
                          <div style={{padding:6,display:"flex",flexDirection:"column",gap:2}}>
                            {sortByGrade(game.teams[tk]).map(p=>{
                              const gkV=effGK[tk]?.[p.id];
                              return (
                                <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 6px",background:p.isFiller?"#ffffff04":`${C.bg}77`,borderRadius:6}}>
                                  {p.isMember&&!p.isFiller&&<span style={{fontSize:10,color:"#ffd84d"}}>⭐</span>}
                                  <span style={{fontSize:11}}>{p.isFiller?"🥅":ROLE_ICONS[p.role]}</span>
                                  <span style={{flex:1,fontSize:10,color:p.isFiller?"#ffffff22":"#ccc",fontStyle:p.isFiller?"italic":"normal",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</span>
                                  <span style={{fontSize:9,color:C.accent+"88"}}>{typeof gkV==="number"?`GK=${gkV}`:""}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────────────────────────────────────

function StatsTab({ db, history }) {
  const [search,setSearch] = useState("");
  const last5 = history.slice(-5);

  // For each player in DB, build their GK history across last 5 games
  const stats = db.map(player => {
    const games = last5.map(game => {
      // Find which team this player was in
      let gkVal = null;
      let teamKey = null;
      for(const tk of TEAM_NAMES){
        const found = game.teams[tk]?.find(p=>p.id===player.id);
        if(found){ teamKey=tk; break; }
      }
      if(!teamKey) return { played:false, gkVal:0, teamKey:null };
      const effGK = game.effGK || effectiveGK(game.teams,game.gkOrders);
      const val = effGK[teamKey]?.[player.id];
      return { played:true, gkVal: typeof val==="number"?val:7, teamKey, date:game.date };
    });
    const gamesPlayed = games.filter(g=>g.played).length;
    const avgGK = gamesPlayed>0 ? (games.filter(g=>g.played).reduce((s,g)=>s+g.gkVal,0)/gamesPlayed).toFixed(1) : "—";
    return { ...player, games, gamesPlayed, avgGK };
  });

  const filtered = stats
    .filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(b.isMember!==a.isMember) return b.isMember?1:-1;
      return b.gamesPlayed-a.gamesPlayed||b.grade-a.grade;
    });

  return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        <input style={{...S.input,width:190}} placeholder="🔍 Search player…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{flex:1}}/>
        <div style={{fontSize:11,color:"#ffffff22"}}>Last {last5.length} game{last5.length!==1?"s":""} shown</div>
      </div>

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr repeat(5,42px) 60px",gap:0,marginBottom:4,padding:"0 10px"}}>
        <div style={{fontSize:9,color:"#ffffff22",letterSpacing:1}}>PLAYER</div>
        <div/>
        {last5.map((g,i)=>(
          <div key={i} style={{fontSize:9,color:"#ffffff22",letterSpacing:1,textAlign:"center",lineHeight:1.2}}>
            {g.date.slice(5)}<br/><span style={{fontSize:8}}>{["G"+(history.length-last5.length+i+1)]}</span>
          </div>
        ))}
        {Array.from({length:5-last5.length}).map((_,i)=><div key={"empty"+i}/>)}
        <div style={{fontSize:9,color:"#ffffff22",letterSpacing:1,textAlign:"center"}}>AVG GK</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        {filtered.map(player=>(
          <div key={player.id} style={{
            display:"grid",gridTemplateColumns:"220px 1fr repeat(5,42px) 60px",
            gap:0,alignItems:"center",
            background:"#ffffff05",border:"1px solid #ffffff09",
            borderRadius:9,padding:"7px 10px",
          }}>
            {/* Name */}
            <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
              {player.isMember && <span style={{fontSize:12,color:"#ffd84d",flexShrink:0,textShadow:"0 0 6px #ffd84d44"}}>⭐</span>}
              <span style={{fontSize:11}}>{ROLE_ICONS[player.role]}</span>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:600,fontSize:11,color:"#ddd",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{player.name}</div>
                <div style={{fontSize:9,color:ROLE_COLORS[player.role]+"99"}}>{player.grade} ⭐ · {player.gamesPlayed}/{last5.length} games</div>
              </div>
            </div>
            {/* Spacer */}
            <div/>
            {/* GK bars for last 5 games */}
            {Array.from({length:5}).map((_,i)=>{
              const gameData = player.games[i];
              if(!gameData) return <div key={i}/>;
              const { played, gkVal, teamKey } = gameData;
              const C = teamKey ? TEAM_COLORS[teamKey] : null;
              const barH = played ? Math.round((gkVal/7)*32) : 4;
              const barColor = !played ? "#ffffff18" : C ? C.accent : "#5bc8fa";
              const bgColor  = !played ? "#ffffff06" : C ? C.bg+"cc" : "#0e2a4a";
              return (
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  {/* bar */}
                  <div style={{width:28,height:36,background:"#ffffff06",borderRadius:5,display:"flex",alignItems:"flex-end",overflow:"hidden",border:"1px solid #ffffff0a"}}>
                    <div style={{
                      width:"100%",height:barH,
                      background:!played?"#ffffff14":`linear-gradient(0deg,${barColor}cc,${barColor}55)`,
                      borderRadius:"0 0 4px 4px",
                      transition:"height .3s",
                    }}/>
                  </div>
                  {/* label */}
                  <div style={{fontSize:9,fontWeight:700,color:!played?"#ffffff22":barColor}}>
                    {!played?"—":gkVal}
                  </div>
                </div>
              );
            })}
            {/* Avg */}
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:12,fontWeight:700,color:player.gamesPlayed>0?"#5bc8fa":"#ffffff22"}}>{player.avgGK}</div>
              <div style={{fontSize:9,color:"#ffffff22"}}>avg</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length===0&&<div style={{textAlign:"center",color:"#ffffff1a",padding:40,fontSize:13}}>No players found</div>}

      <div style={{marginTop:14,fontSize:10,color:"#ffffff14",textAlign:"center"}}>
        Bar height = GK rotation number (higher bar = higher GK number = later in rotation). Gray = did not attend.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function SoccerManager() {
  const [db,         setDb]          = useState(INITIAL_DB);
  const [attendance, setAttendance]  = useState({});
  const [gameRoster, setGameRoster]  = useState([]);
  const [teams,      setTeams]       = useState(() => distributeToTeams(INITIAL_DB.slice(0,21)));
  const [gkOrders,   setGkOrders]    = useState(() => randomGKOrders(distributeToTeams(INITIAL_DB.slice(0,21))));
  const [history,    setHistory]     = useState(() => buildSeedHistory(INITIAL_DB));
  const [tab,        setTab]         = useState("db");
  const [hideGrades, setHideGrades]  = useState(false);
  const [drawResult, setDrawResult]  = useState(null);

  const buildTeamsFromRoster = useCallback(() => {
    if(gameRoster.length===0) return;
    const nt = distributeToTeams(gameRoster);
    setTeams(nt); setGkOrders(randomGKOrders(nt)); setTab("teams");
  },[gameRoster]);

  const approveTeams = () => {
    const today = new Date().toISOString().slice(0,10);
    const effGK  = effectiveGK(teams,gkOrders);
    const entry  = { id:`game-${Date.now()}`, date:today, teams, gkOrders, effGK, firstGame:drawResult };
    setHistory(prev=>[...prev,entry]);
    setTab("history");
  };

  const attendingCount = db.filter(p=>attendance[p.id]).length;

  const TABS = [
    { key:"db",      label:"🗃️ Database" },
    { key:"nextgame",label:"📋 Next Game" },
    { key:"teams",   label:"👥 Teams" },
    { key:"gk",      label:"🧤 GK Orders" },
    { key:"history", label:"🏟️ History" },
    { key:"stats",   label:"📊 Stats" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#060d18 0%,#0a1520 60%,#060d18 100%)",fontFamily:"'Trebuchet MS','Segoe UI',sans-serif",color:"#eee",paddingBottom:60}}>

      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#060d18,#0e2a4a66,#060d18)",borderBottom:"1px solid #5bc8fa14",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:24}}>⚽</div>
        <div>
          <div style={{fontSize:15,fontWeight:800,letterSpacing:3,color:"#5bc8fa"}}>MONDAY FOOTBALL</div>
          <div style={{fontSize:9,color:"#ffffff2a",letterSpacing:4}}>TEAM MANAGER</div>
        </div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          {gameRoster.length>0&&(
            <button onClick={buildTeamsFromRoster} style={{background:"linear-gradient(135deg,#1a4a1a,#2a8a2a)",border:"1px solid #69db7c44",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:"#69db7c",cursor:"pointer"}}>
              ⚽ Build Teams ({gameRoster.length})
            </button>
          )}
          <button onClick={()=>setHideGrades(v=>!v)} style={{
            background:hideGrades?"#3a0e0e":"#0e2a4a",
            border:`1px solid ${hideGrades?"#ff6b6b33":"#5bc8fa22"}`,
            borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,
            color:hideGrades?"#ff6b6b":"#5bc8fa",cursor:"pointer",
          }}>{hideGrades?"👁️ Show Grades":"🙈 Hide Grades"}</button>
          <div style={{background:"#0e2a4a",border:"1px solid #5bc8fa14",borderRadius:20,padding:"4px 12px",fontSize:10,color:"#5bc8fa66"}}>
            {db.length} DB · {attendingCount} attending
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,padding:"10px 16px 0",borderBottom:"1px solid #ffffff0a",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            background:tab===t.key?"#0e2a4a":"transparent",
            border:tab===t.key?"1px solid #5bc8fa33":"1px solid transparent",
            borderBottom:tab===t.key?"1px solid #0e2a4a":"none",
            borderRadius:"8px 8px 0 0",padding:"7px 13px",
            color:tab===t.key?"#5bc8fa":"#ffffff33",
            cursor:"pointer",fontSize:11,fontWeight:tab===t.key?700:400,
            whiteSpace:"nowrap",transition:"all .15s",
          }}>
            {t.label}
            {t.key==="nextgame"&&gameRoster.length>0?` (${gameRoster.length})`:""}
            {t.key==="history"&&history.length>0?` (${history.length})`:""}
          </button>
        ))}
      </div>

      <div style={{padding:16}}>
        {tab==="db"      && <DatabaseTab db={db} setDb={setDb} attendance={attendance} setAttendance={setAttendance}/>}
        {tab==="nextgame"&& <NextGameTab db={db} attendance={attendance} setAttendance={setAttendance} gameRoster={gameRoster} setGameRoster={setGameRoster}/>}
        {tab==="teams"   && <TeamsTab teams={teams} setTeams={setTeams} gkOrders={gkOrders} setGkOrders={setGkOrders} hideGrades={hideGrades} drawResult={drawResult} setDrawResult={setDrawResult} onApprove={approveTeams}/>}
        {tab==="gk"      && <GKOrdersTab teams={teams} gkOrders={gkOrders} setGkOrders={setGkOrders} hideGrades={hideGrades}/>}
        {tab==="history" && <HistoryTab history={history} setHistory={setHistory}/>}
        {tab==="stats"   && <StatsTab db={db} history={history}/>}
      </div>
    </div>
  );
}
