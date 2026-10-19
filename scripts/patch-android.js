// Chạy sau `npx cap add android`: thêm cầu in, ký bản release, đặt số phiên bản.
const fs = require('fs'), path = require('path');
const app = 'android/app';
const appId = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8')).appId; // nguồn duy nhất: capacitor.config.template.json
const javaDir = path.join(app, 'src/main/java', ...appId.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), `package ${appId};

import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final WebView wv = getBridge().getWebView();
        wv.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void print(final String title) {
                runOnUiThread(new Runnable() {
                    @Override public void run() {
                        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                        PrintDocumentAdapter ad = wv.createPrintDocumentAdapter(title);
                        pm.print(title, ad, new PrintAttributes.Builder().build());
                    }
                });
            }
        }, "AndroidPrint");
    }
}
`);

// Quyền camera cho tính năng "Quét mã" (WebView xin quyền qua getUserMedia) + rung khi quét được.
const mp = path.join(app, 'src/main/AndroidManifest.xml');
let mf = fs.readFileSync(mp, 'utf8');
const perms = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.VIBRATE" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />'
];
perms.forEach(p => { if (!mf.includes(p.match(/android:name="([^"]+)"/)[1])) mf = mf.replace(/<application/, p + '\n    <application'); });
fs.writeFileSync(mp, mf);
console.log('Đã thêm quyền camera vào AndroidManifest.xml');

// Google Play (từ 31/08/2026) bắt buộc targetSdk >= 36: kiểm tra và ép nếu template thấp hơn.
const vp = path.join('android', 'variables.gradle');
if (fs.existsSync(vp)) {
  let v = fs.readFileSync(vp, 'utf8');
  v = v.replace(/(targetSdkVersion\s*=\s*)(\d+)/, (m, a, n) => a + Math.max(+n, 36))
       .replace(/(compileSdkVersion\s*=\s*)(\d+)/, (m, a, n) => a + Math.max(+n, 36));
  fs.writeFileSync(vp, v);
  const t = /targetSdkVersion\s*=\s*(\d+)/.exec(v);
  console.log('targetSdkVersion =', t && t[1]);
  if (!t || +t[1] < 36) { console.error('targetSdk < 36: Google Play sẽ từ chối.'); process.exit(1); }
}

// Màu nền cửa sổ / màn chờ khớp với giao diện Sáng/Tối của app (không bị viền đen ở thanh trạng thái, không nháy trắng khi mở).
const resDir = path.join(app, 'src/main/res');
const colorsXml = (c) => `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="qm_window_bg">${c}</color>\n</resources>\n`;
fs.mkdirSync(path.join(resDir, 'values-night'), { recursive: true });
fs.writeFileSync(path.join(resDir, 'values/qm_colors.xml'), colorsXml('#F3F5F9'));
fs.writeFileSync(path.join(resDir, 'values-night/qm_colors.xml'), colorsXml('#0E131B'));
const stp = path.join(resDir, 'values/styles.xml');
if (fs.existsSync(stp)) {
  let st = fs.readFileSync(stp, 'utf8');
  if (!st.includes('qm_window_bg')) {
    st = st.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowBackground">@color/qm_window_bg</item>')
           .replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, '$1\n        <item name="windowSplashScreenBackground">@color/qm_window_bg</item>');
    fs.writeFileSync(stp, st);
  }
  console.log('Đã đặt màu nền cửa sổ theo Sáng/Tối');
}

const gp = path.join(app, 'build.gradle');
let g = fs.readFileSync(gp, 'utf8');
const vc = process.env.VERSION_CODE || '1', vn = process.env.VERSION_NAME || '1.1.0';
g = g.replace(/versionCode\s+\d+/, `versionCode ${vc}`).replace(/versionName\s+"[^"]*"/, `versionName "${vn}"`);
if (process.env.KEYSTORE_FILE) {
  g = g.replace(/buildTypes\s*\{/, `signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE"))
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {`);
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, `$1\n            signingConfig signingConfigs.release`);
}
fs.writeFileSync(gp, g);
console.log('Đã patch Android: versionCode', vc, 'versionName', vn, 'ký:', !!process.env.KEYSTORE_FILE);
