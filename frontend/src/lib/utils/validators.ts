/**
 * Validation Schemas for Engunity AI
 * Zod-based validation for forms and API inputs
 * 
 * Stack: Next.js 14 + Zod + React Hook Form + Supabase + MongoDB
 * File: frontend/src/lib/utils/validators.ts
 */

import { z } from 'zod';

// ========================================
// COMMON VALIDATION PATTERNS
// ========================================

/** Email validation pattern */
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long')
  .toLowerCase()
  .trim();

/** Password validation pattern */
const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/** Strong password validation for security-sensitive operations */
const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain uppercase, lowercase, number, and special character'
  );

/** Name validation pattern */
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

/** URL validation pattern */
const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .max(2048, 'URL is too long')
  .optional()
  .or(z.literal(''));

/** File size validation (in bytes) */
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** Supported file types */
const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
] as const;

// ========================================
// AUTHENTICATION SCHEMAS
// ========================================

/** Login form validation schema */
export const LoginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
  rememberMe: z.boolean().optional().default(false)
});

/** Signup form validation schema */
export const SignupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    agreeToTerms: z
      .boolean()
      .refine(val => val === true, 'You must agree to the terms and conditions'),
    marketingConsent: z.boolean().optional().default(false)
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

/** Password reset request schema */
export const ResetPasswordSchema = z.object({
  email: emailSchema
});

/** Password reset confirmation schema */
export const ResetPasswordConfirmSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password')
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

/** Email verification schema */
export const EmailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

/** Magic link request schema */
export const MagicLinkSchema = z.object({
  email: emailSchema,
  redirectTo: z.string().url().optional()
});

// ========================================
// PROFILE & SETTINGS SCHEMAS
// ========================================

/** Profile update validation schema */
export const UpdateProfileSchema = z.object({
  name: nameSchema.optional(),
  firstName: z
    .string()
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\s'-]*$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\s'-]*$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(160, 'Bio must be 160 characters or less')
    .optional()
    .or(z.literal('')),
  avatar: urlSchema,
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  timezone: z
    .string()
    .max(50, 'Timezone is invalid')
    .optional(),
  locale: z
    .string()
    .max(10, 'Locale is invalid')
    .optional()
});

/** Password change validation schema */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    newPassword: strongPasswordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your new password')
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword']
  })
  .refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
  });

/** User preferences validation schema */
export const UpdatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
    marketing: z.boolean().default(false)
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']).default('public'),
    showOnlineStatus: z.boolean().default(true),
    allowDirectMessages: z.boolean().default(true)
  }).optional(),
  features: z.object({
    enabledModules: z.array(z.string()).default([]),
    defaultAIModel: z.string().optional(),
    autoSave: z.boolean().default(true)
  }).optional()
});

// ========================================
// DOCUMENT & FILE SCHEMAS
// ========================================

/** Document upload validation schema */
export const DocumentUploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Please select a file' })
    .refine(file => file.size <= MAX_FILE_SIZE, 'File size must be less than 50MB')
    .refine(
      file => SUPPORTED_FILE_TYPES.includes(file.type as any),
      'File type not supported. Please upload PDF, Word, Text, Markdown, Image, or Excel files'
    ),
  name: z
    .string()
    .max(255, 'File name is too long')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .or(z.literal('')),
  folderId: z
    .string()
    .uuid('Invalid folder ID')
    .optional(),
  tags: z
    .array(z.string().max(50, 'Tag is too long'))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  isPublic: z.boolean().default(false)
});

/** Document folder creation schema */
export const CreateFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(100, 'Folder name is too long')
    .regex(/^[^<>:"/\\|?*]+$/, 'Folder name contains invalid characters'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .or(z.literal('')),
  parentId: z
    .string()
    .uuid('Invalid parent folder ID')
    .optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
    .optional()
});

/** Document sharing schema */
export const ShareDocumentSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  permission: z.enum(['read', 'comment', 'edit']).default('read'),
  expiresAt: z
    .string()
    .datetime('Invalid expiration date')
    .optional(),
  sharedWith: z
    .string()
    .email('Invalid email address')
    .optional() // If empty, creates public share link
});

// ========================================
// CHAT & AI SCHEMAS
// ========================================

/** Chat prompt validation schema */
export const ChatPromptSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Please enter a message')
    .max(4000, 'Message is too long (max 4000 characters)')
    .trim(),
  sessionId: z
    .string()
    .min(1, 'Session ID is required')
    .optional(),
  model: z
    .string()
    .min(1, 'AI model is required')
    .optional(),
  temperature: z
    .number()
    .min(0, 'Temperature must be between 0 and 2')
    .max(2, 'Temperature must be between 0 and 2')
    .optional(),
  maxTokens: z
    .number()
    .min(1, 'Max tokens must be at least 1')
    .max(4000, 'Max tokens cannot exceed 4000')
    .optional(),
  systemPrompt: z
    .string()
    .max(1000, 'System prompt is too long')
    .optional()
    .or(z.literal(''))
});

/** Chat session creation schema */
export const CreateChatSessionSchema = z.object({
  title: z
    .string()
    .min(1, 'Session title is required')
    .max(100, 'Title is too long')
    .trim(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional()
    .or(z.literal('')),
  projectId: z
    .string()
    .uuid('Invalid project ID')
    .optional(),
  tags: z
    .array(z.string().max(30, 'Tag is too long'))
    .max(5, 'Maximum 5 tags allowed')
    .optional()
    .default([]),
  modelSettings: z.object({
    model: z.string().min(1, 'Model is required'),
    provider: z.string().min(1, 'Provider is required'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(4000).default(1000),
    systemPrompt: z.string().max(1000).optional()
  }).optional()
});

/** Document Q&A validation schema */
export const DocumentQASchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(500, 'Question is too long')
    .trim(),
  context: z
    .string()
    .max(2000, 'Context is too long')
    .optional()
    .or(z.literal(''))
});

// ========================================
// PROJECT & WORKSPACE SCHEMAS
// ========================================

/** Project creation validation schema */
export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name is too long')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description is too long')
    .optional()
    .or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z
    .string()
    .datetime('Invalid due date')
    .optional(),
  collaborators: z
    .array(z.string().email('Invalid collaborator email'))
    .max(10, 'Maximum 10 collaborators allowed')
    .optional()
    .default([]),
  isPublic: z.boolean().default(false),
  tags: z
    .array(z.string().max(30, 'Tag is too long'))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
    .optional()
});

// ========================================
// DATA ANALYSIS SCHEMAS
// ========================================

/** Dataset upload validation schema */
export const DatasetUploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Please select a file' })
    .refine(file => file.size <= MAX_FILE_SIZE, 'File size must be less than 50MB')
    .refine(
      file => ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json'].includes(file.type),
      'File must be CSV, Excel, or JSON format'
    ),
  name: z
    .string()
    .min(1, 'Dataset name is required')
    .max(100, 'Dataset name is too long')
    .trim(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional()
    .or(z.literal('')),
  projectId: z
    .string()
    .uuid('Invalid project ID')
    .optional(),
  isPublic: z.boolean().default(false)
});

// ========================================
// API KEY MANAGEMENT SCHEMAS
// ========================================

/** API key creation validation schema */
export const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Name can only contain letters, numbers, spaces, underscores, and hyphens')
    .trim(),
  permissions: z
    .array(z.enum(['read', 'write', 'delete', 'admin']))
    .min(1, 'At least one permission is required')
    .max(4, 'Too many permissions selected'),
  expiresAt: z
    .string()
    .datetime('Invalid expiration date')
    .optional(),
  rateLimitPerHour: z
    .number()
    .min(1, 'Rate limit must be at least 1')
    .max(10000, 'Rate limit is too high')
    .default(1000)
});

// ========================================
// ADMIN SCHEMAS
// ========================================

/** User management schema (admin only) */
export const AdminUpdateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['user', 'pro', 'admin', 'moderator', 'developer', 'enterprise', 'super_admin', 'beta_tester']),
  status: z.enum(['active', 'inactive', 'pending_verification', 'suspended', 'deleted']),
  subscriptionTier: z.enum(['free', 'starter', 'pro', 'enterprise', 'custom']).optional(),
  creditsToAdd: z
    .number()
    .min(-1000000, 'Credit adjustment is too large')
    .max(1000000, 'Credit adjustment is too large')
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .optional()
    .or(z.literal(''))
});

// ========================================
// CONTACT & SUPPORT SCHEMAS
// ========================================

/** Contact form validation schema */
export const ContactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long')
    .trim(),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message is too long')
    .trim(),
  category: z.enum(['general', 'technical', 'billing', 'feature_request', 'bug_report']).default('general')
});

/** Feedback form validation schema */
export const FeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'praise', 'other']),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title is too long')
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description is too long')
    .trim(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z
    .string()
    .max(50, 'Category is too long')
    .optional(),
  attachments: z
    .array(z.instanceof(File))
    .max(5, 'Maximum 5 attachments allowed')
    .optional()
    .default([])
});

// ========================================
// EXPORTED TYPES (inferred from schemas)
// ========================================

// Authentication types
export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ResetPasswordConfirmInput = z.infer<typeof ResetPasswordConfirmSchema>;
export type EmailVerificationInput = z.infer<typeof EmailVerificationSchema>;
export type MagicLinkInput = z.infer<typeof MagicLinkSchema>;

// Profile & Settings types
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

// Document & File types
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type ShareDocumentInput = z.infer<typeof ShareDocumentSchema>;

// Chat & AI types
export type ChatPromptInput = z.infer<typeof ChatPromptSchema>;
export type CreateChatSessionInput = z.infer<typeof CreateChatSessionSchema>;
export type DocumentQAInput = z.infer<typeof DocumentQASchema>;

// Project & Workspace types
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// Data Analysis types
export type DatasetUploadInput = z.infer<typeof DatasetUploadSchema>;

// API Key Management types
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

// Admin types
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;

// Contact & Support types
export type ContactFormInput = z.infer<typeof ContactFormSchema>;
export type FeedbackInput = z.infer<typeof FeedbackSchema>;

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Utility function to safely parse and validate data
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with success/error information
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => err.message);
  return { success: false, errors };
}

/**
 * Utility function to get field-specific errors for forms
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with field names as keys and error messages as values
 */
export function getFieldErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Record<string, string> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {};
  }
  
  const fieldErrors: Record<string, string> = {};
  
  result.error.errors.forEach(err => {
    const field = err.path.join('.');
    if (!fieldErrors[field]) {
      fieldErrors[field] = err.message;
    }
  });
  
  return fieldErrors;
}