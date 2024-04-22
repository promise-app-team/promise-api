export class Connection {
  /**
   * Connection ID
   */
  id!: string;

  /**
   * issued at (timestamp)
   */
  iat!: number;

  /**
   * expired at (timestamp)
   */
  exp!: number;

  /**
   * ttl (time to live in seconds)
   */
  ttl!: number;

  /**
   * scope
   */
  scp!: string;

  /**
   * stage
   */
  stg!: string;
}
