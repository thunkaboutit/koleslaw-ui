# Koleslaw — Privacy Policy

**Last updated:** March 31, 2026

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
Email: legal@thunkabout.it

If you are in the European Economic Area (EEA) and wish to contact our representative, please
email: cp@thunkabout.it

## Data Collected

The Service collects and processes the following categories of data:

- **Prompts and context** you enter into the Site's chat box, the Extension's popup interface, or submit directly
  through the API. Under the California Consumer Privacy Act (CCPA), this falls within the category of "Internet or
  other electronic network activity information."
- **Selected text** from web pages (Extension only), captured only when you explicitly click "Use Selection" or use
  the "Enhance with Koleslaw" context menu. This text is placed into the prompt input field and is not sent anywhere
  until you click "Enhance."
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

- **Extension local storage:** Your API key, API URL, and most recent prompt are stored locally on your device using
  Chrome's `chrome.storage.local` API. This data is not transmitted to any third party other than `api.koleslaw.ai`.
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
- **Site session data:** Session data expires automatically after [X hours/days] of inactivity or upon logout.
- **API-side caching:** Prompts sent to `api.koleslaw.ai` — regardless of whether they originate from the Site, the
  Extension, or a direct API call — may be cached on our servers for up to [X hours/days] solely to reduce response
  latency. Cached data is automatically purged after this period and is not used for model training or any other
  purpose.
- **Account data:** If you have an account, your account information is retained for as long as your account is active.
  Upon account deletion, your account data is removed within [X days].
- **Incidental technical data:** IP addresses and request metadata used for rate limiting and abuse prevention are
  retained for up to [X days] and then automatically deleted.
- **No long-term prompt retention:** We do not retain your prompts, context, or selected text beyond the caching period
  described above.

## Third-Party Processing and Sub-Processors

All prompt data — whether submitted from the Site, the Extension, or the API — is processed by the same backend at
`api.koleslaw.ai`.

**Default processing path:** The Koleslaw API is hosted by [cloud provider name] in [location/region]. The following
sub-processors may handle your data in the course of providing the Service:

| Sub-Processor                 | Purpose                       | Location                  |
| ----------------------------- | ----------------------------- | ------------------------- |
| [Cloud provider, e.g., AWS]   | Infrastructure hosting        | [Region, e.g., US-East-1] |
| [LLM provider, if applicable] | Prompt enhancement processing | [Region]                  |

A current list of sub-processors is maintained at [URL] and updated at least 30 days before any new sub-processor is
engaged.

**Custom API endpoints (Extension only):** The Extension allows you to configure a custom API URL. If you do so, your
prompts will be sent to that third-party endpoint instead of `api.koleslaw.ai`. We have no control over how third-party
endpoints handle your data, and this privacy policy does not apply to those endpoints. You are responsible for reviewing
the privacy practices of any custom endpoint you configure.

## Data Sharing

The Service does not sell, share, or transfer your data to any third parties beyond what is described in the Third-Party
Processing section above. Under the CCPA, we do not "sell" or "share" (as those terms are defined by the CCPA/CPRA) your
personal information.

## International Data Transfers

The Koleslaw API is hosted in [country/region]. If you are located in the European Economic Area (EEA), the United
Kingdom, or Switzerland, your data may be transferred to and processed in a country outside your jurisdiction. We rely
on [Standard Contractual Clauses (SCCs) approved by the European Commission / an adequacy decision / other lawful transfer mechanism]
to ensure that your data receives adequate protection in accordance with GDPR Articles 44–49.

You may request a copy of the applicable transfer safeguards by contacting us at cp@thunkabout.it.

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
rights, contact us at cp@thunkabout.it with a description of your request. We may need to verify your identity before
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
similar rights to those described above. Contact us at cp@thunkabout.it, and we will process your request in
accordance with applicable law.

## Children's Privacy

This Service is not directed at children under the age of 16. We do not knowingly collect personal data from children
under 16. If you believe that a child under 16 has provided us with personal data through the Site, the Extension, or
the API, please contact us at cp@thunkabout.it and we will promptly delete it.

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

**Email:** cp@thunkabout.it

If you are in the EEA and are not satisfied with our response, you have the right to lodge a complaint with your local
data protection supervisory authority.

---
