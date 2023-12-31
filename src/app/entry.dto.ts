export class EntryResponse {
  /**
   * @example pong
   */
  message!: string;

  /**
   * @example x.y.z
   * x: major version  \
   * y: minor version  \
   * z: patch version
   */
  version!: string;

  /**
   * @example 'yyyy-MM-ddTHH:mm:ssZ'
   */
  build!: string;

  /**
   * @example production
   */
  env!: string;

  /**
   * @example UTC
   */
  tz!: string;
}
