import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/**
 * Unauthenticated liveness probe for the uptime monitor and the shared
 * status.build-with-deepak.com page (see the README's Operations section).
 * Deliberately shallow — it confirms this process is up and answering HTTP,
 * not that Ollama or Qdrant are reachable, so a dependency hiccup doesn't
 * flap the monitor for a process that is otherwise fine and will recover on
 * the next request.
 */
@Controller('api/health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
