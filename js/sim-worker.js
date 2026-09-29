// Web Worker: simulates matchdays off the main thread so the UI stays responsive.
// Receives the whole world state, runs the same season code as the main thread, and sends the
// updated state back (structured clone keeps shared references intact).
self.window = self;
self.onmessage = function (e) {
  const d = e.data;
  if (d.type === 'init') {
    try { importScripts(...d.scripts); self.postMessage({ type: 'ready' }); } catch (err) { self.postMessage({ type: 'error', message: 'init: ' + (err && err.message) }); }
    return;
  }
  if (d.type !== 'run') return;
  const FM = self.FM, Sea = FM.Season;
  FM.S = FM.Save.relink(JSON.parse(d.json)); // JSON is ~2.5× cheaper than structured clone for a world this size
  const progress = (n, label) => self.postMessage({ type: 'progress', id: d.id, n, label });
  try {
    let out;
    if (d.mode === 'toMatch') out = Sea.skipToMatch(progress);
    else { progress(0, Sea.dayLabel()); out = { summary: Sea.advance(null), n: 1 }; }
    // Send back the new world, plus the save file already packed, so the main thread doesn't have to
    self.postMessage({ type: 'done', id: d.id, json: JSON.stringify(FM.S), packed: FM.Save.pack(FM.S), out });
  } catch (err) {
    self.postMessage({ type: 'error', id: d.id, message: String((err && err.stack) || err) });
  }
};
