# Project Brief: BOFU AI

## 1. Introduction
BOFU AI is a SaaS application designed to streamline and automate the creation of Bottom-of-Funnel (BOFU) content for B2B SaaS companies. It leverages AI to analyze product information, user research, and market data, generating tailored content briefs that guide the production of high-converting sales and marketing materials.

## 2. Project Goals
- **Automate BOFU Content Creation:** Reduce the manual effort and time required to produce effective BOFU content.
- **Improve Content Quality & Consistency:** Ensure all BOFU materials are data-driven, on-brand, and optimized for conversion.
- **Enhance Sales Enablement:** Provide sales teams with readily available, high-quality content to support their conversations and close deals.
- **Streamline Content Workflow:** Create a centralized platform for managing the BOFU content lifecycle from research to publication.
- **Provide a robust and user-friendly system for creating, managing, and utilizing content briefs to streamline content production.**

## 3. Core Requirements / Key Features
- **User Authentication & Authorization:** Secure login for regular users and administrators, with role-based access control.
- **Product Information Management:** Ability for users to input and manage information about their product lines, features, and value propositions.
- **Research Submission & Processing:**
    - Multi-step form for submitting research requests (e.g., target persona, pain points, competitor info).
    - Ability to upload relevant documents (e.g., case studies, whitepapers, product docs).
    - Input for existing blog links or content URLs for analysis.
- **AI-Powered Content Brief Generation:**
    - AI engine analyzes submitted information to generate comprehensive content briefs.
    - Briefs include sections for: target audience, key messaging, value propositions, pain points addressed, features to highlight, competitor differentiation, SEO keywords, recommended CTAs, and internal linking suggestions.
- **Advanced Content Brief Management:**
    - **Intuitive Editor:** A modern, card-based interface for creating and editing structured content briefs. This includes inline editing for all fields, specialized UI for managing complex data types (e.g., lists of pain points, USPs, competitor information) with grid layouts, and support for nested data structures.
    - **Visual Clarity:** Collapsible sections, custom color-coding for different content types, and clear iconography to enhance usability.
    - **Data Integrity & Persistence:** Direct integration with Supabase for reliable saving and retrieval of content brief data.
    - **Flexible Input:** Options for both guided, field-by-field input and raw JSON editing for advanced users.
    - **Stable Display:** A reliable component for displaying content briefs, ensuring a smooth user experience without data refresh issues.
- **Results Viewing & History:**
    - Dashboard to view generated content briefs and their status.
    - History of all research requests and generated briefs.
- **Admin Panel:**
    - User management (invite, activate, deactivate users).
    - Overview of system usage and content generation metrics.
    - Management of product card/brief templates (if applicable).

## 4. Scope
- **In Scope:**
    - Core features listed above.
    - Integration with Supabase for backend services (auth, database).
    - Web-based application accessible via modern browsers.
- **Out of Scope (for initial MVP/phase):**
    - Direct integration with CRMs or marketing automation platforms (potential future enhancement).
    - AI model training or fine-tuning (utilizing existing AI services/APIs).
    - Advanced analytics dashboards beyond basic usage metrics.

## 5. Target Audience
- B2B SaaS Marketing Teams (Content Marketers, Product Marketers, Marketing Managers).
- B2B SaaS Sales Teams (Sales Representatives, Sales Managers looking for enablement content).
- Freelance Writers or Agencies creating BOFU content for B2B SaaS clients.