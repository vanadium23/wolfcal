---
scope: Requires WebRTC support and optional relay server; advanced architecture
kind: system
content_hash: ea6f1535719cc5be502101631df122fb
---

# Hypothesis: Add Conflict-Free Replicated Data Types (CRDT) for Multi-Device Sync

Implement CRDT-based sync for true multi-device collaboration. Instead of Google Calendar as source of truth, use a CRDT (e.g., Yjs or Automerge) to sync calendar data directly between devices via WebRTC or a relay server. Google Calendar becomes one of many sync backends. Enables offline collaboration, conflict-free merges, and eventual consistency. Devices discover each other via signaling server.

## Rationale
{"anomaly": "Current sync is unidirectional (device ↔ Google) - no direct device-to-device sync or collaborative editing", "approach": "Implement CRDT for peer-to-peer sync with automatic conflict resolution", "alternatives_rejected": ["Keep Google as only sync source (no device-to-device collaboration)", "Operational transformation (complexer than CRDTs, more edge cases)"]}