import 'dotenv/config';
import {Router} from 'express'
import {loginUser,registerUser , getAuthenticatedUser} from '../controllers/users.controller.js'
import { isAuthenticated } from '../middleware/auth.js';
const router = Router()

router.post('/login',loginUser)
router.post('/register',registerUser)
router.get('/auth', isAuthenticated, getAuthenticatedUser);

export default router;