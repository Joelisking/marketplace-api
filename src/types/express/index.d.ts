import 'express';

declare module 'express' {
  export interface Request {
    user?: Record<string, unknown>; // Replace with the actual user type if available
  }
}
