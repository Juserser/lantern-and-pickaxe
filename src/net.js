// 온라인: PeerJS(WebRTC) — 방장 권위 구조
G.Net = (function () {
  const N = {};
  N.role = null; N.peer = null; N.conn = null; N.code = null; N.ping = 0;
  const cb = {};
  const ICE = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ] };
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genCode = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

  N.on = (ev, fn) => { cb[ev] = fn; };
  const emit = (ev, ...a) => cb[ev] && cb[ev](...a);

  function wire(conn) {
    const parts = {};
    conn.on('data', raw => {
      let m;
      try { m = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
      if (m && m.__c) {
        const p = parts[m.__c] || (parts[m.__c] = []);
        p[m.i] = m.s;
        if (p.filter(x => x != null).length === m.k) { delete parts[m.__c]; try { m = JSON.parse(p.join('')); } catch (e) { return; } }
        else return;
      }
      if (m.t === 'ping') { N.sendRaw({ t: 'pong', ts: m.ts }); return; }
      if (m.t === 'pong') { N.ping = Math.round(performance.now() - m.ts); return; }
      emit('data', m);
    });
    conn.on('close', () => { if (N.conn === conn) { N.conn = null; emit('close'); } });
    conn.on('error', e => { console.warn('conn error', e); });
  }

  let chunkId = 1;
  N.sendRaw = function (obj) {
    const c = N.conn; if (!c || !c.open) return false;
    const s = JSON.stringify(obj);
    try {
      if (s.length < 60000) c.send(s);
      else {
        const id = chunkId++, size = 50000, k = Math.ceil(s.length / size);
        for (let i = 0; i < k; i++) c.send(JSON.stringify({ __c: id, i, k, s: s.slice(i * size, (i + 1) * size) }));
      }
    } catch (e) { return false; }
    return true;
  };
  N.send = N.sendRaw;
  N.open = () => !!(N.conn && N.conn.open);
  N.buffered = () => (N.conn && N.conn.dataChannel ? N.conn.dataChannel.bufferedAmount : 0);

  N.host = function (tries) {
    tries = tries || 0;
    N.role = 'host';
    N.code = genCode();
    emit('status', '방을 여는 중…');
    const peer = new Peer(G.C.PEER_PREFIX + N.code, { config: ICE, debug: 1 });
    N.peer = peer;
    peer.on('open', () => { emit('code', N.code); emit('status', '상대를 기다리는 중… 💤'); });
    peer.on('connection', conn => {
      if (N.conn && N.conn.open) { try { N.conn.close(); } catch (e) {} }
      N.conn = conn; wire(conn);
      conn.on('open', () => emit('connect'));
    });
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1000); });
    peer.on('error', e => {
      if (e.type === 'unavailable-id' && tries < 5) { peer.destroy(); N.host(tries + 1); return; }
      console.warn('peer error', e.type, e);
      if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') emit('status', '연결 서버에 닿지 않아요. 인터넷을 확인해 주세요.');
    });
  };

  N.join = function (code) {
    N.role = 'guest';
    N.code = code.toUpperCase();
    emit('status', '연결하는 중…');
    const go = () => {
      const conn = N.peer.connect(G.C.PEER_PREFIX + N.code, { serialization: 'raw', reliable: true });
      N.conn = conn; wire(conn);
      let opened = false;
      conn.on('open', () => { opened = true; emit('connect'); });
      setTimeout(() => { if (!opened && N.conn === conn) { emit('status', '연결이 안 돼요. 코드를 확인하거나 다시 시도해 주세요.'); emit('fail'); } }, 12000);
    };
    if (N.peer && !N.peer.destroyed && N.peer.open) { go(); return; }
    if (N.peer) try { N.peer.destroy(); } catch (e) {}
    const peer = new Peer({ config: ICE, debug: 1 });
    N.peer = peer;
    peer.on('open', go);
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1000); });
    peer.on('error', e => {
      console.warn('peer error', e.type, e);
      if (e.type === 'peer-unavailable') { emit('status', '그 코드의 방을 찾을 수 없어요 🥲'); emit('fail'); }
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') { emit('status', '연결 서버에 닿지 않아요.'); emit('fail'); }
    });
  };

  N.close = function () {
    try { if (N.conn) N.conn.close(); } catch (e) {}
    try { if (N.peer) N.peer.destroy(); } catch (e) {}
    N.conn = null; N.peer = null; N.role = null;
  };

  setInterval(() => { if (N.role === 'guest' && N.open()) N.sendRaw({ t: 'ping', ts: performance.now() }); }, 2000);
  return N;
})();
