import express from 'express'
import cors from 'cors';
import usersRoutes from './routes/users.routes.js'
import paymentsRouter from './routes/payment.routes.js';
import songsRouter from './routes/songs.routes.js';


const app = express()

app.use(cors({
  origin: true,          // lee el Origin de la petición y lo responde
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));


app.use(express.json()) // Middleware to parse JSON bodies
// después de todas tus rutas, justo antes de app.listen(...)
app.use((err, req, res, next) => {
  console.error('Error global capturado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor'
  });
});

app.use('/users', usersRoutes)
app.use('/payment', paymentsRouter)
app.use('/songs', songsRouter)


export default app;
