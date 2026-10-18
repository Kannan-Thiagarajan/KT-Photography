import {createClient} from 'npm:@supabase/supabase-js@2';
const url=Deno.env.get('SUPABASE_URL')!;
const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(request:Request)=>{
 if(request.method!=='POST')return reply({error:'POST required.'},405);
 const authorization=request.headers.get('Authorization');if(!authorization)return reply({error:'Authentication required.'},401);
 const session=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:{user},error:authError}=await session.auth.getUser();if(authError||!user)return reply({error:'Invalid session.'},401);
 const {data:profile}=await session.from('profiles').select('role,is_active,must_change_password').eq('id',user.id).single();
 if(profile?.role!=='admin'||!profile.is_active||profile.must_change_password)return reply({error:'Administrator access required.'},403);
 const db=createClient(url,secret,{auth:{persistSession:false}});
 // Signed upload URLs last 2 hours. Wait 3 hours so late transfers cannot race cleanup.
 const cutoff=new Date(Date.now()-3*60*60*1000).toISOString();
 const {data:jobs,error}=await db.from('upload_jobs').select('*').lt('created_at',cutoff).order('created_at').limit(100);
 if(error)return reply({error:'Could not inspect incomplete uploads.'},500);
 let cleaned=0;
 for(const job of jobs||[]){
  const preview=job.storage_path.replace(/\.[^.]+$/,'-preview.webp');
  if(job.bucket==='client-photos'){
   const {data:photo,error:lookupError}=await db.from('photos').select('id').eq('storage_path',job.storage_path).maybeSingle();
   if(lookupError)continue;
   if(photo){await db.from('upload_jobs').delete().eq('storage_path',job.storage_path);continue;}
  }else if(job.bucket==='public-assets'){
   const {data:packages,error:lookupError}=await db.from('packages').select('id').eq('image_path',preview).limit(1);
   if(lookupError)continue;
   if(packages?.length)continue;
  }else continue;
  const {error:removeError}=await db.storage.from(job.bucket).remove([job.storage_path,preview]);
  if(removeError)continue;
  const {error:deleteError}=await db.from('upload_jobs').delete().eq('storage_path',job.storage_path);
  if(!deleteError)cleaned++;
 }
 await db.from('account_provisioning').delete().lt('expires_at',new Date().toISOString());
 return reply({cleaned,inspected:jobs?.length||0});
});
