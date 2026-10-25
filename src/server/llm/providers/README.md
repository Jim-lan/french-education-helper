# Provider adapters

- `gemini.ts`: functional image/text adapter using Gemini's generateContent REST
  API, structured JSON output, bounded response reading, cancellation, and safe errors.
- `openai.ts`: future adapter using the same contract.
- `xai.ts`: future xAI/Grok adapter using the same contract.

Adapter modules import `server-only`. `../provider-factory.ts` reads validated
server configuration and supplies credentials only to the selected adapter.
Unsupported providers return a configuration error until implemented.

The application owns the prompt, response schema, validation, and sentence derivation.
No provider SDK types belong in the shared browser-facing types.

To add a provider:

1. Implement `LLMProvider` from `../types.ts`, keeping its wire format private.
2. Normalize provider output into `AnalysisContent`; never return generated HTML.
3. Register configuration and construction in `server/config.ts` and the factory.
4. Add mocked transport/normalization tests. UI and service components stay unchanged.

`tests/analyze.test.ts` verifies the service using a test-only adapter with a
different provider ID. No fake provider is available through production configuration.

References: [Gemini REST API](https://ai.google.dev/api/generate-content),
[structured output](https://ai.google.dev/gemini-api/docs/structured-output),
[configured default model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).
