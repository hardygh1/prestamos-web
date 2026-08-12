# UI_GUIDE.md

Analyze this Angular project and use this file as the permanent UI development guide.

## Technology Stack

- Angular 21
- TypeScript
- Tailwind CSS
- PrimeNG
- PrimeIcons
- CoreUI Free Angular Template
- RxJS
- Angular Router

## UI Principles

- Follow Angular 21 best practices.
- Use Standalone Components.
- Use Signals whenever appropriate.
- Use the new Angular control flow syntax (@if, @for, @switch).
- Use strict typing.
- Prefer dependency injection using inject().
- Keep components small and reusable.
- Separate presentation from business logic.
- Use lazy loading for feature modules.
- Organize the project by features.

## Layout

Use CoreUI as the base layout.

Always reuse:

- Sidebar
- Header
- Footer
- Breadcrumb
- Cards
- Widgets
- Dashboard layout

Do not create custom layouts if CoreUI already provides one.

## Components

Prefer PrimeNG components whenever available.

Examples:

- Table
- Button
- InputText
- Dropdown
- Select
- DatePicker
- Dialog
- Toast
- ConfirmDialog
- Menu
- Card
- Tag
- Badge
- Skeleton
- ProgressSpinner

Avoid implementing components manually when PrimeNG already provides them.

## Styling

Use Tailwind CSS first.

Rules:

- Do not write unnecessary CSS.
- Use utility classes.
- Keep spacing consistent.
- Responsive by default.
- Prefer Flex and Grid.
- Use PrimeFlex only if strictly necessary.

## Forms

Always use:

- Reactive Forms
- Validators
- Typed Forms

Never use Template Driven Forms.

## Services

Business logic belongs inside services.

Components should only:

- display data
- handle user interaction
- call services

## HTTP

Centralize all HTTP requests.

Use:

- HttpClient
- Interceptors
- JWT Authentication
- Global Error Handling

## Code Quality

Generate production-ready code.

Avoid duplicated code.

Apply SOLID when appropriate.

Keep the code clean and maintainable.
