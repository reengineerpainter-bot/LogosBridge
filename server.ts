import express from 'express';
const app = express();
app.use(express.json());
app.get('/api/translation/:id', (req, res) => res.json({ success: true, message: 'Barebones Server Works!' }));
export default app;
