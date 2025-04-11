import { Router } from 'express';
import accountController from '../controllers/account.controller';

const router = Router();

/**
 * @route GET /api/riot/account/:gameName/:tagLine
 * @desc Get account information by Riot ID and tag line
 * @access Private
 */
router.get('/:gameName/:tagLine', accountController.getAccountByRiotId);

/**
 * @route GET /api/riot/account/by-puuid/:puuid
 * @desc Get account information by PUUID
 * @access Private
 */
router.get('/by-puuid/:puuid', accountController.getAccountByPuuid);

export default router;