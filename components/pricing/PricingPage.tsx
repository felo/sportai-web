"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Text, Button, Badge, Card } from "@radix-ui/themes";
import { CheckIcon, RocketIcon, ChatBubbleIcon, PersonIcon } from "@radix-ui/react-icons";
import { Sidebar } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { PageHeader } from "@/components/ui";
import { createNewChat, setCurrentChatId } from "@/utils/storage-unified";
import buttonStyles from "@/styles/buttons.module.css";
import { WaitlistModal } from "./WaitlistModal";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  subtitle?: string;
  price: string;
  priceNote?: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  badge?: string;
  badgeColor?: "green" | "blue" | "orange" | "gray";
  disabled?: boolean;
  comingSoon?: boolean;
  contactSales?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    priceNote: "",
    description: "Perfect for getting started with AI-powered sports analysis",
    features: [
      { text: "Unlimited AI coaching conversations", included: true },
      { text: "Upload and analyze short clips (100MB, ~1-3 minutes)", included: true },
      { text: "Basic technique and tactical feedback", included: true },
      { text: "Chat about any sport with deep knowledge on Tennis, Padel & Pickleball", included: true },
      { text: "Advanced match statistics and tactical insights", included: false },
      { text: "Advanced technique analysis", included: false },
      { text: "Full-length video analysis", included: false },
      { text: "Priority processing", included: false },
    ],
    cta: "Get Started",
  },
  {
    name: "PRO",
    subtitle: "Player",
    price: "TBA",
    description: "For athletes looking to improve their game",
    features: [
      { text: "Everything in Free, plus:", included: true },
      { text: "Longer video analysis", included: true },
      { text: "Cloud-based video storage", included: true },
      { text: "Advanced match statistics & tactical insights", included: true },
      { text: "Shot-by-shot breakdown", included: true },
      { text: "Performance trends over time", included: true },
      { text: "Priority video processing", included: false },
      { text: "Coaching tools & client management", included: false },
    ],
    cta: "Coming Soon",
    disabled: true,
    comingSoon: true,
  },
  {
    name: "PRO",
    subtitle: "Coach",
    price: "TBA",
    description: "Advanced tools for coaches and serious athletes",
    features: [
      { text: "Everything in PRO Player, plus:", included: true },
      { text: "Full-length match analysis", included: true },
      { text: "Larger cloud-based video storage", included: true },
      { text: "Advanced Technique Studio", included: true },
      { text: "Coaching tools & client management", included: true },
      { text: "Export detailed reports", included: true },
      { text: "Priority video processing", included: true },
      { text: "Share analysis with athletes", included: true },
    ],
    cta: "Coming Soon",
    disabled: true,
    comingSoon: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Tailored solutions for sports businesses",
    features: [
      { text: "Everything in PRO Coach, plus:", included: true },
      { text: "Custom integrations & API access", included: true },
      { text: "White-label options", included: true },
      { text: "Custom AI model training", included: true },
      { text: "Ready-made bespoke components and integrations", included: true },
      { text: "Manage team members", included: true },
      { text: "SLA & priority support", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    cta: "Contact Sales",
    contactSales: true,
  },
];

interface PlanCardProps {
  plan: PricingPlan;
  onGetStarted: () => void;
  onComingSoonClick?: () => void;
  onSignInClick?: () => void;
  isSignedIn: boolean;
  isMobile: boolean;
}

function PlanCard({ plan, onGetStarted, onComingSoonClick, onSignInClick, isSignedIn, isMobile }: PlanCardProps) {
  // Determine button style based on plan type
  const getButtonClass = () => {
    if (plan.contactSales) return buttonStyles.actionButtonSquareSecondary;
    // PRO plans get pulse effect
    if (plan.comingSoon) return `${buttonStyles.actionButtonSquare} ${buttonStyles.actionButtonPulse}`;
    return buttonStyles.actionButtonSquare;
  };

  // Determine button text for Free plan based on auth state
  const getButtonText = () => {
    if (plan.name === "Free") {
      if (isSignedIn) {
        return "You're In! 🎉";
      }
      return "Sign In";
    }
    if (plan.comingSoon) {
      return "Get Early Access";
    }
    return plan.cta;
  };

  // Determine button icon
  const renderButtonIcon = () => {
    if (plan.contactSales) return <ChatBubbleIcon width={16} height={16} />;
    if (plan.name === "Free" && !isSignedIn) return <PersonIcon width={16} height={16} />;
    if (plan.name === "Free" && isSignedIn) return null;
    return null;
  };
  
  return (
    <Card
      style={{
        padding: isMobile ? "24px" : "32px",
        backgroundColor: "var(--gray-2)",
        border: "1px solid var(--gray-6)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        overflow: "visible",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      className="pricing-card"
    >
      {/* Badge */}
      {plan.badge && (
        <Box
          style={{
            position: "absolute",
            top: "-12px",
            right: "24px",
          }}
        >
          <Badge
            color={plan.badgeColor || "blue"}
            size="2"
            style={{
              padding: "6px 16px",
              fontSize: "12px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {plan.badge}
          </Badge>
        </Box>
      )}

      {/* Header */}
      <Flex direction="column" gap="2" mb="4">
        <Flex align="center" gap="2">
          <Text size="6" weight="bold" style={{ color: "var(--gray-12)" }}>
            {plan.name}
          </Text>
          {plan.subtitle && (
            <Text size="5" weight="medium" style={{ color: "var(--accent-11)" }}>
              / {plan.subtitle}
            </Text>
          )}
        </Flex>
        
        <Flex align="baseline" gap="1">
          <Text
            size="8"
            weight="bold"
            style={{
              color: "var(--gray-12)",
              fontSize: plan.price === "Custom" || plan.price === "TBA" ? "32px" : "48px",
              lineHeight: 1,
            }}
          >
            {plan.price}
          </Text>
          {plan.priceNote && (
            <Text size="3" style={{ color: "var(--gray-11)" }}>
              {plan.priceNote}
            </Text>
          )}
        </Flex>
        
        <Text size="2" style={{ color: "var(--gray-11)", minHeight: "40px" }}>
          {plan.description}
        </Text>
      </Flex>

      {/* Features */}
      <Box style={{ flex: 1, marginBottom: "24px" }}>
        <Flex direction="column" gap="3">
          {plan.features.map((feature, index) => (
            <Flex key={index} align="start" gap="3">
              <Box
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: feature.included ? "var(--accent-9)" : "var(--gray-5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <CheckIcon
                  width={12}
                  height={12}
                  style={{
                    color: feature.included ? "white" : "var(--gray-8)",
                  }}
                />
              </Box>
              <Text
                size="2"
                style={{
                  color: feature.included ? "var(--gray-12)" : "var(--gray-9)",
                  textDecoration: feature.included ? "none" : "line-through",
                }}
              >
                {feature.text}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Box>

      {/* CTA Button */}
      <Button
        size="3"
        className={getButtonClass()}
        disabled={plan.name === "Free" && isSignedIn}
        onClick={() => {
          if (plan.contactSales) {
            window.open("https://sportai.com/contact", "_blank");
          } else if (plan.comingSoon && onComingSoonClick) {
            onComingSoonClick();
          } else if (plan.name === "Free" && !isSignedIn && onSignInClick) {
            onSignInClick();
          } else if (plan.name === "Free" && isSignedIn) {
            // Already signed in, do nothing
            return;
          } else {
            onGetStarted();
          }
        }}
        style={{
          width: "100%",
          height: "48px",
        }}
      >
        {renderButtonIcon()}
        {getButtonText()}
      </Button>
    </Card>
  );
}

export function PricingPage() {
  const router = useRouter();
  const { isCollapsed, isInitialLoad } = useSidebar();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Waitlist modal state
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    interest: "pro-player" | "pro-coach";
  } | null>(null);
  
  const isSignedIn = !!user;

  // Handle creating a new chat and navigating to it
  const handleNewChat = useCallback(async () => {
    const newChat = await createNewChat();
    setCurrentChatId(newChat.id);
    router.push("/");
  }, [router]);

  // Track scroll position to update active dot indicator
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || !isMobile) return;

    const handleScroll = () => {
      const scrollLeft = scrollContainer.scrollLeft;
      const cardWidth = 280 + 16; // card width + gap
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, plans.length - 1));
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Handle dot click to scroll to specific card
  const scrollToCard = (index: number) => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const cardWidth = 280 + 16;
    scrollContainer.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <Sidebar />
      <PageHeader onNewChat={handleNewChat} />
      <Box
        style={{
          height: "100vh",
          backgroundColor: "var(--gray-1)",
          padding: "24px",
          paddingTop: isMobile ? "calc(46px + 48px + env(safe-area-inset-top))" : "calc(57px + 48px)",
          paddingBottom: "96px",
          marginLeft: isMobile ? 0 : isCollapsed ? "64px" : "280px",
          transition: isInitialLoad ? "none" : "margin-left 0.2s ease-in-out",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Box style={{ maxWidth: "1600px", margin: "0 auto" }}>
          {/* Hero Section */}
          <Flex direction="column" align="center" mb="6">
            <Text
              size="8"
              weight="bold"
              align="center"
              className="pricing-title"
              style={{
                color: "var(--gray-12)",
                marginBottom: "12px",
              }}
            >
              Choose Your Plan
            </Text>
            <Text
              size="4"
              align="center"
              className="pricing-subtitle"
              style={{
                color: "var(--gray-11)",
                maxWidth: "600px",
                lineHeight: 1.6,
              }}
            >
              Get AI-powered coaching insights for Tennis, Padel, and Pickleball.
              Start free and upgrade as you grow.
            </Text>
          </Flex>

          {/* Pricing Cards */}
          <Box ref={scrollRef} className="pricing-grid">
            {plans.map((plan) => (
              <PlanCard
                key={`${plan.name}-${plan.subtitle || 'base'}`}
                plan={plan}
                onGetStarted={handleNewChat}
                onSignInClick={() => setAuthModalOpen(true)}
                isSignedIn={isSignedIn}
                onComingSoonClick={
                  plan.comingSoon
                    ? () => {
                        const interest = plan.subtitle === "Player" ? "pro-player" : "pro-coach";
                        setSelectedPlan({
                          name: `${plan.name} ${plan.subtitle}`,
                          interest: interest as "pro-player" | "pro-coach",
                        });
                        setWaitlistModalOpen(true);
                      }
                    : undefined
                }
                isMobile={isMobile}
              />
            ))}
          </Box>

          {/* Scroll Indicator Dots - Mobile Only */}
          {isMobile && (
            <Flex justify="center" gap="2" mt="4">
              {plans.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => scrollToCard(index)}
                  style={{
                    width: activeIndex === index ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    backgroundColor: activeIndex === index ? "var(--accent-9)" : "var(--gray-6)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </Flex>
          )}
        </Box>
      </Box>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />

      {/* Waitlist Modal */}
      {selectedPlan && (
        <WaitlistModal
          open={waitlistModalOpen}
          onOpenChange={setWaitlistModalOpen}
          planName={selectedPlan.name}
          planInterest={selectedPlan.interest}
        />
      )}
    </>
  );
}

