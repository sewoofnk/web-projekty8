// ==UserScript==
// @name         JUTUBE – YouTube bez reklám
// @namespace    jutube
// @version      2.12.0
// @description  Vlastná stránka na youtube.com/robots.txt: vyhľadávanie a vlastný prehrávač bez reklám.
// @match        https://www.youtube.com/robots.txt*
// @match        https://m.youtube.com/robots.txt*
// @match        https://www.youtube.com/jwatch*
// @match        https://m.youtube.com/jwatch*
// @match        https://www.youtube.com/jshorts/*
// @match        https://m.youtube.com/jshorts/*
// @match        https://www.youtube.com/watch*
// @match        https://m.youtube.com/watch*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @homepageURL  https://github.com/sewoofnk/JUTUBE
// @updateURL    https://raw.githubusercontent.com/sewoofnk/JUTUBE/main/jutube.user.js
// @downloadURL  https://raw.githubusercontent.com/sewoofnk/JUTUBE/main/jutube.user.js
// ==/UserScript==

(function jutube() {
  'use strict';
  if (window.__jutube) return;
  window.__jutube = true;

  // ================= presmerovanie do JUTUBE =================
  // youtube.com/jwatch?v=… (písmeno „j“ pred „watch“) a youtube.com/jshorts/… otvoria video v JUTUBE.
  // Ak je zapnuté automatické presmerovanie, rovnako sa otvorí aj obyčajné youtube.com/watch?v=…
  // (pôvodný YouTube si vynútiš pridaním &jt=0 do adresy).
  if (location.pathname !== '/robots.txt') {
    const qs = new URLSearchParams(location.search);
    const path = location.pathname;
    let id = null;
    if (path === '/jwatch' || path === '/jwatch/') id = qs.get('v');
    else if (path.startsWith('/jshorts/')) id = path.split('/')[2];
    else if (path === '/watch' && qs.get('jt') !== '0') {
      let auto = false;
      try { auto = !!JSON.parse(localStorage.getItem('jutube:data'))?.autoRedirect; } catch {}
      if (auto) id = qs.get('v');
    }
    if (id && /^[\w-]{11}$/.test(id)) {
      const t = parseInt(qs.get('t') || qs.get('start') || '', 10);
      location.replace(`${location.origin}/robots.txt?noapp=1#v=${id}${t > 0 ? `&t=${t}` : ''}`);
      return;
    }
    // pôvodný YouTube (napr. „Otvoriť na YouTube“ pri videách, ktoré JUTUBE nevie prehrať):
    // vymaž z odpovedí YouTube údaje o reklamách skôr, než si ich prehrávač prečíta
    let adBlock = true;
    try { adBlock = JSON.parse(localStorage.getItem('jutube:data'))?.ytAdBlock !== false; } catch {}
    if (adBlock) stripYouTubeAds();
    return;
  }

  // iPhone/iPad: adresy s parametrom „noapp“ YouTube vynecháva z otvárania v appke,
  // takže Safari potom neukazuje panel „Otvoriť v aplikácii YouTube“.
  const onIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (onIOS && !new URLSearchParams(location.search).has('noapp')) {
    location.replace(`${location.origin}/robots.txt?noapp=1${location.hash}`);
    return;
  }

  function stripYouTubeAds() {
    const AD_KEYS = ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams'];
    let removed = 0;
    const hasAds = (o) => o && typeof o === 'object' && (AD_KEYS.some((k) => k in o) || (o.playerResponse && typeof o.playerResponse === 'object'));
    const clean = (o, depth = 0) => {
      if (!o || typeof o !== 'object' || depth > 4) return o;
      for (const k of AD_KEYS) {
        if (k in o) {
          delete o[k];
          removed++;
        }
      }
      if (o.playerResponse) clean(o.playerResponse, depth + 1);
      if (Array.isArray(o)) for (const x of o) if (hasAds(x)) clean(x, depth + 1);
      return o;
    };
    // 1) odpoveď vložená priamo do stránky
    for (const name of ['ytInitialPlayerResponse', 'ytInitialData']) {
      let val;
      try {
        Object.defineProperty(window, name, { configurable: true, get: () => val, set: (v) => { val = clean(v); } });
      } catch {}
    }
    // 2) odpovede, ktoré YouTube načíta neskôr (pri prechode na ďalšie video)
    const parse = JSON.parse;
    JSON.parse = function (...args) {
      const r = parse.apply(this, args);
      return hasAds(r) ? clean(r) : r;
    };
    const json = Response.prototype.json;
    Response.prototype.json = function () {
      return json.call(this).then((r) => (hasAds(r) ? clean(r) : r));
    };
    window.__jutubeAdsRemoved = () => removed;
    // okno „blokovač reklám nie je povolený“ skry
    const css = document.createElement('style');
    css.textContent = 'ytd-enforcement-message-view-model,tp-yt-paper-dialog:has(ytd-enforcement-message-view-model){display:none!important}';
    // pri štarte ešte <html> neexistuje → štýl vložíme, keď vznikne
    const addCss = () => (document.head || document.documentElement).append(css);
    if (document.documentElement) addCss();
    else new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); addCss(); } }).observe(document, { childList: true });
  }

  // Hlavička skriptu – pre tlačidlo „Stiahnuť skript“ v návode (súbor sa poskladá zo seba samého).
  const META = `// ==UserScript==
// @name         JUTUBE – YouTube bez reklám
// @namespace    jutube
// @version      2.12.0
// @description  Vlastná stránka na youtube.com/robots.txt: vyhľadávanie a vlastný prehrávač bez reklám.
// @match        https://www.youtube.com/robots.txt*
// @match        https://m.youtube.com/robots.txt*
// @match        https://www.youtube.com/jwatch*
// @match        https://m.youtube.com/jwatch*
// @match        https://www.youtube.com/jshorts/*
// @match        https://m.youtube.com/jshorts/*
// @match        https://www.youtube.com/watch*
// @match        https://m.youtube.com/watch*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @homepageURL  https://github.com/sewoofnk/JUTUBE
// @updateURL    https://raw.githubusercontent.com/sewoofnk/JUTUBE/main/jutube.user.js
// @downloadURL  https://raw.githubusercontent.com/sewoofnk/JUTUBE/main/jutube.user.js
// ==/UserScript==
`;

  // Stránka beží na youtube.com/robots.txt – obyčajný text bez YouTube skriptov a bez CSP,
  // ale na doméne YouTube, takže API aj video servery naše požiadavky prijmú.

  // Ak by YouTube niekedy vyžadoval Trusted Types, HTML vkladáme cez vlastnú politiku.
  const tt = window.trustedTypes?.createPolicy
    ? window.trustedTypes.createPolicy('jutube', { createHTML: (s) => s })
    : { createHTML: (s) => s };
  const setHTML = (el, html) => { el.innerHTML = tt.createHTML(html); };

  // ================= YouTube API =================
  const API = `${location.origin}/youtubei/v1`;
  const WEB = { clientName: 'WEB', clientVersion: '2.20260623.01.00', hl: 'sk', gl: 'SK' };
  // Klient visionOS dostane celé video bez PO tokenu (iOS/web klienti len prvú minútu).
  const VISIONOS = { clientName: 'VISIONOS', clientVersion: '1.02', deviceMake: 'Apple', deviceModel: 'RealityDevice17,1', osName: 'visionOS', osVersion: '26.5.23O471', platform: 'MOBILE', hl: 'sk', gl: 'SK' };

  // Identifikátor návštevníka – bez neho YouTube väčšinu videí klientovi visionOS nevydá.
  let visitorPromise = null;
  function getVisitorData(force) {
    if (!force) {
      try {
        const c = JSON.parse(localStorage.getItem('jutube:visitor'));
        if (c && Date.now() - c.t < 24 * 3600e3) return Promise.resolve(c.v);
      } catch {}
    }
    if (!visitorPromise || force) {
      visitorPromise = fetch(`${location.origin}/sw.js_data`, { credentials: 'omit' })
        .then((r) => r.text())
        .then((t) => {
          const v = JSON.parse(t.slice(t.indexOf('[')))[0][2][0][0][13];
          try { localStorage.setItem('jutube:visitor', JSON.stringify({ v, t: Date.now() })); } catch {}
          return v;
        })
        .finally(() => { visitorPromise = null; });
    }
    return visitorPromise;
  }

  async function yt(endpoint, body, client = WEB, visitor = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (visitor) headers['X-Goog-Visitor-Id'] = visitor;
    const r = await fetch(`${API}/${endpoint}?prettyPrint=false`, {
      method: 'POST',
      credentials: 'omit',
      headers,
      body: JSON.stringify({ ...body, context: { client: visitor ? { ...client, visitorData: visitor } : client } }),
    });
    if (!r.ok) throw new Error(`YouTube odpovedal chybou ${r.status}`);
    return r.json();
  }

  function findAll(o, key, out = []) {
    if (Array.isArray(o)) for (const x of o) findAll(x, key, out);
    else if (o && typeof o === 'object') {
      for (const k in o) {
        if (k === key) out.push(o[k]);
        else findAll(o[k], key, out);
      }
    }
    return out;
  }
  const text = (t) => t?.simpleText ?? t?.runs?.map((r) => r.text).join('') ?? '';

  const channelIdIn = (o) => findAll(o, 'browseId').find((b) => /^UC[\w-]{22}$/.test(b)) || null;

  // klasická položka (vyhľadávanie, kanál, staršie odporúčania)
  function parseVideoRenderer(r) {
    if (!r?.videoId) return null;
    // dĺžka je buď v lengthText, alebo (na stránke kanála) v prekrytí náhľadu
    const status = findAll(r.thumbnailOverlays, 'thumbnailOverlayTimeStatusRenderer')[0];
    const duration = text(r.lengthText) || (status?.style !== 'LIVE' ? text(status?.text) : '');
    if (!/\d:\d/.test(duration)) return null; // bez živých prenosov
    const owner = r.ownerText || r.longBylineText || r.shortBylineText;
    return {
      id: r.videoId,
      title: text(r.title),
      channel: text(owner),
      channelId: channelIdIn(owner),
      avatar: r.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url || '',
      duration,
      // playlisty (Páči sa mi, Pozrieť neskôr) majú zhliadnutia a dátum vo videoInfo
      views: text(r.shortViewCountText) || text(r.viewCountText) || r.videoInfo?.runs?.[0]?.text || '',
      published: text(r.publishedTimeText) || r.videoInfo?.runs?.[2]?.text || '',
    };
  }

  // nový formát YouTube (odporúčania, niekedy aj kanál)
  function parseLockup(l) {
    if (!l?.contentId || !/VIDEO/.test(l.contentType || '')) return null;
    const meta = l.metadata?.lockupMetadataViewModel;
    const duration = findAll(l.contentImage, 'thumbnailBadgeViewModel').map((b) => b.text).find((t) => /\d:\d/.test(t || ''));
    if (!duration) return null; // živé prenosy a mixy nemajú dĺžku
    const rows = findAll(meta?.metadata, 'metadataRows')[0] || [];
    const parts = rows.map((r) => (r.metadataParts || []).map((p) => p.text?.content).filter(Boolean));
    const avatar = findAll(meta?.image, 'sources')[0]?.[0]?.url || '';
    return {
      id: l.contentId,
      title: meta?.title?.content || '',
      channel: parts.length > 1 ? parts[0][0] || '' : '',
      channelId: channelIdIn(meta?.image) || channelIdIn(meta?.metadata),
      avatar,
      duration,
      views: (parts.length > 1 ? parts[1] : parts[0] || [])[0] || '',
      published: (parts.length > 1 ? parts[1] : parts[0] || [])[1] || '',
    };
  }

  // playlist vo výsledkoch (mixy „RD…“ vynechávame – nedajú sa prehrať ako zoznam)
  function parsePlaylist(l) {
    if (!l?.contentId || !/PLAYLIST/.test(l.contentType || '') || l.contentId.startsWith('RD')) return null;
    const meta = l.metadata?.lockupMetadataViewModel;
    const count = findAll(l.contentImage, 'thumbnailBadgeViewModel').map((b) => b.text).find(Boolean) || '';
    const rows = findAll(meta?.metadata, 'metadataRows')[0] || [];
    const owner = rows.map((r) => (r.metadataParts || []).map((p) => p.text?.content).filter(Boolean))[0]?.[0] || '';
    return { id: l.contentId, title: meta?.title?.content || '', count, owner, thumb: findAll(l.contentImage, 'sources')[0]?.[0]?.url || '' };
  }

  function parseVideos(data, skipId) {
    const ids = new Set(skipId ? [skipId] : []);
    const items = [
      ...findAll(data, 'videoRenderer').map(parseVideoRenderer),
      ...findAll(data, 'compactVideoRenderer').map(parseVideoRenderer),
      ...findAll(data, 'playlistVideoRenderer').map(parseVideoRenderer),
      ...findAll(data, 'lockupViewModel').map(parseLockup),
    ].filter((v) => v && !ids.has(v.id) && ids.add(v.id));
    const pids = new Set();
    const playlists = findAll(data, 'lockupViewModel').map(parsePlaylist).filter((p) => p && !pids.has(p.id) && pids.add(p.id));
    return { items, playlists, shorts: parseShorts(data), cont: findContinuation(data) };
  }

  // Shorts (krátke videá na výšku)
  function parseShorts(data) {
    const ids = new Set();
    return findAll(data, 'shortsLockupViewModel')
      .map((s) => ({
        id: findAll(s, 'reelWatchEndpoint')[0]?.videoId || (s.entityId || '').replace('shorts-shelf-item-', ''),
        title: s.overlayMetadata?.primaryText?.content || '',
        views: s.overlayMetadata?.secondaryText?.content || '',
        short: true,
      }))
      .filter((v) => /^[\w-]{11}$/.test(v.id) && !ids.has(v.id) && ids.add(v.id));
  }
  const SHORTS_ONLY = 'EgIQCQ=='; // filter hľadania: typ Shorts
  const getShorts = (query) => yt('search', { query, params: SHORTS_ONLY }).then((d) => ({ items: parseShorts(d), cont: findContinuation(d) }));
  const shortsMore = (continuation) => yt('search', { continuation }).then((d) => ({ items: parseShorts(d), cont: findContinuation(d) }));

  // filtre hľadania → parameter „sp“ (protobuf zakódovaný v base64)
  // sort: 2 = dátum, 3 = zhliadnutia; date: 2 dnes, 3 týždeň, 4 mesiac, 5 rok; dur: 1 do 4 min, 3 4–20 min, 2 nad 20 min
  function searchParams({ sort, date, dur } = {}) {
    if (!sort && !date && !dur) return undefined;
    const f = [0x10, 1]; // len videá
    if (date) f.unshift(0x08, +date);
    if (dur) f.push(0x18, +dur);
    const bytes = [...(sort ? [0x08, +sort] : []), 0x12, f.length, ...f];
    return btoa(String.fromCharCode(...bytes));
  }

  // Token „načítať ďalšie“: ten, ktorý je posledným prvkom zoznamu s ďalším obsahom
  // (YouTube posiela aj iné tokeny, napr. pre triedenie, ktoré nechceme).
  function findContinuation(data) {
    const tokenOf = (x) => x?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    let best = null;
    const walk = (o) => {
      if (Array.isArray(o)) {
        if (!best && o.length > 1 && tokenOf(o[o.length - 1])) best = tokenOf(o[o.length - 1]);
        for (const x of o) walk(x);
      } else if (o && typeof o === 'object') {
        for (const k in o) walk(o[k]);
      }
    };
    walk(data);
    return best || findAll(data, 'continuationItemRenderer').map((c) => c.continuationEndpoint?.continuationCommand?.token).find(Boolean) || null;
  }

  // params = filter YouTube (napr. EgQIBBAB = nahraté tento mesiac, len videá)
  const search = (query, params) => yt('search', params ? { query, params } : { query }).then((d) => parseVideos(d));
  const searchMore = (continuation) => yt('search', { continuation }).then((d) => parseVideos(d));

  // ================= YouTube účet =================
  // Stránka beží na youtube.com, takže vidí prihlásenie z tohto prehliadača. Požiadavky podpíšeme
  // rovnako ako YouTube (SAPISIDHASH z cookie SAPISID) a YouTube ich prijme ako od teba.
  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$]/g, '\\$&')}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }
  const sapisid = () => getCookie('SAPISID') || getCookie('__Secure-3PAPISID');
  const loggedIn = () => !!sapisid();

  async function sha1(s) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function ytAuth(endpoint, body, client = WEB) {
    const sid = sapisid();
    if (!sid) throw new Error('Nie si prihlásený');
    const ts = Math.floor(Date.now() / 1000);
    const hash = `${ts}_${await sha1(`${ts} ${sid} ${location.origin}`)}`;
    const r = await fetch(`${API}/${endpoint}?prettyPrint=false`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SAPISIDHASH ${hash} SAPISID1PHASH ${hash} SAPISID3PHASH ${hash}`,
        'X-Origin': location.origin,
        'X-Goog-AuthUser': '0',
      },
      body: JSON.stringify({ ...body, context: { client } }),
    });
    if (r.status === 401) throw new Error('Prihlásenie vypršalo – prihlás sa znova');
    if (!r.ok) throw new Error(`YouTube odpovedal chybou ${r.status}`);
    return r.json();
  }
  // prihlásený → požiadavka s účtom (osobné výsledky), inak anonymne
  const ytMaybeAuth = (endpoint, body) => (loggedIn() ? ytAuth(endpoint, body).catch(() => yt(endpoint, body)) : yt(endpoint, body));

  let accountPromise = null;
  function getAccount() {
    if (!loggedIn()) return Promise.resolve(null);
    accountPromise = accountPromise || ytAuth('account/account_menu', {})
      .then((d) => {
        const h = findAll(d, 'activeAccountHeaderRenderer')[0];
        if (!h) return { name: 'Môj účet', photo: '' };
        return { name: text(h.accountName) || text(h.channelHandle) || 'Môj účet', photo: h.accountPhoto?.thumbnails?.[0]?.url || '' };
      })
      .catch(() => ({ name: 'Môj účet', photo: '' }));
    return accountPromise;
  }

  const loginUrl = () =>
    `https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=${encodeURIComponent(
      `${location.origin}/signin?action_handle_signin=true&next=${encodeURIComponent(`${location.origin}/robots.txt`)}`,
    )}`;

  // zoznamy z účtu
  const FEEDS = {
    home: { browseId: 'FEwhat_to_watch', title: 'Odporúčané pre teba' },
    subs: { browseId: 'FEsubscriptions', title: 'Odbery' },
    liked: { browseId: 'VLLL', title: 'Páči sa mi' },
    later: { browseId: 'VLWL', title: 'Pozrieť neskôr' },
  };
  async function getFeed(key) {
    const d = await ytAuth('browse', { browseId: FEEDS[key].browseId });
    const res = parseVideos(d);
    // keď YouTube namiesto videí vráti hlášku (napr. neplatné prihlásenie), ukážeme ju
    const alert = [...findAll(d, 'alertRenderer'), ...findAll(d, 'alertWithButtonRenderer')].map((a) => text(a.text)).find(Boolean);
    return { ...res, alert, chips: key === 'home' ? parseChips(d) : [] };
  }

  // témy navrchu úvodnej stránky (Všetko, Hudba, Hiphop…) – YouTube ich posiela v dvoch formátoch
  function parseChips(d) {
    const out = [
      ...findAll(d, 'chipCloudChipRenderer').map((c) => ({ label: text(c.text), token: c.navigationEndpoint?.continuationCommand?.token })),
      ...findAll(d, 'chipViewModel').map((c) => ({ label: c.text || text(c.title), token: findAll(c, 'token')[0] })),
    ];
    const seenL = new Set();
    // živé prenosy a mixy náš prehrávač nevie prehrať → tieto témy vynecháme
    return out.filter((c) => c.label && !/naživo|live|mix/i.test(c.label) && !seenL.has(c.label) && seenL.add(c.label));
  }
  const feedMore = (continuation) => ytAuth('browse', { continuation }).then((d) => parseVideos(d));

  // akcie s účtom
  const setLike = (id, on) => ytAuth(on ? 'like/like' : 'like/removelike', { target: { videoId: id } });
  const setLater = (id, on) =>
    ytAuth('browse/edit_playlist', {
      playlistId: 'WL',
      actions: [on ? { addedVideoId: id, action: 'ACTION_ADD_VIDEO' } : { removedVideoId: id, action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID' }],
    });
  const setSubscribed = (channelId, on) => ytAuth(on ? 'subscription/subscribe' : 'subscription/unsubscribe', { channelIds: [channelId] });

  // odporúčané videá k videu (to isté, čo YouTube ukazuje vedľa prehrávača); s účtom aj stav „páči sa mi“
  async function getRelated(id) {
    const d = await ytMaybeAuth('next', { videoId: id });
    const status = findAll(d, 'likeStatusEntity')[0]?.likeStatus || findAll(d, 'likeStatus')[0];
    // kapitoly (ak ich video má)
    const seenT = new Set();
    const chapters = findAll(d, 'chapterRenderer')
      .map((c) => ({ title: text(c.title), start: (c.timeRangeStartMillis || 0) / 1000 }))
      .filter((c) => c.title && !seenT.has(c.start) && seenT.add(c.start))
      .sort((a, b) => a.start - b.start);
    const likes = findAll(d, 'likeCountIfIndifferent')[0]?.content || '';
    // kanál (ikona, odberatelia) a zhliadnutia + dátum pod videom
    const o = findAll(d, 'videoOwnerRenderer')[0];
    const pi = findAll(d, 'videoPrimaryInfoRenderer')[0];
    const owner = o ? {
      id: o.navigationEndpoint?.browseEndpoint?.browseId || '',
      title: text(o.title),
      avatar: (o.thumbnail?.thumbnails || []).slice(-1)[0]?.url || '',
      subs: text(o.subscriberCountText),
      verified: !!o.badges?.length,
      subscribed: (findAll(d, 'subscriptionStateEntity')[0]?.subscribed ?? findAll(d, 'subscribeButtonRenderer')[0]?.subscribed) === true,
    } : null;
    const info = pi ? { views: text(pi.viewCount?.videoViewCountRenderer?.viewCount), date: text(pi.relativeDateText) || text(pi.dateText) } : null;
    return { items: parseVideos(d, id).items, liked: status === 'LIKE', chapters, likes, owner, info };
  }

  // videá kanála – záložka „Videá“
  const CHANNEL_VIDEOS_TAB = 'EgZ2aWRlb3PyBgQKAjoA';
  async function getChannel(id) {
    const d = await ytMaybeAuth('browse', { browseId: id, params: CHANNEL_VIDEOS_TAB });
    const m = findAll(d, 'channelMetadataRenderer')[0] || {};
    const { items, cont } = parseVideos(d);
    for (const v of items) {
      v.channel = v.channel || m.title || '';
      v.channelId = v.channelId || id;
    }
    const sub = findAll(d, 'subscriptionStateEntity')[0]?.subscribed ?? findAll(d, 'subscribeButtonRenderer')[0]?.subscribed;
    return { id, title: m.title || '', avatar: m.avatar?.thumbnails?.[0]?.url || '', items, cont, subscribed: sub === true };
  }
  const channelMore = (continuation) => yt('browse', { continuation }).then((d) => parseVideos(d));

  // playlist (aj súkromný, ak si prihlásený)
  async function getPlaylist(id) {
    const d = await ytMaybeAuth('browse', { browseId: `VL${id}` });
    const md = findAll(d, 'playlistMetadataRenderer')[0] || {};
    const { items, cont } = parseVideos(d);
    const alert = [...findAll(d, 'alertRenderer'), ...findAll(d, 'alertWithButtonRenderer')].map((a) => text(a.text)).find(Boolean);
    return { id, title: md.title || 'Playlist', items, cont, alert };
  }
  const playlistMore = (continuation) => ytMaybeAuth('browse', { continuation }).then((d) => parseVideos(d));

  // tvoje playlisty (len s účtom)
  async function getMyPlaylists() {
    const d = await ytAuth('browse', { browseId: 'FEplaylist_aggregation' });
    const ids = new Set();
    const fromLockups = findAll(d, 'lockupViewModel').map(parsePlaylist);
    const fromGrid = findAll(d, 'gridPlaylistRenderer').map((g) => ({
      id: g.playlistId,
      title: text(g.title),
      count: text(g.videoCountShortText) || text(g.videoCountText),
      owner: '',
      thumb: g.thumbnail?.thumbnails?.[0]?.url || '',
    }));
    return [...fromLockups, ...fromGrid].filter((p) => p?.id && !ids.has(p.id) && ids.add(p.id));
  }

  // počet „nepáči sa mi“ zo služby Return YouTube Dislike (YouTube ho skrýva)
  const dislikeCache = new Map();
  function getDislikes(id) {
    if (!dislikeCache.has(id)) {
      dislikeCache.set(id, fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${id}`, { credentials: 'omit' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null));
    }
    return dislikeCache.get(id);
  }
  const compact = (n) => new Intl.NumberFormat('sk-SK', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

  // ================= fronta prehrávania (playlist alebo „Prehrať ďalej“) =================
  // queue = { title, listId (alebo null pre vlastnú frontu), items: [videá], cont }
  let queue = null;
  const queueIndex = (id) => (queue ? queue.items.findIndex((v) => v.id === id) : -1);

  // ďalšie video: najprv z fronty, potom z odporúčaných
  function nextVideo(currentId) {
    if (queue?.items.length) {
      const i = queueIndex(currentId);
      if (i >= 0 && queue.items[i + 1]) return queue.items[i + 1];
      if (i < 0 && !queue.listId) return queue.items[0];
    }
    const recent = new Set(data.history.slice(0, 30).map((v) => v.id));
    return related.find((v) => !recent.has(v.id)) || related[0] || null;
  }
  function prevQueueVideo(currentId) {
    const i = queueIndex(currentId);
    return i > 0 ? queue.items[i - 1] : null;
  }
  const watchHref = (v) => `#v=${v.id}${queue?.listId && queueIndex(v.id) >= 0 ? `&list=${queue.listId}` : ''}`;

  // keď sa blížime ku koncu načítanej časti playlistu, dotiahni ďalšie videá
  async function topUpQueue(currentId) {
    if (!queue?.cont || queue.loading || queueIndex(currentId) < queue.items.length - 3) return;
    queue.loading = true;
    try {
      const more = await playlistMore(queue.cont);
      const known = new Set(queue.items.map((v) => v.id));
      queue.items.push(...more.items.filter((v) => !known.has(v.id)));
      queue.cont = more.cont;
    } catch {}
    queue.loading = false;
  }

  function addToQueue(v) {
    if (queue?.listId) {
      const watchingIt = onWatch && current && queueIndex(current.details.id) >= 0;
      if (watchingIt) {
        // počas playlistu: z playlistu sa stane vlastná fronta (pri ďalšom videu sa nezruší)
        queue.listId = null;
        queue.cont = null;
      } else {
        queue = null; // playlist už nesleduješ → začni novú frontu
      }
    }
    if (!queue) queue = { title: 'Fronta', listId: null, items: [], cont: null };
    if (queueIndex(v.id) >= 0) return toast('Video už je vo fronte');
    // „Prehrať ďalej“ = hneď za práve hrajúce video
    const cur = current ? queueIndex(current.details.id) : -1;
    if (cur >= 0) queue.items.splice(cur + 1, 0, v);
    else queue.items.push(v);
    toast(`Prehrať ďalej: ${v.title}`);
    renderQueuePanel();
  }

  async function getStreams(id) {
    const ask = async (force) => yt('player', { videoId: id, contentCheckOk: true, racyCheckOk: true }, VISIONOS, await getVisitorData(force));
    let p = await ask(false);
    // starý identifikátor návštevníka → vypýtaj nový a skús znova
    if (p.playabilityStatus?.status === 'LOGIN_REQUIRED') p = await ask(true);
    // nevydané video (napr. „pre deti“) → s účtom to skús ešte raz
    if (p.playabilityStatus?.status !== 'OK' && loggedIn()) {
      const pa = await ytAuth('player', { videoId: id, contentCheckOk: true, racyCheckOk: true }, VISIONOS).catch(() => null);
      if (pa?.playabilityStatus?.status === 'OK') p = pa;
    }
    const st = p.playabilityStatus?.status;
    if (st !== 'OK') {
      // Ak ho vydá aspoň aplikácia YouTube pre iPhone, ide o video obmedzené na YouTube aplikácie
      // (typicky obsah pre deti) – celé ho tak prehrať nevieme, iOS pustí len prvú minútu.
      const IOS = { clientName: 'iOS', clientVersion: '20.11.6', deviceMake: 'Apple', deviceModel: 'iPhone10,4', osName: 'iOS', osVersion: '16.7.7.20H330', hl: 'sk', gl: 'SK' };
      const ios = await yt('player', { videoId: id, contentCheckOk: true, racyCheckOk: true }, IOS).catch(() => null);
      const appOnly = ios?.playabilityStatus?.status === 'OK';
      const err = new Error(appOnly
        ? 'YouTube toto video púšťa len vo svojich aplikáciách (býva to pri videách pre deti), preto sa tu nedá prehrať.'
        : p.playabilityStatus?.reason || `Video sa nedá prehrať (${st})`);
      err.unplayable = true;
      throw err;
    }
    const af = p.streamingData?.adaptiveFormats || [];
    // H.264 video (prehrá každý prehliadač vrátane iPhonu) + AAC zvuk
    const byHeight = new Map();
    for (const f of af) {
      if (!f.url || !f.indexRange || !/^video\/mp4/.test(f.mimeType) || !/avc1/.test(f.mimeType) || !supported(f.mimeType)) continue;
      const prev = byHeight.get(f.height);
      if (!prev || (f.fps || 30) > (prev.fps || 30) || ((f.fps || 30) === (prev.fps || 30) && f.bitrate > prev.bitrate)) byHeight.set(f.height, f);
    }
    const videos = [...byHeight.values()].sort((a, b) => b.height - a.height);
    const audio = af.find((f) => f.itag === 140 && f.url && f.indexRange) || af.filter((f) => f.url && f.indexRange && /^audio\/mp4/.test(f.mimeType) && supported(f.mimeType)).sort((a, b) => b.bitrate - a.bitrate)[0];
    if (!videos.length || !audio) throw new Error('Nenašiel sa prehrateľný formát');
    // pre AirPlay: Apple TV si video sťahuje sama – potrebuje HLS alebo MP4 s obrazom aj zvukom v jednom
    const hls = p.streamingData?.hlsManifestUrl;
    const muxed = (p.streamingData?.formats || []).filter((f) => f.url && /^video\/mp4/.test(f.mimeType)).sort((a, b) => b.height - a.height)[0];
    const d = p.videoDetails || {};
    const ct = p.captions?.playerCaptionsTracklistRenderer || {};
    const captions = (ct.captionTracks || []).map((c) => ({
      url: c.baseUrl,
      lang: c.languageCode,
      name: text(c.name) || c.languageCode,
      auto: c.kind === 'asr',
    }));
    return {
      videos,
      audio,
      cast: hls ? { url: hls, label: 'automatická kvalita' } : muxed ? { url: muxed.url, label: `${muxed.height}p` } : null,
      captions,
      canTranslate: (ct.translationLanguages || []).some((l) => l.languageCode === 'sk'),
      details: {
        id,
        title: d.title || '',
        channel: d.author || '',
        channelId: d.channelId || null,
        views: d.viewCount ? Number(d.viewCount).toLocaleString('sk-SK') : '',
        length: +d.lengthSeconds || 0,
        description: d.shortDescription || '',
      },
    };
  }

  // Odkazy na video si pamätáme pár minút, aby sa dali zistiť vopred (pri prejdení myšou / dotyku).
  const streamCache = new Map();
  function getStreamsCached(id) {
    const c = streamCache.get(id);
    if (c && Date.now() - c.t < 4 * 60e3) return c.p;
    const p = getStreams(id);
    streamCache.set(id, { p, t: Date.now() });
    p.catch(() => streamCache.delete(id));
    if (streamCache.size > 40) streamCache.delete(streamCache.keys().next().value);
    return p;
  }
  // myš: po 150 ms nad videom; prst: hneď pri dotyku
  let hoverTimer = null;
  const prefetchFrom = (e) => e.target.closest?.('.card[data-id]')?.dataset.id;
  document.addEventListener('pointerover', (e) => {
    const id = prefetchFrom(e);
    clearTimeout(hoverTimer);
    if (id && e.pointerType === 'mouse') hoverTimer = setTimeout(() => getStreamsCached(id).catch(() => {}), 150);
  }, { passive: true });
  document.addEventListener('touchstart', (e) => {
    const id = prefetchFrom(e);
    if (id) getStreamsCached(id).catch(() => {});
  }, { passive: true });

  // ================= úložisko =================
  const KEY = 'jutube:data';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const data = Object.assign({ history: [], pos: {}, quality: 1080, channels: [], autoplay: true, albums: [] }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };
  function addHistory(v) {
    data.history = [v, ...data.history.filter((x) => x.id !== v.id)].slice(0, 60);
    save();
  }
  const isSaved = (id) => data.channels.some((c) => c.id === id);
  function toggleChannel(ch) {
    if (isSaved(ch.id)) data.channels = data.channels.filter((c) => c.id !== ch.id);
    else data.channels.unshift({ id: ch.id, title: ch.title, avatar: ch.avatar });
    save();
    return isSaved(ch.id);
  }

  // ================= HTML =================
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

  const CSS = `
  :root{--bg:#0a0c24;--bg2:#12163a;--soft:#1c2252;--hover:#2a3274;--line:#2c3570;--text:#eef0ff;--text2:#a3abdc;--red:#6d7cff;--sapphire:#3f5efb;--violet:#8b5cf6;--grad:linear-gradient(135deg,#3f5efb,#8b5cf6);--glow:#2a2470;--accent-text:#c4b5fd;--link:#a5b4fc;--chl-border:#4a56b0;--glass:rgba(10,12,36,.88);--sheet:#0d0f2b;--chip-on-bg:#eef0ff;--chip-on-fg:#0a0c24;color-scheme:dark}
  :root[data-theme=violet]{--sapphire:#7c3aed;--violet:#a855f7;--red:#a855f7;--grad:linear-gradient(135deg,#7c3aed,#c084fc);--glow:#3b1d6e;--accent-text:#d8b4fe;--link:#c4b5fd;--chl-border:#7c4dc4}
  :root[data-theme=blue]{--sapphire:#1d4ed8;--violet:#3b82f6;--red:#3b82f6;--grad:linear-gradient(135deg,#1d4ed8,#38bdf8);--glow:#12305e;--accent-text:#93c5fd;--link:#7dd3fc;--chl-border:#2f5fb3}
  :root[data-theme=green]{--sapphire:#059669;--violet:#22c55e;--red:#22c55e;--grad:linear-gradient(135deg,#059669,#4ade80);--glow:#0f3b2c;--accent-text:#86efac;--link:#6ee7b7;--chl-border:#1f7a55}
  :root[data-theme=pink]{--sapphire:#db2777;--violet:#f472b6;--red:#f472b6;--grad:linear-gradient(135deg,#db2777,#f9a8d4);--glow:#4a1636;--accent-text:#f9a8d4;--link:#f9a8d4;--chl-border:#9d2f68}
  :root[data-theme=orange]{--sapphire:#ea580c;--violet:#f59e0b;--red:#f59e0b;--grad:linear-gradient(135deg,#ea580c,#fbbf24);--glow:#4a2a10;--accent-text:#fdba74;--link:#fcd34d;--chl-border:#a5541c}
  :root[data-theme=red]{--sapphire:#b91c1c;--violet:#ef4444;--red:#ef4444;--grad:linear-gradient(135deg,#b91c1c,#f87171);--glow:#4a1414;--accent-text:#fca5a5;--link:#fca5a5;--chl-border:#a33030}
  :root[data-mode=light]{--bg:#f4f5fb;--bg2:#ffffff;--soft:#eceef6;--hover:#dfe2ef;--line:#d5d8e6;--text:#14162b;--text2:#5a5f78;--glass:rgba(255,255,255,.9);--sheet:#ffffff;--chip-on-bg:#14162b;--chip-on-fg:#ffffff;
    --glow:color-mix(in srgb,var(--violet) 22%,transparent);--accent-text:color-mix(in srgb,var(--violet) 70%,#000);--link:color-mix(in srgb,var(--sapphire) 80%,#000);--chl-border:color-mix(in srgb,var(--violet) 45%,#fff);color-scheme:light}
  :root[data-mode=light] .menu,:root[data-mode=light] .pc-sheet,:root[data-mode=light] .dlbar{box-shadow:0 12px 32px rgba(20,22,43,.18)}
  :root[data-mode=light] .pc-overlay{background:rgba(20,22,43,.35)}
  .theme-row{display:flex;flex-wrap:wrap;gap:10px}
  .swatch{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border:2px solid transparent;border-radius:14px;background:none;color:var(--text);cursor:pointer;font-size:12px;font-weight:600}
  .swatch i{display:block;width:42px;height:42px;border-radius:50%}
  .swatch.on{border-color:var(--violet);background:var(--soft)}
  .seg{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}
  .seg button{height:36px;padding:0 14px;border:0;background:var(--bg2);color:var(--text);font-weight:600;cursor:pointer}
  .seg button+button{border-left:1px solid var(--line)}
  .seg button.on{background:var(--grad);color:#fff}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg) radial-gradient(ellipse at 50% -10%,var(--glow) 0,transparent 55%) no-repeat fixed;min-height:100%;color:var(--text);font:14px/1.4 Roboto,"Segoe UI",system-ui,-apple-system,Arial,sans-serif;-webkit-text-size-adjust:100%}
  a{color:inherit;text-decoration:none}
  button,input,select{font:inherit;color:inherit}
  svg{width:24px;height:24px;fill:currentColor;flex:none}
  .mh{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;height:64px;padding:0 16px;padding-top:env(safe-area-inset-top);box-sizing:content-box;background:var(--glass);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
  .logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:19px;letter-spacing:-1px;flex:none}
  .logo svg{width:30px;height:21px}
  .logo span{display:flex;align-items:baseline;gap:6px;color:#c084fc;background:linear-gradient(135deg,#a855f7,#d8b4fe);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .logo small{-webkit-text-fill-color:#b9a3e8}
  .acct{position:relative;flex:none;display:flex;align-items:center}
  .me{display:flex;align-items:center;gap:8px;border:0;background:none;cursor:pointer;padding:0}
  .me img,.me .av{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid var(--violet)}
  .me-name{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
  .menu{position:absolute;right:0;top:46px;z-index:30;min-width:200px;padding:14px;display:flex;flex-direction:column;gap:12px;background:var(--bg2);border:1px solid var(--line);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
  .menu[hidden]{display:none}
  .menu{min-width:250px}
  .menu .pill{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
  .login{display:inline-flex;align-items:center;white-space:nowrap}
  .nav{display:flex;gap:8px;overflow-x:auto;padding:12px 24px 0;max-width:1800px;margin:0 auto;scrollbar-width:none}
  .navi{flex:none;height:34px;display:inline-flex;align-items:center;padding:0 14px;border-radius:17px;background:var(--soft);border:1px solid var(--line);font-weight:500;font-size:14px}
  .navi:hover{background:var(--hover)}
  .navi.on{background:var(--grad);border-color:transparent;color:#fff}
  .hint{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px 0 0;padding:14px 16px;background:var(--bg2);border:1px solid var(--line);border-radius:14px;color:var(--text2)}
  .acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  form{position:relative}
  .sugg{position:absolute;left:0;right:60px;top:44px;z-index:40;padding:8px 0;background:var(--bg2);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.55)}
  .sugg[hidden]{display:none}
  .sg{display:flex;align-items:center;gap:12px;padding:8px 16px;cursor:pointer;font-size:15px;font-weight:500}
  .sg svg{width:18px;height:18px;color:var(--text2)}
  .sg:hover,.sg.on{background:var(--soft)}
  #cc{max-width:170px;text-overflow:ellipsis}
  /* vlastné ovládanie videa (ako YouTube) */
  .player video::-webkit-media-controls{display:none!important}
  .yc{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:40px 12px 8px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;transition:opacity .25s;user-select:none;-webkit-user-select:none}
  .player.yc-idle .yc{opacity:0;pointer-events:none}
  .player.yc-idle{cursor:none}
  .yc-prog{position:relative;height:16px;display:flex;align-items:center;cursor:pointer;touch-action:none;margin:0 2px}
  .yc-rail{position:relative;flex:1;height:3px;background:rgba(255,255,255,.25);transition:height .1s}
  .yc-prog:hover .yc-rail,.yc-prog.drag .yc-rail{height:5px}
  .yc-buf,.yc-played{position:absolute;left:0;top:0;bottom:0;width:0}
  .yc-buf{background:rgba(255,255,255,.4)}
  .yc-played{background:var(--red)}
  .yc-gap{position:absolute;top:0;bottom:0;width:3px;margin-left:-1px;background:rgba(0,0,0,.85)}
  .yc-knob{position:absolute;top:50%;width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border-radius:50%;background:var(--red);left:0}
  .yc-tip{position:absolute;bottom:22px;transform:translateX(-50%);padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.85);font-size:12px;font-weight:600;white-space:nowrap;pointer-events:none;text-align:center}
  .yc-tip[hidden]{display:none}
  .yc-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}
  .yc-l,.yc-r{display:flex;align-items:center;gap:6px;min-width:0}
  .yc-grp{display:flex;align-items:center;height:44px;border-radius:22px;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
  .yc-b{display:grid;place-items:center;width:44px;height:44px;flex:none;border:0;border-radius:50%;background:none;color:#fff;cursor:pointer;padding:0}
  .yc-l > .yc-b{background:rgba(0,0,0,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
  .yc-b:hover{background:rgba(255,255,255,.15)}
  .yc-b svg{width:24px;height:24px;fill:currentColor}
  .yc-b[hidden]{display:none}
  .yc-vol{padding-right:4px}
  .yc-vr{width:0;opacity:0;transition:width .2s,opacity .2s;accent-color:#fff;margin:0}
  .yc-vol:hover .yc-vr,.yc-vr:focus{width:70px;opacity:1;margin-right:8px}
  .yc-time{height:44px;display:flex;align-items:center;min-width:0;padding:0 16px;font-size:14px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden}
  .yc-time .yc-ch{margin-left:6px;font-weight:500;opacity:.85;overflow:hidden;text-overflow:ellipsis}
  .yc-cc{position:relative}
  .yc-cc.on::after{content:"";position:absolute;left:12px;right:12px;bottom:8px;height:3px;border-radius:2px;background:var(--red)}
  .yc-b.yc-ap{width:52px}
  .yc-sw{position:relative;width:36px;height:14px;border-radius:7px;background:rgba(255,255,255,.35)}
  .yc-sw i{position:absolute;top:50%;left:-2px;width:20px;height:20px;margin-top:-10px;border-radius:50%;background:#ccc;display:grid;place-items:center;transition:left .15s,background .15s}
  .yc-sw i svg{width:12px;height:12px;fill:#222}
  .yc-ap.on .yc-sw i{left:18px;background:#fff}
  .yc-menu{position:absolute;right:12px;bottom:72px;z-index:4;min-width:250px;max-height:calc(100% - 84px);overflow:auto;padding:8px 0;border-radius:12px;background:rgba(28,28,28,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;font-size:14px}
  .yc-menu[hidden]{display:none}
  .yc-mi{box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:10px 16px;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
  .yc-mi:hover{background:rgba(255,255,255,.1)}
  .yc-mi span{flex:1}
  .yc-mi em{font-style:normal;opacity:.75}
  .yc-mi.on::before{content:"✓";width:14px}
  .yc-mi.pad::before{content:"";width:14px}
  .yc-mh{font-weight:700;border-bottom:1px solid rgba(255,255,255,.15);margin-bottom:6px}
  .player:fullscreen{max-height:none;border-radius:0;aspect-ratio:auto;width:100%;height:100%}
  .player:-webkit-full-screen{max-height:none;border-radius:0;aspect-ratio:auto;width:100%;height:100%}
  .tslot:empty{display:none}
  .tslot{grid-column:1/-1;margin:-12px -24px 0}
  .tslot .player{border-radius:0;max-height:calc(100vh - 130px);aspect-ratio:auto;height:min(56.25vw,calc(100vh - 130px));box-shadow:none}
  .mini .yc-r .yc-b:not(.yc-fs),.mini .yc-time .yc-ch,.mini .yc-vol{display:none}
  .mini .yc{padding:24px 6px 4px}
  .mini .yc-b{width:36px;height:36px}
  .mini .yc-grp{height:36px}
  .mini .yc-time{padding:0 10px;font-size:12px}
  @media (max-width:1000px){.yc-b.yc-th{display:none}}
  @media (hover:none){
    .yc-vr{display:none}
    .yc-prog{height:22px}
  }
  @media (max-width:700px){
    .yc{padding:30px 6px 4px}
    .yc-b{width:38px;height:38px}
    .yc-grp{height:38px}
    .yc-time{padding:0 10px;font-size:13px}
    .yc-time .yc-ch{display:none}
    .yc-menu{right:6px;bottom:52px;min-width:220px;max-height:calc(100% - 60px)}
  }
  .wacts #cc,.wacts #qs{display:none!important}
  .ycm{display:none}
  .yc-ic{display:grid;place-items:center;width:24px;flex:none}
  .yc-ic svg{width:22px;height:22px;fill:currentColor}
  .yc-b:disabled{opacity:.35;cursor:default}
  .yc-unlock{display:none}
  .player.yc-locked .yc,.player.yc-locked .yc-menu{display:none}
  .player.yc-locked .yc-unlock{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:8px;height:40px;padding:0 16px;border:0;border-radius:20px;background:rgba(0,0,0,.6);color:#fff;font-size:13px;font-weight:600}
  .yc-unlock svg{width:20px;height:20px;fill:currentColor}
  .ycs{position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0);transition:background .2s}
  .ycs.open{background:rgba(0,0,0,.45)}
  .ycs-card{box-sizing:border-box;width:min(560px,calc(100% - 16px));margin-bottom:calc(8px + env(safe-area-inset-bottom));padding:8px 0 10px;border-radius:18px;background:var(--bg2);color:var(--text);max-height:75vh;overflow:auto;transform:translateY(110%);transition:transform .2s}
  .ycs.open .ycs-card{transform:none}
  .ycs-grab{width:40px;height:4px;border-radius:2px;background:var(--line);margin:4px auto 6px}
  .ycs .yc-mi{padding:14px 20px;font-size:16px;font-weight:600;gap:18px}
  .ycs .yc-mi:hover{background:var(--soft)}
  .ycs .yc-mi em{font-weight:500;color:var(--text2);opacity:1}
  .ycs .yc-ic svg{width:24px;height:24px}
  .ycs .yc-mh{border-bottom:1px solid var(--line)}
  .wmeta{display:none}
  @media (max-width:700px){
    .yc{top:0;padding:0;background:rgba(0,0,0,.45);display:flex;flex-direction:column}
    .yc .yc-bar{display:none}
    .ycm{display:flex;align-items:center}
    .ycm-sp{flex:1}
    .ycm-top{padding:6px 6px 0}
    .ycm-top .yc-b{width:44px;height:44px}
    .ycm-top .yc-b svg{width:26px;height:26px}
    .ycm-down svg{width:30px!important;height:30px!important}
    .ycm-mid{flex:1;justify-content:center;gap:clamp(24px,10vw,56px)}
    .ycm-mid .yc-b{width:52px;height:52px}
    .ycm-mid .yc-b svg{width:32px;height:32px}
    .ycm-mid .ycm-play{width:64px;height:64px;background:rgba(0,0,0,.35)}
    .ycm-mid .ycm-play svg{width:40px;height:40px}
    .ycm-bot{padding:0 6px 10px 14px}
    .ycm-bot .yc-t{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,0,0,.6)}
    .ycm-bot .yc-b{width:40px;height:40px}
    .yc .yc-prog{position:absolute;left:0;right:0;bottom:0;height:18px;margin:0;align-items:flex-end}
    .yc .yc-rail{height:3px}
    .yc .yc-knob{top:auto;bottom:-5px;margin-top:0}
    .yc-tip{bottom:26px}
    .yc-b:hover{background:none}
    .player.yc-idle .yc{opacity:0}
    .mini .ycm-top,.mini .ycm-prev,.mini .ycm-next,.mini .ycm-bot{display:none}
    .mini .yc{background:rgba(0,0,0,.3)}
    .wmeta{display:block;margin:2px 0 4px;font-size:13px}
    .desc-head{display:none}
    .watch .side{padding:0}
    .watch .side-head{padding:0 12px}
    .watch #qpanel{padding:0 12px}
    #rel{display:grid;gap:22px}
    #rel .card{display:block}
    #rel .th{width:auto;border-radius:0}
    #rel .cb{display:flex;gap:12px;padding:12px 12px 0}
    #rel .av{display:block;width:40px;height:40px}
    #rel .tt{font-size:16px;line-height:22px}
    #rel .mt{font-size:13px}
    #rel .mt-sep br{display:none}
    #rel .mt-sep::before{content:" · "}
    #rel span.chl{display:inline;border:0;padding:0;margin:0;background:none;color:var(--text2);font-size:13px;font-weight:400}
    #rel span.chl::before{display:none}
    #rel .ct{flex:1;min-width:0}
    #rel span.chl{white-space:normal}
    #rel .cmore{position:static;margin-left:auto}
  }
  /* stránka videa ako YouTube */
  h1.wt{font-size:20px;font-weight:700;line-height:28px;margin:12px 0 4px}
  .wrow{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:8px}
  .owner{display:flex;align-items:center;gap:12px;min-width:0}
  .ow-av img,.ow-av i{display:block;width:40px;height:40px;border-radius:50%;object-fit:cover;background:var(--soft)}
  .ow-txt{display:flex;flex-direction:column;min-width:0;line-height:1.35}
  .owner #wm span.chl{display:inline;border:0;background:none;padding:0;margin:0;font-size:16px;font-weight:700;color:var(--text)}
  .owner #wm span.chl::before{display:none}
  #ow-subs{font-size:12px}
  .sub-btn{margin-left:12px}
  .sub-btn.on-sub{background:var(--soft);color:var(--text)}
  .wacts{justify-content:flex-end}
  .vote{display:inline-flex}
  .vote .pill{border-radius:0}
  .vote .vote-l{border-radius:18px 0 0 18px;border-right:1px solid var(--line)}
  .vote .vote-d{border-radius:0 18px 18px 0}
  .vote .pill.on{background:var(--grad);color:#fff}
  .desc-head{font-weight:700;margin-bottom:6px}
  .desc-head:empty{display:none}
  .side-head .rel-chips{flex:1;min-width:0;gap:8px;padding-right:0}
  .rel-chips .chip{height:32px;font-size:13px}
  @media (max-width:700px){
    .wrow{flex-direction:column;flex-wrap:nowrap;align-items:stretch}
    .wacts{flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;scrollbar-width:none;padding-bottom:2px}
    .wacts::-webkit-scrollbar{display:none}
    .wacts > *{flex:none}
    .sub-btn{margin-left:auto}
  }
  .menu-btn{font-size:20px;margin-right:-4px}
  .shell{display:flex;align-items:flex-start}
  .content{flex:1;min-width:0}
  .sidenav{position:sticky;top:calc(65px + env(safe-area-inset-top));height:calc(100vh - 65px);width:232px;flex:none;overflow-y:auto;padding:10px 10px 30px;scrollbar-width:thin;scrollbar-color:var(--hover) transparent}
  .sn{display:flex;align-items:center;gap:20px;width:100%;height:40px;padding:0 12px;border:0;border-radius:10px;background:none;color:var(--text);font-size:14px;cursor:pointer;text-align:left}
  .sn svg{width:22px;height:22px;flex:none}
  .sn img,.sn-av{display:block;width:24px;height:24px;border-radius:50%;flex:none;object-fit:cover;background:var(--soft)}
  .sn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sn:hover,.sn-h:hover{background:var(--soft)}
  .sn.on{background:var(--soft);font-weight:700}
  .sn-h{display:block;padding:10px 12px 6px;font-weight:700;font-size:16px;border-radius:10px}
  .sn-sep{height:1px;background:var(--line);margin:10px 4px}
  .sn-note{color:var(--text2);font-size:12px;padding:4px 12px;line-height:1.5;margin:0}
  .sn-foot{color:var(--text2);font-size:11px;padding:12px;margin:0}
  @media (min-width:1001px){.nav{display:none}}
  @media (max-width:1000px){.sidenav,.mh .menu-btn{display:none}}
  body.side-collapsed .sidenav,body.watching .sidenav{display:none}
  body.watching .nav{display:none}
  body.watching.side-open .sidenav{display:block;position:fixed;left:0;top:calc(65px + env(safe-area-inset-top));height:calc(100vh - 65px);z-index:45;background:var(--bg);border-right:1px solid var(--line);box-shadow:8px 0 30px rgba(0,0,0,.35)}
  .ct{flex:1;min-width:0}
  .cmore{flex:none;align-self:flex-start;width:32px;height:32px;margin:-4px -8px 0 0;border:0;border-radius:50%;background:none;color:var(--text);font-size:20px;line-height:1;cursor:pointer;opacity:0;transition:opacity .15s}
  .card:hover .cmore,.cmore:focus-visible{opacity:1}
  .cmore:hover{background:var(--soft)}
  @media (hover:none){.cmore{opacity:.9}}
  .side .card{position:relative}
  .side .cmore{position:absolute;top:-6px;right:-6px}
  .cmenu{position:fixed;z-index:80;min-width:250px;width:max-content;max-width:calc(100vw - 16px);top:0;left:0;right:auto}
  .cmenu .pill{display:flex;align-items:center;justify-content:flex-start;width:100%}
  .tabbar{display:none}
  .me-card{display:flex;align-items:center;gap:16px;padding:20px 0 6px}
  .me-card img,.me-card .av,.me-ph{width:64px;height:64px;border-radius:50%;object-fit:cover;display:grid;place-items:center;font-size:30px;background:var(--soft)}
  .me-card h1{margin:0 0 6px;font-size:22px}
  .me-list{display:flex;flex-direction:column;gap:8px;margin-top:18px}
  .me-row{display:flex;align-items:center;gap:16px;padding:14px 16px;background:var(--bg2);border:1px solid var(--line);border-radius:14px}
  .me-row svg{width:24px;height:24px;flex:none}
  .me-row > span:nth-child(2){flex:1;min-width:0}
  .me-go{color:var(--text2);font-size:22px}
  @media (max-width:700px){
    .nav{display:none}
    /* hlavička na mobile: nastavenia a návod sú v „Moje“, nech je viac miesta na hľadanie */
    .hicons a[href="#settings"],.acct .howto{display:none}
    .tabbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:40;justify-content:space-around;align-items:center;padding:6px 2px calc(6px + env(safe-area-inset-bottom));background:var(--glass);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid var(--line)}
    .tb{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:58px;font-size:11px;font-weight:600;color:var(--text2)}
    .tb svg{width:26px;height:26px}
    .tb.on{color:var(--text)}
    .tb-c{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--grad);color:#fff;box-shadow:0 4px 16px color-mix(in srgb,var(--violet) 45%,transparent)}
    .tb-mid.on .tb-c{outline:2px solid var(--text);outline-offset:2px}
    .tb-me{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;overflow:hidden;font-size:18px}
    .tb-me img{width:100%;height:100%;object-fit:cover}
    .tb.on .tb-me{outline:2px solid var(--text)}
    #app{padding-bottom:calc(96px + env(safe-area-inset-bottom))}
    .mini{bottom:calc(78px + env(safe-area-inset-bottom))}
    .dlbar{bottom:calc(84px + env(safe-area-inset-bottom))}
    .toast{bottom:calc(84px + env(safe-area-inset-bottom))}
    .shorts{height:calc(100vh - 64px - 74px - env(safe-area-inset-bottom))}
    /* karty ako YouTube appka: kanál · zhliadnutia · dátum v jednom riadku */
    .grid .mt-sep br{display:none}
    .grid .mt-sep::before{content:" · "}
    .grid span.chl{display:inline;border:0;padding:0;margin:0;background:none;color:var(--text2);font-size:14px;font-weight:400}
    .grid span.chl::before{display:none}
    .grid .tt{font-size:17px;line-height:23px}
    .grid .av{width:42px;height:42px}
    .grid .cmore{margin-right:0}
  }
  .music-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:14px}
  .music-head h1{margin:0;font-size:26px}
  .music-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .music-bar h2{margin:20px 0 12px}
  .aadd{top:44px}
  .unavail{display:flex;flex-direction:column;align-items:center;gap:14px;max-width:440px;padding:18px 20px;border-radius:14px;background:rgba(10,12,36,.88);pointer-events:auto;line-height:1.5}
  .unavail .acts{justify-content:center}
  .album-empty{display:grid;place-items:center;width:100%;height:100%;font-size:48px;color:var(--text2)}
  .al-rm{position:absolute;top:6px;left:6px;z-index:2;width:30px;height:30px;border:0;border-radius:8px;background:rgba(10,12,36,.85);color:#fff;cursor:pointer}
  .al-rm:hover{background:#b91c1c}
  .apick{max-width:440px}
  .ap-video{display:flex;gap:12px;align-items:center;margin:14px 0}
  .ap-video img{width:110px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;flex:none}
  .ap-list{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;margin-bottom:14px}
  .ap-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:var(--bg2);border:1px solid var(--line);cursor:pointer}
  .ap-row span:nth-child(2){flex:1;font-weight:600}
  .ap-row input{width:20px;height:20px;accent-color:var(--violet)}
  .ap-new{display:flex;gap:8px}
  .ap-new input{flex:1;min-width:0;height:38px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg2);outline:0}
  .ap-new input:focus{border-color:var(--violet)}
  .hicons{display:flex;align-items:center;gap:4px;flex:none}
  .hicon{position:relative;display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:50%;background:none;font-size:18px;cursor:pointer;color:var(--text)}
  .hicon:hover{background:var(--soft)}
  .badge{position:absolute;top:2px;right:0;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;line-height:17px;text-align:center}
  .badge[hidden]{display:none}
  .bellwrap{position:relative}
  .bell-menu{top:46px;right:-60px;width:min(380px,calc(100vw - 24px))}
  .bell-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .bell-list{max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
  .bell-item{display:flex;gap:10px;padding:6px;border-radius:10px;align-items:flex-start}
  .bell-item:hover{background:var(--soft)}
  .bell-item img{width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;flex:none}
  .bell-item .tt{font-size:13px;line-height:18px}
  .bell-item .mt{font-size:12px}
  .bell-refresh{width:100%;justify-content:center;display:inline-flex;align-items:center}
  .settings h2{margin:26px 0 8px;font-size:17px;color:var(--accent-text)}
  .set-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;margin-bottom:8px;background:var(--bg2);border:1px solid var(--line);border-radius:12px;cursor:pointer}
  .set-row input[type=checkbox]{width:22px;height:22px;flex:none;accent-color:var(--violet);cursor:pointer}
  .set-row select{max-width:200px}
  :root{--s-v:#3987e5;--s-m:#d95926;--s-s:#199e70}
  :root[data-mode=light]{--s-v:#2a78d6;--s-m:#eb6834;--s-s:#1baf7a}
  a.set-row{color:inherit;text-decoration:none}
  .st-hero{display:flex;flex-direction:column;margin:18px 0 4px}
  .st-hero b{font-size:40px;line-height:1.15}
  .st-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:14px 0}
  .st-tile{display:flex;flex-direction:column;gap:2px;padding:12px 14px;background:var(--bg2);border:1px solid var(--line);border-radius:12px;line-height:1.35}
  .st-tile b{font-size:20px}
  .st-tile .mt{font-size:12.5px}
  .st-facts p{margin:6px 0}
  .st-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin-bottom:10px;font-size:14px}
  .st-legend span{display:inline-flex;align-items:center;gap:6px}
  .st-legend i{width:12px;height:12px;border-radius:3px}
  .st-chart{display:flex;align-items:flex-end;gap:2px;height:160px;padding:10px 8px 0;background:var(--bg2);border:1px solid var(--line);border-radius:12px 12px 0 0}
  .st-col{flex:1;min-width:0;height:100%;display:flex;flex-direction:column-reverse;gap:2px;border-radius:4px 4px 0 0;cursor:pointer;outline:none}
  .st-col:hover,.st-col.on,.st-col:focus-visible{background:var(--soft)}
  .st-col i{display:block;flex:none;width:100%}
  .st-col i:last-child{border-radius:4px 4px 0 0}
  .st-v{background:var(--s-v)}
  .st-m{background:var(--s-m)}
  .st-s{background:var(--s-s)}
  .st-axis{display:flex;justify-content:space-between;padding:4px 8px 0;font-size:12px;color:var(--text2)}
  .st-eq span{flex:1;text-align:center}
  .st-tip{min-height:1.6em;margin:4px 0 0;font-size:13.5px}
  .st-table summary{cursor:pointer;color:var(--link);font-size:14px;margin-top:6px}
  .st-table table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13.5px}
  .st-table th,.st-table td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line)}
  .st-list{list-style:none;margin:0;padding:0}
  .st-list a{display:block;padding:10px 14px;margin-bottom:8px;background:var(--bg2);border:1px solid var(--line);border-radius:12px;color:inherit;text-decoration:none}
  .st-list .st-lt,.st-list .mt{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .st-list .st-lt{font-weight:600}
  .st-list .mt{font-size:13px}
  .st-bar{display:block;height:4px;margin-top:6px;border-radius:2px;background:var(--soft);overflow:hidden}
  .st-bar i{display:block;height:100%;border-radius:2px;background:var(--s-v)}
  .srow{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(150px,180px);gap:12px;overflow-x:auto;padding-bottom:8px}
  .scard{display:flex;flex-direction:column;gap:6px;min-width:0}
  .sthumb{display:block;aspect-ratio:9/16;border-radius:12px;overflow:hidden;background:var(--soft)}
  .sthumb img{width:100%;height:100%;object-fit:cover}
  .scard .tt{font-size:14px;line-height:19px}
  .shorts{height:calc(100vh - 140px);overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;margin-top:10px}
  .shorts::-webkit-scrollbar{display:none}
  .short{height:100%;scroll-snap-align:start;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center;gap:14px;padding:8px 0}
  .short-frame{position:relative;height:100%;aspect-ratio:9/16;max-width:100%;border-radius:16px;overflow:hidden;background:#000;cursor:pointer}
  .short-frame video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
  .short-info{position:absolute;left:0;right:0;bottom:0;padding:40px 14px 14px;background:linear-gradient(transparent,rgba(0,0,0,.75));pointer-events:none}
  .short-t{font-weight:600;font-size:15px;line-height:1.35;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
  .short-v{color:#ddd;font-size:13px;margin-top:4px}
  .short-state{position:absolute;inset:0;display:grid;place-items:center;color:#fca5a5;text-align:center;padding:20px;pointer-events:none}
  .short-acts{display:flex;flex-direction:column;gap:12px}
  .short-b{display:grid;place-items:center;width:48px;height:48px;border:0;border-radius:50%;background:var(--soft);font-size:20px;cursor:pointer;color:var(--text)}
  .short-b:hover{background:var(--hover)}
  @media (max-width:700px){
    .shorts{height:calc(100vh - 120px);margin-top:6px}
    .short{padding:0;gap:0;position:relative}
    .short-frame{border-radius:0;width:100%;aspect-ratio:auto}
    .short-acts{position:absolute;right:10px;bottom:110px}
    .hicon{width:34px;height:34px;font-size:16px}
  }
  .votes{display:inline-flex;gap:12px;color:var(--text2);font-size:13px;margin-right:auto;padding-left:12px}
  .votes:empty{display:none}
  .qadd{position:absolute;top:6px;right:6px;width:32px;height:32px;border:0;border-radius:8px;background:rgba(10,12,36,.85);color:#fff;font-size:16px;cursor:pointer;opacity:0;transition:opacity .15s}
  .card:hover .qadd,.qadd:focus-visible{opacity:1}
  @media (hover:none){.qadd{opacity:.85}}
  .qadd:hover{background:var(--violet)}
  .pl-badge{position:absolute;right:0;bottom:0;left:0;padding:6px 10px;background:rgba(10,12,36,.82);font-size:12px;font-weight:600;text-align:right}
  .plc .th::before{content:"";position:absolute;inset:-4px 10px auto;height:4px;border-radius:4px 4px 0 0;background:var(--hover)}
  .plhead{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:20px 0 16px}
  .plhead h1{margin:0 0 4px;font-size:26px}
  .qbox{border:1px solid var(--line);border-radius:14px;background:var(--bg2);overflow:hidden;margin-bottom:12px}
  .qhead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
  .qlist{max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:8px}
  .qlist .card{padding:4px;border-radius:10px}
  .qlist .card.qon{background:var(--soft);outline:1px solid var(--violet)}
  .qlist .qadd{display:none}
  .filters{margin:14px 0 4px;padding:10px 14px;background:var(--bg2);border:1px solid var(--line);border-radius:14px}
  .filters summary{cursor:pointer;font-weight:600}
  .fgroup{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
  .flabel{min-width:80px;color:var(--text2);font-size:13px}
  .fchip{height:30px;display:inline-flex;align-items:center;padding:0 12px;border-radius:8px;background:var(--soft);border:1px solid var(--line);font-size:13px;font-weight:600}
  .fchip.on{background:var(--chip-on-bg);color:var(--chip-on-fg);border-color:transparent}
  .player.audio-only::after{content:"🎧 Len zvuk";position:absolute;left:12px;top:12px;padding:6px 12px;border-radius:14px;background:rgba(10,12,36,.85);font-size:13px;font-weight:600;pointer-events:none}
  .pc-row{grid-template-columns:repeat(4,1fr)!important;row-gap:10px}
  .pc-o:disabled{opacity:.35;cursor:default}
  .chips{position:relative;margin-top:14px}
  .chips:empty{display:none}
  .chips-row{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding-right:48px}
  .chips-row::-webkit-scrollbar{display:none}
  .chip{flex:none;height:34px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:var(--soft);color:var(--text);font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap}
  .chip:hover{background:var(--hover)}
  .chip.on{background:var(--chip-on-bg);color:var(--chip-on-fg);border-color:transparent}
  .chips-arrow{position:absolute;right:0;top:0;width:44px;height:34px;border:0;border-radius:17px;background:linear-gradient(90deg,transparent,var(--bg) 40%);color:var(--text);font-size:24px;line-height:1;cursor:pointer;text-align:right;padding-right:8px}
  .chips-arrow[hidden]{display:none}
  .pc-overlay{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(5,6,20,.6);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  .side.pc-open > :not(#pc){display:none}
  .pc-dock{position:sticky;top:76px}
  .pc-dock .pc-sheet{width:auto;box-shadow:none}
  .pc-sheet{width:min(440px,calc(100vw - 24px));padding:16px 18px 20px;background:var(--sheet);border:1px solid var(--line);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .pc-head{display:flex;align-items:center;gap:10px;font-size:18px;padding-bottom:12px;border-bottom:1px solid var(--line)}
  .pc-logo{display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:var(--grad);font-weight:800;font-size:14px;color:#fff}
  .pc-head b{flex:1}
  .pc-x{border:0;background:none;font-size:20px;cursor:pointer;color:var(--text)}
  .pc-title{margin:22px 0 6px;font-size:20px;font-weight:700;text-align:center;line-height:1.3;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .pc-ch{text-align:center;color:var(--text2);font-weight:500}
  .pc-main{display:flex;align-items:center;justify-content:space-between;margin:30px 4px}
  .pc-b{display:grid;place-items:center;width:52px;height:52px;border:0;border-radius:50%;background:none;color:var(--text);cursor:pointer}
  .pc-b svg{width:38px;height:38px}
  .pc-b:hover:not(:disabled){background:var(--soft)}
  .pc-b:disabled{opacity:.3;cursor:default}
  .pc-play{width:72px;height:72px;background:var(--grad);color:#fff;box-shadow:0 6px 24px rgba(139,92,246,.45)}
  .pc-play:hover:not(:disabled){background:var(--grad);filter:brightness(1.12)}
  .pc-play svg{width:42px;height:42px}
  .pc-row{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
  .pc-o{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 2px;border:0;border-radius:12px;background:none;color:var(--text);font-size:12px;font-weight:600;cursor:pointer;text-align:center;line-height:1.2}
  .pc-o svg{width:26px;height:26px}
  .pc-o:hover{background:var(--soft)}
  .pc-o.on{color:var(--accent-text)}
  .pc-o.on svg{filter:drop-shadow(0 0 6px rgba(139,92,246,.8))}
  .pc-sub{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
  .pc-sub[hidden]{display:none}
  .pc-sub-t{font-weight:600;margin-bottom:10px}
  .pc-sub-list{display:flex;flex-wrap:wrap;gap:8px}
  .pc-chip{height:34px;padding:0 14px;border:1px solid var(--line);border-radius:17px;background:var(--soft);color:var(--text);font-weight:600;cursor:pointer}
  .pc-chip.on{background:var(--grad);border-color:transparent;color:#fff}
  @media (max-width:700px){
    .pc-overlay{align-items:flex-end}
    .pc-sheet{width:100%;border-radius:20px 20px 0 0;padding-bottom:calc(20px + env(safe-area-inset-bottom))}
  }
  .cur-chap{color:var(--accent-text);font-size:13px;min-height:0;margin:-2px 0 6px}
  .cur-chap:empty{display:none}
  .desc{margin-top:14px;padding:12px 14px;background:var(--bg2);border:1px solid var(--line);border-radius:12px}
  .desc[hidden],.chapters[hidden]{display:none}
  .desc-text{white-space:pre-wrap;word-break:break-word;line-height:1.5;max-height:4.5em;overflow:hidden;font-size:14px}
  .desc.open .desc-text{max-height:none}
  .desc a,.desc-text a{color:var(--link)}
  .desc-more{margin-top:6px;border:0;background:none;padding:0;font-weight:600;cursor:pointer;color:var(--text)}
  .desc-more[hidden]{display:none}
  .chapters{margin-top:14px}
  .chapters h3{font-size:16px;margin:0 0 8px}
  .ch-list{display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto}
  .chap{display:flex;gap:12px;align-items:baseline;padding:8px 12px;border-radius:10px;background:var(--bg2);border:1px solid transparent;font-size:14px}
  .chap:hover{background:var(--soft)}
  .chap.on{border-color:var(--violet);background:var(--soft)}
  .chap-t{color:var(--link);font-variant-numeric:tabular-nums;flex:none;min-width:52px}
  .hrow{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,300px);gap:16px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin}
  video::cue{background:rgba(10,12,36,.82);color:#fff;font-size:1.05em;line-height:1.35}
  .mini{position:fixed;right:16px;bottom:16px;z-index:55;width:min(400px,calc(100vw - 32px));border-radius:14px;overflow:hidden;background:#000;border:1px solid var(--violet);box-shadow:0 14px 40px rgba(0,0,0,.6)}
  .mini[hidden]{display:none}
  .mini .player{border-radius:0;box-shadow:none;max-height:none;position:relative;top:auto}
  .mini-bar{display:flex;align-items:center;gap:6px;padding:6px 8px 6px 12px;background:var(--bg2)}
  .mini-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500}
  .mini-b{flex:none;width:32px;height:32px;border:0;border-radius:50%;background:var(--soft);cursor:pointer;font-size:15px}
  .mini-b:hover{background:var(--hover)}
  .more{position:relative}
  #more-btn{width:36px;padding:0;font-size:20px;line-height:1}
  .more-menu{top:44px;right:0;min-width:280px}
  .more-menu .pill{justify-content:flex-start;width:100%}
  .dlbar{position:fixed;right:16px;bottom:16px;z-index:60;width:min(360px,calc(100vw - 32px));padding:12px 14px;background:var(--bg2);border:1px solid var(--violet);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
  .dl-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:13px}
  .dl-x{border:0;background:var(--soft);border-radius:50%;width:26px;height:26px;cursor:pointer;flex:none}
  .dl-track{height:6px;border-radius:3px;background:var(--soft);overflow:hidden}
  .dl-track i{display:block;height:100%;width:0;background:var(--grad);transition:width .2s}
  .pill.on{background:var(--grad);color:#fff}
  .pill:disabled{opacity:.6}
  .toast{position:fixed;left:50%;bottom:24px;z-index:50;transform:translate(-50%,150%);opacity:0;transition:.2s;padding:12px 18px;border-radius:12px;background:var(--bg2);border:1px solid var(--violet);color:var(--text);max-width:calc(100vw - 32px)}
  .toast.show{transform:translate(-50%,0);opacity:1}
  .brand{display:flex;flex-direction:column;gap:2px;flex:none}
  .howto{font-size:11px;color:var(--text2);text-align:center;white-space:nowrap}
  .howto:hover{color:var(--text)}
  .help{max-width:820px;margin:0 auto;padding:8px 0 40px;line-height:1.6}
  .help h1{font-size:26px;margin:20px 0 6px}
  .help .lead{color:var(--text2);margin:0 0 20px}
  .tabs{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}
  .tab{height:38px;padding:0 18px;border:1px solid var(--line);border-radius:19px;background:var(--soft);font-weight:600;cursor:pointer}
  .tab.on{background:var(--grad);border-color:transparent;color:#fff}
  .steps{counter-reset:st;list-style:none;padding:0;margin:0}
  .steps li{position:relative;padding:14px 16px 14px 58px;margin-bottom:10px;background:var(--bg2);border:1px solid var(--line);border-radius:14px}
  .steps li::before{counter-increment:st;content:counter(st);position:absolute;left:14px;top:13px;width:30px;height:30px;border-radius:50%;background:var(--grad);display:grid;place-items:center;font-weight:700;color:#fff}
  .steps b{color:#fff}
  .help code{background:var(--soft);padding:2px 6px;border-radius:6px;font-size:13px;word-break:break-all}
  .note{margin:16px 0;padding:12px 16px;border-left:3px solid var(--violet);background:var(--bg2);border-radius:0 10px 10px 0;color:var(--text2)}
  .dl{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 20px}
  .logo small{font-size:11px;font-weight:400;letter-spacing:0;color:var(--text2)}
  form{display:flex;flex:1;max-width:640px;margin:0 auto;min-width:0}
  form input{flex:1;min-width:0;height:40px;padding:0 16px;border:1px solid var(--line);border-right:0;border-radius:20px 0 0 20px;background:var(--bg2);outline:0;font-size:16px}
  form input:focus{border-color:var(--violet);box-shadow:0 0 0 1px var(--violet)}
  form button{width:60px;height:40px;border:1px solid var(--line);border-radius:0 20px 20px 0;background:var(--grad);border-color:transparent;display:grid;place-items:center;cursor:pointer}
  main{padding:0 24px 40px;max-width:1800px;margin:0 auto}
  h2{font-size:20px;margin:20px 0 12px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:32px 16px}
  .card{display:block;min-width:0}
  .th{position:relative;display:block;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:var(--soft)}
  .th img{width:100%;height:100%;object-fit:cover;display:block}
  .dur{position:absolute;right:6px;bottom:6px;padding:1px 4px;border-radius:4px;background:rgba(10,12,36,.85);font-size:12px;font-weight:500}
  .bar{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.3)}
  .bar i{display:block;height:100%;background:var(--grad)}
  .cb{display:flex;gap:12px;padding-top:12px}
  .av{width:36px;height:36px;border-radius:50%;flex:none;background:var(--soft)}
  .tt{margin:0 0 4px;font-size:16px;font-weight:500;line-height:22px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  .mt{color:var(--text2);font-size:14px}
  .watch{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:24px;padding-top:12px}
  .player{position:relative;background:#000;border-radius:12px;box-shadow:0 8px 40px rgba(63,94,251,.25);overflow:hidden;aspect-ratio:16/9;max-height:calc(100vh - 160px);width:100%}
  .player video{width:100%;height:100%;display:block;background:#000}
  .cast-ov{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;background:#000;color:#fff;text-align:center}
  .cast-ov .cast-ic svg{width:44px;height:44px;fill:currentColor;opacity:.85}
  .cast-ov .pc-b{color:#fff}
  .cast-ov .mt{color:#bbb}
  .yc-air svg{fill:currentColor}
  .msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:#ddd;pointer-events:none}
  .msg:empty{display:none}
  .msg button{pointer-events:auto}
  .spin{width:44px;height:44px;border:4px solid rgba(255,255,255,.2);border-top-color:var(--violet);border-radius:50%;animation:s 1s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  .bigplay{width:72px;height:72px;border-radius:50%;border:0;background:rgba(0,0,0,.7);display:grid;place-items:center;cursor:pointer}
  .bigplay svg{width:40px;height:40px}
  .wt{font-size:20px;font-weight:600;margin:12px 0 6px;line-height:28px}
  .row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .pill{height:36px;padding:0 14px;border:0;border-radius:18px;background:var(--soft);font-weight:500;cursor:pointer}
  .pill:hover{background:var(--hover)}
  select.pill{appearance:none;-webkit-appearance:none}
  .side{display:flex;flex-direction:column;gap:10px}
  .side .card{display:flex;gap:8px}
  .side .th{width:168px;flex:none;border-radius:8px}
  .side .cb{display:block;padding:0}
  .side .av{display:none}
  .side .tt{font-size:14px;line-height:20px}
  .side .mt{font-size:12px}
  .chl{cursor:pointer}
  span.chl{display:inline-flex;align-items:center;gap:4px;max-width:100%;margin:6px 0 4px;padding:4px 12px;border:1px solid var(--chl-border);border-radius:16px;background:var(--soft);color:var(--text);font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  span.chl::before{content:"▶";font-size:9px;color:var(--violet)}
  span.chl:hover{background:var(--hover);border-color:var(--violet)}
  #wm span.chl{font-size:16px;padding:6px 16px;border-radius:20px;margin:0 6px 0 0}
  .side span.chl{font-size:12px;padding:2px 10px;margin:4px 0 2px}
  .chans{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
  .chan{display:flex;flex-direction:column;align-items:center;gap:6px;width:88px;flex:none;text-align:center;font-size:12px}
  .chan img,.chan .av{width:64px;height:64px;border-radius:50%;object-fit:cover}
  .chan span:last-child{width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chhead{display:flex;align-items:center;gap:16px;padding:20px 0;flex-wrap:wrap}
  .chhead img{width:72px;height:72px;border-radius:50%}
  .chhead h1{font-size:24px;margin:0;flex:1;min-width:0}
  .side-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .side-head h2{margin:0;font-size:16px}
  .ap{display:flex;align-items:center;gap:6px;color:var(--text2);font-size:13px;cursor:pointer}
  #rel{display:flex;flex-direction:column;gap:10px}
  .nextup{background:rgba(10,12,36,.9);border:1px solid var(--line);padding:20px;border-radius:12px;max-width:360px;pointer-events:auto}
  .nt{font-size:16px;font-weight:600;margin:6px 0 14px}
  .pill-w{background:var(--grad);color:#fff}
  .pill-w:hover{filter:brightness(1.15)}
  .empty{text-align:center;color:var(--text2);padding:60px 16px;line-height:1.6}
  .err{color:#ff8a8a}
  .sent{height:1px}
  @media (max-width:1000px){.watch{grid-template-columns:minmax(0,1fr)}}
  @media (max-width:700px){
    .mh{gap:8px;padding:0 8px;padding-top:env(safe-area-inset-top)}
    .logo span{display:none}
    form button{width:48px}
    main{padding:0 0 32px}
    h2,.home-note,.chans,.chhead,.help,.chips,.music-head,.music-bar{padding-left:12px;padding-right:12px}
    .music-bar h2{padding:0}
    .chips-arrow{display:none}
    .howto{padding-left:0;font-size:10px;text-align:center}
    .me-name{display:none}
    .acct .login{height:34px;padding:0 10px;font-size:13px}
    .nav{padding:10px 12px 0}
    .hint{margin:12px}
    .side h2{padding:0}
    .grid{grid-template-columns:1fr;gap:20px}
    .grid .th{border-radius:0}
    .grid .cb{padding:12px 12px 0}
    .watch{padding:0;gap:12px}
    .player{border-radius:0;position:sticky;top:calc(56px + env(safe-area-inset-top));z-index:10}
    .info{padding:0 12px}
    .wt{font-size:18px;line-height:24px}
    .side{padding:0 12px}
    .side .th{width:44%}
  }`;

  const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const ICON_SEARCH = '<svg viewBox="0 0 24 24"><path d="M20.87 20.17 15.28 14.58A7.5 7.5 0 1 0 14.58 15.28l5.59 5.59zM4 9.5A5.5 5.5 0 1 1 9.5 15 5.5 5.5 0 0 1 4 9.5z"/></svg>';

  // všetky zobrazené videá – aby prehrávač hneď poznal názov a kanál
  const seen = new Map();

  function card(v, href) {
    seen.set(v.id, v);
    const p = data.pos[v.id];
    const pct = p && p.d ? Math.min(100, (p.p / p.d) * 100) : 0;
    // href len ak je to naozaj odkaz (pri .map(card) sem príde poradové číslo)
    return `<a class="card" href="${esc(typeof href === 'string' ? href : `#v=${v.id}`)}" data-id="${esc(v.id)}">
      <span class="th"><img loading="lazy" src="${thumb(v.id)}" alt="">${v.duration ? `<span class="dur">${esc(v.duration)}</span>` : ''}${pct > 2 ? `<span class="bar"><i style="width:${pct.toFixed(1)}%"></i></span>` : ''}</span>
      <span class="cb">${v.avatar ? `<img class="av${v.channelId ? ' chl' : ''}" loading="lazy" src="${esc(v.avatar)}" alt=""${v.channelId ? ` data-ch="${esc(v.channelId)}"` : ''}>` : '<span class="av"></span>'}
        <span class="ct"><span class="tt">${esc(v.title)}</span><span class="mt">${chLink(v.channel, v.channelId)}${v.views || v.published ? '<span class="mt-sep"><br></span>' : ''}${esc([v.views, v.published].filter(Boolean).join(' • '))}</span></span>
        <button class="cmore" data-cmore="${esc(v.id)}" aria-label="Ďalšie možnosti" title="Ďalšie možnosti">⋮</button>
      </span></a>`;
  }

  // ⋮ pri karte videa: Prehrať ďalej, Pridať do albumu, Pozrieť neskôr, Kopírovať odkaz
  function openCardMenu(btn) {
    closeCardMenu();
    const id = btn.dataset.cmore;
    const m = document.createElement('div');
    m.className = 'menu cmenu';
    m.id = 'cmenu';
    setHTML(m, `<button class="pill" data-qadd="${esc(id)}">⤵ Prehrať ďalej</button>
      <button class="pill" data-album="${esc(id)}">＋ Pridať do albumu</button>
      ${loggedIn() ? `<button class="pill" data-later2="${esc(id)}">🕒 Uložiť do Pozrieť neskôr</button>` : ''}
      <button class="pill" data-copy="${esc(id)}">🔗 Kopírovať odkaz</button>`);
    document.body.append(m);
    // umiestni menu pri tlačidle, aby nevyliezlo z obrazovky
    const r = btn.getBoundingClientRect();
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    m.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
    m.style.top = `${r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4}px`;
  }
  const closeCardMenu = () => document.getElementById('cmenu')?.remove();
  addEventListener('scroll', closeCardMenu, { passive: true });
  document.addEventListener('click', (e) => { if (!e.target.closest?.('#cmenu,[data-cmore]')) closeCardMenu(); });

  function shortCard(v, query) {
    return `<a class="scard" href="#shorts&s=${esc(v.id)}${query ? `&sq=${encodeURIComponent(query)}` : ''}">
      <span class="sthumb"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(v.id)}/oar2.jpg" alt="" onerror="this.src='https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg'"></span>
      <span class="tt">${esc(v.title)}</span><span class="mt">${esc(v.views)}</span></a>`;
  }

  function playlistCard(p) {
    return `<a class="card plc" href="#list=${esc(p.id)}">
      <span class="th">${p.thumb ? `<img loading="lazy" src="${esc(p.thumb)}" alt="">` : ''}<span class="pl-badge">☰ ${esc(p.count || 'Playlist')}</span></span>
      <span class="cb"><span><span class="tt">${esc(p.title)}</span><span class="mt">${esc(p.owner || 'Playlist')}<br>Zobraziť celý playlist</span></span></span></a>`;
  }

  // „Prehrať ďalej“ a „Pridať do albumu“ – tlačidlá na náhľade (vnútri odkazu, preto zachytíme klik skôr)
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-qadd],[data-album],[data-cmore],[data-later2],[data-copy]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (b.dataset.cmore) return document.getElementById('cmenu') && b === lastMoreBtn ? (closeCardMenu(), (lastMoreBtn = null)) : (openCardMenu(b), (lastMoreBtn = b));
    closeCardMenu();
    const id = b.dataset.qadd || b.dataset.album || b.dataset.later2 || b.dataset.copy;
    const v = seen.get(id);
    if (b.dataset.copy) {
      const url = `https://youtu.be/${id}`;
      navigator.clipboard?.writeText(url).then(() => toast('Odkaz skopírovaný'), () => prompt('Odkaz na video:', url));
      return;
    }
    if (b.dataset.later2) {
      setLater(id, true).then(() => toast('Uložené do „Pozrieť neskôr“'), (err) => toast(`Nepodarilo sa: ${err.message}`));
      return;
    }
    if (!v) return;
    if (b.dataset.qadd) addToQueue(v);
    else openAlbumPicker(v);
  }, true);
  let lastMoreBtn = null;

  // ================= albumy (vlastné zbierky skladieb, uložené v prehliadači) =================
  const albumById = (id) => data.albums.find((a) => a.id === id);
  // 1 skladba, 2–4 skladby, 5+ skladieb
  const songs = (n) => `${n} ${n === 1 ? 'skladba' : n >= 2 && n <= 4 ? 'skladby' : 'skladieb'}`;
  const albumThumb = (a) => (a.items[0] ? `https://i.ytimg.com/vi/${a.items[0].id}/mqdefault.jpg` : '');

  function albumCard(a) {
    return `<a class="card plc" href="#album=${esc(a.id)}">
      <span class="th">${a.items[0] ? `<img loading="lazy" src="${albumThumb(a)}" alt="">` : '<span class="album-empty">♫</span>'}<span class="pl-badge">♫ ${songs(a.items.length)}</span></span>
      <span class="cb"><span><span class="tt">${esc(a.name)}</span><span class="mt">Môj album</span></span></span></a>`;
  }

  function createAlbum(name) {
    const a = { id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: name.trim().slice(0, 80) || 'Nový album', items: [], created: Date.now() };
    data.albums.unshift(a);
    save();
    return a;
  }

  function toggleInAlbum(a, v) {
    const i = a.items.findIndex((x) => x.id === v.id);
    if (i >= 0) a.items.splice(i, 1);
    else a.items.push({ id: v.id, title: v.title, channel: v.channel, channelId: v.channelId, avatar: v.avatar, duration: v.duration, views: v.views, published: v.published });
    save();
    return i < 0;
  }

  // okno „Pridať do albumu“: zoznam albumov so zaškrtnutím + nový album
  function openAlbumPicker(v) {
    document.getElementById('apick')?.remove();
    const el = document.createElement('div');
    el.className = 'pc-overlay';
    el.id = 'apick';
    const paint = () => {
      setHTML(el, `<div class="pc-sheet apick" role="dialog" aria-label="Pridať do albumu">
        <div class="pc-head"><span class="pc-logo">♫</span><b>Pridať do albumu</b><button class="pc-x" id="ap-x" aria-label="Zavrieť">✕</button></div>
        <div class="ap-video"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt=""><span class="tt">${esc(v.title)}</span></div>
        <div class="ap-list">${data.albums.length
          ? data.albums.map((a) => `<label class="ap-row"><input type="checkbox" data-aid="${esc(a.id)}"${a.items.some((x) => x.id === v.id) ? ' checked' : ''}><span>${esc(a.name)}</span><span class="mt">${a.items.length}</span></label>`).join('')
          : '<p class="mt">Zatiaľ nemáš žiadny album – vytvor si prvý.</p>'}</div>
        <form class="ap-new" id="ap-new"><input id="ap-name" placeholder="Názov nového albumu" maxlength="80" autocomplete="off"><button class="pill pill-w">＋ Vytvoriť</button></form>
      </div>`);
      el.querySelector('#ap-x').onclick = () => el.remove();
      el.querySelectorAll('[data-aid]').forEach((c) => {
        c.onchange = () => {
          const a = albumById(c.dataset.aid);
          if (!a) return;
          const added = toggleInAlbum(a, v);
          toast(added ? `Pridané do albumu „${a.name}“` : `Odstránené z albumu „${a.name}“`);
          c.closest('.ap-row').querySelector('.mt').textContent = a.items.length;
        };
      });
      el.querySelector('#ap-new').onsubmit = (e) => {
        e.preventDefault();
        const name = el.querySelector('#ap-name').value;
        if (!name.trim()) return el.querySelector('#ap-name').focus();
        const a = createAlbum(name);
        toggleInAlbum(a, v);
        toast(`Vytvorený album „${a.name}“ a pridané video`);
        paint();
      };
    };
    paint();
    el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
    document.body.append(el);
  }

  function renderAlbum(app, id) {
    const a = albumById(id);
    document.getElementById('q').value = '';
    if (!a) return setHTML(app, '<div class="empty">Album neexistuje (možno bol zmazaný).</div>');
    document.title = `${a.name} – JUTUBE`;
    setHTML(app, `<div class="plhead">
        <div><div class="mt">Môj album</div><h1>${esc(a.name)}</h1><div class="mt">${songs(a.items.length)}</div></div>
        <div class="acts">${a.items.length ? '<button class="pill pill-w" id="al-play">▶ Prehrať všetko</button><button class="pill" id="al-shuffle">🔀 Náhodne</button>' : ''}<button class="pill" id="al-rename">✎ Premenovať</button><button class="pill" id="al-delete">🗑 Zmazať album</button></div>
      </div>
      ${a.items.length
        ? `<div class="grid" id="grid">${a.items.map((v) => card(v).replace('<span class="th">', `<span class="th"><button class="al-rm" data-rm="${esc(v.id)}" title="Odstrániť z albumu" aria-label="Odstrániť z albumu">✕</button>`)).join('')}</div>`
        : '<div class="empty">Album je prázdny. Videá pridáš tlačidlom ＋ na náhľade alebo „＋ Do albumu“ pod videom.</div>'}`);
    const playAll = (items) => {
      queue = { title: `Album: ${a.name}`, listId: null, items: [...items], cont: null };
      location.hash = `#v=${items[0].id}`;
    };
    document.getElementById('al-play')?.addEventListener('click', () => playAll(a.items));
    document.getElementById('al-shuffle')?.addEventListener('click', () => playAll([...a.items].sort(() => Math.random() - 0.5)));
    document.getElementById('al-rename').onclick = () => {
      const name = prompt('Nový názov albumu:', a.name);
      if (!name?.trim()) return;
      a.name = name.trim().slice(0, 80);
      save();
      renderAlbum(app, id);
    };
    document.getElementById('al-delete').onclick = () => {
      if (!confirm(`Zmazať album „${a.name}“? Videá na YouTube zostanú, zmaže sa len tvoj zoznam.`)) return;
      data.albums = data.albums.filter((x) => x.id !== id);
      save();
      toast('Album zmazaný');
      location.hash = '#feed=playlists';
    };
    document.getElementById('grid')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm]');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      a.items = a.items.filter((x) => x.id !== b.dataset.rm);
      save();
      renderAlbum(app, id);
    }, true);
  }

  // názov kanála ako odkaz (vnútri karty nesmie byť <a>, preto span + delegovaný klik)
  function chLink(name, id) {
    return id ? `<span class="chl" data-ch="${esc(id)}" role="link">${esc(name)}</span>` : esc(name);
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-ch]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    location.hash = `#c=${el.dataset.ch}`;
  }, true);

  // ================= kostra stránky =================
  function boot() {
    // Volá sa až po dočítaní textu robots.txt, takže prehliadač už do stránky nič nedopíše.
    const root = document.documentElement || document.appendChild(document.createElement('html'));
    while (root.firstChild) root.removeChild(root.firstChild);
    const head = document.createElement('head');
    const body = document.createElement('body');
    root.append(head, body);
    root.lang = 'sk';
    applyTheme();
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    const style = document.createElement('style');
    style.textContent = CSS;
    // vlastná fialová ikona na karte (inak by prehliadač ukázal červenú ikonu YouTube)
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 20"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs><rect width="28" height="20" rx="5" fill="url(#g)"/><path d="M11 5.5v9l8-4.5z" fill="#fff"/></svg>')}`;
    head.append(meta, style, icon);
    setupAppManifest(head);
    // v okne aplikácie pridáva Edge pred názov meno aplikácie → koncovku „– JUTUBE“ vynecháme
    if (isApp()) {
      const strip = () => {
        const t = document.title.replace(/ – JUTUBE$/, '');
        if (t !== document.title) document.title = t;
      };
      new MutationObserver(strip).observe(head, { subtree: true, childList: true, characterData: true });
    }
    document.title = 'JUTUBE';
    setHTML(body, `
      <header class="mh">
        <button class="hicon menu-btn" id="menu-btn" aria-label="Ponuka" title="Ponuka">☰</button>
        <div class="brand"><a class="logo" href="#"><svg viewBox="0 0 28 20"><defs><linearGradient id="jg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs><rect width="28" height="20" rx="5" fill="url(#jg)"/><path d="M11 5.5v9l8-4.5z" fill="#fff"/></svg><span>JUTUBE<small>by Olejnik</small></span></a></div>
        <form id="f"><input id="q" type="search" placeholder="Hľadať na YouTube" autocomplete="off" enterkeyhint="search" role="combobox" aria-autocomplete="list" aria-controls="sugg"><button aria-label="Hľadať">${ICON_SEARCH}</button><div class="sugg" id="sugg" role="listbox" hidden></div></form>
        <div class="hicons">
          <span class="bellwrap"><button class="hicon" id="bell" title="Nové videá" aria-label="Nové videá">🔔<span class="badge" id="bell-badge" hidden></span></button><div class="menu bell-menu" id="bell-menu" hidden></div></span>
          <a class="hicon" href="#settings" title="Nastavenia" aria-label="Nastavenia">⚙</a>
        </div>
        <div class="acct" id="acct"></div>
      </header>
      <div class="shell">
        <aside class="sidenav" id="sidenav" aria-label="Ponuka"></aside>
        <div class="content">
          <nav class="nav" id="nav"></nav>
          <main id="app"></main>
        </div>
      </div>
      <nav class="tabbar" id="tabbar" aria-label="Spodná lišta"></nav>`);
    if (data.sideCollapsed) document.body.classList.add('side-collapsed');
    // ☰: na PC zbalí/rozbalí bočný panel, na stránke videa ho ukáže cez obsah (ako YouTube)
    document.getElementById('menu-btn').onclick = (e) => {
      e.stopPropagation();
      if (document.body.classList.contains('watching')) return document.body.classList.toggle('side-open');
      data.sideCollapsed = !document.body.classList.toggle('side-collapsed') ? false : true;
      save();
    };
    document.addEventListener('click', (e) => {
      if (document.body.classList.contains('side-open') && !e.target.closest('#sidenav')) document.body.classList.remove('side-open');
    });
    loadSubscribedChannels();
    renderAccount();

    document.getElementById('f').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('q').value.trim();
      if (!q) return;
      document.getElementById('q').blur();
      const id = parseVideoId(q);
      location.hash = id ? `#v=${id}` : `#q=${encodeURIComponent(q)}`;
    });
    setupSuggestions();
    setupBell();
    addEventListener('hashchange', route);
    route();
  }

  // ================= vzhľad: farebná téma + svetlý / tmavý režim =================
  const THEMES = [
    ['sapphire', 'Zafír', 'linear-gradient(135deg,#3f5efb,#8b5cf6)'],
    ['violet', 'Fialová', 'linear-gradient(135deg,#7c3aed,#c084fc)'],
    ['blue', 'Modrá', 'linear-gradient(135deg,#1d4ed8,#38bdf8)'],
    ['green', 'Zelená', 'linear-gradient(135deg,#059669,#4ade80)'],
    ['pink', 'Ružová', 'linear-gradient(135deg,#db2777,#f9a8d4)'],
    ['orange', 'Oranžová', 'linear-gradient(135deg,#ea580c,#fbbf24)'],
    ['red', 'Červená', 'linear-gradient(135deg,#b91c1c,#f87171)'],
  ];
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');

  function applyTheme() {
    const root = document.documentElement;
    const theme = THEMES.some(([k]) => k === data.theme) ? data.theme : 'sapphire';
    if (theme === 'sapphire') delete root.dataset.theme;
    else root.dataset.theme = theme;
    // režim: dark / light / auto (podľa nastavenia zariadenia)
    const mode = data.mode === 'light' || (data.mode === 'auto' && !darkQuery.matches) ? 'light' : 'dark';
    root.dataset.mode = mode;
    const color = mode === 'light' ? '#f4f5fb' : '#0a0c24';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => (m.content = color));
    updateHomeIcon();
  }
  // pri „Automaticky“ reaguj na zmenu režimu v systéme
  darkQuery.addEventListener?.('change', () => { if (data.mode === 'auto') applyTheme(); });

  // ================= inštalácia ako aplikácia (PC: Edge / Chrome) =================
  // Na robots.txt nemôžeme mať vlastný súbor manifest, tak si ho stránka vytvorí sama
  // (blob URL má rovnakú doménu ako stránka, takže ho prehliadač prijme).
  let installPrompt = null;
  const isApp = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches;

  function appIcon(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, size, size);
    gr.addColorStop(0, '#7c3aed');
    gr.addColorStop(1, '#c084fc');
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(0, 0, size, size, size * 0.22);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(size * 0.4, size * 0.3);
    g.lineTo(size * 0.4, size * 0.7);
    g.lineTo(size * 0.72, size * 0.5);
    g.closePath();
    g.fill();
    return c.toDataURL('image/png');
  }

  // Ikona na plochu iPhonu v štýle iOS 26 (Liquid Glass): farebné pozadie podľa témy, sklenená
  // dlaždica s jemným okrajom a odleskom, biely trojuholník „play“. Rohy zaobľuje sám iOS.
  function homeIcon(size, c1, c2) {
    const S = size;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    // pozadie: diagonálny prechod farieb témy + mäkké svetlo vľavo hore a tieň vpravo dole
    const bg = g.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);
    const glow = (x, y, r, color) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, color);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, S, S);
    };
    glow(S * 0.18, S * 0.1, S * 0.75, 'rgba(255,255,255,0.38)');
    glow(S * 0.95, S * 1.0, S * 0.7, 'rgba(10,8,40,0.35)');
    // sklenená dlaždica
    const w = S * 0.68;
    const h = S * 0.5;
    const x = (S - w) / 2;
    const y = (S - h) / 2 + S * 0.01;
    const r = S * 0.155;
    const tile = () => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    g.save();
    g.shadowColor = 'rgba(12,8,50,0.35)';
    g.shadowBlur = S * 0.08;
    g.shadowOffsetY = S * 0.035;
    tile();
    const glass = g.createLinearGradient(0, y, 0, y + h);
    glass.addColorStop(0, 'rgba(255,255,255,0.42)');
    glass.addColorStop(1, 'rgba(255,255,255,0.14)');
    g.fillStyle = glass;
    g.fill();
    g.restore();
    // odlesk v hornej časti skla
    g.save();
    tile();
    g.clip();
    const shine = g.createLinearGradient(0, y, 0, y + h * 0.55);
    shine.addColorStop(0, 'rgba(255,255,255,0.35)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = shine;
    g.beginPath();
    g.ellipse(S / 2, y - h * 0.15, w * 0.62, h * 0.55, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.save();
    tile();
    g.clip();
    const low = g.createLinearGradient(0, y + h * 0.7, 0, y + h);
    low.addColorStop(0, 'rgba(255,255,255,0)');
    low.addColorStop(1, 'rgba(255,255,255,0.18)');
    g.fillStyle = low;
    g.fillRect(x, y + h * 0.7, w, h * 0.3);
    g.restore();
    // svetlý okraj – jasnejší hore vľavo, ako keď na sklo dopadá svetlo
    tile();
    const rim = g.createLinearGradient(x, y, x + w, y + h);
    rim.addColorStop(0, 'rgba(255,255,255,0.95)');
    rim.addColorStop(0.45, 'rgba(255,255,255,0.25)');
    rim.addColorStop(1, 'rgba(255,255,255,0.55)');
    g.strokeStyle = rim;
    g.lineWidth = S * 0.012;
    g.stroke();
    // trojuholník „play“ so zaoblenými rohmi
    const cx = S / 2 + S * 0.02;
    const cy = y + h / 2;
    const t = S * 0.135;
    g.save();
    g.shadowColor = 'rgba(30,10,90,0.22)';
    g.shadowBlur = S * 0.04;
    g.shadowOffsetY = S * 0.006;
    g.beginPath();
    g.moveTo(cx - t * 0.62, cy - t * 0.78);
    g.lineTo(cx - t * 0.62, cy + t * 0.78);
    g.lineTo(cx + t * 0.78, cy);
    g.closePath();
    g.lineJoin = 'round';
    g.lineWidth = S * 0.045;
    g.strokeStyle = g.fillStyle = '#fff';
    g.stroke();
    g.shadowColor = 'transparent';
    g.fill();
    g.restore();
    return c.toDataURL('image/png');
  }

  // ikona na plochu iPhonu vo farbách zvolenej témy (mení sa spolu s témou)
  function updateHomeIcon() {
    const link = document.getElementById('home-icon');
    if (!link) return;
    const grad = (THEMES.find(([k]) => k === data.theme) || THEMES[0])[2];
    const [c1, c2] = grad.match(/#[0-9a-f]{6}/gi);
    link.href = homeIcon(360, c1, c2);
  }

  // iPhone / iPad (aj iPad, ktorý sa hlási ako Mac)
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function setupAppManifest(head) {
    // Na iPhone/iPade by manifest spôsobil, že ikona na ploche otvorí samostatnú webovú appku –
    // v nej Safari rozšírenia (Userscripts) nebežia a ukázal by sa len text robots.txt.
    // Dostane len ikonu a názov pre „Pridať na plochu“ (bez apple-mobile-web-app-capable).
    if (isIOS()) {
      const icon = document.createElement('link');
      icon.rel = 'apple-touch-icon';
      icon.id = 'home-icon';
      const title = document.createElement('meta');
      title.name = 'apple-mobile-web-app-title';
      title.content = 'JUTUBE';
      head.append(icon, title);
      updateHomeIcon();
      return;
    }
    try {
      const manifest = {
        name: 'JUTUBE',
        short_name: 'JUTUBE',
        description: 'YouTube bez reklám – by Olejnik',
        id: '/robots.txt?app=jutube',
        start_url: `${location.origin}/robots.txt`,
        scope: `${location.origin}/robots.txt`,
        display: 'standalone',
        background_color: '#0a0c24',
        theme_color: '#0a0c24',
        icons: [192, 512].map((s) => ({ src: appIcon(s), sizes: `${s}x${s}`, type: 'image/png', purpose: 'any' })),
      };
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
      const theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#0a0c24';
      head.append(link, theme);
    } catch {}
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
      document.querySelectorAll('[data-install]').forEach((b) => (b.hidden = false));
    });
    addEventListener('appinstalled', () => {
      installPrompt = null;
      toast('JUTUBE je nainštalované ako aplikácia 🎉');
    });
  }

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') installPrompt = null;
      return;
    }
    toast('Použi menu prehliadača – postup je v Nastaveniach');
  }

  // ================= návrhy pri písaní do vyhľadávania =================
  async function getSuggestions(q) {
    const u = `${location.origin}/complete/search?client=youtube&ds=yt&hl=sk&gl=sk&q=${encodeURIComponent(q)}`;
    const t = await (await fetch(u, { credentials: 'omit' })).text();
    const arr = JSON.parse(t.slice(t.indexOf('(') + 1, t.lastIndexOf(')')));
    return (arr[1] || []).map((x) => x[0]).filter(Boolean).slice(0, 10);
  }

  function setupSuggestions() {
    const input = document.getElementById('q');
    const box = document.getElementById('sugg');
    let items = [];
    let active = -1;
    let timer = null;
    let reqId = 0;
    const hide = () => { box.hidden = true; active = -1; };
    const paint = () => {
      if (!items.length) return hide();
      setHTML(box, items.map((s, i) => `<div class="sg${i === active ? ' on' : ''}" role="option" data-i="${i}">${ICON_SEARCH}<span>${esc(s)}</span></div>`).join(''));
      box.hidden = false;
    };
    const pick = (s) => {
      input.value = s;
      hide();
      document.getElementById('f').requestSubmit();
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q || parseVideoId(q)) { items = []; return hide(); }
      timer = setTimeout(async () => {
        const my = ++reqId;
        try {
          const list = await getSuggestions(q);
          if (my !== reqId || input.value.trim() !== q) return;
          items = list;
          active = -1;
          paint();
        } catch {
          hide();
        }
      }, 120);
    });
    input.addEventListener('keydown', (e) => {
      if (box.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // -1 = nič nevybraté (ostáva, čo si napísal)
        if (e.key === 'ArrowDown') active = active + 1 >= items.length ? -1 : active + 1;
        else active = active - 1 < -1 ? items.length - 1 : active - 1;
        paint();
      } else if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        pick(items[active]);
      } else if (e.key === 'Escape') {
        hide();
      }
    });
    // mousedown, aby výber prebehol skôr, než pole stratí fokus
    box.addEventListener('mousedown', (e) => {
      const el = e.target.closest('.sg');
      if (!el) return;
      e.preventDefault();
      pick(items[+el.dataset.i]);
    });
    input.addEventListener('blur', () => setTimeout(hide, 150));
    document.getElementById('f').addEventListener('submit', () => { reqId++; hide(); });
  }

  function parseVideoId(v) {
    try {
      const u = new URL(/^https?:/.test(v) ? v : `https://${v}`);
      const host = u.hostname.replace(/^(www|m|music)\./, '');
      if (host === 'youtu.be') return /^[\w-]{11}$/.test(u.pathname.slice(1, 12)) ? u.pathname.slice(1, 12) : null;
      if (host === 'youtube.com') {
        const id = u.searchParams.get('v') || u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
    } catch {}
    return null;
  }

  // ================= router =================
  let token = 0;
  let lastResults = { query: '', items: [], cont: null };
  let observer = null;

  let lastPageHash = '#';
  function route() {
    const t = ++token;
    if (!/(^#|&)v=/.test(location.hash)) lastPageHash = location.hash || '#';
    observer?.disconnect();
    const h = new URLSearchParams(location.hash.slice(1));
    const app = document.getElementById('app');
    const feed = h.get('feed');
    if (!h.has('shorts')) stopShorts();
    // na stránke videa skry bočný panel (ako YouTube); ☰ ho vtedy ukáže cez obsah
    document.body.classList.toggle('watching', !!h.get('v'));
    document.body.classList.remove('side-open');
    closeCardMenu();
    renderNav(h.has('shorts') ? 'shorts' : h.has('music') ? 'music' : h.has('me') ? 'me' : h.has('settings') || h.has('stats') ? 'settings' : h.get('album') ? 'playlists' : h.get('v') || h.get('q') || h.get('c') || h.get('list') || h.has('help') ? '' : feed || 'home');
    if (h.get('v')) return renderWatch(app, h.get('v'), t);
    // odchod zo stránky videa: bežiace video sa presunie do mini prehrávača v rohu
    if (onWatch && player && current && video && !video.ended && !video.paused) dock();
    else if (!miniActive) stopPlayer();
    onWatch = false;
    clearInterval(nextTimer);
    scrollTo(0, 0);
    if (h.get('q')) return renderSearch(app, h.get('q'), t);
    if (/^UC[\w-]{22}$/.test(h.get('c') || '')) return renderChannel(app, h.get('c'), t);
    if (h.has('help')) return renderHelp(app, h.get('help'));
    if (h.has('diag')) return renderDiag(app, t);
    if (h.has('shorts')) return renderShorts(app, t);
    if (h.has('music')) return renderMusic(app, +h.get('m') || 0, t);
    if (h.get('album')) return renderAlbum(app, h.get('album'));
    if (h.has('settings')) return renderSettings(app);
    if (h.has('stats')) return renderStats(app);
    if (h.has('me')) return renderMe(app);
    if (h.get('list')) return renderPlaylist(app, h.get('list'), t);
    if (feed === 'playlists') return renderMyPlaylists(app, t);
    if (feed === 'history') return renderHistory(app);
    if (FEEDS[feed] && feed !== 'home') return renderFeed(app, feed, t);
    renderHome(app, t);
  }

  // ================= účet v hlavičke a navigácia =================
  async function renderAccount() {
    const el = document.getElementById('acct');
    if (!loggedIn()) {
      setHTML(el, `<div class="brand"><a class="pill pill-w login" href="${esc(loginUrl())}">Prihlásiť sa</a><a class="howto" href="#help">📱 Návod na mobil</a></div>`);
      return;
    }
    setHTML(el, '<span class="av"></span>');
    const acc = await getAccount();
    accountPhoto = acc.photo || '';
    renderSideNav(); // fotka účtu v spodnej lište (Moje)
    setHTML(el, `<button class="me" id="me" title="${esc(acc.name)}">${acc.photo ? `<img src="${esc(acc.photo)}" alt="">` : '<span class="av"></span>'}<span class="me-name">${esc(acc.name)}</span></button>
      <div class="menu" id="menu" hidden><div class="mt">Prihlásený ako<br><b>${esc(acc.name)}</b></div><a class="pill" href="#help">📱 Ako nainštalovať na mobil</a><a class="pill" href="${esc(location.origin)}/logout">Odhlásiť sa</a></div>`);
    const menu = document.getElementById('menu');
    document.getElementById('me').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    document.addEventListener('click', () => { menu.hidden = true; });
  }

  function renderNav(active) {
    const items = [['home', 'Domov'], ['shorts', 'Shorts'], ['music', 'Hudba'], ['subs', 'Odbery'], ['liked', 'Páči sa mi'], ['later', 'Pozrieť neskôr'], ['playlists', 'Playlisty'], ['history', 'História']];
    const href = (k) => (k === 'home' ? '#' : k === 'shorts' || k === 'music' ? `#${k}` : `#feed=${k}`);
    setHTML(document.getElementById('nav'), items
      .map(([k, label]) => `<a class="navi${k === active ? ' on' : ''}" href="${href(k)}">${label}</a>`)
      .join(''));
    sideActive = active;
    renderSideNav();
  }

  // ================= bočný panel (PC) – ako na YouTube =================
  const SN_ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M4 21V10.08l8-6.96 8 6.96V21h-6v-6h-4v6H4z"/></svg>',
    shorts: '<svg viewBox="0 0 24 24"><path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33-1.2-.5L18 9.06a3.74 3.74 0 0 0-3.5-6.62L6 6.94a3.74 3.74 0 0 0 .23 6.74l1.2.49L6 14.94a3.75 3.75 0 0 0 3.5 6.63l8.5-4.5a3.74 3.74 0 0 0-.23-6.75z"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
    history: '<svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.25 2.52.77-1.28L13.5 12.2V8z"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M3 6h12v2H3zm0 5h12v2H3zm0 5h8v2H3zm14-1v-4h2v4h4v2h-4v4h-2v-4h-4v-2z"/></svg>',
    later: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
    liked: '<svg viewBox="0 0 24 24"><path d="M2 21h4V9H2v12zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z"/></svg>',
    subs: '<svg viewBox="0 0 24 24"><path d="M20 7H4V6h16v1zm2 2v12H2V9h20zm-7 6-5-3v6l5-3zM17 3H7v1h10V3z"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.3 7.3 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.3 7.3 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.3 7.3 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.3 7.3 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 16.5 12 3.5 3.5 0 0 1 13 15.5z" transform="translate(-1 0)"/></svg>',
  };
  let sideActive = 'home';
  let sideChannels = []; // odoberané kanály z YouTube účtu
  let sideExpanded = false;

  // zoznam odoberaných kanálov (s účtom); bez účtu sa ukážu obľúbené kanály
  async function loadSubscribedChannels() {
    if (!loggedIn()) return;
    try {
      const d = await ytAuth('browse', { browseId: 'FEchannels' });
      const ids = new Set();
      sideChannels = [...findAll(d, 'channelRenderer'), ...findAll(d, 'gridChannelRenderer')]
        .map((c) => ({ id: c.channelId, title: text(c.title), avatar: c.thumbnail?.thumbnails?.[0]?.url || '' }))
        .map((c) => ({ ...c, avatar: c.avatar.startsWith('//') ? `https:${c.avatar}` : c.avatar }))
        .filter((c) => /^UC[\w-]{22}$/.test(c.id || '') && !ids.has(c.id) && ids.add(c.id));
      renderSideNav();
    } catch {}
  }

  function renderSideNav() {
    const el = document.getElementById('sidenav');
    if (!el) return;
    const a = sideActive;
    const item = (key, href, icon, label) => `<a class="sn${a === key ? ' on' : ''}" href="${href}">${icon}<span>${label}</span></a>`;
    const ids = new Set();
    const chans = [...sideChannels, ...data.channels].filter((c) => c.id && !ids.has(c.id) && ids.add(c.id));
    const shown = sideExpanded ? chans : chans.slice(0, 7);
    setHTML(el, `
      ${item('home', '#', SN_ICONS.home, 'Domov')}
      ${item('shorts', '#shorts', SN_ICONS.shorts, 'Shorts')}
      ${item('music', '#music', SN_ICONS.music, 'Hudba')}
      <div class="sn-sep"></div>
      <a class="sn-h${a === 'subs' ? ' on' : ''}" href="#feed=subs">Odbery ›</a>
      ${shown.length
        ? shown.map((c) => `<a class="sn" href="#c=${esc(c.id)}">${c.avatar ? `<img src="${esc(c.avatar)}" alt="" loading="lazy">` : '<i class="sn-av"></i>'}<span>${esc(c.title)}</span></a>`).join('')
        : `<p class="sn-note">${loggedIn() ? 'Tvoje odbery sa načítavajú…' : 'Ulož si kanál (☆ Uložiť kanál) alebo sa prihlás.'}</p>`}
      ${chans.length > 7 ? `<button class="sn sn-more" id="sn-more">${sideExpanded ? '⌃' : '⌄'}<span>${sideExpanded ? 'Zobraziť menej' : `Zobraziť viac (${chans.length - 7})`}</span></button>` : ''}
      <div class="sn-sep"></div>
      <a class="sn-h" href="#feed=playlists">Moje ›</a>
      ${item('history', '#feed=history', SN_ICONS.history, 'História')}
      ${item('playlists', '#feed=playlists', SN_ICONS.list, 'Zoznamy')}
      ${item('later', '#feed=later', SN_ICONS.later, 'Pozrieť neskôr')}
      ${item('liked', '#feed=liked', SN_ICONS.liked, 'Obľúbené videá')}
      <div class="sn-sep"></div>
      ${item('settings', '#settings', SN_ICONS.settings, 'Nastavenia')}
      <p class="sn-foot">JUTUBE by Olejnik</p>`);
    document.getElementById('sn-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      sideExpanded = !sideExpanded;
      renderSideNav();
    });
    // spodná lišta na mobile (ako YouTube appka): Domov, Shorts, Hudba (v strede), Odbery, Moje
    const tab = (key, href, icon, label) => `<a class="tb${a === key ? ' on' : ''}" href="${href}">${icon}<span>${label}</span></a>`;
    const me = ['me', 'history', 'playlists', 'later', 'liked', 'settings'].includes(a) ? 'me' : a;
    setHTML(document.getElementById('tabbar'), `
      ${tab('home', '#', SN_ICONS.home, 'Domov')}
      ${tab('shorts', '#shorts', SN_ICONS.shorts, 'Shorts')}
      <a class="tb tb-mid${a === 'music' ? ' on' : ''}" href="#music" aria-label="Hudba"><span class="tb-c">${SN_ICONS.music}</span></a>
      ${tab('subs', '#feed=subs', SN_ICONS.subs, 'Odbery')}
      <a class="tb${me === 'me' ? ' on' : ''}" href="#me"><span class="tb-me">${accountPhoto ? `<img src="${esc(accountPhoto)}" alt="">` : '👤'}</span><span>Moje</span></a>`);
  }

  // 1 video, 2–4 videá, 0 / 5+ videí
  const plural = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;

  // stránka „Moje“ (mobil): účet, rozpozerané, zoznamy, nastavenia
  let accountPhoto = '';
  async function renderMe(app) {
    document.title = 'Moje – JUTUBE';
    document.getElementById('q').value = '';
    const acc = loggedIn() ? await getAccount() : null;
    const row = (href, icon, label, sub) => `<a class="me-row" href="${href}">${icon}<span><b>${label}</b>${sub ? `<br><span class="mt">${sub}</span>` : ''}</span><span class="me-go">›</span></a>`;
    setHTML(app, `<div class="help mepage">
      <div class="me-card">${acc
        ? `${acc.photo ? `<img src="${esc(acc.photo)}" alt="">` : '<span class="av"></span>'}<div><h1>${esc(acc.name)}</h1><a class="mt" href="${esc(location.origin)}/logout">Odhlásiť sa</a></div>`
        : `<span class="me-ph">👤</span><div><h1>JUTUBE</h1><a class="pill pill-w login" href="${esc(loginUrl())}">Prihlásiť sa</a></div>`}</div>
      ${continueWatching()}
      <div class="me-list">
        ${row('#feed=history', SN_ICONS.history, 'História', plural(data.history.length, 'video', 'videá', 'videí'))}
        ${row('#feed=playlists', SN_ICONS.list, 'Zoznamy a albumy', `${plural(data.albums.length, 'album', 'albumy', 'albumov')}${loggedIn() ? ' + playlisty z YouTube' : ''}`)}
        ${row('#feed=later', SN_ICONS.later, 'Pozrieť neskôr', '')}
        ${row('#feed=liked', SN_ICONS.liked, 'Obľúbené videá', '')}
        ${row('#stats', SN_ICONS.history, 'Štatistiky', 'Čas pozerania, top kanály a hudba')}
        ${row('#settings', SN_ICONS.settings, 'Nastavenia', 'Vzhľad, kvalita, upozornenia…')}
        ${row('#help', SN_ICONS.list, 'Návod na inštaláciu', 'iPhone, iPad, Android')}
      </div></div>`);
  }

  const loginPrompt = (what) => `<div class="empty">Pre ${what} sa prihlás do svojho YouTube účtu.<br><br><a class="pill pill-w login" href="${esc(loginUrl())}">Prihlásiť sa</a></div>`;

  // zoznam z účtu (Odbery, Páči sa mi, Pozrieť neskôr) s nekonečným scrollovaním
  async function renderFeedInto(box, key, t, onLoaded) {
    setHTML(box, '<div class="empty"><div class="spin" style="margin:auto"></div></div>');
    try {
      const f = await getFeed(key);
      if (t !== token) return;
      onLoaded?.(f);
      if (!f.items.length) {
        return setHTML(box, f.alert
          ? `<div class="empty">${esc(f.alert)}<br><br>Ak si sa práve prihlásil, obnov stránku. Inak sa skús <a class="pill pill-w login" href="${esc(loginUrl())}">prihlásiť znova</a></div>`
          : '<div class="empty">Zatiaľ tu nič nie je.</div>');
      }
      setHTML(box, `<div class="grid" id="grid">${f.items.map(card).join('')}</div>`);
      let cont = f.cont;
      infinite(document.getElementById('grid'), t, async () => {
        if (!cont) return null;
        const more = await feedMore(cont);
        cont = more.cont;
        return { items: more.items, done: !cont };
      });
    } catch (e) {
      if (t === token) setHTML(box, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  function renderFeed(app, key, t) {
    document.title = `${FEEDS[key].title} – JUTUBE`;
    document.getElementById('q').value = '';
    if (!loggedIn()) return setHTML(app, `<h2>${FEEDS[key].title}</h2>${loginPrompt(`zoznam „${FEEDS[key].title}“`)}`);
    setHTML(app, `<h2>${FEEDS[key].title}</h2><div id="feedbox"></div>`);
    renderFeedInto(document.getElementById('feedbox'), key, t);
  }

  // Diagnostika účtu (youtube.com/robots.txt#diag) – iba čítanie, nič nemení.
  async function renderDiag(app, t) {
    document.title = 'Diagnostika – JUTUBE';
    const rows = [];
    const paint = () => setHTML(app, `<div class="help"><h1>Diagnostika účtu</h1>
      <p class="lead">Táto stránka len číta – nič v účte nemení. Pošli screenshot autorovi.</p>
      <ol class="steps">${rows.map(([name, ok, info]) => `<li><b>${ok === null ? '⏳' : ok ? '✅' : '❌'} ${esc(name)}</b><br><span class="mt">${esc(info)}</span></li>`).join('')}</ol></div>`);
    const check = async (name, fn) => {
      const row = [name, null, 'skúšam…'];
      rows.push(row);
      paint();
      try {
        const [ok, info] = await fn();
        row[1] = ok;
        row[2] = info;
      } catch (e) {
        row[1] = false;
        row[2] = e.message;
      }
      if (t === token) paint();
    };
    await check('Prihlásenie (cookie SAPISID)', async () => [loggedIn(), loggedIn() ? 'nájdené' : 'nenájdené – prihlás sa cez „Prihlásiť sa“']);
    if (!loggedIn()) return;
    await check('Účet (meno a fotka)', async () => {
      accountPromise = null;
      const a = await getAccount();
      return [a.name !== 'Môj účet', `${a.name}${a.photo ? ' + fotka' : ' (bez fotky)'}`];
    });
    for (const key of Object.keys(FEEDS)) {
      await check(`Zoznam: ${FEEDS[key].title}`, async () => {
        const f = await getFeed(key);
        // prázdne „Pozrieť neskôr“ je v poriadku, pokiaľ YouTube nevrátil chybovú hlášku
        return [f.items.length > 0 || (key === 'later' && !f.alert),`${f.items.length} videí${f.cont ? ' + ďalšia strana' : ''}${f.alert ? ` · hláška: ${f.alert}` : ''}`];
      });
    }
    await check('Odporúčania pri videu (s účtom)', async () => {
      const r = await getRelated('dQw4w9WgXcQ');
      return [r.items.length > 0, `${r.items.length} videí · páči sa mi: ${r.liked ? 'áno' : 'nie'}`];
    });
    await check('Kanál (stav odberu)', async () => {
      const c = await getChannel('UCuAXFkgsw1L7xaCfnd5JJOw');
      return [c.items.length > 0, `${c.title} · ${c.items.length} videí · odoberáš: ${c.subscribed ? 'áno' : 'nie'}`];
    });
  }

  // ================= playlisty =================
  async function renderPlaylist(app, id, t) {
    document.getElementById('q').value = '';
    setHTML(app, '<div class="empty"><div class="spin" style="margin:auto"></div></div>');
    try {
      const pl = await getPlaylist(id);
      if (t !== token) return;
      document.title = `${pl.title} – JUTUBE`;
      if (!pl.items.length) return setHTML(app, `<div class="empty">${esc(pl.alert || 'Playlist je prázdny alebo sa nedá zobraziť.')}</div>`);
      setHTML(app, `<div class="plhead">
          <div><h1>${esc(pl.title)}</h1><div class="mt">${pl.items.length}${pl.cont ? '+' : ''} videí</div></div>
          <div class="acts"><button class="pill pill-w" id="pl-play">▶ Prehrať všetko</button><button class="pill" id="pl-shuffle">🔀 Náhodne</button></div>
        </div>
        <div class="grid" id="grid">${pl.items.map((v) => card(v, `#v=${v.id}&list=${pl.id}`)).join('')}</div>`);
      // klik na video v playliste: fronta = tento playlist
      const useAsQueue = (items) => { queue = { title: pl.title, listId: pl.id, items, cont: pl.cont }; };
      document.getElementById('grid').addEventListener('click', (e) => { if (e.target.closest('.card') && !e.target.closest('[data-qadd],[data-ch]')) useAsQueue(pl.items); });
      document.getElementById('pl-play').onclick = () => { useAsQueue(pl.items); location.hash = `#v=${pl.items[0].id}&list=${pl.id}`; };
      document.getElementById('pl-shuffle').onclick = () => {
        const mixed = [...pl.items].sort(() => Math.random() - 0.5);
        useAsQueue(mixed);
        queue.cont = null; // pri náhodnom poradí nedoťahujeme ďalšie
        location.hash = `#v=${mixed[0].id}&list=${pl.id}`;
      };
      let cont = pl.cont;
      infinite(document.getElementById('grid'), t, async () => {
        if (!cont) return null;
        const more = await playlistMore(cont);
        cont = more.cont;
        pl.items.push(...more.items);
        pl.cont = cont;
        return { items: more.items, done: !cont };
      });
    } catch (e) {
      if (t === token) setHTML(app, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  async function renderMyPlaylists(app, t) {
    document.title = 'Playlisty – JUTUBE';
    document.getElementById('q').value = '';
    // vlastné albumy (fungujú aj bez prihlásenia) + YouTube playlisty z účtu
    const albums = `<div class="music-bar"><h2>Moje albumy</h2><button class="pill pill-w" id="al-new">＋ Nový album</button></div>
      ${data.albums.length ? `<div class="grid">${data.albums.map(albumCard).join('')}</div>` : '<p class="mt" style="padding:0 2px">Zatiaľ žiadne albumy. Pridaj video tlačidlom ＋ na náhľade alebo „＋ Do albumu“ pod videom.</p>'}`;
    const bindNew = () => {
      document.getElementById('al-new').onclick = () => {
        const name = prompt('Názov nového albumu:');
        if (!name?.trim()) return;
        const a = createAlbum(name);
        location.hash = `#album=${a.id}`;
      };
    };
    if (!loggedIn()) {
      setHTML(app, `${albums}<h2>Playlisty z YouTube</h2>${loginPrompt('tvoje YouTube playlisty')}`);
      return bindNew();
    }
    setHTML(app, `${albums}<h2>Playlisty z YouTube</h2><div id="plbox"><div class="empty"><div class="spin" style="margin:auto"></div></div></div>`);
    bindNew();
    const box = document.getElementById('plbox');
    try {
      const list = await getMyPlaylists();
      if (t !== token) return;
      // „Páči sa mi“ a „Pozrieť neskôr“ sú tiež playlisty – pridáme ich na začiatok
      const builtin = [{ id: 'LL', title: 'Páči sa mi', count: '', owner: 'Tvoj zoznam', thumb: '' }, { id: 'WL', title: 'Pozrieť neskôr', count: '', owner: 'Tvoj zoznam', thumb: '' }];
      const all = [...builtin, ...list.filter((p) => p.id !== 'LL' && p.id !== 'WL')];
      setHTML(box, `<div class="grid">${all.map(playlistCard).join('')}</div>`);
    } catch (e) {
      if (t === token) setHTML(box, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  // ================= upozornenia na nové videá =================
  // Zdroj: s účtom tvoje odbery, bez účtu obľúbené kanály (☆ Uložiť kanál). Kontrola každých 20 min.
  const NOTIF_EVERY = 20 * 60e3;

  // „pred 3 hodinami“ → sekundy (približne); nečitateľné → null
  function ageSeconds(str) {
    const m = String(str || '').match(/(\d+)\s*(sek|min|hod|d|týž|tyz|mes|r)/i);
    if (!m) return null;
    const unit = { sek: 1, min: 60, hod: 3600, d: 86400, týž: 604800, tyz: 604800, mes: 2592000, r: 31536000 }[m[2].toLowerCase()];
    return +m[1] * unit;
  }

  async function checkNewVideos(force) {
    if (data.notifyOff) return;
    data.notif = data.notif || { seen: [], items: [], last: 0, init: false };
    const n = data.notif;
    if (!force && Date.now() - n.last < NOTIF_EVERY) return renderBell();
    let found = [];
    try {
      if (loggedIn()) {
        found = (await getFeed('subs')).items.slice(0, 40);
      } else if (data.channels.length) {
        const lists = [];
        const chans = data.channels.slice(0, 15);
        for (let i = 0; i < chans.length; i += 4) {
          lists.push(...(await Promise.all(chans.slice(i, i + 4).map((c) => getChannel(c.id).then((x) => x.items.slice(0, 5)).catch(() => [])))));
        }
        found = lists.flat();
      }
    } catch {
      return;
    }
    const seenIds = new Set(n.seen);
    const recent = (v, limit) => { const a = ageSeconds(v.published); return a === null || a <= limit; };
    // pri prvej kontrole ukáž len videá z posledných 24 h, potom všetko nové z posledného týždňa
    const fresh = found.filter((v) => !seenIds.has(v.id) && recent(v, n.init ? 7 * 86400 : 86400));
    n.items = [...fresh.map((v) => ({ ...v, at: Date.now() })), ...n.items.filter((x) => !fresh.some((f) => f.id === x.id))].slice(0, 40);
    n.seen = [...new Set([...found.map((v) => v.id), ...n.seen])].slice(0, 600);
    n.last = Date.now();
    const firstRun = !n.init;
    n.init = true;
    save();
    renderBell();
    // systémové upozornenie (ak si ho povolil v Nastaveniach)
    if (!firstRun && fresh.length && data.sysNotify && window.Notification?.permission === 'granted') {
      try {
        const nt = new Notification(fresh.length === 1 ? `Nové video: ${fresh[0].channel}` : `${fresh.length} nových videí`, {
          body: fresh.slice(0, 3).map((v) => v.title).join('\n'),
          icon: `https://i.ytimg.com/vi/${fresh[0].id}/mqdefault.jpg`,
        });
        nt.onclick = () => { window.focus(); location.hash = `#v=${fresh[0].id}`; };
      } catch {}
    }
  }

  function renderBell() {
    const badge = document.getElementById('bell-badge');
    if (!badge) return;
    const count = data.notif?.items.length || 0;
    badge.hidden = !count;
    badge.textContent = count > 9 ? '9+' : String(count);
  }

  function setupBell() {
    const btn = document.getElementById('bell');
    const menu = document.getElementById('bell-menu');
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!menu.hidden) return (menu.hidden = true);
      const items = data.notif?.items || [];
      const source = loggedIn() ? 'tvojich odberov' : 'obľúbených kanálov';
      const emptyText = data.notifyOff
        ? 'Upozornenia sú vypnuté v Nastaveniach.'
        : !loggedIn() && !data.channels.length
          ? 'Ulož si obľúbené kanály (☆ Uložiť kanál) alebo sa prihlás – potom ti tu ukážem ich nové videá.'
          : `Žiadne nové videá z ${source}.`;
      setHTML(menu, `<div class="bell-head"><b>Nové videá</b>${items.length ? '<button class="pill" id="bell-clear">Označiť ako videné</button>' : ''}</div>
        <div class="bell-list">${items.length
          ? items.map((v) => `<a class="bell-item" href="#v=${esc(v.id)}" data-bid="${esc(v.id)}"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" loading="lazy"><span><span class="tt">${esc(v.title)}</span><span class="mt">${esc(v.channel)} · ${esc(v.published || '')}</span></span></a>`).join('')
          : `<p class="mt" style="padding:8px 4px">${esc(emptyText)}</p>`}</div>
        <button class="pill bell-refresh" id="bell-refresh">↻ Skontrolovať teraz</button>`);
      menu.hidden = false;
      document.getElementById('bell-clear')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        data.notif.items = [];
        save();
        renderBell();
        menu.hidden = true;
      });
      document.getElementById('bell-refresh').onclick = async (ev) => {
        ev.stopPropagation();
        ev.target.textContent = '↻ Kontrolujem…';
        await checkNewVideos(true);
        menu.hidden = true;
        btn.click();
      };
      menu.onclick = (ev) => {
        const a = ev.target.closest('[data-bid]');
        if (!a) return ev.stopPropagation();
        data.notif.items = data.notif.items.filter((x) => x.id !== a.dataset.bid); // prečítané
        save();
        renderBell();
        menu.hidden = true;
      };
    };
    document.addEventListener('click', () => { menu.hidden = true; });
    renderBell();
    setTimeout(() => checkNewVideos(false), 4000);
    setInterval(() => checkNewVideos(false), NOTIF_EVERY);
  }

  // ================= učenie odporúčaní (história v YouTube účte) =================
  // Po prihlásení pošleme YouTube rovnaké hlásenia o pozeraní ako jeho vlastný prehrávač,
  // takže video sa objaví v tvojej YouTube histórii a ovplyvní odporúčania. Dá sa vypnúť.
  const CPN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  let tracker = null;

  async function startTracking(id, length) {
    tracker = null;
    if (!loggedIn() || data.trackHistory === false) return;
    const tr = { id, length, cpn: Array.from({ length: 16 }, () => CPN_CHARS[(Math.random() * 64) | 0]).join(''), last: 0, playbackSent: false, urls: null };
    tracker = tr;
    try {
      const p = await ytAuth('player', { videoId: id, contentCheckOk: true, racyCheckOk: true });
      const pt = p.playbackTracking || {};
      tr.urls = { pb: pt.videostatsPlaybackUrl?.baseUrl, wt: pt.videostatsWatchtimeUrl?.baseUrl };
    } catch {}
  }

  function trackPing(base, extra) {
    if (!base) return;
    try {
      const u = new URL(base);
      u.searchParams.set('ver', '2');
      u.searchParams.set('cpn', tracker.cpn);
      for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
      new Image().src = u.toString(); // ide aj s tvojimi cookies YouTube
    } catch {}
  }

  function trackTick(state = 'playing') {
    const tr = tracker;
    if (!tr?.urls || !video || current?.details.id !== tr.id) return;
    const ct = video.currentTime;
    if (!tr.playbackSent && ct > 1) {
      trackPing(tr.urls.pb, { cmt: ct.toFixed(3), len: String(tr.length) });
      tr.playbackSent = true;
    }
    if (tr.playbackSent && (ct - tr.last >= 20 || state !== 'playing') && ct > tr.last) {
      trackPing(tr.urls.wt, { st: tr.last.toFixed(3), et: ct.toFixed(3), cmt: ct.toFixed(3), len: String(tr.length), state });
      tr.last = ct;
    }
  }

  // ================= nastavenia =================
  function renderSettings(app) {
    document.title = 'Nastavenia – JUTUBE';
    document.getElementById('q').value = '';
    const sel = (key, options, cur) => `<select class="pill" data-set="${key}">${options.map(([v, l]) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const chk = (key, on, label, hint) => `<label class="set-row"><span><b>${label}</b>${hint ? `<br><span class="mt">${hint}</span>` : ''}</span><input type="checkbox" data-chk="${key}"${on ? ' checked' : ''}></label>`;
    const ccLang = !data.cc || data.cc === 'off' ? 'off' : data.cc === 'tr' ? 'tr' : data.cc;
    setHTML(app, `<div class="help settings">
      <h1>Nastavenia</h1>
      <h2>Vzhľad</h2>
      <div class="set-row" style="cursor:default"><span><b>Režim</b></span>
        <span class="seg" id="mode-seg">${[['dark', '🌙 Tmavý'], ['light', '☀️ Svetlý'], ['auto', '🖥 Automaticky']]
          .map(([k, l]) => `<button data-mode="${k}"${(data.mode || 'dark') === k ? ' class="on"' : ''}>${l}</button>`).join('')}</span></div>
      <div class="set-row" style="cursor:default;flex-direction:column;align-items:flex-start"><b>Farebná téma</b>
        <div class="theme-row" id="theme-row">${THEMES
          .map(([k, l, g]) => `<button class="swatch${(data.theme || 'sapphire') === k ? ' on' : ''}" data-theme-pick="${k}"><i style="background:${g}"></i>${l}</button>`).join('')}</div></div>
      <h2>Aplikácia v počítači</h2>
      ${isApp()
        ? '<div class="set-row"><span><b>✅ JUTUBE beží ako aplikácia</b><br><span class="mt">Má vlastné okno a ikonu. Pripnúť ju môžeš pravým klikom na ikonu na paneli úloh.</span></span></div>'
        : `<div class="set-row"><span><b>💻 Nainštalovať JUTUBE ako aplikáciu</b><br><span class="mt">Vlastné okno bez lišty prehliadača, ikona na ploche, v ponuke Štart aj na paneli úloh</span></span><button class="pill pill-w" id="set-install">Nainštalovať</button></div>
        <div class="note">Ak tlačidlo nič neurobí: v <b>Edge</b> klikni vpravo hore na <b>⋯ → Aplikácie → Nainštalovať JUTUBE</b>, v <b>Chrome</b> na <b>⋮ → Uložiť a zdieľať → Nainštalovať stránku ako aplikáciu</b>. Doplnok Tampermonkey musí zostať zapnutý – funguje aj v okne aplikácie.</div>`}
      <h2>Prehrávanie</h2>
      <div class="set-row"><span><b>Predvolená kvalita</b></span>${sel('quality', [[1080, '1080p'], [720, '720p'], [480, '480p'], [360, '360p']], data.quality || 1080)}</div>
      <div class="set-row"><span><b>Predvolená rýchlosť</b></span>${sel('speed', SPEEDS.map((x) => [x, x === 1 ? 'Normálna' : `${x}×`]), data.speed || 1)}</div>
      <div class="set-row"><span><b>Titulky</b><br><span class="mt">Jazyk sa zapne automaticky, ak ho video má</span></span>${sel('cc', [['off', 'Vypnuté'], ['sk', 'Slovenčina'], ['cs', 'Čeština'], ['en', 'Angličtina'], ['de', 'Nemčina'], ['tr', 'Preložiť do slovenčiny']], ccLang)}</div>
      ${chk('autoplay', data.autoplay !== false, 'Automaticky prehrať ďalšie video', 'Z fronty / playlistu, inak prvé odporúčané')}
      ${chk('audioOnly', !!data.audioOnly, 'Len zvuk', 'Sťahuje iba zvuk – šetrí dáta pri hudbe a podcastoch')}
      ${chk('bgPlay', data.bgPlay !== false, 'Prehrávať na pozadí', 'Video hrá ďalej aj pri zamknutej obrazovke alebo v inej appke – ovládanie nájdeš na zamknutej obrazovke')}
      ${chk('stableVol', !!data.stableVol, 'Stabilná hlasitosť', 'Vyrovná tiché a hlasné pasáže')}
      ${chk('shortsMuted', !!data.shortsMuted, 'Shorts bez zvuku', 'Shorts sa spustia stlmené')}
      <h2>Účet a upozornenia</h2>
      ${chk('trackHistory', data.trackHistory !== false, 'Učiť YouTube odporúčania', 'Po prihlásení zapíše pozreté videá do tvojej YouTube histórie, aby sa zlepšovali odporúčania')}
      ${chk('notifyOn', !data.notifyOff, 'Upozornenia na nové videá (🔔)', 'Z tvojich odberov alebo obľúbených kanálov, kontrola každých 20 minút')}
      ${chk('sysNotify', !!data.sysNotify, 'Systémové upozornenia', 'Okno v rohu obrazovky, aj keď si v inej karte (kým je JUTUBE otvorené)')}
      <h2>Odkazy z YouTube</h2>
      ${chk('autoRedirect', !!data.autoRedirect, 'Automaticky otvárať YouTube videá v JUTUBE', 'Pôvodný YouTube si vynútiš pridaním &amp;jt=0 do adresy')}
      ${chk('ytAdBlock', data.ytAdBlock !== false, 'Blokovať reklamy aj na pôvodnom YouTube', 'Na stránkach youtube.com/watch (napr. „Otvoriť na YouTube“) odstráni reklamy z prehrávača YouTube')}
      <h2>Štatistiky</h2>
      <a class="set-row" href="#stats"><span><b>📊 Moje štatistiky</b><br><span class="mt">${(() => { const d = Object.values(stats().days); const t = (x) => x.v + x.m + x.s; return `Celkovo ${fmtDur(d.reduce((n, x) => n + t(x), 0))} · dnes ${fmtDur(t(stats().days[dayKey()] || { v: 0, m: 0, s: 0 }))} · top kanály, hudba, grafy`; })()}</span></span><span class="me-go">›</span></a>
      <h2>Dáta v tomto prehliadači</h2>
      <div class="set-row"><span><b>História pozerania</b><br><span class="mt">${data.history.length} videí</span></span><button class="pill" data-clear="history">Vymazať</button></div>
      <div class="set-row"><span><b>Obľúbené kanály</b><br><span class="mt">${data.channels.length} kanálov</span></span><button class="pill" data-clear="channels">Vymazať</button></div>
      <h2>O aplikácii</h2>
      <div class="set-row"><span><b>JUTUBE ${esc(META.match(/@version\s+(\S+)/)?.[1] || '')}</b><br><span class="mt">by Olejnik</span></span><span class="acts"><a class="pill" href="#diag">Diagnostika účtu</a><a class="pill" href="#help">Návod na mobil</a></span></div>
    </div>`);
    document.getElementById('set-install')?.addEventListener('click', installApp);
    document.getElementById('mode-seg').onclick = (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      data.mode = b.dataset.mode;
      save();
      applyTheme();
      document.querySelectorAll('#mode-seg button').forEach((x) => x.classList.toggle('on', x === b));
    };
    document.getElementById('theme-row').onclick = (e) => {
      const b = e.target.closest('[data-theme-pick]');
      if (!b) return;
      data.theme = b.dataset.themePick;
      save();
      applyTheme();
      document.querySelectorAll('#theme-row .swatch').forEach((x) => x.classList.toggle('on', x === b));
    };
    app.querySelectorAll('[data-set]').forEach((el) => {
      el.onchange = () => {
        const k = el.dataset.set;
        data[k] = k === 'cc' ? el.value : +el.value;
        save();
        toast('Uložené');
      };
    });
    app.querySelectorAll('[data-chk]').forEach((el) => {
      el.onchange = async () => {
        const k = el.dataset.chk;
        if (k === 'notifyOn') {
          data.notifyOff = !el.checked;
          if (el.checked) checkNewVideos(true);
        } else if (k === 'sysNotify' && el.checked) {
          const perm = window.Notification ? await Notification.requestPermission() : 'denied';
          if (perm !== 'granted') {
            el.checked = false;
            return toast('Prehliadač upozornenia nepovolil');
          }
          data.sysNotify = true;
        } else {
          data[k] = el.checked;
        }
        save();
        toast('Uložené');
      };
    });
    app.querySelectorAll('[data-clear]').forEach((el) => {
      el.onclick = () => {
        const k = el.dataset.clear;
        if (!confirm(k === 'history' ? 'Vymazať celú históriu pozerania?' : 'Vymazať všetky obľúbené kanály?')) return;
        data[k] = [];
        if (k === 'history') data.pos = {};
        save();
        renderSettings(app);
        toast('Vymazané');
      };
    });
  }

  // ================= stránka so štatistikami =================
  function fmtDur(sec) {
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  }
  const DAY_NAMES = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
  const DAY_IN = ['v nedeľu', 'v pondelok', 'v utorok', 'v stredu', 'vo štvrtok', 'v piatok', 'v sobotu'];
  const DAY_SHORT = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
  const STAT_KINDS = [['v', 'Videá'], ['m', 'Hudba'], ['s', 'Shorts']];

  function renderStats(app) {
    document.title = 'Štatistiky – JUTUBE';
    document.getElementById('q').value = '';
    statsTick();
    const s = stats();
    const dayTotal = (d) => (d ? d.v + d.m + d.s : 0);
    const days = Object.entries(s.days);
    const sum = (k) => days.reduce((n, [, d]) => n + d[k], 0);
    const tot = { v: sum('v'), m: sum('m'), s: sum('s') };
    const total = tot.v + tot.m + tot.s;
    const plays = sum('n');
    const today = new Date();
    const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
    const lastN = (n) => Array.from({ length: n }, (_, i) => back(n - 1 - i));
    const inLast = (n) => lastN(n).reduce((x, d) => x + dayTotal(s.days[dayKey(d)]), 0);
    // séria = po sebe idúce dni s aspoň minútou pozerania
    const active = (d) => dayTotal(s.days[dayKey(d)]) >= 60;
    let streak = 0;
    for (let i = active(today) ? 0 : 1; active(back(i)); i++) streak++;
    let best = 0;
    let run = 0;
    let prevDay = null;
    for (const k of Object.keys(s.days).filter((k) => dayTotal(s.days[k]) >= 60).sort()) {
      const d = new Date(`${k}T12:00:00`);
      run = prevDay && Math.round((d - prevDay) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prevDay = d;
    }
    const activeDays = days.filter(([, d]) => dayTotal(d) >= 60).length;
    const record = [...days].sort((a, b) => dayTotal(b[1]) - dayTotal(a[1]))[0];
    const topHour = s.hours.indexOf(Math.max(...s.hours));
    const topWd = s.wd.indexOf(Math.max(...s.wd));
    const vids = Object.entries(s.vids);
    const byTime = (a, b) => b[1].s - a[1].s;
    const topVids = vids.filter(([, v]) => v.k !== 's').sort(byTime).slice(0, 5);
    const topSongs = vids.filter(([, v]) => v.k === 'm').sort(byTime).slice(0, 5);
    const replay = vids.filter(([, v]) => v.k !== 's' && v.n > 1).sort((a, b) => b[1].n - a[1].n)[0];
    const topCh = Object.entries(s.ch).sort(byTime).slice(0, 5);
    const shortsN = vids.filter(([, v]) => v.k === 's').reduce((n, [, v]) => n + v.n, 0);
    const dateSk = (d) => d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const dayShort = (d) => d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });

    const tile = (label, value, sub = '') => `<div class="st-tile"><span class="mt">${label}</span><b>${value}</b>${sub ? `<span class="mt">${sub}</span>` : ''}</div>`;
    const list = (rows) => rows.length
      ? `<ol class="st-list">${rows.map(([href, title, sub, val]) => `<li><a href="${href}"><span class="st-lt">${esc(title)}</span><span class="mt">${esc(sub)}</span><span class="st-bar"><i style="width:${Math.max(2, (val / rows[0][3]) * 100)}%"></i></span></a></li>`).join('')}</ol>`
      : '<p class="mt">Zatiaľ nič.</p>';
    const vidRow = ([id, v]) => [`#v=${encodeURIComponent(id)}`, v.t, `${v.c} · ${fmtDur(v.s)}${v.n > 1 ? ` · ${v.n}×` : ''}`, v.s];

    // graf posledných 30 dní – stĺpce zložené z videí, hudby a shorts
    const d30 = lastN(30).map((d) => ({ d, x: s.days[dayKey(d)] || { v: 0, m: 0, s: 0, n: 0 } }));
    const max30 = Math.max(60, ...d30.map((o) => dayTotal(o.x)));
    const tip30 = (o) => `${o.d.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' })}: ${dayTotal(o.x) >= 30 ? STAT_KINDS.filter(([k]) => o.x[k] >= 30).map(([k, l]) => `${l.toLowerCase()} ${fmtDur(o.x[k])}`).join(' · ') : 'nič'}`;
    const chart30 = `<div class="st-chart" data-tipbox="t30">${d30.map((o) => `<div class="st-col" tabindex="0" data-tip="${esc(tip30(o))}">${STAT_KINDS.map(([k]) => (o.x[k] >= 1 ? `<i class="st-${k}" style="height:${(o.x[k] / max30) * 100}%"></i>` : '')).join('')}</div>`).join('')}</div>
      <div class="st-axis"><span>${dayShort(d30[0].d)}</span><span>max ${fmtDur(max30)}</span><span>dnes</span></div>`;
    // jednoduché stĺpce (hodiny dňa, dni v týždni)
    const bars = (vals, labels, tipFn, id) => {
      const mx = Math.max(60, ...vals);
      return `<div class="st-chart" data-tipbox="${id}">${vals.map((v, i) => `<div class="st-col" tabindex="0" data-tip="${esc(tipFn(i, v))}">${v >= 1 ? `<i class="st-v" style="height:${(v / mx) * 100}%"></i>` : ''}</div>`).join('')}</div>
        <div class="st-axis${labels.length === vals.length ? ' st-eq' : ''}">${labels.map((l) => `<span>${l}</span>`).join('')}</div>`;
    };
    const wdOrder = [1, 2, 3, 4, 5, 6, 0];
    const tipLine = (id) => `<p class="st-tip mt" id="${id}">Ťukni na stĺpec pre podrobnosti</p>`;

    setHTML(app, `<div class="help settings stats">
      <div class="music-bar"><h1>📊 Moje štatistiky</h1><a class="pill" href="#settings">‹ Nastavenia</a></div>
      <p class="mt">Merané v tomto prehliadači od ${dateSk(new Date(s.since))}. Ráta sa len čas, keď video naozaj hrá.</p>
      ${total < 60 ? '<div class="note">Štatistiky sa začali zbierať práve teraz. Pozri si pár videí alebo pesničiek a vráť sa sem.</div>' : ''}
      <div class="st-hero"><span class="mt">Celkovo pozerané</span><b>${fmtDur(total)}</b>${total >= 7200 ? `<span class="mt">to je ako ${plural(Math.floor(total / 7200), 'celovečerný film', 'celovečerné filmy', 'celovečerných filmov')}</span>` : ''}</div>
      <div class="st-tiles">
        ${tile('Dnes', fmtDur(inLast(1)))}
        ${tile('Posledných 7 dní', fmtDur(inLast(7)))}
        ${tile('Posledných 30 dní', fmtDur(inLast(30)))}
        ${tile('Priemer za deň', fmtDur(activeDays ? total / activeDays : 0), 'v dňoch s pozeraním')}
        ${tile('🎬 Videá', fmtDur(tot.v))}
        ${tile('🎵 Hudba', fmtDur(tot.m), tot.m >= 210 ? `≈ ${plural(Math.round(tot.m / 210), 'pesnička', 'pesničky', 'pesničiek')}` : '')}
        ${tile('📱 Shorts', fmtDur(tot.s), plural(shortsN, 'short', 'shorty', 'shortov'))}
        ${tile('▶ Prehratých videí', plays.toLocaleString('sk-SK'))}
        ${tile('🔥 Séria', plural(streak, 'deň', 'dni', 'dní'), `najdlhšia: ${plural(best, 'deň', 'dni', 'dní')}`)}
        ${tile('🔍 Vyhľadávaní', s.searches.toLocaleString('sk-SK'))}
        ${tile('📺 Cez AirPlay', fmtDur(s.cast))}
        ${tile('🚫 Bez reklám', `≈ ${Math.round(plays * 0.5 + (tot.v + tot.m) / 600).toLocaleString('sk-SK')}`, 'odhad preskočených reklám')}
      </div>
      ${total >= 60 ? `<div class="st-facts">
        <p>🏆 Rekordný deň: <b>${dateSk(new Date(`${record[0]}T12:00:00`))}</b> – ${fmtDur(dayTotal(record[1]))}</p>
        <p>🕐 Najčastejšie pozeráš okolo <b>${topHour}:00</b>, najviac <b>${DAY_IN[topWd]}</b>.</p>
        ${replay ? `<p>🔁 Najčastejšie opakované: <a href="#v=${esc(encodeURIComponent(replay[0]))}"><b>${esc(replay[1].t)}</b></a> – ${replay[1].n}×</p>` : ''}
      </div>` : ''}
      <h2>Posledných 30 dní</h2>
      <div class="st-legend">${STAT_KINDS.map(([k, l]) => `<span><i class="st-${k}"></i>${l} <b>${fmtDur(tot[k])}</b></span>`).join('')}</div>
      ${chart30}
      ${tipLine('t30')}
      <details class="st-table"><summary>Zobraziť ako tabuľku</summary><table><tr><th>Deň</th>${STAT_KINDS.map(([, l]) => `<th>${l}</th>`).join('')}<th>Spolu</th></tr>
        ${[...d30].reverse().filter((o) => dayTotal(o.x) >= 30).map((o) => `<tr><td>${dayShort(o.d)}</td>${STAT_KINDS.map(([k]) => `<td>${fmtDur(o.x[k])}</td>`).join('')}<td>${fmtDur(dayTotal(o.x))}</td></tr>`).join('') || '<tr><td colspan="5">Zatiaľ nič</td></tr>'}</table></details>
      <h2>Kedy počas dňa</h2>
      ${bars(s.hours, ['0:00', '6:00', '12:00', '18:00', '23:00'], (i, v) => `${i}:00 – ${i}:59: ${fmtDur(v)}`, 'th')}
      ${tipLine('th')}
      <h2>Dni v týždni</h2>
      ${bars(wdOrder.map((i) => s.wd[i]), wdOrder.map((i) => DAY_SHORT[i]), (i, v) => `${DAY_NAMES[wdOrder[i]]}: ${fmtDur(v)}`, 'tw')}
      ${tipLine('tw')}
      <h2>Najsledovanejšie kanály</h2>
      ${list(topCh.map(([id, c]) => [`#c=${encodeURIComponent(id)}`, c.t, fmtDur(c.s), c.s]))}
      <h2>Najsledovanejšie videá</h2>
      ${list(topVids.map(vidRow))}
      <h2>Najpočúvanejšia hudba</h2>
      ${list(topSongs.map(vidRow))}
      <div class="acts" style="margin-top:28px"><button class="pill" id="st-clear">🗑 Vymazať štatistiky</button></div>
    </div>`);
    // popis stĺpca pri prejdení myšou, ťuknutí aj výbere klávesnicou
    const showTip = (e) => {
      const col = e.target.closest?.('.st-col');
      const box = col?.closest('[data-tipbox]');
      if (!col || !box) return;
      box.querySelectorAll('.st-col.on').forEach((x) => x.classList.remove('on'));
      col.classList.add('on');
      document.getElementById(box.dataset.tipbox).textContent = col.dataset.tip;
    };
    for (const ev of ['pointerover', 'click', 'focusin']) app.querySelector('.stats').addEventListener(ev, showTip);
    document.getElementById('st-clear').onclick = () => {
      if (!confirm('Vymazať všetky štatistiky pozerania?')) return;
      data.stats = null;
      statsCounted.clear();
      save();
      renderStats(app);
      toast('Štatistiky vymazané');
    };
  }

  // ================= Hudba =================
  const YEAR = new Date().getFullYear();
  const MUSIC = [
    ['Populárne', `top hity ${YEAR}`],
    ['Novinky', 'nová hudba official video', 'EgQIBBAB'], // nahraté tento mesiac
    ['Slovenské', 'slovenské hity'],
    ['České', 'české hity'],
    ['Rap', 'slovenský rap'],
    ['Pop', 'pop hits'],
    ['Rock', 'rock hits'],
    ['Elektronická', 'edm hits'],
    ['Chill & Lofi', 'lofi chill music'],
    ['Párty', 'party hits mix'],
    ['80s a 90s', '80s 90s hity'],
    ['Klasická', 'klasická hudba'],
  ];

  async function renderMusic(app, idx, t) {
    if (!MUSIC[idx]) idx = 0;
    const [label, query, params] = MUSIC[idx];
    document.title = `Hudba – ${label} – JUTUBE`;
    document.getElementById('q').value = '';
    setHTML(app, `<div class="music-head"><h1>🎵 Hudba</h1>
        <label class="ap"><input type="checkbox" id="mu-audio"${data.audioOnly ? ' checked' : ''}> 🎧 Len zvuk (šetrí dáta)</label></div>
      <div class="chips"><div class="chips-row">${MUSIC.map(([l], i) => `<a class="chip${i === idx ? ' on' : ''}" href="#music&m=${i}">${esc(l)}</a>`).join('')}</div></div>
      <div id="mubody"><div class="empty"><div class="spin" style="margin:auto"></div></div></div>`);
    document.getElementById('mu-audio').onchange = (e) => {
      data.audioOnly = e.target.checked;
      save();
      toast(data.audioOnly ? '🎧 Hudba pôjde len so zvukom' : 'Videá sa prehrajú s obrazom');
    };
    const body = document.getElementById('mubody');
    try {
      // skladby (len videá) a playlisty hľadáme zvlášť a súbežne – inak by YouTube vrátil hlavne playlisty
      const [res, mixed] = await Promise.all([search(query, params || 'EgIQAQ=='), search(query).catch(() => ({ playlists: [] }))]);
      res.playlists = mixed.playlists;
      if (t !== token) return;
      if (!res.items.length) return setHTML(body, '<div class="empty">Nič sa nenašlo.</div>');
      const pls = res.playlists?.length ? `<h2>Playlisty</h2><div class="hrow">${res.playlists.map(playlistCard).join('')}</div>` : '';
      setHTML(body, `${pls}<div class="music-bar"><h2>${esc(label)}</h2><span class="acts"><button class="pill pill-w" id="mu-play">▶ Prehrať všetko</button><button class="pill" id="mu-shuffle">🔀 Náhodne</button></span></div>
        <div class="grid" id="grid">${res.items.map(card).join('')}</div>`);
      // celý žáner ako fronta – skladby idú jedna za druhou
      const playAll = (items) => {
        queue = { title: `Hudba: ${label}`, listId: null, items: [...items], cont: null };
        location.hash = `#v=${items[0].id}`;
      };
      document.getElementById('mu-play').onclick = () => playAll(res.items);
      document.getElementById('mu-shuffle').onclick = () => playAll([...res.items].sort(() => Math.random() - 0.5));
      let cont = res.cont;
      infinite(document.getElementById('grid'), t, async () => {
        if (!cont) return null;
        const more = await searchMore(cont);
        cont = more.cont;
        const known = new Set(res.items.map((v) => v.id));
        const fresh = more.items.filter((v) => !known.has(v.id));
        res.items.push(...fresh);
        return { items: fresh, done: !cont };
      });
    } catch (e) {
      if (t === token) setHTML(body, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  // ================= Shorts – prehliadač na výšku =================
  // Každý short má vlastný <video>; hrá iba ten, ktorý je práve na obrazovke.
  let shortsState = null; // { items, cont, query, active, player, io, onKey }
  let shortsSeed = null; // shorty z výsledkov hľadania (klik na short tam)

  function stopShorts() {
    if (!shortsState) return;
    shortsState.io?.disconnect();
    shortsState.player?.destroy();
    for (const v of document.querySelectorAll('.short video')) {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
    removeEventListener('keydown', shortsState.onKey, true);
    shortsState = null;
  }

  function shortSlide(v, i) {
    return `<section class="short" data-i="${i}" data-id="${esc(v.id)}">
      <div class="short-frame">
        <video playsinline loop preload="none" poster="https://i.ytimg.com/vi/${esc(v.id)}/oar2.jpg"></video>
        <div class="short-info"><div class="short-t">${esc(v.title)}</div><div class="short-v">${esc(v.views || '')}</div></div>
        <div class="short-state"></div>
      </div>
      <div class="short-acts">
        <button class="short-b" data-act="mute" title="Zvuk">🔊</button>
        <a class="short-b" href="#v=${esc(v.id)}" title="Otvoriť ako bežné video">⤢</a>
        <button class="short-b" data-act="next" title="Ďalší">⌄</button>
      </div>
    </section>`;
  }

  async function renderShorts(app, t) {
    if (miniActive) closeMini(); // nech nehrajú dve videá naraz
    document.title = 'Shorts – JUTUBE';
    document.getElementById('q').value = '';
    const h = new URLSearchParams(location.hash.slice(1));
    const query = h.get('sq') || '#shorts';
    setHTML(app, '<div class="shorts" id="shorts"><div class="empty"><div class="spin" style="margin:auto"></div></div></div>');
    const box = document.getElementById('shorts');
    try {
      let feed;
      const start = h.get('s');
      if (shortsSeed && start && shortsSeed.items.some((x) => x.id === start)) {
        // prišli sme z výsledkov hľadania – začni kliknutým shortom
        const i = shortsSeed.items.findIndex((x) => x.id === start);
        feed = { items: [...shortsSeed.items.slice(i), ...shortsSeed.items.slice(0, i)], cont: shortsSeed.cont };
      } else {
        feed = await getShorts(query);
        if (start && !feed.items.some((x) => x.id === start)) feed.items.unshift({ id: start, title: '', views: '', short: true });
      }
      if (t !== token) return;
      if (!feed.items.length) return setHTML(box, '<div class="empty">Nenašli sa žiadne Shorts.</div>');
      stopShorts();
      const st = { items: feed.items, cont: feed.cont, query, active: -1, player: null, loading: false };
      shortsState = st;
      setHTML(box, feed.items.map(shortSlide).join(''));

      const activate = async (i) => {
        if (st !== shortsState || st.active === i) return;
        const prev = box.querySelector(`.short[data-i="${st.active}"] video`);
        st.player?.destroy();
        st.player = null;
        if (prev) { prev.pause(); prev.removeAttribute('src'); prev.load(); }
        st.active = i;
        const it = st.items[i];
        const slide = box.querySelector(`.short[data-i="${i}"]`);
        const v = slide.querySelector('video');
        v.muted = !!data.shortsMuted;
        slide.querySelector('[data-act="mute"]').textContent = v.muted ? '🔇' : '🔊';
        try {
          const s = await getStreamsCached(it.id);
          if (st !== shortsState || st.active !== i) return;
          if (!it.title) slide.querySelector('.short-t').textContent = s.details.title;
          st.player = new Player(v, s, pickVideo(s), 0, true, false);
          addHistory({ id: it.id, title: s.details.title, channel: s.details.channel, channelId: s.details.channelId, duration: fmt(s.details.length) });
        } catch (e) {
          slide.querySelector('.short-state').textContent = e.message;
        }
        // vopred priprav ďalší a dotiahni ďalšie shorty, keď sa blíži koniec
        if (st.items[i + 1]) getStreamsCached(st.items[i + 1].id).catch(() => {});
        if (i >= st.items.length - 4 && st.cont && !st.loading) {
          st.loading = true;
          try {
            const more = await shortsMore(st.cont);
            const known = new Set(st.items.map((x) => x.id));
            const fresh = more.items.filter((x) => !known.has(x.id));
            const base = st.items.length;
            st.items.push(...fresh);
            st.cont = more.cont;
            box.insertAdjacentHTML('beforeend', tt.createHTML(fresh.map((x, k) => shortSlide(x, base + k)).join('')));
            box.querySelectorAll('.short').forEach((el) => st.io.observe(el));
          } catch {}
          st.loading = false;
        }
      };

      st.io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) activate(+e.target.dataset.i);
      }, { root: box, threshold: [0.6] });
      box.querySelectorAll('.short').forEach((el) => st.io.observe(el));

      const go = (d) => {
        const next = box.querySelector(`.short[data-i="${Math.max(0, st.active + d)}"]`);
        next?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      box.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        const v = box.querySelector(`.short[data-i="${st.active}"] video`);
        if (act === 'mute' && v) {
          v.muted = !v.muted;
          data.shortsMuted = v.muted;
          save();
          e.target.closest('[data-act]').textContent = v.muted ? '🔇' : '🔊';
        } else if (act === 'next') {
          go(1);
        } else if (e.target.closest('.short-frame') && v) {
          v.paused ? v.play().catch(() => {}) : v.pause(); // ťuk = pauza / prehrať
        }
      });
      st.onKey = (e) => {
        if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          go(e.key === 'ArrowDown' ? 1 : -1);
        } else if (e.key === ' ' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          e.stopPropagation();
          const v = box.querySelector(`.short[data-i="${st.active}"] video`);
          if (v) v.paused ? v.play().catch(() => {}) : v.pause();
        }
      };
      addEventListener('keydown', st.onKey, true);
    } catch (e) {
      if (t === token) setHTML(box, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  function renderHistory(app) {
    document.title = 'História – JUTUBE';
    document.getElementById('q').value = '';
    setHTML(app, data.history.length
      ? `<h2>Naposledy pozreté</h2><div class="grid">${data.history.map(card).join('')}</div>`
      : '<div class="empty">Zatiaľ si nič nepozrel.</div>');
  }

  // ================= návod na inštaláciu =================
  const PAGE_URL = 'https://www.youtube.com/robots.txt?noapp=1'; // ?noapp=1 = bez panelu „Otvoriť v aplikácii YouTube“

  function renderHelp(app, tab) {
    tab = tab === 'android' ? 'android' : 'iphone';
    document.title = 'Návod – JUTUBE';
    document.getElementById('q').value = '';
    const iphone = `
      <ol class="steps">
        <li>Stiahni si súbor so stránkou tlačidlom vyššie a pošli si ho do iPhonu – napr. <b>e-mailom</b> sám sebe. Na iPhone otvor prílohu → <b>Zdieľať</b> → <b>Uložiť do Súborov</b> → <b>iCloud Drive</b>.</li>
        <li>Z App Store nainštaluj appku <b>Userscripts</b> (zadarmo).</li>
        <li>Otvor appku Userscripts → <b>Set Userscripts Directory</b> → vyber alebo vytvor priečinok, napr. <code>iCloud Drive/Userscripts</code>.</li>
        <li>V appke <b>Súbory</b> presuň <code>jutube.user.js</code> do tohto priečinka.</li>
        <li>Zapni rozšírenie: <b>Nastavenia → Appky → Safari → Rozšírenia → Userscripts</b> → zapnúť a pri <b>youtube.com</b> zvoliť <b>Povoliť</b>.</li>
        <li>V <b>Safari</b> otvor <code>${PAGE_URL}</code>. Ak sa ukáže len text, ťukni na <b>aA</b> v adresnom riadku → <b>Userscripts</b> → povoľ pre túto stránku a obnov ju.</li>
        <li>Ikona na plochu: <b>Zdieľať → Pridať na plochu</b>. Na iOS 26+ <b>vypni „Otvoriť ako webovú appku“</b> – inak sa rozšírenie nespustí.</li>
      </ol>
      <div class="note">Treba <b>iOS 17.1 alebo novší</b> (Nastavenia → Všeobecné → Informácie). Stránku otváraj vždy v Safari.</div>`;
    const android = `
      <ol class="steps">
        <li>Stiahni si súbor so stránkou tlačidlom vyššie a pošli si ho do telefónu – napr. <b>e-mailom</b> alebo cez <b>Google Drive</b>. Ulož ho do priečinka <b>Stiahnuté</b>.</li>
        <li>Z Google Play nainštaluj prehliadač <b>Firefox</b> (Chrome na Androide doplnky nepodporuje).</li>
        <li>Vo Firefoxe: <b>⋮ → Doplnky → Správca doplnkov</b> → nájdi <b>Tampermonkey</b> → <b>+</b> → <b>Pridať</b>.</li>
        <li>Otvor súbor <code>jutube.user.js</code> v appke na čítanie textu (napr. <b>Súbory → otvoriť ako text</b>), označ <b>celý text</b> a skopíruj ho.</li>
        <li>Vo Firefoxe: <b>⋮ → Doplnky → Tampermonkey → Ovládací panel</b> → ikona <b>+</b> (nový skript) → zmaž ukážkový text, <b>vlož</b> skopírovaný text a ulož (<b>Súbor → Uložiť</b>).</li>
        <li>Vo Firefoxe otvor <code>${PAGE_URL}</code> – zobrazí sa JUTUBE.</li>
        <li>Ikona na plochu: <b>⋮ → Pridať na plochu</b> (stránka sa otvorí vo Firefoxe, kde doplnok funguje).</li>
      </ol>
      <div class="note">Stránku otváraj vždy vo <b>Firefoxe</b> – v Chrome sa doplnky na Androide nespúšťajú.</div>`;
    setHTML(app, `<div class="help">
      <h1>Ako nainštalovať JUTUBE na mobil</h1>
      <p class="lead">JUTUBE je jeden súbor (skript), ktorý prehliadač spustí na adrese <code>${PAGE_URL}</code>. Do mobilu ho dostaneš takto:</p>
      <div class="dl">
        <button class="pill pill-w" id="dl-btn">⬇ Stiahnuť skript (jutube.user.js)</button>
        <span class="mt">Na PC ho potom pošli do mobilu.</span>
      </div>
      <div class="tabs">
        <a class="tab ${tab === 'iphone' ? 'on' : ''}" href="#help=iphone">📱 iPhone</a>
        <a class="tab ${tab === 'android' ? 'on' : ''}" href="#help=android">🤖 Android</a>
      </div>
      ${tab === 'iphone' ? iphone : android}
      <h1 style="font-size:22px;margin-top:32px">Rýchle otvorenie YouTube videa v JUTUBE</h1>
      <ol class="steps">
        <li>V adrese YouTube videa dopíš pred <b>watch</b> písmeno <b>j</b>:<br><code>youtube.com/watch?v=…</code> → <code>youtube.com/<b>j</b>watch?v=…</code><br>Pre Shorts: <code>youtube.com/<b>j</b>shorts/…</code></li>
        <li>Stránka ťa hneď presmeruje do JUTUBE na to isté video (aj s časom z odkazu).</li>
      </ol>
      <label class="note" style="display:flex;gap:12px;align-items:center;cursor:pointer">
        <input type="checkbox" id="auto-redirect"${data.autoRedirect ? ' checked' : ''} style="width:20px;height:20px;flex:none">
        <span><b>Automaticky otvárať YouTube videá v JUTUBE</b><br>Každý odkaz na youtube.com/watch (napr. z Googlu alebo správy) sa otvorí rovno tu. Pôvodný YouTube si vynútiš pridaním <code>&amp;jt=0</code> do adresy.</span>
      </label>
    </div>`);
    document.getElementById('dl-btn').onclick = downloadScript;
    document.getElementById('auto-redirect').onchange = (e) => {
      data.autoRedirect = e.target.checked;
      save();
      toast(data.autoRedirect ? 'YouTube videá sa budú otvárať v JUTUBE' : 'Automatické presmerovanie vypnuté');
    };
  }

  function downloadScript() {
    const source = `${META}\n(${jutube.toString()})();\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    a.download = 'jutube.user.js';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function channelChips() {
    if (!data.channels.length) return '';
    return `<h2>Obľúbené kanály</h2><div class="chans">${data.channels
      .map((c) => `<a class="chan" href="#c=${esc(c.id)}">${c.avatar ? `<img src="${esc(c.avatar)}" alt="" loading="lazy">` : '<span class="av"></span>'}<span>${esc(c.title)}</span></a>`)
      .join('')}</div>`;
  }

  // rozpozerané videá (3–95 %) – riadok „Pokračovať v pozeraní“
  function continueWatching() {
    const list = data.history
      .filter((v) => {
        const p = data.pos[v.id];
        return p && p.d > 0 && p.p / p.d > 0.03 && p.p / p.d < 0.95;
      })
      .slice(0, 12);
    if (!list.length) return '';
    return `<h2>Pokračovať v pozeraní</h2><div class="hrow">${list.map(card).join('')}</div>`;
  }

  // témy pre neprihláseného (YouTube ich bez účtu neposiela) – populárne videá z posledného mesiaca
  const TOPICS = [
    ['Hudba', 'hudba'], ['Hry', 'gaming'], ['Podcasty', 'podcast'], ['Hiphop', 'hiphop'], ['Rapovanie', 'rap'],
    ['Šport', 'šport'], ['Správy', 'správy'], ['Filmy a trailery', 'official trailer'], ['Humor', 'humor'],
    ['Varenie', 'recept varenie'], ['Technológie', 'technológie recenzia'], ['Autá', 'autá test'], ['Príroda', 'príroda dokument'],
  ];
  const MONTH_VIDEOS = 'EgQIBBAB';

  // riadok tém so šípkou na posúvanie
  function renderChips(list, active, onPick) {
    const box = document.getElementById('chips');
    if (!box) return;
    setHTML(box, `<div class="chips-row" id="chips-row">${[{ label: 'Všetko' }, ...list]
      .map((c, i) => `<button class="chip${i === active ? ' on' : ''}" data-i="${i}">${esc(c.label)}</button>`)
      .join('')}</div><button class="chips-arrow" id="chips-arrow" aria-label="Ďalšie témy">›</button>`);
    const row = document.getElementById('chips-row');
    const arrow = document.getElementById('chips-arrow');
    const paintArrow = () => { arrow.hidden = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4; };
    arrow.onclick = () => row.scrollBy({ left: 300, behavior: 'smooth' });
    row.onscroll = paintArrow;
    paintArrow();
    row.onclick = (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const i = +b.dataset.i;
      row.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
      onPick(i === 0 ? null : list[i - 1]);
    };
  }

  // obsah vybranej témy: mriežka videí s nekonečným scrollovaním
  async function renderTopic(body, t, load, more) {
    setHTML(body, '<div class="empty"><div class="spin" style="margin:auto"></div></div>');
    try {
      const f = await load();
      if (t !== token) return;
      if (!f.items.length) return setHTML(body, '<div class="empty">V tejto téme sa nenašli žiadne videá.</div>');
      setHTML(body, `<div class="grid" id="grid" style="margin-top:12px">${f.items.map(card).join('')}</div>`);
      let cont = f.cont;
      infinite(document.getElementById('grid'), t, async () => {
        if (!cont) return null;
        const m = await more(cont);
        cont = m.cont;
        return { items: m.items, done: !cont };
      });
    } catch (e) {
      if (t === token) setHTML(body, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  function renderHome(app, t) {
    document.title = 'JUTUBE';
    document.getElementById('q').value = '';
    setHTML(app, '<div class="chips" id="chips"></div><div id="homebody"></div>');
    const body = document.getElementById('homebody');

    if (loggedIn()) {
      // prihlásený: tvoje témy z YouTube + rozpozerané + obľúbené kanály + osobné odporúčania
      let ytChips = [];
      const showAll = () => {
        setHTML(body, `${continueWatching()}${channelChips()}<h2>Odporúčané pre teba</h2><div id="feedbox"></div>`);
        return renderFeedInto(document.getElementById('feedbox'), 'home', t, (f) => {
          if (f.chips.length && !ytChips.length) {
            ytChips = f.chips;
            renderChips(ytChips, 0, pick);
          }
        });
      };
      const pick = (chip) => {
        observer?.disconnect();
        if (!chip) return showAll();
        if (!chip.token) return;
        renderTopic(body, t, () => ytAuth('browse', { continuation: chip.token }).then((d) => parseVideos(d)), feedMore);
      };
      return showAll();
    }

    // neprihlásený: pevné témy
    const showAll = () => {
      const history = data.history.length ? `<h2>Naposledy pozreté</h2><div class="grid">${data.history.slice(0, 12).map(card).join('')}</div>` : '';
      setHTML(body, `<div class="hint">Prihlás sa svojím YouTube účtom a uvidíš tu odporúčania pre teba, odbery aj obľúbené videá. <a class="pill pill-w login" href="${esc(loginUrl())}">Prihlásiť sa</a></div>${continueWatching()}${channelChips()}${history}`);
    };
    const list = TOPICS.map(([label, query]) => ({ label, query }));
    renderChips(list, 0, (chip) => {
      observer?.disconnect();
      if (!chip) return showAll();
      renderTopic(body, t, () => search(chip.query, MONTH_VIDEOS), searchMore);
    });
    showAll();
  }

  async function renderChannel(app, id, t) {
    document.getElementById('q').value = '';
    setHTML(app, '<div class="empty"><div class="spin" style="margin:auto"></div></div>');
    try {
      const ch = await getChannel(id);
      if (t !== token) return;
      document.title = `${ch.title} – JUTUBE`;
      setHTML(app, `<div class="chhead">
          ${ch.avatar ? `<img src="${esc(ch.avatar)}" alt="">` : ''}
          <h1>${esc(ch.title)}</h1>
          ${loggedIn() ? `<button class="pill${ch.subscribed ? ' on' : ' pill-w'}" id="sub-ch">${ch.subscribed ? '✓ Odoberáš' : 'Odoberať'}</button>` : ''}
          <button class="pill" id="save-ch"></button>
        </div>
        ${ch.items.length ? `<div class="grid" id="grid">${ch.items.map(card).join('')}</div>` : '<div class="empty">Kanál nemá žiadne videá.</div>'}`);
      const btn = document.getElementById('save-ch');
      const paint = () => { btn.textContent = isSaved(id) ? '★ Uložený' : '☆ Uložiť kanál'; };
      paint();
      btn.onclick = () => { toggleChannel(ch); paint(); };
      const sub = document.getElementById('sub-ch');
      if (sub) {
        sub.onclick = async () => {
          const on = !sub.classList.contains('on');
          sub.disabled = true;
          try {
            await setSubscribed(id, on);
            sub.classList.toggle('on', on);
            sub.classList.toggle('pill-w', !on);
            sub.textContent = on ? '✓ Odoberáš' : 'Odoberať';
            toast(on ? `Odoberáš kanál ${ch.title}` : 'Odber zrušený');
          } catch (e) {
            toast(`Nepodarilo sa: ${e.message}`);
          }
          sub.disabled = false;
        };
      }
      let cont = ch.cont;
      if (ch.items.length) {
        infinite(document.getElementById('grid'), t, async () => {
          if (!cont) return null;
          const more = await channelMore(cont);
          cont = more.cont;
          for (const v of more.items) { v.channel = v.channel || ch.title; v.channelId = v.channelId || id; }
          return { items: more.items, done: !cont };
        });
      }
    } catch (e) {
      if (t === token) setHTML(app, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  const FILTERS = {
    sort: [['', 'Relevancia'], ['2', 'Najnovšie'], ['3', 'Najsledovanejšie']],
    date: [['', 'Kedykoľvek'], ['2', 'Dnes'], ['3', 'Tento týždeň'], ['4', 'Tento mesiac'], ['5', 'Tento rok']],
    dur: [['', 'Akákoľvek dĺžka'], ['1', 'Do 4 min'], ['3', '4–20 min'], ['2', 'Nad 20 min']],
  };

  function filterBar(query, f) {
    const group = (key, label) => `<div class="fgroup"><span class="flabel">${label}</span>${FILTERS[key]
      .map(([v, l]) => {
        const next = { ...f, [key]: v };
        const qs = Object.entries(next).filter(([, x]) => x).map(([k, x]) => `&${k}=${x}`).join('');
        return `<a class="fchip${(f[key] || '') === v ? ' on' : ''}" href="#q=${encodeURIComponent(query)}${qs}">${l}</a>`;
      })
      .join('')}</div>`;
    const active = Object.values(f).some(Boolean);
    return `<details class="filters"${active ? ' open' : ''}><summary>⚙ Filtre${active ? ' (zapnuté)' : ''}</summary>
      ${group('sort', 'Triediť')}${group('date', 'Nahraté')}${group('dur', 'Dĺžka')}</details>`;
  }

  async function renderSearch(app, query, t) {
    document.getElementById('q').value = query;
    document.title = `${query} – JUTUBE`;
    const h = new URLSearchParams(location.hash.slice(1));
    const f = { sort: h.get('sort') || '', date: h.get('date') || '', dur: h.get('dur') || '' };
    const key = `${query}|${f.sort}|${f.date}|${f.dur}`;
    if (lastResults.query !== query) { stats().searches++; save(); }
    setHTML(app, `${filterBar(query, f)}<div id="sres"><div class="empty"><div class="spin" style="margin:auto"></div></div></div>`);
    const box = document.getElementById('sres');
    try {
      const res = lastResults.key === key && lastResults.items.length ? lastResults : { query, key, ...(await search(query, searchParams(f))) };
      if (t !== token) return;
      lastResults = res;
      if (!res.items.length) return setHTML(box, '<div class="empty">Nič sa nenašlo.</div>');
      const pls = res.playlists?.length ? `<h2>Playlisty</h2><div class="hrow">${res.playlists.map(playlistCard).join('')}</div>` : '';
      const shs = res.shorts?.length ? `<h2>Shorts</h2><div class="srow" id="srow">${res.shorts.slice(0, 20).map((v) => shortCard(v, query)).join('')}</div>` : '';
      setHTML(box, `${pls}${shs}${pls || shs ? '<h2>Videá</h2>' : ''}<div class="grid" id="grid" style="margin-top:16px">${res.items.map(card).join('')}</div>`);
      // klik na short → prehliadač Shorts začne týmto shortom a pokračuje ďalšími z výsledkov
      document.getElementById('srow')?.addEventListener('click', () => { shortsSeed = { items: res.shorts, cont: null }; }, true);
      infinite(document.getElementById('grid'), t, async () => {
        if (!lastResults.cont) return null;
        const more = await searchMore(lastResults.cont);
        const known = new Set(lastResults.items.map((v) => v.id));
        const fresh = more.items.filter((v) => !known.has(v.id));
        lastResults.items.push(...fresh);
        lastResults.cont = more.cont;
        return { items: fresh, done: !more.cont };
      });
    } catch (e) {
      if (t === token) setHTML(app, `<div class="empty err">${esc(e.message)}</div>`);
    }
  }

  // nekonečné scrollovanie: loadMore() vráti { items, done } alebo null, keď už nič nie je
  function infinite(container, t, loadMore) {
    observer?.disconnect();
    const s = document.createElement('div');
    s.className = 'sent';
    container.after(s);
    let busy = false;
    observer = new IntersectionObserver(async (en) => {
      if (!en[0].isIntersecting || busy) return;
      busy = true;
      try {
        const more = await loadMore();
        if (t !== token) return;
        if (more?.items.length) container.insertAdjacentHTML('beforeend', tt.createHTML(more.items.map(card).join('')));
        if (!more || more.done) observer?.disconnect();
      } catch {}
      busy = false;
    }, { rootMargin: '800px' });
    observer.observe(s);
  }

  // ================= prehrávač =================
  // YouTube vydá video iba po kúskoch, preto si ho sťahujeme po segmentoch a skladáme
  // cez Media Source Extensions (na iPhone ManagedMediaSource, iOS 17.1+). Video a zvuk sú v jednom prvku.
  const MS = window.ManagedMediaSource || window.MediaSource;
  const AHEAD = 40; // koľko sekúnd dopredu sťahovať
  const BEHIND = 30; // koľko sekúnd za prehrávaním ponechať v pamäti
  const CHUNK = 2 * 1024 * 1024; // max. veľkosť jednej požiadavky
  let video = null;
  let player = null;
  let posTimer = null;
  let current = null;

  function supported(mime) {
    return !!MS && MS.isTypeSupported(mime);
  }

  // čakanie, ktoré sa dá prerušiť (napr. pri preskočení inam vo videu)
  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const id = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    });
  }

  async function fetchRange(url, start, end, signal) {
    const r = await fetch(`${url}&range=${start}-${end}`, { signal, credentials: 'omit' });
    if (!r.ok) throw Object.assign(new Error(`Video server: ${r.status}`), { status: r.status });
    return new Uint8Array(await r.arrayBuffer());
  }

  function parseSidx(buf, indexEnd) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const version = dv.getUint8(8);
    const timescale = dv.getUint32(16);
    let p = 20;
    let ept, first;
    if (version === 0) { ept = dv.getUint32(p); first = dv.getUint32(p + 4); p += 8; }
    else { ept = Number(dv.getBigUint64(p)); first = Number(dv.getBigUint64(p + 8)); p += 16; }
    const count = dv.getUint16(p + 2);
    p += 4;
    let offset = indexEnd + 1 + first;
    let t = ept / timescale;
    const segs = [];
    for (let i = 0; i < count; i++, p += 12) {
      const size = dv.getUint32(p) & 0x7fffffff;
      const dur = dv.getUint32(p + 4) / timescale;
      segs.push({ start: offset, end: offset + size - 1, t0: t, t1: t + dur });
      offset += size;
      t += dur;
    }
    return segs;
  }

  class Track {
    constructor(p, fmt) {
      this.p = p;
      this.fmt = fmt;
      this.sb = p.ms.addSourceBuffer(fmt.mimeType);
      this.next = 0;
    }
    // počká, kým buffer dokončí predchádzajúcu operáciu (video a zvuk sa teraz sťahujú súbežne)
    idle() {
      return this.sb.updating ? new Promise((r) => this.sb.addEventListener('updateend', r, { once: true })) : Promise.resolve();
    }
    async append(data) {
      await this.idle();
      return new Promise((resolve, reject) => {
        const done = () => { this.sb.removeEventListener('error', fail); resolve(); };
        const fail = () => { this.sb.removeEventListener('updateend', done); reject(new Error('Chyba pri skladaní videa')); };
        this.sb.addEventListener('updateend', done, { once: true });
        this.sb.addEventListener('error', fail, { once: true });
        this.sb.appendBuffer(data);
      });
    }
    async remove(from, to) {
      if (to <= from) return;
      await this.idle();
      return new Promise((resolve) => {
        this.sb.addEventListener('updateend', resolve, { once: true });
        this.sb.remove(from, to);
      });
    }
    async init() {
      const { initRange: ir, indexRange: xr } = this.fmt;
      let init, index;
      if (+xr.start === +ir.end + 1) {
        // hlavička a index idú hneď za sebou → stačí jedna požiadavka
        const both = await this.p.get(this, +ir.start, +xr.end);
        const split = +ir.end - +ir.start + 1;
        init = both.subarray(0, split);
        index = both.subarray(split);
      } else {
        [init, index] = await Promise.all([this.p.get(this, +ir.start, +ir.end), this.p.get(this, +xr.start, +xr.end)]);
      }
      this.segs = parseSidx(index, +xr.end);
      await this.append(init);
    }
    ahead(t) {
      const b = this.sb.buffered;
      for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 0.5 && b.end(i) > t) return b.end(i) - t;
      return 0;
    }
    indexAt(t) {
      const i = this.segs.findIndex((s) => s.t1 > t);
      return i < 0 ? this.segs.length : i;
    }
    get done() {
      return this.next >= this.segs.length;
    }
  }

  class Player {
    constructor(v, streams, vf, start, autoplay, audioOnly = !!data.audioOnly) {
      // len zvuk: sťahuje sa iba zvuková stopa (šetrí dáta), obraz nahradí náhľad videa
      this.audioOnly = audioOnly;
      v.closest('.player')?.classList.toggle('audio-only', audioOnly);
      this.v = v;
      this.s = streams;
      this.vf = vf;
      this.start = start;
      this.autoplay = autoplay;
      this.gen = 0;
      this.dead = false;
      this.ac = new AbortController();
      this.ms = new MS();
      if (window.ManagedMediaSource && this.ms instanceof window.ManagedMediaSource) v.disableRemotePlayback = true;
      v.src = URL.createObjectURL(this.ms);
      this.ms.addEventListener('sourceopen', () => this.open().catch((e) => this.fail(e)), { once: true });
      this.onSeek = () => this.seek();
      v.addEventListener('seeking', this.onSeek);
      // na pozadí prehliadač brzdí časovače – sťahovanie poháňa aj samotné prehrávanie
      this.onTick = () => this.pump();
      v.addEventListener('timeupdate', this.onTick);
      this.timer = setInterval(() => this.pump(), 400);
    }
    async get(track, start, end) {
      // sťahuje po kúskoch; výpadky siete skúša znova, pri vypršaní odkazov si vypýta nové
      const parts = [];
      for (let a = start; a <= end; a += CHUNK) {
        const b = Math.min(end, a + CHUNK - 1);
        parts.push(await this.fetchWithRetry(track, a, b));
      }
      if (parts.length === 1) return parts[0];
      const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
      let o = 0;
      for (const x of parts) { out.set(x, o); o += x.length; }
      return out;
    }
    async fetchWithRetry(track, a, b) {
      const delays = [500, 1000, 2000, 4000, 8000];
      for (let attempt = 0; ; attempt++) {
        const signal = this.ac.signal;
        try {
          return await fetchRange(track.fmt.url, a, b, signal);
        } catch (e) {
          if (e.name === 'AbortError' || signal.aborted) throw e;
          if (attempt >= delays.length) throw e;
          // 403 = odkaz vypršal → nové odkazy (najviac raz za minútu)
          if (e.status === 403 && Date.now() - (this.refreshedAt || 0) > 60e3) {
            this.refreshedAt = Date.now();
            await this.refresh().catch(() => {});
          }
          await sleep(delays[attempt], signal);
        }
      }
    }
    async refresh() {
      const fresh = await getStreams(this.s.details.id);
      for (const tr of this.tracks || []) {
        const f = [...fresh.videos, fresh.audio].find((x) => x && x.itag === tr.fmt.itag);
        if (f) tr.fmt.url = f.url;
      }
    }
    async open() {
      this.ms.duration = this.s.details.length || this.s.audio.approxDurationMs / 1000;
      this.tracks = this.audioOnly ? [new Track(this, this.s.audio)] : [new Track(this, this.vf), new Track(this, this.s.audio)];
      await Promise.all(this.tracks.map((t) => t.init()));
      if (this.dead) return;
      if (this.start) this.v.currentTime = this.start;
      for (const t of this.tracks) t.next = t.indexAt(this.start || 0);
      this.ready = true;
      this.pump();
      if (this.autoplay) this.v.play().catch(showBigPlay);
    }
    seek() {
      if (!this.ready) return;
      const t = this.v.currentTime;
      if (this.tracks.every((tr) => tr.ahead(t) > 0)) return;
      this.gen++;
      this.ac.abort();
      this.ac = new AbortController();
      for (const tr of this.tracks) {
        tr.next = tr.indexAt(t);
        tr.busy = false;
      }
      this.pump();
    }
    // video a zvuk sa sťahujú súbežne – každá stopa má vlastné sťahovanie
    pump() {
      if (!this.ready || this.dead || this.stopped) return;
      const t = this.v.currentTime;
      // ManagedMediaSource (iPhone): sťahujeme, keď to systém dovolí, alebo keď dochádza buffer
      const lazy = this.ms.streaming === false;
      for (const tr of this.tracks) {
        if (tr.busy || tr.done || tr.segs[tr.next].t0 >= t + AHEAD || (lazy && tr.ahead(t) > 10)) continue;
        this.load(tr);
      }
      if (this.tracks.every((tr) => tr.done && !tr.busy) && this.ms.readyState === 'open' && !this.tracks.some((tr) => tr.sb.updating)) {
        try { this.ms.endOfStream(); } catch {}
      }
    }
    async load(tr) {
      const gen = this.gen;
      tr.busy = true;
      try {
        const seg = tr.segs[tr.next];
        const data = await this.get(tr, seg.start, seg.end);
        if (gen !== this.gen || this.dead) return;
        const t = this.v.currentTime;
        const b = tr.sb.buffered;
        if (b.length && t - b.start(0) > BEHIND + 10) await tr.remove(b.start(0), t - BEHIND);
        try {
          await tr.append(data);
        } catch {
          // plná pamäť – uvoľni staršiu časť a skús znova
          await tr.remove(0, Math.max(0, t - 5));
          await tr.append(data);
        }
        if (gen === this.gen) tr.next++;
      } catch (e) {
        if (e.name !== 'AbortError' && gen === this.gen && !this.dead) this.fail(e);
      } finally {
        if (gen === this.gen) tr.busy = false;
      }
      if (gen === this.gen) setTimeout(() => this.pump(), 0);
    }
    fail(e) {
      if (this.dead || this.stopped) return;
      // ani opakovanie nepomohlo – zastav sťahovanie a ponúkni „Skúsiť znova“
      this.stopped = true;
      clearInterval(this.timer);
      // zastav aj sťahovanie druhej stopy – inak by po „Skúsiť znova“ bežalo dvakrát naraz
      this.gen++;
      this.ac.abort();
      this.ac = new AbortController();
      for (const tr of this.tracks || []) tr.busy = false;
      msg(`<div class="err">Video sa nepodarilo načítať.<br><small>${esc(e.message)}</small><br><br><button class="pill pill-w" id="retry-btn">↻ Skúsiť znova</button></div>`);
      document.getElementById('retry-btn')?.addEventListener('click', () => this.resume());
    }
    resume() {
      if (this.dead) return;
      this.stopped = false;
      for (const tr of this.tracks || []) tr.busy = false;
      msg('<div class="spin"></div>');
      clearInterval(this.timer);
      this.timer = setInterval(() => this.pump(), 400);
      if (!this.ready) {
        // zlyhal už štart – postav prehrávač nanovo
        this.destroy();
        player = new Player(this.v, this.s, this.vf, this.start, true, this.audioOnly);
        return;
      }
      this.pump();
      this.v.play().catch(() => {});
    }
    destroy() {
      this.dead = true;
      clearInterval(this.timer);
      this.ac.abort();
      this.v.removeEventListener('seeking', this.onSeek);
      this.v.removeEventListener('timeupdate', this.onTick);
      try { URL.revokeObjectURL(this.v.src); } catch {}
    }
  }

  // ================= sťahovanie videa =================
  // YouTube posiela obraz a zvuk zvlášť (fragmentované MP4). Stiahneme oboje po kúskoch
  // a spojíme do jedného MP4 súboru priamo v prehliadači.
  let downloading = null;

  async function fetchWhole(s, fmt, onBytes, signal) {
    const total = +fmt.contentLength;
    if (!total) throw new Error('Neznáma veľkosť súboru');
    const out = new Uint8Array(total);
    const delays = [500, 1000, 2000, 4000, 8000];
    for (let a = 0; a < total; a += CHUNK) {
      const b = Math.min(total - 1, a + CHUNK - 1);
      for (let attempt = 0; ; attempt++) {
        try {
          out.set(await fetchRange(fmt.url, a, b, signal), a);
          break;
        } catch (e) {
          if (e.name === 'AbortError' || attempt >= delays.length) throw e;
          if (e.status === 403) {
            // odkaz vypršal → vypýtaj nový
            const fresh = await getStreams(s.details.id);
            const f = [...fresh.videos, fresh.audio].find((x) => x.itag === fmt.itag);
            if (f) fmt.url = f.url;
          }
          await sleep(delays[attempt], signal);
        }
      }
      onBytes(b - a + 1);
    }
    return out;
  }

  // --- minimálna práca s MP4 boxmi ---
  const u32 = (buf, o) => ((buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3]) >>> 0;
  const setU32 = (buf, o, v) => { buf[o] = v >>> 24; buf[o + 1] = (v >>> 16) & 255; buf[o + 2] = (v >>> 8) & 255; buf[o + 3] = v & 255; };
  const fourcc = (buf, o) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);

  function boxesIn(buf, start, end) {
    const out = [];
    for (let o = start; o + 8 <= end; ) {
      let size = u32(buf, o);
      let hdr = 8;
      if (size === 1) { size = u32(buf, o + 8) * 2 ** 32 + u32(buf, o + 12); hdr = 16; }
      else if (size === 0) size = end - o;
      if (size < 8) break;
      out.push({ type: fourcc(buf, o + 4), start: o, end: o + size, body: o + hdr });
      o += size;
    }
    return out;
  }
  const child = (buf, box, type) => boxesIn(buf, box.body, box.end).find((b) => b.type === type);
  const copyBox = (buf, box) => buf.slice(box.start, box.end);
  function makeBox(type, parts) {
    const size = 8 + parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(size);
    setU32(out, 0, size);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    let o = 8;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  function parseFmp4(buf) {
    const top = boxesIn(buf, 0, buf.length);
    const moov = top.find((b) => b.type === 'moov');
    const trak = child(buf, moov, 'trak');
    const mdhd = child(buf, child(buf, trak, 'mdia'), 'mdhd');
    const timescale = u32(buf, mdhd.body + (buf[mdhd.body] === 1 ? 20 : 12));
    const frags = [];
    for (let i = 0; i < top.length; i++) {
      if (top[i].type !== 'moof') continue;
      const mdat = top[i + 1]?.type === 'mdat' ? top[i + 1] : null;
      const tfdt = child(buf, child(buf, top[i], 'traf'), 'tfdt');
      const t = tfdt ? (buf[tfdt.body] === 1 ? u32(buf, tfdt.body + 4) * 2 ** 32 + u32(buf, tfdt.body + 8) : u32(buf, tfdt.body + 4)) : 0;
      frags.push({ moof: top[i], mdat, time: t / timescale });
    }
    return { buf, top, moov, trak, frags };
  }

  // Spojí video (stopa 1) a zvuk (stopa 2) do jedného fragmentovaného MP4.
  function muxFmp4(vBuf, aBuf) {
    const V = parseFmp4(vBuf);
    const A = parseFmp4(aBuf);
    const ftyp = V.top.find((b) => b.type === 'ftyp');

    const mvhd = copyBox(vBuf, child(vBuf, V.moov, 'mvhd'));
    setU32(mvhd, mvhd[8] === 1 ? 116 : 104, 3); // next_track_ID

    const vTrak = copyBox(vBuf, V.trak);
    const aTrak = copyBox(aBuf, A.trak);
    // track_ID zvuku = 2 (tkhd)
    const tkhd = boxesIn(aTrak, 8, aTrak.length).find((b) => b.type === 'tkhd');
    setU32(aTrak, tkhd.body + (aTrak[tkhd.body] === 1 ? 20 : 12), 2);

    const vMvex = child(vBuf, V.moov, 'mvex');
    const aMvex = child(aBuf, A.moov, 'mvex');
    const vTrex = copyBox(vBuf, child(vBuf, vMvex, 'trex'));
    const aTrex = copyBox(aBuf, child(aBuf, aMvex, 'trex'));
    setU32(aTrex, 12, 2);
    const mehd = child(vBuf, vMvex, 'mehd');
    const mvex = makeBox('mvex', [...(mehd ? [copyBox(vBuf, mehd)] : []), vTrex, aTrex]);
    const moov = makeBox('moov', [mvhd, vTrak, aTrak, mvex]);

    // fragmenty zoradené podľa času, s prečíslovaním a track_ID 2 pre zvuk
    const frags = [...V.frags.map((f) => ({ ...f, buf: vBuf, audio: false })), ...A.frags.map((f) => ({ ...f, buf: aBuf, audio: true }))]
      .sort((x, y) => x.time - y.time || (x.audio ? 1 : -1));
    const parts = [copyBox(vBuf, ftyp), moov];
    let seq = 1;
    for (const f of frags) {
      const moof = copyBox(f.buf, f.moof);
      for (const b of boxesIn(moof, 8, moof.length)) {
        if (b.type === 'mfhd') setU32(moof, b.body + 4, seq++);
        if (b.type === 'traf' && f.audio) {
          const tfhd = boxesIn(moof, b.body, b.end).find((x) => x.type === 'tfhd');
          if (tfhd) setU32(moof, tfhd.body + 4, 2);
        }
      }
      parts.push(moof);
      if (f.mdat) parts.push(f.buf.subarray(f.mdat.start, f.mdat.end));
    }
    return new Blob(parts, { type: 'video/mp4' });
  }

  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60e3);
  }

  const fileName = (title, suffix) => `${(title || 'video').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)} ${suffix}`;

  async function downloadVideo(s, vf, audioOnly) {
    if (downloading) return toast('Už sa sťahuje iné video – počkaj, kým skončí');
    const ac = new AbortController();
    downloading = ac;
    const total = (audioOnly ? 0 : +vf.contentLength) + +s.audio.contentLength;
    let got = 0;
    const bar = showProgress(audioOnly ? 'Sťahujem zvuk' : `Sťahujem video ${qh(vf)}p`, () => ac.abort());
    const onBytes = (n) => { got += n; bar.set(got / total); };
    try {
      if (audioOnly) {
        const a = await fetchWhole(s, { ...s.audio }, onBytes, ac.signal);
        saveBlob(new Blob([a], { type: 'audio/mp4' }), fileName(s.details.title, '.m4a'));
      } else {
        const [v, a] = await Promise.all([fetchWhole(s, { ...vf }, onBytes, ac.signal), fetchWhole(s, { ...s.audio }, onBytes, ac.signal)]);
        bar.label('Spájam obraz a zvuk…');
        await sleep(30);
        saveBlob(muxFmp4(v, a), fileName(s.details.title, `[${qh(vf)}p].mp4`));
      }
      bar.done('Stiahnuté ✓');
    } catch (e) {
      bar.done(e.name === 'AbortError' ? 'Sťahovanie zrušené' : `Nepodarilo sa stiahnuť: ${e.message}`);
    } finally {
      downloading = null;
    }
  }

  function showProgress(label, onCancel) {
    const el = document.createElement('div');
    el.className = 'dlbar';
    setHTML(el, `<div class="dl-top"><span class="dl-label"></span><button class="dl-x" aria-label="Zrušiť">✕</button></div><div class="dl-track"><i></i></div>`);
    document.body.append(el);
    const lab = el.querySelector('.dl-label');
    const fill = el.querySelector('i');
    let base = label;
    lab.textContent = `${label}… 0 %`;
    el.querySelector('.dl-x').onclick = onCancel;
    return {
      set(p) { fill.style.width = `${Math.min(100, p * 100).toFixed(1)}%`; lab.textContent = `${base}… ${Math.floor(p * 100)} %`; },
      label(t) { base = t; lab.textContent = t; },
      done(t) { lab.textContent = t; fill.style.width = '100%'; el.querySelector('.dl-x').remove(); setTimeout(() => el.remove(), 4000); },
    };
  }

  function setupMoreMenu(s) {
    const btn = document.getElementById('more-btn');
    const menu = document.getElementById('more-menu');
    if (!btn || !menu) return;
    const currentVf = () => s.videos.find((x) => String(x.itag) === document.getElementById('qs').value) || pickVideo(s);
    const mb = (bytes) => `${Math.round(bytes / 1048576)} MB`;
    btn.onclick = (e) => {
      e.stopPropagation();
      const vf = currentVf();
      setHTML(menu, `<button class="pill" id="m-premium">🎛 Prémiové ovládanie</button>
        <button class="pill" id="m-audio">🎧 ${player?.audioOnly ? 'Vypnúť režim len zvuk' : 'Len zvuk (šetrí dáta)'}</button>
        ${pipSupported() ? '<button class="pill" id="m-pip">⧉ Obraz v obraze</button>' : ''}
        ${airplaySupported() ? '<button class="pill" id="m-air">📺 AirPlay (Apple TV)</button>' : ''}
        <button class="pill" id="dl-v">⬇ Stiahnuť video (${qh(vf)}p · ${mb(+vf.contentLength + +s.audio.contentLength)})</button>
        <button class="pill" id="dl-a">⬇ Stiahnuť len zvuk (${mb(+s.audio.contentLength)})</button>`);
      menu.hidden = !menu.hidden;
      document.getElementById('m-premium').onclick = () => { menu.hidden = true; openPremium(); };
      document.getElementById('m-audio').onclick = () => { menu.hidden = true; setAudioOnly(!player?.audioOnly); };
      const pipBtn = document.getElementById('m-pip');
      if (pipBtn) pipBtn.onclick = () => { menu.hidden = true; togglePip(); };
      const airBtn = document.getElementById('m-air');
      if (airBtn) airBtn.onclick = () => { menu.hidden = true; castNow(); };
      document.getElementById('dl-v').onclick = () => { menu.hidden = true; downloadVideo(s, vf, false); };
      document.getElementById('dl-a').onclick = () => { menu.hidden = true; downloadVideo(s, vf, true); };
    };
    document.addEventListener('click', () => { menu.hidden = true; });
  }

  // ================= prémiové ovládanie =================
  const watchStack = []; // videá pozreté v tejto relácii (pre „predchádzajúce“)
  let watchMeta = { likes: '', liked: false };
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const PC_ICONS = {
    prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12.2" y="16.3" font-size="6.2" font-weight="700" text-anchor="middle" font-family="Arial">10</text></svg>',
    fwd: '<svg viewBox="0 0 24 24"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="11.8" y="16.3" font-size="6.2" font-weight="700" text-anchor="middle" font-family="Arial">10</text></svg>',
    like: '<svg viewBox="0 0 24 24"><path d="M2 21h4V9H2v12zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15-5-2.2L7 18V5h10z"/></svg>',
    speed: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-2-4.5 6-3.5-6-3.5z"/></svg>',
    quality: '<svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>',
    stable: '<svg viewBox="0 0 24 24"><path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/></svg>',
    audio: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h3v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h3a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z"/></svg>',
    pip: '<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>',
  };

  // ================= obraz v obraze a režim len zvuk =================
  const pipSupported = () => !!(document.pictureInPictureEnabled || HTMLVideoElement.prototype.webkitSetPresentationMode);
  async function togglePip() {
    if (!video) return;
    if (player?.audioOnly) return toast('V režime „len zvuk“ nie je obraz – najprv ho vypni');
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
      else if (video.webkitSetPresentationMode) video.webkitSetPresentationMode(video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
    } catch (e) {
      toast(`Obraz v obraze sa nepodarilo: ${e.message}`);
    }
  }

  // ================= AirPlay (Apple TV) =================
  // Náš prehrávač skladá video cez ManagedMediaSource a to AirPlay nedovolí. Apple TV preto dostane
  // priamy odkaz (HLS alebo MP4 s obrazom aj zvukom) v samostatnom skrytom <video> a stiahne si ho sama.
  // Toto <video> zostáva celý čas rovnaké, takže pri ďalšom videe hrá Apple TV bez nového pripájania.
  const AIRPLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M6 22h12l-6-6zM21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H3V5h18v12h-4v2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>';
  const airplaySupported = () => !!window.WebKitPlaybackTargetAvailabilityEvent;
  let castV = null;
  let airAvail = false; // je v sieti nejaké AirPlay zariadenie?
  const casting = () => !!castV?.webkitCurrentPlaybackTargetIsWireless;
  const paintAirButtons = () => document.querySelectorAll('.yc-air').forEach((b) => { b.hidden = !airAvail; b.classList.toggle('on', casting()); });

  function castEl() {
    if (castV) return castV;
    castV = document.createElement('video');
    castV.setAttribute('x-webkit-airplay', 'allow');
    castV.playsInline = true;
    castV.preload = 'none';
    castV.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(castV);
    castV.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => { airAvail = e.availability === 'available'; paintAirButtons(); });
    castV.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
      paintAirButtons();
      if (casting()) {
        // pripojené – Apple TV pokračuje tam, kde je video v telefóne
        if (video) {
          const at = video.currentTime;
          video.pause();
          seekCast(at);
        }
        castV.play().catch(() => {});
        toast('📺 Prehráva sa cez AirPlay');
      } else {
        // odpojené – pokračuj v telefóne
        castV.pause();
        if (video && castV.dataset.id === current?.details.id) {
          video.currentTime = castV.currentTime;
          video.play().catch(() => {});
        }
        toast('AirPlay je odpojený');
      }
      paintCastOverlay();
    });
    castV.addEventListener('timeupdate', paintCastOverlay);
    castV.addEventListener('play', paintCastOverlay);
    castV.addEventListener('pause', paintCastOverlay);
    castV.addEventListener('ended', () => { if (casting()) playNextSoon(); });
    castV.addEventListener('error', () => { if (casting()) toast('Apple TV toto video nevie prehrať – skús zrkadlenie obrazovky'); });
    return castV;
  }

  function seekCast(at) {
    if (castV.readyState >= 1) castV.currentTime = at;
    else castV.addEventListener('loadedmetadata', () => { castV.currentTime = at; }, { once: true });
  }

  // pripraví odkaz pre Apple TV hneď pri otvorení videa (výber zariadenia sa musí otvoriť priamo po ťuknutí)
  function prepareCast(s) {
    if (!airplaySupported() || !video) return;
    const cv = castEl();
    if (!video.__castGuard) {
      // počas AirPlay má telefón stáť – Apple TV hrá samostatne
      video.__castGuard = true;
      video.addEventListener('play', () => { if (casting()) video.pause(); });
    }
    if (cv.dataset.id === s.details.id) return paintCastOverlay();
    cv.dataset.id = s.details.id;
    if (s.cast) cv.src = s.cast.url;
    else cv.removeAttribute('src');
    if (casting()) {
      video.pause();
      if (s.cast) cv.play().catch(() => {});
      else toast('Toto video sa na Apple TV poslať nedá – skús zrkadlenie obrazovky');
    }
    paintCastOverlay();
  }

  function castNow() {
    if (!castV || !airplaySupported()) return toast('AirPlay funguje len v Safari');
    if (!casting() && !current?.cast) return toast('Toto video sa na Apple TV poslať nedá – skús zrkadlenie obrazovky v Ovládacom centre');
    // otvorí systémový výber zariadení (tam sa dá AirPlay aj vypnúť výberom iPhonu)
    castV.webkitShowPlaybackTargetPicker();
  }

  // počas AirPlay prekryje prehrávač jednoduchým ovládaním Apple TV
  function paintCastOverlay() {
    const box = video?.closest('.player');
    let ov = box?.querySelector('.cast-ov');
    const show = box && casting() && castV.dataset.id === current?.details.id;
    if (!show) return ov?.remove();
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'cast-ov';
      setHTML(ov, `<div class="cast-ic">${AIRPLAY_ICON}</div><b>Prehráva sa cez AirPlay</b><span class="mt cast-t"></span>
        <div class="acts"><button class="pc-b" data-c="back" title="Späť o 10 s">${PC_ICONS.back}</button><button class="pc-b pc-play" data-c="play"></button><button class="pc-b" data-c="fwd" title="Dopredu o 10 s">${PC_ICONS.fwd}</button></div>
        <button class="pill" data-c="pick">Odpojiť / zmeniť zariadenie</button>`);
      ov.onclick = (e) => {
        e.stopPropagation();
        const c = e.target.closest('[data-c]')?.dataset.c;
        if (c === 'play') castV.paused ? castV.play().catch(() => {}) : castV.pause();
        if (c === 'back') castV.currentTime = Math.max(0, castV.currentTime - 10);
        if (c === 'fwd') castV.currentTime += 10;
        if (c === 'pick') castV.webkitShowPlaybackTargetPicker();
      };
      box.append(ov);
    }
    const play = ov.querySelector('[data-c="play"]');
    const want = castV.paused ? 'play' : 'pause';
    if (play.dataset.s !== want) { play.dataset.s = want; setHTML(play, PC_ICONS[want]); }
    ov.querySelector('.cast-t').textContent = `${fmt(Math.floor(castV.currentTime || 0))} / ${fmt(current?.details.length || 0)}${current?.cast ? ` · ${current.cast.label}` : ''}`;
  }

  // ================= štatistiky pozerania =================
  // Každých 5 s pozrieme, čo práve hrá (video, AirPlay alebo short), a pripíšeme reálne pozretý čas.
  // Rátame menšie z dvoch čísel – koľko ubehlo hodín a o koľko pokročilo video –, takže preskakovanie
  // ani zamknutý telefón (časovače vtedy stoja, video hrá ďalej) čas neskreslia.
  function stats() {
    const s = (data.stats ||= {});
    s.since ||= Date.now();
    s.days ||= {};
    s.hours ||= Array(24).fill(0);
    s.wd ||= Array(7).fill(0);
    s.ch ||= {};
    s.vids ||= {};
    s.searches ||= 0;
    s.cast ||= 0;
    return s;
  }
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // YouTube kategóriu nepošle – hudbu spoznáme podľa toho, odkiaľ sa pustila, kanála a názvu
  const MUSIC_TITLE = /official\s+(music\s+)?(video|audio)|\blyrics?\b|videoclip|\(audio\)|\bft\.|\bfeat\.|\bremix\b/i;
  function statsKind(d) {
    if (d.kind) return d.kind;
    const music = player?.audioOnly || lastPageHash.startsWith('#music') || / - Topic$|VEVO$/i.test(d.channel || '') || MUSIC_TITLE.test(d.title || '');
    return (d.kind = music ? 'm' : 'v');
  }
  function statsSource() {
    if (casting() && current && castV.dataset.id === current.details.id) return castV.paused ? null : { el: castV, d: current.details, cast: true };
    if (video && current && !video.paused && !video.ended) return { el: video, d: current.details };
    const sp = shortsState?.player;
    if (sp && !sp.dead && !sp.v.paused && !sp.v.ended) return { el: sp.v, d: sp.s.details, kind: 's' };
    return null;
  }
  let statsLast = null;
  const statsCounted = new Set(); // videá už započítané ako „prehraté“ v tejto relácii
  const add1 = (o, k, sec) => { o[k] = Math.round(((o[k] || 0) + sec) * 10) / 10; };
  function statsTick() {
    const src = statsSource();
    const prev = statsLast;
    const now = Date.now();
    statsLast = src ? { id: src.d.id, el: src.el, ct: src.el.currentTime, at: now } : null;
    if (!src || !prev || prev.id !== src.d.id || prev.el !== src.el) return;
    const sec = Math.min((now - prev.at) / 1000, (src.el.currentTime - prev.ct) / (src.el.playbackRate || 1));
    if (!(sec > 0)) return;
    const s = stats();
    const d = src.d;
    const kind = src.kind || statsKind(d);
    const at = new Date();
    const day = (s.days[dayKey(at)] ||= { v: 0, m: 0, s: 0, n: 0 });
    add1(day, kind, sec);
    add1(s.hours, at.getHours(), sec);
    add1(s.wd, at.getDay(), sec);
    if (src.cast) add1(s, 'cast', sec);
    const v = (s.vids[d.id] ||= { t: d.title, c: d.channel, k: kind, s: 0, n: 0 });
    v.t = d.title || v.t;
    add1(v, 's', sec);
    if (!statsCounted.has(d.id)) {
      statsCounted.add(d.id);
      v.n++;
      day.n++;
    }
    if (d.channelId) {
      const c = (s.ch[d.channelId] ||= { t: d.channel, s: 0 });
      c.t = d.channel || c.t;
      add1(c, 's', sec);
    }
    // nech to nezaberie priveľa miesta: drž len najsledovanejšie videá a kanály
    const trim = (o, max, keep) => {
      const keys = Object.keys(o);
      if (keys.length <= max) return;
      for (const k of keys.sort((a, b) => o[b].s - o[a].s).slice(keep)) delete o[k];
    };
    trim(s.vids, 500, 400);
    trim(s.ch, 300, 250);
    save();
  }
  setInterval(statsTick, 5000);
  document.addEventListener('visibilitychange', statsTick);

  // prepne len zvuk ↔ video bez straty pozície
  function setAudioOnly(on) {
    data.audioOnly = on;
    save();
    if (!video || !current || !player) return;
    if (on && document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    const at = video.currentTime;
    const wasPlaying = !video.paused;
    const vf = player.vf;
    player.destroy();
    msg('<div class="spin"></div>');
    player = new Player(video, current, vf, at, wasPlaying, on);
    toast(on ? '🎧 Len zvuk – šetrí dáta' : 'Video je späť');
  }

  // Stabilná hlasitosť: kompresor vyrovná tiché a hlasné pasáže (Web Audio).
  let actx = null;
  function applyStableVolume() {
    if (!video) return;
    if (!data.stableVol && !video.__chain) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== 'running') actx.resume();
      // bez povolenia prehliadača (pred prvým kliknutím) zvuk nepresmerúvame, inak by stíchol
      if (actx.state !== 'running' && !video.__chain) return;
      if (!video.__chain) {
        const src = actx.createMediaElementSource(video);
        const comp = actx.createDynamicsCompressor();
        comp.threshold.value = -32;
        comp.knee.value = 24;
        comp.ratio.value = 6;
        comp.attack.value = 0.01;
        comp.release.value = 0.3;
        const gain = actx.createGain();
        gain.gain.value = 1.6;
        comp.connect(gain).connect(actx.destination);
        video.__chain = { src, comp };
      }
      const { src, comp } = video.__chain;
      src.disconnect();
      src.connect(data.stableVol ? comp : actx.destination);
    } catch {}
  }

  function openPremium() {
    if (!video || !current) return;
    document.getElementById('pc')?.remove();
    const s = current;
    document.querySelector('.side.pc-open')?.classList.remove('pc-open');
    const el = document.createElement('div');
    // na PC sa panel ukáže v stĺpci s odporúčaniami (namiesto nich), na mobile ako spodný panel
    const side = matchMedia('(min-width:1001px)').matches ? document.querySelector('.watch .side') : null;
    el.className = side ? 'pc-dock' : 'pc-overlay';
    el.id = 'pc';
    // predchádzajúce: vo fronte/playliste predchádzajúca položka, inak video, z ktorého si prišiel
    const prevQ = prevQueueVideo(s.details.id);
    const prevId = prevQ ? null : watchStack[watchStack.length - 2];
    const hasPrev = !!(prevQ || prevId);
    const nextV = nextVideo(s.details.id);
    setHTML(el, `<div class="pc-sheet" role="dialog" aria-label="Prémiové ovládanie">
      <div class="pc-head"><span class="pc-logo">P</span><b>Prémiové ovládanie</b><button class="pc-x" id="pc-x" aria-label="Zavrieť">✕</button></div>
      <div class="pc-title">${esc(s.details.title)}</div>
      <div class="pc-ch">${esc(s.details.channel)}</div>
      <div class="pc-main">
        <button class="pc-b" id="pc-prev" title="Predchádzajúce video"${hasPrev ? '' : ' disabled'}>${PC_ICONS.prev}</button>
        <button class="pc-b" id="pc-back" title="Späť o 10 s">${PC_ICONS.back}</button>
        <button class="pc-b pc-play" id="pc-play" title="Prehrať / pauza"></button>
        <button class="pc-b" id="pc-fwd" title="Dopredu o 10 s">${PC_ICONS.fwd}</button>
        <button class="pc-b" id="pc-next" title="Ďalšie video"${nextV ? '' : ' disabled'}>${PC_ICONS.next}</button>
      </div>
      <div class="pc-row">
        <button class="pc-o" id="pc-like">${PC_ICONS.like}<span>${esc(watchMeta.likes || 'Páči sa mi')}</span></button>
        <button class="pc-o" id="pc-save">${PC_ICONS.save}<span>Uložiť</span></button>
        <button class="pc-o" id="pc-speed">${PC_ICONS.speed}<span>Rýchlosť</span></button>
        <button class="pc-o" id="pc-quality">${PC_ICONS.quality}<span>Kvalita</span></button>
        <button class="pc-o" id="pc-stable">${PC_ICONS.stable}<span>Stabilná hlasitosť</span></button>
        <button class="pc-o" id="pc-audio">${PC_ICONS.audio}<span>Len zvuk</span></button>
        <button class="pc-o" id="pc-pip"${pipSupported() ? '' : ' disabled'}>${PC_ICONS.pip}<span>Obraz v obraze</span></button>
      </div>
      <div class="pc-sub" id="pc-sub" hidden></div>
    </div>`);
    if (side) {
      side.prepend(el);
      side.classList.add('pc-open');
    } else document.body.append(el);
    const $ = (id) => document.getElementById(id);
    const paintPlay = () => setHTML($('pc-play'), video.paused ? PC_ICONS.play : PC_ICONS.pause);
    const paintToggles = () => {
      $('pc-like').classList.toggle('on', watchMeta.liked);
      $('pc-save').classList.toggle('on', !!watchMeta.saved);
      $('pc-stable').classList.toggle('on', !!data.stableVol);
      $('pc-audio').classList.toggle('on', !!player?.audioOnly);
      $('pc-quality').disabled = !!player?.audioOnly;
      $('pc-speed').querySelector('span').textContent = (video.playbackRate || 1) === 1 ? 'Rýchlosť' : `${video.playbackRate}×`;
      $('pc-quality').querySelector('span').textContent = player?.vf ? `${qh(player.vf)}p` : 'Kvalita';
    };
    paintPlay();
    paintToggles();
    const v = video;
    v.addEventListener('play', paintPlay);
    v.addEventListener('pause', paintPlay);
    const close = () => {
      v.removeEventListener('play', paintPlay);
      v.removeEventListener('pause', paintPlay);
      el.remove();
      side?.classList.remove('pc-open');
    };
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    $('pc-x').onclick = close;
    $('pc-play').onclick = () => (v.paused ? v.play().catch(() => {}) : v.pause());
    $('pc-back').onclick = () => { v.currentTime = Math.max(0, v.currentTime - 10); };
    $('pc-fwd').onclick = () => { v.currentTime = Math.min(v.duration || 1e9, v.currentTime + 10); };
    $('pc-prev').onclick = () => {
      if (!hasPrev) return;
      close();
      if (prevQ) return (location.hash = watchHref(prevQ));
      watchStack.pop();
      watchStack.pop();
      location.hash = `#v=${prevId}`;
    };
    $('pc-next').onclick = () => { if (!nextV) return; close(); location.hash = watchHref(nextV); };
    $('pc-audio').onclick = () => { setAudioOnly(!player?.audioOnly); paintToggles(); };
    $('pc-pip').onclick = () => { close(); togglePip(); };
    const needLogin = () => toast('Na toto sa prihlás svojím YouTube účtom');
    $('pc-like').onclick = async () => {
      if (!loggedIn()) return needLogin();
      try {
        await setLike(s.details.id, !watchMeta.liked);
        watchMeta.liked = !watchMeta.liked;
        document.getElementById('like-btn')?.classList.toggle('on', watchMeta.liked);
        toast(watchMeta.liked ? 'Pridané do „Páči sa mi“' : 'Odstránené z „Páči sa mi“');
      } catch (e) { toast(`Nepodarilo sa: ${e.message}`); }
      paintToggles();
    };
    $('pc-save').onclick = async () => {
      if (!loggedIn()) return needLogin();
      try {
        await setLater(s.details.id, !watchMeta.saved);
        watchMeta.saved = !watchMeta.saved;
        document.getElementById('later-btn')?.classList.toggle('on', watchMeta.saved);
        toast(watchMeta.saved ? 'Uložené do „Pozrieť neskôr“' : 'Odstránené z „Pozrieť neskôr“');
      } catch (e) { toast(`Nepodarilo sa: ${e.message}`); }
      paintToggles();
    };
    const sub = $('pc-sub');
    const showSub = (title, options, isOn, onPick) => {
      if (!sub.hidden && sub.dataset.kind === title) return (sub.hidden = true);
      sub.dataset.kind = title;
      setHTML(sub, `<div class="pc-sub-t">${esc(title)}</div><div class="pc-sub-list">${options
        .map((o, i) => `<button class="pc-chip${isOn(o) ? ' on' : ''}" data-i="${i}">${esc(o.label)}</button>`)
        .join('')}</div>`);
      sub.hidden = false;
      sub.onclick = (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        onPick(options[+b.dataset.i]);
        sub.hidden = true;
        paintToggles();
      };
    };
    $('pc-speed').onclick = () => showSub('Rýchlosť prehrávania', SPEEDS.map((x) => ({ label: x === 1 ? 'Normálna' : `${x}×`, x })), (o) => o.x === (v.playbackRate || 1), (o) => {
      v.playbackRate = o.x;
      data.speed = o.x;
      save();
    });
    $('pc-quality').onclick = () => showSub('Kvalita', s.videos.map((f) => ({ label: `${qh(f)}p${f.fps > 30 ? f.fps : ''}`, f })), (o) => o.f.itag === player?.vf?.itag, (o) => {
      const sel = document.getElementById('qs');
      if (!sel) return;
      sel.value = String(o.f.itag);
      sel.dispatchEvent(new Event('change'));
    });
    $('pc-stable').onclick = () => {
      data.stableVol = !data.stableVol;
      save();
      applyStableVolume();
      toast(data.stableVol ? 'Stabilná hlasitosť zapnutá' : 'Stabilná hlasitosť vypnutá');
      paintToggles();
    };
  }

  function stopPlayer() {
    if (casting()) castV.pause();
    clearInterval(posTimer);
    clearInterval(nextTimer);
    savePos();
    player?.destroy();
    player = null;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video = null;
    }
    current = null;
  }

  function savePos() {
    if (!video || !current || !video.duration || !isFinite(video.duration) || video.currentTime < 2) return;
    data.pos[current.details.id] = { p: Math.floor(video.currentTime), d: Math.floor(video.duration) };
    const keys = Object.keys(data.pos);
    if (keys.length > 300) delete data.pos[keys[0]];
    save();
  }

  function msg(html) {
    const m = document.getElementById('msg');
    if (m) setHTML(m, html);
  }

  let related = [];
  let nextTimer = null;
  let onWatch = false; // je práve otvorená stránka prehrávania?
  let chapters = [];

  // ================= popis a kapitoly =================
  const toSec = (ts) => ts.split(':').reduce((a, x) => a * 60 + +x, 0);

  // odkazy a časy v popise urobí klikateľnými (čas = skok vo videu)
  function linkify(textIn) {
    // bez lookbehind (?<!…) – starší Safari na iPade by kvôli nemu odmietol celý skript
    return esc(textIn).replace(/(https?:\/\/[^\s<]+)|(^|[^\w:])((?:\d{1,2}:)?\d{1,2}:\d{2})(?![\w:])/g, (m, url, pre, ts) => {
      if (url) {
        const vid = parseVideoId(url.replace(/&amp;/g, '&'));
        return vid ? `<a href="#v=${vid}">${url}</a>` : `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }
      return `${pre}<a href="#" data-seek="${toSec(ts)}">${ts}</a>`;
    });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('[data-seek]');
    if (!a || !video) return;
    e.preventDefault();
    video.currentTime = +a.dataset.seek;
    video.play().catch(() => {});
    video.closest('.player')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // kapitoly z popisu (riadky začínajúce časom), ak ich YouTube neposlal
  function chaptersFromDescription(desc) {
    const out = [];
    for (const line of desc.split('\n')) {
      const m = line.match(/^\s*[[(]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\])]?\s*[-–—:|.]?\s*(.+)$/);
      if (m) out.push({ start: toSec(m[1]), title: m[2].trim() });
    }
    return out.length >= 3 && out[0].start === 0 ? out : [];
  }

  function renderDescription(s) {
    const box = document.getElementById('desc');
    const body = document.getElementById('desc-body');
    if (!box || !body) return;
    const d = s.details.description.trim();
    if (!d) return setHTML(body, '');
    setHTML(body, `<div class="desc-text">${linkify(d)}</div><button class="desc-more" id="desc-more">…viac</button>`);
    const more = document.getElementById('desc-more');
    const txt = box.querySelector('.desc-text');
    if (txt.scrollHeight <= txt.clientHeight + 4) more.hidden = true;
    more.onclick = () => {
      const open = box.classList.toggle('open');
      more.textContent = open ? 'Zobraziť menej' : '…viac';
    };
  }

  // odporúčania vpravo s čipmi „Všetko / Od: kanál / Podobné“ (ako YouTube)
  function renderRelated(items, chanId, chanName, cur) {
    const rel = document.getElementById('rel');
    const chipsEl = document.getElementById('rel-chips');
    if (!rel) return;
    const t = token;
    let fromCh = chanId ? items.filter((v) => v.channelId === chanId) : null;
    const others = chanId ? items.filter((v) => v.channelId !== chanId) : items;
    const tabs = [['all', 'Všetko'], ...(chanId ? [['ch', `Od: ${chanName || 'kanál'}`], ['other', 'Podobné']] : [])];
    const fill = (list) => setHTML(rel, list.length ? list.map(card).join('') : '<p class="mt">Žiadne videá.</p>');
    const show = async (key) => {
      if (chipsEl) chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.rel === key));
      if (key !== 'ch') return fill(key === 'other' ? others : items);
      // videá kanála: z odporúčaní, inak (alebo keď je ich málo) z kanála
      if (fromCh.length < 5) {
        setHTML(rel, '<div class="empty"><div class="spin" style="margin:auto"></div></div>');
        try {
          const ch = await getChannel(chanId);
          const seen = new Set(fromCh.map((v) => v.id));
          fromCh = [...fromCh, ...ch.items.filter((v) => v.id !== cur && !seen.has(v.id))];
        } catch {}
        if (t !== token || !chipsEl?.querySelector('[data-rel="ch"].on')) return;
      }
      fill(fromCh);
    };
    if (chipsEl) {
      setHTML(chipsEl, tabs.map(([k, l]) => `<button class="chip" data-rel="${k}">${esc(l)}</button>`).join(''));
      chipsEl.onclick = (e) => { const c = e.target.closest('[data-rel]'); if (c) show(c.dataset.rel); };
    }
    show('all');
  }

  // 👍 / 👎 pod videom – s účtom zapisujú do YouTube, bez účtu ukážu len počty
  function setupVotes(id, t) {
    const like = document.getElementById('like-btn');
    const dis = document.getElementById('dislike-btn');
    const needLogin = () => toast('Na hodnotenie sa prihlás svojím YouTube účtom');
    like.onclick = async () => {
      if (!loggedIn()) return needLogin();
      const on = !like.classList.contains('on');
      like.disabled = true;
      try {
        await setLike(id, on);
        if (t !== token) return;
        like.classList.toggle('on', on);
        if (on) dis.classList.remove('on');
        watchMeta.liked = on;
        toast(on ? 'Pridané do „Páči sa mi“' : 'Odstránené z „Páči sa mi“');
      } catch (e) { toast(`Nepodarilo sa: ${e.message}`); }
      like.disabled = false;
    };
    dis.onclick = async () => {
      if (!loggedIn()) return needLogin();
      const on = !dis.classList.contains('on');
      dis.disabled = true;
      try {
        await ytAuth(on ? 'like/dislike' : 'like/removelike', { target: { videoId: id } });
        if (t !== token) return;
        dis.classList.toggle('on', on);
        if (on) { like.classList.remove('on'); watchMeta.liked = false; }
      } catch (e) { toast(`Nepodarilo sa: ${e.message}`); }
      dis.disabled = false;
    };
  }

  // „Odoberať“ pri kanáli: s účtom odber na YouTube, bez účtu uloží kanál medzi obľúbené
  function setupSubscribe(ch) {
    const btn = document.getElementById('sub-btn');
    if (!btn || !ch.id) return;
    btn.hidden = false;
    let on = loggedIn() ? !!watchMeta.subscribed : isSaved(ch.id);
    const paint = () => {
      btn.textContent = on ? '✓ Odoberané' : 'Odoberať';
      btn.classList.toggle('pill-w', !on);
      btn.classList.toggle('on-sub', on);
    };
    paint();
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        if (loggedIn()) await setSubscribed(ch.id, !on);
        else toggleChannel(ch);
        on = !on;
        paint();
        renderSideNav();
        toast(on ? `Odoberáš: ${ch.title}` : 'Odber zrušený');
      } catch (e) { toast(`Nepodarilo sa: ${e.message}`); }
      btn.disabled = false;
    };
  }

  function renderChapters(list) {
    chapters = list;
    const box = document.getElementById('chapters');
    if (!box) return;
    if (!list.length) return (box.hidden = true);
    box.hidden = false;
    setHTML(box, `<h3>Kapitoly</h3><div class="ch-list">${list
      .map((c, i) => `<a href="#" class="chap" data-seek="${c.start}" data-i="${i}"><span class="chap-t">${fmt(Math.floor(c.start))}</span><span>${esc(c.title)}</span></a>`)
      .join('')}</div>`);
    markChapter();
    ycChapters();
  }

  // zvýrazní kapitolu, ktorá práve beží, a ukáže jej názov pod videom
  function markChapter() {
    if (!video || !chapters.length) return;
    const t = video.currentTime;
    let idx = -1;
    for (let i = 0; i < chapters.length; i++) if (chapters[i].start <= t + 0.3) idx = i;
    document.querySelectorAll('.chap').forEach((el) => el.classList.toggle('on', +el.dataset.i === idx));
    const cur = document.getElementById('cur-chap');
    if (cur) cur.textContent = idx >= 0 ? `▸ ${chapters[idx].title}` : '';
  }

  // ================= titulky =================
  async function loadCaptionVtt(c, translate) {
    const u = new URL(c.url);
    u.searchParams.set('fmt', 'vtt');
    if (translate) u.searchParams.set('tlang', 'sk');
    // rovnaká doména ako stránka (www alebo m.youtube.com)
    const same = `${location.origin}${u.pathname}${u.search}`;
    let r = await fetch(same, { credentials: 'omit' }).catch(() => null);
    if (!r || !r.ok) r = await fetch(u.toString(), { credentials: 'omit' });
    if (r.status === 429) throw new Error('YouTube práve odmieta preklad titulkov, skús neskôr');
    if (!r.ok) throw new Error(`Titulky: chyba ${r.status}`);
    const vtt = await r.text();
    if (!vtt.startsWith('WEBVTT')) throw new Error('Titulky sa nepodarilo načítať');
    return vtt;
  }

  function setupCaptions(s, applyNow = true) {
    const sel = document.getElementById('cc');
    if (!sel) return;
    if (!s.captions.length) return (sel.hidden = true);
    sel.hidden = false;
    const hasSk = s.captions.some((c) => c.lang.startsWith('sk'));
    const opts = [['off', 'Titulky: vyp.'], ...s.captions.map((c, i) => [`t${i}`, `${c.name}${c.auto ? ' (automatické)' : ''}`])];
    if (!hasSk && s.canTranslate) opts.push(['tr', 'Preložiť do slovenčiny']);
    setHTML(sel, opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join(''));
    const apply = async (val) => {
      for (const old of [...video.querySelectorAll('track')]) {
        if (old.src.startsWith('blob:')) URL.revokeObjectURL(old.src);
        old.remove();
      }
      if (val === 'off') return;
      const c = val === 'tr' ? s.captions.find((x) => !x.auto) || s.captions[0] : s.captions[+val.slice(1)];
      try {
        const vtt = await loadCaptionVtt(c, val === 'tr');
        if (current !== s) return;
        const tr = document.createElement('track');
        tr.kind = 'subtitles';
        tr.label = val === 'tr' ? 'Slovenčina (preklad)' : c.name;
        tr.srclang = val === 'tr' ? 'sk' : c.lang;
        tr.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
        video.append(tr);
        tr.track.mode = 'showing';
      } catch (e) {
        toast(e.message);
        sel.value = 'off';
      }
    };
    sel.onchange = () => {
      ycSync();
      // zapamätaj si jazyk pre ďalšie videá
      const v = sel.value;
      data.cc = v === 'off' ? 'off' : v === 'tr' ? 'tr' : s.captions[+v.slice(1)].lang;
      save();
      apply(v);
    };
    // predvolené: naposledy zvolený jazyk (ak ho video má)
    let pref = 'off';
    if (data.cc === 'tr' && opts.some((o) => o[0] === 'tr')) pref = 'tr';
    else if (data.cc && data.cc !== 'off') {
      const i = s.captions.findIndex((c) => c.lang === data.cc && !c.auto);
      const j = i >= 0 ? i : s.captions.findIndex((c) => c.lang === data.cc);
      if (j >= 0) pref = `t${j}`;
    }
    sel.value = pref;
    ycSync();
    if (!applyNow) {
      // návrat z mini prehrávača: výber podľa titulkov, ktoré už bežia
      const running = video.querySelector('track');
      sel.value = !running ? 'off' : running.srclang === 'sk' && opts.some((o) => o[0] === 'tr') && !hasSk ? 'tr' : pref;
      return;
    }
    if (pref !== 'off') apply(pref);
  }

  // ================= vlastné ovládanie videa (ako YouTube) =================
  const YC = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15c0 .8.9 1.3 1.6.8l11.5-7.5c.6-.4.6-1.2 0-1.6L8.6 3.7C7.9 3.2 7 3.7 7 4.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="2.5" height="14" rx="1"/><path d="M19 5.9v12.2c0 .8-.9 1.3-1.6.8L9.1 13c-.6-.4-.6-1.3 0-1.7l8.3-5.9c.7-.5 1.6 0 1.6.8z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><rect x="16.5" y="5" width="2.5" height="14" rx="1"/><path d="M5 5.9v12.2c0 .8.9 1.3 1.6.8l8.3-5.9c.6-.4.6-1.3 0-1.7L6.6 5.4C5.9 4.9 5 5.4 5 5.9z"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M5.3 8.3a1 1 0 0 1 1.4 0L12 13.6l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.4z"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M3 9.5v5c0 .6.4 1 1 1h3l4.3 3.6c.7.5 1.7.1 1.7-.8V5.7c0-.9-1-1.3-1.7-.8L7 8.5H4c-.6 0-1 .4-1 1zm13.5 2.5A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M3 9.5v5c0 .6.4 1 1 1h3l4.3 3.6c.7.5 1.7.1 1.7-.8V5.7c0-.9-1-1.3-1.7-.8L7 8.5H4c-.6 0-1 .4-1 1zm18.7 5.1L19.1 12l2.6-2.6-1.4-1.4-2.6 2.6-2.6-2.6-1.4 1.4 2.6 2.6-2.6 2.6 1.4 1.4 2.6-2.6 2.6 2.6z"/></svg>',
    cc: '<svg viewBox="0 0 24 24"><path d="M19 4H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm1 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1zM7 15h4v-2H7zm6 0h4v-2h-4zm-6-4h2V9H7zm4 0h6V9h-6z"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8.6 4.3-.1-2.6 2-1.6-2-3.4-2.4.9a8 8 0 0 0-2.2-1.3L15.5 2h-4l-.4 2.6c-.8.3-1.5.8-2.2 1.3l-2.4-1-2 3.5 2 1.6a8 8 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-.9c.7.5 1.4 1 2.2 1.3l.4 2.5h4l.4-2.6c.8-.3 1.5-.8 2.2-1.3l2.4.9 2-3.4zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>',
    theater: '<svg viewBox="0 0 24 24"><path d="M19 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm0 10H5V8h14zM9.5 9.5 7 12l2.5 2.5 1-1L9 12l1.5-1.5zm5 0-1 1L15 12l-1.5 1.5 1 1L17 12z"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
    exitFull: '<svg viewBox="0 0 24 24"><path d="M8 4h2v6H4V8h4zm6 0h2v4h4v2h-6zM4 14h6v6H8v-4H4zm10 0h6v2h-4v4h-2z"/></svg>',
    apOn: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    apOff: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',
    tune: '<svg viewBox="0 0 24 24"><path d="M3 7h9.2a3 3 0 0 0 5.6 0H21V5h-3.2a3 3 0 0 0-5.6 0H3zm12-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM3 19h3.2a3 3 0 0 0 5.6 0H21v-2h-9.2a3 3 0 0 0-5.6 0H3zm6-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
    speed: '<svg viewBox="0 0 24 24"><path d="M10 8v8l6-4zm2-6a10 10 0 0 0-1 .05v2a8 8 0 0 1 1-.05 8 8 0 1 1-7.4 5H2.5A10 10 0 1 0 12 2zM5.6 5.6 4.2 4.2A10 10 0 0 0 2.5 7h2.2a8 8 0 0 1 .9-1.4zM8.6 2.6A10 10 0 0 0 6.3 3.8l1 1.7A8 8 0 0 1 9 4.6z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M17 9V7A5 5 0 0 0 7 7v2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM9 7a3 3 0 0 1 6 0v2H9zm8 13H7v-9h10zm-5-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>',
    headphones: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h2v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h2a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9z"/></svg>',
    pip: '<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8zm2-8H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18z"/></svg>',
  };
  let ycIdleTimer = 0;
  const ycBox = () => video?.closest('.player');
  const yc$ = (sel) => ycBox()?.querySelector(sel);
  const ycAll = (sel) => [...(ycBox()?.querySelectorAll(sel) || [])];
  const mobileUI = () => matchMedia('(max-width:700px)').matches;

  // predchádzajúce / ďalšie video (fronta, playlist, odkiaľ si prišiel, odporúčania)
  function ycPrevTarget() {
    const id = current?.details.id;
    if (!id) return null;
    const pq = prevQueueVideo(id);
    if (pq) return { href: watchHref(pq) };
    const pid = watchStack[watchStack.length - 2];
    return pid ? { href: `#v=${pid}`, back: true } : null;
  }
  function ycGoPrev() {
    const p = ycPrevTarget();
    if (!p) return toast('Žiadne predchádzajúce video');
    if (p.back) { watchStack.pop(); watchStack.pop(); }
    location.hash = p.href;
  }
  function ycGoNext() {
    const n = current && nextVideo(current.details.id);
    if (!n) return toast('Žiadne ďalšie video');
    location.hash = watchHref(n);
  }

  function setupControls(v) {
    const box = v.closest('.player');
    box.querySelectorAll('.yc,.yc-menu,.yc-unlock').forEach((x) => x.remove());
    box.classList.remove('yc-locked');
    const el = document.createElement('div');
    el.className = 'yc';
    setHTML(el, `<div class="ycm ycm-top">
        <button class="yc-b ycm-down" title="Zmenšiť">${YC.down}</button><span class="ycm-sp"></span>
        <button class="yc-b yc-air" title="AirPlay (Apple TV)" hidden>${AIRPLAY_ICON}</button>
        <button class="yc-b yc-ap" title="Automatické prehrávanie"><span class="yc-sw"><i></i></span></button>
        <button class="yc-b yc-cc" title="Titulky" hidden>${YC.cc}</button>
        <button class="yc-b yc-set" title="Nastavenia">${YC.gear}</button>
      </div>
      <div class="ycm ycm-mid">
        <button class="yc-b ycm-prev" title="Predchádzajúce video">${YC.prev}</button>
        <button class="yc-b yc-play ycm-play" title="Prehrať"></button>
        <button class="yc-b ycm-next" title="Ďalšie video">${YC.next}</button>
      </div>
      <div class="ycm ycm-bot"><span class="yc-t">0:00 / 0:00</span><span class="ycm-sp"></span><button class="yc-b yc-fs" title="Celá obrazovka"></button></div>
      <div class="yc-prog" aria-label="Priebeh videa"><div class="yc-rail"><div class="yc-buf"></div><div class="yc-played"></div><div class="yc-gaps"></div></div><div class="yc-knob"></div><div class="yc-tip" hidden></div></div>
      <div class="yc-bar">
        <div class="yc-l">
          <button class="yc-b yc-play" title="Prehrať (k)"></button>
          <span class="yc-grp yc-vol"><button class="yc-b yc-mute" title="Stlmiť (m)"></button><input class="yc-vr" type="range" min="0" max="1" step="0.05" aria-label="Hlasitosť"></span>
          <span class="yc-grp yc-time"><span class="yc-t">0:00 / 0:00</span><span class="yc-ch"></span></span>
        </div>
        <div class="yc-r yc-grp">
          <button class="yc-b yc-ap" title="Automatické prehrávanie"><span class="yc-sw"><i></i></span></button>
          <button class="yc-b yc-cc" title="Titulky (c)" hidden>${YC.cc}</button>
          <button class="yc-b yc-set" title="Nastavenia">${YC.gear}</button>
          <button class="yc-b yc-air" title="AirPlay (Apple TV)" hidden>${AIRPLAY_ICON}</button>
          <button class="yc-b yc-th" title="Režim kino (t)">${YC.theater}</button>
          <button class="yc-b yc-fs" title="Celá obrazovka (f)"></button>
        </div>
      </div>`);
    box.append(el);
    const menuEl = document.createElement('div');
    menuEl.className = 'yc-menu';
    menuEl.hidden = true;
    box.append(menuEl);
    const unlock = document.createElement('button');
    unlock.className = 'yc-unlock';
    unlock.title = 'Odomknúť obrazovku';
    setHTML(unlock, `${YC.lock}<span>Ťukni na odomknutie</span>`);
    unlock.onclick = () => { box.classList.remove('yc-locked'); toast('Obrazovka odomknutá'); ycShow(); };
    box.append(unlock);
    const q = (c) => el.querySelector(c);
    const on = (c, fn) => el.querySelectorAll(c).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); fn(e); }; });
    if (data.vol != null) v.volume = data.vol;

    // priebeh: klik aj ťahanie, náhľad času a kapitoly
    const prog = q('.yc-prog');
    const tip = q('.yc-tip');
    let dragging = false;
    const dur = () => (v.duration && isFinite(v.duration) ? v.duration : current?.details.length || 0);
    const at = (e) => {
      const r = q('.yc-rail').getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      return { f, t: f * dur(), x: e.clientX - prog.getBoundingClientRect().left };
    };
    const paintProgress = (f) => {
      q('.yc-played').style.width = `${f * 100}%`;
      q('.yc-knob').style.left = `calc(${f * 100}% + ${2 - f * 4}px)`;
    };
    const showTip = (e) => {
      if (!dur()) return;
      const { t, x } = at(e);
      let ch = '';
      for (const c of chapters) if (c.start <= t) ch = c.title;
      setHTML(tip, `${ch ? `${esc(ch)}<br>` : ''}${fmt(Math.floor(t))}`);
      tip.hidden = false;
      const w = tip.offsetWidth / 2;
      tip.style.left = `${Math.min(prog.offsetWidth - w, Math.max(w, x))}px`;
    };
    prog.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || dragging) showTip(e);
      if (dragging) paintProgress(at(e).f);
    });
    prog.addEventListener('pointerleave', () => { if (!dragging) tip.hidden = true; });
    prog.addEventListener('pointerdown', (e) => {
      if (!dur()) return;
      dragging = true;
      prog.classList.add('drag');
      try { prog.setPointerCapture(e.pointerId); } catch {}
      showTip(e);
      paintProgress(at(e).f);
    });
    prog.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      prog.classList.remove('drag');
      tip.hidden = true;
      v.currentTime = at(e).t;
      ycShow();
    });
    prog.addEventListener('pointercancel', () => { dragging = false; prog.classList.remove('drag'); tip.hidden = true; });
    prog.addEventListener('click', (e) => e.stopPropagation());

    const tick = () => {
      const d = dur();
      if (!dragging) paintProgress(d ? Math.min(1, v.currentTime / d) : 0);
      const b = v.buffered;
      let end = 0;
      for (let i = 0; i < b.length; i++) if (b.start(i) <= v.currentTime + 1) end = Math.max(end, b.end(i));
      q('.yc-buf').style.width = d ? `${Math.min(1, end / d) * 100}%` : '0';
      const txt = `${fmt(Math.floor(v.currentTime || 0))} / ${fmt(Math.floor(d))}`;
      el.querySelectorAll('.yc-t').forEach((x) => { x.textContent = txt; });
      let ch = '';
      for (const c of chapters) if (c.start <= v.currentTime + 0.3) ch = c.title;
      q('.yc-ch').textContent = ch ? `• ${ch}` : '';
    };
    for (const ev of ['timeupdate', 'progress', 'durationchange', 'seeking', 'loadedmetadata']) v.addEventListener(ev, tick);

    // tlačidlá
    on('.yc-play', () => (v.paused ? v.play().catch(() => {}) : v.pause()));
    on('.yc-mute', () => {
      v.muted = !v.muted;
      if (!v.muted && v.volume === 0) v.volume = 0.5;
    });
    q('.yc-vr').oninput = (e) => {
      v.volume = +e.target.value;
      v.muted = v.volume === 0;
      data.vol = v.volume;
      save();
    };
    on('.yc-ap', () => {
      data.autoplay = !data.autoplay;
      save();
      const ap = document.getElementById('ap');
      if (ap) ap.checked = data.autoplay;
      toast(data.autoplay ? 'Automatické prehrávanie je zapnuté' : 'Automatické prehrávanie je vypnuté');
      ycSync();
    });
    on('.yc-cc', () => toggleCaptions());
    on('.yc-set', () => ycMenu(menuEl.hidden && !document.getElementById('ycs') ? 'main' : null));
    on('.yc-th', () => setTheater(!data.theater));
    on('.yc-fs', () => toggleFullscreen());
    on('.yc-air', () => castNow());
    on('.ycm-prev', () => ycGoPrev());
    on('.ycm-next', () => ycGoNext());
    // ⌄ = zmenšiť do mini prehrávača a vrátiť sa na predchádzajúcu stránku
    on('.ycm-down', () => {
      if (isFullscreen()) return toggleFullscreen();
      location.hash = lastPageHash || '#';
    });
    for (const ev of ['play', 'pause', 'volumechange']) v.addEventListener(ev, () => { ycSync(); ycShow(); });

    // PC: klik = pauza, dvojklik = celá obrazovka
    // dotyk: ťuknutie ukáže/skryje ovládanie, dvojité ťuknutie vľavo/vpravo = ∓10 s
    let clickTimer = 0;
    let lastTap = 0;
    let lastClick = 0;
    const touchTap = (e) => {
      const now = Date.now();
      const r = box.getBoundingClientRect();
      const side = e.clientX < r.left + r.width * 0.4 ? -1 : e.clientX > r.left + r.width * 0.6 ? 1 : 0;
      if (now - lastTap < 300 && side) {
        clearTimeout(clickTimer);
        lastTap = 0;
        v.currentTime = Math.max(0, Math.min(dur(), v.currentTime + side * 10));
        toast(side < 0 ? '⏪ −10 s' : '⏩ +10 s');
        return;
      }
      lastTap = now;
      clearTimeout(clickTimer);
      const wasIdle = box.classList.contains('yc-idle');
      clickTimer = setTimeout(() => {
        if (wasIdle) ycShow();
        else box.classList.add('yc-idle');
      }, side ? 260 : 0);
    };
    v.addEventListener('click', (e) => {
      if (box.classList.contains('yc-locked')) return;
      if (!menuEl.hidden) return ycMenu(null);
      if (matchMedia('(hover: none)').matches || mobileUI()) return touchTap(e);
      // pauza hneď ako YouTube; dvojklik (druhé kliknutie stav vráti) vpravo/vľavo = ±10 s, v strede = celá obrazovka
      if (v.paused) v.play().catch(() => {});
      else v.pause();
      const now = Date.now();
      if (now - lastClick > 350) return (lastClick = now);
      lastClick = 0;
      const r = box.getBoundingClientRect();
      const side = e.clientX < r.left + r.width * 0.35 ? -1 : e.clientX > r.left + r.width * 0.65 ? 1 : 0;
      if (!side) return toggleFullscreen();
      v.currentTime = Math.max(0, Math.min(dur(), v.currentTime + side * 10));
      toast(side < 0 ? '⏪ −10 s' : '⏩ +10 s');
      ycShow();
    });
    // na mobile prekrýva ovládanie celé video – ťuknutie mimo tlačidiel ho skryje
    el.addEventListener('click', (e) => {
      if (e.target.closest('button,input,.yc-prog') || !(matchMedia('(hover: none)').matches || mobileUI())) return;
      touchTap(e);
    });
    box.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') ycShow(); });
    box.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !v.paused && menuEl.hidden && !dragging) box.classList.add('yc-idle'); });
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('button,input,.yc-prog')) ycShow(); });
    tick();
    ycSync();
    ycShow();
  }

  // ovládanie zmizne po chvíli bez pohybu (len keď video hrá)
  function ycShow() {
    const box = ycBox();
    if (!box) return;
    box.classList.remove('yc-idle');
    clearTimeout(ycIdleTimer);
    ycIdleTimer = setTimeout(() => {
      const menu = box.querySelector('.yc-menu');
      if (video && !video.paused && (!menu || menu.hidden) && !document.getElementById('ycs') && !box.querySelector('.yc-prog.drag')) box.classList.add('yc-idle');
    }, 3000);
  }

  function ycSync() {
    if (!yc$('.yc-play')) return;
    paintAirButtons();
    const v = video;
    for (const play of ycAll('.yc-play')) {
      setHTML(play, v.paused ? YC.play : YC.pause);
      play.title = v.paused ? 'Prehrať (k)' : 'Pozastaviť (k)';
    }
    setHTML(yc$('.yc-mute'), v.muted || v.volume === 0 ? YC.mute : YC.vol);
    yc$('.yc-vr').value = v.muted ? 0 : v.volume;
    for (const ap of ycAll('.yc-ap')) {
      ap.classList.toggle('on', !!data.autoplay);
      setHTML(ap.querySelector('i'), data.autoplay ? YC.apOn : YC.apOff);
      ap.title = `Automatické prehrávanie: ${data.autoplay ? 'zapnuté' : 'vypnuté'}`;
    }
    const sel = document.getElementById('cc');
    const hasCc = !!(current?.captions?.length && sel && sel.options.length > 1);
    for (const cc of ycAll('.yc-cc')) {
      cc.hidden = !hasCc;
      cc.classList.toggle('on', hasCc && sel.value !== 'off');
    }
    const th = yc$('.yc-th');
    if (th) th.hidden = !onWatch;
    for (const fs of ycAll('.yc-fs')) setHTML(fs, isFullscreen() ? YC.exitFull : YC.full);
    const prev = yc$('.ycm-prev');
    if (prev) prev.disabled = !ycPrevTarget();
    const next = yc$('.ycm-next');
    if (next) next.disabled = !(current && nextVideo(current.details.id));
  }

  // značky kapitol na lište priebehu
  function ycChapters() {
    const gaps = yc$('.yc-gaps');
    if (!gaps) return;
    const d = current?.details.length || video?.duration || 0;
    setHTML(gaps, d ? chapters.filter((c) => c.start > 0).map((c) => `<i class="yc-gap" style="left:${(c.start / d) * 100}%"></i>`).join('') : '');
  }

  function toggleCaptions() {
    const sel = document.getElementById('cc');
    if (!sel || sel.options.length < 2 || !current?.captions?.length) return;
    if (sel.value !== 'off') {
      sel.dataset.last = sel.value;
      sel.value = 'off';
    } else {
      const last = sel.dataset.last;
      sel.value = last && [...sel.options].some((o) => o.value === last) ? last : sel.options[1].value;
    }
    sel.dispatchEvent(new Event('change'));
    toast(sel.value === 'off' ? 'Titulky vypnuté' : `Titulky: ${sel.options[sel.selectedIndex].text}`);
  }

  // nastavenia: na PC ponuka nad lištou, na mobile spodný panel ako v YouTube appke
  function ycMenuOutside(e) {
    if (!e.target.closest('.yc-menu,.yc-set')) ycMenu(null);
  }
  function ycCloseSheet() {
    const sh = document.getElementById('ycs');
    if (!sh) return;
    sh.classList.remove('open');
    setTimeout(() => sh.remove(), 200);
  }
  function ycMenu(page) {
    const menu = yc$('.yc-menu');
    if (!menu) return;
    document.removeEventListener('click', ycMenuOutside, true);
    if (!page) {
      menu.hidden = true;
      ycCloseSheet();
      return ycShow();
    }
    const sheet = mobileUI();
    const v = video;
    const qs = document.getElementById('qs');
    const cc = document.getElementById('cc');
    const label = (sel) => (sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text : '');
    const speedName = (x) => (x === 1 ? 'Normálna' : `${x}×`);
    const row = (attrs, icon, name, val, arrow) => `<button class="yc-mi" ${attrs}>${icon ? `<i class="yc-ic">${icon}</i>` : ''}<span>${name}</span>${val != null ? `<em>${esc(val)}${arrow ? ' ›' : ''}</em>` : arrow ? '<em>›</em>' : ''}</button>`;
    let html = '';
    if (page === 'main') {
      if (qs && qs.options.length && !player?.audioOnly) html += row('data-go="quality"', YC.tune, 'Kvalita', label(qs), true);
      html += row('data-go="speed"', YC.speed, 'Rýchlosť prehrávania', speedName(v.playbackRate || 1), true);
      if (cc && cc.options.length > 1 && current?.captions?.length) html += row('data-go="cc"', YC.cc, 'Titulky', cc.value === 'off' ? 'Vypnuté' : label(cc), true);
      if (sheet) {
        html += row('data-act="lock"', YC.lock, 'Uzamknúť obrazovku');
        html += row('data-go="more"', YC.gear, 'Viac', null, true);
      } else {
        html += row('data-act="audio"', YC.headphones, 'Len zvuk (šetrí dáta)', player?.audioOnly ? 'Zap.' : 'Vyp.');
        if (pipSupported()) html += row('data-act="pip"', YC.pip, 'Obraz v obraze');
      }
    } else if (page === 'more') {
      html += `<button class="yc-mi yc-mh" data-go="main"><span>‹ Viac</span></button>`;
      html += row('data-act="audio"', YC.headphones, 'Len zvuk (šetrí dáta)', player?.audioOnly ? 'Zap.' : 'Vyp.');
      if (pipSupported()) html += row('data-act="pip"', YC.pip, 'Obraz v obraze');
      html += row('data-act="stable"', YC.vol, 'Stabilná hlasitosť', data.stableVol ? 'Zap.' : 'Vyp.');
      html += row('data-act="premium"', YC.gear, 'Prémiové ovládanie');
    } else {
      const sel = page === 'quality' ? qs : cc;
      const items = page === 'speed'
        ? SPEEDS.map((x) => [String(x), speedName(x), x === (v.playbackRate || 1)])
        : [...sel.options].map((o) => [o.value, page === 'cc' && o.value === 'off' ? 'Vypnuté' : o.text, o.value === sel.value]);
      const title = page === 'speed' ? 'Rýchlosť prehrávania' : page === 'quality' ? 'Kvalita' : 'Titulky';
      html += `<button class="yc-mi yc-mh" data-go="main"><span>‹ ${title}</span></button>`;
      html += items.map(([val, l, sel2]) => `<button class="yc-mi ${sel2 ? 'on' : 'pad'}" data-pick="${esc(val)}" data-page="${page}"><span>${esc(l)}</span></button>`).join('');
    }
    let target = menu;
    if (sheet) {
      menu.hidden = true;
      let sh = document.getElementById('ycs');
      if (!sh) {
        sh = document.createElement('div');
        sh.id = 'ycs';
        sh.className = 'ycs';
        setHTML(sh, '<div class="ycs-card"><div class="ycs-grab"></div><div class="ycs-body"></div></div>');
        (document.fullscreenElement || document.webkitFullscreenElement || document.body).append(sh);
        sh.addEventListener('click', (e) => { if (e.target === sh) ycMenu(null); });
        requestAnimationFrame(() => sh.classList.add('open'));
      }
      target = sh.querySelector('.ycs-body');
    }
    setHTML(target, html);
    if (!sheet) menu.hidden = false;
    clearTimeout(ycIdleTimer);
    target.onclick = (e) => {
      e.stopPropagation();
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.go) return ycMenu(b.dataset.go);
      const act = b.dataset.act;
      if (act) {
        ycMenu(null);
        if (act === 'audio') return setAudioOnly(!player?.audioOnly);
        if (act === 'pip') return togglePip();
        if (act === 'premium') return openPremium();
        if (act === 'stable') {
          data.stableVol = !data.stableVol;
          save();
          applyStableVolume();
          return toast(data.stableVol ? 'Stabilná hlasitosť zapnutá' : 'Stabilná hlasitosť vypnutá');
        }
        if (act === 'lock') {
          ycBox()?.classList.add('yc-locked');
          return toast('Obrazovka je uzamknutá – ťukni na 🔒');
        }
        return;
      }
      const pg = b.dataset.page;
      const val = b.dataset.pick;
      if (pg === 'speed') {
        v.playbackRate = +val;
        data.speed = +val;
        save();
      } else {
        const sel = pg === 'quality' ? qs : cc;
        if (sel.value !== val) {
          sel.value = val;
          sel.dispatchEvent(new Event('change'));
        }
      }
      ycMenu(null);
    };
    if (!sheet) setTimeout(() => document.addEventListener('click', ycMenuOutside, true));
  }

  const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function toggleFullscreen() {
    if (!video) return;
    const box = video.closest('.player');
    if (isFullscreen()) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    // iPhone nevie celú obrazovku pre prvok – vtedy natívny prehrávač
    if (box.requestFullscreen) box.requestFullscreen().then(() => screen.orientation?.lock?.('landscape').catch(() => {}), () => video.webkitEnterFullscreen?.());
    else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
    else video.webkitEnterFullscreen?.();
  }
  document.addEventListener('fullscreenchange', () => ycSync());
  document.addEventListener('webkitfullscreenchange', () => ycSync());

  // režim kino: video cez celú šírku, odporúčania pod ním
  function setTheater(on) {
    data.theater = on;
    save();
    const box = video?.closest('.player');
    const slot = document.getElementById('tslot');
    if (box && slot && !box.closest('.mini')) {
      if (on && !slot.contains(box)) slot.append(box);
      if (!on && slot.contains(box)) document.querySelector('.watch .info').before(box);
    }
    ycSync();
  }

  // ================= mini prehrávač =================
  let miniActive = false;
  function miniEl() {
    let el = document.getElementById('mini');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mini';
      el.className = 'mini';
      el.hidden = true;
      setHTML(el, `<div class="mini-slot"></div><div class="mini-bar"><span class="mini-title"></span><button class="mini-b" id="mini-open" title="Zväčšiť">⤢</button><button class="mini-b" id="mini-close" title="Zavrieť">✕</button></div>`);
      document.body.append(el);
      el.querySelector('#mini-open').onclick = () => { if (current) location.hash = `#v=${current.details.id}`; };
      el.querySelector('#mini-close').onclick = () => closeMini();
    }
    return el;
  }
  // presunie bežiace video do rohu (v tom istom kroku, takže sa nepreruší)
  function dock() {
    const playerBox = video?.closest('.player');
    if (!playerBox || !current) return false;
    const el = miniEl();
    el.querySelector('.mini-slot').append(playerBox);
    el.querySelector('.mini-title').textContent = current.details.title;
    el.hidden = false;
    miniActive = true;
    return true;
  }
  function closeMini() {
    miniActive = false;
    const el = document.getElementById('mini');
    if (el) {
      el.hidden = true;
      setHTML(el.querySelector('.mini-slot'), '');
    }
    stopPlayer();
  }

  // panel fronty / playlistu nad odporúčanými
  function renderQueuePanel() {
    const box = document.getElementById('qpanel');
    if (!box) return;
    if (!queue?.items.length) return setHTML(box, '');
    const curId = new URLSearchParams(location.hash.slice(1)).get('v');
    const i = queueIndex(curId);
    setHTML(box, `<div class="qbox">
      <div class="qhead"><div><b>${esc(queue.title)}</b><div class="mt">${i >= 0 ? i + 1 : '–'} / ${queue.items.length}${queue.cont ? '+' : ''}</div></div><button class="mini-b" id="q-close" title="Zavrieť ${queue.listId ? 'playlist' : 'frontu'}">✕</button></div>
      <div class="qlist" id="qlist">${queue.items.map((v, k) => card(v, watchHref(v)).replace('class="card"', `class="card${k === i ? ' qon' : ''}"`)).join('')}</div>
    </div>`);
    document.getElementById('q-close').onclick = () => { queue = null; renderQueuePanel(); };
    const list = document.getElementById('qlist');
    const on = list.querySelector('.qon');
    if (on) list.scrollTop = on.offsetTop - list.offsetTop - 8;
  }

  // ================= stránka prehrávania =================
  async function renderWatch(app, id, t) {
    const resuming = miniActive && current?.details.id === id && video;
    if (!resuming && miniActive) closeMini();
    if (!resuming) stopPlayer();
    onWatch = true;
    scrollTo(0, 0);
    const known = seen.get(id) || data.history.find((v) => v.id === id) || { id, title: '' };
    related = [];
    chapters = [];
    setHTML(app, `<div class="watch">
      <div class="tslot" id="tslot"></div>
      <div>
        <div class="player" id="pslot"><video id="vid" playsinline controlslist="nodownload" poster="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg"></video><div class="msg" id="msg"><div class="spin"></div></div></div>
        <div class="info">
          <h1 class="wt" id="wt">${esc(known.title)}</h1>
          <div class="wmeta mt" id="wmeta"></div>
          <div class="cur-chap" id="cur-chap"></div>
          <div class="wrow">
            <div class="owner">
              <span class="ow-av" id="ow-av">${known.avatar ? `<img src="${esc(known.avatar)}" alt="">` : '<i></i>'}</span>
              <span class="ow-txt"><span id="wm">${chLink(known.channel || '', known.channelId)}</span><span class="mt" id="ow-subs"></span></span>
              <button class="pill pill-w sub-btn" id="sub-btn" hidden>Odoberať</button>
            </div>
            <div class="acts wacts">
              <span class="vote"><button class="pill vote-l" id="like-btn" title="Páči sa mi">👍 <span id="like-n"></span></button><button class="pill vote-d" id="dislike-btn" title="Nepáči sa mi">👎 <span id="dislike-n"></span></button></span>
              <button class="pill" id="share-btn">↗ Zdieľať</button>
              <button class="pill" id="album-btn" title="Uložiť do albumu">🔖 Uložiť</button>
              <button class="pill" id="dl-quick">⬇ Stiahnuť</button>
              <select class="pill" id="cc" aria-label="Titulky" hidden></select>
              <select class="pill" id="qs" aria-label="Kvalita"></select>
              <span class="more"><button class="pill" id="more-btn" aria-label="Ďalšie možnosti" title="Ďalšie možnosti">⋯</button><div class="menu more-menu" id="more-menu" hidden></div></span>
            </div>
          </div>
          <div class="desc" id="desc"><div class="desc-head" id="desc-head"></div><div id="desc-body"></div></div>
          <div class="chapters" id="chapters" hidden></div>
        </div>
      </div>
      <div class="side">
        <div id="qpanel"></div>
        <div class="side-head"><div class="chips-row rel-chips" id="rel-chips"></div><label class="ap" title="Po skončení pustiť ďalšie video"><input type="checkbox" id="ap"${data.autoplay ? ' checked' : ''}> Auto</label></div>
        <div id="rel"><div class="spin" style="margin:24px auto"></div></div>
      </div>
    </div>`);
    document.getElementById('ap').onchange = (e) => { data.autoplay = e.target.checked; save(); ycSync(); };
    const videoForSave = () => (current?.details.id === id ? { ...known, id, title: current.details.title, channel: current.details.channel, channelId: current.details.channelId, duration: known.duration || fmt(current.details.length) } : seen.get(id) || known);
    document.getElementById('album-btn').onclick = () => openAlbumPicker(videoForSave());
    document.getElementById('share-btn').onclick = () => {
      const t0 = Math.floor(video?.currentTime || 0);
      const url = `https://youtu.be/${id}${t0 > 5 ? `?t=${t0}` : ''}`;
      if (navigator.share && matchMedia('(hover: none)').matches) return navigator.share({ title: current?.details.title || '', url }).catch(() => {});
      navigator.clipboard?.writeText(url).then(() => toast('Odkaz skopírovaný'), () => prompt('Odkaz na video:', url));
    };
    document.getElementById('dl-quick').onclick = () => {
      if (!current) return toast('Video sa ešte načítava');
      const vf = current.videos.find((x) => String(x.itag) === document.getElementById('qs').value) || pickVideo(current);
      downloadVideo(current, vf, false);
    };
    setupVotes(id, t);
    if (watchStack[watchStack.length - 1] !== id) watchStack.push(id);
    if (watchStack.length > 50) watchStack.shift();
    if (!resuming) watchMeta = { likes: '', liked: false, saved: false };

    // playlist z adresy (&list=…) → fronta; video mimo playlistu playlistovú frontu zruší
    const listParam = new URLSearchParams(location.hash.slice(1)).get('list');
    if (!listParam && queue?.listId && queueIndex(id) < 0) queue = null;
    if (listParam && queue?.listId !== listParam) {
      getPlaylist(listParam)
        .then((pl) => {
          if (t !== token || !pl.items.length) return;
          queue = { title: pl.title, listId: pl.id, items: pl.items, cont: pl.cont };
          renderQueuePanel();
          topUpQueue(id);
        })
        .catch(() => {});
    }
    renderQueuePanel();
    topUpQueue(id);

    // 👍 / 👎 počty (Return YouTube Dislike)
    getDislikes(id).then((r) => {
      if (!r || t !== token) return;
      const ln = document.getElementById('like-n');
      const dn = document.getElementById('dislike-n');
      if (ln && !ln.textContent) ln.textContent = compact(r.likes);
      if (dn) dn.textContent = compact(r.dislikes);
    });

    if (resuming) {
      // video z mini prehrávača vrátime späť na veľké miesto – hrá ďalej bez prerušenia
      document.getElementById('pslot').replaceWith(video.closest('.player'));
      miniActive = false;
      miniEl().hidden = true;
    } else {
      video = document.getElementById('vid');
      video.addEventListener('waiting', () => msg('<div class="spin"></div>'));
      video.addEventListener('playing', () => msg(''));
      video.addEventListener('ended', () => { savePos(); playNextSoon(); });
      video.addEventListener('timeupdate', markChapter);
      // zapamätaná rýchlosť a stabilná hlasitosť
      video.defaultPlaybackRate = data.speed || 1;
      video.playbackRate = data.speed || 1;
      video.addEventListener('playing', applyStableVolume);
      // hlásenia o pozeraní pre YouTube históriu (len s účtom)
      video.addEventListener('timeupdate', () => trackTick());
      video.addEventListener('pause', () => trackTick('paused'));
      setupBackgroundPlay(video);
      setupControls(video);
    }
    if (data.theater) setTheater(true);
    ycSync();
    ycChapters();

    // odporúčania, kapitoly, kanál a zhliadnutia sa načítavajú súbežne s videom
    getRelated(id)
      .then(({ items, liked, chapters: chs, likes, owner, info }) => {
        if (t !== token) return;
        related = items;
        watchMeta.likes = likes;
        watchMeta.liked = liked;
        renderRelated(items, current?.details.channelId || known.channelId || owner?.id, current?.details.channel || known.channel || owner?.title, id);
        if (liked) document.getElementById('like-btn')?.classList.add('on');
        if (likes) document.getElementById('like-n').textContent = likes;
        if (chs.length) renderChapters(chs);
        if (owner) {
          if (owner.avatar) setHTML(document.getElementById('ow-av'), `<img src="${esc(owner.avatar)}" alt="">`);
          document.getElementById('ow-subs').textContent = owner.subs;
          watchMeta.subscribed = owner.subscribed;
          if (current?.details.id === id) setupSubscribe({ id: current.details.channelId, title: current.details.channel, avatar: owner.avatar });
        }
        if (info) {
          setHTML(document.getElementById('desc-head'), `${esc(info.views)} &nbsp;${esc(info.date)}`);
          document.getElementById('wmeta').textContent = [info.views, info.date].filter(Boolean).join(' · ');
        }
        ycSync();
      })
      .catch((e) => {
        if (t !== token) return;
        // náhradou ukážeme ostatné výsledky hľadania
        related = lastResults.items.filter((v) => v.id !== id);
        setHTML(document.getElementById('rel'), related.length ? related.map(card).join('') : `<p class="mt err">${esc(e.message)}</p>`);
      });

    if (!MS) return msg('<div class="err">Tento prehliadač nevie skladať video.<br>Na iPhone treba iOS 17.1 alebo novší.</div>');
    try {
      const s = resuming ? current : await getStreamsCached(id);
      if (t !== token) return;
      current = s;
      updateMediaSession(s.details);
      document.title = `${s.details.title} – JUTUBE`;
      document.getElementById('wt').textContent = s.details.title;
      setHTML(document.getElementById('wm'), chLink(s.details.channel, s.details.channelId));
      if (!document.getElementById('desc-head').textContent && s.details.views) document.getElementById('desc-head').textContent = `${s.details.views} zhliadnutí`;
      setupSubscribe({ id: s.details.channelId, title: s.details.channel, avatar: known.avatar || '' });
      renderDescription(s);
      if (!chapters.length) renderChapters(chaptersFromDescription(s.details.description));
      setupQuality(s);
      setupMoreMenu(s);
      prepareCast(s);
      paintAirButtons();
      if (resuming) {
        // kvalitu a titulky ukáž podľa toho, čo už beží
        if (player?.vf) document.getElementById('qs').value = String(player.vf.itag);
        setupCaptions(s, false); // titulky už bežia – len nastav výber
        return;
      }
      setupCaptions(s);
      addHistory({ ...known, id, title: s.details.title, channel: s.details.channel, channelId: s.details.channelId || known.channelId, duration: known.duration || fmt(s.details.length) });
      const saved = data.pos[id];
      // čas z odkazu (&t=90) má prednosť pred miestom, kde si naposledy skončil
      const tParam = parseInt(new URLSearchParams(location.hash.slice(1)).get('t') || '', 10);
      const start = tParam > 0 ? tParam : saved && saved.p > 10 && saved.p < saved.d - 15 ? saved.p : 0;
      player = new Player(video, s, pickVideo(s), start, true);
      posTimer = setInterval(savePos, 5000);
      startTracking(id, s.details.length);
    } catch (e) {
      if (t !== token) return;
      // nedostupné video: vysvetlenie + odkaz na pôvodný YouTube (&jt=0 = bez presmerovania späť sem)
      const yt = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&jt=0`;
      const next = queueIndex(id) >= 0 ? nextVideo(id) : null;
      msg(`<div class="unavail"><div class="err">${esc(e.message)}</div>
        <div class="acts"><a class="pill pill-w" href="${yt}" target="_blank" rel="noopener">▶ Otvoriť na YouTube</a>${next ? '<button class="pill" id="un-next">⏭ Ďalšie video</button>' : ''}</div>
        ${next ? '<div class="mt" id="un-left"></div>' : ''}</div>`);
      if (!next) return;
      const go = () => { clearInterval(nextTimer); if (t === token) location.hash = watchHref(next); };
      document.getElementById('un-next').onclick = go;
      // vo fronte / playliste automaticky preskoč, nech sa prehrávanie nezasekne
      if (!data.autoplay) return;
      let left = 5;
      const paint = () => { const el = document.getElementById('un-left'); if (el) el.textContent = `Preskakujem na ďalšie o ${left} s…`; };
      paint();
      clearInterval(nextTimer);
      nextTimer = setInterval(() => {
        if (t !== token) return clearInterval(nextTimer);
        if (--left <= 0) return go();
        paint();
      }, 1000);
    }
  }


  let toastTimer = null;
  function toast(text) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.append(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  // po skončení videa: o 5 s pusti prvé odporúčané, ktoré si ešte nevidel
  function playNextSoon() {
    // v mini prehrávači ďalšie video automaticky nepúšťame
    if (!data.autoplay || !onWatch || miniActive) return;
    const t = token;
    // najprv fronta / playlist, potom odporúčané
    const next = nextVideo(current?.details.id);
    if (!next) return;
    const fromQueue = queueIndex(next.id) >= 0;
    let left = 5;
    const paint = () => msg(`<div class="nextup"><div class="mt">${fromQueue ? `Ďalšie z „${esc(queue.title)}“` : 'Ďalšie video'} o ${left} s</div><div class="nt">${esc(next.title)}</div>
      <div><button class="pill" id="nx-cancel">Zrušiť</button> <button class="pill pill-w" id="nx-go">Prehrať</button></div></div>`);
    const go = () => { clearInterval(nextTimer); location.hash = watchHref(next); };
    // pri zamknutej obrazovke nik odpočet nevidí – pusti ďalšie hneď, kým systém dovolí prehrávať
    if (document.hidden && data.bgPlay !== false) return go();
    const bind = () => {
      document.getElementById('nx-go').onclick = go;
      document.getElementById('nx-cancel').onclick = () => { clearInterval(nextTimer); msg(''); };
    };
    paint();
    bind();
    clearInterval(nextTimer);
    nextTimer = setInterval(() => {
      if (t !== token) return clearInterval(nextTimer);
      if (--left <= 0) return go();
      paint();
      bind();
    }, 1000);
  }

  function fmt(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = String(sec % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  // „kvalita“ = kratšia strana obrazu (Shorts na výšku majú výšku 1920, ale sú 1080p)
  function qh(f) {
    return Math.min(f.width || f.height, f.height);
  }

  function pickVideo(s) {
    return s.videos.find((v) => qh(v) <= (data.quality || 1080)) || s.videos[s.videos.length - 1];
  }

  function setupQuality(s) {
    const sel = document.getElementById('qs');
    setHTML(sel, s.videos.map((v) => `<option value="${v.itag}">${qh(v)}p${v.fps > 30 ? v.fps : ''}</option>`).join(''));
    sel.value = String(pickVideo(s).itag);
    sel.onchange = () => {
      const vf = s.videos.find((x) => x.itag === +sel.value);
      data.quality = qh(vf);
      save();
      const at = video.currentTime;
      const wasPlaying = !video.paused;
      player?.destroy();
      msg('<div class="spin"></div>');
      player = new Player(video, s, vf, at, wasPlaying);
    };
  }

  function showBigPlay() {
    msg(`<button class="bigplay" id="bp" aria-label="Prehrať">${ICON_PLAY}</button>`);
    document.getElementById('bp').onclick = () => {
      msg('');
      video?.play().catch(() => {});
    };
  }

  // ================= prehrávanie na pozadí / pri zamknutej obrazovke =================
  // Media Session = názov, náhľad a tlačidlá na zamknutej obrazovke a v notifikácii.
  // Niektoré prehliadače (hlavne Safari na iPhone) video pri zamknutí samy pauznú –
  // takú „systémovú“ pauzu hneď po skrytí stránky zrušíme a hráme ďalej.
  let hiddenAt = 0;
  let lastPauseAt = 0;
  let userPausedAt = 0; // pauza z tlačidla na zamknutej obrazovke = naozajstná pauza
  let wasPlayingWhenHidden = false;
  const bgOn = () => data.bgPlay !== false;
  const resumeBg = () => {
    const v = video;
    if (!v || !bgOn() || v.ended || !v.paused || casting()) return;
    if (Date.now() - userPausedAt < 3000) return;
    v.play().catch(() => {});
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !video) return;
    hiddenAt = Date.now();
    // pauza mohla prísť tesne pred skrytím stránky (iPhone) – vtedy video ešte „hralo“
    wasPlayingWhenHidden = !video.paused || Date.now() - lastPauseAt < 1000;
    if (!wasPlayingWhenHidden) return;
    resumeBg();
    // niektoré prehliadače pauznú až chvíľu po skrytí
    for (const ms of [300, 1000, 2500]) setTimeout(() => { if (document.hidden && wasPlayingWhenHidden) resumeBg(); }, ms);
  });

  function setupBackgroundPlay(v) {
    v.addEventListener('pause', () => {
      if (v !== video) return;
      lastPauseAt = Date.now();
      // systémová pauza krátko po zamknutí → pokračuj
      if (document.hidden && wasPlayingWhenHidden && Date.now() - hiddenAt < 3000) setTimeout(resumeBg, 50);
    });
    const pos = () => {
      if (v !== video || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
      if (!v.duration || !isFinite(v.duration)) return;
      try { navigator.mediaSession.setPositionState({ duration: v.duration, playbackRate: v.playbackRate || 1, position: Math.min(v.currentTime, v.duration) }); } catch {}
    };
    v.addEventListener('loadedmetadata', pos);
    v.addEventListener('durationchange', pos);
    v.addEventListener('ratechange', pos);
    v.addEventListener('seeked', pos);
    v.addEventListener('play', () => { if (v === video && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; pos(); });
    v.addEventListener('pause', () => { if (v === video && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
  }

  function updateMediaSession(d) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: d.title || '',
      artist: d.channel || '',
      album: 'JUTUBE',
      artwork: [
        { src: `https://i.ytimg.com/vi/${d.id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
        { src: `https://i.ytimg.com/vi/${d.id}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
        { src: `https://i.ytimg.com/vi/${d.id}/maxresdefault.jpg`, sizes: '1280x720', type: 'image/jpeg' },
      ],
    });
    if (ms.__jutube) return;
    ms.__jutube = true;
    const set = (action, fn) => { try { ms.setActionHandler(action, fn); } catch {} };
    set('play', () => { userPausedAt = 0; video?.play().catch(() => {}); });
    set('pause', () => { userPausedAt = Date.now(); wasPlayingWhenHidden = false; video?.pause(); });
    set('stop', () => { userPausedAt = Date.now(); wasPlayingWhenHidden = false; video?.pause(); });
    set('seekbackward', (e) => { if (video) video.currentTime = Math.max(0, video.currentTime - (e.seekOffset || 10)); });
    set('seekforward', (e) => { if (video) video.currentTime = Math.min(video.duration || 1e9, video.currentTime + (e.seekOffset || 10)); });
    set('seekto', (e) => {
      if (!video || e.seekTime == null) return;
      if (e.fastSeek && video.fastSeek) video.fastSeek(e.seekTime);
      else video.currentTime = e.seekTime;
    });
    set('previoustrack', () => ycGoPrev());
    set('nexttrack', () => ycGoNext());
  }

  // klávesové skratky na PC
  document.addEventListener('keydown', (e) => {
    if (!video || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'k' || (k === ' ' && e.target !== video)) { e.preventDefault(); video.paused ? video.play() : video.pause(); }
    else if (k === 'j') video.currentTime -= 10;
    else if (k === 'l') video.currentTime += 10;
    else if (k === 'f') toggleFullscreen();
    else if (k === 'm') { video.muted = !video.muted; ycSync(); }
    else if (k === 'c') toggleCaptions();
    else if (k === 't' && onWatch) setTheater(!data.theater);
    else if (k === 'arrowleft' && e.target !== video) { e.preventDefault(); video.currentTime -= 5; ycShow(); }
    else if (k === 'arrowright' && e.target !== video) { e.preventDefault(); video.currentTime += 5; ycShow(); }
    else if (k === 'i') togglePip();
  });
  addEventListener('pagehide', savePos);

  // ================= štart =================
  // Počkáme, kým prehliadač dočíta robots.txt – inak by naše rozhranie prepísal svojím zobrazením textu.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
