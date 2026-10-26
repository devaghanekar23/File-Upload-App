const express=require('express'),cors=require('cors'),multer=require('multer'),mysql=require('mysql2/promise'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs'),crypto=require('crypto');
const {S3Client,PutObjectCommand,DeleteObjectCommand,GetObjectCommand}=require('@aws-sdk/client-s3');
const {getSignedUrl}=require('@aws-sdk/s3-request-presigner');
const e=process.env, BUCKET=e.S3_BUCKET, SECRET=e.JWT_SECRET||'change-me';
const s3=new S3Client({region:e.AWS_REGION||'ap-south-1'}); // creds: env vars ya IAM role
const db=mysql.createPool({host:e.DB_HOST||'mysql',user:e.DB_USER||'root',password:e.DB_PASSWORD,database:e.DB_NAME||'fileapp',connectionLimit:10});
const OK=/^(image\/|video\/|text\/plain|application\/(pdf|msword|zip|vnd\.openxmlformats|vnd\.ms-))/;
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:(+e.MAX_MB||100)*1024*1024},
 fileFilter:(r,f,cb)=>OK.test(f.mimetype)?cb(null,true):cb(new Error('File type allowed nahi hai'))});
const app=express(); app.use(cors()); app.use(express.json());
const auth=(req,res,next)=>{try{req.user=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),SECRET);next()}catch{res.status(401).json({error:'Login required'})}};
const token=u=>jwt.sign({id:u.id,email:u.email},SECRET,{expiresIn:'8h'});

app.get('/api/health',async(q,r)=>{try{await db.query('SELECT 1');r.json({status:'ok'})}catch{r.status(500).json({status:'db down'})}});
app.post('/api/register',async(q,r)=>{const{email,password}=q.body;
 if(!email||!password||password.length<6)return r.status(400).json({error:'Valid email aur 6+ char password do'});
 try{const[x]=await db.query('INSERT INTO users(email,password_hash) VALUES(?,?)',[email,await bcrypt.hash(password,10)]);
 r.json({token:token({id:x.insertId,email}),email})}catch(err){r.status(409).json({error:'Email already registered'})}});
app.post('/api/login',async(q,r)=>{const{email,password}=q.body;const[[u]]=await db.query('SELECT * FROM users WHERE email=?',[email]);
 if(!u||!await bcrypt.compare(password||'',u.password_hash))return r.status(401).json({error:'Email ya password galat hai'});
 r.json({token:token(u),email:u.email})});
app.get('/api/files',auth,async(q,r)=>{const[rows]=await db.query('SELECT id,file_name,file_type,file_size,uploaded_at FROM files WHERE user_id=? ORDER BY uploaded_at DESC',[q.user.id]);r.json(rows)});
app.post('/api/files',auth,upload.single('file'),async(q,r)=>{
 if(!q.file)return r.status(400).json({error:'File select karo'});
 const f=q.file,key=`uploads/${q.user.id}/${crypto.randomUUID()}-${f.originalname.replace(/[^\w.\-]/g,'_')}`;
 await s3.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:f.buffer,ContentType:f.mimetype}));
 const[x]=await db.query('INSERT INTO files(user_id,file_name,s3_key,file_type,file_size) VALUES(?,?,?,?,?)',[q.user.id,f.originalname,key,f.mimetype,f.size]);
 r.json({id:x.insertId,file_name:f.originalname})});
const own=async(q)=>(await db.query('SELECT * FROM files WHERE id=? AND user_id=?',[q.params.id,q.user.id]))[0][0];
app.get('/api/files/:id/download',auth,async(q,r)=>{const f=await own(q);if(!f)return r.status(404).json({error:'Not found'});
 const url=await getSignedUrl(s3,new GetObjectCommand({Bucket:BUCKET,Key:f.s3_key,ResponseContentDisposition:`attachment; filename="${f.file_name.replace(/"/g,'')}"`}),{expiresIn:300});r.json({url})});
app.delete('/api/files/:id',auth,async(q,r)=>{const f=await own(q);if(!f)return r.status(404).json({error:'Not found'});
 await s3.send(new DeleteObjectCommand({Bucket:BUCKET,Key:f.s3_key}));await db.query('DELETE FROM files WHERE id=?',[f.id]);r.json({ok:true})});
app.use((err,q,r,n)=>r.status(400).json({error:err.message}));

(async()=>{for(let i=0;i<30;i++){try{
 await db.query('CREATE TABLE IF NOT EXISTS users(id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(255) UNIQUE NOT NULL,password_hash VARCHAR(255) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 await db.query('CREATE TABLE IF NOT EXISTS files(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,file_name VARCHAR(255) NOT NULL,s3_key VARCHAR(512) NOT NULL,file_type VARCHAR(120),file_size BIGINT,uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id))');
 console.log('DB ready');break}catch{console.log('DB wait...');await new Promise(r=>setTimeout(r,3000))}}
 app.listen(5000,()=>console.log('API on 5000'))})();
