"use client";

import React from "react";
import { Box, Flex, Text, Heading, Table } from "@radix-ui/themes";
import { Sidebar } from "@/components/sidebar";
import { useSidebar } from "@/components/SidebarContext";
import { PageHeader } from "@/components/ui";

export function TermsPage() {
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
            Terms of Use
          </Heading>
          <Text size="2" color="gray" style={{ marginBottom: "40px", display: "block" }}>
            Last updated: December 2024
          </Text>

          <Flex direction="column" gap="6">
            {/* 1. Agreement to Terms */}
            <Section title="1. Agreement to Terms">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                These Terms of Use constitute a legally binding agreement made between you, whether personally 
                or on behalf of an entity (&quot;you&quot;) and SportAI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), concerning your 
                access to and use of SportAI Open, our AI-powered sports video analysis platform, as well as 
                any other media form, media channel, mobile website, or mobile application related, linked, 
                or otherwise connected thereto (collectively, the &quot;Service&quot;). You agree that by accessing 
                the Service, you have read, understood, and agree to be bound by all of these Terms of Use. 
                If you do not agree with all of these Terms of Use, then you are expressly prohibited from 
                using the Service and you must discontinue use immediately.
              </Text>
            </Section>

            {/* 2. Description of Service */}
            <Section title="2. Description of Service">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                SportAI Open is an AI-powered sports video analysis platform that provides:
              </Text>
              <DataTable
                headers={["Feature", "Description"]}
                rows={[
                  ["Technique Analysis", "AI-powered analysis of form, posture, and movement patterns"],
                  ["Tactical Insights", "Strategic analysis of positioning, shot selection, and gameplay"],
                  ["Pose Detection", "Automated detection of body positions and movements in video"],
                  ["AI Coaching", "Conversational AI that provides personalized coaching recommendations"],
                  ["Video Processing", "Upload and process videos for detailed analysis"],
                ]}
              />
            </Section>

            {/* 3. Intellectual Property Rights */}
            <Section title="3. Intellectual Property Rights">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                Unless otherwise indicated, the Service is our proprietary property and all source code, 
                databases, functionality, software, website designs, audio, video, text, photographs, graphics, 
                and AI models on the Service (collectively, the &quot;Content&quot;) and the trademarks, service marks, 
                and logos contained therein (the &quot;Marks&quot;) are owned or controlled by us or licensed to us, 
                and are protected by copyright and trademark laws and various other intellectual property rights. 
                The Content and the Marks are provided on the Service &quot;AS IS&quot; for your information and personal 
                use only. Except as expressly provided in these Terms of Use, no part of the Service and no 
                Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly 
                displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited 
                for any commercial purpose whatsoever, without our express prior written permission.
              </Text>
            </Section>

            {/* 4. User Representations */}
            <Section title="4. User Representations">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                By using the Service, you represent and warrant that:
              </Text>
              <DataTable
                headers={["#", "Representation"]}
                rows={[
                  ["1", "All registration information you submit will be true, accurate, current, and complete"],
                  ["2", "You will maintain the accuracy of such information and promptly update it as necessary"],
                  ["3", "You have the legal capacity and agree to comply with these Terms of Use"],
                  ["4", "You are not a minor in the jurisdiction in which you reside, or have parental consent"],
                  ["5", "You will not access the Service through automated or non-human means (bots, scripts)"],
                  ["6", "You will not use the Service for any illegal or unauthorized purpose"],
                  ["7", "Your use of the Service will not violate any applicable law or regulation"],
                  ["8", "You have rights to all content you upload, including videos of yourself or others"],
                ]}
              />
            </Section>

            {/* 5. Prohibited Activities */}
            <Section title="5. Prohibited Activities">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                You may not access or use the Service for any purpose other than that for which we make it 
                available. As a user of the Service, you agree not to:
              </Text>
              <DataTable
                headers={["Category", "Prohibited Activity"]}
                rows={[
                  ["Data Extraction", "Systematically retrieve data to create compilations or databases without permission"],
                  ["Unauthorized Use", "Collect usernames/emails for unsolicited messages or create accounts under false pretenses"],
                  ["Commercial Misuse", "Use the Service to advertise or sell goods/services without authorization"],
                  ["Framing/Linking", "Engage in unauthorized framing of or linking to the Service"],
                  ["Deception", "Trick, defraud, or mislead us or other users, especially regarding account information"],
                  ["Automation", "Use scripts, bots, data mining, or similar tools without authorization"],
                  ["Interference", "Interfere with or create an undue burden on the Service or connected networks"],
                  ["Impersonation", "Attempt to impersonate another user or person"],
                  ["Account Transfer", "Sell or otherwise transfer your profile or account"],
                  ["Harassment", "Use information from the Service to harass, abuse, or harm another person"],
                  ["Competition", "Use the Service to compete with us or for revenue-generating endeavors"],
                  ["Reverse Engineering", "Decipher, decompile, disassemble, or reverse engineer any software or AI models"],
                  ["Security Bypass", "Attempt to bypass any security measures or access restrictions"],
                  ["Employee Harassment", "Harass, annoy, or threaten our employees or agents"],
                  ["Copyright Removal", "Delete copyright or proprietary rights notices from any Content"],
                  ["Code Copying", "Copy or adapt the Service's software, including AI models and algorithms"],
                  ["Malware", "Upload viruses, Trojan horses, or other malicious material"],
                  ["Tracking", "Upload material that acts as passive/active information collection mechanisms"],
                  ["Unauthorized Videos", "Upload videos containing individuals who have not consented to being recorded/analyzed"],
                ]}
              />
            </Section>

            {/* 6. User Generated Contributions */}
            <Section title="6. User Generated Contributions">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                The Service allows you to upload videos, images, and other content (&quot;Contributions&quot;) for 
                AI-powered analysis. When you create or make available any Contributions, you represent and 
                warrant that:
              </Text>
              <DataTable
                headers={["Category", "Your Warranty"]}
                rows={[
                  ["Ownership Rights", "You are the creator/owner or have necessary licenses, rights, and permissions"],
                  ["Third-Party Rights", "Your Contributions do not infringe any copyright, patent, trademark, or moral rights"],
                  ["Consent", "You have written consent from every identifiable person appearing in your videos"],
                  ["Accuracy", "Your Contributions are not false, inaccurate, or misleading"],
                  ["No Spam", "Your Contributions are not unsolicited advertising, spam, or promotional materials"],
                  ["Appropriate Content", "Your Contributions are not obscene, lewd, violent, harassing, or objectionable"],
                  ["No Harassment", "Your Contributions do not ridicule, mock, disparage, or abuse anyone"],
                  ["No Violence", "Your Contributions do not incite or threaten physical harm against another"],
                  ["Legal Compliance", "Your Contributions do not violate any applicable law or regulation"],
                  ["Privacy", "Your Contributions do not violate privacy or publicity rights of any third party"],
                  ["Minor Protection", "Your Contributions do not exploit or solicit information from minors"],
                  ["Non-Discrimination", "Your Contributions do not include offensive comments about protected characteristics"],
                ]}
              />
            </Section>

            {/* 7. Contribution License */}
            <Section title="7. Contribution License">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                By uploading Contributions to the Service, you automatically grant us:
              </Text>
              <DataTable
                headers={["License Term", "Description"]}
                rows={[
                  ["Scope", "Non-exclusive, worldwide, royalty-free license"],
                  ["Rights Granted", "To host, use, copy, reproduce, store, cache, process, and analyze"],
                  ["Purpose", "To provide AI-powered analysis, improve our services, and train AI models"],
                  ["Duration", "Until you delete your content or close your account"],
                  ["Derivatives", "To prepare derivative works (analysis results, insights, statistics)"],
                  ["AI Training", "To use anonymized, aggregated data to improve our AI models"],
                ]}
              />
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginTop: "16px" }}>
                <strong>Important:</strong> You retain ownership of your original video content. The license 
                granted above is solely for the purpose of providing and improving the Service. We will not 
                sell your videos or share them publicly without your explicit consent.
              </Text>
            </Section>

            {/* 8. AI Analysis Disclaimer */}
            <Section title="8. AI Analysis Disclaimer">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                SportAI Open uses artificial intelligence to analyze your content. You acknowledge and agree that:
              </Text>
              <DataTable
                headers={["Disclaimer", "Details"]}
                rows={[
                  ["Not Professional Advice", "AI analysis is for informational purposes only, not professional coaching"],
                  ["No Medical Advice", "Analysis should not replace medical advice or physical therapy guidance"],
                  ["Accuracy Limitations", "AI may produce errors or inaccurate analysis in some circumstances"],
                  ["No Guarantees", "We do not guarantee specific performance improvements from using the Service"],
                  ["Use at Own Risk", "You assume all risk associated with acting on AI-generated recommendations"],
                ]}
              />
            </Section>

            {/* 9. Disclaimer of Warranties */}
            <Section title="9. Disclaimer of Warranties">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                THE SERVICE IS PROVIDED ON AN &quot;AS-IS&quot; AND &quot;AS-AVAILABLE&quot; BASIS. YOU AGREE THAT YOUR USE 
                OF THE SERVICE WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM 
                ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICE AND YOUR USE THEREOF, 
                INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT 
                THE ACCURACY OR COMPLETENESS OF THE SERVICE&apos;S CONTENT OR THE CONTENT OF ANY WEBSITES LINKED 
                TO THE SERVICE AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY ERRORS, MISTAKES, 
                OR INACCURACIES OF CONTENT.
              </Text>
            </Section>

            {/* 10. Limitation of Liability */}
            <Section title="10. Limitation of Liability">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD 
                PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE 
                DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM 
                YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. 
                NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO YOU FOR ANY 
                CAUSE WHATSOEVER AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO 
                THE AMOUNT PAID, IF ANY, BY YOU TO US DURING THE SIX (6) MONTH PERIOD PRIOR TO ANY CAUSE OF 
                ACTION ARISING.
              </Text>
            </Section>

            {/* 11. Modifications and Interruptions */}
            <Section title="11. Modifications and Interruptions">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                We reserve the right to change, modify, or remove the contents of the Service at any time 
                or for any reason at our sole discretion without notice. However, we have no obligation to 
                update any information on our Service. We also reserve the right to modify or discontinue 
                all or part of the Service without notice at any time. We will not be liable to you or any 
                third party for any modification, price change, suspension, or discontinuance of the Service. 
                We cannot guarantee the Service will be available at all times. We may experience hardware, 
                software, or other problems or need to perform maintenance related to the Service, resulting 
                in interruptions, delays, or errors.
              </Text>
            </Section>

            {/* 12. Governing Law */}
            <Section title="12. Governing Law">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                These Terms shall be governed by and defined following the laws of Norway. SportAI and 
                yourself irrevocably consent that the courts of Norway shall have exclusive jurisdiction 
                to resolve any dispute which may arise in connection with these terms.
              </Text>
            </Section>

            {/* 13. Changes to Terms */}
            <Section title="13. Changes to Terms">
              <Text as="p" size="3" style={{ lineHeight: 1.7 }}>
                We may update these Terms of Use from time to time. We will notify you of any material 
                changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date. 
                Your continued use of the Service after any changes constitutes your acceptance of the 
                new Terms. You are advised to review these Terms periodically for any changes.
              </Text>
            </Section>

            {/* 14. Contact Us */}
            <Section title="14. Contact Us">
              <Text as="p" size="3" style={{ lineHeight: 1.7, marginBottom: "16px" }}>
                In order to resolve a complaint regarding the Service or to receive further information, 
                please contact us:
              </Text>
              <DataTable
                headers={["Contact Method", "Details"]}
                rows={[
                  ["Email", "support@sportai.com"],
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
