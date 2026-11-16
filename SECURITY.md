# Security policy

## Reporting a vulnerability

Please use GitHub private vulnerability reporting: open the **Security** tab of the repository and choose **Report a vulnerability** (https://github.com/yevhenjl/rn-realtime-market/security/advisories/new). Do not open a public issue for a vulnerability.

The project is maintained by one person; there is no response-time guarantee, but reports are read.

## Scope

- The app uses public Binance market data only. There are no accounts, no orders and no API keys or secrets in the project, and none should be added.
- The app talks to `wss://data-stream.binance.vision` and `https://data-api.binance.vision` only.
- Only the latest commit on `main` is supported.

If you find a committed key, token or personal data, report it the same way.
