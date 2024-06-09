export * from './event.module';
export * from './events';

import type { APIGatewayEvent } from 'aws-lambda';

export function configureWebSocketEvent(event: APIGatewayEvent) {
  const { requestContext } = event;
  const { connectionId, eventType } = requestContext ?? {};
  if (!eventType) return;

  if (eventType === 'MESSAGE') {
    const body = JSON.parse(event.body ?? '{}');
    event.path = `/event/${body.event ?? 'unknown'}`;
    event.httpMethod = 'POST';
  } else {
    event.path = `/event/${eventType.toLowerCase()}`;
    event.httpMethod = 'GET';
  }

  (event.queryStringParameters ??= {})['connectionId'] = connectionId ?? '';
  (event.multiValueQueryStringParameters ??= {})['connectionId'] = [connectionId ?? ''];
}
