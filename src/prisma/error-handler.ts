import { Prisma } from '@prisma/client';

/**
 * @see https://www.prisma.io/docs/orm/reference/error-reference#error-codes
 */
export enum PrismaErrorCode {
  P1000 = 'P1000',
  P1001 = 'P1001',
  P1002 = 'P1002',
  P1003 = 'P1003',
  P1008 = 'P1008',
  P1009 = 'P1009',
  P1010 = 'P1010',
  P1011 = 'P1011',
  P1012 = 'P1012',
  P1013 = 'P1013',
  P1014 = 'P1014',
  P1015 = 'P1015',
  P1016 = 'P1016',
  P1017 = 'P1017',
  P2000 = 'P2000',
  P2001 = 'P2001',

  /**
   * Unique constraint failed on the {constraint}
   */
  P2002 = 'P2002',

  /**
   * Unique constraint failed on the {constraint}
   */
  P2003 = 'P2003',
  P2004 = 'P2004',
  P2005 = 'P2005',
  P2006 = 'P2006',
  P2007 = 'P2007',
  P2008 = 'P2008',
  P2009 = 'P2009',
  P2010 = 'P2010',
  P2011 = 'P2011',
  P2012 = 'P2012',
  P2013 = 'P2013',
  P2014 = 'P2014',
  P2015 = 'P2015',
  P2016 = 'P2016',
  P2017 = 'P2017',
  P2018 = 'P2018',
  P2019 = 'P2019',
  P2020 = 'P2020',
  P2021 = 'P2021',
  P2022 = 'P2022',
  P2023 = 'P2023',
  P2024 = 'P2024',

  /**
   * An operation failed because it depends on one or more records that were required but not found. {cause}
   */
  P2025 = 'P2025',
  P2026 = 'P2026',
  P2027 = 'P2027',
  P2028 = 'P2028',
  P2029 = 'P2029',
  P2030 = 'P2030',
  P2031 = 'P2031',
  P2033 = 'P2033',
  P2034 = 'P2034',
  P2035 = 'P2035',
  P2036 = 'P2036',
  P2037 = 'P2037',
}

type PrismaErrorCodeType = keyof typeof PrismaErrorCode;

export class PrismaClientError extends Error {
  constructor(
    public code: PrismaErrorCodeType,
    public message: string
  ) {
    super(message);
  }

  static from(error: any): PrismaClientError | null {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code in PrismaErrorCode) {
        return new PrismaClientError(error.code as PrismaErrorCodeType, error.message);
      }
      throw new Error(`Unknown Prisma error code: ${error.code}`);
    }
    return null;
  }
}
