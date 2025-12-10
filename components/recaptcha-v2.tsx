"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (container: HTMLElement, options: { sitekey: string; callback?: (token: string) => void; "expired-callback"?: () => void }) => number;
      reset: (widgetId: number) => void;
      getResponse: (widgetId: number) => string;
    };
  }
}

interface ReCaptchaV2Props {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark";
  size?: "normal" | "compact";
}

export function ReCaptchaV2({ 
  siteKey, 
  onVerify, 
  onExpire,
  theme = "light",
  size = "normal"
}: ReCaptchaV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const scriptLoadedRef = useRef(false);
  const isRenderingRef = useRef(false);

  const handleVerify = useCallback((token: string) => {
    onVerify(token);
  }, [onVerify]);

  const handleExpire = useCallback(() => {
    if (onExpire) {
      onExpire();
    }
  }, [onExpire]);

  useEffect(() => {
    // Prevent multiple renders
    if (isRenderingRef.current || widgetIdRef.current !== null) {
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
    
    if (existingScript && window.grecaptcha) {
      // Script already loaded, just render
      scriptLoadedRef.current = true;
      renderWidget();
    } else if (!existingScript) {
      // Load script
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?hl=ar`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };

      script.onerror = () => {
        console.error("Failed to load reCAPTCHA script");
        isRenderingRef.current = false;
      };

      document.head.appendChild(script);
    }

    function renderWidget() {
      if (isRenderingRef.current || widgetIdRef.current !== null || !containerRef.current) {
        return;
      }

      if (!window.grecaptcha) {
        console.error("reCAPTCHA not available");
        return;
      }

      isRenderingRef.current = true;

      window.grecaptcha.ready(() => {
        if (!containerRef.current || widgetIdRef.current !== null) {
          isRenderingRef.current = false;
          return;
        }

        try {
          // Check if container already has reCAPTCHA
          if (containerRef.current.children.length > 0) {
            console.warn("reCAPTCHA container already has content");
            isRenderingRef.current = false;
            return;
          }

          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            callback: handleVerify,
            "expired-callback": handleExpire,
            theme: theme,
            size: size,
          });

          isRenderingRef.current = false;
        } catch (error) {
          console.error("Error rendering reCAPTCHA:", error);
          isRenderingRef.current = false;
        }
      });
    }

    return () => {
      // Cleanup on unmount
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          // Reset widget instead of removing (reCAPTCHA doesn't support removal)
          window.grecaptcha.reset(widgetIdRef.current);
        } catch (error) {
          console.error("Error resetting reCAPTCHA:", error);
        }
        widgetIdRef.current = null;
      }
      isRenderingRef.current = false;
    };
  }, [siteKey, handleVerify, handleExpire, theme, size]);

  return (
    <div className="flex justify-center my-4">
      <div 
        ref={containerRef} 
        id={`recaptcha-container-${siteKey.slice(-5)}`}
        key={`recaptcha-${siteKey}`}
      />
    </div>
  );
}

