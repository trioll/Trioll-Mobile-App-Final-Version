# Services Placeholder

This folder is reserved for future backend services.

## Planned Services

### `api.ts`

- API client for backend communication
- Will handle all HTTP requests

### `auth.ts`

- Authentication service
- Login, logout, token management

### `gameService.ts`

- Game data fetching
- Trial streaming setup

### `userService.ts`

- User profile management
- Preferences and settings

## Example Structure

```typescript
// api.ts
export const api = {
  get: async (endpoint: string) => {
    // TODO: Implement actual API call
    return mockData;
  },
  post: async (endpoint: string, data: any) => {
    // TODO: Implement actual API call
    return { success: true };
  },
};
```
