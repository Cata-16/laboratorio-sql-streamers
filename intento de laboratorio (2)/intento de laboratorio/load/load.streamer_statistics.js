
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../services/mysql.service');

// Carga de estadisticas
async function loadStatistics() {

    const connection = await pool.getConnection();

    try {

        // Lectura del CSV
        const rows = await new Promise((resolve, reject) => {

            const data = [];

            fs.createReadStream('./data/streamers.csv')
                .pipe(csv())
                .on('data', (row) => data.push(row))
                .on('end', () => resolve(data))
                .on('error', reject);

        });

        // Insercion de estadisticas
        let id = 1;

        for (const row of rows) {

            // Busca el streamer
            const [streamers] = await connection.query(
                `SELECT streamer_id
                 FROM streamer
                 WHERE streamer_name = ?
                 LIMIT 1`,
                [row.NAME.trim()]
            );

            if (streamers.length === 0) {
                throw new Error(`Streamer no encontrado: ${row.NAME}`);
            }

            // Genera ID
            const statisticsId = `STAT${String(id).padStart(3, '0')}`;

            // Inserta estadisticas
            await connection.query(
                `INSERT INTO streamer_statistics
                (statistics_id, streamer_id, avg_viewers_per_stream,
                 total_followers, total_views, active_days_per_week)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    statisticsId,
                    streamers[0].streamer_id,
                    Number.parseInt(row.AVG_VIEWERS_PER_STREAM, 10),
                    Number.parseInt(row.TOTAL_FOLLOWERS, 10),
                    Number.parseInt(row.TOTAL_VIEWS, 10),
                    Number.parseFloat(row.ACTIVE_DAYS_PER_WEEK)
                ]
            );

            id++;
        }

        console.log('Estadisticas cargadas correctamente');

    } catch (error) {

        console.error('Error al cargar estadisticas:', error);

    } finally {

        connection.release();
        await pool.end();

    }
}

// Ejecuta carga
loadStatistics();
