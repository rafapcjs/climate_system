// server.js
require('dotenv').config();
const express = require('express');
const pool = require('./db');           // pool de PostgreSQL

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// -------- GET  /sensores/ultimo ---------------------------------
app.get('/sensores/ultimo', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, mq135_raw, voltaje_mq135, water_raw, voltaje_water,
             yl69_raw, voltaje_yl69, humedad_suelo, temperatura,
             humedad, created_at
      FROM   sensor_readings
      ORDER  BY created_at DESC
      LIMIT  1
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

// -------- GET  /  (ping) ----------------------------------------
app.get('/', async (_req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando' });
});

// -------- POST /sensores  ---------------------------------------
app.post('/sensores', async (req, res) => {
  try {
    const {
      mq135Raw, voltajeMq135,
      waterRaw, voltajeWater,
      yl69Raw,  voltajeYl69,
      humedadSuelo, temperatura, humedad
    } = req.body;

    const text = `
      INSERT INTO sensor_readings
      (mq135_raw, voltaje_mq135, water_raw, voltaje_water,
       yl69_raw,  voltaje_yl69,  humedad_suelo, temperatura, humedad)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, created_at`;
    const values = [
      mq135Raw, voltajeMq135,
      waterRaw, voltajeWater,
      yl69Raw,  voltajeYl69,
      humedadSuelo, temperatura, humedad
    ];

    const { rows } = await pool.query(text, values);
    res.json({ status: 'ok', saved: true, record: rows[0] });
  } catch (err) {
    console.error('💥 DB insert error', err);
    res.status(500).json({ status: 'error', message: 'DB insert failed' });
  }
});

// ----------------------------------------------------------------
app.listen(PORT, HOST, () => {
  console.log(`🔌 Backend escuchando en http://${HOST}:${PORT}`);
});
