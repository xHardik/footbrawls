import React, { useState, useEffect, useRef } from 'react';

const VAST_URL = 'https://nautical-hand.com/dWmPF.zTdJGUNlvAZeGjUT/meTmO9/uAZmUUlqk/PVTPc-xJOJDvclxJONTNcuthNHzME/4LNjzcIQwlMXQj';

export default function VastPlayer() {
  const [adState, setAdState] = useState(null); // { active: boolean, options: any, mediaUrl: string, clickUrl: string, error: string }
  const videoRef = useRef(null);

  useEffect(() => {
    window.adBreak = async (options) => {
      if (options.type !== 'reward') {
        if (options.beforeAd) options.beforeAd();
        if (options.adViewed) options.adViewed();
        if (options.afterAd) options.afterAd();
        if (options.adBreakDone) options.adBreakDone({ showStatus: 'mocked' });
        return;
      }

      if (options.beforeAd) options.beforeAd();
      
      try {
        setAdState({ active: true, options, loading: true });
        const res = await fetch(VAST_URL);
        const text = await res.text();
        const parser = new DOMParser();
        let xml = parser.parseFromString(text, 'text/xml');
        
        let errorNode = xml.querySelector('parsererror');
        if (errorNode) throw new Error('Invalid VAST XML');

        let mediaFile = xml.querySelector('MediaFile');
        if (!mediaFile) {
          // No fill - let's fetch a fallback test video so the user can see it working!
          console.warn('[VAST] No fill from ad network. Loading fallback test video.');
          const fallbackRes = await fetch('https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=');
          const fallbackText = await fallbackRes.text();
          xml = parser.parseFromString(fallbackText, 'text/xml');
          mediaFile = xml.querySelector('MediaFile');
          if (!mediaFile) throw new Error('Fallback failed');
        }
        
        const mediaUrl = mediaFile.textContent.trim();
        const clickUrl = xml.querySelector('ClickThrough')?.textContent?.trim() || null;

        setAdState({ active: true, options, loading: false, mediaUrl, clickUrl });
      } catch (err) {
        console.error('[VAST Player Error]', err);
        // Fallback or error: just grant reward so user isn't stuck
        if (options.adViewed) options.adViewed();
        if (options.afterAd) options.afterAd();
        if (options.adBreakDone) options.adBreakDone({ showStatus: 'error' });
        setAdState(null);
      }
    };
  }, []);

  const handleVideoEnded = () => {
    if (!adState) return;
    const { options } = adState;
    if (options.adViewed) options.adViewed();
    if (options.afterAd) options.afterAd();
    if (options.adBreakDone) options.adBreakDone({ showStatus: 'completed' });
    setAdState(null);
  };

  const handleVideoError = () => {
    handleVideoEnded(); // fallback grant on video error
  };

  const handleAdClick = () => {
    if (adState?.clickUrl) {
      window.open(adState.clickUrl, '_blank');
    }
  };

  const handleClose = () => {
    if (!adState) return;
    const { options } = adState;
    if (options.adDismissed) options.adDismissed();
    if (options.afterAd) options.afterAd();
    if (options.adBreakDone) options.adBreakDone({ showStatus: 'dismissed' });
    setAdState(null);
  };

  if (!adState?.active) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: '#000', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', color: '#fff',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {adState.loading ? (
        <div style={{ textAlign: 'center' }}>
          <div className="vast-spinner" style={{
            width: 40, height: 40, border: '4px solid rgba(255,255,255,0.2)',
            borderTop: '4px solid #F7C344', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p>Loading Ad...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : adState.mediaUrl ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            ref={videoRef}
            src={adState.mediaUrl}
            autoPlay 
            playsInline
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            onClick={handleAdClick}
            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: adState.clickUrl ? 'pointer' : 'default' }}
          />
          <button 
            onClick={handleClose}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', padding: '8px 16px', borderRadius: 20,
              fontSize: '0.85rem', cursor: 'pointer', zIndex: 2
            }}
          >
            Skip Ad
          </button>
        </div>
      ) : null}
    </div>
  );
}
