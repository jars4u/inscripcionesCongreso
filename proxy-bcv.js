const express = require('express');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors());

app.get('/api/tasa-bcv', async (req, res) => {
  try {
    const response = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd');
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // Si la respuesta no es JSON, la API está caída o cambió
      const text = await response.text();
      console.error('Respuesta no JSON de la API externa:', text);
      return res.status(502).json({ error: 'La API externa no responde en formato JSON', details: text });
    }
    console.log('Respuesta BCV:', data); // Log para depuración
    // Compatibilidad con posibles formatos
    let price = null;
    if (data && typeof data.price === 'number') {
      price = data.price;
    } else if (data && data.data && data.data.bcv && typeof data.data.bcv.price === 'number') {
      price = data.data.bcv.price;
    }
    if (price) {
      res.json({ price });
    } else {
      console.error('No se pudo obtener la tasa. Respuesta:', data);
      res.status(500).json({ error: 'No se pudo obtener la tasa', response: data });
    }
  } catch (error) {
    console.error('Error en el proxy BCV:', error);
    res.status(500).json({ error: 'Error al obtener la tasa BCV', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy BCV escuchando en http://localhost:${PORT}/api/tasa-bcv`);
});
