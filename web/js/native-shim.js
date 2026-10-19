/* Cầu nối cho bản Android (Capacitor): tải file -> lưu + chia sẻ, in -> hộp thoại in của Android.
   Trên trình duyệt thường file này không làm gì. */
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
  var P=C.Plugins||{};
  function blobToB64(b){return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(String(r.result).split(',')[1]);};r.onerror=no;r.readAsDataURL(b);});}
  /* Ghi đè thao tác tải xuống: <a download> không chạy trong WebView */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[download]');
    if(!a||!/^blob:/.test(a.href))return;
    e.preventDefault();e.stopImmediatePropagation();
    var name=a.getAttribute('download')||'qr';
    fetch(a.href).then(function(r){return r.blob();}).then(blobToB64).then(function(b64){
      return P.Filesystem.writeFile({path:name,data:b64,directory:'CACHE'});
    }).then(function(res){
      return P.Share.share({title:name,url:res.uri,dialogTitle:'Lưu / gửi file'});
    }).catch(function(err){ if(err&&/cancel/i.test(String(err.message||err)))return; alert('Không lưu được file: '+(err&&err.message||err)); });
  },true);
  /* In tem: dùng PrintManager của Android qua cầu AndroidPrint (MainActivity) */
  window.print=function(){ if(window.AndroidPrint&&window.AndroidPrint.print)window.AndroidPrint.print(document.title||'Tem QR'); else alert('Thiết bị chưa hỗ trợ in.'); };
})();
