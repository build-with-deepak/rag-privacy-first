import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/health (GET) is public and reports ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string; timestamp: string };
        expect(body.status).toBe('ok');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  it('/api/auth/demo (POST) issues a demo session token', () => {
    return request(app.getHttpServer())
      .post('/api/auth/demo')
      .expect(200)
      .expect((res) => {
        const body = res.body as { accessToken: string; user: { id: string } };
        expect(body.accessToken.split('.')).toHaveLength(3);
        expect(body.user.id).toMatch(/^demo-/);
      });
  });

  it('/api/auth/register (POST) answers 501 coming-soon', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .expect(501)
      .expect((res) => {
        expect((res.body as { message: string }).message).toMatch(
          /coming soon/i,
        );
      });
  });

  it('/api/documents/sample (POST) rejects an unauthenticated request', () => {
    return request(app.getHttpServer())
      .post('/api/documents/sample')
      .expect(401);
  });

  it('/api/query/stream (GET) rejects an unauthenticated request', () => {
    return request(app.getHttpServer())
      .get('/api/query/stream')
      .query({ documentId: 'anything', question: 'hello' })
      .expect(401);
  });

  it('a demo token gets past auth into validation — including via ?token= for EventSource', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/demo')
      .expect(200);
    const token = (login.body as { accessToken: string }).accessToken;

    // Missing question → 400 proves the request cleared the auth guard.
    // The token rides in the query string here because that is exactly how
    // the browser's EventSource has to send it.
    await request(app.getHttpServer())
      .get('/api/query/stream')
      .query({ documentId: 'anything', token })
      .expect(400);
  });
});
