import { Router } from 'express';

import UserProfileService from '../../services/userprofile.js';
import { requireUser } from '../middlewares/auth.js';
import { requireSchema, requireValidId } from '../middlewares/validate.js';
import schema from '../schemas/userprofile.js';

const router = Router();

router.use(requireUser);

/** @swagger
 *
 * tags:
 *   name: UserProfile
 *   description: API for managing UserProfile objects
 *
 * /user-profile:
 *   get:
 *     tags: [UserProfile]
 *     summary: Get all the UserProfile objects
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of UserProfile objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserProfile'
 */
router.get('', async (req, res, next) => {
  try {
    const results = await UserProfileService.list();
    res.json(results);
  } catch (error) {
    if (error.isClientError()) {
      res.status(400).json({ error });
    } else {
      next(error);
    }
  }
});

/** @swagger
 *
 * /user-profile:
*   post:
 *     tags: [UserProfile]
 *     summary: Create a new UserProfile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfile'
 *     responses:
 *       201:
 *         description: The created UserProfile object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 */
router.post('', requireSchema(schema), async (req, res, next) => {
  try {
    const obj = await UserProfileService.create(req.validatedBody);
    res.status(201).json(obj);
  } catch (error) {
    if (error.isClientError()) {
      res.status(400).json({ error });
    } else {
      next(error);
    }
  }
});

/** @swagger
 *
 * /user-profile/{id}:
 *   get:
 *     tags: [UserProfile]
 *     summary: Get a UserProfile by id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: UserProfile object with the specified id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 */
router.get('/:id', requireValidId, async (req, res, next) => {
  try {
    const obj = await UserProfileService.get(req.params.id);
    if (obj) {
      res.json(obj);
    } else {
      res.status(404).json({ error: 'Resource not found' });
    }
  } catch (error) {
    if (error.isClientError()) {
      res.status(400).json({ error });
    } else {
      next(error);
    }
  }
});

/** @swagger
 *
 * /user-profile/{id}:
 *   put:
 *     tags: [UserProfile]
 *     summary: Update UserProfile with the specified id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfile'
 *     responses:
 *       200:
 *         description: The updated UserProfile object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 */
router.put('/:id', requireValidId, requireSchema(schema), async (req, res, next) => {
  try {
    const obj = await UserProfileService.update(req.params.id, req.validatedBody);
    if (obj) {
      res.status(200).json(obj);
    } else {
      res.status(404).json({ error: 'Resource not found' });
    }
  } catch (error) {
    if (error.isClientError()) {
      res.status(400).json({ error });
    } else {
      next(error);
    }
  }
});

/** @swagger
 *
 * /user-profile/{id}:
 *   delete:
 *     tags: [UserProfile]
 *     summary: Delete UserProfile with the specified id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *        description: OK, object deleted
 */
router.delete('/:id', requireValidId, async (req, res, next) => {
  try {
    const success = await UserProfileService.delete(req.params.id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Not found, nothing deleted' });
    }
  } catch (error) {
    if (error.isClientError()) {
      res.status(400).json({ error });
    } else {
      next(error);
    }
  }
});

export default router;