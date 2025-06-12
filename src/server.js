// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');         // tu configuración de pg.Pool

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// —— GET /sensores/ultimo ———————————————————————————
app.get('/sensores/ultimo', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id,
             temperatura,
             humedad,
             humedad_suelo,
             calidad_aire,
             estado_agua,
             created_at
      FROM sensor_readings
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'empty', message: 'Sin registros aún' });
    }
    res.json({ status: 'ok', data: rows[0] });
  } catch (err) {
    console.error('💥 DB query error', err);
    res.status(500).json({ status: 'error', message: 'DB query failed' });
  }
});

// —— POST /sensores —————————————————————————————————————
app.post('/sensores', async (req, res) => {
  try {
    // Desestructuramos las claves tal como las envías desde Arduino
    const {
      temperatura_C,
      // como tienen caracteres especiales usamos notación de corchetes
      ['humedad_relativa_%']: humedad_relativa_pct,
      calidad_aire,
      agua,
      ['humedad_suelo_%']: humedad_suelo_pct
    } = req.body;

    // Parseamos a tipo numérico donde corresponda
    const temperatura = parseFloat(temperatura_C);
    const humedad    = parseFloat(humedad_relativa_pct);
    const humedad_suelo = parseFloat(humedad_suelo_pct);
    const calidadAire = calidad_aire;   // string: "Buena"/"Moderada"/"Mala"
    const estadoAgua  = agua;           // string: "Hay agua"/"No hay agua"

    // Inserción en la BD (asegúrate de tener estas columnas en tu tabla)
    const text = `
      INSERT INTO sensor_readings
        (temperatura,
         humedad,
         humedad_suelo,
         calidad_aire,
         estado_agua)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `;
    const values = [temperatura, humedad, humedad_suelo, calidadAire, estadoAgua];

    const { rows } = await pool.query(text, values);

    res.json({
      status: 'ok',
      saved: true,
      record: rows[0]
    });
  } catch (err) {
    console.error('💥 DB insert error', err);
    res.status(500).json({ status: 'error', message: 'DB insert failed' });
  }
});

// —— Ping básico —————————————————————————————————————
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando' });
});

app.listen(PORT, HOST, () => {
  console.log(`🔌 Backend escuchando en http://${HOST}:${PORT}`);
});
