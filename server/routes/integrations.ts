import { Router } from 'express';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { requireEntitlement } from '../middleware/entitlements.middleware.js';

const router = Router();

// All integrations/API features require subscription and api_access entitlement
router.use(requireSubscription());
router.use(requireEntitlement('api_access'));

router.get('/status', async (_req, res) => {
  // Placeholder: useful to verify entitlement protection in QA
  return res.json({ status: 'ok', message: 'API access enabled for this tenant' });
});

export default router;
