require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const pool = require('./db');  // tu configuración de pg.Pool

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// —— Función para determinar el estado de la temperatura —— 
function estadoTemperatura(temp) {
  if (temp < 18.0) return "Baja";
  else if (temp > 30.0) return "Alta";
  else return "Normal";
}

// —— Función para determinar el estado de la humedad —— 
function estadoHumedad(humedad) {
  if (humedad < 40.0) return "Baja";
  else if (humedad > 70.0) return "Alta";
  else return "Normal";
}

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
             estado_temperatura,
             estado_humedad,
             created_at
      FROM sensor_readings
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'empty', message: 'Sin registros aún' });
    }

    const data = rows[0];

    const resultado = {
      status: 'ok',
      data: {
        temperatura: {
          valor: data.temperatura,
          estado: data.estado_temperatura
        },
        humedad: {
          valor: data.humedad,
          estado: data.estado_humedad
        },
        humedad_suelo: data.humedad_suelo,
        calidad_aire: data.calidad_aire,
        estado_agua: data.estado_agua,
        created_at: data.created_at
      }
    };

    res.json(resultado);
  } catch (err) {
    console.error('💥 DB query error', err);
    res.status(500).json({ status: 'error', message: `DB query failed: ${err.message}` });
  }
});

// —— POST /sensores —————————————————————————————————————
app.post('/sensores', async (req, res) => {
  try {
    const {
      temperatura_C,
      estado_temperatura,
      humedad_relativa_pct,
      estado_humedad,
      calidad_aire,
      agua,
      humedad_suelo_pct
    } = req.body;

    if (
      temperatura_C === undefined ||
      estado_temperatura === undefined ||
      humedad_relativa_pct === undefined ||
      estado_humedad === undefined ||
      calidad_aire === undefined ||
      agua === undefined ||
      humedad_suelo_pct === undefined
    ) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos en la solicitud' });
    }

    const temperatura = parseFloat(temperatura_C);
    const humedad = parseFloat(humedad_relativa_pct);
    const humedad_suelo = parseFloat(humedad_suelo_pct);

    if (isNaN(temperatura) || isNaN(humedad) || isNaN(humedad_suelo)) {
      return res.status(400).json({ status: 'error', message: 'Datos numéricos inválidos' });
    }

    const text = `
      INSERT INTO sensor_readings
        (temperatura, humedad, humedad_suelo, calidad_aire, estado_agua, estado_temperatura, estado_humedad)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `;
    const values = [temperatura, humedad, humedad_suelo, calidad_aire, agua, estado_temperatura, estado_humedad];

    const { rows } = await pool.query(text, values);

    res.json({
      status: 'ok',
      saved: true,
      record: rows[0]
    });
  } catch (err) {
    console.error('💥 DB insert error', err);
    res.status(500).json({ status: 'error', message: `DB insert failed: ${err.message}` });
  }
});

// —— Ping básico —————————————————————————————————————
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando' });
});

app.listen(PORT, HOST, () => {
  console.log(`🔌 Backend escuchando en http://${HOST}:${PORT}`);
});
