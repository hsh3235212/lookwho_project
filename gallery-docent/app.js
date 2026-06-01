/**
 * ==========================================================================
 * LOOKWHO: Immersive Exhibition Interaction - Primary Control Script
 * 청각 노화 상인 체험 시네마틱 오프닝 + Market HUD 인터페이스
 * ==========================================================================
 */

const exhibitState = {
  currentScreen: 'start',
  introTimers: [],
};

const dom = {};


function initDomReferences() {
  dom.startScreen = document.getElementById('startScreen');
  dom.introScreen = document.getElementById('introScreen');
  dom.logoScreen = document.getElementById('logoScreen');
  dom.roleScreen = document.getElementById('roleScreen');
  dom.marketHudScreen = document.getElementById('marketHudScreen');

  dom.startBtn = document.getElementById('startBtn');
  dom.resetAllBtn = document.getElementById('resetAllBtn');
  if (dom.resetAllBtn && document.querySelector('#startScreen.active')) {
    dom.resetAllBtn.style.display = 'none';
  }
  
  dom.introVideo = document.getElementById('introVideo');
  dom.introCaptionText = document.getElementById('introCaptionText');
  dom.skipIntroBtn = document.getElementById('skipIntroBtn');

  dom.marketAmbienceAudio = document.getElementById('marketAmbienceAudio');
}

function switchScreen(screenName) {
  const current = document.querySelector('.exhibit-section.active');
  const next = dom[screenName + 'Screen'];

  console.log(`[LOOKWHO] switchScreen target: ${screenName}, next element:`, next);
  if (next === null) {
    console.error(`[LOOKWHO] ERROR: dom.${screenName}Screen is null! Make sure the ID exists in HTML and is registered in initDomReferences().`);
  }

  if (!next || current === next) return;

  next.classList.add('prepare');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.add('active');
      next.classList.remove('prepare');

      if (current) {
        current.classList.remove('active');
      }
    });
  });

  exhibitState.currentScreen = screenName;
  console.log(`[LOOKWHO] Screen switched smoothly: ${screenName}`);

  if (dom.resetAllBtn) {
    dom.resetAllBtn.style.display = (screenName === 'start') ? 'none' : 'flex';
  }

  onScreenEnter(screenName);
}

function onScreenEnter(screenName) {
  if (exhibitState.introTimers && exhibitState.introTimers.length > 0) {
    exhibitState.introTimers.forEach(timer => clearTimeout(timer));
    exhibitState.introTimers = [];
  }

  switch (screenName) {
    case 'intro':
      runIntroTimeline();
      break;
    case 'logo':
      runLogoTimeline();
      break;
    case 'role':
      runRoleTimeline();
      break;
    case 'marketHud':
      marketHudStart();
      break;
  }
}

function runIntroTimeline() {
  if (dom.introVideo) {
    // 비디오는 바로 투명도 1로 설정해두고, 그 위를 덮고 있는 시작화면이 페이드아웃 되면서 자연스럽게 나타나게 함
    dom.introVideo.style.transition = 'none';
    dom.introVideo.style.opacity = '1';

    dom.introVideo.play().then(() => {
      dom.introVideo.muted = false;
      dom.introVideo.volume = 0;
      
      dom.introVideo.addEventListener('ended', () => {
        // 영상 자체의 투명도를 낮추면 브라우저 블렌딩으로 인해 회색(Milky)으로 튀는 현상이 발생합니다.
        // 따라서 skipIntro와 동일하게 블랙 오버레이(::after)를 덮어서 완벽한 암전을 만듭니다.
        if (dom.introScreen) {
          dom.introScreen.classList.add('cinematic-fade-out');
        }
        
        // 블랙 화면 상태를 2초 유지한 뒤 로고 스크린으로 전환
        setTimeout(() => {
          switchScreen('logo');
          
          // 로고 화면으로 전환된 후, 다음 재생을 위해 덮어두었던 블랙 오버레이 클래스 제거
          setTimeout(() => {
            if (dom.introScreen) dom.introScreen.classList.remove('cinematic-fade-out');
          }, 500);
        }, 2000);
      }, { once: true });

      const fadeDuration = 2200;
      const fadeStart = performance.now();
      function fadeAudio(time) {
        const elapsed = time - fadeStart;
        const progress = Math.min(1, elapsed / fadeDuration);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        dom.introVideo.volume = Math.max(0, easeProgress);
        if (progress < 1) {
          requestAnimationFrame(fadeAudio);
        }
      }
      requestAnimationFrame(fadeAudio);
    }).catch(e => {
      console.log("인트로 영상 로드/재생 실패, logo로 넘어갑니다.", e);
      switchScreen('logo');
    });
  } else {
    switchScreen('logo');
  }
}

function skipIntro() {
  const introScreen = dom.introScreen;
  if (introScreen) {
    introScreen.classList.add('cinematic-fade-out');
  }

  if (dom.introVideo) {
    let vol = dom.introVideo.volume;
    const step = vol / 30; // 오디오 페이드아웃을 약 900ms로 조절
    
    const fadeAudio = setInterval(() => {
      if (vol > step) {
        vol -= step;
        dom.introVideo.volume = vol;
      } else {
        dom.introVideo.volume = 0;
        dom.introVideo.pause();
        clearInterval(fadeAudio);
      }
    }, 30);
  }

  // 1.1s 시네마틱 페이드 완료 후 로고 화면 전환
  setTimeout(() => {
    if (dom.introVideo) dom.introVideo.pause(); // 화면이 완전히 가려진 후 안전하게 정지
    switchScreen('logo');
    
    // 화면 전환 후 보이지 않을 때 클래스 원복 (다음 재생 대비)
    setTimeout(() => {
      if (introScreen) introScreen.classList.remove('cinematic-fade-out');
    }, 500);
  }, 1100);
}

function runLogoTimeline() {
  const logoSound = document.getElementById('logoSound');
  if (logoSound) {
    logoSound.currentTime = 0;
    logoSound.volume = 1.0;
    setTimeout(() => {
      logoSound.play().catch(() => {});
    }, 1640);
  }

  // 2.8s draw animation + 2s hold = 4.8s (4800ms)
  exhibitState.introTimer = setTimeout(() => {
    const wrapper = document.querySelector('#logoScreen .logo-wrapper');
    if (wrapper) wrapper.classList.add('logo-fade-out');

    setTimeout(() => {
      switchScreen('role');
      
      // 화면 전환이 완전히 끝나고 화면이 보이지 않게 된 후 클래스 원복 (다시 재생 대비)
      setTimeout(() => {
        if (wrapper) wrapper.classList.remove('logo-fade-out');
      }, 500);
    }, 1500);
  }, 4800);
}

function runRoleTimeline() {
  const line1 = document.querySelector('#roleScreen .role-line-1');
  const line2 = document.querySelector('#roleScreen .role-line-2');

  [line1, line2].forEach(el => {
    if (el) el.classList.remove('role-show', 'role-hide');
  });

  exhibitState.introTimers.push(setTimeout(() => {
    if (line1) line1.classList.add('role-show');
  }, 300));

  // line1 유지 시간 기존 2.2초 -> 2.7초 (+0.5초)
  exhibitState.introTimers.push(setTimeout(() => {
    if (line1) { line1.classList.remove('role-show'); line1.classList.add('role-hide'); }
  }, 3000));

  // 전체 타임라인 0.5초 밀림
  exhibitState.introTimers.push(setTimeout(() => {
    if (line2) line2.classList.add('role-show');
  }, 3800));

  // line2 유지 시간 기존 2.5초 -> 3.0초 (+0.5초 추가하여 총 1초 밀림)
  exhibitState.introTimers.push(setTimeout(() => {
    if (line2) { line2.classList.remove('role-show'); line2.classList.add('role-hide'); }
    exhibitState.introTimers.push(setTimeout(() => {
      switchScreen('marketHud');
    }, 1200));
  }, 6800));
}

let transitionSound = null;
function initTransitionSound() {
  transitionSound = document.getElementById('transitionSound');
  if (transitionSound) {
    transitionSound.preload = 'auto';
    transitionSound.volume = 0.6;
  }
}

async function playTransition() {
    try {
        if (!transitionSound) initTransitionSound();
        if (transitionSound) {
            transitionSound.currentTime = 0;
            await transitionSound.play();
        }
    } catch (e) {
        console.warn('[LOOKWHO] transition audio 재생 실패:', e);
    }
}

function resetToStart() {
  console.log("[LOOKWHO] Resetting exhibition to START screen smoothly");

  if (dom.introVideo) {
    dom.introVideo.pause();
    dom.introVideo.currentTime = 0;
  }
  if (dom.introScreen) {
    dom.introScreen.classList.remove('cinematic-fade-out');
  }
  if (dom.marketAmbienceAudio) {
    dom.marketAmbienceAudio.pause();
    dom.marketAmbienceAudio.currentTime = 0;
  }
  if (typeof hudVideo !== 'undefined' && hudVideo) {
    hudVideo.pause();
    hudVideo.currentTime = 0;
    hudVideo.style.opacity = '0';
  }
  
  if (typeof isCamRunning !== 'undefined') isCamRunning = false;
  if (typeof hudStarted !== 'undefined') hudStarted = false;
  if (typeof sttStarted !== 'undefined') sttStarted = false;
  
  if (typeof recognition !== 'undefined' && recognition) {
    recognition.stop();
  }

  if (exhibitState.introTimers && exhibitState.introTimers.length > 0) {
    exhibitState.introTimers.forEach(timer => clearTimeout(timer));
    exhibitState.introTimers = [];
  }
  
  if (dom.startScreen) {
    dom.startScreen.style.opacity = '';
    dom.startScreen.style.transition = '';
    dom.startScreen.style.zIndex = '';
  }
  
  const appCont = document.getElementById('appContainer');
  if (appCont) appCont.classList.remove('show');
  
  if (typeof hideRoleplayOverlay === 'function') hideRoleplayOverlay();
  
  switchScreen('start');
}

function initAllEventListeners() {
  if (dom.startBtn) {
    dom.startBtn.addEventListener('click', () => {
      playTransition();

      // 시작 화면 투명도를 조절하여 매우 빠르게 페이드아웃
      if (dom.startScreen) {
        dom.startScreen.style.transition = 'opacity 0.4s ease-in-out';
        dom.startScreen.style.opacity = '0';
        dom.startScreen.style.zIndex = '99'; // 페이드아웃 되는 동안 최상단 유지
      }

      // 거의 즉시 다음 화면으로 전환하여 영상과 교차되도록 함
      setTimeout(() => {
        switchScreen('intro');
        if (dom.introVideo) {
          dom.introVideo.muted = false;
          dom.introVideo.volume = 0;
          dom.introVideo.play().catch(err => {
            console.warn('[LOOKWHO] 인트로 영상 재생 오류:', err);
          });
        }
      }, 50);
    });
  }

  if (dom.skipIntroBtn) {
    dom.skipIntroBtn.addEventListener('click', skipIntro);
  }

  if (dom.resetAllBtn) {
    dom.resetAllBtn.addEventListener('click', resetToStart);
  }
}

// =========================================================
// MARKET HUD LOGIC
// =========================================================

let hudVideo = null;
let videoCanvas = null, blurCanvas = null, hudCanvas = null;
let vctx = null, bctx = null, ctx = null;
let priceIndicator = null;
let W = window.innerWidth;
let H = window.innerHeight;
let dpr = window.devicePixelRatio || 1;

let noiseCanvas = null;
let nctx = null;
let isCamRunning = false;

let priceDB = {
  "광어": [0, 35000, 68000, 99000, 128000, 155000],
  "생선": [0, 10000, 15000, 20000, 25000, 30000], // For roleplay
  "우럭": [0, 22000, 42000, 61000, 79000, 95000],
  "사과": [0, 2500, 4800, 7000, 9000, 10500],
  "깻잎": [0, 1000, 1900, 2700, 3500, 4200],
  "옥수수": [0, 2000, 3800, 5500, 7000, 8500],
  "당근": [0, 1500, 2800, 4000, 5000, 6000]
};

function generateNoise() {
  if (!nctx) return;
  const img = nctx.createImageData(W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 32;
  }
  nctx.putImageData(img, 0, 0);
}

let priceTimer = null;
let lastPrice = null;
let finalSummary = '';

function showPrice(v) {
  if (!v) return;
  if (lastPrice === v.price) return;
  clearTimeout(priceTimer);

  if (priceIndicator.classList.contains('show')) {
    priceIndicator.classList.remove('show');
    setTimeout(() => {
      lastPrice = v.price;
      priceIndicator.innerText = '₩ ' + v.price.toLocaleString();
      priceIndicator.classList.add('show');
    }, 550);
  } else {
    lastPrice = v.price;
    priceIndicator.innerText = '₩ ' + v.price.toLocaleString();
    priceIndicator.classList.add('show');
  }

  priceTimer = setTimeout(() => {
    priceIndicator.classList.remove('show');
    finalSummary = '';
    setTimeout(() => {
      lastPrice = null;
    }, 550);
  }, 7000);
}

// STT Logic
let transcript = '';
let liveSubtitle = '';
let speaking = false;
let isProcessed = false;
let speakingTimer = null;
let recognition = null;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let roleplayStep = 'WAIT_HELLO';
let presetSubtitle = '';
let presetSummary = '';

let roleplaySound = null;
function initRoleplaySound() {
  roleplaySound = document.getElementById('roleplaySound');
  if (roleplaySound) {
    roleplaySound.preload = 'auto';
  }
}

function showRoleplayOverlay(quote, subtext = '라고 말해보세요') {
  const overlay = document.getElementById('roleplayOverlay');
  const textEl = document.getElementById('roleplayText');
  if(textEl && overlay) {
    if (quote) {
      textEl.innerHTML = `
        <span style="font-size: 1.3em; font-weight: 200; letter-spacing: 1px;">"${quote}"</span><br>
        <span style="font-size: 0.7em; font-weight: 200; opacity: 0.8; margin-top: 4px; display: inline-block;">${subtext}</span>
      `;
    } else {
      textEl.innerHTML = '';
    }
    overlay.classList.add('show');
    
    // 단계 완료 시 시네마틱 피드백(완료 효과음) 재생
    if (!roleplaySound) initRoleplaySound();
    if (roleplaySound) {
      roleplaySound.currentTime = 0;
      roleplaySound.volume = 0.32;
      roleplaySound.play().catch(()=>{});
    }
  }
}

function hideRoleplayOverlay() {
  const overlay = document.getElementById('roleplayOverlay');
  if(overlay) overlay.classList.remove('show');
}

function showPresetSubtitle(text) {
  presetSubtitle = text;
  liveSubtitle = text;
}

function showPresetSummary(text) {
  presetSummary = text;
  finalSummary = text;
}

function handleRoleplayTrigger(text) {
  const t = text.toLowerCase().replace(/\s/g, '');

  switch (roleplayStep) {
    case 'FINAL_GREETING':
      if (t.includes('감사합니다') || t.includes('감사해요') || t.includes('고맙습니다')) {
        roleplayStep = 'FINISHED';
        
        const overlay = document.getElementById('roleplayOverlay');
        const textEl = document.getElementById('roleplayText');
        
        if (overlay && textEl) {
          // 배경을 완전한 검정으로 서서히 전환 & 텍스트 페이드아웃
          overlay.style.transition = 'background-color 2.5s ease, opacity 900ms';
          overlay.style.backgroundColor = '#000000';
          
          textEl.style.transition = 'opacity 0.8s ease';
          textEl.style.opacity = '0';
          
          setTimeout(() => {
            // 시선이 연결되었습니다 문구 표시 (2초에 걸쳐 서서히 페이드인)
            textEl.style.transition = 'opacity 2s ease';
            textEl.innerHTML = `<span style="font-size: 26px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.55; color: rgba(245,245,247,0.86);">시선이 연결되었습니다.</span>`;
            textEl.style.opacity = '1';
            
            // 3초 유지
            setTimeout(() => {
              // 오버레이(배경)는 그대로 두고 텍스트만 3초에 걸쳐 서서히 암전되게 합니다.
              textEl.style.transition = 'opacity 3s ease';
              textEl.style.opacity = '0';
              
              // 3초 뒤 텍스트가 완전히 사라져서 완벽한 블랙 화면이 되면 첫 화면 호출
              setTimeout(() => {
                resetToStart();
                
                // 잔여 스타일 정리
                setTimeout(() => {
                  overlay.style.backgroundColor = '';
                  textEl.style.transition = '';
                  textEl.style.opacity = '';
                }, 1000);
              }, 3000);
              
            }, 3000);
          }, 1200);
        }
      }
      break;

    case 'WAIT_HELLO':
      if (t.includes('안녕하세요') || t.includes('안녕')) {
        roleplayStep = 'SHOW_HELLO';
        hideRoleplayOverlay();
        setTimeout(() => {
          showPresetSubtitle('안녕하세요');
          presetSummary = '';
        }, 1200);
        
        playSegment(1.48, 3.53, () => {
          showRoleplayOverlay('무엇을 드릴까요?');
          roleplayStep = 'WAIT_ORDER';
          setTimeout(() => {
            presetSubtitle = '';
            liveSubtitle = '';
          }, 500);
        });
      }
      break;

    case 'WAIT_ORDER':
      if (t.includes('무엇을드릴까') || t.includes('뭘드릴까') || t.includes('드릴까요')) {
        roleplayStep = 'SHOW_ORDER';
        hideRoleplayOverlay();
        setTimeout(() => {
          showPresetSubtitle('생선 2마리 주세요!');
          showPresetSummary('생선 2마리');
          showPrice({ price: 30000 });
        }, 1200);

        playSegment(3.53, 6.34, () => {
          showRoleplayOverlay('다른 건 필요 없으세요?');
          roleplayStep = 'WAIT_MORE';
          setTimeout(() => {
            presetSubtitle = '';
            liveSubtitle = '';
            presetSummary = '';
            finalSummary = '';
            if(priceIndicator) priceIndicator.classList.remove('show');
          }, 500);
        });
      }
      break;

    case 'WAIT_MORE':
      if (t.includes('다른건필요없으세요') || t.includes('다른거필요없으세요') || t.includes('필요없으세요') || t.includes('더필요')) {
        roleplayStep = 'DONE';
        hideRoleplayOverlay();
        setTimeout(() => {
          showPresetSubtitle('생선 2마리랑 사과 5개도 같이 주세요.');
          showPresetSummary('생선 2마리 / 사과 5개');
          showPrice({ price: 40000 });
        }, 1200);

        playSegment(6.34, 9.75, () => {
          // 마지막 인사 인터랙션 설정 (새로운 화면/클래스 없이 기존 overlay 재사용)
          const overlay = document.getElementById('roleplayOverlay');
          const textEl = document.getElementById('roleplayText');
          
          if (overlay && textEl) {
            textEl.innerHTML = `
              <span style="font-size: 0.7em; font-weight: 200; opacity: 0.8; line-height: 1.6; display: inline-block; margin-bottom: 24px;">이제, 앞의 사람에게 인사해주세요.</span><br>
              <span style="font-size: 1.3em; font-weight: 200; letter-spacing: 1px;">"감사합니다"</span>
            `;
            overlay.classList.add('show');
            
            // 반투명 블랙 오버레이 등장 시 단계전환 효과음 재생
            if (!roleplaySound) initRoleplaySound();
            if (roleplaySound) {
              roleplaySound.currentTime = 0;
              roleplaySound.volume = 0.32;
              roleplaySound.play().catch(()=>{});
            }
          }
          
          setTimeout(() => {
            presetSubtitle = '';
            liveSubtitle = '';
            presetSummary = '';
            finalSummary = '';
            if(priceIndicator) priceIndicator.classList.remove('show');
            
            roleplayStep = 'FINAL_GREETING';
          }, 500);
        });
      }
      break;
  }
}

let sttStarted = false;

function initSTT() {
  if (sttStarted) return;
  sttStarted = true;

  if (!SR) return;
  if (recognition) recognition.stop();
  recognition = new SR();
  recognition.lang = 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = e => {
    const latest = e.results[e.results.length - 1];
    transcript = latest[0].transcript;
    handleRoleplayTrigger(transcript);

    if (presetSubtitle) {
      liveSubtitle = presetSubtitle;
    } else {
      liveSubtitle = '';
    }
    speaking = true;
    isProcessed = false;
    clearTimeout(speakingTimer);

    speakingTimer = setTimeout(() => {
      speaking = false;
      if (!isProcessed && transcript.trim()) {
        isProcessed = true;
        if (presetSummary) finalSummary = presetSummary;
      }
    }, 500);

    if (latest.isFinal) {
      if (!isProcessed) {
        isProcessed = true;
        if (presetSummary) finalSummary = presetSummary;
      }
    } else {
      if (!isProcessed && !presetSummary) {
        finalSummary = '';
      }
    }
  };

  recognition.onend = () => {
    if(isCamRunning) {
      try { recognition.start(); } catch (e) { }
    }
  };

  try { recognition.start(); } catch (e) {}
}

let pauseTargetTime = null;
let segmentEndCallback = null;

function playSegment(startTime, endTime, onEnded) {
  if (!hudVideo) return;
  hudVideo.muted = false;
  hudVideo.currentTime = startTime;
  pauseTargetTime = endTime;
  segmentEndCallback = onEnded || null;
  hudVideo.play().catch(e => {
    console.warn("구간 재생 실패:", e);
  });
}

function checkPausePoint() {
  if (pauseTargetTime !== null && hudVideo && hudVideo.currentTime >= pauseTargetTime) {
    hudVideo.pause();
    pauseTargetTime = null;
    if (segmentEndCallback) {
      segmentEndCallback();
      segmentEndCallback = null;
    }
  }
  if(isCamRunning) requestAnimationFrame(checkPausePoint);
}

let hudStarted = false;

function marketHudStart() {
  if (hudStarted) return;
  hudStarted = true;

  console.log("[LOOKWHO] Starting Market HUD Experience");
  
  hudVideo = document.getElementById('hudVideo');
  if (hudVideo) hudVideo.style.opacity = ''; // 이전 resetToStart에서 0으로 설정된 경우 원복
  videoCanvas = document.getElementById('videoCanvas');
  blurCanvas = document.getElementById('blurCanvas');
  hudCanvas = document.getElementById('hudCanvas');
  priceIndicator = document.getElementById('priceIndicator');
  
  if(!hudVideo || !videoCanvas) return;

  W = window.innerWidth;
  H = window.innerHeight;
  
  [videoCanvas, blurCanvas, hudCanvas].forEach(c => {
    c.width = W * dpr;
    c.height = H * dpr;
  });

  vctx = videoCanvas.getContext('2d');
  bctx = blurCanvas.getContext('2d');
  ctx = hudCanvas.getContext('2d');
  
  vctx.scale(dpr, dpr);
  bctx.scale(dpr, dpr);
  ctx.scale(dpr, dpr);

  noiseCanvas = document.createElement('canvas');
  nctx = noiseCanvas.getContext('2d');
  noiseCanvas.width = W;
  noiseCanvas.height = H;
  generateNoise();

  initSTT();

  roleplayStep = 'WAIT_HELLO';
  presetSubtitle = '';
  presetSummary = '';
  finalSummary = '';
  liveSubtitle = '';
  if(priceIndicator) priceIndicator.classList.remove('show');
  
  hudVideo.currentTime = 0;
  hudVideo.muted = true;
  hudVideo.play().then(() => {
    hudVideo.pause();
    // 비디오 첫 프레임이 그려진 후 부드럽게 페이드인
    setTimeout(() => {
      document.getElementById('appContainer').classList.add('show');
    }, 100);
  }).catch(e => {
    console.warn("비디오 자동재생 실패:", e);
    // 에러 시에도 페이드인은 진행
    document.getElementById('appContainer').classList.add('show');
  });
  
  isCamRunning = true;
  checkPausePoint();

  showRoleplayOverlay('안녕하세요', '라고 말해보세요');

  let activeFace = { x: W / 2, y: H / 2, size: 240 };
  let targetActiveFace = { x: W / 2, y: H * 0.42, size: Math.min(W, H) * 0.34 };

  let currentSummaryAlpha = 0, targetSummaryAlpha = 0, renderSummaryText = '';
  let currentSubtitleAlpha = 0, targetSubtitleAlpha = 0, renderSubtitleText = '';

  function processFrame() {
    if (!isCamRunning) return;

    if (hudVideo && hudVideo.readyState >= 2) {
      vctx.clearRect(0, 0, W, H);
      vctx.save();
      vctx.drawImage(hudVideo, 0, 0, W, H);
      vctx.restore();

      bctx.clearRect(0, 0, W, H);
      bctx.save();
      bctx.drawImage(hudVideo, 0, 0, W, H);
      bctx.restore();

      bctx.globalAlpha = 0.32;
      bctx.drawImage(noiseCanvas, 0, 0);
      bctx.globalAlpha = 1;

      activeFace.x += (targetActiveFace.x - activeFace.x) * 0.1;
      activeFace.y += (targetActiveFace.y - activeFace.y) * 0.1;
      activeFace.size += (targetActiveFace.size - activeFace.size) * 0.05;

      const r = activeFace.size * 1.6;
      const maskStd = `radial-gradient(circle at ${activeFace.x}px ${activeFace.y}px, rgba(0,0,0,0) ${r * 0.15}px, rgba(0,0,0,0.6) ${r * 0.5}px, rgba(0,0,0,1) ${r}px)`;
      const maskWebkit = `-webkit-radial-gradient(${activeFace.x}px ${activeFace.y}px, circle closest-side, rgba(0,0,0,0) ${r * 0.15}px, rgba(0,0,0,0.6) ${r * 0.5}px, rgba(0,0,0,1) ${r}px)`;

      blurCanvas.style.webkitMaskImage = maskWebkit;
      blurCanvas.style.maskImage = maskStd;

      ctx.clearRect(0, 0, W, H);

      const edge = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.9);
      edge.addColorStop(0, 'rgba(0,0,0,0)');
      edge.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, W, H);

      if (finalSummary) {
        renderSummaryText = finalSummary;
        targetSummaryAlpha = 0.9;
      } else {
        targetSummaryAlpha = 0;
      }
      // 가격표 페이드아웃(0.6초) 속도와 맞추기 위해 보간 계수를 0.12로 상향 (약 0.6초 소요)
      currentSummaryAlpha += (targetSummaryAlpha - currentSummaryAlpha) * 0.12;

      if (currentSummaryAlpha < 0.01 && targetSummaryAlpha === 0) {
        renderSummaryText = '';
        currentSummaryAlpha = 0;
      }
      if (renderSummaryText && currentSummaryAlpha > 0) {
        ctx.font = '700 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 255, 255, ${currentSummaryAlpha})`;
        ctx.fillText(renderSummaryText, Math.round(W * 0.47) + 5, Math.round(activeFace.y - activeFace.size * 0.9));
      }

      if (liveSubtitle) {
        renderSubtitleText = liveSubtitle;
        targetSubtitleAlpha = 0.6;
      } else {
        targetSubtitleAlpha = 0;
      }
      // 가격표 페이드아웃(0.6초) 속도와 맞추기 위해 보간 계수를 0.12로 상향
      currentSubtitleAlpha += (targetSubtitleAlpha - currentSubtitleAlpha) * 0.12;

      if (currentSubtitleAlpha < 0.01 && targetSubtitleAlpha === 0) {
        renderSubtitleText = '';
        currentSubtitleAlpha = 0;
      }
      if (renderSubtitleText && currentSubtitleAlpha > 0) {
        ctx.font = '200 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '1px';
        ctx.fillStyle = `rgba(255, 255, 255, ${currentSubtitleAlpha})`;
        ctx.fillText(renderSubtitleText, Math.round(W * 0.47) + 5, Math.round(H * 0.79));
        ctx.letterSpacing = '0px';
      }
    }
    requestAnimationFrame(processFrame);
  }
  processFrame();
}

function initLogoAnimation() {
  const svg = document.getElementById('logo');
  if (!svg) return;

  const selectors = 'path, rect:not(.bg-rect), circle, ellipse, line, polyline, polygon';
  const els = [...svg.querySelectorAll(selectors)];

  els.sort((a, b) => {
    try { return a.getBBox().x - b.getBBox().x; }
    catch (e) { return 0; }
  });

  els.forEach((el, i) => {
    el.classList.add('anim-el');
    el.style.setProperty('--i', i);

    let len = 0;
    try {
      if (typeof el.getTotalLength === 'function') {
        len = el.getTotalLength();
      }
    } catch (e) { }

    if (!len) {
      try {
        const b = el.getBBox();
        len = 2 * (b.width + b.height);
      } catch (e) { len = 500; }
    }
    el.style.setProperty('--len', len);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  console.log("[LOOKWHO] DOMContentLoaded - 전시 런타임 제어기 기동");
  initDomReferences();
  initTransitionSound();
  initAllEventListeners();
  initLogoAnimation();
});
