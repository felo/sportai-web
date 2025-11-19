# sportai-web

A Next.js application with minimal UI, Radix UI components, server-side rendering, and Gemini 3 integration.

## Features

- ⚡ Next.js 15 with App Router
- 🎨 Radix UI components for accessible UI
- 🔄 Server-side rendering
- 🤖 Gemini 3 API integration
- 💅 Tailwind CSS for styling
- 📝 TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

3. Add your Gemini API key to `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/
│   │   └── gemini/
│   │       └── route.ts      # API route for Gemini queries
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/
│   └── gemini-query-form.tsx # Gemini query form component
├── lib/
│   └── gemini.ts             # Gemini API utilities
└── package.json
```

## Usage

The app includes a simple form where you can query Gemini 3. The queries are processed server-side through the API route at `/api/gemini`.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript
- **Google Generative AI** - Gemini 3 API client

## License

MIT
