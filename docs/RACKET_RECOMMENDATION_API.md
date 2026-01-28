# Racket Recommendation API

> Extension to the Pickleball Technique Chat API for paddle recommendations.

## Overview

The racket recommendation feature analyzes the player's swing data and recommends the most suitable paddle from the Shark catalog. When enabled, the API returns:

1. **Structured recommendation data** (JSON) - the recommended paddle with full details
2. **Streamed explanation** (text) - a personalized explanation of why this paddle is recommended

## Enabling Racket Recommendation

Add `racketRecommendation: true` to your existing request:

```json
{
  "prompt": "What paddle would you recommend for me?",
  "swingContext": { ... },
  "agentName": "Shark",
  "insightLevel": "developing",
  "racketRecommendation": true
}
```

## Response Format Change

When `racketRecommendation: true`, the response format changes from plain text to **Server-Sent Events (SSE)**.

| Parameter | Content-Type | Format |
|-----------|--------------|--------|
| `racketRecommendation: false` (default) | `text/plain` | Streamed text |
| `racketRecommendation: true` | `text/event-stream` | SSE events |

## SSE Event Types

The response contains three event types in order:

### 1. `recommendation` Event

Sent first, contains the structured paddle recommendation:

```
event: recommendation
data: {"racket":{"name":"Shark-Hunter","price_usd":129.9,"focus":"Balanced control and power (all-court)","target_players":["Competitive intermediate players","Advanced players"],"characteristics":["Stable construction","Controlled power","Likely carbon face","Enhanced spin","Solid feel"],"strengths":["Strong all-around performance","Effective for target-based, pressure play"],"limitations":["Requires better technique than entry-level paddles"]},"confidence":"high","primary_reasons":["Your intermediate skill level matches this paddle's target players","Good balance metrics suggest you can handle controlled power","Stability features will help with your stance improvements"]}
```

### 2. `text` Events

Sent multiple times as the explanation streams:

```
event: text
data: Based on your swing analysis, I can see you've got some solid fundamentals...

event: text
data:  Your body movement is looking great, and that's exactly the kind of...
```

### 3. `done` Event

Sent when the stream is complete:

```
event: done
data: {}
```

### Error Event (if something goes wrong)

```
event: error
data: {"error":"Failed to parse recommendation"}
```

## Recommendation Data Structure

```typescript
interface RacketRecommendation {
  racket: {
    name: string;           // e.g., "Shark-Hunter"
    price_usd: number;      // e.g., 129.90
    focus: string;          // e.g., "Balanced control and power (all-court)"
    target_players: string[];
    characteristics: string[];
    strengths: string[];
    limitations: string[];
  };
  confidence: "high" | "medium" | "low";
  primary_reasons: string[];  // 2-3 brief reasons for the recommendation
}
```

## Available Paddles

| Name | Price | Focus |
|------|-------|-------|
| Shark-Bite | $89.90 | Control & entry-level play |
| Shark-Speedy | $119.90 | Speed & maneuverability |
| Shark-Hunter | $129.90 | Balanced control and power |
| Shark-Torpedo | $149.90 | Power & aggression |

## Swift Implementation Example

### Parsing SSE Events

```swift
import Foundation

struct RacketRecommendation: Codable {
    let racket: Racket
    let confidence: String
    let primaryReasons: [String]

    enum CodingKeys: String, CodingKey {
        case racket
        case confidence
        case primaryReasons = "primary_reasons"
    }
}

struct Racket: Codable {
    let name: String
    let priceUsd: Double
    let focus: String
    let targetPlayers: [String]
    let characteristics: [String]
    let strengths: [String]
    let limitations: [String]

    enum CodingKeys: String, CodingKey {
        case name
        case priceUsd = "price_usd"
        case focus
        case targetPlayers = "target_players"
        case characteristics
        case strengths
        case limitations
    }
}

class TechniqueChatService {

    func requestRacketRecommendation(
        prompt: String,
        swingContext: [String: Any],
        onRecommendation: @escaping (RacketRecommendation) -> Void,
        onText: @escaping (String) -> Void,
        onComplete: @escaping () -> Void,
        onError: @escaping (Error) -> Void
    ) {
        var request = URLRequest(url: URL(string: "https://your-api.com/api/external/pickleball/technique-chat")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "prompt": prompt,
            "swingContext": swingContext,
            "agentName": "Shark",
            "insightLevel": "developing",
            "racketRecommendation": true
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                onError(error)
                return
            }

            guard let data = data,
                  let text = String(data: data, encoding: .utf8) else {
                return
            }

            self.parseSSEResponse(text: text,
                                  onRecommendation: onRecommendation,
                                  onText: onText,
                                  onComplete: onComplete,
                                  onError: onError)
        }
        task.resume()
    }

    private func parseSSEResponse(
        text: String,
        onRecommendation: @escaping (RacketRecommendation) -> Void,
        onText: @escaping (String) -> Void,
        onComplete: @escaping () -> Void,
        onError: @escaping (Error) -> Void
    ) {
        var currentEvent = ""

        let lines = text.components(separatedBy: "\n")

        for line in lines {
            if line.hasPrefix("event: ") {
                currentEvent = String(line.dropFirst(7))
            } else if line.hasPrefix("data: ") {
                let data = String(line.dropFirst(6))

                switch currentEvent {
                case "recommendation":
                    if let jsonData = data.data(using: .utf8),
                       let recommendation = try? JSONDecoder().decode(RacketRecommendation.self, from: jsonData) {
                        DispatchQueue.main.async {
                            onRecommendation(recommendation)
                        }
                    }

                case "text":
                    DispatchQueue.main.async {
                        onText(data)
                    }

                case "done":
                    DispatchQueue.main.async {
                        onComplete()
                    }

                case "error":
                    if let jsonData = data.data(using: .utf8),
                       let errorDict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: String],
                       let errorMessage = errorDict["error"] {
                        DispatchQueue.main.async {
                            onError(NSError(domain: "TechniqueChat", code: -1,
                                          userInfo: [NSLocalizedDescriptionKey: errorMessage]))
                        }
                    }

                default:
                    break
                }
            }
        }
    }
}
```

### Using with URLSession Streaming (Recommended)

For real-time streaming as data arrives:

```swift
func streamRacketRecommendation(
    prompt: String,
    swingContext: [String: Any]
) -> AsyncThrowingStream<SSEEvent, Error> {

    return AsyncThrowingStream { continuation in
        var request = URLRequest(url: URL(string: "https://your-api.com/api/external/pickleball/technique-chat")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "prompt": prompt,
            "swingContext": swingContext,
            "racketRecommendation": true
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            // Parse SSE and yield events via continuation
            // ...
        }
        task.resume()

        continuation.onTermination = { _ in
            task.cancel()
        }
    }
}

enum SSEEvent {
    case recommendation(RacketRecommendation)
    case text(String)
    case done
    case error(String)
}
```

### Usage in SwiftUI

```swift
struct RacketRecommendationView: View {
    @State private var recommendation: RacketRecommendation?
    @State private var explanationText = ""
    @State private var isLoading = false

    let chatService = TechniqueChatService()

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let rec = recommendation {
                // Show recommendation card
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(rec.racket.name)
                            .font(.title2.bold())
                        Spacer()
                        Text("$\(rec.racket.priceUsd, specifier: "%.2f")")
                            .foregroundColor(.green)
                    }

                    Text(rec.racket.focus)
                        .foregroundColor(.secondary)

                    Text("Confidence: \(rec.confidence)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(confidenceColor(rec.confidence))
                        .cornerRadius(4)
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
            }

            if !explanationText.isEmpty {
                Text(explanationText)
                    .font(.body)
            }

            if isLoading {
                ProgressView()
            }
        }
        .onAppear {
            fetchRecommendation()
        }
    }

    func fetchRecommendation() {
        isLoading = true

        chatService.requestRacketRecommendation(
            prompt: "What paddle would you recommend?",
            swingContext: playerSwingContext,
            onRecommendation: { rec in
                self.recommendation = rec
            },
            onText: { text in
                self.explanationText += text
            },
            onComplete: {
                self.isLoading = false
            },
            onError: { error in
                self.isLoading = false
                print("Error: \(error)")
            }
        )
    }

    func confidenceColor(_ confidence: String) -> Color {
        switch confidence {
        case "high": return .green.opacity(0.3)
        case "medium": return .yellow.opacity(0.3)
        default: return .orange.opacity(0.3)
        }
    }
}
```

## Testing

Use the test page at `/api-test` to experiment with the racket recommendation feature:

1. Enable "Include Racket Recommendation" checkbox
2. Adjust swing context parameters as needed
3. Observe the SSE response format in browser dev tools

## Notes

- The recommendation is based on swing analysis data, not the user's prompt
- Scores in swing data are used for internal evaluation but not shown to users
- The explanation is personalized and encouraging, avoiding negative reinforcement
- Latency is slightly higher (~200-500ms) due to the structured recommendation call

## Questions?

Contact the SportAI team for API support.
