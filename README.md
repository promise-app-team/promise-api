# Promise API <!-- omit in toc -->

Promise 앱의 API 서버 저장소입니다.

**목차**

- [개발 환경 구성](#개발-환경-구성)
  - [의존성 설치](#의존성-설치)
  - [환경 변수 설정](#환경-변수-설정)
  - [데이터베이스 설정](#데이터베이스-설정)
  - [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
    - [로컬 개발 환경](#로컬-개발-환경)
    - [개발 운영 환경](#개발-운영-환경)
  - [로컬 서버 실행](#로컬-서버-실행)
  - [HTTPS로 로컬 서버 실행 (선택)](#https로-로컬-서버-실행-선택)
- [유닛/통합 테스트](#유닛통합-테스트)
- [타입/코드 검사](#타입코드-검사)

## 개발 환경 구성

>개발 환경 구성을 위한 가이드입니다. 이후 구성은 이전 과정이 완료된 상태에서 진행해야 합니다.

### 의존성 설치

이 프로젝트의 환경은 [node.js](https://nodejs.org) 런타임을 사용합니다. 사용하는 런타임 버전은 [`.node-version`](./.node-version) 파일에 명시되어 있습니다.

런타임 설치 후 다음 명령어를 실행하여 의존성을 설치합니다.

```bash
$ npm install
```

프로젝트를 초기화하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run init
```

위 명령어는 각 환경(Stage)에 따른 `.env` 파일을 생성하고, 필요한 환경변수를 초기화합니다.

### 환경 변수 설정

프로젝트 루트 디렉터리에 위치한 `.env.local` 파일을 열어 환경 변수를 설정합니다.

- 문자 사이에 공백이 있지 않는 한, 환경변수의 값 주변에 공백 혹은 따옴표를 감싸지 않아야 합니다.
- 생성 가능한 환경 변수의 경우 자동 생성되어 설정되어 있습니다. 확인 후 필요하다면 설정을 변경합니다.

**STAGE vs. NODE_ENV**

|STAGE| NODE_ENV |
|---|----------|
|`local`|`development`|
|`test`|`development`|
|`dev`|`production`|
|`prod`|`production`|


### 데이터베이스 설정

해당 API 서버는 MySQL과 Redis를 사용합니다. 개발 환경에서는 [Docker](https://www.docker.com/) 컨테이너를 사용하여 데이터베이스를 구성합니다.

[`docker`](https://www.docker.com/)의 설치를 완료하고, `docker compose` 명령어를 사용할 수 있는 환경에서 다음 명령어를 실행합니다.

>`.env.local` 파일에 설정된 각 데이터베이스 환경변수를 사용합니다.

>데이터베이스의 데이터는 프로젝트 루트 디렉터리에 `dockerdata` 디렉터리가 생성되어 저장됩니다.

```bash
$ make start_db
```

컨테이너 생성 이후 다음 데이터베이스가 생성되어야 합니다. (생성이 완료되기까지 약간의 시간이 소요됩니다.)

- `${DB_NAME}_${STAGE}`
- `${DB_NAME}_${STAGE}_shadow`
- `${DB_NAME}_test`
- `${DB_NAME}_test_shadow`

데이터베이스를 중지하려면 다음 명령어를 실행합니다.

```bash
$ make stop_db
```

간혹 데이터베이스를 찾지 못하는 경우 다음 명령어를 실행합니다.

```bash
$ make restart_db
```

필요하다면 데이터를 완전히 삭제합니다.

```bash
$ make clean_db
```

### 데이터베이스 마이그레이션

데이터베이스 마이그레이션 명령어에 대한 사용법을 확인하려면 다음 명령어를 실행합니다.

```bash
$ npm run migration help
```

#### 로컬 개발 환경

데이터베이스 구성을 완료하고, 마이그레이션을 실행하여 데이터베이스를 초기화합니다.

```bash
$ npm run migration up
```

마이그레이션 상태를 확인하거나, 더미 데이터를 추가하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run migration list

$ npm run migration seed
```

데이터베이스 스키마를 변경하려면 [schema.prisma](./prisma/schema.prisma) 파일을 수정합니다.

그 후, 변경사항을 반영한 새로운 마이그레이션을 생성하기 위해 다음 명령어를 실행합니다.

>데이터베이스 변경이 아닌 일부 내용 변경이더라도 빈 마이그레이션을 생성해야 합니다.

```bash
$ npm run migration new
```

생성된 마이그레이션 sql 파일은 `prisma/migrations` 디렉터리 하위에 위치합니다. 생성된 마이그레이션 파일을 검토합니다.

그리고 이를 데이터베이스에 적용하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run migration up
```

마이그레이션을 롤백할 필요가 있다면 다음 명령어를 실행합니다.

```bash
$ npm run migration down     # 마지막 마이그레이션을 롤백합니다.
$ npm run migration down <n> # 마지막 마이그레이션부터 <n> 개의 마이그레이션을 롤백합니다.
```

잘 적용되었는지 확인하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run migration list
```

#### 개발 운영 환경

>원격 접속 가능한 개발 운영 환경에 접속할 수 있어야 합니다.

최신 변경사항을 반영하기 위해 브랜치를 확인하고 최신화합니다.

```bash
$ git checkout develop
$ git pull origin develop
```

개발 운영 환경에 접속하기 위해 `.env-cmdrc.js` 파일을 열어 `dev` 환경 변수를 설정합니다. 또한, `.env.dev` 파일을 열어 다음의 환경 변수를 설정합니다.

- `DB_HOST`, `DB_PORT`: `.env-cmdrc.js` 파일에 설정된 값과 동일해야 합니다.
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`: 데이터베이스를 생성할 때 설정한 값과 동일해야 합니다.

새로운 터미널을 열고, 개발 운영 환경에 접속할 수 있도록 다음 명령어를 실행합니다.

```bash
$ npm run ssh-tunnel # 원격 터미널에 접속한 상태로 유지합니다.
```

다른 터미널을 열고, 데이터베이스 마이그레이션을 실행하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run migration:dev list # 상태 확인

$ npm run migration:dev up

$ npm run migration:dev list # 검토
```

SSH 터널이 열린 터미널을 닫아 SSH 터널을 종료합니다.

### 로컬 서버 실행

로컬 개발 서버를 실행하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run dev

# HTTP API      - http://localhost:$PORT
# WebSocket API - ws://localhost:$PORT
```

### HTTPS로 로컬 서버 실행 (선택)

우선 HTTPS 인증서를 생성하기 위해 [mkcert](https://github.com/FiloSottile/mkcert)를 설치합니다.

```bash
$ brew install mkcert
```

HTTPS로 로컬 서버를 실행하기 위해 다음 명령어를 실행합니다.

```bash
$ make start_https # 비밀번호를 입력하라는 메시지가 표시됩니다.

# HTTPS API - https://api.local.promise-app.com
```

HTTPS 서버를 중지하려면 다음 명령어를 실행합니다.

```bash
$ make stop_https # 비밀번호를 입력하라는 메시지가 표시됩니다.
```

## 유닛/통합 테스트

테스트를 실행하기 전에 `.env.test` 파일을 열어 환경 변수를 설정합니다.

테스트용 데이터베이스를 구성하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run migration:test list # 상태 확인

$ npm run migration:test up

$ npm run migration:test list # 검토
```

테스트를 실행하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run test
```

특정 키워드로 필터링하여 테스트를 실행할 수 있습니다.

```bash
$ npm run test auth.controller.spec # auth.controller.spec.ts 파일을 테스트합니다.
$ npm run test user.controller.e2e  # user.controller.e2e-spec.ts 파일을 테스트합니다.
$ npm run test service              # 모든 *.service.spec.ts 파일을 테스트합니다.
$ npm run test e2e                  # 모든 *.e2e-spec.ts 파일을 테스트합니다.
```

커버리지를 확인하기 위해 다음 명령어를 실행합니다.

```bash
$ npm run coverage
```

## 타입/코드 검사

타입 오류를 검사하기 위해 다음 명령어를 실행합니다.

```bash
# 모든 파일의 타입 체크를 실행합니다.
$ npm run typecheck

# 테스트 파일의 타입 체크를 실행합니다.
$ npm run typecheck:test
```

코드 품질을 검사하기 위해 다음 명령어를 실행합니다.

```bash
# 린트 오류를 검사합니다.
$ npm run lint

# 린트 오류를 자동으로 수정합니다.
$ npm run lint:fix
```
