# Architecture Decision Document

## Table of Contents

- [Architecture Decision Document](#table-of-contents)
  - [stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-25'
v2EditedAt: '2026-03-27'
v2EditSummary: 'Extended architecture for V2 Leftovers module (FR44-FR57, NFR23)'
v4EditedAt: '2026-04-03'
v4EditSummary: 'Stripped offline/PowerSync (cancelled). Extended architecture for V4 Language Learning module (FR100-FR115, NFR27-NFR30). Added Pi session service, WebSocket, TTS/STT, Claude OAuth onboarding.'
v5EditedAt: '2026-04-04'
v5EditSummary: 'Extended architecture for V5 Recipes module (FR116-FR149, NFR31-NFR37). Added recipes/recipe_ingredients/recipe_steps tables, LLM import pipeline (URL/YouTube/OCR), recipe scaling, meal plan multi-recipe slots, shopping list generation, PDF export. New repositories, store, hooks, components, route group.'
v4ApiEditedAt: '2026-04-29'
v4ApiEditSummary: 'Updated V4 Language Learning for OpenCode Zen/Go API key configuration. Replaced Claude OAuth with in-app API key setup gate. Changed learning_profiles field from claude_authenticated to api_key_configured. Switched from Tailscale to Cloudflare Tunnel. Replaced pm2 with Podman. Replaced /auth/login with /auth/configure. Added per-user auth.json for API key storage. Removed react-native-webview dependency. Updated FR mapping (FR111-FR113 API key config, FR114-FR116 isolation/signals). Added NFR31-NFR32 (API key security). Updated data flow, directory structure, gap analysis, and architecture checklist.'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/ux-design-specification.md', '_bmad-output/planning-artifacts/product-brief-FamilyHub-2026-03-24.md']
workflowType: 'architecture'
project_name: 'FamilyHub'
user_name: 'Filipe'
date: '2026-03-25'](#stepscompleted-1-2-3-4-5-6-7-8-laststep-8-status-complete-completedat-2026-03-25-v2editedat-2026-03-27-v2editsummary-extended-architecture-for-v2-leftovers-module-fr44-fr57-nfr23-v4editedat-2026-04-03-v4editsummary-stripped-offlinepowersync-cancelled-extended-architecture-for-v4-language-learning-module-fr100-fr115-nfr27-nfr30-added-pi-session-service-websocket-ttsstt-claude-oauth-onboarding-v5editedat-2026-04-04-v5editsummary-extended-architecture-for-v5-recipes-module-fr116-fr149-nfr31-nfr37-added-recipesrecipeingredientsrecipesteps-tables-llm-import-pipeline-urlyoutubeocr-recipe-scaling-meal-plan-multi-recipe-slots-shopping-list-generation-pdf-export-new-repositories-store-hooks-components-route-group-v4apieditedat-2026-04-29-v4apieditsummary-updated-v4-language-learning-for-opencode-zengo-api-key-configuration-replaced-claude-oauth-with-in-app-api-key-setup-gate-changed-learningprofiles-field-from-claudeauthenticated-to-apikeyconfigured-switched-from-tailscale-to-cloudflare-tunnel-replaced-pm2-with-podman-replaced-authlogin-with-authconfigure-added-per-user-authjson-for-api-key-storage-removed-react-native-webview-dependency-updated-fr-mapping-fr111-fr113-api-key-config-fr114-fr116-isolationsignals-added-nfr31-nfr32-api-key-security-updated-data-flow-directory-structure-gap-analysis-and-architecture-checklist-inputdocuments-bmad-outputplanning-artifactsprdmd-bmad-outputplanning-artifactsux-design-specificationmd-bmad-outputplanning-artifactsproduct-brief-familyhub-2026-03-24md-workflowtype-architecture-projectname-familyhub-username-filipe-date-2026-03-25)
  - [Project Context Analysis](./project-context-analysis.md)
    - [Requirements Overview](./project-context-analysis.md#requirements-overview)
    - [Technical Constraints & Dependencies](./project-context-analysis.md#technical-constraints-dependencies)
    - [Cross-Cutting Concerns Identified](./project-context-analysis.md#cross-cutting-concerns-identified)
  - [Starter Template Evaluation](./starter-template-evaluation.md)
    - [Primary Technology Domain](./starter-template-evaluation.md#primary-technology-domain)
    - [Framework Decision: Expo vs Flutter](./starter-template-evaluation.md#framework-decision-expo-vs-flutter)
    - [Selected Starter: Expo SDK 55 + TypeScript](./starter-template-evaluation.md#selected-starter-expo-sdk-55-typescript)
  - [Core Architectural Decisions](./core-architectural-decisions.md)
    - [1. Data Architecture](./core-architectural-decisions.md#1-data-architecture)
    - [1b. (V2) Leftovers Data Architecture](./core-architectural-decisions.md#1b-v2-leftovers-data-architecture)
    - [1c. (V4) Language Learning Data Architecture](./core-architectural-decisions.md#1c-v4-language-learning-data-architecture)
    - [1d. (V5) Recipes Data Architecture](./core-architectural-decisions.md#1d-v5-recipes-data-architecture)
    - [2. Auth & Security](./core-architectural-decisions.md#2-auth-security)
    - [3. State Management](./core-architectural-decisions.md#3-state-management)
    - [4. API & Communication](./core-architectural-decisions.md#4-api-communication)
    - [5. Infrastructure & Deployment](./core-architectural-decisions.md#5-infrastructure-deployment)
  - [Implementation Patterns & Consistency Rules](./implementation-patterns-consistency-rules.md)
    - [Naming Patterns](./implementation-patterns-consistency-rules.md#naming-patterns)
    - [Structure Patterns](./implementation-patterns-consistency-rules.md#structure-patterns)
    - [Format Patterns](./implementation-patterns-consistency-rules.md#format-patterns)
    - [Communication Patterns](./implementation-patterns-consistency-rules.md#communication-patterns)
    - [Process Patterns](./implementation-patterns-consistency-rules.md#process-patterns)
    - [Enforcement Summary](./implementation-patterns-consistency-rules.md#enforcement-summary)
  - [Project Structure & Boundaries](./project-structure-boundaries.md)
    - [Complete Project Directory Structure](./project-structure-boundaries.md#complete-project-directory-structure)
    - [Architectural Boundaries](./project-structure-boundaries.md#architectural-boundaries)
    - [FR Categories → Directory Mapping](./project-structure-boundaries.md#fr-categories-directory-mapping)
  - [Architecture Validation Results](./architecture-validation-results.md)
    - [Coherence Validation ✅](./architecture-validation-results.md#coherence-validation)
    - [Requirements Coverage Validation ✅](./architecture-validation-results.md#requirements-coverage-validation)
    - [Gap Analysis Results](./architecture-validation-results.md#gap-analysis-results)
    - [Architecture Completeness Checklist](./architecture-validation-results.md#architecture-completeness-checklist)
    - [Architecture Readiness Assessment](./architecture-validation-results.md#architecture-readiness-assessment)
    - [Implementation Handoff](./architecture-validation-results.md#implementation-handoff)
