import express from 'express';
import userController from '../controllers/userController';
import authController from '../controllers/authController';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// router.patch('/updatePassword', authController.updatePassword);
// router.patch(
//   '/updateMyPassword',
//   authController.protect,
//   authController.updatePassword
// );

router.use(authController.protect); // Protect all routes after this middleware
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin')); // Restrict all routes after this middleware
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

export default router;
