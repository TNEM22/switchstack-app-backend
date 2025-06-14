import express from 'express';
import espController from '../controllers/espController';
import authController from '../controllers/authController';

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(authController.restrictTo('user'), espController.getAllEsp) // Get user registered esps and switches.
  .post(authController.restrictTo('admin'), espController.createEsp);

// Qr code process
router
  .route('/register')
  .post(authController.restrictTo('user'), espController.registerDevice);
//   .get(espController.getAllSwitch)

router.route('/:espId').patch(espController.updateEsp);

router.route('/:espId/switch/:switchId').patch(espController.updateSwitch);
// router.route('/switch/:id').patch(espController.updateSwitch);

export default router;
