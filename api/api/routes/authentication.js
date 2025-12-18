import { Router } from 'express';

import UserService from '../../services/user.js';
import urls from '../urls.js';
import { requireUser } from '../middlewares/auth.js';
import { requireSchema } from '../middlewares/validate.js';
import {
  registerSchema,
  changePasswordSchema,
  loginSchema,
  verifySchema
} from '../schemas/auth.js';
import upload from '../middlewares/upload.js';
import saveImageFromUrl from '../../utils/image.js';
import UserProfileService from "../../services/userprofile.js";
const router = Router();

/** @swagger
 *
 * tags:
 *   name: Authentication
 *   description: User authentication API
 *
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate with the service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/loginSchema'
 *     responses:
 *       200:
 *         description: Successful login, with user details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request, incorrect login credentials
 */

router.post(urls.auth.login, requireSchema(loginSchema), async (req, res) => {
  try{
    const { email, password } = req.validatedBody;


    const user = await UserService.authenticateWithPassword(email, password);
    if (user) {
      const token = UserService.generateToken(user);const userProfile = await UserProfileService.getByUser(user._id);

      // Convert Mongoose document to plain object
      const userData = user.toObject();

      res.json({
        token,
        user: {
          _id: userData._id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          isActive: userData.isActive,
          profilepicture: userData.profilepicture,
          phonenumber: userData.phonenumber,
          isPremium:userProfile?.isPremium ?? null,
          freeRidesRemaining:userProfile?.freeRidesRemaining ?? 0
        }
      });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }catch (err){
    res.status(500).json({error:err.toString()})
  }
 
});


/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify user email with a 6-digit code
 *     description: Verifies the user using a 6-digit email verification code.
 *     tags: 
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               code:
 *                 type: integer
 *                 example: 123456
 *     responses:
 *       200:
 *         description: User verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User verified successfully"
 *       400:
 *         description: Invalid verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid verification code"
 *       500:
 *         description: Internal Server Error
 */

router.post(urls.auth.verify, requireSchema(verifySchema), async (req, res) => {
  const { email, code } = req.body;

  try {
    const result = await UserService.verifyUser(email, code);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/** @swagger
 *
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register with the service
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/registerSchema'
 *     responses:
 *       201:
 *         description: Successful registration, with user details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request, registration failed
 */

router.post(
  urls.auth.register,
  upload.single('profilepicture'),
  async (req, res) => {
    try {
      const { name, email, password, role,phonenumber } = req.body;

      let profilepicture = null;

      if (req.file) {
        profilepicture = `/uploads/profile_pictures/${req.file.filename}`;
      } else if (
        req.body.profilepicture &&
        (req.body.profilepicture.startsWith('http://') ||
          req.body.profilepicture.startsWith('https://'))
      ) {
        profilepicture = await saveImageFromUrl(req.body.profilepicture);
      }

      const { user, token } = await UserService.createUser({
        name,
        email,
        password,
        role,
        profilepicture,
        phonenumber,

      });

      res.status(201).json({ user, token });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// all auth routes after this can rely on existence of req.user
router.use(requireUser);

/** @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Log out of the service - invalidate auth token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Successful logout, token invalidated
 */
router.post(urls.auth.logout, async (req, res) => {
  res.status(204).send();
});

router.post(
  urls.auth.changePassword,
  requireSchema(changePasswordSchema),
  async (req, res) => {
    const { password } = req.validatedBody;

    await UserService.setPassword(req.user, password.toString());
    res.status(204).send();
  },
);



export default router;