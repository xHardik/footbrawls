import React, { useEffect, useRef, useState } from 'react';

const VAST_URL = 'https://nautical-hand.com/dWmPF.zTdJGUNlvAZeGjUT/meTmO9/uAZmUUlqk/PVTPc-xJOJDvclxJONTNcuthNHzME/4LNjzcIQwlMXQj';

// If no ad has started playing within this window (no-fill, slow network,
// ad blocker, etc.), stop waiting and grant the reward anyway so the user
// isn't blocked by an ad network problem.
const FALLBACK_GRANT_MS = 5000;

export default function RewardedAd({ isOpen, onComplete, onError, onClose }) {
  const adContainerRef = useRef(null);
  const videoElementRef = useRef(null);

  const adsManagerRef = useRef(null);
  const adsLoaderRef = useRef(null);
  const adDisplayContainerRef = useRef(null);
  const hasStartedRef = useRef(false);   // true once the ad actually begins playing
  const hasResolvedRef = useRef(false);  // true once onComplete/onError has fired, guards against double-fires
  const fallbackTimerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);

  // Fire onComplete/onError exactly once per ad session.
  const resolve = (type) => {
    if (hasResolvedRef.current) return;
    hasResolvedRef.current = true;
    clearFallbackTimer();
    cleanup();
    if (type === 'complete') onComplete?.();
    else onError?.();
  };

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    hasResolvedRef.current = false;
    hasStartedRef.current = false;
    setIsPlaying(false);

    // Start the fallback timer immediately: if nothing has started playing
    // within FALLBACK_GRANT_MS, grant the reward so the user isn't stuck.
    fallbackTimerRef.current = setTimeout(() => {
      if (!hasStartedRef.current) {
        console.warn('[IMA] No ad started within fallback window — granting reward anyway.');
        resolve('complete');
      }
    }, FALLBACK_GRANT_MS);

    if (!window.google || !window.google.ima) {
      // No SDK at all — still let the fallback timer above handle it,
      // but no point waiting the full window since we know it can't succeed.
      resolve('complete');
      return () => clearFallbackTimer();
    }

    const { ima } = window.google;

    try {
      // 1. Create AdDisplayContainer
      adDisplayContainerRef.current = new ima.AdDisplayContainer(
        adContainerRef.current,
        videoElementRef.current
      );
      adDisplayContainerRef.current.initialize();

      // 2. Create AdsLoader
      adsLoaderRef.current = new ima.AdsLoader(adDisplayContainerRef.current);

      // 3. Listeners
      const onAdsManagerLoaded = (adsManagerLoadedEvent) => {
        const adsRenderingSettings = new ima.AdsRenderingSettings();
        adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

        const adsManager = adsManagerLoadedEvent.getAdsManager(videoElementRef.current, adsRenderingSettings);
        adsManagerRef.current = adsManager;

        adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (adErrorEvent) => {
          console.error('[IMA Error]', adErrorEvent.getError());
          resolve('complete'); // fallback: don't block the user on an ad error
        });

        // STARTED = the SDK actually began playing linear ad content.
        // This is the only reliable signal that a real ad (not a no-fill) is running.
        adsManager.addEventListener(ima.AdEvent.Type.STARTED, () => {
          hasStartedRef.current = true;
          clearFallbackTimer(); // a real ad is playing, stop the fallback clock
        });

        adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
          resolve('complete');
        });

        // ALL_ADS_COMPLETED fires whenever the ad break ends, including when
        // there was no fill and nothing ever played.
        adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
          if (adsManagerRef.current) {
            resolve('complete'); // fallback covers no-fill case too
          }
        });

        adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => {
          resolve('complete');
        });

        adsManager.addEventListener(ima.AdEvent.Type.USER_CLOSE, () => {
          resolve('complete');
        });

        try {
          const width = window.innerWidth;
          const height = window.innerHeight;
          adsManager.init(width, height, ima.ViewMode.NORMAL);
          adsManager.start();
          setIsPlaying(true);
        } catch (adError) {
          console.error('[IMA Start Error]', adError);
          resolve('complete');
        }
      };

      const onAdError = (adErrorEvent) => {
        console.error('[IMA Loader Error]', adErrorEvent.getError());
        resolve('complete'); // fallback: no-fill / loader error still grants reward
      };

      adsLoaderRef.current.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded, false);
      adsLoaderRef.current.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

      // 4. Request Ads
      const adsRequest = new ima.AdsRequest();
      adsRequest.adTagUrl = VAST_URL;

      adsRequest.linearAdSlotWidth = window.innerWidth;
      adsRequest.linearAdSlotHeight = window.innerHeight;
      adsRequest.nonLinearAdSlotWidth = window.innerWidth;
      adsRequest.nonLinearAdSlotHeight = window.innerHeight;

      adsLoaderRef.current.requestAds(adsRequest);

    } catch (err) {
      console.error('[IMA Setup Error]', err);
      resolve('complete');
    }

    return () => {
      clearFallbackTimer();
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (adsManagerRef.current) {
      try { adsManagerRef.current.destroy(); } catch (e) {}
      adsManagerRef.current = null;
    }
    if (adsLoaderRef.current) {
      try { adsLoaderRef.current.destroy(); } catch (e) {}
      adsLoaderRef.current = null;
    }
    if (adDisplayContainerRef.current) {
      try { adDisplayContainerRef.current.destroy(); } catch (e) {}
      adDisplayContainerRef.current = null;
    }
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: '#000', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {!isPlaying && (
        <div style={{ color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
          Loading Ad...
        </div>
      )}
      <video
        ref={videoElementRef}
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'contain' }}
        playsInline
      />
      <div
        ref={adContainerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <button
        onClick={() => { clearFallbackTimer(); cleanup(); onClose?.(); }}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', padding: '6px 12px', borderRadius: 4, zIndex: 10
        }}
      >
        Close
      </button>
    </div>
  );
}