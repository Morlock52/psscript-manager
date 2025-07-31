import express from 'express';

const router = express.Router();

// Tag routes will be implemented here
router.get('/', (req, res) => {
  // Temporary placeholder response
  res.json({ message: 'Get tags endpoint (to be implemented)' });
});

router.get('/:id', (req, res) => {
  // Temporary placeholder response
  res.json({ message: `Get tag with ID ${req.params.id} (to be implemented)` });
});

export default router;