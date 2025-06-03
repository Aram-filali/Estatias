// Create a new file: test.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get()
  test() {
    return { message: 'Test controller works!' };
  }

  @Get('hello')
  hello() {
    return { message: 'Hello from test controller!' };
  }
}
