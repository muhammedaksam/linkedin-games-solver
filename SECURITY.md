# 🛡️ Security Policy

We take the security of the **LinkedIn Games Solver** extension and our registry very seriously. We want to keep our users safe, maintain data privacy, and protect the integrity of the project.

This document outlines our supported versions, vulnerability reporting process, and our general approach to security.

---

## 📞 Reporting a Vulnerability

If you discover a security vulnerability in this project, **please do not open a public issue.** Instead, report it privately so we can address it responsibly.

You can report security vulnerabilities by emailing:
* **[info@muhammedaksam.com.tr](mailto:info@muhammedaksam.com.tr)**

Please include as much detail as possible in your report:
- A description of the vulnerability and its potential impact.
- Clear, step-by-step instructions to reproduce the issue.
- Any proof-of-concept code, screenshots, or network requests if applicable.
- The version of the extension and browser you used.

We will acknowledge receipt of your report within **48 hours** and provide a timeline for resolution and public disclosure (typically within **30 days**).

---

## 🚀 Supported Versions

We actively support and patch security issues only for the latest released version of the extension available in the Chrome Web Store or main branch:

| Version | Supported |
| ------- | :-------: |
| Latest  |     ✅     |
| < Max   |     ❌     |

We recommend always keeping your extension up to date. Chrome automatically updates unpackaged developer builds when pulled from `main`, and Web Store installations update automatically as new versions are published.

---

## 🔒 Extension Security & Architecture Principles

To ensure complete user safety, this project adheres to strict browser extension security best practices:

### 1. Zero Third-Party Remote Code Executions (RCE)
To comply with Manifest V3 (MV3) security specifications:
- The extension contains absolutely no `eval()`, `new Function()`, or remote script execution tags.
- All layouts, solvers, and interfaces are compiled statically and packaged directly inside the extension bundle.

### 2. Main-World IPC Sandboxing
To bypass DOM isolation and extract board matrices securely, the extension uses a main-world bridge. We secure this communication path by:
- Restricting incoming `window.postMessage` handlers to specific known request signatures.
- Enforcing structural verification on all incoming payloads before processing them inside the content or background scripts.
- Employing a strict 1500ms safety timeout on IPC promises to prevent memory leaks or hanging script states.

### 3. Privacy-First Telemetry
Our telemetry pipeline utilizes Google Analytics 4 Measurement Protocol via service worker proxy:
- **No Personal Identifiable Information (PII)** is ever collected, transmitted, or logged.
- The pipeline collects purely anonymous performance metrics, solver execution states, and error types.
- Users can opt out instantly via the extension's Settings panel at any time.

### 4. API Key Safety
- Never check custom API tokens or private keys (such as OpenAI/Gemini/Claude credentials) into version control.
- Ensure that any local configuration is loaded solely via `.env.local` which is ignored by `.gitignore`.
