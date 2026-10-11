
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../services/mysql.service');

// Carga de streamers
async function loadStreamers() {

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

        // Insercion de streamers
        let id = 1;

        for (const row of rows) {

            // Busca el idioma
            const [languages] = await connection.query(
                `SELECT language_id
                 FROM language
                 WHERE LOWER(language_name) = LOWER(?)
                 LIMIT 1`,
                [row.LANGUAGE.trim()]
            );

            if (languages.length === 0) {
                throw new Error(`Idioma no encontrado: ${row.LANGUAGE}`);
            }

            // Genera ID
            const streamerId = `STR${String(id).padStart(3, '0')}`;

            // Inserta streamer
            await connection.query(
                `INSERT INTO streamer
                (streamer_id, streamer_name, language_id)
                VALUES (?, ?, ?)`,
                [
                    streamerId,
                    row.NAME.trim(),
                    languages[0].language_id
                ]
            );

            id++;
        }

        console.log('Streamers cargados correctamente');

    } catch (error) {

        console.error('Error al cargar streamers:', error);

    } finally {

        connection.release();
        await pool.end();

    }
}

loadStreamers();