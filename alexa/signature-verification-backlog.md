# Alexa Request Signature Verification (Backlog)

## Status: Backlog — future enhancement

## Current Auth

The `alexa-shopping` Edge Function uses a shared API key passed as a query parameter (`?api_key=...`). This is adequate for a private personal skill but not cryptographically verified.

## What Signature Verification Does

Every request from Alexa includes two headers:
- `SignatureCertChainUrl` — URL of the signing certificate (hosted on `s3.amazonaws.com/echo.api/`)
- `Signature-256` — Base64-encoded SHA-256 signature of the request body

Verifying these proves the request genuinely came from Amazon's Alexa service — not from someone who discovered the Edge Function URL.

## Implementation Steps

1. **Extract headers:** Read `SignatureCertChainUrl` and `Signature-256` from the incoming request
2. **Validate certificate URL:** Confirm it matches `https://s3.amazonaws.com/echo.api/` (protocol, host, path prefix, port)
3. **Fetch and cache the certificate:** Download the PEM certificate from the URL. Cache it to avoid fetching on every request.
4. **Verify the signature:** Use the certificate's public key to verify the `Signature-256` against the raw request body bytes (SHA-256 with RSA PKCS#1 v1.5)
5. **Check timestamp:** Parse `request.timestamp` from the request body. Reject if older than 150 seconds (prevents replay attacks).

## Deno Implementation Notes

- Deno has native `crypto.subtle` for signature verification
- Certificate parsing may need `x509` module from deno.land
- Cache certificates in a `Map<string, { cert: CryptoKey; expires: number }>` with TTL

## Amazon Documentation

- https://developer.amazon.com/en-US/docs/alexa/custom-skills/host-a-custom-skill-as-a-web-service.html#verifying-that-the-request-was-sent-by-alexa

## When to Implement

When/if the API key approach feels insufficient — e.g., if the Edge Function URL leaks or if additional security is desired. With signature verification, the `ALEXA_API_KEY` can be removed entirely.
