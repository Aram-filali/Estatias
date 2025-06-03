import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class StripeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Since this is a TCP microservice:
    let message = 'Internal server error';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Throw RpcException to return error properly via microservice transport
    throw new RpcException({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
