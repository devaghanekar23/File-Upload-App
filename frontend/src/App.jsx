import {useState,useEffect,useCallback} from 'react';
const fmt=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':b<1073741824?(b/1048576).toFixed(1)+' MB':(b/1073741824).toFixed(2)+' GB';
const icon=t=>t?.startsWith('image/')?'🖼️':t?.startsWith('video/')?'🎬':t==='application/pdf'?'📕':'📄';
export default function App(){
 const [tok,setTok]=useState(localStorage.getItem('tok')),[email,setEmail]=useState(localStorage.getItem('em')||'');
 const [mode,setMode]=useState('login'),[form,setForm]=useState({email:'',password:''}),[err,setErr]=useState('');
 const [files,setFiles]=useState([]),[pick,setPick]=useState(null),[pct,setPct]=useState(null);
 const H=()=>({Authorization:'Bearer '+tok});
 const logout=()=>{localStorage.clear();setTok(null);setFiles([])};
 const api=async(url,opt={})=>{const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),...(tok?H():{})}});const d=await r.json();if(r.status===401&&tok)logout();if(!r.ok)throw new Error(d.error||'Error');return d};
 const load=useCallback(()=>tok&&api('/api/files').then(setFiles).catch(e=>setErr(e.message)),[tok]);
 useEffect(()=>{load()},[load]);
 const authSubmit=async ev=>{ev.preventDefault();setErr('');
  try{const d=await api('/api/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
  localStorage.setItem('tok',d.token);localStorage.setItem('em',d.email);setTok(d.token);setEmail(d.email)}catch(e){setErr(e.message)}};
 const send=()=>{if(!pick)return;setErr('');const x=new XMLHttpRequest(),fd=new FormData();fd.append('file',pick);
  x.open('POST','/api/files');x.setRequestHeader('Authorization','Bearer '+tok);
  x.upload.onprogress=e=>e.lengthComputable&&setPct(Math.round(e.loaded/e.total*100));
  x.onload=()=>{setPct(null);if(x.status===200){setPick(null);load()}else setErr(JSON.parse(x.responseText).error||'Upload failed')};
  x.onerror=()=>{setPct(null);setErr('Network error')};setPct(0);x.send(fd)};
 const dl=async id=>{try{window.location=(await api(`/api/files/${id}/download`)).url}catch(e){setErr(e.message)}};
 const del=async id=>{if(confirm('Delete karna hai?')){await api('/api/files/'+id,{method:'DELETE'});load()}};
 if(!tok)return(<div className="card auth"><h1>☁️ File Upload App</h1>
  <form onSubmit={authSubmit}><input type="email" placeholder="Email" required onChange={e=>setForm({...form,email:e.target.value})}/>
  <input type="password" placeholder="Password (min 6)" required onChange={e=>setForm({...form,password:e.target.value})}/>
  <button>{mode==='login'?'Login':'Register'}</button></form>{err&&<p className="err">{err}</p>}
  <p className="link" onClick={()=>{setMode(mode==='login'?'register':'login');setErr('')}}>{mode==='login'?'Naya account banao':'Already account hai? Login'}</p></div>);
 return(<div className="wrap"><header><h1>☁️ File Upload App</h1><span>{email} <button className="ghost" onClick={logout}>Logout</button></span></header>
  <div className="card"><h2>Upload File</h2><input type="file" onChange={e=>setPick(e.target.files[0])}/>
   {pick&&<p>{pick.name} — {fmt(pick.size)}</p>}
   {pct!==null&&<div className="bar"><div style={{width:pct+'%'}}>{pct}%</div></div>}
   <button disabled={!pick||pct!==null} onClick={send}>Upload</button>{err&&<p className="err">{err}</p>}</div>
  <div className="card"><h2>My Files ({files.length})</h2>{!files.length&&<p>Abhi koi file nahi hai.</p>}
   <table><tbody>{files.map(f=><tr key={f.id}><td>{icon(f.file_type)}</td><td><b>{f.file_name}</b><br/><small>{f.file_type}</small></td>
    <td>{fmt(f.file_size)}</td><td>{new Date(f.uploaded_at).toLocaleString()}</td>
    <td><button onClick={()=>dl(f.id)}>Download</button> <button className="danger" onClick={()=>del(f.id)}>Delete</button></td></tr>)}</tbody></table></div></div>)}
