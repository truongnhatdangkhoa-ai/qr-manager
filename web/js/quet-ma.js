/* quet-ma.js — Tab 5 "Quét mã": dùng camera (hoặc ảnh) quét QR + mã vạch, tự phân tích nội dung như Zalo.
   - Giải mã: BarcodeDetector của máy (nếu có) + jsQR (js/jsqr.min.js, Apache-2.0, chuyên QR) + ZXing (js/zxing.min.js, MIT, mã vạch & 2D khác), chạy offline.
   - Nhận diện: liên kết, Wi-Fi, danh bạ (vCard/MECARD), email, SMS, điện thoại, vị trí, lịch,
     VietQR/EMV chuyển khoản ngân hàng, mã vạch sản phẩm (EAN/UPC/ISBN), văn bản thường.
   - Không gửi dữ liệu ra ngoài. Lịch sử quét lưu localStorage 'qr-manager-scan-v1'. */

/* ============ PHẦN 1: PHÂN TÍCH NỘI DUNG (không đụng DOM) ============ */
(function(root){
'use strict';
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
var FMT={qr_code:'Mã QR',data_matrix:'Data Matrix',aztec:'Aztec',pdf_417:'PDF417',ean_13:'EAN-13',ean_8:'EAN-8',upc_a:'UPC-A',upc_e:'UPC-E',
  code_128:'Code 128',code_39:'Code 39',code_93:'Code 93',itf:'ITF',codabar:'Codabar',rss_14:'GS1 DataBar',rss_expanded:'GS1 DataBar mở rộng'};
function normFmt(f){return String(f||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').replace('pdf417','pdf_417');}
function fmtName(f){return FMT[f]||(f?String(f).toUpperCase():'Mã');}
var is2D=function(f){return f==='qr_code'||f==='data_matrix'||f==='aztec'||f==='pdf_417';};

var BANKS={'970436':'Vietcombank','970415':'VietinBank','970418':'BIDV','970405':'Agribank','970407':'Techcombank','970422':'MB Bank',
 '970416':'ACB','970432':'VPBank','970403':'Sacombank','970423':'TPBank','970441':'VIB','970443':'SHB','970437':'HDBank','970448':'OCB',
 '970426':'MSB','970440':'SeABank','970431':'Eximbank','970449':'LPBank','970428':'Nam A Bank','970409':'Bac A Bank','970429':'SCB',
 '970424':'Shinhan Bank','970412':'PVcomBank','970425':'ABBANK','970419':'NCB','970433':'VietBank','970438':'BaoViet Bank',
 '970452':'KienlongBank','970454':'Viet Capital Bank','970430':'PG Bank','970427':'VietABank','970446':'Co-opBank','970414':'Oceanbank',
 '970400':'Saigonbank','970406':'DongA Bank','970408':'GPBank','970421':'VRB','970444':'CBBank','970434':'Indovina Bank'};

function crc16(s){var c=0xFFFF,i,k;for(i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(k=0;k<8;k++)c=(c&0x8000)?((c<<1)^0x1021):(c<<1);c&=0xFFFF;}return('0000'+c.toString(16).toUpperCase()).slice(-4);}
function tlv(s){var o=[],i=0,id,len;while(i+4<=s.length){id=s.substr(i,2);len=parseInt(s.substr(i+2,2),10);if(isNaN(len)||i+4+len>s.length)return null;o.push([id,s.substr(i+4,len)]);i+=4+len;}return i===s.length?o:null;}
function tget(a,id){if(!a)return'';for(var i=0;i<a.length;i++)if(a[i][0]===id)return a[i][1];return'';}
function kvSemi(s){var o={},cur='',parts=[],i,c;for(i=0;i<s.length;i++){c=s.charAt(i);if(c==='\\'&&i+1<s.length){cur+=s.charAt(++i);}else if(c===';'){parts.push(cur);cur='';}else cur+=c;}if(cur)parts.push(cur);
  parts.forEach(function(p){var k=p.indexOf(':');if(k>0)o[p.slice(0,k).toUpperCase()]=p.slice(k+1);});return o;}
function unfold(s){return String(s).replace(/\r?\n[ \t]/g,'').split(/\r?\n/);}
function vlines(text){var o=[];unfold(text).forEach(function(l){var k=l.indexOf(':');if(k<1)return;var head=l.slice(0,k).split(';')[0].toUpperCase().replace(/^ITEM\d+\./,'');o.push([head,l.slice(k+1).replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1')]);});return o;}
function vget(L,k){var r=[];L.forEach(function(x){if(x[0]===k&&x[1])r.push(x[1]);});return r;}
function money(n){var v=Number(n);return isFinite(v)?v.toLocaleString((window.QM_LOC?QM_LOC():'vi-VN'))+' ₫':n;}
function gtinOk(d){if(!/^\d+$/.test(d))return false;var s=0,w=3,i;for(i=d.length-2;i>=0;i--){s+=(+d.charAt(i))*w;w=w===3?1:3;}return((10-s%10)%10)===+d.charAt(d.length-1);}
function gs1Country(c){var p3=c.slice(0,3),p2=+c.slice(0,2),n3=+p3;
  if(p3==='893')return'Việt Nam';
  if(n3>=690&&n3<=699)return'Trung Quốc';if(p2===45||p2===49)return'Nhật Bản';if(p3==='880')return'Hàn Quốc';if(p3==='885')return'Thái Lan';
  if(p3==='888')return'Singapore';if(p3==='899')return'Indonesia';if(p3==='955')return'Malaysia';if(p2===50)return'Anh';
  if(n3>=400&&n3<=440)return'Đức';if(p2>=30&&p2<=37)return'Pháp';if(n3<=139)return'Mỹ / Canada';return'';}
function kv(l,v){return[l,v];}
function act(label,o){o=o||{};o.label=label;return o;}
function cleanPhone(p){return String(p).replace(/[^\d+]/g,'');}
function zaloPhone(p){var d=cleanPhone(p);if(d.indexOf('+84')===0)d='0'+d.slice(3);else if(d.indexOf('84')===0&&d.length>=11)d='0'+d.slice(2);return d;}
function when(s){var m=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(s||'');if(!m)return s||'';return m[3]+'/'+m[2]+'/'+m[1]+(m[4]?' '+m[4]+':'+m[5]:'');}
function mkVcard(name,tels,mails,org,adr,url){var v=['BEGIN:VCARD','VERSION:3.0','FN:'+name,'N:;'+name+';;;'];tels.forEach(function(t){v.push('TEL:'+t);});mails.forEach(function(t){v.push('EMAIL:'+t);});
  if(org)v.push('ORG:'+org);if(adr)v.push('ADR:;;'+adr+';;;;');if(url)v.push('URL:'+url);v.push('END:VCARD');return v.join('\r\n');}
var BLOCKED=/^(javascript|data|vbscript|file|blob|about|content|intent|android-app|chrome|view-source|ws|wss|ftp|jar|resource|filesystem)$/i;
var SHORT=/(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|is\.gd|rb\.gy|ow\.ly|shorturl\.at|tiny\.cc|s\.id)$/i;

function parse(text,fmt){
  var t=String(text==null?'':text),tt=t.trim(),m,i;
  var r={kind:'text',label:'Văn bản',icon:'📝',rows:[],actions:[],note:'',noteKind:'info',title:'',text:t,fmt:fmt||''};
  function fin(){if(!r.title)r.title=(r.rows[0]&&r.rows[0][1])||tt;return r;}
  var copyAll=act('Sao chép toàn bộ',{copy:t});

  /* 1. VietQR / EMV chuyển khoản */
  if(/^000201/.test(tt)&&/6304[0-9A-Fa-f]{4}$/.test(tt)){
    var top=tlv(tt);
    if(top){
      r.kind='bank';r.label='Thanh toán / Chuyển khoản';r.icon='🏦';
      var ok=crc16(tt.slice(0,-4))===tt.slice(-4).toUpperCase();
      var n38=tlv(tget(top,'38')),acc=n38?tlv(tget(n38,'01')):null,bin=acc?tget(acc,'00'):'',no=acc?tget(acc,'01'):'';
      var svc=n38?tget(n38,'02'):'';
      var add=tlv(tget(top,'62'))||[],msg=tget(add,'08')||tget(add,'02')||'';
      var amt=tget(top,'54');
      if(bin||no){
        r.label='VietQR · Chuyển khoản ngân hàng';
        r.rows.push(kv('Ngân hàng',BANKS[bin]?BANKS[bin]+' ('+bin+')':'Mã ngân hàng '+bin));
        r.rows.push(kv(svc==='QRIBFTTC'?'Số thẻ':'Số tài khoản',no));
      }else{
        r.rows.push(kv('Đơn vị nhận',tget(top,'59')||'Không rõ'));
      }
      if(bin&&tget(top,'59'))r.rows.push(kv('Tên người nhận',tget(top,'59')));
      if(amt)r.rows.push(kv('Số tiền',money(amt)));
      if(msg)r.rows.push(kv('Nội dung',msg));
      r.rows.push(kv('Loại mã',tget(top,'01')==='12'?'QR động (dùng một lần)':'QR tĩnh'));
      if(!ok){r.note='Mã kiểm tra (CRC) không khớp — mã có thể bị sửa hoặc in lỗi. Cẩn thận trước khi chuyển tiền.';r.noteKind='warn';}
      else r.note='Hãy kiểm tra kỹ tên người nhận trên app ngân hàng trước khi chuyển tiền.';
      if(no)r.actions.push(act(svc==='QRIBFTTC'?'Sao chép số thẻ':'Sao chép số tài khoản',{copy:no,primary:true}));
      if(amt)r.actions.push(act('Sao chép số tiền',{copy:amt}));
      if(msg)r.actions.push(act('Sao chép lời nhắn',{copy:msg}));
      r.actions.push(copyAll);
      r.title=(BANKS[bin]||'Chuyển khoản')+(no?' · '+no:'');
      return r;
    }
  }
  /* 2. Wi-Fi */
  if(/^WIFI:/i.test(tt)){
    var w=kvSemi(tt.slice(5));r.kind='wifi';r.label='Wi-Fi';r.icon='📶';
    r.rows.push(kv('Tên mạng',w.S||''));
    var sec=(w.T||'').toUpperCase();
    r.rows.push(kv('Mật khẩu',w.P||(sec==='NOPASS'||!sec?'(không có)':'')));
    r.rows.push(kv('Bảo mật',sec==='NOPASS'||!sec?'Không mật khẩu':sec));
    if(/^true$/i.test(w.H||''))r.rows.push(kv('Mạng ẩn','Có'));
    r.note='Trình duyệt/app web không tự kết nối Wi-Fi được: vào Cài đặt → Wi-Fi, chọn mạng rồi dán mật khẩu.';
    if(w.P)r.actions.push(act('Sao chép mật khẩu',{copy:w.P,primary:true}));
    if(w.S)r.actions.push(act('Sao chép tên mạng',{copy:w.S}));
    r.title='Wi-Fi '+(w.S||'');return fin();
  }
  /* 3. Danh bạ */
  if(/^BEGIN:VCARD/i.test(tt)){
    var L=vlines(tt),fn=vget(L,'FN')[0]||(vget(L,'N')[0]||'').split(';').reverse().join(' ').trim(),tels=vget(L,'TEL'),mails=vget(L,'EMAIL');
    r.kind='contact';r.label='Danh bạ';r.icon='👤';
    if(fn)r.rows.push(kv('Họ tên',fn));
    tels.forEach(function(x){r.rows.push(kv('Điện thoại',x));});mails.forEach(function(x){r.rows.push(kv('Email',x));});
    var o=vget(L,'ORG')[0];if(o)r.rows.push(kv('Công ty',o.replace(/;/g,' ')));
    var tl=vget(L,'TITLE')[0];if(tl)r.rows.push(kv('Chức vụ',tl));
    var ad=vget(L,'ADR')[0];if(ad)r.rows.push(kv('Địa chỉ',ad.split(';').filter(Boolean).join(', ')));
    var u=vget(L,'URL')[0];if(u)r.rows.push(kv('Website',u));
    if(tels[0])r.actions.push(act('Gọi',{href:'tel:'+cleanPhone(tels[0]),primary:true}));
    r.actions.push(act('Lưu danh bạ (.vcf)',{dl:{name:'lien-he.vcf',mime:'text/vcard',data:t}}));
    if(mails[0])r.actions.push(act('Gửi email',{href:'mailto:'+mails[0]}));
    if(tels[0])r.actions.push(act('Mở Zalo',{href:'https://zalo.me/'+zaloPhone(tels[0])}));
    r.title=fn||'Danh bạ';return fin();
  }
  if(/^MECARD:/i.test(tt)){
    var mc=kvSemi(tt.slice(7)),nm=(mc.N||'').split(',').reverse().join(' ').trim();
    r.kind='contact';r.label='Danh bạ';r.icon='👤';
    if(nm)r.rows.push(kv('Họ tên',nm));if(mc.TEL)r.rows.push(kv('Điện thoại',mc.TEL));if(mc.EMAIL)r.rows.push(kv('Email',mc.EMAIL));
    if(mc.ORG)r.rows.push(kv('Công ty',mc.ORG));if(mc.ADR)r.rows.push(kv('Địa chỉ',mc.ADR));if(mc.URL)r.rows.push(kv('Website',mc.URL));
    if(mc.TEL)r.actions.push(act('Gọi',{href:'tel:'+cleanPhone(mc.TEL),primary:true}));
    r.actions.push(act('Lưu danh bạ (.vcf)',{dl:{name:'lien-he.vcf',mime:'text/vcard',data:mkVcard(nm||'Liên hệ',mc.TEL?[mc.TEL]:[],mc.EMAIL?[mc.EMAIL]:[],mc.ORG,mc.ADR,mc.URL)}}));
    if(mc.EMAIL)r.actions.push(act('Gửi email',{href:'mailto:'+mc.EMAIL}));
    if(mc.TEL)r.actions.push(act('Mở Zalo',{href:'https://zalo.me/'+zaloPhone(mc.TEL)}));
    r.title=nm||'Danh bạ';return fin();
  }
  /* 4. Sự kiện lịch */
  if(/^BEGIN:V(EVENT|CALENDAR)/i.test(tt)){
    var E=vlines(tt);r.kind='event';r.label='Sự kiện lịch';r.icon='📅';
    var sm=vget(E,'SUMMARY')[0];if(sm)r.rows.push(kv('Sự kiện',sm));
    var ds=vget(E,'DTSTART')[0],de=vget(E,'DTEND')[0];if(ds)r.rows.push(kv('Bắt đầu',when(ds)));if(de)r.rows.push(kv('Kết thúc',when(de)));
    var lc=vget(E,'LOCATION')[0];if(lc)r.rows.push(kv('Địa điểm',lc));var dc=vget(E,'DESCRIPTION')[0];if(dc)r.rows.push(kv('Mô tả',dc));
    r.actions.push(act('Lưu vào lịch (.ics)',{dl:{name:'su-kien.ics',mime:'text/calendar',data:t},primary:true}));
    r.title=sm||'Sự kiện';return fin();
  }
  /* 5. Email */
  if(/^mailto:/i.test(tt)||/^MATMSG:/i.test(tt)){
    var to,sub='',body='';
    if(/^MATMSG:/i.test(tt)){var mm=kvSemi(tt.slice(7));to=mm.TO||'';sub=mm.SUB||'';body=mm.BODY||'';}
    else{var u2=tt.slice(7),q=u2.indexOf('?');try{to=decodeURIComponent(u2.slice(0,q<0?u2.length:q));}catch(e){to=u2.slice(0,q<0?u2.length:q);}
      if(q>=0){var sp=new URLSearchParams(u2.slice(q+1));sub=sp.get('subject')||'';body=sp.get('body')||'';}}
    r.kind='email';r.label='Email';r.icon='✉️';r.rows.push(kv('Gửi tới',to));if(sub)r.rows.push(kv('Tiêu đề',sub));if(body)r.rows.push(kv('Nội dung',body));
    var h='mailto:'+to+((sub||body)?'?'+(sub?'subject='+encodeURIComponent(sub):'')+(sub&&body?'&':'')+(body?'body='+encodeURIComponent(body):''):'');
    r.actions.push(act('Soạn email',{href:h,primary:true}));r.actions.push(act('Sao chép địa chỉ',{copy:to}));r.title=to;return fin();
  }
  /* 6. Điện thoại / SMS */
  if(/^tel:/i.test(tt)){
    var p=tt.slice(4);r.kind='phone';r.label='Số điện thoại';r.icon='📞';r.rows.push(kv('Số',p));
    r.actions.push(act('Gọi',{href:'tel:'+cleanPhone(p),primary:true}),act('Nhắn tin',{href:'sms:'+cleanPhone(p)}),act('Mở Zalo',{href:'https://zalo.me/'+zaloPhone(p)}),act('Sao chép',{copy:p}));
    r.title=p;return fin();
  }
  if(/^(sms|smsto|mms|mmsto):/i.test(tt)){
    var s=tt.replace(/^[a-z]+:/i,''),num=s,bd='',qi=s.indexOf('?body='),ci;
    if(qi>=0){num=s.slice(0,qi);try{bd=decodeURIComponent(s.slice(qi+6));}catch(e){bd=s.slice(qi+6);}}
    else if((ci=s.indexOf(':'))>=0){num=s.slice(0,ci);bd=s.slice(ci+1);}
    r.kind='sms';r.label='Tin nhắn SMS';r.icon='💬';r.rows.push(kv('Gửi tới',num));if(bd)r.rows.push(kv('Nội dung',bd));
    r.actions.push(act('Soạn tin nhắn',{href:'sms:'+cleanPhone(num)+(bd?'?body='+encodeURIComponent(bd):''),primary:true}),act('Gọi',{href:'tel:'+cleanPhone(num)}));
    r.title='SMS tới '+num;return fin();
  }
  /* 7. Vị trí */
  if((m=/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i.exec(tt))){
    r.kind='geo';r.label='Vị trí';r.icon='📍';r.rows.push(kv('Vĩ độ',m[1]),kv('Kinh độ',m[2]));
    r.actions.push(act('Mở bản đồ',{href:'https://www.google.com/maps?q='+m[1]+','+m[2],primary:true}),act('Sao chép toạ độ',{copy:m[1]+','+m[2]}));
    r.title='Vị trí '+m[1]+', '+m[2];return fin();
  }
  /* 8. Liên kết */
  if(/^https?:\/\/\S+$/i.test(tt)||/^www\.\S+\.\S+$/i.test(tt)){
    var href=/^www\./i.test(tt)?'https://'+tt:tt,host='';
    try{host=new URL(href).hostname;}catch(e){}
    r.kind='url';r.label='Liên kết';r.icon='🔗';
    if(/(^|\.)zalo\.me$/i.test(host)){r.label='Liên kết Zalo';r.icon='💙';}
    r.rows.push(kv('Tên miền',host||'—'),kv('Địa chỉ đầy đủ',href));
    var warn=[];
    if(/^http:\/\//i.test(href))warn.push('Liên kết không mã hóa (http).');
    if(/^xn--|\.xn--/i.test(host))warn.push('Tên miền chứa ký tự lạ, có thể là trang giả mạo.');
    if(/^\d{1,3}(\.\d{1,3}){3}$/.test(host))warn.push('Địa chỉ là số IP, không phải tên miền.');
    if(SHORT.test(host))warn.push('Liên kết rút gọn: không thấy được trang đích thật.');
    r.note=warn.length?warn.join(' ')+' Chỉ mở nếu bạn tin tưởng nguồn mã.':'Kiểm tra tên miền trước khi mở, tránh trang giả mạo.';r.noteKind=warn.length?'warn':'info';
    r.actions.push(act('Mở liên kết',{href:href,primary:true}),act('Sao chép',{copy:href}));r.title=host||href;return fin();
  }
  var sch=/^([a-z][a-z0-9+.\-]{1,20}):/i.exec(tt);
  if(sch&&BLOCKED.test(sch[1])){
    r.kind='unsafe';r.label='Nội dung không an toàn';r.icon='⚠️';r.rows.push(kv('Nội dung',t));
    r.note='Mã này chứa lệnh/đường dẫn dạng “'+sch[1].toLowerCase()+':” có thể gây hại nên app không cho mở. Chỉ hiển thị dưới dạng văn bản.';r.noteKind='warn';
    r.actions.push(act('Sao chép',{copy:t}));r.title=tt.slice(0,80);return fin();
  }
  if(/^[a-z][a-z0-9+.\-]{1,20}:\/\/\S+$/i.test(tt)){
    r.kind='applink';r.label='Liên kết ứng dụng';r.icon='🧩';r.rows.push(kv('Địa chỉ',tt));
    r.note='Liên kết mở một ứng dụng khác trên máy. Chỉ mở nếu bạn tin tưởng nguồn mã.';r.noteKind='warn';
    r.actions.push(act('Mở',{href:tt,app:true,primary:true}),act('Sao chép',{copy:tt}));r.title=tt;return fin();
  }
  /* 9. Mã vạch sản phẩm */
  var digits=/^\d+$/.test(tt);
  if(digits&&(fmt==='ean_13'||fmt==='ean_8'||fmt==='upc_a'||fmt==='upc_e'||(!is2D(fmt)&&[8,12,13,14].indexOf(tt.length)>=0&&fmt!=='code_128'&&fmt!=='code_39'))){
    var isbn=tt.length===13&&/^97[89]/.test(tt);
    r.kind=isbn?'isbn':'product';r.label=isbn?'Sách (ISBN)':'Mã vạch sản phẩm';r.icon=isbn?'📚':'🏷️';
    r.rows.push(kv('Mã',tt),kv('Loại',fmtName(fmt)||'—'));
    if(fmt!=='upc_e'){var okc=gtinOk(tt);r.rows.push(kv('Số kiểm tra',okc?'Hợp lệ':'Không hợp lệ'));
      if(!okc){r.note='Số kiểm tra cuối không khớp — có thể quét sai hoặc mã in lỗi, hãy quét lại.';r.noteKind='warn';}}
    if(tt.length===13&&!isbn){var cty=gs1Country(tt);if(cty){r.rows.push(kv('Tiền tố GS1',tt.slice(0,3)+' · '+cty));if(!r.note)r.note='Tiền tố GS1 cho biết nơi đăng ký mã, không chắc là nơi sản xuất.';}}
    r.actions.push(act('Sao chép mã',{copy:tt,primary:true}),act('Tra cứu trên Google',{href:'https://www.google.com/search?q='+encodeURIComponent((isbn?'ISBN ':'')+tt)}));
    r.title=tt;return fin();
  }
  /* 10. Email / điện thoại viết thẳng */
  if(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(tt)){
    r.kind='email';r.label='Địa chỉ email';r.icon='✉️';r.rows.push(kv('Email',tt));
    r.actions.push(act('Soạn email',{href:'mailto:'+tt,primary:true}),act('Sao chép',{copy:tt}));r.title=tt;return fin();
  }
  if(/^\+?\d[\d .\-()]{7,16}\d$/.test(tt)&&is2D(fmt)){
    r.kind='phone';r.label='Số điện thoại';r.icon='📞';r.rows.push(kv('Số',tt));
    r.actions.push(act('Gọi',{href:'tel:'+cleanPhone(tt),primary:true}),act('Nhắn tin',{href:'sms:'+cleanPhone(tt)}),act('Mở Zalo',{href:'https://zalo.me/'+zaloPhone(tt)}),act('Sao chép',{copy:tt}));
    r.title=tt;return fin();
  }
  /* 11. Văn bản / mã vạch khác */
  r.kind=is2D(fmt)?'text':'barcode';
  r.label=is2D(fmt)?'Văn bản':'Mã vạch';r.icon=is2D(fmt)?'📝':'▮▯▮';
  r.rows.push(kv('Nội dung',t));
  r.actions.push(act('Sao chép',{copy:t,primary:true}));
  if(tt&&tt.length<=100&&tt.indexOf('\n')<0)r.actions.push(act('Tìm trên Google',{href:'https://www.google.com/search?q='+encodeURIComponent(tt)}));
  r.title=tt.slice(0,80)||'(trống)';
  return fin();
}
root.QuetMaParse={parse:parse,crc16:crc16,normFmt:normFmt,fmtName:fmtName,gtinOk:gtinOk,esc:esc};
})(typeof window!=='undefined'?window:globalThis);

/* ============ PHẦN 2: MÀN HÌNH QUÉT (camera) + KHAY KẾT QUẢ + LỊCH SỬ QUÉT ============ */
(function(){
'use strict';
var P=window.QuetMaParse,esc=P.esc;
var scanner=typeof document!=='undefined'&&document.getElementById('scanner');
if(!scanner)return;
var $=function(s){return document.querySelector(s);};
var video=$('#scVideo'),frame=$('#scFrame'),msgEl=$('#scMsg'),resEl=$('#scResult'),bs=$('#bs'),histEl=$('#scHist');
var stream=null,track=null,running=false,paused=false,busy=false,rafId=0,lastT=0,frameN=0,token=0,facing='environment',torchOn=false,wasRunning=false;
var detector=null,detReady=false,zxReader=null,zxHints=null,actx=null,work=document.createElement('canvas'),curActs=[],beepOn=true;
function toastX(t){if(typeof toast==='function')toast(t);}
function when(t){try{return new Date(t).toLocaleString((window.QM_LOC?QM_LOC():'vi-VN'),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return'';}}

/* ---------- lớp màn hình + nút Back của Android ----------
   Mỗi lớp (màn quét, khay kết quả) đẩy 1 mục vào lịch sử trình duyệt; nút Back đóng lớp trên cùng thay vì thoát app. */
var layers=[];
/* Mỗi lớp ghi độ sâu vào history.state; popstate chỉ đóng các lớp sâu hơn mục lịch sử vừa quay về → không phụ thuộc thời điểm sự kiện tới */
function pushLayer(n,fn){layers.push({n:n,close:fn});try{history.pushState({qm:layers.length},'');}catch(e){}}
function hasLayer(n){return layers.some(function(l){return l.n===n;});}
function popLayer(){var l=layers.pop();if(l&&l.close)l.close();}
/* Đóng bằng nút trên màn hình: đóng NGAY, rồi gỡ mục lịch sử tương ứng */
function closeTop(){
  if(!layers.length)return;
  popLayer();
  try{history.back();}catch(e){}
}
/* Nút Back của Android → popstate → đóng các lớp trên cùng */
window.addEventListener('popstate',function(){
  var d=(history.state&&history.state.qm)||0;
  while(layers.length>d)popLayer();
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeTop();});

/* ---------- giải mã ---------- */
function initDecoders(){
  if(window.ZXing&&!zxReader){
    try{
      var Z=ZXing,B=Z.BarcodeFormat,f=[B.QR_CODE,B.DATA_MATRIX,B.AZTEC,B.PDF_417,B.EAN_13,B.EAN_8,B.UPC_A,B.UPC_E,B.CODE_128,B.CODE_39,B.CODE_93,B.ITF,B.CODABAR,B.RSS_14].filter(function(x){return x!==undefined;});
      zxHints=new Map();zxHints.set(Z.DecodeHintType.POSSIBLE_FORMATS,f);zxHints.set(Z.DecodeHintType.TRY_HARDER,true);
      zxReader=new Z.MultiFormatReader();
    }catch(e){zxReader=null;}
  }
  if(!detReady){detReady=true;
    if('BarcodeDetector' in window){
      try{BarcodeDetector.getSupportedFormats().then(function(fs){if(fs&&fs.length)detector=new BarcodeDetector({formats:fs});}).catch(function(){});}catch(e){}
    }
  }
}
function zxDecode(cv,invert){
  if(!zxReader)return null;
  try{
    var Z=ZXing,src=new Z.HTMLCanvasElementLuminanceSource(cv);
    if(invert){if(!Z.InvertedLuminanceSource)return null;src=new Z.InvertedLuminanceSource(src);}
    var res=zxReader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(src)),zxHints);
    var txt=res.getText();if(!txt)return null;
    return{text:txt,format:P.normFmt(Z.BarcodeFormat[res.getBarcodeFormat()])};
  }catch(e){return null;}
}
function jsDecode(cv,invert){
  if(!window.jsQR)return null;
  try{
    var d=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height);
    var q=jsQR(d.data,d.width,d.height,{inversionAttempts:invert?'attemptBoth':'dontInvert'});
    return q&&q.data?{text:q.data,format:'qr_code'}:null;
  }catch(e){return null;}
}
/* Thứ tự: BarcodeDetector của máy → jsQR (QR, nhanh + chắc) → ZXing (mã vạch, Data Matrix, Aztec, PDF417, QR dự phòng) */
function decodeCanvas(cv,useNative,useZx,inv){
  var p=Promise.resolve(null);
  if(useNative&&detector)p=detector.detect(cv).then(function(a){return a&&a.length&&a[0].rawValue?{text:a[0].rawValue,format:P.normFmt(a[0].format)}:null;}).catch(function(){return null;});
  return p.then(function(r){
    if(r)return r;
    r=jsDecode(cv,inv);if(r)return r;
    if(useZx){r=zxDecode(cv,false);if(r)return r;if(inv)r=zxDecode(cv,true);}
    return r||null;
  });
}
function drawTo(src,sw,sh,maxSide){var k=Math.min(1,maxSide/Math.max(sw,sh));work.width=Math.max(1,Math.round(sw*k));work.height=Math.max(1,Math.round(sh*k));
  var c=work.getContext('2d',{willReadFrequently:true});c.fillStyle='#fff';c.fillRect(0,0,work.width,work.height);c.drawImage(src,0,0,work.width,work.height);return work;}

/* ---------- camera ---------- */
function setMsg(html,withBtns){
  msgEl.innerHTML=html?html+(withBtns?'<div class="btns"><button class="btn primary" data-m="retry" type="button">Thử lại</button><button class="btn" data-m="pick" type="button">Chọn ảnh</button></div>':''):'';
}
msgEl.addEventListener('click',function(e){var b=e.target.closest('button[data-m]');if(!b)return;if(b.dataset.m==='retry'){setMsg('');startCamera();}else $('#scFile').click();});
function setUI(){
  frame.classList.toggle('paused',paused||!running);
  $('#scHintTxt').hidden=!running;
  if(!running){$('#scTorch').hidden=true;$('#scSwitch').hidden=true;}
}
function camError(e){
  var n=e&&e.name||'';
  if(n==='NotAllowedError'||n==='SecurityError')setMsg('<b>Chưa được cấp quyền camera.</b><br>Vào Cài đặt → Ứng dụng → QR Manager → Quyền → Camera → Cho phép, rồi bấm “Thử lại”. Bạn vẫn có thể quét từ ảnh.',true);
  else if(n==='NotFoundError'||n==='OverconstrainedError')setMsg('<b>Không tìm thấy camera</b> trên thiết bị này. Bạn có thể quét từ ảnh.',true);
  else if(n==='NotReadableError'||n==='AbortError')setMsg('<b>Không mở được camera</b> (có thể app khác đang dùng). Hãy tắt app đó rồi thử lại.',true);
  else setMsg('<b>Không bật được camera:</b> '+esc((e&&e.message)||n||'lỗi không rõ'),true);
}
function getStream(){
  var md=navigator.mediaDevices;
  return md.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}}}).catch(function(e){
    if(e&&(e.name==='OverconstrainedError'||e.name==='NotFoundError'))return md.getUserMedia({audio:false,video:true});
    throw e;});
}
function startCamera(){
  if(running)return Promise.resolve();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setMsg('<b>Thiết bị hoặc trình duyệt này không hỗ trợ camera</b> (cần mở bằng https hoặc trong app). Bạn vẫn có thể quét từ ảnh.',true);return Promise.resolve();}
  setMsg('');initDecoders();
  try{var AC=window.AudioContext||window.webkitAudioContext;if(AC&&!actx)actx=new AC();if(actx&&actx.resume)actx.resume();}catch(e){}
  var my=++token;
  return getStream().then(function(s){
    if(my!==token){s.getTracks().forEach(function(t){t.stop();});return;}
    stream=s;track=s.getVideoTracks()[0];video.srcObject=s;
    video.style.transform=facing==='user'?'scaleX(-1)':'';
    running=true;paused=false;busy=false;frameN=0;frame.classList.remove('ok');setUI();
    var pl=video.play();if(pl&&pl.catch)pl.catch(function(){});
    try{var caps=track.getCapabilities?track.getCapabilities():{};$('#scTorch').hidden=!caps.torch;torchOn=false;$('#scTorch').classList.remove('on');}catch(e){}
    navigator.mediaDevices.enumerateDevices().then(function(d){$('#scSwitch').hidden=d.filter(function(x){return x.kind==='videoinput';}).length<2;}).catch(function(){});
    loop();
  }).catch(function(e){if(my===token){running=false;setUI();camError(e);}});
}
function stopCamera(){
  token++;running=false;paused=false;busy=false;cancelAnimationFrame(rafId);
  if(stream){stream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});}
  stream=null;track=null;try{video.pause();}catch(e){}video.srcObject=null;setUI();
}
function loop(){
  if(!running)return;
  rafId=requestAnimationFrame(function(t){
    if(!running)return;
    if(!paused&&!busy&&t-lastT>=100&&video.readyState>=2&&video.videoWidth){
      lastT=t;busy=true;frameN++;
      var cv=drawTo(video,video.videoWidth,video.videoHeight,960);
      var native=!!detector,zx=!native||frameN%2===0,inv=frameN%4===0;
      decodeCanvas(cv,native,zx,inv).then(function(r){busy=false;if(r&&running&&!paused)found(r.text,r.format);}).catch(function(){busy=false;});
    }
    loop();
  });
}
function resumeScan(){
  frame.classList.remove('ok');paused=false;busy=false;
  if(running){try{var p=video.play();if(p&&p.catch)p.catch(function(){});}catch(e){}setUI();}else startCamera();
}

/* ---------- mở / đóng màn quét ---------- */
function openScanner(){
  if(hasLayer('scanner'))return;
  scanner.hidden=false;setMsg('');pushLayer('scanner',hideScanner);setUI();startCamera();
}
function hideScanner(){stopCamera();scanner.hidden=true;setMsg('');}
$('#scOpen').addEventListener('click',openScanner);
$('#scClose').addEventListener('click',closeTop);
$('#scSwitch').addEventListener('click',function(){facing=facing==='environment'?'user':'environment';stopCamera();startCamera();});
$('#scTorch').addEventListener('click',function(){
  if(!track)return;torchOn=!torchOn;var b=$('#scTorch');
  track.applyConstraints({advanced:[{torch:torchOn}]}).then(function(){b.classList.toggle('on',torchOn);}).catch(function(){torchOn=false;b.classList.remove('on');toastX('Máy không bật được đèn.');});
});
$('#scPick').addEventListener('click',function(){$('#scFile').value='';$('#scFile').click();});
$('#scFile').addEventListener('change',function(){scanFile(this.files&&this.files[0]);});

/* ---------- âm báo ---------- */
try{beepOn=localStorage.getItem('qr-manager-scan-beep')!=='0';}catch(e){}
function beepUI(){var b=$('#scBeepBtn');b.classList.toggle('off',!beepOn);b.setAttribute('aria-pressed',String(beepOn));}
$('#scBeepBtn').addEventListener('click',function(){beepOn=!beepOn;try{localStorage.setItem('qr-manager-scan-beep',beepOn?'1':'0');}catch(e){}beepUI();toastX(beepOn?'Đã bật rung và tiếng bíp.':'Đã tắt rung và tiếng bíp.');});
beepUI();
function feedback(){
  if(!beepOn)return;
  try{if(navigator.vibrate)navigator.vibrate(70);}catch(e){}
  try{if(!actx)return;var o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=1000;g.gain.value=.15;o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.12);}catch(e){}
}

/* ---------- quét xong → khay kết quả ---------- */
function found(text,format){
  if(hasLayer('sheet'))return;
  paused=true;try{video.pause();}catch(e){}frame.classList.add('ok');setUI();feedback();
  var item={text:text,fmt:format,time:Date.now()};histAdd(item);showSheet(item,true);
}
function safeHref(a){return /^(https?|tel|sms|mailto):/i.test(a.href)||(a.app===true&&!/^(javascript|data|vbscript|file|blob|about|content|intent):/i.test(a.href));}
function renderResult(item,fromScanner){
  var r=P.parse(item.text,item.fmt);curActs=r.actions;
  var h='<div class="sc-head"><div class="sc-ic">'+esc(r.icon)+'</div><div><b>'+esc(r.label)+'</b><div class="hint">'+esc(P.fmtName(item.fmt))+' · '+esc(when(item.time))+'</div></div></div>';
  if(r.rows.length)h+='<div class="sc-rows">'+r.rows.map(function(x){return'<div class="sc-row"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>';}).join('')+'</div>';
  if(r.note)h+='<div class="msg '+(r.noteKind==='warn'?'warn':'info')+'">'+esc(r.note)+'</div>';
  var sec=r.actions.filter(function(a){return !a.primary;}).length,seen=0;
  var acts=r.actions.map(function(a,i){
    var cl='btn'+(a.primary?' primary':'');
    if(!a.primary){seen++;if(seen===sec&&sec%2===1)cl+=' wide';}
    return a.href&&safeHref(a)?'<a class="'+cl+'" href="'+esc(a.href)+'" target="_blank" rel="noopener noreferrer">'+esc(a.label)+'</a>':'<button class="'+cl+'" data-i="'+i+'" type="button">'+esc(a.label)+'</button>';
  }).join('');
  h+='<div class="sc-acts">'+acts+(fromScanner?'<button class="btn ghost" data-close="1" type="button">Quét tiếp</button>':'<button class="btn ghost" data-close="1" type="button">Đóng</button>')+'</div>';
  h+='<details class="sc-raw"><summary>Nội dung gốc</summary><pre>'+esc(item.text)+'</pre></details>';
  resEl.innerHTML=h;
}
function showSheet(item,fromScanner){
  if(hasLayer('sheet'))return;
  renderResult(item,fromScanner);bs.hidden=false;
  var p=bs.querySelector('.bs-panel');p.style.transform='';p.scrollTop=0;
  pushLayer('sheet',hideSheet);
  requestAnimationFrame(function(){requestAnimationFrame(function(){bs.classList.add('open');});});
}
function hideSheet(){
  bs.classList.remove('open');
  setTimeout(function(){if(!bs.classList.contains('open'))bs.hidden=true;},300);
  if(hasLayer('scanner'))resumeScan();
}
function copyText(s){
  function fb(){try{var ta=document.createElement('textarea');ta.value=s;ta.style.cssText='position:fixed;opacity:0;left:-999px';document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');ta.remove();toastX(ok?'Đã sao chép.':'Không sao chép được.');}catch(e){toastX('Không sao chép được.');}}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(function(){toastX('Đã sao chép.');},fb);else fb();
}
resEl.addEventListener('click',function(e){
  if(e.target.closest('[data-close]')){closeTop();return;}
  var b=e.target.closest('button[data-i]');if(!b)return;var a=curActs[+b.dataset.i];if(!a)return;
  if(a.copy!=null)copyText(a.copy);
  else if(a.dl){var blob=new Blob([a.dl.data],{type:a.dl.mime+';charset=utf-8'});
    if(typeof download==='function')download(blob,a.dl.name);else{var l=document.createElement('a');l.href=URL.createObjectURL(blob);l.download=a.dl.name;document.body.appendChild(l);l.click();setTimeout(function(){l.remove();},3000);}}
});
bs.addEventListener('click',function(e){if(e.target===bs)closeTop();});
/* vuốt xuống ở BẤT KỲ chỗ nào trên khay (tay nắm hoặc nội dung đang ở đầu trang) để đóng; vuốt lên/xuống trong nội dung vẫn cuộn bình thường.
   Áp dụng cho cả khay kết quả quét và khay Cài đặt. */
(function(){
  function wire(p){
    var y0=0,x0=0,dy=0,t0=0,drag=false,tracking=false,fromGrab=false;
    function reset(){p.style.transition='';p.style.transform='';}
    p.addEventListener('touchstart',function(e){
      if(e.touches.length!==1){tracking=false;return;}
      var t=e.touches[0];y0=t.clientY;x0=t.clientX;dy=0;t0=Date.now();drag=false;tracking=true;
      fromGrab=!!e.target.closest('.bs-grab');
      if(e.target.closest('input[type=range],input[type=color]'))tracking=false;
    },{passive:true});
    p.addEventListener('touchmove',function(e){
      if(!tracking)return;
      var t=e.touches[0],d=t.clientY-y0;
      if(!drag){
        /* chỉ bắt đầu kéo khi: vuốt xuống, chủ yếu theo chiều dọc, và nội dung đang ở đầu (hoặc bắt từ tay nắm) */
        if(d>6&&Math.abs(d)>Math.abs(t.clientX-x0)&&(fromGrab||p.scrollTop<=0)){drag=true;y0=t.clientY;d=0;p.style.transition='none';}
        else return;
      }
      dy=Math.max(0,d);p.style.transform='translateY('+dy+'px)';
      if(e.cancelable)e.preventDefault();
    },{passive:false});
    function end(){
      if(!tracking)return;tracking=false;
      if(!drag)return;drag=false;
      var fast=dy>40&&(Date.now()-t0)<250;
      p.style.transition='';
      if(dy>90||fast){closeTop();p.style.transform='';}else p.style.transform='';
    }
    p.addEventListener('touchend',end);
    p.addEventListener('touchcancel',function(){if(drag){drag=false;reset();}tracking=false;});
  }
  [].forEach.call(document.querySelectorAll('.bs-panel'),wire);
})();

/* ---------- quét từ ảnh ---------- */
function scanFile(file){
  if(!file)return;
  setMsg('Đang đọc ảnh…');initDecoders();
  var url=URL.createObjectURL(file),img=new Image();
  img.onload=function(){
    var sizes=[1600,1000,640],i=0;
    (function next(){
      if(i>=sizes.length){URL.revokeObjectURL(url);setMsg('<b>Không tìm thấy mã trong ảnh.</b><br>Hãy thử ảnh rõ nét hơn, chụp gần, đủ sáng và không bị cắt mất góc của mã.',true);return;}
      var cv=drawTo(img,img.naturalWidth,img.naturalHeight,sizes[i++]);
      decodeCanvas(cv,true,true,true).then(function(r){if(r){URL.revokeObjectURL(url);setMsg('');found(r.text,r.format);}else setTimeout(next,0);});
    })();
  };
  img.onerror=function(){URL.revokeObjectURL(url);setMsg('<b>Không đọc được file ảnh này.</b>',true);};
  img.src=url;
}

/* ---------- lịch sử quét (nằm trong màn Lịch sử → Đã quét) ---------- */
var HK='qr-manager-scan-v1',HMAX=50;
function histLoad(){try{var a=JSON.parse(localStorage.getItem(HK)||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}}
function histSave(a){try{localStorage.setItem(HK,JSON.stringify(a));}catch(e){}}
function histAdd(it){var a=histLoad().filter(function(x){return x.text!==it.text;});a.unshift(it);histSave(a.slice(0,HMAX));histRender();}
function histRender(){
  var a=histLoad();$('#scHistClear').disabled=!a.length;
  if(!a.length){histEl.innerHTML='<div class="hint" style="padding:26px 6px;text-align:center">Chưa quét mã nào. Chạm nút <b>Quét mã</b> ở giữa thanh dưới để bắt đầu.</div>';return;}
  histEl.innerHTML=a.map(function(x,i){var r=P.parse(x.text,x.fmt);
    return'<div class="hi"><div class="th">'+esc(r.icon)+'</div><div class="tx"><div class="tt">'+esc(String(r.title).replace(/\s+/g,' ').slice(0,90))+'</div><div class="sb">'+esc(r.label)+' · '+esc(P.fmtName(x.fmt))+' · '+esc(when(x.time))+'</div></div>'
      +'<div class="bt"><button class="btn small primary" data-act="view" data-i="'+i+'" type="button">Xem</button><button class="btn small" data-act="del" data-i="'+i+'" type="button">Xóa</button></div></div>';}).join('');
}
histEl.addEventListener('click',function(e){
  var b=e.target.closest('button[data-act]');if(!b)return;var a=histLoad(),x=a[+b.dataset.i];if(!x)return;
  if(b.dataset.act==='view')showSheet(x,false);
  else{a.splice(+b.dataset.i,1);histSave(a);histRender();}
});
$('#scHistClear').addEventListener('click',function(){if(confirm('Xóa toàn bộ lịch sử quét?')){try{localStorage.removeItem(HK);}catch(e){}histRender();}});
/* chuyển Đã tạo / Đã quét */
document.querySelector('#p4 .seg').addEventListener('click',function(e){
  var b=e.target.closest('button[data-seg]');if(!b)return;
  [].forEach.call(this.querySelectorAll('button'),function(x){x.classList.toggle('on',x===b);});
  $('#segMade').hidden=b.dataset.seg!=='made';$('#segScanned').hidden=b.dataset.seg!=='scanned';
});

/* ---------- vòng đời: thu nhỏ app → tắt camera, mở lại → bật lại ---------- */
document.addEventListener('visibilitychange',function(){
  if(document.hidden){if(running){wasRunning=!paused;stopCamera();}}
  else if(wasRunning){wasRunning=false;if(hasLayer('scanner')&&!hasLayer('sheet'))startCamera();}
});
window.addEventListener('pagehide',stopCamera);
window.QMLayers={push:pushLayer,closeTop:closeTop,has:hasLayer};
window.addEventListener('qm-lang',histRender);
window.QuetMa={open:openScanner,found:found,show:showSheet,stop:stopCamera,close:closeTop,layers:function(){return layers.map(function(l){return l.n;});}};
setUI();histRender();
})();
