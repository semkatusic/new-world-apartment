// Server-side inquiry delivery. Requires RESEND_API_KEY and INQUIRY_FROM_EMAIL.
// Never return success unless the mail provider accepted the message.
const DESTINATION = 'ns.apartment9@gmail.com';
function clean(value,max=300){return String(value??'').trim().slice(0,max);}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
function escapeHtml(value){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'method_not_allowed'});}
  if(Number(req.headers['content-length']||0)>16000)return res.status(413).json({ok:false,error:'too_large'});
  const data=typeof req.body==='object'&&req.body!==null?req.body:{};
  if(clean(data.website,150))return res.status(200).json({ok:true});
  const firstName=clean(data.firstName,80),lastName=clean(data.lastName,80),email=clean(data.email,254),phone=clean(data.phone,80);
  const arrival=clean(data.arrival,20),departure=clean(data.departure,20),guests=clean(data.guests,4),message=clean(data.message,1800);
  if(!firstName||!lastName||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validDate(arrival)||!validDate(departure)||departure<=arrival||!['1','2'].includes(guests)){
    return res.status(400).json({ok:false,error:'invalid_fields'});
  }
  const today=new Date().toISOString().slice(0,10);
  if(arrival<today)return res.status(400).json({ok:false,error:'invalid_dates'});
  const key=process.env.RESEND_API_KEY,from=process.env.INQUIRY_FROM_EMAIL;
  if(!key||!from)return res.status(503).json({ok:false,error:'delivery_not_configured'});
  const rows=[['First name',firstName],['Last name',lastName],['Email',email],['Phone / WhatsApp',phone||'-'],['Arrival',arrival],['Departure',departure],['Guests',guests],['Message',message||'-']];
  const html='<h2>New World Apartment Zagreb – booking inquiry</h2><table>'+rows.map(([k,v])=>'<tr><th style="text-align:left;vertical-align:top;padding:8px">'+escapeHtml(k)+'</th><td style="padding:8px;white-space:pre-wrap">'+escapeHtml(v)+'</td></tr>').join('')+'</table>';
  try{
    const upstream=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,to:[DESTINATION],reply_to:email,subject:'Booking inquiry - New World Apartment Zagreb',html})});
    if(!upstream.ok)return res.status(502).json({ok:false,error:'delivery_failed'});
    const result=await upstream.json().catch(()=>null);
    if(!result?.id)return res.status(502).json({ok:false,error:'delivery_unconfirmed'});
    return res.status(200).json({ok:true});
  }catch(_){return res.status(502).json({ok:false,error:'delivery_failed'});}
};
