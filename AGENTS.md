# AGENTS.md

This repository uses BMAD orchestration by default.

Operating rules:
- Start by classifying the task into analysis, architecture, implementation, or QA.
- Use the smallest sufficient BMAD workflow.
- Keep outputs traceable from request to implementation.
- For medium or large work, produce a mini-plan before changing files.
- Do not introduce architectural changes silently.
- Always define validation steps.
- For every application release, the implementer must author the user-facing in-app changelog; do not require the user to transcribe release notes manually.
- Changelog notes must describe only visible functionality, enhancements, and bug fixes, must target role capabilities rather than role names, and must be supplied through an idempotent environment-managed SQL file under `db-init`.
