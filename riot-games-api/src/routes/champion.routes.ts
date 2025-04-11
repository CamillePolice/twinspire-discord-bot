import { Router } from 'express';
import leagueController from '../controllers/league.controller';

const router = Router();

/**
 * @route GET /api/lol/league/by-summoner/:summonerId
 * @desc Get league entries for a summoner by summoner ID
 * @access Private
 */
router.get('/by-summoner/:summonerId', leagueController.getLeagueBySummonerId);

/**
 * @route GET /api/lol/league/challenger/:queue
 * @desc Get challenger league for a given queue
 * @access Private
 */
router.get('/challenger/:queue', leagueController.getChallengerLeague);

/**
 * @route GET /api/lol/league/grandmaster/:queue
 * @desc Get grandmaster league for a given queue
 * @access Private
 */
router.get('/grandmaster/:queue', leagueController.getGrandmasterLeague);

/**
 * @route GET /api/lol/league/master/:queue
 * @desc Get master league for a given queue
 * @access Private
 */
router.get('/master/:queue', leagueController.getMasterLeague);

export default router;