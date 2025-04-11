import { Router } from 'express';
import summonerController from '../controllers/summoner.controller';

const router = Router();

/**
 * @route GET /api/lol/summoner/by-name/:name
 * @desc Get summoner information by summoner name
 * @access Private
 */
router.get('/by-name/:name', summonerController.getSummonerByName);

/**
 * @route GET /api/lol/summoner/by-account/:accountId
 * @desc Get summoner information by account ID
 * @access Private
 */
router.get('/by-account/:accountId', summonerController.getSummonerByAccountId);

/**
 * @route GET /api/lol/summoner/by-puuid/:puuid
 * @desc Get summoner information by PUUID
 * @access Private
 */
router.get('/by-puuid/:puuid', summonerController.getSummonerByPuuid);

/**
 * @route GET /api/lol/summoner/:id
 * @desc Get summoner information by summoner ID
 * @access Private
 */
router.get('/:id', summonerController.getSummonerById);

export default router;