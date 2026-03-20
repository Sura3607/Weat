import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, _req, {
    status: 'ok',
    version: '0.1.0',
  });
});

export default router;
