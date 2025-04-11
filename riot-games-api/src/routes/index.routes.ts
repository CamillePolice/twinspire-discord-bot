import { Router } from 'express';
import accountRoutes from './account.routes';
import summonerRoutes from './summoner.routes';
import matchRoutes from './match.routes';
import leagueRoutes from './league.routes';
import championRoutes from './champion.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Route mounting
router.use('/riot/account', accountRoutes);
router.use('/lol/summoner', summonerRoutes);
router.use('/lol/match', matchRoutes);
router.use('/lol/league', leagueRoutes);
router.use('/lol/champion-mastery', championRoutes);

export default router;