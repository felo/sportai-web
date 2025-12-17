"use client";

import { useState, useEffect } from "react";
import { Box, Flex, Text, Button, Link } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import buttonStyles from "@/styles/buttons.module.css";

const CONSENT_KEY = "sportai-cookie-consent";
const CONSENT_VERSION = "1"; // Bump this to re-show banner after policy changes

interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: string;
}

/**
 * GDPR-compliant cookie consent banner.
 * Appears at the bottom of the screen for new visitors.
 * Stores preferences in localStorage.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<Partial<ConsentPreferences>>({
    necessary: true, // Always required
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already consented
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ConsentPreferences;
        // Re-show if consent version changed
        if (parsed.version !== CONSENT_VERSION) {
          setVisible(true);
        }
      } else {
        // First visit - show banner after short delay
        const timer = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const saveConsent = (prefs: Partial<ConsentPreferences>) => {
    const consent: ConsentPreferences = {
      necessary: true,
      analytics: prefs.analytics ?? true,
      marketing: prefs.marketing ?? false,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
      
      // Dispatch event for analytics tools to listen to
      window.dispatchEvent(new CustomEvent("cookie-consent", { detail: consent }));
    } catch {
      // localStorage might be disabled
    }
    
    setVisible(false);
  };

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
  };

  const acceptNecessary = () => {
    saveConsent({ analytics: false, marketing: false });
  };

  const saveCustom = () => {
    saveConsent(preferences);
  };

  if (!visible) return null;

  return (
    <Box
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "16px",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        background: "var(--gray-1)",
        borderTop: "1px solid var(--gray-6)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.25)",
        animation: "fadeInUp 0.3s ease-out",
      }}
    >
      <Flex
        direction="column"
        gap="3"
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <Flex justify="between" align="start" gap="3">
          <Box style={{ flex: 1 }}>
          <Text as="p" size="2" weight="medium" style={{ marginBottom: "4px" }}>
            We value your privacy
          </Text>
            <Text as="p" size="2" color="gray">
              We use cookies to enhance your experience, analyze site traffic, and serve personalized content.{" "}
              <Link
                href="/privacy"
                size="2"
                style={{ textDecoration: "underline" }}
              >
                Privacy Policy
              </Link>
            </Text>
          </Box>
          
          <Button
            variant="ghost"
            size="1"
            onClick={acceptNecessary}
            style={{ padding: "4px", flexShrink: 0 }}
            aria-label="Decline optional cookies"
          >
            <Cross2Icon width={16} height={16} />
          </Button>
        </Flex>

        {showDetails && (
          <Box
            style={{
              padding: "12px",
              background: "var(--gray-2)",
              borderRadius: "8px",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <input
                  type="checkbox"
                  id="necessary"
                  checked
                  disabled
                  style={{ accentColor: "var(--mint-9)" }}
                />
                <label htmlFor="necessary">
                  <Text size="2" weight="medium">Necessary</Text>
                  <Text size="1" color="gray" style={{ display: "block" }}>
                    Required for the site to function
                  </Text>
                </label>
              </Flex>
              
              <Flex align="center" gap="2">
                <input
                  type="checkbox"
                  id="analytics"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  style={{ accentColor: "var(--mint-9)" }}
                />
                <label htmlFor="analytics">
                  <Text size="2" weight="medium">Analytics</Text>
                  <Text size="1" color="gray" style={{ display: "block" }}>
                    Help us improve by tracking usage
                  </Text>
                </label>
              </Flex>
              
              <Flex align="center" gap="2">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  style={{ accentColor: "var(--mint-9)" }}
                />
                <label htmlFor="marketing">
                  <Text size="2" weight="medium">Marketing</Text>
                  <Text size="1" color="gray" style={{ display: "block" }}>
                    Personalized ads and recommendations
                  </Text>
                </label>
              </Flex>
            </Flex>
          </Box>
        )}

        <Flex gap="2" wrap="wrap" justify="end" align="center">
          <Button
            size="2"
            onClick={() => setShowDetails(!showDetails)}
            className={buttonStyles.actionButtonSquareSecondary}
          >
            {showDetails ? "Hide options" : "Customize"}
          </Button>
          
          {showDetails ? (
            <Button 
              size="2" 
              onClick={saveCustom}
              className={buttonStyles.actionButtonSquare}
            >
              Save preferences
            </Button>
          ) : (
            <>
              <Button 
                size="2" 
                onClick={acceptNecessary}
                className={buttonStyles.actionButtonSquareSecondary}
              >
                Necessary only
              </Button>
              <Button 
                size="2" 
                onClick={acceptAll}
                className={buttonStyles.actionButtonSquare}
              >
                Accept all
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

/**
 * Hook to check cookie consent status
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        setConsent(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }

    const handleConsentChange = (e: CustomEvent<ConsentPreferences>) => {
      setConsent(e.detail);
    };

    window.addEventListener("cookie-consent", handleConsentChange as EventListener);
    return () => {
      window.removeEventListener("cookie-consent", handleConsentChange as EventListener);
    };
  }, []);

  return {
    hasConsented: consent !== null,
    analyticsAllowed: consent?.analytics ?? false,
    marketingAllowed: consent?.marketing ?? false,
  };
}

