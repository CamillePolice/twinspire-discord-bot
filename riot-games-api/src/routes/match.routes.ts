import { Router } from 'express';
import matchController from '../controllers/match.controller';

const router = Router();

/**
 * @route GET /api/lol/match/by-puuid/:puuid
 * @desc Get match IDs for a player by PUUID
 * @access Private
 */
router.get('/by-puuid/:puuid', matchController.getMatchIdsByPuuid);

/**
 * @route GET /api/lol/match/:matchId
 * @desc Get match details by match ID
 * @access Private
 */
router.get('/:matchId', matchController.getMatchById);

/**
 * @route GET /api/lol/match/:matchId/timeline
 * @desc Get match timeline by match ID
 * @access Private
 */
router.get('/:matchId/timeline', matchController.getMatchTimelineById);

export default router;