import { useState, useEffect } from 'react';
import { availableMonitors } from '@tauri-apps/api/window';

export const useDeviceDetection = () => {
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [hasAmplifier, setHasAmplifier] = useState(false);
  const [hasMultipleMonitors, setHasMultipleMonitors] = useState(false);

  useEffect(() => {
    // Check screen size
    const checkScreen = () => {
      // Typically TVs are 1920x1080 or larger
      setIsLargeScreen(window.screen.width >= 1920);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);

    // Check audio devices for amplifiers/TVs
    const checkAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        const hasExternalAudio = audioOutputs.some(device => {
          const label = device.label.toLowerCase();
          return label.includes('tv') || 
                 label.includes('amplifier') || 
                 label.includes('receiver') || 
                 label.includes('avr') || 
                 label.includes('hdmi');
        });
        
        setHasAmplifier(hasExternalAudio);
      } catch (err) {
        console.error('Error enumerating audio devices:', err);
      }
    };

    const checkMonitors = async () => {
      try {
        if (window.__TAURI_INTERNALS__) {
          const monitors = await availableMonitors();
          setHasMultipleMonitors(monitors.length > 1);
        }
      } catch (err) {
        console.error('Error checking monitors:', err);
      }
    };

    checkAudioDevices();
    checkMonitors();
    
    // Also listen for device changes (plugging in HDMI)
    const onDeviceChange = () => {
      checkAudioDevices();
      checkMonitors();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    
    // Poll monitor check just in case devicechange doesn't fire for some displays
    const monitorInterval = setInterval(checkMonitors, 5000);

    return () => {
      window.removeEventListener('resize', checkScreen);
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
      clearInterval(monitorInterval);
    };
  }, []);

  return { 
    isLargeScreen, 
    hasAmplifier, 
    hasMultipleMonitors, 
    isTheaterMode: isLargeScreen || hasAmplifier
  };
};
