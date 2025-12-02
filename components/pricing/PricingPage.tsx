"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Text, Button, Badge, Card } from "@radix-ui/themes";
import { CheckIcon, RocketIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import { Sidebar } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PageHeader } from "@/components/ui";
import { createNewChat, setCurrentChatId } from "@/utils/storage-unified";
import buttonStyles from "@/styles/buttons.module.css";

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
    priceNote: "forever",
    description: "Perfect for getting started with AI-powered sports analysis",
    features: [
      { text: "Unlimited AI coaching conversations", included: true },
      { text: "Upload and analyze short clips (100MB, ~2-3 minutes)", included: true },
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
    price: "$15",
    priceNote: "/month",
    description: "For athletes looking to improve their game",
    features: [
      { text: "Everything in Free, plus:", included: true },
      { text: "Video analysis up to 30 min per video", included: true },
      { text: "5GB video storage", included: true },
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
    price: "$30",
    priceNote: "/month",
    description: "Advanced tools for coaches and serious athletes",
    features: [
      { text: "Everything in PRO Player, plus:", included: true },
      { text: "Full-length match analysis (up to 2 hours per video)", included: true },
      { text: "50GB video storage", included: true },
      { text: "Player tracking & movement analysis", included: true },
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

function PlanCard({ plan, onGetStarted, isMobile }: { plan: PricingPlan; onGetStarted: () => void; isMobile: boolean }) {
  // Determine button style based on plan type
  const getButtonClass = () => {
    if (plan.contactSales) return buttonStyles.actionButtonSquareSecondary;
    return buttonStyles.actionButtonSquare;
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
              fontSize: plan.price === "Custom" ? "32px" : "48px",
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
        disabled={plan.disabled}
        className={getButtonClass()}
        onClick={() => {
          if (plan.contactSales) {
            window.open("https://sportai.com/contact", "_blank");
          } else if (!plan.disabled) {
            onGetStarted();
          }
        }}
        style={{
          width: "100%",
          height: "48px",
        }}
      >
        {plan.contactSales && <ChatBubbleIcon width={16} height={16} />}
        {plan.name === "Free" && <RocketIcon width={16} height={16} />}
        {plan.cta}
      </Button>
    </Card>
  );
}

export function PricingPage() {
  const router = useRouter();
  const { isCollapsed, isInitialLoad } = useSidebar();
  const isMobile = useIsMobile();

  // Handle creating a new chat and navigating to it
  const handleNewChat = useCallback(async () => {
    const newChat = await createNewChat();
    setCurrentChatId(newChat.id);
    router.push("/");
  }, [router]);

  return (
    <>
      <Sidebar />
      <PageHeader onNewChat={handleNewChat} />
      <Box
        className={`page-content-wrapper ${!isCollapsed ? 'sidebar-expanded' : ''} ${isInitialLoad ? 'no-transition' : ''}`}
        style={{
          height: "100%",
          backgroundColor: "var(--gray-1)",
          padding: "24px",
          paddingTop: isMobile ? "calc(57px + 48px + env(safe-area-inset-top))" : "calc(57px + 48px)",
          paddingBottom: "96px",
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
              Get AI-powered coaching insights for tennis, padel, and pickleball.
              Start free and upgrade as you grow.
            </Text>
          </Flex>

          {/* Pricing Cards */}
          <Box className="pricing-grid">
            {plans.map((plan) => (
              <PlanCard key={`${plan.name}-${plan.subtitle || 'base'}`} plan={plan} onGetStarted={handleNewChat} isMobile={isMobile} />
            ))}
          </Box>
        </Box>
      </Box>

      {/* CSS for responsive grid and hover effects */}
      <style jsx global>{`
        .pricing-title {
          font-size: 40px;
        }
        
        .pricing-subtitle {
          font-size: 18px;
        }
        
        @media (max-width: 900px) {
          .pricing-title {
            font-size: 34px;
          }
          
          .pricing-subtitle {
            font-size: 16px;
          }
        }
        
        @media (max-width: 640px) {
          .pricing-title {
            font-size: 28px;
          }
          
          .pricing-subtitle {
            font-size: 15px;
          }
        }
        
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: stretch;
        }
        
        @media (max-width: 440px) {
          .pricing-card {
            min-width: 100%;
          }
        }
        
        @media (min-width: 640px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 480px;
            margin: 0 auto;
          }
        }
        
        @media (min-width: 900px) {
          .pricing-grid {
            grid-template-columns: repeat(2, 1fr);
            max-width: 800px;
          }
        }
        
        @media (min-width: 1200px) {
          .pricing-grid {
            grid-template-columns: repeat(4, 1fr);
            max-width: none;
          }
        }
        
        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </>
  );
}

