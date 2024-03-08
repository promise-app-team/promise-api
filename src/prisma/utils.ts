import { Prisma } from '@prisma/client';

export function isPrismaInitializationError(error: unknown): error is Prisma.PrismaClientInitializationError {
  return error instanceof Prisma.PrismaClientInitializationError;
}

export function isPrismaKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isPrismaUnknownRequestError(error: unknown): error is Prisma.PrismaClientUnknownRequestError {
  return error instanceof Prisma.PrismaClientUnknownRequestError;
}

export function isPrismaValidationError(error: unknown): error is Prisma.PrismaClientValidationError {
  return error instanceof Prisma.PrismaClientValidationError;
}

export function isPrismaRustPanicError(error: unknown): error is Prisma.PrismaClientRustPanicError {
  return error instanceof Prisma.PrismaClientRustPanicError;
}
