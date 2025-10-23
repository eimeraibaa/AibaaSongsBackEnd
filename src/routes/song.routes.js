import 'dotenv/config';
import {Router} from 'express'
import {generateSongsFromOrder} from '../controllers/song.controller.js'
import {isAuthenticated} from '../middleware/auth.js'

const router = Router()

// Proteger endpoint con autenticación
router.post('/generateSongsFromOrder/:orderId', isAuthenticated, generateSongsFromOrder)

export default router;