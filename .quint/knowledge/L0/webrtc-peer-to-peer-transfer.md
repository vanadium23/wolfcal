---
scope: WolfCal application, requires WebRTC support (modern browsers), needs signaling mechanism (public server or manual SDP exchange), works on same local network or internet with NAT traversal
kind: system
content_hash: d91a224c9103c93ecf4ddc3f7db3ad9e
---

# Hypothesis: WebRTC Peer-to-Peer Transfer

Configuration transfer via WebRTC peer-to-peer connection. Devices establish a direct browser-to-browser connection using a signaling mechanism (could use a public signaling server or manual SDP exchange). Configuration data is sent directly between devices without involving a server.

## Rationale
{"anomaly": "No way to transfer configuration between devices", "approach": "Direct peer-to-peer transfer using WebRTC for secure, serverless data exchange", "alternatives_rejected": ["Manual export (too manual)", "QR code (limited capacity)", "URL (limited length)"]}