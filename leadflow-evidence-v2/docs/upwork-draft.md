# Draft Upwork portfolio item — DO NOT PUBLISH before comparison

Title: LeadFlow V2 — API-Based Lead Qualification & Workflow Automation

Role: Full-Stack Developer & Workflow Automation Engineer

Description:

I built LeadFlow V2 as an engineering-focused workflow demonstration to make each stage of lead qualification observable, testable and transparent.

A Cloudflare Pages Function accepts a controlled set of synthetic leads, validates requests, evaluates explainable qualification rules and returns an event trace with real execution timings. The frontend presents the routing decision, CRM adapter payload, draft-only follow-up and browser-local CRM record. A fault-injection scenario demonstrates two simulated CRM timeouts and bounded retry recovery. The interface also documents capability boundaries so clients can distinguish actual API execution from sandbox connector behavior.

My work includes the workflow engine, API contracts, accessible responsive frontend, error handling, synthetic scenario design and regression tests.

Stack: JavaScript, Cloudflare Pages Functions, REST APIs, HTML/CSS, browser localStorage, Node.js tests.

Important: This public demonstration uses a sandbox CRM adapter, deterministic qualification and synthetic leads. It does not claim live third-party CRM writes or LLM calls.

Recommended gallery:
1. Cover: actual V2 workflow product screenshot (desktop)
2. Four synthetic scenarios and intake console
3. Run execution: server response, score, event trace
4. CRM contract payload + browser-local record
5. Timeout injection: 2 failed sandbox attempts + 1 recovery
6. Architecture and capability boundary matrix
7. 390px mobile screenshot and verified test report

Release criteria for moving out of draft:
- V2 URL live, browser QA passed at desktop and mobile
- Both qualified and timeout receipts captured
- Working embedded media (if video is included)
- User has compared old published LeadFlow entry against new draft
- User explicitly approves publishing this additional portfolio entry
