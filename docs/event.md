# Event Documentation <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Events](#events)
  - [`ping` event](#ping-event)
    - [Interfaces](#interfaces)
  - [`share-location` event](#share-location-event)
    - [Interfaces](#interfaces-1)
    - [Notes](#notes)



## Events

> **모든 이벤트 연결 시 인증 토큰을 담은 Authorization 헤더를 포함해야 합니다.**

### `ping` event

> ENDPOINT | wss://ws.dev.promise-app.com?event=ping \
> ENDPOINT | wss://ws.dev.promise-app.com?event=ping&channel=\[ChannelName\]

#### Interfaces

[**PingEventPayloadDTO**](https://github.com/promise-app-team/promise-api/search?q=PingEventPayloadDTO)

```yaml
{
  "event": "ping",
  "data": {
    "param": {
      "strategy": "self",
      "channel": [ChannelName], // required if channel is specified in the endpoint. (default: public)
    },
    "body": {
      // ...
    }
  }
}
```

```yaml
{
  "event": "ping",
  "data": {
    "param": {
      "strategy": "specific",
      "to": [ConnectionID],
      "channel": [ChannelName], // optional. can be sent to client in a specific channel. (default: public)
    },
    "body": {
      // ...
    }
  }
}
```

```yaml
{
  "event": "ping",
  "data": {
    "param": {
      "strategy": "broadcast",
      "channel": [ChannelName], // optional. can be broadcasted to all clients in a specific channel. (default: public)
    },
    "body": {
      // ...
    }
  }
}
```

[**PingEventMessageDTO**](https://github.com/promise-app-team/promise-api/search?q=PingEventMessageDTO)

```yaml
{
  "from": [ConnectionID],
  "timestamp": 1234567890  ,
  "data": {
    // from body
  }
}
```

```yaml
{
  "from": [ConnectionID],
  "timestamp": 1234567890  ,
  "data": {
    "error": "message"
  }
}
```

### `share-location` event

> ENDPOINT | wss://ws.dev.promise-app.com?event=share-location

#### Interfaces

[**ShareLocationEventPayloadDTO**](https://github.com/promise-app-team/promise-api/search?q=ShareLocationEventPayloadDTO)

```yaml
{
  "event": "share-location",
  "data": {
    "param": {
      "promiseIds": [
        "1234567890",
        "2345678901"
      ]
    },
    "body": {
      "lat": 37.7749,
      "lng": 122.4194
    }
  }
}
```

[**ShareLocationEventMessageDTO**](https://github.com/promise-app-team/promise-api/search?q=ShareLocationEventMessageDTO)

```yaml
{
  "from": [UserID],
  "timestamp": 1234567890,
  "data": {
    "lat": 37.7749,
    "lng": 122.4194
  }
}
```

```yaml
{
  "from": [UserID],
  "timestamp": 1234567890,
  "data": {
    "error": "message"
  }
}
```

#### Notes

- 이벤트 연결 시
  - 해당 이벤트 연결 시 로그인한 사용자 정보를 불러옵니다. 인증 정보를 찾을 수 없으면, `401 Unauthorized` 에러를 응답합니다.
  - 로그인한 사용자가 현재 참여 중인 약속 목록을 불러옵니다. 참여 중인 약속 목록이 없으면, `403 Forbidden` 에러를 응답합니다.
- 메시지 전송 시
  - 기기 위치 정보(위도, 경도)와 함께 현재 참여 중인 약속 ID 목록을 전달해야 합니다.
  - 전달한 약속의 모든 참여자를 대상으로 위치 정보를 공유합니다.
- 새로운 약속에 참여하거나, 약속을 떠나거나, 약속이 만료되는 등 참여한 약속 목록에 변경이 발생하는 경우 재연결해야 합니다.
- 연결 당시 조회했던 약속 목록와 전송한 약속 ID가 불일치할 경우 에러가 발생할 수 있습니다. 오류 발생시 재연결해야 합니다.
- 연결하는 동안 약속 목록을 불러오는 시간을 고려하여, 연결 직후 곧바로 메시지를 전송하지 않도록 합니다.
