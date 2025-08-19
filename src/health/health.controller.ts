import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Healthcheck" })
  @ApiOkResponse({ schema: { type: "object", properties: {
    ok: { type: "boolean", example: true },
    ts: { type: "string", format: "date-time" },
  }}})
  alive() {
    return { ok: true, ts: new Date().toISOString() };
  }
}
