# Security Policy

CivicShield Labs projects are safety-sensitive systems.

## Core Rules

- Never commit credentials, tokens, private keys, production certificates, or personal data.
- Never build or deploy unauthorized access mechanisms.
- Never treat a license plate, VIN, device identifier, or other public identifier as an authorization credential.
- Consequential enforcement actions must require authenticated, authorized human approval.
- Maintain complete audit records for privileged actions.
- Use least privilege and short-lived credentials.
- Test safety-critical behavior in simulation before controlled hardware testing.
- Real-world integrations require appropriate authorization, legal review, and safety validation.

## Command Center Access Gate

- The web interface and API require HTTP Basic credentials from
  `CIVICSHIELD_COMMAND_CENTER_USER` and `CIVICSHIELD_COMMAND_CENTER_PASSWORD`.
- Set `CIVICSHIELD_COMMAND_CENTER_ORIGIN` to the public HTTPS origin. Production
  simulator mutations fail closed when this exact origin is not configured.
- The password must contain at least 32 UTF-8 bytes. There are no development or
  production defaults; missing or weak configuration returns `503`.
- Serve the application only over HTTPS outside loopback development. Basic
  credentials are reusable and do not provide per-person attribution.
- Simulator mutations also require an exact same-origin `Origin` and, when
  present, `Sec-Fetch-Site: same-origin`.
- This shared credential is a temporary access gate. Before handling real or
  multi-agency data, replace it with the approved identity provider and enforce
  agency, role, and object-level authorization in the platform API.

## Reporting

Security findings should be handled privately and responsibly.
