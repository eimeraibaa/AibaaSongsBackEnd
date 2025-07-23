import 'dotenv/config';
import {Router} from 'express'
import { isAuthenticated } from '../middleware/auth.js';
import {
  createOrder,
  createOrderItem,
  getUserOrders,
  checkSongPayment,
} from '../controllers/orders.controller.js';

const router = Router()

router.post('/api/orders', isAuthenticated, createOrder);
router.post('/api/order-items', isAuthenticated, createOrderItem);
router.get('/api/orders/user', isAuthenticated, getUserOrders);
router.post('/api/check-song-payment', isAuthenticated, checkSongPayment);

export default router;
