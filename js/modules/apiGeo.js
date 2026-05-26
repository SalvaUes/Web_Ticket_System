// ============================================================
//  apiGeo.js  –  Geolocalizacion del navegador + APIs publicas
//  APIs utilizadas:
//    · BigDataCloud  →  reverse-geocoding (lat/lon → ciudad, pais)
//    · Open-Meteo    →  clima actual (sin API key, 100% libre)
// ============================================================


// --- 1. Obtener coordenadas del navegador -------------------

/**
 * Solicita la ubicacion actual al navegador.
 * Devuelve una promesa con { lat, lon } o lanza un Error descriptivo.
 */
export function obtenerCoordenadas() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu navegador no soporta geolocalizacion."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        // Mapeo de codigos de error a mensajes claros en espanol
        const mensajes = {
          1: "Permiso de ubicacion denegado por el usuario.",
          2: "No se pudo determinar la ubicacion (senal insuficiente).",
          3: "Tiempo de espera agotado al obtener la ubicacion.",
        };
        reject(new Error(mensajes[error.code] || "Error de geolocalizacion desconocido."));
      },
      { timeout: 10000, maximumAge: 60000 } // 10 s de timeout, cache de 1 min
    );
  });
}


// --- 2. Reverse-geocoding con BigDataCloud ------------------

/**
 * Convierte coordenadas a nombre de ciudad y pais.
 * Endpoint gratuito, sin API key.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ ciudad: string, pais: string }>}
 */
async function obtenerNombreUbicacion(lat, lon) {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=es`;

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`BigDataCloud respondio con estado ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  return {
    ciudad: datos.city || datos.locality || datos.principalSubdivision || "Ubicacion desconocida",
    pais: datos.countryName || "Pais desconocido",
  };
}


// --- 3. Clima actual con Open-Meteo ------------------------

/**
 * Obtiene el clima actual para las coordenadas dadas.
 * Devuelve temperatura, humedad, descripcion del codigo WMO y emoji.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ temperatura: number, humedad: number, descripcion: string, emoji: string }>}
 */
async function obtenerClima(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weathercode` +
    `&timezone=auto`;

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`Open-Meteo respondio con estado ${respuesta.status}`);
  }

  const datos = await respuesta.json();
  const actual = datos.current;

  const { descripcion, emoji } = interpretarCodigoWMO(actual.weathercode);

  return {
    temperatura: actual.temperature_2m,
    humedad: actual.relative_humidity_2m,
    descripcion,
    emoji,
  };
}

/**
 * Convierte el codigo meteorologico WMO en texto y emoji legibles.
 * Referencia: https://open-meteo.com/en/docs
 * @param {number} codigo
 * @returns {{ descripcion: string, emoji: string }}
 */
function interpretarCodigoWMO(codigo) {
  const tabla = {
    0:  { descripcion: "Cielo despejado",              emoji: "☀️"  },
    1:  { descripcion: "Principalmente despejado",     emoji: "🌤️" },
    2:  { descripcion: "Parcialmente nublado",          emoji: "⛅"  },
    3:  { descripcion: "Nublado",                       emoji: "☁️"  },
    45: { descripcion: "Niebla",                        emoji: "🌫️" },
    48: { descripcion: "Niebla con escarcha",           emoji: "🌫️" },
    51: { descripcion: "Llovizna ligera",               emoji: "🌦️" },
    53: { descripcion: "Llovizna moderada",             emoji: "🌦️" },
    55: { descripcion: "Llovizna intensa",              emoji: "🌧️" },
    61: { descripcion: "Lluvia ligera",                 emoji: "🌧️" },
    63: { descripcion: "Lluvia moderada",               emoji: "🌧️" },
    65: { descripcion: "Lluvia intensa",                emoji: "🌧️" },
    71: { descripcion: "Nevada ligera",                 emoji: "🌨️" },
    73: { descripcion: "Nevada moderada",               emoji: "🌨️" },
    75: { descripcion: "Nevada intensa",                emoji: "❄️"  },
    80: { descripcion: "Chubascos ligeros",             emoji: "🌦️" },
    81: { descripcion: "Chubascos moderados",           emoji: "🌧️" },
    82: { descripcion: "Chubascos intensos",            emoji: "⛈️"  },
    95: { descripcion: "Tormenta electrica",            emoji: "⛈️"  },
    96: { descripcion: "Tormenta con granizo",          emoji: "⛈️"  },
    99: { descripcion: "Tormenta con granizo fuerte",   emoji: "🌩️" },
  };

  return tabla[codigo] ?? { descripcion: "Condicion desconocida", emoji: "🌡️" };
}


// --- 4. Funcion principal exportada -------------------------

/**
 * Obtiene coordenadas reales del navegador, las procesa con dos
 * APIs externas en paralelo (BigDataCloud + Open-Meteo) y devuelve
 * un objeto con toda la informacion lista para el dashboard.
 *
 * @returns {Promise<{
 *   lat: string,
 *   lon: string,
 *   ciudad: string,
 *   pais: string,
 *   temperatura: number,
 *   humedad: number,
 *   descripcion: string,
 *   emoji: string
 * }>}
 */
export async function obtenerDatosGeo() {
  // Paso 1 – coordenadas reales del navegador
  const { lat, lon } = await obtenerCoordenadas();

  // Paso 2 – ambas APIs en paralelo para mayor velocidad
  const [ubicacion, clima] = await Promise.all([
    obtenerNombreUbicacion(lat, lon),
    obtenerClima(lat, lon),
  ]);

  return {
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    ciudad: ubicacion.ciudad,
    pais: ubicacion.pais,
    temperatura: clima.temperatura,
    humedad: clima.humedad,
    descripcion: clima.descripcion,
    emoji: clima.emoji,
  };
}
