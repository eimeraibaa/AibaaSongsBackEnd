import 'dotenv/config';
import {Router} from 'express'
import {songRequest} from '../controllers/songs.controller.js'
const router = Router()

router.post('/song-Request',songRequest)

export default router;