import 'dotenv/config';
import {Router} from 'express'
import {generateSongsFromOrder} from '../controllers/song.controller.js'
const router = Router()

router.post('/generateSongsFromOrder/:orderId',generateSongsFromOrder)

export default router;