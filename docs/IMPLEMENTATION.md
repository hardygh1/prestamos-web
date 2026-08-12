Analyze the entire Angular project before implementing anything.

Review:

- package.json
- angular.json
- tsconfig.json
- routes
- existing layout
- folder structure
- CoreUI integration
- PrimeNG integration
- Tailwind configuration
- API_GUI.md
- UI_GUIDE.md
- CLAUDE.md

Then determine:

- current architecture
- reusable components
- shared services
- authentication flow
- routing strategy
- design consistency

Before writing code:

1. Verify that the requested feature does not already exist.
2. Reuse existing components whenever possible.
3. Reuse services whenever possible.
4. Follow the existing folder structure.
5. Keep naming conventions consistent.
6. Do not duplicate code.

After the analysis, create an implementation plan.

The plan must contain:

- Files to create
- Files to modify
- Services affected
- Routes affected
- Components affected
- Models affected
- Estimated implementation order

Only after presenting the plan, begin implementing the feature.

Implement incrementally.

After each completed step:

- Verify compilation.
- Check TypeScript errors.
- Check Angular template errors.
- Keep the application buildable at every stage.

Never generate incomplete code.
Always deliver production-ready code.