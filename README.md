# TRUSTNEX — Safer Clicks. Smarter Choices.

A lightweight, privacy-first cybersecurity awareness website for people and small businesses. It checks visible patterns in links and messages, explains what it found, and suggests sensible next steps. The project uses plain HTML, CSS and JavaScript. No server, account, paid service or API key is needed to run it.

> **Important:** TRUSTNEX is a rule-based awareness aid, not a security product or safety guarantee. A low score does not prove something is safe. No live threat-intelligence or website-reputation service is connected.

## Folder contents

```text
TRUSTNEX/
├── index.html                 Main website and page sections
├── css/
│   └── styles.css             Responsive layout, colors and accessible states
├── js/
│   ├── analyzer.js            Transparent URL/message heuristic rules
│   └── app.js                 User interface, local QR flow and dashboard
├── vendor/
│   ├── jsqr.js                 Locally bundled QR decoder (no runtime download)
│   └── JSQR-LICENSE.txt        License for the bundled QR decoder
├── tests/
│   ├── run-tests.js            Automated checks (Node.js)
│   └── sample-url-qr.png       Example QR image encoding https://example.com/account
├── package.json                Optional development/test commands
├── package-lock.json           Reproducible development dependencies
└── README.md                   This guide
```

The browser app itself has **no runtime dependency installation step**. `node_modules` is only needed if you want to rebuild the bundled QR decoder or run the automated tests.

## 1. Download and extract

Download the `TRUSTNEX.zip` project archive supplied with this project. In Windows File Explorer, right-click the ZIP and choose **Extract All…**. Keep the resulting `TRUSTNEX` folder somewhere convenient, such as `Documents`.

## 2. Software required

- Windows 10 or 11
- A modern browser such as Chrome, Edge or Firefox
- Visual Studio Code to inspect/edit the project
- Python 3 (recommended for serving locally; not needed for the automated analyzer itself)
- Node.js 18 or later (only if you want to run the automated tests or rebuild the QR decoder)

No API key, database, Docker, account or paid service is needed.

## 3–4. Open in VS Code and run (Windows)

1. Open VS Code, choose **File → Open Folder…**, and select the extracted `TRUSTNEX` folder.
2. Open **Terminal → New Terminal**.
3. In the terminal, run:

```powershell
py -m http.server 8000
```

If the `py` command is unavailable but Python is installed, try:

```powershell
python -m http.server 8000
```

4. In your browser, visit **http://localhost:8000**.
5. To stop the local server, return to the VS Code terminal and press **Ctrl+C**.

You can also double-click `index.html` to view the website, but the local-server method is more reliable for image decoding and browser storage.

## Features

- **Phishing URL checker:** accepts a web address (the scheme can be omitted), validates its shape, and flags HTTP, IP-address hosts, `@` user-info, punycode, long hostnames/URLs, many subdomains, known URL shorteners and nonstandard ports.
- **QR code scanner:** accepts PNG, JPG, WEBP or GIF up to 10 MB. The image is decoded locally using the bundled JavaScript decoder. If it contains a web address, the same URL rules are used; other text is displayed as untrusted decoded content, not executed.
- **Scam message checker:** flags common language around urgency, passwords, OTPs, payment, unexpected rewards, account verification, attachments and secrecy/unusual contact requests.
- **Dashboard:** shows local total/category counts and up to eight recent summaries. It saves only check type, score, category and timestamp in this browser's local storage; it does **not** save the submitted URL, message or QR image. Use **Clear local summary** to remove those entries.
- **How it works, About, privacy and limitations** are included on the homepage.

### Risk scoring

Each distinct configured signal contributes a documented weight; duplicate matches for the same signal count only once. The total is capped at 100:

- **0–24 — Fewer Warning Signs**
- **25–54 — Suspicious Signals**
- **55–100 — High Risk Signals**

The score is a simple, transparent heuristic—not a trained model, novel algorithm, proof of fraud or proof of safety. Results can miss scams or flag benign content. TRUSTNEX does not check a sender's identity, open the page, inspect page behavior, or query live threat intelligence/reputation databases.

## 5. Test the features

### In the website

- **Normal-looking HTTPS link:** enter `https://example.com/account`. It should show zero configured warning signals. That is not a guarantee of safety.
- **HTTP link:** enter `http://example.com`. It should flag an unencrypted connection.
- **IP host / `@`:** enter `http://login@192.0.2.4/sign-in`. It should flag HTTP, an IP address and `@` user-info.
- **OTP message:** paste `Please share the OTP verification code with support.` It should flag an OTP request.
- **Urgent payment message:** paste `Urgent: pay the invoice immediately or your account will be suspended.` It should flag urgency and payment language.
- **QR image:** choose `tests/sample-url-qr.png` in the QR checker. It encodes `https://example.com/account`; the checker should decode it locally and show its URL analysis.
- **Empty/invalid inputs:** submit an empty form, then try `https://` in the URL checker. A helpful inline error should appear.
- **Dashboard privacy:** make a test check; see its category summary appear, reload and confirm it remains. Clear the summary and confirm the counts reset. The content itself is not recorded.

### Automated tests

Install Node.js 18+ first, then open a terminal in the project folder:

```powershell
npm ci
npm test
```

To regenerate the browser decoder bundle after installing dependencies:

```powershell
npm run build:qr
```

The QR sample image is included in the ZIP so no QR-generation tool is needed to exercise the feature.

## 6. Implemented and not connected

**Implemented:** local URL and message heuristics; QR image decode in-browser; transparent score explanations; accessible tab controls and responsive navigation; local summary dashboard with clear-history; input limits and validation; practical, non-guaranteeing safety guidance.

**Not implemented:** backend or user accounts; live URL reputation, blocklists or threat intelligence; malware scanning; sender/domain identity verification; navigation to or fetching of submitted URLs; cloud storage or synchronization; an AI/ML detection model; camera-based live QR scanning. These are intentionally not implied by the current checks.

## 7. Common issues

- **`py` or `python` is not recognized:** install Python 3 from the official Python website and select the option to add Python to PATH, or open `index.html` directly in a browser.
- **Port 8000 is already in use:** run `py -m http.server 8001` and visit `http://localhost:8001` instead.
- **QR image is not decoded:** choose a sharp, well-lit image with the whole code visible; try PNG/JPG and keep the file under 10 MB. Animated images and unusual formats may not decode.
- **Dashboard appears empty after clearing or in a different browser:** the summary is stored only in that browser's local storage. Clearing browser site data removes it too.
- **`npm ci` fails:** confirm Node.js 18+ is installed, then retry. Running the website does not require npm.
- **A check has a low score:** this only means the current rules found few configured patterns. Verify surprising requests independently; TRUSTNEX cannot certify content as safe.

## Privacy design

Analysis runs in browser JavaScript. The entered URL is parsed locally; the app never fetches or opens it. QR images are decoded in the browser. Pasted text and decoded contents are used in memory for the result and are not persisted. The dashboard stores only a limited set of score summaries in browser local storage. There are no analytics, remote fonts, external APIs or runtime CDN requests.
