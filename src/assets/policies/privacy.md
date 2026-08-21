# Koleslaw — Privacy Policy

**Last updated:** August 20, 2026

## Overview

Koleslaw is an AI-powered prompt enhancement service. You can submit prompts through the Koleslaw website
at [https://koleslaw.ai](https://koleslaw.ai) (the "Site"), the Koleslaw Chrome extension (the "Extension"), or the
Koleslaw API directly. The Site's chat box, the Extension, and the API all communicate with the same backend service at
`api.koleslaw.ai` and are governed by this single privacy policy.

Throughout this document, "the Service" refers collectively to the Site, the Extension, the API, and any related tools
or interfaces provided by Koleslaw.

This policy describes what data the Service collects, how it is used, how it is stored, and what rights you have
regarding your data.

## Data Controller

The data controller for this Service is:

**Thunk About It**
3080 Monroe Way
Alpharetta, GA 30004
United States of America
Email: info@thunkabout.it

If you are in the European Economic Area (EEA) and wish to contact our representative, please
email: info@thunkabout.it

## Data Collected

The Service collects and processes the following categories of data:

- **Prompts and context** you enter into the Site's chat box, the Extension's popup interface, or submit directly
  through the API. Under the California Consumer Privacy Act (CCPA), this falls within the category of "Internet or
  other electronic network activity information."
- **Draft prompts on supported AI chat sites** (Extension only). On chatgpt.com, chat.openai.com, claude.ai, and
  gemini.google.com the Extension shows an "Enhance" button. Only when you click it does the Extension read the text
  currently in that site's prompt box, send it to `api.koleslaw.ai` for enhancement, and replace it with the enhanced
  version. The Extension does not read any other content on those pages and is not active on any other website.
- **Selected text** from web pages (Extension only), captured only when you explicitly click "Use Selection" or use
  the "Enhance with Koleslaw" context menu. This text is placed into the prompt input field and is not sent anywhere
  until you click "Enhance."
- **Usage records** for requests authenticated with an API key: the timestamp, the model that served the request,
  the enhancement type, input and output token counts, whether the response came from cache, and latency. Usage
  records never include the prompt text itself. They power your usage dashboard and enforce plan limits.
- **Account information** (if applicable), such as your email address, username, or other information you provide when
  creating an account on the Site or obtaining an API key. Under the CCPA, this falls within the category of "
  Identifiers."
- **API configuration** (API URL and API key) that you provide in the Extension's settings or use to authenticate API
  requests. API keys are treated as sensitive identifiers.
- **Incidental technical data** transmitted with requests to `api.koleslaw.ai`, including IP addresses, timestamps,
  user-agent strings, and referrer information (indicating whether a request originated from the Site, the Extension, or
  a direct API call). These are inherent to HTTP communication and are not stored beyond what is described in the Data
  Retention section below.
- **Cookies and similar technologies** (Site only): The Site may use strictly necessary cookies to maintain session
  state and preferences. The Site does not use third-party advertising or tracking cookies. If we introduce optional
  analytics cookies in the future, we will update this policy and provide a consent mechanism before deploying them.

The Extension does not set or read cookies. Neither the Site nor the Extension collects analytics, telemetry, crash
reports, or usage statistics beyond what is described above.

## How Data Is Used

Your data is used solely for the following purposes:

- **Prompts and context** — whether submitted through the Site's chat box, the Extension, or the API — are sent to
  `api.koleslaw.ai` for processing. The API generates an enhanced version of your prompt and returns it. Prompts are not
  used for model training or any purpose beyond fulfilling your enhancement request and temporary caching as described
  in the Data Retention section.
- **Selected text** (Extension only) is only captured when you explicitly trigger it. It is placed into the prompt input
  field for your review before any transmission occurs.
- **Account information** is used to authenticate your access, manage your subscription or usage tier, and communicate
  with you about the Service.
- **API keys** are used solely to authenticate requests to `api.koleslaw.ai`.
- **Usage records** are used to show you your own usage, enforce the daily limits of your plan, and, for paid plans,
  support billing.
- **Incidental technical data** is used only for request routing, rate limiting, abuse prevention, and distinguishing
  traffic sources for operational monitoring.
- **Cookies** (Site only) are used solely to maintain session state and remember your preferences.

We do not use your data for any purpose beyond what is described above (purpose limitation). We collect only the data
necessary to provide the Service's functionality (data minimization).

## Legal Basis for Processing

We process your data on the following legal bases under the EU General Data Protection Regulation (GDPR):

- **Consent (Art. 6(1)(a) GDPR):** When you submit a prompt — whether through the Site's chat box, the Extension, or the
  API — and initiate enhancement, you consent to that data being sent to `api.koleslaw.ai` for processing. You may
  withdraw consent at any time by ceasing use of the Service and deleting your stored data (see the Your Rights section
  below). Withdrawing consent does not affect the lawfulness of processing that occurred before withdrawal.
- **Performance of a contract (Art. 6(1)(b) GDPR):** If you create an account or subscribe to a paid plan, we process
  your account information as necessary to perform our contract with you.
- **Legitimate interest (Art. 6(1)(f) GDPR):** We store your API configuration locally (in the Extension) and maintain
  session state (on the Site) to enable the Service to function as you have requested. Our legitimate interest is
  providing a functional service; this storage is minimal and entirely within your control.

## Data Storage

- **Extension local storage:** Your API key, API URL, and most recent prompt and context are stored locally on your
  device using Chrome's `chrome.storage.local` API. This data is not transmitted to any third party other than
  `api.koleslaw.ai`.
  Chrome's local storage is not encrypted at rest; anyone with physical access to your device and Chrome profile may be
  able to view stored Extension data.
- **Site session data:** Session tokens and preferences are stored in your browser using cookies or session storage.
  This data is cleared when you log out or when your session expires.
- **Server-side storage:** Account information (email, username, hashed credentials) is stored on our servers for as
  long as your account is active. Prompts are handled as described in the Data Retention section below.

## Data Retention

- **Extension local storage:** Your API key, API URL, and most recent prompt remain stored on your device until you
  clear them in the Extension's settings or uninstall the Extension. Uninstalling the Extension removes all locally
  stored data.
- **Site session data:** Sign-in sessions expire 7 days after sign-in, or immediately upon logout.
- **API-side caching:** Prompts sent to `api.koleslaw.ai` — regardless of whether they originate from the Site, the
  Extension, or a direct API call — may be cached on our servers for up to 24 hours solely to reduce response
  latency. Cached data is automatically purged after this period and is not used for model training or any other
  purpose.
- **Account data:** If you have an account, your account information and usage records are retained for as long as
  your account is active. You can delete your account yourself at any time from the Profile page on the Site.
  Deletion is immediate and permanent: the account, all of its API keys, and all of its usage records are deleted at
  that moment.
- **Incidental technical data:** IP addresses and request metadata used for rate limiting and abuse prevention are
  retained for up to 30 days and then automatically deleted.
- **No long-term prompt retention:** We do not retain your prompts, context, or selected text beyond the caching period
  described above.

## Third-Party Processing and Sub-Processors

All prompt data — whether submitted from the Site, the Extension, or the API — is processed by the same backend at
`api.koleslaw.ai`.

**Default processing path:** The Koleslaw API is hosted by Amazon Web Services in the US East (Ohio) region
(`us-east-2`). Prompt enhancement is performed primarily by Koleslaw's own fine-tuned model running on infrastructure
we operate in that same AWS region. On that path, no third-party AI provider receives your prompt. When our own model
is unavailable, starting up, or busy beyond a response-time limit, the request is instead processed by a fallback model
from Anthropic through the Anthropic API.

The following sub-processors may handle your data in the course of providing the Service:

| Sub-Processor            | Purpose                                                                                                                                                                  | Location                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Amazon Web Services, Inc. | Infrastructure hosting: API, database, cache, and the servers that run our own enhancement model                                                                        | United States (`us-east-2`, Ohio)   |
| Anthropic, PBC           | Fallback prompt enhancement processing, only when our own model cannot serve the request                                                                                  | United States                       |
| Stripe, Inc.             | Payment processing for paid plans. Card details are entered on Stripe-hosted pages and never reach our servers; we store only your Stripe customer and subscription IDs | United States                       |

This section is the current list of sub-processors. We will update it at least 30 days before engaging a new
sub-processor.

**Custom API endpoints (Extension only):** The Extension allows you to configure a custom API URL. If you do so, your
prompts will be sent to that third-party endpoint instead of `api.koleslaw.ai`. We have no control over how third-party
endpoints handle your data, and this privacy policy does not apply to those endpoints. You are responsible for reviewing
the privacy practices of any custom endpoint you configure.

## Data Sharing

The Service does not sell, share, or transfer your data to any third parties beyond what is described in the Third-Party
Processing section above. Under the CCPA, we do not "sell" or "share" (as those terms are defined by the CCPA/CPRA) your
personal information.

## International Data Transfers

The Koleslaw API is hosted in the United States (AWS `us-east-2`). If you are located in the European Economic Area
(EEA), the United Kingdom, or Switzerland, your data is transferred to and processed in the United States. For these
transfers we rely on your explicit consent (GDPR Art. 49(1)(a)), given when you submit a prompt or create an account,
and on the data processing terms of our sub-processors, which incorporate the European Commission's Standard
Contractual Clauses, in accordance with GDPR Articles 44–49.

You may request a copy of the applicable transfer safeguards by contacting us at info@thunkabout.it.

## Security

We take reasonable technical and organizational measures to protect your data:

- All data transmitted between the Site, the Extension, or any API client and `api.koleslaw.ai` is encrypted in transit
  using TLS (HTTPS).
- Account credentials are hashed and salted before storage. Plaintext passwords are never stored.
- API keys are stored locally on your device (Extension) or transmitted only over encrypted connections (Site and API).
  They are never logged or stored in plaintext on our servers.
- Server-side access to cached data and account information is restricted to authorized personnel and automated systems
  required for service operation.
- We conduct periodic security reviews of our infrastructure and data handling practices.

**Limitation:** As noted in the Data Storage section, Chrome's local storage (used by the Extension) is not encrypted at
rest. We recommend that you secure your device with a strong password and keep your browser up to date.

## Your Rights

Depending on your location, you have rights regarding your personal data as described below. To exercise any of these
rights, contact us at info@thunkabout.it with a description of your request. We may need to verify your identity before
fulfilling your request.

### For All Users

- **Access:** Request a copy of the personal data we hold about you.
- **Deletion:** Request that we delete your personal data, including your account and any cached prompts.
- **Correction:** Request correction of inaccurate personal data.

### For Users in the European Economic Area (GDPR)

In addition to the rights above, you have the right to:

- **Data portability:** Receive your data in a structured, commonly used, machine-readable format.
- **Restriction:** Request that we limit how we process your data.
- **Objection:** Object to processing based on legitimate interest.
- **Withdraw consent:** Withdraw consent at any time, without affecting the lawfulness of processing that occurred
  before withdrawal.
- **Lodge a complaint:** File a complaint with your local data protection supervisory authority.

We will respond to GDPR-related requests within 30 days of receipt.

### For California Residents (CCPA/CPRA)

If you are a California resident, you have the following rights under the California Consumer Privacy Act:

- **Right to know:** Request the categories and specific pieces of personal information we have collected about you, the
  sources of that data, and the purposes for which it was collected.
- **Right to delete:** Request deletion of your personal information.
- **Right to correct:** Request correction of inaccurate personal information.
- **Right to opt-out of sale/sharing:** We do not sell or share your personal information as defined by the CCPA/CPRA.
  If this changes in the future, we will provide a "Do Not Sell or Share My Personal Information" link and update this
  policy.
- **Non-discrimination:** We will not discriminate against you for exercising any of your CCPA rights.

We will respond to CCPA-related requests within 45 days of receipt. You may also designate an authorized agent to make
requests on your behalf.

### For Residents of Other US States

If you reside in Virginia, Colorado, Connecticut, or another state with an applicable consumer privacy law, you may have
similar rights to those described above. Contact us at info@thunkabout.it, and we will process your request in
accordance with applicable law.

## Children's Privacy

This Service is not directed at children under the age of 16. We do not knowingly collect personal data from children
under 16. If you believe that a child under 16 has provided us with personal data through the Site, the Extension, or
the API, please contact us at info@thunkabout.it and we will promptly delete it.

## Healthcare Data Disclaimer

This Service is not designed for use with protected health information (PHI) as defined by the Health Insurance
Portability and Accountability Act (HIPAA). Do not submit PHI through the Site, the Extension, or the API. We are not a
HIPAA-covered entity and do not enter into Business Associate Agreements for use of this Service.

## Permissions (Chrome Extension)

The Extension requests the following browser permissions:

- **activeTab** — to read selected text from the current tab when you explicitly request it
- **scripting** — to execute a script that reads your text selection on the active tab
- **storage** — to persist your settings and most recent prompt locally on your device
- **contextMenus** — to add the "Enhance with Koleslaw" right-click menu option
- **Host permission for `api.koleslaw.ai`** — to send your enhancement requests to the Koleslaw API from the
  Extension's background process
- **Content scripts on chatgpt.com, chat.openai.com, claude.ai, and gemini.google.com** — to show the in-page
  "Enhance" button on those sites and, only when you click it, read the draft prompt in that site's input box and
  replace it with the enhanced version. The Extension reads nothing else on those pages and does not run on any
  other website.

These permissions apply only to the Chrome extension. The Site does not require or request browser-level permissions
beyond standard web functionality.

## Changes to This Policy

We may update this policy from time to time. If we make material changes that affect how your personal data is
collected, used, or shared, we will notify you through the Site, the Extension interface, or by other reasonable means
at least 30 days before the changes take effect. Non-material changes (such as formatting corrections or clarifications)
will be reflected in the "Last updated" date above. Your continued use of the Service after a material change takes
effect constitutes your acceptance of the updated policy.

## Contact

If you have questions about this privacy policy or wish to exercise your data rights, contact us at:

**Email:** info@thunkabout.it

If you are in the EEA and are not satisfied with our response, you have the right to lodge a complaint with your local
data protection supervisory authority.

---
