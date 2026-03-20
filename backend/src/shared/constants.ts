export const WORKSPACE_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type WorkspaceRole =
  (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];

export const INVITATION_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
} as const;

export type InvitationStatus =
  (typeof INVITATION_STATUSES)[keyof typeof INVITATION_STATUSES];

export const ACCOUNT_TYPES = {
  BANK_ACCOUNT: "bank_account",
  CASH: "cash",
  STOCKS_CRYPTO: "stocks_crypto",
  PROPERTY: "property",
  VEHICLES: "vehicles",
  OTHER_ASSETS: "other_assets",
  CREDIT: "credit",
  LOAN: "loan",
} as const;

export type AccountType =
  (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

export const CATEGORY_TYPES = {
  EXPENSE: "expense",
  INCOME: "income",
} as const;

export type CategoryType =
  (typeof CATEGORY_TYPES)[keyof typeof CATEGORY_TYPES];

export const TRANSACTION_TYPES = {
  EXPENSE: "expense",
  INCOME: "income",
  TRANSFER: "transfer",
  BALANCE_CORRECTION: "balance_correction",
  INITIAL_BALANCE: "initial_balance",
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const SYSTEM_CATEGORIES = {
  REFUND: "refund",
} as const;

export type SystemCategory =
  (typeof SYSTEM_CATEGORIES)[keyof typeof SYSTEM_CATEGORIES];
