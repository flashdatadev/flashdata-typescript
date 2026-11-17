# FlashData TypeScript SDK 1.3.0

[FlashData](https://flashdata.dev) · [API documentation](https://flashdata.dev/docs)

Use temporary cloud credentials with the optional `session_token` storage field.
S3, S3-compatible storage, OSS, COS, BOS and TOS support this field alongside the
access key ID and secret. GCS authentication is unchanged.

- Single downloads, batches and bulk delivery preserve the session token.
- Session tokens are redacted from SDK errors and diagnostics.
- Existing storage configurations without a session token remain compatible.
- Credentials must remain valid for the upload. Paused bulk result delivery can
  resume with renewed storage credentials; the SDK does not issue or refresh STS credentials.

See the [storage examples](storage.md) for temporary credentials and bulk renewal.
