---
scope: WolfCal React + Vite + TypeScript project
kind: system
content_hash: dfebb49b1c3e544c6f11e4f648c517bb
---

# Hypothesis: React Testing Library for component scenarios

Add React Testing Library (RTL) alongside Vitest for component scenario testing. RTL provides user-centric queries (getByRole, getByLabelText) that test components as users interact with them, not implementation details. Works seamlessly with Vitest and Vite.

## Rationale
{"anomaly": "No automated tests exist", "approach": "React Testing Library adds user-centric component queries. Complements Vitest unit tests with scenario-based testing.", "alternatives_rejected": ["Testing implementation details (brittle)", "No component testing framework"]}