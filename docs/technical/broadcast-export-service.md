# Broadcast Export Service

This document describes the **ExportService** implemented in `backend/dotnet/ExportService.cs`.

The service provides video export functionality suitable for broadcast environments. Key features include:

- Applying broadcast standards such as ATSC or EBU R128 before export.
- Verification of compliance with broadcast requirements.
- Generation of multiple output formats (MP4 and MXF).
- Delivery options for final files:
  - Local download.
  - FTP upload to a playout server.
  - API integration with newsroom systems.
  - Cloud storage upload (e.g., AWS or Azure).

The implementation currently contains placeholders for the processing logic. Integrate real media processing tools and delivery SDKs as needed.
