# SwitchStack

SwitchStack is a comprehensive home automation system enabling remote control of electrical switches. It leverages WebSockets for real-time communication, ensuring instant response and reliable interaction. The system integrates embedded hardware (ESP32, ESP8266), a Node.js backend, and MongoDB to deliver a seamless and responsive user experience.

---

## [Old Implementation](https://github.com/TNEM22/SwitchStack)

The original architecture consisted of two separate servers:

- **[Node.js Backend](https://github.com/TNEM22/Smart_SW_Backend)**: Responsible for user management, authentication, and REST API routes.
- **[FastAPI WebSocket Server](https://github.com/TNEM22/Smart_SW_WS_render)**: Handled real-time device communication over WebSockets.

An Android application (built using Android Studio) acted as the client for users to control and monitor their devices. While functional, this dual-server system increased complexity, latency, and deployment cost.

## New Implementation _(In Progress)_

The new version of SwitchStack is currently under development. It simplifies the system architecture by merging all services into a single [**Node.js server**](https://github.com/TNEM22/switchstack-app-backend) using the `ws` library for WebSocket communication.

### Planned Improvements:

- ✅ **Unified Backend**: A single server will handle both REST APIs and WebSocket communication, making the system more maintainable and efficient.
- ✅ [**React Frontend with Capacitor**](https://github.com/TNEM22/switchstack-app-frontend): A new React-based frontend is being developed using Vite wrapped with Capacitor for Android App, with native android features.
- ✅ **Optimized Firmware**: ESP32/ESP8266 firmware now uses **NimBLE** for BLE provisioning and connects directly via WebSockets for real-time control.

## Why This Upgrade Matters

- **Cost Effective**: Single server reduces infrastructure overhead.
- **Lower Latency**: Eliminates cross-server communication delays.

## Upcoming Features

- Smart automation scheduling
- Voice assistant integration

## Repositories

- [New React.js Frontend](https://github.com/TNEM22/switchstack-app-frontend)
- [New Node.js Backend (Under Development)](https://github.com/TNEM22/switchstack-app-backend)
- [Old Node.js Backend](https://github.com/TNEM22/Smart_SW_Backend)
- [Old FastAPI WebSocket Server](https://github.com/TNEM22/Smart_SW_WS_render)
