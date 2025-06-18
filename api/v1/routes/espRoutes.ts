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
  .post(authController.restrictTo('user'), espController.registerEsp);
//   .get(espController.getAllSwitch)

router
  .route('/:espId')
  .patch(espController.updateEsp)
  .delete(espController.removeEsp);

router
  .route('/:espId/users')
  .get(espController.getEspUsers)
  .post(espController.addUserToEsp);

router
  .route('/:espId/users/:userEmail')
  .delete(espController.removeUserFromEsp);

router.route('/:espId/switch/:switchId').patch(espController.updateSwitch);
// router.route('/switch/:id').patch(espController.updateSwitch);

export default router;
