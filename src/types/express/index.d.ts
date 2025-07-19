import 'express';

declare module 'express' {
  export interface Request {
    user?: any; // Replace 'any' with the actual user type if available
  }
}
