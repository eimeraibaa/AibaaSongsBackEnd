import 'dotenv/config';
import {Router} from 'express'
import {addToCart , getCart , checkoutCart , generatePreview , removeFromCart} from '../controllers/cart.controller.js'
import { isAuthenticated } from '../middleware/auth.js';

const router = Router()

router.get("/getCart", isAuthenticated, getCart);
router.post("/:id/generate-preview", isAuthenticated, generatePreview);
router.delete("/:id", isAuthenticated, removeFromCart);
router.post("/checkout", isAuthenticated, checkoutCart);
router.post("/addToCart", isAuthenticated, addToCart);

export default router;