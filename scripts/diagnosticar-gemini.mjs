// Only prints allowlisted diagnostics, never upstream messages or credentials.
process.loadEnvFile(new URL('../.dev.vars',import.meta.url));
const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY,'Api-Revision':'2026-05-20'},body:JSON.stringify({model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',store:false,input:'Responda apenas: ok.'}),signal:AbortSignal.timeout(60000)});
const data=await response.json();
console.log(JSON.stringify({httpStatus:response.status,status:data.status||data.error?.status,retryAfter:response.headers.get('retry-after'),details:data.error?.details?.map(d=>({type:d['@type'],retryDelay:d.retryDelay,quotaIds:d.violations?.map(v=>v.quotaId)}))}));
