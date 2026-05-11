# Sentinel-VOIP
<img width="1711" height="988" alt="image" src="https://github.com/user-attachments/assets/e2dcac8d-267d-4458-909d-4e4cfe6a5d30" />

Reconstruction of the Juasapp VoIP protocol. This project documents the transition from dynamic instrumentation on iOS to a standalone JavaScript implementation for global signaling and research-driven call orchestration.

## Technical Methodology

### 1. Dynamic Analysis & Pentesting (iOS)

The protocol was reversed using a **jailbroken iOS device**. The research focused on real-time behavior to achieve the following:

- **Frida Instrumentation:** Used to observe dynamic request flows. By hooking `NSURLSession`, I captured raw API traffic and bypass device-level blacklisting.
- **FLEX / FLEXer:** Employed for live heap exploration to identify the internal logic responsible for credit validation.

### 2. Protocol Replication

The data discovered during the iOS pentest was ported to a standalone JavaScript environment to:

- **Bypass a commercial service's payment system:** Successfully recreated the signaling logic to trigger calls without depleting or purchasing credits.
- **Session Handshake:** Recreated `create.lua` and `get_user.lua` flows to automate account registration.
- **Resilient Signaling:** Integrated a semaphore system to manage API concurrency and handle `429` rate-limiting.

## Features

- **Unlimited Call Logic:** Direct signaling that ignores client-side and server-side credit constraints.
- **Massive Audio Library:** Access to over **2,129 different voicelines** spanning a wide variety of countries and localized scenarios.
- **Device Spoofing:** Randomizes iOS metadata (versions 16.2–17.4) and hardware identifiers to appear as a legitimate Apple device.
- **International Reach:** Support for global signaling gateways including ES, US, FR, IT, FI, and MANY MANY more.
- **Smart JSON Extraction:** Custom logic to peel away the `0day:` response prefix and extract hidden payload blocks.

## Technical Stack

- **Instrumentation:** Frida, FLEX, Objection
- **Language:** JavaScript (Node.js / Browser)
- **API Handling:** Fetch with custom concurrency control
- **Environment:** Jailbroken iOS (Initial Research), Standalone Web Client (Final Implementation)

## Installation

```bash
git clone https://github.com/xtofuub/Sentinel-VOIP.git
cd Sentinel-VOIP
npm install
````

## Usage

```bash
# Start the signaling bridge
npm start
```

The dashboard will be available at:
[http://localhost:3000](http://localhost:3000)

## Disclaimer

This project is for educational and security research purposes only. It demonstrates vulnerabilities in client-side trust models and the potential to bypass commercial payment systems through protocol reversal. Use at your own risk.

## Author

xtofuub
