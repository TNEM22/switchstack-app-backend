import { Request, Response, NextFunction } from 'express';

interface AsyncFunction {
  (req: Request, res: Response, next: NextFunction): Promise<any>;
}

//             Function   return statement
export default (fn: AsyncFunction) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
