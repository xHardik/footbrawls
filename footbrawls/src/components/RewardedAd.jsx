import React, { useEffect, useRef, useState } from 'react';

const VAST_URL = 'https://nautical-hand.com/dWmPF.zTdJGUNlvAZeGjUT/meTmO9/uAZmUUlqk/PVTPc-xJOJDvclxJONTNcuthNHzME/4LNjzcIQwlMXQj';

export default function RewardedAd({ isOpen, onComplete, onError, onClose }) {
  const adContainerRef = useRef(null);
  const videoElementRef = useRef(null);
  
  const adsManagerRef = useRef(null);
  const adsLoaderRef = useRef(null);
  const adDisplayContainerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (!window.google || !window.google.ima) {
      onError?.();
      return;
    }

    const { ima } = window.google;
    setIsPlaying(false);

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
          cleanup();
          onError?.();
        });

        adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
          cleanup();
          onComplete?.();
        });
        
        adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
          if (adsManagerRef.current) {
            cleanup();
            onComplete?.();
          }
        });

        adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => {
          cleanup();
          onClose?.(); 
        });
        
        adsManager.addEventListener(ima.AdEvent.Type.USER_CLOSE, () => {
          cleanup();
          onClose?.();
        });

        try {
          const width = window.innerWidth;
          const height = window.innerHeight;
          adsManager.init(width, height, ima.ViewMode.NORMAL);
          adsManager.start();
          setIsPlaying(true);
        } catch (adError) {
          console.error('[IMA Start Error]', adError);
          cleanup();
          onError?.();
        }
      };

      const onAdError = (adErrorEvent) => {
        console.error('[IMA Loader Error]', adErrorEvent.getError());
        cleanup();
        onError?.();
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
      cleanup();
      onError?.();
    }

    return cleanup;
  }, [isOpen]);

  const cleanup = () => {
    if (adsManagerRef.current) {
      try { adsManagerRef.current.destroy(); } catch(e){}
      adsManagerRef.current = null;
    }
    if (adsLoaderRef.current) {
      try { adsLoaderRef.current.destroy(); } catch(e){}
      adsLoaderRef.current = null;
    }
    if (adDisplayContainerRef.current) {
      try { adDisplayContainerRef.current.destroy(); } catch(e){}
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
        onClick={() => { cleanup(); onClose?.(); }}
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
