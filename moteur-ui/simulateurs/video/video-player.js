/**
 * VideoPlayer - Moteur d'abstraction vidéo (YouTube Iframe API, Vimeo & HTML5 natif)
 * Vimeo : dialogue direct avec le lecteur par postMessage, sans script externe.
 * Neutralise l'Erreur 153 YouTube via handshake d'origin et referrerpolicy.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  let player = null;
  let isYouTube = true;
  let isLocalVideo = false;
  let isVimeo = false;
  let vimeoFrame = null;
  let vimeoReady = false;
  let vimeoQueue = [];
  let vimeoTime = 0;
  let vimeoDuration = 0;
  const VIMEO_ORIGIN = 'https://player.vimeo.com';
  let timelineTimer = null;
  let fallbackDuration = 180;
  let onSeek = function() {};
  let playing = false;

  function getYoutubeId(url) {
    if (!url) return null;
    const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (m && m[2].length === 11) ? m[2] : null;
  }

  /** Identifiant (et clé des vidéos non répertoriées) d'un lien Vimeo, sinon null. */
  function getVimeoInfo(url) {
    if (!url) return null;
    const m = String(url).match(/vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|album\/\d+\/video\/|showcase\/\d+\/video\/)?(\d{6,12})(?:\/([0-9a-f]{6,20}))?/i);
    if (!m) return null;
    const h = (String(url).match(/[?&]h=([0-9a-f]{6,20})/i) || [])[1] || m[2] || '';
    return { id: m[1], hash: h };
  }

  function vimeoPost(method, value) {
    const msg = value === undefined ? { method: method } : { method: method, value: value };
    if (!vimeoReady || !vimeoFrame || !vimeoFrame.contentWindow) {
      vimeoQueue.push(msg);
      return;
    }
    vimeoFrame.contentWindow.postMessage(JSON.stringify(msg), VIMEO_ORIGIN);
  }

  function initVimeo(info, containerId, onReady, onTimeUpdate, onPlayStateChange, onError) {
    const target = document.getElementById(containerId);
    if (!target) return;
    const params = new URLSearchParams({
      controls: '0', dnt: '1', title: '0', byline: '0', portrait: '0',
      playsinline: '1', keyboard: '0', pip: '0'
    });
    if (info.hash) params.set('h', info.hash);
    vimeoFrame = document.createElement('iframe');
    vimeoFrame.src = VIMEO_ORIGIN + '/video/' + info.id + '?' + params.toString();
    vimeoFrame.title = 'Lecteur vidéo Vimeo';
    vimeoFrame.allow = 'autoplay; fullscreen; picture-in-picture';
    vimeoFrame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    vimeoFrame.style.cssText = 'width:100%; height:100%; border:0; display:block;';
    target.replaceWith(vimeoFrame);
    vimeoFrame.id = containerId;

    window.addEventListener('message', (ev) => {
      if (ev.origin !== VIMEO_ORIGIN || !vimeoFrame || ev.source !== vimeoFrame.contentWindow) return;
      let data = ev.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return; }
      }
      if (!data) return;
      if (data.event === 'ready') {
        vimeoReady = true;
        ['timeupdate', 'play', 'pause', 'ended', 'error'].forEach(evt => vimeoPost('addEventListener', evt));
        const file = vimeoQueue.splice(0);
        file.forEach(m => vimeoFrame.contentWindow.postMessage(JSON.stringify(m), VIMEO_ORIGIN));
        vimeoPost('getDuration');
      } else if (data.method === 'getDuration') {
        vimeoDuration = Number(data.value) || fallbackDuration;
        onReady(vimeoDuration);
      } else if (data.event === 'timeupdate' && data.data) {
        vimeoTime = Number(data.data.seconds) || 0;
        if (data.data.duration) vimeoDuration = Number(data.data.duration);
        onTimeUpdate(vimeoTime, vimeoDuration || fallbackDuration);
      } else if (data.event === 'play') {
        playing = true; onPlayStateChange(true);
      } else if (data.event === 'pause' || data.event === 'ended') {
        playing = false; onPlayStateChange(false);
      } else if (data.event === 'error') {
        console.warn('Vimeo Player Error:', data.data);
        onError('vimeo');
      }
    });
  }

  function init(options) {
    options = options || {};
    const url = options.url || 'https://www.youtube.com/watch?v=L5nD3HP8XBQ';
    const containerId = options.containerId || 'videoPlayerTarget';
    fallbackDuration = options.duration || 180;
    const onReady = options.onReady || function() {};
    const onTimeUpdate = options.onTimeUpdate || function() {};
    const onError = options.onError || function() {};
    const onPlayStateChange = options.onPlayStateChange || function() {};
    onSeek = options.onSeek || onSeek;

    const ytId = getYoutubeId(url);
    const vimeoInfo = ytId ? null : getVimeoInfo(url);

    if (vimeoInfo) {
      isYouTube = false;
      isLocalVideo = false;
      isVimeo = true;
      initVimeo(vimeoInfo, containerId, onReady, onTimeUpdate, onPlayStateChange, onError);
    } else if (ytId) {
      isYouTube = true;
      isLocalVideo = false;

      // Origin handshake pour neutraliser l'Erreur 153 YouTube
      const safeOrigin = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null')
        ? 'https://www.youtube.com'
        : window.location.origin;

      const createPlayer = () => {
        if (!window.YT || !window.YT.Player) return;
        player = new window.YT.Player(containerId, {
          height: '100%',
          width: '100%',
          videoId: ytId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            'playsinline': 1,
            'controls': 0,
            'fs': 0,
            'disablekb': 1,
            'iv_load_policy': 3,
            'rel': 0,
            'modestbranding': 1,
            'enablejsapi': 1,
            'origin': safeOrigin
          },
          events: {
            'onReady': (e) => {
              try {
                const iframe = e.target.getIframe();
                if (iframe) {
                  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                }
              } catch (err) {}

              const dur = (player && player.getDuration) ? player.getDuration() : fallbackDuration;
              onReady(dur || fallbackDuration);
            },
            'onStateChange': (e) => {
              playing = (e.data === window.YT.PlayerState.PLAYING);
              onPlayStateChange(playing);
              if (e.data === window.YT.PlayerState.PLAYING) {
                if (timelineTimer) clearInterval(timelineTimer);
                timelineTimer = setInterval(() => {
                  if (player && player.getCurrentTime) {
                    onTimeUpdate(player.getCurrentTime(), player.getDuration() || fallbackDuration);
                  }
                }, 250);
              } else {
                if (timelineTimer) clearInterval(timelineTimer);
              }
            },
            'onError': (e) => {
              console.warn('YouTube Player Error code:', e.data);
              onError(e.data);
            }
          }
        });
      };

      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        window.onYouTubeIframeAPIReady = createPlayer;
      }
    } else {
      isYouTube = false;
      isLocalVideo = true;
      const target = document.getElementById(containerId);
      if (target) {
        target.innerHTML = `
          <video id="nativeVideo" style="width:100%; height:100%; object-fit:contain;">
            <source src="${url || './video.mp4'}" type="video/mp4">
            Votre navigateur ne supporte pas la balise vidéo.
          </video>
        `;
        const video = document.getElementById('nativeVideo');
        if (video) {
          video.addEventListener('loadedmetadata', () => {
            onReady(video.duration || fallbackDuration);
          });
          video.addEventListener('timeupdate', () => {
            onTimeUpdate(video.currentTime, video.duration || fallbackDuration);
          });
          video.addEventListener('play', () => { playing = true; onPlayStateChange(true); });
          video.addEventListener('pause', () => { playing = false; onPlayStateChange(false); });
        }
      }
    }
  }

  function getDuration() {
    if (isYouTube && player && player.getDuration) return player.getDuration();
    if (isVimeo) return vimeoDuration || fallbackDuration;
    if (isLocalVideo) {
      const v = document.getElementById('nativeVideo');
      if (v) return v.duration;
    }
    return fallbackDuration;
  }

  function getCurrentTime() {
    if (isYouTube && player && player.getCurrentTime) {
      try {
        return player.getCurrentTime() || 0;
      } catch (e) {
        return 0;
      }
    }
    if (isVimeo) return vimeoTime;
    if (isLocalVideo) {
      const v = document.getElementById('nativeVideo');
      if (v) return v.currentTime || 0;
    }
    const slider = document.getElementById('videoTimelineRange');
    if (slider) return parseFloat(slider.value) || 0;
    return 0;
  }

  function play() {
    if (isYouTube && player && player.playVideo) player.playVideo();
    else if (isVimeo) vimeoPost('play');
    else if (isLocalVideo) {
      const v = document.getElementById('nativeVideo');
      if (v) v.play();
    }
  }

  function pause() {
    if (isYouTube && player && player.pauseVideo) player.pauseVideo();
    else if (isVimeo) vimeoPost('pause');
    else if (isLocalVideo) {
      const v = document.getElementById('nativeVideo');
      if (v) v.pause();
    }
  }

  function seekTo(sec) {
    if (isYouTube && player && player.seekTo) player.seekTo(sec, true);
    else if (isVimeo) { vimeoTime = sec; vimeoPost('setCurrentTime', sec); }
    else if (isLocalVideo) {
      const v = document.getElementById('nativeVideo');
      if (v) v.currentTime = sec;
    }
    onSeek(sec);
  }

  function isPlaying() {
    return playing;
  }

  function setMuted(muted) {
    if (isYouTube && player && player.mute) {
      if (muted) player.mute();
      else player.unMute();
    } else if (isVimeo) {
      vimeoPost('setMuted', !!muted);
    } else if (isLocalVideo) {
      const v = document.getElementById('nativeVideo');
      if (v) v.muted = muted;
    }
  }

  function setPlaybackRate(rate) {
    if (isYouTube && player && player.setPlaybackRate) player.setPlaybackRate(rate);
    else if (isVimeo) vimeoPost('setPlaybackRate', rate);
    else if (isLocalVideo) {
      const v = document.getElementById('nativeVideo');
      if (v) v.playbackRate = rate;
    }
  }

  // Sous-titres français de YouTube ou de Vimeo : sans objet pour une vidéo locale
  function supportsCaptions() {
    return isYouTube || isVimeo;
  }

  function setCaptions(enabled) {
    if (isVimeo) {
      if (enabled) vimeoPost('enableTextTrack', { language: 'fr' });
      else vimeoPost('disableTextTrack');
      return;
    }
    if (!isYouTube || !player || !player.loadModule) return;
    if (enabled) {
      player.loadModule('captions');
      player.setOption('captions', 'track', { languageCode: 'fr' });
    } else {
      player.unloadModule('captions');
    }
  }

  window.VideoPlayer = {
    init: init,
    getYoutubeId: getYoutubeId,
    getVimeoInfo: getVimeoInfo,
    getDuration: getDuration,
    getCurrentTime: getCurrentTime,
    play: play,
    pause: pause,
    seekTo: seekTo,
    isPlaying: isPlaying,
    setMuted: setMuted,
    setPlaybackRate: setPlaybackRate,
    supportsCaptions: supportsCaptions,
    setCaptions: setCaptions
  };

  // Alias globaux pour rétrocompatibilité
  window.getYoutubeId = getYoutubeId;
  window.getDuration = getDuration;
  window.getCurrentTime = getCurrentTime;
  window.playVideo = play;
  window.pauseVideo = pause;
  window.seekTo = seekTo;

})();
