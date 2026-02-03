import { Request, Response, NextFunction } from 'express';

export abstract class BaseController {
  protected abstract model: any;

  protected async handleRequest(
    req: Request,
    res: Response,
    handler: () => Promise<any>
  ): Promise<void> {
    try {
      const result = await handler();
      // Only send response if it hasn't been sent yet and result is not undefined
      if (!res.headersSent && result !== undefined) {
        res.json(result);
      }
    } catch (error: any) {
      console.error('Controller error:', error);
      if (!res.headersSent) {
        const status = error.status || error.statusCode || 500;
        res.status(status).json({
          message: error.message || 'Internal server error',
        });
      }
    }
  }

  protected sendSuccess(res: Response, data: any, statusCode: number = 200): any {
    // Just return data - handleRequest will send it
    return data;
  }

  protected sendError(res: Response, message: string, statusCode: number = 500): never {
    // Throw error so handleRequest can catch it
    const error: any = new Error(message);
    error.status = statusCode;
    throw error;
  }
}
