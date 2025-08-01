/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodError } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
}

export function formatZodErrors(error: ZodError<any>): {
  message: string;
  errors: ValidationError[];
} {
  // Ensure error.issues exists and is an array
  if (!error.issues || !Array.isArray(error.issues)) {
    return {
      message: 'Validation failed',
      errors: [{ field: 'unknown', message: 'Invalid request data' }],
    };
  }

  const errors: ValidationError[] = error.issues.map((err: any) => {
    const field = err.path.join('.');
    let message = '';

    // Customize error messages based on error code and field
    switch (err.code) {
      case 'invalid_string':
        if (err.validation === 'email') {
          message = 'Please enter a valid email address';
        } else if (err.validation === 'url') {
          if (err.received === '') {
            message = 'Social media links can be left empty or must be valid URLs';
          } else {
            message = 'Please enter a valid URL';
          }
        } else {
          message = `Please enter a valid ${field}`;
        }
        break;
      case 'invalid_type':
        message = `Please provide a valid ${field}`;
        break;
      case 'too_small':
        if (err.type === 'string') {
          message = `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${err.minimum} characters`;
        } else if (err.type === 'array') {
          message = `Please select at least ${err.minimum} ${field}`;
        } else {
          message = `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${err.minimum}`;
        }
        break;
      case 'too_big':
        if (err.type === 'string') {
          message = `${field.charAt(0).toUpperCase() + field.slice(1)} must be no more than ${err.maximum} characters`;
        } else if (err.type === 'array') {
          message = `Please select no more than ${err.maximum} ${field}`;
        } else {
          message = `${field.charAt(0).toUpperCase() + field.slice(1)} must be no more than ${err.maximum}`;
        }
        break;
      case 'invalid_enum_value':
        message = `Please select a valid ${field}`;
        break;
      case 'invalid_format':
        if (field.includes('ghanaCardNumber')) {
          message = 'Ghana Card number must be in format: GHA-123456789-X';
        } else if (field.includes('phone')) {
          message = 'Please enter a valid phone number';
        } else if (field.includes('bankAccountNumber')) {
          message = 'Please enter a valid bank account number';
        } else {
          message = `Please enter a valid ${field}`;
        }
        break;
      default:
        message = err.message || `Please check the ${field} field`;
    }

    return { field, message };
  });

  const mainMessage =
    errors.length === 1 ? errors[0].message : `Please fix the following ${errors.length} errors:`;

  return {
    message: mainMessage,
    errors,
  };
}
