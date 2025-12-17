"use client";

import React from "react";
import { Box, Flex, Text, Heading, Table } from "@radix-ui/themes";
import { Sidebar } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { PageHeader } from "@/components/ui";

export function PrivacyPage() {
  const { isCollapsed, isInitialLoad } = useSidebar();

  return (
    <Box style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <PageHeader />
      <Sidebar />
      
      <Box
        style={{
          flex: 1,
          overflow: "auto",
          paddingTop: "calc(57px + 48px)",
          marginLeft: isCollapsed ? "64px" : "280px",
          transition: isInitialLoad ? "none" : "margin-left 0.2s ease-in-out",
        }}
      >
        <Box
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "48px 24px",
          }}
        >
          <Heading size="8" weight="bold" style={{ marginBottom: "8px" }}>
            Privacy Policy
          </Heading>
          <Text size="2" color="gray" style={{ marginBottom: "40px", display: "block" }}>
            Last updated: December 2024
          </Text>

          <Flex direction="column" gap="6">
            {/* 1. Introduction */}
            <Section title="1. Introduction">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                Welcome to SportAI Open. SportAI (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting 
                and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard 
                your information when you use SportAI Open, our AI-powered sports video analysis platform. Please read 
                this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not 
                access the service.
              </Text>
            </Section>

            {/* 2. Information We Collect */}
            <Section title="2. Information We Collect">
              <Heading size="3" weight="medium" style={{ marginBottom: "12px", marginTop: "8px" }}>
                2.1 Personal Data
              </Heading>
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                We may collect personally identifiable information that you voluntarily provide when you register 
                or use our services:
              </Text>
              <DataTable
                headers={["Data Type", "Examples", "Purpose"]}
                rows={[
                  ["Account Information", "Name, email address", "Account creation and authentication"],
                  ["Profile Data", "Sport preferences, skill level", "Personalized analysis"],
                  ["Communication Data", "Chat messages, prompts, feedback", "Provide AI coaching, improve responses, and train AI models"],
                ]}
              />

              <Heading size="3" weight="medium" style={{ marginBottom: "12px", marginTop: "24px" }}>
                2.2 Uploaded Content
              </Heading>
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                When you upload videos or images for analysis, we process the following:
              </Text>
              <DataTable
                headers={["Content Type", "Processing", "Retention"]}
                rows={[
                  ["Videos", "AI pose detection, technique analysis", "Until you delete or account closure"],
                  ["Images", "Frame extraction, visual analysis", "Until you delete or account closure"],
                  ["Analysis Results", "Technique scores, recommendations", "Linked to your account"],
                ]}
              />

              <Heading size="3" weight="medium" style={{ marginBottom: "12px", marginTop: "24px" }}>
                2.3 Derivative Data
              </Heading>
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                Information our servers automatically collect when you access the service:
              </Text>
              <DataTable
                headers={["Data Type", "Examples"]}
                rows={[
                  ["Device Information", "Browser type, operating system, device type"],
                  ["Usage Data", "Pages viewed, features used, session duration"],
                  ["Log Data", "IP address, access times, referring URLs"],
                ]}
              />

              <Heading size="3" weight="medium" style={{ marginBottom: "12px", marginTop: "24px" }}>
                2.4 Cookies and Tracking
              </Heading>
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                We use cookies and similar technologies:
              </Text>
              <DataTable
                headers={["Cookie Type", "Purpose", "Duration"]}
                rows={[
                  ["Essential", "Authentication, security, preferences", "Session / 1 year"],
                  ["Analytics", "Usage patterns, performance monitoring", "Up to 2 years"],
                  ["Functional", "Remember settings, consent choices", "1 year"],
                ]}
              />
            </Section>

            {/* 3. How We Use Your Information */}
            <Section title="3. How We Use Your Information">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                We use your information for the following purposes:
              </Text>
              <DataTable
                headers={["Purpose", "Legal Basis (GDPR)"]}
                rows={[
                  ["Provide AI-powered video analysis", "Contract performance"],
                  ["Create and manage your account", "Contract performance"],
                  ["Process uploaded videos with our AI models", "Contract performance"],
                  ["Personalize coaching recommendations", "Legitimate interest"],
                  ["Improve AI responses based on chat interactions", "Legitimate interest"],
                  ["Train and improve our AI models", "Legitimate interest"],
                  ["Send service updates and notifications", "Contract performance"],
                  ["Respond to support requests", "Contract performance"],
                  ["Prevent fraud and ensure security", "Legitimate interest"],
                  ["Comply with legal obligations", "Legal obligation"],
                ]}
              />
            </Section>

            {/* 4. AI Processing */}
            <Section title="4. AI and Automated Processing">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                SportAI Open uses artificial intelligence to analyze your uploaded content:
              </Text>
              <DataTable
                headers={["AI Feature", "What It Does", "Data Used"]}
                rows={[
                  ["Pose Detection", "Identifies body positions and movements", "Video frames"],
                  ["Technique Analysis", "Evaluates form and provides feedback", "Pose data, sport context"],
                  ["Shot Detection", "Identifies and classifies shots/strokes", "Video, pose sequences"],
                  ["Tactical Analysis", "Analyzes positioning and strategy", "Video, court detection"],
                  ["AI Chat", "Provides coaching recommendations and learns from interactions", "Analysis results, your prompts and messages"],
                ]}
              />
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginTop: "16px" }}>
                <strong>Note:</strong> AI-generated analysis is for informational purposes only and should not replace 
                professional coaching or medical advice.
              </Text>
            </Section>

            {/* 5. Disclosure of Information */}
            <Section title="5. Disclosure of Your Information">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                We may share your information in the following situations:
              </Text>
              <DataTable
                headers={["Recipient", "Purpose", "Safeguards"]}
                rows={[
                  ["Cloud Providers (AWS)", "Video storage and processing", "DPA, EU data centers"],
                  ["AI Service Providers", "Advanced analysis features", "DPA, data minimization"],
                  ["Analytics Providers", "Service improvement", "Anonymized data only"],
                  ["Legal Authorities", "When required by law", "Only as legally required"],
                  ["Business Transfers", "In case of merger/acquisition", "Successor bound by policy"],
                ]}
              />
            </Section>

            {/* 6. Sub-processors */}
            <Section title="6. Sub-processors">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                We use the following third-party service providers to process your data:
              </Text>
              <DataTable
                headers={["Provider", "Service", "Location", "Data Processed"]}
                rows={[
                  ["Amazon Web Services (AWS)", "Cloud hosting, video storage", "EU (Frankfurt)", "All user data"],
                  ["Supabase", "Authentication, database", "EU", "Account data"],
                  ["Vercel", "Web hosting", "Global (edge)", "Usage data"],
                ]}
              />
            </Section>

            {/* 7. Data Retention */}
            <Section title="7. Data Retention">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                We retain your data for the following periods:
              </Text>
              <DataTable
                headers={["Data Type", "Retention Period", "After Deletion"]}
                rows={[
                  ["Account Information", "Until account deletion", "30 days backup retention"],
                  ["Uploaded Videos", "Until you delete them", "Immediately removed"],
                  ["Analysis Results", "Linked to video lifecycle", "Deleted with video"],
                  ["Chat History", "Until you delete or account closure", "30 days backup retention"],
                  ["Usage Logs", "90 days", "Automatically purged"],
                ]}
              />
            </Section>

            {/* 8. Security */}
            <Section title="8. Security of Your Information">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                We implement the following security measures:
              </Text>
              <DataTable
                headers={["Measure", "Description"]}
                rows={[
                  ["Encryption in Transit", "TLS 1.3 for all data transfers"],
                  ["Encryption at Rest", "AES-256 for stored videos and data"],
                  ["Access Controls", "Role-based access, principle of least privilege"],
                  ["Authentication", "Secure authentication via Supabase Auth"],
                  ["Monitoring", "Continuous security monitoring and logging"],
                ]}
              />
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginTop: "16px" }}>
                While we take reasonable steps to protect your information, no method of transmission over the 
                Internet or electronic storage is 100% secure.
              </Text>
            </Section>

            {/* 9. Your Rights */}
            <Section title="9. Your Privacy Rights">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                If you are in the European Economic Area (EEA) or UK, you have the following rights under GDPR:
              </Text>
              <DataTable
                headers={["Right", "Description", "How to Exercise"]}
                rows={[
                  ["Access", "Request copies of your personal data", "Email privacy@sportai.com"],
                  ["Rectification", "Correct inaccurate or incomplete data", "Account settings or email us"],
                  ["Erasure", "Request deletion of your data", "Delete account or email us"],
                  ["Restrict Processing", "Limit how we use your data", "Email privacy@sportai.com"],
                  ["Object", "Object to certain processing", "Email privacy@sportai.com"],
                  ["Data Portability", "Receive your data in portable format", "Email privacy@sportai.com"],
                  ["Withdraw Consent", "Withdraw consent at any time", "Cookie settings or email us"],
                ]}
              />
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginTop: "16px" }}>
                To exercise any of these rights, please contact us at{" "}
                <a href="mailto:privacy@sportai.com" style={{ color: "var(--mint-11)", textDecoration: "underline" }}>
                  privacy@sportai.com
                </a>. We will respond within 30 days.
              </Text>
            </Section>

            {/* 10. Children */}
            <Section title="10. Children's Privacy">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                SportAI Open is not intended for children under the age of 13. We do not knowingly collect personal 
                information from children under 13. If we learn that we have collected personal information from a 
                child under 13 without verification of parental consent, we will delete that information as quickly 
                as possible. If you believe we might have any information from or about a child under 13, please 
                contact us at{" "}
                <a href="mailto:privacy@sportai.com" style={{ color: "var(--mint-11)", textDecoration: "underline" }}>
                  privacy@sportai.com
                </a>.
              </Text>
            </Section>

            {/* 11. International Transfers */}
            <Section title="11. International Data Transfers">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                Your data is primarily stored and processed in the European Union. If we transfer data outside 
                the EEA, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs) 
                or adequacy decisions.
              </Text>
            </Section>

            {/* 12. Changes */}
            <Section title="12. Changes to This Policy">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                We may update this Privacy Policy from time to time. We will notify you of any material changes 
                by posting the new policy on this page and updating the &quot;Last updated&quot; date. For significant 
                changes, we may also notify you via email or through a notice on our service.
              </Text>
            </Section>

            {/* 13. Contact */}
            <Section title="13. Contact Us">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
              </Text>
              <DataTable
                headers={["Contact Method", "Details"]}
                rows={[
                  ["Email", "privacy@sportai.com"],
                  ["Phone", "+47 464 23 779"],
                  ["Address", "Tordenskiolds gate 2, 4th Floor, 0160 Oslo, Norway"],
                ]}
              />
            </Section>
          </Flex>

          <Box style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid var(--gray-6)" }}>
            <Text size="2" color="gray">
              © {new Date().getFullYear()} SportAI. All rights reserved.
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Heading size="4" weight="medium" style={{ marginBottom: "12px", color: "var(--mint-11)" }}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Table.Root size="1" style={{ width: "100%" }}>
        <Table.Header>
          <Table.Row>
            {headers.map((header, i) => (
              <Table.ColumnHeaderCell key={i} style={{ color: "var(--gray-11)", fontWeight: 500 }}>
                {header}
              </Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row, i) => (
            <Table.Row key={i}>
              {row.map((cell, j) => (
                <Table.Cell key={j} style={{ color: "var(--gray-12)" }}>
                  {cell}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
