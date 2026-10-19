# Security

Report suspected vulnerabilities privately to support@flashdata.dev. Include the SDK version,
runtime version and a minimal reproduction with fabricated credentials. Do not attach real
API keys, storage credentials, signed URLs or private result data to public issues.

API keys are sent in `X-API-Key` only to the explicitly configured FlashData API origins.
Signed results and upload descriptors are checked against the storage origin returned by
the authenticated access endpoint. Storage requests use a separate credential-free request
and redirects are not followed. API errors redact known key and storage-secret values.

Keep storage settings in a protected local file or secret manager. The Download API receives
these settings to write files into your destination. Use scoped credentials and your own
storage access controls. SDK clients do not log requests or load `.env` automatically.
