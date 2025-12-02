"use client";

import { RefObject } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { StarIcon } from "@radix-ui/react-icons";
import { Highlight } from "../../types";
import { HighlightsCard } from "../HighlightsCard";

interface HighlightsTabProps {
  highlights: Highlight[] | undefined;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function HighlightsTab({ highlights, videoRef }: HighlightsTabProps) {
  if (!highlights || highlights.length === 0) {
    return (
      <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
        <Flex
          align="center"
          justify="center"
          direction="column"
          gap="3"
          style={{ padding: "60px 20px" }}
        >
          <StarIcon width={48} height={48} style={{ color: "var(--gray-8)" }} />
          <Text size="3" color="gray">No highlights detected</Text>
          <Text size="2" color="gray">Key moments from the match will appear here</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box style={{ animation: "fadeIn 0.2s ease-out" }}>
      <HighlightsCard highlights={highlights} videoRef={videoRef} />
    </Box>
  );
}




