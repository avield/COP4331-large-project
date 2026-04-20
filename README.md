# COP4331-large-project

## Prerequisites

- Node.js v22 or higher

## Running the Application

To start the development servers for both the frontend and the backend simultaneously, ensure you are in the root directory and run:

```bash
npm run dev
```

## Development
To install a package for the frontend:
```bash
npm install <package-name> --workspace=frontend
```

To install a package for the backend:
```bash
npm install <package-name> --workspace=backend
```

## AI Assistance Disclosure

This project was developed with assistance from generative AI tools:

- **Tool**: ChatGPT (OpenAI, GPT-5.3)
- **Dates**: March–April 2026
- **Scope**: 
  - Debugging backend and frontend issues (authentication flow, refresh tokens, logout behavior)
  - Designing and refining API endpoints and controller logic
  - Assistance with MongoDB/Mongoose schemas and relationships
  - UI/UX improvements (accessibility fixes, layout adjustments)
  - Help generating UML diagrams (use case, class, ERD, activity diagrams)
  - Assistance with implementing features such as notifications and invitations
  - General explanations of concepts (JWT auth, rate limiting, React patterns, MERN stack, Nginx, PM2)
- **Use**:
  - Used primarily for debugging errors and understanding issues in existing code
  - Generated small code snippets and suggested implementations, which were reviewed and modified before integration
  - Provided explanations that guided design decisions and implementation strategies
  - Assisted in structuring diagrams and documentation for the project


- **Tool**: GitHub Copilot (Claude Sonnet 4.6, accessed via VS Code)
- **Dates**: April 15-16, 2026
- **Scope**: 
  - Test infrastructure setup 
  - Backend and frontend integration test
  - Test debugging
  - TypeScript type error diagnosis 
- **Use**: 
  - Generated backend integration tests for auth routes and frontend router-level integration tests; 
  - unified root-level `npm test` command across repo workspaces;

  All AI-generated suggestions were reviewed, tested, and adapted to fit the project requirements. The final implementation reflects my understanding and integration of these concepts.