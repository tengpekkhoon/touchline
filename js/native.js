// Phone behaviour and native plugins. Inside the Capacitor app this talks to the native plugins
// (Haptics, Share, Filesystem, StatusBar, App, Keyboard, ScreenOrientation) through window.Capacitor;
// in a browser every call falls back to the web equivalent, so the same code runs in both.
(function () {
  const FM = window.FM, UI = FM.UI;
  const N = (FM.Native = {});
  const cap = () => window.Capacitor;
  N.isNative = () => !!(cap() && cap().isNativePlatform && cap().isNativePlatform());
  N.platform = () => (N.isNative() ? cap().getPlatform() : 'web');
  const plug = (name) => (N.isNative() && cap().Plugins && cap().Plugins[name]) || null;
  N.plug = plug;
  const quiet = (p) => { if (p && p.catch) p.catch(() => {}); };

  // ---------- Haptics ----------
  // kind: 'light' (button taps), 'medium', 'goal' (our goal), 'bad'
  N.haptic = function (kind = 'light') {
    if (FM.S && FM.S.settings && FM.S.settings.noHaptics) return;
    const H = plug('Haptics');
    if (H) {
      if (kind === 'goal') quiet(H.notification({ type: 'SUCCESS' }));
      else if (kind === 'bad') quiet(H.notification({ type: 'ERROR' }));
      else quiet(H.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' }));
      return;
    }
    // Browsers refuse (and log an error for) vibration before the user has touched the page
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    if (navigator.vibrate) try { navigator.vibrate(kind === 'goal' ? [60, 40, 120] : kind === 'medium' ? 20 : 8); } catch (x) {}
  };

  // ---------- Share sheet / save a file ----------
  const toBase64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  // { blob | bytes, name, type, title }. Resolves to 'shared' | 'saved' | 'cancelled'.
  N.shareFile = async function (o) {
    const blob = o.blob || new Blob([o.bytes], { type: o.type || 'application/octet-stream' });
    const F = plug('Filesystem'), Sh = plug('Share');
    if (F && Sh) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await F.writeFile({ path: o.name, data: toBase64(bytes), directory: 'CACHE' });
      const { uri } = await F.getUri({ path: o.name, directory: 'CACHE' });
      try { await Sh.share({ title: o.title, files: [uri], dialogTitle: o.title }); return 'shared'; } catch (e) { return 'cancelled'; }
    }
    const file = new File([blob], o.name, { type: blob.type });
    try {
      if (o.preferShare !== false && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: o.title }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = o.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  };
  // Pick a file (backup import). Resolves to Uint8Array or null.
  N.pickFile = function (accept) {
    return new Promise((res) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept || '';
      inp.style.display = 'none';
      inp.addEventListener('change', async () => { const f = inp.files && inp.files[0]; inp.remove(); res(f ? new Uint8Array(await f.arrayBuffer()) : null); });
      document.body.appendChild(inp);
      inp.click();
    });
  };

  // ---------- Status bar follows the theme ----------
  const BG = { dark: '#0a0e14', light: '#eef1f6' };
  N.theme = function (t) {
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', BG[t] || BG.dark);
    const SB = plug('StatusBar');
    if (!SB) return;
    quiet(SB.setStyle({ style: t === 'light' ? 'LIGHT' : 'DARK' })); // DARK = light text, for dark backgrounds
    if (N.platform() === 'android') { quiet(SB.setOverlaysWebView({ overlay: false })); quiet(SB.setBackgroundColor({ color: BG[t] || BG.dark })); }
  };
  const applyTheme = UI.applyTheme;
  UI.applyTheme = function () { applyTheme(); N.theme(document.documentElement.dataset.theme); };

  // ---------- Back button (Android hardware back, browser back) ----------
  // Closes the top-most layer. Returns false when there is nothing left to close (leave the app).
  UI.back = function () {
    if (document.querySelector('.simov')) return true; // simulating: ignore
    if (document.querySelector('.sheet-wrap')) { UI.closeSheet(); return true; }
    if (document.getElementById('matchOv')) { // live match: back pauses rather than abandoning it
      const MV = FM.MatchView;
      if (MV.st && !MV.st.paused && !document.querySelector('#matchOv .prompt')) UI.acts.mPause();
      return true;
    }
    if (document.getElementById('postOv')) return true; // the result must be confirmed with Continue
    const ngBack = document.querySelector('.title [data-act=ngBack]');
    if (ngBack) { ngBack.click(); return true; }
    if (document.getElementById('main') && UI.tab !== 'home') { UI.go('home'); return true; }
    return false;
  };

  // ---------- Save when the app goes to the background ----------
  let lastBg = 0;
  N.onBackground = function () {
    if (Date.now() - lastBg < 1500) return;
    lastBg = Date.now();
    const MV = FM.MatchView;
    if (document.getElementById('matchOv') && MV && MV.st && !MV.st.paused) UI.acts.mPause();
    if (FM.S && FM.S.user && document.getElementById('main') && !UI.simBusy) UI.save();
  };

  // ---------- Start-up ----------
  N.init = function () {
    // Browser back: keep one guard entry in history; popping it runs UI.back()
    if (!N.isNative() && window.history && history.pushState) {
      try { history.replaceState({ tl: 0 }, ''); history.pushState({ tl: 1 }, ''); } catch (e) {}
      window.addEventListener('popstate', () => { if (UI.back()) { try { history.pushState({ tl: 1 }, ''); } catch (e) {} } else history.back(); });
    }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') N.onBackground(); });
    window.addEventListener('pagehide', N.onBackground);
    // Keep a focused text field visible above the on-screen keyboard
    document.addEventListener('focusin', (e) => {
      if (e.target.matches && e.target.matches('input, textarea')) setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {} }, 300);
    });
    // Phones play in portrait; tablets may rotate (the layout widens)
    const phone = Math.min(screen.width, screen.height) < 600;
    if (N.isNative()) {
      const App = plug('App');
      if (App) {
        quiet(App.addListener('backButton', () => { if (!UI.back()) quiet(App.minimizeApp()); }));
        quiet(App.addListener('appStateChange', ({ isActive }) => { if (!isActive) N.onBackground(); }));
      }
      const SO = plug('ScreenOrientation');
      if (SO && phone) quiet(SO.lock({ orientation: 'portrait' }));
      const K = plug('Keyboard');
      if (K) quiet(K.setAccessoryBarVisible && K.setAccessoryBarVisible({ isVisible: false }));
      const Splash = plug('SplashScreen');
      if (Splash) setTimeout(() => quiet(Splash.hide()), 150);
      document.documentElement.classList.add('native', 'native-' + N.platform());
    } else if (phone && screen.orientation && screen.orientation.lock && matchMedia('(display-mode: standalone)').matches) {
      quiet(screen.orientation.lock('portrait'));
    }
  };

  // Boot: storage summaries first (the native app reads them from its files), then the title screen
  UI.boot = async function () {
    N.init();
    try { await FM.Save.syncMeta(); } catch (e) {}
    UI.title();
    setTimeout(() => FM.SimRunner && FM.SimRunner.warm(), 1500);
  };
})();
